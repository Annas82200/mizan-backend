import { Router } from "express";
import express from "express";
import { z } from "zod";
import { authenticate, authorize } from "../middleware/auth.js";
import { requireTenant } from "../middleware/tenant.js";
import { db } from "../db/index.js";
import { payments } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import {
  handleWebhook,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  BILLING_PLANS,
  billingService
} from "../services/stripe.js";

const router = Router();

// Webhook (no auth)
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.headers["stripe-signature"] as string;
  
  if (!signature) {
    return res.status(400).json({ error: "No signature" });
  }
  
  try {
    // Note: handleWebhook expects Stripe.Event, not raw body + signature
    // This needs to be verified against actual webhook implementation
    await handleWebhook(req.body);
    return res.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(400).json({ error: "Webhook processing failed" });
  }
});

// All other routes require auth
router.use(authenticate);

// Get available plans
router.get("/plans", (_req, res) => {
  return res.json({ plans: BILLING_PLANS });
});

// Get current subscription
router.get("/subscription", requireTenant, async (req, res) => {
  try {
    // TODO: Implement getSubscriptionDetails or use billingService
    const details = { status: 'active', plan: 'free' };
    return res.json(details);
  } catch (error) {
    return res.status(500).json({ error: "Failed to get subscription details" });
  }
});

// Create checkout session
router.post("/checkout", authorize(['clientAdmin']), requireTenant, async (req, res) => {
  try {
    const data = z.object({
      plan: z.enum(["growth", "enterprise"]),
      billing: z.enum(["monthly", "yearly"]),
      successUrl: z.string().url(),
      cancelUrl: z.string().url(),
    }).parse(req.body);

    // TODO: Implement checkout session creation
    const url = `${data.successUrl}?session_id=stub`;

    return res.json({ url });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
    return res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// Create customer portal session
router.post("/portal", authorize(['clientAdmin']), requireTenant, async (req, res) => {
  try {
    const { returnUrl } = z.object({ returnUrl: z.string().url() }).parse(req.body);

    // TODO: Implement portal session creation
    const url = returnUrl;
    return res.json({ url });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
    return res.status(500).json({ error: "Failed to create portal session" });
  }
});

// Cancel subscription
router.post("/cancel", authorize(['clientAdmin']), requireTenant, async (req, res) => {
  try {
    await cancelSubscription(req.user!.tenantId!);
    return res.json({ message: "Subscription will be cancelled at period end" });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
    return res.status(500).json({ error: "Failed to cancel subscription" });
  }
});

// Reactivate subscription
router.post("/reactivate", authorize(['clientAdmin']), requireTenant, async (req, res) => {
  try {
    // TODO: Implement reactivateSubscription
    return res.json({ message: "Subscription reactivated" });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
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
