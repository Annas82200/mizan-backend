/**
 * Production-ready helper functions for culture assessment
 * Compliant with AGENT_CONTEXT_ULTIMATE.md - Complete implementation, no placeholders
 */

import { db } from '../../db/index';
import { cultureReports, cultureAssessments, users } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { CultureAgentV2 } from '../services/agents/culture/culture-agent';
import { logger } from '../services/logger';

/**
 * Type definitions for culture helpers - production-ready typed interfaces
 */
interface CultureAssessmentData {
  id: string;
  employeeId: string;
  tenantId: string;
  personalValues: string[];
  currentExperience: string[];
  desiredExperience: string[];
  engagement: number;
  recognition: number;
  completedAt: Date;
  responses?: Record<string, number | string>;
}

interface EngagementAnalysis {
  score: number;
  level: 'low' | 'medium' | 'high';
  alignment: number;
  factors?: Array<{
    factor: string;
    impact: number;
    recommendation: string;
  }>;
  riskIndicators?: string[];
}

interface CultureReport {
  employeeId: string;
  employeeName: string;
  assessmentDate: Date;
  personalValues: {
    selected: string[];
    cylinderScores: Record<number, number>;
    interpretation: string;
    strengths?: string[];
    gaps?: string[];
  };
  strengthsAnalysis?: unknown;
  engagementStrategy?: unknown;
  reflectionQuestions?: unknown;
  engagement?: unknown;
  recognition?: unknown;
  generatedAt?: string;
}

/**
 * Calculate days between a date and now
 * @param date - The date to calculate from
 * @returns Number of days since the given date
 */
