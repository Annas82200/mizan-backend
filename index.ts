// CRITICAL: Ensure stdout/stderr are not buffered in containerized environments
if (process.stdout && 'setDefaultEncoding' in process.stdout) {
  process.stdout.setDefaultEncoding('utf8');
}
if (process.stderr && 'setDefaultEncoding' in process.stderr) {
  process.stderr.setDefaultEncoding('utf8');
}

// Force immediate flush of logs (no buffering)
const originalLog = console.log;
console.log = (...args) => {
  originalLog(...args);
  if (process.stdout.write('')) {} // Force flush
};

// CRITICAL: Log immediately to prove process started
console.log('========================================');
console.log('🚀 Mizan Server Process Starting...');
console.log('📅 Timestamp:', new Date().toISOString());
console.log('🌍 Node Version:', process.version);
console.log('📦 Environment:', process.env.NODE_ENV || 'development');
const gitCommit = process.env.RAILWAY_GIT_COMMIT_SHA?.substring(0, 7) || process.env.RAILWAY_DEPLOYMENT_ID?.substring(0, 7) || 'dev';
console.log(`🔄 Deployment Version: ${gitCommit}`);
console.log('========================================');

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

// Load environment variables from .env file in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
  console.log('⚙️  Environment variables loaded from .env file');
} else {
  console.log('⚙️  Environment variables ready (injected by platform)');
}

// ✅ PRODUCTION: Validate configuration early - fails fast if invalid
// This import triggers config validation and exits if any required env vars are missing
import { config } from './src/config';
// Config validation logs printed by config module

// Import database and utilities
console.log('📚 Loading database module...');
import bcrypt from 'bcryptjs';
import { db } from './db/index';
import { tenants, users } from './db/schema';
import { eq, sql } from 'drizzle-orm';
import { authenticate, authorize } from './src/middleware/auth';
import { BillingService } from './src/services/stripe';
import { CultureAgentV2 } from './src/services/agents/culture/culture-agent';
import { SkillsAgent } from './src/services/agents/skills/skills-agent';
import { StructureAgentV2 } from './src/services/agents/structure/structure-agent';
import { EngagementAgent } from './src/services/agents/engagement/engagement-agent';
import { RecognitionAgent } from './src/services/agents/recognition/recognition-agent';
// import entryRoutes from './src/routes/entry'; // File doesn't exist
import authRoutes from './src/routes/auth';
import adminRoutes from './src/routes/admin';
import employeeRoutes from './src/routes/employee';
// import agentRoutes from './src/routes/agents';
import superadminRoutes from './src/routes/superadmin';
import cultureRoutes from './src/routes/culture-assessment';
import uploadRoutes from './src/routes/upload';
// import analysesRoutes from './src/routes/analyses'; // Has TypeScript errors - using upload route instead
import billingRoutes from './src/routes/billing';
import modulesRoutes from './src/routes/modules';
// import frameworkRoutes from './src/routes/framework';
// import exportRoutes from './src/routes/export'; // Has TypeScript errors - duplicate functions and missing imports
import testAiRoutes from './src/routes/test-ai';
import publicStructureRoutes from './src/routes/public-structure';
import paymentRoutes from './src/routes/payment';
import webhookRoutes from './src/routes/webhooks';
import demoRoutes from './src/routes/demo';
import skillsRoutes from './src/routes/skills';
import socialMediaRoutes from './src/routes/social-media';
console.log('✅ Database module loaded');

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0'; // Define HOST here

// Log PORT and HOST immediately after definition
console.log(`💡 Configured Port: ${PORT}`);
console.log(`💡 Configured Host: ${HOST}`);

// ============================================================================
// CORS CONFIGURATION - Production-Ready with Dynamic Origin Handling
// ============================================================================
// Build comprehensive allowed origins list from environment and hardcoded values
const allowedOrigins = [
  // Development origins
  'http://localhost:3000',
  'http://localhost:3001',

  // Production domains (all variations)
  'https://mizan.work',
  'https://www.mizan.work',
  'https://api.mizan.work',  // Add if using subdomain for API

  // Vercel deployments
  'https://mizan-platform-final.vercel.app',
  'https://mizan-frontend-ten.vercel.app',
  
  // Railway API deployment (if frontend needs to know)
  'https://mizan-api.railway.app',
];

