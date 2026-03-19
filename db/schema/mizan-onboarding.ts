import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const workflowStatusEnum = pgEnum('workflow_status', ['draft', 'active', 'archived']);
export const assignmentStatusEnum = pgEnum('assignment_status', ['not_started', 'in_progress', 'completed', 'overdue', 'cancelled']);
export const checklistItemStatusEnum = pgEnum('checklist_item_status', ['pending', 'in_progress', 'completed', 'skipped', 'blocked']);
export const mentorMatchStatusEnum = pgEnum('mentor_match_status', ['proposed', 'accepted', 'active', 'completed', 'declined']);
export const planPhaseEnum = pgEnum('plan_phase', ['first_30', 'first_60', 'first_90']);

export const onboardingWorkflows = pgTable('onboarding_workflows', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  targetRole: varchar('target_role', { length: 100 }), // specific role or null for generic
  targetDepartment: uuid('target_department'),
  steps: jsonb('steps').notNull(), // [{order, title, description, type, assignee, dueOffsetDays, isRequired}]
  estimatedDurationDays: integer('estimated_duration_days').default(90),
  status: workflowStatusEnum('status').notNull().default('draft'),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const onboardingAssignments = pgTable('onboarding_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  workflowId: uuid('workflow_id').notNull().references(() => onboardingWorkflows.id),
  tenantId: uuid('tenant_id').notNull(),
  employeeId: uuid('employee_id').notNull(),
  managerId: uuid('manager_id'),
  buddyId: uuid('buddy_id'),
  status: assignmentStatusEnum('status').notNull().default('not_started'),
  startDate: timestamp('start_date').notNull(),
  expectedEndDate: timestamp('expected_end_date'),
  actualEndDate: timestamp('actual_end_date'),
  completionPercentage: integer('completion_percentage').default(0),
  metadata: jsonb('metadata').default('{}'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const onboardingChecklists = pgTable('onboarding_checklists', {
  id: uuid('id').defaultRandom().primaryKey(),
  assignmentId: uuid('assignment_id').notNull().references(() => onboardingAssignments.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  stepOrder: integer('step_order').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }), // it_setup, hr_paperwork, team_intro, training, role_specific
  assigneeType: varchar('assignee_type', { length: 50 }).notNull(), // employee, manager, hr, it, buddy
  assigneeId: uuid('assignee_id'),
  status: checklistItemStatusEnum('status').notNull().default('pending'),
  dueDate: timestamp('due_date'),
  completedAt: timestamp('completed_at'),
  completedBy: uuid('completed_by'),
  notes: text('notes'),
  attachments: jsonb('attachments').default('[]'),
  isRequired: boolean('is_required').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const mentorMatches = pgTable('mentor_matches', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  menteeId: uuid('mentee_id').notNull(),
  mentorId: uuid('mentor_id').notNull(),
  assignmentId: uuid('assignment_id').references(() => onboardingAssignments.id),
  status: mentorMatchStatusEnum('status').notNull().default('proposed'),
  matchScore: integer('match_score'), // AI-calculated compatibility score (0-100)
  matchReasons: jsonb('match_reasons').default('[]'), // [{reason, weight}]
  meetingFrequency: varchar('meeting_frequency', { length: 50 }).default('weekly'),
  goals: jsonb('goals').default('[]'),
  feedbackScores: jsonb('feedback_scores').default('{}'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const onboardingPlans = pgTable('onboarding_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  assignmentId: uuid('assignment_id').notNull().references(() => onboardingAssignments.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  phase: planPhaseEnum('phase').notNull(),
  objectives: jsonb('objectives').notNull(), // [{title, description, measurable, status}]
  keyResults: jsonb('key_results').notNull(), // [{description, target, current, status}]
  learningGoals: jsonb('learning_goals').default('[]'),
  socialGoals: jsonb('social_goals').default('[]'),
  managerNotes: text('manager_notes'),
  employeeReflection: text('employee_reflection'),
  aiRecommendations: jsonb('ai_recommendations').default('[]'),
  isComplete: boolean('is_complete').default(false),
  completedAt: timestamp('completed_at'),
  reviewedBy: uuid('reviewed_by'),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const onboardingWorkflowsRelations = relations(onboardingWorkflows, ({ many }) => ({
  assignments: many(onboardingAssignments),
}));

export const onboardingAssignmentsRelations = relations(onboardingAssignments, ({ one, many }) => ({
  workflow: one(onboardingWorkflows, { fields: [onboardingAssignments.workflowId], references: [onboardingWorkflows.id] }),
  checklists: many(onboardingChecklists),
  plans: many(onboardingPlans),
  mentorMatch: many(mentorMatches),
}));
