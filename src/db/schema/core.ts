/**
 * Core Entity Tables — Employees, Departments, Positions, Compensation
 *
 * These are the destination tables for HRIS sync data.
 * Every module reads from these tables as the single source of truth.
 */

import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, real, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const employeeStatusEnum = pgEnum('employee_status', ['active', 'inactive', 'terminated', 'on_leave']);

export const employees = pgTable('employees', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  externalId: varchar('external_id', { length: 255 }), // HRIS ID for sync matching
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  departmentId: uuid('department_id'),
  positionId: uuid('position_id'),
  managerId: uuid('manager_id'),
  status: employeeStatusEnum('status').notNull().default('active'),
  hireDate: timestamp('hire_date'),
  location: varchar('location', { length: 255 }),
  phoneNumber: varchar('phone_number', { length: 50 }),
  avatarUrl: varchar('avatar_url', { length: 1024 }),
  metadata: jsonb('metadata').default('{}'),
  lastSyncedAt: timestamp('last_synced_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const departments = pgTable('departments', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  externalId: varchar('external_id', { length: 255 }),
  name: varchar('name', { length: 255 }).notNull(),
  parentId: uuid('parent_id'),
  headId: uuid('head_id'),
  costCenter: varchar('cost_center', { length: 100 }),
  metadata: jsonb('metadata').default('{}'),
  lastSyncedAt: timestamp('last_synced_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const positions = pgTable('positions', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  externalId: varchar('external_id', { length: 255 }),
  title: varchar('title', { length: 255 }).notNull(),
  departmentId: uuid('department_id'),
  level: varchar('level', { length: 100 }),
  jobFamily: varchar('job_family', { length: 255 }),
  isVacant: boolean('is_vacant').default(false),
  metadata: jsonb('metadata').default('{}'),
  lastSyncedAt: timestamp('last_synced_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const compensation = pgTable('compensation', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  baseSalary: real('base_salary'),
  currency: varchar('currency', { length: 3 }).default('USD'),
  payFrequency: varchar('pay_frequency', { length: 50 }),
  effectiveDate: timestamp('effective_date'),
  metadata: jsonb('metadata').default('{}'),
  lastSyncedAt: timestamp('last_synced_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const employeesRelations = relations(employees, ({ one, many }) => ({
  department: one(departments, { fields: [employees.departmentId], references: [departments.id] }),
  compensation: many(compensation),
}));

export const departmentsRelations = relations(departments, ({ many }) => ({
  employees: many(employees),
  positions: many(positions),
}));
