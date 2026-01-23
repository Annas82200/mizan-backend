import { Router, Request, Response } from 'express';

import { talentAgent, TalentTriggerSchema } from '../services/agents/talent/talent-agent';

import { authenticate, authorize } from '../middleware/auth';

import { validateTenantAccess } from '../middleware/tenant';

import { z } from 'zod';
import { logger } from '../services/logger';
import { db } from '../../db/index';
import { talentProfiles, successionPlans, developmentPlans, criticalRoles } from '../../db/schema/performance';
import { users, departments } from '../../db/schema/core';
import { eq, and, desc, sql } from 'drizzle-orm';


const router = Router();

/**
 * GET /api/talent/overview
 * Get talent overview metrics and data for the current user's tenant
 */
router.get('/overview', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user: { id: string; tenantId: string } }).user;

    // Get talent profiles from database
    const profiles = await db.select()
      .from(talentProfiles)
      .where(eq(talentProfiles.tenantId, user.tenantId));

    // Get users for name mapping
    const tenantUsers = await db.select()
      .from(users)
      .where(eq(users.tenantId, user.tenantId));

    const userMap = new Map(tenantUsers.map(u => [u.id, u]));

    // Get critical roles
    const roles = await db.select()
      .from(criticalRoles)
      .where(eq(criticalRoles.tenantId, user.tenantId));

    // Get succession plans
    const plans = await db.select()
      .from(successionPlans)
      .where(eq(successionPlans.tenantId, user.tenantId));

    // Calculate metrics from real data
    const highPotentialCount = profiles.filter(p => p.potentialRating === 'high').length;
    const mediumPotentialCount = profiles.filter(p => p.potentialRating === 'medium').length;
    const readyNowCount = profiles.filter(p => p.readinessLevel === 'ready_now').length;
    const readySoonCount = profiles.filter(p => p.readinessLevel === 'ready_1_year').length;

    const rolesWithSuccessors = plans.filter(p => {
      const successors = p.successors as Array<unknown>;
      return Array.isArray(successors) && successors.length > 0;
    }).length;

    const metrics = {
      totalTalent: profiles.length,
      highPotential: highPotentialCount,
      mediumPotential: mediumPotentialCount,
      lowPotential: profiles.length - highPotentialCount - mediumPotentialCount,
      readyNow: readyNowCount,
      readySoon: readySoonCount,
      developing: profiles.length - readyNowCount - readySoonCount,
      criticalRolesCovered: rolesWithSuccessors,
      totalCriticalRoles: roles.length,
      averageReadiness: profiles.length > 0
        ? Math.round((readyNowCount * 100 + readySoonCount * 75 + (profiles.length - readyNowCount - readySoonCount) * 40) / profiles.length)
        : 0
    };

    // Build top talent from high-potential profiles
    const topTalent = profiles
      .filter(p => p.potentialRating === 'high')
      .slice(0, 10)
      .map(p => {
        const userData = userMap.get(p.employeeId);
        return {
          id: p.employeeId,
          name: userData?.name || 'Unknown Employee',
          email: userData?.email || '',
          role: userData?.role || 'Employee',
          department: userData?.departmentId || 'General',
          potentialRating: p.potentialRating || 'medium',
          performanceRating: p.performanceRating || 'medium',
          readinessLevel: p.readinessLevel || 'developing',
          strengths: p.strengths || [],
          developmentAreas: p.developmentAreas || []
        };
      });

    // Build critical roles list
    const criticalRolesList = roles.map(role => {
      const plan = plans.find(p => p.roleId === role.id);
      const successors = plan?.successors as Array<unknown> || [];
      return {
        id: role.id,
        title: role.title,
        department: role.department || 'General',
        vacancyRisk: role.vacancyRisk || 'medium',
        successors: Array.isArray(successors) ? successors.length : 0
      };
    });

    res.json({
      metrics,
      topTalent,
      criticalRoles: criticalRolesList
    });
  } catch (error) {
    logger.error('Error fetching talent overview:', error);
    res.status(500).json({ error: 'Failed to fetch talent overview' });
  }
});

/**
 * GET /api/talent/profiles
 * Get talent profiles for identification/assessment
 */
