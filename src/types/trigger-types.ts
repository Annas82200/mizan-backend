/**
 * Trigger Engine Type Definitions
 * Complete TypeScript types for trigger-engine.ts
 * NO ANY TYPES - PRODUCTION READY
 * Compliant with AGENT_CONTEXT_ULTIMATE.md
 */

import { UnifiedResults } from '../services/results/unified-results.js';

// ============================================================================
// CORE TRIGGER TYPES
// ============================================================================

export interface TriggerConfig {
  threshold?: number;
  minScore?: number;
  maxScore?: number;
  daysBeforeExpiry?: number;
  daysSinceLastReview?: number;
  daysSinceLastCheckin?: number;
  probationDays?: number;
  requiredTraining?: string[];
  safetyModules?: string[];
  certificationTypes?: string[];
  requirements?: string[];
  teamSize?: number;
  teamId?: string;
  departmentId?: string;
  tenantId?: string;
  priority?: 'high' | 'medium' | 'low';
  enabled?: boolean;
  conditions?: TriggerCondition[];
  actions?: TriggerAction[];
  metadata?: Record<string, unknown>;
  criteria?: Record<string, unknown>;
  targetModule?: string;
  parameters?: Record<string, unknown>;
  targetId?: string;
  employeeId?: string;
  data?: Record<string, unknown>;
  alignmentThreshold?: number;
  optimalThreshold?: number;
  inflationThreshold?: number;
  performanceThreshold?: number;
  perfectPerformanceThreshold?: number;
  exceptionalPerformanceThreshold?: number;
  improvementThreshold?: number;
  reviewPeriod?: string;
  advanceNoticeDays?: number;
  reminderDays?: number[];
  checkinType?: string;
  probationPeriod?: string;
  evaluationType?: string;
  trainingType?: string;
  moduleType?: string;
  [key: string]: unknown;
}

export interface TriggerCondition {
  field: string;
  operator: 'equals' | 'greater' | 'less' | 'contains' | 'exists';
  value: string | number | boolean;
}

export interface TriggerAction {
  type: string;
  module: string;
  target?: string;
  params?: Record<string, unknown>;
  priority?: 'high' | 'medium' | 'low' | 'critical';
}

