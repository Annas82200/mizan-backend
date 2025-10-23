import { ThreeEngineAgent, ThreeEngineConfig, AnalysisResult } from '../base/three-engine-agent';

// ============================================================================
// ENGAGEMENT AGENT - Analyzes employee engagement levels and factors
// ============================================================================
// TRIGGERED BY: Culture Survey Question 4 (Engagement Score: 1-5)
// PURPOSE: Analyzes engagement factors, drivers, and correlation with culture
// ARCHITECTURE: Three-Engine (Knowledge → Data → Reasoning)
// ============================================================================

export interface EngagementInput extends Record<string, unknown> {
  score: number;                    // 1-5 from survey question 4
  personalValues: string[];         // From question 1
  currentExperience: string[];      // From question 2
  desiredExperience: string[];      // From question 3
  tenantId: string;                 // Multi-tenant isolation
  userId: string;                   // Employee ID
}

export interface EngagementAnalysis {
  score: number;                    // Input score
  interpretation: string;           // Detailed interpretation of what score means
  factors: string[];                // Engagement factors identified
  drivers: string[];                // Key engagement drivers
  barriers: string[];               // Engagement barriers
  correlations: {
    withPersonalValues: string;     // How engagement relates to personal values
    withCultureGaps: string;        // How engagement relates to culture gaps
    withDesiredExperience: string;  // Connection to desired future
  };
  recommendations: string[];        // Actionable recommendations
  riskFactors: string[];           // Low engagement warning signs
  confidence: number;               // Analysis confidence (0-1)
  metadata: {
    analysisDate: Date;
    agentVersion: string;
    processingTime: number;
  };
}

export interface AggregatedEngagementAnalysis {
  averageScore: number;
  distribution: { [score: number]: number };
  interpretation: string;
  commonFactors: string[];
  commonDrivers: string[];
  organizationalBarriers: string[];
  recommendations: string[];
  byDepartment: Array<{
    departmentId: string;
    departmentName: string;
    averageScore: number;
    analysis: string;
  }>;
}

export class EngagementAgent extends ThreeEngineAgent {
  constructor(agentType: string, config: ThreeEngineConfig) {
    super(agentType, config);
  }

  /**
   * Analyze individual employee engagement data
   */
  async analyzeEngagement(input: EngagementInput): Promise<EngagementAnalysis> {
    const result = await this.analyze(input);
    const output = result.finalOutput;

    // ✅ PRODUCTION: Validate interpretation exists (no type assertion + fallback workaround)
    if (typeof output.interpretation !== 'string' || !output.interpretation) {
      throw new Error('Invalid engagement analysis output: interpretation is required');
    }

    return {
      score: input.score,
      interpretation: output.interpretation,
      factors: (Array.isArray(output.factors) ? output.factors : []) as string[],
      drivers: (Array.isArray(output.drivers) ? output.drivers : []) as string[],
      barriers: (Array.isArray(output.barriers) ? output.barriers : []) as string[],
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
   * Analyze aggregated engagement data for organization/department
   */
  async analyzeAggregatedEngagement(
    inputs: EngagementInput[]
  ): Promise<AggregatedEngagementAnalysis> {
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
      // ✅ PRODUCTION: Tenant ID is REQUIRED (security - no fallback)
      tenantId: (() => {
        if (!inputs[0]?.tenantId) {
          throw new Error('Tenant ID is required for aggregate engagement analysis');
        }
        return inputs[0].tenantId;
      })(),
      aggregated: true
    });

    const output = result.finalOutput;
    
    return {
      averageScore,
      distribution,
      interpretation: (output.interpretation as string) || '',
      commonFactors: (Array.isArray(output.commonFactors) ? output.commonFactors : []) as string[],
      commonDrivers: (Array.isArray(output.commonDrivers) ? output.commonDrivers : []) as string[],
      organizationalBarriers: (Array.isArray(output.organizationalBarriers) ? output.organizationalBarriers : []) as string[],
      recommendations: (Array.isArray(output.recommendations) ? output.recommendations : []) as string[],
      byDepartment: (Array.isArray(output.byDepartment) ? output.byDepartment : []) as Array<{ departmentId: string; departmentName: string; averageScore: number; analysis: string; }>
    };
  }

  // ============================================================================
  // THREE-ENGINE ARCHITECTURE IMPLEMENTATION
  // ============================================================================

