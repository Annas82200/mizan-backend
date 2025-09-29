import { pgTable, text, integer, timestamp, jsonb, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants, users } from './core.js';

export const skillsAssessments = pgTable('skills_assessments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  userId: text('user_id').notNull(),
  currentSkills: jsonb('current_skills'),
  requiredSkills: jsonb('required_skills'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const skillsAssessmentsRelations = relations(skillsAssessments, ({ one }) => ({
  tenant: one(tenants, {
    fields: [skillsAssessments.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [skillsAssessments.userId],
    references: [users.id],
  }),
}));