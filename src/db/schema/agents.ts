import { pgTable, text, timestamp, jsonb, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './core.js';

export const agentAnalyses = pgTable('agent_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  agentType: text('agent_type').notNull(),
  results: jsonb('results'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const agentAnalysesRelations = relations(agentAnalyses, ({ one }) => ({
  tenant: one(tenants, {
    fields: [agentAnalyses.tenantId],
    references: [tenants.id],
  }),
}));

