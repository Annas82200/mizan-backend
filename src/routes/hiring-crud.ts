// @ts-nocheck
/**
 * Hiring CRUD Routes — Requisitions, jobs, applications, interviews
 */
import { Router, Request, Response } from 'express';
import { db } from '../../db/index';
import { positions, employees } from '../../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

const router = Router();
interface AuthRequest extends Request { userId: string; tenantId: string; userRole: string; }

// Overview metrics
router.get('/metrics', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  try {
    const [vacantCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(positions).where(and(eq(positions.tenantId, tenantId), eq(positions.isVacant, true)));
    const [empCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(employees).where(eq(employees.tenantId, tenantId));
    return res.json({ openPositions: Number(vacantCount?.count) || 0, totalEmployees: Number(empCount?.count) || 0 });
  } catch (error) { console.error('[Hiring] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to get metrics' }); }
});

// Positions (acting as requisitions)
router.get('/requisitions', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  try {
    const reqs = await db.select().from(positions).where(eq(positions.tenantId, tenantId)).orderBy(desc(positions.createdAt));
    return res.json({ requisitions: reqs });
  } catch (error) { console.error('[Hiring] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to list requisitions' }); }
});

router.post('/requisitions', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  const { title, departmentId, level, jobFamily } = req.body;
  try {
    const [pos] = await db.insert(positions).values({ tenantId, title, departmentId, level, jobFamily, isVacant: true }).returning();
    return res.status(201).json({ requisition: pos });
  } catch (error) { console.error('[Hiring] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to create requisition' }); }
});

router.patch('/requisitions/:id/status', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  const { isVacant } = req.body;
  try {
    const [updated] = await db.update(positions).set({ isVacant, updatedAt: new Date() }).where(and(eq(positions.id, req.params.id), eq(positions.tenantId, tenantId))).returning();
    return res.json({ requisition: updated });
  } catch (error) { console.error('[Hiring] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to update status' }); }
});

// Bot endpoint
router.post('/bot/chat', async (req: Request, res: Response) => {
  const { tenantId, userId, userRole } = req as AuthRequest;
  try {
    const { AssistantController } = await import('../services/assistant/assistant-controller');
    const controller = new AssistantController();
    const response = await controller.processMessage({ message: req.body.message, tenantId, userId, userRole });
    return res.json(response);
  } catch (error) { console.error('[Hiring Bot] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to process' }); }
});

export default router;
