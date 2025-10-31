import { pgTable, text, timestamp, jsonb, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './core';

export const agentAnalyses = pgTable('agent_analyses', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
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

