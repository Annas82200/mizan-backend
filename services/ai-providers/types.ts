import { AIProviderKey } from "@mizan/shared/schema";

export type EngineType = "knowledge" | "data" | "reasoning";

export type ProviderCall = {
  agent: string;
  engine: EngineType;
  tenantId?: string;
  signalStrength?: number; // 0..1
  focusCylinder?: number; // values cylinder 1..7
  prompt?: string;
  context?: string[];
  temperature?: number; // 0..1, for fine-tuning creativity
  maxTokens?: number;
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
  weights?: Record<AIProviderKey, number>; // For weighted strategy
  minConfidence?: number; // Minimum acceptable confidence
  fallbackProvider?: AIProviderKey;
};
