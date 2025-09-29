import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Mizan Server is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Mizan Platform API',
    version: '1.0.0',
    description: 'AI-powered organizational analysis platform',
    domain: 'mizanvalues.com',
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      analyses: '/api/analyses/*',
      admin: '/api/admin/*'
    }
  });
});

// Basic auth endpoint (mock)
app.post('/api/auth/login', (req, res) => {
  res.json({
    success: true,
    message: 'Login endpoint working',
    token: 'mock-jwt-token',
    user: {
      id: '1',
      email: 'admin@mizanvalues.com',
      role: 'admin'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mizan Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📡 API info: http://localhost:${PORT}/api`);
  console.log(`🏢 Domain: mizanvalues.com`);
});
