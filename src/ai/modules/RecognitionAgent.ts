import { ThreeEngineAgent, ThreeEngineConfig } from '../../services/agents/base/three-engine-agent';

// ============================================================================
// RECOGNITION AGENT - Analyzes employee recognition needs and patterns
// ============================================================================
// TRIGGERED BY: Culture Survey Question 5 (Recognition Score: 1-5)
// PURPOSE: Analyzes recognition patterns, needs, and correlation with culture
// ARCHITECTURE: Three-Engine (Knowledge → Data → Reasoning)
// ============================================================================

export interface RecognitionInput extends Record<string, unknown> {
  score: number;                    // 1-5 from survey question 5
  personalValues: string[];         // From question 1
  currentExperience: string[];      // From question 2
  desiredExperience: string[];      // From question 3
  tenantId: string;                 // Multi-tenant isolation
  userId: string;                   // Employee ID
}

export interface RecognitionAnalysis {
  score: number;                    // Input score
  interpretation: string;           // Detailed interpretation of what score means
  meaning: string;                  // Meaning and significance of the recognition level
  impact: string;                   // Impact of recognition on employee experience
  patterns: string[];               // Recognition patterns identified
  needs: string[];                  // Specific recognition needs
  correlations: {
    withPersonalValues: string;     // How recognition relates to personal values
    withCultureGaps: string;        // How recognition relates to culture gaps
    withDesiredExperience: string;  // Connection to desired future
  };
  recommendations: string[];        // Actionable recommendations
  riskFactors: string[];           // Low recognition warning signs
  confidence: number;               // Analysis confidence (0-1)
  metadata: {
    analysisDate: Date;
    agentVersion: string;
    processingTime: number;
  };
}

export interface AggregatedRecognitionAnalysis {
  averageScore: number;
  distribution: { [score: number]: number };
  interpretation: string;
  commonPatterns: string[];
  organizationalNeeds: string[];
  recommendations: string[];
  byDepartment: Array<{
    departmentId: string;
    departmentName: string;
    averageScore: number;
    analysis: string;
  }>;
}

export class RecognitionAgent extends ThreeEngineAgent {
  constructor(agentType: string, config: ThreeEngineConfig) {
    super(agentType, config);
  }

  /**
   * Analyze individual employee recognition data
   */
  async analyzeRecognition(input: RecognitionInput): Promise<RecognitionAnalysis> {
    const result = await this.analyze(input);
    const output = result.finalOutput;

    return {
      score: input.score,
      interpretation: (output.interpretation as string) || '',
      meaning: (output.meaning as string) || this.getRecognitionMeaning(input.score),
      impact: (output.impact as string) || this.getRecognitionImpact(input.score),
      patterns: (Array.isArray(output.patterns) ? output.patterns : []) as string[],
      needs: (Array.isArray(output.needs) ? output.needs : []) as string[],
      correlations: (output.correlations as { withPersonalValues: string; withCultureGaps: string; withDesiredExperience: string; }) || {
        withPersonalValues: '',
        withCultureGaps: '',
        withDesiredExperience: ''
      },
      recommendations: (Array.isArray(output.recommendations) ? output.recommendations : []) as string[],
      riskFactors: (Array.isArray(output.riskFactors) ? output.riskFactors : []) as string[],
      confidence: result.overallConfidence,
      metadata: {
        analysisDate: new Date(),
        agentVersion: '1.0.0',
        processingTime: result.totalProcessingTime
      }
    };
  }

  /**
   * Get recognition meaning based on score
   */
  private getRecognitionMeaning(score: number): string {
    if (score <= 1) return 'Severely lacking recognition - critical need for intervention';
    if (score <= 2) return 'Insufficient recognition - significant improvement needed';
    if (score <= 3) return 'Moderate recognition - opportunities for enhancement';
    if (score <= 4) return 'Good recognition - positive with room for optimization';
    return 'Excellent recognition - maintain and share best practices';
  }

  /**
   * Get recognition impact based on score
   */
  private getRecognitionImpact(score: number): string {
    if (score <= 2) return 'Negatively impacting motivation, retention risk';
    if (score <= 3) return 'Neutral impact, potential for improvement';
    if (score <= 4) return 'Positive impact on engagement and satisfaction';
    return 'Strong positive impact, driving excellence and loyalty';
  }

