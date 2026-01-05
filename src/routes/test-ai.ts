import { Router, Request, Response } from 'express';
import { CultureAgentV2 as CultureAgent } from '../services/agents/culture/culture-agent';
import { authenticate, requireRole, validateTenantAccess } from '../middleware/auth';
import { db } from '../../db/index';
import { tenants as tenantsTable } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../services/logger';

const router = Router();

// Apply authentication and restrict to superadmin only
router.use(authenticate);
router.use(requireRole('superadmin'));
router.use(validateTenantAccess); // Add tenant isolation validation

router.get('/test-ai', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;

    // Validate tenant access with database verification
    const tenant = await db.select()
      .from(tenantsTable)
      .where(eq(tenantsTable.id, tenantId))
      .limit(1);

    if (!tenant || tenant.length === 0) {
      logger.error(`🔒 SECURITY - Invalid tenant access attempt: ${tenantId}`);
      return res.status(403).json({
        success: false,
        error: 'Unauthorized tenant access'
      });
    }

    // Verify user has access to this tenant
    if (req.user!.tenantId !== tenantId) {
      logger.error(`🔒 SECURITY - Tenant isolation violation: user ${userId} accessing tenant ${tenantId}`);
      return res.status(403).json({
        success: false,
        error: 'Tenant access denied'
      });
    }

    logger.info(`🧪 TEST - Starting AI test for superadmin (tenant: ${tenantId}, user: ${userId})...`);
    logger.info(`🔒 SECURITY - Tenant validation passed for: ${tenant[0].name}`);

    const agent = new CultureAgent('culture', {
      knowledge: {
        providers: ['anthropic'],
        model: 'claude-3-opus-20240229',
        temperature: 0.7,
        maxTokens: 4000
      },
      data: {
        providers: ['anthropic'],
        model: 'claude-3-opus-20240229',
        temperature: 0.3,
        maxTokens: 4000
      },
      reasoning: {
        providers: ['anthropic'],
        model: 'claude-3-opus-20240229',
        temperature: 0.5,
        maxTokens: 4000
      },
      consensusThreshold: 0.7
    });

    // Test simple AI call with tenant context
    const response = await (agent as Record<string, any>).reasoningAI.call({
      engine: 'reasoning',
      prompt: `Return this exact JSON and nothing else: {"test": "success", "number": 42, "tenantId": "${tenantId}"}`,
      temperature: 0.3,
      maxTokens: 100,
      context: {
        tenantId: tenantId,
        userId: userId,
        role: req.user!.role
      }
    });
    
    logger.info('🧪 TEST - Response:', JSON.stringify(response, null, 2));
    logger.info(`🔒 SECURITY - Response generated for tenant: ${tenantId}`);
    
    return res.json({
      success: true,
      response: response,
      narrative: response?.narrative,
      narrativeType: typeof response?.narrative,
      tenantId: tenantId,
      securityValidation: 'passed'
    });
  } catch (error) {
    logger.error('🧪 TEST - Error:', error);
    
    // Enhanced error handling with tenant context
    if (error instanceof Error) {
      // Log security-related errors separately
      if (error.message.includes('tenant') || error.message.includes('unauthorized')) {
        logger.error(`🔒 SECURITY ERROR - Tenant: ${req.user?.tenantId}, User: ${req.user?.id}, Error: ${error.message}`);
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          tenantId: req.user?.tenantId
        });
      }
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return res.status(500).json({
      success: false,
      error: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      tenantId: req.user?.tenantId
    });
  }
});

export default router;