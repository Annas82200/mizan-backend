/**
 * Auth Middleware — Validates JWT tokens and populates request context
 *
 * Extracts tenantId, userId, and userRole from the JWT and attaches
 * them to the request object for use by all downstream route handlers.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  userId: string;
  tenantId: string;
  userRole: string;
  userEmail?: string;
}

interface JWTPayload {
  userId: string;
  tenantId: string;
  role: string;
  email?: string;
  iat?: number;
  exp?: number;
}

// Paths that don't require authentication (GET only for branding)
const PUBLIC_PATHS = new Set([
  '/api/health',
]);

// Branding GET endpoints are public (loaded before login for white-label theming)
const PUBLIC_GET_PATHS = new Set([
  '/api/branding',
  '/api/branding/css',
]);

/**
 * JWT authentication middleware
 * Validates Bearer token and populates req.userId, req.tenantId, req.userRole
 */
export function authMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip auth for fully public paths
    if (PUBLIC_PATHS.has(req.path)) {
      return next();
    }

    // Skip auth for GET-only public paths (branding loads before login)
    if (req.method === 'GET' && PUBLIC_GET_PATHS.has(req.path)) {
      return next();
    }

    // Also skip for OPTIONS (CORS preflight)
    if (req.method === 'OPTIONS') {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required', message: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error('[Auth] JWT_SECRET not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
      const decoded = jwt.verify(token, secret) as JWTPayload;

      // Attach user context to request
      (req as AuthenticatedRequest).userId = decoded.userId;
      (req as AuthenticatedRequest).tenantId = decoded.tenantId;
      (req as AuthenticatedRequest).userRole = decoded.role;
      (req as AuthenticatedRequest).userEmail = decoded.email;

      next();
    } catch (error) {
      if ((error as jwt.JsonWebTokenError).name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired', message: 'Please refresh your authentication token' });
      }
      return res.status(401).json({ error: 'Invalid token', message: 'Authentication token is invalid' });
    }
  };
}
