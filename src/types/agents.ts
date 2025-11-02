/**
 * Agent Type Definitions
 *
 * All types related to AI agents and their configurations
 */

import { AgentConfig, AgentExecutionResult } from './shared';

// ============================================================================
// THREE ENGINE AGENT TYPES
// ============================================================================

/**
 * Configuration for a single AI engine
 */
export interface EngineConfig {
  providers: ReadonlyArray<'openai' | 'anthropic' | 'google'>;
  model?: string;  // Optional: Ignored in multi-provider mode, each provider uses its default
  temperature: number;
  maxTokens: number;
}

/**
 * Configuration for the three-engine system
 */
export interface ThreeEngineConfig {
  knowledge: EngineConfig;
  data: EngineConfig;
  reasoning: EngineConfig;
  consensusThreshold: number;
}

/**
 * Result from a single engine
 */
export interface EngineResult<T = unknown> {
  engine: 'knowledge' | 'data' | 'reasoning';
  output: T;
  confidence: number;
  metadata?: Record<string, unknown>;
}

/**
 * Combined result from all three engines
 */
export interface ThreeEngineAnalysisResult<T = unknown> {
  knowledge: EngineResult<T>;
  data: EngineResult<T>;
  reasoning: EngineResult<T>;
  overallConfidence: number;
  consensus: boolean;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// AGENT-SPECIFIC TYPES
// ============================================================================

/**
 * Structure Agent Analysis
 */
export interface StructureAnalysisInput {
  tenantId: string;
  companyId?: string;
  analysisType?: 'comprehensive' | 'quick' | 'departmental';
  focusAreas?: string[];
}

export interface StructureAnalysisResult {
  success: boolean;
  data: {
    currentStructure: Record<string, unknown>;
    recommendations: string[];
    inefficiencies: string[];
    roles?: string[];
  };
  confidence: number;
  metadata?: Record<string, unknown>;
}

/**
 * Culture Agent Analysis
 */
export interface CultureAnalysisInput {
  tenantId: string;
  companyId?: string;
  analysisScope?: 'organization' | 'department' | 'team';
}

export interface CultureAnalysisResult {
  success: boolean;
  cultureDimensions: {
    collaboration: number;
    innovation: number;
    accountability: number;
    growth: number;
    inclusion: number;
    wellbeing: number;
    integrity: number;
  };
  strengths: string[];
  challenges: string[];
  recommendations: string[];
  confidence: number;
}

/**
 * Skills Agent Analysis
 */
export interface SkillsAnalysisInput {
  tenantId: string;
  employeeId?: string;
  departmentId?: string;
  analysisType?: 'individual' | 'team' | 'organization';
}

export interface SkillsAnalysisResult {
  success: boolean;
  skillInventory: Array<{
    skillName: string;
    category: string;
    currentLevel: number;
    targetLevel: number;
    gap: number;
  }>;
  recommendations: string[];
  trainingNeeds: string[];
  confidence: number;
}

/**
 * Recognition Agent Analysis
 */
export interface RecognitionAnalysisInput {
  tenantId: string;
  employeeId?: string;
  period?: {
    start: Date;
    end: Date;
  };
}

export interface RecognitionAnalysisResult {
  success: boolean;
  recognitionMetrics: {
    peer: { count: number; satisfaction: number };
    manager: { count: number; satisfaction: number };
    formal: { count: number; satisfaction: number };
    informal: { count: number; satisfaction: number };
    public: { count: number; satisfaction: number };
  };
  recommendations: string[];
  confidence: number;
}

/**
 * Engagement Agent Analysis
 */
export interface EngagementAnalysisInput {
  tenantId: string;
  scope?: 'individual' | 'team' | 'department' | 'organization';
  targetId?: string;
}

export interface EngagementAnalysisResult {
  success: boolean;
  engagementScore: number;
  factors: Record<string, number>;
  trends: Array<{
    factor: string;
    trend: 'improving' | 'declining' | 'stable';
    change: number;
  }>;
  recommendations: string[];
  confidence: number;
}

// ============================================================================
// AGENT MANAGER TYPES
// ============================================================================

export interface AgentManagerConfig {
  tenantId: string;
  enabledAgents: string[];
  defaultConfigs: Record<string, ThreeEngineConfig>;
}

export interface AgentExecutionOptions {
  timeout?: number;
  retryCount?: number;
  cacheResults?: boolean;
}

// ============================================================================
// PROVIDER TYPES
// ============================================================================

export type AIProvider = 'openai' | 'anthropic' | 'google';

export interface ProviderCall {
  prompt: string;
  temperature: number;
  maxTokens: number;
  requireJson?: boolean;
  context?: string[];
  engine?: 'knowledge' | 'data' | 'reasoning';
}

export interface ProviderResponse {
  provider: AIProvider;
  engine?: 'knowledge' | 'data' | 'reasoning';
  narrative: string;
  confidence: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================================================
// ENSEMBLE TYPES
// ============================================================================

export interface EnsembleConfig {
  providers: AIProvider[];
  votingStrategy: 'majority' | 'weighted' | 'unanimous';
  minAgreement: number;
}

export interface EnsembleResult<T = unknown> {
  consensus: boolean;
  confidence: number;
  result: T;
  providerResults: Array<{
    provider: AIProvider;
    result: T;
    confidence: number;
  }>;
}
