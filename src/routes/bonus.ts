import { Router } from 'express';

import { bonusAgent, BonusTriggerSchema, BulkBonusCalculationSchema } from '../services/agents/bonus/bonus-agent';

import { authenticate, authorize } from '../middleware/auth';

import { z } from 'zod';
import { logger } from '../services/logger';
import { db } from '../../db';
import { bonusRecommendations, bonusPayouts } from '../../db/schema/bonus';
import { users } from '../../db/schema/core';
import { eq, and, desc, count, sql } from 'drizzle-orm';

const router = Router();

// ============================================================================
// BONUS CALCULATION BUSINESS RULES (Implemented in bonus-calculation.service.ts)
// ============================================================================
//
// ROLE-BASED WEIGHTING:
// - Managers (role = 'manager' or 'admin'): 60% company performance + 40% individual performance
// - Non-Managers (role = 'employee'): 40% company performance + 60% individual performance
//
// PERFORMANCE SCORE TO PAYOUT PERCENTAGE:
// - Score 1 = 0% (no bonus)
// - Score 2 = 40%
// - Score 3 = 60%
// - Score 4 = 80%
// - Score 5 = 100%
//
// CALCULATION FORMULA:
// Employee Bonus = Base Bonus × [(Company Performance × Company Weight) + (Employee Performance % × Employee Weight)]
// ============================================================================

