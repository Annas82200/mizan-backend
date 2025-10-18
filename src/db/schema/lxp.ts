// backend/src/db/schema/lxp.ts

import { 
  pgTable, 
  uuid, 
  text, 
  timestamp, 
  integer, 
  boolean, 
  decimal,
  jsonb,
  index
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Main LXP Workflow table - tracks the complete learning experience lifecycle
export const lxpWorkflowTable = pgTable('lxp_workflows', {
  // Primary identifiers
  id: uuid('id').defaultRandom().primaryKey(),
  learningExperienceId: uuid('learning_experience_id').notNull().unique(),
  tenantId: uuid('tenant_id').notNull(),
  employeeId: uuid('employee_id').notNull(),
  
  // Trigger information
  triggeredBy: text('triggered_by', { 
    enum: ['skills_gap', 'performance_goal', 'talent_development'] 
  }).notNull(),
  triggerSourceId: uuid('trigger_source_id'), // ID of the triggering record
  
  // Learning design configuration (stored as JSON)
  learningDesign: jsonb('learning_design').notNull(), // LearningDesign interface
  
  // Progress tracking
  currentLevel: integer('current_level').default(1).notNull(),
  totalScore: integer('total_score').default(0).notNull(),
  completionPercentage: decimal('completion_percentage', { precision: 5, scale: 2 }).default('0.00').notNull(),
  timeSpent: integer('time_spent_minutes').default(0).notNull(), // in minutes
  lastActivity: timestamp('last_activity').defaultNow(),
  
  // Outcomes tracking (stored as JSON)
  outcomes: jsonb('outcomes'), // LearningOutcomes interface
  
  // Goal integration
  integratedIntoGoals: boolean('integrated_into_goals').default(false).notNull(),
  performanceGoalId: uuid('performance_goal_id'),
  supervisorId: uuid('supervisor_id'),
  goalWeight: decimal('goal_weight', { precision: 5, scale: 2 }),
  
  // Status and timestamps
  status: text('status', { 
    enum: ['assigned', 'in_progress', 'completed', 'abandoned'] 
  }).default('assigned').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  assignedAt: timestamp('assigned_at').defaultNow(),
}, (table) => ({
  tenantIdIndex: index('lxp_workflows_tenant_idx').on(table.tenantId),
  employeeIdIndex: index('lxp_workflows_employee_idx').on(table.employeeId),
  statusIndex: index('lxp_workflows_status_idx').on(table.status),
  triggeredByIndex: index('lxp_workflows_triggered_by_idx').on(table.triggeredBy),
  completionIndex: index('lxp_workflows_completion_idx').on(table.completionPercentage),
}));

// Learning Levels table - tracks individual level progress within a learning experience
export const learningLevelsTable = pgTable('learning_levels', {
  // Primary identifiers
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  learningExperienceId: uuid('learning_experience_id').notNull(),
  
  // Level configuration
  levelNumber: integer('level_number').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  objectives: jsonb('objectives').notNull(), // string[]
  difficulty: text('difficulty', { 
    enum: ['beginner', 'intermediate', 'advanced', 'expert'] 
  }).notNull(),
  requiredScore: integer('required_score').notNull(),
  estimatedTimeMinutes: integer('estimated_time_minutes').notNull(),
  
  // Progress tracking
  unlocked: boolean('unlocked').default(false).notNull(),
  completed: boolean('completed').default(false).notNull(),
  currentScore: integer('current_score').default(0).notNull(),
  attempts: integer('attempts').default(0).notNull(),
  timeSpentMinutes: integer('time_spent_minutes').default(0).notNull(),
  
  // Completion tracking
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  lastAttemptAt: timestamp('last_attempt_at'),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdIndex: index('learning_levels_tenant_idx').on(table.tenantId),
  experienceIdIndex: index('learning_levels_experience_idx').on(table.learningExperienceId),
  levelNumberIndex: index('learning_levels_number_idx').on(table.levelNumber),
  completedIndex: index('learning_levels_completed_idx').on(table.completed),
  difficultyIndex: index('learning_levels_difficulty_idx').on(table.difficulty),
}));