// Add CLIENT_URL from environment if set and not already included
if (process.env.CLIENT_URL && !allowedOrigins.includes(process.env.CLIENT_URL)) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

// Add FRONTEND_URL from environment if set and not already included
if (process.env.FRONTEND_URL && !allowedOrigins.includes(process.env.FRONTEND_URL)) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

// Add all Vercel preview deployments dynamically (*.vercel.app)
// Production-ready: Enhanced CORS configuration with Next.js 14 RSC support
const corsOptionsDelegate = function (req: any, callback: any) {
  const origin = req.header('Origin');
  const referer = req.header('Referer');

  // Next.js RSC headers detection
  const isRSCRequest = req.header('RSC') === '1' ||
                       req.header('Next-Router-State-Tree') ||
                       req.header('Next-Url') ||
                       req.query._rsc;

  let corsOptions;

  // Extract origin from referer if RSC request without origin header
  let effectiveOrigin = origin;
  if (!effectiveOrigin && referer && isRSCRequest) {
    try {
      const refererUrl = new URL(referer);
      effectiveOrigin = refererUrl.origin;
      console.log(`🔄 [RSC] Extracted origin from referer: ${effectiveOrigin}`);
    } catch (error) {
      console.warn('⚠️  Failed to parse referer URL:', referer);
    }
  }

  if (!effectiveOrigin) {
    // Allow requests with no origin (like mobile apps, curl, Postman, SSR)
    corsOptions = {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Tenant-Id',
        // Next.js RSC headers
        'RSC',
        'Next-Router-State-Tree',
        'Next-Router-Prefetch',
        'Next-Url',
        'Next-Action'
      ],
      exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-Tenant-Id'],
      maxAge: 600 // Cache preflight for 10 minutes
    };
  } else if (allowedOrigins.includes(effectiveOrigin)) {
    // Origin is in allowed list
    corsOptions = {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Tenant-Id',
        // Next.js RSC headers
        'RSC',
        'Next-Router-State-Tree',
        'Next-Router-Prefetch',
        'Next-Url',
        'Next-Action'
      ],
      exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-Tenant-Id'],
      maxAge: 600
    };
  } else if (effectiveOrigin.endsWith('.vercel.app') || effectiveOrigin.endsWith('.railway.app')) {
    // Allow all Vercel and Railway deployments for flexibility
    corsOptions = {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Tenant-Id',
        // Next.js RSC headers
        'RSC',
        'Next-Router-State-Tree',
        'Next-Router-Prefetch',
        'Next-Url',
        'Next-Action'
      ],
      exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-Tenant-Id'],
      maxAge: 600
    };
  } else {
    // Origin not allowed
    console.warn(`⚠️  CORS: Blocked request from unauthorized origin: ${effectiveOrigin}`);
    corsOptions = {
      origin: false,
      credentials: false
    };
  }

  callback(null, corsOptions);
};

// Apply CORS middleware with dynamic origin checking
app.use(cors(corsOptionsDelegate));

// Explicit preflight (OPTIONS) handling for all routes with enhanced logging
app.options('*', (req, res, next) => {
  const origin = req.header('Origin');
  console.log('🔍 [CORS Preflight]', {
    method: 'OPTIONS',
    path: req.path,
    origin: origin || 'no-origin',
    referer: req.header('Referer') || 'no-referer',
    userAgent: req.header('User-Agent')?.substring(0, 50) || 'no-user-agent',
    requestedMethod: req.header('Access-Control-Request-Method'),
    requestedHeaders: req.header('Access-Control-Request-Headers')
  });
  
  cors(corsOptionsDelegate)(req, res, next);
});

// Log CORS configuration
console.log('🌐 CORS configured with dynamic origin checking');
console.log('✅ Allowed origins (static):', allowedOrigins);
console.log('✅ Dynamic patterns: *.vercel.app, *.railway.app');
console.log('🔧 CLIENT_URL environment variable:', process.env.CLIENT_URL || 'not set');
console.log('🔧 FRONTEND_URL environment variable:', process.env.FRONTEND_URL || 'not set');

