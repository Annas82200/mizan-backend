// Temporary schema file for tables that are referenced but not yet fully implemented
// TODO: Move these to appropriate schema files once implemented

import { pgTable, text, timestamp, jsonb, uuid, integer, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users, tenants } from './core.js';

// Sessions table for authentication
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  tenantId: text('tenant_id').notNull(),
  token: text('token').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  metadata: jsonb('metadata'),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id]
  }),
  tenant: one(tenants, {
    fields: [sessions.tenantId],
    references: [tenants.id]
  })
}));

// Consulting-related tables
export const consultingRequests = pgTable('consulting_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  requestType: text('request_type').notNull(),
  status: text('status').notNull().default('pending'),
  description: text('description'),
  assignedTo: text('assigned_to'), // Consultant ID
  notes: text('notes'), // Admin notes
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const consultants = pgTable('consultants', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  name: text('name').notNull(),
  expertise: jsonb('expertise'),
  status: text('status').notNull().default('active'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Legacy/Old LXP tables (may need migration)
export const assessments = pgTable('assessments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  employeeId: text('employee_id').notNull(),
  assessmentType: text('assessment_type').notNull(),
  results: jsonb('results'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const learningExperiences = pgTable('learning_experiences', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  employeeId: text('employee_id').notNull(),
  experienceType: text('experience_type').notNull(),
  data: jsonb('data'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const learningAssignments = pgTable('learning_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  employeeId: text('employee_id').notNull(),
  assignmentType: text('assignment_type').notNull(),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const actionModules = pgTable('action_modules', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  moduleType: text('module_type').notNull(),
  config: jsonb('config'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const orgSnapshots = pgTable('org_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  snapshotData: jsonb('snapshot_data'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Skills-related tables
export const skillsTaxonomies = pgTable('skills_taxonomies', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  skillName: text('skill_name').notNull(),
  category: text('category'),
  taxonomy: jsonb('taxonomy'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const employeeSkills = pgTable('employee_skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  employeeId: text('employee_id').notNull(),
  skillId: text('skill_id').notNull(),
  proficiencyLevel: integer('proficiency_level'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// skillsReports moved to db/schema/skills.ts

// Benchmarking tables
export const industryBenchmarks = pgTable('industry_benchmarks', {
  id: uuid('id').primaryKey().defaultRandom(),
  industry: text('industry').notNull(),
  metricType: text('metric_type').notNull(),
  value: jsonb('value'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tenantMetrics = pgTable('tenant_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  metricType: text('metric_type').notNull(),
  value: jsonb('value'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Culture tables
export const cultureFrameworks = pgTable('culture_frameworks', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  frameworkName: text('framework_name').notNull(),
  config: jsonb('config'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Talent/Performance tables
export const talentProfiles = pgTable('talent_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  employeeId: text('employee_id').notNull(),
  profileData: jsonb('profile_data'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const learningProgress = pgTable('learning_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  employeeId: text('employee_id').notNull(),
  courseId: text('course_id'),
  progress: integer('progress').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
