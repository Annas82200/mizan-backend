import { ThreeEngineAgent, ThreeEngineConfig } from './base/three-engine-agent';
import { db } from '../../../db/index';
import { organizationStructure, companyStrategies } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { invokeProvider } from '../ai-providers/router';
import type {
  StructureData,
  StrategyData,
  ProcessedStructureData,
  OrganizationalFramework,
  Role,
  Department,
  ReportingLine,
  SpanMetrics,
  LayerMetrics
} from '../../types/structure-types';

export interface StructureAnalysisInput extends Record<string, unknown> {
  tenantId: string;
  structureId?: string;
  strategyId?: string;
}

export interface StructureAnalysisOutput {
  overallScore: number;
  overallHealthInterpretation?: string;
  humanImpact?: {
    interpretation?: string;
    employeeExperience?: string;
    culturalImpact?: string;
  };
  spanAnalysis: {
    average: number;
    distribution: { [span: string]: number };
    interpretation?: string;
    outliers: Array<{
      role: string;
      span: number;
      recommendation: string;
    }>;
  };
  layerAnalysis: {
    totalLayers: number;
    averageLayersToBottom: number;
    interpretation?: string;
    bottlenecks: Array<{
      layer: number;
      roles: string[];
      issue: string;
    }>;
  };
  strategyAlignment: {
    score: number;
    interpretation?: string;
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
        providers: ['openai', 'anthropic', 'gemini', 'mistral'],
        model: 'gpt-4',
        temperature: 0.2,
        maxTokens: 2000
      },
      data: {
        providers: ['openai', 'anthropic', 'gemini', 'mistral'],
        model: 'gpt-4',
        temperature: 0.1,
        maxTokens: 3000
      },
      reasoning: {
        providers: ['openai', 'anthropic', 'gemini', 'mistral'],
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
    return result.finalOutput as unknown as StructureAnalysisOutput;
  }

