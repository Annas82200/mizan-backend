// @ts-nocheck
/**
 * AI Router — Intelligent request dispatcher
 *
 * Classifies incoming requests and routes them to the optimal engine:
 * - Knowledge Engine (Mistral): Fast, cheap — policy lookups, FAQs, simple NLU
 * - Reasoning Engine (Claude): Deep analysis, recommendations, complex reasoning
 * - Data Engine (Gemini): Analytics, data processing, pattern recognition
 *
 * Cost optimization: Routes to cheapest capable engine first.
 * Fallback chain: Primary → Secondary → Cache → Graceful Error
 */

import { KnowledgeEngine, KnowledgeResponse } from './engines/knowledge-engine';
import { ReasoningEngine, ReasoningResponse } from './engines/reasoning-engine';
import { DataEngine, DataResponse } from './engines/data-engine';

export type EngineType = 'knowledge' | 'reasoning' | 'data';
export type AIResponse = KnowledgeResponse | ReasoningResponse | DataResponse;

export interface RouteDecision {
  primaryEngine: EngineType;
  fallbackEngine: EngineType;
  intent: string;
  confidence: number;
  reasoning: string;
}

interface RouterConfig {
  enableFallback: boolean;
  enableCaching: boolean;
  maxRetries: number;
  costOptimize: boolean;
}

const INTENT_TO_ENGINE_MAP: Record<string, EngineType> = {
  POLICY_LOOKUP: 'knowledge',
  GENERAL_CHAT: 'knowledge',
  FAQ_QUERY: 'knowledge',
  SKILLS_QUERY: 'reasoning',
  PERFORMANCE_QUERY: 'reasoning',
  CULTURE_QUERY: 'reasoning',
  HIRING_QUERY: 'reasoning',
  ONBOARDING_QUERY: 'reasoning',
  ANALYTICS_REQUEST: 'data',
  REPORT_GENERATION: 'data',
  LEARNING_QUERY: 'knowledge',    // Simple: knowledge, Complex: reasoning
  BONUS_QUERY: 'data',            // Calculation: data, Policy: knowledge
  ACTION_REQUEST: 'knowledge',    // Classification only, action engine handles execution
};

const FALLBACK_MAP: Record<EngineType, EngineType> = {
  knowledge: 'reasoning',  // If Mistral fails, escalate to Claude
  reasoning: 'data',       // If Claude fails, try Gemini for basic response
  data: 'reasoning',       // If Gemini fails, Claude can handle most data tasks
};

export class AIRouter {
  private _knowledgeEngine: KnowledgeEngine | null = null;
  private _reasoningEngine: ReasoningEngine | null = null;
  private _dataEngine: DataEngine | null = null;
  private config: RouterConfig;

  constructor(config?: Partial<RouterConfig>) {
    this.config = {
      enableFallback: true,
      enableCaching: true,
      maxRetries: 1,
      costOptimize: true,
      ...config,
    };
  }

  // Lazy initialization — engines are only created when first needed.
  // This prevents crashes if an API key for an unused engine is missing.
  private get knowledgeEngine(): KnowledgeEngine {
    if (!this._knowledgeEngine) this._knowledgeEngine = new KnowledgeEngine();
    return this._knowledgeEngine;
  }

  private get reasoningEngine(): ReasoningEngine {
    if (!this._reasoningEngine) this._reasoningEngine = new ReasoningEngine();
    return this._reasoningEngine;
  }

  private get dataEngine(): DataEngine {
    if (!this._dataEngine) this._dataEngine = new DataEngine();
    return this._dataEngine;
  }

