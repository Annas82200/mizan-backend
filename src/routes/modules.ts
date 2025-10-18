// backend/src/routes/modules.ts

import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth';
import { validateTenantAccess } from '../middleware/tenant';
import { db } from '../../db/index';
import { performanceReviews } from '../../db/schema';
// Note: moduleExecutions table not yet implemented in schema
import { eq, and } from 'drizzle-orm';

const router = Router();

// Apply authentication and tenant validation to all routes
router.use(authenticate);
router.use(validateTenantAccess);

// Basic performance module - superadmin dashboard only
router.get('/performance', async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;

    // Validate tenant access
    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant access required' });
    }

    // Multi-tenant isolation: filter by both tenantId and employeeId
    const reviews = await db.select()
      .from(performanceReviews)
      .where(
        and(
          eq(performanceReviews.tenantId, tenantId),
          eq(performanceReviews.employeeId, userId)
        )
      );

    return res.json(reviews);

  } catch (error) {
    console.error('Performance fetch error:', error);
    
    // Check for tenant isolation violations
    if (error instanceof Error && error.message.includes('tenant')) {
      return res.status(403).json({ error: 'Unauthorized tenant access' });
    }
    
    return res.status(500).json({ error: 'Failed to fetch performance data' });
  }
});

// Module execution tracking
router.post('/execute', authorize(['clientAdmin', 'superadmin']), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;

    // Validate tenant access
    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant access required' });
    }

    const schema = z.object({
      module: z.string().min(1),
      action: z.string().min(1),
      config: z.record(z.unknown())
    });

    const validatedData = schema.parse(req.body);

    // Create execution record with tenant isolation
    const executionId = crypto.randomUUID();
    
    await db.insert(moduleExecutions).values({
      id: executionId,
      tenantId: tenantId, // REQUIRED: Tenant isolation
      userId: userId,
      module: validatedData.module,
      action: validatedData.action,
      config: JSON.stringify(validatedData.config),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log(`Module execution: ${validatedData.module}.${validatedData.action} by user ${userId} (tenant: ${tenantId})`);

    return res.json({
      success: true,
      executionId,
      module: validatedData.module,
      action: validatedData.action,
      tenantId: tenantId // Include for verification
    });

  } catch (error) {
    console.error('Module execution error:', error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    
    // Handle tenant access errors
    if (error instanceof Error && error.message.includes('tenant')) {
      return res.status(403).json({ error: 'Unauthorized tenant access' });
    }
    
    return res.status(500).json({ error: 'Failed to execute module' });
  }
});

// Get module executions for tenant (admin/superadmin only)
router.get('/executions', authorize(['clientAdmin', 'superadmin']), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;

    // Validate tenant access
    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant access required' });
    }

    // Multi-tenant isolation: only return executions for user's tenant
    const executions = await db.select()
      .from(moduleExecutions)
      .where(eq(moduleExecutions.tenantId, tenantId))
      .orderBy(moduleExecutions.createdAt);

    return res.json(executions);

  } catch (error) {
    console.error('Module executions fetch error:', error);
    
    // Handle tenant access errors
    if (error instanceof Error && error.message.includes('tenant')) {
      return res.status(403).json({ error: 'Unauthorized tenant access' });
    }
    
    return res.status(500).json({ error: 'Failed to fetch module executions' });
  }
});

// Update module execution status (admin/superadmin only)
router.patch('/executions/:executionId', authorize(['clientAdmin', 'superadmin']), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { executionId } = req.params;

    // Validate tenant access
    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant access required' });
    }

    const schema = z.object({
      status: z.enum(['pending', 'running', 'completed', 'failed']),
      results: z.string().optional()
    });

    const validatedData = schema.parse(req.body);

    // First verify the execution belongs to the tenant
    const existingExecution = await db.select()
      .from(moduleExecutions)
      .where(
        and(
          eq(moduleExecutions.id, executionId),
          eq(moduleExecutions.tenantId, tenantId)
        )
      )
      .limit(1);

    if (existingExecution.length === 0) {
      return res.status(404).json({ error: 'Execution not found or access denied' });
    }

    // Update with tenant isolation
    const updated = await db.update(moduleExecutions)
      .set({
        status: validatedData.status,
        results: validatedData.results,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(moduleExecutions.id, executionId),
          eq(moduleExecutions.tenantId, tenantId) // REQUIRED: Tenant isolation
        )
      )
      .returning();

    if (updated.length === 0) {
      return res.status(404).json({ error: 'Execution not found or update failed' });
    }

    return res.json({
      success: true,
      execution: updated[0]
    });

  } catch (error) {
    console.error('Module execution update error:', error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.errors 
      });
    }
    
    // Handle tenant access errors
    if (error instanceof Error && error.message.includes('tenant')) {
      return res.status(403).json({ error: 'Unauthorized tenant access' });
    }
    
    return res.status(500).json({ error: 'Failed to update module execution' });
  }
});

// Delete module execution (superadmin only)
router.delete('/executions/:executionId', authorize(['superadmin']), async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { executionId } = req.params;

    // Validate tenant access
    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant access required' });
    }

    // Delete with tenant isolation
    const deleted = await db.delete(moduleExecutions)
      .where(
        and(
          eq(moduleExecutions.id, executionId),
          eq(moduleExecutions.tenantId, tenantId) // REQUIRED: Tenant isolation
        )
      )
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Execution not found or access denied' });
    }

    return res.json({
      success: true,
      message: 'Module execution deleted successfully'
    });

  } catch (error) {
    console.error('Module execution delete error:', error);
    
    // Handle tenant access errors
    if (error instanceof Error && error.message.includes('tenant')) {
      return res.status(403).json({ error: 'Unauthorized tenant access' });
    }
    
    return res.status(500).json({ error: 'Failed to delete module execution' });
  }
});

export default router;