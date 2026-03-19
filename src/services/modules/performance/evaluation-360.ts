// @ts-nocheck
/**
 * 360 Evaluation Service — Multi-source feedback for executives
 *
 * Collects feedback from self, peers, direct reports, and manager.
 * Uses the Reasoning Engine (Claude) to analyze patterns, detect biases,
 * and produce calibrated executive performance summaries.
 */

import { getAIRouter } from '../../ai-engines/ai-router';

export interface EvaluationSource {
  sourceType: 'self' | 'peer' | 'direct_report' | 'manager';
  evaluatorId: string;
  ratings: Record<string, number>; // competency -> score (1-5)
  comments: Record<string, string>; // competency -> open text
  overallRating: number;
  strengths: string[];
  developmentAreas: string[];
}

export interface TwoWayEvaluation {
  employeeToManager: {
    ratings: Record<string, number>;
    comments: Record<string, string>;
    feedback: string;
  };
  managerToEmployee: {
    ratings: Record<string, number>;
    comments: Record<string, string>;
    feedback: string;
  };
}

export interface EvaluationSummary {
  overallScore: number;
  competencyScores: Record<string, { average: number; selfScore: number; othersScore: number; blindSpotGap: number }>;
  strengths: string[];
  developmentAreas: string[];
  blindSpots: string[];
  biasIndicators: string[];
  recommendations: string[];
  confidenceLevel: number;
}

export class Evaluation360Service {
  /**
   * Generate a comprehensive 360 evaluation summary from multiple feedback sources
   */
  async generate360Summary(params: {
    tenantId: string;
    employeeId: string;
    sources: EvaluationSource[];
  }): Promise<EvaluationSummary> {
    const router = getAIRouter();

    const selfEval = params.sources.find(s => s.sourceType === 'self');
    const peerEvals = params.sources.filter(s => s.sourceType === 'peer');
    const reportEvals = params.sources.filter(s => s.sourceType === 'direct_report');
    const managerEval = params.sources.find(s => s.sourceType === 'manager');

    const response = await router.route({
      query: `Analyze this 360-degree evaluation data and produce a comprehensive summary.

Self Assessment:
${selfEval ? JSON.stringify(selfEval.ratings) : 'Not provided'}

Peer Reviews (${peerEvals.length} peers):
${JSON.stringify(peerEvals.map(p => p.ratings))}

Direct Report Reviews (${reportEvals.length}):
${JSON.stringify(reportEvals.map(r => r.ratings))}

Manager Review:
${managerEval ? JSON.stringify(managerEval.ratings) : 'Not provided'}

Analyze and return JSON with:
1. overallScore (1-5 weighted average, peers and manager weighted higher)
2. competencyScores (per competency: average, selfScore, othersScore, blindSpotGap)
3. strengths (top 3 consistently identified across sources)
4. developmentAreas (areas with low scores or high variance)
5. blindSpots (where self-score significantly differs from others)
6. biasIndicators (leniency bias, recency bias, halo effect signals)
7. recommendations (specific development actions)
8. confidenceLevel (0-100 based on data quality and consistency)`,
      tenantId: params.tenantId,
      forceEngine: 'reasoning',
    });

    try {
      return JSON.parse(response.content);
    } catch (err) {
      // Calculate basic summary if AI response isn't valid JSON
      return this.calculateBasicSummary(params.sources);
    }
  }

  /**
   * Generate two-way evaluation analysis (employee evaluates manager)
   */
  async analyzeTwoWayEvaluation(params: {
    tenantId: string;
    evaluation: TwoWayEvaluation;
  }): Promise<{
    alignmentScore: number;
    convergenceAreas: string[];
    divergenceAreas: string[];
    actionItems: Array<{ forEmployee: string; forManager: string }>;
  }> {
    const router = getAIRouter();

    const response = await router.route({
      query: `Analyze this two-way evaluation (employee ↔ manager feedback).

Employee's feedback on manager:
${JSON.stringify(params.evaluation.employeeToManager)}

Manager's feedback on employee:
${JSON.stringify(params.evaluation.managerToEmployee)}

Return JSON with:
1. alignmentScore (0-100, how aligned are their perspectives)
2. convergenceAreas (areas they agree on)
3. divergenceAreas (areas of disagreement)
4. actionItems (paired actions for both employee and manager)`,
      tenantId: params.tenantId,
      forceEngine: 'reasoning',
    });

    try {
      return JSON.parse(response.content);
    } catch (err) {
      return {
        alignmentScore: 50,
        convergenceAreas: [],
        divergenceAreas: [],
        actionItems: [],
      };
    }
  }

  /**
   * Fallback: calculate basic summary without AI
   */
  private calculateBasicSummary(sources: EvaluationSource[]): EvaluationSummary {
    const allRatings = sources.flatMap(s => Object.values(s.ratings));
    const avgScore = allRatings.length > 0 ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : 0;

    const selfSource = sources.find(s => s.sourceType === 'self');
    const otherSources = sources.filter(s => s.sourceType !== 'self');

    const competencyScores: EvaluationSummary['competencyScores'] = {};
    const allCompetencies = new Set(sources.flatMap(s => Object.keys(s.ratings)));

    for (const comp of allCompetencies) {
      const selfScore = selfSource?.ratings[comp] || 0;
      const otherScores = otherSources.map(s => s.ratings[comp] || 0).filter(s => s > 0);
      const othersAvg = otherScores.length > 0 ? otherScores.reduce((a, b) => a + b, 0) / otherScores.length : 0;

      competencyScores[comp] = {
        average: (selfScore + othersAvg) / 2,
        selfScore,
        othersScore: othersAvg,
        blindSpotGap: Math.abs(selfScore - othersAvg),
      };
    }

    return {
      overallScore: Math.round(avgScore * 10) / 10,
      competencyScores,
      strengths: sources.flatMap(s => s.strengths).slice(0, 3),
      developmentAreas: sources.flatMap(s => s.developmentAreas).slice(0, 3),
      blindSpots: [],
      biasIndicators: [],
      recommendations: [],
      confidenceLevel: Math.min(sources.length * 20, 100),
    };
  }
}
