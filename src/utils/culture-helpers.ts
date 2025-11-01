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

    // Calculate cylinder scores for desired values (for pathway analysis)
    const desiredCylinderScores = calculateSimpleCylinderScores(
      assessmentData.desiredExperience as string[] || []
    );

    // 5. Build comprehensive report with correct structure matching frontend expectations
    const reportData = {
      employeeId,
      employeeName: userData.name,
      assessmentDate: assessmentData.completedAt,

      // Personal Values Section with AI interpretation + Mizan deep narration
      personalValues: {
        selected: assessmentData.personalValues as string[] || [],
        cylinderScores: cultureAnalysis.cylinderScores || {},
        interpretation: generateMizanValueNarration(
          assessmentData.personalValues as string[] || [],
          cultureAnalysis.cylinderScores || {}
        ),
        strengths: cultureAnalysis.strengths,
        gaps: cultureAnalysis.gaps
      },

      // Vision for Growth Section with strengths-to-desired pathway
      visionForGrowth: {
        selected: assessmentData.desiredExperience as string[] || [],
        meaning: generateStrengthsPathway(
          cultureAnalysis.strengths,
          assessmentData.desiredExperience as string[] || [],
          cultureAnalysis.cylinderScores || {},
          desiredCylinderScores
        ),
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

      // AI-generated reflection questions for deepening self-awareness
      reflectionQuestions: generateReflectionQuestions(
        cultureAnalysis.cylinderScores || {},
        cultureAnalysis.strengths,
        cultureAnalysis.gaps,
        cultureAnalysis.alignment
      ),

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