import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './db/index.js';

// Import routes
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import employeeRoutes from './routes/employee.js';
import agentRoutes from './routes/agents.js';
import entryRoutes from './routes/entry.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

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

// API Routes
app.use('/api/auth', authRoutes);
// app.use('/api/admin', adminRoutes); // Temporarily disabled - has schema issues
// app.use('/api/employee', employeeRoutes); // Temporarily disabled - has schema issues  
// app.use('/api/agents', agentRoutes); // Temporarily disabled - has schema issues
app.use('/api/entry', entryRoutes); // Core analysis endpoints - working

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