/**
 * Module Configuration Routes — Enable/disable modules, configure parameters, manage workflows
 */

import { Router, Request, Response } from 'express';
import { db } from '../db/index';
import { moduleConfigs, moduleParameters, approvalWorkflows, approvalRequests } from '../db/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

const VALID_MODULE_IDS = new Set([
  'structure', 'culture', 'skills', 'performance', 'hiring',
  'onboarding', 'lxp', 'talent', 'bonus', 'engagement',
]);

interface AuthRequest extends Request {
  userId: string;
  tenantId: string;
}

// Validation middleware for moduleId parameter
function validateModuleId(req: Request, res: Response, next: Function) {
  const moduleId = req.params.moduleId;
  if (moduleId && !VALID_MODULE_IDS.has(moduleId)) {
    return res.status(400).json({
      error: 'Invalid module ID',
      valid: Array.from(VALID_MODULE_IDS),
    });
  }
  next();
}

// Non-parameterized routes MUST be registered BEFORE /:moduleId to avoid conflict
// === Approval Workflows (prefix: /workflows) ===

router.get('/workflows', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  try {
    const workflows = await db.select().from(approvalWorkflows).where(eq(approvalWorkflows.tenantId, tenantId));
    return res.json({ workflows });
  } catch (error) { console.error('[API] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to list workflows' }); }
});

router.post('/workflows', async (req: Request, res: Response) => {
  const { tenantId, userId } = req as AuthRequest;
  const { name, description, moduleId, triggerEvent, steps } = req.body;
  try {
    const [workflow] = await db.insert(approvalWorkflows).values({ tenantId, name, description, moduleId, triggerEvent, steps, createdBy: userId }).returning();
    return res.status(201).json({ workflow });
  } catch (error) { console.error('[API] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to create workflow' }); }
});

// === Approval Requests (prefix: /approvals) ===

router.get('/approvals', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  const status = req.query.status as string;
  try {
    let query = eq(approvalRequests.tenantId, tenantId);
    const requests = await db.select().from(approvalRequests).where(query);
    return res.json({ requests: status ? requests.filter(r => r.status === status) : requests });
  } catch (error) { console.error('[API] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to list approvals' }); }
});

router.post('/approvals', async (req: Request, res: Response) => {
  const { tenantId, userId } = req as AuthRequest;
  const { workflowId, entityType, entityId, metadata } = req.body;
  try {
    const [request_] = await db.insert(approvalRequests).values({ workflowId, tenantId, requesterId: userId, entityType, entityId, metadata: metadata || {} }).returning();
    return res.status(201).json({ request: request_ });
  } catch (error) { console.error('[API] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to create approval' }); }
});

router.patch('/approvals/:id/approve', async (req: Request, res: Response) => {
  const { tenantId, userId } = req as AuthRequest;
  const { comment } = req.body;
  try {
    const [updated] = await db.update(approvalRequests).set({
      status: 'approved', approvalHistory: [{ step: 1, approverId: userId, action: 'approved', comment, timestamp: new Date().toISOString() }], updatedAt: new Date(),
    }).where(and(eq(approvalRequests.id, req.params.id), eq(approvalRequests.tenantId, tenantId))).returning();
    return res.json({ request: updated });
  } catch (error) { console.error('[API] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to approve' }); }
});

router.patch('/approvals/:id/reject', async (req: Request, res: Response) => {
  const { tenantId, userId } = req as AuthRequest;
  const { comment } = req.body;
  try {
    const [updated] = await db.update(approvalRequests).set({
      status: 'rejected', approvalHistory: [{ step: 1, approverId: userId, action: 'rejected', comment, timestamp: new Date().toISOString() }], updatedAt: new Date(),
    }).where(and(eq(approvalRequests.id, req.params.id), eq(approvalRequests.tenantId, tenantId))).returning();
    return res.json({ request: updated });
  } catch (error) { console.error('[API] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to reject' }); }
});

// === Module Config (parameterized routes — AFTER non-parameterized) ===

router.param('moduleId', validateModuleId as any);

router.get('/', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  try {
    const modules = await db.select().from(moduleConfigs)
      .where(eq(moduleConfigs.tenantId, tenantId));
    return res.json({ modules });
  } catch (error) {
    console.error('[API] Error:', (error as Error).message);
    return res.status(500).json({ error: 'Failed to list modules' });
  }
});

// Get specific module config
router.get('/:moduleId', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  try {
    const rows = await db.select().from(moduleConfigs)
      .where(and(eq(moduleConfigs.tenantId, tenantId), eq(moduleConfigs.moduleId, req.params.moduleId as any)))
      .limit(1);

    if (rows.length === 0) return res.status(404).json({ error: 'Module config not found' });
    return res.json({ module: rows[0] });
  } catch (error) {
    console.error('[API] Error:', (error as Error).message);
    return res.status(500).json({ error: 'Failed to get module config' });
  }
});

// Update module config
router.put('/:moduleId', async (req: Request, res: Response) => {
  const { tenantId, userId } = req as AuthRequest;
  const { settings, featureFlags, customLabel, customIcon, displayOrder } = req.body;

  try {
    const existing = await db.select().from(moduleConfigs)
      .where(and(eq(moduleConfigs.tenantId, tenantId), eq(moduleConfigs.moduleId, req.params.moduleId as any)))
      .limit(1);

    if (existing.length === 0) {
      const [created] = await db.insert(moduleConfigs).values({
        tenantId,
        moduleId: req.params.moduleId as any,
        isEnabled: true,
        isConfigured: true,
        configuredBy: userId,
        configuredAt: new Date(),
        settings: settings || {},
        featureFlags: featureFlags || {},
        customLabel,
        customIcon,
        displayOrder,
      }).returning();
      return res.status(201).json({ module: created });
    }

    const [updated] = await db.update(moduleConfigs).set({
      settings, featureFlags, customLabel, customIcon, displayOrder,
      configuredBy: userId, configuredAt: new Date(), updatedAt: new Date(),
    }).where(and(eq(moduleConfigs.tenantId, tenantId), eq(moduleConfigs.moduleId, req.params.moduleId as any))).returning();

    return res.json({ module: updated });
  } catch (error) {
    console.error('[API] Error:', (error as Error).message);
    return res.status(500).json({ error: 'Failed to update module config' });
  }
});

// Toggle module enabled/disabled
router.patch('/:moduleId/toggle', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  const { isEnabled } = req.body;

  try {
    const [updated] = await db.update(moduleConfigs).set({
      isEnabled, updatedAt: new Date(),
    }).where(and(eq(moduleConfigs.tenantId, tenantId), eq(moduleConfigs.moduleId, req.params.moduleId as any))).returning();

    return res.json({ module: updated });
  } catch (error) {
    console.error('[API] Error:', (error as Error).message);
    return res.status(500).json({ error: 'Failed to toggle module' });
  }
});

// === Module Parameters ===

router.get('/:moduleId/parameters', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  try {
    const configs = await db.select().from(moduleConfigs)
      .where(and(eq(moduleConfigs.tenantId, tenantId), eq(moduleConfigs.moduleId, req.params.moduleId as any)))
      .limit(1);

    if (configs.length === 0) return res.json({ parameters: [] });

    const params = await db.select().from(moduleParameters)
      .where(eq(moduleParameters.moduleConfigId, configs[0].id));

    return res.json({ parameters: params });
  } catch (error) {
    console.error('[API] Error:', (error as Error).message);
    return res.status(500).json({ error: 'Failed to get parameters' });
  }
});

export default router;
