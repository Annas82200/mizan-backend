// backend/services/modules/lxp/api/culture-integration.ts
// Task Reference: Module 1 (LXP) - Section 1.5.5 (Integrate with Culture Analysis)

import { Router } from 'express';
import { lxpModule } from '../lxp-module.js';

const router = Router();

// ============================================================================
// TASK 1.5.5: CULTURE ANALYSIS INTEGRATION API ENDPOINTS
// ============================================================================

/**
 * GET /api/lxp/culture-integration/learning-needs/:employeeId
 * Receive culture learning needs
 */
router.get('/learning-needs/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { tenantId, cultureAnalysisId } = req.query;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID is required'
      });
    }

    console.log(`[LXP API] Receiving culture learning needs for employee: ${employeeId}`);

    const result = await lxpModule.receiveCultureLearningNeeds(
      employeeId as string, 
      tenantId as string, 
      cultureAnalysisId as string
    );

    if (result) {
      return res.json({
        success: true,
        data: result,
        message: `Received culture learning needs with ${result.learningNeeds.cultureGaps.valueGaps.length} value gaps and ${result.learningNeeds.cultureGaps.behaviorGaps.length} behavior gaps`
      });
    } else {
      return res.status(404).json({
        success: false,
        error: 'No culture learning needs found for this employee'
      });
    }
  } catch (error) {
    console.error('[LXP API] Error receiving culture learning needs:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to receive culture learning needs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/lxp/culture-integration/create-learning-path
 * Create culture-focused learning paths
 */
router.post('/create-learning-path', async (req, res) => {
  try {
    const learningNeeds = req.body;

    // Validate required fields
    const requiredFields = [
      'employeeId', 'tenantId', 'cultureAnalysisId', 'currentAlignment',
      'targetAlignment', 'cultureGaps', 'learningPreferences', 'organizationalContext'
    ];
    const missingFields = requiredFields.filter(field => !learningNeeds[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        missingFields
      });
    }

    // Validate cultureGaps structure
    if (!learningNeeds.cultureGaps.valueGaps || !learningNeeds.cultureGaps.behaviorGaps) {
      return res.status(400).json({
        success: false,
        error: 'Invalid cultureGaps structure - valueGaps and behaviorGaps are required'
      });
    }

    // Validate currentAlignment structure
    const alignmentRequired = ['overall', 'values', 'behaviors', 'lastAssessed'];
    const alignmentMissing = alignmentRequired.filter(field => !learningNeeds.currentAlignment[field]);
    if (alignmentMissing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid currentAlignment structure',
        missingFields: alignmentMissing
      });
    }

    // Validate targetAlignment structure
    const targetRequired = ['overall', 'values', 'behaviors'];
    const targetMissing = targetRequired.filter(field => !learningNeeds.targetAlignment[field]);
    if (targetMissing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid targetAlignment structure',
        missingFields: targetMissing
      });
    }

    console.log(`[LXP API] Creating culture-focused learning path for employee: ${learningNeeds.employeeId}`);

    const result = await lxpModule.createCultureFocusedLearningPath(learningNeeds);

    return res.json({
      success: true,
      data: result,
      message: `Culture learning path created successfully: ${result.learningPath.title}`
    });
  } catch (error) {
    console.error('[LXP API] Error creating culture-focused learning path:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create culture-focused learning path',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/lxp/culture-integration/track-progress
 * Track culture learning progress
 */
router.post('/track-progress', async (req, res) => {
  try {
    const progressData = req.body;

    // Validate required fields
    const requiredFields = [
      'employeeId', 'tenantId', 'learningPathId', 'moduleId',
      'progress', 'timeSpent', 'activitiesCompleted', 'assessmentsCompleted'
    ];
    const missingFields = requiredFields.filter(field => !progressData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        missingFields
      });
    }

    // Validate progress value
    if (progressData.progress < 0 || progressData.progress > 100) {
      return res.status(400).json({
        success: false,
        error: 'Progress must be between 0 and 100'
      });
    }

    // Validate timeSpent value
    if (progressData.timeSpent < 0) {
      return res.status(400).json({
        success: false,
        error: 'Time spent must be a positive number'
      });
    }

    // Validate arrays
    if (!Array.isArray(progressData.activitiesCompleted)) {
      return res.status(400).json({
        success: false,
        error: 'activitiesCompleted must be an array'
      });
    }

    if (!Array.isArray(progressData.assessmentsCompleted)) {
      return res.status(400).json({
        success: false,
        error: 'assessmentsCompleted must be an array'
      });
    }

    console.log(`[LXP API] Tracking culture learning progress for employee: ${progressData.employeeId}`);

    const result = await lxpModule.trackCultureLearningProgress(progressData);

    return res.json({
      success: true,
      data: result,
      message: 'Culture learning progress tracked successfully'
    });
  } catch (error) {
    console.error('[LXP API] Error tracking culture learning progress:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to track culture learning progress',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/lxp/culture-integration/update-alignment
 * Update culture alignment scores
 */
router.post('/update-alignment', async (req, res) => {
  try {
    const alignmentData = req.body;

    // Validate required fields
    const requiredFields = [
      'employeeId', 'tenantId', 'cultureAnalysisId', 'learningPathId',
      'updateType', 'alignmentChanges', 'evidence', 'confidence',
      'timestamp', 'nextAssessmentDate'
    ];
    const missingFields = requiredFields.filter(field => !alignmentData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        missingFields
      });
    }

    // Validate updateType
    const validUpdateTypes = ['progress', 'completion', 'assessment', 'milestone'];
    if (!validUpdateTypes.includes(alignmentData.updateType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid update type',
        validTypes: validUpdateTypes
      });
    }

    // Validate confidence value
    if (alignmentData.confidence < 0 || alignmentData.confidence > 1) {
      return res.status(400).json({
        success: false,
        error: 'Confidence must be between 0 and 1'
      });
    }

    // Validate alignmentChanges structure
    const changesRequired = ['overall', 'values', 'behaviors'];
    const changesMissing = changesRequired.filter(field => !alignmentData.alignmentChanges[field]);
    if (changesMissing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid alignmentChanges structure',
        missingFields: changesMissing
      });
    }

    // Validate evidence array
    if (!Array.isArray(alignmentData.evidence)) {
      return res.status(400).json({
        success: false,
        error: 'Evidence must be an array'
      });
    }

    // Validate dates
    if (isNaN(new Date(alignmentData.timestamp).getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid timestamp format'
      });
    }

    if (isNaN(new Date(alignmentData.nextAssessmentDate).getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid nextAssessmentDate format'
      });
    }

    console.log(`[LXP API] Updating culture alignment scores for employee: ${alignmentData.employeeId}`);

    const result = await lxpModule.updateCultureAlignmentScores(alignmentData);

    return res.json({
      success: true,
      data: result,
      message: 'Culture alignment scores updated successfully'
    });
  } catch (error) {
    console.error('[LXP API] Error updating culture alignment scores:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update culture alignment scores',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/lxp/culture-integration/status
 * Get Culture Analysis integration status
 */
router.get('/status', async (req, res) => {
  try {
    const moduleStatus = lxpModule.getStatus();
    
    return res.json({
      success: true,
      data: {
        moduleStatus,
        integrationStatus: {
          cultureAnalysis: 'active',
          lastSync: new Date(),
          syncStatus: 'healthy'
        }
      },
      message: 'Culture Analysis integration status retrieved successfully'
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
 * GET /api/lxp/culture-integration/health
 * Health check for Culture Analysis integration
 */
router.get('/health', async (req, res) => {
  try {
    const healthCheck = await lxpModule.checkHealth();
    
    return res.json({
      success: true,
      data: {
        lxpModule: healthCheck,
        cultureIntegration: {
          status: 'healthy',
          lastCheck: new Date(),
          endpoints: {
            learningNeeds: '/api/lxp/culture-integration/learning-needs/:employeeId',
            createLearningPath: '/api/lxp/culture-integration/create-learning-path',
            trackProgress: '/api/lxp/culture-integration/track-progress',
            updateAlignment: '/api/lxp/culture-integration/update-alignment'
          }
        }
      },
      message: 'Culture Analysis integration health check completed'
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
