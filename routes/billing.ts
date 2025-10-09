import { Router } from "express";
import express from "express";
import { z } from "zod";
import { authenticate, authorize } from "../middleware/auth.js";
import { requireTenant } from "../middleware/tenant.js";
import { db } from "../db/index.js";
import { payments, subscriptions } from "../db/schema/payments.js";
import { eq, desc } from "drizzle-orm";
import { stripeService } from "../services/stripe-service.js";
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});

const router = Router();

// Billing plans configuration
const BILLING_PLANS = {
  starter: {
    name: 'Starter',
    priceMonthly: 800, // $8/employee/month
    priceAnnual: 666,   // $6.66/employee/month (17% discount)
    minEmployees: 50,
    maxEmployees: 250
  },
  growth: {
    name: 'Growth',
    priceMonthly: 1500, // $15/employee/month
    priceAnnual: 1250,   // $12.50/employee/month
    minEmployees: 250,
    maxEmployees: 1000
  },
  scale: {
    name: 'Scale',
    priceMonthly: 2400, // $24/employee/month
    priceAnnual: 2000,   // $20/employee/month
    minEmployees: 1000,
    maxEmployees: 5000
  },
  enterprise: {
    name: 'Enterprise',
    priceMonthly: 0,  // Custom pricing
    priceAnnual: 0,
    minEmployees: 5000
  }
};

// Webhook (no auth)
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.headers["stripe-signature"] as string;

  if (!signature) {
    return res.status(400).json({ error: "No signature" });
  }

  try {
    // Verify webhook signature and construct event
    const event = stripeService.verifyWebhookSignature(
      req.body.toString(),
      signature
    );

    // Handle the webhook event
    await stripeService.handleWebhook(event);

    return res.json({ received: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return res.status(400).json({ error: error.message || "Webhook processing failed" });
  }
});

// Get available plans (public endpoint - no auth required)
router.get("/plans", (_req, res) => {
  return res.json({ plans: BILLING_PLANS });
});

// All other routes require auth
router.use(authenticate);

// Get current subscription
router.get("/subscription", requireTenant, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId!;

    // Get subscription from database
    const [subscription] = await db.query.subscriptions.findMany({
      where: eq(payments.tenantId, tenantId),
      orderBy: [desc(payments.createdAt)],
      limit: 1
    });

    if (!subscription) {
      return res.json({
        status: 'inactive',
        plan: 'free',
        message: 'No active subscription'
      });
    }

    return res.json({
      id: subscription.id,
      status: subscription.status,
      plan: subscription.plan,
      billingPeriod: subscription.billingPeriod,
      employeeCount: subscription.employeeCount,
      amount: subscription.amount,
      pricePerEmployee: subscription.pricePerEmployee,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      trialEndsAt: subscription.trialEndsAt,
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    return res.status(500).json({ error: "Failed to get subscription details" });
  }
});

