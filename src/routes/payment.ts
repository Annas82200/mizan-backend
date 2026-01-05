// backend/src/routes/payment.ts
import { Router, Request, Response } from 'express';
import { stripeService } from '../services/stripe-service';
import { authenticate } from '../middleware/auth';
import { validateTenantAccess } from '../middleware/tenant';
import { db } from '../../db/index';
import { demoRequests, subscriptions, paymentSessions } from '../../db/schema/payments';
import { eq, and } from 'drizzle-orm';

const router = Router();

/**
 * POST /api/payment/create-checkout-session
 * Create a Stripe Checkout session for a demo request
 * AUTH: Superadmin only
 * SECURITY: No tenant isolation required for demoRequests (pre-tenant data)
 */
router.post('/create-checkout-session', authenticate, async (req: Request, res: Response) => {
  try {
    // Validate authentication
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    // Validate superadmin role
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only superadmins can create payment links'
      });
    }

    const { demoRequestId, plan, billingPeriod, employeeCount } = req.body;

    // Validate required input
    if (!demoRequestId || !plan || !billingPeriod || !employeeCount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: demoRequestId, plan, billingPeriod, employeeCount'
      });
    }

    // Validate plan and billingPeriod values
    const validPlans = ['starter', 'professional', 'enterprise'];
    const validBillingPeriods = ['monthly', 'yearly'];
    
    if (!validPlans.includes(plan)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan. Must be one of: starter, professional, enterprise'
      });
    }

    if (!validBillingPeriods.includes(billingPeriod)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid billing period. Must be monthly or yearly'
      });
    }

    if (!Number.isInteger(employeeCount) || employeeCount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Employee count must be a positive integer'
      });
    }

    // Get demo request
    // NOTE: demoRequests table intentionally has NO tenantId as it stores pre-signup data
    // This is by design - demo requests exist before tenants are created
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

    // Validate demo request status
    if (demoRequest.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Demo request must be approved before creating payment link'
      });
    }

    // Create checkout session through Stripe service
    const session = await stripeService.createCheckoutSession({
      demoRequestId,
      plan,
      billingPeriod,
      employeeCount,
      customerEmail: demoRequest.email,
      customerName: `${demoRequest.firstName} ${demoRequest.lastName}`,
    });

    // Store payment session record (this would have tenantId once tenant is created)
    // For now, we link it to the demo request
    await db.insert(paymentSessions).values({
      id: session.sessionId,
      demoRequestId,
      amount: session.amount,
      currency: session.currency,
      status: 'created',
      stripeSessionId: session.sessionId,
      metadata: {
        plan,
        billingPeriod,
        employeeCount
      },
      createdAt: new Date(),
      updatedAt: new Date()
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
    logger.error('Create checkout session error:', {
      error: e.message,
      stack: e.stack,
      userId: req.user?.id,
      userRole: req.user?.role
    });
    
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
 * SECURITY: No tenant isolation required for public checkout completion
 */
router.get('/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Validate session ID format
    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid session ID'
      });
    }

    // Get payment session from our database
    const [paymentSession] = await db
      .select()
      .from(paymentSessions)
      .where(eq(paymentSessions.stripeSessionId, sessionId));

    if (!paymentSession) {
      return res.status(404).json({
        success: false,
        error: 'Payment session not found'
      });
    }

    // Get session details from Stripe
    const stripeSession = await stripeService.getCheckoutSession(sessionId);

    const metadata = paymentSession.metadata as { plan?: string; billingPeriod?: string; employeeCount?: number } | null;

    return res.status(200).json({
      success: true,
      data: {
        sessionId,
        status: stripeSession.payment_status,
        customerEmail: stripeSession.customer_details?.email,
        plan: metadata?.plan || 'starter',
        billingPeriod: metadata?.billingPeriod || 'monthly',
        employeeCount: metadata?.employeeCount || 0,
        amount: paymentSession.amount,
        currency: paymentSession.currency,
        message: 'Session retrieved successfully'
      }
    });

  } catch (error) {
    const e = error as Error;
    logger.error('Get session error:', {
      error: e.message,
      stack: e.stack,
      sessionId: req.params.sessionId
    });
    
    return res.status(500).json({
      success: false,
      error: e.message || 'Failed to retrieve session'
    });
  }
});

/**
 * GET /api/payment/subscriptions
 * Get tenant subscriptions (with tenant isolation)
 * AUTH: Admin or Superadmin
 */
