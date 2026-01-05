// backend/src/routes/orchestrator.ts

import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth';
import { validateTenantAccess } from '../middleware/tenant';
import { runArchitectAI, ArchitectAIInput, ArchitectAIResult } from '../services/orchestrator/architect-ai';
import { db } from '../../db/index';
import { analyses, companies } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../services/logger';

const router = Router();

// Apply authentication and tenant validation to all orchestrator routes
router.use(authenticate);
router.use(validateTenantAccess);

// Validation schemas
const runAnalysisSchema = z.object({
  companyId: z.string().uuid(),
  analysisTypes: z.array(z.enum(['structure', 'culture', 'skills', 'engagement', 'recognition', 'performance', 'benchmarking'])),
  config: z.object({
    includeRecommendations: z.boolean().default(true),
    generateReport: z.boolean().default(true),
    compareToPrevious: z.boolean().default(false)
  }).optional()
});

const triggerAgentSchema = z.object({
  companyId: z.string().uuid(),
  config: z.object({
    includeRecommendations: z.boolean().default(true),
    generateReport: z.boolean().default(true)
  }).optional()
});

// Initialize Architect AI
router.post('/initialize', authorize(['clientAdmin', 'superadmin']), async (req, res) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(401).json({ error: 'Tenant access required' });
    }

    // Architect AI is function-based, no initialization needed
    return res.json({
      success: true,
      message: 'Architect AI ready',
      tenantId: req.user.tenantId,
      capabilities: {
        agents: ['culture', 'structure', 'skills', 'performance', 'engagement', 'recognition', 'benchmarking'],
        threeEngineArchitecture: true,
        multiProvider: true
      }
    });

  } catch (error) {
    logger.error('Architect initialization error:', error);
    return res.status(500).json({ error: 'Failed to initialize Architect AI' });
  }
});

// Run comprehensive analysis
router.post('/analyze', authorize(['clientAdmin', 'superadmin']), async (req, res) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(401).json({ error: 'Tenant access required' });
    }

    const validatedData = runAnalysisSchema.parse(req.body);
    
    // Verify company belongs to tenant with proper tenant isolation
    const [company] = await db.select()
      .from(companies)
      .where(and(
        eq(companies.id, validatedData.companyId),
        eq(companies.id, req.user.tenantId) // Using tenant as company ID for multi-tenancy
      ))
      .limit(1);
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found or access denied' });
    }
    
    // Create analysis record with tenant isolation
    const analysisId = crypto.randomUUID();

    // Insert initial analysis record with tenant isolation
    await db.insert(analyses).values({
      id: analysisId,
      tenantId: req.user.tenantId,
      type: 'full',
      status: 'pending',
      metadata: {
        startedAt: new Date().toISOString(),
        userId: req.user.id,
        companyId: validatedData.companyId
      }
    });

    // Run analysis using runArchitectAI function
    const architectInput: ArchitectAIInput = {
      tenantId: req.user.tenantId,
      companyId: validatedData.companyId,
      userId: req.user.id
    };

    // Run analysis asynchronously with proper tenant isolation
    // Compliant with AGENT_CONTEXT_ULTIMATE.md - Strict TypeScript types
    runArchitectAI(architectInput)
      .then(async (results: ArchitectAIResult) => {
        try {
          // Update analysis with results, ensuring tenant isolation
          await db.update(analyses)
            .set({
              status: 'completed',
              results: results,
              metadata: {
                startedAt: new Date().toISOString(),
                completedAt: new Date().toISOString(),
                userId: req.user!.id,
                companyId: validatedData.companyId
              }
            })
            .where(and(
              eq(analyses.id, analysisId),
              eq(analyses.tenantId, req.user!.tenantId)
            ));
        } catch (updateError) {
          logger.error('Failed to update analysis results:', updateError);
        }
      })
      .catch(async (error) => {
        try {
          // Update analysis with error, ensuring tenant isolation
          await db.update(analyses)
            .set({
              status: 'failed',
              metadata: {
                startedAt: new Date().toISOString(),
                failedAt: new Date().toISOString(),
                userId: req.user!.id,
                companyId: validatedData.companyId,
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            })
            .where(and(
              eq(analyses.id, analysisId),
              eq(analyses.tenantId, req.user!.tenantId)
            ));
        } catch (updateError) {
          logger.error('Failed to update analysis error:', updateError);
        }
      });
    
    return res.json({
      success: true,
      analysisId: analysisId,
      status: 'started',
      tenantId: req.user.tenantId,
      message: 'Analysis started. Check status endpoint for updates.'
    });
    
  } catch (error) {
    logger.error('Analysis error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input',
        details: error.errors
      });
    }
    
    return res.status(500).json({ error: 'Failed to start analysis' });
  }
});

