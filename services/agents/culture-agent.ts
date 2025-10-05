import { ThreeEngineAgent, ThreeEngineConfig, AnalysisResult } from './base/three-engine-agent.js';
import { db } from '../../db/index.js';
import { cultureFrameworks, cultureAssessments, cultureReports } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export interface CultureAnalysisInput {
  tenantId: string;
  targetType: 'individual' | 'department' | 'company';
  targetId?: string;
  assessmentIds?: string[];
}

export interface CultureAnalysisOutput {
  entropyScore: number;
  cylinderHealth: {
    [cylinderId: number]: {
      status: 'healthy' | 'moderate' | 'unhealthy' | 'missing';
      enablingRatio: number;
      limitingRatio: number;
      dominantValues: string[];
    };
  };
  valueGaps: {
    personalVsCompany: Array<{
      value: string;
      personalScore: number;
      companyScore: number;
      gap: number;
    }>;
    currentVsDesired: Array<{
      value: string;
      currentScore: number;
      desiredScore: number;
      gap: number;
    }>;
  };
  recommendations: Array<{
    category: string;
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    actionItems: string[];
    expectedImpact: string;
  }>;
  triggers: Array<{
    type: 'lxp' | 'alert' | 'intervention';
    condition: string;
    action: any;
    priority: 'critical' | 'high' | 'medium' | 'low';
  }>;
}

export class CultureAgent extends ThreeEngineAgent {
  constructor() {
    const config: ThreeEngineConfig = {
      knowledge: {
        providers: ['openai', 'anthropic'],
        model: 'gpt-4',
        temperature: 0.3,
        maxTokens: 2000
      },
      data: {
        providers: ['openai', 'anthropic'],
        model: 'gpt-4',
        temperature: 0.1,
        maxTokens: 3000
      },
      reasoning: {
        providers: ['openai', 'anthropic'],
        model: 'gpt-4',
        temperature: 0.5,
        maxTokens: 4000
      },
      consensusThreshold: 0.7
    };

    super('culture', config);
  }

  async analyzeCompanyCulture(input: CultureAnalysisInput): Promise<CultureAnalysisOutput> {
    const result = await this.analyze(input);
    
    // Store analysis in database
    await this.storeAnalysis(input, result);
    
    return result.finalOutput;
  }

  protected async loadFrameworks(): Promise<any> {
    const frameworks = await db
      .select()
      .from(cultureFrameworks);

    return {
      mizanFramework: frameworks.find(f => f.frameworkName === 'Mizan 7-Cylinder'),
      odModels: frameworks.filter(f => f.frameworkName !== 'Mizan 7-Cylinder'),
      cylinders: {
        1: {
          name: 'Safety & Survival',
          ethicalPrinciple: 'Preservation of Life',
          definition: 'Protecting life and dignity by ensuring health, stability, and freedom from harm.',
          enablingValues: ['Safety', 'Stability', 'Preparedness', 'Wellbeing'],
          limitingValues: ['Fear', 'Neglect', 'Instability', 'Complacency']
        },
        2: {
          name: 'Belonging & Loyalty',
          ethicalPrinciple: 'Human Dignity',
          definition: 'Honoring the worth of every individual and fostering unity through loyalty and respect.',
          enablingValues: ['Belonging', 'Dignity', 'Loyalty', 'Respect'],
          limitingValues: ['Exclusion', 'Humiliation', 'Tribalism', 'Disrespect']
        },
        3: {
          name: 'Growth & Achievement',
          ethicalPrinciple: 'Striving with Excellence',
          definition: 'Pursuing progress through discipline, accountability, and continuous learning.',
          enablingValues: ['Achievement', 'Discipline', 'Accountability', 'Learning'],
          limitingValues: ['Stagnation', 'Negligence', 'Blame-shifting', 'Arrogance']
        },
        4: {
          name: 'Meaning & Contribution',
          ethicalPrinciple: 'Service',
          definition: 'Creating purpose by contributing to a cause greater than oneself.',
          enablingValues: ['Purpose', 'Contribution', 'Service', 'Generosity'],
          limitingValues: ['Apathy', 'Self-centeredness', 'Exploitation', 'Greed']
        },
        5: {
          name: 'Integrity & Justice',
          ethicalPrinciple: 'Justice and Accountability',
          definition: 'Upholding fairness, honesty, and moral courage in all actions.',
          enablingValues: ['Integrity', 'Fairness', 'Transparency', 'Courage'],
          limitingValues: ['Dishonesty', 'Favoritism', 'Secrecy', 'Cowardice']
        },
        6: {
          name: 'Wisdom & Compassion',
          ethicalPrinciple: 'Mercy and Knowledge',
          definition: 'Balancing reason with empathy to make thoughtful, kind decisions.',
          enablingValues: ['Wisdom', 'Empathy', 'Patience', 'Humility'],
          limitingValues: ['Ignorance', 'Cruelty', 'Impatience', 'Pride']
        },
        7: {
          name: 'Transcendence & Unity',
          ethicalPrinciple: 'Unity of Being',
          definition: 'Connecting the material with the spiritual to achieve harmony and purpose.',
          enablingValues: ['Unity', 'Harmony', 'Transcendence', 'Balance'],
          limitingValues: ['Division', 'Discord', 'Materialism', 'Imbalance']
        }
      }
    };
  }