export interface DatabaseTrigger {
  id: string;
  name: string;
  type: string;
  config: TriggerConfig;
  isActive: boolean;
  tenantId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TriggerResult {
  id: string;
  triggerId: string;
  reason: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  data: TriggerResultData;
  executed: boolean;
}

export interface TriggerResultData {
  module?: string;
  message?: string;
  upgradeUrl?: string;
  gaps?: string[];
  skillsScore?: number;
  cultureScore?: number;
  structureScore?: number;
  recommendations?: Array<{
    id?: string;
    title: string;
    description: string;
    category: string;
    priority?: string;
  }>;
  employees?: Array<{
    id: string;
    name: string;
    email: string;
    department?: string;
    skill?: string;
    gap?: number;
  }>;
  hiringRecommendations?: Array<{
    position?: string;
    department?: string;
    priority?: string;
    title?: string;
    description?: string;
    category?: string;
  }>;
  learningPaths?: Array<{
    id?: string;
    name?: string;
    duration?: string;
    skills?: string[];
    employeeId?: string;
    path?: string;
  }>;
  performanceData?: {
    score?: number;
    rating?: string;
    goals?: string[];
    feedback?: string[];
    employeeId?: string;
    period?: string;
  };
  complianceData?: {
    dueDate?: string;
    modules?: string[];
    completionStatus?: Record<string, boolean>;
    employees?: Array<{
      id: string;
      name: string;
      status: string;
    }>;
  };
  certificationData?: {
    expiryDate?: string;
    certifications?: Array<{
      name: string;
      expiry: string;
      status: string;
      employeeId?: string;
    }>;
  };
  teamData?: {
    size?: number;
    changes?: Array<{
      type: 'addition' | 'removal' | 'transfer';
      employee: string;
      date: string;
    }>;
    teamId?: string;
    departmentId?: string;
  };
  successionData?: {
    role?: string;
    candidates?: Array<{
      id: string;
      name: string;
      readiness: number;
    }>;
    criticalRoles?: string[];
  };
  riskData?: {
    type?: 'flight' | 'skill_obsolescence' | 'leadership_gap';
    riskLevel?: 'high' | 'medium' | 'low';
    employees?: string[];
    mitigation?: string[];
    indicators?: Record<string, number>;
  };
  onboardingData?: {
    employeeId?: string;
    completionRate?: number;
    remainingTasks?: string[];
  };
  trainingData?: {
    employeeId?: string;
    coursesCompleted?: string[];
    coursesRemaining?: string[];
    completionRate?: number;
  };
  [key: string]: unknown; // Allow for additional fields while maintaining type safety
}

export interface TriggerData {
  sourceModule: string;
  sourceId?: string;
  analysisResults?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  timestamp?: string;
  [key: string]: unknown;
}

// ============================================================================
// MODULE-SPECIFIC TYPES
// ============================================================================

export interface LXPModuleResult {
  success: boolean;
  action: string;
  confidence: number;
  message?: string;
  data: {
    learningPathsCreated?: number;
    coursesAssigned?: number;
    employeesAffected?: string[];
    learningPaths?: Array<{
      id: string;
      employeeId: string;
      path: string;
      duration: string;
    }>;
    [key: string]: unknown;
  };
  error?: string;
  nextTriggers: string[];
}

export interface HiringModuleResult {
  success: boolean;
  action: string;
  confidence?: number;
  message?: string;
  data: {
    requisitionsCreated?: number;
    positionsOpen?: number;
    jobPostings?: Array<{
      id: string;
      title: string;
      department: string;
    }>;
    [key: string]: unknown;
  };
  nextTriggers?: string[];
}

export interface HiringTriggerContext {
  triggerType: string;
  tenantId: string;
  data: TriggerConfig;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';
}

// ============================================================================
// TRIGGER HANDLER TYPES
// ============================================================================

export type TriggerHandlerFunction = (
  trigger: DatabaseTrigger,
  results: UnifiedResults,
  config: TriggerConfig
) => TriggerResult | null;

export type AsyncTriggerHandlerFunction = (
  trigger: DatabaseTrigger,
  results: UnifiedResults,
  config: TriggerConfig
) => Promise<TriggerResult | null>;

// ============================================================================
// MODULE STATUS TYPES
// ============================================================================

export interface ModuleStatus {
  status: 'active' | 'inactive' | 'initializing' | 'error';
  healthy?: boolean;
  lastActivity?: Date;
  errorMessage?: string;
}

export interface ModuleHealthCheck {
  healthy: boolean;
  status?: string;
  message?: string;
}

// ============================================================================
// TRIGGER EXECUTION TYPES
// ============================================================================

export interface TriggerExecutionLog {
  id?: string;
  triggerId: string;
  triggerType?: string;
  executionId?: string;
  executedAt: Date;
  timestamp?: Date;
  status: 'success' | 'failed' | 'partial';
  success?: boolean;
  result?: TriggerResult | Record<string, unknown>;
  error?: string;
  tenantId: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// TRIGGER TYPE CONSTANTS
// ============================================================================

export const LXP_TRIGGER_TYPES = [
  'skill_gaps_critical',
  'culture_learning_needed',
  'employee_skill_gap',
  'performance_perfect_lxp',
  'performance_improvement_lxp',
  'compliance_training_due',
  'safety_training_expired',
  'certification_expiring',
  'legal_requirement_change',
  'proactive_training',
  'lxp_training_completion',
  'training_completion',
  'onboarding_completion'
] as const;

export const HIRING_TRIGGER_TYPES = [
  'hiring_needs_urgent',
  'structure_analysis_expansion',
  'candidate_applied',
  'interview_completed',
  'offer_accepted',
  'candidate_screening_required',
  'interview_scheduling_required',
  'offer_generation_required'
] as const;

export const PERFORMANCE_TRIGGER_TYPES = [
  'culture_goals_needed',
  'engagement_intervention_needed',
  'recognition_program_needed',
  'performance_review_due',
  'goal_setting_required',
  'feedback_collection_needed'
] as const;

export const GENERAL_TRIGGER_TYPES = [
  'culture_alignment_optimal',
  'structure_optimal',
  'structure_inflated',
  'candidate_hired',
  'lxp_completed',
  'performance_reward',
  'performance_lxp',
  'performance_talent_succession',
  'performance_improvement_lxp',
  'annual_performance_review',
  'quarterly_checkin',
  'probation_period_ending',
  'team_size_changes',
  'succession_plan_activation',
  'flight_risk_prediction',
  'skill_obsolescence_risk',
  'leadership_gap_prediction'
] as const;

export type LXPTriggerType = typeof LXP_TRIGGER_TYPES[number];
export type HiringTriggerType = typeof HIRING_TRIGGER_TYPES[number];
export type PerformanceTriggerType = typeof PERFORMANCE_TRIGGER_TYPES[number];
export type GeneralTriggerType = typeof GENERAL_TRIGGER_TYPES[number];
export type TriggerType = LXPTriggerType | HiringTriggerType | PerformanceTriggerType | GeneralTriggerType;