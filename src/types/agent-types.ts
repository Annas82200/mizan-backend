// Agent System TypeScript Types
// Compliant with AGENT_CONTEXT_ULTIMATE.md - Strict TypeScript types for agents

import type { KnowledgeEngine } from '../ai/engines/KnowledgeEngine';
import type { DataEngine } from '../ai/engines/DataEngine';
import type { ReasoningEngine } from '../ai/engines/ReasoningEngine';

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

// Production-ready MizanAgent definition for agent-manager
export interface MizanAgent {
  id: string;
  name: string;
  type: 'structure' | 'culture' | 'skills' | 'performance' | 'hiring' | 'talent' | 'lxp' | 'bonus';
  tenantId: string;
  status: 'active' | 'inactive' | 'processing';

  // Three-Engine Architecture
  knowledgeEngine: KnowledgeEngine;
  dataEngine: DataEngine;
  reasoningEngine: ReasoningEngine;

  // Core methods
  analyze(input: AnalysisInput): Promise<AnalysisOutput>;
  process(data: Record<string, unknown>): Promise<ProcessedData>;
  generateInsights(context: KnowledgeContext): Promise<{ insights: string[]; recommendations: string[] }>;

  // Integration methods
  triggerModule?(targetModule: string, data: Record<string, unknown>): Promise<void>;
  receiveData?(sourceModule: string, data: Record<string, unknown>): Promise<void>;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Assessment type for LXP agent
export interface Assessment {
  id: string;
  tenantId: string;
  employeeId: string;
  type: 'skills' | 'culture' | 'performance' | 'talent';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  results: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