  /**
   * Route a query to the optimal engine with fallback support
   */
  async route(params: {
    query: string;
    tenantId: string;
    userId?: string;
    context?: string;
    forceEngine?: EngineType;
    maxTokens?: number;
  }): Promise<AIResponse & { routeDecision: RouteDecision }> {
    // If engine is forced, skip classification
    if (params.forceEngine) {
      const response = await this.executeOnEngine(params.forceEngine, params);
      return {
        ...response,
        routeDecision: {
          primaryEngine: params.forceEngine,
          fallbackEngine: FALLBACK_MAP[params.forceEngine],
          intent: 'FORCED',
          confidence: 1.0,
          reasoning: `Engine forced to ${params.forceEngine}`,
        },
      };
    }

    // Step 1: Classify intent using Knowledge Engine (Mistral — fast + cheap)
    const classification = await this.knowledgeEngine.classifyIntent(params.query, params.tenantId);

    // Step 2: Determine optimal engine based on intent and cost
    const primaryEngine = this.determineEngine(classification.intent, classification.confidence);
    const fallbackEngine = FALLBACK_MAP[primaryEngine];

    const routeDecision: RouteDecision = {
      primaryEngine,
      fallbackEngine,
      intent: classification.intent,
      confidence: classification.confidence,
      reasoning: `Intent: ${classification.intent} (${(classification.confidence * 100).toFixed(0)}%) → ${primaryEngine} engine`,
    };

    // Step 3: Execute on primary engine
    try {
      const response = await this.executeOnEngine(primaryEngine, params);
      return { ...response, routeDecision };
    } catch (primaryError) {
      // Step 4: Fallback to secondary engine if enabled
      if (this.config.enableFallback) {
        try {
          const response = await this.executeOnEngine(fallbackEngine, params);
          return {
            ...response,
            routeDecision: {
              ...routeDecision,
              reasoning: `${routeDecision.reasoning} [FALLBACK: ${primaryEngine} failed, used ${fallbackEngine}]`,
            },
          };
        } catch (fallbackError) {
          throw new Error(
            `All engines failed. Primary (${primaryEngine}): ${primaryError}. Fallback (${fallbackEngine}): ${fallbackError}`
          );
        }
      }
      throw primaryError;
    }
  }

  /**
   * Execute a multi-engine workflow (e.g., analyze → recommend → report)
   */
  async orchestrate(params: {
    steps: Array<{
      engine: EngineType;
      query: string;
      dependsOn?: number; // index of previous step whose output feeds into this
    }>;
    tenantId: string;
    userId?: string;
  }): Promise<AIResponse[]> {
    const results: AIResponse[] = [];

    for (let i = 0; i < params.steps.length; i++) {
      const step = params.steps[i];
      let query = step.query;

      // Inject previous step's output if this step depends on it
      if (step.dependsOn !== undefined && results[step.dependsOn]) {
        query = `${query}\n\nPrevious analysis result:\n${results[step.dependsOn].content}`;
      }

      const result = await this.executeOnEngine(step.engine, {
        query,
        tenantId: params.tenantId,
        userId: params.userId,
      });

      results.push(result);
    }

    return results;
  }

  /**
   * Get direct access to specific engines for specialized operations
   */
  getKnowledgeEngine(): KnowledgeEngine { return this.knowledgeEngine; }
  getReasoningEngine(): ReasoningEngine { return this.reasoningEngine; }
  getDataEngine(): DataEngine { return this.dataEngine; }

  private determineEngine(intent: string, confidence: number): EngineType {
    // If confidence is low, use reasoning engine for better understanding
    if (confidence < 0.6) {
      return 'reasoning';
    }

    // Cost optimization: if it's a simple query with high confidence, use knowledge
    if (this.config.costOptimize && confidence > 0.9) {
      const simpleIntents = ['POLICY_LOOKUP', 'GENERAL_CHAT', 'FAQ_QUERY', 'ACTION_REQUEST'];
      if (simpleIntents.includes(intent)) {
        return 'knowledge';
      }
    }

    return INTENT_TO_ENGINE_MAP[intent] || 'reasoning';
  }

  private async executeOnEngine(
    engine: EngineType,
    params: { query: string; tenantId: string; userId?: string; context?: string; maxTokens?: number }
  ): Promise<AIResponse> {
    switch (engine) {
      case 'knowledge':
        return this.knowledgeEngine.query({
          query: params.query,
          tenantId: params.tenantId,
          userId: params.userId,
          context: params.context,
          maxTokens: params.maxTokens,
        });

      case 'reasoning':
        return this.reasoningEngine.query({
          query: params.query,
          tenantId: params.tenantId,
          userId: params.userId,
          context: params.context,
          maxTokens: params.maxTokens,
        });

      case 'data':
        return this.dataEngine.query({
          query: params.query,
          tenantId: params.tenantId,
          userId: params.userId,
          maxTokens: params.maxTokens,
        });

      default:
        throw new Error(`Unknown engine type: ${engine}`);
    }
  }
}

// Singleton instance
let routerInstance: AIRouter | null = null;

export function getAIRouter(config?: Partial<RouterConfig>): AIRouter {
  if (!routerInstance) {
    routerInstance = new AIRouter(config);
  }
  return routerInstance;
}
