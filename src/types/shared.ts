/**
 * Shared Type Definitions
 *
 * This file contains all core type definitions used across the application.
 * These types are inferred from database schemas and provide type safety
 * for all business logic.
 */

import {
  tenants,
  users,
  employeeProfiles,
  departments,
  companies
} from '../db/schema/core';

import {
  triggers,
  triggerExecutions
} from '../db/schema/triggers';

// ============================================================================
// DATABASE INFERRED TYPES
// ============================================================================

export type Tenant = typeof tenants.$inferSelect;
export type TenantInsert = typeof tenants.$inferInsert;

export type User = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;

export type EmployeeProfile = typeof employeeProfiles.$inferSelect;
export type EmployeeProfileInsert = typeof employeeProfiles.$inferInsert;

export type Department = typeof departments.$inferSelect;
export type DepartmentInsert = typeof departments.$inferInsert;

export type Company = typeof companies.$inferSelect;
export type CompanyInsert = typeof companies.$inferInsert;

export type Trigger = typeof triggers.$inferSelect;
export type TriggerInsert = typeof triggers.$inferInsert;

export type TriggerExecution = typeof triggerExecutions.$inferSelect;
export type TriggerExecutionInsert = typeof triggerExecutions.$inferInsert;

// ============================================================================
// COMMON INTERFACES
// ============================================================================

/**
 * Base context for all operations
 */
export interface BaseContext {
  tenantId: string;
  userId?: string;
  timestamp?: Date;
}

/**
 * Base trigger context
 */
export interface BaseTriggerContext extends BaseContext {
  triggerType: string;
  triggerData: Record<string, unknown>;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  priority: number;
}

/**
 * Analysis result from agents
 */
export interface AnalysisResult {
  success: boolean;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  roles?: string[]; // For structure analysis
  confidence?: number;
  recommendations?: string[];
}

/**
 * Unified results across all modules
 */
export interface UnifiedResults {
  tenantId: string;
  timestamp: Date;
  structure?: AnalysisResult;
  culture?: AnalysisResult;
  performance?: AnalysisResult;
  engagement?: AnalysisResult;
  recognition?: AnalysisResult;
  skills?: AnalysisResult;
  metadata?: Record<string, unknown>;
}

/**
 * Action module for workflow execution
 */
export interface ActionModule {
  id: string;
  name: string;
  type: 'workflow' | 'notification' | 'integration';
  config: Record<string, unknown>;
  enabled: boolean;
}

/**
 * Triggered action result
 */
export interface TriggeredAction {
  id: string;
  triggerId: string;
  triggerLogId: string;
  actionType: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: Record<string, unknown>;
  error?: string;
  executedAt?: Date;
}

// ============================================================================
// WORKFLOW TYPES
// ============================================================================

/**
 * Base workflow input
 */
export interface BaseWorkflowInput {
  tenantId: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Base workflow output
 */
export interface BaseWorkflowOutput {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
  errors?: string[];
}

// ============================================================================
// AGENT TYPES
// ============================================================================

/**
 * Agent configuration
 */
export interface AgentConfig {
  tenantId: string;
  agentType: string;
  config: Record<string, unknown>;
  enabled: boolean;
}

/**
 * Agent execution result
 */
export interface AgentExecutionResult {
  success: boolean;
  data: Record<string, unknown>;
  confidence: number;
  metadata?: Record<string, unknown>;
  errors?: string[];
}

// ============================================================================
// PAGINATION & FILTERING
// ============================================================================

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Make all properties optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Make specific properties required
 */
export type RequireProps<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specific properties optional
 */
export type OptionalProps<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
