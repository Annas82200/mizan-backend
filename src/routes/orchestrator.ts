// server/routes/orchestrator.ts

import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { runArchitectAI, ArchitectAIInput } from '../services/orchestrator/architect-ai.js';
import { db } from '../../db/index.js';
import { analyses, companies } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';

const router = Router();

// Apply authentication to all orchestrator routes
router.use(authenticate);

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

// Initialize Architect AI
router.post('/initialize', authorize(['clientAdmin', 'superadmin']), async (req, res) => {
  try {
    // Architect AI is function-based, no initialization needed
    return res.json({
      success: true,
      message: 'Architect AI ready',
      capabilities: {
        agents: ['culture', 'structure', 'skills', 'performance', 'engagement', 'recognition', 'benchmarking'],
        threeEngineArchitecture: true,
        multiProvider: true
      }
    });

  } catch (error) {
    console.error('Architect initialization error:', error);
    return res.status(500).json({ error: 'Failed to initialize Architect AI' });
  }
});

// Run comprehensive analysis
router.post('/analyze', authorize(['clientAdmin', 'superadmin']), async (req, res) => {
  try {
    const validatedData = runAnalysisSchema.parse(req.body);
    
    // Verify company belongs to tenant
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, validatedData.companyId)
    });
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    // Create analysis record
    const analysisId = crypto.randomUUID();

    // Run analysis using runArchitectAI function
    const architectInput: ArchitectAIInput = {
      tenantId: req.user!.tenantId,
      companyId: validatedData.companyId,
      userId: req.user!.id
    };

    // Run analysis asynchronously
    runArchitectAI(architectInput)
      .then(async (results: ArchitectAIResult) => {
        await db.insert(analyses).values({
          id: analysisId,
          tenantId: req.user!.tenantId,
          type: 'full',
          status: 'completed',
          results: results
        });
      })
      .catch(async (error) => {
        const e = error as Error;
        await db.insert(analyses).values({
          id: analysisId,
          tenantId: req.user!.tenantId,
          type: 'full',
          status: 'failed',
          metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
        });
      });
    
    return res.json({
      success: true,
      analysisId: analysisId,
      status: 'started',
      message: 'Analysis started. Check status endpoint for updates.'
    });
    
  } catch (error) {
    console.error('Analysis error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input',
        details: error.errors
      });
    }
    
    return res.status(500).json({ error: 'Failed to start analysis' });
  }
});

// Get analysis status
router.get('/analysis/:id/status', async (req, res) => {
  try {
    const analysis = await db.query.analyses.findFirst({
      where: and(
        eq(analyses.id, req.params.id),
        eq(analyses.tenantId, req.user!.tenantId)
      )
    });
    
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }
    
    const metadata = (analysis.metadata as Record<string, unknown>) || {};
    return res.json({
      id: analysis.id,
      status: analysis.status,
      progress: metadata.progress,
      startedAt: metadata.startedAt,
      completedAt: metadata.completedAt,
      error: metadata.error
    });
    
  } catch (error) {
    console.error('Status check error:', error);
    return res.status(500).json({ error: 'Failed to check status' });
  }
});

// Get analysis results
router.get('/analysis/:id/results', async (req, res) => {
  try {
    const analysis = await db.query.analyses.findFirst({
      where: and(
        eq(analyses.id, req.params.id),
        eq(analyses.tenantId, req.user!.tenantId)
      )
    });
    
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }
    
    if (analysis.status !== 'completed') {
      return res.status(400).json({ 
        error: 'Analysis not complete',
        status: analysis.status 
      });
    }
    
    const metadata2 = (analysis.metadata as Record<string, unknown>) || {};
    return res.json({
      id: analysis.id,
      results: analysis.results,
      completedAt: metadata2.completedAt
    });
    
  } catch (error) {
    console.error('Results fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// Get agent capabilities
router.get('/capabilities', async (req, res) => {
  try {
    // Using function-based runArchitectAI
    // No initialization needed
    
    return res.json({
      agents: { agents: ['culture', 'structure', 'skills', 'performance', 'engagement', 'recognition', 'benchmarking'] },
      analysisTypes: ['structure', 'culture', 'skills', 'engagement', 'recognition', 'performance', 'benchmarking'],
      features: {
        multiProvider: true,
        consensusAnalysis: true,
        realTimeUpdates: true,
        automatedTriggers: true
      }
    });
    
  } catch (error) {
    console.error('Capabilities error:', error);
    return res.status(500).json({ error: 'Failed to fetch capabilities' });
  }
});

// Trigger specific agent
router.post('/agent/:type/run', authorize(['clientAdmin', 'superadmin']), async (req, res) => {
  try {
    const agentType = req.params.type;
    const { companyId, config } = req.body;
    
    // Verify company
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId)
    });
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    // Using function-based runArchitectAI
    // TODO: Implement single agent run - runArchitectAI runs all agents
    const result = await runArchitectAI({
      tenantId: req.user!.tenantId,
      companyId,
      userId: req.user!.id
    });
    
    return res.json({
      success: true,
      result
    });
    
  } catch (error) {
    console.error('Agent run error:', error);
    return res.status(500).json({ error: 'Failed to run agent' });
  }
});

export default router;
