// routes/demo.ts
import { Router, Request, Response } from 'express';
import { db } from '../../db/index';
import { demoRequests } from '../../db/schema/payments';
import { eq, desc } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth';
import { emailService } from '../services/email';

const router = Router();

/**
 * POST /api/demo/submit
 * Submit a demo request from the public /demo page
 * PUBLIC - No authentication required
 * NOTE: Demo requests are pre-tenant data (submitted before tenant creation),
 * so tenantId isolation does not apply to this table by design.
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

    // Send confirmation email to customer
    try {
      await emailService.sendEmail({
        to: email,
        template: 'demoRequestConfirmation',
        data: {
          firstName,
          lastName,
          company,
        }
      });
    } catch (emailError) {
      console.error('Failed to send customer confirmation email:', emailError);
      // Don't fail the request if email fails
    }

    // Send notification to superadmin
    try {
      const superadminEmail = process.env.SUPERADMIN_EMAIL || 'admin@mizan.work';
      await emailService.sendEmail({
        to: superadminEmail,
        template: 'demoRequestNotification',
        data: {
          firstName,
          lastName,
          email,
          company,
          phone,
          employeeCount,
          industry,
          interestedIn,
          message,
        }
      });
    } catch (emailError) {
      console.error('Failed to send superadmin notification email:', emailError);
      // Don't fail the request if email fails
    }

    return res.status(201).json({
      success: true,
      data: {
        id: newDemoRequest.id,
        message: 'Demo request submitted successfully! We will contact you within 24 hours.'
      }
    });

  } catch (error) {
    const e = error as Error;
    console.error('Demo request submission error:', e);
    return res.status(500).json({
      success: false,
      error: e.message || 'Failed to submit demo request'
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
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Only superadmins can view demo requests'
      });
    }

    const { status, limit = 100, offset = 0 } = req.query;

    let query = db.select().from(demoRequests).orderBy(desc(demoRequests.createdAt));

    // Filter by status if provided
    if (status && typeof status === 'string') {
      type DrizzleQuery = typeof query;
      query = query.where(eq(demoRequests.status, status)) as DrizzleQuery;
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

  } catch (error) {
    const e = error as Error;
    console.error('Get demo requests error:', e);
    return res.status(500).json({
      success: false,
      error: e.message || 'Failed to retrieve demo requests'
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
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    if (req.user.role !== 'superadmin') {
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

  } catch (error) {
    const e = error as Error;
    console.error('Get demo request error:', e);
    return res.status(500).json({
      success: false,
      error: e.message || 'Failed to retrieve demo request'
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
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    if (req.user.role !== 'superadmin') {
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

  } catch (error) {
    const e = error as Error;
    console.error('Update demo request status error:', e);
    return res.status(500).json({
      success: false,
      error: e.message || 'Failed to update demo request status'
    });
  }
});

export default router;
