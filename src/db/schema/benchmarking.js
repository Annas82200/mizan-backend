"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantMetricsRelations = exports.tenantMetrics = exports.industryBenchmarks = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const core_1 = require("./core");
// ============================================================================
// BENCHMARKING & METRICS
// ============================================================================
exports.industryBenchmarks = (0, pg_core_1.pgTable)('industry_benchmarks', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    industry: (0, pg_core_1.text)('industry').notNull(),
    metricType: (0, pg_core_1.text)('metric_type').notNull(), // culture_score, engagement, turnover, etc
    value: (0, pg_core_1.jsonb)('value'),
    source: (0, pg_core_1.text)('source'), // Data source
    dataPoints: (0, pg_core_1.jsonb)('data_points'), // Array of data points
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
exports.tenantMetrics = (0, pg_core_1.pgTable)('tenant_metrics', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull().references(() => core_1.tenants.id, { onDelete: 'cascade' }),
    metricType: (0, pg_core_1.text)('metric_type').notNull(), // Same types as industry benchmarks
    value: (0, pg_core_1.jsonb)('value'),
    period: (0, pg_core_1.text)('period'), // monthly, quarterly, annually
    periodStart: (0, pg_core_1.timestamp)('period_start'),
    periodEnd: (0, pg_core_1.timestamp)('period_end'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
// Relations
exports.tenantMetricsRelations = (0, drizzle_orm_1.relations)(exports.tenantMetrics, ({ one }) => ({
    tenant: one(core_1.tenants, {
        fields: [exports.tenantMetrics.tenantId],
        references: [core_1.tenants.id]
    })
}));
//# sourceMappingURL=benchmarking.js.map