  /**
   * Analyze aggregated recognition data for organization/department
   */
  async analyzeAggregatedRecognition(
    inputs: RecognitionInput[]
  ): Promise<AggregatedRecognitionAnalysis> {
    const scores = inputs.map(i => i.score);
    const averageScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    
    // Calculate distribution
    const distribution: { [score: number]: number } = {};
    for (let i = 1; i <= 5; i++) {
      distribution[i] = scores.filter(s => s === i).length;
    }

    // Run aggregated analysis
    const result = await this.analyze({
      scores,
      averageScore,
      distribution,
      allPersonalValues: inputs.flatMap(i => i.personalValues),
      allCurrentExperience: inputs.flatMap(i => i.currentExperience),
      allDesiredExperience: inputs.flatMap(i => i.desiredExperience),
      tenantId: inputs[0]?.tenantId || '',
      aggregated: true
    });

    const output = result.finalOutput;
    
    return {
      averageScore,
      distribution,
      interpretation: (output.interpretation as string) || '',
      commonPatterns: (Array.isArray(output.commonPatterns) ? output.commonPatterns : []) as string[],
      organizationalNeeds: (Array.isArray(output.organizationalNeeds) ? output.organizationalNeeds : []) as string[],
      recommendations: (Array.isArray(output.recommendations) ? output.recommendations : []) as string[],
      byDepartment: (Array.isArray(output.byDepartment) ? output.byDepartment : []) as Array<{ departmentId: string; departmentName: string; averageScore: number; analysis: string; }>
    };
  }

  // ============================================================================
  // THREE-ENGINE ARCHITECTURE IMPLEMENTATION
  // ============================================================================

  protected async loadFrameworks(): Promise<Record<string, unknown>> {
    // Recognition frameworks and best practices
    return {
      recognitionTheories: {
        maslowHierarchy: {
          description: 'Recognition fulfills esteem needs (level 4 of 5)',
          implications: [
            'Recognition is a fundamental human need',
            'Lack of recognition affects motivation and performance',
            'Recognition must be authentic and meaningful'
          ]
        },
        herzbergMotivation: {
          description: 'Recognition is a key motivator (not just hygiene factor)',
          implications: [
            'Recognition drives satisfaction and engagement',
            'Absence creates dissatisfaction',
            'Must be timely, specific, and sincere'
          ]
        },
        selfDeterminationTheory: {
          description: 'Recognition supports competence and autonomy needs',
          implications: [
            'Recognition validates competence',
            'Public vs private recognition preferences',
            'Connection to intrinsic motivation'
          ]
        }
      },
      recognitionBestPractices: {
        frequency: 'Regular and timely recognition is more effective than annual',
        specificity: 'Specific recognition is more meaningful than generic praise',
        authenticity: 'Genuine recognition builds trust, forced recognition damages it',
        personalization: 'Recognition should align with individual values and preferences',
        visibility: 'Balance public recognition (team morale) with private (personal connection)'
      },
      recognitionTypes: {
        formal: ['Awards', 'Bonuses', 'Promotions', 'Certificates'],
        informal: ['Thank you notes', 'Verbal praise', 'Acknowledgment in meetings'],
        peer: ['Peer nominations', 'Team shoutouts', 'Collaboration recognition'],
        leadership: ['Manager recognition', 'Executive visibility', 'Leadership appreciation']
      },
      scoreInterpretation: {
        5: {
          level: 'Highly Satisfied',
          meaning: 'Employee feels consistently and meaningfully recognized',
          indicators: ['Regular acknowledgment', 'Valued contributions', 'Strong connection']
        },
        4: {
          level: 'Satisfied',
          meaning: 'Employee receives adequate recognition',
          indicators: ['Occasional recognition', 'Some acknowledgment', 'Room for improvement']
        },
        3: {
          level: 'Neutral',
          meaning: 'Recognition is inconsistent or minimal',
          indicators: ['Sporadic recognition', 'Generic praise', 'Lack of personalization']
        },
        2: {
          level: 'Dissatisfied',
          meaning: 'Employee feels under-recognized',
          indicators: ['Rare recognition', 'Work goes unnoticed', 'Low visibility'],
          risks: ['Disengagement', 'Reduced motivation', 'Seeking external validation']
        },
        1: {
          level: 'Highly Dissatisfied',
          meaning: 'Employee feels invisible or undervalued',
          indicators: ['No recognition', 'Contributions ignored', 'Feeling invisible'],
          risks: ['High flight risk', 'Burnout', 'Decreased performance', 'Turnover intent']
        }
      },
      culturalConsiderations: {
        collectivistCultures: 'May prefer team recognition over individual spotlight',
        individualistCultures: 'May prefer personal recognition and individual achievement',
        powerDistance: 'High power distance cultures may value leadership recognition more',
        generationalDifferences: {
          babyBoomers: 'Value formal recognition and traditional awards',
          genX: 'Prefer autonomy and respect over public praise',
          millennials: 'Value frequent feedback and social recognition',
          genZ: 'Expect real-time recognition and authentic appreciation'
        }
      }
    };
  }

