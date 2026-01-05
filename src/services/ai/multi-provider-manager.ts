/**
 * Multi-Provider AI Manager
 * Manages multiple AI provider integrations (OpenAI, Anthropic, Google, etc.)
 * Uses the existing EnsembleAI infrastructure for actual AI calls
 */

import { EnsembleAI } from '../ai-providers/ensemble';
import { ProviderCall, ProviderResponse } from '../ai-providers/types';

export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  providers?: string[];
  strategy?: 'weighted' | 'unanimous' | 'majority' | 'best_confidence';
}

export class MultiProviderManager {
  private defaultEnsemble: EnsembleAI;

  constructor() {
    // Initialize with default configuration
    this.defaultEnsemble = new EnsembleAI({
      strategy: 'weighted',
      providers: ['anthropic', 'openai', 'gemini'],
      weights: {
        anthropic: 0.4,
        openai: 0.35,
        gemini: 0.25
      },
      minConfidence: 0.7,
      fallbackProvider: 'anthropic'
    });
  }

  /**
   * Generate content using the ensemble of AI providers
   */
  async generate(prompt: string, options?: GenerationOptions): Promise<string> {
    const call: ProviderCall = {
      agent: 'MultiProviderManager',
      engine: 'knowledge',
      tenantId: 'default',
      prompt,
      temperature: options?.temperature || 0.7,
      maxTokens: options?.maxTokens || 2000,
      context: []
    };

    let ensemble: EnsembleAI;

    // Create custom ensemble if specific providers requested
    if (options?.providers && options.providers.length > 0) {
      ensemble = new EnsembleAI({
        strategy: options.strategy || 'weighted',
        providers: options.providers,
        minConfidence: 0.7,
        fallbackProvider: options.providers[0]
      });
    } else {
      ensemble = this.defaultEnsemble;
    }

    const response = await ensemble.call(call);
    return response.narrative;
  }

  /**
   * Generate with explicit fallback chain of providers
   * Tries providers in order until one succeeds
   */
  async generateWithFallback(prompt: string, providers: string[]): Promise<string> {
    if (!providers || providers.length === 0) {
      throw new Error('At least one provider must be specified for fallback generation');
    }

    // Try each provider in sequence
    for (const provider of providers) {
      try {
        const ensemble = new EnsembleAI({
          strategy: 'best_confidence',
          providers: [provider],
          minConfidence: 0.5, // Lower threshold for fallback
          fallbackProvider: provider
        });

        const call: ProviderCall = {
          agent: 'MultiProviderManager',
          engine: 'knowledge',
          tenantId: 'default',
          prompt,
          temperature: 0.7,
          maxTokens: 2000,
          context: []
        };

        const response = await ensemble.call(call);

        // If we got a valid response, return it
        if (response.confidence >= 0.5) {
          return response.narrative;
        }
      } catch (error) {
        logger.warn(`Provider ${provider} failed, trying next provider:`, error);
        // Continue to next provider
      }
    }

    // All providers failed
    throw new Error(`All providers failed: ${providers.join(', ')}`);
  }

  /**
   * Generate with best-of-N strategy
   * Calls multiple providers and returns the highest confidence response
   */
  async generateBestOf(prompt: string, providers: string[], n: number = 3): Promise<{ content: string; confidence: number; provider: string }> {
    if (n < 1 || n > providers.length) {
      n = Math.min(3, providers.length);
    }

    const selectedProviders = providers.slice(0, n);

    const ensemble = new EnsembleAI({
      strategy: 'best_confidence',
      providers: selectedProviders,
      minConfidence: 0.6,
      fallbackProvider: selectedProviders[0]
    });

    const call: ProviderCall = {
      agent: 'MultiProviderManager',
      engine: 'knowledge',
      tenantId: 'default',
      prompt,
      temperature: 0.7,
      maxTokens: 2000,
      context: []
    };

    const response = await ensemble.call(call);

    return {
      content: response.narrative,
      confidence: response.confidence,
      provider: response.provider
    };
  }

  /**
   * Generate with consensus requirement
   * All providers must agree (within similarity threshold)
   */
  async generateWithConsensus(prompt: string, providers: string[]): Promise<string> {
    const ensemble = new EnsembleAI({
      strategy: 'unanimous',
      providers: providers.length > 0 ? providers : ['anthropic', 'openai', 'gemini'],
      minConfidence: 0.75,
      fallbackProvider: providers[0] || 'anthropic'
    });

    const call: ProviderCall = {
      agent: 'MultiProviderManager',
      engine: 'reasoning',
      tenantId: 'default',
      prompt,
      temperature: 0.5, // Lower temperature for more consistent results
      maxTokens: 2000,
      context: []
    };

    const response = await ensemble.call(call);
    return response.narrative;
  }

  /**
   * Stream generation from a specific provider
   * Note: Streaming support would need to be added to the router layer
   */
  async generateStream(prompt: string, provider: string, onChunk: (chunk: string) => void): Promise<void> {
    // Current implementation generates full response and returns it as a single chunk
    // Streaming functionality requires WebSocket or SSE support in the router layer
    const content = await this.generate(prompt, { providers: [provider] });
    onChunk(content);
  }
}
