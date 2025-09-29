import { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.js';
import { tenants, users } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

// Extend Request interface to include tenant information
declare global {
  namespace Express {
    interface Request {
      tenant?: {
        id: string;
        name: string;
        domain: string | null;
        plan: string;
        status: string;
        industry: string | null;
        employeeCount: number | null;
      };
    }
  }
}

/**
 * Middleware to identify and validate tenant from request
 * Supports multiple tenant identification methods:
 * 1. Subdomain (tenant.mizan.ai)
 * 2. Custom domain (company.com)
 * 3. Header-based (X-Tenant-ID)
 * 4. User-based (from authenticated user's tenant)
 */
export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let tenantId: string | null = null;
    let identificationMethod = 'unknown';

    // Method 1: Extract from subdomain
    const host = req.get('host') || '';
    const subdomain = extractSubdomain(host);
    
    if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
      const tenant = await db.select()
        .from(tenants)
        .where(eq(tenants.domain, subdomain))
        .limit(1);
      
      if (tenant.length > 0) {
        tenantId = tenant[0].id;
        identificationMethod = 'subdomain';
      }
    }

    // Method 2: Check for custom domain
    if (!tenantId) {
      const tenant = await db.select()
        .from(tenants)
        .where(eq(tenants.domain, host))
        .limit(1);
      
      if (tenant.length > 0) {
        tenantId = tenant[0].id;
        identificationMethod = 'custom_domain';
      }
    }

    // Method 3: Check X-Tenant-ID header
    if (!tenantId) {
      const headerTenantId = req.get('X-Tenant-ID');
      if (headerTenantId) {
        const tenant = await db.select()
          .from(tenants)
          .where(eq(tenants.id, headerTenantId))
          .limit(1);
        
        if (tenant.length > 0) {
          tenantId = tenant[0].id;
          identificationMethod = 'header';
        }
      }
    }

    // Method 4: Extract from authenticated user
    if (!tenantId && req.user) {
      const user = await db.select()
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1);
      
      if (user.length > 0 && user[0].tenantId) {
        tenantId = user[0].tenantId;
        identificationMethod = 'user';
      }
    }

    // If tenant identified, load full tenant information
    if (tenantId) {
      const tenant = await db.select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);
      
      if (tenant.length > 0) {
        const tenantData = tenant[0];
        
        // Check if tenant is active
        if (tenantData.status !== 'active') {
          return res.status(403).json({
            error: 'Tenant account is inactive',
            code: 'TENANT_INACTIVE'
          });
        }

        // Attach tenant information to request
        req.tenant = {
          id: tenantData.id,
          name: tenantData.name,
          domain: tenantData.domain,
          plan: tenantData.plan,
          status: tenantData.status,
          industry: tenantData.industry,
          employeeCount: tenantData.employeeCount
        };

        // Add tenant context to response headers for debugging
        res.set('X-Tenant-Context', tenantData.id);
        res.set('X-Tenant-Method', identificationMethod);
      }
    }

    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'TENANT_MIDDLEWARE_ERROR'
    });
  }
};

/**
 * Middleware to require tenant identification
 * Use this for endpoints that must have a tenant context
 */
export const requireTenant = (req: Request, res: Response, next: NextFunction) => {
  if (!req.tenant) {
    return res.status(400).json({
      error: 'Tenant identification required',
      code: 'TENANT_REQUIRED',
      hint: 'Ensure request includes tenant information via subdomain, custom domain, header, or authenticated user'
    });
  }
  next();
};

/**
 * Middleware to check tenant tier and feature access
 */
export const checkTierAccess = (requiredTier: string, feature?: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenant) {
      return res.status(400).json({
        error: 'Tenant identification required',
        code: 'TENANT_REQUIRED'
      });
    }

    const tierHierarchy = {
      'free': 0,
      'starter': 1,
      'professional': 2,
      'enterprise': 3
    };

    const userTierLevel = tierHierarchy[req.tenant.plan as keyof typeof tierHierarchy] || 0;
    const requiredTierLevel = tierHierarchy[requiredTier as keyof typeof tierHierarchy] || 0;

    if (userTierLevel < requiredTierLevel) {
      return res.status(403).json({
        error: 'Insufficient tier access',
        code: 'TIER_ACCESS_DENIED',
        currentTier: req.tenant.plan,
        requiredTier,
        feature
      });
    }

    next();
  };
};

