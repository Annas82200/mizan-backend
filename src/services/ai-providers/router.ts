// server/services/ai-providers/router.ts

import { OpenAI } from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { logger } from '../logger';
import { GoogleGenerativeAI } from "@google/generative-ai";
import MistralClient from "@mistralai/mistralai";
import { ProviderResponse, AIProviderKey, EngineType } from './types';
import { withTimeout, AI_REQUEST_TIMEOUT } from './timeout';

// ✅ PRODUCTION: Use canonical types from types.ts
// Removed duplicate ProviderResponse interface (was lines 18-37)

// Router-specific ProviderCall (simpler than types.ts version)
export interface RouterProviderCall {
  prompt: string;
  engine: EngineType;  // Required for canonical ProviderResponse
  model?: string;
  temperature?: number;
  maxTokens?: number;
  requireJson?: boolean;
}

/**
 * Unified System Prompt for AI Providers (Phase 5)
 *
 * Requests structured output with confidence scoring to enable reliable extraction
 * and improve ensemble decision-making quality.
 */
const SYSTEM_PROMPT_WITH_CONFIDENCE = `You are a fact-based analyst for organizational assessment and decision support.

Response Format Guidelines:
- When possible, provide responses in JSON format with the following structure:
  {
    "analysis": "your detailed analysis here",
    "confidence": 0.85,
    "key_factors": ["factor1", "factor2"],
    "assumptions": ["assumption1 if any"]
  }

- If JSON format is not appropriate, include confidence as: "Confidence: 85%" or "Confidence: 0.85"

Confidence Scoring Guidelines:
- 0.9-1.0: Strong evidence from multiple reliable data sources, high certainty
- 0.7-0.9: Good evidence with reasonable verification, moderate certainty
- 0.5-0.7: Limited evidence, some assumptions required, low-moderate certainty
- 0.3-0.5: Significant speculation or insufficient data, low certainty
- Below 0.3: Pure guess, recommend additional data collection

Provide accurate, evidence-based responses. Be explicit about assumptions and data limitations.`;

