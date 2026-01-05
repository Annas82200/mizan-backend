"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentAnalysesRelations = exports.agentAnalyses = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const core_1 = require("./core");
exports.agentAnalyses = (0, pg_core_1.pgTable)('agent_analyses', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    agentType: (0, pg_core_1.text)('agent_type').notNull(),
    results: (0, pg_core_1.jsonb)('results'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.agentAnalysesRelations = (0, drizzle_orm_1.relations)(exports.agentAnalyses, ({ one }) => ({
    tenant: one(core_1.tenants, {
        fields: [exports.agentAnalyses.tenantId],
        references: [core_1.tenants.id],
    }),
}));
//# sourceMappingURL=agents.js.map