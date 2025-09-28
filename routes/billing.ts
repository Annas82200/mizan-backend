import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize, requireTenant } from "../middleware/auth.js";
import {
  createCheckoutSession,
  createPortalSession,
  handleWebhook,
  getSubscriptionDetails,
  cancelSubscription,
  reactivateSubscription,
  PLANS,
} from "../services/stripe.js";

const router = Router();

// Webhook (no auth)
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.headers["stripe-signature"] as string;
  
  if (!signature) {
    return res.status(400).json({ error: "No signature" });
  }
  
  try {
    await handleWebhook(req.body, signature);
    res.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(400).json({ error: "Webhook processing failed" });
  }
});

// All other routes require auth
router.use(authenticate);

// Get available plans
router.get("/plans", (_req, res) => {
  res.json({ plans: PLANS });
});

// Get current subscription
router.get("/subscription", requireTenant, async (req, res) => {
  try {
    const details = await getSubscriptionDetails(req.user!.tenantId!);
    res.json(details);
  } catch (error) {
    res.status(500).json({ error: "Failed to get subscription details" });
  }
});

// Create checkout session
router.post("/checkout", authorize("clientAdmin"), requireTenant, async (req, res) => {
  try {
    const data = z.object({
      plan: z.enum(["growth", "enterprise"]),
      billing: z.enum(["monthly", "yearly"]),
      successUrl: z.string().url(),
      cancelUrl: z.string().url(),
    }).parse(req.body);
    
    const url = await createCheckoutSession(
      req.user!.tenantId!,
      data.plan,
      data.billing,
      data.successUrl,
      data.cancelUrl
    );
    
    res.json({ url });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// Create customer portal session
router.post("/portal", authorize("clientAdmin"), requireTenant, async (req, res) => {
  try {
    const { returnUrl } = z.object({ returnUrl: z.string().url() }).parse(req.body);
    
    const url = await createPortalSession(req.user!.tenantId!, returnUrl);
    res.json({ url });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to create portal session" });
  }
});

// Cancel subscription
router.post("/cancel", authorize("clientAdmin"), requireTenant, async (req, res) => {
  try {
    await cancelSubscription(req.user!.tenantId!);
    res.json({ message: "Subscription will be cancelled at period end" });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to cancel subscription" });
  }
});

// Reactivate subscription
router.post("/reactivate", authorize("clientAdmin"), requireTenant, async (req, res) => {
  try {
    await reactivateSubscription(req.user!.tenantId!);
    res.json({ message: "Subscription reactivated" });
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to reactivate subscription" });
  }
});

// Get payment history
router.get("/payments", authorize("clientAdmin"), requireTenant, async (req, res) => {
  try {
    const payments = await db.query.payments.findMany({
      where: eq(payments.tenantId, req.user!.tenantId!),
      orderBy: [desc(payments.createdAt)],
      limit: 20,
    });
    
    res.json({ payments });
  } catch (error) {
    res.status(500).json({ error: "Failed to get payment history" });
  }
});

export default router;