// Learning Progress Events table - detailed tracking of learning activities
export const learningProgressEventsTable = pgTable('learning_progress_events', {
  // Primary identifiers
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  learningExperienceId: uuid('learning_experience_id').notNull(),
  levelId: uuid('level_id'),
  employeeId: uuid('employee_id').notNull(),
  
  // Event details
  eventType: text('event_type', { 
    enum: [
      'level_started', 'level_completed', 'level_failed',
      'score_achieved', 'milestone_reached', 'skill_demonstrated',
      'behavior_observed', 'interaction_completed', 'session_ended'
    ] 
  }).notNull(),
  eventData: jsonb('event_data'), // Flexible data storage for event specifics
  
  // Metrics
  scoreChange: integer('score_change').default(0),
  timeSpentSeconds: integer('time_spent_seconds').default(0),
  
  // Context
  sessionId: uuid('session_id'),
  deviceType: text('device_type'), // 'desktop', 'mobile', 'tablet'
  
  // Timestamps
  eventTimestamp: timestamp('event_timestamp').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdIndex: index('learning_events_tenant_idx').on(table.tenantId),
  experienceIdIndex: index('learning_events_experience_idx').on(table.learningExperienceId),
  employeeIdIndex: index('learning_events_employee_idx').on(table.employeeId),
  eventTypeIndex: index('learning_events_type_idx').on(table.eventType),
  timestampIndex: index('learning_events_timestamp_idx').on(table.eventTimestamp),
}));

// Skills Acquired table - tracks skills gained through LXP experiences
export const lxpSkillsAcquiredTable = pgTable('lxp_skills_acquired', {
  // Primary identifiers
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  learningExperienceId: uuid('learning_experience_id').notNull(),
  employeeId: uuid('employee_id').notNull(),
  
  // Skill information
  skillId: uuid('skill_id'), // Reference to skills framework
  skillName: text('skill_name').notNull(),
  skillCategory: text('skill_category'), // 'technical', 'soft', 'leadership', etc.
  skillLevel: text('skill_level', { 
    enum: ['beginner', 'intermediate', 'advanced', 'expert'] 
  }).notNull(),
  
  // Acquisition details
  demonstratedInLevel: integer('demonstrated_in_level'),
  evidenceType: text('evidence_type'), // 'simulation', 'assessment', 'project', etc.
  evidenceData: jsonb('evidence_data'), // Supporting evidence
  
  // Validation
  validationStatus: text('validation_status', { 
    enum: ['pending', 'validated', 'not_validated', 'requires_review'] 
  }).default('pending').notNull(),
  validatedBy: uuid('validated_by'), // Supervisor or system
  validationDate: timestamp('validation_date'),
  validationNotes: text('validation_notes'),
  
  // Timestamps
  acquiredAt: timestamp('acquired_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdIndex: index('lxp_skills_tenant_idx').on(table.tenantId),
  experienceIdIndex: index('lxp_skills_experience_idx').on(table.learningExperienceId),
  employeeIdIndex: index('lxp_skills_employee_idx').on(table.employeeId),
  skillCategoryIndex: index('lxp_skills_category_idx').on(table.skillCategory),
  validationIndex: index('lxp_skills_validation_idx').on(table.validationStatus),
}));

// Behavior Changes table - tracks behavioral improvements from learning
export const lxpBehaviorChangesTable = pgTable('lxp_behavior_changes', {
  // Primary identifiers
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  learningExperienceId: uuid('learning_experience_id').notNull(),
  employeeId: uuid('employee_id').notNull(),
  
  // Behavior information
  behaviorType: text('behavior_type').notNull(), // 'communication', 'leadership', 'collaboration', etc.
  behaviorDescription: text('behavior_description').notNull(),
  targetBehavior: text('target_behavior').notNull(),
  
  // Measurement
  baselineMetric: decimal('baseline_metric', { precision: 10, scale: 2 }),
  currentMetric: decimal('current_metric', { precision: 10, scale: 2 }),
  improvementPercentage: decimal('improvement_percentage', { precision: 5, scale: 2 }),
  measurementMethod: text('measurement_method'), // 'self_assessment', 'peer_feedback', 'supervisor_observation'
  
  // Observation details
  observedBy: uuid('observed_by'), // Observer ID
  observationContext: text('observation_context'),
  observationData: jsonb('observation_data'),
  
  // Status and validation
  changeStatus: text('change_status', { 
    enum: ['observed', 'validated', 'sustained', 'regressed'] 
  }).default('observed').notNull(),
  sustainabilityPeriod: integer('sustainability_period_days'), // Days behavior has been sustained
  
  // Timestamps
  firstObservedAt: timestamp('first_observed_at').defaultNow().notNull(),
  lastObservedAt: timestamp('last_observed_at'),
  validatedAt: timestamp('validated_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdIndex: index('lxp_behavior_tenant_idx').on(table.tenantId),
  experienceIdIndex: index('lxp_behavior_experience_idx').on(table.learningExperienceId),
  employeeIdIndex: index('lxp_behavior_employee_idx').on(table.employeeId),
  behaviorTypeIndex: index('lxp_behavior_type_idx').on(table.behaviorType),
  statusIndex: index('lxp_behavior_status_idx').on(table.changeStatus),
}));