router.get('/profiles', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user: { id: string; tenantId: string } }).user;

    // Get talent profiles
    const profiles = await db.select()
      .from(talentProfiles)
      .where(eq(talentProfiles.tenantId, user.tenantId))
      .orderBy(desc(talentProfiles.updatedAt));

    // Get users for enrichment
    const tenantUsers = await db.select()
      .from(users)
      .where(eq(users.tenantId, user.tenantId));

    const userMap = new Map(tenantUsers.map(u => [u.id, u]));

    const enrichedProfiles = profiles.map(p => {
      const userData = userMap.get(p.employeeId);
      return {
        id: p.id,
        employeeId: p.employeeId,
        name: userData?.name || 'Unknown Employee',
        email: userData?.email || '',
        role: userData?.role || 'Employee',
        department: userData?.departmentId || 'General',
        potentialRating: p.potentialRating || 'medium',
        performanceRating: p.performanceRating || 'medium',
        nineBoxPosition: p.nineBoxPosition || `${p.performanceRating || 'medium'}-${p.potentialRating || 'medium'}`,
        readinessLevel: p.readinessLevel || 'developing',
        strengths: p.strengths || [],
        developmentAreas: p.developmentAreas || [],
        careerAspirations: p.careerAspirations || '',
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      };
    });

    res.json({ profiles: enrichedProfiles });
  } catch (error) {
    logger.error('Error fetching talent profiles:', error);
    res.status(500).json({ error: 'Failed to fetch talent profiles' });
  }
});

/**
 * GET /api/talent/succession
 * Get succession planning data
 */
router.get('/succession', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user: { id: string; tenantId: string } }).user;

    // Get succession plans
    const plans = await db.select()
      .from(successionPlans)
      .where(eq(successionPlans.tenantId, user.tenantId))
      .orderBy(desc(successionPlans.updatedAt));

    // Get critical roles
    const roles = await db.select()
      .from(criticalRoles)
      .where(eq(criticalRoles.tenantId, user.tenantId));

    // Get users for enrichment
    const tenantUsers = await db.select()
      .from(users)
      .where(eq(users.tenantId, user.tenantId));

    const userMap = new Map(tenantUsers.map(u => [u.id, u]));

    // Build critical roles with successors
    const criticalRolesWithSuccessors = roles.map(role => {
      const plan = plans.find(p => p.roleId === role.id);
      const incumbentUser = role.incumbentId ? userMap.get(role.incumbentId) : null;
      const successorsList = (plan?.successors as Array<{ employeeId: string; readiness: string; score: number }>) || [];

      return {
        id: role.id,
        title: role.title,
        department: role.department || 'General',
        incumbent: incumbentUser?.name || 'Vacant',
        incumbentId: role.incumbentId,
        vacancyRisk: role.vacancyRisk || 'medium',
        readinessGap: plan?.readinessGap || 0,
        successors: successorsList.map(s => {
          const successorUser = userMap.get(s.employeeId);
          return {
            employeeId: s.employeeId,
            name: successorUser?.name || 'Unknown',
            readiness: s.readiness || 'developing',
            score: s.score || 0
          };
        })
      };
    });

    // Calculate metrics
    const totalWithSuccessors = criticalRolesWithSuccessors.filter(r => r.successors.length > 0).length;
    const atRiskCount = criticalRolesWithSuccessors.filter(r => r.vacancyRisk === 'high').length;

    const metrics = {
      totalCriticalRoles: roles.length,
      rolesWithSuccessors: totalWithSuccessors,
      rolesAtRisk: atRiskCount,
      averageReadiness: roles.length > 0
        ? Math.round((totalWithSuccessors / roles.length) * 100)
        : 0,
      totalSuccessors: criticalRolesWithSuccessors.reduce((sum, r) => sum + r.successors.length, 0)
    };

    res.json({
      criticalRoles: criticalRolesWithSuccessors,
      metrics
    });
  } catch (error) {
    logger.error('Error fetching succession data:', error);
    res.status(500).json({ error: 'Failed to fetch succession data' });
  }
});

/**
 * GET /api/talent/development
 * Get development plans
 */
