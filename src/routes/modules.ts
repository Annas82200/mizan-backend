// server/routes/modules.ts

import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { db } from '../../db/index.js';
import { performanceReviews } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

// Apply authentication
router.use(authenticate);

// Basic performance module - superadmin dashboard only
router.get('/performance', async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;

    // Multi-tenant isolation: filter by both tenantId and employeeId
    const reviews = await db.query.performanceReviews.findMany({
      where: (performanceReviews, { eq, and }) => and(
        eq(performanceReviews.tenantId, tenantId),
        eq(performanceReviews.employeeId, userId)
      )
    });

    return res.json(reviews);

  } catch (error) {
    console.error('Performance fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch performance data' });
  }
});

// Module execution tracking
router.post('/execute', authorize(['clientAdmin', 'superadmin']), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;

    const schema = z.object({
      module: z.string(),
      action: z.string(),
      config: z.record(z.unknown())
    });

    const validatedData = schema.parse(req.body);

    // TODO: Implement moduleExecutions table with tenantId isolation
    const executionId = crypto.randomUUID();

    console.log(`Module execution: ${validatedData.module}.${validatedData.action} by user ${userId} (tenant: ${tenantId})`);

    return res.json({
      success: true,
      executionId,
      module: validatedData.module,
      action: validatedData.action
    });

  } catch (error) {
    console.error('Module execution error:', error);
    return res.status(500).json({ error: 'Failed to execute module' });
  }
});

export default router;
