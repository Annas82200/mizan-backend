/**
 * Performance Management Database Schema
 * 
 * Comprehensive database schema for the Performance Management module
 * including performance goals, reviews, metrics, feedback, improvement plans,
 * and analytics tables with proper relationships and constraints.
 */

import { pgTable, uuid, text, timestamp, decimal, jsonb, boolean, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// ENUMS
// ============================================================================

export const performanceGoalTypeEnum = pgEnum('performance_goal_type', [
  'individual',
  'team', 
  'organizational'
]);

export const performanceGoalCategoryEnum = pgEnum('performance_goal_category', [
  'revenue',
  'productivity',
  'quality',
  'learning',
  'leadership',
  'innovation',
  'customer_satisfaction',
  'operational_excellence'
]);

export const performanceGoalFormatEnum = pgEnum('performance_goal_format', [
  'okr',      // Objectives and Key Results
  'smart',    // Specific, Measurable, Achievable, Relevant, Time-bound
  'kpi',      // Key Performance Indicators
  'mbo'       // Management by Objectives
]);

export const performanceGoalStatusEnum = pgEnum('performance_goal_status', [
  'draft',
  'active',
  'completed',
  'abandoned',
  'on_hold',
  'overdue'
]);

export const performanceReviewTypeEnum = pgEnum('performance_review_type', [
  'annual',
  'quarterly',
  'monthly',
  'project_based',
  'probation',
  'promotion',
  '360_degree'
]);

export const performanceReviewStatusEnum = pgEnum('performance_review_status', [
  'draft',
  'in_progress',
  'completed',
  'cancelled',
  'requires_approval'
]);

export const performanceMetricTypeEnum = pgEnum('performance_metric_type', [
  'quantitative',
  'qualitative',
  'behavioral',
  'competency',
  'skill_based',
  'objective_based'
]);

export const performanceFeedbackTypeEnum = pgEnum('performance_feedback_type', [
  'manager_feedback',
  'peer_feedback',
  'self_assessment',
  '360_feedback',
  'customer_feedback',
  'stakeholder_feedback'
]);

export const performanceImprovementStatusEnum = pgEnum('performance_improvement_status', [
  'draft',
  'active',
  'completed',
  'cancelled',
  'escalated'
]);

export const performanceCycleStatusEnum = pgEnum('performance_cycle_status', [
  'upcoming',
  'active',
  'completed',
  'cancelled'
]);

export const oneOnOneStatusEnum = pgEnum('one_on_one_status', [
  'scheduled',
  'completed',
  'cancelled',
  'rescheduled',
  'no_show'
]);

// ============================================================================
// PERFORMANCE GOALS TABLE
// ============================================================================

export const performanceGoals = pgTable('performance_goals', {
  // Primary identification
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  employeeId: uuid('employee_id').notNull(),
  managerId: uuid('manager_id').notNull(),
  
  // Goal details
  title: text('title').notNull(),
  description: text('description'),
  type: performanceGoalTypeEnum('type').notNull().default('individual'),
  category: performanceGoalCategoryEnum('category').notNull(),
  goalFormat: performanceGoalFormatEnum('goal_format').notNull().default('smart'),
  
  // Goal metrics and targets
  target: jsonb('target').notNull(), // Target metrics and values
  current: jsonb('current').default({}), // Current progress metrics
  baseline: jsonb('baseline').default({}), // Baseline metrics for comparison
  
  // Goal importance and timeline
  weight: decimal('weight', { precision: 3, scale: 2 }).notNull().default('1.00'), // 0.00 to 1.00
  priority: integer('priority').notNull().default(1), // 1 = highest priority
  status: performanceGoalStatusEnum('status').notNull().default('draft'),
  
  // Timeline
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  targetDate: timestamp('target_date', { withTimezone: true }).notNull(),
  actualCompletionDate: timestamp('actual_completion_date', { withTimezone: true }),
  
  // Progress tracking
  progressPercentage: decimal('progress_percentage', { precision: 5, scale: 2 }).default('0.00'),
  lastUpdated: timestamp('last_updated', { withTimezone: true }).defaultNow(),
  
  // Goal alignment and dependencies
  parentGoalId: uuid('parent_goal_id'), // For cascading goals
  alignedGoals: jsonb('aligned_goals').default([]), // Array of aligned goal IDs
  dependencies: jsonb('dependencies').default([]), // Array of dependent goal IDs
  
  // Review and approval
  requiresApproval: boolean('requires_approval').default(false),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  
  // Metadata
  tags: jsonb('tags').default([]), // Array of tags for categorization
  metadata: jsonb('metadata').default({}), // Structured data: milestones, context, etc
  notes: text('notes'),
  attachments: jsonb('attachments').default([]), // Array of file attachments
  
  // Audit fields
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by').notNull(),
  updatedBy: uuid('updated_by').notNull()
});

// ============================================================================
// PERFORMANCE REVIEWS TABLE
// ============================================================================

export const performanceReviews = pgTable('performance_reviews', {
  // Primary identification
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  employeeId: uuid('employee_id').notNull(),
  reviewerId: uuid('reviewer_id').notNull(), // Manager or reviewer
  reviewPeriodId: uuid('review_period_id'), // Link to review period
  
  // Review details
  title: text('title').notNull(),
  description: text('description'),
  type: performanceReviewTypeEnum('type').notNull().default('annual'),
  status: performanceReviewStatusEnum('status').notNull().default('draft'),
  
  // Review timeline
  reviewStartDate: timestamp('review_start_date', { withTimezone: true }).notNull(),
  reviewEndDate: timestamp('review_end_date', { withTimezone: true }).notNull(),
  dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  
  // Review content
  goals: jsonb('goals').default([]), // Goals being reviewed
  achievements: jsonb('achievements').default([]), // Key achievements
  challenges: jsonb('challenges').default([]), // Challenges faced
  developmentAreas: jsonb('development_areas').default([]), // Areas for development
  
  // Ratings and scores
  overallRating: decimal('overall_rating', { precision: 3, scale: 2 }), // 1.00 to 5.00
  goalAchievementScore: decimal('goal_achievement_score', { precision: 3, scale: 2 }),
  competencyScore: decimal('competency_score', { precision: 3, scale: 2 }),
  behaviorScore: decimal('behavior_score', { precision: 3, scale: 2 }),
  
  // Feedback and comments
  managerComments: text('manager_comments'),
  employeeComments: text('employee_comments'),
  strengths: jsonb('strengths').default([]),
  improvementAreas: jsonb('improvement_areas').default([]),
  
  // Next steps and development
  nextPeriodGoals: jsonb('next_period_goals').default([]),
  developmentPlan: jsonb('development_plan').default({}),
  trainingRecommendations: jsonb('training_recommendations').default([]),
  
  // Review process
  is360Review: boolean('is_360_review').default(false),
  peerReviewers: jsonb('peer_reviewers').default([]), // Array of peer reviewer IDs
  stakeholderReviewers: jsonb('stakeholder_reviewers').default([]), // Array of stakeholder IDs
  
  // Approval workflow
  requiresApproval: boolean('requires_approval').default(false),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  
  // Metadata
  tags: jsonb('tags').default([]),
  notes: text('notes'),
  attachments: jsonb('attachments').default([]),
  
  // Audit fields
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by').notNull(),
  updatedBy: uuid('updated_by').notNull()
});

// ============================================================================
// PERFORMANCE METRICS TABLE
// ============================================================================

export const performanceMetrics = pgTable('performance_metrics', {
  // Primary identification
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  employeeId: uuid('employee_id').notNull(),
  goalId: uuid('goal_id'), // Optional link to specific goal
  reviewId: uuid('review_id'), // Optional link to specific review
  
  // Metric details
  name: text('name').notNull(),
  description: text('description'),
  type: performanceMetricTypeEnum('type').notNull().default('quantitative'),
  category: text('category').notNull(), // e.g., 'productivity', 'quality', 'leadership'
  
  // Metric values
  targetValue: decimal('target_value', { precision: 10, scale: 2 }),
  actualValue: decimal('actual_value', { precision: 10, scale: 2 }),
  baselineValue: decimal('baseline_value', { precision: 10, scale: 2 }),
  unit: text('unit'), // e.g., 'hours', 'percentage', 'count'
  
  // Metric calculation
  formula: text('formula'), // Calculation formula if applicable
  dataSource: text('data_source'), // Source of the metric data
  frequency: text('frequency').default('monthly'), // How often metric is measured
  
  // Performance indicators
  isKPI: boolean('is_kpi').default(false), // Is this a Key Performance Indicator
  isCritical: boolean('is_critical').default(false), // Is this a critical metric
  weight: decimal('weight', { precision: 3, scale: 2 }).default('1.00'),
  
  // Measurement period
  measurementStartDate: timestamp('measurement_start_date', { withTimezone: true }).notNull(),
  measurementEndDate: timestamp('measurement_end_date', { withTimezone: true }).notNull(),
  lastMeasuredAt: timestamp('last_measured_at', { withTimezone: true }),
  
  // Trend analysis
  trend: text('trend'), // 'improving', 'declining', 'stable'
  variance: decimal('variance', { precision: 10, scale: 2 }), // Variance from target
  variancePercentage: decimal('variance_percentage', { precision: 5, scale: 2 }),
  
  // Metadata
  tags: jsonb('tags').default([]),
  notes: text('notes'),
  
  // Audit fields
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by').notNull(),
  updatedBy: uuid('updated_by').notNull()
});

// ============================================================================
// PERFORMANCE FEEDBACK TABLE
// ============================================================================

export const performanceFeedback = pgTable('performance_feedback', {
  // Primary identification
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  employeeId: uuid('employee_id').notNull(), // Employee receiving feedback
  reviewerId: uuid('reviewer_id').notNull(), // Person giving feedback
  reviewId: uuid('review_id'), // Optional link to performance review
  
  // Feedback details
  type: performanceFeedbackTypeEnum('type').notNull().default('manager_feedback'),
  title: text('title').notNull(),
  description: text('description').notNull(),
  
  // Feedback content
  strengths: jsonb('strengths').default([]), // Array of strengths
  improvementAreas: jsonb('improvement_areas').default([]), // Areas for improvement
  specificExamples: jsonb('specific_examples').default([]), // Specific examples and situations
  
  // Ratings and scores
  overallRating: decimal('overall_rating', { precision: 3, scale: 2 }), // 1.00 to 5.00
  competencyRatings: jsonb('competency_ratings').default({}), // Ratings by competency
  behaviorRatings: jsonb('behavior_ratings').default({}), // Ratings by behavior
  
  // Feedback categories
  categories: jsonb('categories').default([]), // Feedback categories (e.g., communication, leadership)
  isAnonymous: boolean('is_anonymous').default(false),
  isConfidential: boolean('is_confidential').default(false),
  
  // Feedback period
  feedbackPeriodStart: timestamp('feedback_period_start', { withTimezone: true }).notNull(),
  feedbackPeriodEnd: timestamp('feedback_period_end', { withTimezone: true }).notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow(),
  
  // Follow-up and action items
  actionItems: jsonb('action_items').default([]), // Action items from feedback
  followUpRequired: boolean('follow_up_required').default(false),
  followUpDate: timestamp('follow_up_date', { withTimezone: true }),
  
  // Approval and visibility
  isApproved: boolean('is_approved').default(false),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  isVisibleToEmployee: boolean('is_visible_to_employee').default(true),
  
  // Metadata
  tags: jsonb('tags').default([]),
  notes: text('notes'),
  attachments: jsonb('attachments').default([]),
  
  // Audit fields
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by').notNull(),
  updatedBy: uuid('updated_by').notNull()
});

// ============================================================================
// PERFORMANCE IMPROVEMENT PLANS TABLE
// ============================================================================

export const performanceImprovementPlans = pgTable('performance_improvement_plans', {
  // Primary identification
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  employeeId: uuid('employee_id').notNull(),
  managerId: uuid('manager_id').notNull(),
  reviewId: uuid('review_id'), // Optional link to performance review
  
  // Plan details
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: performanceImprovementStatusEnum('status').notNull().default('draft'),
  
  // Performance issues
  performanceIssues: jsonb('performance_issues').notNull(), // Array of performance issues
  rootCauses: jsonb('root_causes').default([]), // Root cause analysis
  impactAssessment: jsonb('impact_assessment').default({}), // Impact of performance issues
  
  // Improvement objectives
  objectives: jsonb('objectives').notNull(), // Array of improvement objectives
  successCriteria: jsonb('success_criteria').notNull(), // Success criteria for improvement
  targetTimeline: integer('target_timeline').notNull(), // Target timeline in days
  
  // Action plan
  actionItems: jsonb('action_items').notNull(), // Array of action items
  resources: jsonb('resources').default([]), // Resources needed for improvement
  support: jsonb('support').default([]), // Support and assistance provided
  
  // Progress tracking
  progressPercentage: decimal('progress_percentage', { precision: 5, scale: 2 }).default('0.00'),
  milestones: jsonb('milestones').default([]), // Key milestones and checkpoints
  lastReviewDate: timestamp('last_review_date', { withTimezone: true }),
  nextReviewDate: timestamp('next_review_date', { withTimezone: true }),
  
  // Timeline
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  targetCompletionDate: timestamp('target_completion_date', { withTimezone: true }).notNull(),
  actualCompletionDate: timestamp('actual_completion_date', { withTimezone: true }),
  
  // Outcomes
  outcomes: jsonb('outcomes').default([]), // Improvement outcomes achieved
  lessonsLearned: jsonb('lessons_learned').default([]), // Lessons learned from the process
  recommendations: jsonb('recommendations').default([]), // Future recommendations
  
  // Escalation
  isEscalated: boolean('is_escalated').default(false),
  escalatedTo: uuid('escalated_to'),
  escalatedAt: timestamp('escalated_at', { withTimezone: true }),
  escalationReason: text('escalation_reason'),
  
  // Approval workflow
  requiresApproval: boolean('requires_approval').default(false),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  
  // Metadata
  tags: jsonb('tags').default([]),
  metadata: jsonb('metadata').default({}), // Structured data: coaching context, analysis, etc
  notes: text('notes'),
  attachments: jsonb('attachments').default([]),
  
  // Audit fields
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by').notNull(),
  updatedBy: uuid('updated_by').notNull()
});

// ============================================================================
// PERFORMANCE ANALYTICS TABLE
// ============================================================================

export const performanceAnalytics = pgTable('performance_analytics', {
  // Primary identification
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  employeeId: uuid('employee_id').notNull(),
  
  // Analytics period
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
  periodType: text('period_type').notNull(), // 'monthly', 'quarterly', 'annual'
  
  // Performance summary
  overallScore: decimal('overall_score', { precision: 3, scale: 2 }),
  goalAchievementRate: decimal('goal_achievement_rate', { precision: 5, scale: 2 }),
  competencyScore: decimal('competency_score', { precision: 3, scale: 2 }),
  behaviorScore: decimal('behavior_score', { precision: 3, scale: 2 }),
  
  // Goal analytics
  totalGoals: integer('total_goals').default(0),
  completedGoals: integer('completed_goals').default(0),
  overdueGoals: integer('overdue_goals').default(0),
  averageGoalProgress: decimal('average_goal_progress', { precision: 5, scale: 2 }),
  
  // Review analytics
  totalReviews: integer('total_reviews').default(0),
  averageReviewRating: decimal('average_review_rating', { precision: 3, scale: 2 }),
  reviewCompletionRate: decimal('review_completion_rate', { precision: 5, scale: 2 }),
  
  // Feedback analytics
  totalFeedback: integer('total_feedback').default(0),
  averageFeedbackRating: decimal('average_feedback_rating', { precision: 3, scale: 2 }),
  feedbackResponseRate: decimal('feedback_response_rate', { precision: 5, scale: 2 }),
  
  // Improvement analytics
  improvementPlans: integer('improvement_plans').default(0),
  completedImprovementPlans: integer('completed_improvement_plans').default(0),
  improvementSuccessRate: decimal('improvement_success_rate', { precision: 5, scale: 2 }),
  
  // Trend analysis
  performanceTrend: text('performance_trend'), // 'improving', 'declining', 'stable'
  goalTrend: text('goal_trend'),
  competencyTrend: text('competency_trend'),
  behaviorTrend: text('behavior_trend'),
  
  // Comparative analytics
  percentileRank: decimal('percentile_rank', { precision: 5, scale: 2 }), // Rank within organization
  departmentRank: integer('department_rank'),
  teamRank: integer('team_rank'),
  
  // Risk indicators
  performanceRisk: text('performance_risk'), // 'low', 'medium', 'high'
  retentionRisk: text('retention_risk'),
  developmentNeeds: jsonb('development_needs').default([]),
  
  // Predictive analytics
  predictedPerformance: decimal('predicted_performance', { precision: 3, scale: 2 }),
  predictedRetention: decimal('predicted_retention', { precision: 3, scale: 2 }),
  predictedPromotion: decimal('predicted_promotion', { precision: 3, scale: 2 }),
  
  // Metadata
  tags: jsonb('tags').default([]),
  notes: text('notes'),
  
  // Audit fields
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by').notNull(),
  updatedBy: uuid('updated_by').notNull()
});

// ============================================================================
// PERFORMANCE CYCLES TABLE
// ============================================================================

export const performanceCycles = pgTable('performance_cycles', {
  // Primary identification
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),

  // Cycle details
  name: text('name').notNull(),
  description: text('description'),
  cycleType: text('cycle_type').notNull().default('quarterly'), // 'quarterly', 'annual', 'monthly', 'custom'
  fiscalYear: integer('fiscal_year').notNull(),
  quarter: integer('quarter'), // 1-4 for quarterly cycles

  // Timeline
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),
  reviewDueDate: timestamp('review_due_date', { withTimezone: true }),

  // Status and configuration
  status: performanceCycleStatusEnum('status').notNull().default('upcoming'),
  isDefault: boolean('is_default').default(false), // Is this the default cycle template
  isActive: boolean('is_active').default(false), // Is this cycle currently active

  // Cycle objectives
  objectives: jsonb('objectives').default([]), // Company/org objectives for this cycle
  priorities: jsonb('priorities').default([]), // Strategic priorities from culture agent
  skillsNeeded: jsonb('skills_needed').default([]), // Skills needed from LXP
  cultureFocus: jsonb('culture_focus').default([]), // Culture priorities to shape/sustain

  // Strategy alignment
  strategyAlignment: jsonb('strategy_alignment').default({}), // Link to company strategy
  departmentGoals: jsonb('department_goals').default([]), // Department-level goals

  // Cycle settings
  settings: jsonb('settings').default({}), // Configurable settings (review frequency, etc.)
  reviewTemplate: jsonb('review_template').default({}), // Review template for this cycle
  goalSettings: jsonb('goal_settings').default({}), // Goal-setting configuration

  // Participation
  includedDepartments: jsonb('included_departments').default([]), // Departments included
  includedRoles: jsonb('included_roles').default([]), // Roles included
  excludedEmployees: jsonb('excluded_employees').default([]), // Excluded employee IDs

  // Progress tracking
  totalParticipants: integer('total_participants').default(0),
  completedReviews: integer('completed_reviews').default(0),
  completionRate: decimal('completion_rate', { precision: 5, scale: 2 }).default('0.00'),

  // Admin and configuration
  configuredBy: uuid('configured_by'), // Admin who configured this cycle
  configuredAt: timestamp('configured_at', { withTimezone: true }),

  // Metadata
  tags: jsonb('tags').default([]),
  notes: text('notes'),

  // Audit fields
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by').notNull(),
  updatedBy: uuid('updated_by').notNull()
});

