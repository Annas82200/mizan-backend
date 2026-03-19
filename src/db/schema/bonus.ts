import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, integer, real, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const bonusCycleStatusEnum = pgEnum('bonus_cycle_status', ['planning', 'active', 'calculation', 'review', 'approved', 'distributed', 'closed']);
export const allocationStatusEnum = pgEnum('allocation_status', ['draft', 'pending_approval', 'approved', 'rejected', 'distributed']);

export const bonusCycles = pgTable('bonus_cycles', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  fiscalYear: integer('fiscal_year').notNull(),
  quarter: integer('quarter'), // null for annual
  status: bonusCycleStatusEnum('status').notNull().default('planning'),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  totalBudget: real('total_budget'),
  currency: varchar('currency', { length: 3 }).default('USD'),
  distributionDate: timestamp('distribution_date'),
  createdBy: uuid('created_by').notNull(),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const bonusPools = pgTable('bonus_pools', {
  id: uuid('id').defaultRandom().primaryKey(),
  cycleId: uuid('cycle_id').notNull().references(() => bonusCycles.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  departmentId: uuid('department_id'),
  budgetAmount: real('budget_amount').notNull(),
  allocatedAmount: real('allocated_amount').default(0),
  remainingAmount: real('remaining_amount'),
  employeeCount: integer('employee_count').default(0),
  metadata: jsonb('metadata').default('{}'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const bonusCriteria = pgTable('bonus_criteria', {
  id: uuid('id').defaultRandom().primaryKey(),
  cycleId: uuid('cycle_id').notNull().references(() => bonusCycles.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  weight: real('weight').notNull(), // 0-1, all criteria weights should sum to 1
  sourceModule: varchar('source_module', { length: 100 }).notNull(), // performance, skills, culture, tenure, custom
  calculationMethod: varchar('calculation_method', { length: 100 }).notNull(), // linear, tiered, threshold, custom
  calculationConfig: jsonb('calculation_config').notNull(), // {tiers?, threshold?, formula?, min?, max?}
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const bonusAllocations = pgTable('bonus_allocations', {
  id: uuid('id').defaultRandom().primaryKey(),
  cycleId: uuid('cycle_id').notNull().references(() => bonusCycles.id, { onDelete: 'cascade' }),
  poolId: uuid('pool_id').references(() => bonusPools.id),
  tenantId: uuid('tenant_id').notNull(),
  employeeId: uuid('employee_id').notNull(),
  baseSalary: real('base_salary'),
  bonusPercentage: real('bonus_percentage'),
  calculatedAmount: real('calculated_amount').notNull(),
  adjustedAmount: real('adjusted_amount'),
  finalAmount: real('final_amount'),
  // Score breakdown per criterion
  criteriaScores: jsonb('criteria_scores').default('[]'), // [{criteriaId, score, weightedScore}]
  overallScore: real('overall_score'),
  status: allocationStatusEnum('status').notNull().default('draft'),
  managerAdjustment: real('manager_adjustment'),
  managerNotes: text('manager_notes'),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at'),
  distributedAt: timestamp('distributed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const bonusCyclesRelations = relations(bonusCycles, ({ many }) => ({
  pools: many(bonusPools),
  criteria: many(bonusCriteria),
  allocations: many(bonusAllocations),
}));

export const bonusPoolsRelations = relations(bonusPools, ({ one, many }) => ({
  cycle: one(bonusCycles, { fields: [bonusPools.cycleId], references: [bonusCycles.id] }),
  allocations: many(bonusAllocations),
}));