  protected async loadFrameworks(): Promise<Record<string, unknown>> {
    // Engagement frameworks and research
    return {
      engagementTheories: {
        kahnEngagement: {
          description: 'Three dimensions of engagement: cognitive, emotional, physical',
          dimensions: {
            cognitive: 'Focused attention and absorption in work',
            emotional: 'Emotional connection to work and organization',
            physical: 'Energy and effort invested in work'
          }
        },
        schaufeli_UWES: {
          description: 'Work engagement as vigor, dedication, and absorption',
          components: {
            vigor: 'High energy and mental resilience',
            dedication: 'Strong involvement and sense of significance',
            absorption: 'Full concentration and immersion in work'
          }
        },
        gallup_Q12: {
          description: '12 elements that predict team and individual performance',
          keyElements: [
            'Know what is expected',
            'Materials and equipment to do work',
            'Opportunity to do what they do best',
            'Recognition for good work',
            'Someone cares about development',
            'Opinions count',
            'Mission/purpose connection',
            'Quality commitment',
            'Best friend at work',
            'Progress discussions',
            'Growth and development',
            'Learning and growth'
          ]
        },
        JD_R_Model: {
          description: 'Job Demands-Resources Model',
          implications: [
            'Job resources increase engagement',
            'Job demands can lead to burnout',
            'Personal resources moderate the relationship',
            'Engagement leads to performance'
          ]
        }
      },
      engagementDrivers: {
        meaningfulWork: 'Connection to purpose and impact',
        autonomy: 'Control over how work is done',
        growth: 'Learning and development opportunities',
        relationships: 'Quality connections with colleagues and leaders',
        recognition: 'Acknowledgment of contributions',
        resources: 'Tools and support needed to succeed',
        leadership: 'Trust and support from leadership',
        workLifeBalance: 'Ability to manage work and personal life',
        fairness: 'Perception of equitable treatment',
        feedback: 'Regular, constructive feedback'
      },
      scoreInterpretation: {
        5: {
          level: 'Highly Engaged',
          meaning: 'Employee is fully invested, energized, and committed',
          indicators: ['High energy', 'Strong commitment', 'Discretionary effort', 'Ambassador behavior']
        },
        4: {
          level: 'Engaged',
          meaning: 'Employee is positively connected and contributing',
          indicators: ['Good performance', 'Positive attitude', 'Some discretionary effort']
        },
        3: {
          level: 'Neutral/Ambivalent',
          meaning: 'Employee is present but not fully engaged',
          indicators: ['Does minimum required', 'Lacks enthusiasm', 'Neutral attitude'],
          risks: ['Can slide to disengagement', 'Vulnerable to better opportunities']
        },
        2: {
          level: 'Disengaged',
          meaning: 'Employee is disconnected and unfulfilled',
          indicators: ['Low energy', 'Minimal effort', 'Negative attitude', 'Clock watching'],
          risks: ['Spreading negativity', 'Decreased productivity', 'Considering leaving']
        },
        1: {
          level: 'Actively Disengaged',
          meaning: 'Employee is actively undermining the organization',
          indicators: ['Acting out frustration', 'Negative influence', 'Sabotaging culture'],
          risks: ['CRITICAL flight risk', 'Toxic influence', 'Performance issues', 'Immediate intervention needed']
        }
      },
      engagementBarriers: {
        lackOfPurpose: 'Disconnect from mission or meaningful impact',
        micromanagement: 'Lack of autonomy and trust',
        poorLeadership: 'Ineffective or toxic management',
        lackOfGrowth: 'No development opportunities',
        unfairness: 'Perceived inequity in treatment or rewards',
        inadequateResources: 'Lacking tools or support to succeed',
        workOverload: 'Unsustainable demands and burnout',
        poorRelationships: 'Conflict or isolation from team',
        lackOfRecognition: 'Contributions go unnoticed',
        mismatchedValues: 'Personal values conflict with organization'
      },
      interventionStrategies: {
        individual: [
          'Career development conversations',
          'Skill-building opportunities',
          'Mentorship programs',
          'Workload adjustment',
          'Role clarity discussions'
        ],
        team: [
          'Team building activities',
          'Regular team check-ins',
          'Collaborative projects',
          'Recognition programs',
          'Feedback culture development'
        ],
        organizational: [
          'Leadership development',
          'Culture transformation',
          'Process improvements',
          'Communication enhancement',
          'Strategic clarity'
        ]
      }
    };
  }

