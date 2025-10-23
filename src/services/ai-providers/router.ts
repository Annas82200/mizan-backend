// server/services/ai-providers/router.ts

import { OpenAI } from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import MistralClient from "@mistralai/mistralai";
import { ProviderResponse, AIProviderKey, EngineType } from './types';

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

class AIProviderRouter {
  private openai: OpenAI;
  private anthropic: Anthropic;
  private gemini: GoogleGenerativeAI;
  private mistral: MistralClient;

  // Timeout configuration for AI requests
  // Increased to 120 seconds to allow comprehensive framework analysis
  private readonly AI_REQUEST_TIMEOUT = 120000; // 120 seconds (2 minutes)

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: this.AI_REQUEST_TIMEOUT
    });
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: this.AI_REQUEST_TIMEOUT
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
            content: "You are a fact-based analyst. Provide accurate, evidence-based responses."
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
        narrative: call.requireJson ? JSON.parse(content) : content.trim(),
        confidence: this.extractConfidence(content),
        usage: usage ? {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalCost: 0  // Cost calculation handled by billing service if needed
        } : undefined
      };
    } catch (error) {
      console.error('OpenAI invocation failed:', error);
      throw error;
    }
  }

  private async invokeAnthropic(call: RouterProviderCall): Promise<ProviderResponse> {
    try {
      const response = await this.anthropic.messages.create({
        model: call.model || "claude-sonnet-4-5",
        messages: [
          {
            role: "user",
            content: call.prompt + (call.requireJson ? "\nReturn response as valid JSON." : "")
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
        narrative: call.requireJson ? JSON.parse(content) : content.trim(),
        confidence: this.extractConfidence(content)
      };
    } catch (error) {
      console.error('Anthropic invocation failed:', error);
      throw error;
    }
  }

  private async invokeGemini(call: RouterProviderCall): Promise<ProviderResponse> {
    // Gemini doesn't support timeout in SDK, so we use AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.AI_REQUEST_TIMEOUT);

    try {
      const model = this.gemini.getGenerativeModel({
        model: call.model || "gemini-2.5-flash"  // Current Gemini 2.5 model (faster, cheaper than pro)
      });

      // Note: Google SDK doesn't support AbortSignal directly, but timeout is handled by promise race
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

      const result = (await Promise.race([
        generatePromise,
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () =>
            reject(new Error('Gemini request timeout after 120 seconds'))
          );
        })
      ])) as GeminiGenerateContentResponse;

      clearTimeout(timeoutId);
      const content = result.response.text();

      // ✅ Validate content exists before creating response (fail-fast, not defensive)
      if (!content || content.trim().length === 0) {
        throw new Error('Gemini returned empty content');
      }

      return {
        provider: 'gemini',
        engine: call.engine,
        narrative: call.requireJson ? JSON.parse(content) : content.trim(),
        confidence: this.extractConfidence(content)
      };
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Gemini invocation failed:', error);
      throw error;
    }
  }

  private async invokeMistral(call: RouterProviderCall): Promise<ProviderResponse> {
    // Mistral doesn't support timeout in SDK, so we use AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.AI_REQUEST_TIMEOUT);

    try {
      const chatPromise = this.mistral.chat({
        model: call.model || "mistral-large-latest",
        messages: [{ role: "user", content: call.prompt }],
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

      const response = (await Promise.race([
        chatPromise,
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () =>
            reject(new Error('Mistral request timeout after 120 seconds'))
          );
        })
      ])) as MistralChatResponse;

      clearTimeout(timeoutId);
      const content = response.choices[0].message.content;

      // ✅ Validate content exists before creating response (fail-fast, not defensive)
      if (!content || content.trim().length === 0) {
        throw new Error('Mistral returned empty content');
      }

      return {
        provider: 'mistral',
        engine: call.engine,
        narrative: call.requireJson ? JSON.parse(content) : content.trim(),
        confidence: this.extractConfidence(content)
      };
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Mistral invocation failed:', error);
      throw error;
    }
  }

  private extractConfidence(response: string): number {
    // Extract confidence from response if mentioned
    const confidenceMatch = response.match(/confidence[:\s]+(\d+)%/i);
    if (confidenceMatch) {
      return parseInt(confidenceMatch[1]) / 100;
    }
    
    // Default confidence based on response characteristics
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