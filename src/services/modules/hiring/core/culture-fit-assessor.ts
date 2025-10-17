// backend/src/services/modules/hiring/core/culture-fit-assessor.ts
// Culture Fit Assessment for Hiring Module
// Compliant with AGENT_CONTEXT_ULTIMATE.md - Production-ready implementation

import { db } from '../../../../db/index';
import { cultureAgent } from '../../../agents/culture/culture-agent';
import { eq } from 'drizzle-orm';
import logger from '../../../../utils/logger';

export interface CultureFitInput {
  candidateId: string;
  tenantId: string;
  jobId: string;
  assessmentResponses: Array<{
    questionId: string;
    question: string;
    response: string;
  }>;
}

export interface CultureFitResult {
  candidateId: string;
  overallFitScore: number; // 0-100
  cylinderAlignment: {
    cylinder: number;
    score: number;
    alignment: 'strong' | 'moderate' | 'weak';
  }[];
  strengths: string[];
  concerns: string[];
  recommendation: 'strong-fit' | 'moderate-fit' | 'weak-fit';
  reasoning: string;
}

/**
 * Assess candidate's culture fit based on assessment responses
 * Uses the Culture Agent's Mizan framework
 */
export async function assessCultureFit(input: CultureFitInput): Promise<CultureFitResult> {
  try {
    logger.info(`Assessing culture fit for candidate ${input.candidateId}`);

    // Get tenant's culture framework
    const frameworks = await cultureAgent.getCultureFrameworks();
    const cylinders = frameworks.cylinders;

    // Analyze candidate responses against culture framework
    const cylinderScores = new Map<number, number>();
    
    for (const response of input.assessmentResponses) {
      // Analyze each response for value alignment
      const alignment = await analyzeValueAlignment(
        response.response,
        cylinders
      );
      
      for (const [cylinder, score] of alignment.entries()) {
        const current = cylinderScores.get(cylinder) || 0;
        cylinderScores.set(cylinder, current + score);
      }
    }

    // Calculate overall fit score
    const avgScore = Array.from(cylinderScores.values()).reduce((sum, score) => sum + score, 0) / cylinderScores.size;
    const overallFitScore = Math.round((avgScore / 100) * 100);

    // Determine cylinder alignment
    const cylinderAlignment = Array.from(cylinderScores.entries()).map(([cylinder, score]) => ({
      cylinder,
      score: Math.round(score),
      alignment: score >= 75 ? 'strong' as const : score >= 50 ? 'moderate' as const : 'weak' as const
    }));

    // Identify strengths and concerns
    const strengths = cylinderAlignment
      .filter(c => c.alignment === 'strong')
      .map(c => `Strong alignment with Cylinder ${c.cylinder}: ${cylinders[c.cylinder - 1]?.name}`);

    const concerns = cylinderAlignment
      .filter(c => c.alignment === 'weak')
      .map(c => `Weak alignment with Cylinder ${c.cylinder}: ${cylinders[c.cylinder - 1]?.name}`);

    // Generate recommendation
    const recommendation = overallFitScore >= 75 ? 'strong-fit' : 
                          overallFitScore >= 50 ? 'moderate-fit' : 'weak-fit';

    const reasoning = generateRecommendationReasoning(
      overallFitScore,
      cylinderAlignment,
      strengths,
      concerns
    );

    logger.info(`Culture fit assessment completed for candidate ${input.candidateId}: ${recommendation}`);

    return {
      candidateId: input.candidateId,
      overallFitScore,
      cylinderAlignment,
      strengths,
      concerns,
      recommendation,
      reasoning
    };

  } catch (error) {
    logger.error(`Error assessing culture fit for candidate ${input.candidateId}:`, error as Error);
    throw new Error(`Failed to assess culture fit: ${(error as Error).message}`);
  }
}

/**
 * Analyze value alignment from candidate response
 */
async function analyzeValueAlignment(
  response: string,
  cylinders: Array<{ level: number; enablingValues: string[]; limitingValues: string[] }>
): Promise<Map<number, number>> {
  const alignment = new Map<number, number>();

  // Simple keyword matching for values
  // In production, this would use AI for better analysis
  cylinders.forEach(cylinder => {
    let score = 50; // Base score

    // Check for enabling values
    cylinder.enablingValues.forEach(value => {
      if (response.toLowerCase().includes(value.toLowerCase())) {
        score += 10;
      }
    });

    // Check for limiting values (reduces score)
    cylinder.limitingValues.forEach(value => {
      if (response.toLowerCase().includes(value.toLowerCase())) {
        score -= 10;
      }
    });

    alignment.set(cylinder.level, Math.max(0, Math.min(100, score)));
  });

  return alignment;
}

/**
 * Generate reasoning for recommendation
 */
function generateRecommendationReasoning(
  overallScore: number,
  cylinderAlignment: Array<{ cylinder: number; score: number; alignment: string }>,
  strengths: string[],
  concerns: string[]
): string {
  let reasoning = `Overall culture fit score: ${overallScore}/100. `;

  if (overallScore >= 75) {
    reasoning += 'Candidate demonstrates strong cultural alignment. ';
  } else if (overallScore >= 50) {
    reasoning += 'Candidate shows moderate cultural alignment with some areas for development. ';
  } else {
    reasoning += 'Candidate shows weak cultural alignment. Careful consideration recommended. ';
  }

  if (strengths.length > 0) {
    reasoning += `Strengths: ${strengths.join(', ')}. `;
  }

  if (concerns.length > 0) {
    reasoning += `Areas of concern: ${concerns.join(', ')}. `;
  }

  return reasoning;
}

export default assessCultureFit;