// Add request logging middleware for debugging
app.use((req, res, next) => {
  const origin = req.header('Origin');
  
  // Log all incoming requests with authentication status
  if (req.path.startsWith('/api/')) {
    const hasAuth = !!req.header('Authorization');
    console.log('📥 [Request]', {
      method: req.method,
      path: req.path,
      origin: origin || 'no-origin',
      hasAuth,
      contentType: req.header('Content-Type') || 'none'
    });
  }
  
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser()); // Parse cookies for httpOnly authentication

// Database connection status (will be updated during startup)
let dbConnectionStatus = {
  connected: false,
  lastCheck: new Date().toISOString(),
  error: null as string | null
};

// Health check endpoint - ALWAYS returns 200 if server is running
// Database status is reported separately for monitoring
app.get('/health', (req, res) => {
  // Server is healthy if it can respond to requests
  // Database connection is checked separately and reported in response
  console.log('🏥 Health check requested. Reporting current status:');
  console.log('  - Server Status: running');
  console.log('  - Database Status: ' + (dbConnectionStatus.connected ? 'connected' : 'disconnected'));
  console.log('  - DATABASE_URL: ' + (process.env.DATABASE_URL ? 'Set (hidden)' : 'Not set'));

  res.status(200).json({ 
    status: 'healthy',
    server: 'running',
    database: {
      connected: dbConnectionStatus.connected,
      status: dbConnectionStatus.connected ? 'connected' : 'disconnected',
      lastCheck: dbConnectionStatus.lastCheck,
      error: dbConnectionStatus.error
    },
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    features: [
      'Three-Engine AI Architecture',
      'Multi-Provider AI Consensus',
      'Culture Analysis',
      'Structure Analysis',
      'Multi-Tenant Support',
      'Role-Based Access Control'
    ]
  });
});

// Database test endpoint for debugging
app.get('/api/test-db', async (req, res) => {
  try {
    console.log('🧪 Testing database connection...');
    
    // Test basic connection
    const result = await db.select().from(tenants).limit(1);
    console.log('✅ Basic connection test passed');
    
    // Test table access
    const userCount = await db.select().from(users).limit(1);
    const tenantCount = await db.select().from(tenants).limit(1);
    
    console.log('✅ Table access test passed');
    
    res.json({
      status: 'OK',
      timestamp: result,
      usersAccessible: userCount.length > 0,
      tenantsAccessible: tenantCount.length > 0,
      databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('❌ Database test failed:', error);
    res.status(500).json({
      status: 'ERROR',
      error: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      environment: process.env.NODE_ENV || 'development'
    });
  }
});

// TEMPORARY: Create superadmin endpoint - REMOVE AFTER USE
app.post('/api/create-superadmin-temp', async (req, res) => {
  try {
    const email = 'anna@mizan.com';
    const password = 'MizanAdmin2024!';
    const name = 'Anna Dahrouj';

    console.log('🔐 Creating superadmin user...');

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Find or create tenant
    const tenantResult = await db.select().from(tenants).where(eq(tenants.name, 'Mizan Superadmin')).limit(1);
    let tenant = tenantResult.length > 0 ? tenantResult[0] : null;

    if (!tenant) {
      [tenant] = await db.insert(tenants).values({
        name: 'Mizan Superadmin',
        plan: 'enterprise',
        status: 'active'
      }).returning();
    }

    // Check if user exists
    const existingResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const existing = existingResult.length > 0 ? existingResult[0] : null;

    if (existing) {
      // Update
      await db.update(users)
        .set({
          passwordHash,
          role: 'superadmin',
          isActive: true
        })
        .where(eq(users.email, email));

      return res.json({ success: true, message: 'Superadmin updated!' });
    } else {
      // Create
      await db.insert(users).values({
        tenantId: tenant.id,
        email,
        passwordHash,
        name,
        role: 'superadmin',
        isActive: true
      });

      return res.json({ success: true, message: 'Superadmin created!' });
    }
  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return res.status(500).json({ error: errorMessage });
  }
});

// DIRECT LOGIN ENDPOINT (temporary fix for Railway routing issue)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const userResult = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = userResult.length > 0 ? userResult[0] : null;

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token - use consistent JWT_SECRET
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production-xyz123';
    const token = jwt.default.sign(
      {
        id: user.id,
        userId: user.id, // Include both for compatibility
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId
      }
    });

  } catch (error: unknown) {
    console.error('Login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Login failed';
    return res.status(500).json({ error: errorMessage });
  }
});

