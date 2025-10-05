/**
 * Performance Cycles API
 *
 * Endpoints for managing performance cycles with multi-agent integration
 */

import { Router, Request, Response } from 'express';
import { PerformanceCycleManager } from '../core/cycle-manager.js';

const router = Router();

/**
 * Create a new performance cycle
 * POST /api/performance/cycles
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId, createdBy } = req.body;
    const { name, cycleType, fiscalYear, quarter, startDate, endDate, reviewDueDate } = req.body;

    const manager = new PerformanceCycleManager(tenantId);

    const cycleId = await manager.createCycle({
      name,
      cycleType,
      fiscalYear,
      quarter,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reviewDueDate: reviewDueDate ? new Date(reviewDueDate) : undefined,
      createdBy
    });

    res.status(201).json({
      success: true,
      cycleId,
      message: 'Performance cycle created with multi-agent integration'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Activate a performance cycle
 * POST /api/performance/cycles/:id/activate
 */
router.post('/:id/activate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.body;
    const { id } = req.params;

    const manager = new PerformanceCycleManager(tenantId);
    await manager.activateCycle(id);

    res.json({
      success: true,
      message: 'Cycle activated and individual goals created for all employees'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Complete a performance cycle
 * POST /api/performance/cycles/:id/complete
 */
router.post('/:id/complete', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.body;
    const { id } = req.params;

    const manager = new PerformanceCycleManager(tenantId);
    await manager.completeCycle(id);

    res.json({
      success: true,
      message: 'Cycle completed and archived'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get cycle status and analytics
 * GET /api/performance/cycles/:id/status
 */
router.get('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.query;
    const { id } = req.params;

    const manager = new PerformanceCycleManager(tenantId as string);
    const status = await manager.getCycleStatus(id);

    res.json({
      success: true,
      data: status
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Create individual goals for an employee
 * POST /api/performance/cycles/:id/employees/:employeeId/goals
 */
router.post('/:id/employees/:employeeId/goals', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId, managerId } = req.body;
    const { id, employeeId } = req.params;
    const { departmentId } = req.body;

    const manager = new PerformanceCycleManager(tenantId);
    const goals = await manager.createIndividualGoals(id, employeeId, managerId, departmentId);

    res.status(201).json({
      success: true,
      goals,
      message: 'Individual goals created based on department objectives'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
