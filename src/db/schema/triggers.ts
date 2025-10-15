// db/schema/triggers.ts
import { pgTable, text, timestamp, integer, boolean, jsonb, uuid } from 'drizzle-orm/pg-core';

export const triggers = pgTable('triggers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),

  // Trigger definition
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull(), // event_based, threshold_based, scheduled

  // Trigger conditions
  sourceModule: text('source_module').notNull(), // performance, lxp, hiring, culture, etc.
  eventType: text('event_type').notNull(), // skill_gap_detected, performance_decline, etc.
  conditions: jsonb('conditions'),

  // Target action
  targetModule: text('target_module').notNull(), // lxp, hiring, performance, etc.
  action: text('action').notNull(), // create_learning_path, initiate_hiring, etc.
  actionConfig: jsonb('action_config'),

  // Status
  isActive: boolean('is_active').default(true),
  priority: integer('priority').default(5), // 1-10

  // Execution tracking
  lastTriggeredAt: timestamp('last_triggered_at'),
  triggerCount: integer('trigger_count').default(0),
  successCount: integer('success_count').default(0),
  failureCount: integer('failure_count').default(0),

  // Metadata
  metadata: jsonb('metadata'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: text('created_by')
});

export const triggerExecutions = pgTable('trigger_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  triggerId: text('trigger_id').notNull(),
  tenantId: text('tenant_id').notNull(),

  // Execution details
  status: text('status').notNull(), // pending, running, completed, failed
  inputData: jsonb('input_data'),
  outputData: jsonb('output_data'),

  // Results
  errorMessage: text('error_message'),
  executionTime: integer('execution_time'), // in milliseconds

  // Timestamps
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at')
});
