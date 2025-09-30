// Extended LXP Schema - Learning Experience Platform Database Tables
// Task Reference: Module 1 (LXP) - Section 1.1 (Database Schema)

import { pgTable, text, uuid, timestamp, integer, jsonb, boolean, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// TASK 1.1.1: Courses Table
// ============================================================================
// Status: ✅ Complete
// Description: Store all available courses in the LXP
// Dependencies: None

export const courses = pgTable('lxp_courses', {
  // Primary identification
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  
  // Course details
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(), // technical, leadership, culture, compliance, safety, etc.
  level: text('level').notNull(), // beginner, intermediate, advanced
  duration: integer('duration').notNull(), // in minutes
  
  // Content and delivery
  provider: text('provider'), // internal, external provider name
  format: text('format').notNull(), // video, article, interactive, assessment, blended
  content: jsonb('content'), // Course content structure
  
  // Skills and prerequisites
  skills: text('skills').array(), // Skills taught by this course
  prerequisites: text('prerequisites').array(), // Required prior courses or skills
  
  // Metadata
  metadata: jsonb('metadata'), // Additional course data
  thumbnailUrl: text('thumbnail_url'),
  language: text('language').default('en'),
  version: text('version').default('1.0'),
  
  // Status and tracking
  status: text('status').notNull().default('active'), // active, archived, draft
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  publishedAt: timestamp('published_at'),
  archivedAt: timestamp('archived_at')
});


// ============================================================================
// TASK 1.1.2: Learning Paths Table
// ============================================================================
// Status: ✅ Complete
// Description: Store personalized learning paths for employees
// Dependencies: 1.1.1 (courses)

export const learningPaths = pgTable('lxp_learning_paths', {
  // Primary identification
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  employeeId: uuid('employee_id').notNull(),
  
  // Path details
  name: text('name').notNull(),
  description: text('description').notNull(),
  type: text('type').notNull(), // skill_gap, culture_learning, performance_improvement, compliance, certification, proactive
  
  // Goals and targets
  goalSkills: text('goal_skills').array(), // Target skills to acquire
  currentLevel: text('current_level'), // Current skill/competency level
  targetLevel: text('target_level'), // Target skill/competency level
  
  // Course structure
  courses: jsonb('courses').notNull(), // Array of {courseId, order, required, status}
  milestones: jsonb('milestones'), // Array of milestone definitions
  
  // Status and progress
  status: text('status').notNull().default('not_started'), // not_started, in_progress, completed, paused
  progress: integer('progress').default(0), // 0-100
  
  // Dates
  startDate: timestamp('start_date'),
  targetCompletionDate: timestamp('target_completion_date'),
  actualCompletionDate: timestamp('actual_completion_date'),
  
  // Creation tracking
  createdBy: text('created_by').notNull(), // AI agent name or user id
  triggeredBy: uuid('triggered_by'), // Trigger ID that created this path
  
  // Metadata
  metadata: jsonb('metadata'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});


// ============================================================================
// TASK 1.1.3: Course Enrollments Table
// ============================================================================
// Status: ✅ Complete
// Description: Track employee course enrollments and progress
// Dependencies: 1.1.1 (courses)

export const courseEnrollments = pgTable('lxp_course_enrollments', {
  // Primary identification
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  employeeId: uuid('employee_id').notNull(),
  courseId: uuid('course_id').notNull(),
  learningPathId: uuid('learning_path_id'), // nullable - can enroll outside of path
  
  // Status and progress
  status: text('status').notNull().default('enrolled'), // enrolled, in_progress, completed, failed, dropped
  progress: integer('progress').default(0), // 0-100
  
  // Dates
  startDate: timestamp('start_date'),
  completionDate: timestamp('completion_date'),
  
  // Tracking
  timeSpent: integer('time_spent').default(0), // minutes
  score: integer('score'), // 0-100, nullable until assessed
  attempts: integer('attempts').default(0),
  lastAccessedAt: timestamp('last_accessed_at'),
  
  // Certification
  certificateIssued: boolean('certificate_issued').default(false),
  certificateUrl: text('certificate_url'),
  
  // Feedback
  feedback: jsonb('feedback'), // Employee feedback on course
  rating: integer('rating'), // 1-5 star rating
  
  // Metadata
  metadata: jsonb('metadata'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});


// ============================================================================
// TASK 1.1.4: Course Assessments Table
// ============================================================================
// Status: ✅ Complete
// Description: Store assessments for courses
// Dependencies: 1.1.1 (courses)

export const courseAssessments = pgTable('lxp_course_assessments', {
  // Primary identification
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  courseId: uuid('course_id').notNull(),
  
  // Assessment details
  type: text('type').notNull(), // quiz, exam, project, practical, certification
  title: text('title').notNull(),
  description: text('description'),
  
  // Questions and structure
  questions: jsonb('questions').notNull(), // Array of question objects
  
  // Scoring
  passingScore: integer('passing_score').notNull().default(70), // Minimum score to pass
  totalPoints: integer('total_points'),
  
  // Constraints
  timeLimit: integer('time_limit'), // minutes, nullable for untimed
  allowedAttempts: integer('allowed_attempts').default(3),
  
  // Settings
  randomizeQuestions: boolean('randomize_questions').default(false),
  showCorrectAnswers: boolean('show_correct_answers').default(true),
  allowReview: boolean('allow_review').default(true),
  
  // Metadata
  metadata: jsonb('metadata'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});


// ============================================================================
// TASK 1.1.5: Assessment Results Table
// ============================================================================
// Status: ✅ Complete
// Description: Store assessment results for tracking and analysis
// Dependencies: 1.1.4 (courseAssessments)

export const assessmentResults = pgTable('lxp_assessment_results', {
  // Primary identification
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  employeeId: uuid('employee_id').notNull(),
  assessmentId: uuid('assessment_id').notNull(),
  enrollmentId: uuid('enrollment_id').notNull(),
  
  // Attempt tracking
  attemptNumber: integer('attempt_number').notNull(),
  
  // Answers and scoring
  answers: jsonb('answers').notNull(), // Employee's answers
  score: integer('score').notNull(), // 0-100
  pointsEarned: integer('points_earned'),
  pointsPossible: integer('points_possible'),
  passed: boolean('passed').notNull(),
  
  // Time tracking
  timeSpent: integer('time_spent'), // minutes
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at').notNull(),
  
  // Feedback
  feedback: jsonb('feedback'), // Auto-generated feedback on performance
  incorrectQuestions: jsonb('incorrect_questions'), // Questions answered incorrectly
  
  // Metadata
  metadata: jsonb('metadata'),
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow()
});


// ============================================================================
// TASK 1.1.6: Learning Analytics Table
// ============================================================================
// Status: ✅ Complete
// Description: Store learning analytics events for tracking and insights
// Dependencies: 1.1.3 (courseEnrollments)

export const learningAnalytics = pgTable('lxp_learning_analytics', {
  // Primary identification
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  employeeId: uuid('employee_id').notNull(),
  enrollmentId: uuid('enrollment_id'),
  courseId: uuid('course_id'),
  learningPathId: uuid('learning_path_id'),
  
  // Event details
  eventType: text('event_type').notNull(), // started, progress, completed, assessment, interaction, dropout
  eventData: jsonb('event_data'), // Event-specific data
  
  // Context
  sessionId: text('session_id'), // Track user sessions
  deviceType: text('device_type'), // desktop, mobile, tablet
  location: text('location'), // Geographic location if available
  
  // Metrics
  engagementScore: decimal('engagement_score'), // Calculated engagement metric
  
  // Timestamp
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  
  // Metadata
  metadata: jsonb('metadata')
});


// ============================================================================
// RELATIONS
// ============================================================================

export const coursesRelations = relations(courses, ({ many }) => ({
  enrollments: many(courseEnrollments),
  assessments: many(courseAssessments)
}));

export const learningPathsRelations = relations(learningPaths, ({ many }) => ({
  enrollments: many(courseEnrollments)
}));

export const courseEnrollmentsRelations = relations(courseEnrollments, ({ one, many }) => ({
  course: one(courses, {
    fields: [courseEnrollments.courseId],
    references: [courses.id]
  }),
  learningPath: one(learningPaths, {
    fields: [courseEnrollments.learningPathId],
    references: [learningPaths.id]
  }),
  assessmentResults: many(assessmentResults),
  analytics: many(learningAnalytics)
}));

export const courseAssessmentsRelations = relations(courseAssessments, ({ one, many }) => ({
  course: one(courses, {
    fields: [courseAssessments.courseId],
    references: [courses.id]
  }),
  results: many(assessmentResults)
}));

export const assessmentResultsRelations = relations(assessmentResults, ({ one }) => ({
  assessment: one(courseAssessments, {
    fields: [assessmentResults.assessmentId],
    references: [courseAssessments.id]
  }),
  enrollment: one(courseEnrollments, {
    fields: [assessmentResults.enrollmentId],
    references: [courseEnrollments.id]
  })
}));

export const learningAnalyticsRelations = relations(learningAnalytics, ({ one }) => ({
  enrollment: one(courseEnrollments, {
    fields: [learningAnalytics.enrollmentId],
    references: [courseEnrollments.id]
  }),
  course: one(courses, {
    fields: [learningAnalytics.courseId],
    references: [courses.id]
  }),
  learningPath: one(learningPaths, {
    fields: [learningAnalytics.learningPathId],
    references: [learningPaths.id]
  })
}));
