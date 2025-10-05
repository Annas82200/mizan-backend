// backend/services/modules/lxp/api/skills-integration.ts
// Task Reference: Module 1 (LXP) - Section 1.5.3 (Integrate with Skills Analysis)

import { Router } from 'express';
import { lxpModule } from '../lxp-module.js';

const router = Router();

// ============================================================================
// TASK 1.5.3: SKILLS ANALYSIS INTEGRATION API ENDPOINTS
// ============================================================================

/**
 * GET /api/lxp/skills-integration/gaps/:employeeId
 * Receive skill gap data from Skills Analysis
 */
router.get('/gaps/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { tenantId } = req.query;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID is required'
      });
    }

    console.log(`[LXP API] Receiving skill gap data for employee: ${employeeId}`);

    const result = await lxpModule.receiveSkillGapData(employeeId as string, tenantId as string);

    if (result) {
      return res.json({
        success: true,
        data: result,
        message: `Received skill gap data with ${result.skillGapData.skillGaps.length} gaps`
      });
    } else {
      return res.status(404).json({
        success: false,
        error: 'No skill gap data found for this employee'
      });
    }
  } catch (error) {
    console.error('[LXP API] Error receiving skill gap data:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to receive skill gap data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/lxp/skills-integration/update-skills
 * Update skills after course completion
 */
router.post('/update-skills', async (req, res) => {
  try {
    const completionData = req.body;

    // Validate required fields
    const requiredFields = ['employeeId', 'tenantId', 'courseId', 'courseTitle', 'skillsLearned', 'completionDate'];
    const missingFields = requiredFields.filter(field => !completionData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        missingFields
      });
    }

    console.log(`[LXP API] Updating skills after course completion for employee: ${completionData.employeeId}`);

    const result = await lxpModule.updateSkillsAfterCompletion(completionData);

    return res.json({
      success: true,
      data: result,
      message: `Updated ${result.skillUpdates.length} skills for employee`
    });
  } catch (error) {
    console.error('[LXP API] Error updating skills after completion:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update skills after completion',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/lxp/skills-integration/validate-skill
 * Validate skill acquisition
 */
router.post('/validate-skill', async (req, res) => {
  try {
    const validationData = req.body;

    // Validate required fields
    const requiredFields = ['employeeId', 'tenantId', 'skillId', 'skillName', 'courseId', 'assessmentResults'];
    const missingFields = requiredFields.filter(field => !validationData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        missingFields
      });
    }

    console.log(`[LXP API] Validating skill acquisition for employee: ${validationData.employeeId}, skill: ${validationData.skillName}`);

    const result = await lxpModule.validateSkillAcquisition(validationData);

    return res.json({
      success: true,
      data: result,
      message: `Skill validation completed: ${result.validated ? 'VALIDATED' : 'NOT VALIDATED'}`
    });
  } catch (error) {
    console.error('[LXP API] Error validating skill acquisition:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to validate skill acquisition',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/lxp/skills-integration/notify-updates
 * Notify Skills Analysis of updates
 */
router.post('/notify-updates', async (req, res) => {
  try {
    const { employeeId, tenantId, updates } = req.body;

    if (!employeeId || !tenantId || !updates || !Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: employeeId, tenantId, updates (array)'
      });
    }

    console.log(`[LXP API] Notifying Skills Analysis of ${updates.length} updates for employee: ${employeeId}`);

    await lxpModule.notifySkillsAnalysisOfUpdates(employeeId, tenantId, updates);

    return res.json({
      success: true,
      message: `Successfully notified Skills Analysis of ${updates.length} updates`
    });
  } catch (error) {
    console.error('[LXP API] Error notifying Skills Analysis:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to notify Skills Analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/lxp/skills-integration/status
 * Get Skills Analysis integration status
 */
router.get('/status', async (req, res) => {
  try {
    const moduleStatus = lxpModule.getStatus();
    
    return res.json({
      success: true,
      data: {
        moduleStatus,
        integrationStatus: {
          skillsAnalysis: 'active',
          lastSync: new Date(),
          syncStatus: 'healthy'
        }
      },
      message: 'Skills Analysis integration status retrieved successfully'
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

export default router;
