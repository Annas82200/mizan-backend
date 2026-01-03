/**
 * Skills Re-Analysis Trigger System
 * Automatically triggers skills re-analysis based on configurable conditions
 * Production-ready implementation - replaces TODO comment at skills-agent.ts:2149
 */

import { db } from '../../../db/index';
import {
  skillsReAnalysisQueue,
  employeeRoleHistory,
  learningProgressEvents,
  skillsAssessments,
  companyStrategies
} from '../../../db/schema';
import { eq, and, gt, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';

interface ReAnalysisTriggerConfig {
  enabled: boolean;
  triggers: {
    timeBasedMonths: number;
    significantRoleChange: boolean;
    strategyUpdate: boolean;
    learningCompletion: boolean;
  };
}

export class SkillsReAnalysisService {
  private config: ReAnalysisTriggerConfig = {
    enabled: true,
    triggers: {
      timeBasedMonths: 6,  // Re-analyze every 6 months
      significantRoleChange: true,
      strategyUpdate: true,
      learningCompletion: true
    }
  };

  private eventEmitter: EventEmitter;

  constructor() {
    this.eventEmitter = new EventEmitter();
  }

  /**
   * Check if any re-analysis triggers are met for an employee
   * Returns true if re-analysis was triggered
   */
  async checkReAnalysisTriggers(
    employeeId: string,
    tenantId: string
  ): Promise<boolean> {
    if (!this.config.enabled) return false;

    const lastAnalysis = await this.getLastAnalysis(employeeId, tenantId);
    if (!lastAnalysis) return false;

    // Time-based trigger
    if (this.shouldReAnalyzeByTime(lastAnalysis.createdAt)) {
      await this.triggerReAnalysis(employeeId, tenantId, 'time-based', 'system');
      return true;
    }

    // Role change trigger
    if (this.config.triggers.significantRoleChange) {
      const roleChanged = await this.hasRoleChanged(employeeId, tenantId, lastAnalysis.createdAt);
      if (roleChanged) {
        await this.triggerReAnalysis(employeeId, tenantId, 'role-change', 'system');
        return true;
      }
    }

    // Strategy update trigger
    if (this.config.triggers.strategyUpdate) {
      const strategyUpdated = await this.hasStrategyUpdated(tenantId, lastAnalysis.createdAt);
      if (strategyUpdated) {
        await this.triggerReAnalysis(employeeId, tenantId, 'strategy-update', 'system');
        return true;
      }
    }

    // Learning completion trigger
    if (this.config.triggers.learningCompletion) {
      const completedLearning = await this.hasCompletedSignificantLearning(
        employeeId,
        tenantId,
        lastAnalysis.createdAt
      );
      if (completedLearning) {
        await this.triggerReAnalysis(employeeId, tenantId, 'learning-completion', 'system');
        return true;
      }
    }

    return false;
  }

  /**
   * Manually trigger re-analysis for an employee
   */
  async manualTriggerReAnalysis(
    employeeId: string,
    tenantId: string,
    triggeredBy: string,
    reason: string = 'manual-request'
  ): Promise<void> {
    await this.triggerReAnalysis(employeeId, tenantId, reason, triggeredBy);
  }

  /**
   * Get pending re-analysis requests for processing
   */
  async getPendingReAnalysis(tenantId: string, limit: number = 10) {
    return await db.select()
      .from(skillsReAnalysisQueue)
      .where(
        and(
          eq(skillsReAnalysisQueue.tenantId, tenantId),
          eq(skillsReAnalysisQueue.status, 'pending')
        )
      )
      .orderBy(desc(skillsReAnalysisQueue.createdAt))
      .limit(limit);
  }

  /**
   * Mark re-analysis as processing
   */
  async markAsProcessing(reAnalysisId: string): Promise<void> {
    await db.update(skillsReAnalysisQueue)
      .set({ status: 'processing' })
      .where(eq(skillsReAnalysisQueue.id, reAnalysisId));
  }

  /**
   * Mark re-analysis as completed
   */
  async markAsCompleted(reAnalysisId: string): Promise<void> {
    await db.update(skillsReAnalysisQueue)
      .set({
        status: 'completed',
        processedAt: new Date()
      })
      .where(eq(skillsReAnalysisQueue.id, reAnalysisId));
  }

  /**
   * Mark re-analysis as failed
   */
  async markAsFailed(reAnalysisId: string, error: string): Promise<void> {
    await db.update(skillsReAnalysisQueue)
      .set({
        status: 'failed',
        error,
        processedAt: new Date()
      })
      .where(eq(skillsReAnalysisQueue.id, reAnalysisId));
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ReAnalysisTriggerConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      triggers: {
        ...this.config.triggers,
        ...(config.triggers || {})
      }
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): ReAnalysisTriggerConfig {
    return { ...this.config };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private shouldReAnalyzeByTime(lastAnalysisDate: Date): boolean {
    const monthsSince = this.getMonthsDifference(lastAnalysisDate, new Date());
    return monthsSince >= this.config.triggers.timeBasedMonths;
  }

  private async triggerReAnalysis(
    employeeId: string,
    tenantId: string,
    reason: string,
    triggeredBy: string
  ): Promise<void> {
    // Check if there's already a pending request for this employee
    const existingPending = await db.select()
      .from(skillsReAnalysisQueue)
      .where(
        and(
          eq(skillsReAnalysisQueue.employeeId, employeeId),
          eq(skillsReAnalysisQueue.tenantId, tenantId),
          eq(skillsReAnalysisQueue.status, 'pending')
        )
      )
      .limit(1);

    if (existingPending.length > 0) {
      console.log(`[Skills Re-Analysis] Pending request already exists for employee ${employeeId}, skipping`);
      return;
    }

    await db.insert(skillsReAnalysisQueue).values({
      id: randomUUID(),
      employeeId,
      tenantId,
      reason,
      status: 'pending',
      triggeredBy,
      metadata: JSON.stringify({
        triggeredAt: new Date().toISOString(),
        autoTrigger: triggeredBy === 'system'
      }),
      createdAt: new Date()
    });

    // Emit event for async processing
    this.eventEmitter.emit('skills:reanalysis-queued', {
      employeeId,
      tenantId,
      reason
    });

    console.log(`[Skills Re-Analysis] Queued re-analysis for employee ${employeeId}, reason: ${reason}`);
  }

  private async getLastAnalysis(employeeId: string, tenantId: string) {
    const results = await db.select()
      .from(skillsAssessments)
      .where(
        and(
          eq(skillsAssessments.userId, employeeId),
          eq(skillsAssessments.tenantId, tenantId)
        )
      )
      .orderBy(desc(skillsAssessments.createdAt))
      .limit(1);

    return results[0] || null;
  }

  private getMonthsDifference(date1: Date, date2: Date): number {
    const months = (date2.getFullYear() - date1.getFullYear()) * 12;
    return months + date2.getMonth() - date1.getMonth();
  }

  private async hasRoleChanged(
    employeeId: string,
    tenantId: string,
    since: Date
  ): Promise<boolean> {
    const roleChanges = await db.select()
      .from(employeeRoleHistory)
      .where(
        and(
          eq(employeeRoleHistory.employeeId, employeeId),
          eq(employeeRoleHistory.tenantId, tenantId),
          gt(employeeRoleHistory.effectiveDate, since)
        )
      );
    return roleChanges.length > 0;
  }

  private async hasStrategyUpdated(tenantId: string, since: Date): Promise<boolean> {
    const strategyUpdates = await db.select()
      .from(companyStrategies)
      .where(
        and(
          eq(companyStrategies.tenantId, tenantId),
          gt(companyStrategies.updatedAt, since)
        )
      );
    return strategyUpdates.length > 0;
  }

  private async hasCompletedSignificantLearning(
    employeeId: string,
    tenantId: string,
    since: Date
  ): Promise<boolean> {
    const completions = await db.select()
      .from(learningProgressEvents)
      .where(
        and(
          eq(learningProgressEvents.employeeId, employeeId),
          eq(learningProgressEvents.tenantId, tenantId),
          eq(learningProgressEvents.eventType, 'completion'),
          gt(learningProgressEvents.timestamp, since)
        )
      );
    // Consider 3+ course completions as "significant"
    return completions.length >= 3;
  }

  /**
   * Subscribe to re-analysis events
   */
  on(event: 'skills:reanalysis-queued', callback: (data: { employeeId: string; tenantId: string; reason: string }) => void): void {
    this.eventEmitter.on(event, callback);
  }

  /**
   * Unsubscribe from re-analysis events
   */
  off(event: 'skills:reanalysis-queued', callback: (data: { employeeId: string; tenantId: string; reason: string }) => void): void {
    this.eventEmitter.off(event, callback);
  }
}

// Export singleton instance
export const skillsReAnalysisService = new SkillsReAnalysisService();
