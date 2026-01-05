"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cultureSurveyInvitationsRelations = exports.cylinderScoresRelations = exports.cultureReportsRelations = exports.cultureAssessmentsRelations = exports.cylinderScores = exports.cultureReports = exports.cultureSurveyInvitations = exports.cultureAssessments = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const core_1 = require("./core");
// ============================================================================
// CULTURE ANALYSIS SYSTEM
// ============================================================================
exports.cultureAssessments = (0, pg_core_1.pgTable)('culture_assessments', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    companyId: (0, pg_core_1.text)('company_id'), // Reference to company/tenant
    userId: (0, pg_core_1.text)('user_id').notNull(),
    personalValues: (0, pg_core_1.jsonb)('personal_values'), // Selected personal values
    currentExperience: (0, pg_core_1.jsonb)('current_experience'), // Current company experience values
    desiredExperience: (0, pg_core_1.jsonb)('desired_experience'), // Desired future experience values
    recognition: (0, pg_core_1.integer)('recognition'), // 1-5 scale
    engagement: (0, pg_core_1.integer)('engagement'), // 1-5 scale
    additionalComments: (0, pg_core_1.text)('additional_comments'), // Employee additional feedback
    completedAt: (0, pg_core_1.timestamp)('completed_at').defaultNow(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(), // Add updatedAt for consistency
});
// Survey invitations tracking
exports.cultureSurveyInvitations = (0, pg_core_1.pgTable)('culture_survey_invitations', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    campaignId: (0, pg_core_1.text)('campaign_id').notNull(),
    campaignName: (0, pg_core_1.text)('campaign_name'),
    employeeId: (0, pg_core_1.text)('employee_id').notNull(),
    employeeEmail: (0, pg_core_1.text)('employee_email').notNull(),
    surveyToken: (0, pg_core_1.text)('survey_token').notNull().unique(),
    surveyLink: (0, pg_core_1.text)('survey_link').notNull(),
    status: (0, pg_core_1.text)('status').notNull().default('pending'),
    sentAt: (0, pg_core_1.timestamp)('sent_at'),
    completedAt: (0, pg_core_1.timestamp)('completed_at'),
    remindersSent: (0, pg_core_1.integer)('reminders_sent').default(0),
    lastReminderAt: (0, pg_core_1.timestamp)('last_reminder_at'),
    expiresAt: (0, pg_core_1.timestamp)('expires_at').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
exports.cultureReports = (0, pg_core_1.pgTable)('culture_reports', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    analysisId: (0, pg_core_1.text)('analysis_id'),
    reportType: (0, pg_core_1.text)('report_type').notNull(), // employee, admin, department
    reportData: (0, pg_core_1.jsonb)('report_data').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
// 7 Cylinders Assessment Scores
exports.cylinderScores = (0, pg_core_1.pgTable)('cylinder_scores', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    targetType: (0, pg_core_1.text)('target_type').notNull(), // 'individual', 'department', 'company'
    targetId: (0, pg_core_1.text)('target_id').notNull(), // userId, departmentId, or companyId
    assessmentId: (0, pg_core_1.text)('assessment_id'), // Reference to culture assessment
    // Individual Cylinder Scores (0-100)
    cylinder1Safety: (0, pg_core_1.integer)('cylinder1_safety'),
    cylinder2Belonging: (0, pg_core_1.integer)('cylinder2_belonging'),
    cylinder3Growth: (0, pg_core_1.integer)('cylinder3_growth'),
    cylinder4Meaning: (0, pg_core_1.integer)('cylinder4_meaning'),
    cylinder5Integrity: (0, pg_core_1.integer)('cylinder5_integrity'),
    cylinder6Wisdom: (0, pg_core_1.integer)('cylinder6_wisdom'),
    cylinder7Transcendence: (0, pg_core_1.integer)('cylinder7_transcendence'),
    // Enabling and Limiting Values (JSONB for flexibility)
    enablingValues: (0, pg_core_1.jsonb)('enabling_values'), // { "Safety": 85, "Stability": 80, ... }
    limitingValues: (0, pg_core_1.jsonb)('limiting_values'), // { "Fear": 15, "Instability": 20, ... }
    // Overall Metrics
    overallScore: (0, pg_core_1.integer)('overall_score'), // 0-100 average
    culturalMaturity: (0, pg_core_1.integer)('cultural_maturity'), // 1-7 (highest cylinder reached)
    entropyScore: (0, pg_core_1.integer)('entropy_score'), // 0-100 (percentage of limiting values)
    // Metadata
    assessmentDate: (0, pg_core_1.timestamp)('assessment_date').notNull().defaultNow(),
    assessedBy: (0, pg_core_1.text)('assessed_by'), // 'culture_agent', userId, or 'system'
    metadata: (0, pg_core_1.jsonb)('metadata'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
// Relations
exports.cultureAssessmentsRelations = (0, drizzle_orm_1.relations)(exports.cultureAssessments, ({ one }) => ({
    tenant: one(core_1.tenants, {
        fields: [exports.cultureAssessments.tenantId],
        references: [core_1.tenants.id],
    }),
    user: one(core_1.users, {
        fields: [exports.cultureAssessments.userId],
        references: [core_1.users.id],
    }),
}));
exports.cultureReportsRelations = (0, drizzle_orm_1.relations)(exports.cultureReports, ({ one }) => ({
    tenant: one(core_1.tenants, {
        fields: [exports.cultureReports.tenantId],
        references: [core_1.tenants.id],
    }),
}));
exports.cylinderScoresRelations = (0, drizzle_orm_1.relations)(exports.cylinderScores, ({ one }) => ({
    tenant: one(core_1.tenants, {
        fields: [exports.cylinderScores.tenantId],
        references: [core_1.tenants.id],
    }),
}));
exports.cultureSurveyInvitationsRelations = (0, drizzle_orm_1.relations)(exports.cultureSurveyInvitations, ({ one }) => ({
    tenant: one(core_1.tenants, {
        fields: [exports.cultureSurveyInvitations.tenantId],
        references: [core_1.tenants.id],
    }),
    employee: one(core_1.users, {
        fields: [exports.cultureSurveyInvitations.employeeId],
        references: [core_1.users.id],
    }),
}));
//# sourceMappingURL=culture.js.map