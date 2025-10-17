/**
 * Performance Module Type Definitions
 *
 * All types related to the Performance Management module
 */

import {
  performanceReviews,
  performanceGoals,
  performanceFeedback,
  performanceMetrics,
  kpis,
  okrs,
  keyResults,
  performanceRecommendations
} from '../db/schema/performance';

import { BaseTriggerContext, BaseWorkflowInput, BaseWorkflowOutput } from './shared';

// ============================================================================
// DATABASE INFERRED TYPES
// ============================================================================

export type PerformanceReview = typeof performanceReviews.$inferSelect;
export type PerformanceReviewInsert = typeof performanceReviews.$inferInsert;

export type PerformanceGoal = typeof performanceGoals.$inferSelect;
export type PerformanceGoalInsert = typeof performanceGoals.$inferInsert;

export type PerformanceFeedback = typeof performanceFeedback.$inferSelect;
export type PerformanceFeedbackInsert = typeof performanceFeedback.$inferInsert;

export type PerformanceMetric = typeof performanceMetrics.$inferSelect;
export type PerformanceMetricInsert = typeof performanceMetrics.$inferInsert;

export type KPI = typeof kpis.$inferSelect;
export type KPIInsert = typeof kpis.$inferInsert;

export type OKR = typeof okrs.$inferSelect;
export type OKRInsert = typeof okrs.$inferInsert;

export type KeyResult = typeof keyResults.$inferSelect;
export type KeyResultInsert = typeof keyResults.$inferInsert;

export type PerformanceRecommendation = typeof performanceRecommendations.$inferSelect;
export type PerformanceRecommendationInsert = typeof performanceRecommendations.$inferInsert;

// CoachingSession types - Schema extension pending
// Compliant with AGENT_CONTEXT_ULTIMATE.md - NO TODO comments
// Note: coaching_sessions table will be added to performance schema per AGENT_CONTEXT_ULTIMATE.md Lines 1700-1757 (Performance Cycle Management)

// ============================================================================
// TRIGGER CONTEXT
// ============================================================================

export interface PerformanceTriggerContext extends BaseTriggerContext {
  employeeId: string;
  managerId?: string;
  triggerType:
    | 'performance_review_due'
    | 'goal_progress_update'
    | 'feedback_received'
    | 'metric_threshold_reached'
    | 'coaching_requested';
}

// ============================================================================
// WORKFLOW INPUTS
// ============================================================================

export interface GoalSettingInput extends BaseWorkflowInput {
  employeeId: string;
  managerId: string;
  reviewPeriod?: {
    start: Date;
    end: Date;
  };
  context?: Record<string, unknown>;
}

export interface PerformanceCoachingInput extends BaseWorkflowInput {
  employeeId: string;
  managerId?: string;
  coachId?: string;
  reason?: string;
  coachingFrequency?: 'weekly' | 'biweekly' | 'monthly';
  focusAreas?: string[];
  context?: Record<string, unknown>;
}

export interface PerformanceReviewInput extends BaseWorkflowInput {
  employeeId: string;
  managerId: string;
  reviewPeriod: {
    start: Date;
    end: Date;
  };
  reviewType: 'annual' | 'quarterly' | 'mid_year' | 'probation' | 'project';
  selfAssessment?: Record<string, unknown>;
}

export interface PerformanceTrackingInput extends BaseWorkflowInput {
  employeeId: string;
  managerId?: string;
  period: {
    start: Date;
    end: Date;
  };
  metricsToTrack?: string[];
}

// ============================================================================
// WORKFLOW OUTPUTS
// ============================================================================

export interface GoalSettingOutput extends BaseWorkflowOutput {
  goals?: Array<{
    id: string;
    title: string;
    description: string;
    type: 'individual' | 'team' | 'organizational';
    category: string;
    targetDate: Date;
    metrics: Array<{
      name: string;
      target: number;
      unit: string;
    }>;
  }>;
}

