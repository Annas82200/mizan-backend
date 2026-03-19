// @ts-nocheck
/**
 * Culture Routes — 7-Cylinder analysis, culture surveys, results
 */
import { Router, Request, Response } from 'express';
import { db } from '../../db/index';
import { pulseSurveys, pulseResponses, analysisResults, analysisRuns } from '../../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getAIRouter } from '../../src/services/ai/ai-router';

const router = Router();
interface AuthRequest extends Request { userId: string; tenantId: string; userRole: string; }

// Trigger culture analysis using 7-Cylinder framework
router.post('/analyze', async (req: Request, res: Response) => {
  const { tenantId, userId } = req as AuthRequest;
  const { surveyData, organizationContext } = req.body;

  try {
    // Create analysis run record
    const [run] = await db.insert(analysisRuns).values({ tenantId, analysisType: 'culture', status: 'running', triggeredBy: userId, engineUsed: 'reasoning' }).returning();

    const router_ = getAIRouter();
    const response = await router_.route({
      query: `Analyze culture using the 7-Cylinder Ethical Framework. Survey data: ${JSON.stringify(surveyData || {})}. Context: ${organizationContext || 'General assessment'}. Return JSON with cylinderScores, entropy, valueGaps, interventions.`,
      tenantId, userId, forceEngine: 'reasoning',
    });

    let cultureDetails;
    try { cultureDetails = JSON.parse(response.content); } catch (err) { cultureDetails = { rawAnalysis: response.content }; }

    const [result] = await db.insert(analysisResults).values({
      runId: run.id, tenantId, analysisType: 'culture',
      cultureScore: cultureDetails.overallScore || 70,
      cultureEntropy: cultureDetails.entropy || 10,
      cultureDetails,
    }).returning();

    await db.update(analysisRuns).set({ status: 'completed', completedAt: new Date(), durationMs: response.latencyMs }).where(eq(analysisRuns.id, run.id));

    return res.json({ run: { ...run, status: 'completed' }, result });
  } catch (error) { console.error('[Culture] Analysis error:', (error as Error).message); return res.status(500).json({ error: 'Culture analysis failed' }); }
});

// Get latest culture results
router.get('/results', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  try {
    const results = await db.select().from(analysisResults).where(and(eq(analysisResults.tenantId, tenantId), eq(analysisResults.analysisType, 'culture'))).orderBy(desc(analysisResults.createdAt)).limit(1);
    return res.json({ result: results[0] || null });
  } catch (error) { console.error('[Culture] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to get results' }); }
});

// Culture survey management (delegates to pulse surveys)
router.get('/surveys', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  try {
    const surveys = await db.select().from(pulseSurveys).where(eq(pulseSurveys.tenantId, tenantId)).orderBy(desc(pulseSurveys.createdAt));
    return res.json({ surveys });
  } catch (error) { console.error('[Culture] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to list surveys' }); }
});

router.post('/surveys/submit', async (req: Request, res: Response) => {
  const { tenantId, userId } = req as AuthRequest;
  const { surveyId, answers, isAnonymous } = req.body;
  try {
    const [response_] = await db.insert(pulseResponses).values({ surveyId, tenantId, userId, answers, isAnonymous }).returning();
    await db.update(pulseSurveys).set({ responseCount: sql`${pulseSurveys.responseCount} + 1` }).where(eq(pulseSurveys.id, surveyId));
    return res.json({ response: response_ });
  } catch (error) { console.error('[Culture] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to submit' }); }
});

export default router;
