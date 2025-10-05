// server/routes/modules.ts

import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { db } from '../db/index.js';
import {
  hiringRequisitions,
  performanceReviews
} from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

const router = Router();

// Apply authentication
router.use(authenticate);

// Hiring module
router.get('/hiring', authorize(['clientAdmin', 'superadmin']), async (req, res) => {
  try {
    const requisitions = await db.query.hiringRequisitions.findMany({
      where: eq(hiringRequisitions.tenantId, req.user!.tenantId)
    });

    return res.json(requisitions);

  } catch (error) {
    console.error('Hiring fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch hiring data' });
  }
});

router.post('/hiring/requisition', authorize(['clientAdmin', 'superadmin']), async (req, res) => {
  try {
    const schema = z.object({
      companyId: z.string().uuid(),
      departmentId: z.string().uuid(),
      title: z.string(),
      description: z.string(),
      requirements: z.array(z.string()),
      targetStartDate: z.string().datetime()
    });
    
    const validatedData = schema.parse(req.body);

    const [requisition] = await db.insert(hiringRequisitions)
      .values({
        tenantId: req.user!.tenantId,
        positionTitle: validatedData.title,
        department: validatedData.departmentId,
        level: 'mid' as const, // Default value, should be provided by client
        type: 'full_time' as const, // Default value
        location: 'Remote', // Default value, should be provided by client
        description: validatedData.description,
        responsibilities: [],
        qualifications: validatedData.requirements,
        requiredSkills: [],
        compensationRange: { min: 0, max: 0, currency: 'USD' }, // Default, should be provided
        targetStartDate: new Date(validatedData.targetStartDate),
        requestedBy: req.user!.id, // User who created the requisition
        hiringManagerId: req.user!.id // Default to requester, should be updateable
      })
      .returning();
    
    return res.json(requisition);
    
  } catch (error) {
    console.error('Requisition creation error:', error);
    return res.status(500).json({ error: 'Failed to create requisition' });
  }
});

// Performance module
router.get('/performance', async (req, res) => {
  try {
    const reviews = await db.query.performanceReviews.findMany({
      where: eq(performanceReviews.employeeId, req.user!.id),
      with: {
        goals: true,
        metrics: true
      }
    });
    
    return res.json(reviews);
    
  } catch (error) {
    console.error('Performance fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch performance data' });
  }
});

// Talent module
router.get('/talent', authorize(['clientAdmin', 'superadmin']), async (req, res) => {
  try {
    // TODO: Implement talent profiles table
    return res.json([]);
  } catch (error) {
    console.error('Talent fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch talent data' });
  }
});

// Succession module
router.get('/succession', authorize(['clientAdmin', 'superadmin']), async (req, res) => {
  try {
    // TODO: Implement succession plans table
    return res.json([]);
  } catch (error) {
    console.error('Succession fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch succession data' });
  }
});

// Compensation module
router.get('/compensation', authorize(['clientAdmin', 'superadmin']), async (req, res) => {
  try {
    // TODO: Implement compensation data table
    return res.json([]);
  } catch (error) {
    console.error('Compensation fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch compensation data' });
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
