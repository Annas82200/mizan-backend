// @ts-nocheck
/**
 * Analysis Schema — Cross-module analysis results
 * Structure, Culture, and Skills analysis output that drives all other modules
 */

import { pgTable, uuid, varchar, text, timestamp, jsonb, real, pgEnum } from 'drizzle-orm/pg-core';

export const analysisTypeEnum = pgEnum('analysis_type', ['structure', 'culture', 'skills', 'full']);
export const analysisRunStatusEnum = pgEnum('analysis_run_status', ['running', 'completed', 'failed']);

export const analysisRuns = pgTable('analysis_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  analysisType: analysisTypeEnum('analysis_type').notNull(),
  status: analysisRunStatusEnum('status').notNull().default('running'),
  triggeredBy: uuid('triggered_by'),
  engineUsed: varchar('engine_used', { length: 50 }),
  durationMs: real('duration_ms'),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

export const analysisResults = pgTable('analysis_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  runId: uuid('run_id').notNull().references(() => analysisRuns.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  analysisType: analysisTypeEnum('analysis_type').notNull(),
  // Core scores that drive other modules
  orgHealthScore: real('org_health_score'), // 0-100
  structureScore: real('structure_score'), // 0-100
  cultureScore: real('culture_score'), // 0-100
  cultureEntropy: real('culture_entropy'), // 0-100 (lower is better)
  skillsReadinessScore: real('skills_readiness_score'), // 0-100
  // Detailed results as JSON
  structureDetails: jsonb('structure_details'), // {spanOfControl, reportingDepth, bottlenecks, hiringNeeds}
  cultureDetails: jsonb('culture_details'), // {cylinderScores, valueGaps, interventions}
  skillsDetails: jsonb('skills_details'), // {criticalGaps, strengthAreas, marketComparison}
  // Recommendations that feed into modules
  hiringRecommendations: jsonb('hiring_recommendations').default('[]'),
  learningRecommendations: jsonb('learning_recommendations').default('[]'),
  performanceRecommendations: jsonb('performance_recommendations').default('[]'),
  bonusFactors: jsonb('bonus_factors').default('{}'),
  metadata: jsonb('metadata').default('{}'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
