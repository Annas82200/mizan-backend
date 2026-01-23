/**
 * Bonus Calculation Service
 *
 * Implements the proper business rules for bonus calculation:
 *
 * ROLE-BASED WEIGHTING:
 * - Managers (role = 'manager' or 'admin'): 60% company performance + 40% individual performance
 * - Non-Managers (role = 'employee'): 40% company performance + 60% individual performance
 *
 * PERFORMANCE SCORE TO PAYOUT PERCENTAGE:
 * - Score 1 = 0% (no bonus)
 * - Score 2 = 40%
 * - Score 3 = 60%
 * - Score 4 = 80%
 * - Score 5 = 100%
 *
 * CALCULATION FORMULA:
 * Employee Bonus = Base Bonus × [(Company Performance × Company Weight) + (Employee Performance Percentage × Employee Weight)]
 */

import { db } from '../../../db/index';
import { users } from '../../../db/schema/core';
import { performanceEvaluations, performanceCycles } from '../../../db/schema/performance';
import { bonusRecommendations } from '../../../db/schema/bonus';
import { eq, and, desc, isNotNull, inArray } from 'drizzle-orm';
import { logger } from '../logger';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface BonusConfiguration {
  tenantId: string;
  bonusBudget: number;
  companyPerformanceScore: number; // 0-100 percentage
  performanceCycleId?: string;
  currency: string;
}

export interface EmployeeBonusCalculation {
  employeeId: string;
  employeeName: string;
  employeeRole: 'manager' | 'non_manager';
  performanceScore: number; // 1-5
  companyWeight: number;
  employeeWeight: number;
  companyPerformance: number;
  employeePerformancePercentage: number;
  baseBonus: number;
  calculatedBonus: number;
  rationale: string;
}

export interface BonusCalculationResult {
  tenantId: string;
  totalBudget: number;
  companyPerformance: number;
  eligibleEmployees: number;
  basePerEmployee: number;
  calculations: EmployeeBonusCalculation[];
  totalCalculatedBonus: number;
  remainingBudget: number;
}

// ============================================================================
// BUSINESS RULES CONSTANTS
// ============================================================================

/**
 * Role-based weighting configuration
 * Managers: 60% company, 40% individual
 * Non-Managers: 40% company, 60% individual
 */
const ROLE_WEIGHTS = {
  manager: {
    companyWeight: 0.60,
    employeeWeight: 0.40
  },
  non_manager: {
    companyWeight: 0.40,
    employeeWeight: 0.60
  }
} as const;

/**
 * Performance score to payout percentage mapping
 * Score 1 = 0%, Score 2 = 40%, Score 3 = 60%, Score 4 = 80%, Score 5 = 100%
 */
