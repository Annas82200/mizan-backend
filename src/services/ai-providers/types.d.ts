export type AIProviderKey = 'openai' | 'anthropic' | 'gemini' | 'mistral' | 'claude' | 'gpt-4' | 'cohere' | string;
export type EngineType = "knowledge" | "data" | "reasoning";
export type ProviderCall = {
    agent: string;
    engine: EngineType;
    tenantId?: string;
    signalStrength?: number;
    focusCylinder?: number;
    prompt?: string;
    context?: string[];
    temperature?: number;
    maxTokens?: number;
    requireJson?: boolean;
};
export type ProviderResponse = {
    provider: AIProviderKey;
    engine: EngineType;
    narrative: string;
    confidence: number;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalCost?: number;
    };
};
export type EnsembleStrategy = "unanimous" | "majority" | "weighted" | "best_confidence";
export type EnsembleConfig = {
    strategy: EnsembleStrategy;
    providers: AIProviderKey[];
    weights?: Record<AIProviderKey, number>;
    minConfidence?: number;
    agentThresholds?: Record<string, number>;
    fallbackProvider?: AIProviderKey;
};
//# sourceMappingURL=types.d.ts.map