// server/services/agents/culture/culture-agent-refactored.ts
// ============================================================================
// CULTURE AGENT - THREE-ENGINE ARCHITECTURE (PRODUCTION-READY)
// ============================================================================
// PURPOSE: Analyzes organizational culture using Mizan 7-Cylinder Framework
// ARCHITECTURE: Three-Engine (Knowledge → Data → Reasoning)
// TRAINING: Organizational culture theories, Mizan framework, culture-strategy alignment
// ============================================================================

import { ThreeEngineAgent, ThreeEngineConfig } from '../base/three-engine-agent';
import { db } from '../../../db/index';
import { tenants, cultureReports, cylinderScores } from '../../../db/schema';
import { eq } from 'drizzle-orm';

// ============================================================================
// INTERFACES
// ============================================================================

interface MizanCylinder {
  level: number;
  name: string;
  definition: string;
  ethicalPrinciple: string;
  enablingValues: string[];
  limitingValues: string[];
}

export interface CultureAnalysisInput extends Record<string, unknown> {
  companyId: string;
  tenantId: string;
  companyValues: string[];
  strategy?: string;
  employeeAssessments?: Array<{
    employeeId: string;
    personalValues: string[];
    currentExperienceValues: string[];
    desiredFutureValues: string[];
    engagementLevel: number;
    recognitionLevel: number;
  }>;
}

export interface CultureAnalysisOutput {
  companyId: string;
  tenantId: string;
  analysisDate: Date;
  
  // Core analysis
  strategyAlignmentScore: number; // 0-100
  isHealthyForStrategy: boolean;
  
  // Value mapping
  valueMapping: {
    mappings: Array<{
      value: string;
      cylinder: number;
      type: 'enabling' | 'limiting';
      rationale: string;
      strength: number;
    }>;
    cylinderDistribution: Record<number, { enabling: number; limiting: number }>;
    dominantCylinders: number[];
    missingCylinders: number[];
  };
  
  // Strategy alignment
  strategyAlignment: {
    cultureFit: number;
    alignmentGaps: string[];
    accelerators: string[];
    blockers: string[];
    recommendations: string[];
  };
  
  // Cylinder health
  cylinderHealth: Record<number, {
    status: string;
    score: number;
    enabling?: number;
    limiting?: number;
  }>;
  
  // Employee culture gap (if assessments provided)
  employeeCultureGap: {
    alignmentScore: number;
    gaps: string[];
    insights: string[];
  } | null;
  
  // Entropy score
  entropyScore: number;
  
  // Recommendations
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  
  // Triggers for other modules
  triggers: Array<{
    type: string;
    priority: string;
    module: string;
    reason: string;
    cylinders?: number[];
  }>;
  
  // Metadata
  confidence: number;
  processingTime: number;
}

// ============================================================================
// CULTURE AGENT CLASS - THREE-ENGINE ARCHITECTURE
// ============================================================================

export class CultureAgentV2 extends ThreeEngineAgent {
  private mizanFramework: MizanCylinder[];

  constructor(agentType: string, config: ThreeEngineConfig) {
    super(agentType, config);
    this.mizanFramework = this.initializeMizanFramework();
  }

