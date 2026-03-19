import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const conversationStatusEnum = pgEnum('conversation_status', ['active', 'archived', 'deleted']);
export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant', 'system']);
export const actionStatusEnum = pgEnum('action_status', ['pending', 'executing', 'completed', 'failed', 'cancelled']);
export const actionTypeEnum = pgEnum('action_type', [
  'send_email', 'schedule_meeting', 'create_task', 'approve_request',
  'generate_report', 'trigger_workflow', 'send_reminder', 'update_record',
]);

export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  userId: uuid('user_id').notNull(),
  title: varchar('title', { length: 255 }),
  status: conversationStatusEnum('status').notNull().default('active'),
  lastMessageAt: timestamp('last_message_at'),
  messageCount: integer('message_count').default(0),
  metadata: jsonb('metadata').default('{}'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  role: messageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  intent: varchar('intent', { length: 100 }), // classified intent (skills_query, performance_query, etc.)
  agentUsed: varchar('agent_used', { length: 100 }), // which specialized agent handled this
  engineUsed: varchar('engine_used', { length: 50 }), // mistral, claude, gemini
  tokensUsed: integer('tokens_used'),
  latencyMs: integer('latency_ms'),
  suggestedActions: jsonb('suggested_actions').default('[]'),
  metadata: jsonb('metadata').default('{}'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const conversationContexts = pgTable('conversation_contexts', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  contextType: varchar('context_type', { length: 100 }).notNull(), // module_data, user_profile, recent_activity
  contextData: jsonb('context_data').notNull(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const assistantActions = pgTable('assistant_actions', {
  id: uuid('id').defaultRandom().primaryKey(),
  messageId: uuid('message_id').references(() => messages.id, { onDelete: 'set null' }),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  userId: uuid('user_id').notNull(),
  actionType: actionTypeEnum('action_type').notNull(),
  status: actionStatusEnum('status').notNull().default('pending'),
  parameters: jsonb('parameters').notNull(),
  result: jsonb('result'),
  errorMessage: text('error_message'),
  executedAt: timestamp('executed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(messages),
  contexts: many(conversationContexts),
  actions: many(assistantActions),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
}));
