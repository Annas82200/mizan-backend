// backend/src/routes/auth.ts

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../../db/index';
import { users, tenants } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedUser } from '../middleware/auth';
import { generateFullToken } from '../services/auth';

const router = Router();

// Cookie configuration for httpOnly authentication
// ✅ PRODUCTION: Secure, httpOnly cookies to prevent XSS attacks
const COOKIE_OPTIONS = {
  httpOnly: true,  // Cannot be accessed by JavaScript (prevents XSS)
  secure: process.env.NODE_ENV === 'production',  // HTTPS only in production
  sameSite: 'lax' as const,  // CSRF protection (lax allows navigation)
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days in milliseconds
  path: '/',  // Available across entire domain
};

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

// Use a compatible interface for JWT token payload
interface TokenUser {
  id: string;
  email: string;
  tenantId: string;
  role: string;
  name?: string;
}

// Use the Express Request type with the global user definition
interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

// Token refresh endpoint
router.post('/refresh', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'No token provided',
        code: 'MISSING_TOKEN' 
      });
    }
    
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key-change-in-production-xyz123') as TokenUser;
      
      // Verify user still exists and is active
      const userResult = await db.select()
        .from(users)
        .where(
          and(
            eq(users.id, decoded.id),
            eq(users.isActive, true)
          )
        )
        .limit(1);
      
      if (userResult.length === 0) {
        return res.status(401).json({ 
          error: 'User not found or inactive',
          code: 'USER_NOT_FOUND' 
        });
      }
      
      const user = userResult[0];

      // Generate new token
      const newToken = generateFullToken(user);

      // ✅ PRODUCTION: Set httpOnly cookie (primary authentication)
      res.cookie('mizan_auth_token', newToken, COOKIE_OPTIONS);

      return res.json({
        success: true,
        token: newToken, // Still return token for backward compatibility
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId
        }
      });
      
    } catch (jwtError) {
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        code: 'TOKEN_INVALID' 
      });
    }
    
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR' 
    });
  }
});

// Middleware: Tenant Access Validation
const validateTenantAccess = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'MISSING_TOKEN' 
      });
    }
    
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key-change-in-production-xyz123') as TokenUser;
      
      // Validate user exists and is active with tenant isolation
      const user = await db.select()
        .from(users)
        .where(
          and(
            eq(users.id, decoded.id),
            eq(users.tenantId, decoded.tenantId),
            eq(users.isActive, true)
          )
        )
        .limit(1);
      
      if (user.length === 0) {
        return res.status(401).json({ 
          error: 'User not found or inactive',
          code: 'USER_NOT_FOUND' 
        });
      }
      
      // Validate tenant exists and is active
      const tenant = await db.select()
        .from(tenants)
        .where(
          and(
            eq(tenants.id, decoded.tenantId),
            eq(tenants.status, 'active')
          )
        )
        .limit(1);
      
      if (tenant.length === 0) {
        return res.status(403).json({ 
          error: 'Tenant not found or inactive',
          code: 'TENANT_INACTIVE' 
        });
      }
      
      req.user = {
        id: decoded.id,
        email: decoded.email,
        tenantId: decoded.tenantId,
        role: decoded.role,
        name: user[0].name || '' // Include name from database
      };
      
      next();
      
    } catch (jwtError) {
      console.error('JWT validation error:', jwtError);
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN' 
      });
    }
    
  } catch (error) {
    console.error('Tenant access validation error:', error);
    return res.status(500).json({ 
      error: 'Authentication validation failed',
      code: 'AUTH_VALIDATION_ERROR' 
    });
  }
};

// Use generateFullToken from auth service for consistency

// Signup endpoint (No tenant isolation needed for signup)
router.post('/signup', async (req, res) => {
  try {
    const validatedData = signupSchema.parse(req.body);
    
    // Check if user already exists (global check, no tenant isolation)
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.email, validatedData.email))
      .limit(1);
    
    if (existingUser.length > 0) {
      return res.status(400).json({ 
        error: 'User already exists',
        code: 'USER_EXISTS' 
      });
    }
    
    // Create tenant if not free plan
    let tenantId = 'free-tier';
    
    if (validatedData.plan !== 'free') {
      try {
        const [tenant] = await db.insert(tenants)
          .values({
            name: validatedData.company || `${validatedData.name}'s Organization`,
            plan: validatedData.plan,
            status: 'active'
          })
          .returning();

        tenantId = tenant.id;
      } catch (tenantError) {
        console.error('Tenant creation error:', tenantError);
        return res.status(500).json({ 
          error: 'Failed to create organization',
          code: 'TENANT_CREATION_FAILED' 
        });
      }
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);
    
    // Create user
    try {
      const [user] = await db.insert(users)
        .values({
          tenantId,
          email: validatedData.email,
          passwordHash: hashedPassword,
          name: validatedData.name,
          role: validatedData.plan !== 'free' ? 'clientAdmin' : 'employee'
        })
        .returning();
      
      // Generate token using the full token generator from auth service
      const token = generateFullToken(user);

      // ✅ PRODUCTION: Set httpOnly cookie (primary authentication)
      res.cookie('mizan_auth_token', token, COOKIE_OPTIONS);

      return res.json({
        success: true,
        token, // Still return token for backward compatibility
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId
        }
      });
      
    } catch (userError) {
      console.error('User creation error:', userError);
      return res.status(500).json({ 
        error: 'Failed to create user account',
        code: 'USER_CREATION_FAILED' 
      });
    }
    
  } catch (error) {
    console.error('Signup error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input data',
        code: 'VALIDATION_ERROR',
        details: error.errors
      });
    }
    
    return res.status(500).json({ 
      error: 'Signup process failed',
      code: 'SIGNUP_ERROR' 
    });
  }
});

