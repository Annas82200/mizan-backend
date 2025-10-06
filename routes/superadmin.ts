import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { tenants, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authenticate, requireRole } from '../middleware/auth.js';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';

const router = Router();

// Configure multer for CSV upload
const upload = multer({
  dest: './uploads/structure/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

router.use(authenticate);
router.use(requireRole('superadmin'));

/**
 * Create new client/tenant with structure CSV
 */
router.post('/clients', upload.single('structureFile'), async (req: Request, res: Response) => {
  try {
    const { companyName, industry, vision, mission, strategy, values } = req.body;

    // Validate required fields
    if (!companyName || !industry) {
      return res.status(400).json({ error: 'Company name and industry are required' });
    }

    // Parse values JSON string
    let parsedValues: string[] = [];
    if (values) {
      try {
        parsedValues = JSON.parse(values);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid values format' });
      }
    }

    // Create tenant
    const [newTenant] = await db.insert(tenants).values({
      name: companyName,
      industry,
      vision,
      mission,
      strategy,
      values: parsedValues,
      plan: 'pro', // Default plan for new clients
      status: 'active',
      employeeCount: 0
    }).returning();

    // Process CSV file if uploaded
    let employeesCreated = 0;
    if (req.file) {
      try {
        const csvContent = await fs.readFile(req.file.path, 'utf-8');
        const records = parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        });

        // Create users from CSV
        // Expected columns: Name, Email, Title, Department, Manager Email
        for (const record of records) {
          const { Name, Email, Title, Department } = record as any;

          if (!Name || !Email) continue;

          // Generate random password for now
          const tempPassword = Math.random().toString(36).slice(-8);
          const passwordHash = await bcrypt.hash(tempPassword, 10);

          try {
            await db.insert(users).values({
              tenantId: newTenant.id,
              email: Email.toLowerCase(),
              passwordHash,
              name: Name,
              title: Title || null,
              role: 'employee',
              isActive: true
            });
            employeesCreated++;
          } catch (err) {
            // Skip duplicate emails
            console.error(`Skipped user ${Email}:`, err);
          }
        }

        // Update employee count
        await db.update(tenants)
          .set({ employeeCount: employeesCreated })
          .where(eq(tenants.id, newTenant.id));

        // Clean up uploaded file
        await fs.unlink(req.file.path);
      } catch (err: any) {
        console.error('CSV processing error:', err);
        return res.status(400).json({ error: 'Failed to process CSV file: ' + err.message });
      }
    }

    return res.status(201).json({
      success: true,
      tenant: newTenant,
      employeesCreated,
      message: `Client created successfully with ${employeesCreated} employees`
    });

  } catch (error: any) {
    console.error('Client creation error:', error);
    return res.status(500).json({ error: 'Failed to create client: ' + error.message });
  }
});

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