router.get('/development', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user: { id: string; tenantId: string } }).user;

    // Get development plans
    const plans = await db.select()
      .from(developmentPlans)
      .where(eq(developmentPlans.tenantId, user.tenantId))
      .orderBy(desc(developmentPlans.updatedAt));

    // Get users for enrichment
    const tenantUsers = await db.select()
      .from(users)
      .where(eq(users.tenantId, user.tenantId));

    const userMap = new Map(tenantUsers.map(u => [u.id, u]));

    const enrichedPlans = plans.map(plan => {
      const userData = userMap.get(plan.employeeId);
      return {
        id: plan.id,
        employeeId: plan.employeeId,
        employeeName: userData?.name || 'Unknown Employee',
        employeeEmail: userData?.email || '',
        title: plan.title,
        currentRole: plan.currentRole || userData?.role || 'Employee',
        targetRole: plan.targetRole || '',
        strengths: plan.strengths || [],
        developmentAreas: plan.developmentAreas || [],
        activities: plan.activities || [],
        progress: plan.progress || 0,
        status: plan.status || 'active',
        startDate: plan.startDate,
        targetDate: plan.targetDate,
        createdAt: plan.createdAt
      };
    });

    res.json({
      plans: enrichedPlans,
      totalPlans: plans.length
    });
  } catch (error) {
    logger.error('Error fetching development plans:', error);
    res.status(500).json({ error: 'Failed to fetch development plans' });
  }
});

/**
 * GET /api/talent/analytics
 * Get talent analytics data
 */
router.get('/analytics', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user: { id: string; tenantId: string } }).user;

    // Get all talent profiles
    const profiles = await db.select()
      .from(talentProfiles)
      .where(eq(talentProfiles.tenantId, user.tenantId));

    // Get critical roles and succession plans for coverage metrics
    const roles = await db.select()
      .from(criticalRoles)
      .where(eq(criticalRoles.tenantId, user.tenantId));

    const plans = await db.select()
      .from(successionPlans)
      .where(eq(successionPlans.tenantId, user.tenantId));

    // Calculate 9-box distribution from real data
    const distribution: Record<string, number> = {
      'high-high': 0, 'high-medium': 0, 'high-low': 0,
      'medium-high': 0, 'medium-medium': 0, 'medium-low': 0,
      'low-high': 0, 'low-medium': 0, 'low-low': 0
    };

    profiles.forEach(p => {
      const perf = p.performanceRating || 'medium';
      const pot = p.potentialRating || 'medium';
      const key = `${perf}-${pot}`;
      if (key in distribution) {
        distribution[key]++;
      }
    });

    // Calculate metrics
    const highPotentialCount = profiles.filter(p => p.potentialRating === 'high').length;
    const readyNowCount = profiles.filter(p => p.readinessLevel === 'ready_now').length;
    const rolesWithSuccessors = plans.filter(p => {
      const successors = p.successors as Array<unknown>;
      return Array.isArray(successors) && successors.length > 0;
    }).length;

    const metrics = [
      { label: 'Total Talent Pool', value: profiles.length, change: 0, trend: 'stable' as const },
      { label: 'High Potentials', value: highPotentialCount, change: 0, trend: 'stable' as const },
      { label: 'Ready Now', value: readyNowCount, change: 0, trend: 'stable' as const },
      {
        label: 'Succession Coverage',
        value: roles.length > 0 ? `${Math.round((rolesWithSuccessors / roles.length) * 100)}%` : '0%',
        change: 0,
        trend: 'stable' as const
      }
    ];

    // Get users for department breakdown
    const tenantUsers = await db.select()
      .from(users)
      .where(eq(users.tenantId, user.tenantId));

    // Department breakdown
    const deptMap = new Map<string, { total: number; highPotential: number }>();
    profiles.forEach(p => {
      const userData = tenantUsers.find(u => u.id === p.employeeId);
      const dept = userData?.departmentId || 'General';
      const current = deptMap.get(dept) || { total: 0, highPotential: 0 };
      current.total++;
      if (p.potentialRating === 'high') current.highPotential++;
      deptMap.set(dept, current);
    });

    const departmentBreakdown = Array.from(deptMap.entries()).map(([dept, data]) => ({
      department: dept,
      highPotential: data.highPotential,
      total: data.total
    }));

    // 9-box distribution for visualization
    const nineBoxDistribution = [
      [
        { label: 'Stars', count: distribution['high-high'], performance: 'high', potential: 'high' },
        { label: 'High Performers', count: distribution['high-medium'], performance: 'high', potential: 'medium' },
        { label: 'Solid Performers', count: distribution['high-low'], performance: 'high', potential: 'low' }
      ],
      [
        { label: 'High Potentials', count: distribution['medium-high'], performance: 'medium', potential: 'high' },
        { label: 'Core Contributors', count: distribution['medium-medium'], performance: 'medium', potential: 'medium' },
        { label: 'Steady Performers', count: distribution['medium-low'], performance: 'medium', potential: 'low' }
      ],
      [
        { label: 'Rough Diamonds', count: distribution['low-high'], performance: 'low', potential: 'high' },
        { label: 'Inconsistent', count: distribution['low-medium'], performance: 'low', potential: 'medium' },
        { label: 'Low Performers', count: distribution['low-low'], performance: 'low', potential: 'low' }
      ]
    ];

    res.json({
      metrics,
      departmentBreakdown,
      trendData: [], // Would need historical data table for real trends
      insights: [], // Would need AI analysis for real insights
      nineBoxDistribution,
      nineBoxSummary: {
        highPotential: distribution['high-high'] + distribution['medium-high'] + distribution['low-high'],
        mediumPotential: distribution['high-medium'] + distribution['medium-medium'] + distribution['low-medium'],
        lowPotential: distribution['high-low'] + distribution['medium-low'] + distribution['low-low']
      }
    });
  } catch (error) {
    logger.error('Error fetching talent analytics:', error);
    res.status(500).json({ error: 'Failed to fetch talent analytics' });
  }
});

