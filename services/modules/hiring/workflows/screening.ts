import { Logger } from '../../../../utils/logger.js';
import { CandidateAssessorAgent } from '../../../agents/hiring/candidate-assessor.js';
import { db } from '../../../../db/index.js';
import { candidates, candidateAssessments, hiringRequisitions } from '../../../../db/schema/hiring.js';
import { eq, and } from 'drizzle-orm';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface ScreeningWorkflowInput {
  tenantId: string;
  candidateId: string;
  requisitionId: string;
  assessmentType?: 'comprehensive' | 'skills_only' | 'culture_only' | 'quick_screen';
  companyData?: {
    vision?: string;
    mission?: string;
    values: string[];
    culture?: any;
  };
}

// ============================================================================
// CANDIDATE SCREENING WORKFLOW
// ============================================================================

/**
 * Candidate Screening Workflow
 * 
 * Manages comprehensive candidate screening:
 * 1. Fetch candidate and requisition data from database
 * 2. Use Candidate Assessor agent for comprehensive evaluation
 * 3. Assess skills match, experience, culture fit (Mizan 7 Cylinders)
 * 4. Generate screening report with recommendations
 * 5. Update candidate status and scores in database
 * 6. Store assessment results
 * 7. Determine next steps (interview, reject, etc.)
 */
export class CandidateScreeningWorkflow {
  private logger: Logger;
  private candidateAssessor: CandidateAssessorAgent;

  constructor() {
    this.logger = new Logger('CandidateScreeningWorkflow');
    this.candidateAssessor = new CandidateAssessorAgent();
  }

  /**
   * Execute the candidate screening workflow
   */
  async execute(input: ScreeningWorkflowInput): Promise<any> {
    try {
      this.logger.info('Executing candidate screening workflow', {
        candidateId: input.candidateId,
        requisitionId: input.requisitionId
      });

      // Step 1: Fetch candidate data from database
      const candidateData = await this.fetchCandidateData(input.candidateId, input.tenantId);

      // Step 2: Fetch requisition data from database
      const requisitionData = await this.fetchRequisitionData(input.requisitionId, input.tenantId);

      // Step 3: Prepare assessment input
      const assessmentInput = this.prepareAssessmentInput(
        input,
        candidateData,
        requisitionData
      );

      // Step 4: Perform comprehensive assessment using AI agent
      const assessment = await this.candidateAssessor.assessCandidate(assessmentInput);

      // Step 5: Update candidate with assessment scores
      await this.updateCandidateScores(input.candidateId, assessment);

      // Step 6: Store assessment results in database
      const assessmentId = await this.storeAssessment(input, assessment);

      // Step 7: Determine next steps based on assessment
      const nextSteps = this.determineNextSteps(assessment);

      // Step 8: Generate output triggers
      const outputTriggers = this.generateOutputTriggers(assessment, input);

      return {
        success: true,
        candidateId: input.candidateId,
        requisitionId: input.requisitionId,
        assessmentId,
        assessment,
        nextSteps,
        outputTriggers,
        metadata: {
          workflowExecutedAt: new Date().toISOString(),
          executedBy: 'CandidateScreeningWorkflow'
        }
      };
    } catch (error) {
      this.logger.error('Error executing candidate screening workflow:', error);
      throw error;
    }
  }

  // ============================================================================
  // WORKFLOW STEPS
  // ============================================================================

  /**
   * Fetch candidate data from database
   */
  private async fetchCandidateData(candidateId: string, tenantId: string): Promise<any> {
    try {
      const candidatesList = await db.select()
        .from(candidates)
        .where(and(
          eq(candidates.id, candidateId),
          eq(candidates.tenantId, tenantId)
        ))
        .limit(1);

      if (candidatesList.length === 0) {
        throw new Error(`Candidate not found: ${candidateId}`);
      }

      return candidatesList[0];
    } catch (error) {
      this.logger.error('Error fetching candidate data:', error);
      throw error;
    }
  }

  /**
   * Fetch requisition data from database
   */
  private async fetchRequisitionData(requisitionId: string, tenantId: string): Promise<any> {
    try {
      const requisitionsList = await db.select()
        .from(hiringRequisitions)
        .where(and(
          eq(hiringRequisitions.id, requisitionId),
          eq(hiringRequisitions.tenantId, tenantId)
        ))
        .limit(1);

      if (requisitionsList.length === 0) {
        throw new Error(`Requisition not found: ${requisitionId}`);
      }

      return requisitionsList[0];
    } catch (error) {
      this.logger.error('Error fetching requisition data:', error);
      throw error;
    }
  }

