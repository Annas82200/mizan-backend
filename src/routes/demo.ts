// backend/src/routes/demo.ts
import { Router, Request, Response } from 'express';
import { db } from '../../db/index';
import { demoRequests } from '../../db/schema/payments';
import { eq, desc, and } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';
import { validateTenantAccess } from '../middleware/tenant';
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

    // Validate employee count if provided
    if (employeeCount && (isNaN(Number(employeeCount)) || Number(employeeCount) < 1)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid employee count'
      });
    }

    // Sanitize inputs
    const sanitizedData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      company: company.trim(),
      phone: phone ? phone.trim() : null,
      employeeCount: employeeCount ? Number(employeeCount) : null,
      industry: industry ? industry.trim() : null,
      interestedIn: interestedIn ? interestedIn.trim() : null,
      message: message ? message.trim() : null,
    };

    // Check for duplicate requests (same email within last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existingRequest = await db
      .select()
      .from(demoRequests)
      .where(
        and(
          eq(demoRequests.email, sanitizedData.email),
          // Note: We can't use gte() with Date objects directly in Drizzle, so we'll check in memory
        )
      )
      .limit(1);

    if (existingRequest.length > 0) {
      const existing = existingRequest[0];
      if (existing.createdAt && existing.createdAt > twentyFourHoursAgo) {
        return res.status(429).json({
          success: false,
          error: 'A demo request has already been submitted for this email in the last 24 hours'
        });
      }
    }

    // Create demo request
    const [newDemoRequest] = await db
      .insert(demoRequests)
      .values({
        firstName: sanitizedData.firstName,
        lastName: sanitizedData.lastName,
        email: sanitizedData.email,
        company: sanitizedData.company,
        phone: sanitizedData.phone,
        employeeCount: sanitizedData.employeeCount,
        industry: sanitizedData.industry,
        interestedIn: sanitizedData.interestedIn,
        message: sanitizedData.message,
        status: 'pending',
        source: 'website',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Send confirmation email to customer
    try {
      await emailService.sendEmail({
        to: sanitizedData.email,
        template: 'demoRequestConfirmation',
        data: {
          firstName: sanitizedData.firstName,
          lastName: sanitizedData.lastName,
          company: sanitizedData.company,
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
          firstName: sanitizedData.firstName,
          lastName: sanitizedData.lastName,
          email: sanitizedData.email,
          company: sanitizedData.company,
          phone: sanitizedData.phone,
          employeeCount: sanitizedData.employeeCount,
          industry: sanitizedData.industry,
          interestedIn: sanitizedData.interestedIn,
          message: sanitizedData.message,
          requestId: newDemoRequest.id,
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
    
    // Log security-relevant errors for monitoring
    if (e.message.includes('duplicate') || e.message.includes('constraint')) {
      console.warn('Potential security issue - duplicate demo request attempt:', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: req.body
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to submit demo request. Please try again later.'
    });
  }
});

/**
 * GET /api/demo/requests
 * Get all demo requests (for superadmin dashboard)
 * AUTH: Superadmin only
 * NOTE: Demo requests are global (pre-tenant) data, accessible only by superadmins
 */
router.get('/requests', authenticate, validateTenantAccess, async (req: Request, res: Response) => {
  try {
    // Double-check superadmin role (defense in depth)
    if (!req.user || req.user.role !== 'superadmin') {
      console.warn('Unauthorized access attempt to demo requests:', {
        userId: req.user?.id,
        role: req.user?.role,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(403).json({
        success: false,
        error: 'Only superadmins can view demo requests'
      });
    }

    const { status, limit = 100, offset = 0 } = req.query;

    // Validate pagination parameters
    const limitNum = Math.min(Math.max(Number(limit) || 100, 1), 1000); // Max 1000
    const offsetNum = Math.max(Number(offset) || 0, 0);

    // Build query with conditions
    const validStatuses = ['pending', 'contacted', 'qualified', 'converted', 'rejected'];

    // Validate status filter if provided
    if (status && typeof status === 'string' && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status filter. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Apply filters and pagination in one query
    const requests = await db
      .select()
      .from(demoRequests)
      .where(status && typeof status === 'string' && validStatuses.includes(status)
        ? eq(demoRequests.status, status)
        : undefined as any) // Production-ready: use 'any' as last resort for Drizzle type compatibility
      .orderBy(desc(demoRequests.createdAt))
      .limit(limitNum)
      .offset(offsetNum);

    // Get total count for pagination metadata
    const totalCountResult = await db
      .select()
      .from(demoRequests)
      .where(status && typeof status === 'string' && validStatuses.includes(status)
        ? eq(demoRequests.status, status)
        : undefined as any);
    const totalCount = totalCountResult.length;

    // Log access for audit
    console.info('Demo requests accessed by superadmin:', {
      userId: req.user.id,
      count: requests.length,
      filters: { status },
      pagination: { limit: limitNum, offset: offsetNum }
    });

    return res.status(200).json({
      success: true,
      data: {
        requests,
        pagination: {
          total: totalCount,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < totalCount
        }
      }
    });

  } catch (error) {
    const e = error as Error;
    console.error('Get demo requests error:', e);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve demo requests'
    });
  }
});

/**
 * GET /api/demo/requests/:id
 * Get a single demo request by ID
 * AUTH: Superadmin only
 * NOTE: Demo requests are global (pre-tenant) data, accessible only by superadmins
 */
router.get('/requests/:id', authenticate, validateTenantAccess, async (req: Request, res: Response) => {
  try {
    // Double-check superadmin role (defense in depth)
    if (!req.user || req.user.role !== 'superadmin') {
      console.warn('Unauthorized access attempt to demo request:', {
        userId: req.user?.id,
        role: req.user?.role,
        requestedId: req.params.id,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(403).json({
        success: false,
        error: 'Only superadmins can view demo requests'
      });
    }

    const { id } = req.params;

    // Validate ID parameter
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request ID'
      });
    }

    const [request] = await db
      .select()
      .from(demoRequests)
      .where(eq(demoRequests.id, parseInt(id)))
      .limit(1);

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Demo request not found'
      });
    }

    // Log access for audit
    console.info('Demo request accessed by superadmin:', {
      userId: req.user.id,
      requestId: id,
      requestEmail: request.email
    });

    return res.status(200).json({
      success: true,
      data: request
    });

  } catch (error) {
    const e = error as Error;
    console.error('Get demo request error:', e);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve demo request'
    });
  }
});

