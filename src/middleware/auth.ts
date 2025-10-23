import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../../db/index';
import { users, tenants } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { verifyToken } from '../services/auth';

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: string;
  departmentId?: string;
  managerId?: string;
}

export const validateTenantAccess = authenticate;

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
    try {
        // ✅ PRODUCTION: Read token from httpOnly cookie first, fallback to Authorization header
        let token: string | undefined;

        // Priority 1: Check httpOnly cookie (secure, preferred method)
        if (req.cookies && req.cookies.mizan_auth_token) {
            token = req.cookies.mizan_auth_token;
        }
        // Priority 2: Check Authorization header (backward compatibility)
        else if (req.headers.authorization) {
            const authHeader = req.headers.authorization;
            const parts = authHeader.split(' ');

            if (parts.length !== 2) {
                return res.status(401).json({ error: 'Token error' });
            }

            const [scheme, headerToken] = parts;

            if (!/^Bearer$/i.test(scheme)) {
                return res.status(401).json({ error: 'Token malformatted' });
            }

            token = headerToken;
        }

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // Verify token using the auth service
        const decoded = verifyToken(token);

        if (!decoded) {
            console.error('Token verification failed - invalid token');
            return res.status(401).json({ error: 'Token invalid' });
        }

        if (!decoded.userId) {
            console.error('Token verification failed - no userId in token');
            return res.status(401).json({ error: 'Token invalid' });
        }

        // Fetch user data from database with proper error handling
        let userData;
        try {
            const userResult = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);
            userData = userResult[0];
        } catch (dbError) {
            console.error('Database error during user lookup:', dbError);
            console.error('Error details:', {
                message: dbError instanceof Error ? dbError.message : 'Unknown',
                stack: dbError instanceof Error ? dbError.stack : undefined,
                userId: decoded.userId,
                databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET'
            });
            return res.status(500).json({ 
                error: 'Database error',
                details: process.env.NODE_ENV === 'development' ? (dbError instanceof Error ? dbError.message : 'Unknown error') : undefined
            });
        }

        if (!userData) {
            console.error('User not found in database:', decoded.userId);
            return res.status(401).json({ error: 'User not found' });
        }

        if (!userData.isActive) {
            console.error('User account is inactive:', decoded.userId);
            return res.status(401).json({ error: 'User account is inactive' });
        }

        // Verify tenant is active if user has a tenant
        if (userData.tenantId) {
            try {
                const tenantResult = await db.select().from(tenants).where(eq(tenants.id, userData.tenantId)).limit(1);
                const tenant = tenantResult[0];
                if (tenant && tenant.status !== 'active') {
                    console.error('Tenant is inactive:', userData.tenantId);
                    return res.status(403).json({ error: 'Tenant account is inactive' });
                }
            } catch (tenantError) {
                console.error('Error checking tenant status:', tenantError);
                console.error('Tenant error details:', {
                    message: tenantError instanceof Error ? tenantError.message : 'Unknown',
                    stack: tenantError instanceof Error ? tenantError.stack : undefined,
                    tenantId: userData.tenantId,
                    databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET'
                });
                return res.status(500).json({ 
                    error: 'Database error',
                    details: process.env.NODE_ENV === 'development' ? (tenantError instanceof Error ? tenantError.message : 'Unknown error') : undefined
                });
            }
        }

        // Set the authenticated user with all required properties
        req.user = {
            id: userData.id,
            tenantId: userData.tenantId,
            email: userData.email,
            name: userData.name || '',
            role: userData.role,
            departmentId: userData.departmentId || undefined,
            managerId: userData.managerId || undefined
        };

        next();
    } catch (error: unknown) {
        console.error('Authentication middleware error:', error);
        if (error instanceof Error) {
            return res.status(401).json({ error: 'Token invalid', details: error.message });
        }
        return res.status(401).json({ error: 'Token invalid' });
    }
}

export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role
      });
      return;
    }

    next();
  };
};

export const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (req.user.role !== role) {
      res.status(403).json({ 
        error: `${role} role required`,
        current: req.user.role
      });
      return;
    }

    next();
  };
};

export const requireSuperAdmin = requireRole('superadmin');
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (!['admin', 'superadmin'].includes(req.user.role)) {
    res.status(403).json({ 
      error: 'Admin role required',
      current: req.user.role
    });
    return;
  }

  next();
};

export const requireTenantAccess = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // Add tenant validation logic here if needed
  // For now, just ensure user has a tenantId
  if (!req.user.tenantId) {
    res.status(403).json({ error: 'Tenant access required' });
    return;
  }

  next();
};