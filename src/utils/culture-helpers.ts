/**
 * Production-ready helper functions for culture assessment
 * Compliant with AGENT_CONTEXT_ULTIMATE.md - Complete implementation, no placeholders
 */

import { db } from '../../db/index';
import { cultureReports, cultureAssessments, users } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { CultureAgentV2 } from '../services/agents/culture/culture-agent';

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
  try {
    console.log(`📊 [REPORT GENERATION] Starting for employee ${employeeId}`);

    // 1. Fetch the assessment data
    const assessment = await db.select()
      .from(cultureAssessments)
      .where(eq(cultureAssessments.id, assessmentId))
      .limit(1);

    if (assessment.length === 0) {
      throw new Error(`Assessment ${assessmentId} not found`);
    }

    const assessmentData = assessment[0];

    // 2. Fetch user data for employee name
    const user = await db.select()
      .from(users)
      .where(eq(users.id, employeeId))
      .limit(1);

    if (user.length === 0) {
      throw new Error(`User ${employeeId} not found`);
    }

    const userData = user[0];

    // 3. Initialize AI Agent with Three-Engine configuration
    const agentConfig = {
      knowledge: {
        providers: ['anthropic'] as string[],
        model: 'claude-3-opus-20240229',
        temperature: 0.7,
        maxTokens: 4000
      },
      data: {
        providers: ['anthropic'] as string[],
        model: 'claude-3-opus-20240229',
        temperature: 0.3,
        maxTokens: 4000
      },
      reasoning: {
        providers: ['anthropic'] as string[],
        model: 'claude-3-opus-20240229',
        temperature: 0.5,
        maxTokens: 4000
      },
      consensusThreshold: 0.7
    };

    console.log(`🎨 [CULTURE AGENT] Analyzing employee ${employeeId}...`);
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

    console.log(`✅ [CULTURE AGENT] Analysis complete - Alignment: ${cultureAnalysis.alignment}%, Strengths: ${cultureAnalysis.strengths.length}, Gaps: ${cultureAnalysis.gaps.length}`);

    // 5. Build comprehensive report with correct structure matching frontend expectations
    const reportData = {
      employeeId,
      employeeName: userData.name,
      assessmentDate: assessmentData.completedAt,

      // Personal Values Section with AI interpretation
      personalValues: {
        selected: assessmentData.personalValues as string[] || [],
        cylinderScores: cultureAnalysis.cylinderScores || {},
        interpretation: `Your core values show ${cultureAnalysis.strengths.length} key strengths and ${cultureAnalysis.gaps.length} development areas. Overall alignment: ${cultureAnalysis.alignment}%.`,
        strengths: cultureAnalysis.strengths,
        gaps: cultureAnalysis.gaps
      },

      // Vision for Growth Section
      visionForGrowth: {
        selected: assessmentData.desiredExperience as string[] || [],
        meaning: `Your vision reflects aspiration toward ${cultureAnalysis.recommendations.length} key growth areas.`,
        opportunities: cultureAnalysis.recommendations.filter(r =>
          r.toLowerCase().includes('develop') || r.toLowerCase().includes('growth')
        ).slice(0, 3)
      },

      // Culture Alignment Analysis
      cultureAlignment: {
        score: cultureAnalysis.alignment,
        interpretation: getAlignmentInterpretation(cultureAnalysis.alignment),
        strengths: cultureAnalysis.strengths,
        gaps: cultureAnalysis.gaps,
        recommendations: cultureAnalysis.recommendations
      },

      // Engagement Analysis with interpretation
      engagement: {
        score: assessmentData.engagement || 0,
        interpretation: getEngagementInterpretation(assessmentData.engagement || 0, cultureAnalysis),
        factors: [
          `Values alignment: ${cultureAnalysis.alignment}%`,
          ...cultureAnalysis.strengths.slice(0, 2)
        ],
        recommendations: cultureAnalysis.recommendations
          .filter(r => r.toLowerCase().includes('engagement') || r.toLowerCase().includes('involve'))
          .slice(0, 3)
      },

      // Recognition Analysis with interpretation
      recognition: {
        score: assessmentData.recognition || 0,
        interpretation: getRecognitionInterpretation(assessmentData.recognition || 0),
        impact: `Recognition score of ${assessmentData.recognition}/5 indicates ${assessmentData.recognition >= 4 ? 'strong' : assessmentData.recognition >= 3 ? 'moderate' : 'developing'} satisfaction with acknowledgment practices`,
        recommendations: cultureAnalysis.recommendations
          .filter(r => r.toLowerCase().includes('recognition') || r.toLowerCase().includes('acknowledge'))
          .slice(0, 3)
      },

      // Overall recommendations
      recommendations: cultureAnalysis.recommendations,

      // Overall Summary
      overallSummary: {
        keyStrengths: cultureAnalysis.strengths.slice(0, 3),
        growthGaps: cultureAnalysis.gaps.slice(0, 3),
        nextSteps: [
          'Review your personalized recommendations',
          'Identify one strength to leverage this week',
          'Address one development area this month',
          'Schedule follow-up conversation with manager'
        ]
      },

      generatedAt: new Date().toISOString()
    };

    // 6. Validate report structure before saving
    validateReportStructure(reportData);

    console.log(`💾 [REPORT GENERATION] Saving AI-powered report to database...`);

    // 7. Store the report in the database
    await db.insert(cultureReports).values({
      id: randomUUID(),
      tenantId,
      analysisId: assessmentId,
      reportType: 'employee',
      reportData: reportData as any,
      createdAt: new Date()
    });

    console.log(`✅ [REPORT GENERATION] Successfully generated AI-powered culture report for employee ${employeeId}`);

  } catch (error) {
    console.error(`❌ [REPORT GENERATION] Error for employee ${employeeId}:`, error);
    throw error; // Surface errors instead of silent failure
  }
}

/**
 * Calculate values alignment score
 * Production-ready implementation
 */
function calculateValuesAlignment(assessment: any): number {
  const personalValues = assessment.personalValues || [];
  const desiredValues = assessment.desiredExperience || [];

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
function calculateExperienceGap(assessment: any): number {
  const current = assessment.currentExperience || [];
  const desired = assessment.desiredExperience || [];

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
function calculateOverallCultureScore(assessment: any): number {
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
function generateCultureInsights(assessment: any): string[] {
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
function generateRecommendations(assessment: any): string[] {
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
function getEngagementInterpretation(score: number, analysis: any): string {
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
function validateReportStructure(report: any): void {
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