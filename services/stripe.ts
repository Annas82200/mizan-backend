// server/services/stripe.ts

import Stripe from 'stripe';
import { db } from '../db/index.js';
import { tenants, payments } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});

export interface BillingPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    employees: number;
    analyses: number;
    modules: string[];
  };
}

export interface SubscriptionData {
  tenantId: string;
  planId: string;
  customerId: string;
  subscriptionId: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

// Available plans
export const BILLING_PLANS: Record<string, BillingPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    features: [
      'Basic organizational analysis',
      'Up to 50 employees',
      '1 analysis per month',
      'Email support'
    ],
    limits: {
      employees: 50,
      analyses: 1,
      modules: ['entryAnalyzer']
    }
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 99,
    interval: 'month',
    features: [
      'Full organizational analysis suite',
      'Up to 500 employees',
      'Unlimited analyses',
      'Advanced reporting',
      'Priority support',
      'HRIS integration'
    ],
    limits: {
      employees: 500,
      analyses: -1, // unlimited
      modules: ['entryAnalyzer', 'structureAnalysis', 'cultureAnalysis', 'skillsAnalysis', 'hrisIntegration']
    }
  },
  proplus: {
    id: 'proplus',
    name: 'Pro Plus',
    price: 199,
    interval: 'month',
    features: [
      'Everything in Pro',
      'Up to 2000 employees',
      'Advanced AI agents',
      'Custom integrations',
      'Dedicated support',
      'Training modules'
    ],
    limits: {
      employees: 2000,
      analyses: -1,
      modules: ['entryAnalyzer', 'structureAnalysis', 'cultureAnalysis', 'skillsAnalysis', 'engagementAnalysis', 'recognitionAnalysis', 'performanceAnalysis', 'hrisIntegration', 'actionModules']
    }
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 499,
    interval: 'month',
    features: [
      'Everything in Pro Plus',
      'Unlimited employees',
      'Custom AI training',
      'White-label options',
      '24/7 support',
      'Custom development'
    ],
    limits: {
      employees: -1, // unlimited
      analyses: -1,
      modules: ['entryAnalyzer', 'structureAnalysis', 'cultureAnalysis', 'skillsAnalysis', 'engagementAnalysis', 'recognitionAnalysis', 'performanceAnalysis', 'benchmarkingAnalysis', 'hrisIntegration', 'actionModules', 'lxpPipeline', 'automatedFlow']
    }
  }
};

