/**
 * Bonus Routes — Cycles, criteria, pools, allocations, calculations
 */
import { Router, Request, Response } from 'express';
import { db } from '../../db/index';
import { bonusCycles, bonusCriteria, bonusPools, bonusAllocations } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';

const router = Router();
interface AuthRequest extends Request { userId: string; tenantId: string; userRole: string; }

// Overview
router.get('/overview', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  try {
    const cycles = await db.select().from(bonusCycles).where(eq(bonusCycles.tenantId, tenantId)).orderBy(desc(bonusCycles.createdAt));
    const activeCycle = cycles.find(c => c.status !== 'closed');
    return res.json({ cycles, activeCycle: activeCycle || null, totalCycles: cycles.length });
  } catch (error) { console.error('[Bonus] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to get overview' }); }
});

// Criteria
router.get('/criteria', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  const cycleId = req.query.cycleId as string;
  try {
    const criteria = cycleId
      ? await db.select().from(bonusCriteria).where(and(eq(bonusCriteria.tenantId, tenantId), eq(bonusCriteria.cycleId, cycleId)))
      : await db.select().from(bonusCriteria).where(eq(bonusCriteria.tenantId, tenantId));
    return res.json({ criteria });
  } catch (error) { console.error('[Bonus] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to list criteria' }); }
});

router.post('/criteria', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  const { cycleId, name, description, weight, sourceModule, calculationMethod, calculationConfig } = req.body;
  try {
    const [criterion] = await db.insert(bonusCriteria).values({ cycleId, tenantId, name, description, weight, sourceModule, calculationMethod, calculationConfig }).returning();
    return res.status(201).json({ criterion });
  } catch (error) { console.error('[Bonus] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to create criterion' }); }
});

// Allocations (recommendations)
router.get('/recommendations', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  try {
    const allocs = await db.select().from(bonusAllocations).where(eq(bonusAllocations.tenantId, tenantId)).orderBy(desc(bonusAllocations.createdAt));
    return res.json({ recommendations: allocs });
  } catch (error) { console.error('[Bonus] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to get recommendations' }); }
});

router.post('/recommendations/:id/approve', async (req: Request, res: Response) => {
  const { tenantId, userId } = req as AuthRequest;
  try {
    const [updated] = await db.update(bonusAllocations).set({ status: 'approved', approvedBy: userId, approvedAt: new Date(), updatedAt: new Date() }).where(and(eq(bonusAllocations.id, req.params.id), eq(bonusAllocations.tenantId, tenantId))).returning();
    return res.json({ allocation: updated });
  } catch (error) { console.error('[Bonus] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to approve' }); }
});

// Analytics
router.get('/analytics', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  try {
    const allocs = await db.select().from(bonusAllocations).where(eq(bonusAllocations.tenantId, tenantId));
    const approved = allocs.filter(a => a.status === 'approved');
    const totalDistributed = approved.reduce((sum, a) => sum + (a.finalAmount || 0), 0);
    return res.json({ totalAllocations: allocs.length, approved: approved.length, totalDistributed });
  } catch (error) { console.error('[Bonus] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to get analytics' }); }
});

export default router;
