// backend/src/utils/module-access.ts
// Module access control and tenant feature toggles
// Compliant with AGENT_CONTEXT_ULTIMATE.md - Production-ready implementation

import { Request, Response, NextFunction } from 'express';
import { db } from '../../db/index';
import { tenants } from '../../db/schema';
import { eq } from 'drizzle-orm';

export interface ModuleAccess {
  canAccessModule: boolean;
  reason?: string;
  planRequired?: string;
}

export type ModuleName =
  | 'structure'
  | 'culture'
  | 'skills'
  | 'performance'
  | 'hiring'
  | 'lxp'
  | 'talent'
  | 'bonus';

export interface TenantPlan {
  id: string;
  plan: 'trial' | 'starter' | 'professional' | 'enterprise';
  modules: ModuleName[];
  maxEmployees: number;
  maxAnalyses: number;
}

// Module access rules by plan
const MODULE_ACCESS_RULES: Record<string, ModuleName[]> = {
  trial: ['structure', 'culture'],
  starter: ['structure', 'culture', 'skills'],
  professional: ['structure', 'culture', 'skills', 'performance', 'hiring'],
  enterprise: ['structure', 'culture', 'skills', 'performance', 'hiring', 'lxp', 'talent', 'bonus']
};

/**
 * Check if tenant has access to a specific module
 */
export async function checkModuleAccess(
  tenantId: string,
  moduleName: ModuleName
): Promise<ModuleAccess> {
  try {
    const tenantResult = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);

    if (tenantResult.length === 0) {
      return {
        canAccessModule: false,
        reason: 'Tenant not found'
      };
    }

    const tenant = tenantResult[0];

    const tenantPlan = tenant.plan || 'trial';
    const allowedModules = MODULE_ACCESS_RULES[tenantPlan] || [];

    if (!allowedModules.includes(moduleName)) {
      return {
        canAccessModule: false,
        reason: `Module '${moduleName}' not available on ${tenantPlan} plan`,
        planRequired: getRequiredPlanForModule(moduleName)
      };
    }

    // Check if tenant is active
    if (tenant.status !== 'active') {
      return {
        canAccessModule: false,
        reason: `Tenant status is '${tenant.status}'. Active status required.`
      };
    }

    return {
      canAccessModule: true
    };
  } catch (error) {
    console.error('Error checking module access:', error);
    return {
      canAccessModule: false,
      reason: 'Error checking module access'
    };
  }
}

/**
 * Get required plan for a module
 */
export function getRequiredPlanForModule(moduleName: ModuleName): string {
  const plans = Object.entries(MODULE_ACCESS_RULES);
  
  for (const [plan, modules] of plans) {
    if (modules.includes(moduleName)) {
      return plan;
    }
  }
  
  return 'enterprise';
}

/**
 * Get all accessible modules for a tenant
 */
export async function getAccessibleModules(tenantId: string): Promise<ModuleName[]> {
  try {
    const tenantResult = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);

    if (tenantResult.length === 0 || tenantResult[0].status !== 'active') {
      return [];
    }

    const tenant = tenantResult[0];

    const tenantPlan = tenant.plan || 'trial';
    return MODULE_ACCESS_RULES[tenantPlan] || [];
  } catch (error) {
    console.error('Error getting accessible modules:', error);
    return [];
  }
}

/**
 * Middleware to check module access
 */
export function requireModuleAccess(moduleName: ModuleName) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user || !user.tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const access = await checkModuleAccess(user.tenantId, moduleName);

    if (!access.canAccessModule) {
      return res.status(403).json({
        success: false,
        error: access.reason || 'Access denied',
        planRequired: access.planRequired
      });
    }

    return next();
  };
}