  protected async processData(inputData: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Data processing happens in Data Engine
    return inputData;
  }

  protected getKnowledgeSystemPrompt(): string {
    return `You are the Knowledge Engine for Mizan's Engagement Agent. Your role is to provide expert knowledge about employee engagement, motivation, and organizational psychology.

You have deep expertise in:
- Kahn's Engagement Theory (cognitive, emotional, physical)
- Schaufeli's Work Engagement (vigor, dedication, absorption)
- Gallup's Q12 research on engagement
- Job Demands-Resources Model
- Engagement drivers and barriers
- Intervention strategies

Your task is to provide theoretical context and frameworks for understanding engagement patterns and drivers.`;
  }

  protected getDataSystemPrompt(): string {
    return `You are the Data Engine for Mizan's Engagement Agent. Your role is to process and analyze engagement data to identify factors, drivers, and barriers.

Analyze the engagement score in context of:
1. Employee's personal values (what matters to them)
2. Current experience values (what they're experiencing)
3. Desired experience values (what they want)
4. Engagement score (1-5 scale)

Identify:
- Engagement factors (what's influencing their engagement)
- Engagement drivers (what could increase engagement)
- Engagement barriers (what's preventing full engagement)
- Correlations (how engagement relates to values and culture gaps)
- Risk factors (low engagement warning signs)

Be data-driven and evidence-based in your analysis.`;
  }

  protected getReasoningSystemPrompt(): string {
    return `You are the Reasoning Engine for Mizan's Engagement Agent. Your role is to synthesize knowledge and data to provide actionable insights and recommendations.

Generate:
1. Clear interpretation of engagement score
2. Identified engagement factors and their implications
3. Key engagement drivers (what would help)
4. Engagement barriers (what's preventing it)
5. Correlations with values and culture
6. Actionable recommendations
7. Risk factors if engagement is low

Be specific, actionable, and empathetic. Focus on what leaders and employees can DO to improve engagement.`;
  }

  protected buildKnowledgePrompt(inputData: Record<string, unknown>, frameworks: Record<string, unknown>): string {
    const isAggregated = inputData.aggregated || false;

    if (isAggregated) {
      const avgScore = typeof inputData.averageScore === 'number' ? inputData.averageScore : 0;
      return `Provide engagement theory context for organizational analysis:

Average Engagement Score: ${avgScore.toFixed(2)}/5.0
Score Distribution: ${JSON.stringify(inputData.distribution)}

Based on engagement theory and research, what does this organizational engagement pattern indicate?
What frameworks apply to understanding engagement at scale?
What are the implications for organizational performance and culture?`;
    }

    const personalValues = Array.isArray(inputData.personalValues) ? (inputData.personalValues as string[]) : [];
    const currentExperience = Array.isArray(inputData.currentExperience) ? (inputData.currentExperience as string[]) : [];
    const desiredExperience = Array.isArray(inputData.desiredExperience) ? (inputData.desiredExperience as string[]) : [];
    
    return `Provide engagement theory context for individual analysis:

Engagement Score: ${inputData.score}/5.0
Personal Values: ${personalValues.join(', ')}
Current Experience: ${currentExperience.join(', ')}
Desired Experience: ${desiredExperience.join(', ')}

Based on engagement theory, what does a score of ${inputData.score}/5 indicate?
How might this employee's values influence their engagement?
What engagement theories are most relevant here?`;
  }