  /**
   * Prepare assessment input for AI agent
   */
  private prepareAssessmentInput(
    input: ScreeningWorkflowInput,
    candidateData: any,
    requisitionData: any
  ): any {
    return {
      tenantId: input.tenantId,
      candidateId: input.candidateId,
      requisitionId: input.requisitionId,
      candidate: {
        firstName: candidateData.firstName,
        lastName: candidateData.lastName,
        email: candidateData.email,
        resume: {
          url: candidateData.resumeUrl,
          summary: candidateData.notes,
          parsedData: candidateData.metadata?.parsedResume
        },
        skills: candidateData.skills || [],
        experience: candidateData.metadata?.experience || [],
        education: candidateData.education || [],
        coverLetter: candidateData.coverLetterUrl
      },
      jobRequirements: {
        title: requisitionData.positionTitle,
        level: requisitionData.level,
        requiredSkills: requisitionData.requiredSkills || [],
        preferredSkills: requisitionData.preferredSkills || [],
        experienceRequired: requisitionData.experienceRequired,
        cultureFit: requisitionData.cultureValues || []
      },
      companyData: input.companyData || {
        values: requisitionData.cultureValues || []
      },
      assessmentType: input.assessmentType || 'comprehensive',
      metadata: {} // Metadata not in interface
    };
  }

  /**
   * Update candidate with assessment scores
   */
  private async updateCandidateScores(candidateId: string, assessment: any): Promise<void> {
    try {
      const updateData = {
        overallScore: assessment.overallScore.toFixed(2),
        skillsScore: assessment.skillsAssessment.score.toFixed(2),
        cultureScore: assessment.cultureFitAssessment.score.toFixed(2),
        experienceScore: assessment.experienceAssessment.score.toFixed(2),
        educationScore: assessment.educationAssessment.score.toFixed(2),
        
        // Update status based on recommendation
        status: this.mapRecommendationToStatus(assessment.recommendation),
        stage: this.mapRecommendationToStage(assessment.recommendation),
        
        // Store assessment summary
        assessmentSummary: {
          overallScore: assessment.overallScore,
          recommendation: assessment.recommendation,
          assessedAt: new Date().toISOString()
        },
        
        // Store strengths and weaknesses
        strengths: assessment.overallAnalysis.strengths,
        weaknesses: assessment.overallAnalysis.weaknesses,
        redFlags: assessment.overallAnalysis.redFlags,
        
        // Culture analysis
        cultureAnalysis: assessment.cultureFitAssessment,
        cultureAlignment: assessment.cultureFitAssessment.cylinders,
        
        // AI recommendation
        aiRecommendation: assessment.recommendation,
        aiInsights: {
          skills: assessment.skillsAssessment,
          experience: assessment.experienceAssessment,
          culture: assessment.cultureFitAssessment,
          education: assessment.educationAssessment,
          interviews: assessment.interviewRecommendations,
          compensation: assessment.compensation
        },
        
        updatedAt: new Date()
      };

      await db.update(candidates)
        .set(updateData)
        .where(eq(candidates.id, candidateId));

      this.logger.info('Candidate scores updated', {
        candidateId,
        overallScore: assessment.overallScore,
        recommendation: assessment.recommendation
      });
    } catch (error) {
      this.logger.error('Error updating candidate scores:', error);
      throw error;
    }
  }

