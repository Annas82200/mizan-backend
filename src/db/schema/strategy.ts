import { pgTable, text, integer, timestamp, boolean, jsonb, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants, users } from './core';

// ============================================================================
// STRATEGY & STRUCTURE SYSTEM
// ============================================================================

export const organizationStructure = pgTable('organization_structure', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  structureData: jsonb('structure_data').notNull(), // CSV parsed data
  uploadedBy: uuid('uploaded_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const companyStrategies = pgTable('company_strategies', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  vision: text('vision'),
  mission: text('mission'),
  values: jsonb('values'), // Array of company values
  objectives: jsonb('objectives'), // Strategic objectives
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const organizationStructureRelations = relations(organizationStructure, ({ one }) => ({
  tenant: one(tenants, {
    fields: [organizationStructure.tenantId],
    references: [tenants.id],
  }),
  uploadedByUser: one(users, {
    fields: [organizationStructure.uploadedBy],
    references: [users.id],
  }),
}));

export const companyStrategiesRelations = relations(companyStrategies, ({ one }) => ({
  tenant: one(tenants, {
    fields: [companyStrategies.tenantId],
    references: [tenants.id],
  }),
}));

