"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.demoRequests = exports.paymentSessions = exports.invoices = exports.subscriptions = exports.payments = void 0;
// db/schema/payments.ts
const pg_core_1 = require("drizzle-orm/pg-core");
exports.payments = (0, pg_core_1.pgTable)('payments', {
    id: (0, pg_core_1.text)('id').primaryKey(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    companyId: (0, pg_core_1.text)('company_id'),
    userId: (0, pg_core_1.text)('user_id'),
    // Stripe related
    stripeCustomerId: (0, pg_core_1.text)('stripe_customer_id'),
    stripePaymentIntentId: (0, pg_core_1.text)('stripe_payment_intent_id'),
    stripeSubscriptionId: (0, pg_core_1.text)('stripe_subscription_id'),
    // Payment details
    amount: (0, pg_core_1.integer)('amount').notNull(), // in cents
    currency: (0, pg_core_1.text)('currency').notNull().default('usd'),
    status: (0, pg_core_1.text)('status').notNull(), // pending, succeeded, failed, refunded
    paymentMethod: (0, pg_core_1.text)('payment_method'), // card, bank_transfer, etc.
    // Metadata
    description: (0, pg_core_1.text)('description'),
    metadata: (0, pg_core_1.jsonb)('metadata'),
    // Timestamps
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
    paidAt: (0, pg_core_1.timestamp)('paid_at')
});
exports.subscriptions = (0, pg_core_1.pgTable)('subscriptions', {
    id: (0, pg_core_1.text)('id').primaryKey(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    companyId: (0, pg_core_1.text)('company_id'),
    // Stripe
    stripeSubscriptionId: (0, pg_core_1.text)('stripe_subscription_id').unique(),
    stripeCustomerId: (0, pg_core_1.text)('stripe_customer_id'),
    stripePriceId: (0, pg_core_1.text)('stripe_price_id'),
    stripeProductId: (0, pg_core_1.text)('stripe_product_id'),
    // Subscription details
    status: (0, pg_core_1.text)('status').notNull(), // active, canceled, past_due, trialing, incomplete
    plan: (0, pg_core_1.text)('plan').notNull(), // free, starter, growth, scale, enterprise
    billingPeriod: (0, pg_core_1.text)('billing_period').notNull(), // monthly, annual
    // Per-employee pricing
    employeeCount: (0, pg_core_1.integer)('employee_count').notNull().default(0),
    pricePerEmployee: (0, pg_core_1.integer)('price_per_employee').notNull().default(0), // in cents
    // Total pricing (calculated: employeeCount * pricePerEmployee)
    amount: (0, pg_core_1.integer)('amount').notNull(),
    currency: (0, pg_core_1.text)('currency').notNull().default('usd'),
    // Features
    maxUsers: (0, pg_core_1.integer)('max_users'),
    maxAnalyses: (0, pg_core_1.integer)('max_analyses'),
    features: (0, pg_core_1.jsonb)('features'), // Array of enabled features
    // Trial
    trialEndsAt: (0, pg_core_1.timestamp)('trial_ends_at'),
    // Cancellation
    cancelAtPeriodEnd: (0, pg_core_1.boolean)('cancel_at_period_end').default(false),
    canceledAt: (0, pg_core_1.timestamp)('canceled_at'),
    // Dates
    currentPeriodStart: (0, pg_core_1.timestamp)('current_period_start'),
    currentPeriodEnd: (0, pg_core_1.timestamp)('current_period_end'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow()
});
exports.invoices = (0, pg_core_1.pgTable)('invoices', {
    id: (0, pg_core_1.text)('id').primaryKey(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    subscriptionId: (0, pg_core_1.text)('subscription_id'),
    // Stripe
    stripeInvoiceId: (0, pg_core_1.text)('stripe_invoice_id').unique(),
    // Invoice details
    number: (0, pg_core_1.text)('number'),
    status: (0, pg_core_1.text)('status').notNull(), // draft, open, paid, void, uncollectible
    amount: (0, pg_core_1.integer)('amount').notNull(),
    amountPaid: (0, pg_core_1.integer)('amount_paid').default(0),
    amountDue: (0, pg_core_1.integer)('amount_due'),
    currency: (0, pg_core_1.text)('currency').notNull().default('usd'),
    // Dates
    dueDate: (0, pg_core_1.timestamp)('due_date'),
    paidAt: (0, pg_core_1.timestamp)('paid_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    // PDF
    pdfUrl: (0, pg_core_1.text)('pdf_url')
});
// Payment sessions for Stripe Checkout
exports.paymentSessions = (0, pg_core_1.pgTable)('payment_sessions', {
    id: (0, pg_core_1.text)('id').primaryKey(),
    demoRequestId: (0, pg_core_1.integer)('demo_request_id'),
    stripeSessionId: (0, pg_core_1.text)('stripe_session_id').unique(),
    status: (0, pg_core_1.text)('status').notNull().default('pending'), // pending, complete, expired
    amount: (0, pg_core_1.integer)('amount'), // in cents
    currency: (0, pg_core_1.text)('currency').default('usd'),
    metadata: (0, pg_core_1.jsonb)('metadata'),
    expiresAt: (0, pg_core_1.timestamp)('expires_at'),
    completedAt: (0, pg_core_1.timestamp)('completed_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow()
});
exports.demoRequests = (0, pg_core_1.pgTable)('demo_requests', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    // Contact info
    firstName: (0, pg_core_1.text)('first_name').notNull(),
    lastName: (0, pg_core_1.text)('last_name').notNull(),
    email: (0, pg_core_1.text)('email').notNull(),
    company: (0, pg_core_1.text)('company').notNull(),
    phone: (0, pg_core_1.text)('phone'),
    // Company details
    employeeCount: (0, pg_core_1.integer)('employee_count'),
    industry: (0, pg_core_1.text)('industry'),
    // Interest
    interestedIn: (0, pg_core_1.jsonb)('interested_in'), // Array of features they want
    message: (0, pg_core_1.text)('message'),
    // Status tracking
    status: (0, pg_core_1.text)('status').notNull().default('pending'), // pending, contacted, qualified, converted, rejected
    assignedTo: (0, pg_core_1.text)('assigned_to'), // superadmin user ID
    // Payment link
    paymentLinkSent: (0, pg_core_1.boolean)('payment_link_sent').default(false),
    paymentLinkUrl: (0, pg_core_1.text)('payment_link_url'),
    paymentLinkSentAt: (0, pg_core_1.timestamp)('payment_link_sent_at'),
    // Conversion
    convertedToTenantId: (0, pg_core_1.text)('converted_to_tenant_id'),
    convertedAt: (0, pg_core_1.timestamp)('converted_at'),
    // Admin notes
    notes: (0, pg_core_1.text)('notes'), // Admin notes for internal tracking
    // Metadata
    source: (0, pg_core_1.text)('source').default('website'), // website, referral, etc.
    metadata: (0, pg_core_1.jsonb)('metadata'),
    // Timestamps
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow()
});
//# sourceMappingURL=payments.js.map