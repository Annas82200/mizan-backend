// db/schema/payments.ts
import { pgTable, text, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  companyId: text('company_id'),
  userId: text('user_id'),

  // Stripe related
  stripeCustomerId: text('stripe_customer_id'),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),

  // Payment details
  amount: integer('amount').notNull(), // in cents
  currency: text('currency').notNull().default('usd'),
  status: text('status').notNull(), // pending, succeeded, failed, refunded
  paymentMethod: text('payment_method'), // card, bank_transfer, etc.

  // Metadata
  description: text('description'),
  metadata: jsonb('metadata'),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  paidAt: timestamp('paid_at')
});

export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  companyId: text('company_id'),

  // Stripe
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripePriceId: text('stripe_price_id'),
  stripeProductId: text('stripe_product_id'),

  // Subscription details
  status: text('status').notNull(), // active, canceled, past_due, trialing
  plan: text('plan').notNull(), // starter, professional, enterprise
  billingPeriod: text('billing_period').notNull(), // monthly, yearly

  // Pricing
  amount: integer('amount').notNull(),
  currency: text('currency').notNull().default('usd'),

  // Features
  maxUsers: integer('max_users'),
  maxAnalyses: integer('max_analyses'),
  features: jsonb('features'),

  // Trial
  trialEndsAt: timestamp('trial_ends_at'),

  // Dates
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  canceledAt: timestamp('canceled_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const invoices = pgTable('invoices', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  subscriptionId: text('subscription_id'),

  // Stripe
  stripeInvoiceId: text('stripe_invoice_id').unique(),

  // Invoice details
  number: text('number'),
  status: text('status').notNull(), // draft, open, paid, void, uncollectible
  amount: integer('amount').notNull(),
  amountPaid: integer('amount_paid').default(0),
  amountDue: integer('amount_due'),
  currency: text('currency').notNull().default('usd'),

  // Dates
  dueDate: timestamp('due_date'),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),

  // PDF
  pdfUrl: text('pdf_url')
});