  /**
   * Map recommendation to candidate status
   */
  private mapRecommendationToStatus(recommendation: string): 'on_hold' | 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected' | 'withdrawn' {
    const statusMap: Record<string, 'on_hold' | 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected' | 'withdrawn'> = {
      'strong_hire': 'interview',
      'hire': 'interview',
      'maybe': 'screening',
      'pass': 'rejected',
      'strong_pass': 'rejected'
    };
    return statusMap[recommendation] || 'screening';
  }

  /**
   * Map recommendation to candidate stage
   */
  private mapRecommendationToStage(recommendation: string): 'offer' | 'hired' | 'application' | 'resume_review' | 'phone_screen' | 'technical_assessment' | 'behavioral_interview' | 'final_interview' | 'reference_check' {
    const stageMap: Record<string, 'offer' | 'hired' | 'application' | 'resume_review' | 'phone_screen' | 'technical_assessment' | 'behavioral_interview' | 'final_interview' | 'reference_check'> = {
      'strong_hire': 'behavioral_interview',
      'hire': 'phone_screen',
      'maybe': 'resume_review',
      'pass': 'application',
      'strong_pass': 'application'
    };
    return stageMap[recommendation] || 'resume_review';
  }

  /**
   * Store assessment results in database
   */
  private async storeAssessment(input: ScreeningWorkflowInput, assessment: any): Promise<string> {
    try {
      const assessmentData = {
        tenantId: input.tenantId,
        candidateId: input.candidateId,
        requisitionId: input.requisitionId,
        
        // Assessment details
        assessmentType: 'resume_review' as const,
        assessmentName: 'AI-Powered Candidate Screening',
        assessedBy: 'AI',
        assessorRole: 'ai_agent',
        
        // Scoring
        overallScore: assessment.overallScore.toString(),
        scores: {
          skills: assessment.skillsAssessment.score,
          experience: assessment.experienceAssessment.score,
          culture: assessment.cultureFitAssessment.score,
          education: assessment.educationAssessment.score
        },
        maxScore: '100.00',
        passingScore: '70.00',
        passed: assessment.overallScore >= 70,
        
        // Skills assessment
        skillsAssessed: assessment.skillsAssessment,
        skillGaps: assessment.skillsAssessment.skillGaps,
        skillStrengths: assessment.skillsAssessment.skillStrengths,
        
        // Culture fit (Mizan 7 Cylinders)
        cultureFitAnalysis: assessment.cultureFitAssessment,
        cultureAlignment: assessment.cultureFitAssessment.cylinders,
        cultureFitScore: assessment.cultureFitAssessment.score.toFixed(2),
        
        // Analysis
        strengths: assessment.overallAnalysis.strengths,
        weaknesses: assessment.overallAnalysis.weaknesses,
        opportunities: assessment.overallAnalysis.opportunities,
        concerns: assessment.overallAnalysis.concerns,
        
        // Recommendations
        recommendation: assessment.recommendation,
        recommendations: JSON.stringify(assessment.interviewRecommendations),
        nextSteps: assessment.nextSteps,
        
        // Behavioral assessment
        behavioralTraits: {},
        
        // Metadata
        assessmentDate: new Date(),
        metadata: {
          assessmentType: input.assessmentType,
          aiAgent: 'CandidateAssessorAgent',
          version: '1.0.0',
          fullAssessment: assessment
        }
      };

      const [created] = await db.insert(candidateAssessments)
        .values(assessmentData)
        .returning();

      this.logger.info('Assessment stored successfully', {
        assessmentId: created.id,
        overallScore: assessment.overallScore
      });

      return created.id;
    } catch (error) {
      this.logger.error('Error storing assessment:', error);
      throw error;
    }
  }

  /**
   * Determine next steps based on assessment
   */
  private determineNextSteps(assessment: any): any[] {
    const steps = [];

    if (assessment.recommendation === 'strong_hire' || assessment.recommendation === 'hire') {
      steps.push({
        action: 'Schedule interview',
        priority: 'high',
        timeline: '1-3 days',
        details: `Candidate scored ${assessment.overallScore}/100. Proceed to interview.`
      });

      if (assessment.interviewRecommendations.interviewType.length > 0) {
        steps.push({
          action: `Conduct ${assessment.interviewRecommendations.interviewType.join(', ')} interview(s)`,
          priority: 'high',
          timeline: '5-7 days',
          details: `Focus on: ${assessment.interviewRecommendations.focusAreas.join(', ')}`
        });
      }
    } else if (assessment.recommendation === 'maybe') {
      steps.push({
        action: 'Additional screening',
        priority: 'medium',
        timeline: '2-5 days',
        details: `Candidate scored ${assessment.overallScore}/100. Requires deeper evaluation.`
      });

      steps.push({
        action: 'Review with hiring manager',
        priority: 'medium',
        timeline: '1-2 days',
        details: 'Discuss borderline candidate'
      });
    } else {
      steps.push({
        action: 'Send rejection notification',
        priority: 'low',
        timeline: '1 day',
        details: `Candidate scored ${assessment.overallScore}/100. Does not meet requirements.`
      });
    }

    return steps;
  }

  /**
   * Generate output triggers based on assessment
   */
  private generateOutputTriggers(assessment: any, input: ScreeningWorkflowInput): any[] {
    const triggers = [];

    // If candidate should interview, trigger interview scheduling
    if (assessment.interviewRecommendations.shouldInterview) {
      triggers.push({
        type: 'schedule_interview',
        priority: assessment.recommendation === 'strong_hire' ? 'high' : 'medium',
        data: {
          candidateId: input.candidateId,
          requisitionId: input.requisitionId,
          interviewTypes: assessment.interviewRecommendations.interviewType,
          focusAreas: assessment.interviewRecommendations.focusAreas,
          suggestedQuestions: assessment.interviewRecommendations.suggestedQuestions
        },
        targetModule: 'hiring',
        targetWorkflow: 'interview_management'
      });
    }

    // If candidate has skill gaps but good culture fit, trigger LXP
    if (assessment.cultureFitAssessment.score >= 80 && 
        assessment.skillsAssessment.skillGaps.length > 0) {
      triggers.push({
        type: 'potential_hire_with_training',
        priority: 'medium',
        data: {
          candidateId: input.candidateId,
          skillGaps: assessment.skillsAssessment.skillGaps,
          cultureFitScore: assessment.cultureFitAssessment.score
        },
        targetModule: 'hiring',
        metadata: {
          note: 'Consider hiring with training plan'
        }
      });
    }

    return triggers;
  }
}