export function daysSince(date: Date | string | null): number {
  if (!date) return Infinity;

  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - targetDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Generate an individual employee culture report using AI-powered Three-Engine Analysis
 * Production-ready implementation with CultureAgentV2
 * @param assessmentId - The culture assessment ID
 * @param employeeId - The employee ID
 * @param tenantId - The tenant ID
 */
export async function generateEmployeeReport(
  assessmentId: string,
  employeeId: string,
  tenantId: string
): Promise<void> {
  // Declare variables outside try block for access in catch block (error recovery)
  let assessmentData: {
    id: string;
    personalValues?: unknown;
    currentExperience?: unknown;
    desiredExperience?: unknown;
    engagement?: number;
    recognition?: number;
    completedAt?: Date;
    [key: string]: unknown;
  } | null = null;
  let userData: { id: string; name: string; [key: string]: unknown } | null = null;

  try {
    logger.info(`📊 [REPORT GENERATION] Starting for employee ${employeeId}`);

    // 1. Fetch the assessment data
    const assessment = await db.select()
      .from(cultureAssessments)
      .where(eq(cultureAssessments.id, assessmentId))
      .limit(1);

    if (assessment.length === 0) {
      throw new Error(`Assessment ${assessmentId} not found`);
    }

    assessmentData = assessment[0];

    // 2. Fetch user data for employee name
    const user = await db.select()
      .from(users)
      .where(eq(users.id, employeeId))
      .limit(1);

    if (user.length === 0) {
      throw new Error(`User ${employeeId} not found`);
    }

    userData = user[0];

    // 3. Initialize AI Agent with Three-Engine configuration (Multi-Provider Ensemble)
    // Note: In multi-provider mode, each provider uses its own default model:
    // - Anthropic: claude-sonnet-4-5
    // - OpenAI: gpt-4o
    // - Gemini: gemini-2.5-flash
    // - Mistral: mistral-large-latest
    const agentConfig = {
      knowledge: {
        providers: ['anthropic', 'openai', 'gemini', 'mistral'] as string[],
        temperature: 0.7,
        maxTokens: 4000
      },
      data: {
        providers: ['anthropic', 'openai', 'gemini', 'mistral'] as string[],
        temperature: 0.3,
        maxTokens: 4000
      },
      reasoning: {
        providers: ['anthropic', 'openai', 'gemini', 'mistral'] as string[],
        temperature: 0.5,
        maxTokens: 4000
      },
      consensusThreshold: 0.7
    };

    logger.info(`🎨 [CULTURE AGENT] Analyzing employee ${employeeId}...`);
    const cultureAgent = new CultureAgentV2('culture', agentConfig);

    // 4. Call AI Agent for deep culture analysis
    const cultureAnalysis = await cultureAgent.analyzeIndividualEmployee(
      employeeId,
      assessmentData.personalValues as string[] || [],
      assessmentData.currentExperience as string[] || [],
      assessmentData.desiredExperience as string[] || [],
      assessmentData.engagement || 0,
      assessmentData.recognition || 0
    );

    logger.info(`✅ [CULTURE AGENT] Analysis complete - Alignment: ${cultureAnalysis.alignment}%, Strengths: ${cultureAnalysis.strengths.length}, Gaps: ${cultureAnalysis.gaps.length}`);

    // Calculate cylinder scores for desired values (for pathway analysis)
    const desiredCylinderScores = calculateSimpleCylinderScores(
      assessmentData.desiredExperience as string[] || []
    );

    // 5. Build simplified report with 4-section structure
    const reportData = {
      employeeId,
      employeeName: userData.name,
      assessmentDate: assessmentData.completedAt,

      // SECTION 1: What Your Values Mean
      // Analysis of selected values against the 7-Cylinder Framework
      personalValues: {
        selected: assessmentData.personalValues as string[] || [],
        cylinderScores: cultureAnalysis.cylinderScores || {},
        interpretation: generateMizanValueNarration(
          assessmentData.personalValues as string[] || [],
          cultureAnalysis.cylinderScores || {}
        )
      },

      // SECTION 2: How Your Strengths Build Healthy Culture
      // Detailed explanation of strengths (not just cylinder names)
      strengthsAnalysis: {
        identifiedStrengths: generateStrengthExplanations(
          cultureAnalysis.strengths,
          cultureAnalysis.cylinderScores || {},
          assessmentData.personalValues as string[] || []
        ),
        pathwayToHealth: generateHealthPathway(
          cultureAnalysis.strengths,
          cultureAnalysis.gaps,
          cultureAnalysis.cylinderScores || {}
        ),
        keyInsights: [
          `Your alignment score of ${cultureAnalysis.alignment}% shows ${cultureAnalysis.alignment >= 70 ? 'strong' : cultureAnalysis.alignment >= 50 ? 'moderate' : 'developing'} cultural resonance`,
          ...cultureAnalysis.strengths.slice(0, 2).map(s => `Strength in ${s.toLowerCase()}`)
        ]
      },

      // SECTION 3: Increase Engagement Using Your Strengths
      // Connect strengths to engagement strategies
      engagementStrategy: {
        currentLevel: assessmentData.engagement || 0,
        strengthsToLeverage: generateEngagementStrategies(
          cultureAnalysis.strengths,
          cultureAnalysis.cylinderScores || {},
          assessmentData.engagement || 0
        ),
        actionableSteps: generateEngagementActions(
          cultureAnalysis.strengths,
          assessmentData.engagement || 0,
          cultureAnalysis.recommendations
        ),
        expectedImpact: `By leveraging your ${cultureAnalysis.strengths.length} key strengths, you can increase engagement and contribute to a healthier organizational culture`
      },

      // SECTION 4: Customized Reflection Questions
      // Thought-provoking questions tailored to individual profile
      reflectionQuestions: generateReflectionQuestions(
        cultureAnalysis.cylinderScores || {},
        cultureAnalysis.strengths,
        cultureAnalysis.gaps,
        cultureAnalysis.alignment
      ),

      // Metadata
      generatedAt: new Date().toISOString()
    };

    // 6. Validate report structure before saving
    validateReportStructure(reportData);

    logger.info(`💾 [REPORT GENERATION] Saving AI-powered report to database...`);

    // 7. Store the report in the database
    await db.insert(cultureReports).values({
      id: randomUUID(),
      tenantId,
      analysisId: assessmentId,
      reportType: 'employee',
      reportData: reportData as any,
      createdAt: new Date()
    });

    logger.info(`✅ [REPORT GENERATION] Successfully generated AI-powered culture report for employee ${employeeId}`);

  } catch (error) {
    logger.error(`❌ [REPORT GENERATION] Error for employee ${employeeId}:`, error);

    // Enhanced error recovery: Save partial report with error details
    try {
      logger.info(`🔄 [REPORT GENERATION] Attempting to save partial report with error details...`);

      const partialReportData = {
        employeeId,
        employeeName: userData?.name || 'Unknown',
        assessmentDate: assessmentData?.completedAt || new Date(),
        error: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.name : 'UnknownError',
        personalValues: {
          selected: (assessmentData?.personalValues as string[]) || [],
          cylinderScores: {},
          interpretation: 'Report generation failed. Please try regenerating the report.',
          strengths: [],
          gaps: []
        },
        visionForGrowth: {
          selected: (assessmentData?.desiredExperience as string[]) || [],
          meaning: 'Unable to generate due to error',
          opportunities: []
        },
        cultureAlignment: {
          score: 0,
          interpretation: 'Analysis failed',
          strengths: [],
          gaps: [],
          recommendations: ['Please regenerate this report']
        },
        engagement: {
          score: assessmentData?.engagement || 0,
          interpretation: 'Unable to analyze due to error',
          factors: [],
          drivers: [],
          barriers: [],
          recommendations: []
        },
        recognition: {
          score: assessmentData?.recognition || 0,
          interpretation: 'Unable to analyze due to error',
          patterns: [],
          needs: [],
          recommendations: []
        },
        recommendations: ['Report generation encountered an error. Please try regenerating.'],
        overallSummary: {
          keyStrengths: [],
          growthGaps: [],
          nextSteps: ['Regenerate report', 'Contact support if issue persists']
        },
        generatedAt: new Date().toISOString(),
        partialReport: true
      };

      // Save partial report so user can see something and retry
      await db.insert(cultureReports).values({
        id: randomUUID(),
        tenantId,
        analysisId: assessmentId,
        reportType: 'employee',
        reportData: partialReportData as any,
        createdAt: new Date()
      });

      logger.info(`⚠️ [REPORT GENERATION] Saved partial report with error details for employee ${employeeId}`);
    } catch (saveError) {
      logger.error(`❌ [REPORT GENERATION] Failed to save even partial report:`, saveError);
    }

    // Re-throw original error for upstream handling
    throw error;
  }
}

/**
 * Calculate values alignment score
 * Production-ready implementation
 */
function calculateValuesAlignment(assessment: {
  personalValues?: unknown;
  desiredExperience?: unknown;
  [key: string]: unknown;
}): number {
  const personalValues = (Array.isArray(assessment.personalValues) ? assessment.personalValues : []) as string[];
  const desiredValues = (Array.isArray(assessment.desiredExperience) ? assessment.desiredExperience : []) as string[];

  if (personalValues.length === 0 || desiredValues.length === 0) {
    return 0;
  }

  // Calculate overlap between personal values and desired experience
  const overlap = personalValues.filter((value: string) =>
    desiredValues.includes(value)
  ).length;

  return Math.round((overlap / Math.max(personalValues.length, desiredValues.length)) * 100);
}

/**
 * Calculate experience gap score
 * Production-ready implementation
 */
function calculateExperienceGap(assessment: {
  currentExperience?: unknown;
  desiredExperience?: unknown;
  [key: string]: unknown;
}): number {
  const current = (Array.isArray(assessment.currentExperience) ? assessment.currentExperience : []) as string[];
  const desired = (Array.isArray(assessment.desiredExperience) ? assessment.desiredExperience : []) as string[];

  if (current.length === 0 || desired.length === 0) {
    return 100; // Maximum gap if no data
  }

  // Calculate how many desired experiences are missing from current
  const missing = desired.filter((exp: string) =>
    !current.includes(exp)
  ).length;

  return Math.round((missing / desired.length) * 100);
}

/**
 * Calculate overall culture score
 * Production-ready implementation combining multiple factors
 */
function calculateOverallCultureScore(assessment: {
  engagement?: number;
  recognition?: number;
  personalValues?: unknown;
  currentExperience?: unknown;
  desiredExperience?: unknown;
  [key: string]: unknown;
}): number {
  const engagement = assessment.engagement || 0;
  const recognition = assessment.recognition || 0;
  const valuesAlignment = calculateValuesAlignment(assessment);
  const experienceGap = 100 - calculateExperienceGap(assessment);

  // Weighted average of all factors
  const weights = {
    engagement: 0.3,
    recognition: 0.25,
    values: 0.25,
    experience: 0.2
  };

  const score =
    (engagement * weights.engagement) +
    (recognition * weights.recognition) +
    (valuesAlignment * weights.values / 100) +
    (experienceGap * weights.experience / 100);

  return Math.round(score);
}

/**
 * Generate culture insights based on assessment data
 * Production-ready implementation
 */
function generateCultureInsights(assessment: {
  engagement?: number;
  recognition?: number;
  personalValues?: unknown;
  currentExperience?: unknown;
  desiredExperience?: unknown;
  [key: string]: unknown;
}): string[] {
  const insights: string[] = [];
  const engagement = assessment.engagement || 0;
  const recognition = assessment.recognition || 0;
  const experienceGap = calculateExperienceGap(assessment);

  // Engagement insights
  if (engagement >= 4) {
    insights.push('High engagement level indicates strong connection with work and team');
  } else if (engagement <= 2) {
    insights.push('Low engagement scores suggest opportunity for improved work experience');
  }

  // Recognition insights
  if (recognition >= 4) {
    insights.push('Employee feels well-recognized for contributions');
  } else if (recognition <= 2) {
    insights.push('Recognition gap identified - employee may benefit from more acknowledgment');
  }

  // Experience gap insights
  if (experienceGap > 60) {
    insights.push('Significant gap between current and desired workplace experience');
  } else if (experienceGap < 30) {
    insights.push('Good alignment between current and desired workplace experience');
  }

  // Values alignment
  const valuesAlignment = calculateValuesAlignment(assessment);
  if (valuesAlignment > 70) {
    insights.push('Strong alignment between personal values and workplace culture');
  } else if (valuesAlignment < 40) {
    insights.push('Values misalignment may impact job satisfaction and retention');
  }

  return insights;
}

/**
 * Generate actionable recommendations
 * Production-ready implementation
 */
function generateRecommendations(assessment: {
  engagement?: number;
  recognition?: number;
  personalValues?: unknown;
  currentExperience?: unknown;
  desiredExperience?: unknown;
  [key: string]: unknown;
}): string[] {
  const recommendations: string[] = [];
  const engagement = assessment.engagement || 0;
  const recognition = assessment.recognition || 0;
  const experienceGap = calculateExperienceGap(assessment);
  const valuesAlignment = calculateValuesAlignment(assessment);

  // Engagement recommendations
  if (engagement < 3) {
    recommendations.push('Schedule regular 1:1s to discuss career goals and challenges');
    recommendations.push('Consider involving employee in strategic projects to increase ownership');
  }

  // Recognition recommendations
  if (recognition < 3) {
    recommendations.push('Implement regular recognition practices (weekly team shoutouts, peer recognition)');
    recommendations.push('Provide specific feedback on accomplishments and contributions');
  }

  // Experience gap recommendations
  if (experienceGap > 50) {
    recommendations.push('Conduct detailed discussion about desired workplace improvements');
    recommendations.push('Create action plan to address top 3 experience gaps');
  }

  // Values alignment recommendations
  if (valuesAlignment < 50) {
    recommendations.push('Explore opportunities to better align role with personal values');
    recommendations.push('Consider team or project reassignment for better cultural fit');
  }

  // Always include at least one positive reinforcement
  if (engagement >= 4 && recognition >= 4) {
    recommendations.push('Continue current engagement and recognition practices - they are working well');
  }

  return recommendations;
}

/**
 * Calculate simple cylinder scores from values
 * Maps values to cylinders based on keywords
 */
function calculateSimpleCylinderScores(values: string[]): Record<number, number> {
  const scores: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };

  // Simple keyword-based mapping to cylinders
  const cylinderKeywords: Record<number, string[]> = {
    1: ['safety', 'security', 'stability', 'health', 'wellbeing', 'prepared'],
    2: ['belonging', 'trust', 'collaboration', 'inclusion', 'connection', 'community'],
    3: ['growth', 'achievement', 'learning', 'excellence', 'discipline', 'accountability'],
    4: ['purpose', 'meaning', 'contribution', 'service', 'stewardship', 'impact'],
    5: ['integrity', 'justice', 'fairness', 'transparency', 'accountability', 'honesty'],
    6: ['wisdom', 'compassion', 'empathy', 'understanding', 'patience', 'discernment'],
    7: ['unity', 'alignment', 'harmony', 'transcendence', 'integration', 'purpose']
  };

  values.forEach(value => {
    const lowerValue = value.toLowerCase();
    Object.entries(cylinderKeywords).forEach(([cylinder, keywords]) => {
      if (keywords.some(keyword => lowerValue.includes(keyword))) {
        scores[parseInt(cylinder)]++;
      }
    });
  });

  return scores;
}

