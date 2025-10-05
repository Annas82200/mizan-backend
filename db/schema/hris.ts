import { pgTable, text, timestamp, jsonb, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// HRIS Integrations
export const hrisIntegrations = pgTable('hris_integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  provider: text('provider').notNull(), // workday, bamboohr, successfactors, etc.
  config: jsonb('config'),
  status: text('status').notNull().default('pending_auth'), // pending_auth, active, inactive, error
  lastSyncAt: timestamp('last_sync_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// HRIS Sync Logs
export const hrisSyncLogs = pgTable('hris_sync_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  integrationId: text('integration_id').notNull(),
  status: text('status').notNull().default('in_progress'), // in_progress, completed, failed
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  recordsProcessed: jsonb('records_processed'),
  errorDetails: jsonb('error_details'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const hrisIntegrationsRelations = relations(hrisIntegrations, ({ many }) => ({
  syncLogs: many(hrisSyncLogs),
}));

export const hrisSyncLogsRelations = relations(hrisSyncLogs, ({ one }) => ({
  integration: one(hrisIntegrations, {
    fields: [hrisSyncLogs.integrationId],
    references: [hrisIntegrations.id],
  }),
}));
