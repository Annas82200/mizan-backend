// Trigger Engine TypeScript Types
// Replaces 'any' types with proper interfaces for trigger system

export interface TriggerConfig {
  threshold?: number;
  criteria?: Record<string, unknown>;
  targetModule?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  conditions?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
}

export interface TriggerData {
  sourceModule: string;
  sourceId?: string;
  analysisResults?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  timestamp?: string;
  [key: string]: unknown;
}

export interface TriggerAction {
  type: string;
  target: string;
  params?: Record<string, unknown>;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface LXPModuleResult {
  success: boolean;
  message: string;
  data?: {
    learningPathsCreated?: number;
    coursesAssigned?: number;
    employeesAffected?: string[];
    [key: string]: unknown;
  };
}

export interface HiringModuleResult {
  success: boolean;
  message: string;
  data?: {
    requisitionsCreated?: number;
    positionsOpen?: number;
    [key: string]: unknown;
  };
}

export interface TriggerExecutionLog {
  triggerId: string;
  executionId: string;
  timestamp: Date;
  status: 'success' | 'failed' | 'partial';
  result: Record<string, unknown>;
  error?: string;
}

