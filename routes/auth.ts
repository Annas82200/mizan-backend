// server/routes/auth.ts

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../db/index.js';
import { users, tenants, userRoles } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

const router = Router();

// Validation schemas
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  company: z.string().optional(),
  plan: z.enum(['free', 'pro', 'pro_plus', 'enterprise']).default('free')
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

// Helper function to generate JWT
function generateToken(user: any) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      tenantId: user.tenantId,
      role: user.role 
    },
    process.env.SESSION_SECRET || 'default-secret',
    { expiresIn: '7d' }
  );
}

// Signup endpoint
router.post('/signup', async (req, res) => {
  try {
    const validatedData = signupSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, validatedData.email)
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Create tenant if not free plan
    let tenantId = 'free-tier';
    
    if (validatedData.plan !== 'free') {
      const [tenant] = await db.insert(tenants)
        .values({
          id: crypto.randomUUID(),
          name: validatedData.company || `${validatedData.name}'s Organization`,
          plan: validatedData.plan as any,
          status: 'trial',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      tenantId = tenant.id;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);
    
    // Create user
    const [user] = await db.insert(users)
      .values({
        id: crypto.randomUUID(),
        tenantId,
        email: validatedData.email,
        passwordHash: hashedPassword,
        name: validatedData.name,
        role: validatedData.plan !== 'free' ? 'clientAdmin' : 'employee',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    // Generate token
    const token = generateToken(user);
    
    res.json({
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
    
  } catch (error) {
    console.error('Signup error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input',
        details: error.errors
      });
    }
    
    res.status(500).json({ error: 'Signup failed' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    
    // Find user
    const user = await db.query.users.findFirst({
      where: eq(users.email, validatedData.email),
      with: {
        tenant: true
      }
    });
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const isValid = await bcrypt.compare(validatedData.password, user.passwordHash);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate token
    const token = generateToken(user);
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        tenant: user.tenant
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input',
        details: error.errors
      });
    }
    
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  // Clear any server-side session if using sessions
  res.json({ success: true, message: 'Logged out successfully' });
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.SESSION_SECRET || 'default-secret') as any;
      
      const user = await db.query.users.findFirst({
        where: eq(users.id, decoded.id),
        with: {
          tenant: true
        }
      });
      
      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'User not found' });
      }
      
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        tenant: user.tenant
      });
      
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Social media OAuth callbacks
router.get('/linkedin/callback', async (req, res) => {
  try {
    // Handle LinkedIn OAuth callback
    // Exchange code for token, store in socialMediaAccounts
    res.redirect(`${process.env.FRONTEND_URL}/settings/social-media?status=linkedin-connected`);
  } catch (error) {
    res.redirect(`${process.env.FRONTEND_URL}/settings/social-media?error=linkedin-failed`);
  }
});

router.get('/twitter/callback', async (req, res) => {
  try {
    // Handle Twitter OAuth callback
    res.redirect(`${process.env.FRONTEND_URL}/settings/social-media?status=twitter-connected`);
  } catch (error) {
    res.redirect(`${process.env.FRONTEND_URL}/settings/social-media?error=twitter-failed`);
  }
});

router.get('/facebook/callback', async (req, res) => {
  try {
    // Handle Facebook OAuth callback
    res.redirect(`${process.env.FRONTEND_URL}/settings/social-media?status=facebook-connected`);
  } catch (error) {
    res.redirect(`${process.env.FRONTEND_URL}/settings/social-media?error=facebook-failed`);
  }
});

router.get('/google/callback', async (req, res) => {
  try {
    // Handle Google OAuth callback
    res.redirect(`${process.env.FRONTEND_URL}/settings/social-media?status=google-connected`);
  } catch (error) {
    res.redirect(`${process.env.FRONTEND_URL}/settings/social-media?error=google-failed`);
  }
});

export default router;