// ============================================================================
// ONE-ON-ONE MEETINGS TABLE
// ============================================================================

export const oneOnOneMeetings = pgTable('one_on_one_meetings', {
  // Primary identification
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  employeeId: uuid('employee_id').notNull(),
  managerId: uuid('manager_id').notNull(),
  performanceCycleId: uuid('performance_cycle_id'), // Link to performance cycle

  // Meeting details
  title: text('title').notNull(),
  description: text('description'),
  meetingType: text('meeting_type').notNull().default('regular'), // 'regular', 'quarterly_evaluation', 'goal_setting', 'check_in'

  // Scheduling
  scheduledDate: timestamp('scheduled_date', { withTimezone: true }).notNull(),
  scheduledEndDate: timestamp('scheduled_end_date', { withTimezone: true }),
  duration: integer('duration').notNull().default(30), // Duration in minutes
  location: text('location'), // Physical location or meeting link
  meetingLink: text('meeting_link'), // Video conference link

  // Status
  status: oneOnOneStatusEnum('status').notNull().default('scheduled'),
  actualStartTime: timestamp('actual_start_time', { withTimezone: true }),
  actualEndTime: timestamp('actual_end_time', { withTimezone: true }),

  // BOT assistance
  botAssisted: boolean('bot_assisted').default(true),
  botSessionId: text('bot_session_id'), // BOT conversation session ID

  // Pre-meeting preparation
  employeePreparationNotes: text('employee_preparation_notes'),
  managerPreparationNotes: text('manager_preparation_notes'),
  employeePrepared: boolean('employee_prepared').default(false),
  managerPrepared: boolean('manager_prepared').default(false),

  // Meeting agenda
  agenda: jsonb('agenda').default([]), // Array of agenda items
  suggestedTopics: jsonb('suggested_topics').default([]), // BOT-suggested topics
  employeeTopics: jsonb('employee_topics').default([]), // Topics from employee
  managerTopics: jsonb('manager_topics').default([]), // Topics from manager

  // Meeting notes and outcomes
  meetingNotes: text('meeting_notes'),
  employeeNotes: text('employee_notes'),
  managerNotes: text('manager_notes'),
  keyDiscussionPoints: jsonb('key_discussion_points').default([]),

  // Action items and follow-up
  actionItems: jsonb('action_items').default([]), // Action items from meeting
  employeeActionItems: jsonb('employee_action_items').default([]),
  managerActionItems: jsonb('manager_action_items').default([]),
  decisions: jsonb('decisions').default([]), // Decisions made

  // Performance and feedback
  performanceDiscussed: boolean('performance_discussed').default(false),
  goalsDiscussed: jsonb('goals_discussed').default([]), // Goals discussed in meeting
  feedbackGiven: jsonb('feedback_given').default([]), // Feedback exchanged
  challengesDiscussed: jsonb('challenges_discussed').default([]),
  supportNeeded: jsonb('support_needed').default([]),

  // Meeting outcomes
  meetingOutcome: text('meeting_outcome'), // Overall outcome/summary
  employeeSatisfaction: integer('employee_satisfaction'), // 1-5 rating
  managerSatisfaction: integer('manager_satisfaction'), // 1-5 rating
  effectivenessScore: decimal('effectiveness_score', { precision: 3, scale: 2 }), // Meeting effectiveness

  // Integration outputs
  feedbackToEngagement: jsonb('feedback_to_engagement').default({}), // Data to feed engagement agent
  feedbackToRecognition: jsonb('feedback_to_recognition').default({}), // Data to feed recognition agent
  developmentNeeds: jsonb('development_needs').default([]), // Training/development needs identified
  wellbeingIndicators: jsonb('wellbeing_indicators').default({}), // Employee wellbeing signals

  // Follow-up
  requiresFollowUp: boolean('requires_follow_up').default(false),
  followUpDate: timestamp('follow_up_date', { withTimezone: true }),
  followUpCompleted: boolean('follow_up_completed').default(false),
  nextMeetingScheduled: boolean('next_meeting_scheduled').default(false),
  nextMeetingId: uuid('next_meeting_id'), // Link to next scheduled meeting

  // Privacy and confidentiality
  isConfidential: boolean('is_confidential').default(false),
  sharedWithHR: boolean('shared_with_hr').default(false),

  // Metadata
  tags: jsonb('tags').default([]),
  attachments: jsonb('attachments').default([]),

  // Audit fields
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid('created_by').notNull(),
  updatedBy: uuid('updated_by').notNull()
});