/**
 * POST /api/talent/trigger
 * Receives a trigger to run talent analysis for an employee.
 * This is an internal-facing API, likely called by other services (e.g., Performance, Skills)
 * 
 * Security: Requires authentication, authorization, and tenant isolation
 */
router.post('/trigger', 
    authenticate, 
    authorize(['system', 'superadmin', 'clientAdmin']), 
    validateTenantAccess,
    async (req, res) => {
        try {
            const user = req.user;
            
            if (!user || !user.tenantId) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Unauthorized: Missing tenant information' 
                });
            }

            // Validate input data
            const validatedInput = TalentTriggerSchema.parse(req.body);

            // Ensure tenant isolation - add tenantId to the trigger data
            const tenantIsolatedInput = {
                ...validatedInput,
                tenantId: user.tenantId
            };

            // Process the talent trigger with tenant isolation
            const result = await talentAgent.handleTalentTrigger(tenantIsolatedInput);

            res.json({
                success: true,
                message: 'Talent trigger processed successfully.',
                data: result,
            });

        } catch (error: unknown) {
            logger.error('Talent trigger error:', error);

            if (error instanceof z.ZodError) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Invalid input data', 
                    details: error.errors 
                });
            }
            
            if (error instanceof Error) {
                // Check for tenant access errors
                if (error.message.includes('Unauthorized') || error.message.includes('tenant')) {
                    return res.status(403).json({ 
                        success: false, 
                        error: 'Access denied: Insufficient tenant permissions' 
                    });
                }
                
                return res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }

            res.status(500).json({ 
                success: false, 
                error: 'Failed to process talent trigger' 
            });
        }
    }
);

/**
 * GET /api/talent/nine-box/:tenantId
 * Retrieves the 9-box distribution for a specific tenant
 * 
 * Security: Requires authentication, authorization, and tenant isolation
 */
router.get('/nine-box/:tenantId', 
    authenticate, 
    authorize(['superadmin', 'clientAdmin']), 
    validateTenantAccess,
    async (req, res) => {
        try {
            const user = req.user;
            const requestedTenantId = req.params.tenantId;

            if (!user || !user.tenantId) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Unauthorized: Missing tenant information' 
                });
            }

            // Validate tenant access - ensure user can only access their own tenant data
            if (user.role !== 'superadmin' && user.tenantId !== requestedTenantId) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Access denied: Cannot access other tenant data' 
                });
            }

            const nineBoxData = await talentAgent.getNineBoxDistribution(requestedTenantId);

            res.json({
                success: true,
                message: '9-box distribution retrieved successfully.',
                data: nineBoxData,
            });

        } catch (error: unknown) {
            logger.error('Nine-box retrieval error:', error);
            
            if (error instanceof Error) {
                if (error.message.includes('Unauthorized') || error.message.includes('tenant')) {
                    return res.status(403).json({ 
                        success: false, 
                        error: 'Access denied: Insufficient tenant permissions' 
                    });
                }
                
                return res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }

            res.status(500).json({ 
                success: false, 
                error: 'Failed to retrieve 9-box distribution' 
            });
        }
    }
);

/**
 * GET /api/talent/succession-plans/:tenantId
 * Retrieves succession plans for a specific tenant
 * 
 * Security: Requires authentication, authorization, and tenant isolation
 */
