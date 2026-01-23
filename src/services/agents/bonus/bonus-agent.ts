import { z } from 'zod';
import { db } from '../../../../db/index';
import { bonusRecommendations } from '../../../../db/schema/bonus';
import { KnowledgeEngine } from '../../../ai/engines/KnowledgeEngine';
import { DataEngine } from '../../../ai/engines/DataEngine';
import { ReasoningEngine } from '../../../ai/engines/ReasoningEngine';
import { bonusCalculationService, BonusConfiguration, BonusCalculationResult } from '../../bonus/bonus-calculation.service';
import { logger } from '../../logger';

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

/**
 * Schema for individual bonus trigger (single employee)
 */
export const BonusTriggerSchema = z.object({
  tenantId: z.string().uuid(),
  employeeId: z.string().uuid(),
  triggerSource: z.enum(['performance_review', 'skill_acquisition', 'project_completion']),
  data: z.record(z.unknown()).optional(),
});

/**
 * Schema for bulk bonus calculation (all eligible employees)
 */
export const BulkBonusCalculationSchema = z.object({
  tenantId: z.string().uuid(),
  bonusBudget: z.number().positive('Bonus budget must be positive'),
  companyPerformanceScore: z.number().min(0).max(100, 'Company performance score must be 0-100'),
  performanceCycleId: z.string().uuid().optional(),
  currency: z.string().default('USD'),
  saveRecommendations: z.boolean().default(true),
});

export type BonusTrigger = z.infer<typeof BonusTriggerSchema>;
export type BulkBonusCalculation = z.infer<typeof BulkBonusCalculationSchema>;

// ============================================================================
// RESPONSE INTERFACES
// ============================================================================

interface IndividualBonusResult {
  bonusRecommended: boolean;
  recommendationId?: string;
  employeeId: string;
  amount?: number;
  rationale?: string;
  calculation?: {
    performanceScore: number;
    roleType: 'manager' | 'non_manager';
    companyWeight: number;
    employeeWeight: number;
    companyPerformance: number;
    employeePerformancePercentage: number;
    baseBonus: number;
  };
}

interface BulkBonusResult {
  success: boolean;
  tenantId: string;
  totalBudget: number;
  companyPerformance: number;
  eligibleEmployees: number;
  basePerEmployee: number;
  totalCalculatedBonus: number;
  remainingBudget: number;
  recommendationsSaved: boolean;
  calculations: Array<{
    employeeId: string;
    employeeName: string;
    roleType: 'manager' | 'non_manager';
    performanceScore: number;
    calculatedBonus: number;
    rationale: string;
  }>;
}

// ============================================================================
// BONUS AGENT CLASS
// ============================================================================

/**
 * Bonus Agent
 *
 * Implements proper bonus calculation business rules:
 *
 * ROLE-BASED WEIGHTING:
 * - Managers: 60% company performance + 40% individual performance
 * - Non-Managers: 40% company performance + 60% individual performance
 *
 * PERFORMANCE SCORE TO PAYOUT PERCENTAGE:
 * - Score 1 = 0% (no bonus)
 * - Score 2 = 40%
 * - Score 3 = 60%
 * - Score 4 = 80%
 * - Score 5 = 100%
 */
class BonusAgent {
  private knowledgeEngine: KnowledgeEngine;
  private dataEngine: DataEngine;
  private reasoningEngine: ReasoningEngine;

  constructor() {
    this.knowledgeEngine = new KnowledgeEngine();
    this.dataEngine = new DataEngine();
    this.reasoningEngine = new ReasoningEngine();
  }

