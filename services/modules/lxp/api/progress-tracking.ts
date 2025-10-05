// Progress Tracking API Endpoints - Comprehensive Implementation
// Task Reference: Module 1 (LXP) - Section 1.4.3 (Create Progress Tracking Endpoints)

import { Router, Request, Response } from 'express';
import { LXPOrchestrator } from '../core/lxp-orchestrator.js';
import { LXPTriggerContext } from '../../../../types/lxp.js';

const router = Router();
const lxpOrchestrator = new LXPOrchestrator();

// ============================================================================
// Progress Tracking Endpoints
// ============================================================================

/**
 * GET /api/lxp/progress/:employeeId
 * Get employee learning progress
 */
router.get('/:employeeId', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { tenantId, timeRange = 'current', includeAnalytics = false } = req.query;

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'tenantId is required' });
    }

    const progress = await getEmployeeProgress({
      employeeId,
      tenantId: tenantId as string,
      timeRange: timeRange as string,
      includeAnalytics: includeAnalytics === 'true'
    });

    return res.json({ success: true, data: progress });
  } catch (error) {
    console.error('Error fetching progress:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch progress', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * PUT /api/lxp/progress/:employeeId
 * Update employee learning progress
 */
router.put('/:employeeId', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { tenantId, progressData, triggerType = 'learning_progress_update' } = req.body;

    if (!tenantId || !progressData) {
      return res.status(400).json({ success: false, error: 'tenantId and progressData are required' });
    }

    const triggerContext: LXPTriggerContext = {
      tenantId: tenantId as string,
      employeeId: employeeId as string,
      triggerType: (triggerType || 'learning_progress_update') as LXPTriggerContext['triggerType'],
      triggerData: { progressData },
      urgencyLevel: 'low',
      priority: 3
    };

    const result = await lxpOrchestrator.processLXPTrigger(triggerContext);

    if (!result.success) {
      return res.status(500).json({ success: false, error: 'Failed to update progress', message: result.errors?.[0] });
    }

    return res.json({
      success: true,
      data: {
        progressUpdate: result.result.progressUpdate,
        analytics: result.result.analytics,
        recommendations: result.result.recommendations
      },
      message: 'Progress updated successfully'
    });
  } catch (error) {
    console.error('Error updating progress:', error);
    return res.status(500).json({ success: false, error: 'Failed to update progress', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// ============================================================================
// MISSING ENDPOINTS - Required by Task 1.4.3
// ============================================================================

/**
 * GET /api/lxp/enrollments/:id/progress
 * Get enrollment progress
 */
router.get('/enrollments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tenantId, includeAnalytics = false } = req.query;

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'tenantId is required' });
    }

    const progress = await getEnrollmentProgress({
      enrollmentId: id,
      tenantId: tenantId as string,
      includeAnalytics: includeAnalytics === 'true'
    });

    if (!progress) {
      return res.status(404).json({ success: false, error: 'Enrollment progress not found' });
    }

    return res.json({ success: true, data: progress });
  } catch (error) {
    console.error('Error fetching enrollment progress:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch enrollment progress', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/lxp/enrollments/:id/progress
 * Update enrollment progress
 */
router.post('/enrollments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tenantId, progressData, triggerType = 'learning_progress_update' } = req.body;

    if (!tenantId || !progressData) {
      return res.status(400).json({ success: false, error: 'tenantId and progressData are required' });
    }

    const triggerContext: LXPTriggerContext = {
      tenantId: tenantId as string,
      employeeId: progressData.employeeId as string,
      triggerType: (triggerType || 'learning_progress_update') as LXPTriggerContext['triggerType'],
      triggerData: {
        enrollmentId: id,
        progressData
      },
      urgencyLevel: 'low',
      priority: 3
    };

    const result = await lxpOrchestrator.processLXPTrigger(triggerContext);

    if (!result.success) {
      return res.status(500).json({ success: false, error: 'Failed to update enrollment progress', message: result.errors?.[0] });
    }

    return res.json({
      success: true,
      data: {
        progressUpdate: result.result.progressUpdate,
        analytics: result.result.analytics,
        recommendations: result.result.recommendations
      },
      message: 'Enrollment progress updated successfully'
    });
  } catch (error) {
    console.error('Error updating enrollment progress:', error);
    return res.status(500).json({ success: false, error: 'Failed to update enrollment progress', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/lxp/employees/:employeeId/progress
 * Get all progress for an employee
 */
router.get('/employees/:employeeId', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { tenantId, timeRange = 'all_time', includeAnalytics = false } = req.query;

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'tenantId is required' });
    }

    const progress = await getEmployeeAllProgress({
      employeeId,
      tenantId: tenantId as string,
      timeRange: timeRange as string,
      includeAnalytics: includeAnalytics === 'true'
    });

    return res.json({ success: true, data: progress });
  } catch (error) {
    console.error('Error fetching employee progress:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch employee progress', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/lxp/enrollments/:id/complete
 * Mark course complete
 */
router.post('/enrollments/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tenantId, completionData, triggerType = 'course_completion' } = req.body;

    if (!tenantId || !completionData) {
      return res.status(400).json({ success: false, error: 'tenantId and completionData are required' });
    }

    const triggerContext: LXPTriggerContext = {
      tenantId: tenantId as string,
      employeeId: completionData.employeeId as string,
      triggerType: (triggerType || 'course_completion') as LXPTriggerContext['triggerType'],
      triggerData: {
        enrollmentId: id,
        completionData
      },
      urgencyLevel: 'medium',
      priority: 5
    };

    const result = await lxpOrchestrator.processLXPTrigger(triggerContext);

    if (!result.success) {
      return res.status(500).json({ success: false, error: 'Failed to complete course', message: result.errors?.[0] });
    }

    return res.json({
      success: true,
      data: {
        completionValidation: result.result.completionValidation,
        progressUpdate: result.result.progressUpdate,
        assessment: result.result.assessment,
        nextActions: result.result.nextActions
      },
      message: 'Course completed successfully'
    });
  } catch (error) {
    console.error('Error completing course:', error);
    return res.status(500).json({ success: false, error: 'Failed to complete course', message: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Mock implementations
async function getEmployeeProgress(params: any): Promise<any> {
  return {
    employeeId: params.employeeId,
    overallProgress: 0.75,
    coursesCompleted: 3,
    totalCourses: 5,
    timeSpent: 180,
    lastActivity: new Date(),
    analytics: params.includeAnalytics ? {
      engagementScore: 0.85,
      performanceScore: 0.87,
      learningVelocity: 0.8
    } : undefined
  };
}

async function getEnrollmentProgress(params: any): Promise<any> {
  return {
    enrollmentId: params.enrollmentId,
    courseId: 'course_123',
    employeeId: 'emp_456',
    overallProgress: 0.60,
    modulesCompleted: 3,
    totalModules: 5,
    timeSpent: 120,
    lastActivity: new Date(),
    status: 'in_progress',
    analytics: params.includeAnalytics ? {
      engagementScore: 0.82,
      performanceScore: 0.85,
      learningVelocity: 0.75
    } : undefined
  };
}

async function getEmployeeAllProgress(params: any): Promise<any> {
  return {
    employeeId: params.employeeId,
    timeRange: params.timeRange,
    overallProgress: 0.75,
    totalCourses: 5,
    completedCourses: 3,
    inProgressCourses: 2,
    totalLearningHours: 180,
    averageScore: 87,
    lastActivity: new Date(),
    analytics: params.includeAnalytics ? {
      engagementScore: 0.85,
      performanceScore: 0.87,
      learningVelocity: 0.8,
      skillDevelopment: {
        'Leadership': 0.75,
        'Communication': 0.80,
        'Team Management': 0.70
      }
    } : undefined,
    courses: [
      {
        courseId: 'course_1',
        title: 'Leadership Fundamentals',
        progress: 1.0,
        status: 'completed',
        completedDate: new Date()
      },
      {
        courseId: 'course_2',
        title: 'Communication Skills',
        progress: 0.6,
        status: 'in_progress',
        lastActivity: new Date()
      }
    ]
  };
}

export default router;
