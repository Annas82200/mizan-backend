import { Router } from 'express';
import { AgentManager } from '../services/agents/agent-manager';
import { authenticateToken, authorize } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
const agentManager = new AgentManager();

// Validation schemas
const analysisRequestSchema = z.object({
  agentType: z.enum(['culture', 'structure']),
  inputData: z.any(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional()
});

const multiAgentRequestSchema = z.object({
  agentTypes: z.array(z.enum(['culture', 'structure'])),
  inputData: z.any()
});

// Run single agent analysis
router.post('/analyze', authenticateToken, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { agentType, inputData, priority } = analysisRequestSchema.parse(req.body);
    
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const result = await agentManager.runAnalysis({
      tenantId: req.user.tenantId,
      agentType,
      inputData,
      priority
    });

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Agent analysis error:', error);
    return res.status(500).json({
      error: 'Analysis failed',
      details: error instanceof Error ? error instanceof Error ? error.message : 'Unknown error' : 'Unknown error'
    });
  }
});

// Run multi-agent analysis
router.post('/analyze/multi', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    const { agentTypes, inputData } = multiAgentRequestSchema.parse(req.body);
    
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const results = await agentManager.runMultiAgentAnalysis(
      req.user.tenantId,
      agentTypes,
      inputData
    );

    return res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Multi-agent analysis error:', error);
    return res.status(500).json({
      error: 'Multi-agent analysis failed',
      details: error instanceof Error ? error instanceof Error ? error.message : 'Unknown error' : 'Unknown error'
    });
  }
});

// Get analysis history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { agentType, limit } = req.query;
    
    const history = await agentManager.getAnalysisHistory(
      req.user.tenantId,
      agentType as string,
      limit ? parseInt(limit as string) : 10
    );

    return res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Get history error:', error);
    return res.status(500).json({
      error: 'Failed to get analysis history',
      details: error instanceof Error ? error instanceof Error ? error.message : 'Unknown error' : 'Unknown error'
    });
  }
});

// Get active recommendations
router.get('/recommendations', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const recommendations = await agentManager.getActiveRecommendations(req.user.tenantId);

    return res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    return res.status(500).json({
      error: 'Failed to get recommendations',
      details: error instanceof Error ? error instanceof Error ? error.message : 'Unknown error' : 'Unknown error'
    });
  }
});

// Get pending triggers
router.get('/triggers', authenticateToken, authorize(['admin']), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const triggers = await agentManager.getPendingTriggers(req.user.tenantId);

    return res.json({
      success: true,
      data: triggers
    });
  } catch (error) {
    console.error('Get triggers error:', error);
    return res.status(500).json({
      error: 'Failed to get triggers',
      details: error instanceof Error ? error instanceof Error ? error.message : 'Unknown error' : 'Unknown error'
    });
  }
});

// Culture-specific endpoints
router.post('/culture/assess', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { targetType = 'company', targetId, assessmentIds } = req.body;

    const result = await agentManager.runAnalysis({
      tenantId: req.user.tenantId,
      agentType: 'culture',
      inputData: {
        tenantId: req.user.tenantId,
        targetType,
        targetId,
        assessmentIds
      }
    });

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Culture analysis error:', error);
    return res.status(500).json({
      error: 'Culture analysis failed',
      details: error instanceof Error ? error instanceof Error ? error.message : 'Unknown error' : 'Unknown error'
    });
  }
});

// Structure-specific endpoints
router.post('/structure/analyze', authenticateToken, authorize(['admin', 'manager']), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { structureId, strategyId } = req.body;

    const result = await agentManager.runAnalysis({
      tenantId: req.user.tenantId,
      agentType: 'structure',
      inputData: {
        tenantId: req.user.tenantId,
        structureId,
        strategyId
      }
    });

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Structure analysis error:', error);
    return res.status(500).json({
      error: 'Structure analysis failed',
      details: error instanceof Error ? error instanceof Error ? error.message : 'Unknown error' : 'Unknown error'
    });
  }
});

export default router;
