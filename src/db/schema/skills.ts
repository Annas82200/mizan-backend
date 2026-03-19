/**
 * Skills Schema — Frameworks, assessments, employee profiles, gap analysis
 */

import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, integer, real, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const proficiencyLevelEnum = pgEnum('proficiency_level', ['novice', 'beginner', 'intermediate', 'advanced', 'expert']);
export const assessmentStatusEnum = pgEnum('skill_assessment_status', ['pending', 'in_progress', 'completed']);

export const skillFrameworks = pgTable('skill_frameworks', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  categories: jsonb('categories').notNull().default('[]'), // [{name, description}]
  levels: jsonb('levels').notNull().default('["novice","beginner","intermediate","advanced","expert"]'),
  isDefault: boolean('is_default').default(false),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const skills = pgTable('skills', {
  id: uuid('id').defaultRandom().primaryKey(),
  frameworkId: uuid('framework_id').notNull().references(() => skillFrameworks.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }),
  description: text('description'),
  isCore: boolean('is_core').default(false),
  marketDemand: varchar('market_demand', { length: 50 }), // low, medium, high, critical
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const employeeSkills = pgTable('employee_skills', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  employeeId: uuid('employee_id').notNull(),
  skillId: uuid('skill_id').notNull().references(() => skills.id, { onDelete: 'cascade' }),
  currentLevel: proficiencyLevelEnum('current_level').notNull(),
  targetLevel: proficiencyLevelEnum('target_level'),
  verifiedBy: uuid('verified_by'),
  verifiedAt: timestamp('verified_at'),
  lastAssessedAt: timestamp('last_assessed_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const skillAssessments = pgTable('skill_assessments', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  employeeId: uuid('employee_id').notNull(),
  frameworkId: uuid('framework_id').references(() => skillFrameworks.id),
  status: assessmentStatusEnum('status').notNull().default('pending'),
  assessorId: uuid('assessor_id'),
  assessmentType: varchar('assessment_type', { length: 50 }).notNull(), // self, manager, peer, ai
  results: jsonb('results').default('[]'), // [{skillId, rating, evidence}]
  overallScore: real('overall_score'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const skillGapAnalyses = pgTable('skill_gap_analyses', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  scope: varchar('scope', { length: 50 }).notNull(), // employee, team, department, organization
  scopeId: uuid('scope_id'), // employeeId, departmentId, etc.
  gaps: jsonb('gaps').notNull(), // [{skillId, skillName, currentAvg, targetAvg, gap, priority}]
  recommendations: jsonb('recommendations').default('[]'),
  analysisDate: timestamp('analysis_date').defaultNow().notNull(),
  generatedBy: varchar('generated_by', { length: 50 }).default('system'), // system, ai, manual
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const skillFrameworksRelations = relations(skillFrameworks, ({ many }) => ({
  skills: many(skills),
  assessments: many(skillAssessments),
}));

export const skillsRelations = relations(skills, ({ one, many }) => ({
  framework: one(skillFrameworks, { fields: [skills.frameworkId], references: [skillFrameworks.id] }),
  employeeSkills: many(employeeSkills),
}));
