import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const moduleIdEnum = pgEnum('module_id', [
  'structure', 'culture', 'skills', 'performance', 'hiring',
  'onboarding', 'lxp', 'talent', 'bonus', 'engagement',
]);
export const approvalStatusEnum = pgEnum('approval_status', ['pending', 'approved', 'rejected', 'escalated']);

export const moduleConfigs = pgTable('module_configs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  moduleId: moduleIdEnum('module_id').notNull(),
  isEnabled: boolean('is_enabled').default(false),
  isConfigured: boolean('is_configured').default(false),
  configuredBy: uuid('configured_by'),
  configuredAt: timestamp('configured_at'),
  // Module-specific settings
  settings: jsonb('settings').notNull().default('{}'),
  // Feature flags within the module
  featureFlags: jsonb('feature_flags').default('{}'),
  // Display preferences
  displayOrder: integer('display_order').default(0),
  customLabel: varchar('custom_label', { length: 255 }),
  customIcon: varchar('custom_icon', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const moduleParameters = pgTable('module_parameters', {
  id: uuid('id').defaultRandom().primaryKey(),
  moduleConfigId: uuid('module_config_id').notNull().references(() => moduleConfigs.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  parameterKey: varchar('parameter_key', { length: 255 }).notNull(),
  parameterValue: jsonb('parameter_value').notNull(),
  parameterType: varchar('parameter_type', { length: 50 }).notNull(), // string, number, boolean, json, enum
  label: varchar('label', { length: 255 }),
  description: text('description'),
  validationRules: jsonb('validation_rules').default('{}'), // {min?, max?, options?, pattern?}
  isUserConfigurable: boolean('is_user_configurable').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const approvalWorkflows = pgTable('approval_workflows', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  moduleId: moduleIdEnum('module_id'),
  triggerEvent: varchar('trigger_event', { length: 255 }).notNull(), // goal_created, bonus_submitted, leave_requested, etc.
  steps: jsonb('steps').notNull(), // [{order, approverRole, approverIds?, autoApproveAfterDays?, conditions?}]
  isActive: boolean('is_active').default(true),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const approvalRequests = pgTable('approval_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  workflowId: uuid('workflow_id').notNull().references(() => approvalWorkflows.id),
  tenantId: uuid('tenant_id').notNull(),
  requesterId: uuid('requester_id').notNull(),
  entityType: varchar('entity_type', { length: 100 }).notNull(), // goal, bonus, leave, evaluation
  entityId: uuid('entity_id').notNull(),
  currentStep: integer('current_step').default(1),
  status: approvalStatusEnum('status').notNull().default('pending'),
  approvalHistory: jsonb('approval_history').default('[]'), // [{step, approverId, action, comment, timestamp}]
  metadata: jsonb('metadata').default('{}'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const moduleConfigsRelations = relations(moduleConfigs, ({ many }) => ({
  parameters: many(moduleParameters),
  workflows: many(approvalWorkflows),
}));

export const approvalWorkflowsRelations = relations(approvalWorkflows, ({ many }) => ({
  requests: many(approvalRequests),
}));
