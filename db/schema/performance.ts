import { pgTable, text, integer, timestamp, jsonb, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants, users } from './core.js';

export const performanceReviews = pgTable('performance_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  userId: text('user_id').notNull(),
  reviewData: jsonb('review_data'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const performanceReviewsRelations = relations(performanceReviews, ({ one }) => ({
  tenant: one(tenants, {
    fields: [performanceReviews.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [performanceReviews.userId],
    references: [users.id],
  }),
}));

