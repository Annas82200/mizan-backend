/**
 * Token Tracker — Per-tenant AI usage tracking and cost estimation
 *
 * Tracks every AI request with token counts and estimated costs.
 * Supports billing, budgeting, and usage analytics.
 */

import { db } from '../../../../db/index';
import { aiRequests, tokenUsage } from '../../../../db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

// Cost per 1M tokens (approximate, updated periodically)
const COST_PER_MILLION_TOKENS: Record<string, { input: number; output: number }> = {
  'mistral-large-latest': { input: 2.0, output: 6.0 },
  'mistral-small-latest': { input: 0.2, output: 0.6 },
  'claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4.0 },
  'gemini-1.5-pro': { input: 1.25, output: 5.0 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
};

export interface TrackingData {
  tenantId: string;
  userId?: string;
  engine: 'knowledge' | 'reasoning' | 'data';
  provider: 'mistral' | 'claude' | 'gemini';
  model: string;
  requestType: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  status: 'success' | 'failed' | 'timeout' | 'rate_limited' | 'fallback';
  wasCached?: boolean;
  fallbackUsed?: string;
  errorMessage?: string;
}

export class TokenTracker {
  /**
   * Track an AI request with token usage and cost
   */
  async trackRequest(data: TrackingData): Promise<void> {
    const costUsd = this.estimateCost(data.model, data.inputTokens, data.outputTokens);

    await db.insert(aiRequests).values({
      tenantId: data.tenantId,
      userId: data.userId,
      engine: data.engine,
      provider: data.provider,
      model: data.model,
      requestType: data.requestType,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      totalTokens: data.inputTokens + data.outputTokens,
      costUsd,
      latencyMs: data.latencyMs,
      status: data.status,
      wasCached: data.wasCached ? 'true' : 'false',
      fallbackUsed: data.fallbackUsed,
      errorMessage: data.errorMessage,
    });
  }

  /**
   * Get usage summary for a tenant in a date range
   */
  async getUsageSummary(tenantId: string, startDate: Date, endDate: Date): Promise<{
    totalTokens: number;
    totalCost: number;
    byEngine: Record<string, { tokens: number; cost: number; requests: number }>;
    requestCount: number;
    cacheHitRate: number;
  }> {
    const rows = await db
      .select({
        engine: aiRequests.engine,
        totalTokens: sql<number>`SUM(${aiRequests.totalTokens})`,
        totalCost: sql<number>`SUM(${aiRequests.costUsd})`,
        requestCount: sql<number>`COUNT(*)`,
        cachedCount: sql<number>`SUM(CASE WHEN ${aiRequests.wasCached} = 'true' THEN 1 ELSE 0 END)`,
      })
      .from(aiRequests)
      .where(
        and(
          eq(aiRequests.tenantId, tenantId),
          gte(aiRequests.createdAt, startDate),
          lte(aiRequests.createdAt, endDate)
        )
      )
      .groupBy(aiRequests.engine);

    const byEngine: Record<string, { tokens: number; cost: number; requests: number }> = {};
    let totalTokens = 0;
    let totalCost = 0;
    let totalRequests = 0;
    let totalCached = 0;

    for (const row of rows) {
      byEngine[row.engine] = {
        tokens: Number(row.totalTokens) || 0,
        cost: Number(row.totalCost) || 0,
        requests: Number(row.requestCount) || 0,
      };
      totalTokens += Number(row.totalTokens) || 0;
      totalCost += Number(row.totalCost) || 0;
      totalRequests += Number(row.requestCount) || 0;
      totalCached += Number(row.cachedCount) || 0;
    }

    return {
      totalTokens,
      totalCost,
      byEngine,
      requestCount: totalRequests,
      cacheHitRate: totalRequests > 0 ? totalCached / totalRequests : 0,
    };
  }

  /**
   * Check if tenant is within their token budget
   */
  async checkBudget(tenantId: string, monthlyBudgetUsd: number): Promise<{
    withinBudget: boolean;
    usedUsd: number;
    remainingUsd: number;
    percentUsed: number;
  }> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const summary = await this.getUsageSummary(tenantId, monthStart, now);

    return {
      withinBudget: summary.totalCost < monthlyBudgetUsd,
      usedUsd: summary.totalCost,
      remainingUsd: Math.max(0, monthlyBudgetUsd - summary.totalCost),
      percentUsed: monthlyBudgetUsd > 0 ? (summary.totalCost / monthlyBudgetUsd) * 100 : 0,
    };
  }

  private estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    const rates = COST_PER_MILLION_TOKENS[model];
    if (!rates) return 0;

    const inputCost = (inputTokens / 1_000_000) * rates.input;
    const outputCost = (outputTokens / 1_000_000) * rates.output;
    return inputCost + outputCost;
  }
}