/**
 * Middleware to enforce data isolation
 * Ensures queries are scoped to the current tenant
 */
export const enforceDataIsolation = (req: Request, res: Response, next: NextFunction) => {
  if (!req.tenant) {
    return res.status(400).json({
      error: 'Tenant context required for data access',
      code: 'TENANT_CONTEXT_REQUIRED'
    });
  }

  // Add tenant filter to common query parameters
  if (req.query) {
    req.query.tenantId = req.tenant.id;
  }

  // Add tenant context to request body for POST/PUT requests
  if (req.body && typeof req.body === 'object') {
    req.body.tenantId = req.tenant.id;
  }

  next();
};

/**
 * Middleware to check resource ownership within tenant
 */
export const checkResourceOwnership = (resourceIdParam: string = 'id') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.tenant) {
        return res.status(400).json({
          error: 'Tenant context required',
          code: 'TENANT_CONTEXT_REQUIRED'
        });
      }

      const resourceId = req.params[resourceIdParam];
      if (!resourceId) {
        return res.status(400).json({
          error: 'Resource ID required',
          code: 'RESOURCE_ID_REQUIRED'
        });
      }

      // This is a generic check - specific implementations should override
      // with actual resource ownership validation
      next();
    } catch (error) {
      console.error('Resource ownership check error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        code: 'OWNERSHIP_CHECK_ERROR'
      });
    }
  };
};

/**
 * Middleware to log tenant activity for analytics and auditing
 */
export const logTenantActivity = (action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.tenant) {
      // Log tenant activity - in production, this would go to a logging service
      console.log(`[TENANT_ACTIVITY] ${req.tenant.id} - ${action} - ${req.method} ${req.path}`, {
        tenantId: req.tenant.id,
        tenantName: req.tenant.name,
        action,
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
    }
    next();
  };
};

/**
 * Utility function to extract subdomain from host
 */
function extractSubdomain(host: string): string | null {
  const parts = host.split('.');
  
  // For localhost development
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return null;
  }
  
  // For production domains (e.g., tenant.mizan.ai)
  if (parts.length >= 3) {
    return parts[0];
  }
  
  return null;
}

/**
 * Utility function to get tenant settings with defaults
 */
export const getTenantSettings = (tenant: any, key?: string, defaultValue?: any) => {
  if (!tenant || !tenant.settings) {
    return defaultValue;
  }

  if (key) {
    return tenant.settings[key] !== undefined ? tenant.settings[key] : defaultValue;
  }

  return tenant.settings;
};

/**
 * Utility function to check if tenant has specific feature enabled
 */
export const hasTenantFeature = (tenant: any, feature: string): boolean => {
  if (!tenant || !tenant.settings) {
    return false;
  }

  const features = tenant.settings.features || {};
  return features[feature] === true;
};

/**
 * Utility function to get tenant usage limits
 */
export const getTenantLimits = (tenant: any) => {
  const tierLimits = {
    free: {
      employees: 50,
      assessments: 10,
      reports: 5,
      storage: 1024 * 1024 * 100, // 100MB
      apiCalls: 1000
    },
    starter: {
      employees: 200,
      assessments: 50,
      reports: 25,
      storage: 1024 * 1024 * 500, // 500MB
      apiCalls: 5000
    },
    professional: {
      employees: 1000,
      assessments: 200,
      reports: 100,
      storage: 1024 * 1024 * 1024 * 2, // 2GB
      apiCalls: 25000
    },
    enterprise: {
      employees: -1, // Unlimited
      assessments: -1,
      reports: -1,
      storage: -1,
      apiCalls: -1
    }
  };

  const tier = tenant?.tier || 'free';
  return tierLimits[tier as keyof typeof tierLimits] || tierLimits.free;
};

/**
 * Middleware to check usage limits
 */
export const checkUsageLimits = (resource: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.tenant) {
        return res.status(400).json({
          error: 'Tenant context required',
          code: 'TENANT_CONTEXT_REQUIRED'
        });
      }

      const limits = getTenantLimits(req.tenant);
      const limit = limits[resource as keyof typeof limits];

      // If limit is -1, it's unlimited (enterprise tier)
      if (limit === -1) {
        return next();
      }

      // Check current usage - this would be implemented based on specific resource
      // For now, we'll just pass through
      // TODO: Implement actual usage checking logic

      next();
    } catch (error) {
      console.error('Usage limit check error:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'USAGE_LIMIT_CHECK_ERROR'
      });
    }
  };
};
