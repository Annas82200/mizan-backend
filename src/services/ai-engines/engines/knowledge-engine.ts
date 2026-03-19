/**
 * Knowledge Engine — Powered by Mistral AI
 *
 * Fast, cost-effective engine for knowledge retrieval tasks:
 * - Policy Q&A and handbook lookups
 * - FAQ answers and simple NLU
 * - Document parsing and summarization
 * - Intent classification for the AI Router
 */

import Mistral from '@mistralai/mistralai';

export interface KnowledgeQuery {
  query: string;
  context?: string;
  tenantId: string;
  userId?: string;
  ragDocuments?: string[];
  maxTokens?: number;
  temperature?: number;
}

export interface KnowledgeResponse {
  content: string;
  engine: 'knowledge';
  provider: 'mistral';
  model: string;
  tokensUsed: { input: number; output: number; total: number };
  latencyMs: number;
  cached: boolean;
  confidence: number;
}

export class KnowledgeEngine {
  private client: Mistral;
  private defaultModel: string;

  constructor() {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error('MISTRAL_API_KEY environment variable is required');
    }
    this.client = new Mistral({ apiKey });
    this.defaultModel = process.env.MISTRAL_MODEL || 'mistral-large-latest';
  }

  async query(input: KnowledgeQuery): Promise<KnowledgeResponse> {
    const startTime = Date.now();

    try {
      const systemPrompt = this.buildSystemPrompt(input);
      const userMessage = this.buildUserMessage(input);

      const response = await this.client.chat.complete({
        model: this.defaultModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        maxTokens: input.maxTokens || 1024,
        temperature: input.temperature ?? 0.3,
      });

      const latencyMs = Date.now() - startTime;
      const choice = response.choices?.[0];
      const usage = response.usage;

      return {
        content: (choice?.message?.content as string) || '',
        engine: 'knowledge',
        provider: 'mistral',
        model: this.defaultModel,
        tokensUsed: {
          input: usage?.promptTokens || 0,
          output: usage?.completionTokens || 0,
          total: usage?.totalTokens || 0,
        },
        latencyMs,
        cached: false,
        confidence: this.estimateConfidence(choice?.message?.content as string),
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      console.error(`[KnowledgeEngine] Mistral API error (${latencyMs}ms):`, (error as Error).message);
      throw new Error(`Knowledge engine failed: ${(error as Error).message}`);
    }
  }

  /**
   * Classify the intent of a user message (used by AI Router).
   * Returns the classified intent category and confidence score.
   */
  async classifyIntent(message: string, tenantId: string): Promise<{
    intent: string;
    confidence: number;
    suggestedEngine: 'knowledge' | 'reasoning' | 'data';
  }> {
    const response = await this.client.chat.complete({
      model: this.defaultModel,
      messages: [
        {
          role: 'system',
          content: `You are an intent classifier for an HR intelligence platform. Classify the user's message into exactly one intent and suggest the best AI engine.

Intents: SKILLS_QUERY, PERFORMANCE_QUERY, LEARNING_QUERY, HIRING_QUERY, CULTURE_QUERY, BONUS_QUERY, ONBOARDING_QUERY, POLICY_LOOKUP, ACTION_REQUEST, ANALYTICS_REQUEST, GENERAL_CHAT

Engine recommendations:
- knowledge: Simple lookups, policy questions, FAQs, general chat
- reasoning: Complex analysis, recommendations, strategic decisions, evaluations
- data: Analytics, reports, data processing, pattern recognition, large datasets

Respond in JSON: {"intent": "...", "confidence": 0.0-1.0, "suggestedEngine": "knowledge"|"reasoning"|"data"}`,
        },
        { role: 'user', content: message },
      ],
      maxTokens: 100,
      temperature: 0.1,
      responseFormat: { type: 'json_object' },
    });

    const choice = response.choices?.[0];
    const content = (choice?.message?.content as string) || '{}';

    let parsed: { intent?: string; confidence?: number; suggestedEngine?: string };
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      parsed = {};
    }

    return {
      intent: parsed.intent || 'GENERAL_CHAT',
      confidence: parsed.confidence || 0.5,
      suggestedEngine: (parsed.suggestedEngine as 'knowledge' | 'reasoning' | 'data') || 'knowledge',
    };
  }

  /**
   * Generate embeddings for RAG pipeline
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: 'mistral-embed',
      inputs: [text],
    });

    return response.data[0]?.embedding || [];
  }

  private buildSystemPrompt(input: KnowledgeQuery): string {
    let prompt = `You are the Knowledge Engine of the Mizan HR Intelligence Platform. You provide fast, accurate answers about HR policies, company handbooks, procedures, and general HR knowledge.

Tenant ID: ${input.tenantId}
Your responses should be:
- Concise and factual
- Based on provided context documents when available
- Clear about when you're uncertain`;

    if (input.ragDocuments && input.ragDocuments.length > 0) {
      prompt += `\n\nRelevant documents for context:\n${input.ragDocuments.join('\n---\n')}`;
    }

    return prompt;
  }

  private buildUserMessage(input: KnowledgeQuery): string {
    let message = input.query;
    if (input.context) {
      message = `Context: ${input.context}\n\nQuestion: ${input.query}`;
    }
    return message;
  }

  private estimateConfidence(content: string | undefined): number {
    if (!content) return 0;
    const uncertainPhrases = ['not sure', 'might be', 'possibly', 'I think', 'unclear'];
    const hasUncertainty = uncertainPhrases.some(p => content.toLowerCase().includes(p));
    return hasUncertainty ? 0.6 : 0.85;
  }
}
