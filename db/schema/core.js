"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionsRelations = exports.departmentsRelations = exports.usersRelations = exports.tenantsRelations = exports.sessions = exports.frameworkConfig = exports.orgStructures = exports.structureAnalysisResults = exports.orgInputs = exports.analyses = exports.employeeProfiles = exports.companies = exports.departments = exports.users = exports.tenants = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
// ============================================================================
// CORE TENANT & USER MANAGEMENT
// ============================================================================
exports.tenants = (0, pg_core_1.pgTable)('tenants', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)('name').notNull(),
    domain: (0, pg_core_1.text)('domain').unique(),
    plan: (0, pg_core_1.text)('plan').notNull().default('free'), // free, pro, proplus, enterprise
    status: (0, pg_core_1.text)('status').notNull().default('active'), // active, suspended, cancelled
    industry: (0, pg_core_1.text)('industry'),
    employeeCount: (0, pg_core_1.integer)('employee_count'),
    // Strategic Information
    vision: (0, pg_core_1.text)('vision'), // Company vision statement
    mission: (0, pg_core_1.text)('mission'), // Company mission statement
    strategy: (0, pg_core_1.text)('strategy'), // Strategy statement
    values: (0, pg_core_1.jsonb)('values').$type(), // Company values array
    stripeCustomerId: (0, pg_core_1.text)('stripe_customer_id'),
    stripeSubscriptionId: (0, pg_core_1.text)('stripe_subscription_id'),
    primaryContact: (0, pg_core_1.text)('primary_contact'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    email: (0, pg_core_1.text)('email').notNull(),
    passwordHash: (0, pg_core_1.text)('password_hash').notNull(),
    name: (0, pg_core_1.text)('name').notNull(),
    role: (0, pg_core_1.text)('role').notNull().default('employee'), // employee, manager, admin, superadmin
    title: (0, pg_core_1.text)('title'),
    departmentId: (0, pg_core_1.uuid)('department_id'), // Changed from text to uuid to match departments.id type
    managerId: (0, pg_core_1.text)('manager_id'),
    isActive: (0, pg_core_1.boolean)('is_active').default(true),
    lastLoginAt: (0, pg_core_1.timestamp)('last_login_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
}, (table) => {
    return {
        emailIdx: (0, pg_core_1.uniqueIndex)('unique_email_per_tenant_idx').on(table.tenantId, table.email),
    };
});
exports.departments = (0, pg_core_1.pgTable)('departments', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    name: (0, pg_core_1.text)('name').notNull(),
    description: (0, pg_core_1.text)('description'),
    managerId: (0, pg_core_1.text)('manager_id'),
    parentDepartmentId: (0, pg_core_1.text)('parent_department_id'),
    budget: (0, pg_core_1.decimal)('budget'),
    headCount: (0, pg_core_1.integer)('head_count'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
// Alias for tenants - some routes use 'companies'
exports.companies = exports.tenants;
// Employee profiles
exports.employeeProfiles = (0, pg_core_1.pgTable)('employee_profiles', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.text)('user_id').notNull(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    bio: (0, pg_core_1.text)('bio'),
    skills: (0, pg_core_1.jsonb)('skills').$type(),
    interests: (0, pg_core_1.jsonb)('interests').$type(),
    certifications: (0, pg_core_1.jsonb)('certifications'),
    profilePicture: (0, pg_core_1.text)('profile_picture'),
    linkedinUrl: (0, pg_core_1.text)('linkedin_url'),
    twitterUrl: (0, pg_core_1.text)('twitter_url'),
    metadata: (0, pg_core_1.jsonb)('metadata'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
// Core analysis tables
exports.analyses = (0, pg_core_1.pgTable)('analyses', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    type: (0, pg_core_1.text)('type').notNull(), // structure, culture, skills, performance, comprehensive
    status: (0, pg_core_1.text)('status').notNull().default('pending'), // pending, processing, completed, failed
    results: (0, pg_core_1.jsonb)('results'),
    metadata: (0, pg_core_1.jsonb)('metadata'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
exports.orgInputs = (0, pg_core_1.pgTable)('org_inputs', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    data: (0, pg_core_1.jsonb)('data').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.structureAnalysisResults = (0, pg_core_1.pgTable)('structure_analysis_results', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    analysisId: (0, pg_core_1.text)('analysis_id').notNull(),
    results: (0, pg_core_1.jsonb)('results').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.orgStructures = (0, pg_core_1.pgTable)('org_structures', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id'),
    submittedBy: (0, pg_core_1.text)('submitted_by'),
    rawText: (0, pg_core_1.text)('raw_text').notNull(),
    parsedData: (0, pg_core_1.jsonb)('parsed_data'),
    analysisResult: (0, pg_core_1.jsonb)('analysis_result'),
    isPublic: (0, pg_core_1.boolean)('is_public').default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
// 7-Cylinder Framework Configuration
exports.frameworkConfig = (0, pg_core_1.pgTable)('framework_config', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    version: (0, pg_core_1.integer)('version').notNull().default(1),
    cylinders: (0, pg_core_1.jsonb)('cylinders').notNull(), // Array of 7 cylinders with values
    isActive: (0, pg_core_1.boolean)('is_active').default(true),
    updatedBy: (0, pg_core_1.text)('updated_by'), // User ID who made the change
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
// Sessions table for authentication
exports.sessions = (0, pg_core_1.pgTable)('sessions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.text)('user_id').notNull(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    token: (0, pg_core_1.text)('token').notNull(),
    expiresAt: (0, pg_core_1.timestamp)('expires_at').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    metadata: (0, pg_core_1.jsonb)('metadata'),
});
// Relations
exports.tenantsRelations = (0, drizzle_orm_1.relations)(exports.tenants, ({ many }) => ({
    users: many(exports.users),
    departments: many(exports.departments),
    analyses: many(exports.analyses),
}));
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, ({ one, many }) => ({
    tenant: one(exports.tenants, {
        fields: [exports.users.tenantId],
        references: [exports.tenants.id],
    }),
    department: one(exports.departments, {
        fields: [exports.users.departmentId],
        references: [exports.departments.id],
    }),
    manager: one(exports.users, {
        fields: [exports.users.managerId],
        references: [exports.users.id],
    }),
}));
exports.departmentsRelations = (0, drizzle_orm_1.relations)(exports.departments, ({ one, many }) => ({
    tenant: one(exports.tenants, {
        fields: [exports.departments.tenantId],
        references: [exports.tenants.id],
    }),
    manager: one(exports.users, {
        fields: [exports.departments.managerId],
        references: [exports.users.id],
    }),
    parentDepartment: one(exports.departments, {
        fields: [exports.departments.parentDepartmentId],
        references: [exports.departments.id],
    }),
    users: many(exports.users),
}));
exports.sessionsRelations = (0, drizzle_orm_1.relations)(exports.sessions, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.sessions.userId],
        references: [exports.users.id]
    }),
    tenant: one(exports.tenants, {
        fields: [exports.sessions.tenantId],
        references: [exports.tenants.id]
    })
}));
//# sourceMappingURL=core.js.map