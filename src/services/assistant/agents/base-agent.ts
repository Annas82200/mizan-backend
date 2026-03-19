// @ts-nocheck
/**
 * BaseAgent — Abstract base class for all specialized AI assistant agents
 *
 * Each module agent extends this and provides:
 * - A system prompt with domain-specific instructions
 * - Context building from the module's database tables
 * - Response formatting for the chat interface
 */

import { getAIRouter, EngineType } from '../../ai-engines/ai-router';

export interface AgentContext {
  tenantId: string;
  userId: string;
  userRole: string;
  conversationHistory?: string;
}

export interface AgentResponse {
  content: string;
  agentName: string;
  engineUsed: string;
  model: string;
  tokensUsed: { input: number; output: number; total: number };
  latencyMs: number;
  suggestedActions: Array<{ id: string; label: string; type: string }>;
}

export abstract class BaseAgent {
  abstract readonly name: string;
  abstract readonly description: string;
  protected preferredEngine: EngineType = 'reasoning';

  /**
   * Process a user query using this agent's domain expertise
   */
  async process(query: string, context: AgentContext): Promise<AgentResponse> {
    const startTime = Date.now();
    const router = getAIRouter();

    // Build domain-specific context
    const domainContext = await this.buildDomainContext(context);
    const systemPrompt = this.getSystemPrompt(context);

    const fullContext = [
      systemPrompt,
      domainContext ? `\nRelevant data:\n${domainContext}` : '',
      context.conversationHistory ? `\nConversation history:\n${context.conversationHistory}` : '',
      `\nUser role: ${context.userRole}`,
    ].filter(Boolean).join('\n');

    const response = await router.route({
      query,
      tenantId: context.tenantId,
      userId: context.userId,
      context: fullContext,
      forceEngine: this.preferredEngine,
    });

    return {
      content: response.content,
      agentName: this.name,
      engineUsed: `${response.engine}/${response.provider}`,
      model: response.model,
      tokensUsed: response.tokensUsed,
      latencyMs: Date.now() - startTime,
      suggestedActions: this.getSuggestedActions(context.userRole),
    };
  }

  /**
   * Override to provide module-specific system prompt
   */
  protected abstract getSystemPrompt(context: AgentContext): string;

  /**
   * Override to fetch relevant data from the module's database tables
   */
  protected abstract buildDomainContext(context: AgentContext): Promise<string>;

  /**
   * Override to provide module-specific suggested actions
   */
  protected abstract getSuggestedActions(userRole: string): AgentResponse['suggestedActions'];
}
