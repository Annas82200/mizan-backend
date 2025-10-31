// db/schema/payments.ts
import { pgTable, text, timestamp, integer, boolean, jsonb, serial, uuid } from 'drizzle-orm/pg-core';

export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  companyId: uuid('company_id'),
  userId: uuid('user_id'),

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
  tenantId: uuid('tenant_id').notNull(),
  companyId: uuid('company_id'),

  // Stripe
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripeCustomerId: text('stripe_customer_id'),
  stripePriceId: text('stripe_price_id'),
  stripeProductId: text('stripe_product_id'),

  // Subscription details
  status: text('status').notNull(), // active, canceled, past_due, trialing, incomplete
  plan: text('plan').notNull(), // free, starter, growth, scale, enterprise
  billingPeriod: text('billing_period').notNull(), // monthly, annual

  // Per-employee pricing
  employeeCount: integer('employee_count').notNull().default(0),
  pricePerEmployee: integer('price_per_employee').notNull().default(0), // in cents

  // Total pricing (calculated: employeeCount * pricePerEmployee)
  amount: integer('amount').notNull(),
  currency: text('currency').notNull().default('usd'),

  // Features
  maxUsers: integer('max_users'),
  maxAnalyses: integer('max_analyses'),
  features: jsonb('features'), // Array of enabled features

  // Trial
  trialEndsAt: timestamp('trial_ends_at'),

  // Cancellation
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  canceledAt: timestamp('canceled_at'),

  // Dates
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const invoices = pgTable('invoices', {
  id: text('id').primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
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

export const demoRequests = pgTable('demo_requests', {
  id: serial('id').primaryKey(),

  // Contact info
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  company: text('company').notNull(),
  phone: text('phone'),

  // Company details
  employeeCount: integer('employee_count'),
  industry: text('industry'),

  // Interest
  interestedIn: jsonb('interested_in'), // Array of features they want
  message: text('message'),

  // Status tracking
  status: text('status').notNull().default('pending'), // pending, contacted, qualified, converted, rejected
  assignedTo: text('assigned_to'), // superadmin user ID

  // Payment link
  paymentLinkSent: boolean('payment_link_sent').default(false),
  paymentLinkUrl: text('payment_link_url'),
  paymentLinkSentAt: timestamp('payment_link_sent_at'),

  // Conversion
  convertedToTenantId: text('converted_to_tenant_id'),
  convertedAt: timestamp('converted_at'),

  // Metadata
  source: text('source').default('website'), // website, referral, etc.
  metadata: jsonb('metadata'),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const paymentSessions = pgTable('payment_sessions', {
  id: text('id').primaryKey(),
  demoRequestId: integer('demo_request_id'),
  stripeSessionId: text('stripe_session_id').unique().notNull(),

  // Session details
  amount: integer('amount').notNull(), // in cents
  currency: text('currency').notNull().default('usd'),
  status: text('status').notNull().default('pending'), // pending, complete, expired

  // Session configuration
  metadata: jsonb('metadata').$type<{
    plan?: string;
    billingPeriod?: string;
    employeeCount?: number;
  }>(),

  // Timestamps
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});
