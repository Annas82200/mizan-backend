/**
 * Performance Routes — Goals, evaluations, meetings, calibration
 */
import { Router, Request, Response } from 'express';
import { db } from '../db/index';
import { developmentPlans, employees } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';

const router = Router();
interface AuthRequest extends Request { userId: string; tenantId: string; userRole: string; }

// Overview metrics
router.get('/metrics', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  try {
    const plans = await db.select().from(developmentPlans).where(eq(developmentPlans.tenantId, tenantId));
    const active = plans.filter(p => p.status === 'in_progress');
    const completed = plans.filter(p => p.status === 'completed');
    return res.json({ totalPlans: plans.length, activePlans: active.length, completedPlans: completed.length, avgProgress: active.length > 0 ? Math.round(active.reduce((s, p) => s + (p.progressPercentage || 0), 0) / active.length) : 0 });
  } catch (error) { console.error('[Performance] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to get metrics' }); }
});

// Goals (using developmentPlans as goals container)
router.get('/goals', async (req: Request, res: Response) => {
  const { tenantId, userId } = req as AuthRequest;
  try {
    const goals = await db.select().from(developmentPlans).where(and(eq(developmentPlans.employeeId, userId), eq(developmentPlans.tenantId, tenantId))).orderBy(desc(developmentPlans.createdAt));
    return res.json({ goals });
  } catch (error) { console.error('[Performance] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to list goals' }); }
});

router.post('/goals', async (req: Request, res: Response) => {
  const { tenantId, userId } = req as AuthRequest;
  const { title, targetRole, objectives, skillTargets, startDate, targetCompletionDate } = req.body;
  try {
    const [goal] = await db.insert(developmentPlans).values({ tenantId, employeeId: userId, title, targetRole, objectives: objectives || [], skillTargets: skillTargets || [], startDate: startDate ? new Date(startDate) : undefined, targetCompletionDate: targetCompletionDate ? new Date(targetCompletionDate) : undefined }).returning();
    return res.status(201).json({ goal });
  } catch (error) { console.error('[Performance] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to create goal' }); }
});

router.put('/goals/:id', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  try {
    const { title, targetRole, objectives, skillTargets, learningActivities, startDate, targetCompletionDate, progressPercentage, status } = req.body;
    const [updated] = await db.update(developmentPlans).set({ title, targetRole, objectives, skillTargets, learningActivities, startDate: startDate ? new Date(startDate) : undefined, targetCompletionDate: targetCompletionDate ? new Date(targetCompletionDate) : undefined, progressPercentage, status, updatedAt: new Date() }).where(and(eq(developmentPlans.id, req.params.id), eq(developmentPlans.tenantId, tenantId))).returning();
    return res.json({ goal: updated });
  } catch (error) { console.error('[Performance] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to update goal' }); }
});

router.delete('/goals/:id', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  try {
    await db.delete(developmentPlans).where(and(eq(developmentPlans.id, req.params.id), eq(developmentPlans.tenantId, tenantId)));
    return res.json({ deleted: true });
  } catch (error) { console.error('[Performance] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to delete goal' }); }
});

// Activity feed
router.get('/activity', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  try {
    const recent = await db.select().from(developmentPlans).where(eq(developmentPlans.tenantId, tenantId)).orderBy(desc(developmentPlans.updatedAt)).limit(10);
    return res.json({ activity: recent.map(p => ({ id: p.id, title: p.title, status: p.status, progress: p.progressPercentage, updatedAt: p.updatedAt })) });
  } catch (error) { console.error('[Performance] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to get activity' }); }
});

// Bot endpoint
router.post('/bot/chat', async (req: Request, res: Response) => {
  const { tenantId, userId, userRole } = req as AuthRequest;
  try {
    const { AssistantController } = await import('../services/assistant/assistant-controller');
    const controller = new AssistantController();
    const response = await controller.processMessage({ message: req.body.message, tenantId, userId, userRole });
    return res.json(response);
  } catch (error) { console.error('[Performance Bot] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to process' }); }
});

export default router;
