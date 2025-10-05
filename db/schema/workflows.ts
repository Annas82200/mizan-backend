// db/schema/workflows.ts
import { pgTable, text, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

export const automatedFlows = pgTable('automated_flows', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  companyId: text('company_id'),

  // Flow definition
  name: text('name').notNull(),
  description: text('description'),
  flowType: text('flow_type').notNull(), // trigger_based, scheduled, manual

  // Trigger configuration
  triggerType: text('trigger_type'), // event, schedule, webhook
  triggerConfig: jsonb('trigger_config'),

  // Flow steps
  steps: jsonb('steps').$type<Array<{
    id: string;
    type: string;
    config: Record<string, any>;
    order: number;
  }>>(),

  // Conditions
  conditions: jsonb('conditions'),

  // Status
  isActive: boolean('is_active').default(true),
  status: text('status').notNull(), // active, paused, disabled

  // Metadata
  metadata: jsonb('metadata'),
  tags: jsonb('tags').$type<string[]>(),

  // Stats
  totalExecutions: integer('total_executions').default(0),
  successfulExecutions: integer('successful_executions').default(0),
  failedExecutions: integer('failed_executions').default(0),

  // Last execution
  lastExecutedAt: timestamp('last_executed_at'),
  lastExecutionStatus: text('last_execution_status'),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),

  // Created by
  createdBy: text('created_by')
});

export const flowExecutions = pgTable('flow_executions', {
  id: text('id').primaryKey(),
  flowId: text('flow_id').notNull(),
  tenantId: text('tenant_id').notNull(),

  // Execution details
  status: text('status').notNull(), // pending, running, completed, failed
  triggerType: text('trigger_type'), // manual, scheduled, event
  triggeredBy: text('triggered_by'),

  // Input/Output (context is stored as inputData, updated as outputData)
  inputData: jsonb('input_data'),
  outputData: jsonb('output_data'),
  context: jsonb('context'), // Current execution context

  // Step tracking
  currentStep: text('current_step'), // Changed to text to store step ID
  completedSteps: jsonb('completed_steps').$type<string[]>(),
  failedStep: text('failed_step'),

  // Execution metadata
  executionTime: integer('execution_time'), // in milliseconds
  error: text('error'), // Error message
  errorMessage: text('error_message'),
  errorStack: text('error_stack'),
  logs: jsonb('logs').$type<Array<{
    timestamp: string;
    level: string;
    message: string;
    data?: any;
  }>>(),

  // Timestamps
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  updatedAt: timestamp('updated_at'),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

export const flowTemplates = pgTable('flow_templates', {
  id: text('id').primaryKey(),

  // Template details
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'), // hr, analytics, notifications, integrations

  // Template definition
  flowDefinition: jsonb('flow_definition'),

  // Visibility
  isPublic: boolean('is_public').default(false),
  createdBy: text('created_by'),

  // Usage stats
  usageCount: integer('usage_count').default(0),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});
