// server/routes/consulting.ts

import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { consultingRequests, consultants } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

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
    
    // TODO: Send notification email
    
    return res.json({
      success: true,
      requestId: request.id,
      message: 'Consultation request received. We will contact you within 24 hours.'
    });
    
  } catch (error) {
    console.error('Consultation request error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.errors
      });
    }
    
    return res.status(500).json({ error: 'Failed to submit request' });
  }
});

// Admin routes
router.use(authenticate);

// Get consultation requests
router.get('/requests', authorize(['clientAdmin', 'superadmin']), async (req, res) => {
  try {
    const requests = await db.query.consultingRequests.findMany({
      orderBy: [desc(consultingRequests.createdAt)],
      with: {
        assignedConsultant: true
      }
    });
    
    return res.json(requests);
    
  } catch (error) {
    console.error('Requests fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Update request status
router.put('/requests/:id', authorize(['superadmin']), async (req, res) => {
  try {
    const { status, assignedTo, notes } = req.body;
    
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
    console.error('Request update error:', error);
    return res.status(500).json({ error: 'Failed to update request' });
  }
});

// Get consultants
router.get('/consultants', async (req, res) => {
  try {
    const consultantList = await db.query.consultants.findMany({
      where: eq(consultants.isActive, true)
    });
    
    return res.json(consultantList);
    
  } catch (error) {
    console.error('Consultants fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch consultants' });
  }
});

export default router;
