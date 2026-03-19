import { pgTable, uuid, varchar, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id'),
  userId: uuid('user_id'),
  userEmail: varchar('user_email', { length: 255 }),
  userRole: varchar('user_role', { length: 50 }),
  action: varchar('action', { length: 50 }).notNull(),
  resourceType: varchar('resource_type', { length: 100 }).notNull(),
  resourceId: varchar('resource_id', { length: 255 }),
  method: varchar('method', { length: 10 }).notNull(),
  path: varchar('path', { length: 1024 }).notNull(),
  statusCode: varchar('status_code', { length: 3 }),
  requestBodyHash: varchar('request_body_hash', { length: 64 }),
  changes: jsonb('changes'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  durationMs: varchar('duration_ms', { length: 10 }),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});