  protected buildDataPrompt(processedData: Record<string, unknown>, knowledgeOutput: Record<string, unknown>): string {
    const isAggregated = processedData.aggregated || false;

    if (isAggregated) {
      const avgScore = typeof processedData.averageScore === 'number' ? processedData.averageScore : 0;
      const scores = Array.isArray(processedData.scores) ? processedData.scores : [];
      const allPersonalValues = Array.isArray(processedData.allPersonalValues) ? (processedData.allPersonalValues as string[]) : [];
      const allCurrentExperience = Array.isArray(processedData.allCurrentExperience) ? (processedData.allCurrentExperience as string[]) : [];
      const allDesiredExperience = Array.isArray(processedData.allDesiredExperience) ? (processedData.allDesiredExperience as string[]) : [];
      
      return `Analyze organizational engagement data:

Average Score: ${avgScore.toFixed(2)}/5.0
Distribution: ${JSON.stringify(processedData.distribution)}
Number of Employees: ${scores.length}

All Personal Values: ${allPersonalValues.slice(0, 20).join(', ')}
All Current Experience: ${allCurrentExperience.slice(0, 20).join(', ')}
All Desired Experience: ${allDesiredExperience.slice(0, 20).join(', ')}

Context from Knowledge Engine: ${JSON.stringify(knowledgeOutput)}

Identify:
1. Common engagement factors across the organization
2. Key engagement drivers at organizational level
3. Organizational barriers to engagement
4. Correlations between engagement scores and cultural values
5. Segments with low engagement (risk areas)

Return structured JSON with commonFactors, commonDrivers, organizationalBarriers, and correlations.`;
    }

    const personalValues = Array.isArray(processedData.personalValues) ? (processedData.personalValues as string[]) : [];
    const currentExperience = Array.isArray(processedData.currentExperience) ? (processedData.currentExperience as string[]) : [];
    const desiredExperience = Array.isArray(processedData.desiredExperience) ? (processedData.desiredExperience as string[]) : [];

    return `Analyze individual engagement data:

Engagement Score: ${processedData.score}/5.0
Personal Values: ${personalValues.join(', ')}
Current Experience: ${currentExperience.join(', ')}
Desired Experience: ${desiredExperience.join(', ')}

Context from Knowledge Engine: ${JSON.stringify(knowledgeOutput)}

Identify:
1. Engagement factors (what's influencing their engagement)
2. Engagement drivers (what could increase it)
3. Engagement barriers (what's preventing it)
4. Correlations with their values and culture gaps
5. Risk factors if score is low (≤2)

Return structured JSON with factors, drivers, barriers, correlations, and risks.`;
  }

  protected buildReasoningPrompt(inputData: Record<string, unknown>, knowledgeOutput: Record<string, unknown>, dataOutput: Record<string, unknown>): string {
    const isAggregated = inputData.aggregated || false;

    if (isAggregated) {
      const avgScore = typeof inputData.averageScore === 'number' ? inputData.averageScore : 0;
      return `Synthesize organizational engagement insights and provide actionable recommendations:

Data Analysis: ${JSON.stringify(dataOutput)}
Theoretical Context: ${JSON.stringify(knowledgeOutput)}
Average Score: ${avgScore.toFixed(2)}/5.0

Generate:
1. interpretation: Clear 2-3 paragraph interpretation of what organizational engagement scores mean
2. commonFactors: Array of common engagement factors across the organization
3. commonDrivers: Array of key engagement drivers at org level
4. organizationalBarriers: Array of barriers preventing full engagement
5. recommendations: Array of 5-7 specific, actionable recommendations for leadership
6. byDepartment: Array of department-level insights (if data available)

Return ONLY valid JSON with these exact fields. Be specific and actionable.`;
    }

    return `Synthesize individual engagement insights and provide recommendations:

Data Analysis: ${JSON.stringify(dataOutput)}
Theoretical Context: ${JSON.stringify(knowledgeOutput)}
Engagement Score: ${inputData.score}/5.0

Generate:
1. interpretation: Clear 2-3 paragraph interpretation of what their engagement score means
2. factors: Array of 3-5 engagement factors identified
3. drivers: Array of 3-5 key engagement drivers for this employee
4. barriers: Array of 2-4 engagement barriers (if any)
5. correlations: Object with:
   - withPersonalValues: How engagement relates to their values
   - withCultureGaps: How engagement relates to culture gaps
   - withDesiredExperience: How engagement relates to what they want
6. recommendations: Array of 4-6 specific, actionable recommendations
7. riskFactors: Array of risk factors if score is low (empty array if score ≥3)

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
        frameworks: 'Engagement theory applied',
        source: 'knowledge_engine'
      };
    }
  }

  protected parseDataOutput(response: string): Record<string, unknown> {
    try {
      return JSON.parse(response) as Record<string, unknown>;
    } catch (error) {
      console.error('Failed to parse Data Engine output:', error);
      return {
        factors: [],
        drivers: [],
        barriers: [],
        correlations: {},
        error: 'Failed to parse data output'
      };
    }
  }

  protected parseReasoningOutput(response: string): Record<string, unknown> {
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse Reasoning Engine output:', error);
      return {
        interpretation: 'Engagement analysis completed but formatting error occurred.',
        factors: [],
        drivers: [],
        barriers: [],
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

