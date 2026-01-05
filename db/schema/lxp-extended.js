"use strict";
// Extended LXP Schema - Learning Experience Platform Database Tables
// Task Reference: Module 1 (LXP) - Section 1.1 (Database Schema)
Object.defineProperty(exports, "__esModule", { value: true });
exports.orgSnapshots = exports.actionModules = exports.learningProgress = exports.learningAssignments = exports.learningExperiences = exports.assessments = exports.learningAnalyticsRelations = exports.assessmentResultsRelations = exports.courseAssessmentsRelations = exports.courseEnrollmentsRelations = exports.learningPathsRelations = exports.coursesRelations = exports.learningAnalytics = exports.assessmentResults = exports.courseAssessments = exports.courseEnrollments = exports.learningPaths = exports.courses = exports.learningPathsTable = exports.lxpPerformanceImpactTable = exports.lxpBehaviorChangesTable = exports.lxpSkillsAcquiredTable = exports.lxpTriggersTable = exports.learningProgressEventsTable = exports.lxpWorkflowTable = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
// Additional exports for missing tables (production-ready implementation)
// Enhanced with LXP-specific fields per AGENT_CONTEXT_ULTIMATE.md requirements
exports.lxpWorkflowTable = (0, pg_core_1.pgTable)('lxp_workflows', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    employeeId: (0, pg_core_1.uuid)('employee_id').notNull(),
    workflowType: (0, pg_core_1.text)('workflow_type').notNull(), // skills_gap, performance_goal, development_plan
    status: (0, pg_core_1.text)('status').notNull().default('pending'), // pending, active, completed, cancelled
    triggeredBy: (0, pg_core_1.text)('triggered_by'), // skills_agent, performance_agent, manual
    // LXP-specific fields for learning experience tracking
    learningExperienceId: (0, pg_core_1.uuid)('learning_experience_id'),
    learningDesign: (0, pg_core_1.jsonb)('learning_design'), // Contains game design, levels, scoring system
    currentLevel: (0, pg_core_1.integer)('current_level').default(1),
    totalScore: (0, pg_core_1.integer)('total_score').default(0),
    completionPercentage: (0, pg_core_1.integer)('completion_percentage').default(0),
    timeSpent: (0, pg_core_1.integer)('time_spent').default(0), // in minutes
    lastActivity: (0, pg_core_1.timestamp)('last_activity'),
    completedAt: (0, pg_core_1.timestamp)('completed_at'),
    metadata: (0, pg_core_1.jsonb)('metadata'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
exports.learningProgressEventsTable = (0, pg_core_1.pgTable)('learning_progress_events', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    employeeId: (0, pg_core_1.uuid)('employee_id').notNull(),
    pathId: (0, pg_core_1.uuid)('path_id').notNull(),
    courseId: (0, pg_core_1.uuid)('course_id'),
    eventType: (0, pg_core_1.text)('event_type').notNull(), // started, progress, completed, abandoned
    progressPercentage: (0, pg_core_1.integer)('progress_percentage'),
    metadata: (0, pg_core_1.jsonb)('metadata'),
    timestamp: (0, pg_core_1.timestamp)('timestamp').notNull().defaultNow(),
});
exports.lxpTriggersTable = (0, pg_core_1.pgTable)('lxp_triggers', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    sourceModule: (0, pg_core_1.text)('source_module').notNull(), // skills, performance, talent
    targetModule: (0, pg_core_1.text)('target_module').notNull().default('lxp'),
    triggerType: (0, pg_core_1.text)('trigger_type').notNull(),
    employeeId: (0, pg_core_1.uuid)('employee_id'),
    data: (0, pg_core_1.jsonb)('data').notNull(),
    status: (0, pg_core_1.text)('status').notNull().default('pending'), // pending, processing, completed, failed
    processedAt: (0, pg_core_1.timestamp)('processed_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
// ============================================================================
// LXP Skills Acquired Table - Track skills gained through learning
// ============================================================================
// Production-ready implementation per AGENT_CONTEXT_ULTIMATE.md
exports.lxpSkillsAcquiredTable = (0, pg_core_1.pgTable)('lxp_skills_acquired', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    workflowId: (0, pg_core_1.uuid)('workflow_id').notNull().references(() => exports.lxpWorkflowTable.id),
    employeeId: (0, pg_core_1.uuid)('employee_id').notNull(),
    skillId: (0, pg_core_1.uuid)('skill_id'),
    skillName: (0, pg_core_1.text)('skill_name').notNull(),
    skillCategory: (0, pg_core_1.text)('skill_category'), // technical, soft, leadership, etc.
    proficiencyLevel: (0, pg_core_1.integer)('proficiency_level').default(1), // 1-5 scale
    previousLevel: (0, pg_core_1.integer)('previous_level'),
    validatedBy: (0, pg_core_1.text)('validated_by'), // system, supervisor, assessment
    metadata: (0, pg_core_1.jsonb)('metadata'),
    acquiredAt: (0, pg_core_1.timestamp)('acquired_at').notNull().defaultNow(),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
// ============================================================================
// LXP Behavior Changes Table - Track behavioral improvements
// ============================================================================
// Production-ready implementation per AGENT_CONTEXT_ULTIMATE.md
exports.lxpBehaviorChangesTable = (0, pg_core_1.pgTable)('lxp_behavior_changes', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    workflowId: (0, pg_core_1.uuid)('workflow_id').notNull().references(() => exports.lxpWorkflowTable.id),
    employeeId: (0, pg_core_1.uuid)('employee_id').notNull(),
    behaviorType: (0, pg_core_1.text)('behavior_type').notNull(), // communication, collaboration, leadership, etc.
    changeDescription: (0, pg_core_1.text)('change_description'),
    targetBehavior: (0, pg_core_1.text)('target_behavior'),
    currentBehavior: (0, pg_core_1.text)('current_behavior'),
    measurementMethod: (0, pg_core_1.text)('measurement_method'), // observation, feedback, self-assessment
    measurementValue: (0, pg_core_1.decimal)('measurement_value', { precision: 10, scale: 2 }),
    measurementUnit: (0, pg_core_1.text)('measurement_unit'),
    improvementPercentage: (0, pg_core_1.integer)('improvement_percentage'),
    validated: (0, pg_core_1.boolean)('validated').default(false),
    metadata: (0, pg_core_1.jsonb)('metadata'),
    measuredAt: (0, pg_core_1.timestamp)('measured_at').notNull().defaultNow(),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
// ============================================================================
// LXP Performance Impact Table - Track learning impact on performance
// ============================================================================
// Production-ready implementation per AGENT_CONTEXT_ULTIMATE.md
exports.lxpPerformanceImpactTable = (0, pg_core_1.pgTable)('lxp_performance_impact', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    workflowId: (0, pg_core_1.uuid)('workflow_id').notNull().references(() => exports.lxpWorkflowTable.id),
    employeeId: (0, pg_core_1.uuid)('employee_id').notNull(),
    metricType: (0, pg_core_1.text)('metric_type').notNull(), // productivity, quality, efficiency, etc.
    metricName: (0, pg_core_1.text)('metric_name').notNull(),
    baselineValue: (0, pg_core_1.decimal)('baseline_value', { precision: 10, scale: 2 }),
    currentValue: (0, pg_core_1.decimal)('current_value', { precision: 10, scale: 2 }),
    targetValue: (0, pg_core_1.decimal)('target_value', { precision: 10, scale: 2 }),
    improvementValue: (0, pg_core_1.decimal)('improvement_value', { precision: 10, scale: 2 }),
    improvementPercentage: (0, pg_core_1.integer)('improvement_percentage'),
    impactDescription: (0, pg_core_1.text)('impact_description'),
    businessImpact: (0, pg_core_1.text)('business_impact'), // cost savings, revenue increase, etc.
    validationStatus: (0, pg_core_1.text)('validation_status').default('pending'), // pending, validated, rejected
    metadata: (0, pg_core_1.jsonb)('metadata'),
    assessedAt: (0, pg_core_1.timestamp)('assessed_at').notNull().defaultNow(),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
});
exports.learningPathsTable = (0, pg_core_1.pgTable)('learning_paths', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    employeeId: (0, pg_core_1.uuid)('employee_id').notNull(),
    title: (0, pg_core_1.text)('title').notNull(),
    description: (0, pg_core_1.text)('description'),
    pathType: (0, pg_core_1.text)('path_type').notNull(), // skills_development, performance_goal, career_progression
    courses: (0, pg_core_1.jsonb)('courses').notNull(), // Array of course IDs with sequence
    totalDuration: (0, pg_core_1.integer)('total_duration'), // Total duration in minutes
    progress: (0, pg_core_1.integer)('progress').default(0), // 0-100
    status: (0, pg_core_1.text)('status').notNull().default('active'), // active, completed, paused, cancelled
    startedAt: (0, pg_core_1.timestamp)('started_at'),
    completedAt: (0, pg_core_1.timestamp)('completed_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
});
// ============================================================================
// TASK 1.1.1: Courses Table
// ============================================================================
// Status: ✅ Complete
// Description: Store all available courses in the LXP
// Dependencies: None
exports.courses = (0, pg_core_1.pgTable)('lxp_courses', {
    // Primary identification
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    // Course details
    title: (0, pg_core_1.text)('title').notNull(),
    description: (0, pg_core_1.text)('description').notNull(),
    category: (0, pg_core_1.text)('category').notNull(), // technical, leadership, culture, compliance, safety, etc.
    level: (0, pg_core_1.text)('level').notNull(), // beginner, intermediate, advanced
    duration: (0, pg_core_1.integer)('duration').notNull(), // in minutes
    // Content and delivery
    provider: (0, pg_core_1.text)('provider'), // internal, external provider name
    format: (0, pg_core_1.text)('format').notNull(), // video, article, interactive, assessment, blended
    content: (0, pg_core_1.jsonb)('content'), // Course content structure
    // Skills and prerequisites
    skills: (0, pg_core_1.text)('skills').array(), // Skills taught by this course
    prerequisites: (0, pg_core_1.text)('prerequisites').array(), // Required prior courses or skills
    // Metadata
    metadata: (0, pg_core_1.jsonb)('metadata'), // Additional course data
    thumbnailUrl: (0, pg_core_1.text)('thumbnail_url'),
    language: (0, pg_core_1.text)('language').default('en'),
    version: (0, pg_core_1.text)('version').default('1.0'),
    // Status and tracking
    status: (0, pg_core_1.text)('status').notNull().default('active'), // active, archived, draft
    // Timestamps
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
    publishedAt: (0, pg_core_1.timestamp)('published_at'),
    archivedAt: (0, pg_core_1.timestamp)('archived_at')
});
// ============================================================================
// TASK 1.1.2: Learning Paths Table
// ============================================================================
// Status: ✅ Complete
// Description: Store personalized learning paths for employees
// Dependencies: 1.1.1 (courses)
exports.learningPaths = (0, pg_core_1.pgTable)('lxp_learning_paths', {
    // Primary identification
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    employeeId: (0, pg_core_1.uuid)('employee_id').notNull(),
    // Path details
    name: (0, pg_core_1.text)('name').notNull(),
    description: (0, pg_core_1.text)('description').notNull(),
    type: (0, pg_core_1.text)('type').notNull(), // skill_gap, culture_learning, performance_improvement, compliance, certification, proactive
    // Goals and targets
    goalSkills: (0, pg_core_1.text)('goal_skills').array(), // Target skills to acquire
    currentLevel: (0, pg_core_1.text)('current_level'), // Current skill/competency level
    targetLevel: (0, pg_core_1.text)('target_level'), // Target skill/competency level
    // Course structure
    courses: (0, pg_core_1.jsonb)('courses').notNull(), // Array of {courseId, order, required, status}
    milestones: (0, pg_core_1.jsonb)('milestones'), // Array of milestone definitions
    // Status and progress
    status: (0, pg_core_1.text)('status').notNull().default('not_started'), // not_started, in_progress, completed, paused
    progress: (0, pg_core_1.integer)('progress').default(0), // 0-100
    // Dates
    startDate: (0, pg_core_1.timestamp)('start_date'),
    targetCompletionDate: (0, pg_core_1.timestamp)('target_completion_date'),
    actualCompletionDate: (0, pg_core_1.timestamp)('actual_completion_date'),
    // Creation tracking
    createdBy: (0, pg_core_1.text)('created_by').notNull(), // AI agent name or user id
    triggeredBy: (0, pg_core_1.uuid)('triggered_by'), // Trigger ID that created this path
    // Metadata
    metadata: (0, pg_core_1.jsonb)('metadata'),
    // Timestamps
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow()
});
// ============================================================================
// TASK 1.1.3: Course Enrollments Table
// ============================================================================
// Status: ✅ Complete
// Description: Track employee course enrollments and progress
// Dependencies: 1.1.1 (courses)
exports.courseEnrollments = (0, pg_core_1.pgTable)('lxp_course_enrollments', {
    // Primary identification
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    employeeId: (0, pg_core_1.uuid)('employee_id').notNull(),
    courseId: (0, pg_core_1.uuid)('course_id').notNull(),
    learningPathId: (0, pg_core_1.uuid)('learning_path_id'), // nullable - can enroll outside of path
    // Status and progress
    status: (0, pg_core_1.text)('status').notNull().default('enrolled'), // enrolled, in_progress, completed, failed, dropped
    progress: (0, pg_core_1.integer)('progress').default(0), // 0-100
    // Dates
    startDate: (0, pg_core_1.timestamp)('start_date'),
    completionDate: (0, pg_core_1.timestamp)('completion_date'),
    // Tracking
    timeSpent: (0, pg_core_1.integer)('time_spent').default(0), // minutes
    score: (0, pg_core_1.integer)('score'), // 0-100, nullable until assessed
    attempts: (0, pg_core_1.integer)('attempts').default(0),
    lastAccessedAt: (0, pg_core_1.timestamp)('last_accessed_at'),
    // Certification
    certificateIssued: (0, pg_core_1.boolean)('certificate_issued').default(false),
    certificateUrl: (0, pg_core_1.text)('certificate_url'),
    // Feedback
    feedback: (0, pg_core_1.jsonb)('feedback'), // Employee feedback on course
    rating: (0, pg_core_1.integer)('rating'), // 1-5 star rating
    // Metadata
    metadata: (0, pg_core_1.jsonb)('metadata'),
    // Timestamps
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow()
});
// ============================================================================
// TASK 1.1.4: Course Assessments Table
// ============================================================================
// Status: ✅ Complete
// Description: Store assessments for courses
// Dependencies: 1.1.1 (courses)
exports.courseAssessments = (0, pg_core_1.pgTable)('lxp_course_assessments', {
    // Primary identification
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    courseId: (0, pg_core_1.uuid)('course_id').notNull(),
    // Assessment details
    type: (0, pg_core_1.text)('type').notNull(), // quiz, exam, project, practical, certification
    title: (0, pg_core_1.text)('title').notNull(),
    description: (0, pg_core_1.text)('description'),
    // Questions and structure
    questions: (0, pg_core_1.jsonb)('questions').notNull(), // Array of question objects
    // Scoring
    passingScore: (0, pg_core_1.integer)('passing_score').notNull().default(70), // Minimum score to pass
    totalPoints: (0, pg_core_1.integer)('total_points'),
    // Constraints
    timeLimit: (0, pg_core_1.integer)('time_limit'), // minutes, nullable for untimed
    allowedAttempts: (0, pg_core_1.integer)('allowed_attempts').default(3),
    // Settings
    randomizeQuestions: (0, pg_core_1.boolean)('randomize_questions').default(false),
    showCorrectAnswers: (0, pg_core_1.boolean)('show_correct_answers').default(true),
    allowReview: (0, pg_core_1.boolean)('allow_review').default(true),
    // Metadata
    metadata: (0, pg_core_1.jsonb)('metadata'),
    // Timestamps
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow()
});
// ============================================================================
// TASK 1.1.5: Assessment Results Table
// ============================================================================
// Status: ✅ Complete
// Description: Store assessment results for tracking and analysis
// Dependencies: 1.1.4 (courseAssessments)
exports.assessmentResults = (0, pg_core_1.pgTable)('lxp_assessment_results', {
    // Primary identification
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    employeeId: (0, pg_core_1.uuid)('employee_id').notNull(),
    assessmentId: (0, pg_core_1.uuid)('assessment_id').notNull(),
    enrollmentId: (0, pg_core_1.uuid)('enrollment_id').notNull(),
    // Attempt tracking
    attemptNumber: (0, pg_core_1.integer)('attempt_number').notNull(),
    // Answers and scoring
    answers: (0, pg_core_1.jsonb)('answers').notNull(), // Employee's answers
    score: (0, pg_core_1.integer)('score').notNull(), // 0-100
    pointsEarned: (0, pg_core_1.integer)('points_earned'),
    pointsPossible: (0, pg_core_1.integer)('points_possible'),
    passed: (0, pg_core_1.boolean)('passed').notNull(),
    // Time tracking
    timeSpent: (0, pg_core_1.integer)('time_spent'), // minutes
    startedAt: (0, pg_core_1.timestamp)('started_at').notNull(),
    completedAt: (0, pg_core_1.timestamp)('completed_at').notNull(),
    // Feedback
    feedback: (0, pg_core_1.jsonb)('feedback'), // Auto-generated feedback on performance
    incorrectQuestions: (0, pg_core_1.jsonb)('incorrect_questions'), // Questions answered incorrectly
    // Metadata
    metadata: (0, pg_core_1.jsonb)('metadata'),
    // Timestamps
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow()
});
// ============================================================================
// TASK 1.1.6: Learning Analytics Table
// ============================================================================
// Status: ✅ Complete
// Description: Store learning analytics events for tracking and insights
// Dependencies: 1.1.3 (courseEnrollments)
exports.learningAnalytics = (0, pg_core_1.pgTable)('lxp_learning_analytics', {
    // Primary identification
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    employeeId: (0, pg_core_1.uuid)('employee_id').notNull(),
    enrollmentId: (0, pg_core_1.uuid)('enrollment_id'),
    courseId: (0, pg_core_1.uuid)('course_id'),
    learningPathId: (0, pg_core_1.uuid)('learning_path_id'),
    // Event details
    eventType: (0, pg_core_1.text)('event_type').notNull(), // started, progress, completed, assessment, interaction, dropout
    eventData: (0, pg_core_1.jsonb)('event_data'), // Event-specific data
    // Context
    sessionId: (0, pg_core_1.text)('session_id'), // Track user sessions
    deviceType: (0, pg_core_1.text)('device_type'), // desktop, mobile, tablet
    location: (0, pg_core_1.text)('location'), // Geographic location if available
    // Metrics
    engagementScore: (0, pg_core_1.decimal)('engagement_score'), // Calculated engagement metric
    // Timestamp
    timestamp: (0, pg_core_1.timestamp)('timestamp').notNull().defaultNow(),
    // Metadata
    metadata: (0, pg_core_1.jsonb)('metadata')
});
// ============================================================================
// RELATIONS
// ============================================================================
exports.coursesRelations = (0, drizzle_orm_1.relations)(exports.courses, ({ many }) => ({
    enrollments: many(exports.courseEnrollments),
    assessments: many(exports.courseAssessments)
}));
exports.learningPathsRelations = (0, drizzle_orm_1.relations)(exports.learningPaths, ({ many }) => ({
    enrollments: many(exports.courseEnrollments)
}));
exports.courseEnrollmentsRelations = (0, drizzle_orm_1.relations)(exports.courseEnrollments, ({ one, many }) => ({
    course: one(exports.courses, {
        fields: [exports.courseEnrollments.courseId],
        references: [exports.courses.id]
    }),
    learningPath: one(exports.learningPaths, {
        fields: [exports.courseEnrollments.learningPathId],
        references: [exports.learningPaths.id]
    }),
    assessmentResults: many(exports.assessmentResults),
    analytics: many(exports.learningAnalytics)
}));
exports.courseAssessmentsRelations = (0, drizzle_orm_1.relations)(exports.courseAssessments, ({ one, many }) => ({
    course: one(exports.courses, {
        fields: [exports.courseAssessments.courseId],
        references: [exports.courses.id]
    }),
    results: many(exports.assessmentResults)
}));
exports.assessmentResultsRelations = (0, drizzle_orm_1.relations)(exports.assessmentResults, ({ one }) => ({
    assessment: one(exports.courseAssessments, {
        fields: [exports.assessmentResults.assessmentId],
        references: [exports.courseAssessments.id]
    }),
    enrollment: one(exports.courseEnrollments, {
        fields: [exports.assessmentResults.enrollmentId],
        references: [exports.courseEnrollments.id]
    })
}));
exports.learningAnalyticsRelations = (0, drizzle_orm_1.relations)(exports.learningAnalytics, ({ one }) => ({
    enrollment: one(exports.courseEnrollments, {
        fields: [exports.learningAnalytics.enrollmentId],
        references: [exports.courseEnrollments.id]
    }),
    course: one(exports.courses, {
        fields: [exports.learningAnalytics.courseId],
        references: [exports.courses.id]
    }),
    learningPath: one(exports.learningPaths, {
        fields: [exports.learningAnalytics.learningPathId],
        references: [exports.learningPaths.id]
    })
}));
// ============================================================================
// LEGACY LXP TABLES (backward compatibility)
// ============================================================================
exports.assessments = (0, pg_core_1.pgTable)('assessments', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    employeeId: (0, pg_core_1.text)('employee_id').notNull(),
    assessmentType: (0, pg_core_1.text)('assessment_type').notNull(),
    results: (0, pg_core_1.jsonb)('results'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.learningExperiences = (0, pg_core_1.pgTable)('learning_experiences', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    employeeId: (0, pg_core_1.text)('employee_id').notNull(),
    experienceType: (0, pg_core_1.text)('experience_type').notNull(),
    data: (0, pg_core_1.jsonb)('data'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.learningAssignments = (0, pg_core_1.pgTable)('learning_assignments', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    employeeId: (0, pg_core_1.text)('employee_id').notNull(),
    assignmentType: (0, pg_core_1.text)('assignment_type').notNull(),
    status: (0, pg_core_1.text)('status').notNull().default('pending'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.learningProgress = (0, pg_core_1.pgTable)('learning_progress', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    employeeId: (0, pg_core_1.text)('employee_id').notNull(),
    courseId: (0, pg_core_1.text)('course_id'),
    progress: (0, pg_core_1.integer)('progress').default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
exports.actionModules = (0, pg_core_1.pgTable)('action_modules', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    moduleType: (0, pg_core_1.text)('module_type').notNull(),
    config: (0, pg_core_1.jsonb)('config'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.orgSnapshots = (0, pg_core_1.pgTable)('org_snapshots', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    snapshotData: (0, pg_core_1.jsonb)('snapshot_data'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
//# sourceMappingURL=lxp-extended.js.map