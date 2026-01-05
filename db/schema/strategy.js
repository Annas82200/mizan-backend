"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyStrategiesRelations = exports.organizationStructureRelations = exports.companyStrategies = exports.organizationStructure = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const core_1 = require("./core");
// ============================================================================
// STRATEGY & STRUCTURE SYSTEM
// ============================================================================
exports.organizationStructure = (0, pg_core_1.pgTable)('organization_structure', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    structureData: (0, pg_core_1.jsonb)('structure_data').notNull(), // CSV parsed data
    uploadedBy: (0, pg_core_1.text)('uploaded_by'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.companyStrategies = (0, pg_core_1.pgTable)('company_strategies', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    vision: (0, pg_core_1.text)('vision'),
    mission: (0, pg_core_1.text)('mission'),
    values: (0, pg_core_1.jsonb)('values'), // Array of company values
    objectives: (0, pg_core_1.jsonb)('objectives'), // Strategic objectives
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
// Relations
exports.organizationStructureRelations = (0, drizzle_orm_1.relations)(exports.organizationStructure, ({ one }) => ({
    tenant: one(core_1.tenants, {
        fields: [exports.organizationStructure.tenantId],
        references: [core_1.tenants.id],
    }),
    uploadedByUser: one(core_1.users, {
        fields: [exports.organizationStructure.uploadedBy],
        references: [core_1.users.id],
    }),
}));
exports.companyStrategiesRelations = (0, drizzle_orm_1.relations)(exports.companyStrategies, ({ one }) => ({
    tenant: one(core_1.tenants, {
        fields: [exports.companyStrategies.tenantId],
        references: [core_1.tenants.id],
    }),
}));
//# sourceMappingURL=strategy.js.map