// server/routes/modules.ts

import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { 
  hiringRequisitions,
  performanceReviews,
  talentProfiles,
  successionPlans,
  compensationData,
  moduleExecutions
} from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

const router = Router();

// Apply authentication
router.use(authenticate);

// Hiring module
router.get('/hiring', authorize(['clientAdmin', 'superadmin']), async (req, res) => {
  try {
    const requisitions = await db.query.hiringRequisitions.findMany({
      where: eq(hiringRequisitions.tenantId, req.user.tenantId),
      with: {
        createdByUser: true,
        assignedToUser: true
      }
    });
    
    res.json(requisitions);
    
  } catch (error) {
    console.error('Hiring fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch hiring data' });
  }
});

moduleRouter.post('/hiring/requisition', auth2(['clientAdmin', 'superadmin']), async (req, res) => {
  try {
    const schema = zod.object({
      companyId: zod.string().uuid(),
      departmentId: zod.string().uuid(),
      title: zod.string(),
      description: zod.string(),
      requirements: zod.array(zod.string()),
      targetStartDate: zod.string().datetime()
    });
    
    const validatedData = schema.parse(req.body);
    
    const [requisition] = await database.insert(hiringRequisitions)
      .values({
        id: crypto.randomUUID(),
        tenantId: req.user.tenantId,
        ...validatedData,
        status: 'draft',
        createdBy: req.user.id,
        createdAt: new Date()
      })
      .returning();
    
    res.json(requisition);
    
  } catch (error) {
    console.error('Requisition creation error:', error);
    res.status(500).json({ error: 'Failed to create requisition' });
  }
});

// Performance module
moduleRouter.get('/performance', async (req, res) => {
  try {
    const reviews = await database.query.performanceReviews.findMany({
      where: equal(performanceReviews.employeeId, req.user.id),
      with: {
        reviewer: true
      }
    });
    
    res.json(reviews);
    
  } catch (error) {
    console.error('Performance fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch performance data' });
  }
});

// Talent module
moduleRouter.get('/talent', auth2(['clientAdmin', 'superadmin']), async (req, res) => {
  try {
    const profiles = await database.query.talentProfiles.findMany({
      where: equal(talentProfiles.tenantId, req.user.tenantId),
      with: {
        employee: true
      }
    });
    
    res.json(profiles);
    
  } catch (error) {
    console.error('Talent fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch talent data' });
  }
});

// Succession module
moduleRouter.get('/succession', auth2(['clientAdmin', 'superadmin']), async (req, res) => {
  try {
    const plans = await database.query.successionPlans.findMany({
      where: equal(successionPlans.tenantId, req.user.tenantId),
      with: {
        position: true,
        candidates: true
      }
    });
    
    res.json(plans);
    
  } catch (error) {
    console.error('Succession fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch succession data' });
  }
});

// Compensation module
moduleRouter.get('/compensation', auth2(['clientAdmin', 'superadmin']), async (req, res) => {
  try {
    const compensationInfo = await database.query.compensationData.findMany({
      where: equal(compensationData.tenantId, req.user.tenantId)
    });
    
    res.json(compensationInfo);
    
  } catch (error) {
    console.error('Compensation fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch compensation data' });
  }
});

// Module execution tracking
moduleRouter.post('/execute', auth2(['clientAdmin', 'superadmin']), async (req, res) => {
  try {
    const schema = zod.object({
      module: zod.string(),
      action: zod.string(),
      config: zod.any()
    });
    
    const validatedData = schema.parse(req.body);
    
    const [execution] = await database.insert(moduleExecutions)
      .values({
        id: crypto.randomUUID(),
        tenantId: req.user.tenantId,
        ...validatedData,
        status: 'pending',
        executedBy: req.user.id,
        createdAt: new Date()
      })
      .returning();
    
    // TODO: Trigger actual module execution
    
    res.json({
      success: true,
      executionId: execution.id
    });
    
  } catch (error) {
    console.error('Module execution error:', error);
    res.status(500).json({ error: 'Failed to execute module' });
  }
});

export default moduleRouter;