  protected async processData(inputData: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Data processing happens in Data Engine
    return inputData;
  }

  protected getKnowledgeSystemPrompt(): string {
    return `You are the Knowledge Engine for Mizan's Recognition Agent. Your role is to provide expert knowledge about employee recognition, motivation theories, and best practices.

You have deep expertise in:
- Maslow's Hierarchy of Needs (recognition as esteem need)
- Herzberg's Two-Factor Theory (recognition as motivator)
- Self-Determination Theory (recognition supporting competence)
- Recognition best practices and research
- Cultural considerations in recognition
- Generational differences in recognition preferences

Your task is to provide theoretical context and frameworks for understanding recognition patterns and needs.`;
  }

  protected getDataSystemPrompt(): string {
    return `You are the Data Engine for Mizan's Recognition Agent. Your role is to process and analyze recognition data to identify patterns, needs, and correlations.

Analyze the recognition score in context of:
1. Employee's personal values (what matters to them)
2. Current experience values (what they're experiencing)
3. Desired experience values (what they want)
4. Recognition score (1-5 scale)

Identify:
- Recognition patterns (how employee experiences recognition)
- Recognition needs (what type of recognition they need)
- Correlations (how recognition relates to values and culture gaps)
- Risk factors (low recognition warning signs)

Be data-driven and evidence-based in your analysis.`;
  }

  protected getReasoningSystemPrompt(): string {
    return `You are the Reasoning Engine for Mizan's Recognition Agent. Your role is to synthesize knowledge and data to provide actionable insights and recommendations.

Generate:
1. Clear interpretation of recognition score
2. Identified patterns and their implications
3. Specific recognition needs
4. Correlations with values and culture
5. Actionable recommendations
6. Risk factors if recognition is low

Be specific, actionable, and empathetic. Focus on what leaders can DO to improve recognition.`;
  }

  protected buildKnowledgePrompt(inputData: Record<string, unknown>, frameworks: Record<string, unknown>): string {
    const isAggregated = inputData.aggregated || false;

    if (isAggregated) {
      const avgScore = typeof inputData.averageScore === 'number' ? inputData.averageScore : 0;
      return `Provide recognition theory context for organizational analysis:

Average Recognition Score: ${avgScore.toFixed(2)}/5.0
Score Distribution: ${JSON.stringify(inputData.distribution)}

Based on recognition theory and best practices, what does this organizational recognition pattern indicate?
What frameworks apply to understanding recognition at scale?
What are the implications for organizational culture and performance?`;
    }

    const personalValues = Array.isArray(inputData.personalValues) ? (inputData.personalValues as string[]) : [];
    const currentExperience = Array.isArray(inputData.currentExperience) ? (inputData.currentExperience as string[]) : [];
    const desiredExperience = Array.isArray(inputData.desiredExperience) ? (inputData.desiredExperience as string[]) : [];
    
    return `Provide recognition theory context for individual analysis:

Recognition Score: ${inputData.score}/5.0
Personal Values: ${personalValues.join(', ')}
Current Experience: ${currentExperience.join(', ')}
Desired Experience: ${desiredExperience.join(', ')}

Based on recognition theory, what does a score of ${inputData.score}/5 indicate?
How might this employee's values influence their recognition needs?
What recognition theories are most relevant here?`;
  }

