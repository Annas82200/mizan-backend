"use strict";
/**
 * Performance Management Database Schema
 *
 * Comprehensive database schema for the Performance Management module
 * including performance goals, reviews, metrics, feedback, improvement plans,
 * and analytics tables with proper relationships and constraints.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceRecommendationsRelations = exports.keyResultsRelations = exports.okrsRelations = exports.kpisRelations = exports.performanceRecommendations = exports.keyResults = exports.okrs = exports.kpis = exports.talentProfiles = exports.oneOnOneMeetingsRelations = exports.performanceCalibrationsRelations = exports.performanceEvaluationsRelations = exports.performanceCyclesRelations = exports.performanceAnalyticsRelations = exports.performanceImprovementPlansRelations = exports.performanceFeedbackRelations = exports.performanceMetricsRelations = exports.performanceReviewsRelations = exports.performanceGoalsRelations = exports.performanceCalibrations = exports.performanceEvaluations = exports.oneOnOneMeetings = exports.performanceCycles = exports.performanceAnalytics = exports.performanceImprovementPlans = exports.performanceFeedback = exports.performanceMetrics = exports.performanceReviews = exports.performanceGoals = exports.oneOnOneStatusEnum = exports.performanceCycleStatusEnum = exports.performanceImprovementStatusEnum = exports.performanceFeedbackTypeEnum = exports.performanceMetricTypeEnum = exports.performanceReviewStatusEnum = exports.performanceReviewTypeEnum = exports.performanceGoalStatusEnum = exports.performanceGoalFormatEnum = exports.performanceGoalCategoryEnum = exports.performanceGoalTypeEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const core_1 = require("./core");
// ============================================================================
// ENUMS
// ============================================================================
exports.performanceGoalTypeEnum = (0, pg_core_1.pgEnum)('performance_goal_type', [
    'individual',
    'team',
    'organizational'
]);
exports.performanceGoalCategoryEnum = (0, pg_core_1.pgEnum)('performance_goal_category', [
    'revenue',
    'productivity',
    'quality',
    'learning',
    'leadership',
    'innovation',
    'customer_satisfaction',
    'operational_excellence'
]);
exports.performanceGoalFormatEnum = (0, pg_core_1.pgEnum)('performance_goal_format', [
    'okr', // Objectives and Key Results
    'smart', // Specific, Measurable, Achievable, Relevant, Time-bound
    'kpi', // Key Performance Indicators
    'mbo' // Management by Objectives
]);
exports.performanceGoalStatusEnum = (0, pg_core_1.pgEnum)('performance_goal_status', [
    'draft',
    'active',
    'completed',
    'abandoned',
    'on_hold',
    'overdue'
]);
exports.performanceReviewTypeEnum = (0, pg_core_1.pgEnum)('performance_review_type', [
    'annual',
    'quarterly',
    'monthly',
    'project_based',
    'probation',
    'promotion',
    '360_degree'
]);
exports.performanceReviewStatusEnum = (0, pg_core_1.pgEnum)('performance_review_status', [
    'draft',
    'in_progress',
    'completed',
    'cancelled',
    'requires_approval'
]);
exports.performanceMetricTypeEnum = (0, pg_core_1.pgEnum)('performance_metric_type', [
    'quantitative',
    'qualitative',
    'behavioral',
    'competency',
    'skill_based',
    'objective_based'
]);
exports.performanceFeedbackTypeEnum = (0, pg_core_1.pgEnum)('performance_feedback_type', [
    'manager_feedback',
    'peer_feedback',
    'self_assessment',
    '360_feedback',
    'customer_feedback',
    'stakeholder_feedback'
]);
exports.performanceImprovementStatusEnum = (0, pg_core_1.pgEnum)('performance_improvement_status', [
    'draft',
    'active',
    'completed',
    'cancelled',
    'escalated'
]);
exports.performanceCycleStatusEnum = (0, pg_core_1.pgEnum)('performance_cycle_status', [
    'upcoming',
    'active',
    'completed',
    'cancelled'
]);
exports.oneOnOneStatusEnum = (0, pg_core_1.pgEnum)('one_on_one_status', [
    'scheduled',
    'completed',
    'cancelled',
    'rescheduled',
    'no_show'
]);
// ============================================================================
// PERFORMANCE GOALS TABLE
// ============================================================================
exports.performanceGoals = (0, pg_core_1.pgTable)('performance_goals', {
    // Primary identification
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    employeeId: (0, pg_core_1.uuid)('employee_id').notNull(),
    managerId: (0, pg_core_1.uuid)('manager_id').notNull(),
    // Goal details
    title: (0, pg_core_1.text)('title').notNull(),
    description: (0, pg_core_1.text)('description'),
    type: (0, exports.performanceGoalTypeEnum)('type').notNull().default('individual'),
    category: (0, exports.performanceGoalCategoryEnum)('category').notNull(),
    goalFormat: (0, exports.performanceGoalFormatEnum)('goal_format').notNull().default('smart'),
    // Goal metrics and targets
    target: (0, pg_core_1.jsonb)('target').notNull(), // Target metrics and values
    current: (0, pg_core_1.jsonb)('current').default({}), // Current progress metrics
    baseline: (0, pg_core_1.jsonb)('baseline').default({}), // Baseline metrics for comparison
    // Goal importance and timeline
    weight: (0, pg_core_1.decimal)('weight', { precision: 3, scale: 2 }).notNull().default('1.00'), // 0.00 to 1.00
    priority: (0, pg_core_1.integer)('priority').notNull().default(1), // 1 = highest priority
    status: (0, exports.performanceGoalStatusEnum)('status').notNull().default('draft'),
    // Timeline
    startDate: (0, pg_core_1.timestamp)('start_date', { withTimezone: true }).notNull(),
    targetDate: (0, pg_core_1.timestamp)('target_date', { withTimezone: true }).notNull(),
    actualCompletionDate: (0, pg_core_1.timestamp)('actual_completion_date', { withTimezone: true }),
    // Progress tracking
    progressPercentage: (0, pg_core_1.decimal)('progress_percentage', { precision: 5, scale: 2 }).default('0.00'),
    lastUpdated: (0, pg_core_1.timestamp)('last_updated', { withTimezone: true }).defaultNow(),
    // Goal alignment and dependencies
    parentGoalId: (0, pg_core_1.uuid)('parent_goal_id'), // For cascading goals
    alignedGoals: (0, pg_core_1.jsonb)('aligned_goals').default([]), // Array of aligned goal IDs
    dependencies: (0, pg_core_1.jsonb)('dependencies').default([]), // Array of dependent goal IDs
    // Review and approval
    requiresApproval: (0, pg_core_1.boolean)('requires_approval').default(false),
    approvedBy: (0, pg_core_1.uuid)('approved_by'),
    approvedAt: (0, pg_core_1.timestamp)('approved_at', { withTimezone: true }),
    // Metadata
    tags: (0, pg_core_1.jsonb)('tags').default([]), // Array of tags for categorization
    metadata: (0, pg_core_1.jsonb)('metadata').default({}), // Structured data: milestones, context, etc
    notes: (0, pg_core_1.text)('notes'),
    attachments: (0, pg_core_1.jsonb)('attachments').default([]), // Array of file attachments
    // Audit fields
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: (0, pg_core_1.uuid)('created_by').notNull(),
    updatedBy: (0, pg_core_1.uuid)('updated_by').notNull()
});
// ============================================================================
// PERFORMANCE REVIEWS TABLE
// ============================================================================
exports.performanceReviews = (0, pg_core_1.pgTable)('performance_reviews', {
    // Primary identification
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    employeeId: (0, pg_core_1.uuid)('employee_id').notNull(),
    reviewerId: (0, pg_core_1.uuid)('reviewer_id').notNull(), // Manager or reviewer
    reviewPeriodId: (0, pg_core_1.uuid)('review_period_id'), // Link to review period
    // Review details
    title: (0, pg_core_1.text)('title').notNull(),
    description: (0, pg_core_1.text)('description'),
    type: (0, exports.performanceReviewTypeEnum)('type').notNull().default('annual'),
    status: (0, exports.performanceReviewStatusEnum)('status').notNull().default('draft'),
    // Review timeline
    reviewStartDate: (0, pg_core_1.timestamp)('review_start_date', { withTimezone: true }).notNull(),
    reviewEndDate: (0, pg_core_1.timestamp)('review_end_date', { withTimezone: true }).notNull(),
    dueDate: (0, pg_core_1.timestamp)('due_date', { withTimezone: true }).notNull(),
    completedAt: (0, pg_core_1.timestamp)('completed_at', { withTimezone: true }),
    // Review content
    goals: (0, pg_core_1.jsonb)('goals').default([]), // Goals being reviewed
    achievements: (0, pg_core_1.jsonb)('achievements').default([]), // Key achievements
    challenges: (0, pg_core_1.jsonb)('challenges').default([]), // Challenges faced
    developmentAreas: (0, pg_core_1.jsonb)('development_areas').default([]), // Areas for development
    // Ratings and scores
    overallRating: (0, pg_core_1.decimal)('overall_rating', { precision: 3, scale: 2 }), // 1.00 to 5.00
    goalAchievementScore: (0, pg_core_1.decimal)('goal_achievement_score', { precision: 3, scale: 2 }),
    competencyScore: (0, pg_core_1.decimal)('competency_score', { precision: 3, scale: 2 }),
    behaviorScore: (0, pg_core_1.decimal)('behavior_score', { precision: 3, scale: 2 }),
    // Feedback and comments
    managerComments: (0, pg_core_1.text)('manager_comments'),
    employeeComments: (0, pg_core_1.text)('employee_comments'),
    strengths: (0, pg_core_1.jsonb)('strengths').default([]),
    improvementAreas: (0, pg_core_1.jsonb)('improvement_areas').default([]),
    // Next steps and development
    nextPeriodGoals: (0, pg_core_1.jsonb)('next_period_goals').default([]),
    developmentPlan: (0, pg_core_1.jsonb)('development_plan').default({}),
    trainingRecommendations: (0, pg_core_1.jsonb)('training_recommendations').default([]),
    // Review process
    is360Review: (0, pg_core_1.boolean)('is_360_review').default(false),
    peerReviewers: (0, pg_core_1.jsonb)('peer_reviewers').default([]), // Array of peer reviewer IDs
    stakeholderReviewers: (0, pg_core_1.jsonb)('stakeholder_reviewers').default([]), // Array of stakeholder IDs
    // Approval workflow
    requiresApproval: (0, pg_core_1.boolean)('requires_approval').default(false),
    approvedBy: (0, pg_core_1.uuid)('approved_by'),
    approvedAt: (0, pg_core_1.timestamp)('approved_at', { withTimezone: true }),
    // Metadata
    tags: (0, pg_core_1.jsonb)('tags').default([]),
    notes: (0, pg_core_1.text)('notes'),
    attachments: (0, pg_core_1.jsonb)('attachments').default([]),
    // Audit fields
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: (0, pg_core_1.uuid)('created_by').notNull(),
    updatedBy: (0, pg_core_1.uuid)('updated_by').notNull()
});
// ============================================================================
// PERFORMANCE METRICS TABLE
// ============================================================================
exports.performanceMetrics = (0, pg_core_1.pgTable)('performance_metrics', {
    // Primary identification
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    employeeId: (0, pg_core_1.uuid)('employee_id').notNull(),
    goalId: (0, pg_core_1.uuid)('goal_id'), // Optional link to specific goal
    reviewId: (0, pg_core_1.uuid)('review_id'), // Optional link to specific review
    // Metric details
    name: (0, pg_core_1.text)('name').notNull(),
    description: (0, pg_core_1.text)('description'),
    type: (0, exports.performanceMetricTypeEnum)('type').notNull().default('quantitative'),
    category: (0, pg_core_1.text)('category').notNull(), // e.g., 'productivity', 'quality', 'leadership'
    // Metric values
    targetValue: (0, pg_core_1.decimal)('target_value', { precision: 10, scale: 2 }),
    actualValue: (0, pg_core_1.decimal)('actual_value', { precision: 10, scale: 2 }),
    baselineValue: (0, pg_core_1.decimal)('baseline_value', { precision: 10, scale: 2 }),
    unit: (0, pg_core_1.text)('unit'), // e.g., 'hours', 'percentage', 'count'
    // Metric calculation
    formula: (0, pg_core_1.text)('formula'), // Calculation formula if applicable
    dataSource: (0, pg_core_1.text)('data_source'), // Source of the metric data
    frequency: (0, pg_core_1.text)('frequency').default('monthly'), // How often metric is measured
    // Performance indicators
    isKPI: (0, pg_core_1.boolean)('is_kpi').default(false), // Is this a Key Performance Indicator
    isCritical: (0, pg_core_1.boolean)('is_critical').default(false), // Is this a critical metric
    weight: (0, pg_core_1.decimal)('weight', { precision: 3, scale: 2 }).default('1.00'),
    // Measurement period
    measurementStartDate: (0, pg_core_1.timestamp)('measurement_start_date', { withTimezone: true }).notNull(),
    measurementEndDate: (0, pg_core_1.timestamp)('measurement_end_date', { withTimezone: true }).notNull(),
    lastMeasuredAt: (0, pg_core_1.timestamp)('last_measured_at', { withTimezone: true }),
    // Trend analysis
    trend: (0, pg_core_1.text)('trend'), // 'improving', 'declining', 'stable'
    variance: (0, pg_core_1.decimal)('variance', { precision: 10, scale: 2 }), // Variance from target
    variancePercentage: (0, pg_core_1.decimal)('variance_percentage', { precision: 5, scale: 2 }),
    // Metadata
    tags: (0, pg_core_1.jsonb)('tags').default([]),
    notes: (0, pg_core_1.text)('notes'),
    // Audit fields
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: (0, pg_core_1.uuid)('created_by').notNull(),
    updatedBy: (0, pg_core_1.uuid)('updated_by').notNull()
});
// ============================================================================
// PERFORMANCE FEEDBACK TABLE
// ============================================================================
exports.performanceFeedback = (0, pg_core_1.pgTable)('performance_feedback', {
    // Primary identification
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    employeeId: (0, pg_core_1.uuid)('employee_id').notNull(), // Employee receiving feedback
    reviewerId: (0, pg_core_1.uuid)('reviewer_id').notNull(), // Person giving feedback
    reviewId: (0, pg_core_1.uuid)('review_id'), // Optional link to performance review
    // Feedback details
    type: (0, exports.performanceFeedbackTypeEnum)('type').notNull().default('manager_feedback'),
    title: (0, pg_core_1.text)('title').notNull(),
    description: (0, pg_core_1.text)('description').notNull(),
    // Feedback content
    strengths: (0, pg_core_1.jsonb)('strengths').default([]), // Array of strengths
    improvementAreas: (0, pg_core_1.jsonb)('improvement_areas').default([]), // Areas for improvement
    specificExamples: (0, pg_core_1.jsonb)('specific_examples').default([]), // Specific examples and situations
    // Ratings and scores
    overallRating: (0, pg_core_1.decimal)('overall_rating', { precision: 3, scale: 2 }), // 1.00 to 5.00
    competencyRatings: (0, pg_core_1.jsonb)('competency_ratings').default({}), // Ratings by competency
    behaviorRatings: (0, pg_core_1.jsonb)('behavior_ratings').default({}), // Ratings by behavior
    // Feedback categories
    categories: (0, pg_core_1.jsonb)('categories').default([]), // Feedback categories (e.g., communication, leadership)
    isAnonymous: (0, pg_core_1.boolean)('is_anonymous').default(false),
    isConfidential: (0, pg_core_1.boolean)('is_confidential').default(false),
    // Feedback period
    feedbackPeriodStart: (0, pg_core_1.timestamp)('feedback_period_start', { withTimezone: true }).notNull(),
    feedbackPeriodEnd: (0, pg_core_1.timestamp)('feedback_period_end', { withTimezone: true }).notNull(),
    submittedAt: (0, pg_core_1.timestamp)('submitted_at', { withTimezone: true }).defaultNow(),
    // Follow-up and action items
    actionItems: (0, pg_core_1.jsonb)('action_items').default([]), // Action items from feedback
    followUpRequired: (0, pg_core_1.boolean)('follow_up_required').default(false),
    followUpDate: (0, pg_core_1.timestamp)('follow_up_date', { withTimezone: true }),
    // Approval and visibility
    isApproved: (0, pg_core_1.boolean)('is_approved').default(false),
    approvedBy: (0, pg_core_1.uuid)('approved_by'),
    approvedAt: (0, pg_core_1.timestamp)('approved_at', { withTimezone: true }),
    isVisibleToEmployee: (0, pg_core_1.boolean)('is_visible_to_employee').default(true),
    // Metadata
    tags: (0, pg_core_1.jsonb)('tags').default([]),
    notes: (0, pg_core_1.text)('notes'),
    attachments: (0, pg_core_1.jsonb)('attachments').default([]),
    // Audit fields
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: (0, pg_core_1.uuid)('created_by').notNull(),
    updatedBy: (0, pg_core_1.uuid)('updated_by').notNull()
});
// ============================================================================
// PERFORMANCE IMPROVEMENT PLANS TABLE
// ============================================================================
exports.performanceImprovementPlans = (0, pg_core_1.pgTable)('performance_improvement_plans', {
    // Primary identification
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    employeeId: (0, pg_core_1.uuid)('employee_id').notNull(),
    managerId: (0, pg_core_1.uuid)('manager_id').notNull(),
    reviewId: (0, pg_core_1.uuid)('review_id'), // Optional link to performance review
    // Plan details
    title: (0, pg_core_1.text)('title').notNull(),
    description: (0, pg_core_1.text)('description').notNull(),
    status: (0, exports.performanceImprovementStatusEnum)('status').notNull().default('draft'),
    // Performance issues
    performanceIssues: (0, pg_core_1.jsonb)('performance_issues').notNull(), // Array of performance issues
    rootCauses: (0, pg_core_1.jsonb)('root_causes').default([]), // Root cause analysis
    impactAssessment: (0, pg_core_1.jsonb)('impact_assessment').default({}), // Impact of performance issues
    // Improvement objectives
    objectives: (0, pg_core_1.jsonb)('objectives').notNull(), // Array of improvement objectives
    successCriteria: (0, pg_core_1.jsonb)('success_criteria').notNull(), // Success criteria for improvement
    targetTimeline: (0, pg_core_1.integer)('target_timeline').notNull(), // Target timeline in days
    // Action plan
    actionItems: (0, pg_core_1.jsonb)('action_items').notNull(), // Array of action items
    resources: (0, pg_core_1.jsonb)('resources').default([]), // Resources needed for improvement
    support: (0, pg_core_1.jsonb)('support').default([]), // Support and assistance provided
    // Progress tracking
    progressPercentage: (0, pg_core_1.decimal)('progress_percentage', { precision: 5, scale: 2 }).default('0.00'),
    milestones: (0, pg_core_1.jsonb)('milestones').default([]), // Key milestones and checkpoints
    lastReviewDate: (0, pg_core_1.timestamp)('last_review_date', { withTimezone: true }),
    nextReviewDate: (0, pg_core_1.timestamp)('next_review_date', { withTimezone: true }),
    // Timeline
    startDate: (0, pg_core_1.timestamp)('start_date', { withTimezone: true }).notNull(),
    targetCompletionDate: (0, pg_core_1.timestamp)('target_completion_date', { withTimezone: true }).notNull(),
    actualCompletionDate: (0, pg_core_1.timestamp)('actual_completion_date', { withTimezone: true }),
    // Outcomes
    outcomes: (0, pg_core_1.jsonb)('outcomes').default([]), // Improvement outcomes achieved
    lessonsLearned: (0, pg_core_1.jsonb)('lessons_learned').default([]), // Lessons learned from the process
    recommendations: (0, pg_core_1.jsonb)('recommendations').default([]), // Future recommendations
    // Escalation
    isEscalated: (0, pg_core_1.boolean)('is_escalated').default(false),
    escalatedTo: (0, pg_core_1.uuid)('escalated_to'),
    escalatedAt: (0, pg_core_1.timestamp)('escalated_at', { withTimezone: true }),
    escalationReason: (0, pg_core_1.text)('escalation_reason'),
    // Approval workflow
    requiresApproval: (0, pg_core_1.boolean)('requires_approval').default(false),
    approvedBy: (0, pg_core_1.uuid)('approved_by'),
    approvedAt: (0, pg_core_1.timestamp)('approved_at', { withTimezone: true }),
    // Metadata
    tags: (0, pg_core_1.jsonb)('tags').default([]),
    metadata: (0, pg_core_1.jsonb)('metadata').default({}), // Structured data: coaching context, analysis, etc
    notes: (0, pg_core_1.text)('notes'),
    attachments: (0, pg_core_1.jsonb)('attachments').default([]),
    // Audit fields
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: (0, pg_core_1.uuid)('created_by').notNull(),
    updatedBy: (0, pg_core_1.uuid)('updated_by').notNull()
});
// ============================================================================
// PERFORMANCE ANALYTICS TABLE
// ============================================================================
exports.performanceAnalytics = (0, pg_core_1.pgTable)('performance_analytics', {
    // Primary identification
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    employeeId: (0, pg_core_1.uuid)('employee_id').notNull(),
    // Analytics period
    periodStart: (0, pg_core_1.timestamp)('period_start', { withTimezone: true }).notNull(),
    periodEnd: (0, pg_core_1.timestamp)('period_end', { withTimezone: true }).notNull(),
    periodType: (0, pg_core_1.text)('period_type').notNull(), // 'monthly', 'quarterly', 'annual'
    // Performance summary
    overallScore: (0, pg_core_1.decimal)('overall_score', { precision: 3, scale: 2 }),
    goalAchievementRate: (0, pg_core_1.decimal)('goal_achievement_rate', { precision: 5, scale: 2 }),
    competencyScore: (0, pg_core_1.decimal)('competency_score', { precision: 3, scale: 2 }),
    behaviorScore: (0, pg_core_1.decimal)('behavior_score', { precision: 3, scale: 2 }),
    // Goal analytics
    totalGoals: (0, pg_core_1.integer)('total_goals').default(0),
    completedGoals: (0, pg_core_1.integer)('completed_goals').default(0),
    overdueGoals: (0, pg_core_1.integer)('overdue_goals').default(0),
    averageGoalProgress: (0, pg_core_1.decimal)('average_goal_progress', { precision: 5, scale: 2 }),
    // Review analytics
    totalReviews: (0, pg_core_1.integer)('total_reviews').default(0),
    averageReviewRating: (0, pg_core_1.decimal)('average_review_rating', { precision: 3, scale: 2 }),
    reviewCompletionRate: (0, pg_core_1.decimal)('review_completion_rate', { precision: 5, scale: 2 }),
    // Feedback analytics
    totalFeedback: (0, pg_core_1.integer)('total_feedback').default(0),
    averageFeedbackRating: (0, pg_core_1.decimal)('average_feedback_rating', { precision: 3, scale: 2 }),
    feedbackResponseRate: (0, pg_core_1.decimal)('feedback_response_rate', { precision: 5, scale: 2 }),
    // Improvement analytics
    improvementPlans: (0, pg_core_1.integer)('improvement_plans').default(0),
    completedImprovementPlans: (0, pg_core_1.integer)('completed_improvement_plans').default(0),
    improvementSuccessRate: (0, pg_core_1.decimal)('improvement_success_rate', { precision: 5, scale: 2 }),
    // Trend analysis
    performanceTrend: (0, pg_core_1.text)('performance_trend'), // 'improving', 'declining', 'stable'
    goalTrend: (0, pg_core_1.text)('goal_trend'),
    competencyTrend: (0, pg_core_1.text)('competency_trend'),
    behaviorTrend: (0, pg_core_1.text)('behavior_trend'),
    // Comparative analytics
    percentileRank: (0, pg_core_1.decimal)('percentile_rank', { precision: 5, scale: 2 }), // Rank within organization
    departmentRank: (0, pg_core_1.integer)('department_rank'),
    teamRank: (0, pg_core_1.integer)('team_rank'),
    // Risk indicators
    performanceRisk: (0, pg_core_1.text)('performance_risk'), // 'low', 'medium', 'high'
    retentionRisk: (0, pg_core_1.text)('retention_risk'),
    developmentNeeds: (0, pg_core_1.jsonb)('development_needs').default([]),
    // Predictive analytics
    predictedPerformance: (0, pg_core_1.decimal)('predicted_performance', { precision: 3, scale: 2 }),
    predictedRetention: (0, pg_core_1.decimal)('predicted_retention', { precision: 3, scale: 2 }),
    predictedPromotion: (0, pg_core_1.decimal)('predicted_promotion', { precision: 3, scale: 2 }),
    // Metadata
    tags: (0, pg_core_1.jsonb)('tags').default([]),
    notes: (0, pg_core_1.text)('notes'),
    // Audit fields
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: (0, pg_core_1.uuid)('created_by').notNull(),
    updatedBy: (0, pg_core_1.uuid)('updated_by').notNull()
});
// ============================================================================
// PERFORMANCE CYCLES TABLE
// ============================================================================
exports.performanceCycles = (0, pg_core_1.pgTable)('performance_cycles', {
    // Primary identification
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    // Cycle details
    name: (0, pg_core_1.text)('name').notNull(),
    description: (0, pg_core_1.text)('description'),
    cycleType: (0, pg_core_1.text)('cycle_type').notNull().default('quarterly'), // 'quarterly', 'annual', 'monthly', 'custom'
    fiscalYear: (0, pg_core_1.integer)('fiscal_year').notNull(),
    quarter: (0, pg_core_1.integer)('quarter'), // 1-4 for quarterly cycles
    // Timeline
    startDate: (0, pg_core_1.timestamp)('start_date', { withTimezone: true }).notNull(),
    endDate: (0, pg_core_1.timestamp)('end_date', { withTimezone: true }).notNull(),
    reviewDueDate: (0, pg_core_1.timestamp)('review_due_date', { withTimezone: true }),
    // Status and configuration
    status: (0, exports.performanceCycleStatusEnum)('status').notNull().default('upcoming'),
    isDefault: (0, pg_core_1.boolean)('is_default').default(false), // Is this the default cycle template
    isActive: (0, pg_core_1.boolean)('is_active').default(false), // Is this cycle currently active
    // Cycle objectives
    objectives: (0, pg_core_1.jsonb)('objectives').default([]), // Company/org objectives for this cycle
    priorities: (0, pg_core_1.jsonb)('priorities').default([]), // Strategic priorities from culture agent
    skillsNeeded: (0, pg_core_1.jsonb)('skills_needed').default([]), // Skills needed from LXP
    cultureFocus: (0, pg_core_1.jsonb)('culture_focus').default([]), // Culture priorities to shape/sustain
    // Strategy alignment
    strategyAlignment: (0, pg_core_1.jsonb)('strategy_alignment').default({}), // Link to company strategy
    departmentGoals: (0, pg_core_1.jsonb)('department_goals').default([]), // Department-level goals
    // Cycle settings
    settings: (0, pg_core_1.jsonb)('settings').default({}), // Configurable settings (review frequency, etc.)
    reviewTemplate: (0, pg_core_1.jsonb)('review_template').default({}), // Review template for this cycle
    goalSettings: (0, pg_core_1.jsonb)('goal_settings').default({}), // Goal-setting configuration
    // Participation
    includedDepartments: (0, pg_core_1.jsonb)('included_departments').default([]), // Departments included
    includedRoles: (0, pg_core_1.jsonb)('included_roles').default([]), // Roles included
    excludedEmployees: (0, pg_core_1.jsonb)('excluded_employees').default([]), // Excluded employee IDs
    // Progress tracking
    totalParticipants: (0, pg_core_1.integer)('total_participants').default(0),
    completedReviews: (0, pg_core_1.integer)('completed_reviews').default(0),
    completionRate: (0, pg_core_1.decimal)('completion_rate', { precision: 5, scale: 2 }).default('0.00'),
    // Admin and configuration
    configuredBy: (0, pg_core_1.uuid)('configured_by'), // Admin who configured this cycle
    configuredAt: (0, pg_core_1.timestamp)('configured_at', { withTimezone: true }),
    // Metadata
    tags: (0, pg_core_1.jsonb)('tags').default([]),
    notes: (0, pg_core_1.text)('notes'),
    // Audit fields
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: (0, pg_core_1.uuid)('created_by').notNull(),
    updatedBy: (0, pg_core_1.uuid)('updated_by').notNull()
});
// ============================================================================
// ONE-ON-ONE MEETINGS TABLE
// ============================================================================
exports.oneOnOneMeetings = (0, pg_core_1.pgTable)('one_on_one_meetings', {
    // Primary identification
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    employeeId: (0, pg_core_1.uuid)('employee_id').notNull(),
    managerId: (0, pg_core_1.uuid)('manager_id').notNull(),
    performanceCycleId: (0, pg_core_1.uuid)('performance_cycle_id'), // Link to performance cycle
    // Meeting details
    title: (0, pg_core_1.text)('title').notNull(),
    description: (0, pg_core_1.text)('description'),
    meetingType: (0, pg_core_1.text)('meeting_type').notNull().default('regular'), // 'regular', 'quarterly_evaluation', 'goal_setting', 'check_in'
    // Scheduling
    scheduledDate: (0, pg_core_1.timestamp)('scheduled_date', { withTimezone: true }).notNull(),
    scheduledEndDate: (0, pg_core_1.timestamp)('scheduled_end_date', { withTimezone: true }),
    duration: (0, pg_core_1.integer)('duration').notNull().default(30), // Duration in minutes
    location: (0, pg_core_1.text)('location'), // Physical location or meeting link
    meetingLink: (0, pg_core_1.text)('meeting_link'), // Video conference link
    // Status
    status: (0, exports.oneOnOneStatusEnum)('status').notNull().default('scheduled'),
    actualStartTime: (0, pg_core_1.timestamp)('actual_start_time', { withTimezone: true }),
    actualEndTime: (0, pg_core_1.timestamp)('actual_end_time', { withTimezone: true }),
    // BOT assistance
    botAssisted: (0, pg_core_1.boolean)('bot_assisted').default(true),
    botSessionId: (0, pg_core_1.text)('bot_session_id'), // BOT conversation session ID
    // Pre-meeting preparation
    employeePreparationNotes: (0, pg_core_1.text)('employee_preparation_notes'),
    managerPreparationNotes: (0, pg_core_1.text)('manager_preparation_notes'),
    employeePrepared: (0, pg_core_1.boolean)('employee_prepared').default(false),
    managerPrepared: (0, pg_core_1.boolean)('manager_prepared').default(false),
    // Meeting agenda
    agenda: (0, pg_core_1.jsonb)('agenda').default([]), // Array of agenda items
    suggestedTopics: (0, pg_core_1.jsonb)('suggested_topics').default([]), // BOT-suggested topics
    employeeTopics: (0, pg_core_1.jsonb)('employee_topics').default([]), // Topics from employee
    managerTopics: (0, pg_core_1.jsonb)('manager_topics').default([]), // Topics from manager
    // Meeting notes and outcomes
    meetingNotes: (0, pg_core_1.text)('meeting_notes'),
    employeeNotes: (0, pg_core_1.text)('employee_notes'),
    managerNotes: (0, pg_core_1.text)('manager_notes'),
    keyDiscussionPoints: (0, pg_core_1.jsonb)('key_discussion_points').default([]),
    // Action items and follow-up
    actionItems: (0, pg_core_1.jsonb)('action_items').default([]), // Action items from meeting
    employeeActionItems: (0, pg_core_1.jsonb)('employee_action_items').default([]),
    managerActionItems: (0, pg_core_1.jsonb)('manager_action_items').default([]),
    decisions: (0, pg_core_1.jsonb)('decisions').default([]), // Decisions made
    // Performance and feedback
    performanceDiscussed: (0, pg_core_1.boolean)('performance_discussed').default(false),
    goalsDiscussed: (0, pg_core_1.jsonb)('goals_discussed').default([]), // Goals discussed in meeting
    feedbackGiven: (0, pg_core_1.jsonb)('feedback_given').default([]), // Feedback exchanged
    challengesDiscussed: (0, pg_core_1.jsonb)('challenges_discussed').default([]),
    supportNeeded: (0, pg_core_1.jsonb)('support_needed').default([]),
    // Meeting outcomes
    meetingOutcome: (0, pg_core_1.text)('meeting_outcome'), // Overall outcome/summary
    employeeSatisfaction: (0, pg_core_1.integer)('employee_satisfaction'), // 1-5 rating
    managerSatisfaction: (0, pg_core_1.integer)('manager_satisfaction'), // 1-5 rating
    effectivenessScore: (0, pg_core_1.decimal)('effectiveness_score', { precision: 3, scale: 2 }), // Meeting effectiveness
    // Integration outputs
    feedbackToEngagement: (0, pg_core_1.jsonb)('feedback_to_engagement').default({}), // Data to feed engagement agent
    feedbackToRecognition: (0, pg_core_1.jsonb)('feedback_to_recognition').default({}), // Data to feed recognition agent
    developmentNeeds: (0, pg_core_1.jsonb)('development_needs').default([]), // Training/development needs identified
    wellbeingIndicators: (0, pg_core_1.jsonb)('wellbeing_indicators').default({}), // Employee wellbeing signals
    // Follow-up
    requiresFollowUp: (0, pg_core_1.boolean)('requires_follow_up').default(false),
    followUpDate: (0, pg_core_1.timestamp)('follow_up_date', { withTimezone: true }),
    followUpCompleted: (0, pg_core_1.boolean)('follow_up_completed').default(false),
    nextMeetingScheduled: (0, pg_core_1.boolean)('next_meeting_scheduled').default(false),
    nextMeetingId: (0, pg_core_1.uuid)('next_meeting_id'), // Link to next scheduled meeting
    // Privacy and confidentiality
    isConfidential: (0, pg_core_1.boolean)('is_confidential').default(false),
    sharedWithHR: (0, pg_core_1.boolean)('shared_with_hr').default(false),
    // Metadata
    tags: (0, pg_core_1.jsonb)('tags').default([]),
    attachments: (0, pg_core_1.jsonb)('attachments').default([]),
    // Audit fields
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: (0, pg_core_1.uuid)('created_by').notNull(),
    updatedBy: (0, pg_core_1.uuid)('updated_by').notNull()
});
// ============================================================================
// PERFORMANCE EVALUATION MEETINGS TABLE
// ============================================================================
exports.performanceEvaluations = (0, pg_core_1.pgTable)('performance_evaluations', {
    // Primary identification
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    employeeId: (0, pg_core_1.uuid)('employee_id').notNull(),
    managerId: (0, pg_core_1.uuid)('manager_id').notNull(),
    performanceReviewId: (0, pg_core_1.uuid)('performance_review_id'), // Link to the actual review document
    performanceCycleId: (0, pg_core_1.uuid)('performance_cycle_id'), // Link to performance cycle
    // Evaluation meeting details
    title: (0, pg_core_1.text)('title').notNull(),
    description: (0, pg_core_1.text)('description'),
    evaluationType: (0, pg_core_1.text)('evaluation_type').notNull().default('annual'), // 'annual', 'mid-year', 'quarterly', 'probation', 'project'
    period: (0, pg_core_1.text)('period'), // e.g., "Q4 2025", "Annual 2025"
    // Scheduling
    scheduledDate: (0, pg_core_1.timestamp)('scheduled_date', { withTimezone: true }).notNull(),
    scheduledEndDate: (0, pg_core_1.timestamp)('scheduled_end_date', { withTimezone: true }),
    duration: (0, pg_core_1.integer)('duration').notNull().default(60), // Duration in minutes
    location: (0, pg_core_1.text)('location'), // Physical location or meeting link
    meetingLink: (0, pg_core_1.text)('meeting_link'), // Video conference link
    // Status
    status: (0, pg_core_1.text)('status').notNull().default('scheduled'), // 'scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled'
    actualStartTime: (0, pg_core_1.timestamp)('actual_start_time', { withTimezone: true }),
    actualEndTime: (0, pg_core_1.timestamp)('actual_end_time', { withTimezone: true }),
    completedAt: (0, pg_core_1.timestamp)('completed_at', { withTimezone: true }),
    // Pre-meeting preparation
    employeePreparationCompleted: (0, pg_core_1.boolean)('employee_preparation_completed').default(false),
    managerPreparationCompleted: (0, pg_core_1.boolean)('manager_preparation_completed').default(false),
    employeeSelfAssessment: (0, pg_core_1.jsonb)('employee_self_assessment').default({}),
    managerPreNotes: (0, pg_core_1.text)('manager_pre_notes'),
    // Meeting agenda
    agenda: (0, pg_core_1.jsonb)('agenda').default([]), // Array of agenda items
    goalsToReview: (0, pg_core_1.jsonb)('goals_to_review').default([]), // Goals being evaluated
    competenciesToReview: (0, pg_core_1.jsonb)('competencies_to_review').default([]), // Competencies to discuss
    // Meeting outcomes
    meetingNotes: (0, pg_core_1.text)('meeting_notes'),
    employeeNotes: (0, pg_core_1.text)('employee_notes'),
    managerNotes: (0, pg_core_1.text)('manager_notes'),
    discussionPoints: (0, pg_core_1.jsonb)('discussion_points').default([]),
    decisionsMode: (0, pg_core_1.jsonb)('decisions_made').default([]),
    // Performance discussion
    strengthsDiscussed: (0, pg_core_1.jsonb)('strengths_discussed').default([]),
    areasForImprovement: (0, pg_core_1.jsonb)('areas_for_improvement').default([]),
    achievementsHighlighted: (0, pg_core_1.jsonb)('achievements_highlighted').default([]),
    challengesDiscussed: (0, pg_core_1.jsonb)('challenges_discussed').default([]),
    // Ratings and scores (preliminary or final)
    overallRating: (0, pg_core_1.decimal)('overall_rating', { precision: 3, scale: 2 }), // 1.00 to 5.00
    goalAchievementRating: (0, pg_core_1.decimal)('goal_achievement_rating', { precision: 3, scale: 2 }),
    competencyRating: (0, pg_core_1.decimal)('competency_rating', { precision: 3, scale: 2 }),
    behaviorRating: (0, pg_core_1.decimal)('behavior_rating', { precision: 3, scale: 2 }),
    // Action items and development plans
    actionItems: (0, pg_core_1.jsonb)('action_items').default([]),
    developmentObjectives: (0, pg_core_1.jsonb)('development_objectives').default([]),
    trainingNeeds: (0, pg_core_1.jsonb)('training_needs').default([]),
    nextSteps: (0, pg_core_1.jsonb)('next_steps').default([]),
    // Agreement and signatures
    employeeAgreement: (0, pg_core_1.boolean)('employee_agreement').default(false),
    employeeAgreedAt: (0, pg_core_1.timestamp)('employee_agreed_at', { withTimezone: true }),
    employeeComments: (0, pg_core_1.text)('employee_comments'),
    managerSignedAt: (0, pg_core_1.timestamp)('manager_signed_at', { withTimezone: true }),
    // Follow-up
    requiresFollowUp: (0, pg_core_1.boolean)('requires_follow_up').default(false),
    followUpDate: (0, pg_core_1.timestamp)('follow_up_date', { withTimezone: true }),
    followUpCompleted: (0, pg_core_1.boolean)('follow_up_completed').default(false),
    // BOT assistance
    botAssisted: (0, pg_core_1.boolean)('bot_assisted').default(true),
    botSessionId: (0, pg_core_1.text)('bot_session_id'),
    botSuggestions: (0, pg_core_1.jsonb)('bot_suggestions').default([]),
    // Metadata
    tags: (0, pg_core_1.jsonb)('tags').default([]),
    attachments: (0, pg_core_1.jsonb)('attachments').default([]),
    isConfidential: (0, pg_core_1.boolean)('is_confidential').default(true),
    // Audit fields
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: (0, pg_core_1.uuid)('created_by').notNull(),
    updatedBy: (0, pg_core_1.uuid)('updated_by').notNull()
});
// ============================================================================
// PERFORMANCE CALIBRATION TABLE
// ============================================================================
exports.performanceCalibrations = (0, pg_core_1.pgTable)('performance_calibrations', {
    // Primary identification
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    performanceCycleId: (0, pg_core_1.uuid)('performance_cycle_id'), // Link to performance cycle
    // Calibration details
    name: (0, pg_core_1.text)('name').notNull(),
    description: (0, pg_core_1.text)('description'),
    calibrationType: (0, pg_core_1.text)('calibration_type').notNull().default('ratings'), // 'ratings', 'rankings', 'distribution'
    // Scheduling
    scheduledDate: (0, pg_core_1.timestamp)('scheduled_date', { withTimezone: true }),
    completedAt: (0, pg_core_1.timestamp)('completed_at', { withTimezone: true }),
    // Status
    status: (0, pg_core_1.text)('status').notNull().default('not_started'), // 'not_started', 'in_progress', 'completed', 'cancelled'
    // Participants
    facilitators: (0, pg_core_1.jsonb)('facilitators').default([]), // Array of facilitator user IDs
    participants: (0, pg_core_1.jsonb)('participants').default([]), // Array of participant user IDs
    departmentsIncluded: (0, pg_core_1.jsonb)('departments_included').default([]), // Department IDs
    // Calibration data
    employeesReviewed: (0, pg_core_1.jsonb)('employees_reviewed').default([]), // Employee IDs reviewed
    ratingAdjustments: (0, pg_core_1.jsonb)('rating_adjustments').default([]), // Rating changes
    rankingResults: (0, pg_core_1.jsonb)('ranking_results').default([]), // Final rankings
    distributionTargets: (0, pg_core_1.jsonb)('distribution_targets').default({}), // Target distribution (e.g., 20% top performers)
    actualDistribution: (0, pg_core_1.jsonb)('actual_distribution').default({}), // Actual distribution achieved
    // Discussion and decisions
    discussionNotes: (0, pg_core_1.text)('discussion_notes'),
    decisions: (0, pg_core_1.jsonb)('decisions').default([]),
    consensusReached: (0, pg_core_1.boolean)('consensus_reached').default(false),
    escalations: (0, pg_core_1.jsonb)('escalations').default([]), // Escalated cases
    // Calibration outcomes
    calibrationSummary: (0, pg_core_1.text)('calibration_summary'),
    actionItems: (0, pg_core_1.jsonb)('action_items').default([]),
    followUpRequired: (0, pg_core_1.boolean)('follow_up_required').default(false),
    followUpDate: (0, pg_core_1.timestamp)('follow_up_date', { withTimezone: true }),
    // Analytics
    totalEmployeesCalibrated: (0, pg_core_1.integer)('total_employees_calibrated').default(0),
    ratingsChanged: (0, pg_core_1.integer)('ratings_changed').default(0),
    averageRatingChange: (0, pg_core_1.decimal)('average_rating_change', { precision: 3, scale: 2 }),
    calibrationEffectiveness: (0, pg_core_1.decimal)('calibration_effectiveness', { precision: 3, scale: 2 }), // 0-1 score
    // Meeting information
    meetingDuration: (0, pg_core_1.integer)('meeting_duration'), // Duration in minutes
    meetingLocation: (0, pg_core_1.text)('meeting_location'),
    meetingLink: (0, pg_core_1.text)('meeting_link'),
    // Metadata
    guidelines: (0, pg_core_1.jsonb)('guidelines').default({}), // Calibration guidelines
    criteria: (0, pg_core_1.jsonb)('criteria').default([]), // Calibration criteria
    tags: (0, pg_core_1.jsonb)('tags').default([]),
    attachments: (0, pg_core_1.jsonb)('attachments').default([]),
    // Audit fields
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow().notNull(),
    createdBy: (0, pg_core_1.uuid)('created_by').notNull(),
    updatedBy: (0, pg_core_1.uuid)('updated_by').notNull()
});
// ============================================================================
// TABLE RELATIONS
// ============================================================================
// Performance Goals Relations
exports.performanceGoalsRelations = (0, drizzle_orm_1.relations)(exports.performanceGoals, ({ one, many }) => ({
    // Self-referencing relation for parent goals
    parentGoal: one(exports.performanceGoals, {
        fields: [exports.performanceGoals.parentGoalId],
        references: [exports.performanceGoals.id]
    }),
    childGoals: many(exports.performanceGoals),
    // Relations to other tables
    metrics: many(exports.performanceMetrics),
    reviews: many(exports.performanceReviews)
}));
// Performance Reviews Relations
exports.performanceReviewsRelations = (0, drizzle_orm_1.relations)(exports.performanceReviews, ({ one, many }) => ({
    goals: many(exports.performanceGoals),
    metrics: many(exports.performanceMetrics),
    feedback: many(exports.performanceFeedback),
    improvementPlans: many(exports.performanceImprovementPlans)
}));
// Performance Metrics Relations
exports.performanceMetricsRelations = (0, drizzle_orm_1.relations)(exports.performanceMetrics, ({ one }) => ({
    goal: one(exports.performanceGoals, {
        fields: [exports.performanceMetrics.goalId],
        references: [exports.performanceGoals.id]
    }),
    review: one(exports.performanceReviews, {
        fields: [exports.performanceMetrics.reviewId],
        references: [exports.performanceReviews.id]
    })
}));
// Performance Feedback Relations
exports.performanceFeedbackRelations = (0, drizzle_orm_1.relations)(exports.performanceFeedback, ({ one }) => ({
    review: one(exports.performanceReviews, {
        fields: [exports.performanceFeedback.reviewId],
        references: [exports.performanceReviews.id]
    })
}));
// Performance Improvement Plans Relations
exports.performanceImprovementPlansRelations = (0, drizzle_orm_1.relations)(exports.performanceImprovementPlans, ({ one }) => ({
    review: one(exports.performanceReviews, {
        fields: [exports.performanceImprovementPlans.reviewId],
        references: [exports.performanceReviews.id]
    })
}));
// Performance Analytics Relations
exports.performanceAnalyticsRelations = (0, drizzle_orm_1.relations)(exports.performanceAnalytics, ({ one }) => ({
// Analytics are aggregated data, so no direct relations to other tables
}));
// Performance Cycles Relations
exports.performanceCyclesRelations = (0, drizzle_orm_1.relations)(exports.performanceCycles, ({ many }) => ({
    goals: many(exports.performanceGoals),
    reviews: many(exports.performanceReviews),
    evaluations: many(exports.performanceEvaluations),
    oneOnOneMeetings: many(exports.oneOnOneMeetings),
    calibrations: many(exports.performanceCalibrations)
}));
// Performance Evaluations Relations
exports.performanceEvaluationsRelations = (0, drizzle_orm_1.relations)(exports.performanceEvaluations, ({ one }) => ({
    performanceCycle: one(exports.performanceCycles, {
        fields: [exports.performanceEvaluations.performanceCycleId],
        references: [exports.performanceCycles.id]
    }),
    performanceReview: one(exports.performanceReviews, {
        fields: [exports.performanceEvaluations.performanceReviewId],
        references: [exports.performanceReviews.id]
    })
}));
// Performance Calibrations Relations
exports.performanceCalibrationsRelations = (0, drizzle_orm_1.relations)(exports.performanceCalibrations, ({ one }) => ({
    performanceCycle: one(exports.performanceCycles, {
        fields: [exports.performanceCalibrations.performanceCycleId],
        references: [exports.performanceCycles.id]
    })
}));
// One-on-One Meetings Relations
exports.oneOnOneMeetingsRelations = (0, drizzle_orm_1.relations)(exports.oneOnOneMeetings, ({ one }) => ({
    performanceCycle: one(exports.performanceCycles, {
        fields: [exports.oneOnOneMeetings.performanceCycleId],
        references: [exports.performanceCycles.id]
    }),
    nextMeeting: one(exports.oneOnOneMeetings, {
        fields: [exports.oneOnOneMeetings.nextMeetingId],
        references: [exports.oneOnOneMeetings.id]
    })
}));
// ============================================================================
// TALENT & PERFORMANCE MANAGEMENT
// ============================================================================
exports.talentProfiles = (0, pg_core_1.pgTable)('talent_profiles', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    employeeId: (0, pg_core_1.text)('employee_id').notNull(),
    profileData: (0, pg_core_1.jsonb)('profile_data'), // Detailed talent profile info
    strengths: (0, pg_core_1.jsonb)('strengths'), // Array of strengths
    developmentAreas: (0, pg_core_1.jsonb)('development_areas'), // Areas for growth
    careerAspirations: (0, pg_core_1.text)('career_aspirations'),
    potentialRating: (0, pg_core_1.text)('potential_rating'), // high, medium, low
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
// ============================================================================
// KPIs (KEY PERFORMANCE INDICATORS)
// ============================================================================
exports.kpis = (0, pg_core_1.pgTable)('kpis', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    departmentId: (0, pg_core_1.text)('department_id'), // Optional department-level KPI
    employeeId: (0, pg_core_1.text)('employee_id'), // Optional individual KPI
    name: (0, pg_core_1.text)('name').notNull(), // KPI name (e.g., "Sales Revenue", "Customer Satisfaction")
    description: (0, pg_core_1.text)('description'),
    category: (0, pg_core_1.text)('category'), // financial, customer, process, learning_growth
    targetValue: (0, pg_core_1.decimal)('target_value'), // Target to achieve
    currentValue: (0, pg_core_1.decimal)('current_value'), // Current actual value
    unit: (0, pg_core_1.text)('unit'), // Unit of measurement (%, $, count, etc.)
    frequency: (0, pg_core_1.text)('frequency'), // daily, weekly, monthly, quarterly, annual
    status: (0, pg_core_1.text)('status').default('active'), // active, achieved, at_risk, failed
    ownerId: (0, pg_core_1.text)('owner_id'), // Person responsible for this KPI
    startDate: (0, pg_core_1.timestamp)('start_date'),
    endDate: (0, pg_core_1.timestamp)('end_date'),
    metadata: (0, pg_core_1.jsonb)('metadata'), // Additional contextual data
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
// ============================================================================
// OKRs (OBJECTIVES AND KEY RESULTS)
// ============================================================================
exports.okrs = (0, pg_core_1.pgTable)('okrs', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    departmentId: (0, pg_core_1.text)('department_id'), // Optional department OKR
    employeeId: (0, pg_core_1.text)('employee_id'), // Optional individual OKR
    parentOkrId: (0, pg_core_1.text)('parent_okr_id'), // For cascading OKRs
    type: (0, pg_core_1.text)('type').notNull(), // company, department, team, individual
    objective: (0, pg_core_1.text)('objective').notNull(), // The qualitative goal
    description: (0, pg_core_1.text)('description'),
    quarter: (0, pg_core_1.text)('quarter'), // Q1, Q2, Q3, Q4
    year: (0, pg_core_1.integer)('year'),
    status: (0, pg_core_1.text)('status').default('in_progress'), // not_started, in_progress, completed, deferred
    progress: (0, pg_core_1.integer)('progress').default(0), // 0-100 percentage
    ownerId: (0, pg_core_1.text)('owner_id').notNull(), // Person/team responsible
    startDate: (0, pg_core_1.timestamp)('start_date'),
    endDate: (0, pg_core_1.timestamp)('end_date'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
// Key Results for OKRs (many-to-one relationship)
exports.keyResults = (0, pg_core_1.pgTable)('key_results', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    okrId: (0, pg_core_1.text)('okr_id').notNull(), // Parent OKR
    description: (0, pg_core_1.text)('description').notNull(), // The measurable result
    targetValue: (0, pg_core_1.decimal)('target_value').notNull(), // What we're aiming for
    currentValue: (0, pg_core_1.decimal)('current_value').default('0'), // Current progress
    unit: (0, pg_core_1.text)('unit'), // Unit of measurement
    status: (0, pg_core_1.text)('status').default('not_started'), // not_started, in_progress, at_risk, achieved
    progress: (0, pg_core_1.integer)('progress').default(0), // 0-100 percentage
    dueDate: (0, pg_core_1.timestamp)('due_date'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
// ============================================================================
// RECOMMENDATIONS & ACTION ITEMS
// ============================================================================
exports.performanceRecommendations = (0, pg_core_1.pgTable)('performance_recommendations', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    employeeId: (0, pg_core_1.text)('employee_id'), // Optional - can be org-level
    departmentId: (0, pg_core_1.text)('department_id'), // Optional - can be dept-level
    sourceType: (0, pg_core_1.text)('source_type').notNull(), // performance_review, goal_tracking, 1on1, ai_analysis
    sourceId: (0, pg_core_1.text)('source_id'), // ID of the source (review ID, goal ID, etc.)
    recommendationType: (0, pg_core_1.text)('recommendation_type').notNull(), // training, coaching, goal, recognition, process_improvement
    title: (0, pg_core_1.text)('title').notNull(),
    description: (0, pg_core_1.text)('description').notNull(),
    priority: (0, pg_core_1.text)('priority').default('medium'), // low, medium, high, urgent
    status: (0, pg_core_1.text)('status').default('pending'), // pending, in_progress, completed, dismissed
    actionItems: (0, pg_core_1.jsonb)('action_items'), // Array of specific actions to take
    expectedImpact: (0, pg_core_1.text)('expected_impact'), // What will improve if implemented
    estimatedEffort: (0, pg_core_1.text)('estimated_effort'), // low, medium, high
    dueDate: (0, pg_core_1.timestamp)('due_date'),
    completedAt: (0, pg_core_1.timestamp)('completed_at'),
    assignedTo: (0, pg_core_1.text)('assigned_to'), // Who should implement this
    aiGenerated: (0, pg_core_1.boolean)('ai_generated').default(true), // Was this AI-generated?
    aiModel: (0, pg_core_1.text)('ai_model'), // Which AI model generated it
    confidence: (0, pg_core_1.decimal)('confidence'), // AI confidence score
    metadata: (0, pg_core_1.jsonb)('metadata'), // Additional context
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
// ============================================================================
// RELATIONS
// ============================================================================
exports.kpisRelations = (0, drizzle_orm_1.relations)(exports.kpis, ({ one }) => ({
    tenant: one(core_1.tenants, {
        fields: [exports.kpis.tenantId],
        references: [core_1.tenants.id]
    }),
    department: one(core_1.departments, {
        fields: [exports.kpis.departmentId],
        references: [core_1.departments.id]
    }),
    employee: one(core_1.users, {
        fields: [exports.kpis.employeeId],
        references: [core_1.users.id]
    }),
    owner: one(core_1.users, {
        fields: [exports.kpis.ownerId],
        references: [core_1.users.id]
    })
}));
exports.okrsRelations = (0, drizzle_orm_1.relations)(exports.okrs, ({ one, many }) => ({
    tenant: one(core_1.tenants, {
        fields: [exports.okrs.tenantId],
        references: [core_1.tenants.id]
    }),
    department: one(core_1.departments, {
        fields: [exports.okrs.departmentId],
        references: [core_1.departments.id]
    }),
    employee: one(core_1.users, {
        fields: [exports.okrs.employeeId],
        references: [core_1.users.id]
    }),
    owner: one(core_1.users, {
        fields: [exports.okrs.ownerId],
        references: [core_1.users.id]
    }),
    parentOkr: one(exports.okrs, {
        fields: [exports.okrs.parentOkrId],
        references: [exports.okrs.id]
    }),
    keyResults: many(exports.keyResults)
}));
exports.keyResultsRelations = (0, drizzle_orm_1.relations)(exports.keyResults, ({ one }) => ({
    okr: one(exports.okrs, {
        fields: [exports.keyResults.okrId],
        references: [exports.okrs.id]
    })
}));
exports.performanceRecommendationsRelations = (0, drizzle_orm_1.relations)(exports.performanceRecommendations, ({ one }) => ({
    tenant: one(core_1.tenants, {
        fields: [exports.performanceRecommendations.tenantId],
        references: [core_1.tenants.id]
    }),
    employee: one(core_1.users, {
        fields: [exports.performanceRecommendations.employeeId],
        references: [core_1.users.id]
    }),
    department: one(core_1.departments, {
        fields: [exports.performanceRecommendations.departmentId],
        references: [core_1.departments.id]
    }),
    assignee: one(core_1.users, {
        fields: [exports.performanceRecommendations.assignedTo],
        references: [core_1.users.id]
    })
}));
// ============================================================================
// EXPORTS
// ============================================================================
// Note: Tables are already exported with 'export const' declarations above
// No additional export block needed
//# sourceMappingURL=performance.js.map