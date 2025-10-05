import { Router } from 'express';
import { Logger } from '../../../../utils/logger.js';
import { GoalSettingWorkflow } from '../workflows/goal-setting.js';
import { db } from '../../../../db/index.js';
import { performanceGoals } from '../../../../db/schema/performance.js';
import { eq, and, desc } from 'drizzle-orm';

const router = Router();
const logger = new Logger('PerformanceGoalsAPI');
const goalSettingWorkflow = new GoalSettingWorkflow();

// ============================================================================
// GOALS ENDPOINTS
// ============================================================================

/**
 * GET /api/performance/goals
 * List all goals with optional filters
 */
router.get('/goals', async (req, res) => {
  try {
    const { tenantId, employeeId, status, period, category } = req.query;

    logger.info('Fetching goals', { tenantId, employeeId, filters: { status, period, category } });

    // Mock implementation - would query database
    const goals = await fetchGoals({ tenantId, employeeId, status, period, category });

    return res.json({
      success: true,
      data: goals,
      total: goals.length,
      filters: { tenantId, employeeId, status, period, category }
    });
  } catch (error) {
    logger.error('Failed to fetch goals:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch goals',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/performance/goals/:id
 * Get goal details by ID
 */
router.get('/goals/:id', async (req, res) => {
  try {
    const { id } = req.params;

    logger.info('Fetching goal details', { goalId: id });

    // Mock implementation
    const goal = await fetchGoalById(id);

    if (!goal) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found'
      });
    }

    return res.json({
      success: true,
      data: goal
    });
  } catch (error) {
    logger.error('Failed to fetch goal:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch goal',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/performance/goals
 * Create new goal (manual or AI-generated)
 */
router.post('/goals', async (req, res) => {
  try {
    const { employeeId, tenantId, managerId, period, useAI, goalData, organizationalObjectives } = req.body;

    logger.info('Creating goal', { employeeId, period, useAI });

    let goals;

    if (useAI) {
      // Use AI-powered goal setting workflow
      const result = await goalSettingWorkflow.executeWorkflow({
        employeeId,
        tenantId,
        managerId,
        period,
        organizationalContext: goalData.organizationalContext,
        organizationalObjectives: organizationalObjectives || {
          strategicGoals: [],
          departmentGoals: [],
          teamGoals: []
        },
        currentPerformance: goalData.currentPerformance,
        historicalGoals: goalData.historicalGoals,
        constraints: goalData.constraints
      });
      goals = result.goals;
    } else {
      // Manual goal creation
      goals = [await createGoalManually(goalData)];
    }

    return res.json({
      success: true,
      data: goals,
      count: goals.length,
      aiGenerated: useAI
    });
  } catch (error) {
    logger.error('Failed to create goal:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create goal',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/performance/goals/:id
 * Update existing goal
 */
router.put('/goals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    logger.info('Updating goal', { goalId: id, updates });

    // Mock implementation
    const updatedGoal = await updateGoal(id, updates);

    return res.json({
      success: true,
      data: updatedGoal
    });
  } catch (error) {
    logger.error('Failed to update goal:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update goal',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/performance/goals/:id
 * Delete goal
 */
router.delete('/goals/:id', async (req, res) => {
  try {
    const { id } = req.params;

    logger.info('Deleting goal', { goalId: id });

    // Mock implementation
    await deleteGoal(id);

    return res.json({
      success: true,
      message: 'Goal deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete goal:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete goal',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/performance/goals/:id/progress
 * Update goal progress
 */
router.post('/goals/:id/progress', async (req, res) => {
  try {
    const { id } = req.params;
    const { progress, notes, milestoneCompleted } = req.body;

    logger.info('Updating goal progress', { goalId: id, progress });

    // Mock implementation
    const updatedGoal = await updateGoalProgress(id, progress, notes, milestoneCompleted);

    return res.json({
      success: true,
      data: updatedGoal
    });
  } catch (error) {
    logger.error('Failed to update goal progress:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update goal progress',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/performance/employees/:employeeId/goals
 * Get all goals for specific employee
 */
router.get('/employees/:employeeId/goals', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { period, status } = req.query;

    logger.info('Fetching employee goals', { employeeId, period, status });

    // Mock implementation
    const goals = await fetchEmployeeGoals(employeeId, { period, status });

    return res.json({
      success: true,
      data: goals,
      total: goals.length,
      employeeId,
      filters: { period, status }
    });
  } catch (error) {
    logger.error('Failed to fetch employee goals:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch employee goals',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// DATABASE OPERATIONS (Real Drizzle ORM queries)
// ============================================================================

async function fetchGoals(filters: any): Promise<any[]> {
  try {
    let query = db.select().from(performanceGoals);
    
    const conditions = [];
    
    if (filters.tenantId) {
      conditions.push(eq(performanceGoals.tenantId, filters.tenantId));
    }
    if (filters.employeeId) {
      conditions.push(eq(performanceGoals.employeeId, filters.employeeId));
    }
    if (filters.status) {
      conditions.push(eq(performanceGoals.status, filters.status));
    }
    if (filters.category) {
      conditions.push(eq(performanceGoals.category, filters.category));
    }
    
    const queryBuilder = db.select().from(performanceGoals);

    const goals = conditions.length > 0
      ? await queryBuilder.where(and(...conditions)).orderBy(desc(performanceGoals.createdAt))
      : await queryBuilder.orderBy(desc(performanceGoals.createdAt));

    return goals;
  } catch (error) {
    logger.error('Database error fetching goals:', error);
    throw error;
  }
}

async function fetchGoalById(id: string): Promise<any> {
  try {
    const goals = await db.select()
      .from(performanceGoals)
      .where(eq(performanceGoals.id, id))
      .limit(1);
    
    return goals[0] || null;
  } catch (error) {
    logger.error('Database error fetching goal by ID:', error);
    throw error;
  }
}

async function createGoalManually(goalData: any): Promise<any> {
  try {
    const newGoal = {
      tenantId: goalData.tenantId,
      employeeId: goalData.employeeId,
      managerId: goalData.managerId,
      title: goalData.title,
      description: goalData.description || '',
      type: goalData.type || 'individual',
      category: goalData.category,
      goalFormat: goalData.framework || 'smart',
      target: goalData.target || {},
      current: {},
      baseline: {},
      weight: goalData.weight || '1.00',
      priority: goalData.priority || 1,
      status: 'active' as const,
      startDate: new Date(),
      targetDate: new Date(goalData.deadline || Date.now() + 365 * 24 * 60 * 60 * 1000),
      progressPercentage: '0.00',
      requiresApproval: goalData.requiresApproval || false,
      metadata: goalData.metadata || {},
      createdBy: goalData.managerId,
      updatedBy: goalData.managerId
    };

    const [created] = await db.insert(performanceGoals).values(newGoal).returning();
    return created;
  } catch (error) {
    logger.error('Database error creating goal:', error);
    throw error;
  }
}

async function updateGoal(id: string, updates: any): Promise<any> {
  try {
    const updateData: any = {
      updatedAt: new Date()
    };
    
    if (updates.title) updateData.title = updates.title;
    if (updates.description) updateData.description = updates.description;
    if (updates.status) updateData.status = updates.status;
    if (updates.priority) updateData.priority = updates.priority;
    if (updates.target) updateData.target = updates.target;
    if (updates.progressPercentage !== undefined) updateData.progressPercentage = updates.progressPercentage.toString();
    
    const [updated] = await db.update(performanceGoals)
      .set(updateData)
      .where(eq(performanceGoals.id, id))
      .returning();
    
    return updated;
  } catch (error) {
    logger.error('Database error updating goal:', error);
    throw error;
  }
}

async function deleteGoal(id: string): Promise<void> {
  try {
    await db.delete(performanceGoals)
      .where(eq(performanceGoals.id, id));
    
    logger.info('Goal deleted from database', { goalId: id });
  } catch (error) {
    logger.error('Database error deleting goal:', error);
    throw error;
  }
}

async function updateGoalProgress(id: string, progress: number, notes: string, milestoneCompleted: boolean): Promise<any> {
  try {
    const updateData: any = {
      progressPercentage: progress.toString(),
      lastUpdated: new Date(),
      updatedAt: new Date()
    };

    // If goal is complete, update status
    if (progress >= 100) {
      updateData.status = 'completed';
      updateData.actualCompletionDate = new Date();
    }
    // Note: Progress notes and milestones would need separate tracking table
    
    const [updated] = await db.update(performanceGoals)
      .set(updateData)
      .where(eq(performanceGoals.id, id))
      .returning();
    
    return updated;
  } catch (error) {
    logger.error('Database error updating goal progress:', error);
    throw error;
  }
}

async function fetchEmployeeGoals(employeeId: string, filters: any): Promise<any[]> {
  try {
    const conditions = [eq(performanceGoals.employeeId, employeeId)];
    
    if (filters.period) {
      // Filter by year if period is provided
      // Would need to add date range filtering
    }
    if (filters.status) {
      conditions.push(eq(performanceGoals.status, filters.status));
    }
    
    const goals = await db.select()
      .from(performanceGoals)
      .where(and(...conditions))
      .orderBy(desc(performanceGoals.priority), desc(performanceGoals.createdAt));
    
    return goals;
  } catch (error) {
    logger.error('Database error fetching employee goals:', error);
    throw error;
  }
}

export default router;

