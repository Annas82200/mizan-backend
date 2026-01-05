"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerExecutions = exports.triggers = void 0;
// db/schema/triggers.ts
const pg_core_1 = require("drizzle-orm/pg-core");
exports.triggers = (0, pg_core_1.pgTable)('triggers', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    // Trigger definition
    name: (0, pg_core_1.text)('name').notNull(),
    description: (0, pg_core_1.text)('description'),
    type: (0, pg_core_1.text)('type').notNull(), // event_based, threshold_based, scheduled
    // Trigger conditions
    sourceModule: (0, pg_core_1.text)('source_module').notNull(), // performance, lxp, hiring, culture, etc.
    eventType: (0, pg_core_1.text)('event_type').notNull(), // skill_gap_detected, performance_decline, etc.
    conditions: (0, pg_core_1.jsonb)('conditions'),
    // Target action
    targetModule: (0, pg_core_1.text)('target_module').notNull(), // lxp, hiring, performance, etc.
    action: (0, pg_core_1.text)('action').notNull(), // create_learning_path, initiate_hiring, etc.
    actionConfig: (0, pg_core_1.jsonb)('action_config'),
    // Status
    isActive: (0, pg_core_1.boolean)('is_active').default(true),
    priority: (0, pg_core_1.integer)('priority').default(5), // 1-10
    // Execution tracking
    lastTriggeredAt: (0, pg_core_1.timestamp)('last_triggered_at'),
    triggerCount: (0, pg_core_1.integer)('trigger_count').default(0),
    successCount: (0, pg_core_1.integer)('success_count').default(0),
    failureCount: (0, pg_core_1.integer)('failure_count').default(0),
    // Metadata
    metadata: (0, pg_core_1.jsonb)('metadata'),
    // Timestamps
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
    createdBy: (0, pg_core_1.text)('created_by')
});
exports.triggerExecutions = (0, pg_core_1.pgTable)('trigger_executions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    triggerId: (0, pg_core_1.uuid)('trigger_id').notNull(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    // Execution details
    status: (0, pg_core_1.text)('status').notNull(), // pending, running, completed, failed
    inputData: (0, pg_core_1.jsonb)('input_data'),
    outputData: (0, pg_core_1.jsonb)('output_data'),
    // Results
    errorMessage: (0, pg_core_1.text)('error_message'),
    executionTime: (0, pg_core_1.integer)('execution_time'), // in milliseconds
    // Timestamps
    startedAt: (0, pg_core_1.timestamp)('started_at').defaultNow().notNull(),
    completedAt: (0, pg_core_1.timestamp)('completed_at')
});
//# sourceMappingURL=triggers.js.map