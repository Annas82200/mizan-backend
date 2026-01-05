import { Router, Request, Response } from 'express';

import { authenticate } from '../middleware/auth';

import { db } from '../../db/index';

import {
  performanceGoals,
  performanceReviews,
  performanceEvaluations,
  oneOnOneMeetings,
  performanceCalibrations
} from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '../services/logger';


const router = Router();

/**
 * GET /api/performance/metrics
 * Get performance metrics overview for current user
 */
router.get('/metrics', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user: { id: string; tenantId: string } }).user;

    // Get goals statistics
    const userGoals = await db.select()
      .from(performanceGoals)
      .where(
        and(
          eq(performanceGoals.tenantId, user.tenantId),
          eq(performanceGoals.employeeId, user.id)
        )
      );

    const goalsProgress = {
      total: userGoals.length,
      completed: userGoals.filter(g => g.status === 'completed').length,
      inProgress: userGoals.filter(g => g.status === 'active').length,
      pending: userGoals.filter(g => g.status === 'draft').length
    };

    // Get evaluations statistics (evaluation meetings, not reviews)
    const userEvaluations = await db.select()
      .from(performanceEvaluations)
      .where(
        and(
          eq(performanceEvaluations.tenantId, user.tenantId),
          eq(performanceEvaluations.employeeId, user.id)
        )
      );

    const now = new Date();
    const evaluations = {
      upcoming: userEvaluations.filter(e =>
        e.status === 'scheduled' && e.scheduledDate && new Date(e.scheduledDate) > now
      ).length,
      overdue: userEvaluations.filter(e =>
        e.status === 'scheduled' && e.scheduledDate && new Date(e.scheduledDate) < now
      ).length,
      completed: userEvaluations.filter(e => e.status === 'completed').length
    };

    // Get 1:1 meetings statistics (regular pulse check meetings)
    const userMeetings = await db.select()
      .from(oneOnOneMeetings)
      .where(
        and(
          eq(oneOnOneMeetings.tenantId, user.tenantId),
          eq(oneOnOneMeetings.employeeId, user.id)
        )
      );

    const completedMeetings = userMeetings.filter(m => m.status === 'completed');
    const averageRating = completedMeetings.length > 0
      ? completedMeetings.reduce((sum, m) => {
          const empSat = m.employeeSatisfaction || 0;
          const mgrSat = m.managerSatisfaction || 0;
          return sum + ((empSat + mgrSat) / 2);
        }, 0) / completedMeetings.length
      : 0;

    const meetings = {
      scheduled: userMeetings.filter(m => m.status === 'scheduled').length,
      completed: completedMeetings.length,
      averageRating: Math.round(averageRating * 10) / 10
    };

    // Get calibration status
    const latestCalibration = await db.select()
      .from(performanceCalibrations)
      .where(eq(performanceCalibrations.tenantId, user.tenantId))
      .orderBy(desc(performanceCalibrations.createdAt))
      .limit(1);

    const calibration = {
      status: latestCalibration[0]?.status || 'not_started',
      lastDate: latestCalibration[0]?.completedAt || null
    };

    // Calculate overall score based on goal completion and progress
    const completedGoals = userGoals.filter(g => g.status === 'completed');
    const overallScore = completedGoals.length > 0
      ? Math.round(
          completedGoals.reduce((sum, g) => {
            // Use progressPercentage if available, otherwise calculate from current vs target
            const progress = g.progressPercentage
              ? parseFloat(g.progressPercentage.toString())
              : (() => {
                  const targetValue = typeof g.target === 'object' && g.target !== null && 'value' in g.target
                    ? (g.target as { value: number }).value
                    : 100;
                  const currentValue = typeof g.current === 'object' && g.current !== null && 'value' in g.current
                    ? (g.current as { value: number }).value
                    : 0;
                  return (currentValue / targetValue) * 100;
                })();
            const weight = parseFloat(g.weight);
            return sum + (progress * weight);
          }, 0) / completedGoals.reduce((sum, g) => sum + parseFloat(g.weight), 0)
        )
      : 0;

    res.json({
      overallScore,
      goalsProgress,
      evaluations,
      meetings,
      calibration
    });
  } catch (error) {
    logger.error('Error fetching performance metrics:', error);
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
});

/**
 * GET /api/performance/activity
 * Get recent performance-related activity
 */