// Performance Impact table - tracks how LXP affects job performance
export const lxpPerformanceImpactTable = pgTable('lxp_performance_impact', {
  // Primary identifiers
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  learningExperienceId: uuid('learning_experience_id').notNull(),
  employeeId: uuid('employee_id').notNull(),
  
  // Performance metrics
  metricType: text('metric_type').notNull(), // 'goal_achievement', 'productivity', 'quality', etc.
  metricDescription: text('metric_description').notNull(),
  baselineValue: decimal('baseline_value', { precision: 10, scale: 2 }),
  currentValue: decimal('current_value', { precision: 10, scale: 2 }),
  improvementPercentage: decimal('improvement_percentage', { precision: 5, scale: 2 }),
  
  // Measurement period
  measurementPeriodStart: timestamp('measurement_period_start').notNull(),
  measurementPeriodEnd: timestamp('measurement_period_end').notNull(),
  
  // Attribution
  attributionConfidence: decimal('attribution_confidence', { precision: 5, scale: 2 }), // How confident we are this improvement is from LXP
  contributingFactors: jsonb('contributing_factors'), // Other factors that may have contributed
  
  // Validation
  validatedBy: uuid('validated_by'), // Supervisor or performance reviewer
  validationMethod: text('validation_method'),
  validationNotes: text('validation_notes'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdIndex: index('lxp_performance_tenant_idx').on(table.tenantId),
  experienceIdIndex: index('lxp_performance_experience_idx').on(table.learningExperienceId),
  employeeIdIndex: index('lxp_performance_employee_idx').on(table.employeeId),
  metricTypeIndex: index('lxp_performance_metric_idx').on(table.metricType),
}));

// LXP Analytics table - aggregated analytics and insights
export const lxpAnalyticsTable = pgTable('lxp_analytics', {
  // Primary identifiers
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  
  // Analytics scope
  analyticsScope: text('analytics_scope', { 
    enum: ['employee', 'department', 'organization', 'experience'] 
  }).notNull(),
  scopeId: uuid('scope_id').notNull(), // employeeId, departmentId, tenantId, or experienceId
  
  // Time period
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  periodType: text('period_type', { 
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annual'] 
  }).notNull(),
  
  // Engagement metrics
  totalLearningExperiences: integer('total_learning_experiences').default(0),
  activeLearningExperiences: integer('active_learning_experiences').default(0),
  completedLearningExperiences: integer('completed_learning_experiences').default(0),
  abandonedLearningExperiences: integer('abandoned_learning_experiences').default(0),
  
  // Time metrics
  totalTimeSpentMinutes: integer('total_time_spent_minutes').default(0),
  averageSessionDuration: integer('average_session_duration_minutes').default(0),
  totalSessions: integer('total_sessions').default(0),
  
  // Performance metrics
  averageCompletionPercentage: decimal('average_completion_percentage', { precision: 5, scale: 2 }).default('0.00'),
  averageScore: decimal('average_score', { precision: 8, scale: 2 }).default('0.00'),
  totalSkillsAcquired: integer('total_skills_acquired').default(0),
  behaviorChangesObserved: integer('behavior_changes_observed').default(0),
  performanceImprovements: integer('performance_improvements').default(0),
  
  // ROI metrics
  learningROIPercentage: decimal('learning_roi_percentage', { precision: 8, scale: 2 }),
  costPerSkillAcquired: decimal('cost_per_skill_acquired', { precision: 10, scale: 2 }),
  
  // Additional analytics data
  analyticsData: jsonb('analytics_data'), // Flexible storage for additional metrics
  
  // Timestamps
  calculatedAt: timestamp('calculated_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdIndex: index('lxp_analytics_tenant_idx').on(table.tenantId),
  scopeIndex: index('lxp_analytics_scope_idx').on(table.analyticsScope, table.scopeId),
  periodIndex: index('lxp_analytics_period_idx').on(table.periodStart, table.periodEnd),
  typeIndex: index('lxp_analytics_type_idx').on(table.periodType),
}));

