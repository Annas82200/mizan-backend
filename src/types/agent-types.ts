// Agent System TypeScript Types
// Compliant with AGENT_CONTEXT_ULTIMATE.md - Strict TypeScript types for agents

export interface AgentResponse {
  content: string;
  confidence: number;
  metadata?: {
    model?: string;
    tokens?: number;
    processingTime?: number;
  };
}

export interface AnalysisInput {
  tenantId: string;
  userId?: string;
  data: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export interface AnalysisOutput {
  results: Record<string, unknown>;
  insights: string[];
  recommendations: string[];
  confidence: number;
  metadata: {
    analysisDate: Date;
    processingTime: number;
    providersUsed: string[];
  };
}

export interface FrameworkData {
  name: string;
  description: string;
  principles: string[];
  applications: string[];
  references?: string[];
}

export interface KnowledgeContext {
  frameworks: FrameworkData[];
  bestPractices: string[];
  research: string[];
  benchmarks?: Record<string, unknown>;
}

export interface ProcessedData {
  cleaned: Record<string, unknown>;
  normalized: Record<string, unknown>;
  structured: Record<string, unknown>;
  quality: {
    completeness: number;
    accuracy: number;
    consistency: number;
  };
}

export interface ReasoningResult {
  conclusion: string;
  supporting_evidence: string[];
  alternatives_considered: string[];
  confidence_factors: string[];
  limitations: string[];
}