// ============================================================================
// TABLE RELATIONS
// ============================================================================

// Performance Goals Relations
export const performanceGoalsRelations = relations(performanceGoals, ({ one, many }) => ({
  // Self-referencing relation for parent goals
  parentGoal: one(performanceGoals, {
    fields: [performanceGoals.parentGoalId],
    references: [performanceGoals.id]
  }),
  childGoals: many(performanceGoals),
  
  // Relations to other tables
  metrics: many(performanceMetrics),
  reviews: many(performanceReviews)
}));

// Performance Reviews Relations
export const performanceReviewsRelations = relations(performanceReviews, ({ one, many }) => ({
  goals: many(performanceGoals),
  metrics: many(performanceMetrics),
  feedback: many(performanceFeedback),
  improvementPlans: many(performanceImprovementPlans)
}));

// Performance Metrics Relations
export const performanceMetricsRelations = relations(performanceMetrics, ({ one }) => ({
  goal: one(performanceGoals, {
    fields: [performanceMetrics.goalId],
    references: [performanceGoals.id]
  }),
  review: one(performanceReviews, {
    fields: [performanceMetrics.reviewId],
    references: [performanceReviews.id]
  })
}));

// Performance Feedback Relations
export const performanceFeedbackRelations = relations(performanceFeedback, ({ one }) => ({
  review: one(performanceReviews, {
    fields: [performanceFeedback.reviewId],
    references: [performanceReviews.id]
  })
}));

