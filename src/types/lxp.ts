/**
 * LXP Module Type Definitions
 *
 * All types related to the Learning Experience Platform (LXP) module
 */

import {
  courses,
  learningPaths,
  courseEnrollments,
  courseAssessments,
  assessmentResults,
  learningAnalytics
} from '../db/schema/lxp-extended.js';

import { BaseTriggerContext, BaseWorkflowInput, BaseWorkflowOutput } from './shared.js';

// ============================================================================
// DATABASE INFERRED TYPES
// ============================================================================

export type Course = typeof courses.$inferSelect;
export type CourseInsert = typeof courses.$inferInsert;

export type LearningPath = typeof learningPaths.$inferSelect;
export type LearningPathInsert = typeof learningPaths.$inferInsert;

export type CourseEnrollment = typeof courseEnrollments.$inferSelect;
export type CourseEnrollmentInsert = typeof courseEnrollments.$inferInsert;

export type CourseAssessment = typeof courseAssessments.$inferSelect;
export type CourseAssessmentInsert = typeof courseAssessments.$inferInsert;

export type AssessmentResult = typeof assessmentResults.$inferSelect;
export type AssessmentResultInsert = typeof assessmentResults.$inferInsert;

export type LearningAnalytics = typeof learningAnalytics.$inferSelect;
export type LearningAnalyticsInsert = typeof learningAnalytics.$inferInsert;

// ============================================================================
// TRIGGER CONTEXT
// ============================================================================

/**
 * LXP Trigger Context - extends base context with LXP-specific properties
 */
export interface LXPTriggerContext extends BaseTriggerContext {
  employeeId: string;
  triggerType:
    | 'learning_progress_update'
    | 'lxp_training_completion'
    | 'training_completion'
    | 'onboarding_completion'
    | 'course_completion'
    | 'skill_gap_detected'
    | 'culture_learning_needed'
    | 'assessment_required';
  triggerData: {
    courseId?: string;
    enrollmentId?: string;
    assessmentId?: string;
    pathId?: string;
    progressData?: Record<string, unknown>;
    completionData?: Record<string, unknown>;
    skillGaps?: Array<{
      skillId: string;
      skillName: string;
      currentLevel: number;
      targetLevel: number;
      gap: number;
    }>;
    [key: string]: unknown;
  };
}

// ============================================================================
// WORKFLOW INPUTS
// ============================================================================

export interface LearningPathDesignInput extends BaseWorkflowInput {
  employeeId: string;
  triggerType: 'skill_gaps_critical' | 'culture_learning_needed' | 'employee_skill_gap' |
               'performance_perfect_lxp' | 'performance_improvement_lxp' | 'compliance_training_due' |
               'safety_training_expired' | 'certification_expiring' | 'legal_requirement_change';
  triggerData: any;
  employeeProfile: {
    currentSkills: string[];
    skillGaps: string[];
    learningHistory: any[];
    preferences: any;
    role: string;
    department: string;
    experience: string;
  };
  availableCourses: any[];
  organizationalContext: {
    cultureValues: string[];
    strategicGoals: string[];
    departmentNeeds: any;
    teamDynamics?: any;
  };
  constraints?: {
    timeline?: string;
    budget?: number;
    requiredCertifications?: string[];
  };
  targetRole?: string;
  skillGaps?: string[];
  learningObjectives?: string[];
  targetSkills?: string[];
  duration?: number;
  priority?: 'low' | 'medium' | 'high';
}

export interface LearningProgressInput extends BaseWorkflowInput {
  employeeId: string;
  learningPathId?: string;
  enrollmentId?: string;
  courseId?: string;
  trackingType: 'individual_progress' | 'path_progress' | 'course_progress' | 'intervention_analysis' | 'completion_prediction';
  progressData: {
    enrollments: any[];
    completions: any[];
    assessments: any[];
    timeSpent: any[];
    engagementMetrics: any[];
    learningHistory: any[];
  };
  employeeProfile: {
    role: string;
    department: string;
    experience: string;
    learningPreferences: any;
    performanceHistory: any[];
  };
  organizationalContext: {
    learningGoals: string[];
    performanceStandards: any;
    departmentMetrics: any;
  };
  timeRange?: {
    start: Date;
    end: Date;
  };
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface AssessmentEngineInput extends BaseWorkflowInput {
  employeeId: string;
  courseId?: string;
  assessmentType: 'formative' | 'summative' | 'diagnostic' | 'adaptive' | 'peer_review' | 'practical' | 'simulation';
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  context?: Record<string, unknown>;
}

export interface CourseCompletionInput extends BaseWorkflowInput {
  employeeId: string;
  courseId: string;
  enrollmentId: string;
  completionData: {
    score?: number;
    timeSpent?: number;
    completedAt: Date;
    assessmentResults?: Record<string, unknown>;
  };
}

// ============================================================================
// WORKFLOW OUTPUTS
// ============================================================================

export interface LearningPathDesignOutput extends BaseWorkflowOutput {
  pathId?: string;
  path?: {
    id: string;
    title: string;
    description: string;
    courses: Course[];
    estimatedDuration: number;
    milestones: Array<{
      title: string;
      courses: string[];
      targetDate?: Date;
    }>;
  };
}

export interface LearningProgressOutput extends BaseWorkflowOutput {
  progress?: {
    overallProgress: number;
    coursesCompleted: number;
    coursesInProgress: number;
    coursesNotStarted: number;
    totalTimeSpent: number;
    averageScore: number;
    skillsAcquired: string[];
    nextMilestones: Array<{
      title: string;
      dueDate?: Date;
      progress: number;
    }>;
  };
}

export interface AssessmentEngineOutput extends BaseWorkflowOutput {
  assessmentId?: string;
  assessment?: {
    id: string;
    title: string;
    description: string;
    type: string;
    questions: Array<{
      id: string;
      question: string;
      type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
      options?: string[];
      correctAnswer?: string;
      points: number;
    }>;
    duration: number;
    passingScore: number;
  };
}

export interface CourseCompletionOutput extends BaseWorkflowOutput {
  completion?: {
    courseId: string;
    enrollmentId: string;
    completedAt: Date;
    score: number;
    timeSpent: number;
    certificate?: {
      id: string;
      url: string;
      issuedAt: Date;
    };
    nextSteps?: string[];
  };
}

// ============================================================================
// AGENT TYPES
// ============================================================================

export interface LearningProgressTrackerResult {
  success: boolean;
  employeeId: string;
  progress: {
    overall: number;
    courses: Record<string, number>;
    skills: Record<string, number>;
  };
  recommendations: string[];
  nextActions: string[];
}

export interface CourseRecommendation {
  courseId: string;
  courseName: string;
  relevanceScore: number;
  reason: string;
  estimatedDuration: number;
  difficulty: string;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface SkillGap {
  skillId: string;
  skillName: string;
  currentLevel: number;
  targetLevel: number;
  gap: number;
  priority: 'low' | 'medium' | 'high';
}

export interface SkillProfile {
  skillId: string;
  skillName: string;
  level: number;
  category: string;
  lastAssessed?: Date;
}

export interface LearningMilestone {
  id: string;
  title: string;
  description: string;
  targetDate?: Date;
  status: 'not_started' | 'in_progress' | 'completed';
  requiredCourses: string[];
  completedCourses: string[];
  progress: number;
}