  protected async processData(inputData: CultureAnalysisInput): Promise<any> {
    const assessments = await db
      .select()
      .from(cultureAssessments)
      .where(eq(cultureAssessments.tenantId, inputData.tenantId));

    const processedData = {
      totalAssessments: assessments.length,
      personalValues: this.aggregateValues(assessments.map(a => a.personalValues)),
      currentExperience: this.aggregateValues(assessments.map(a => a.currentExperience)),
      desiredFuture: this.aggregateValues(assessments.map(a => a.desiredExperience)),
      engagementStats: {
        average: assessments.reduce((sum, a) => sum + (a.engagement || 0), 0) / assessments.length,
        distribution: this.calculateDistribution(assessments.map(a => a.engagement || 0))
      },
      recognitionStats: {
        average: assessments.reduce((sum, a) => sum + (a.recognition || 0), 0) / assessments.length,
        distribution: this.calculateDistribution(assessments.map(a => a.recognition || 0))
      }
    };

    return processedData;
  }

  protected getKnowledgeSystemPrompt(): string {
    return `You are the Knowledge Engine for Mizan's Culture Agent. Your role is to apply organizational development frameworks and cultural models to understand the context and provide theoretical grounding.

Key frameworks to consider:
1. Mizan 7-Cylinder Framework - A values-based progressive cultural maturity system:
   - Cylinder 1: Safety & Survival (Preservation of Life)
   - Cylinder 2: Belonging & Loyalty (Human Dignity)
   - Cylinder 3: Growth & Achievement (Striving with Excellence)
   - Cylinder 4: Meaning & Contribution (Service)
   - Cylinder 5: Integrity & Justice (Justice and Accountability)
   - Cylinder 6: Wisdom & Compassion (Mercy and Knowledge)
   - Cylinder 7: Transcendence & Unity (Unity of Being)

   Each cylinder has enabling values (that elevate culture) and limiting values (that constrain culture).
   Organizations develop through cylinders sequentially - cannot skip levels.

2. Schein's Organizational Culture Model
3. Hofstede's Cultural Dimensions
4. Denison Organizational Culture Model
5. Cameron & Quinn's Competing Values Framework

Your output should be structured JSON containing:
- applicable_frameworks: Which frameworks are most relevant
- theoretical_context: Key theoretical insights
- cultural_dimensions: Relevant cultural dimensions to analyze
- success_factors: What constitutes healthy culture based on frameworks

Focus on theoretical grounding and expert knowledge. Be precise and evidence-based.`;
  }

  protected getDataSystemPrompt(): string {
    return `You are the Data Engine for Mizan's Culture Agent. Your role is to process and analyze tenant-specific cultural assessment data.

You will receive:
- Employee assessment responses (personal values, current experience, desired future)
- Engagement and recognition levels
- Aggregated statistics

Your output should be structured JSON containing:
- data_quality: Assessment of data completeness and reliability
- value_patterns: Patterns in value selections
- engagement_insights: Key insights from engagement data
- gaps_identified: Specific gaps between current and desired states
- statistical_summary: Key metrics and distributions

Focus on data-driven insights. Be objective and quantitative where possible.`;
  }