// Performance Improvement Plans Relations
export const performanceImprovementPlansRelations = relations(performanceImprovementPlans, ({ one }) => ({
  review: one(performanceReviews, {
    fields: [performanceImprovementPlans.reviewId],
    references: [performanceReviews.id]
  })
}));

// Performance Analytics Relations
export const performanceAnalyticsRelations = relations(performanceAnalytics, ({ one }) => ({
  // Analytics are aggregated data, so no direct relations to other tables
}));

// Performance Cycles Relations
export const performanceCyclesRelations = relations(performanceCycles, ({ many }) => ({
  goals: many(performanceGoals),
  reviews: many(performanceReviews),
  oneOnOneMeetings: many(oneOnOneMeetings)
}));

// One-on-One Meetings Relations
export const oneOnOneMeetingsRelations = relations(oneOnOneMeetings, ({ one }) => ({
  performanceCycle: one(performanceCycles, {
    fields: [oneOnOneMeetings.performanceCycleId],
    references: [performanceCycles.id]
  }),
  nextMeeting: one(oneOnOneMeetings, {
    fields: [oneOnOneMeetings.nextMeetingId],
    references: [oneOnOneMeetings.id]
  })
}));

// ============================================================================
// TALENT & PERFORMANCE MANAGEMENT
// ============================================================================

export const talentProfiles = pgTable('talent_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  employeeId: text('employee_id').notNull(),
  profileData: jsonb('profile_data'), // Detailed talent profile info
  strengths: jsonb('strengths'), // Array of strengths
  developmentAreas: jsonb('development_areas'), // Areas for growth
  careerAspirations: text('career_aspirations'),
  potentialRating: text('potential_rating'), // high, medium, low
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// EXPORTS
// ============================================================================
// Note: Tables are already exported with 'export const' declarations above
// No additional export block needed
