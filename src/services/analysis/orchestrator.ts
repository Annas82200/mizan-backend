/**
 * Analysis Orchestrator — Runs all 3 core engines and stores cross-module results
 * This is the "brain" that drives all other modules per requirement #5.
 */
import { db } from '../../db/index';
import { analysisRuns, analysisResults } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { StructureEngine } from './structure-engine';
import { CultureEngine } from './culture-engine';
import { SkillsEngine } from './skills-engine';

export class AnalysisOrchestrator {
  private structureEngine = new StructureEngine();
  private cultureEngine = new CultureEngine();
  private skillsEngine = new SkillsEngine();

  /**
   * Run full analysis (structure + culture + skills) and store results
   */
  async runFullAnalysis(tenantId: string, triggeredBy: string) {
    const [run] = await db.insert(analysisRuns).values({
      tenantId, analysisType: 'full', status: 'running', triggeredBy,
    }).returning();

    const startTime = Date.now();

    try {
      const [structure, culture, skillsResult] = await Promise.all([
        this.structureEngine.analyze(tenantId),
        this.cultureEngine.analyze(tenantId),
        this.skillsEngine.analyze(tenantId),
      ]);

      // Compute org health score as weighted average
      const structureScore = Math.min(100, Math.max(0,
        100 - (structure.bottlenecks.length * 5) - (structure.vacantPositions * 2)
      ));
      const orgHealthScore = Math.round(
        (structureScore * 0.3) + (culture.overallScore * 0.4) + (skillsResult.overallReadiness * 0.3)
      );

      // Store results with cross-module recommendations
      const [result] = await db.insert(analysisResults).values({
        runId: run.id, tenantId, analysisType: 'full',
        orgHealthScore,
        structureScore,
        cultureScore: culture.overallScore,
        cultureEntropy: culture.entropy,
        skillsReadinessScore: skillsResult.overallReadiness,
        structureDetails: structure,
        cultureDetails: culture,
        skillsDetails: skillsResult,
        // Cross-module recommendations that other modules can read
        hiringRecommendations: structure.hiringNeeds,
        learningRecommendations: skillsResult.criticalGaps.map(g => ({
          skill: g.skill, priority: g.priority, suggestedAction: `Create or assign course for ${g.skill}`,
        })),
        performanceRecommendations: culture.interventions.map(i => ({
          type: 'culture_intervention', description: i,
        })),
        bonusFactors: {
          cultureWeight: culture.entropy <= 10 ? 1.0 : 0.9,
          skillsWeight: skillsResult.overallReadiness / 100,
        },
      }).returning();

      await db.update(analysisRuns).set({
        status: 'completed', completedAt: new Date(), durationMs: Date.now() - startTime,
      }).where(eq(analysisRuns.id, run.id));

      return { run: { ...run, status: 'completed' }, result };
    } catch (error) {
      await db.update(analysisRuns).set({
        status: 'failed', errorMessage: (error as Error).message, completedAt: new Date(), durationMs: Date.now() - startTime,
      }).where(eq(analysisRuns.id, run.id));
      throw error;
    }
  }
}
