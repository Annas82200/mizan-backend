// server/routes/orchestrator.ts

import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { ArchitectAI } from '../services/orchestrator/architect-ai.js';
import { db } from '../db/index.js';
import { analyses, companies } from '../db/schema.js';
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
    const architect = new ArchitectAI();
    await architect.initialize(req.user.tenantId);
    
    res.json({
      success: true,
      message: 'Architect AI initialized',
      capabilities: architect.getCapabilities()
    });
    
  } catch (error) {
    console.error('Architect initialization error:', error);
    res.status(500).json({ error: 'Failed to initialize Architect AI' });
  }
});

// Run comprehensive analysis
router.post('/analyze', authorize(['clientAdmin', 'superadmin']), async (req, res) => {
  try {
    const validatedData = runAnalysisSchema.parse(req.body);
    
    // Verify company belongs to tenant
    const company = await db.query.companies.findFirst({
      where: and(
        eq(companies.id, validatedData.companyId),
        eq(companies.tenantId, req.user.tenantId)
      )
    });
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    // Initialize Architect AI
    const architect = new ArchitectAI();
    await architect.initialize(req.user.tenantId);
    
    // Create analysis record
    const [analysis] = await db.insert(analyses)
      .values({
        id: crypto.randomUUID(),
        tenantId: req.user.tenantId,
        companyId: validatedData.companyId,
        status: 'in_progress',
        requestedBy: req.user.id,
        analysisTypes: validatedData.analysisTypes,
        config: validatedData.config || {},
        startedAt: new Date()
      })
      .returning();
    
    // Run analysis asynchronously
    architect.runFullAnalysis(analysis.id, validatedData)
      .then(async (results) => {
        await db.update(analyses)
          .set({
            status: 'completed',
            results,
            completedAt: new Date()
          })
          .where(eq(analyses.id, analysis.id));
      })
      .catch(async (error) => {
        await db.update(analyses)
          .set({
            status: 'failed',
            error: error.message,
            completedAt: new Date()
          })
          .where(eq(analyses.id, analysis.id));
      });
    
    res.json({
      success: true,
      analysisId: analysis.id,
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
    
    res.status(500).json({ error: 'Failed to start analysis' });
  }
});

// Get analysis status
router.get('/analysis/:id/status', async (req, res) => {
  try {
    const analysis = await db.query.analyses.findFirst({
      where: and(
        eq(analyses.id, req.params.id),
        eq(analyses.tenantId, req.user.tenantId)
      )
    });
    
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }
    
    res.json({
      id: analysis.id,
      status: analysis.status,
      progress: analysis.progress,
      startedAt: analysis.startedAt,
      completedAt: analysis.completedAt,
      error: analysis.error
    });
    
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

// Get analysis results
router.get('/analysis/:id/results', async (req, res) => {
  try {
    const analysis = await db.query.analyses.findFirst({
      where: and(
        eq(analyses.id, req.params.id),
        eq(analyses.tenantId, req.user.tenantId)
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
    
    res.json({
      id: analysis.id,
      results: analysis.results,
      completedAt: analysis.completedAt
    });
    
  } catch (error) {
    console.error('Results fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// Get agent capabilities
router.get('/capabilities', async (req, res) => {
  try {
    const architect = new ArchitectAI();
    await architect.initialize(req.user.tenantId);
    
    res.json({
      agents: architect.getAgentCapabilities(),
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
    res.status(500).json({ error: 'Failed to fetch capabilities' });
  }
});

// Trigger specific agent
router.post('/agent/:type/run', authorize(['clientAdmin', 'superadmin']), async (req, res) => {
  try {
    const agentType = req.params.type;
    const { companyId, config } = req.body;
    
    // Verify company
    const company = await db.query.companies.findFirst({
      where: and(
        eq(companies.id, companyId),
        eq(companies.tenantId, req.user.tenantId)
      )
    });
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    
    const architect = new ArchitectAI();
    await architect.initialize(req.user.tenantId);
    
    const result = await architect.runSingleAgent(agentType as any, {
      companyId,
      tenantId: req.user.tenantId,
      config
    });
    
    res.json({
      success: true,
      result
    });
    
  } catch (error) {
    console.error('Agent run error:', error);
    res.status(500).json({ error: 'Failed to run agent' });
  }
});

export default router;