// ============================================================================
// GET /api/bonus/criteria - Get bonus calculation criteria/rules
// ============================================================================
router.get('/criteria', authenticate, async (req, res) => {
  try {
    // Return the hardcoded business rules
    // In the future, these could be stored in the database and be configurable per tenant
    res.json({
      roleWeighting: {
        description: 'Role-based weighting for bonus calculation',
        manager: {
          companyWeight: 0.60,
          employeeWeight: 0.40,
          explanation: 'Managers: 60% company performance + 40% individual performance'
        },
        nonManager: {
          companyWeight: 0.40,
          employeeWeight: 0.60,
          explanation: 'Non-Managers: 40% company performance + 60% individual performance'
        }
      },
      performanceScoreMapping: {
        description: 'Performance score to payout percentage mapping',
        scores: [
          { score: 1, payoutPercentage: 0, label: 'Does Not Meet Expectations', description: 'No bonus awarded' },
          { score: 2, payoutPercentage: 40, label: 'Needs Improvement', description: '40% of eligible bonus' },
          { score: 3, payoutPercentage: 60, label: 'Meets Expectations', description: '60% of eligible bonus' },
          { score: 4, payoutPercentage: 80, label: 'Exceeds Expectations', description: '80% of eligible bonus' },
          { score: 5, payoutPercentage: 100, label: 'Outstanding', description: '100% of eligible bonus' }
        ]
      },
      calculationFormula: {
        description: 'Bonus calculation formula',
        formula: 'Employee Bonus = Base Bonus × [(Company Performance × Company Weight) + (Employee Performance % × Employee Weight)]',
        example: {
          scenario: 'Manager with Performance Score 4, Company Performance 90%',
          calculation: 'Base $10,000 × [(0.90 × 0.60) + (0.80 × 0.40)] = $10,000 × [0.54 + 0.32] = $8,600'
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching bonus criteria:', error);
    res.status(500).json({ error: 'Failed to fetch bonus criteria' });
  }
});

// ============================================================================
// GET /api/bonus/overview - Dashboard overview data
// ============================================================================
router.get('/overview', authenticate, async (req, res) => {
  try {
    const user = (req as { user: { tenantId: string; id: string } }).user;
    const tenantId = user.tenantId;

    // Get recommendation counts by status
    const recommendationStats = await db
      .select({
        status: bonusRecommendations.status,
        count: count(),
        totalAmount: sql<string>`COALESCE(SUM(CAST(${bonusRecommendations.recommendedAmount} AS DECIMAL)), 0)`
      })
      .from(bonusRecommendations)
      .where(eq(bonusRecommendations.tenantId, tenantId))
      .groupBy(bonusRecommendations.status);

    // Get recommendation counts by type
    const typeStats = await db
      .select({
        bonusType: bonusRecommendations.bonusType,
        count: count(),
        totalAmount: sql<string>`COALESCE(SUM(CAST(${bonusRecommendations.recommendedAmount} AS DECIMAL)), 0)`
      })
      .from(bonusRecommendations)
      .where(eq(bonusRecommendations.tenantId, tenantId))
      .groupBy(bonusRecommendations.bonusType);

    // Get payout stats
    const payoutStats = await db
      .select({
        status: bonusPayouts.status,
        count: count(),
        totalAmount: sql<string>`COALESCE(SUM(CAST(${bonusPayouts.payoutAmount} AS DECIMAL)), 0)`
      })
      .from(bonusPayouts)
      .where(eq(bonusPayouts.tenantId, tenantId))
      .groupBy(bonusPayouts.status);

    // Calculate summary metrics
    const totalRecommendations = recommendationStats.reduce((acc, s) => acc + (s.count || 0), 0);
    const totalRecommendedAmount = recommendationStats.reduce(
      (acc, s) => acc + parseFloat(s.totalAmount || '0'),
      0
    );
    const pendingApprovals = recommendationStats
      .filter(s => s.status === 'recommended')
      .reduce((acc, s) => acc + (s.count || 0), 0);
    const approvedCount = recommendationStats
      .filter(s => s.status === 'approved')
      .reduce((acc, s) => acc + (s.count || 0), 0);
    const paidCount = recommendationStats
      .filter(s => s.status === 'paid')
      .reduce((acc, s) => acc + (s.count || 0), 0);
    const paidAmount = recommendationStats
      .filter(s => s.status === 'paid')
      .reduce((acc, s) => acc + parseFloat(s.totalAmount || '0'), 0);

    res.json({
      summary: {
        totalRecommendations,
        totalRecommendedAmount,
        pendingApprovals,
        approvedCount,
        paidCount,
        paidAmount,
        averageBonus: totalRecommendations > 0 ? Math.round(totalRecommendedAmount / totalRecommendations) : 0
      },
      recommendationStats,
      typeStats,
      payoutStats
    });
  } catch (error) {
    logger.error('Error fetching bonus overview:', error);
    res.status(500).json({ error: 'Failed to fetch bonus overview' });
  }
});

// ============================================================================
// GET /api/bonus/recommendations - Get all bonus recommendations
// ============================================================================
router.get('/recommendations', authenticate, async (req, res) => {
  try {
    const user = (req as { user: { tenantId: string; id: string } }).user;
    const tenantId = user.tenantId;

    const allRecommendations = await db
      .select({
        recommendation: bonusRecommendations,
        employee: users
      })
      .from(bonusRecommendations)
      .leftJoin(users, eq(bonusRecommendations.employeeId, users.id))
      .where(eq(bonusRecommendations.tenantId, tenantId))
      .orderBy(desc(bonusRecommendations.createdAt));

    const recommendationsWithDetails = allRecommendations.map(r => ({
      id: r.recommendation.id,
      employeeId: r.recommendation.employeeId,
      employeeName: r.employee?.name || 'Unknown',
      employeeEmail: r.employee?.email || '',
      department: r.employee?.departmentId || '',
      bonusType: r.recommendation.bonusType,
      recommendedAmount: parseFloat(r.recommendation.recommendedAmount),
      currency: r.recommendation.currency,
      rationale: r.recommendation.rationale,
      status: r.recommendation.status,
      triggerSource: r.recommendation.triggerSource,
      approvedBy: r.recommendation.approvedBy,
      approvedAt: r.recommendation.approvedAt,
      rejectionReason: r.recommendation.rejectionReason,
      createdAt: r.recommendation.createdAt,
      updatedAt: r.recommendation.updatedAt
    }));

    res.json({ recommendations: recommendationsWithDetails });
  } catch (error) {
    logger.error('Error fetching bonus recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch bonus recommendations' });
  }
});

// ============================================================================
// PUT /api/bonus/recommendations/:id/status - Update recommendation status
// ============================================================================
router.put('/recommendations/:id/status', authenticate, async (req, res) => {
  try {
    const user = (req as { user: { tenantId: string; id: string } }).user;
    const tenantId = user.tenantId;
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    const updateData: Record<string, unknown> = {
      status,
      updatedAt: new Date()
    };

    if (status === 'approved') {
      updateData.approvedBy = user.id;
      updateData.approvedAt = new Date();
    } else if (status === 'rejected' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    const [updated] = await db
      .update(bonusRecommendations)
      .set(updateData)
      .where(and(
        eq(bonusRecommendations.id, id),
        eq(bonusRecommendations.tenantId, tenantId)
      ))
      .returning();

    res.json({ success: true, recommendation: updated });
  } catch (error) {
    logger.error('Error updating bonus recommendation:', error);
    res.status(500).json({ error: 'Failed to update bonus recommendation' });
  }
});

// ============================================================================
// GET /api/bonus/payouts - Get all bonus payouts
// ============================================================================
router.get('/payouts', authenticate, async (req, res) => {
  try {
    const user = (req as { user: { tenantId: string; id: string } }).user;
    const tenantId = user.tenantId;

    const allPayouts = await db
      .select({
        payout: bonusPayouts,
        employee: users,
        recommendation: bonusRecommendations
      })
      .from(bonusPayouts)
      .leftJoin(users, eq(bonusPayouts.employeeId, users.id))
      .leftJoin(bonusRecommendations, eq(bonusPayouts.recommendationId, bonusRecommendations.id))
      .where(eq(bonusPayouts.tenantId, tenantId))
      .orderBy(desc(bonusPayouts.createdAt));

    const payoutsWithDetails = allPayouts.map(p => ({
      id: p.payout.id,
      recommendationId: p.payout.recommendationId,
      employeeId: p.payout.employeeId,
      employeeName: p.employee?.name || 'Unknown',
      employeeEmail: p.employee?.email || '',
      department: p.employee?.departmentId || '',
      payoutAmount: parseFloat(p.payout.payoutAmount),
      currency: p.payout.currency,
      status: p.payout.status,
      bonusType: p.recommendation?.bonusType || 'unknown',
      rationale: p.recommendation?.rationale || '',
      paymentTransactionId: p.payout.paymentTransactionId,
      paidAt: p.payout.paidAt,
      createdAt: p.payout.createdAt
    }));

    res.json({ payouts: payoutsWithDetails });
  } catch (error) {
    logger.error('Error fetching bonus payouts:', error);
    res.status(500).json({ error: 'Failed to fetch bonus payouts' });
  }
});

// ============================================================================
// POST /api/bonus/payouts - Create a payout for an approved recommendation
// ============================================================================
router.post('/payouts', authenticate, async (req, res) => {
  try {
    const user = (req as { user: { tenantId: string; id: string } }).user;
    const tenantId = user.tenantId;
    const { recommendationId, payoutAmount, currency } = req.body;

    // Verify recommendation exists and is approved
    const [recommendation] = await db
      .select()
      .from(bonusRecommendations)
      .where(and(
        eq(bonusRecommendations.id, recommendationId),
        eq(bonusRecommendations.tenantId, tenantId),
        eq(bonusRecommendations.status, 'approved')
      ));

    if (!recommendation) {
      return res.status(400).json({ error: 'Recommendation not found or not approved' });
    }

    const [payout] = await db
      .insert(bonusPayouts)
      .values({
        recommendationId,
        tenantId,
        employeeId: recommendation.employeeId,
        payoutAmount: payoutAmount || recommendation.recommendedAmount,
        currency: currency || recommendation.currency,
        status: 'pending'
      })
      .returning();

    // Update recommendation status to paid
    await db
      .update(bonusRecommendations)
      .set({ status: 'paid', updatedAt: new Date() })
      .where(eq(bonusRecommendations.id, recommendationId));

    res.json({ success: true, payout });
  } catch (error) {
    logger.error('Error creating bonus payout:', error);
    res.status(500).json({ error: 'Failed to create bonus payout' });
  }
});

// ============================================================================
// PUT /api/bonus/payouts/:id/status - Update payout status
// ============================================================================
router.put('/payouts/:id/status', authenticate, async (req, res) => {
  try {
    const user = (req as { user: { tenantId: string; id: string } }).user;
    const tenantId = user.tenantId;
    const { id } = req.params;
    const { status, paymentTransactionId } = req.body;

    const updateData: Record<string, unknown> = { status };

    if (status === 'paid') {
      updateData.paidAt = new Date();
      if (paymentTransactionId) {
        updateData.paymentTransactionId = paymentTransactionId;
      }
    }

    const [updated] = await db
      .update(bonusPayouts)
      .set(updateData)
      .where(and(
        eq(bonusPayouts.id, id),
        eq(bonusPayouts.tenantId, tenantId)
      ))
      .returning();

    res.json({ success: true, payout: updated });
  } catch (error) {
    logger.error('Error updating bonus payout:', error);
    res.status(500).json({ error: 'Failed to update bonus payout' });
  }
});

// ============================================================================
// GET /api/bonus/analytics - Analytics and reporting data
// ============================================================================
router.get('/analytics', authenticate, async (req, res) => {
  try {
    const user = (req as { user: { tenantId: string; id: string } }).user;
    const tenantId = user.tenantId;

    // Get recommendations with employee data for department breakdown
    const allRecommendations = await db
      .select({
        recommendation: bonusRecommendations,
        employee: users
      })
      .from(bonusRecommendations)
      .leftJoin(users, eq(bonusRecommendations.employeeId, users.id))
      .where(eq(bonusRecommendations.tenantId, tenantId));

    // Calculate department breakdown
    const departmentMap = new Map<string, {
      totalBonus: number;
      count: number;
      paidCount: number;
      paidAmount: number;
    }>();

    allRecommendations.forEach(r => {
      const dept = r.employee?.departmentId || 'Unknown';
      const amount = parseFloat(r.recommendation.recommendedAmount);
      const existing = departmentMap.get(dept) || {
        totalBonus: 0,
        count: 0,
        paidCount: 0,
        paidAmount: 0
      };

      existing.totalBonus += amount;
      existing.count += 1;
      if (r.recommendation.status === 'paid') {
        existing.paidCount += 1;
        existing.paidAmount += amount;
      }

      departmentMap.set(dept, existing);
    });

    const departmentBreakdown = Array.from(departmentMap.entries()).map(([dept, data]) => ({
      department: dept,
      totalBonus: Math.round(data.totalBonus),
      count: data.count,
      averageBonus: data.count > 0 ? Math.round(data.totalBonus / data.count) : 0,
      paidCount: data.paidCount,
      paidAmount: Math.round(data.paidAmount)
    }));

    // Calculate type breakdown
    const typeMap = new Map<string, { totalBonus: number; count: number }>();
    allRecommendations.forEach(r => {
      const type = r.recommendation.bonusType || 'unknown';
      const amount = parseFloat(r.recommendation.recommendedAmount);
      const existing = typeMap.get(type) || { totalBonus: 0, count: 0 };
      existing.totalBonus += amount;
      existing.count += 1;
      typeMap.set(type, existing);
    });

    const typeBreakdown = Array.from(typeMap.entries()).map(([type, data]) => ({
      bonusType: type,
      totalBonus: Math.round(data.totalBonus),
      count: data.count,
      averageBonus: data.count > 0 ? Math.round(data.totalBonus / data.count) : 0
    }));

    // Get top recipients
    const topRecipients = allRecommendations
      .filter(r => r.recommendation.status === 'paid' || r.recommendation.status === 'approved')
      .map(r => ({
        employeeId: r.recommendation.employeeId,
        employeeName: r.employee?.name || 'Unknown',
        department: r.employee?.departmentId || '',
        bonusAmount: parseFloat(r.recommendation.recommendedAmount),
        bonusType: r.recommendation.bonusType,
        status: r.recommendation.status
      }))
      .sort((a, b) => b.bonusAmount - a.bonusAmount)
      .slice(0, 10);

    // Calculate totals
    const totalRecommended = allRecommendations.reduce(
      (acc, r) => acc + parseFloat(r.recommendation.recommendedAmount),
      0
    );
    const totalPaid = allRecommendations
      .filter(r => r.recommendation.status === 'paid')
      .reduce((acc, r) => acc + parseFloat(r.recommendation.recommendedAmount), 0);
    const uniqueEmployees = new Set(allRecommendations.map(r => r.recommendation.employeeId)).size;

    res.json({
      metrics: {
        totalRecommended: Math.round(totalRecommended),
        totalPaid: Math.round(totalPaid),
        totalRecommendations: allRecommendations.length,
        uniqueEmployees,
        averageBonus: allRecommendations.length > 0
          ? Math.round(totalRecommended / allRecommendations.length)
          : 0
      },
      departmentBreakdown,
      typeBreakdown,
      topRecipients
    });
  } catch (error) {
    logger.error('Error fetching bonus analytics:', error);
    res.status(500).json({ error: 'Failed to fetch bonus analytics' });
  }
});

// ============================================================================
// POST /api/bonus/calculate - Bulk bonus calculation for all eligible employees
// ============================================================================
/**
 * POST /api/bonus/calculate
 * Calculate bonuses for all eligible employees based on:
 * - Bonus budget
 * - Company performance score
 * - Individual performance scores
 * - Role-based weighting (Manager: 60/40, Non-Manager: 40/60)
 * - Score-based payout percentages (1=0%, 2=40%, 3=60%, 4=80%, 5=100%)
 */
router.post('/calculate', authenticate, authorize(['system', 'superadmin', 'clientAdmin', 'admin']), async (req, res) => {
  try {
    const user = (req as { user: { tenantId: string; id: string } }).user;

    // Validate input
    const validatedInput = BulkBonusCalculationSchema.parse({
      ...req.body,
      tenantId: user.tenantId // Use authenticated user's tenant
    });

    logger.info(`Starting bulk bonus calculation for tenant ${user.tenantId}`);
    logger.info(`Budget: $${validatedInput.bonusBudget}, Company Performance: ${validatedInput.companyPerformanceScore}%`);

    const result = await bonusAgent.calculateBulkBonuses(validatedInput);

    res.json({
      success: true,
      message: `Calculated bonuses for ${result.eligibleEmployees} eligible employees`,
      data: result
    });

  } catch (error: unknown) {
    logger.error('Bulk bonus calculation error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid input data', details: error.errors });
    }

    if (error instanceof Error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.status(500).json({ success: false, error: 'Failed to calculate bonuses' });
  }
});

// ============================================================================
// POST /api/bonus/calculate/preview - Preview bonus calculation (without saving)
// ============================================================================
router.post('/calculate/preview', authenticate, authorize(['system', 'superadmin', 'clientAdmin', 'admin']), async (req, res) => {
  try {
    const user = (req as { user: { tenantId: string; id: string } }).user;

    const validatedInput = BulkBonusCalculationSchema.parse({
      ...req.body,
      tenantId: user.tenantId,
      saveRecommendations: false // Always false for preview
    });

    logger.info(`Previewing bonus calculation for tenant ${user.tenantId}`);

    const result = await bonusAgent.previewBonusCalculation(validatedInput);

    res.json({
      success: true,
      message: `Preview: ${result.eligibleEmployees} eligible employees`,
      data: result
    });

  } catch (error: unknown) {
    logger.error('Bonus calculation preview error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid input data', details: error.errors });
    }

    if (error instanceof Error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.status(500).json({ success: false, error: 'Failed to preview bonus calculation' });
  }
});

/**
 * POST /api/bonus/trigger
 * Receives a trigger to run bonus analysis for an employee.
 */
router.post('/trigger', authenticate, authorize(['system', 'superadmin', 'clientAdmin']), async (req, res) => {
    try {
        const validatedInput = BonusTriggerSchema.parse(req.body);

        const result = await bonusAgent.handleBonusTrigger(validatedInput);

        res.json({
            success: true,
            message: 'Bonus trigger processed successfully.',
            data: result,
        });

    } catch (error: unknown) {
        logger.error('Bonus trigger error:', error);

        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, error: 'Invalid input data', details: error.errors });
        }

        if (error instanceof Error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        res.status(500).json({ success: false, error: 'Failed to process bonus trigger' });
    }
});

export default router;
