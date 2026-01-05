import { Router } from 'express';
import { AgentManager } from '../services/agents/agent-manager';
import { authenticate, authorize, validateTenantAccess } from '../middleware/auth';
import { z } from 'zod';
import { db } from '../../db/index';
import { agentAnalysesTable, triggersTable, recommendationsTable } from '../../db/schema';
import { eq, and, desc, limit as limitQuery } from 'drizzle-orm';

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

const cultureAssessmentSchema = z.object({
  targetType: z.enum(['company', 'department', 'team']).optional(),
  targetId: z.string().optional(),
  assessmentIds: z.array(z.string()).optional()
});

const structureAnalysisSchema = z.object({
  structureId: z.string(),
  strategyId: z.string()
});

// Run single agent analysis
router.post('/analyze', authenticate, authorize(['admin', 'manager']), validateTenantAccess, async (req, res) => {
  try {
    const { agentType, inputData, priority } = analysisRequestSchema.parse(req.body);
    
    if (!req.user?.tenantId) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Valid tenant context required' 
      });
    }

    // Validate tenant access to any referenced data
    if (inputData?.id) {
      const hasAccess = await validateDataAccess(req.user.tenantId, inputData.id, agentType);
      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Access denied', 
          message: 'You do not have access to this data' 
        });
      }
    }

    const result = await agentManager.runAnalysis({
      tenantId: req.user.tenantId,
      agentType,
      inputData: {
        ...inputData,
        tenantId: req.user.tenantId // Ensure tenantId is always included
      },
      priority
    });

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Agent analysis error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    return res.status(500).json({
      error: 'Analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Run multi-agent analysis
router.post('/analyze/multi', authenticate, authorize(['admin']), validateTenantAccess, async (req, res) => {
  try {
    const { agentTypes, inputData } = multiAgentRequestSchema.parse(req.body);
    
    if (!req.user?.tenantId) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Valid tenant context required' 
      });
    }

    // Validate tenant access to any referenced data
    if (inputData?.id) {
      for (const agentType of agentTypes) {
        const hasAccess = await validateDataAccess(req.user.tenantId, inputData.id, agentType);
        if (!hasAccess) {
          return res.status(403).json({ 
            error: 'Access denied', 
            message: `You do not have access to data for ${agentType} analysis` 
          });
        }
      }
    }

    const results = await agentManager.runMultiAgentAnalysis(
      req.user.tenantId,
      agentTypes,
      {
        ...inputData,
        tenantId: req.user.tenantId // Ensure tenantId is always included
      }
    );

    return res.json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error('Multi-agent analysis error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    return res.status(500).json({
      error: 'Multi-agent analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get analysis history
router.get('/history', authenticate, validateTenantAccess, async (req, res) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Valid tenant context required' 
      });
    }

    const { agentType, limit: limitParam } = req.query;
    const limitValue = limitParam ? parseInt(limitParam as string) : 10;
    
    // Validate limit parameter
    if (isNaN(limitValue) || limitValue < 1 || limitValue > 100) {
      return res.status(400).json({ 
        error: 'Invalid limit parameter', 
        message: 'Limit must be a number between 1 and 100' 
      });
    }

    let query = db.select()
      .from(agentAnalysesTable)
      .where(eq(agentAnalysesTable.tenantId, req.user.tenantId))
      .orderBy(desc(agentAnalysesTable.createdAt))
      .limit(limitValue);

    // Add agent type filter if specified
    if (agentType && typeof agentType === 'string') {
      query = db.select()
        .from(agentAnalysesTable)
        .where(
          and(
            eq(agentAnalysesTable.tenantId, req.user.tenantId),
            eq(agentAnalysesTable.agentType, agentType)
          )
        )
        .orderBy(desc(agentAnalysesTable.createdAt))
        .limit(limitValue);
    }

    const history = await query;

    return res.json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Get history error:', error);
    return res.status(500).json({
      error: 'Failed to get analysis history',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get active recommendations
router.get('/recommendations', authenticate, validateTenantAccess, async (req, res) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Valid tenant context required' 
      });
    }

    const recommendations = await db.select()
      .from(recommendationsTable)
      .where(
        and(
          eq(recommendationsTable.tenantId, req.user.tenantId),
          eq(recommendationsTable.status, 'active')
        )
      )
      .orderBy(desc(recommendationsTable.createdAt));

    return res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    logger.error('Get recommendations error:', error);
    return res.status(500).json({
      error: 'Failed to get recommendations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get pending triggers
router.get('/triggers', authenticate, authorize(['admin']), validateTenantAccess, async (req, res) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Valid tenant context required' 
      });
    }

    const triggers = await db.select()
      .from(triggersTable)
      .where(
        and(
          eq(triggersTable.tenantId, req.user.tenantId),
          eq(triggersTable.status, 'pending')
        )
      )
      .orderBy(desc(triggersTable.createdAt));

    return res.json({
      success: true,
      data: triggers
    });
  } catch (error) {
    logger.error('Get triggers error:', error);
    return res.status(500).json({
      error: 'Failed to get triggers',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Culture-specific endpoints
router.post('/culture/assess', authenticate, validateTenantAccess, async (req, res) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Valid tenant context required' 
      });
    }

    const validatedData = cultureAssessmentSchema.parse(req.body);
    const { targetType = 'company', targetId, assessmentIds } = validatedData;

    // Validate access to specific targets if provided
    if (targetId) {
      const hasAccess = await validateTargetAccess(req.user.tenantId, targetId, targetType);
      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Access denied', 
          message: 'You do not have access to this target' 
        });
      }
    }

    // Validate access to assessment IDs if provided
    if (assessmentIds && assessmentIds.length > 0) {
      const hasAccess = await validateAssessmentAccess(req.user.tenantId, assessmentIds);
      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Access denied', 
          message: 'You do not have access to one or more assessments' 
        });
      }
    }

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
    logger.error('Culture analysis error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    return res.status(500).json({
      error: 'Culture analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Structure-specific endpoints
router.post('/structure/analyze', authenticate, authorize(['admin', 'manager']), validateTenantAccess, async (req, res) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Valid tenant context required' 
      });
    }

    const { structureId, strategyId } = structureAnalysisSchema.parse(req.body);

    // Validate access to structure and strategy data
    const [structureAccess, strategyAccess] = await Promise.all([
      validateStructureAccess(req.user.tenantId, structureId),
      validateStrategyAccess(req.user.tenantId, strategyId)
    ]);

    if (!structureAccess) {
      return res.status(403).json({ 
        error: 'Access denied', 
        message: 'You do not have access to this structure data' 
      });
    }

    if (!strategyAccess) {
      return res.status(403).json({ 
        error: 'Access denied', 
        message: 'You do not have access to this strategy data' 
      });
    }

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
    logger.error('Structure analysis error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    return res.status(500).json({
      error: 'Structure analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper functions for tenant access validation
async function validateDataAccess(tenantId: string, dataId: string, agentType: string): Promise<boolean> {
  try {
    // This would check if the data belongs to the tenant
    // Implementation depends on your data structure
    const analysis = await db.select()
      .from(agentAnalysesTable)
      .where(
        and(
          eq(agentAnalysesTable.tenantId, tenantId),
          eq(agentAnalysesTable.id, dataId),
          eq(agentAnalysesTable.agentType, agentType)
        )
      )
      .limit(1);
    
    return analysis.length > 0;
  } catch (error) {
    logger.error('Error validating data access:', error);
    return false;
  }
}

async function validateTargetAccess(tenantId: string, targetId: string, targetType: string): Promise<boolean> {
  try {
    // Validate that the target (department, team, etc.) belongs to the tenant
    // This would query the appropriate table based on targetType
    // For now, we'll assume all targets are valid if they exist
    return true; // Implement based on your target data structure
  } catch (error) {
    logger.error('Error validating target access:', error);
    return false;
  }
}

async function validateAssessmentAccess(tenantId: string, assessmentIds: string[]): Promise<boolean> {
  try {
    // Validate that all assessments belong to the tenant
    // This would check your assessments table
    return true; // Implement based on your assessment data structure
  } catch (error) {
    logger.error('Error validating assessment access:', error);
    return false;
  }
}

async function validateStructureAccess(tenantId: string, structureId: string): Promise<boolean> {
  try {
    // Validate structure data access
    // This would check your structure table
    return true; // Implement based on your structure data structure
  } catch (error) {
    logger.error('Error validating structure access:', error);
    return false;
  }
}

async function validateStrategyAccess(tenantId: string, strategyId: string): Promise<boolean> {
  try {
    // Validate strategy data access
    // This would check your strategy table
    return true; // Implement based on your strategy data structure
  } catch (error) {
    logger.error('Error validating strategy access:', error);
    return false;
  }
}

export default router;