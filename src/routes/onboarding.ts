// @ts-nocheck
/**
 * Onboarding Routes — Workflow management, checklists, mentor matching
 */

import { Router, Request, Response } from 'express';
import { validate } from '../../src/middleware/validate';
import { createWorkflowSchema, createAssignmentSchema } from '../../src/middleware/schemas';
import { db } from '../../db/index';
import { onboardingWorkflows, onboardingAssignments, onboardingChecklists, mentorMatches, onboardingPlans } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';

const router = Router();

interface AuthRequest extends Request {
  userId: string;
  tenantId: string;
  userRole: string;
}

// === Workflows ===

router.get('/workflows', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  try {
    const workflows = await db.select().from(onboardingWorkflows)
      .where(eq(onboardingWorkflows.tenantId, tenantId))
      .orderBy(desc(onboardingWorkflows.createdAt));
    return res.json({ workflows });
  } catch (error) {
    console.error('[API] Error:', (error as Error).message);
    return res.status(500).json({ error: 'Failed to list workflows' });
  }
});

router.post('/workflows', validate(createWorkflowSchema), async (req: Request, res: Response) => {
  const { tenantId, userId } = req as AuthRequest;
  const { name, description, targetRole, targetDepartment, steps, estimatedDurationDays } = req.body;

  try {
    const [workflow] = await db.insert(onboardingWorkflows).values({
      tenantId, name, description, targetRole, targetDepartment,
      steps: steps || [], estimatedDurationDays, createdBy: userId,
    }).returning();
    return res.status(201).json({ workflow });
  } catch (error) {
    console.error('[API] Error:', (error as Error).message);
    return res.status(500).json({ error: 'Failed to create workflow' });
  }
});

// === Assignments ===

router.get('/assignments', async (req: Request, res: Response) => {
  const { tenantId, userId } = req as AuthRequest;
  const role = (req as AuthRequest).userRole;

  try {
    const query = role === 'admin' || role === 'manager'
      ? eq(onboardingAssignments.tenantId, tenantId)
      : and(eq(onboardingAssignments.tenantId, tenantId), eq(onboardingAssignments.employeeId, userId));

    const assignments = await db.select().from(onboardingAssignments).where(query);
    return res.json({ assignments });
  } catch (error) {
    console.error('[API] Error:', (error as Error).message);
    return res.status(500).json({ error: 'Failed to list assignments' });
  }
});

router.post('/assignments', validate(createAssignmentSchema), async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  const { workflowId, employeeId, managerId, buddyId, startDate } = req.body;

  try {
    const [assignment] = await db.insert(onboardingAssignments).values({
      workflowId, tenantId, employeeId, managerId, buddyId, startDate: new Date(startDate),
    }).returning();
    return res.status(201).json({ assignment });
  } catch (error) {
    console.error('[API] Error:', (error as Error).message);
    return res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// === Checklists ===

router.get('/assignments/:id/checklist', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  try {
    const items = await db.select().from(onboardingChecklists)
      .where(and(eq(onboardingChecklists.assignmentId, req.params.id), eq(onboardingChecklists.tenantId, tenantId)));
    return res.json({ checklist: items });
  } catch (error) {
    console.error('[API] Error:', (error as Error).message);
    return res.status(500).json({ error: 'Failed to get checklist' });
  }
});

router.patch('/checklist/:itemId/complete', async (req: Request, res: Response) => {
  const { tenantId, userId } = req as AuthRequest;
  try {
    const [updated] = await db.update(onboardingChecklists).set({
      status: 'completed', completedAt: new Date(), completedBy: userId,
    }).where(and(eq(onboardingChecklists.id, req.params.itemId), eq(onboardingChecklists.tenantId, tenantId))).returning();
    return res.json({ item: updated });
  } catch (error) {
    console.error('[API] Error:', (error as Error).message);
    return res.status(500).json({ error: 'Failed to complete checklist item' });
  }
});

// === Mentor Matches ===

router.get('/mentors', async (req: Request, res: Response) => {
  const { tenantId, userId } = req as AuthRequest;
  try {
    const matches = await db.select().from(mentorMatches)
      .where(and(eq(mentorMatches.tenantId, tenantId), eq(mentorMatches.menteeId, userId)));
    return res.json({ mentors: matches });
  } catch (error) {
    console.error('[API] Error:', (error as Error).message);
    return res.status(500).json({ error: 'Failed to get mentor matches' });
  }
});

// === 30/60/90 Plans ===

router.get('/assignments/:id/plans', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  try {
    const plans = await db.select().from(onboardingPlans)
      .where(and(eq(onboardingPlans.assignmentId, req.params.id), eq(onboardingPlans.tenantId, tenantId)));
    return res.json({ plans });
  } catch (error) {
    console.error('[API] Error:', (error as Error).message);
    return res.status(500).json({ error: 'Failed to get plans' });
  }
});

export default router;