  /**
   * Initialize the Mizan 7-Cylinder Framework
   */
  private initializeMizanFramework(): MizanCylinder[] {
    return [
      {
        level: 1,
        name: 'Safety & Survival',
        definition: 'Protecting life and dignity by ensuring health, stability, and freedom from harm. Organizations grounded here safeguard people\'s wellbeing before all else.',
        ethicalPrinciple: 'Preservation of Life',
        enablingValues: ['Safety', 'Stability', 'Preparedness', 'Wellbeing'],
        limitingValues: ['Fear', 'Neglect', 'Instability', 'Complacency']
      },
      {
        level: 2,
        name: 'Belonging & Loyalty',
        definition: 'Fostering genuine connection, trust, and shared identity within teams and communities.',
        ethicalPrinciple: 'Human Dignity',
        enablingValues: ['Inclusion', 'Trust', 'Collaboration', 'Compassion'],
        limitingValues: ['Cliquishness', 'Bias', 'Distrust', 'Favoritism']
      },
      {
        level: 3,
        name: 'Growth & Achievement',
        definition: 'Encouraging learning, mastery, and performance that honor both excellence and humility.',
        ethicalPrinciple: 'Striving with Excellence',
        enablingValues: ['Discipline', 'Learning', 'Ambition', 'Accountability'],
        limitingValues: ['Ego', 'Burnout', 'Competition', 'Arrogance']
      },
      {
        level: 4,
        name: 'Meaning & Contribution',
        definition: 'Connecting personal and collective work to purpose and long-term impact.',
        ethicalPrinciple: 'Service',
        enablingValues: ['Purpose', 'Stewardship', 'Empowerment', 'Recognition'],
        limitingValues: ['Apathy', 'Self-interest', 'Cynicism', 'Disconnection']
      },
      {
        level: 5,
        name: 'Integrity & Justice',
        definition: 'Upholding truth, fairness, and ethical responsibility as the foundation of trust.',
        ethicalPrinciple: 'Justice and Accountability',
        enablingValues: ['Integrity', 'Fairness', 'Transparency', 'Courage'],
        limitingValues: ['Deception', 'Injustice', 'Blame', 'Corruption']
      },
      {
        level: 6,
        name: 'Wisdom & Compassion',
        definition: 'Integrating intellect and empathy to lead with understanding and balance.',
        ethicalPrinciple: 'Mercy and Knowledge',
        enablingValues: ['Humility', 'Empathy', 'Discernment', 'Patience'],
        limitingValues: ['Pride', 'Indifference', 'Impulsiveness', 'Judgmentalism']
      },
      {
        level: 7,
        name: 'Transcendence & Unity',
        definition: 'Achieving harmony between self, others, and the greater purpose of existence.',
        ethicalPrinciple: 'Unity of Being',
        enablingValues: ['Alignment', 'Gratitude', 'Purposeful Reflection', 'Harmony'],
        limitingValues: ['Division', 'Materialism', 'Alienation', 'Despair']
      }
    ];
  }

  /**
   * Main analysis method
   */
  async analyzeCulture(input: CultureAnalysisInput): Promise<CultureAnalysisOutput> {
    // Get strategy if not provided
    if (!input.strategy) {
      input.strategy = await this.getCompanyStrategy(input.companyId, input.tenantId);
    }

    // Execute three-engine analysis
    const result = await this.analyze(input);

    // Structure the output
    const output: CultureAnalysisOutput = {
      companyId: input.companyId,
      tenantId: input.tenantId,
      analysisDate: new Date(),
      strategyAlignmentScore: (result.finalOutput.strategyAlignmentScore as number) || 0,
      isHealthyForStrategy: ((result.finalOutput.strategyAlignmentScore as number) || 0) >= 70,
      valueMapping: result.finalOutput.valueMapping as CultureAnalysisOutput['valueMapping'],
      strategyAlignment: result.finalOutput.strategyAlignment as CultureAnalysisOutput['strategyAlignment'],
      cylinderHealth: result.finalOutput.cylinderHealth as CultureAnalysisOutput['cylinderHealth'],
      employeeCultureGap: result.finalOutput.employeeCultureGap as CultureAnalysisOutput['employeeCultureGap'] || null,
      entropyScore: (result.finalOutput.entropyScore as number) || 0,
      recommendations: result.finalOutput.recommendations as CultureAnalysisOutput['recommendations'],
      triggers: result.finalOutput.triggers as CultureAnalysisOutput['triggers'] || [],
      confidence: result.overallConfidence,
      processingTime: result.totalProcessingTime
    };

    // Save analysis results
    await this.saveAnalysisResults(output);

    return output;
  }

  // ============================================================================
  // THREE-ENGINE ARCHITECTURE IMPLEMENTATION
  // ============================================================================

