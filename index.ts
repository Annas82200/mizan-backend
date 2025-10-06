import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { db } from './db/index.js';
import { users, tenants } from './db/schema.js';

// Import routes
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import employeeRoutes from './routes/employee.js';
import agentRoutes from './routes/agents.js';
import entryRoutes from './routes/entry.js';
import superadminRoutes from './routes/superadmin.js';
import skillsRoutes from './routes/skills-analysis.js';
import cultureRoutes from './routes/culture-assessment.js';
import hiringRoutes from './routes/hiring.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'https://mizan.work',
  'https://www.mizan.work',
  'https://mizan-platform-final.vercel.app'
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
      'Skills Analysis',
      'Benchmarking',
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
        .where((u, { eq }) => eq(u.email, email));

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

// API Routes
app.use('/api/auth', authRoutes);
// app.use('/api/admin', adminRoutes); // Temporarily disabled - has schema issues
// app.use('/api/employee', employeeRoutes); // Temporarily disabled - has schema issues
// app.use('/api/agents', agentRoutes); // Temporarily disabled - has schema issues
app.use('/api/entry', entryRoutes); // Core analysis endpoints - working
app.use('/api/superadmin', superadminRoutes); // Superadmin endpoints - working
app.use('/api/skills', skillsRoutes); // Skills analysis endpoints
app.use('/api/culture-assessment', cultureRoutes); // Culture assessment endpoints
app.use('/api/hiring', hiringRoutes); // Complete hiring flow endpoints - PRODUCTION READY

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
  console.log(`📊 Features: Three-Engine AI, Multi-Provider Consensus, 7 AI Agents`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Test database connection
  console.log('🔍 Testing database connection...');
  // Note: Add actual DB connection test here
});

export default app;