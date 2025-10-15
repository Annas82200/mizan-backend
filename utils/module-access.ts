// utils/module-access.ts
// Module access control based on subscription tiers

import { db } from '../db/index';
import { tenants } from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Module access matrix
 * Defines which modules are available for each subscription tier
 */
const MODULE_ACCESS: Record<string, string[]> = {
  // Free tier - limited access
  'free': [
    'structure_analysis',  // Basic org structure analysis
    'culture_assessment'   // Basic culture assessment
  ],

  // Basic tier - core HR modules
  'basic': [
    'structure_analysis',
    'culture_assessment',
    'lxp',                // Learning & Development
    'performance'         // Performance Management
  ],

  // Pro tier - advanced features
  'pro': [
    'structure_analysis',
    'culture_assessment',
    'lxp',
    'performance',
    'hiring',            // Recruitment & Hiring
    'onboarding'         // Employee Onboarding
  ],

  // Pro Plus tier - comprehensive HR suite
  'proplus': [
    'structure_analysis',
    'culture_assessment',
    'lxp',
    'performance',
    'hiring',
    'onboarding',
    'retention',         // Retention Intervention
    'talent',            // Talent Management
    'succession'         // Succession Planning
  ],

  // Enterprise tier - full platform access
  'enterprise': [
    'structure_analysis',
    'culture_assessment',
    'lxp',
    'performance',
    'hiring',
    'onboarding',
    'retention',
    'talent',
    'succession',
    'rewards',           // Reward Management
    'compliance',        // Compliance Training
    'safety',            // Safety Training
    'certification',     // Certification Renewal
    'policy',            // Policy Updates
    'leadership',        // Leadership Transition
    'restructuring',     // Team Restructuring
    'proactive_training' // Proactive Training
  ]
};

/**
 * Check if a tenant has access to a specific module
 * @param tenantId - The tenant ID to check
 * @param moduleName - The module to check access for
 * @returns Promise<boolean> - True if tenant has access, false otherwise
 */
export async function checkModuleAccess(
  tenantId: string,
  moduleName: string
): Promise<boolean> {
  try {
    // Fetch tenant subscription information
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId)
    });

    if (!tenant) {
      console.warn(`Tenant ${tenantId} not found`);
      return false;
    }

    // Check if tenant is active
    if (tenant.status !== 'active') {
      console.warn(`Tenant ${tenantId} is not active (status: ${tenant.status})`);
      return false;
    }

    // Get subscription tier
    const subscriptionTier = tenant.plan || 'free';

    // Check if module is accessible for this tier
    const accessibleModules = MODULE_ACCESS[subscriptionTier] || MODULE_ACCESS['free'];
    const hasAccess = accessibleModules.includes(moduleName);

    if (!hasAccess) {
      console.log(
        `Tenant ${tenantId} (${subscriptionTier} tier) does not have access to ${moduleName} module`
      );
    }

    return hasAccess;
  } catch (error) {
    console.error('Error checking module access:', error);
    return false; // Fail closed - deny access on error
  }
}

/**
 * Get all modules accessible for a tenant
 * @param tenantId - The tenant ID
 * @returns Promise<string[]> - Array of accessible module names
 */
export async function getAccessibleModules(tenantId: string): Promise<string[]> {
  try {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId)
    });

    if (!tenant || tenant.status !== 'active') {
      return MODULE_ACCESS['free']; // Return free tier modules
    }

    const subscriptionTier = tenant.plan || 'free';
    return MODULE_ACCESS[subscriptionTier] || MODULE_ACCESS['free'];
  } catch (error) {
    console.error('Error getting accessible modules:', error);
    return MODULE_ACCESS['free'];
  }
}

/**
 * Get recommended upgrade tier for a module
 * @param moduleName - The module name
 * @returns string - The minimum tier needed for this module
 */
export function getRequiredTier(moduleName: string): string {
  for (const [tier, modules] of Object.entries(MODULE_ACCESS)) {
    if (modules.includes(moduleName)) {
      return tier;
    }
  }
  return 'enterprise'; // Default to highest tier
}

/**
 * Middleware to check module access for API routes
 */
export function requireModuleAccess(moduleName: string) {
  return async (req: any, res: any, next: any) => {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({
        error: 'Authentication required',
        module: moduleName
      });
    }

    const hasAccess = await checkModuleAccess(tenantId, moduleName);

    if (!hasAccess) {
      const requiredTier = getRequiredTier(moduleName);
      return res.status(403).json({
        error: 'Module not available in your subscription tier',
        module: moduleName,
        requiredTier: requiredTier,
        upgradeUrl: `/upgrade?tier=${requiredTier}`
      });
    }

    next();
  };
}
