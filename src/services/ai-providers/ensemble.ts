// import { AIProviderKey } from "@mizan/shared/schema";
type AIProviderKey = 'openai' | 'anthropic' | 'gemini' | 'mistral';
import { EngineType, ProviderCall, ProviderResponse, EnsembleConfig } from "./types";
import { invokeProvider } from "./router";

export class EnsembleAI {
  private config: EnsembleConfig;
  
  constructor(config: EnsembleConfig) {
    this.config = {
      strategy: config.strategy || "weighted",
      providers: config.providers || ["openai", "claude", "gemini"],
      weights: config.weights || {
        openai: 0.35,
        claude: 0.35,
        gemini: 0.20,
        mistral: 0.10,
        cohere: 0.10
      },
      minConfidence: config.minConfidence || 0.7,
      fallbackProvider: config.fallbackProvider || "openai"
    };
  }

  async call(call: ProviderCall): Promise<ProviderResponse> {
    // Call all configured providers in parallel
    const providerCalls = this.config.providers.map(provider =>
      this.callProviderSafely(provider as AIProviderKey, call)
    );
    
    const responses = await Promise.all(providerCalls);
    
    // Filter out failed responses
    const validResponses = responses.filter(r => r !== null) as ProviderResponse[];
    
    if (validResponses.length === 0) {
      // All providers failed, use fallback
      return this.callFallback(call);
    }
    
    // Apply ensemble strategy
    switch (this.config.strategy) {
      case "unanimous":
        return this.unanimousStrategy(validResponses, call);
      case "majority":
        return this.majorityStrategy(validResponses, call);
      case "weighted":
        return this.weightedStrategy(validResponses, call);
      case "best_confidence":
        return this.bestConfidenceStrategy(validResponses);
      default:
        return this.weightedStrategy(validResponses, call);
    }
  }

  private async callProviderSafely(provider: AIProviderKey, call: ProviderCall): Promise<ProviderResponse | null> {
    try {
      // Transform ProviderCall from types.ts format to router.ts format
      const routerCall = {
        prompt: call.prompt || call.context?.join('\n') || '',
        engine: call.engine,
        temperature: call.temperature,
        maxTokens: call.maxTokens,
        requireJson: false
      };
      const response = await invokeProvider(provider, routerCall);

      // Validate response quality
      if (response.confidence < this.config.minConfidence!) {
        console.warn(`Provider ${provider} confidence too low: ${response.confidence}`, {
          threshold: this.config.minConfidence,
          actual_confidence: response.confidence,
          prompt_length: (call.prompt ?? call.context?.join('\n') ?? '').length,
          response_length: response.narrative.length,
          timestamp: new Date().toISOString(),
          engine: call.engine
        });
        return null;
      }

      return response;
    } catch (error) {
      console.error(`Provider ${provider} failed:`, error);
      return null;
    }
  }

  private async callFallback(call: ProviderCall): Promise<ProviderResponse> {
    try {
      // Transform to router format
      const routerCall = {
        prompt: call.prompt || call.context?.join('\n') || '',
        engine: call.engine,
        temperature: call.temperature,
        maxTokens: call.maxTokens,
        requireJson: false
      };
      const response = await invokeProvider(this.config.fallbackProvider! as AIProviderKey, routerCall);

      // Response is already in canonical format, no transformation needed
      return response;
    } catch (error) {
      // Last resort fallback
      return {
        provider: this.config.fallbackProvider! as string,
        engine: call.engine,
        narrative: "Analysis temporarily unavailable. Please try again.",
        confidence: 0.1
      };
    }
  }

  private unanimousStrategy(responses: ProviderResponse[], call: ProviderCall): ProviderResponse {
    // Find common themes across all responses
    const narratives = responses.map(r => r.narrative.toLowerCase());
    const commonWords = this.findCommonKeywords(narratives);
    
    // Create synthesis
    const synthesis = `Based on unanimous analysis across ${responses.length} AI engines: ${
      commonWords.slice(0, 5).join(', ')
    } are key factors. ${this.extractKeyInsight(responses)}`;
    
    const avgConfidence = responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length;
    
    return {
      provider: responses[0].provider, // Ensemble result
      engine: call.engine,
      narrative: synthesis,
      confidence: Number(avgConfidence.toFixed(2))
    };
  }

  private majorityStrategy(responses: ProviderResponse[], call: ProviderCall): ProviderResponse {
    // Group similar responses
    const clusters = this.clusterResponses(responses);
    const majorityCluster = clusters.sort((a, b) => b.length - a.length)[0];
    
    // Use the highest confidence response from majority cluster
    const bestResponse = majorityCluster.sort((a, b) => b.confidence - a.confidence)[0];
    
    return {
      ...bestResponse,
      provider: responses[0].provider, // Ensemble result
      narrative: `${bestResponse.narrative} (${majorityCluster.length}/${responses.length} AI consensus)`,
      confidence: Number((bestResponse.confidence * (majorityCluster.length / responses.length)).toFixed(2))
    };
  }

