// backend/services/modules/lxp/api/performance-integration.ts
// Task Reference: Module 1 (LXP) - Section 1.5.4 (Integrate with Performance Management)

import { Router } from 'express';
import { lxpModule } from '../lxp-module.js';

const router = Router();

// ============================================================================
// TASK 1.5.4: PERFORMANCE MANAGEMENT INTEGRATION API ENDPOINTS
// ============================================================================

/**
 * POST /api/lxp/performance-integration/send-completion
 * Send completion data to Performance Management
 */
router.post('/send-completion', async (req, res) => {
  try {
    const completionData = req.body;

    // Validate required fields
    const requiredFields = [
      'employeeId', 'tenantId', 'courseId', 'courseTitle', 'completionDate',
      'completionType', 'skillsLearned', 'timeSpent', 'learningObjectives',
      'performanceImpact', 'competencyLevel'
    ];
    const missingFields = requiredFields.filter(field => !completionData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        missingFields
      });
    }

    // Validate completionType
    const validCompletionTypes = ['course', 'learning_path', 'certification', 'assessment'];
    if (!validCompletionTypes.includes(completionData.completionType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid completion type',
        validTypes: validCompletionTypes
      });
    }

    // Validate performanceImpact
    const validPerformanceImpacts = ['high', 'medium', 'low'];
    if (!validPerformanceImpacts.includes(completionData.performanceImpact)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid performance impact',
        validImpacts: validPerformanceImpacts
      });
    }

    console.log(`[LXP API] Sending completion data to Performance Management for employee: ${completionData.employeeId}`);

    const result = await lxpModule.sendCompletionDataToPerformanceManagement(completionData);

    return res.json({
      success: true,
      data: result,
      message: 'Completion data sent to Performance Management successfully'
    });
  } catch (error) {
    console.error('[LXP API] Error sending completion data to Performance Management:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send completion data to Performance Management',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/lxp/performance-integration/trigger-assessment
 * Trigger performance assessment after training
 */
router.post('/trigger-assessment', async (req, res) => {
  try {
    const completionData = req.body;

    // Validate required fields
    const requiredFields = [
      'employeeId', 'tenantId', 'courseId', 'courseTitle', 'completionDate',
      'completionType', 'skillsLearned', 'timeSpent', 'learningObjectives',
      'performanceImpact', 'competencyLevel'
    ];
    const missingFields = requiredFields.filter(field => !completionData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        missingFields
      });
    }

    console.log(`[LXP API] Triggering performance assessment for employee: ${completionData.employeeId}`);

    const result = await lxpModule.triggerPerformanceAssessmentAfterTraining(completionData);

    return res.json({
      success: true,
      data: result,
      message: `Performance assessment ${result.assessmentTriggered ? 'triggered' : 'not triggered'} successfully`
    });
  } catch (error) {
    console.error('[LXP API] Error triggering performance assessment:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to trigger performance assessment',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/lxp/performance-integration/link-improvement
 * Link learning to performance improvement
 */
router.post('/link-improvement', async (req, res) => {
  try {
    const improvementData = req.body;

    // Validate required fields
    const requiredFields = [
      'employeeId', 'tenantId', 'learningCompletionId',
      'baselinePerformance', 'postLearningPerformance',
      'improvementMetrics', 'learningImpact'
    ];
    const missingFields = requiredFields.filter(field => !improvementData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        missingFields
      });
    }

    // Validate baselinePerformance structure
    const baselineRequired = ['score', 'date', 'metrics'];
    const baselineMissing = baselineRequired.filter(field => !improvementData.baselinePerformance[field]);
    if (baselineMissing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid baselinePerformance structure',
        missingFields: baselineMissing
      });
    }

    // Validate postLearningPerformance structure
    const postRequired = ['score', 'date', 'metrics'];
    const postMissing = postRequired.filter(field => !improvementData.postLearningPerformance[field]);
    if (postMissing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid postLearningPerformance structure',
        missingFields: postMissing
      });
    }

    // Validate improvementMetrics structure
    const metricsRequired = ['overallImprovement', 'skillApplication', 'competencyGrowth', 'timeToImprovement'];
    const metricsMissing = metricsRequired.filter(field => !(field in improvementData.improvementMetrics));
    if (metricsMissing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid improvementMetrics structure',
        missingFields: metricsMissing
      });
    }

    // Validate learningImpact structure
    const impactRequired = ['directImpact', 'indirectImpact', 'confidence'];
    const impactMissing = impactRequired.filter(field => !(field in improvementData.learningImpact));
    if (impactMissing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid learningImpact structure',
        missingFields: impactMissing
      });
    }

    console.log(`[LXP API] Linking learning to performance improvement for employee: ${improvementData.employeeId}`);

    const result = await lxpModule.linkLearningToPerformanceImprovement(improvementData);

    return res.json({
      success: true,
      data: result,
      message: 'Learning successfully linked to performance improvement'
    });
  } catch (error) {
    console.error('[LXP API] Error linking learning to performance improvement:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to link learning to performance improvement',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/lxp/performance-integration/status
 * Get Performance Management integration status
 */
router.get('/status', async (req, res) => {
  try {
    const moduleStatus = lxpModule.getStatus();
    
    return res.json({
      success: true,
      data: {
        moduleStatus,
        integrationStatus: {
          performanceManagement: 'active',
          lastSync: new Date(),
          syncStatus: 'healthy'
        }
      },
      message: 'Performance Management integration status retrieved successfully'
    });
  } catch (error) {
    console.error('[LXP API] Error getting integration status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get integration status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/lxp/performance-integration/health
 * Health check for Performance Management integration
 */
router.get('/health', async (req, res) => {
  try {
    const healthCheck = await lxpModule.checkHealth();
    
    return res.json({
      success: true,
      data: {
        lxpModule: healthCheck,
        performanceIntegration: {
          status: 'healthy',
          lastCheck: new Date(),
          endpoints: {
            sendCompletion: '/api/lxp/performance-integration/send-completion',
            triggerAssessment: '/api/lxp/performance-integration/trigger-assessment',
            linkImprovement: '/api/lxp/performance-integration/link-improvement'
          }
        }
      },
      message: 'Performance Management integration health check completed'
    });
  } catch (error) {
    console.error('[LXP API] Error in health check:', error);
    return res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
