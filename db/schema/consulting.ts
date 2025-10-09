import { pgTable, text, timestamp, jsonb, uuid, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from './core.js';

// ============================================================================
// CONSULTING & PROFESSIONAL SERVICES
// ============================================================================

export const consultingRequests = pgTable('consulting_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  requestType: text('request_type').notNull(), // demo, implementation, training, strategy
  status: text('status').notNull().default('pending'), // pending, in_progress, completed, rejected
  description: text('description'),
  assignedTo: text('assigned_to'), // Consultant ID
  notes: text('notes'), // Admin/consultant notes
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const consultants = pgTable('consultants', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  expertise: jsonb('expertise').$type<string[]>(), // Areas of expertise
  bio: text('bio'),
  status: text('status').notNull().default('active'), // active, inactive, on_leave
  isActive: boolean('is_active').notNull().default(true),
  availabilitySchedule: jsonb('availability_schedule'), // Weekly availability
  hourlyRate: text('hourly_rate'), // Stored as string for flexibility
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const consultingRequestsRelations = relations(consultingRequests, ({ one }) => ({
  tenant: one(tenants, {
    fields: [consultingRequests.tenantId],
    references: [tenants.id]
  }),
  assignedConsultant: one(consultants, {
    fields: [consultingRequests.assignedTo],
    references: [consultants.id]
  })
}));

export const consultantsRelations = relations(consultants, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [consultants.tenantId],
    references: [tenants.id]
  }),
  requests: many(consultingRequests)
}));
