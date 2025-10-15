// routes/webhooks.ts
import { Router, Request, Response } from 'express';
import { stripeService } from '../services/stripe-service.js';
import Stripe from 'stripe';

const router = Router();

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 * NOTE: This endpoint should NOT use authenticateToken middleware
 * Stripe webhooks use signature verification instead
 */
router.post('/stripe', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
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

    // Handle different event types
    // Note: TenantId is extracted from Stripe metadata within each handler
    // to ensure proper multi-tenant isolation for billing operations
    switch (event.type) {
      case 'checkout.session.completed':
        await stripeService.handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await stripeService.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await stripeService.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await stripeService.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_succeeded':
        console.log(`✅ Payment succeeded for invoice ${(event.data.object as Stripe.Invoice).id}`);
        break;

      default:
        console.log(`⚠️ Unhandled webhook event type: ${event.type}`);
    }

    // Return success to Stripe
    return res.status(200).json({
      success: true,
      received: true
    });

  } catch (error) {
    const e = error as Error;
    console.error('Webhook processing error:', e);
    return res.status(400).json({
      success: false,
      error: e.message || 'Webhook processing failed'
    });
  }
});

export default router;
