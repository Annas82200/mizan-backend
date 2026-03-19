// @ts-nocheck
/**
 * Analysis Routes — Run and retrieve structure/culture/skills analysis
 */
import { Router, Request, Response } from 'express';
import { db } from '../../db/index';
import { analysisResults, analysisRuns } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { AnalysisOrchestrator } from '../../src/services/analysis/orchestrator';

const router = Router();
const orchestrator = new AnalysisOrchestrator();

interface AuthRequest extends Request { userId: string; tenantId: string; }

// Run full analysis (structure + culture + skills)
router.post('/run', async (req: Request, res: Response) => {
  const { tenantId, userId } = req as AuthRequest;
  try {
    const result = await orchestrator.runFullAnalysis(tenantId, userId);
    return res.json(result);
  } catch (error) {
    console.error('[Analysis] Run failed:', (error as Error).message);
    return res.status(500).json({ error: 'Analysis failed' });
  }
});

// Get latest analysis results
router.get('/results', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  try {
    const results = await db.select().from(analysisResults)
      .where(eq(analysisResults.tenantId, tenantId))
      .orderBy(desc(analysisResults.createdAt)).limit(1);
    return res.json({ result: results[0] || null });
  } catch (error) {
    console.error('[Analysis] Error:', (error as Error).message);
    return res.status(500).json({ error: 'Failed to get results' });
  }
});

// Get analysis history
router.get('/runs', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  try {
    const runs = await db.select().from(analysisRuns)
      .where(eq(analysisRuns.tenantId, tenantId))
      .orderBy(desc(analysisRuns.startedAt)).limit(20);
    return res.json({ runs });
  } catch (error) {
    console.error('[Analysis] Error:', (error as Error).message);
    return res.status(500).json({ error: 'Failed to get runs' });
  }
});

export default router;
