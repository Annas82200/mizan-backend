import { CultureAgent } from './culture-agent.js';
import { StructureAgent } from './structure-agent.js';
import { SkillsAgent } from './skills-agent.js';
import { BenchmarkingAgent } from './benchmarking-agent.js';
import { PerformanceAgent } from './performance-agent.js';
import { EngagementAgent } from './engagement-agent.js';
import { RecognitionAgent } from './recognition-agent.js';
import { db } from '../../db/index.js';
import { agentAnalyses, triggers } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';

export interface AgentAnalysisRequest {
  tenantId: string;
  agentType: 'culture' | 'structure' | 'skills' | 'performance' | 'engagement' | 'recognition' | 'benchmarking';
  inputData: any;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface AgentAnalysisResult {
  analysisId: string;
  agentType: string;
  output: any;
  confidence: number;
  processingTime: number;
  triggers: any[];
  recommendations: any[];
}

export class AgentManager {
  private agents: Map<string, any> = new Map();

  constructor() {
    this.initializeAgents();
  }

  private initializeAgents(): void {
    // Default config for three-engine agents
    const defaultThreeEngineConfig = {
      knowledge: {
        providers: ['openai' as const, 'anthropic' as const],
        model: 'gpt-4',
        temperature: 0.3,
        maxTokens: 4000
      },
      data: {
        providers: ['openai' as const],
        model: 'gpt-4',
        temperature: 0.1,
        maxTokens: 4000
      },
      reasoning: {
        providers: ['anthropic' as const],
        model: 'claude-3',
        temperature: 0.5,
        maxTokens: 4000
      },
      consensusThreshold: 0.7
    };

    this.agents.set('culture', new CultureAgent());
    this.agents.set('structure', new StructureAgent());
    this.agents.set('skills', new SkillsAgent());
    this.agents.set('benchmarking', new BenchmarkingAgent());
    this.agents.set('performance', new PerformanceAgent('performance', defaultThreeEngineConfig));
    this.agents.set('engagement', new EngagementAgent());
    this.agents.set('recognition', new RecognitionAgent());
  }

  async runAnalysis(request: AgentAnalysisRequest): Promise<AgentAnalysisResult> {
    const startTime = Date.now();

    try {
      const agent = this.agents.get(request.agentType);
      if (!agent) {
        throw new Error(`Agent type '${request.agentType}' not found`);
      }

      // Run the agent analysis
      let result: any;
      switch (request.agentType) {
        case 'culture':
          result = await agent.analyzeCompanyCulture(request.inputData);
          break;
        case 'structure':
          result = await agent.analyzeOrganizationStructure(request.inputData);
          break;
        case 'skills':
          result = await agent.analyzeSkills(request.inputData);
          break;
        case 'benchmarking':
          result = await agent.analyzeBenchmarks(request.inputData);
          break;
        default:
          throw new Error(`Analysis method not implemented for ${request.agentType}`);
      }

      const processingTime = Date.now() - startTime;

      // Store analysis in database
      const analysisRecord = await db.insert(agentAnalyses).values({
        tenantId: request.tenantId,
        agentType: request.agentType,
        results: {
          inputData: request.inputData,
          output: result,
          confidence: result.overallConfidence || 0.8,
          processingTime,
          status: 'completed'
        }
      }).returning();

      const analysisId = analysisRecord[0].id;

      // Process triggers
      const triggersCreated = await this.processTriggers(
        request.tenantId,
        request.agentType,
        result.triggers || [],
        analysisId
      );

      // Process recommendations
      const recommendationsCreated = await this.processRecommendations(
        request.tenantId,
        request.agentType,
        result.recommendations || [],
        analysisId
      );

      return {
        analysisId,
        agentType: request.agentType,
        output: result,
        confidence: result.overallConfidence || 0.8,
        processingTime,
        triggers: triggersCreated,
        recommendations: recommendationsCreated
      };

    } catch (error) {
      console.error(`Agent analysis failed for ${request.agentType}:`, error);
      
      // Store failed analysis
      await db.insert(agentAnalyses).values({
        tenantId: request.tenantId,
        agentType: request.agentType,
        results: {
          inputData: request.inputData,
          output: { error: error instanceof Error ? error.message : 'Unknown error' },
          confidence: 0,
          processingTime: Date.now() - startTime,
          status: 'failed'
        }
      });

      throw error;
    }
  }

  async runMultiAgentAnalysis(
    tenantId: string,
    agentTypes: string[],
    inputData: any
  ): Promise<AgentAnalysisResult[]> {
    const promises = agentTypes.map(agentType => 
      this.runAnalysis({
        tenantId,
        agentType: agentType as any,
        inputData: inputData[agentType] || inputData
      })
    );

    const results = await Promise.allSettled(promises);
    
    return results
      .filter((result): result is PromiseFulfilledResult<AgentAnalysisResult> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);
  }

  async getAnalysisHistory(
    tenantId: string,
    agentType?: string,
    limit: number = 10
  ): Promise<any[]> {
    const conditions: any[] = [eq(agentAnalyses.tenantId, tenantId)];

    if (agentType) {
      conditions.push(eq(agentAnalyses.agentType, agentType));
    }

    return await db
      .select()
      .from(agentAnalyses)
      .where(conditions.length > 1 ? conditions[0] : conditions[0])
      .orderBy(agentAnalyses.createdAt)
      .limit(limit);
  }

  async getActiveRecommendations(tenantId: string): Promise<any[]> {
    // TODO: Implement when recommendations table is added to schema
    return [];
  }

  async getPendingTriggers(tenantId: string): Promise<any[]> {
    return await db
      .select()
      .from(triggers)
      .where(and(
        eq(triggers.tenantId, tenantId),
        eq(triggers.isActive, true)
      ))
      .orderBy(triggers.createdAt);
  }

  private async processTriggers(
    tenantId: string,
    agentType: string,
    triggerData: any[],
    analysisId: string
  ): Promise<any[]> {
    if (!triggerData || triggerData.length === 0) {
      return [];
    }

    const triggerRecords = triggerData.map((trigger: any) => ({
      tenantId,
      name: trigger.name || `${agentType} Trigger`,
      description: trigger.description,
      type: trigger.type || 'event_based',
      sourceModule: agentType,
      eventType: trigger.eventType || 'analysis_completed',
      conditions: trigger.condition || {},
      targetModule: trigger.targetModule || agentType,
      action: trigger.action || 'notify',
      actionConfig: trigger.actionConfig || {},
      priority: trigger.priority || 5,
      isActive: true
    }));

    return await db.insert(triggers).values(triggerRecords).returning();
  }

  private async processRecommendations(
    tenantId: string,
    agentType: string,
    recommendationData: any[],
    analysisId: string
  ): Promise<any[]> {
    if (!recommendationData || recommendationData.length === 0) {
      return [];
    }

    const recommendationRecords = recommendationData.map(rec => ({
      tenantId,
      targetType: rec.targetType || 'company',
      targetId: rec.targetId || null,
      category: agentType,
      title: rec.title,
      description: rec.description,
      actionItems: rec.actionItems || [],
      expectedImpact: rec.expectedImpact,
      priority: rec.priority || 'medium',
      status: 'open' as const,
      createdBy: `${agentType}_agent`
    }));

    // TODO: Implement when recommendations table is added to schema
    // return await db.insert(recommendations).values(recommendationRecords).returning();
    return [];
  }
}