  /**
   * Generate rich, human, contextual structure analysis using AI
   * Similar to Culture Agent's analyzeIndividualEmployee - tells a story, not just data
   * @param useFastMode - If true, uses single fast provider (Gemini) instead of 4-provider consensus
   */
  async generateRichStructureAnalysis(input: {
    tenantId: string;
    companyName: string;
    structureData: StructureData;
    strategyData?: StrategyData;
    useFastMode?: boolean;
  }): Promise<StructureAnalysisOutput> {
    const prompt = `You are an organizational design expert helping a CEO understand if their structure will help them achieve their strategy. Write like you're sitting across from them having a frank conversation - professional but human, insightful but not academic.

COMPANY: ${input.companyName}

STRUCTURE DATA:
${JSON.stringify(input.structureData, null, 2)}

${input.strategyData ? `COMPANY STRATEGY:
${JSON.stringify(input.strategyData, null, 2)}` : ''}

CRITICAL: ONLY analyze what you see in the actual data provided. Do NOT make assumptions about information that is not present in the structure data or strategy data. If data is missing, acknowledge the limitation rather than assuming details.

TONE & LANGUAGE:
- Write like you're talking TO the CEO, not writing a textbook
- Use "you" and "your" (e.g., "Your structure has 7 layers, which means...")
- Replace jargon with plain language:
  ❌ "Implement hierarchical optimization"
  ✅ "Remove a management layer to speed up decisions"
  ❌ "Enhance cross-functional coordination mechanisms"
  ✅ "Create direct lines between teams that need to work together"
  ❌ "Optimize span of control ratios"
  ✅ "Reduce how many people report to your managers so they can actually coach"
- Keep it conversational but insightful

Provide a comprehensive analysis following this structure. IMPORTANT: Keep each interpretation to 4-6 sentences maximum. Tell a STORY about what this structure means:

1. OVERALL STRUCTURAL HEALTH (4-6 sentences)
Paint a picture of this organization's structure. What does it feel like to work here based on the structure? How does information flow? How empowered are employees? Don't just say "7 layers" - explain what that MEANS for decision-making speed, employee autonomy, and organizational agility.

2. SPAN OF CONTROL REALITY (4-6 sentences)
Describe what the span of control patterns reveal about management capacity and employee support. If managers have 15 direct reports, what does that MEAN for their daily reality? Can they actually coach and develop people? If spans are too narrow (2-3 reports), what does that mean for organizational efficiency and employee empowerment?

3. HIERARCHICAL LAYERS IMPACT (4-6 sentences)
Explain what the layer structure means for the business. How does this affect decision-making? Employee engagement? Speed of execution? Does the structure enable or hinder the strategy? If there are bottlenecks, describe the ACTUAL BUSINESS IMPACT (not just "bottleneck detected").

4. STRATEGY-STRUCTURE ALIGNMENT (4-6 sentences, if strategy provided)
Tell the story of whether the structure supports or undermines the strategic goals. Be specific about WHERE the misalignment exists and WHY it matters. What will happen if this isn't fixed?

5. HUMAN IMPACT (4-6 sentences)
What does this structure mean for the people working here? Are employees set up for success? Are managers overwhelmed? Are there career growth paths? Is innovation encouraged or stifled by the structure?

6. RECOMMENDATIONS (PLAIN LANGUAGE!)
Your recommendations must answer: "What does the organization need to do to achieve the strategy?"

LANGUAGE RULES FOR RECOMMENDATIONS:
- Write like you're advising a friend, not writing a consulting report
- Use action verbs: "Remove the layer between X and Y" not "Optimize hierarchical structures"
- Be specific: "Split Sarah's 15 reports into two teams" not "Reduce span of control"
- Make it visual: Help them SEE the change (e.g., "Right now decisions go through 4 people. Cut that to 2.")
- Examples of GOOD vs BAD language:
  ❌ "Implement a flatter organizational paradigm"
  ✅ "Remove one management layer so your team leads can make decisions without waiting for approval"
  ❌ "Enhance structural alignment with strategic imperatives"
  ✅ "Your strategy needs speed, but your 6 layers slow everything down. Cut to 4."
  ❌ "Establish cross-functional coordination mechanisms"
  ✅ "Have your product and sales teams report to the same person so they stop working in silos"

CRITICAL: Base recommendations ONLY on:
- The actual organizational structure provided (reporting relationships, layers, spans)
- The stated strategy/vision/mission provided
- Observable structural patterns (bottlenecks, spans, layers)
Do NOT assume or recommend based on:
- Cross-functional collaboration (unless visible in structure data)
- Team dynamics or culture (not part of structure data)
- Skills or capabilities (not provided in structure data)
- Any other factors not explicitly present in the data

Return ONLY a valid JSON object with NO markdown formatting:
{
  "overallScore": number (0-100),
  "overallHealthInterpretation": "4-6 sentence warm, contextual interpretation",
  "spanAnalysis": {
    "average": number,
    "distribution": {},
    "outliers": [],
    "interpretation": "4-6 sentence story about what span patterns mean for managers and employees"
  },
  "layerAnalysis": {
    "totalLayers": number,
    "averageLayersToBottom": number,
    "bottlenecks": [],
    "interpretation": "4-6 sentence story about what the layer structure means for the business"
  },
  "strategyAlignment": {
    "score": number (0-100),
    "misalignments": [],
    "interpretation": "4-6 sentence story about how structure helps or hinders strategy"
  },
  "humanImpact": {
    "interpretation": "4-6 sentence story about what this means for people",
    "strengths": ["string"],
    "challenges": ["string"]
  },
  "recommendations": [
    {
      "category": "span|layers|alignment|efficiency",
      "priority": "high|medium|low",
      "title": "string",
      "description": "4-6 sentence explanation focused on: What does the organization need to do to achieve the strategy? Base this ONLY on the actual structure and strategy data provided - do NOT assume information about cross-functional collaboration, culture, or other factors not present in the data.",
      "actionItems": ["string"],
      "expectedImpact": "How this structural change will help achieve the stated strategy",
      "timeframe": "string"
    }
  ]
}`;

    // Call AI - use fast mode (single Gemini call) or full consensus mode
    let response;
    if (input.useFastMode) {
      // Fast mode: Single Gemini call (~3-5 seconds) for public page
      const geminiResponse = await invokeProvider('gemini', {
        prompt,
        model: 'gemini-2.5-flash',
        temperature: 0.7,
        maxTokens: 8000
      });
      response = { narrative: geminiResponse.response };
    } else {
      // Full mode: 4-provider consensus (~30+ seconds) for authenticated users
      response = await this.reasoningAI.call({
        agent: 'structure',
        engine: 'reasoning',
        prompt,
        temperature: 0.7,
        maxTokens: 8000
      });
    }

    // Parse JSON with fallback handling
    try {
      let jsonText = response.narrative;
      // Remove markdown code blocks if present
      if (typeof jsonText === 'string') {
        jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      }
      const analysis = JSON.parse(typeof jsonText === 'string' ? jsonText : JSON.stringify(jsonText));
      return analysis;
    } catch (error) {
      console.error('Failed to parse structure analysis:', error);
      console.error('Raw response:', typeof response.narrative === 'string' ? response.narrative.substring(0, 500) : 'Not a string');
      // Return structured fallback
      return {
        overallScore: 50,
        overallHealthInterpretation: 'Analysis in progress. We are evaluating your organizational structure to provide comprehensive insights.',
        spanAnalysis: {
          average: 0,
          distribution: {},
          outliers: [],
          interpretation: 'Span of control analysis is being processed.'
        },
        layerAnalysis: {
          totalLayers: 0,
          averageLayersToBottom: 0,
          bottlenecks: [],
          interpretation: 'Hierarchical layer analysis is being processed.'
        },
        strategyAlignment: {
          score: 0,
          misalignments: [],
          interpretation: 'Strategy-structure alignment analysis is being processed.'
        },
        humanImpact: {
          interpretation: 'Human impact analysis is being processed.',
          employeeExperience: 'Employee experience analysis pending.',
          culturalImpact: 'Cultural impact analysis pending.'
        },
        recommendations: []
      };
    }
  }