  protected buildDataPrompt(processedData: Record<string, unknown>, knowledgeOutput: Record<string, unknown>): string {
    const isAggregated = processedData.aggregated || false;

    if (isAggregated) {
      const avgScore = typeof processedData.averageScore === 'number' ? processedData.averageScore : 0;
      const scores = Array.isArray(processedData.scores) ? processedData.scores : [];
      const allPersonalValues = Array.isArray(processedData.allPersonalValues) ? (processedData.allPersonalValues as string[]) : [];
      const allCurrentExperience = Array.isArray(processedData.allCurrentExperience) ? (processedData.allCurrentExperience as string[]) : [];
      const allDesiredExperience = Array.isArray(processedData.allDesiredExperience) ? (processedData.allDesiredExperience as string[]) : [];
      
      return `Analyze organizational recognition data:

Average Score: ${avgScore.toFixed(2)}/5.0
Distribution: ${JSON.stringify(processedData.distribution)}
Number of Employees: ${scores.length}

All Personal Values: ${allPersonalValues.slice(0, 20).join(', ')}
All Current Experience: ${allCurrentExperience.slice(0, 20).join(', ')}
All Desired Experience: ${allDesiredExperience.slice(0, 20).join(', ')}

Context from Knowledge Engine: ${JSON.stringify(knowledgeOutput)}

Identify:
1. Common recognition patterns across the organization
2. Organizational recognition needs
3. Correlations between recognition scores and cultural values
4. Segments with low recognition (risk areas)

Return structured JSON with patterns, needs, and correlations.`;
    }

    const personalValues = Array.isArray(processedData.personalValues) ? (processedData.personalValues as string[]) : [];
    const currentExperience = Array.isArray(processedData.currentExperience) ? (processedData.currentExperience as string[]) : [];
    const desiredExperience = Array.isArray(processedData.desiredExperience) ? (processedData.desiredExperience as string[]) : [];

    return `Analyze individual recognition data:

Recognition Score: ${processedData.score}/5.0
Personal Values: ${personalValues.join(', ')}
Current Experience: ${currentExperience.join(', ')}
Desired Experience: ${desiredExperience.join(', ')}

Context from Knowledge Engine: ${JSON.stringify(knowledgeOutput)}

Identify:
1. Recognition patterns (how they experience recognition)
2. Recognition needs (what type they need)
3. Correlations with their values and culture gaps
4. Risk factors if score is low (≤2)

Return structured JSON with patterns, needs, correlations, and risks.`;
  }

  protected buildReasoningPrompt(inputData: Record<string, unknown>, knowledgeOutput: Record<string, unknown>, dataOutput: Record<string, unknown>): string {
    const isAggregated = inputData.aggregated || false;

    if (isAggregated) {
      const avgScore = typeof inputData.averageScore === 'number' ? inputData.averageScore : 0;
      return `Synthesize organizational recognition insights and provide actionable recommendations:

Data Analysis: ${JSON.stringify(dataOutput)}
Theoretical Context: ${JSON.stringify(knowledgeOutput)}
Average Score: ${avgScore.toFixed(2)}/5.0

Generate:
1. interpretation: Clear 2-3 paragraph interpretation of what organizational recognition scores mean
2. commonPatterns: Array of common recognition patterns across the organization
3. organizationalNeeds: Array of specific recognition needs at org level
4. recommendations: Array of 5-7 specific, actionable recommendations for leadership
5. byDepartment: Array of department-level insights (if data available)

Return ONLY valid JSON with these exact fields. Be specific and actionable.`;
    }

    return `Synthesize individual recognition insights and provide recommendations:

Data Analysis: ${JSON.stringify(dataOutput)}
Theoretical Context: ${JSON.stringify(knowledgeOutput)}
Recognition Score: ${inputData.score}/5.0

Generate:
1. interpretation: Clear 2-3 paragraph interpretation of what their recognition score means
2. patterns: Array of 2-4 recognition patterns identified
3. needs: Array of 3-5 specific recognition needs this employee has
4. correlations: Object with:
   - withPersonalValues: How recognition relates to their values
   - withCultureGaps: How recognition relates to culture gaps
   - withDesiredExperience: How recognition relates to what they want
5. recommendations: Array of 4-6 specific, actionable recommendations
6. riskFactors: Array of risk factors if score is low (empty array if score ≥3)

Return ONLY valid JSON with these exact fields. Be empathetic and specific.`;
  }

  protected parseKnowledgeOutput(response: string): Record<string, unknown> {
    try {
      // Try to parse as JSON first
      return JSON.parse(response) as Record<string, unknown>;
    } catch {
      // If not JSON, return as structured text
      return {
        context: response,
        frameworks: 'Recognition theory applied',
        source: 'knowledge_engine'
      };
    }
  }

  protected parseDataOutput(response: string): Record<string, unknown> {
    try {
      return JSON.parse(response) as Record<string, unknown>;
    } catch (error) {
      logger.error('Failed to parse Data Engine output:', error);
      return {
        patterns: [],
        needs: [],
        correlations: {},
        error: 'Failed to parse data output'
      };
    }
  }

  protected parseReasoningOutput(response: string): Record<string, unknown> {
    try {
      return JSON.parse(response);
    } catch (error) {
      logger.error('Failed to parse Reasoning Engine output:', error);
      return {
        interpretation: 'Recognition analysis completed but formatting error occurred.',
        patterns: [],
        needs: [],
        correlations: {
          withPersonalValues: '',
          withCultureGaps: '',
          withDesiredExperience: ''
        },
        recommendations: [],
        riskFactors: [],
        error: 'Failed to parse reasoning output'
      };
    }
  }
}