// LXP Triggers table - manages integration triggers with other modules
export const lxpTriggersTable = pgTable('lxp_triggers', {
  // Primary identifiers
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  
  // Trigger information
  sourceModule: text('source_module', { 
    enum: ['skills', 'performance', 'talent', 'culture'] 
  }).notNull(),
  targetModule: text('target_module', { 
    enum: ['skills', 'performance', 'talent', 'culture'] 
  }).notNull(),
  triggerType: text('trigger_type').notNull(),
  
  // Related records
  learningExperienceId: uuid('learning_experience_id'),
  employeeId: uuid('employee_id'),
  
  // Trigger data
  triggerData: jsonb('trigger_data').notNull(),
  
  // Processing status
  status: text('status', { 
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'] 
  }).default('pending').notNull(),
  processedAt: timestamp('processed_at'),
  processingNotes: text('processing_notes'),
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdIndex: index('lxp_triggers_tenant_idx').on(table.tenantId),
  statusIndex: index('lxp_triggers_status_idx').on(table.status),
  sourceTargetIndex: index('lxp_triggers_modules_idx').on(table.sourceModule, table.targetModule),
  employeeIndex: index('lxp_triggers_employee_idx').on(table.employeeId),
}));

// Define relationships between tables
export const lxpWorkflowRelations = relations(lxpWorkflowTable, ({ many }) => ({
  levels: many(learningLevelsTable),
  progressEvents: many(learningProgressEventsTable),
  skillsAcquired: many(lxpSkillsAcquiredTable),
  behaviorChanges: many(lxpBehaviorChangesTable),
  performanceImpacts: many(lxpPerformanceImpactTable),
}));

export const learningLevelsRelations = relations(learningLevelsTable, ({ one, many }) => ({
  workflow: one(lxpWorkflowTable, {
    fields: [learningLevelsTable.learningExperienceId],
    references: [lxpWorkflowTable.learningExperienceId],
  }),
  progressEvents: many(learningProgressEventsTable),
}));

export const learningProgressEventsRelations = relations(learningProgressEventsTable, ({ one }) => ({
  workflow: one(lxpWorkflowTable, {
    fields: [learningProgressEventsTable.learningExperienceId],
    references: [lxpWorkflowTable.learningExperienceId],
  }),
  level: one(learningLevelsTable, {
    fields: [learningProgressEventsTable.levelId],
    references: [learningLevelsTable.id],
  }),
}));

export const lxpSkillsAcquiredRelations = relations(lxpSkillsAcquiredTable, ({ one }) => ({
  workflow: one(lxpWorkflowTable, {
    fields: [lxpSkillsAcquiredTable.learningExperienceId],
    references: [lxpWorkflowTable.learningExperienceId],
  }),
}));

export const lxpBehaviorChangesRelations = relations(lxpBehaviorChangesTable, ({ one }) => ({
  workflow: one(lxpWorkflowTable, {
    fields: [lxpBehaviorChangesTable.learningExperienceId],
    references: [lxpWorkflowTable.learningExperienceId],
  }),
}));

export const lxpPerformanceImpactRelations = relations(lxpPerformanceImpactTable, ({ one }) => ({
  workflow: one(lxpWorkflowTable, {
    fields: [lxpPerformanceImpactTable.learningExperienceId],
    references: [lxpWorkflowTable.learningExperienceId],
  }),
}));

// All tables are already exported at their declaration points above