  protected async loadFrameworks(): Promise<Record<string, unknown>> {
    return {
      mizanFramework: this.mizanFramework,
      cultureTheories: {
        scheinModel: {
          description: 'Culture exists at three levels: artifacts, espoused values, and basic assumptions',
          levels: ['Artifacts', 'Espoused Values', 'Basic Underlying Assumptions']
        },
        cameronQuinn: {
          description: 'Competing Values Framework - four culture types',
          types: ['Clan', 'Adhocracy', 'Market', 'Hierarchy']
        },
        denison: {
          description: 'Culture effectiveness model',
          dimensions: ['Adaptability', 'Mission', 'Involvement', 'Consistency']
        }
      },
      valueMapping: {
        enablingValues: 'Values that support organizational goals and employee wellbeing',
        limitingValues: 'Values that create dysfunction, fear, or limitation',
        balanceImportance: 'Healthy culture has predominantly enabling values with awareness of limiting values'
      }
    };
  }

  protected async processData(inputData: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Data processing happens in Data Engine
    return inputData;
  }

  protected getKnowledgeSystemPrompt(): string {
    return `You are the Knowledge Engine for Mizan's Culture Agent. Your role is to provide expert knowledge about organizational culture using the Mizan 7-Cylinder Framework and established culture theories.

You have deep expertise in:
- Mizan 7-Cylinder Framework (values-based culture assessment)
- Schein's Three Levels of Culture
- Cameron & Quinn's Competing Values Framework
- Denison's Culture Model
- Culture-strategy alignment principles
- Organizational development theories

Your task is to provide theoretical context and frameworks for understanding culture patterns and strategy alignment.`;
  }

  protected getDataSystemPrompt(): string {
    return `You are the Data Engine for Mizan's Culture Agent. Your role is to process and analyze culture data using the Mizan 7-Cylinder Framework.

Analyze the culture data in context of:
1. Company values mapped to 7 cylinders
2. Employee assessments (if provided)
3. Company strategy
4. Cylinder distribution (enabling vs limiting values)

Identify:
- Value mappings to cylinders
- Cylinder health scores
- Cultural strengths and gaps
- Strategy-culture alignment
- Employee experience vs espoused culture

Be data-driven and evidence-based in your analysis.`;
  }

  protected getReasoningSystemPrompt(): string {
    return `You are the Reasoning Engine for Mizan's Culture Agent. Your role is to synthesize knowledge and data to provide actionable culture insights.

Generate:
1. Strategy-culture alignment score and assessment
2. Cylinder health analysis
3. Cultural accelerators and blockers
4. Entropy score (limiting values percentage)
5. Employee culture gap analysis (if applicable)
6. Actionable recommendations (immediate, short-term, long-term)
7. Triggers for other modules (if needed)

Be specific, actionable, and focused on cultural transformation.`;
  }

  protected buildKnowledgePrompt(inputData: Record<string, unknown>, frameworks: Record<string, unknown>): string {
    return `Provide culture theory context for organizational analysis:

Company Values: ${(inputData.companyValues as string[] || []).join(', ')}
Strategy: ${inputData.strategy || 'Not provided'}
Has Employee Assessments: ${inputData.employeeAssessments ? 'Yes' : 'No'}

Mizan Framework: ${JSON.stringify(frameworks.mizanFramework, null, 2)}

Based on culture theory and the Mizan framework:
1. What do these company values indicate about cultural focus?
2. How do these values map to the 7 cylinders?
3. What culture type best describes this organization?
4. What theories are most relevant for this culture?`;
  }

  protected buildDataPrompt(processedData: Record<string, unknown>, knowledgeOutput: Record<string, unknown>): string {
    return `Analyze culture data using Mizan 7-Cylinder Framework:

Company Values: ${(processedData.companyValues as string[] || []).join(', ')}
Strategy: ${processedData.strategy || 'Not provided'}
Employee Assessments: ${processedData.employeeAssessments ? JSON.stringify((processedData.employeeAssessments as unknown[]).slice(0, 5)) : 'None'}

Context from Knowledge Engine: ${JSON.stringify(knowledgeOutput)}

Perform detailed analysis:
1. Map each company value to a cylinder (1-7) and classify as enabling/limiting
2. Calculate cylinder distribution
3. Identify dominant cylinders
4. Identify missing cylinders
5. Calculate cultural entropy (% of limiting values)
6. Analyze employee experience vs espoused culture (if assessments provided)

Return structured JSON with:
- valueMapping: { mappings: [], cylinderDistribution: {}, dominantCylinders: [], missingCylinders: [] }
- cylinderHealth: { 1-7: { status, score, enabling, limiting } }
- entropyScore: number
- employeeCultureGap: { alignmentScore, gaps, insights } (if assessments exist)`;
  }