  protected async loadFrameworks(): Promise<OrganizationalFramework> {
    return {
      // PRIMARY: Strategy-Structure Alignment Frameworks
      galbraithStar: {
        name: 'Galbraith Star Model',
        dimensions: ['Strategy', 'Structure', 'Processes', 'Rewards', 'People'],
        principle: 'Structure must follow strategy. All 5 dimensions must align.',
        application: 'If strategy requires speed/innovation → flat structure. If strategy requires efficiency/scale → more hierarchy.'
      },
      chandlerPrinciple: {
        name: "Chandler's Strategy-Structure Thesis",
        principle: 'Structure follows strategy',
        guidance: 'When strategy changes (growth, diversification, innovation), structure must adapt or performance suffers.',
        structuralChoices: {
          functionalStrategy: 'Centralized, functional structure (Finance, Ops, Sales)',
          productDiversification: 'Divisional structure (by product line or geography)',
          innovationStrategy: 'Matrix or flat structure with cross-functional teams',
          efficiencyStrategy: 'Hierarchical with clear reporting lines'
        }
      },
      milesSnow: {
        name: 'Miles & Snow Strategic Types',
        types: {
          defender: {
            strategy: 'Efficiency, stability, narrow focus',
            idealStructure: 'Centralized, functional, hierarchical'
          },
          prospector: {
            strategy: 'Innovation, growth, new markets',
            idealStructure: 'Decentralized, flat, flexible teams'
          },
          analyzer: {
            strategy: 'Balance efficiency + innovation',
            idealStructure: 'Hybrid: functional core + flexible divisions'
          },
          reactor: {
            strategy: 'No clear strategy (warning sign)',
            idealStructure: 'Inconsistent, often misaligned'
          }
        }
      },

      // SECONDARY: Organizational Design Frameworks
      mckinsey7S: {
        name: 'McKinsey 7S Framework',
        elements: ['Strategy', 'Structure', 'Systems', 'Shared Values', 'Style', 'Staff', 'Skills'],
        principle: 'All 7 elements must align. Structure alone cannot fix misalignment.'
      },
      mintzbergTypes: {
        name: 'Mintzberg Organizational Configurations',
        types: {
          simpleStructure: 'Direct supervision, flat, entrepreneurial',
          machineBureaucracy: 'Standardized work, many rules, efficiency focus',
          professionalBureaucracy: 'Skilled workers, decentralized (hospitals, universities)',
          divisionalized: 'Semi-autonomous units, product/geographic divisions',
          adhocracy: 'Project-based, innovation focus, fluid teams'
        }
      },

      // TACTICAL: Span & Layer Guidelines
      spanGuidelines: {
        executive: { min: 3, max: 7, optimal: 5, rationale: 'Strategic oversight requires deep attention' },
        management: { min: 5, max: 12, optimal: 8, rationale: 'Balance coaching with coordination' },
        operational: { min: 8, max: 20, optimal: 12, rationale: 'Routine work allows wider spans' }
      },
      layerGuidelines: {
        principle: 'Each layer adds 2-3 days to decisions and dilutes strategy communication',
        small: { maxLayers: 4, employees: '<100', reason: 'Preserve agility and direct communication' },
        medium: { maxLayers: 6, employees: '100-1000', reason: 'Balance coordination needs with speed' },
        large: { maxLayers: 8, employees: '1000-10000', reason: 'Necessary complexity, manage carefully' },
        enterprise: { maxLayers: 10, employees: '>10000', reason: 'Unavoidable but requires active delayering' }
      },

      // Decision-Making Framework
      decisionRights: {
        principle: 'Clear decision rights prevent bottlenecks and enable strategy execution',
        push_down: 'Decisions should be made at lowest competent level',
        escalation: 'Only strategic/cross-unit decisions go up'
      }
    };
  }

