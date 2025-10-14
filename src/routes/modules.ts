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
    const reviews = await db.query.performanceReviews.findMany({
      where: eq(performanceReviews.employeeId, req.user!.id)
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
    const schema = z.object({
      module: z.string(),
      action: z.string(),
      config: z.any()
    });

    const validatedData = schema.parse(req.body);

    // TODO: Implement moduleExecutions table
    const executionId = crypto.randomUUID();

    return res.json({
      success: true,
      executionId
    });

  } catch (error) {
    console.error('Module execution error:', error);
    return res.status(500).json({ error: 'Failed to execute module' });
  }
});

export default router;