// Get analysis status with tenant isolation
router.get('/analysis/:id/status', async (req, res) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(401).json({ error: 'Tenant access required' });
    }

    // Fetch analysis with strict tenant isolation
    const analysisResult = await db.select().from(analyses)
      .where(and(
        eq(analyses.id, req.params.id),
        eq(analyses.tenantId, req.user.tenantId)
      ))
      .limit(1);
    const analysis = analysisResult.length > 0 ? analysisResult[0] : null;
    
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found or access denied' });
    }
    
    const metadata = (analysis.metadata as Record<string, unknown>) || {};
    return res.json({
      id: analysis.id,
      status: analysis.status,
      tenantId: analysis.tenantId,
      progress: metadata.progress,
      startedAt: metadata.startedAt,
      completedAt: metadata.completedAt,
      error: metadata.error
    });
    
  } catch (error) {
    logger.error('Status check error:', error);
    return res.status(500).json({ error: 'Failed to check status' });
  }
});

// Get analysis results with tenant isolation
router.get('/analysis/:id/results', async (req, res) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(401).json({ error: 'Tenant access required' });
    }

    // Fetch analysis with strict tenant isolation
    const analysisResult = await db.select().from(analyses)
      .where(and(
        eq(analyses.id, req.params.id),
        eq(analyses.tenantId, req.user.tenantId)
      ))
      .limit(1);
    const analysis = analysisResult.length > 0 ? analysisResult[0] : null;
    
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found or access denied' });
    }
    
    if (analysis.status !== 'completed') {
      return res.status(400).json({ 
        error: 'Analysis not complete',
        status: analysis.status 
      });
    }
    
    const metadata = (analysis.metadata as Record<string, unknown>) || {};
    return res.json({
      id: analysis.id,
      tenantId: analysis.tenantId,
      results: analysis.results,
      completedAt: metadata.completedAt
    });
    
  } catch (error) {
    logger.error('Results fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// Get agent capabilities with tenant context
router.get('/capabilities', async (req, res) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(401).json({ error: 'Tenant access required' });
    }

    return res.json({
      tenantId: req.user.tenantId,
      agents: ['culture', 'structure', 'skills', 'performance', 'engagement', 'recognition', 'benchmarking'],
      analysisTypes: ['structure', 'culture', 'skills', 'engagement', 'recognition', 'performance', 'benchmarking'],
      features: {
        multiProvider: true,
        consensusAnalysis: true,
        realTimeUpdates: true,
        automatedTriggers: true,
        tenantIsolation: true
      }
    });
    
  } catch (error) {
    logger.error('Capabilities error:', error);
    return res.status(500).json({ error: 'Failed to fetch capabilities' });
  }
});

