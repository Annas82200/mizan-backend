import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { db } from './db/index.js';
import { users, tenants } from './db/schema.js';
import { eq } from 'drizzle-orm';

// Import routes from src directory (AGENT_CONTEXT_ULTIMATE.md Line 383)
import authRoutes from './src/routes/auth.js';
import adminRoutes from './src/routes/admin.js';
import employeeRoutes from './src/routes/employee.js';
import agentRoutes from './src/routes/agents.js';
import entryRoutes from './src/routes/entry.js';
import superadminRoutes from './src/routes/superadmin.js';
import cultureRoutes from './src/routes/culture-assessment.js';
import uploadRoutes from './src/routes/upload.js';
import analysesRoutes from './src/routes/analyses.js';
import billingRoutes from './src/routes/billing.js';
import modulesRoutes from './src/routes/modules.js';
import frameworkRoutes from './src/routes/framework.js';
import exportRoutes from './src/routes/export.js';
import testAiRoutes from './src/routes/test-ai.js';
import publicStructureRoutes from './src/routes/public-structure.js';
import paymentRoutes from './src/routes/payment.js';
import webhookRoutes from './src/routes/webhooks.js';
import demoRoutes from './src/routes/demo.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'https://mizan.work',
  'https://www.mizan.work',
  'https://mizan-platform-final.vercel.app',
  'https://mizan-frontend-ten.vercel.app'
];

// Add CLIENT_URL if it's set and not already in the list
if (process.env.CLIENT_URL && !allowedOrigins.includes(process.env.CLIENT_URL)) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Log CORS configuration
console.log('🌐 CORS configured for origins:', allowedOrigins);
console.log('🔧 CLIENT_URL environment variable:', process.env.CLIENT_URL);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '2.0.0',
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
    let tenant = await db.query.tenants.findFirst({
      where: (t, { eq }) => eq(t.name, 'Mizan Superadmin')
    });

    if (!tenant) {
      [tenant] = await db.insert(tenants).values({
        name: 'Mizan Superadmin',
        plan: 'enterprise',
        status: 'active'
      }).returning();
    }

    // Check if user exists
    const existing = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, email)
    });

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
  } catch (error: any) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
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
    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, email)
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const jwt = await import('jsonwebtoken');
    const token = jwt.default.sign(
      {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role
      },
      process.env.SESSION_SECRET || process.env.JWT_SECRET || 'default-secret',
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

  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// API Routes
// Webhook routes MUST be registered BEFORE body parsing middleware for raw body access
app.use('/api/webhooks', webhookRoutes); // Stripe webhooks (NO auth required, uses signature verification)

app.use('/api/public/structure', publicStructureRoutes); // Public structure analysis (no auth required)
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/entry', entryRoutes); // Core analysis endpoints
app.use('/api/superadmin', superadminRoutes); // Superadmin endpoints
app.use('/api/culture-assessment', cultureRoutes); // Culture assessment endpoints
app.use('/api/upload', uploadRoutes); // File upload and org structure analysis
app.use('/api/analyses', analysesRoutes); // Analysis endpoints (structure, culture)
app.use('/api/billing', billingRoutes); // Billing and payment endpoints (legacy)
app.use('/api/payment', paymentRoutes); // Stripe payment links (superadmin only)
app.use('/api/demo', demoRoutes); // Demo requests (public submit + superadmin management)
app.use('/api/modules', modulesRoutes); // Module-specific endpoints
app.use('/api/framework', frameworkRoutes); // 7-Cylinder Framework configuration
app.use('/api/export', exportRoutes); // Export formatted reports
app.use('/api', testAiRoutes); // Test AI endpoint

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mizan Platform Server v2.0.0 running on port ${PORT}`);
  console.log(`📊 Features: Three-Engine AI, Multi-Provider Consensus, Culture & Structure Analysis`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Test database connection
  console.log('🔍 Testing database connection...');
  // Note: Add actual DB connection test here
});

export default app;