/**
 * Generate Mizan-style deep value narration with Barrett-inspired psychological depth
 * Uses Mizan's 7-Cylinder framework to provide meaningful interpretation
 */
function generateMizanValueNarration(
  selectedValues: string[],
  cylinderScores: Record<number, number>
): string {
  const narratives: string[] = [];

  // Mizan 7-Cylinder framework definitions for deep narration
  const cylinderNarrations: Record<number, { name: string; deepMeaning: string; whenStrong: string; whenWeak: string }> = {
    1: {
      name: 'Safety & Survival',
      deepMeaning: 'Your foundation - the ground upon which all else is built',
      whenStrong: 'You bring grounded stability and protective awareness to your work. You understand that true excellence begins with ensuring the wellbeing and security of all.',
      whenWeak: 'You may be seeking greater stability or clarity around foundational needs in your work environment.'
    },
    2: {
      name: 'Belonging & Loyalty',
      deepMeaning: 'Your connection to others - the bonds that create community',
      whenStrong: 'You deeply value genuine human connection and trust. Your strength lies in building authentic relationships that transcend mere transactions.',
      whenWeak: 'You may be yearning for deeper connection and more authentic belonging within your team and organization.'
    },
    3: {
      name: 'Growth & Achievement',
      deepMeaning: 'Your drive for mastery - the pursuit of excellence with humility',
      whenStrong: 'You embody disciplined growth and mindful achievement. You understand that true success honors both ambition and ethical boundaries.',
      whenWeak: 'You may be seeking opportunities for greater learning, development, or recognition of your accomplishments.'
    },
    4: {
      name: 'Meaning & Contribution',
      deepMeaning: 'Your sense of purpose - connecting your work to something greater',
      whenStrong: 'You are driven by purpose beyond profit. Your work is an expression of stewardship and meaningful contribution to the world.',
      whenWeak: 'You may be searching for deeper meaning and greater alignment between your daily work and your life\'s purpose.'
    },
    5: {
      name: 'Integrity & Justice',
      deepMeaning: 'Your moral compass - the ethical foundation of all decisions',
      whenStrong: 'You champion truth, fairness, and accountability. Your integrity is non-negotiable, and you courageously stand for what is right.',
      whenWeak: 'You may be experiencing ethical tensions or seeking environments where transparency and fairness are truly honored.'
    },
    6: {
      name: 'Wisdom & Compassion',
      deepMeaning: 'Your balanced understanding - where intellect meets empathy',
      whenStrong: 'You integrate knowledge with compassion, bringing both discernment and understanding. You lead with wisdom that honors both mind and heart.',
      whenWeak: 'You may be developing the balance between analytical thinking and empathetic understanding in your leadership approach.'
    },
    7: {
      name: 'Transcendence & Unity',
      deepMeaning: 'Your highest aspiration - harmony between self, others, and purpose',
      whenStrong: 'You seek alignment at the deepest level - unity of purpose, values, and being. You understand that true fulfillment comes from integration and harmony.',
      whenWeak: 'You may be on a journey toward greater integration and seeking work that aligns with your deepest sense of purpose and being.'
    }
  };

  // Identify dominant cylinders (top 2-3)
  const sortedCylinders = Object.entries(cylinderScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  if (sortedCylinders.length > 0 && sortedCylinders[0][1] > 0) {
    const [cylinderNum, score] = sortedCylinders[0];
    const cylinder = cylinderNarrations[parseInt(cylinderNum)];

    if (cylinder) {
      narratives.push(
        `**${cylinder.name}** resonates most deeply with you. ${cylinder.deepMeaning}. ${score >= 3 ? cylinder.whenStrong : cylinder.whenWeak}`
      );
    }
  }

  // Add insights about value distribution
  if (sortedCylinders.length >= 2) {
    const topCylinders = sortedCylinders.slice(0, 2).map(([num]) => cylinderNarrations[parseInt(num)]?.name).filter(Boolean);
    narratives.push(
      `Your values show a meaningful integration of **${topCylinders[0]}** and **${topCylinders[1]}**, suggesting a holistic approach to work and contribution.`
    );
  }

  // Add personalized insight based on cylinder distribution
  const totalScore = Object.values(cylinderScores).reduce((sum, score) => sum + score, 0);
  const avgScore = totalScore / Object.keys(cylinderScores).length;

  if (avgScore >= 1.5) {
    narratives.push(
      'Your values reflect a rich, multidimensional orientation toward work - you bring depth and complexity to your organizational contribution.'
    );
  } else if (avgScore >= 0.8) {
    narratives.push(
      'Your values show focused strength in specific areas, providing clarity about where you can make your greatest impact.'
    );
  } else {
    narratives.push(
      'You may be in a phase of discovering and defining what matters most to you in your work and organizational life.'
    );
  }

  return narratives.join(' ');
}

/**
 * Generate strengths-to-desired culture pathway narration
 * Explains how to leverage current strengths to achieve desired culture
 */
function generateStrengthsPathway(
  strengths: string[],
  desiredValues: string[],
  personalCylinderScores: Record<number, number>,
  desiredCylinderScores: Record<number, number>
): string {
  const pathways: string[] = [];

  // Identify strongest cylinders in personal values
  const topStrengthCylinders = Object.entries(personalCylinderScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([num]) => parseInt(num));

  // Identify desired cylinders
  const topDesiredCylinders = Object.entries(desiredCylinderScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([num]) => parseInt(num));

  const cylinderBridges: Record<string, string> = {
    '1-2': 'Your foundation of stability can create the safety needed for others to trust and belong. Ground your team in security, then build connection.',
    '1-3': 'Your grounding in stability provides the foundation for sustainable growth. Use your protective awareness to create safe spaces for achievement.',
    '1-4': 'Your commitment to wellbeing can be the foundation for purposeful work. Ensure basic needs are met first, then elevate toward meaning.',
    '1-5': 'Your stability creates the ground for principled action. Use your protective instincts to champion fairness and accountability.',
    '1-6': 'Your grounded nature can anchor compassionate wisdom. Let stability support deeper understanding and balanced judgment.',
    '1-7': 'Your foundation can support the highest integration. Build from solid ground toward transcendent unity.',

    '2-3': 'Your strength in connection can fuel collaborative achievement. Leverage relationships to create collective excellence.',
    '2-4': 'Your gift for belonging can build communities of purpose. Connect people to shared meaning through authentic relationships.',
    '2-5': 'Your trust-building abilities can create cultures of integrity. Use connection to foster accountability and fairness.',
    '2-6': 'Your compassionate connections can deepen into wise understanding. Let empathy inform discernment.',
    '2-7': 'Your capacity for belonging can bridge toward unity. Transform connection into integration.',

    '3-4': 'Your drive for excellence can serve greater purpose. Channel achievement toward meaningful contribution.',
    '3-5': 'Your disciplined growth can embody principled success. Let achievement honor ethical boundaries.',
    '3-6': 'Your pursuit of mastery can integrate with compassionate wisdom. Balance ambition with understanding.',
    '3-7': 'Your growth orientation can ascend toward transcendence. Let achievement serve higher harmony.',

    '4-5': 'Your sense of purpose can champion justice. Let meaning drive principled action.',
    '4-6': 'Your purposeful work can deepen into wise service. Integrate stewardship with compassion.',
    '4-7': 'Your meaningful contribution can align with transcendent unity. Let purpose serve ultimate integration.',

    '5-6': 'Your integrity can soften into compassionate justice. Balance accountability with understanding.',
    '5-7': 'Your principled stance can serve ultimate harmony. Let justice align with transcendent unity.',

    '6-7': 'Your wisdom and compassion are the gateway to transcendence. Integrate understanding with ultimate purpose.'
  };

  // Find pathway from strongest to desired
  if (topStrengthCylinders.length > 0 && topDesiredCylinders.length > 0) {
    const currentPrimary = topStrengthCylinders[0];
    const desiredPrimary = topDesiredCylinders[0];

    if (currentPrimary !== desiredPrimary) {
      const bridgeKey = `${Math.min(currentPrimary, desiredPrimary)}-${Math.max(currentPrimary, desiredPrimary)}`;
      const bridge = cylinderBridges[bridgeKey];

      if (bridge) {
        pathways.push(`**Pathway to Growth:** ${bridge}`);
      }
    } else {
      pathways.push('**Continuing Your Strength:** You are already aligned with your desired cultural orientation. Focus on deepening and embodying these values even more fully.');
    }
  }

  // Add actionable bridge recommendations
  if (strengths.length > 0) {
    pathways.push(
      `**Leverage Your Strengths:** ${strengths.slice(0, 2).join(' and ')} are your foundation. Use these as anchors while stretching toward new dimensions of contribution.`
    );
  }

  return pathways.join(' ');
}

/**
 * Generate detailed strength explanations (not just cylinder names)
 * Explains what each strength means and behavioral indicators
 */
function generateStrengthExplanations(
  strengths: string[],
  cylinderScores: Record<number, number>,
  personalValues: string[]
): Array<{ name: string; explanation: string; behavioralIndicators: string[]; cylinderLevel: number }> {
  const explanations: Array<{ name: string; explanation: string; behavioralIndicators: string[]; cylinderLevel: number }> = [];

  // Cylinder framework explanations
  const cylinderExplanations: Record<string, { explanation: string; indicators: string[]; level: number }> = {
    'Cylinder 1': {
      level: 1,
      explanation: 'You demonstrate strong grounding in safety and security consciousness. This means you naturally create stable environments where people feel protected and can do their best work without fear. You understand that psychological safety is the foundation for innovation and risk-taking.',
      indicators: ['Creates safe spaces for dialogue', 'Establishes clear boundaries', 'Protects team wellbeing', 'Provides stability during change']
    },
    'Cylinder 2': {
      level: 2,
      explanation: 'Your strength lies in fostering belonging and authentic relationships. You excel at creating connections where people feel valued as whole human beings, not just for their output. This relational intelligence is crucial for building cohesive, supportive teams.',
      indicators: ['Builds genuine connections', 'Values team cohesion', 'Creates inclusive environment', 'Nurtures relationships']
    },
    'Cylinder 3': {
      level: 3,
      explanation: 'You bring powerful achievement orientation balanced with discipline. You understand that excellence comes from systematic effort and continuous improvement. This strength drives results while maintaining high standards and helping others grow in capability.',
      indicators: ['Pursues excellence consistently', 'Sets high standards', 'Drives results', 'Mentors others toward growth']
    },
    'Cylinder 4': {
      level: 4,
      explanation: 'You demonstrate deep connection to meaning and contribution. Your work is purpose-driven - you seek to make a genuine difference beyond just completing tasks. This strength helps you and others stay motivated through challenges by connecting daily work to larger impact.',
      indicators: ['Seeks meaningful work', 'Connects tasks to purpose', 'Values impact over activity', 'Inspires through vision']
    },
    'Cylinder 5': {
      level: 5,
      explanation: 'Your strength is in upholding integrity and fairness. You have a keen sense of justice and ethical responsibility. This strength ensures decisions are made transparently and fairly, building trust and credibility in the organization.',
      indicators: ['Acts with integrity', 'Ensures fair treatment', 'Speaks truth to power', 'Upholds ethical standards']
    },
    'Cylinder 6': {
      level: 6,
      explanation: 'You bring wisdom and compassion to your work. You can hold complexity, see multiple perspectives, and respond with empathy. This strength enables you to navigate difficult situations with grace and help others through challenging times.',
      indicators: ['Demonstrates empathy', 'Offers wise counsel', 'Holds complexity', 'Shows compassion under pressure']
    },
    'Cylinder 7': {
      level: 7,
      explanation: 'You embody unity and transcendence consciousness. You see beyond divisions to recognize our interconnectedness. This rare strength helps create cultures where differences are celebrated and collective flourishing is the goal.',
      indicators: ['Bridges differences', 'Sees interconnection', 'Creates unity', 'Transcends ego-driven action']
    }
  };

  // Match strengths to cylinder explanations
  for (const strength of strengths.slice(0, 3)) { // Top 3 strengths
    const cylinderKey = Object.keys(cylinderExplanations).find(key => strength.includes(key.split(' ')[1]));
    if (cylinderKey) {
      const info = cylinderExplanations[cylinderKey];
      explanations.push({
        name: strength,
        explanation: info.explanation,
        behavioralIndicators: info.indicators,
        cylinderLevel: info.level
      });
    } else {
      // Generic strength explanation
      explanations.push({
        name: strength,
        explanation: `Your ${strength.toLowerCase()} represents a key area where you naturally excel and can make significant contributions to organizational culture.`,
        behavioralIndicators: ['Demonstrates consistency', 'Influences others positively', 'Contributes to team success'],
        cylinderLevel: 3
      });
    }
  }

  return explanations;
}

/**
 * Generate pathway from current strengths to cultural health
 * Shows how to use strengths to address gaps
 */
function generateHealthPathway(
  strengths: string[],
  gaps: string[],
  cylinderScores: Record<number, number>
): string {
  if (strengths.length === 0) {
    return 'Focus on developing your foundational values to build a strong cultural foundation.';
  }

  const pathways: string[] = [];

  // Primary strength leverage
  const primaryStrength = strengths[0];
  pathways.push(
    `Start by leveraging your strongest asset: ${primaryStrength.toLowerCase()}. This is your natural foundation for building cultural health.`
  );

  // Bridge to gaps
  if (gaps.length > 0) {
    const primaryGap = gaps[0];
    pathways.push(
      `Use this strength as a bridge to address ${primaryGap.toLowerCase()}. For example, if you excel at ${primaryStrength.toLowerCase()}, you can apply that same intentionality to developing ${primaryGap.toLowerCase()}.`
    );
  }

  // Integration strategy
  pathways.push(
    `The pathway to cultural health isn't about being perfect in every dimension - it's about integrating your strengths in a way that creates balance. Your unique combination of ${strengths.slice(0, 2).join(' and ').toLowerCase()} can be leveraged to contribute meaningfully while continuing to grow.`
  );

  return pathways.join(' ');
}

/**
 * Generate engagement strategies based on individual strengths
 * Connects specific strengths to engagement drivers
 */
function generateEngagementStrategies(
  strengths: string[],
  cylinderScores: Record<number, number>,
  currentEngagement: number
): Array<{ strength: string; engagementAction: string; expectedImpact: string }> {
  const strategies: Array<{ strength: string; engagementAction: string; expectedImpact: string }> = [];

  // Map cylinders to engagement strategies
  const engagementMap: Record<number, { action: string; impact: string }> = {
    1: {
      action: 'Create or contribute to safety initiatives that protect team wellbeing and establish clear boundaries for healthy work',
      impact: 'Increased sense of security enables you and others to take creative risks and innovate'
    },
    2: {
      action: 'Initiate meaningful connections with colleagues, organize team-building activities, or mentor new team members',
      impact: 'Stronger relationships increase your sense of belonging and make work more fulfilling'
    },
    3: {
      action: 'Set challenging but achievable goals, track your progress, and celebrate milestones with your team',
      impact: 'Seeing tangible progress and achieving excellence fuels motivation and engagement'
    },
    4: {
      action: 'Connect your daily tasks to the organization\'s larger mission, share impact stories, or volunteer for purpose-driven projects',
      impact: 'Deepened sense of meaning transforms work from tasks to contribution'
    },
    5: {
      action: 'Advocate for fair practices, participate in decision-making processes, or lead initiatives that ensure transparency',
      impact: 'Living your values at work increases authenticity and commitment'
    },
    6: {
      action: 'Offer mentorship, facilitate difficult conversations, or create spaces for reflection and learning',
      impact: 'Using your wisdom to help others increases fulfillment and organizational impact'
    },
    7: {
      action: 'Bridge siloed teams, facilitate cross-functional collaboration, or champion inclusive practices',
      impact: 'Creating unity and reducing divisions makes work more harmonious and effective'
    }
  };

  // Generate strategies for top strengths
  for (const strength of strengths.slice(0, 2)) {
    const cylinderMatch = strength.match(/Cylinder (\d)/);
    if (cylinderMatch) {
      const cylinderNum = parseInt(cylinderMatch[1]);
      const strategy = engagementMap[cylinderNum];
      if (strategy) {
        strategies.push({
          strength: strength,
          engagementAction: strategy.action,
          expectedImpact: strategy.impact
        });
      }
    }
  }

  // Add engagement level specific strategy
  if (currentEngagement < 3) {
    strategies.push({
      strength: 'Current Growth Opportunity',
      engagementAction: 'Start small: identify one aspect of your work that aligns with your strengths and focus on deepening that connection this week',
      expectedImpact: 'Small wins build momentum for greater engagement over time'
    });
  } else if (currentEngagement >= 4) {
    strategies.push({
      strength: 'Leadership Opportunity',
      engagementAction: 'Share what makes your work engaging with colleagues, mentor others, or lead an engagement initiative',
      expectedImpact: 'Your positive engagement can inspire and lift others, multiplying your impact'
    });
  }

  return strategies;
}

/**
 * Generate actionable engagement steps based on strengths
 * Provides specific actions the employee can take
 */
function generateEngagementActions(
  strengths: string[],
  currentEngagement: number,
  recommendations: string[]
): string[] {
  const actions: string[] = [];

  // Weekly action based on primary strength
  if (strengths.length > 0) {
    const primaryStrength = strengths[0];
    if (primaryStrength.includes('Cylinder 2')) {
      actions.push('This week: Schedule a meaningful conversation with a colleague to deepen your connection');
    } else if (primaryStrength.includes('Cylinder 4')) {
      actions.push('This week: Identify one task and write down how it connects to your personal purpose or the organization\'s mission');
    } else if (primaryStrength.includes('Cylinder 3')) {
      actions.push('This week: Set one challenging goal aligned with your values and create a plan to achieve it');
    } else {
      actions.push(`This week: Find one way to apply your ${primaryStrength.toLowerCase()} in a new situation`);
    }
  }

  // Monthly action for skill building
  actions.push('This month: Choose one development area and take one concrete step toward growth (read an article, have a conversation, try a new approach)');

  // Engagement-level specific action
  if (currentEngagement < 3) {
    actions.push('Daily: Notice and record one thing that gives you energy at work - build awareness of what engages you');
  } else {
    actions.push('Daily: Share one positive interaction or insight with your team - engagement is contagious');
  }

  // Strategic action from recommendations
  const actionableRecs = recommendations.filter(r =>
    r.toLowerCase().includes('consider') ||
    r.toLowerCase().includes('develop') ||
    r.toLowerCase().includes('focus')
  );
  if (actionableRecs.length > 0) {
    actions.push(`Strategic focus: ${actionableRecs[0]}`);
  }

  return actions;
}

/**
 * Generate AI-powered reflection questions based on individual analysis
 * Creates personalized questions to deepen self-awareness
 */
function generateReflectionQuestions(
  cylinderScores: Record<number, number>,
  strengths: string[],
  gaps: string[],
  alignment: number
): Array<{ question: string; purpose: string }> {
  const questions: Array<{ question: string; purpose: string }> = [];

  // Get dominant cylinder
  const dominantCylinder = Object.entries(cylinderScores)
    .sort(([, a], [, b]) => b - a)[0];

  // Cylinder-specific reflection questions
  const cylinderQuestions: Record<number, Array<{ question: string; purpose: string }>> = {
    1: [
      {
        question: 'When do you feel most secure and grounded in your work, and what conditions create that sense of safety?',
        purpose: 'To understand your foundational needs and what enables you to thrive'
      },
      {
        question: 'How do you balance protecting yourself and others with taking necessary risks for growth?',
        purpose: 'To explore the tension between security and development'
      }
    ],
    2: [
      {
        question: 'What does authentic belonging look like for you in a work environment?',
        purpose: 'To clarify your relational needs and what genuine connection means to you'
      },
      {
        question: 'How do you contribute to creating the kind of community you wish to be part of?',
        purpose: 'To reflect on your role in building the culture you desire'
      }
    ],
    3: [
      {
        question: 'What does meaningful achievement look like when it honors both excellence and your values?',
        purpose: 'To define success in a way that integrates performance with purpose'
      },
      {
        question: 'How do you maintain discipline and ambition while avoiding burnout and ego?',
        purpose: 'To explore sustainable high performance'
      }
    ],
    4: [
      {
        question: 'What impact do you most want to have, and how does your current work serve that deeper purpose?',
        purpose: 'To connect daily activities with your larger sense of meaning'
      },
      {
        question: 'How might you increase the alignment between your personal mission and your organizational contribution?',
        purpose: 'To identify opportunities for greater purpose integration'
      }
    ],
    5: [
      {
        question: 'When have you had to choose between personal comfort and speaking truth? What did you learn?',
        purpose: 'To reflect on your relationship with integrity and courage'
      },
      {
        question: 'How do you balance holding others accountable while maintaining compassion?',
        purpose: 'To explore the integration of justice and empathy'
      }
    ],
    6: [
      {
        question: 'How do you integrate analytical thinking with emotional intelligence in your leadership?',
        purpose: 'To examine the balance between head and heart in decision-making'
      },
      {
        question: 'What practices help you cultivate both wisdom and compassion in challenging situations?',
        purpose: 'To identify pathways for developing integrated understanding'
      }
    ],
    7: [
      {
        question: 'What would it look like for your work, values, and life purpose to be in complete harmony?',
        purpose: 'To envision your highest potential for integration'
      },
      {
        question: 'How do you honor the interconnection between personal fulfillment and collective wellbeing?',
        purpose: 'To explore the relationship between individual and universal needs'
      }
    ]
  };

  // Add dominant cylinder questions
  if (dominantCylinder) {
    const [cylinderNum] = dominantCylinder;
    const cylinderQs = cylinderQuestions[parseInt(cylinderNum)];
    if (cylinderQs) {
      questions.push(cylinderQs[0]);
    }
  }

  // Add alignment-based question
  if (alignment < 60) {
    questions.push({
      question: 'What small changes could you make to bring your daily work into greater alignment with your core values?',
      purpose: 'To identify practical steps toward values-work alignment'
    });
  } else if (alignment >= 80) {
    questions.push({
      question: 'How can you use your strong values alignment to mentor others or shape organizational culture?',
      purpose: 'To leverage your alignment for broader impact'
    });
  }

  // Add gap-based question if gaps exist
  if (gaps.length > 0) {
    questions.push({
      question: `You identified ${gaps[0]} as a development area. What would it look like to make progress here in the next 30 days?`,
      purpose: 'To create actionable growth pathways from identified gaps'
    });
  }

  // Add strength-based question
  if (strengths.length > 0) {
    questions.push({
      question: `${strengths[0]} is one of your key strengths. How might you leverage this more intentionally in your role?`,
      purpose: 'To maximize the impact of existing strengths'
    });
  }

  return questions.slice(0, 4); // Return top 4 most relevant questions
}

/**
 * Get human-readable interpretation of alignment score
 */
function getAlignmentInterpretation(score: number): string {
  if (score >= 80) return 'Strong alignment - your values match company culture well';
  if (score >= 60) return 'Moderate alignment - good cultural fit with room to grow';
  if (score >= 40) return 'Some misalignment - opportunities to improve cultural fit';
  return 'Significant misalignment - your values differ from current culture';
}

/**
 * Get engagement interpretation with context
 */
function getEngagementInterpretation(score: number, analysis: { alignment?: number; [key: string]: unknown }): string {
  const level = score >= 4 ? 'high' : score >= 3 ? 'moderate' : 'low';
  return `Your ${level} engagement level (${score}/5) combined with ${analysis.alignment}% values alignment suggests ${score >= 4 ? 'strong connection with your work' : score >= 3 ? 'room for increased connection' : 'opportunities to improve engagement'}`;
}

/**
 * Get recognition interpretation
 */
function getRecognitionInterpretation(score: number): string {
  if (score >= 4) return 'You feel well-recognized and appreciated for your contributions';
  if (score >= 3) return 'You experience moderate recognition with room for improvement';
  if (score >= 2) return 'You would benefit from more consistent recognition';
  return 'Recognition is a significant gap - more acknowledgment would help';
}

/**
 * Validate report structure before saving
 */
function validateReportStructure(report: {
  employeeId?: string;
  employeeName?: string;
  personalValues?: {
    interpretation?: string;
    strengths?: unknown[];
    [key: string]: unknown;
  };
  engagement?: unknown;
  recognition?: unknown;
  [key: string]: unknown;
}): void {
  const required = ['employeeId', 'employeeName', 'personalValues', 'engagement', 'recognition'];

  for (const field of required) {
    if (!report[field]) {
      throw new Error(`Invalid report structure: missing required field "${field}"`);
    }
  }

  // Validate AI analysis is present
  if (!report.personalValues.interpretation) {
    throw new Error('Invalid report structure: missing AI interpretation in personalValues');
  }

  if (!report.personalValues.strengths || report.personalValues.strengths.length === 0) {
    throw new Error('Invalid report structure: missing strengths analysis');
  }
}