router.get('/activity', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user: { id: string; tenantId: string } }).user;
    const activities: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      timestamp: Date;
      status: string;
    }> = [];

    // Get recent goals
    const recentGoals = await db.select()
      .from(performanceGoals)
      .where(
        and(
          eq(performanceGoals.tenantId, user.tenantId),
          eq(performanceGoals.employeeId, user.id)
        )
      )
      .orderBy(desc(performanceGoals.updatedAt))
      .limit(5);

    recentGoals.forEach(goal => {
      activities.push({
        id: goal.id,
        type: 'goal',
        title: goal.title,
        description: goal.description || '',
        timestamp: goal.updatedAt,
        status: goal.status
      });
    });

    // Get recent evaluations
    const recentEvaluations = await db.select()
      .from(performanceEvaluations)
      .where(
        and(
          eq(performanceEvaluations.tenantId, user.tenantId),
          eq(performanceEvaluations.employeeId, user.id)
        )
      )
      .orderBy(desc(performanceEvaluations.updatedAt))
      .limit(5);

    recentEvaluations.forEach(evaluation => {
      activities.push({
        id: evaluation.id,
        type: 'evaluation',
        title: `Performance Evaluation - ${evaluation.period}`,
        description: `Evaluation scheduled for ${new Date(evaluation.scheduledDate).toLocaleDateString()}`,
        timestamp: evaluation.updatedAt,
        status: evaluation.status
      });
    });

    // Sort all activities by timestamp
    activities.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    res.json(activities.slice(0, 10));
  } catch (error) {
    logger.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

/**
 * GET /api/performance/goals
 * Get all performance goals for current user
 */
router.get('/goals', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user: { id: string; tenantId: string } }).user;

    const goals = await db.select()
      .from(performanceGoals)
      .where(
        and(
          eq(performanceGoals.tenantId, user.tenantId),
          eq(performanceGoals.employeeId, user.id)
        )
      )
      .orderBy(desc(performanceGoals.createdAt));

    res.json(goals);
  } catch (error) {
    logger.error('Error fetching goals:', error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

/**
 * POST /api/performance/goals
 * Create a new performance goal
 */
router.post('/goals', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user: { id: string; tenantId: string; managerId?: string; departmentId?: string } }).user;
    const {
      title,
      description,
      type,
      category,
      targetValue,
      weight,
      dueDate
    } = req.body;

    if (!title || !type || !targetValue) {
      return res.status(400).json({
        error: 'title, type, and targetValue are required'
      });
    }

    const newGoal = await db.insert(performanceGoals).values({
      tenantId: user.tenantId,
      employeeId: user.id,
      managerId: user.managerId || user.id,
      title,
      description: description || '',
      type: type || 'individual',
      category: category || 'productivity',
      goalFormat: 'smart',
      target: { value: targetValue },
      startDate: new Date(),
      targetDate: dueDate ? new Date(dueDate) : new Date(new Date().setMonth(new Date().getMonth() + 3)),
      weight: weight?.toString() || '1.00',
      status: 'draft',
      createdBy: user.id,
      updatedBy: user.id
    }).returning();

    res.status(201).json(newGoal[0]);
  } catch (error) {
    logger.error('Error creating goal:', error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

/**
 * PUT /api/performance/goals/:id
 * Update a performance goal
 */
router.put('/goals/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user: { id: string; tenantId: string } }).user;
    const { id } = req.params;
    const updates = req.body;

    // Verify goal belongs to user's tenant
    const existingGoal = await db.select()
      .from(performanceGoals)
      .where(
        and(
          eq(performanceGoals.id, id),
          eq(performanceGoals.tenantId, user.tenantId)
        )
      )
      .limit(1);

    if (existingGoal.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const updatedGoal = await db.update(performanceGoals)
      .set({
        ...updates,
        updatedAt: new Date(),
        updatedBy: user.id
      })
      .where(eq(performanceGoals.id, id))
      .returning();

    res.json(updatedGoal[0]);
  } catch (error) {
    logger.error('Error updating goal:', error);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

/**
 * DELETE /api/performance/goals/:id
 * Delete a performance goal
 */
router.delete('/goals/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user: { id: string; tenantId: string } }).user;
    const { id } = req.params;

    // Verify goal belongs to user's tenant
    const existingGoal = await db.select()
      .from(performanceGoals)
      .where(
        and(
          eq(performanceGoals.id, id),
          eq(performanceGoals.tenantId, user.tenantId)
        )
      )
      .limit(1);

    if (existingGoal.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    await db.delete(performanceGoals)
      .where(eq(performanceGoals.id, id));

    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    logger.error('Error deleting goal:', error);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

/**
 * POST /api/performance/bot/query
 * Handle Performance BOT queries
 */
router.post('/bot/query', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user: { id: string; tenantId: string; role?: string } }).user;
    const { query, context } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    const { performanceAgent } = await import('../services/agents/performance/performance-agent');

    const response = await performanceAgent.handleBotQuery(
      query,
      user.tenantId,
      user.id,
      {
        role: context?.role || user.role,
        employeeId: context?.employeeId,
        departmentId: context?.departmentId
      }
    );

    res.json(response);
  } catch (error) {
    logger.error('Error handling bot query:', error);
    res.status(500).json({
      error: 'Failed to process bot query',
      answer: 'I apologize, but I encountered an error. Please try again.',
      intent: 'error',
      confidence: 0,
      suggestions: []
    });
  }
});

/**
 * GET /api/performance/bot/analytics/:employeeId
 * Get performance analytics for an employee (for managers/admins via BOT)
 */
router.get('/bot/analytics/:employeeId', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as Request & { user: { id: string; tenantId: string; role?: string } }).user;
    const { employeeId } = req.params;

    // For now, allow users to view their own analytics or admins to view any
    // In production, add proper role-based access control
    if (employeeId !== user.id && user.role !== 'admin' && user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Unauthorized to view this employee\'s analytics' });
    }

    const { performanceAgent } = await import('../services/agents/performance/performance-agent');

    const analytics = await performanceAgent.getEmployeePerformanceAnalytics(
      employeeId,
      user.tenantId
    );

    res.json(analytics);
  } catch (error) {
    logger.error('Error fetching employee analytics:', error);
    res.status(500).json({ error: 'Failed to fetch employee analytics' });
  }
});

export default router;