  /**
   * Handle individual bonus trigger for a single employee
   * Used when triggered by performance review completion or other events
   */
  public async handleBonusTrigger(input: BonusTrigger): Promise<IndividualBonusResult> {
    const validatedInput = BonusTriggerSchema.parse(input);
    const { tenantId, employeeId, triggerSource, data } = validatedInput;

    logger.info(`Processing bonus trigger for employee ${employeeId} in tenant ${tenantId}`);

    // Extract configuration from trigger data
    const companyPerformance = (data?.companyPerformance as number) ?? 80; // Default 80% if not provided
    const baseBonusAmount = (data?.baseBonusAmount as number) ?? 10000; // Default $10,000 if not provided

    // Calculate bonus using proper business logic
    const calculation = await bonusCalculationService.calculateBonusForEmployee(
      tenantId,
      employeeId,
      companyPerformance,
      baseBonusAmount
    );

    if (!calculation) {
      logger.warn(`Could not calculate bonus for employee ${employeeId} - missing data`);
      return {
        bonusRecommended: false,
        employeeId,
        rationale: 'Unable to calculate bonus - employee not found or no performance evaluation available'
      };
    }

    // Check if bonus is 0 (performance score 1)
    if (calculation.calculatedBonus <= 0) {
      logger.info(`No bonus recommended for employee ${employeeId} - performance score indicates 0% payout`);
      return {
        bonusRecommended: false,
        employeeId,
        rationale: calculation.rationale,
        calculation: {
          performanceScore: calculation.performanceScore,
          roleType: calculation.employeeRole,
          companyWeight: calculation.companyWeight,
          employeeWeight: calculation.employeeWeight,
          companyPerformance: calculation.companyPerformance,
          employeePerformancePercentage: calculation.employeePerformancePercentage,
          baseBonus: calculation.baseBonus
        }
      };
    }

    // Save recommendation to database
    const [recommendation] = await db.insert(bonusRecommendations).values({
      tenantId,
      employeeId,
      triggerSource,
      triggerData: {
        performanceScore: calculation.performanceScore,
        companyPerformance: calculation.companyPerformance,
        roleType: calculation.employeeRole,
        companyWeight: calculation.companyWeight,
        employeeWeight: calculation.employeeWeight,
        employeePerformancePercentage: calculation.employeePerformancePercentage,
        baseBonus: calculation.baseBonus,
        calculationFormula: 'Base × [(Company Performance × Company Weight) + (Employee Performance % × Employee Weight)]',
        ...(data || {})
      },
      bonusType: 'performance',
      recommendedAmount: calculation.calculatedBonus.toFixed(2),
      currency: 'USD',
      rationale: calculation.rationale,
      status: 'recommended'
    }).returning();

    logger.info(`Created bonus recommendation ${recommendation.id} for employee ${employeeId}: $${calculation.calculatedBonus}`);

    return {
      bonusRecommended: true,
      recommendationId: recommendation.id,
      employeeId,
      amount: calculation.calculatedBonus,
      rationale: calculation.rationale,
      calculation: {
        performanceScore: calculation.performanceScore,
        roleType: calculation.employeeRole,
        companyWeight: calculation.companyWeight,
        employeeWeight: calculation.employeeWeight,
        companyPerformance: calculation.companyPerformance,
        employeePerformancePercentage: calculation.employeePerformancePercentage,
        baseBonus: calculation.baseBonus
      }
    };
  }

  /**
   * Calculate bonuses for all eligible employees in a tenant
   * Used for bulk bonus calculation after a performance cycle
   */
  public async calculateBulkBonuses(input: BulkBonusCalculation): Promise<BulkBonusResult> {
    const validatedInput = BulkBonusCalculationSchema.parse(input);
    const { tenantId, bonusBudget, companyPerformanceScore, performanceCycleId, currency, saveRecommendations } = validatedInput;

    logger.info(`Starting bulk bonus calculation for tenant ${tenantId}`);
    logger.info(`Budget: $${bonusBudget}, Company Performance: ${companyPerformanceScore}%`);

    // Perform calculation
    const result = await bonusCalculationService.calculateBonusesForTenant({
      tenantId,
      bonusBudget,
      companyPerformanceScore,
      performanceCycleId,
      currency
    });

    // Optionally save recommendations to database
    if (saveRecommendations && result.calculations.length > 0) {
      await bonusCalculationService.saveCalculationsAsRecommendations(
        result,
        'performance_review',
        currency
      );
    }

    logger.info(`Bulk bonus calculation complete: ${result.eligibleEmployees} employees, $${result.totalCalculatedBonus} total`);

    return {
      success: true,
      tenantId: result.tenantId,
      totalBudget: result.totalBudget,
      companyPerformance: result.companyPerformance,
      eligibleEmployees: result.eligibleEmployees,
      basePerEmployee: result.basePerEmployee,
      totalCalculatedBonus: result.totalCalculatedBonus,
      remainingBudget: result.remainingBudget,
      recommendationsSaved: saveRecommendations,
      calculations: result.calculations.map(calc => ({
        employeeId: calc.employeeId,
        employeeName: calc.employeeName,
        roleType: calc.employeeRole,
        performanceScore: calc.performanceScore,
        calculatedBonus: calc.calculatedBonus,
        rationale: calc.rationale
      }))
    };
  }

  /**
   * Get bonus calculation preview (without saving)
   */
  public async previewBonusCalculation(input: Omit<BulkBonusCalculation, 'saveRecommendations'>): Promise<BulkBonusResult> {
    return this.calculateBulkBonuses({
      ...input,
      saveRecommendations: false
    });
  }
}

// Export singleton instance
export const bonusAgent = new BonusAgent();
