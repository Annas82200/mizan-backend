// routes/demo.ts
import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { demoRequests } from '../db/schema/payments.js';
import { eq, desc } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/demo/submit
 * Submit a demo request from the public /demo page
 * PUBLIC - No authentication required
 */
router.post('/submit', async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      email,
      company,
      phone,
      employeeCount,
      industry,
      interestedIn,
      message
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !company) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: firstName, lastName, email, company'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Create demo request
    const [newDemoRequest] = await db
      .insert(demoRequests)
      .values({
        firstName,
        lastName,
        email,
        company,
        phone: phone || null,
        employeeCount: employeeCount || null,
        industry: industry || null,
        interestedIn: interestedIn || null,
        message: message || null,
        status: 'pending',
        source: 'website',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // TODO: Send email notification to superadmin
    // TODO: Send confirmation email to customer

    return res.status(201).json({
      success: true,
      data: {
        id: newDemoRequest.id,
        message: 'Demo request submitted successfully! We will contact you within 24 hours.'
      }
    });

  } catch (error: any) {
    console.error('Demo request submission error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit demo request'
    });
  }
});

/**
 * GET /api/demo/requests
 * Get all demo requests (for superadmin dashboard)
 * AUTH: Superadmin only
 */
router.get('/requests', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Check if user is superadmin
    if ((req as any).user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Only superadmins can view demo requests'
      });
    }

    const { status, limit = 100, offset = 0 } = req.query;

    let query = db.select().from(demoRequests).orderBy(desc(demoRequests.createdAt));

    // Filter by status if provided
    if (status && typeof status === 'string') {
      query = query.where(eq(demoRequests.status, status)) as any;
    }

    // Apply pagination
    const requests = await query.limit(Number(limit)).offset(Number(offset));

    // Get total count
    const totalCount = await db.select().from(demoRequests);

    return res.status(200).json({
      success: true,
      data: {
        requests,
        total: totalCount.length,
        limit: Number(limit),
        offset: Number(offset)
      }
    });

  } catch (error: any) {
    console.error('Get demo requests error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve demo requests'
    });
  }
});

/**
 * GET /api/demo/requests/:id
 * Get a single demo request by ID
 * AUTH: Superadmin only
 */
router.get('/requests/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Check if user is superadmin
    if ((req as any).user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Only superadmins can view demo requests'
      });
    }

    const { id } = req.params;

    const [request] = await db
      .select()
      .from(demoRequests)
      .where(eq(demoRequests.id, parseInt(id)));

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Demo request not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: request
    });

  } catch (error: any) {
    console.error('Get demo request error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve demo request'
    });
  }
});

/**
 * PATCH /api/demo/requests/:id/status
 * Update demo request status
 * AUTH: Superadmin only
 */
router.patch('/requests/:id/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Check if user is superadmin
    if ((req as any).user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Only superadmins can update demo requests'
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    // Validate status value
    const validStatuses = ['pending', 'contacted', 'qualified', 'converted', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const [updated] = await db
      .update(demoRequests)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(demoRequests.id, parseInt(id)))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Demo request not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: updated,
      message: 'Demo request status updated successfully'
    });

  } catch (error: any) {
    console.error('Update demo request status error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update demo request status'
    });
  }
});

export default router;
