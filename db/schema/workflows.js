"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flowTemplates = exports.flowExecutions = exports.automatedFlows = void 0;
// db/schema/workflows.ts
const pg_core_1 = require("drizzle-orm/pg-core");
exports.automatedFlows = (0, pg_core_1.pgTable)('automated_flows', {
    id: (0, pg_core_1.text)('id').primaryKey(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    companyId: (0, pg_core_1.text)('company_id'),
    // Flow definition
    name: (0, pg_core_1.text)('name').notNull(),
    description: (0, pg_core_1.text)('description'),
    flowType: (0, pg_core_1.text)('flow_type').notNull(), // trigger_based, scheduled, manual
    // Trigger configuration
    triggerType: (0, pg_core_1.text)('trigger_type'), // event, schedule, webhook
    triggerConfig: (0, pg_core_1.jsonb)('trigger_config'),
    // Flow steps
    steps: (0, pg_core_1.jsonb)('steps').$type(),
    // Conditions
    conditions: (0, pg_core_1.jsonb)('conditions'),
    // Status
    isActive: (0, pg_core_1.boolean)('is_active').default(true),
    status: (0, pg_core_1.text)('status').notNull(), // active, paused, disabled
    // Metadata
    metadata: (0, pg_core_1.jsonb)('metadata'),
    tags: (0, pg_core_1.jsonb)('tags').$type(),
    // Stats
    totalExecutions: (0, pg_core_1.integer)('total_executions').default(0),
    successfulExecutions: (0, pg_core_1.integer)('successful_executions').default(0),
    failedExecutions: (0, pg_core_1.integer)('failed_executions').default(0),
    // Last execution
    lastExecutedAt: (0, pg_core_1.timestamp)('last_executed_at'),
    lastExecutionStatus: (0, pg_core_1.text)('last_execution_status'),
    // Timestamps
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
    // Created by
    createdBy: (0, pg_core_1.text)('created_by')
});
exports.flowExecutions = (0, pg_core_1.pgTable)('flow_executions', {
    id: (0, pg_core_1.text)('id').primaryKey(),
    flowId: (0, pg_core_1.text)('flow_id').notNull(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    // Execution details
    status: (0, pg_core_1.text)('status').notNull(), // pending, running, completed, failed
    triggerType: (0, pg_core_1.text)('trigger_type'), // manual, scheduled, event
    triggeredBy: (0, pg_core_1.text)('triggered_by'),
    // Input/Output (context is stored as inputData, updated as outputData)
    inputData: (0, pg_core_1.jsonb)('input_data'),
    outputData: (0, pg_core_1.jsonb)('output_data'),
    context: (0, pg_core_1.jsonb)('context'), // Current execution context
    // Step tracking
    currentStep: (0, pg_core_1.text)('current_step'), // Changed to text to store step ID
    completedSteps: (0, pg_core_1.jsonb)('completed_steps').$type(),
    failedStep: (0, pg_core_1.text)('failed_step'),
    // Execution metadata
    executionTime: (0, pg_core_1.integer)('execution_time'), // in milliseconds
    error: (0, pg_core_1.text)('error'), // Error message
    errorMessage: (0, pg_core_1.text)('error_message'),
    errorStack: (0, pg_core_1.text)('error_stack'),
    logs: (0, pg_core_1.jsonb)('logs').$type(),
    // Timestamps
    startedAt: (0, pg_core_1.timestamp)('started_at').notNull().defaultNow(),
    completedAt: (0, pg_core_1.timestamp)('completed_at'),
    updatedAt: (0, pg_core_1.timestamp)('updated_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow()
});
exports.flowTemplates = (0, pg_core_1.pgTable)('flow_templates', {
    id: (0, pg_core_1.text)('id').primaryKey(),
    // Template details
    name: (0, pg_core_1.text)('name').notNull(),
    description: (0, pg_core_1.text)('description'),
    category: (0, pg_core_1.text)('category'), // hr, analytics, notifications, integrations
    // Template definition
    flowDefinition: (0, pg_core_1.jsonb)('flow_definition'),
    // Visibility
    isPublic: (0, pg_core_1.boolean)('is_public').default(false),
    createdBy: (0, pg_core_1.text)('created_by'),
    // Usage stats
    usageCount: (0, pg_core_1.integer)('usage_count').default(0),
    // Timestamps
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow()
});
//# sourceMappingURL=workflows.js.map