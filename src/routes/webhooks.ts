// backend/src/routes/webhooks.ts
import { Router, Request, Response } from 'express';
import { stripeService } from '../services/stripe-service';
import { db } from '../../db/index';
import { tenants as tenantsTable } from '../../db/schema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

const router = Router();

/**
 * Validate tenant exists and is active
 * This is our tenant isolation security for webhook operations
 */
async function validateTenant(tenantId: string): Promise<boolean> {
  try {
    if (!tenantId) {
      throw new Error('Missing tenantId in webhook data');
    }

    const tenant = await db.select()
      .from(tenantsTable)
      .where(eq(tenantsTable.id, tenantId))
      .limit(1);

    if (!tenant.length) {
      throw new Error(`Invalid tenant: ${tenantId}`);
    }

    const tenantData = tenant[0];
    
    // Check if tenant is active
    if (tenantData.status !== 'active') {
      throw new Error(`Tenant not active: ${tenantId}, status: ${tenantData.status}`);
    }

    return true;
  } catch (error) {
    console.error('Tenant validation failed:', error);
    throw error;
  }
}

/**
 * Extract tenantId from Stripe object metadata
 * This is how we maintain tenant isolation in webhook context
 */
function extractTenantId(stripeObject: any): string {
  // Try different paths where tenantId might be stored
  const tenantId = 
    stripeObject.metadata?.tenantId ||
    stripeObject.customer?.metadata?.tenantId ||
    stripeObject.subscription?.metadata?.tenantId;

  if (!tenantId) {
    throw new Error('No tenantId found in Stripe object metadata');
  }

  return tenantId;
}

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events with tenant isolation security
 * NOTE: This endpoint should NOT use authenticateToken middleware
 * Stripe webhooks use signature verification + tenant validation instead
 */
router.post('/stripe', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    console.error('❌ Missing stripe-signature header');
    return res.status(400).json({
      success: false,
      error: 'Missing stripe-signature header'
    });
  }

  try {
    // Verify webhook signature and parse event
    const event = stripeService.verifyWebhookSignature(
      req.body,
      signature
    );

    console.log(`📩 Stripe webhook received: ${event.type}`);

    // Extract tenantId for security validation
    let tenantId: string;
    
    try {
      tenantId = extractTenantId(event.data.object);
      console.log(`🔐 Extracted tenantId: ${tenantId} for webhook ${event.type}`);
    } catch (error) {
      console.error('❌ Failed to extract tenantId from webhook:', error);
      return res.status(400).json({
        success: false,
        error: 'Invalid webhook data: missing tenant information'
      });
    }

    // Validate tenant exists and is active (SECURITY CHECK)
    try {
      await validateTenant(tenantId);
      console.log(`✅ Tenant validated: ${tenantId}`);
    } catch (error) {
      console.error('❌ Tenant validation failed:', error);
      return res.status(403).json({
        success: false,
        error: 'Unauthorized: invalid tenant'
      });
    }

    // Handle different event types with validated tenantId
    // Each handler will use tenantId for database operations
    switch (event.type) {
      case 'checkout.session.completed':
        console.log(`💳 Processing checkout completion for tenant: ${tenantId}`);
        await stripeService.handleCheckoutComplete(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case 'customer.subscription.updated':
        console.log(`🔄 Processing subscription update for tenant: ${tenantId}`);
        await stripeService.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case 'customer.subscription.deleted':
        console.log(`❌ Processing subscription cancellation for tenant: ${tenantId}`);
        await stripeService.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case 'invoice.payment_failed':
        console.log(`💸 Processing payment failure for tenant: ${tenantId}`);
        await stripeService.handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice
        );
        break;

      case 'invoice.payment_succeeded':
        console.log(`✅ Payment succeeded for tenant: ${tenantId}, invoice: ${(event.data.object as Stripe.Invoice).id}`);
        await stripeService.handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice
        );
        break;

      case 'customer.created':
        console.log(`👤 Processing customer creation for tenant: ${tenantId}`);
        await stripeService.handleCustomerCreated(
          event.data.object as Stripe.Customer
        );
        break;

      case 'customer.updated':
        console.log(`👤 Processing customer update for tenant: ${tenantId}`);
        await stripeService.handleCustomerUpdated(
          event.data.object as Stripe.Customer
        );
        break;

      default:
        console.log(`⚠️ Unhandled webhook event type: ${event.type} for tenant: ${tenantId}`);
    }

    console.log(`✅ Webhook ${event.type} processed successfully for tenant: ${tenantId}`);

    // Return success to Stripe
    return res.status(200).json({
      success: true,
      received: true,
      tenantId: tenantId,
      eventType: event.type
    });

  } catch (error) {
    const e = error as Error;
    console.error('❌ Webhook processing error:', {
      message: e.message,
      stack: e.stack,
      eventType: req.body?.type
    });

    // Return appropriate error status
    if (e.message.includes('Invalid signature') || e.message.includes('signature')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid webhook signature'
      });
    }

    if (e.message.includes('tenant') || e.message.includes('Unauthorized')) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized webhook request'
      });
    }

    // Generic error for other cases
    return res.status(500).json({
      success: false,
      error: 'Webhook processing failed'
    });
  }
});

/**
 * GET /api/webhooks/health
 * Health check endpoint for webhook service
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Test database connection
    await db.select().from(tenantsTable).limit(1);
    
    return res.status(200).json({
      success: true,
      service: 'webhooks',
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Webhook health check failed:', error);
    return res.status(503).json({
      success: false,
      service: 'webhooks',
      status: 'unhealthy',
      error: 'Database connection failed'
    });
  }
});

export default router;