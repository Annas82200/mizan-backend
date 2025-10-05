import { pgTable, text, integer, timestamp, boolean, jsonb, decimal, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// CORE TENANT & USER MANAGEMENT
// ============================================================================

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  domain: text('domain').unique(),
  plan: text('plan').notNull().default('free'), // free, pro, proplus, enterprise
  status: text('status').notNull().default('active'), // active, suspended, cancelled
  industry: text('industry'),
  employeeCount: integer('employee_count'),

  // Strategic Information
  vision: text('vision'),           // Company vision statement
  mission: text('mission'),         // Company mission statement
  strategy: text('strategy'),       // Strategy statement
  values: jsonb('values').$type<string[]>(), // Company values array

  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  primaryContact: text('primary_contact'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('employee'), // employee, manager, admin, superadmin
  title: text('title'),
  departmentId: text('department_id'),
  managerId: text('manager_id'),
  isActive: boolean('is_active').default(true),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const departments = pgTable('departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  managerId: text('manager_id'),
  parentDepartmentId: text('parent_department_id'),
  budget: decimal('budget'),
  headCount: integer('head_count'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Alias for tenants - some routes use 'companies'
export const companies = tenants;

// Employee profiles
export const employeeProfiles = pgTable('employee_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  tenantId: text('tenant_id').notNull(),
  bio: text('bio'),
  skills: jsonb('skills').$type<string[]>(),
  interests: jsonb('interests').$type<string[]>(),
  certifications: jsonb('certifications'),
  profilePicture: text('profile_picture'),
  linkedinUrl: text('linkedin_url'),
  twitterUrl: text('twitter_url'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Core analysis tables
export const analyses = pgTable('analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  type: text('type').notNull(), // structure, culture, skills, performance, comprehensive
  status: text('status').notNull().default('pending'), // pending, processing, completed, failed
  results: jsonb('results'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const orgInputs = pgTable('org_inputs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const structureAnalysisResults = pgTable('structure_analysis_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  analysisId: text('analysis_id').notNull(),
  results: jsonb('results').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const orgStructures = pgTable('org_structures', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id'),
  submittedBy: text('submitted_by'),
  rawText: text('raw_text').notNull(),
  parsedData: jsonb('parsed_data'),
  analysisResult: jsonb('analysis_result'),
  isPublic: boolean('is_public').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  departments: many(departments),
  analyses: many(analyses),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  manager: one(users, {
    fields: [users.managerId],
    references: [users.id],
  }),
}));

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [departments.tenantId],
    references: [tenants.id],
  }),
  manager: one(users, {
    fields: [departments.managerId],
    references: [users.id],
  }),
  parentDepartment: one(departments, {
    fields: [departments.parentDepartmentId],
    references: [departments.id],
  }),
  users: many(users),
}));