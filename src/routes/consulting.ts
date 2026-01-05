// backend/src/routes/consulting.ts

import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize, validateTenantAccess } from '../middleware/auth';
import { db } from '../../db/index';
import { consultingRequests, consultants } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { emailService } from '../services/email';

const router = Router();

// Public endpoint to request consultation
router.post('/request', async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      company: z.string(),
      type: z.enum(['demo', 'implementation', 'training', 'strategy']),
      message: z.string(),
      preferredDate: z.string().optional()
    });
    
    const validatedData = schema.parse(req.body);
    
    const [request] = await db.insert(consultingRequests)
      .values({
        id: crypto.randomUUID(),
        tenantId: 'public', // Public consulting requests don't have tenantId
        requestType: validatedData.type,
        description: `${validatedData.message}\n\nCompany: ${validatedData.company}\nContact: ${validatedData.name} (${validatedData.email})${validatedData.preferredDate ? `\nPreferred Date: ${validatedData.preferredDate}` : ''}`,
        status: 'pending'
      })
      .returning();

    // Send confirmation email to customer
    try {
      await emailService.sendEmail({
        to: validatedData.email,
        template: 'consultingRequestConfirmation',
        data: {
          name: validatedData.name,
          requestType: validatedData.type,
          company: validatedData.company,
          description: validatedData.message,
        }
      });
    } catch (emailError) {
      logger.error('Failed to send consulting confirmation email:', emailError);
    }

    // Send notification to consulting team
    try {
      const consultingEmail = process.env.CONSULTING_EMAIL || 'consulting@mizan.work';
      await emailService.sendEmail({
        to: consultingEmail,
        template: 'consultationRequest',
        data: {
          name: validatedData.name,
          company: validatedData.company,
          email: validatedData.email,
          type: validatedData.type,
          message: validatedData.message,
        }
      });
    } catch (emailError) {
      logger.error('Failed to send consulting team notification:', emailError);
    }

    return res.json({
      success: true,
      requestId: request.id,
      message: 'Consultation request received. We will contact you within 24 hours.'
    });
    
  } catch (error) {
    logger.error('Consultation request error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.errors
      });
    }
    
    return res.status(500).json({ error: 'Failed to submit request' });
  }
});

// Admin routes with authentication and tenant isolation
router.use(authenticate);
router.use(validateTenantAccess);