  protected getReasoningSystemPrompt(): string {
    return `You are the Reasoning Engine for Mizan's Culture Agent. Your role is to synthesize knowledge frameworks with data insights to produce actionable recommendations.

You will receive:
- Theoretical framework insights from the Knowledge Engine
- Data analysis results from the Data Engine
- Original input context

Your output should be structured JSON containing:
- entropy_score: Cultural entropy score (0-100, higher = more limiting values)
- cylinder_health: Health status for each of the 7 cylinders
- value_gaps: Specific gaps between personal/company and current/desired values
- recommendations: Prioritized action recommendations
- triggers: Specific triggers for LXP, alerts, or interventions

Focus on actionable insights that connect theory with data. Provide clear reasoning for all recommendations.`;
  }

  protected buildKnowledgePrompt(inputData: CultureAnalysisInput, frameworks: any): string {
    return `Analyze the cultural context for this organization:

Target Analysis: ${inputData.targetType} level analysis
Tenant ID: ${inputData.tenantId}

Available Frameworks:
${JSON.stringify(frameworks, null, 2)}

Please identify which frameworks are most applicable and provide theoretical context for analyzing this organization's culture. Consider the 7-cylinder framework as the primary model, supplemented by other OD frameworks.

What theoretical insights should guide the analysis of this cultural data?`;
  }

  protected buildDataPrompt(processedData: any, knowledgeOutput: any): string {
    return `Analyze this cultural assessment data:

Processed Data:
${JSON.stringify(processedData, null, 2)}

Theoretical Context:
${JSON.stringify(knowledgeOutput, null, 2)}

Please analyze the data for patterns, gaps, and insights. Focus on:
1. Value distribution patterns across cylinders
2. Gaps between personal values and current experience
3. Gaps between current experience and desired future
4. Engagement and recognition patterns
5. Data quality and reliability

Provide quantitative insights where possible.`;
  }

  protected buildReasoningPrompt(inputData: CultureAnalysisInput, knowledgeOutput: any, dataOutput: any): string {
    return `Synthesize the theoretical knowledge and data insights to produce actionable cultural analysis:

Input Context:
${JSON.stringify(inputData, null, 2)}

Knowledge Insights:
${JSON.stringify(knowledgeOutput, null, 2)}

Data Analysis:
${JSON.stringify(dataOutput, null, 2)}

Please provide:
1. Cultural entropy score calculation
2. Health assessment for each cylinder
3. Specific value gaps with impact analysis
4. Prioritized recommendations with clear action items
5. Triggers for automated interventions

Ensure all recommendations are grounded in both theory and data.`;
  }

  protected parseKnowledgeOutput(response: string): any {
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse knowledge output:', error);
      return { error: 'Failed to parse knowledge output' };
    }
  }

  protected parseDataOutput(response: string): any {
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse data output:', error);
      return { error: 'Failed to parse data output' };
    }
  }

  protected parseReasoningOutput(response: string): any {
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse reasoning output:', error);
      return { error: 'Failed to parse reasoning output' };
    }
  }

  private aggregateValues(valueArrays: any[]): any {
    const aggregated: { [key: string]: number } = {};
    
    valueArrays.forEach(values => {
      if (values && typeof values === 'object') {
        Object.entries(values).forEach(([value, score]) => {
          aggregated[value] = (aggregated[value] || 0) + (score as number);
        });
      }
    });

    return aggregated;
  }

  private calculateDistribution(values: number[]): { [key: number]: number } {
    const distribution: { [key: number]: number } = {};
    values.forEach(value => {
      distribution[value] = (distribution[value] || 0) + 1;
    });
    return distribution;
  }

  private async storeAnalysis(input: CultureAnalysisInput, result: AnalysisResult): Promise<void> {
    await db.insert(cultureReports).values({
      tenantId: input.tenantId,
      reportType: input.targetType,
      reportData: {
        targetId: input.targetId || null,
        entropyScore: result.finalOutput.entropy_score?.toString(),
        cylinderHealth: result.finalOutput.cylinder_health,
        valueGaps: result.finalOutput.value_gaps,
        recommendations: result.finalOutput.recommendations,
        triggers: result.finalOutput.triggers,
        generatedBy: 'culture_agent'
      }
    });
  }
}

// Export convenience function for backward compatibility
export async function analyzeCulture(input: any): Promise<any> {
  const agent = new CultureAgent();
  return await agent.analyzeCompanyCulture(input);
}
