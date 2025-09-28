import { pgTable, text, integer, timestamp, boolean, jsonb, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants, users } from './core.js';

// ============================================================================
// CULTURE ANALYSIS SYSTEM
// ============================================================================

export const cultureAssessments = pgTable('culture_assessments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  userId: text('user_id').notNull(),
  personalValues: jsonb('personal_values'), // Selected personal values
  currentExperience: jsonb('current_experience'), // Current company experience values
  desiredExperience: jsonb('desired_experience'), // Desired future experience values
  recognition: integer('recognition'), // 1-10 scale
  engagement: integer('engagement'), // 1-10 scale
  completedAt: timestamp('completed_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const cultureReports = pgTable('culture_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  analysisId: text('analysis_id'),
  reportType: text('report_type').notNull(), // employee, admin, department
  reportData: jsonb('report_data').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const cultureAssessmentsRelations = relations(cultureAssessments, ({ one }) => ({
  tenant: one(tenants, {
    fields: [cultureAssessments.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [cultureAssessments.userId],
    references: [users.id],
  }),
}));

export const cultureReportsRelations = relations(cultureReports, ({ one }) => ({
  tenant: one(tenants, {
    fields: [cultureReports.tenantId],
    references: [tenants.id],
  }),
}));