const SCORE_TO_PAYOUT: Record<number, number> = {
  1: 0.00,   // No bonus
  2: 0.40,   // 40%
  3: 0.60,   // 60%
  4: 0.80,   // 80%
  5: 1.00    // 100%
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Determine if an employee is a manager based on their role
 */
function isManager(role: string): boolean {
  return role === 'manager' || role === 'admin' || role === 'clientAdmin';
}

/**
 * Get the weight configuration based on employee role
 */
function getRoleWeights(role: string): { companyWeight: number; employeeWeight: number } {
  return isManager(role) ? ROLE_WEIGHTS.manager : ROLE_WEIGHTS.non_manager;
}

/**
 * Convert performance score (1-5) to payout percentage
 * Rounds to nearest integer if needed
 */
function scoreToPayoutPercentage(score: number): number {
  const roundedScore = Math.round(score);
  const clampedScore = Math.max(1, Math.min(5, roundedScore));
  return SCORE_TO_PAYOUT[clampedScore] ?? 0;
}

/**
 * Generate rationale text for a bonus calculation
 */
function generateRationale(
  employeeRole: 'manager' | 'non_manager',
  performanceScore: number,
  companyPerformance: number,
  calculatedBonus: number,
  baseBonus: number
): string {
  const scorePayoutPct = scoreToPayoutPercentage(performanceScore) * 100;
  const weights = employeeRole === 'manager' ? ROLE_WEIGHTS.manager : ROLE_WEIGHTS.non_manager;

  if (performanceScore === 1) {
    return 'No bonus awarded due to performance score of 1 (Does Not Meet Expectations).';
  }

  const roleLabel = employeeRole === 'manager' ? 'Manager' : 'Individual Contributor';
  return `${roleLabel} bonus calculation: Base amount $${baseBonus.toFixed(2)} × [(Company Performance ${companyPerformance}% × ${weights.companyWeight * 100}% weight) + (Individual Performance ${scorePayoutPct}% × ${weights.employeeWeight * 100}% weight)] = $${calculatedBonus.toFixed(2)}. Performance score: ${performanceScore}/5.`;
}

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class BonusCalculationService {

  /**
   * Calculate bonuses for all eligible employees in a tenant
   */
  async calculateBonusesForTenant(config: BonusConfiguration): Promise<BonusCalculationResult> {
    const { tenantId, bonusBudget, companyPerformanceScore, performanceCycleId, currency } = config;

    logger.info(`Starting bonus calculation for tenant ${tenantId}`);

    // 1. Get all eligible employees with their latest performance evaluations
    const eligibleEmployees = await this.getEligibleEmployeesWithPerformance(tenantId, performanceCycleId);

    if (eligibleEmployees.length === 0) {
      logger.warn(`No eligible employees found for tenant ${tenantId}`);
      return {
        tenantId,
        totalBudget: bonusBudget,
        companyPerformance: companyPerformanceScore,
        eligibleEmployees: 0,
        basePerEmployee: 0,
        calculations: [],
        totalCalculatedBonus: 0,
        remainingBudget: bonusBudget
      };
    }

    // 2. Calculate base bonus per employee
    const basePerEmployee = bonusBudget / eligibleEmployees.length;

    // 3. Calculate individual bonuses
    const calculations: EmployeeBonusCalculation[] = [];
    let totalCalculatedBonus = 0;

    for (const employee of eligibleEmployees) {
      const calculation = this.calculateIndividualBonus(
        employee,
        basePerEmployee,
        companyPerformanceScore
      );

      calculations.push(calculation);
      totalCalculatedBonus += calculation.calculatedBonus;
    }

    // 4. Sort by calculated bonus (highest first)
    calculations.sort((a, b) => b.calculatedBonus - a.calculatedBonus);

    logger.info(`Completed bonus calculation for ${calculations.length} employees. Total: $${totalCalculatedBonus.toFixed(2)}`);

    return {
      tenantId,
      totalBudget: bonusBudget,
      companyPerformance: companyPerformanceScore,
      eligibleEmployees: eligibleEmployees.length,
      basePerEmployee,
      calculations,
      totalCalculatedBonus,
      remainingBudget: bonusBudget - totalCalculatedBonus
    };
  }

  /**
   * Get all eligible employees with their latest performance scores
   */
  private async getEligibleEmployeesWithPerformance(
    tenantId: string,
    performanceCycleId?: string
  ): Promise<Array<{
    id: string;
    name: string;
    role: string;
    performanceScore: number;
  }>> {
    // Get active employees
    const activeUsers = await db
      .select({
        id: users.id,
        name: users.name,
        role: users.role
      })
      .from(users)
      .where(and(
        eq(users.tenantId, tenantId),
        eq(users.isActive, true)
      ));

    // Get latest performance evaluations for these employees
    const employeeIds = activeUsers.map(u => u.id);

    if (employeeIds.length === 0) {
      return [];
    }

    // Build the query for performance evaluations
    const evaluationsQuery = db
      .select({
        employeeId: performanceEvaluations.employeeId,
        overallRating: performanceEvaluations.overallRating
      })
      .from(performanceEvaluations)
      .where(and(
        eq(performanceEvaluations.tenantId, tenantId),
        eq(performanceEvaluations.status, 'completed'),
        isNotNull(performanceEvaluations.overallRating),
        inArray(performanceEvaluations.employeeId, employeeIds),
        ...(performanceCycleId ? [eq(performanceEvaluations.performanceCycleId, performanceCycleId)] : [])
      ))
      .orderBy(desc(performanceEvaluations.completedAt));

    const evaluations = await evaluationsQuery;

    // Create a map of employee ID to latest evaluation
    const evaluationMap = new Map<string, number>();
    for (const eval_ of evaluations) {
      if (!evaluationMap.has(eval_.employeeId)) {
        evaluationMap.set(eval_.employeeId, parseFloat(eval_.overallRating || '3'));
      }
    }

    // Combine users with their performance scores
    // Only include employees who have completed evaluations
    const eligibleEmployees = activeUsers
      .filter(user => evaluationMap.has(user.id))
      .map(user => ({
        id: user.id,
        name: user.name,
        role: user.role,
        performanceScore: evaluationMap.get(user.id) || 3
      }));

    return eligibleEmployees;
  }

  /**
   * Calculate bonus for a single employee
   */
  private calculateIndividualBonus(
    employee: { id: string; name: string; role: string; performanceScore: number },
    baseBonus: number,
    companyPerformanceScore: number
  ): EmployeeBonusCalculation {
    // Determine role type
    const employeeRole: 'manager' | 'non_manager' = isManager(employee.role) ? 'manager' : 'non_manager';

    // Get weights based on role
    const weights = getRoleWeights(employee.role);

    // Convert performance score to payout percentage
    const employeePerformancePercentage = scoreToPayoutPercentage(employee.performanceScore);

    // Convert company performance to decimal (0-1)
    const companyPerformanceDecimal = companyPerformanceScore / 100;

    // Calculate bonus using the formula:
    // Employee Bonus = Base Bonus × [(Company Performance × Company Weight) + (Employee Performance Percentage × Employee Weight)]
    const calculatedBonus = baseBonus * (
      (companyPerformanceDecimal * weights.companyWeight) +
      (employeePerformancePercentage * weights.employeeWeight)
    );

    // Round to 2 decimal places
    const roundedBonus = Math.round(calculatedBonus * 100) / 100;

    // Generate rationale
    const rationale = generateRationale(
      employeeRole,
      employee.performanceScore,
      companyPerformanceScore,
      roundedBonus,
      baseBonus
    );

    return {
      employeeId: employee.id,
      employeeName: employee.name,
      employeeRole,
      performanceScore: employee.performanceScore,
      companyWeight: weights.companyWeight,
      employeeWeight: weights.employeeWeight,
      companyPerformance: companyPerformanceScore,
      employeePerformancePercentage: employeePerformancePercentage * 100,
      baseBonus,
      calculatedBonus: roundedBonus,
      rationale
    };
  }

  /**
   * Save bonus calculations as recommendations to the database
   */
  async saveCalculationsAsRecommendations(
    result: BonusCalculationResult,
    triggerSource: string = 'performance_review',
    currency: string = 'USD'
  ): Promise<void> {
    logger.info(`Saving ${result.calculations.length} bonus recommendations`);

    for (const calc of result.calculations) {
      // Skip employees with no bonus (score 1)
      if (calc.calculatedBonus <= 0) {
        logger.debug(`Skipping recommendation for ${calc.employeeName} - no bonus due to score 1`);
        continue;
      }

      await db.insert(bonusRecommendations).values({
        tenantId: result.tenantId,
        employeeId: calc.employeeId,
        triggerSource,
        triggerData: {
          performanceScore: calc.performanceScore,
          companyPerformance: calc.companyPerformance,
          roleType: calc.employeeRole,
          companyWeight: calc.companyWeight,
          employeeWeight: calc.employeeWeight,
          employeePerformancePercentage: calc.employeePerformancePercentage,
          baseBonus: calc.baseBonus,
          calculationFormula: 'Base × [(Company Performance × Company Weight) + (Employee Performance % × Employee Weight)]'
        },
        bonusType: 'performance',
        recommendedAmount: calc.calculatedBonus.toFixed(2),
        currency,
        rationale: calc.rationale,
        status: 'recommended'
      });
    }

    logger.info(`Saved ${result.calculations.filter(c => c.calculatedBonus > 0).length} bonus recommendations`);
  }

  /**
   * Calculate bonus for a single employee (for individual triggers)
   */
  async calculateBonusForEmployee(
    tenantId: string,
    employeeId: string,
    companyPerformanceScore: number,
    baseBonusAmount: number
  ): Promise<EmployeeBonusCalculation | null> {
    // Get employee details
    const [employee] = await db
      .select({
        id: users.id,
        name: users.name,
        role: users.role
      })
      .from(users)
      .where(and(
        eq(users.id, employeeId),
        eq(users.tenantId, tenantId),
        eq(users.isActive, true)
      ));

    if (!employee) {
      logger.warn(`Employee ${employeeId} not found in tenant ${tenantId}`);
      return null;
    }

    // Get latest performance evaluation
    const [evaluation] = await db
      .select({
        overallRating: performanceEvaluations.overallRating
      })
      .from(performanceEvaluations)
      .where(and(
        eq(performanceEvaluations.employeeId, employeeId),
        eq(performanceEvaluations.tenantId, tenantId),
        eq(performanceEvaluations.status, 'completed'),
        isNotNull(performanceEvaluations.overallRating)
      ))
      .orderBy(desc(performanceEvaluations.completedAt))
      .limit(1);

    if (!evaluation) {
      logger.warn(`No completed performance evaluation found for employee ${employeeId}`);
      return null;
    }

    const performanceScore = parseFloat(evaluation.overallRating || '3');

    return this.calculateIndividualBonus(
      {
        id: employee.id,
        name: employee.name,
        role: employee.role,
        performanceScore
      },
      baseBonusAmount,
      companyPerformanceScore
    );
  }
}

// Export singleton instance
export const bonusCalculationService = new BonusCalculationService();
