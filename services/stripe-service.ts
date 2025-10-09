// services/stripe-service.ts
import Stripe from 'stripe';
import { db } from '../db/index.js';
import { subscriptions, payments, demoRequests } from '../db/schema/payments.js';
import { eq } from 'drizzle-orm';
import { emailService } from './email.js';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
});

// Pricing configuration (matches pricing page)
export const PRICING_CONFIG = {
  starter: {
    monthly: 800, // $8.00 per employee/month in cents
    annual: 666,  // $6.66 per employee/month in cents (17% discount)
    minEmployees: 50,
    maxEmployees: 250
  },
  growth: {
    monthly: 1500, // $15.00 per employee/month in cents
    annual: 1250,  // $12.50 per employee/month in cents
    minEmployees: 250,
    maxEmployees: 1000
  },
  scale: {
    monthly: 2400, // $24.00 per employee/month in cents
    annual: 2000,  // $20.00 per employee/month in cents
    minEmployees: 1000,
    maxEmployees: 5000
  },
  enterprise: {
    // Custom pricing - handled manually
    minEmployees: 5000
  }
};

export interface CreateCheckoutSessionInput {
  demoRequestId: number;
  plan: 'starter' | 'growth' | 'scale' | 'enterprise';
  billingPeriod: 'monthly' | 'annual';
  employeeCount: number;
  customerEmail: string;
  customerName: string;
  metadata?: Record<string, string>;
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export class StripeService {
  /**
   * Create a Stripe Checkout Session for a demo request
   */
  async createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CheckoutSessionResponse> {
    try {
      // Validate plan and employee count
      if (input.plan === 'enterprise') {
        throw new Error('Enterprise plans require manual pricing. Please contact sales.');
      }

      const planConfig = PRICING_CONFIG[input.plan];
      if (input.employeeCount < planConfig.minEmployees) {
        throw new Error(`${input.plan} plan requires a minimum of ${planConfig.minEmployees} employees`);
      }

      // Calculate pricing
      const pricePerEmployee = input.billingPeriod === 'annual' ? planConfig.annual : planConfig.monthly;
      const totalAmount = pricePerEmployee * input.employeeCount;

      // Create Stripe Customer
      const customer = await stripe.customers.create({
        email: input.customerEmail,
        name: input.customerName,
        metadata: {
          demoRequestId: input.demoRequestId.toString(),
          plan: input.plan,
          employeeCount: input.employeeCount.toString(),
        },
      });

      // Create Checkout Session
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Mizan ${input.plan.charAt(0).toUpperCase() + input.plan.slice(1)} Plan`,
                description: `${input.employeeCount} employees • ${input.billingPeriod === 'annual' ? 'Annual' : 'Monthly'} billing`,
              },
              unit_amount: pricePerEmployee,
              recurring: {
                interval: input.billingPeriod === 'annual' ? 'year' : 'month',
              },
            },
            quantity: input.employeeCount,
          },
        ],
        subscription_data: {
          trial_period_days: 14, // 14-day trial
          metadata: {
            demoRequestId: input.demoRequestId.toString(),
            plan: input.plan,
            employeeCount: input.employeeCount.toString(),
            billingPeriod: input.billingPeriod,
          },
        },
        success_url: `${process.env.FRONTEND_URL}/welcome?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/pricing`,
        metadata: {
          demoRequestId: input.demoRequestId.toString(),
          plan: input.plan,
          employeeCount: input.employeeCount.toString(),
        },
      });

      // Update demo request with payment link
      await db.update(demoRequests)
        .set({
          paymentLinkSent: true,
          paymentLinkUrl: session.url || '',
          paymentLinkSentAt: new Date(),
          status: 'qualified',
          updatedAt: new Date(),
        })
        .where(eq(demoRequests.id, input.demoRequestId));

      return {
        sessionId: session.id,
        url: session.url || '',
      };
    } catch (error: any) {
      console.error('Stripe checkout session creation failed:', error);
      throw new Error(error.message || 'Failed to create checkout session');
    }
  }

  /**
   * Handle successful checkout - Called by webhook
   */
  async handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
    try {
      const demoRequestId = parseInt(session.metadata?.demoRequestId || '0');
      const plan = session.metadata?.plan || 'starter';
      const employeeCount = parseInt(session.metadata?.employeeCount || '0');
      const billingPeriod = session.metadata?.billingPeriod || 'monthly';

      if (!demoRequestId) {
        throw new Error('No demoRequestId in session metadata');
      }

      // Get the demo request
      const [demoRequest] = await db
        .select()
        .from(demoRequests)
        .where(eq(demoRequests.id, demoRequestId));

      if (!demoRequest) {
        throw new Error(`Demo request ${demoRequestId} not found`);
      }

      // Get subscription details from Stripe
      const stripeSubscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      );

      // Calculate pricing
      const planConfig = PRICING_CONFIG[plan as keyof typeof PRICING_CONFIG];
      const pricePerEmployee = billingPeriod === 'annual' ? planConfig.annual : planConfig.monthly;
      const totalAmount = pricePerEmployee * employeeCount;

      // Create tenant (company account)
      const tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create subscription record
      await db.insert(subscriptions).values({
        id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tenantId,
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId: session.customer as string,
        stripePriceId: stripeSubscription.items.data[0].price.id,
        stripeProductId: stripeSubscription.items.data[0].price.product as string,
        status: stripeSubscription.status,
        plan: plan,
        billingPeriod: billingPeriod,
        employeeCount: employeeCount,
        pricePerEmployee: pricePerEmployee,
        amount: totalAmount,
        currency: 'usd',
        trialEndsAt: stripeSubscription.trial_end
          ? new Date(stripeSubscription.trial_end * 1000)
          : null,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Update demo request
      await db.update(demoRequests)
        .set({
          status: 'converted',
          convertedToTenantId: tenantId,
          convertedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(demoRequests.id, demoRequestId));

      // Send payment success email
      try {
        await emailService.sendEmail({
          to: session.customer_email || demoRequest.email,
          template: 'paymentSuccess',
          data: {
            customerName: session.customer_details?.name || `${demoRequest.firstName} ${demoRequest.lastName}`,
            plan: plan.charAt(0).toUpperCase() + plan.slice(1),
            amount: totalAmount,
            billingPeriod: billingPeriod === 'annual' ? 'Annual' : 'Monthly',
            employeeCount,
          }
        });
      } catch (emailError) {
        console.error('Failed to send payment success email:', emailError);
      }

      console.log(`✅ Checkout complete: Demo ${demoRequestId} → Tenant ${tenantId}`);
    } catch (error: any) {
      console.error('Checkout completion handling failed:', error);
      throw error;
    }
  }

  /**
   * Handle subscription updates - Called by webhook
   */
  async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    try {
      // Find subscription in database
      const [existingSub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

      if (!existingSub) {
        console.log(`Subscription ${subscription.id} not found in database, skipping update`);
        return;
      }

      // Update subscription status
      await db.update(subscriptions)
        .set({
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

      console.log(`✅ Subscription ${subscription.id} updated to status: ${subscription.status}`);
    } catch (error: any) {
      console.error('Subscription update handling failed:', error);
      throw error;
    }
  }

  /**
   * Handle failed payment - Called by webhook
   */
  async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    try {
      const subscriptionId = invoice.subscription as string;

      if (!subscriptionId) {
        console.log('Invoice has no subscription, skipping');
        return;
      }

      // Find subscription
      const [sub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));

      if (!sub) {
        console.log(`Subscription ${subscriptionId} not found`);
        return;
      }

      // Update status to past_due
      await db.update(subscriptions)
        .set({
          status: 'past_due',
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));

      // Send email notification to customer about failed payment
      try {
        const [subscription] = await db.query.subscriptions.findMany({
          where: eq(subscriptions.stripeSubscriptionId, subscriptionId)
        });

        if (subscription) {
          await emailService.sendEmail({
            to: invoice.customer_email || '',
            template: 'paymentFailed',
            data: {
              customerName: invoice.customer_name || 'Valued Customer',
              amount: invoice.amount_due,
              reason: invoice.last_finalization_error?.message || 'Payment declined',
            }
          });
        }
      } catch (emailError) {
        console.error('Failed to send payment failed email:', emailError);
      }

      console.log(`⚠️ Payment failed for subscription ${subscriptionId}`);
    } catch (error: any) {
      console.error('Invoice payment failure handling failed:', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(body: string, signature: string): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not set');
    }

    try {
      return stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error: any) {
      throw new Error(`Webhook signature verification failed: ${error.message}`);
    }
  }
}

export const stripeService = new StripeService();
