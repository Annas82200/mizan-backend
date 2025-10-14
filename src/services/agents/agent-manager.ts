import { CultureAgentV2, CultureAnalysisOutput } from './culture/culture-agent.js';
import { StructureAgent, StructureAnalysisOutput } from './structure-agent.js';
import { db } from '../../../db/index.js';
import { agentAnalyses, triggers, cultureAssessments } from '../../../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

// Unified agent output type
interface UnifiedAgentOutput {
  results: Record<string, unknown>;
  insights?: string[];
  recommendations?: Array<{
    id?: string;
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    actionItems?: string[];
    expectedImpact?: string;
  }>;
  triggers?: Array<{
    name: string;
    description?: string;
    type: string;
    targetModule: string;
    eventType: string;
    condition?: Record<string, unknown>;
    action: string;
    actionConfig?: Record<string, unknown>;
    priority: number;
  }>;
  confidence?: number;
  overallConfidence?: number;
}

interface Recommendation {
  id: string;
  source: 'culture' | 'structure' | 'skills' | 'performance';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  status: 'active' | 'completed' | 'dismissed';
  createdAt: Date;
}

interface CultureRecommendation {
  id?: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
}

interface CultureAnalysisResult {
  recommendations?: CultureRecommendation[];
}

interface TriggerRecord {
  name: string;
  description?: string;
  type: string;
  targetModule: string;
  eventType: string;
  condition?: Record<string, unknown>;
  action: string;
  actionConfig?: Record<string, unknown>;
  priority: number;
}

interface RecommendationRecord {
  targetType: string;
  targetId?: string | null;
  category: string;
  title: string;
  description: string;
  actionItems: string[];
  expectedImpact?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'open';
  createdBy: string;
}

type SupportedAgentType = 'culture' | 'structure';

interface AgentInputData {
  tenantId: string;
  userId?: string;
  companyId?: string;
  companyValues?: string[];
  data?: Record<string, unknown>;
  context?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AgentAnalysisRequest {
  tenantId: string;
  agentType: SupportedAgentType;
  inputData: AgentInputData;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface AgentAnalysisResult {
  analysisId: string;
  agentType: string;
  output: UnifiedAgentOutput;
  confidence: number;
  processingTime: number;
  triggers: TriggerRecord[];
  recommendations: RecommendationRecord[];
}

type AgentInstance = CultureAgentV2 | StructureAgent;

export class AgentManager {
  private agents: Map<string, AgentInstance> = new Map();

  constructor() {
    this.initializeAgents();
  }

  private initializeAgents(): void {
    this.agents.set('culture', new CultureAgentV2('culture', {
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
    }));
    this.agents.set('structure', new StructureAgent());
  }

  async runAnalysis(request: AgentAnalysisRequest): Promise<AgentAnalysisResult> {
    const startTime = Date.now();

    try {
      const agent = this.agents.get(request.agentType);
      if (!agent) {
        throw new Error(`Agent type '${request.agentType}' not found`);
      }

      // Run the agent analysis
      let result: CultureAnalysisOutput | StructureAnalysisOutput;
      switch (request.agentType) {
        case 'culture': {
          const cultureAgent = agent as CultureAgentV2;
          // Ensure required fields are present for culture analysis
          const cultureInput = {
            ...request.inputData,
            companyId: request.inputData.companyId || request.inputData.tenantId,
            companyValues: request.inputData.companyValues || []
          };
          result = await cultureAgent.analyzeCulture(cultureInput);
          break;
        }
        case 'structure': {
          const structureAgent = agent as StructureAgent;
          result = await structureAgent.analyzeOrganizationStructure(request.inputData);
          break;
        }
        default:
          throw new Error(`Analysis method not implemented for ${request.agentType}`);
      }

      // Convert agent-specific output to unified format
      const resultAsUnknown = result as unknown;
      const resultAsRecord = resultAsUnknown as Record<string, unknown>;

      const unifiedOutput: UnifiedAgentOutput = {
        results: resultAsRecord,
        insights: Array.isArray(resultAsRecord.insights) ? resultAsRecord.insights as string[] : [],
        recommendations: Array.isArray(resultAsRecord.recommendations) ?
          resultAsRecord.recommendations as UnifiedAgentOutput['recommendations'] : [],
        triggers: Array.isArray(resultAsRecord.triggers) ?
          resultAsRecord.triggers as UnifiedAgentOutput['triggers'] : [],
        confidence: typeof resultAsRecord.confidence === 'number' ? resultAsRecord.confidence : 0.8,
        overallConfidence: typeof resultAsRecord.overallConfidence === 'number' ?
          resultAsRecord.overallConfidence :
          (typeof resultAsRecord.confidence === 'number' ? resultAsRecord.confidence : 0.8)
      };

      const processingTime = Date.now() - startTime;

      // Store analysis in database
      const analysisRecord = await db.insert(agentAnalyses).values({
        tenantId: request.tenantId,
        agentType: request.agentType,
        results: {
          inputData: request.inputData,
          output: unifiedOutput,
          confidence: unifiedOutput.overallConfidence || 0.8,
          processingTime,
          status: 'completed'
        }
      }).returning();

      const analysisId = analysisRecord[0].id;

      // Process triggers
      const triggersCreated = await this.processTriggers(
        request.tenantId,
        request.agentType,
        unifiedOutput.triggers || [],
        analysisId
      );

      // Process recommendations
      const recommendationsCreated = await this.processRecommendations(
        request.tenantId,
        request.agentType,
        unifiedOutput.recommendations || [],
        analysisId
      );

      return {
        analysisId,
        agentType: request.agentType,
        output: unifiedOutput,
        confidence: unifiedOutput.overallConfidence || 0.8,
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
    agentTypes: SupportedAgentType[],
    inputData: AgentInputData | Record<string, AgentInputData>
  ): Promise<AgentAnalysisResult[]> {
    const promises = agentTypes.map(agentType =>
      this.runAnalysis({
        tenantId,
        agentType: agentType,
        inputData: typeof inputData === 'object' && agentType in inputData ?
          (inputData as Record<string, AgentInputData>)[agentType] :
          inputData as AgentInputData
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
  ): Promise<Array<{
    id: string;
    tenantId: string;
    agentType: string;
    results: Record<string, unknown>;
    createdAt: Date;
  }>> {
    const conditions = [eq(agentAnalyses.tenantId, tenantId)];

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

  async getActiveRecommendations(tenantId: string): Promise<Recommendation[]> {
    // Aggregate recommendations from all completed analyses
    const recommendations: Recommendation[] = [];

    // Get culture recommendations
    const cultureAssessments = await db
      .select()
      .from(cultureAssessments)
      .where(eq(cultureAssessments.tenantId, tenantId))
      .orderBy(desc(cultureAssessments.createdAt))
      .limit(1);

    if (cultureAssessments.length > 0 && cultureAssessments[0].results) {
      const results = cultureAssessments[0].results as CultureAnalysisResult;
      if (results.recommendations) {
        recommendations.push(...results.recommendations.map(rec => ({
          id: `culture-${rec.id || Math.random().toString(36).substr(2, 9)}`,
          source: 'culture' as const,
          priority: rec.priority,
          title: rec.title,
          description: rec.description,
          status: 'active' as const,
          createdAt: cultureAssessments[0].createdAt
        })));
      }
    }

    return recommendations;
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
