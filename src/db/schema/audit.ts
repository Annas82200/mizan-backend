import { pgTable, text, timestamp, jsonb, uuid } from 'drizzle-orm/pg-core';
import { tenants, users } from './core';

/**
 * Audit Log Table
 *
 * Tracks all significant actions in the system for compliance and security
 * Provides full audit trail for framework changes, data access, and admin actions
 */
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'set null' }),

  // Action details
  action: text('action').notNull(), // e.g., 'framework.created', 'framework.updated', 'user.login', 'data.exported'
  resource: text('resource').notNull(), // e.g., 'framework', 'user', 'analysis', 'report'
  resourceId: uuid('resource_id'), // ID of the resource that was acted upon

  // Context and metadata
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(), // Additional context data

  // Result
  status: text('status').notNull(), // 'success', 'failure', 'partial'
  errorMessage: text('error_message'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Export for use in other modules
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