router.get('/succession-plans/:tenantId', 
    authenticate, 
    authorize(['superadmin', 'clientAdmin']), 
    validateTenantAccess,
    async (req, res) => {
        try {
            const user = req.user;
            const requestedTenantId = req.params.tenantId;

            if (!user || !user.tenantId) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Unauthorized: Missing tenant information' 
                });
            }

            // Validate tenant access - ensure user can only access their own tenant data
            if (user.role !== 'superadmin' && user.tenantId !== requestedTenantId) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Access denied: Cannot access other tenant data' 
                });
            }

            const successionPlans = await talentAgent.getSuccessionPlans(requestedTenantId);

            res.json({
                success: true,
                message: 'Succession plans retrieved successfully.',
                data: successionPlans,
            });

        } catch (error: unknown) {
            logger.error('Succession plans retrieval error:', error);
            
            if (error instanceof Error) {
                if (error.message.includes('Unauthorized') || error.message.includes('tenant')) {
                    return res.status(403).json({ 
                        success: false, 
                        error: 'Access denied: Insufficient tenant permissions' 
                    });
                }
                
                return res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }

            res.status(500).json({ 
                success: false, 
                error: 'Failed to retrieve succession plans' 
            });
        }
    }
);

/**
 * GET /api/talent/development-plans/:tenantId
 * Retrieves talent development plans for a specific tenant
 * 
 * Security: Requires authentication, authorization, and tenant isolation
 */
router.get('/development-plans/:tenantId', 
    authenticate, 
    authorize(['superadmin', 'clientAdmin']), 
    validateTenantAccess,
    async (req, res) => {
        try {
            const user = req.user;
            const requestedTenantId = req.params.tenantId;

            if (!user || !user.tenantId) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Unauthorized: Missing tenant information' 
                });
            }

            // Validate tenant access - ensure user can only access their own tenant data
            if (user.role !== 'superadmin' && user.tenantId !== requestedTenantId) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Access denied: Cannot access other tenant data' 
                });
            }

            const developmentPlans = await talentAgent.getDevelopmentPlans(requestedTenantId);

            res.json({
                success: true,
                message: 'Development plans retrieved successfully.',
                data: developmentPlans,
            });

        } catch (error: unknown) {
            logger.error('Development plans retrieval error:', error);
            
            if (error instanceof Error) {
                if (error.message.includes('Unauthorized') || error.message.includes('tenant')) {
                    return res.status(403).json({ 
                        success: false, 
                        error: 'Access denied: Insufficient tenant permissions' 
                    });
                }
                
                return res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }

            res.status(500).json({ 
                success: false, 
                error: 'Failed to retrieve development plans' 
            });
        }
    }
);

/**
 * POST /api/talent/update-nine-box-config/:tenantId
 * Updates the 9-box configuration for a specific tenant
 * 
 * Security: Requires authentication, authorization, and tenant isolation
 */
router.post('/update-nine-box-config/:tenantId', 
    authenticate, 
    authorize(['superadmin', 'clientAdmin']), 
    validateTenantAccess,
    async (req, res) => {
        try {
            const user = req.user;
            const requestedTenantId = req.params.tenantId;

            if (!user || !user.tenantId) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Unauthorized: Missing tenant information' 
                });
            }

            // Validate tenant access - ensure user can only access their own tenant data
            if (user.role !== 'superadmin' && user.tenantId !== requestedTenantId) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Access denied: Cannot access other tenant data' 
                });
            }

            // Validate the configuration data
            const configSchema = z.object({
                customBoxNames: z.record(z.string(), z.string()).optional(),
                performanceThresholds: z.array(z.number()).optional(),
                potentialThresholds: z.array(z.number()).optional()
            });

            const validatedConfig = configSchema.parse(req.body);

            const updatedConfig = await talentAgent.updateNineBoxConfig(
                requestedTenantId, 
                validatedConfig
            );

            res.json({
                success: true,
                message: '9-box configuration updated successfully.',
                data: updatedConfig,
            });

        } catch (error: unknown) {
            logger.error('9-box config update error:', error);

            if (error instanceof z.ZodError) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Invalid configuration data', 
                    details: error.errors 
                });
            }
            
            if (error instanceof Error) {
                if (error.message.includes('Unauthorized') || error.message.includes('tenant')) {
                    return res.status(403).json({ 
                        success: false, 
                        error: 'Access denied: Insufficient tenant permissions' 
                    });
                }
                
                return res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }

            res.status(500).json({ 
                success: false, 
                error: 'Failed to update 9-box configuration' 
            });
        }
    }
);

export default router;