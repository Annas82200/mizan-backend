import { z } from 'zod';
import { db } from '../../../db/index';
import { bonusRecommendations } from '../../../db/schema/bonus';
import { KnowledgeEngine } from '../../../ai/engines/KnowledgeEngine';
import { DataEngine } from '../../../ai/engines/DataEngine';
import { ReasoningEngine } from '../../../ai/engines/ReasoningEngine';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// Zod schemas for Bonus Agent
export const BonusTriggerSchema = z.object({
  tenantId: z.string().uuid(),
  employeeId: z.string().uuid(),
  triggerSource: z.enum(['performance_review', 'skill_acquisition', 'project_completion']),
  data: z.record(z.unknown()), // Data from the trigger source, e.g., performance score, skill level achieved
});

export type BonusTrigger = z.infer<typeof BonusTriggerSchema>;

// Define a more specific type for the analysis result
interface BonusAnalysisResult {
    recommendBonus: boolean;
    recommendedAmount: number;
    bonusType: 'performance' | 'skill_acquisition' | 'project_completion' | 'spot_bonus' | 'retention';
    rationale: string;
}

class BonusAgent {
    private knowledgeEngine: KnowledgeEngine;
    private dataEngine: DataEngine;
    private reasoningEngine: ReasoningEngine;

    constructor() {
        this.knowledgeEngine = new KnowledgeEngine();
        this.dataEngine = new DataEngine();
        this.reasoningEngine = new ReasoningEngine();
    }

    public async handleBonusTrigger(input: BonusTrigger) {
        const validatedInput = BonusTriggerSchema.parse(input);
        const { tenantId, employeeId, triggerSource, data } = validatedInput;

        // 1. Get context and analyze the trigger data
        const context = await this.knowledgeEngine.getContext('compensation_and_rewards');
        const processedData = await this.dataEngine.process(
            { employeeId, triggerSource, data },
            context
        );
        const reasoningResult = await this.reasoningEngine.analyze(
            processedData,
            context
        );
        
        // Map the reasoning result to BonusAnalysisResult
        const analysis: BonusAnalysisResult = {
            recommendBonus: reasoningResult.recommendations?.[0]?.priority === 'high' || false,
            recommendedAmount: 0, // This should be calculated based on the trigger data
            bonusType: 'performance', // Default type, should be determined by trigger
            rationale: reasoningResult.recommendations?.[0]?.rationale || 'No specific rationale provided'
        };

        // 2. If a bonus is recommended, create a record
        if (analysis.recommendBonus && analysis.recommendedAmount > 0) {
            const recommendation = await this.createBonusRecommendation(
                tenantId,
                employeeId,
                triggerSource,
                data,
                analysis
            );
            return {
                bonusRecommended: true,
                recommendationId: recommendation.id,
                amount: recommendation.recommendedAmount,
                rationale: recommendation.rationale,
            };
        }

        return {
            bonusRecommended: false,
        };
    }

    private async createBonusRecommendation(
        tenantId: string,
        employeeId: string,
        triggerSource: string,
        triggerData: Record<string, unknown>,
        analysis: BonusAnalysisResult
    ) {
        const [recommendation] = await db.insert(bonusRecommendations).values({
            id: randomUUID(),
            tenantId,
            employeeId,
            triggerSource,
            triggerData,
            bonusType: analysis.bonusType || 'performance',
            recommendedAmount: analysis.recommendedAmount,
            currency: 'USD',
            rationale: analysis.rationale || 'Based on recent performance or achievement.',
            status: 'recommended',
        }).returning();

        return recommendation;
    }
}

export const bonusAgent = new BonusAgent();
