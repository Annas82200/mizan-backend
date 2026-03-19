import { pgTable, uuid, varchar, timestamp, jsonb, integer, real, pgEnum } from 'drizzle-orm/pg-core';

export const aiEngineEnum = pgEnum('ai_engine', ['knowledge', 'reasoning', 'data']);
export const aiProviderEnum = pgEnum('ai_provider', ['mistral', 'claude', 'gemini']);
export const requestStatusEnum = pgEnum('ai_request_status', ['success', 'failed', 'timeout', 'rate_limited', 'fallback']);

export const aiRequests = pgTable('ai_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  userId: uuid('user_id'),
  engine: aiEngineEnum('engine').notNull(),
  provider: aiProviderEnum('provider').notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  requestType: varchar('request_type', { length: 100 }).notNull(), // analysis, chat, report, classification, embedding
  inputTokens: integer('input_tokens').notNull(),
  outputTokens: integer('output_tokens').notNull(),
  totalTokens: integer('total_tokens').notNull(),
  costUsd: real('cost_usd'), // estimated cost in USD
  latencyMs: integer('latency_ms'),
  status: requestStatusEnum('status').notNull().default('success'),
  wasCached: varchar('was_cached', { length: 10 }).default('false'),
  fallbackUsed: varchar('fallback_used', { length: 50 }),
  errorMessage: varchar('error_message', { length: 1024 }),
  metadata: jsonb('metadata').default('{}'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tokenUsage = pgTable('token_usage', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  period: varchar('period', { length: 20 }).notNull(), // daily, monthly
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  // Per-engine breakdown
  knowledgeTokens: integer('knowledge_tokens').default(0),
  reasoningTokens: integer('reasoning_tokens').default(0),
  dataTokens: integer('data_tokens').default(0),
  totalTokens: integer('total_tokens').default(0),
  // Cost breakdown
  knowledgeCostUsd: real('knowledge_cost_usd').default(0),
  reasoningCostUsd: real('reasoning_cost_usd').default(0),
  dataCostUsd: real('data_cost_usd').default(0),
  totalCostUsd: real('total_cost_usd').default(0),
  // Request counts
  totalRequests: integer('total_requests').default(0),
  cachedRequests: integer('cached_requests').default(0),
  failedRequests: integer('failed_requests').default(0),
  computedAt: timestamp('computed_at').defaultNow().notNull(),
});

export const engineMetrics = pgTable('engine_metrics', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id'),
  engine: aiEngineEnum('engine').notNull(),
  provider: aiProviderEnum('provider').notNull(),
  period: varchar('period', { length: 20 }).notNull(),
  periodStart: timestamp('period_start').notNull(),
  avgLatencyMs: real('avg_latency_ms'),
  p95LatencyMs: real('p95_latency_ms'),
  p99LatencyMs: real('p99_latency_ms'),
  successRate: real('success_rate'),
  totalRequests: integer('total_requests').default(0),
  errorRate: real('error_rate'),
  cacheHitRate: real('cache_hit_rate'),
  avgTokensPerRequest: real('avg_tokens_per_request'),
  computedAt: timestamp('computed_at').defaultNow().notNull(),
});
