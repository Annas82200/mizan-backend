import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const connectionTypeEnum = pgEnum('connection_type', ['rest', 'soap', 'webhook', 'sftp']);
export const conflictStrategyEnum = pgEnum('conflict_strategy', ['hris_wins', 'mizan_wins', 'manual_review', 'newest_wins']);
export const connectorStatusEnum = pgEnum('connector_status', ['active', 'paused', 'error', 'configuring']);
export const syncTypeEnum = pgEnum('sync_type', ['full', 'incremental', 'webhook_triggered']);
export const syncStatusEnum = pgEnum('sync_status', ['running', 'completed', 'failed', 'cancelled']);
export const conflictStatusEnum = pgEnum('conflict_status', ['pending', 'resolved_hris', 'resolved_mizan', 'resolved_manual', 'dismissed']);

export const connectorConfigs = pgTable('connector_configs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  hrisType: varchar('hris_type', { length: 100 }).notNull(),
  connectionType: connectionTypeEnum('connection_type').notNull(),
  baseUrl: varchar('base_url', { length: 1024 }),
  authConfig: jsonb('auth_config').notNull(), // encrypted credentials
  fieldMappings: jsonb('field_mappings').notNull().default('{}'),
  syncSchedule: jsonb('sync_schedule').notNull().default('{"fullSync": "0 2 * * *", "incrementalSync": "*/15 * * * *", "realTimeWebhook": false}'),
  transformRules: jsonb('transform_rules').default('[]'),
  conflictResolution: conflictStrategyEnum('conflict_resolution').notNull().default('hris_wins'),
  status: connectorStatusEnum('status').notNull().default('configuring'),
  lastSyncAt: timestamp('last_sync_at'),
  lastSyncStatus: syncStatusEnum('last_sync_status'),
  errorMessage: text('error_message'),
  metadata: jsonb('metadata').default('{}'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const syncLogs = pgTable('sync_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  connectorId: uuid('connector_id').notNull().references(() => connectorConfigs.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  syncType: syncTypeEnum('sync_type').notNull(),
  status: syncStatusEnum('status').notNull().default('running'),
  recordsProcessed: integer('records_processed').default(0),
  recordsCreated: integer('records_created').default(0),
  recordsUpdated: integer('records_updated').default(0),
  recordsFailed: integer('records_failed').default(0),
  conflictsDetected: integer('conflicts_detected').default(0),
  errorDetails: jsonb('error_details'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  durationMs: integer('duration_ms'),
});

export const fieldMappings = pgTable('field_mappings', {
  id: uuid('id').defaultRandom().primaryKey(),
  connectorId: uuid('connector_id').notNull().references(() => connectorConfigs.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  entityType: varchar('entity_type', { length: 100 }).notNull(), // employees, departments, positions, compensation
  sourceField: varchar('source_field', { length: 255 }).notNull(),
  mizanField: varchar('mizan_field', { length: 255 }).notNull(),
  transformFunction: varchar('transform_function', { length: 255 }), // optional transform: uppercase, date_format, etc.
  isRequired: boolean('is_required').default(false),
  defaultValue: text('default_value'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const syncConflicts = pgTable('sync_conflicts', {
  id: uuid('id').defaultRandom().primaryKey(),
  syncLogId: uuid('sync_log_id').notNull().references(() => syncLogs.id, { onDelete: 'cascade' }),
  connectorId: uuid('connector_id').notNull().references(() => connectorConfigs.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  entityId: varchar('entity_id', { length: 255 }).notNull(),
  fieldName: varchar('field_name', { length: 255 }).notNull(),
  hrisValue: text('hris_value'),
  mizanValue: text('mizan_value'),
  status: conflictStatusEnum('status').notNull().default('pending'),
  resolvedBy: uuid('resolved_by'),
  resolvedAt: timestamp('resolved_at'),
  resolution: text('resolution'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  connectorId: uuid('connector_id').notNull().references(() => connectorConfigs.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  payload: jsonb('payload').notNull(),
  processed: boolean('processed').default(false),
  processedAt: timestamp('processed_at'),
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0),
  receivedAt: timestamp('received_at').defaultNow().notNull(),
});

// Relations
export const connectorConfigsRelations = relations(connectorConfigs, ({ many }) => ({
  syncLogs: many(syncLogs),
  fieldMappings: many(fieldMappings),
  syncConflicts: many(syncConflicts),
  webhookEvents: many(webhookEvents),
}));

export const syncLogsRelations = relations(syncLogs, ({ one, many }) => ({
  connector: one(connectorConfigs, { fields: [syncLogs.connectorId], references: [connectorConfigs.id] }),
  conflicts: many(syncConflicts),
}));