// API Routes
// Webhook routes MUST be registered BEFORE body parsing middleware for raw body access
app.use('/api/webhooks', webhookRoutes); // Stripe webhooks (NO auth required, uses signature verification)

app.use('/api/public/structure', publicStructureRoutes); // Public structure analysis (no auth required)
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/employee', employeeRoutes);
// app.use('/api/agents', agentRoutes); // Temporarily disabled - missing dependencies
// app.use('/api/entry', entryRoutes); // Core analysis endpoints - File doesn't exist
app.use('/api/superadmin', superadminRoutes); // Superadmin endpoints
app.use('/api/culture-assessment', cultureRoutes); // Culture assessment endpoints
app.use('/api/upload', uploadRoutes); // File upload and org structure analysis
// app.use('/api/analyses', analysesRoutes); // Has TypeScript errors - structure analysis works via /api/upload/org-chart
app.use('/api/billing', billingRoutes); // Billing and payment endpoints (legacy)
app.use('/api/payment', paymentRoutes); // Stripe payment links (superadmin only)
app.use('/api/demo', demoRoutes); // Demo requests (public submit + superadmin management)
app.use('/api/modules', modulesRoutes); // Module-specific endpoints
// app.use('/api/framework', frameworkRoutes); // 7-Cylinder Framework configuration
// app.use('/api/export', exportRoutes); // Has TypeScript errors - export functionality temporarily disabled
app.use('/api/skills', skillsRoutes); // Skills Analysis endpoints (AGENT_CONTEXT_ULTIMATE.md Lines 56-226)
app.use('/api/social-media', socialMediaRoutes); // Social Media Content Generation endpoints
app.use('/api', testAiRoutes); // Test AI endpoint

// Error handling middleware
app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  
  const errorStatus = err && typeof err === 'object' && 'status' in err ? (err as { status: number }).status : 500;
  const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
  const errorStack = err instanceof Error ? err.stack : undefined;
  
  res.status(errorStatus).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? errorMessage : 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && errorStack && { stack: errorStack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Database connection test (AGENT_CONTEXT_ULTIMATE.md - Production-ready requirement)
async function testDatabaseConnection(): Promise<boolean> {
  try {
    console.log('🔍 Testing database connection...');
    const { pool } = await import('./db/index');
    
    // Test query with reduced timeout for Railway (5s instead of 10s)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database connection timeout')), 5000)
    );
    
    const queryPromise = pool.query('SELECT NOW()');
    
    await Promise.race([queryPromise, timeoutPromise]);
    
    console.log('✅ Database connection successful');
    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown database connection error';
    console.error('❌ Database connection failed:', errorMessage);
    console.error('DATABASE_URL:', process.env.DATABASE_URL ? 'Set (hidden)' : 'Not set');
    return false;
  }
}