// Get consultation requests (tenant-isolated)
router.get('/requests', authorize(['clientAdmin', 'superadmin']), async (req, res) => {
  try {
    // ✅ PRODUCTION: No 'as any' - using Express.Request extension
    const { user } = req;
    
    if (!user || !user.tenantId) {
      return res.status(401).json({ error: 'Unauthorized: Missing tenant context' });
    }

    let requests;
    
    // Superadmin can see all requests, clientAdmin only sees their tenant's requests
    if (user.role === 'superadmin') {
      requests = await db.select().from(consultingRequests)
        .orderBy(desc(consultingRequests.createdAt));
    } else {
      requests = await db.select().from(consultingRequests)
        .where(eq(consultingRequests.tenantId, user.tenantId))
        .orderBy(desc(consultingRequests.createdAt));
    }
    
    return res.json(requests);
    
  } catch (error) {
    logger.error('Requests fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Update request status (superadmin only for global requests, clientAdmin for tenant requests)
router.put('/requests/:id', authorize(['clientAdmin', 'superadmin']), async (req, res) => {
  try {
    // ✅ PRODUCTION: No 'as any' - using Express.Request extension
    const { user } = req;
    const { status, assignedTo, notes } = req.body;
    
    if (!user || !user.tenantId) {
      return res.status(401).json({ error: 'Unauthorized: Missing tenant context' });
    }

    // Validate request exists and check tenant access
    const existingRequestResult = await db.select().from(consultingRequests)
      .where(eq(consultingRequests.id, req.params.id))
      .limit(1);
    const existingRequest = existingRequestResult.length > 0 ? existingRequestResult[0] : null;

    if (!existingRequest) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Tenant access validation
    if (user.role === 'clientAdmin' && existingRequest.tenantId !== user.tenantId && existingRequest.tenantId !== 'public') {
      return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
    }

    const [updated] = await db.update(consultingRequests)
      .set({
        status,
        assignedTo,
        notes,
        updatedAt: new Date()
      })
      .where(eq(consultingRequests.id, req.params.id))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    return res.json(updated);
    
  } catch (error) {
    logger.error('Request update error:', error);
    return res.status(500).json({ error: 'Failed to update request' });
  }
});

// Get consultants (tenant-isolated for client admins)
router.get('/consultants', authorize(['clientAdmin', 'superadmin']), async (req, res) => {
  try {
    // ✅ PRODUCTION: No 'as any' - using Express.Request extension
    const { user } = req;
    
    if (!user || !user.tenantId) {
      return res.status(401).json({ error: 'Unauthorized: Missing tenant context' });
    }

    let consultantList;

    // Superadmin can see all consultants, clientAdmin sees tenant-specific consultants
    if (user.role === 'superadmin') {
      consultantList = await db.select().from(consultants)
        .where(eq(consultants.isActive, true));
    } else {
      // Client admins can only see consultants assigned to their tenant or global consultants
      consultantList = await db.select().from(consultants)
        .where(and(
          eq(consultants.isActive, true),
          // Add tenant filtering logic here if consultants table has tenantId
          // For now, assuming all active consultants are available to all tenants
        ));
    }
    
    return res.json(consultantList);
    
  } catch (error) {
    logger.error('Consultants fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch consultants' });
  }
});

// Create consultation request (authenticated users only)
router.post('/requests', authorize(['clientAdmin', 'superadmin']), async (req, res) => {
  try {
    // ✅ PRODUCTION: No 'as any' - using Express.Request extension
    const { user } = req;
    
    if (!user || !user.tenantId) {
      return res.status(401).json({ error: 'Unauthorized: Missing tenant context' });
    }

    const schema = z.object({
      requestType: z.enum(['demo', 'implementation', 'training', 'strategy']),
      description: z.string().min(10),
      priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
      assignedTo: z.string().optional()
    });
    
    const validatedData = schema.parse(req.body);
    
    const [request] = await db.insert(consultingRequests)
      .values({
        id: crypto.randomUUID(),
        tenantId: user.tenantId, // Always use authenticated user's tenantId
        requestType: validatedData.requestType,
        description: validatedData.description,
        priority: validatedData.priority,
        assignedTo: validatedData.assignedTo,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return res.json({
      success: true,
      request,
      message: 'Consultation request created successfully'
    });
    
  } catch (error) {
    logger.error('Create consultation request error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.errors
      });
    }
    
    return res.status(500).json({ error: 'Failed to create request' });
  }
});

// Get specific consultation request (tenant-isolated)
router.get('/requests/:id', authorize(['clientAdmin', 'superadmin']), async (req, res) => {
  try {
    // ✅ PRODUCTION: No 'as any' - using Express.Request extension
    const { user } = req;
    
    if (!user || !user.tenantId) {
      return res.status(401).json({ error: 'Unauthorized: Missing tenant context' });
    }

    let request;

    if (user.role === 'superadmin') {
      const requestResult = await db.select().from(consultingRequests)
        .where(eq(consultingRequests.id, req.params.id))
        .limit(1);
      request = requestResult.length > 0 ? requestResult[0] : null;
    } else {
      const requestResult = await db.select().from(consultingRequests)
        .where(and(
          eq(consultingRequests.id, req.params.id),
          eq(consultingRequests.tenantId, user.tenantId)
        ))
        .limit(1);
      request = requestResult.length > 0 ? requestResult[0] : null;
    }

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    return res.json(request);
    
  } catch (error) {
    logger.error('Request fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch request' });
  }
});

// Delete consultation request (tenant-isolated)
router.delete('/requests/:id', authorize(['clientAdmin', 'superadmin']), async (req, res) => {
  try {
    // ✅ PRODUCTION: No 'as any' - using Express.Request extension
    const { user } = req;
    
    if (!user || !user.tenantId) {
      return res.status(401).json({ error: 'Unauthorized: Missing tenant context' });
    }

    // Check if request exists and validate tenant access
    const existingRequestResult = await db.select().from(consultingRequests)
      .where(eq(consultingRequests.id, req.params.id))
      .limit(1);
    const existingRequest = existingRequestResult.length > 0 ? existingRequestResult[0] : null;

    if (!existingRequest) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Tenant access validation
    if (user.role === 'clientAdmin' && existingRequest.tenantId !== user.tenantId) {
      return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
    }

    const [deleted] = await db.delete(consultingRequests)
      .where(eq(consultingRequests.id, req.params.id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Request not found' });
    }

    return res.json({
      success: true,
      message: 'Consultation request deleted successfully'
    });
    
  } catch (error) {
    logger.error('Request deletion error:', error);
    return res.status(500).json({ error: 'Failed to delete request' });
  }
});

export default router;