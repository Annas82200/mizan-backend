import { pgTable, uuid, text, timestamp, decimal, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './core.js';

export const bonusTypeEnum = pgEnum('bonus_type', ['performance', 'skill_acquisition', 'project_completion', 'spot_bonus', 'retention']);
export const bonusStatusEnum = pgEnum('bonus_status', ['recommended', 'approved', 'rejected', 'paid', 'cancelled']);

/**
 * Bonus Recommendations Table
 * Stores AI-generated recommendations for employee bonuses.
 */
export const bonusRecommendations = pgTable('bonus_recommendations', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    employeeId: uuid('employee_id').notNull().references(() => users.id),
    triggerSource: text('trigger_source').notNull(), // e.g., 'performance_review', 'skill_gap_closed'
    triggerData: jsonb('trigger_data'), // Raw data that triggered the recommendation

    bonusType: bonusTypeEnum('bonus_type').notNull(),
    recommendedAmount: decimal('recommended_amount', { precision: 12, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('USD'),
    rationale: text('rationale').notNull(), // AI-generated reason for the bonus
    status: bonusStatusEnum('status').notNull().default('recommended'),

    approvedBy: uuid('approved_by'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

/**
 * Bonus Payouts Table
 * Tracks the status of approved bonus payouts.
 */
export const bonusPayouts = pgTable('bonus_payouts', {
    id: uuid('id').primaryKey().defaultRandom(),
    recommendationId: uuid('recommendation_id').notNull().references(() => bonusRecommendations.id),
    tenantId: uuid('tenant_id').notNull(),
    employeeId: uuid('employee_id').notNull().references(() => users.id),

    payoutAmount: decimal('payout_amount', { precision: 12, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('USD'),
    status: text('status').notNull().default('pending'), // pending, processing, paid, failed
    
    paymentTransactionId: text('payment_transaction_id'), // From payment gateway
    paidAt: timestamp('paid_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const bonusRecommendationsRelations = relations(bonusRecommendations, ({ one }) => ({
    employee: one(users, {
        fields: [bonusRecommendations.employeeId],
        references: [users.id],
    }),
}));

export const bonusPayoutsRelations = relations(bonusPayouts, ({ one }) => ({
    recommendation: one(bonusRecommendations, {
        fields: [bonusPayouts.recommendationId],
        references: [bonusRecommendations.id],
    }),
    employee: one(users, {
        fields: [bonusPayouts.employeeId],
        references: [users.id],
    }),
}));