// Create checkout session
router.post("/checkout", authorize(['clientAdmin']), requireTenant, async (req, res) => {
  try {
    const data = z.object({
      plan: z.enum(["starter", "growth", "scale"]),
      billingPeriod: z.enum(["monthly", "annual"]),
      employeeCount: z.number().int().positive(),
      successUrl: z.string().url(),
      cancelUrl: z.string().url(),
    }).parse(req.body);

    const tenantId = req.user!.tenantId!;

    // Get tenant/customer info
    const [tenant] = await db.query.tenants.findMany({
      where: eq(subscriptions.tenantId, tenantId)
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Validate employee count for plan
    const planConfig = BILLING_PLANS[data.plan];
    if (data.employeeCount < planConfig.minEmployees) {
      return res.status(400).json({
        error: `${planConfig.name} plan requires minimum ${planConfig.minEmployees} employees`
      });
    }
    if (planConfig.maxEmployees && data.employeeCount > planConfig.maxEmployees) {
      return res.status(400).json({
        error: `${planConfig.name} plan supports maximum ${planConfig.maxEmployees} employees`
      });
    }

    // Calculate pricing
    const pricePerEmployee = data.billingPeriod === 'annual'
      ? planConfig.priceAnnual
      : planConfig.priceMonthly;
    const totalAmount = pricePerEmployee * data.employeeCount;

    // Create or get Stripe customer
    let customerId: string;
    const [existingSubscription] = await db.query.subscriptions.findMany({
      where: eq(subscriptions.tenantId, tenantId),
      limit: 1
    });

    if (existingSubscription?.stripeCustomerId) {
      customerId = existingSubscription.stripeCustomerId;
    } else {
      const customer = await stripe.customers.create({
        email: req.user!.email,
        name: tenant.name || undefined,
        metadata: {
          tenantId,
        },
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Mizan ${planConfig.name} Plan`,
              description: `${data.employeeCount} employees • ${data.billingPeriod === 'annual' ? 'Annual' : 'Monthly'} billing`,
            },
            unit_amount: pricePerEmployee,
            recurring: {
              interval: data.billingPeriod === 'annual' ? 'year' : 'month',
            },
          },
          quantity: data.employeeCount,
        },
      ],
      success_url: data.successUrl,
      cancel_url: data.cancelUrl,
      metadata: {
        tenantId,
        plan: data.plan,
        billingPeriod: data.billingPeriod,
        employeeCount: data.employeeCount.toString(),
      },
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.error('Checkout session creation error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    return res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// Create customer portal session
router.post("/portal", authorize(['clientAdmin']), requireTenant, async (req, res) => {
  try {
    const { returnUrl } = z.object({ returnUrl: z.string().url() }).parse(req.body);
    const tenantId = req.user!.tenantId!;

    // Get customer ID from subscription
    const [subscription] = await db.query.subscriptions.findMany({
      where: eq(subscriptions.tenantId, tenantId),
      limit: 1
    });

    if (!subscription?.stripeCustomerId) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // Create portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    });

    return res.json({ url: portalSession.url });
  } catch (error) {
    console.error('Portal session creation error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data' });
    }
    return res.status(500).json({ error: "Failed to create portal session" });
  }
});

// Cancel subscription
router.post("/cancel", authorize(['clientAdmin']), requireTenant, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId!;

    // Get subscription
    const [subscription] = await db.query.subscriptions.findMany({
      where: eq(subscriptions.tenantId, tenantId),
      limit: 1
    });

    if (!subscription?.stripeSubscriptionId) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // Cancel subscription at period end
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Update database
    await db.update(subscriptions)
      .set({
        cancelAtPeriodEnd: true,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscription.id));

    return res.json({
      message: "Subscription will be cancelled at period end",
      periodEnd: subscription.currentPeriodEnd
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return res.status(500).json({ error: "Failed to cancel subscription" });
  }
});

// Reactivate subscription
router.post("/reactivate", authorize(['clientAdmin']), requireTenant, async (req, res) => {
  try {
    const tenantId = req.user!.tenantId!;

    // Get subscription
    const [subscription] = await db.query.subscriptions.findMany({
      where: eq(subscriptions.tenantId, tenantId),
      limit: 1
    });

    if (!subscription?.stripeSubscriptionId) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    if (!subscription.cancelAtPeriodEnd) {
      return res.status(400).json({ error: 'Subscription is not scheduled for cancellation' });
    }

    // Reactivate subscription
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    // Update database
    await db.update(subscriptions)
      .set({
        cancelAtPeriodEnd: false,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscription.id));

    return res.json({
      message: "Subscription reactivated successfully",
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd
      }
    });
  } catch (error) {
    console.error('Reactivate subscription error:', error);
    return res.status(500).json({ error: "Failed to reactivate subscription" });
  }
});

// Get payment history
router.get("/payments", authorize(['clientAdmin']), requireTenant, async (req, res) => {
  try {
    const paymentHistory = await db.query.payments.findMany({
      where: eq(payments.tenantId, req.user!.tenantId!),
      orderBy: [desc(payments.createdAt)],
      limit: 20,
    });

    res.json({ payments: paymentHistory });
  } catch (error) {
    res.status(500).json({ error: "Failed to get payment history" });
  }
});

export default router;