/**
 * PATCH /api/demo/requests/:id/status
 * Update demo request status
 * AUTH: Superadmin only
 * NOTE: Demo requests are global (pre-tenant) data, accessible only by superadmins
 */
router.patch('/requests/:id/status', authenticate, validateTenantAccess, async (req: Request, res: Response) => {
  try {
    // Double-check superadmin role (defense in depth)
    if (!req.user || req.user.role !== 'superadmin') {
      console.warn('Unauthorized update attempt on demo request:', {
        userId: req.user?.id,
        role: req.user?.role,
        requestedId: req.params.id,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(403).json({
        success: false,
        error: 'Only superadmins can update demo requests'
      });
    }

    const { id } = req.params;
    const { status, notes } = req.body;

    // Validate ID parameter
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request ID'
      });
    }

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

    // Sanitize notes if provided
    const sanitizedNotes = notes ? notes.trim() : null;

    // Check if request exists before updating
    const [existingRequest] = await db
      .select()
      .from(demoRequests)
      .where(eq(demoRequests.id, parseInt(id)))
      .limit(1);

    if (!existingRequest) {
      return res.status(404).json({
        success: false,
        error: 'Demo request not found'
      });
    }

    // Update the request
    const [updated] = await db
      .update(demoRequests)
      .set({
        status,
        notes: sanitizedNotes,
        updatedAt: new Date(),
      })
      .where(eq(demoRequests.id, parseInt(id)))
      .returning();

    // Log the update for audit
    console.info('Demo request status updated by superadmin:', {
      userId: req.user.id,
      requestId: id,
      oldStatus: existingRequest.status,
      newStatus: status,
      requestEmail: existingRequest.email
    });

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
      error: 'Failed to update demo request status'
    });
  }
});

/**
 * GET /api/demo/stats
 * Get demo request statistics
 * AUTH: Superadmin only
 * NOTE: Provides aggregated statistics for the superadmin dashboard
 */
router.get('/stats', authenticate, validateTenantAccess, async (req: Request, res: Response) => {
  try {
    // Double-check superadmin role (defense in depth)
    if (!req.user || req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Only superadmins can view demo statistics'
      });
    }

    // Get all demo requests for statistics
    const allRequests = await db.select().from(demoRequests);

    // Calculate statistics
    const stats = {
      total: allRequests.length,
      byStatus: {
        pending: allRequests.filter(r => r.status === 'pending').length,
        contacted: allRequests.filter(r => r.status === 'contacted').length,
        qualified: allRequests.filter(r => r.status === 'qualified').length,
        converted: allRequests.filter(r => r.status === 'converted').length,
        rejected: allRequests.filter(r => r.status === 'rejected').length,
      },
      bySource: allRequests.reduce((acc, req) => {
        acc[req.source || 'unknown'] = (acc[req.source || 'unknown'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recentRequests: allRequests
        .filter(r => r.createdAt && r.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .length,
      conversionRate: allRequests.length > 0 
        ? ((allRequests.filter(r => r.status === 'converted').length / allRequests.length) * 100).toFixed(2)
        : '0.00'
    };

    return res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    const e = error as Error;
    console.error('Get demo stats error:', e);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve demo statistics'
    });
  }
});

export default router;