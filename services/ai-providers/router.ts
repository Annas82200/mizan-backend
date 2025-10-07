// server/services/ai-providers/router.ts

import { OpenAI } from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import MistralClient from "@mistralai/mistralai";

export type AIProviderKey = 'openai' | 'anthropic' | 'gemini' | 'mistral';

export interface ProviderCall {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  requireJson?: boolean;
}

export interface ProviderResponse {
  provider: AIProviderKey;
  response: any;
  confidence: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Moved to bottom of file to avoid duplicate
// export interface TriadPayload extends ProviderCall {
//   knowledgeQuery?: string;
//   dataTask?: string;
//   analysisGoal?: string;
// }

class AIProviderRouter {
  private openai: OpenAI;
  private anthropic: Anthropic;
  private gemini: GoogleGenerativeAI;
  private mistral: MistralClient;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    this.mistral = new MistralClient(process.env.MISTRAL_API_KEY!);
  }

  async invokeProvider(provider: AIProviderKey | "ensemble", call: ProviderCall): Promise<ProviderResponse> {
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

  private async invokeEnsemble(call: ProviderCall): Promise<ProviderResponse> {
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

  private async invokeOpenAI(call: ProviderCall): Promise<ProviderResponse> {
    try {
      const response = await this.openai.chat.completions.create({
        model: call.model || "gpt-4-turbo-preview",
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

      const content = response.choices[0].message.content!;
      const usage = response.usage;

      return {
        provider: 'openai',
        response: call.requireJson ? JSON.parse(content) : content,
        confidence: this.extractConfidence(content),
        usage: usage ? {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens
        } : undefined
      };
    } catch (error) {
      console.error('OpenAI invocation failed:', error);
      throw error;
    }
  }

  private async invokeAnthropic(call: ProviderCall): Promise<ProviderResponse> {
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

      return {
        provider: 'anthropic',
        response: call.requireJson ? JSON.parse(content) : content,
        confidence: this.extractConfidence(content)
      };
    } catch (error) {
      console.error('Anthropic invocation failed:', error);
      throw error;
    }
  }

  private async invokeGemini(call: ProviderCall): Promise<ProviderResponse> {
    try {
      const model = this.gemini.getGenerativeModel({ 
        model: call.model || "gemini-pro" 
      });
      
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: call.prompt }] }],
        generationConfig: {
          temperature: call.temperature || 0.1,
          maxOutputTokens: call.maxTokens || 4000
        }
      });

      const content = result.response.text();

  return { 
        provider: 'gemini',
        response: call.requireJson ? JSON.parse(content) : content,
        confidence: this.extractConfidence(content)
      };
    } catch (error) {
      console.error('Gemini invocation failed:', error);
      throw error;
    }
  }

  private async invokeMistral(call: ProviderCall): Promise<ProviderResponse> {
    try {
      const response = await this.mistral.chat({
        model: call.model || "mistral-large-latest",
        messages: [{ role: "user", content: call.prompt }],
        temperature: call.temperature || 0.1,
        maxTokens: call.maxTokens || 4000
      });

      const content = response.choices[0].message.content;

      return {
        provider: 'mistral',
        response: call.requireJson ? JSON.parse(content) : content,
        confidence: this.extractConfidence(content)
      };
    } catch (error) {
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
export async function invokeProvider(provider: AIProviderKey | "ensemble", call: ProviderCall): Promise<ProviderResponse> {
  return aiRouter.invokeProvider(provider, call);
}

export type TriadPayload = ProviderCall & {
  knowledgeQuery?: string;
  dataTask?: string;
  analysisGoal?: string;
};