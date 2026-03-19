/**
 * Culture Analysis Engine — 7-Cylinder Ethical Framework
 * Wraps the Reasoning Engine's analyzeCulture with DB persistence.
 */
import { db } from '../../../db/index';
import { pulseSurveys, pulseResponses } from '../../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { getAIRouter } from '../ai-engines/ai-router';

export interface CultureAnalysis {
  overallScore: number;
  entropy: number;
  cylinderScores: Record<string, number>;
  valueGaps: string[];
  interventions: string[];
}

export class CultureEngine {
  async analyze(tenantId: string): Promise<CultureAnalysis> {
    // Gather latest survey data
    const surveys = await db.select().from(pulseSurveys)
      .where(eq(pulseSurveys.tenantId, tenantId))
      .orderBy(desc(pulseSurveys.createdAt)).limit(5);

    const responses = await db.select().from(pulseResponses)
      .where(eq(pulseResponses.tenantId, tenantId));

    // Use AI to analyze
    const router = getAIRouter();
    const aiResponse = await router.route({
      query: `Analyze organizational culture using the 7-Cylinder Ethical Framework.
Survey data: ${surveys.length} surveys, ${responses.length} responses.
Return JSON: { overallScore (0-100), entropy (0-100, lower=better), cylinderScores: {cylinder_name: score}, valueGaps: [strings], interventions: [strings] }`,
      tenantId,
      forceEngine: 'reasoning',
    });

    try {
      return JSON.parse(aiResponse.content);
    } catch (err) {
      console.error('[CultureEngine] Failed to parse AI response as JSON:', (err as Error).message);
      console.error('[CultureEngine] Raw AI response:', aiResponse.content?.substring(0, 500));
      // Return zeroed scores so the caller knows this is not real data
      return {
        overallScore: 0,
        entropy: 0,
        cylinderScores: {},
        valueGaps: ['Analysis could not be completed — AI response was not parseable'],
        interventions: ['Re-run analysis after verifying survey data quality'],
      };
    }
  }
}
