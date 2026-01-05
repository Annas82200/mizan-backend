"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.consultantsRelations = exports.consultingRequestsRelations = exports.consultants = exports.consultingRequests = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const core_1 = require("./core");
// ============================================================================
// CONSULTING & PROFESSIONAL SERVICES
// ============================================================================
exports.consultingRequests = (0, pg_core_1.pgTable)('consulting_requests', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    requestType: (0, pg_core_1.text)('request_type').notNull(), // demo, implementation, training, strategy
    status: (0, pg_core_1.text)('status').notNull().default('pending'), // pending, in_progress, completed, rejected
    description: (0, pg_core_1.text)('description'),
    assignedTo: (0, pg_core_1.text)('assigned_to'), // Consultant ID
    notes: (0, pg_core_1.text)('notes'), // Admin/consultant notes
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
exports.consultants = (0, pg_core_1.pgTable)('consultants', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    name: (0, pg_core_1.text)('name').notNull(),
    email: (0, pg_core_1.text)('email').notNull(),
    expertise: (0, pg_core_1.jsonb)('expertise').$type(), // Areas of expertise
    bio: (0, pg_core_1.text)('bio'),
    status: (0, pg_core_1.text)('status').notNull().default('active'), // active, inactive, on_leave
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    availabilitySchedule: (0, pg_core_1.jsonb)('availability_schedule'), // Weekly availability
    hourlyRate: (0, pg_core_1.text)('hourly_rate'), // Stored as string for flexibility
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
// Relations
exports.consultingRequestsRelations = (0, drizzle_orm_1.relations)(exports.consultingRequests, ({ one }) => ({
    tenant: one(core_1.tenants, {
        fields: [exports.consultingRequests.tenantId],
        references: [core_1.tenants.id]
    }),
    assignedConsultant: one(exports.consultants, {
        fields: [exports.consultingRequests.assignedTo],
        references: [exports.consultants.id]
    })
}));
exports.consultantsRelations = (0, drizzle_orm_1.relations)(exports.consultants, ({ one, many }) => ({
    tenant: one(core_1.tenants, {
        fields: [exports.consultants.tenantId],
        references: [core_1.tenants.id]
    }),
    requests: many(exports.consultingRequests)
}));
//# sourceMappingURL=consulting.js.map