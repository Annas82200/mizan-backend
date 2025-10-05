import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { tenants, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('superadmin'));

/**
 * Get all tenants with user counts
 */
router.get('/tenants', async (req: Request, res: Response) => {
  const allTenants = await db.query.tenants.findMany({
    with: {
      users: true
    }
  });

  const tenantsWithCounts = allTenants.map(tenant => ({
    ...tenant,
    userCount: tenant.users.length,
    users: undefined
  }));

  return res.json({
    tenants: tenantsWithCounts,
    total: allTenants.length
  });
});

/**
 * Get tenant details by ID
 */
router.get('/tenants/:tenantId', async (req: Request, res: Response) => {
  const { tenantId } = req.params;

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    with: {
      users: true
    }
  });

  if (!tenant) {
    return res.status(404).json({
      error: 'Tenant not found'
    });
  }

  return res.json(tenant);
});

/**
 * Update tenant settings
 */
router.patch('/tenants/:tenantId', async (req: Request, res: Response) => {
  const { tenantId } = req.params;
  const updates = req.body;

  const allowedFields = ['name', 'plan', 'status', 'industry', 'size', 'domain'];
  const filteredUpdates: any = {};

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      filteredUpdates[field] = updates[field];
    }
  }

  if (Object.keys(filteredUpdates).length === 0) {
    return res.status(400).json({
      error: 'No valid fields to update'
    });
  }

  filteredUpdates.updatedAt = new Date();

  await db.update(tenants)
    .set(filteredUpdates)
    .where(eq(tenants.id, tenantId));

  const updatedTenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId)
  });

  return res.json(updatedTenant);
});

/**
 * Get all users across all tenants
 */
router.get('/users', async (req: Request, res: Response) => {
  const allUsers = await db.query.users.findMany({
    with: {
      tenant: true
    }
  });

  return res.json({
    users: allUsers,
    total: allUsers.length
  });
});

/**
 * Update user role or status
 */
router.patch('/users/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { role, isActive } = req.body;

  const updates: any = { updatedAt: new Date() };

  if (role) updates.role = role;
  if (typeof isActive === 'boolean') updates.isActive = isActive;

  await db.update(users)
    .set(updates)
    .where(eq(users.id, userId));

  const updatedUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: {
      tenant: true
    }
  });

  return res.json(updatedUser);
});

export default router;
