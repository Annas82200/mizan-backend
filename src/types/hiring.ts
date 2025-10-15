/**
 * Hiring Module Type Definitions
 *
 * All types related to the Hiring/Recruitment module
 */

import {
  hiringRequisitions,
  candidates,
  candidateAssessments,
  interviews,
  offers
} from '../db/schema/hiring';

import { BaseTriggerContext, BaseWorkflowInput, BaseWorkflowOutput } from './shared';

// ============================================================================
// DATABASE INFERRED TYPES
// ============================================================================

export type HiringRequisition = typeof hiringRequisitions.$inferSelect;
export type HiringRequisitionInsert = typeof hiringRequisitions.$inferInsert;

export type Candidate = typeof candidates.$inferSelect;
export type CandidateInsert = typeof candidates.$inferInsert;

export type CandidateAssessment = typeof candidateAssessments.$inferSelect;
export type CandidateAssessmentInsert = typeof candidateAssessments.$inferInsert;

export type Interview = typeof interviews.$inferSelect;
export type InterviewInsert = typeof interviews.$inferInsert;

export type Offer = typeof offers.$inferSelect;
export type OfferInsert = typeof offers.$inferInsert;

// ============================================================================
// TRIGGER CONTEXT
// ============================================================================

export interface HiringTriggerContext extends BaseTriggerContext {
  requisitionId?: string;
  candidateId?: string;
  triggerType:
    | 'requisition_created'
    | 'candidate_applied'
    | 'interview_scheduled'
    | 'offer_extended'
    | 'hire_completed';
}

// ============================================================================
// WORKFLOW INPUTS & OUTPUTS
// ============================================================================

export interface ScreeningWorkflowInput extends BaseWorkflowInput {
  candidateId: string;
  requisitionId: string;
  resume?: string;
  coverLetter?: string;
}

export interface InterviewWorkflowInput extends BaseWorkflowInput {
  candidateId: string;
  requisitionId: string;
  interviewType: 'phone' | 'video' | 'in_person' | 'technical' | 'behavioral' | 'panel';
  interviewers: string[];
  scheduledDate: Date;
}

export interface OfferWorkflowInput extends BaseWorkflowInput {
  candidateId: string;
  requisitionId: string;
  salary: number;
  benefits: string[];
  startDate: Date;
}

// ============================================================================
// CULTURE FIT ASSESSMENT
// ============================================================================

export interface CultureFitAssessment {
  candidateId: string;
  tenantId: string;
  cultureAnalysisId: string;
  assessedBy: string;
  overallCultureFit: number;
  individualScores: Record<string, number>;
  alignmentAnalysis: {
    strongMatches: string[];
    potentialGaps: string[];
    developmentAreas: string[];
    riskFactors: string[];
  };
  recommendations: {
    hireRecommendation: 'strong_yes' | 'yes' | 'maybe' | 'no' | 'strong_no';
    confidence: number;
    reasoning: string;
    interviewFocus: string[];
    onboardingNeeds: string[];
  };
  assessmentDate: Date;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// HIRING NEED (from structure analysis)
// ============================================================================

export interface HiringNeed {
  tenantId: string;
  structureAnalysisId: string;
  department: string;
  positionTitle: string;
  level: 'entry' | 'mid' | 'senior' | 'executive' | 'leadership';
  type: 'full_time' | 'part_time' | 'contract' | 'temporary' | 'intern';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  numberOfPositions: number;
  targetStartDate?: Date | null;
  requiredSkills: string[];
  preferredSkills?: string[];
  experienceRequired?: string;
  educationRequired?: string;
  salaryRange: {
    min: number;
    max: number;
    currency: string;
  };
  rationale: string;
  approvedBy: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface CandidateScore {
  overall: number;
  skills: number;
  experience: number;
  culture: number;
  education: number;
}

export interface InterviewFeedback {
  interviewerId: string;
  ratings: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no' | 'strong_no';
  notes: string;
}
