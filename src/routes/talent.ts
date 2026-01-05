import { Router } from 'express';
import { talentAgent, TalentTriggerSchema } from '../services/agents/talent/talent-agent';
import { authenticate, authorize } from '../middleware/auth';
import { validateTenantAccess } from '../middleware/tenant';
import { z } from 'zod';

const router = Router();

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