// Login endpoint (No tenant isolation needed for login)
router.post('/login', async (req, res) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    
    // Find user (global search, no tenant isolation)
    const userResult = await db.select({
      user: users,
      tenant: tenants
    })
      .from(users)
      .leftJoin(tenants, eq(users.tenantId, tenants.id))
      .where(eq(users.email, validatedData.email))
      .limit(1);
    
    if (userResult.length === 0 || !userResult[0].user.isActive) {
      return res.status(401).json({ 
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS' 
      });
    }
    
    const { user, tenant } = userResult[0];
    
    // Verify tenant is active
    if (tenant && tenant.status !== 'active') {
      return res.status(403).json({ 
        error: 'Organization account is inactive',
        code: 'TENANT_INACTIVE' 
      });
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(validatedData.password, user.passwordHash);
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS' 
      });
    }
    
    // Generate token using the full token generator from auth service
    const token = generateFullToken(user);

    // ✅ PRODUCTION: Set httpOnly cookie (primary authentication)
    res.cookie('mizan_auth_token', token, COOKIE_OPTIONS);

    return res.json({
      success: true,
      token, // Still return token for backward compatibility
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        tenant: tenant
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input data',
        code: 'VALIDATION_ERROR',
        details: error.errors
      });
    }
    
    return res.status(500).json({ 
      error: 'Login process failed',
      code: 'LOGIN_ERROR' 
    });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  try {
    // ✅ PRODUCTION: Clear httpOnly cookie
    res.clearCookie('mizan_auth_token', { path: '/' });

    return res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      error: 'Logout failed',
      code: 'LOGOUT_ERROR'
    });
  }
});

// Get current user (Protected with tenant isolation)
router.get('/me', validateTenantAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'User context not found',
        code: 'USER_CONTEXT_MISSING' 
      });
    }
    
    // Get user with tenant isolation
    const userResult = await db.select({
      user: users,
      tenant: tenants
    })
      .from(users)
      .leftJoin(tenants, eq(users.tenantId, tenants.id))
      .where(
        and(
          eq(users.id, req.user.id),
          eq(users.tenantId, req.user.tenantId),
          eq(users.isActive, true)
        )
      )
      .limit(1);
    
    if (userResult.length === 0) {
      return res.status(404).json({ 
        error: 'User not found in tenant context',
        code: 'USER_NOT_FOUND' 
      });
    }
    
    const { user, tenant } = userResult[0];
    
    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      tenant: tenant
    });
    
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({ 
      error: 'Failed to retrieve user information',
      code: 'GET_USER_ERROR' 
    });
  }
});

// Token verification endpoint (Production-ready as per AGENT_CONTEXT_ULTIMATE.md)
router.get('/verify', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        valid: false,
        error: 'No token provided',
        code: 'MISSING_TOKEN' 
      });
    }
    
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key-change-in-production-xyz123') as TokenUser;
      
      // Validate user exists and is active with tenant isolation
      const user = await db.select()
        .from(users)
        .where(
          and(
            eq(users.id, decoded.id),
            eq(users.tenantId, decoded.tenantId),
            eq(users.isActive, true)
          )
        )
        .limit(1);
      
      if (user.length === 0) {
        return res.status(401).json({ 
          valid: false,
          error: 'User not found or inactive',
          code: 'USER_NOT_FOUND' 
        });
      }
      
      // Validate tenant is active
      const tenant = await db.select()
        .from(tenants)
        .where(
          and(
            eq(tenants.id, decoded.tenantId),
            eq(tenants.status, 'active')
          )
        )
        .limit(1);
      
      if (tenant.length === 0) {
        return res.status(401).json({ 
          valid: false,
          error: 'Tenant inactive',
          code: 'TENANT_INACTIVE' 
        });
      }
      
      return res.json({ 
        valid: true,
        user: {
          id: decoded.id,
          email: decoded.email,
          tenantId: decoded.tenantId,
          role: decoded.role
        }
      });
      
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      return res.status(401).json({ 
        valid: false,
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN' 
      });
    }
    
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(500).json({ 
      valid: false,
      error: 'Verification failed',
      code: 'VERIFICATION_ERROR' 
    });
  }
});

// Token refresh endpoint (Production-ready implementation)
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'No token provided',
        code: 'MISSING_TOKEN' 
      });
    }
    
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key-change-in-production-xyz123') as TokenUser;
      
      // Validate user still exists and is active with tenant isolation
      const userResult = await db.select({
        user: users,
        tenant: tenants
      })
        .from(users)
        .leftJoin(tenants, eq(users.tenantId, tenants.id))
        .where(
          and(
            eq(users.id, decoded.id),
            eq(users.tenantId, decoded.tenantId),
            eq(users.isActive, true)
          )
        )
        .limit(1);
      
      if (userResult.length === 0) {
        return res.status(401).json({ 
          error: 'User not found or inactive',
          code: 'USER_NOT_FOUND' 
        });
      }
      
      const { user, tenant } = userResult[0];
      
      if (tenant && tenant.status !== 'active') {
        return res.status(403).json({ 
          error: 'Tenant inactive',
          code: 'TENANT_INACTIVE' 
        });
      }
      
      // Generate new token with updated expiry
      const newToken = generateFullToken(user);

      // ✅ PRODUCTION: Set httpOnly cookie (primary authentication)
      res.cookie('mizan_auth_token', newToken, COOKIE_OPTIONS);

      return res.json({
        success: true,
        token: newToken, // Still return token for backward compatibility
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId
        }
      });
      
    } catch (jwtError) {
      console.error('JWT refresh error:', jwtError);
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN' 
      });
    }
    
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({ 
      error: 'Refresh failed',
      code: 'REFRESH_ERROR' 
    });
  }
});

export default router;