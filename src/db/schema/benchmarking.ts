import { pgTable, text, timestamp, jsonb, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './core';

// ============================================================================
// BENCHMARKING & METRICS
// ============================================================================

export const industryBenchmarks = pgTable('industry_benchmarks', {
  id: uuid('id').primaryKey().defaultRandom(),
  industry: text('industry').notNull(),
  metricType: text('metric_type').notNull(), // culture_score, engagement, turnover, etc
  value: jsonb('value'),
  source: text('source'), // Data source
  dataPoints: jsonb('data_points'), // Array of data points
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tenantMetrics = pgTable('tenant_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  metricType: text('metric_type').notNull(), // Same types as industry benchmarks
  value: jsonb('value'),
  period: text('period'), // monthly, quarterly, annually
  periodStart: timestamp('period_start'),
  periodEnd: timestamp('period_end'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const tenantMetricsRelations = relations(tenantMetrics, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantMetrics.tenantId],
    references: [tenants.id]
  })
}));