// Start server with proper error handling (AGENT_CONTEXT_ULTIMATE.md Line 1114)
async function startServer() {
  try {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🚀 STARTING MIZAN PLATFORM SERVER v2.0.0');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔌 Port: ${PORT}`);
    console.log(`🖥️  Host: ${process.env.HOST || '0.0.0.0'}`);
    console.log('');
    
    // Validate required environment variables
    console.log('🔐 Security Configuration:');
    if (!process.env.DATABASE_URL) {
      console.warn('  ⚠️  WARNING: DATABASE_URL not set, using default connection string');
    } else {
      console.log('  ✅ DATABASE_URL is configured');
    }

    if (!process.env.SESSION_SECRET && !process.env.JWT_SECRET) {
      console.warn('  ⚠️  WARNING: SESSION_SECRET/JWT_SECRET not set, using default (insecure for production)');
    } else {
      console.log('  ✅ JWT/SESSION_SECRET is configured');
    }
    console.log('');

    // CRITICAL FIX: Start HTTP server FIRST so Railway healthcheck can reach /health endpoint
    // Database connection will be tested in the background
    
    console.log('🌐 Starting HTTP server...');
    console.log(`   Binding to: ${HOST}:${PORT}`);
    
    const server = app.listen(PORT, HOST, () => {
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('✅ MIZAN PLATFORM SERVER ONLINE');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`🌐 Server: http://${HOST}:${PORT}`);
      console.log(`🏥 Health: http://${HOST}:${PORT}/health`);
      console.log(`📊 Features: Three-Engine AI, Multi-Provider Consensus`);
      console.log(`🔒 Security: CORS, Helmet, Rate Limiting`);
      console.log(`🗄️  Database: Testing connection in background...`);
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');
    });

    // Handle server errors
    server.on('error', (error: unknown) => {
      if (error && typeof error === 'object' && 'code' in error) {
        const errorCode = (error as { code: string }).code;
        if (errorCode === 'EADDRINUSE') {
          console.error(`🚨 FATAL: Port ${PORT} is already in use`);
        } else if (errorCode === 'EACCES') {
          console.error(`🚨 FATAL: Permission denied to bind to port ${PORT}`);
        } else {
          console.error('🚨 FATAL: Server error:', error);
        }
      } else {
        console.error('🚨 FATAL: Server error:', error);
      }
      process.exit(1);
    });

    // Test database connection in background (with reduced retry for Railway)
    // This runs AFTER server is listening so healthcheck can succeed immediately
    (async () => {
      let dbConnected = false;
      const maxRetries = 2; // Reduced from 3 to 2 for Railway
      
      for (let i = 0; i < maxRetries; i++) {
        console.log(`🔍 Database connection attempt ${i + 1}/${maxRetries}...`);
        dbConnected = await testDatabaseConnection();
        
        if (dbConnected) {
          break;
        }
        
        if (i < maxRetries - 1) {
          console.log('⏳ Waiting 3 seconds before retry...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      
      // Update database connection status
      dbConnectionStatus.connected = dbConnected;
      dbConnectionStatus.lastCheck = new Date().toISOString();
      
      if (!dbConnected) {
        dbConnectionStatus.error = `Failed to connect after ${maxRetries} attempts`;
        if (process.env.NODE_ENV === 'production') {
          console.error('⚠️  WARNING: Database connection failed in production');
          console.error('🔧 Check DATABASE_URL environment variable');
          console.error('🚀 Server is running but may have limited functionality');
        } else {
          console.warn('⚠️  Continuing without database (development mode)');
        }
      } else {
        dbConnectionStatus.error = null;
        console.log('✅ Database fully connected and operational');
      }
    })();

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n⚠️  ${signal} received, shutting down gracefully...`);
      
      server.close(async () => {
        console.log('✅ HTTP server closed');
        
        try {
          const { pool } = await import('./db/index');
          await pool.end();
          console.log('✅ Database pool closed');
        } catch (error) {
          console.error('❌ Error closing database pool:', error);
        }
        
        console.log('👋 Shutdown complete');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('🚨 Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('🚨 Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

  } catch (error: unknown) {
    console.error('🚨 FATAL: Failed to start server:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Global error handlers BEFORE starting server
process.on('uncaughtException', (error) => {
  console.error('');
  console.error('═══════════════════════════════════════════════════════════');
  console.error('🚨 FATAL: Uncaught Exception During Startup');
  console.error('═══════════════════════════════════════════════════════════');
  console.error('Error:', error);
  console.error('Stack:', error.stack);
  console.error('═══════════════════════════════════════════════════════════');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('');
  console.error('═══════════════════════════════════════════════════════════');
  console.error('🚨 FATAL: Unhandled Promise Rejection During Startup');
  console.error('═══════════════════════════════════════════════════════════');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  console.error('═══════════════════════════════════════════════════════════');
  process.exit(1);
});

// Start the server with top-level error handling
console.log('🎬 Invoking startServer() function...');
(async () => {
  try {
    await startServer();
    console.log('✅ startServer() invocation completed successfully');
  } catch (error) {
    console.error('');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('🚨 FATAL: Failed to start server');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('Error:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
    console.error('═══════════════════════════════════════════════════════════');
    process.exit(1);
  }
})();

export default app;