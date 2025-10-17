// backend/src/routes/auth.ts

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../../db';
import { users, tenants, socialMediaAccounts } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedUser } from '../middleware/auth';

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
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as TokenUser;
      
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

// Helper function to generate JWT
function generateToken(user: any): string {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      tenantId: user.tenantId,
      role: user.role,
      name: user.name
    },
    process.env.JWT_SECRET || 'default-secret',
    { expiresIn: '7d' }
  );
}

// Helper function to validate tenant isolation
async function validateUserTenantAccess(userId: string, tenantId: string): Promise<boolean> {
  try {
    const user = await db.select()
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          eq(users.tenantId, tenantId),
          eq(users.isActive, true)
        )
      )
      .limit(1);
    
    return user.length > 0;
  } catch (error) {
    console.error('Tenant access validation error:', error);
    return false;
  }
}

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
      
      // Generate token
      const token = generateToken(user);
      
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
    
    // Generate token
    const token = generateToken(user);
    
    return res.json({
      success: true,
      token,
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
    // JWT is stateless, so logout is handled client-side
    // This endpoint exists for consistency and future session management
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
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as TokenUser;
      
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
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as TokenUser;
      
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
      const newToken = generateToken(user);
      
      return res.json({
        success: true,
        token: newToken,
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

// Social media OAuth callbacks (Protected with tenant isolation)
router.get('/linkedin/callback', validateTenantAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.redirect(`${process.env.FRONTEND_URL}/settings/social-media?error=authentication-required`);
    }
    
    const { code, state } = req.query;
    
    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/settings/social-media?error=linkedin-no-code`);
    }
    
    // Validate user has access to this tenant
    const hasAccess = await validateUserTenantAccess(req.user.id, req.user.tenantId);
    if (!hasAccess) {
      return res.redirect(`${process.env.FRONTEND_URL}/settings/social-media?error=access-denied`);
    }
    
    // TODO: Exchange code for LinkedIn access token
    // TODO: Store token with tenant isolation
    /*
    await db.insert(socialMediaAccounts)
      .values({
        userId: req.user.id,
        tenantId: req.user.tenantId,
        platform: 'linkedin',
        accessToken: linkedinToken,
        refreshToken: linkedinRefreshToken,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
        isActive: true
      });
    */
    
    res.redirect(`${process.env.FRONTEND_URL}/settings/social-media?status=linkedin-connected`);
  } catch (error) {
    console.error('LinkedIn OAuth error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/settings/social-media?error=linkedin-failed`);
  }
});

router.get('/twitter/callback', validateTenantAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.redirect(`${process.env.FRONTEND_URL}/settings/social-media?error=authentication-required`);
    }
    
    const { oauth_token, oauth_verifier } = req.query;
    
    if (!oauth_token || !oauth_verifier) {
      return res.redirect(`${process.env.FRONTEND_URL}/settings/social-media?error=twitter-no-token`);
    }
    
    // Validate user has access to this tenant
    const hasAccess = await validateUserTenantAccess(req.user.id, req.user.tenantId);
    if (!hasAccess) {
      return res.redirect(`${process.env.FRONTEND_URL}/settings/social-media?error=access-denied`);
    }
    
    // TODO: Exchange tokens for Twitter access token
    // TODO: Store token with tenant isolation
    /*
    await db.insert(socialMediaAccounts)
      .values({
        userId: req.user.id,
        tenantId: req.user.tenantId,
        platform: 'twitter',
        accessToken: twitterToken,
        accessTokenSecret: twitterTokenSecret,
        isActive: true
      });
    */
    
    res.redirect(`${process.env.FRONTEND_URL}/settings/social-media?status=twitter-connected`);
  } catch (error) {
    console.error('Twitter OAuth error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/settings/social-media?error=twitter-failed`);
  }
});

router.get('/facebook/callback', validateTenantAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.redirect(`${process.env.FRONTEND_URL}/settings/social-media?error=authentication-required`);
    }
    
    const { code, state } = req.query;
    
    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/settings/social-media?error=facebook-no-code`);
    }
    
    // Validate user has access to this tenant
    const hasAccess = await validateUserTenantAccess(req.user.id, req.user.tenantId);
    if (!hasAccess) {
      return res.redirect(`${process.env.FRONTEND_URL}/settings/social-media?error=access-denied`);
    }
    
    // TODO: Exchange code for Facebook access token
    // TODO: Store token with tenant isolation
    /*
    await db.insert(socialMediaAccounts)
      .values({
        userId: req.user.id,
        tenantId: req.user.tenantId,
        platform: 'facebook',
        accessToken: facebookToken,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
        isActive: true
      });
    */
    
    res.redirect(`${process.env.FRONTEND_URL}/settings/social-media?status=facebook-connected`);
  } catch (error) {
    console.error('Facebook OAuth error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/settings/social-media?error=facebook-failed`);
  }
});

router.get('/google/callback', validateTenantAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.redirect(`${process.env.FRONTEND_URL}/settings/social-media?error=authentication-required`);
    }
    
    const { code, state } = req.query;
    
    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/settings/social-media?error=google-no-code`);
    }
    
    // Validate user has access to this tenant
    const hasAccess = await validateUserTenantAccess(req.user.id, req.user.tenantId);
    if (!hasAccess) {
      return res.redirect(`${process.env.FRONTEND_URL}/settings/social-media?error=access-denied`);
    }
    
    // TODO: Exchange code for Google access token
    // TODO: Store token with tenant isolation
    /*
    await db.insert(socialMediaAccounts)
      .values({
        userId: req.user.id,
        tenantId: req.user.tenantId,
        platform: 'google',
        accessToken: googleToken,
        refreshToken: googleRefreshToken,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
        isActive: true
      });
    */
    
    res.redirect(`${process.env.FRONTEND_URL}/settings/social-media?status=google-connected`);
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/settings/social-media?error=google-failed`);
  }
});

export default router;