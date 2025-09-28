import { ThreeEngineAgent, ThreeEngineConfig } from './base/three-engine-agent.js';
import { db } from '../../db/index.js';
import { organizationStructure, companyStrategies } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export interface StructureAnalysisInput {
  tenantId: string;
  structureId?: string;
  strategyId?: string;
}

export interface StructureAnalysisOutput {
  overallScore: number;
  spanAnalysis: {
    average: number;
    distribution: { [span: string]: number };
    outliers: Array<{
      role: string;
      span: number;
      recommendation: string;
    }>;
  };
  layerAnalysis: {
    totalLayers: number;
    averageLayersToBottom: number;
    bottlenecks: Array<{
      layer: number;
      roles: string[];
      issue: string;
    }>;
  };
  strategyAlignment: {
    score: number;
    misalignments: Array<{
      area: string;
      issue: string;
      impact: 'high' | 'medium' | 'low';
    }>;
  };
  recommendations: Array<{
    category: 'span' | 'layers' | 'alignment' | 'efficiency';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    actionItems: string[];
  }>;
}

export class StructureAgent extends ThreeEngineAgent {
  constructor() {
    const config: ThreeEngineConfig = {
      knowledge: {
        providers: ['openai', 'anthropic'],
        model: 'gpt-4',
        temperature: 0.2,
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
        temperature: 0.4,
        maxTokens: 4000
      },
      consensusThreshold: 0.8
    };

    super('structure', config);
  }

  async analyzeOrganizationStructure(input: StructureAnalysisInput): Promise<StructureAnalysisOutput> {
    const result = await this.analyze(input);
    return result.finalOutput;
  }

  protected async loadFrameworks(): Promise<any> {
    return {
      galbraithStar: {
        name: 'Galbraith Star Model',
        dimensions: ['Strategy', 'Structure', 'Processes', 'Rewards', 'People'],
        description: 'Framework for organizational design alignment'
      },
      mckinsey7S: {
        name: 'McKinsey 7S Framework',
        elements: ['Strategy', 'Structure', 'Systems', 'Shared Values', 'Style', 'Staff', 'Skills'],
        description: 'Holistic model for organizational effectiveness'
      },
      mintzbergTypes: {
        name: 'Mintzberg Organizational Types',
        types: [
          'Simple Structure',
          'Machine Bureaucracy',
          'Professional Bureaucracy',
          'Divisionalized Form',
          'Adhocracy'
        ]
      },
      spanGuidelines: {
        executive: { min: 3, max: 7, optimal: 5 },
        management: { min: 5, max: 12, optimal: 8 },
        operational: { min: 8, max: 20, optimal: 12 }
      },
      layerGuidelines: {
        small: { maxLayers: 4, employees: '<100' },
        medium: { maxLayers: 6, employees: '100-1000' },
        large: { maxLayers: 8, employees: '1000-10000' },
        enterprise: { maxLayers: 10, employees: '>10000' }
      }
    };
  }

  protected async processData(inputData: StructureAnalysisInput): Promise<any> {
    // Get organization structure
    const structure = await db
      .select()
      .from(organizationStructure)
      .where(eq(organizationStructure.tenantId, inputData.tenantId))
      .orderBy(organizationStructure.createdAt)
      .limit(1);

    // Get company strategy
    const strategy = await db
      .select()
      .from(companyStrategies)
      .where(eq(companyStrategies.tenantId, inputData.tenantId))
      .where(eq(companyStrategies.status, 'active'))
      .limit(1);

    if (structure.length === 0) {
      throw new Error('No organization structure found for tenant');
    }

    const structureData = structure[0].structureData as any;
    const strategyData = strategy.length > 0 ? strategy[0] : null;

    return {
      structure: this.analyzeStructureData(structureData),
      strategy: strategyData ? {
        objectives: strategyData.objectives,
        requiredSkills: strategyData.requiredSkills,
        targetValues: strategyData.targetValues,
        timeframe: strategyData.timeframe
      } : null,
      metadata: {
        structureId: structure[0].id,
        lastUpdated: structure[0].createdAt,
        strategyId: strategyData?.id
      }
    };
  }

  protected getKnowledgeSystemPrompt(): string {
    return `You are the Knowledge Engine for Mizan's Structure Agent. Your role is to apply organizational design frameworks to understand optimal structure patterns.

Key frameworks to consider:
1. Galbraith Star Model - Strategy-Structure alignment
2. McKinsey 7S Framework - Holistic organizational effectiveness
3. Mintzberg's Organizational Types - Structural archetypes
4. Span of Control principles - Optimal management ratios
5. Organizational Layer theory - Hierarchy optimization

Your output should be structured JSON containing:
- applicable_frameworks: Most relevant frameworks for this analysis
- design_principles: Key organizational design principles
- optimal_patterns: What constitutes effective structure
- alignment_factors: How structure should align with strategy

Focus on evidence-based organizational design theory.`;
  }