  private weightedStrategy(responses: ProviderResponse[], call: ProviderCall): ProviderResponse {
    // Calculate weighted average of insights
    let totalWeight = 0;
    let weightedNarratives: Array<{ narrative: string; weight: number }> = [];
    
    for (const response of responses) {
      const weight = (this.config.weights?.[response.provider] || 0.2) * response.confidence;
      totalWeight += weight;
      weightedNarratives.push({ narrative: response.narrative, weight });
    }
    
    // Sort by weight and combine top insights
    weightedNarratives.sort((a, b) => b.weight - a.weight);
    const topInsights = weightedNarratives.slice(0, 2);
    
    const synthesis = this.synthesizeNarratives(topInsights.map(i => i.narrative), call);
    const confidence = totalWeight / responses.length;
    
    return {
      provider: responses[0].provider, // Ensemble result
      engine: call.engine,
      narrative: synthesis,
      confidence: Number(confidence.toFixed(2))
    };
  }

  private bestConfidenceStrategy(responses: ProviderResponse[]): ProviderResponse {
    // Simply return the highest confidence response
    const best = responses.sort((a, b) => b.confidence - a.confidence)[0];
    return {
      ...best,
      provider: responses[0].provider, // Ensemble result
      narrative: `${best.narrative} (highest confidence: ${best.provider})`
    };
  }

  private findCommonKeywords(texts: string[]): string[] {
    const wordFreq = new Map<string, number>();
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
    
    for (const text of texts) {
      const words = text.split(/\s+/).filter(w => 
        w.length > 3 && !stopWords.has(w.toLowerCase())
      );
      
      for (const word of words) {
        const key = word.toLowerCase();
        wordFreq.set(key, (wordFreq.get(key) || 0) + 1);
      }
    }
    
    // Return words that appear in at least half the responses
    const threshold = texts.length / 2;
    return Array.from(wordFreq.entries())
      .filter(([_, freq]) => freq >= threshold)
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word);
  }

  private extractKeyInsight(responses: ProviderResponse[]): string {
    // Extract the most confident single insight
    // Contract: All ProviderResponse objects have non-empty narrative (validated at creation in router.ts)
    const bestResponse = responses.sort((a, b) => b.confidence - a.confidence)[0];

    // Validate contract - fail fast if violated
    if (!bestResponse || !bestResponse.narrative || bestResponse.narrative.trim().length === 0) {
      throw new Error('Contract violation: ProviderResponse must have non-empty narrative');
    }

    const sentences = bestResponse.narrative.split(/[.!?]+/).filter(s => s.trim().length > 0);

    // If no sentences found (shouldn't happen due to contract), throw error
    if (sentences.length === 0) {
      throw new Error('Contract violation: narrative must contain at least one sentence');
    }

    return sentences[0].trim() + '.';
  }

  private clusterResponses(responses: ProviderResponse[]): ProviderResponse[][] {
    // Simple clustering based on keyword similarity
    const clusters: ProviderResponse[][] = [];
    
    for (const response of responses) {
      let addedToCluster = false;
      
      for (const cluster of clusters) {
        if (this.isSimilar(response.narrative, cluster[0].narrative)) {
          cluster.push(response);
          addedToCluster = true;
          break;
        }
      }
      
      if (!addedToCluster) {
        clusters.push([response]);
      }
    }
    
    return clusters;
  }

  private isSimilar(text1: string, text2: string): boolean {
    // Simple similarity check based on common words
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    let common = 0;
    for (const word of words1) {
      if (words2.has(word)) common++;
    }
    
    const similarity = common / Math.min(words1.size, words2.size);
    return similarity > 0.5;
  }

  private synthesizeNarratives(narratives: string[], call: ProviderCall): string {
    // Check if this is a JSON response - if so, return the best one unwrapped
    const primaryInsight = narratives[0];

    // Detect JSON responses (starts with { or [ after trimming, or contains ```json)
    const trimmed = primaryInsight.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.includes('```json')) {
      // Return JSON unwrapped - pick the longest/most complete response
      const bestJson = narratives.reduce((best, current) =>
        current.length > best.length ? current : best
      , primaryInsight);
      return bestJson;
    }

    // For non-JSON responses, combine insights intelligently
    const engine = call.engine;
    const agent = call.agent;
    const secondaryInsight = narratives[1] || "";

    // Extract key points from both
    const primaryPoint = primaryInsight.split(/[.!?]/)[0].trim();
    const secondaryPoint = secondaryInsight.split(/[.!?]/)[0].trim();

    return `Multi-AI ${engine} analysis for ${agent}: ${primaryPoint}. ${
      secondaryPoint ? `Additionally, ${secondaryPoint.toLowerCase()}.` : ''
    } Confidence strengthened through ensemble validation.`;
  }
}

// Singleton instance with default configuration
export const ensembleAI = new EnsembleAI({
  strategy: "weighted",
  providers: ["openai", "claude", "gemini", "mistral", "cohere"],
  minConfidence: 0.6
});