  protected async processData(inputData: Record<string, unknown>): Promise<Record<string, unknown>> {
    const typedInput = inputData as StructureAnalysisInput;
    const tenantId = typedInput.tenantId;

    console.log('✅ Database connection established');
    console.log(`📊 Fetching organization structure for tenant: ${tenantId}`);

    // Get organization structure
    const structure = await db
      .select()
      .from(organizationStructure)
      .where(eq(organizationStructure.tenantId, tenantId))
      .orderBy(organizationStructure.createdAt)
      .limit(1);

    // Get company strategy
    const strategy = await db
      .select()
      .from(companyStrategies)
      .where(eq(companyStrategies.tenantId, tenantId))
      // .where(eq(companyStrategies.status, 'active'))
      .limit(1);

    // Enhanced error handling with detailed logging
    // Compliant with AGENT_CONTEXT_ULTIMATE.md - Complete error handling
    if (structure.length === 0) {
      console.error('❌ No organization structure found for tenant:', tenantId);
      console.error('💡 User action required: Upload an organization chart before running structure analysis');
      throw new Error('No organization structure found for tenant. Please upload an organization chart first.');
    }

    console.log(`✅ Organization structure found for tenant: ${tenantId}`);

    const rawStructureData = structure[0].structureData as Record<string, unknown>;

    // Convert the raw structure data to StructureData type
    const structureData: StructureData = {
      departments: (rawStructureData.departments as Department[]) || [],
      reportingLines: (rawStructureData.reportingLines as ReportingLine[]) || [],
      roles: (rawStructureData.roles as Role[]) || [],
      totalEmployees: (rawStructureData.totalEmployees as number) || 0,
      organizationLevels: (rawStructureData.organizationLevels as number) || 0
    };

    const strategyData = strategy.length > 0 ? strategy[0] : null;

    return {
      structure: this.analyzeStructureData(structureData),
      strategy: strategyData ? {
        objectives: strategyData.objectives,
        requiredSkills: (strategyData as Record<string, unknown>).requiredSkills,
        targetValues: (strategyData as Record<string, unknown>).targetValues,
        timeframe: (strategyData as Record<string, unknown>).timeframe
      } : null,
      metadata: {
        structureId: structure[0].id,
        lastUpdated: structure[0].createdAt,
        strategyId: strategyData?.id
      }
    };
  }