router.get('/subscriptions', authenticate, validateTenantAccess, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate user has access to subscription data
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin or Superadmin role required'
      });
    }

    // Get subscriptions with tenant isolation
    const tenantSubscriptions = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, req.user.tenantId));

    return res.status(200).json({
      success: true,
      data: {
        subscriptions: tenantSubscriptions,
        count: tenantSubscriptions.length,
        message: 'Subscriptions retrieved successfully'
      }
    });

  } catch (error) {
    const e = error as Error;
    logger.error('Get subscriptions error:', {
      error: e.message,
      stack: e.stack,
      userId: req.user?.id,
      tenantId: req.user?.tenantId
    });
    
    return res.status(500).json({
      success: false,
      error: e.message || 'Failed to retrieve subscriptions'
    });
  }
});

/**
 * GET /api/payment/subscription/:subscriptionId
 * Get specific subscription details (with tenant isolation)
 * AUTH: Admin or Superadmin
 */
router.get('/subscription/:subscriptionId', authenticate, validateTenantAccess, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate user has access to subscription data
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin or Superadmin role required'
      });
    }

    const { subscriptionId } = req.params;

    // Validate subscription ID
    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        error: 'Subscription ID is required'
      });
    }

    // Get subscription with tenant isolation
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.id, subscriptionId),
          eq(subscriptions.tenantId, req.user.tenantId)
        )
      );

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found or access denied'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        subscription,
        message: 'Subscription retrieved successfully'
      }
    });

  } catch (error) {
    const e = error as Error;
    logger.error('Get subscription error:', {
      error: e.message,
      stack: e.stack,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      subscriptionId: req.params.subscriptionId
    });
    
    return res.status(500).json({
      success: false,
      error: e.message || 'Failed to retrieve subscription'
    });
  }
});

/**
 * POST /api/payment/webhook
 * Handle Stripe webhook events
 * PUBLIC (Stripe webhook endpoint)
 * SECURITY: Webhook signature validation in stripe service
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing Stripe signature'
      });
    }

    // Process webhook through Stripe service (includes signature validation)
    const result = await stripeService.handleWebhook(req.body);

    return res.status(200).json({
      success: true,
      data: result,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    const e = error as Error;
    logger.error('Webhook processing error:', {
      error: e.message,
      stack: e.stack,
      headers: req.headers
    });
    
    return res.status(400).json({
      success: false,
      error: e.message || 'Webhook processing failed'
    });
  }
});

/**
 * PUT /api/payment/subscription/:subscriptionId/cancel
 * Cancel a subscription (with tenant isolation)
 * AUTH: Admin or Superadmin
 */
router.put('/subscription/:subscriptionId/cancel', authenticate, validateTenantAccess, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate user has access to cancel subscriptions
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin or Superadmin role required'
      });
    }

    const { subscriptionId } = req.params;
    const { reason } = req.body;

    // Validate subscription ID
    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        error: 'Subscription ID is required'
      });
    }

    // Get subscription with tenant isolation
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.id, subscriptionId),
          eq(subscriptions.tenantId, req.user.tenantId)
        )
      );

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found or access denied'
      });
    }

    // Validate subscription can be cancelled
    if (subscription.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Subscription is already cancelled'
      });
    }

    // Cancel subscription through Stripe service
    const result = await stripeService.cancelSubscription({
      subscriptionId: subscription.stripeSubscriptionId,
      tenantId: req.user.tenantId
    });

    // Update subscription status in database with tenant isolation
    await db
      .update(subscriptions)
      .set({
        status: 'cancelled',
        canceledAt: new Date(),
        updatedAt: new Date()
      })
      .where(
        and(
          eq(subscriptions.id, subscriptionId),
          eq(subscriptions.tenantId, req.user.tenantId)
        )
      );

    return res.status(200).json({
      success: true,
      data: {
        subscriptionId,
        status: 'cancelled',
        cancelledAt: result.canceled_at,
        message: 'Subscription cancelled successfully'
      }
    });

  } catch (error) {
    const e = error as Error;
    logger.error('Cancel subscription error:', {
      error: e.message,
      stack: e.stack,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      subscriptionId: req.params.subscriptionId
    });
    
    return res.status(500).json({
      success: false,
      error: e.message || 'Failed to cancel subscription'
    });
  }
});

export default router;