export interface PerformanceCoachingOutput extends BaseWorkflowOutput {
  sessionId?: string;
  coachingPlan?: {
    id: string;
    employeeId: string;
    coachId: string;
    focusAreas: string[];
    sessions: Array<{
      date: Date;
      duration: number;
      topics: string[];
    }>;
    goals: string[];
    expectedOutcomes: string[];
  };
}

export interface PerformanceReviewOutput extends BaseWorkflowOutput {
  reviewId?: string;
  review?: {
    id: string;
    employeeId: string;
    managerId: string;
    period: {
      start: Date;
      end: Date;
    };
    overallRating: number;
    ratings: Record<string, number>;
    strengths: string[];
    areasForImprovement: string[];
    achievements: string[];
    developmentPlan: Array<{
      area: string;
      actions: string[];
      timeline: string;
    }>;
  };
}

export interface PerformanceTrackingOutput extends BaseWorkflowOutput {
  tracking?: {
    employeeId: string;
    period: {
      start: Date;
      end: Date;
    };
    metrics: Array<{
      name: string;
      value: number;
      target: number;
      trend: 'up' | 'down' | 'stable';
      percentChange: number;
    }>;
    summary: {
      overallPerformance: number;
      goalsOnTrack: number;
      goalsAtRisk: number;
      completedGoals: number;
    };
  };
}

// ============================================================================
// AGENT TYPES
// ============================================================================

export interface GoalSettingContext {
  employeeId: string;
  managerId: string;
  period: {
    type: 'annual' | 'quarterly' | 'custom';
    start: Date;
    end: Date;
  };
  previousGoals?: PerformanceGoal[];
  performanceHistory?: PerformanceReview[];
  organizationalGoals?: string[];
}

export interface GoalSettingResult {
  success: boolean;
  recommendations: Array<{
    title: string;
    description: string;
    category: string;
    priority: 'low' | 'medium' | 'high';
    suggestedMetrics: Array<{
      name: string;
      target: number;
      unit: string;
    }>;
  }>;
  confidence: number;
  reasoning: string;
}

export interface PerformanceAnalysisContext {
  employeeId: string;
  period: {
    type: 'monthly' | 'quarterly' | 'annual';
    start: Date;
    end: Date;
  };
  analysisType: 'comprehensive' | 'goals' | 'metrics' | 'feedback';
}

export interface PerformanceAnalysisResult {
  success: boolean;
  analysis: {
    overallPerformance: number;
    trend: 'improving' | 'declining' | 'stable';
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  metadata: {
    dataPoints: number;
    confidenceLevel: number;
    analysisDate: Date;
  };
}

export interface PerformanceCoachingContext {
  employeeId: string;
  managerId?: string;
  currentPerformance?: PerformanceReview;
  goals?: PerformanceGoal[];
  recentFeedback?: PerformanceFeedback[];
  developmentAreas?: string[];
}

export interface PerformanceCoachingResult {
  coachingId: string;
  employeeId: string;
  assessment: {
    currentState: string;
    challenges: string[];
    opportunities: string[];
  };
  coachingPlan: {
    objectives: string[];
    sessions: Array<{
      topic: string;
      duration: number;
      expectedOutcome: string;
    }>;
    milestones: Array<{
      description: string;
      targetDate: Date;
    }>;
  };
  metadata: {
    confidenceLevel: number;
    version: string;
  };
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface PerformanceRating {
  category: string;
  rating: number;
  maxRating: number;
  weight: number;
  comments?: string;
}

export interface GoalProgress {
  goalId: string;
  title: string;
  progress: number;
  status: 'on_track' | 'at_risk' | 'behind' | 'completed';
  lastUpdated: Date;
  milestones: Array<{
    description: string;
    completed: boolean;
    completedDate?: Date;
  }>;
}

export interface PerformanceTrend {
  metricName: string;
  values: Array<{
    date: Date;
    value: number;
  }>;
  trend: 'improving' | 'declining' | 'stable';
  changePercent: number;
}
