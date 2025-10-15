// routes/payment.ts
import { Router, Request, Response } from 'express';
import { stripeService } from '../services/stripe-service';
import { authenticateToken } from '../middleware/auth';
import { db } from '../../db/index';
import { demoRequests } from '../../db/schema/payments';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * POST /api/payment/create-checkout-session
 * Create a Stripe Checkout session for a demo request
 * AUTH: Superadmin only
 */
router.post('/create-checkout-session', authenticateToken, async (req: Request, res: Response) => {
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
        error: 'Only superadmins can create payment links'
      });
    }

    const { demoRequestId, plan, billingPeriod, employeeCount } = req.body;

    // Validate input
    if (!demoRequestId || !plan || !billingPeriod || !employeeCount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: demoRequestId, plan, billingPeriod, employeeCount'
      });
    }

    // Get demo request
    // Note: demoRequests table doesn't have tenantId as it stores pre-tenant signup data
    const [demoRequest] = await db
      .select()
      .from(demoRequests)
      .where(eq(demoRequests.id, demoRequestId));

    if (!demoRequest) {
      return res.status(404).json({
        success: false,
        error: 'Demo request not found'
      });
    }

    // Create checkout session
    const session = await stripeService.createCheckoutSession({
      demoRequestId,
      plan,
      billingPeriod,
      employeeCount,
      customerEmail: demoRequest.email,
      customerName: `${demoRequest.firstName} ${demoRequest.lastName}`,
    });

    return res.status(200).json({
      success: true,
      data: {
        sessionId: session.sessionId,
        url: session.url,
        message: 'Payment link created successfully'
      }
    });

  } catch (error) {
    const e = error as Error;
    console.error('Create checkout session error:', e);
    return res.status(500).json({
      success: false,
      error: e.message || 'Failed to create checkout session'
    });
  }
});

/**
 * GET /api/payment/session/:sessionId
 * Get checkout session details
 * PUBLIC (for post-checkout redirect page)
 */
router.get('/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // This endpoint would retrieve session info from Stripe if needed
    // For now, return success (frontend will handle welcome flow)

    return res.status(200).json({
      success: true,
      data: {
        sessionId,
        message: 'Session retrieved successfully'
      }
    });

  } catch (error) {
    const e = error as Error;
    console.error('Get session error:', e);
    return res.status(500).json({
      success: false,
      error: e.message || 'Failed to retrieve session'
    });
  }
});

export default router;