  protected buildReasoningPrompt(inputData: Record<string, unknown>, knowledgeOutput: Record<string, unknown>, dataOutput: Record<string, unknown>): string {
    return `Synthesize culture analysis and provide strategic recommendations:

Data Analysis: ${JSON.stringify(dataOutput)}
Theoretical Context: ${JSON.stringify(knowledgeOutput)}
Strategy: ${inputData.strategy || 'Not provided'}

Generate comprehensive output:
1. strategyAlignmentScore: 0-100 score for culture-strategy fit
2. strategyAlignment: { cultureFit, alignmentGaps[], accelerators[], blockers[], recommendations[] }
3. recommendations: { immediate: [], shortTerm: [], longTerm: [] }
4. triggers: Array of triggers for other modules (if cultural issues require interventions)

Assess:
- Is this culture healthy to achieve the strategy?
- What needs to change?
- What can be leveraged?
- What interventions are needed?

Return ONLY valid JSON. Be specific and actionable.`;
  }

  protected parseKnowledgeOutput(response: string): Record<string, unknown> {
    try {
      return JSON.parse(response) as Record<string, unknown>;
    } catch {
      return {
        context: response,
        frameworks: 'Culture theory applied',
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
        valueMapping: { mappings: [], cylinderDistribution: {}, dominantCylinders: [], missingCylinders: [] },
        cylinderHealth: {},
        entropyScore: 0,
        error: 'Failed to parse data output'
      };
    }
  }