export class BillingService {
  async createCustomer(tenantId: string, email: string, name: string): Promise<string> {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          tenantId
        }
      });

      // Update tenant with customer ID
      await db.update(tenants)
        .set({
          stripeCustomerId: customer.id,
          updatedAt: new Date()
        })
        .where(eq(tenants.id, tenantId));

      return customer.id;
    } catch (error) {
      console.error('Failed to create Stripe customer:', error);
      throw error;
    }
  }

  async createSubscription(tenantId: string, planId: string, paymentMethodId?: string): Promise<SubscriptionData> {
    try {
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, tenantId)
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      let customerId = tenant.stripeCustomerId;
      
      // Create customer if doesn't exist
      if (!customerId) {
        customerId = await this.createCustomer(tenantId, tenant.primaryContact, tenant.name);
      }

      // Get plan details
      const plan = BILLING_PLANS[planId];
      if (!plan) {
        throw new Error('Invalid plan');
      }

      // Create Stripe price if not exists
      const price = await this.getOrCreatePrice(plan);

      // Create subscription
      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [{ price: price.id }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      };

      if (paymentMethodId) {
        subscriptionParams.default_payment_method = paymentMethodId;
      }

      const subscription = await stripe.subscriptions.create(subscriptionParams);

      // Update tenant
      await db.update(tenants)
        .set({
          plan: planId as any,
          stripeSubscriptionId: subscription.id,
          status: 'active',
          updatedAt: new Date()
        })
        .where(eq(tenants.id, tenantId));

      return {
        tenantId,
        planId,
        customerId,
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      };

    } catch (error) {
      console.error('Failed to create subscription:', error);
      throw error;
    }
  }

  async updateSubscription(tenantId: string, newPlanId: string): Promise<SubscriptionData> {
    try {
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, tenantId)
      });

      if (!tenant || !tenant.stripeSubscriptionId) {
        throw new Error('No active subscription found');
      }

      const plan = BILLING_PLANS[newPlanId];
      if (!plan) {
        throw new Error('Invalid plan');
      }

      const price = await this.getOrCreatePrice(plan);

      // Update subscription
      const subscription = await stripe.subscriptions.update(tenant.stripeSubscriptionId, {
        items: [{ price: price.id }],
        proration_behavior: 'create_prorations'
      });

      // Update tenant
      await db.update(tenants)
        .set({
          plan: newPlanId as any,
          updatedAt: new Date()
        })
        .where(eq(tenants.id, tenantId));

      return {
        tenantId,
        planId: newPlanId,
        customerId: tenant.stripeCustomerId!,
        subscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      };

    } catch (error) {
      console.error('Failed to update subscription:', error);
      throw error;
    }
  }

  async cancelSubscription(tenantId: string, immediately: boolean = false): Promise<void> {
    try {
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, tenantId)
      });

      if (!tenant || !tenant.stripeSubscriptionId) {
        throw new Error('No active subscription found');
      }

      if (immediately) {
        await stripe.subscriptions.cancel(tenant.stripeSubscriptionId);
      } else {
        await stripe.subscriptions.update(tenant.stripeSubscriptionId, {
          cancel_at_period_end: true
        });
      }

      // Update tenant status
      await db.update(tenants)
        .set({
          status: immediately ? 'cancelled' : 'active',
          updatedAt: new Date()
        })
        .where(eq(tenants.id, tenantId));

    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      throw error;
    }
  }

  async createPaymentIntent(tenantId: string, amount: number, currency: string = 'usd'): Promise<string> {
    try {
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, tenantId)
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      let customerId = tenant.stripeCustomerId;
      if (!customerId) {
        customerId = await this.createCustomer(tenantId, tenant.primaryContact, tenant.name);
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        customer: customerId,
        metadata: {
          tenantId
        }
      });

      // Log payment intent
      await db.insert(payments).values({
        id: randomUUID(),
        tenantId,
        stripePaymentIntentId: paymentIntent.id,
        amount: amount.toString(),
        currency,
        status: 'pending',
        description: 'Payment intent created',
        metadata: { paymentIntentId: paymentIntent.id },
        createdAt: new Date()
      });

      return paymentIntent.client_secret!;

    } catch (error) {
      console.error('Failed to create payment intent:', error);
      throw error;
    }
  }

  async handleWebhook(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Webhook handling failed:', error);
      throw error;
    }
  }

  private async getOrCreatePrice(plan: BillingPlan): Promise<Stripe.Price> {
    try {
      // Try to find existing price
      const prices = await stripe.prices.list({
        product: plan.id,
        active: true
      });

      if (prices.data.length > 0) {
        return prices.data[0];
      }

      // Create new price
      const price = await stripe.prices.create({
        unit_amount: Math.round(plan.price * 100),
        currency: 'usd',
        recurring: {
          interval: plan.interval
        },
        product_data: {
          name: plan.name,
          description: plan.features.join(', ')
        }
      });

      return price;
    } catch (error) {
      console.error('Failed to get or create price:', error);
      throw error;
    }
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const tenantId = invoice.metadata?.tenantId;
    if (!tenantId) return;

    // Update payment status
    await db.update(payments)
      .set({
        status: 'succeeded',
        metadata: { invoiceId: invoice.id }
      })
      .where(eq(payments.stripePaymentIntentId, invoice.payment_intent as string));

    console.log(`Payment succeeded for tenant ${tenantId}`);
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const tenantId = invoice.metadata?.tenantId;
    if (!tenantId) return;

    // Update payment status
    await db.update(payments)
      .set({
        status: 'failed',
        metadata: { invoiceId: invoice.id }
      })
      .where(eq(payments.stripePaymentIntentId, invoice.payment_intent as string));

    // Update tenant status
    await db.update(tenants)
      .set({
        status: 'suspended',
        updatedAt: new Date()
      })
      .where(eq(tenants.id, tenantId));

    console.log(`Payment failed for tenant ${tenantId}`);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    const tenantId = customer.metadata?.tenantId;
    
    if (!tenantId) return;

    // Update tenant subscription info
    await db.update(tenants)
      .set({
        status: subscription.status === 'active' ? 'active' : 'suspended',
        updatedAt: new Date()
      })
      .where(eq(tenants.id, tenantId));

    console.log(`Subscription updated for tenant ${tenantId}: ${subscription.status}`);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    const tenantId = customer.metadata?.tenantId;
    
    if (!tenantId) return;

    // Update tenant status
    await db.update(tenants)
      .set({
        status: 'cancelled',
        plan: 'free',
        updatedAt: new Date()
      })
      .where(eq(tenants.id, tenantId));

    console.log(`Subscription cancelled for tenant ${tenantId}`);
  }
}

// Export singleton instance
export const billingService = new BillingService();

// Export convenience functions
export async function createSubscription(tenantId: string, planId: string, paymentMethodId?: string): Promise<SubscriptionData> {
  return billingService.createSubscription(tenantId, planId, paymentMethodId);
}

export async function updateSubscription(tenantId: string, newPlanId: string): Promise<SubscriptionData> {
  return billingService.updateSubscription(tenantId, newPlanId);
}

export async function cancelSubscription(tenantId: string, immediately: boolean = false): Promise<void> {
  return billingService.cancelSubscription(tenantId, immediately);
}

export async function createPaymentIntent(tenantId: string, amount: number, currency: string = 'usd'): Promise<string> {
  return billingService.createPaymentIntent(tenantId, amount, currency);
}

export async function handleWebhook(event: Stripe.Event): Promise<void> {
  return billingService.handleWebhook(event);
}