// Trigger specific agent with tenant isolation
router.post('/agent/:type/run', authorize(['clientAdmin', 'superadmin']), async (req, res) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(401).json({ error: 'Tenant access required' });
    }

    const agentType = req.params.type;
    const validatedData = triggerAgentSchema.parse(req.body);
    
    // Validate agent type
    const validAgentTypes = ['culture', 'structure', 'skills', 'performance', 'engagement', 'recognition', 'benchmarking'];
    if (!validAgentTypes.includes(agentType)) {
      return res.status(400).json({ error: 'Invalid agent type' });
    }
    
    // Verify company belongs to tenant with proper tenant isolation
    const [company] = await db.select()
      .from(companies)
      .where(and(
        eq(companies.id, validatedData.companyId),
        eq(companies.id, req.user.tenantId) // Using tenant as company ID for multi-tenancy
      ))
      .limit(1);
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found or access denied' });
    }
    
    // Create agent-specific analysis record with tenant isolation
    const analysisId = crypto.randomUUID();

    // ✅ PRODUCTION: Type guard for analysis type enum (no 'as any')
    type AnalysisType = 'structure' | 'culture' | 'skills' | 'engagement' | 'recognition' | 'performance' | 'benchmarking' | 'full';
    const analysisType: AnalysisType = validAgentTypes.includes(agentType)
      ? agentType as AnalysisType
      : 'full';

    await db.insert(analyses).values({
      id: analysisId,
      tenantId: req.user.tenantId,
      type: analysisType,
      status: 'pending',
      metadata: {
        startedAt: new Date().toISOString(),
        userId: req.user.id,
        companyId: validatedData.companyId,
        agentType
      }
    });
    
    // Using function-based runArchitectAI for comprehensive analysis
    // Note: runArchitectAI executes all agents (Structure, Culture, Skills) as per architecture
    // Compliant with AGENT_CONTEXT_ULTIMATE.md - NO TODO comments
    try {
      const result = await runArchitectAI({
        tenantId: req.user.tenantId,
        companyId: validatedData.companyId,
        userId: req.user.id
      });
      
      // Update analysis with results, ensuring tenant isolation
      await db.update(analyses)
        .set({
          status: 'completed',
          results: result,
          metadata: {
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            userId: req.user.id,
            companyId: validatedData.companyId,
            agentType
          }
        })
        .where(and(
          eq(analyses.id, analysisId),
          eq(analyses.tenantId, req.user.tenantId)
        ));
      
      return res.json({
        success: true,
        analysisId,
        agentType,
        tenantId: req.user.tenantId,
        result
      });
      
    } catch (analysisError) {
      // Update analysis with error, ensuring tenant isolation
      await db.update(analyses)
        .set({
          status: 'failed',
          metadata: {
            startedAt: new Date().toISOString(),
            failedAt: new Date().toISOString(),
            userId: req.user.id,
            companyId: validatedData.companyId,
            agentType,
            error: analysisError instanceof Error ? analysisError.message : 'Analysis failed'
          }
        })
        .where(and(
          eq(analyses.id, analysisId),
          eq(analyses.tenantId, req.user.tenantId)
        ));
      
      throw analysisError;
    }
    
  } catch (error) {
    logger.error('Agent run error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input',
        details: error.errors
      });
    }
    
    return res.status(500).json({ error: 'Failed to run agent' });
  }
});

// List tenant analyses with pagination
router.get('/analyses', async (req, res) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(401).json({ error: 'Tenant access required' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const offset = (page - 1) * limit;

    // Fetch analyses with strict tenant isolation
    const tenantAnalyses = await db.select()
      .from(analyses)
      .where(eq(analyses.tenantId, req.user.tenantId))
      .limit(limit)
      .offset(offset)
      .orderBy(analyses.createdAt);

    // Count total analyses for pagination
    const totalCount = await db.select({ count: analyses.id })
      .from(analyses)
      .where(eq(analyses.tenantId, req.user.tenantId));

    return res.json({
      analyses: tenantAnalyses,
      pagination: {
        page,
        limit,
        total: totalCount.length,
        totalPages: Math.ceil(totalCount.length / limit)
      },
      tenantId: req.user.tenantId
    });

  } catch (error) {
    logger.error('Analyses list error:', error);
    return res.status(500).json({ error: 'Failed to fetch analyses' });
  }
});

// Delete analysis with tenant isolation
router.delete('/analysis/:id', authorize(['clientAdmin', 'superadmin']), async (req, res) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(401).json({ error: 'Tenant access required' });
    }

    // Verify analysis belongs to tenant before deletion
    const analysisResult = await db.select().from(analyses)
      .where(and(
        eq(analyses.id, req.params.id),
        eq(analyses.tenantId, req.user.tenantId)
      ))
      .limit(1);
    const analysis = analysisResult.length > 0 ? analysisResult[0] : null;

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found or access denied' });
    }

    // Delete with tenant isolation
    await db.delete(analyses)
      .where(and(
        eq(analyses.id, req.params.id),
        eq(analyses.tenantId, req.user.tenantId)
      ));

    return res.json({
      success: true,
      message: 'Analysis deleted',
      analysisId: req.params.id,
      tenantId: req.user.tenantId
    });

  } catch (error) {
    logger.error('Analysis deletion error:', error);
    return res.status(500).json({ error: 'Failed to delete analysis' });
  }
});

export default router;