class AIProviderRouter {
  private openai: OpenAI;
  private anthropic: Anthropic;
  private gemini: GoogleGenerativeAI;
  private mistral: MistralClient;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: AI_REQUEST_TIMEOUT
    });
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: AI_REQUEST_TIMEOUT
    });
    this.gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    this.mistral = new MistralClient(process.env.MISTRAL_API_KEY!);
  }

  async invokeProvider(provider: AIProviderKey | "ensemble", call: RouterProviderCall): Promise<ProviderResponse> {
    if (provider === "ensemble") {
      return this.invokeEnsemble(call);
    }

    switch (provider) {
      case 'openai':
        return this.invokeOpenAI(call);
      case 'anthropic':
        return this.invokeAnthropic(call);
      case 'gemini':
        return this.invokeGemini(call);
      case 'mistral':
        return this.invokeMistral(call);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  private async invokeEnsemble(call: RouterProviderCall): Promise<ProviderResponse> {
    const providers: AIProviderKey[] = ['openai', 'anthropic', 'gemini', 'mistral'];

    const results = await Promise.allSettled(
      providers.map(provider => this.invokeProvider(provider, call))
    );

    const successfulResults = results
      .filter((result): result is PromiseFulfilledResult<ProviderResponse> =>
        result.status === 'fulfilled'
      )
      .map(result => result.value);

    if (successfulResults.length === 0) {
      throw new Error('All providers failed');
    }

    // Return the result with highest confidence
    const bestResult = successfulResults.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );

    return {
      ...bestResult,
      provider: 'openai' as AIProviderKey, // Use first provider as identifier for ensemble
      confidence: successfulResults.reduce((sum, r) => sum + r.confidence, 0) / successfulResults.length
    };
  }

  private async invokeOpenAI(call: RouterProviderCall): Promise<ProviderResponse> {
    try {
      const response = await this.openai.chat.completions.create({
        model: call.model || "gpt-4o",  // gpt-4o supports 16k output tokens vs 4k for gpt-4-turbo
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT_WITH_CONFIDENCE
          },
          { role: "user", content: call.prompt }
        ],
        temperature: call.temperature || 0.1,
        max_tokens: call.maxTokens || 4000,
        response_format: call.requireJson ? { type: "json_object" } : undefined
      });

      const content = response.choices[0].message.content;

      // ✅ Validate content exists before creating response (fail-fast, not defensive)
      if (!content || content.trim().length === 0) {
        throw new Error('OpenAI returned empty content');
      }

      const usage = response.usage;

      return {
        provider: 'openai',
        engine: call.engine,
        narrative: call.requireJson ? this.extractJsonFromResponse(content) : content.trim(),
        confidence: this.extractConfidence(content),
        usage: usage ? {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalCost: 0  // Cost calculation handled by billing service if needed
        } : undefined
      };
    } catch (error) {
      logger.error('OpenAI invocation failed:', error);
      throw error;
    }
  }

  private async invokeAnthropic(call: RouterProviderCall): Promise<ProviderResponse> {
    try {
      const response = await this.anthropic.messages.create({
        model: call.model || "claude-sonnet-4-5",
        system: SYSTEM_PROMPT_WITH_CONFIDENCE,
        messages: [
          {
            role: "user",
            content: call.prompt
          }
        ],
        max_tokens: call.maxTokens || 4000,
        temperature: call.temperature || 0.1
      });

      const content = response.content[0].type === 'text'
        ? response.content[0].text
        : '';

      // ✅ Validate content exists before creating response (fail-fast, not defensive)
      if (!content || content.trim().length === 0) {
        throw new Error('Anthropic returned empty content');
      }

      return {
        provider: 'anthropic',
        engine: call.engine,
        narrative: call.requireJson ? this.extractJsonFromResponse(content) : content.trim(),
        confidence: this.extractConfidence(content)
      };
    } catch (error) {
      logger.error('Anthropic invocation failed:', error);
      throw error;
    }
  }

  private async invokeGemini(call: RouterProviderCall): Promise<ProviderResponse> {
    try {
      const model = this.gemini.getGenerativeModel({
        model: call.model || "gemini-2.5-flash",  // Current Gemini 2.5 model (faster, cheaper than pro)
        systemInstruction: SYSTEM_PROMPT_WITH_CONFIDENCE
      });

      const generatePromise = model.generateContent({
        contents: [{ role: 'user', parts: [{ text: call.prompt }] }],
        generationConfig: {
          temperature: call.temperature || 0.1,
          maxOutputTokens: call.maxTokens || 4000
        }
      });

      // Gemini response type definition (production-quality, no 'as any')
      interface GeminiGenerateContentResponse {
        response: {
          text(): string;
        };
      }

      // ✅ PRODUCTION: Unified timeout with automatic cleanup
      const result = await withTimeout(
        generatePromise,
        AI_REQUEST_TIMEOUT,
        'Gemini'
      ) as GeminiGenerateContentResponse;

      const content = result.response.text();

      // ✅ Validate content exists before creating response (fail-fast, not defensive)
      if (!content || content.trim().length === 0) {
        throw new Error('Gemini returned empty content');
      }

      return {
        provider: 'gemini',
        engine: call.engine,
        narrative: call.requireJson ? this.extractJsonFromResponse(content) : content.trim(),
        confidence: this.extractConfidence(content)
      };
    } catch (error) {
      logger.error('Gemini invocation failed:', error);
      throw error;
    }
  }

  private async invokeMistral(call: RouterProviderCall): Promise<ProviderResponse> {
    try {
      const chatPromise = this.mistral.chat({
        model: call.model || "mistral-large-latest",
        messages: [
          { role: "system", content: SYSTEM_PROMPT_WITH_CONFIDENCE },
          { role: "user", content: call.prompt }
        ],
        temperature: call.temperature || 0.1,
        maxTokens: call.maxTokens || 4000
      });

      // Mistral response type definition (production-quality, no 'as any')
      interface MistralChatResponse {
        choices: Array<{
          message: {
            content: string;
          };
        }>;
      }

      // ✅ PRODUCTION: Unified timeout with automatic cleanup
      const response = await withTimeout(
        chatPromise,
        AI_REQUEST_TIMEOUT,
        'Mistral'
      ) as MistralChatResponse;

      const content = response.choices[0].message.content;

      // ✅ Validate content exists before creating response (fail-fast, not defensive)
      if (!content || content.trim().length === 0) {
        throw new Error('Mistral returned empty content');
      }

      return {
        provider: 'mistral',
        engine: call.engine,
        narrative: call.requireJson ? this.extractJsonFromResponse(content) : content.trim(),
        confidence: this.extractConfidence(content)
      };
    } catch (error) {
      logger.error('Mistral invocation failed:', error);
      throw error;
    }
  }

  /**
   * Extracts JSON from markdown-wrapped or raw responses
   * Handles responses like ```json{...}``` or raw JSON
   *
   * @param content The raw response content from AI provider
   * @returns Clean JSON string ready for parsing
   */
  private extractJsonFromResponse(content: string): string {
    // First, try to extract from markdown code blocks
    const markdownJsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (markdownJsonMatch && markdownJsonMatch[1]) {
      return markdownJsonMatch[1].trim();
    }

    // Try to find JSON object or array directly in the content
    // This regex looks for content starting with { and ending with } or [ and ]
    const jsonObjectMatch = content.match(/(\{[\s\S]*\})/);
    if (jsonObjectMatch && jsonObjectMatch[1]) {
      // Validate it's likely JSON by checking for quotes and colons
      const candidate = jsonObjectMatch[1];
      if (candidate.includes('"') && candidate.includes(':')) {
        return candidate.trim();
      }
    }

    const jsonArrayMatch = content.match(/(\[[\s\S]*\])/);
    if (jsonArrayMatch && jsonArrayMatch[1]) {
      return jsonArrayMatch[1].trim();
    }

    // If no patterns match, return the original content trimmed
    // Let JSON.parse handle the validation
    return content.trim();
  }

  private extractConfidence(response: string): number {
    // ✅ PRODUCTION: JSON-first confidence extraction
    // Try 1: Parse as JSON and extract confidence field
    try {
      // First extract JSON if it's wrapped in markdown
      const cleanJson = this.extractJsonFromResponse(response);
      const json = JSON.parse(cleanJson);

      // Check for confidence field (supports both 0-1 and 0-100 formats)
      if (typeof json.confidence === 'number') {
        const confidence = json.confidence > 1 ? json.confidence / 100 : json.confidence;
        return Math.max(0, Math.min(1, confidence));
      }

      // Check for nested confidence (e.g., { result: {...}, metadata: { confidence: 0.85 } })
      if (json.metadata && typeof json.metadata.confidence === 'number') {
        const confidence = json.metadata.confidence > 1 ? json.metadata.confidence / 100 : json.metadata.confidence;
        return Math.max(0, Math.min(1, confidence));
      }
    } catch {
      // Not valid JSON, continue to regex extraction
    }

    // Try 2: Extract confidence from text using regex
    const confidenceMatch = response.match(/confidence[:\s]+(\d+(?:\.\d+)?)(%)?/i);
    if (confidenceMatch) {
      const value = parseFloat(confidenceMatch[1]);
      const isPercentage = confidenceMatch[2] === '%';
      return isPercentage ? value / 100 : (value > 1 ? value / 100 : value);
    }

    // Try 3: Heuristic-based confidence (fallback)
    const hasCitations = response.includes('based on') || response.includes('according to');
    const hasNumbers = /\d+/.test(response);
    const hasQualifiers = /uncertain|unclear|insufficient data|missing/i.test(response);

    let confidence = 0.7; // Base confidence
    if (hasCitations) confidence += 0.1;
    if (hasNumbers) confidence += 0.1;
    if (hasQualifiers) confidence -= 0.2;

    return Math.max(0.3, Math.min(0.95, confidence));
  }
}

// Export singleton instance
export const aiRouter = new AIProviderRouter();

// Export convenience functions
export async function invokeProvider(provider: AIProviderKey | "ensemble", call: RouterProviderCall): Promise<ProviderResponse> {
  return aiRouter.invokeProvider(provider, call);
}

export type TriadPayload = RouterProviderCall & {
  knowledgeQuery?: string;
  dataTask?: string;
  analysisGoal?: string;
};