  protected getKnowledgeSystemPrompt(): string {
    return `You are the Knowledge Engine for Mizan's Structure Agent. Your role is to apply organizational design frameworks to understand if a company's structure will help them achieve their strategy.

CORE QUESTION: "Does this structure enable the strategy, or fight against it?"

Key frameworks to apply:
1. **Chandler's Principle** - "Structure follows strategy" (if strategy changes, structure must adapt)
2. **Galbraith Star Model** - All 5 dimensions (Strategy, Structure, Processes, Rewards, People) must align
3. **Miles & Snow Strategic Types** - Match structural form to strategic type:
   - Defender (efficiency) → Hierarchical, centralized
   - Prospector (innovation) → Flat, decentralized
   - Analyzer (balance) → Hybrid structure
4. **McKinsey 7S** - Structure alone cannot fix misalignment
5. **Mintzberg Configurations** - What structural archetype fits this strategy?
6. **Span & Layer Guidelines** - Tactical optimization for speed/coaching
7. **Decision Rights** - Who decides what? Push decisions down.

Your output should be structured JSON containing:
- applicable_frameworks: Which frameworks are most relevant for this strategy type?
- strategy_structure_fit: Does current structure match what this strategy needs?
- misalignment_risks: Where will structure prevent strategy execution?
- optimal_patterns: What structural pattern would enable this strategy?

Focus on: "Will this structure help them achieve their goals, or slow them down?"`;
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

  protected buildKnowledgePrompt(inputData: Record<string, unknown>, frameworks: Record<string, unknown>): string {
    return `Analyze the organizational design context:

Analysis Type: Organization Structure Analysis
Tenant ID: ${inputData.tenantId}

Available Frameworks:
${JSON.stringify(frameworks, null, 2)}

Please identify which organizational design frameworks are most applicable and provide theoretical guidance for analyzing this organization's structure. Consider optimal span of control, layer efficiency, and strategy-structure alignment principles.

What design principles should guide this structural analysis?`;
  }

  protected buildDataPrompt(processedData: Record<string, unknown>, knowledgeOutput: Record<string, unknown>): string {
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

  protected buildReasoningPrompt(inputData: Record<string, unknown>, knowledgeOutput: Record<string, unknown>, dataOutput: Record<string, unknown>): string {
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

  /**
   * Clean JSON response by removing markdown code blocks, extra formatting, and trailing text
   * Production-ready: Handles AI responses with explanatory text after JSON
   */
  private cleanJsonResponse(response: string): string {
    // Remove markdown code blocks (```json ... ``` or ``` ... ```)
    let cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    // Remove any leading/trailing whitespace
    cleaned = cleaned.trim();
    
    // Find the first '{' and last '}' to extract only JSON portion
    // This handles cases where AI adds explanatory text after the JSON
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
    
    return cleaned;
  }

  protected parseKnowledgeOutput(response: string): Record<string, unknown> {
    try {
      const cleaned = this.cleanJsonResponse(response);
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('Failed to parse knowledge output:', error);
      console.error('Raw response:', response);
      console.error('Cleaned response:', this.cleanJsonResponse(response));
      
      // Return structured error with default values instead of throwing
      // Compliant with AGENT_CONTEXT_ULTIMATE.md - Complete error handling
      return { 
        error: 'Failed to parse knowledge output',
        parseError: error instanceof Error ? error.message : 'Unknown error',
        applicable_frameworks: [],
        strategy_structure_fit: {},
        misalignment_risks: {},
        optimal_patterns: {}
      };
    }
  }

  protected parseDataOutput(response: string): Record<string, unknown> {
    try {
      const cleaned = this.cleanJsonResponse(response);
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('Failed to parse data output:', error);
      console.error('Raw response:', response);
      console.error('Cleaned response:', this.cleanJsonResponse(response));
      
      // Return structured error with default values instead of throwing
      // Compliant with AGENT_CONTEXT_ULTIMATE.md - Complete error handling
      return { 
        error: 'Failed to parse data output',
        parseError: error instanceof Error ? error.message : 'Unknown error',
        structure_metrics: {},
        span_analysis: {},
        layer_analysis: {},
        bottleneck_identification: [],
        efficiency_metrics: {}
      };
    }
  }

  protected parseReasoningOutput(response: string): Record<string, unknown> {
    try {
      const cleaned = this.cleanJsonResponse(response);
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('Failed to parse reasoning output:', error);
      console.error('Raw response:', response);
      console.error('Cleaned response:', this.cleanJsonResponse(response));
      
      // Return structured error with default values instead of throwing
      // Compliant with AGENT_CONTEXT_ULTIMATE.md - Complete error handling
      return { 
        error: 'Failed to parse reasoning output',
        parseError: error instanceof Error ? error.message : 'Unknown error',
        overall_score: 0,
        span_analysis: { average: 0, distribution: {}, outliers: [] },
        layer_analysis: { totalLayers: 0, averageLayersToBottom: 0, bottlenecks: [] },
        strategy_alignment: { score: 0, misalignments: [] },
        recommendations: []
      };
    }
  }

  private analyzeStructureData(structureData: StructureData): ProcessedStructureData['metrics'] {
    // Process org chart data to extract metrics
    const roles = this.extractRoles(structureData);
    const spanMetrics = this.calculateSpanMetrics(roles);
    const layerMetrics = this.calculateLayerMetrics(roles);

    return {
      spanMetrics,
      layerMetrics,
      alignmentMetrics: {
        strategyAlignmentScore: 0,
        structureEfficiencyScore: 0,
        communicationPathScore: 0
      }
    };
  }

  private extractRoles(structureData: StructureData): Role[] {
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

  private calculateSpanMetrics(roles: Role[]): SpanMetrics {
    const spans = roles.map(role => role.directReports?.length || 0);
    const nonZeroSpans = spans.filter(span => span > 0);

    if (nonZeroSpans.length === 0) {
      return {
        averageSpan: 0,
        maxSpan: 0,
        minSpan: 0,
        distribution: {},
        outliers: []
      };
    }

    const averageSpan = nonZeroSpans.reduce((sum, span) => sum + span, 0) / nonZeroSpans.length;
    const maxSpan = Math.max(...nonZeroSpans);
    const minSpan = Math.min(...nonZeroSpans);
    const distribution: Record<string, number> = {};

    spans.forEach(span => {
      distribution[span.toString()] = (distribution[span.toString()] || 0) + 1;
    });

    const outliers = roles
      .filter(role => {
        const span = role.directReports?.length || 0;
        return span > 15 || (span > 0 && span < 3); // Potential outliers
      })
      .map(role => ({
        roleId: role.id,
        span: role.directReports?.length || 0,
        recommendation: role.directReports && role.directReports.length > 15
          ? 'Consider splitting this role to reduce span of control'
          : 'Consider consolidating with other roles to increase efficiency'
      }));

    return { averageSpan, maxSpan, minSpan, distribution, outliers };
  }

  private calculateLayerMetrics(roles: Role[]): LayerMetrics {
    const levels = roles.map(role => role.level || 0);
    const maxLevel = Math.max(...levels);
    const minLevel = Math.min(...levels);

    // Calculate average layers to bottom for each role
    const layersToBottom = roles.map(role => maxLevel - (role.level || 0));
    const averageLayersToBottom = layersToBottom.reduce((sum, layers) => sum + layers, 0) / layersToBottom.length;

    // Identify bottlenecks (layers with too many or too few roles)
    const layerCounts = new Map<number, string[]>();
    roles.forEach(role => {
      const level = role.level || 0;
      if (!layerCounts.has(level)) {
        layerCounts.set(level, []);
      }
      layerCounts.get(level)!.push(role.id);
    });

    const bottlenecks: Array<{layer: number; roles: string[]; issue: string}> = [];
    layerCounts.forEach((roleIds, layer) => {
      if (roleIds.length === 1 && layer !== minLevel && layer !== maxLevel) {
        bottlenecks.push({
          layer,
          roles: roleIds,
          issue: 'Single point of failure - only one role at this level'
        });
      } else if (roleIds.length > 10) {
        bottlenecks.push({
          layer,
          roles: roleIds,
          issue: 'Too many roles at this level - consider restructuring'
        });
      }
    });

    return {
      totalLayers: maxLevel - minLevel + 1,
      averageLayersToBottom,
      bottlenecks
    };
  }
}

// Export convenience function for backward compatibility
export async function analyzeStructure(input: StructureAnalysisInput): Promise<StructureAnalysisOutput> {
  const agent = new StructureAgent();

  return await agent.analyzeOrganizationStructure(input);
}
