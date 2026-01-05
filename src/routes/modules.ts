// backend/src/routes/modules.ts

import { Router } from 'express';

import { z } from 'zod';

import { authenticate, authorize } from '../middleware/auth';

import { validateTenantAccess } from '../middleware/tenant';

import { db } from '../../db/index';

import { performanceReviews } from '../../db/schema';

import { eq, and } from 'drizzle-orm';
import { logger } from '../services/logger';


const router = Router();

// Apply authentication and tenant validation to all routes
router.use(authenticate);
router.use(validateTenantAccess);

// Basic performance module - superadmin dashboard only
router.get('/performance', async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;

    // Validate tenant access
    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant access required' });
    }

    // Multi-tenant isolation: filter by both tenantId and employeeId
    const reviews = await db.select()
      .from(performanceReviews)
      .where(
        and(
          eq(performanceReviews.tenantId, tenantId),
          eq(performanceReviews.employeeId, userId)
        )
      );

    return res.json(reviews);

  } catch (error) {
    logger.error('Performance fetch error:', error);
    
    // Check for tenant isolation violations
    if (error instanceof Error && error.message.includes('tenant')) {
      return res.status(403).json({ error: 'Unauthorized tenant access' });
    }
    
    return res.status(500).json({ error: 'Failed to fetch performance data' });
  }
});

// Module execution tracking
router.post('/execute', authorize(['clientAdmin', 'superadmin']), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;

    // Validate tenant access
    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant access required' });
    }

    const schema = z.object({
      module: z.string().min(1),
      action: z.string().min(1),
      config: z.record(z.unknown())
    });

    const validatedData = schema.parse(req.body);

    // Create execution record with tenant isolation
    const executionId = crypto.randomUUID();

    // Note: moduleExecutions table not yet implemented
    // Will need to create this table in schema for production
    // await db.insert(moduleExecutions).values({
    //   id: executionId,
    //   tenantId: tenantId, // REQUIRED: Tenant isolation
    //   userId: userId,
    //   module: validatedData.module,
    //   action: validatedData.action,
    //   config: JSON.stringify(validatedData.config),
    //   status: 'pending',
    //   createdAt: new Date(),
    //   updatedAt: new Date()
    // });

    logger.info(`Module execution: ${validatedData.module}.${validatedData.action} by user ${userId} (tenant: ${tenantId})`);

    return res.json({
      success: true,
      executionId,
      module: validatedData.module,
      action: validatedData.action,
      tenantId: tenantId // Include for verification
    });

  } catch (error) {
    logger.error('Module execution error:', error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    
    // Handle tenant access errors
    if (error instanceof Error && error.message.includes('tenant')) {
      return res.status(403).json({ error: 'Unauthorized tenant access' });
    }
    
    return res.status(500).json({ error: 'Failed to execute module' });
  }
});

export default router;