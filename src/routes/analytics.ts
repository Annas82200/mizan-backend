/**
 * Analytics Routes — Executive and Manager dashboard data
 */

import { Router, Request, Response } from 'express';
import { db } from '../db/index';
import {
  onboardingAssignments, pulseSurveys, pulseResponses,
  gamificationPoints, recognitions, challenges,
  bonusCycles, bonusAllocations,
  successionPlans, developmentPlans,
  moduleConfigs, analysisResults, employees,
} from '../db/schema';
import { eq, and, sql, desc, gte } from 'drizzle-orm';

const router = Router();

interface AuthRequest extends Request {
  userId: string;
  tenantId: string;
  userRole: string;
}

/**
 * Executive Dashboard — Org-wide metrics
 */
router.get('/executive', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;

  try {
    // Aggregate metrics across modules for this tenant
    const [surveyData, activeOnboardings, activeChallenges, bonusCycleData, successionData] = await Promise.all([
      db.select().from(pulseSurveys).where(and(eq(pulseSurveys.tenantId, tenantId), eq(pulseSurveys.status, 'active'))),
      db.select().from(onboardingAssignments).where(and(eq(onboardingAssignments.tenantId, tenantId), eq(onboardingAssignments.status, 'in_progress'))),
      db.select().from(challenges).where(and(eq(challenges.tenantId, tenantId), eq(challenges.status, 'active'))),
      db.select().from(bonusCycles).where(eq(bonusCycles.tenantId, tenantId)).orderBy(desc(bonusCycles.createdAt)).limit(1),
      db.select().from(successionPlans).where(eq(successionPlans.tenantId, tenantId)),
    ]);

    // Get engagement points summary
    const pointsResult = await db.select({
      totalPoints: sql<number>`COALESCE(SUM(${gamificationPoints.points}), 0)`,
      totalUsers: sql<number>`COUNT(DISTINCT ${gamificationPoints.userId})`,
    }).from(gamificationPoints).where(eq(gamificationPoints.tenantId, tenantId));

    const totalPoints = Number(pointsResult[0]?.totalPoints) || 0;
    const engagedUsers = Number(pointsResult[0]?.totalUsers) || 0;

    // Get real employee count from employees table
    const [empCount] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(employees).where(eq(employees.tenantId, tenantId));
    const employeeCount = Number(empCount?.count) || engagedUsers;

    // Read latest analysis results (computed by the orchestrator)
    const latestAnalysis = await db.select().from(analysisResults)
      .where(eq(analysisResults.tenantId, tenantId))
      .orderBy(desc(analysisResults.createdAt))
      .limit(1);

    const analysis = latestAnalysis[0];

    return res.json({
      orgHealthScore: analysis?.orgHealthScore ?? 0,
      cultureEntropy: analysis?.cultureEntropy ?? 0,
      skillsReadiness: analysis?.skillsReadinessScore ?? 0,
      employeeCount,
      turnoverRate: 0, // Requires termination date tracking — computed when available
      engagementScore: engagedUsers > 0 ? Math.min(100, Math.round(totalPoints / engagedUsers)) : 0,
      openPositions: successionData.filter(s => s.status === 'active').length,
      aiInsights: [
        { title: `${activeOnboardings.length} active onboardings`, description: 'New hires currently being onboarded', priority: 'medium' },
        { title: `${activeChallenges.length} active engagement challenges`, description: 'Values-based challenges driving team participation', priority: 'low' },
        { title: `${successionData.length} succession plans`, description: 'Critical roles with identified successors', priority: successionData.length === 0 ? 'high' : 'low' },
      ],
      departmentScores: analysis?.structureDetails
        ? ((analysis.structureDetails as Record<string, unknown>).bottlenecks as Array<{ departmentName: string; issue: string }> || []).map(b => ({
            name: b.departmentName, health: Math.max(0, 100 - (b.issue ? 20 : 0)), trend: 'stable',
          }))
        : [],
    });
  } catch (error) {
    console.error('[Analytics] Executive dashboard error:', error);
    return res.status(500).json({ error: 'Failed to load executive metrics' });
  }
});

/**
 * Manager Dashboard — Team-level metrics
 */
router.get('/manager', async (req: Request, res: Response) => {
  const { tenantId, userId } = req as AuthRequest;

  try {
    // Get development plans for the manager's reports
    const devPlans = await db.select().from(developmentPlans)
      .where(and(eq(developmentPlans.tenantId, tenantId), eq(developmentPlans.managerId, userId)));

    // Look up real employee names for team members
    const employeeIds = devPlans.map(p => p.employeeId);
    const teamEmployees = employeeIds.length > 0
      ? await db.select({ id: employees.id, firstName: employees.firstName, lastName: employees.lastName })
          .from(employees).where(eq(employees.tenantId, tenantId))
      : [];
    const empNameMap = new Map(teamEmployees.map(e => [e.id, `${e.firstName} ${e.lastName}`]));

    // Get real pending approvals count
    const { approvalRequests } = await import('../db/schema');
    const pendingApprovals = await db.select({ count: sql<number>`COUNT(*)` })
      .from(approvalRequests)
      .where(and(eq(approvalRequests.tenantId, tenantId), eq(approvalRequests.status, 'pending')));

    return res.json({
      teamSize: devPlans.length,
      avgGoalProgress: devPlans.length > 0
        ? Math.round(devPlans.reduce((sum, p) => sum + (p.progressPercentage || 0), 0) / devPlans.length)
        : 0,
      avgSkillsScore: 0,
      pendingApprovals: Number(pendingApprovals[0]?.count) || 0,
      upcomingOneOnOnes: 0,
      teamMembers: devPlans.map(p => ({
        id: p.employeeId,
        name: empNameMap.get(p.employeeId) || 'Team Member',
        role: p.targetRole || 'Team Member',
        goalsProgress: p.progressPercentage || 0,
        skillsScore: 0,
        lastOneOnOne: null,
      })),
      actionItems: devPlans
        .filter(p => p.status === 'at_risk')
        .map(p => ({
          id: p.id,
          title: `Review at-risk development plan: ${p.title}`,
          type: 'development_review',
          dueDate: p.targetCompletionDate?.toISOString() || new Date().toISOString(),
          priority: 'high',
        })),
      teamCultureScore: 0,
    });
  } catch (error) {
    console.error('[Analytics] Manager dashboard error:', error);
    return res.status(500).json({ error: 'Failed to load manager metrics' });
  }
});

export default router;