  protected getDataSystemPrompt(): string {
    return `You are the Data Engine for Mizan's Structure Agent. Your role is to analyze organizational structure data and identify patterns.

You will receive:
- Organizational chart data (roles, reporting relationships, levels)
- Span of control metrics
- Layer analysis
- Strategy information (if available)

Your output should be structured JSON containing:
- structure_metrics: Key structural measurements
- span_analysis: Span of control patterns and outliers
- layer_analysis: Hierarchical layer insights
- bottleneck_identification: Structural bottlenecks
- efficiency_metrics: Structural efficiency indicators

Focus on quantitative analysis and pattern identification.`;
  }

  protected getReasoningSystemPrompt(): string {
    return `You are the Reasoning Engine for Mizan's Structure Agent. Your role is to synthesize organizational design theory with structural data to provide actionable recommendations.

You will receive:
- Organizational design framework insights
- Structural data analysis
- Strategy context (if available)

Your output should be structured JSON containing:
- overall_score: Overall structural health score (0-100)
- span_analysis: Detailed span of control assessment
- layer_analysis: Hierarchical structure assessment
- strategy_alignment: How well structure supports strategy
- recommendations: Prioritized structural improvements

Connect theory with data to provide clear, actionable insights.`;
  }

  protected buildKnowledgePrompt(inputData: StructureAnalysisInput, frameworks: any): string {
    return `Analyze the organizational design context:

Analysis Type: Organization Structure Analysis
Tenant ID: ${inputData.tenantId}

Available Frameworks:
${JSON.stringify(frameworks, null, 2)}

Please identify which organizational design frameworks are most applicable and provide theoretical guidance for analyzing this organization's structure. Consider optimal span of control, layer efficiency, and strategy-structure alignment principles.

What design principles should guide this structural analysis?`;
  }

  protected buildDataPrompt(processedData: any, knowledgeOutput: any): string {
    return `Analyze this organizational structure data:

Structure Data:
${JSON.stringify(processedData, null, 2)}

Framework Context:
${JSON.stringify(knowledgeOutput, null, 2)}

Please analyze for:
1. Span of control patterns and outliers
2. Hierarchical layer efficiency
3. Structural bottlenecks and inefficiencies
4. Strategy-structure alignment (if strategy provided)
5. Overall structural health indicators

Provide quantitative metrics and identify specific issues.`;
  }

  protected buildReasoningPrompt(inputData: StructureAnalysisInput, knowledgeOutput: any, dataOutput: any): string {
    return `Synthesize organizational design theory with structural analysis:

Input Context:
${JSON.stringify(inputData, null, 2)}

Design Theory:
${JSON.stringify(knowledgeOutput, null, 2)}

Structure Analysis:
${JSON.stringify(dataOutput, null, 2)}

Please provide:
1. Overall structural health score with reasoning
2. Detailed span of control assessment with recommendations
3. Layer analysis with efficiency improvements
4. Strategy alignment assessment (if applicable)
5. Prioritized recommendations for structural optimization

Ensure recommendations are practical and theory-based.`;
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

  private analyzeStructureData(structureData: any): any {
    // Process org chart data to extract metrics
    const roles = this.extractRoles(structureData);
    const spanMetrics = this.calculateSpanMetrics(roles);
    const layerMetrics = this.calculateLayerMetrics(roles);

    return {
      totalRoles: roles.length,
      spanMetrics,
      layerMetrics,
      roles: roles.map(role => ({
        id: role.id,
        title: role.title,
        level: role.level,
        directReports: role.directReports?.length || 0,
        reportsTo: role.reportsTo
      }))
    };
  }

  private extractRoles(structureData: any): any[] {
    // Extract roles from org chart structure
    // This would depend on the actual structure format
    if (Array.isArray(structureData)) {
      return structureData;
    }
    
    if (structureData.roles) {
      return structureData.roles;
    }

    // Default structure
    return [];
  }

  private calculateSpanMetrics(roles: any[]): any {
    const spans = roles.map(role => role.directReports?.length || 0);
    const nonZeroSpans = spans.filter(span => span > 0);
    
    if (nonZeroSpans.length === 0) {
      return { average: 0, distribution: {}, outliers: [] };
    }

    const average = nonZeroSpans.reduce((sum, span) => sum + span, 0) / nonZeroSpans.length;
    const distribution: { [key: string]: number } = {};
    
    spans.forEach(span => {
      distribution[span.toString()] = (distribution[span.toString()] || 0) + 1;
    });

    const outliers = roles.filter(role => {
      const span = role.directReports?.length || 0;
      return span > 15 || (span > 0 && span < 3); // Potential outliers
    });

    return { average, distribution, outliers };
  }

  private calculateLayerMetrics(roles: any[]): any {
    const levels = roles.map(role => role.level || 0);
    const maxLevel = Math.max(...levels);
    const minLevel = Math.min(...levels);
    
    return {
      totalLayers: maxLevel - minLevel + 1,
      maxLevel,
      minLevel,
      averageLevel: levels.reduce((sum, level) => sum + level, 0) / levels.length
    };
  }
}

// Export convenience function for backward compatibility
export async function analyzeStructure(input: StructureAnalysisInput): Promise<StructureAnalysisOutput> {
  const agent = new StructureAgent({
    knowledgeEngine: { provider: 'openai', model: 'gpt-4' },
    dataEngine: { provider: 'openai', model: 'gpt-4' },
    reasoningEngine: { provider: 'openai', model: 'gpt-4' }
  });
  
  return await agent.analyze(input);
}