  protected parseReasoningOutput(response: string): Record<string, unknown> {
    try {
      return JSON.parse(response) as Record<string, unknown>;
    } catch (error) {
      console.error('Failed to parse Reasoning Engine output:', error);
      return {
        strategyAlignmentScore: 50,
        strategyAlignment: {
          cultureFit: 50,
          alignmentGaps: [],
          accelerators: [],
          blockers: [],
          recommendations: []
        },
        recommendations: {
          immediate: [],
          shortTerm: [],
          longTerm: []
        },
        triggers: [],
        error: 'Failed to parse reasoning output'
      };
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async getCompanyStrategy(companyId: string, tenantId: string): Promise<string> {
    // Using tenantId as the primary identifier for multi-tenant architecture
    // companyId is kept for future company-specific strategies within tenants
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId)
    });
    return tenant?.strategy || '';
  }

  private async saveAnalysisResults(output: CultureAnalysisOutput): Promise<void> {
    try {
      // Save culture analysis report to database
      await db.insert(cultureReports).values({
        tenantId: output.tenantId,
        analysisId: output.companyId,
        reportType: 'company_analysis',
        reportData: {
          analysisDate: output.analysisDate,
          strategyAlignmentScore: output.strategyAlignmentScore,
          isHealthyForStrategy: output.isHealthyForStrategy,
          valueMapping: output.valueMapping,
          strategyAlignment: output.strategyAlignment,
          cylinderHealth: output.cylinderHealth,
          employeeCultureGap: output.employeeCultureGap,
          entropyScore: output.entropyScore,
          recommendations: output.recommendations,
          triggers: output.triggers,
          confidence: output.confidence,
          processingTime: output.processingTime
        }
      });

      // Save cylinder scores if present
      if (output.cylinderHealth) {
        const cylinderData = {
          tenantId: output.tenantId,
          targetType: 'company' as const,
          targetId: output.companyId,
          assessmentId: output.companyId,
          cylinder1Safety: output.cylinderHealth[1]?.score || 0,
          cylinder2Belonging: output.cylinderHealth[2]?.score || 0,
          cylinder3Growth: output.cylinderHealth[3]?.score || 0,
          cylinder4Meaning: output.cylinderHealth[4]?.score || 0,
          cylinder5Integrity: output.cylinderHealth[5]?.score || 0,
          cylinder6Wisdom: output.cylinderHealth[6]?.score || 0,
          cylinder7Transcendence: output.cylinderHealth[7]?.score || 0,
          enablingValues: {} as Record<string, number>,
          limitingValues: {} as Record<string, number>,
          overallScore: Math.round(output.strategyAlignmentScore),
          culturalMaturity: this.calculateCulturalMaturity(output.cylinderHealth),
          entropyScore: Math.round(output.entropyScore),
          assessedBy: 'culture_agent',
          metadata: { source: 'culture-agent-v2', confidence: output.confidence }
        };

        // Extract enabling and limiting values from valueMapping
        if (output.valueMapping?.mappings) {
          for (const mapping of output.valueMapping.mappings) {
            if (mapping.type === 'enabling') {
              cylinderData.enablingValues[mapping.value] = mapping.strength;
            } else {
              cylinderData.limitingValues[mapping.value] = mapping.strength;
            }
          }
        }

        await db.insert(cylinderScores).values(cylinderData);
      }

      console.log('Culture analysis results saved successfully for tenant:', output.tenantId);
    } catch (error) {
      console.error('Failed to save culture analysis results:', error);
      throw new Error(`Failed to save culture analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private calculateCulturalMaturity(cylinderHealth: Record<number, { status: string; score: number; }>): number {
    // Find the highest cylinder with a score >= 70
    let maturity = 1;
    for (let i = 7; i >= 1; i--) {
      if (cylinderHealth[i]?.score >= 70) {
        maturity = i;
        break;
      }
    }
    return maturity;
  }

  /**
   * Map tenant values to cylinders - Used for value mapping functionality
   * Implements Three-Engine Architecture for value analysis
   */
  async mapTenantValuesToCylinders(
    tenantValues: string[]
  ): Promise<Array<{ value: string; cylinder: number; type: 'enabling' | 'limiting'; rationale: string }>> {
    const input = {
      companyValues: tenantValues,
      tenantId: '',
      companyId: ''
    };

    // Use three-engine to analyze values
    const result = await this.analyze(input);
    const valueMapping = result.finalOutput.valueMapping as CultureAnalysisOutput['valueMapping'];

    if (valueMapping?.mappings) {
      return valueMapping.mappings.map(m => ({
        value: m.value,
        cylinder: m.cylinder,
        type: m.type,
        rationale: m.rationale
      }));
    }

    // Fallback mapping if analysis fails
    const mappings: Array<{ value: string; cylinder: number; type: 'enabling' | 'limiting'; rationale: string }> = [];

    for (const value of tenantValues) {
      const valueLower = value.toLowerCase();
      let cylinder = 3; // Default to Growth
      let type: 'enabling' | 'limiting' = 'enabling';
      let rationale = 'Default mapping';

      // Map based on keywords (simplified version)
      if (valueLower.includes('safety') || valueLower.includes('security')) {
        cylinder = 1;
        rationale = 'Relates to safety and survival';
      } else if (valueLower.includes('team') || valueLower.includes('belonging')) {
        cylinder = 2;
        rationale = 'Relates to belonging and loyalty';
      } else if (valueLower.includes('growth') || valueLower.includes('achievement')) {
        cylinder = 3;
        rationale = 'Relates to growth and achievement';
      } else if (valueLower.includes('purpose') || valueLower.includes('meaning')) {
        cylinder = 4;
        rationale = 'Relates to meaning and contribution';
      } else if (valueLower.includes('integrity') || valueLower.includes('justice')) {
        cylinder = 5;
        rationale = 'Relates to integrity and justice';
      } else if (valueLower.includes('wisdom') || valueLower.includes('compassion')) {
        cylinder = 6;
        rationale = 'Relates to wisdom and compassion';
      } else if (valueLower.includes('unity') || valueLower.includes('harmony')) {
        cylinder = 7;
        rationale = 'Relates to transcendence and unity';
      }

      // Detect limiting values
      if (valueLower.includes('fear') || valueLower.includes('control') ||
          valueLower.includes('blame') || valueLower.includes('ego')) {
        type = 'limiting';
      }

      mappings.push({ value, cylinder, type, rationale });
    }

    return mappings;
  }

  /**
   * Analyze organization culture - Comprehensive organizational culture analysis
   * Implements full Three-Engine Architecture analysis
   */
  async analyzeOrganizationCulture(
    tenantId: string,
    assessments: Array<{
      personalValues: string[];
      currentExperienceValues: string[];
      desiredFutureValues: string[];
      engagementLevel?: number;
      recognitionLevel?: number;
    }>
  ): Promise<{
    overallHealth: number;
    cylinderDistribution: Record<number, number>;
    recommendations: string[];
    insights: string[];
  }> {
    // Aggregate all values from assessments
    const allPersonalValues: string[] = [];
    const allCurrentValues: string[] = [];
    const allDesiredValues: string[] = [];
    let totalEngagement = 0;
    let totalRecognition = 0;
    let count = 0;

    for (const assessment of assessments) {
      allPersonalValues.push(...(assessment.personalValues || []));
      allCurrentValues.push(...(assessment.currentExperienceValues || []));
      allDesiredValues.push(...(assessment.desiredFutureValues || []));

      if (assessment.engagementLevel) {
        totalEngagement += assessment.engagementLevel;
        count++;
      }
      if (assessment.recognitionLevel) {
        totalRecognition += assessment.recognitionLevel;
      }
    }

    const avgEngagement = count > 0 ? totalEngagement / count : 50;
    const avgRecognition = count > 0 ? totalRecognition / count : 50;

    // Perform culture analysis
    const input: CultureAnalysisInput = {
      tenantId,
      companyId: tenantId,
      companyValues: [...new Set([...allPersonalValues, ...allCurrentValues])],
      employeeAssessments: assessments.map((a, i) => ({
        employeeId: `emp-${i}`,
        personalValues: a.personalValues || [],
        currentExperienceValues: a.currentExperienceValues || [],
        desiredFutureValues: a.desiredFutureValues || [],
        engagementLevel: a.engagementLevel || avgEngagement,
        recognitionLevel: a.recognitionLevel || avgRecognition
      }))
    };

    const analysis = await this.analyzeCulture(input);

    // Calculate cylinder distribution
    const cylinderDistribution: Record<number, number> = {};
    for (let i = 1; i <= 7; i++) {
      cylinderDistribution[i] = analysis.cylinderHealth[i]?.score || 0;
    }

    return {
      overallHealth: analysis.strategyAlignmentScore,
      cylinderDistribution,
      recommendations: [
        ...analysis.recommendations.immediate,
        ...analysis.recommendations.shortTerm
      ],
      insights: analysis.employeeCultureGap?.insights || []
    };
  }

  /**
   * Analyze individual employee culture - Individual employee culture analysis
   * Implements Three-Engine Architecture for individual assessment
   */
  async analyzeIndividualEmployee(
    employeeId: string,
    personalValues: string[],
    currentExperienceValues: string[],
    desiredFutureValues: string[],
    engagementLevel?: number,
    recognitionLevel?: number
  ): Promise<{
    alignment: number;
    gaps: string[];
    strengths: string[];
    recommendations: string[];
    cylinderScores: Record<number, number>;
  }> {
    // Map values to cylinders
    const personalMapping = await this.mapTenantValuesToCylinders(personalValues);
    const currentMapping = await this.mapTenantValuesToCylinders(currentExperienceValues);
    const desiredMapping = await this.mapTenantValuesToCylinders(desiredFutureValues);

    // Calculate cylinder scores based on value distribution
    const cylinderScores: Record<number, number> = {};
    for (let i = 1; i <= 7; i++) {
      const personalCount = personalMapping.filter(m => m.cylinder === i && m.type === 'enabling').length;
      const currentCount = currentMapping.filter(m => m.cylinder === i && m.type === 'enabling').length;
      const desiredCount = desiredMapping.filter(m => m.cylinder === i && m.type === 'enabling').length;

      // Weight: 40% personal, 30% current, 30% desired
      cylinderScores[i] = Math.round(
        (personalCount * 0.4 + currentCount * 0.3 + desiredCount * 0.3) * 20
      );
    }

    // Calculate alignment score
    let alignment = 0;
    const gaps: string[] = [];
    const strengths: string[] = [];
    const recommendations: string[] = [];

    // Analyze gaps between current and desired
    const currentCylinders = new Set(currentMapping.map(m => m.cylinder));
    const desiredCylinders = new Set(desiredMapping.map(m => m.cylinder));

    for (const cylinder of desiredCylinders) {
      if (!currentCylinders.has(cylinder)) {
        const cylinderInfo = this.mizanFramework[cylinder - 1];
        gaps.push(`Gap in ${cylinderInfo.name}: Desired but not experienced`);
        recommendations.push(`Focus on developing ${cylinderInfo.name} through ${cylinderInfo.enablingValues.join(', ')}`);
      }
    }

    // Identify strengths
    for (const cylinder of currentCylinders) {
      if (desiredCylinders.has(cylinder)) {
        const cylinderInfo = this.mizanFramework[cylinder - 1];
        strengths.push(`Strong alignment in ${cylinderInfo.name}`);
        alignment += 10;
      }
    }

    // Add engagement and recognition factors
    if (engagementLevel && engagementLevel > 70) {
      strengths.push('High engagement level');
      alignment += 10;
    } else if (engagementLevel && engagementLevel < 40) {
      gaps.push('Low engagement level');
      recommendations.push('Improve engagement through recognition and meaningful work');
    }

    if (recognitionLevel && recognitionLevel > 70) {
      strengths.push('Good recognition experience');
      alignment += 10;
    } else if (recognitionLevel && recognitionLevel < 40) {
      gaps.push('Insufficient recognition');
      recommendations.push('Implement better recognition practices');
    }

    // Normalize alignment score
    alignment = Math.min(100, Math.max(0, alignment + 50));

    return {
      alignment,
      gaps,
      strengths,
      recommendations,
      cylinderScores
    };
  }

  /**
   * Get agent domain for Three-Engine Architecture
   */
  protected getAgentDomain(): string {
    return 'Organizational Culture Analysis using Mizan 7-Cylinder Framework';
  }

  /**
   * Get knowledge base for Three-Engine Architecture
   */
  protected getKnowledgeBase(): Record<string, unknown> {
    return {
      mizanFramework: this.mizanFramework,
      cultureTheories: {
        schein: 'Three levels of culture',
        cameronQuinn: 'Competing Values Framework',
        denison: 'Culture effectiveness model'
      },
      valueCategories: {
        enabling: 'Values that support growth and health',
        limiting: 'Values that create dysfunction'
      }
    };
  }

  /**
   * Public method to get the Mizan Framework cylinders
   * Used by routes and other services to access framework data
   */
  public getMizanFramework(): MizanCylinder[] {
    return this.mizanFramework;
  }

  /**
   * Public method to get culture frameworks and theories
   * Provides access to all culture knowledge base
   */
  public async getCultureFrameworks(): Promise<{
    cylinders: MizanCylinder[];
    theories: Record<string, unknown>;
    valueCategories: Record<string, unknown>;
  }> {
    const frameworks = await this.loadFrameworks();
    return {
      cylinders: this.mizanFramework,
      theories: frameworks.cultureTheories as Record<string, unknown>,
      valueCategories: frameworks.valueMapping as Record<string, unknown>
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Create singleton instance with proper Three-Engine configuration
const cultureConfig: ThreeEngineConfig = {
  knowledge: {
    providers: ['anthropic', 'openai', 'gemini', 'mistral'],
    model: 'claude-3-opus-20240229',
    temperature: 0.2,
    maxTokens: 4000
  },
  data: {
    providers: ['anthropic', 'openai', 'gemini', 'mistral'],
    model: 'gpt-4',
    temperature: 0.1,
    maxTokens: 3000
  },
  reasoning: {
    providers: ['anthropic', 'openai', 'gemini', 'mistral'],
    model: 'claude-3-opus-20240229',
    temperature: 0.4,
    maxTokens: 4000
  },
  consensusThreshold: 0.8
};

const agent = new CultureAgentV2('culture', cultureConfig);
export { agent as cultureAgent };

// Export the main analysis function for backward compatibility
export async function analyzeCulture(input: CultureAnalysisInput): Promise<CultureAnalysisOutput> {
  return agent.analyzeCulture(input);
}
