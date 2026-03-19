/**
 * LXP (Learning Experience Platform) Schema
 * Courses, modules, lessons, enrollments, progress, paths, certificates
 */

import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, integer, real, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const courseDifficultyEnum = pgEnum('course_difficulty', ['beginner', 'intermediate', 'advanced']);
export const courseStatusEnum = pgEnum('course_status', ['draft', 'published', 'archived']);
export const enrollmentStatusEnum = pgEnum('enrollment_status', ['enrolled', 'in_progress', 'completed', 'dropped']);
export const lessonTypeEnum = pgEnum('lesson_type', ['text', 'video', 'quiz', 'interactive', 'ai_generated']);

export const courses = pgTable('courses', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  difficulty: courseDifficultyEnum('difficulty').notNull().default('intermediate'),
  status: courseStatusEnum('status').notNull().default('draft'),
  estimatedDurationMinutes: integer('estimated_duration_minutes'),
  thumbnailUrl: varchar('thumbnail_url', { length: 1024 }),
  tags: jsonb('tags').default('[]'),
  prerequisites: jsonb('prerequisites').default('[]'),
  skillsTargeted: jsonb('skills_targeted').default('[]'),
  isAiGenerated: boolean('is_ai_generated').default(false),
  createdBy: uuid('created_by'),
  enrollmentCount: integer('enrollment_count').default(0),
  averageRating: real('average_rating'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const courseModules = pgTable('course_modules', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  orderIndex: integer('order_index').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const lessons = pgTable('lessons', {
  id: uuid('id').defaultRandom().primaryKey(),
  moduleId: uuid('module_id').notNull().references(() => courseModules.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'),
  lessonType: lessonTypeEnum('lesson_type').notNull().default('text'),
  orderIndex: integer('order_index').notNull(),
  durationMinutes: integer('duration_minutes'),
  exercise: jsonb('exercise'), // {type, prompt, options?, correctAnswer?, explanation}
  mediaUrl: varchar('media_url', { length: 1024 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const enrollments = pgTable('enrollments', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  userId: uuid('user_id').notNull(),
  status: enrollmentStatusEnum('status').notNull().default('enrolled'),
  progressPercentage: integer('progress_percentage').default(0),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  lastAccessedAt: timestamp('last_accessed_at'),
  rating: real('rating'),
  feedback: text('feedback'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const lessonProgress = pgTable('lesson_progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  enrollmentId: uuid('enrollment_id').notNull().references(() => enrollments.id, { onDelete: 'cascade' }),
  lessonId: uuid('lesson_id').notNull().references(() => lessons.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  userId: uuid('user_id').notNull(),
  isCompleted: boolean('is_completed').default(false),
  score: real('score'),
  timeSpentMinutes: integer('time_spent_minutes').default(0),
  exerciseResponse: jsonb('exercise_response'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const learningPaths = pgTable('learning_paths', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  courseIds: jsonb('course_ids').notNull().default('[]'),
  targetRole: varchar('target_role', { length: 255 }),
  targetSkills: jsonb('target_skills').default('[]'),
  estimatedDurationHours: integer('estimated_duration_hours'),
  isActive: boolean('is_active').default(true),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const certificates = pgTable('certificates', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  userId: uuid('user_id').notNull(),
  courseId: uuid('course_id').references(() => courses.id),
  learningPathId: uuid('learning_path_id').references(() => learningPaths.id),
  title: varchar('title', { length: 255 }).notNull(),
  issuedAt: timestamp('issued_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
  certificateUrl: varchar('certificate_url', { length: 1024 }),
});

// Relations
export const coursesRelations = relations(courses, ({ many }) => ({
  modules: many(courseModules),
  enrollments: many(enrollments),
}));

export const courseModulesRelations = relations(courseModules, ({ one, many }) => ({
  course: one(courses, { fields: [courseModules.courseId], references: [courses.id] }),
  lessons: many(lessons),
}));

export const enrollmentsRelations = relations(enrollments, ({ one, many }) => ({
  course: one(courses, { fields: [enrollments.courseId], references: [courses.id] }),
  progress: many(lessonProgress),
}));
