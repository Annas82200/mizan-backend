// @ts-nocheck
/**
 * Assistant Controller — Main entry point for the Unified AI Assistant
 *
 * Orchestrates the full message pipeline:
 * 1. Receive user message
 * 2. Classify intent (Mistral — fast)
 * 3. Build context from conversation history + user data
 * 4. Route to specialized agent
 * 5. Execute any suggested actions
 * 6. Return response with suggestions
 */

import { IntentClassifier, ClassificationResult } from './intent-classifier';
import { ConversationManager } from './conversation-manager';
import { getAgent } from './agents/agent-factory';
import { ActionEngine } from './action-engine';
import { TokenTracker } from '../ai-engines/cost/token-tracker';
import { sendAssistantResponse } from '../../infrastructure/websocket/socket-server';

export interface AssistantRequest {
  message: string;
  conversationId?: string;
  tenantId: string;
  userId: string;
  userRole: string;
}

export interface AssistantResponse {
  conversationId: string;
  messageId: string;
  content: string;
  intent: string;
  agentUsed: string;
  suggestedActions: Array<{
    id: string;
    label: string;
    type: string;
    parameters?: Record<string, unknown>;
  }>;
  followUpQuestions: string[];
}

export class AssistantController {
  private classifier: IntentClassifier;
  private conversationManager: ConversationManager;
  private actionEngine: ActionEngine;
  private tokenTracker: TokenTracker;

  constructor() {
    this.classifier = new IntentClassifier();
    this.conversationManager = new ConversationManager();
    this.actionEngine = new ActionEngine();
    this.tokenTracker = new TokenTracker();
  }

  /**
   * Process an incoming user message through the full pipeline
   */
  async processMessage(request: AssistantRequest): Promise<AssistantResponse> {
    const startTime = Date.now();

    // Step 1: Get or create conversation
    const conversationId = await this.conversationManager.getOrCreateConversation(
      request.tenantId,
      request.userId,
      request.conversationId
    );

    // Step 2: Save user message
    await this.conversationManager.addMessage({
      conversationId,
      tenantId: request.tenantId,
      role: 'user',
      content: request.message,
    });

    // Step 3: Classify intent (try quick first, then AI)
    let classification: ClassificationResult;
    const quickResult = this.classifier.classifyQuick(request.message);

    if (quickResult && quickResult.confidence >= 0.8) {
      classification = quickResult;
    } else {
      classification = await this.classifier.classify(request.message, request.tenantId);
    }

    // Step 4: Build conversation context
    const conversationHistory = await this.conversationManager.buildPromptContext(
      conversationId,
      request.tenantId,
      request.userId
    );

    // Step 5: Route to specialized agent
    const agent = getAgent(classification.suggestedAgent);
    const agentResponse = await agent.process(request.message, {
      tenantId: request.tenantId,
      userId: request.userId,
      userRole: request.userRole,
      conversationHistory,
    });

    // Step 6: Track token usage
    await this.tokenTracker.trackRequest({
      tenantId: request.tenantId,
      userId: request.userId,
      engine: agentResponse.engineUsed.split('/')[0] as 'knowledge' | 'reasoning' | 'data',
      provider: agentResponse.engineUsed.split('/')[1] as 'mistral' | 'claude' | 'gemini',
      model: agentResponse.model,
      requestType: `assistant_${classification.intent.toLowerCase()}`,
      inputTokens: agentResponse.tokensUsed.input,
      outputTokens: agentResponse.tokensUsed.output,
      latencyMs: agentResponse.latencyMs,
      status: 'success',
    });

    // Step 7: Use agent-provided actions and generate follow-ups
    const suggestedActions = agentResponse.suggestedActions;
    const followUpQuestions = this.generateFollowUps(classification.intent);

    // Step 8: Save assistant response
    const messageId = await this.conversationManager.addMessage({
      conversationId,
      tenantId: request.tenantId,
      role: 'assistant',
      content: agentResponse.content,
      intent: classification.intent,
      agentUsed: agentResponse.agentName,
      engineUsed: agentResponse.engineUsed,
      tokensUsed: agentResponse.tokensUsed.total,
      latencyMs: Date.now() - startTime,
      suggestedActions,
    });

    // Step 9: Send real-time response via WebSocket
    sendAssistantResponse(request.userId, {
      conversationId,
      content: agentResponse.content,
      isComplete: true,
      suggestedActions: suggestedActions.map(a => ({ id: a.id, label: a.label, type: a.type })),
    });

    return {
      conversationId,
      messageId,
      content: agentResponse.content,
      intent: classification.intent,
      agentUsed: agentResponse.agentName,
      suggestedActions,
      followUpQuestions,
    };
  }

  /**
   * Execute a confirmed action from the chat
   */
  async executeAction(params: {
    actionId: string;
    conversationId: string;
    tenantId: string;
    userId: string;
    actionType: string;
    parameters: Record<string, unknown>;
  }) {
    return this.actionEngine.execute({
      actionId: params.actionId,
      conversationId: params.conversationId,
      tenantId: params.tenantId,
      userId: params.userId,
      actionType: params.actionType as 'send_email' | 'schedule_meeting' | 'create_task' | 'approve_request' | 'generate_report' | 'trigger_workflow' | 'send_reminder' | 'update_record',
      parameters: params.parameters,
    });
  }

  private generateFollowUps(intent: string): string[] {
    const followUps: Record<string, string[]> = {
      SKILLS_QUERY: ['What skills should I develop next?', 'Show me courses for my skill gaps', 'How do I compare to my peers?'],
      PERFORMANCE_QUERY: ['Help me set new goals', 'Prepare for my next review', 'What feedback have I received?'],
      LEARNING_QUERY: ['What courses are trending?', 'Create a learning path for me', 'How much have I learned this quarter?'],
      CULTURE_QUERY: ['What are our company values?', 'How is our team culture?', 'Show engagement trends'],
      GENERAL_CHAT: ['What can you help me with?', 'Show me my dashboard', 'What tasks do I have?'],
    };

    return followUps[intent] || followUps.GENERAL_CHAT;
  }
}
