// Simple auth test endpoint
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Simple test login that always works
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // For testing - accept any email/password
  if (email && password) {
    const role = email.includes('admin') ? 'superadmin' : 
                 email.includes('employee') ? 'employee' : 'admin';
    
    res.json({
      success: true,
      token: 'test-jwt-token-12345',
      user: {
        id: '1',
        email: email,
        name: 'Test User',
        role: role,
        tenantId: '550e8400-e29b-41d4-a716-446655440000'
      }
    });
  } else {
    res.status(400).json({ error: 'Email and password required' });
  }
});

// Test endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Test auth server' });
});

app.listen(3002, () => {
  console.log('🧪 Test auth server running on port 3002');
  console.log('Use this for testing login while we fix the main auth');
});
