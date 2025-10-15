import { pgTable, text, integer, timestamp, boolean, jsonb, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants, users } from './core';

// ============================================================================
// CULTURE ANALYSIS SYSTEM
// ============================================================================

export const cultureAssessments = pgTable('culture_assessments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  companyId: text('company_id'), // Reference to company/tenant
  userId: text('user_id').notNull(),
  personalValues: jsonb('personal_values'), // Selected personal values
  currentExperience: jsonb('current_experience'), // Current company experience values
  desiredExperience: jsonb('desired_experience'), // Desired future experience values
  recognition: integer('recognition'), // 1-5 scale
  engagement: integer('engagement'), // 1-5 scale
  completedAt: timestamp('completed_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Survey invitations tracking
export const cultureSurveyInvitations = pgTable('culture_survey_invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  campaignId: text('campaign_id').notNull(),
  campaignName: text('campaign_name'),
  employeeId: text('employee_id').notNull(),
  employeeEmail: text('employee_email').notNull(),
  surveyToken: text('survey_token').notNull().unique(),
  surveyLink: text('survey_link').notNull(),
  status: text('status').notNull().default('pending'),
  sentAt: timestamp('sent_at'),
  completedAt: timestamp('completed_at'),
  remindersSent: integer('reminders_sent').default(0),
  lastReminderAt: timestamp('last_reminder_at'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const cultureReports = pgTable('culture_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  analysisId: text('analysis_id'),
  reportType: text('report_type').notNull(), // employee, admin, department
  reportData: jsonb('report_data').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 7 Cylinders Assessment Scores
export const cylinderScores = pgTable('cylinder_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  targetType: text('target_type').notNull(), // 'individual', 'department', 'company'
  targetId: text('target_id').notNull(), // userId, departmentId, or companyId
  assessmentId: text('assessment_id'), // Reference to culture assessment

  // Individual Cylinder Scores (0-100)
  cylinder1Safety: integer('cylinder1_safety'),
  cylinder2Belonging: integer('cylinder2_belonging'),
  cylinder3Growth: integer('cylinder3_growth'),
  cylinder4Meaning: integer('cylinder4_meaning'),
  cylinder5Integrity: integer('cylinder5_integrity'),
  cylinder6Wisdom: integer('cylinder6_wisdom'),
  cylinder7Transcendence: integer('cylinder7_transcendence'),

  // Enabling and Limiting Values (JSONB for flexibility)
  enablingValues: jsonb('enabling_values'), // { "Safety": 85, "Stability": 80, ... }
  limitingValues: jsonb('limiting_values'), // { "Fear": 15, "Instability": 20, ... }

  // Overall Metrics
  overallScore: integer('overall_score'), // 0-100 average
  culturalMaturity: integer('cultural_maturity'), // 1-7 (highest cylinder reached)
  entropyScore: integer('entropy_score'), // 0-100 (percentage of limiting values)

  // Metadata
  assessmentDate: timestamp('assessment_date').notNull().defaultNow(),
  assessedBy: text('assessed_by'), // 'culture_agent', userId, or 'system'
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
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

export const cylinderScoresRelations = relations(cylinderScores, ({ one }) => ({
  tenant: one(tenants, {
    fields: [cylinderScores.tenantId],
    references: [tenants.id],
  }),
}));

export const cultureSurveyInvitationsRelations = relations(cultureSurveyInvitations, ({ one }) => ({
  tenant: one(tenants, {
    fields: [cultureSurveyInvitations.tenantId],
    references: [tenants.id],
  }),
  employee: one(users, {
    fields: [cultureSurveyInvitations.employeeId],
    references: [users.id],
  }),
}));

