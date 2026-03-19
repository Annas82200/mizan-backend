import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, integer, real, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const successionPriorityEnum = pgEnum('succession_priority', ['critical', 'high', 'medium', 'low']);
export const readinessLevelEnum = pgEnum('readiness_level', ['ready_now', 'ready_1_year', 'ready_2_years', 'developing', 'not_ready']);
export const developmentStatusEnum = pgEnum('development_status', ['not_started', 'in_progress', 'on_track', 'at_risk', 'completed']);
export const talentCategoryEnum = pgEnum('talent_category', ['high_potential', 'high_performer', 'solid_performer', 'inconsistent', 'underperformer']);

export const talentPools = pgTable('talent_pools', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  criteria: jsonb('criteria').notNull(), // {performanceThreshold, potentialThreshold, skills?, tenure?}
  memberCount: integer('member_count').default(0),
  isActive: boolean('is_active').default(true),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const nineBoxPlacements = pgTable('nine_box_placements', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  employeeId: uuid('employee_id').notNull(),
  performanceScore: real('performance_score').notNull(), // 1-3 (low, medium, high)
  potentialScore: real('potential_score').notNull(), // 1-3 (low, medium, high)
  category: talentCategoryEnum('category').notNull(),
  assessedBy: uuid('assessed_by').notNull(),
  period: varchar('period', { length: 50 }).notNull(), // Q1-2026, H1-2026, 2026
  notes: text('notes'),
  actionPlan: text('action_plan'),
  previousCategory: talentCategoryEnum('previous_category'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const successionPlans = pgTable('succession_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  positionTitle: varchar('position_title', { length: 255 }).notNull(),
  positionId: uuid('position_id'),
  departmentId: uuid('department_id'),
  currentIncumbentId: uuid('current_incumbent_id'),
  priority: successionPriorityEnum('priority').notNull().default('medium'),
  riskLevel: varchar('risk_level', { length: 50 }), // flight_risk, retirement, single_point_of_failure
  requiredCompetencies: jsonb('required_competencies').default('[]'),
  timelineMonths: integer('timeline_months'),
  status: varchar('status', { length: 50 }).default('active'),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const successionCandidates = pgTable('succession_candidates', {
  id: uuid('id').defaultRandom().primaryKey(),
  successionPlanId: uuid('succession_plan_id').notNull().references(() => successionPlans.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  employeeId: uuid('employee_id').notNull(),
  readinessLevel: readinessLevelEnum('readiness_level').notNull(),
  overallFitScore: real('overall_fit_score'), // AI-calculated 0-100
  competencyGaps: jsonb('competency_gaps').default('[]'), // [{competency, currentLevel, requiredLevel, gap}]
  developmentActions: jsonb('development_actions').default('[]'),
  ranking: integer('ranking'),
  nominatedBy: uuid('nominated_by').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const developmentPlans = pgTable('development_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  employeeId: uuid('employee_id').notNull(),
  managerId: uuid('manager_id'),
  title: varchar('title', { length: 255 }).notNull(),
  targetRole: varchar('target_role', { length: 255 }),
  status: developmentStatusEnum('status').notNull().default('not_started'),
  objectives: jsonb('objectives').notNull(), // [{title, description, targetDate, status, progress}]
  skillTargets: jsonb('skill_targets').default('[]'), // [{skillId, currentLevel, targetLevel}]
  learningActivities: jsonb('learning_activities').default('[]'), // [{type, title, dueDate, status, lxpCourseId?}]
  mentorId: uuid('mentor_id'),
  startDate: timestamp('start_date'),
  targetCompletionDate: timestamp('target_completion_date'),
  actualCompletionDate: timestamp('actual_completion_date'),
  progressPercentage: integer('progress_percentage').default(0),
  aiRecommendations: jsonb('ai_recommendations').default('[]'),
  lastReviewDate: timestamp('last_review_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const successionPlansRelations = relations(successionPlans, ({ many }) => ({
  candidates: many(successionCandidates),
}));

export const successionCandidatesRelations = relations(successionCandidates, ({ one }) => ({
  plan: one(successionPlans, { fields: [successionCandidates.successionPlanId], references: [successionPlans.id] }),
}));
