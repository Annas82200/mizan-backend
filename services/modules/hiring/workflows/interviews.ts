import { Logger } from '../../../../utils/logger.js';
import { db } from '../../../../db/index.js';
import { interviews, candidates, hiringRequisitions } from '../../../../db/schema/hiring.js';
import { eq, and, desc } from 'drizzle-orm';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface InterviewWorkflowInput {
  tenantId: string;
  candidateId: string;
  requisitionId: string;
  
  // Interview details
  interviewType: string;
  round: number;
  interviewers: string[]; // Array of interviewer IDs
  
  // Scheduling
  scheduledDate: Date;
  duration?: number; // minutes
  timezone?: string;
  location?: string; // for in-person
  meetingLink?: string; // for video
  
  // Focus areas from screening
  focusAreas?: string[];
  suggestedQuestions?: string[];
  
  metadata?: any;
}

export interface InterviewFeedbackInput {
  interviewId: string;
  interviewerId: string;
  
  // Scores
  technicalSkills?: number;
  communication?: number;
  problemSolving?: number;
  cultureFit?: number;
  leadershipPotential?: number;
  
  // Feedback
  strengths: string[];
  weaknesses: string[];
  concerns?: string[];
  notes: string;
  
  // Recommendation
  recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no' | 'strong_no';
}

// ============================================================================
// INTERVIEW MANAGEMENT WORKFLOW
// ============================================================================

/**
 * Interview Management Workflow
 * 
 * Manages the complete interview process:
 * 1. Schedule interviews based on screening results
 * 2. Send invitations and confirmations
 * 3. Collect feedback from interviewers
 * 4. Aggregate interview scores
 * 5. Generate comprehensive interview summary
 * 6. Determine next steps (proceed to offer, additional rounds, reject)
 */
export class InterviewManagementWorkflow {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('InterviewManagementWorkflow');
  }

  /**
   * Schedule a new interview
   */
  async scheduleInterview(input: InterviewWorkflowInput): Promise<any> {
    try {
      this.logger.info('Scheduling interview', {
        candidateId: input.candidateId,
        interviewType: input.interviewType,
        round: input.round
      });

      // Step 1: Fetch candidate and requisition data
      const candidate = await this.fetchCandidate(input.candidateId, input.tenantId);
      const requisition = await this.fetchRequisition(input.requisitionId, input.tenantId);

      // Step 2: Create interview record in database
      const interviewId = await this.createInterview(input, candidate, requisition);

      // Step 3: Send notifications (mock - would integrate with notification service)
      await this.sendInterviewNotifications(interviewId, input, candidate);

      // Step 4: Generate interview preparation materials
      const preparationMaterials = this.generatePreparationMaterials(input, candidate, requisition);

      return {
        success: true,
        interviewId,
        scheduledDate: input.scheduledDate,
        interviewers: input.interviewers,
        preparationMaterials,
        nextSteps: [
          'Send calendar invitations',
          'Prepare interview questions',
          'Review candidate profile',
          'Conduct interview'
        ]
      };
    } catch (error) {
      this.logger.error('Error scheduling interview:', error);
      throw error;
    }
  }

  /**
   * Submit interview feedback
   */
  async submitInterviewFeedback(input: InterviewFeedbackInput): Promise<any> {
    try {
      this.logger.info('Submitting interview feedback', {
        interviewId: input.interviewId,
        interviewerId: input.interviewerId
      });

      // Step 1: Fetch interview from database
      const interview = await this.fetchInterview(input.interviewId);

      // Step 2: Add feedback to interview record
      await this.addFeedbackToInterview(input, interview);

      // Step 3: Check if all interviewers have submitted feedback
      const allFeedbackCollected = await this.checkAllFeedbackCollected(input.interviewId);

      // Step 4: If all feedback collected, aggregate scores
      let aggregatedScores = null;
      let nextActions = [];

      if (allFeedbackCollected) {
        aggregatedScores = await this.aggregateInterviewScores(input.interviewId);
        nextActions = await this.determinePostInterviewActions(input.interviewId, aggregatedScores);
      }

      return {
        success: true,
        interviewId: input.interviewId,
        feedbackSubmitted: true,
        allFeedbackCollected,
        aggregatedScores,
        nextActions
      };
    } catch (error) {
      this.logger.error('Error submitting interview feedback:', error);
      throw error;
    }
  }

  /**
   * Complete an interview
   */
  async completeInterview(interviewId: string): Promise<any> {
    try {
      this.logger.info('Completing interview', { interviewId });

      // Step 1: Aggregate all feedback
      const aggregatedScores = await this.aggregateInterviewScores(interviewId);

      // Step 2: Update interview status
      await db.update(interviews)
        .set({
          status: 'completed',
          overallScore: aggregatedScores.overallScore.toFixed(2),
          recommendation: aggregatedScores.recommendation,
          completedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(interviews.id, interviewId));

      // Step 3: Update candidate status
      const interview = await this.fetchInterview(interviewId);
      await this.updateCandidateAfterInterview(interview.candidateId, aggregatedScores);

      // Step 4: Determine next actions
      const nextActions = await this.determinePostInterviewActions(interviewId, aggregatedScores);

      return {
        success: true,
        interviewId,
        aggregatedScores,
        nextActions,
        outputTriggers: this.generateInterviewOutputTriggers(interview, aggregatedScores)
      };
    } catch (error) {
      this.logger.error('Error completing interview:', error);
      throw error;
    }
  }

  // ============================================================================
  // HELPER METHODS - DATABASE OPERATIONS
  // ============================================================================

  /**
   * Fetch candidate from database
   */
  private async fetchCandidate(candidateId: string, tenantId: string): Promise<any> {
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
  }

  /**
   * Fetch requisition from database
   */
  private async fetchRequisition(requisitionId: string, tenantId: string): Promise<any> {
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
  }

  /**
   * Fetch interview from database
   */
  private async fetchInterview(interviewId: string): Promise<any> {
    const interviewsList = await db.select()
      .from(interviews)
      .where(eq(interviews.id, interviewId))
      .limit(1);

    if (interviewsList.length === 0) {
      throw new Error(`Interview not found: ${interviewId}`);
    }

    return interviewsList[0];
  }

  /**
   * Create interview in database
   */
  private async createInterview(
    input: InterviewWorkflowInput,
    candidate: any,
    requisition: any
  ): Promise<string> {
    try {
      const interviewData = {
        tenantId: input.tenantId,
        candidateId: input.candidateId,
        requisitionId: input.requisitionId,
        
        // Interview details
        interviewType: input.interviewType as 'phone' | 'video' | 'in_person' | 'technical' | 'behavioral' | 'panel' | 'culture_fit' | 'final',
        round: input.round,
        title: `${input.interviewType} Interview - Round ${input.round}`,
        description: `Interview for ${requisition.positionTitle} position`,
        
        // Scheduling
        scheduledDate: input.scheduledDate,
        duration: input.duration || 60,
        timezone: input.timezone || 'UTC',
        location: input.location,
        meetingLink: input.meetingLink,
        
        // Participants
        interviewers: input.interviewers.map(id => ({ id, role: 'interviewer' })),
        primaryInterviewer: input.interviewers[0],
        panelSize: input.interviewers.length,
        
        // Status
        status: 'scheduled' as 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show',
        confirmationSent: false,
        reminderSent: false,
        
        // Feedback (empty initially)
        feedback: [],
        
        // Metadata
        metadata: {
          focusAreas: input.focusAreas || [],
          suggestedQuestions: input.suggestedQuestions || [],
          candidateName: `${candidate.firstName} ${candidate.lastName}`,
          positionTitle: requisition.positionTitle
        }
      };

      const [created] = await db.insert(interviews)
        .values(interviewData)
        .returning();

      this.logger.info('Interview created successfully', {
        interviewId: created.id,
        type: input.interviewType,
        round: input.round
      });

      return created.id;
    } catch (error) {
      this.logger.error('Error creating interview:', error);
      throw error;
    }
  }

  /**
   * Add feedback to interview
   */
  private async addFeedbackToInterview(
    feedbackInput: InterviewFeedbackInput,
    interview: any
  ): Promise<void> {
    try {
      const existingFeedback = interview.feedback || [];
      
      const newFeedback = {
        interviewerId: feedbackInput.interviewerId,
        submittedAt: new Date().toISOString(),
        scores: {
          technicalSkills: feedbackInput.technicalSkills,
          communication: feedbackInput.communication,
          problemSolving: feedbackInput.problemSolving,
          cultureFit: feedbackInput.cultureFit,
          leadershipPotential: feedbackInput.leadershipPotential
        },
        strengths: feedbackInput.strengths,
        weaknesses: feedbackInput.weaknesses,
        concerns: feedbackInput.concerns || [],
        notes: feedbackInput.notes,
        recommendation: feedbackInput.recommendation
      };

      existingFeedback.push(newFeedback);

      await db.update(interviews)
        .set({
          feedback: existingFeedback,
          updatedAt: new Date()
        })
        .where(eq(interviews.id, feedbackInput.interviewId));

      this.logger.info('Interview feedback added', {
        interviewId: feedbackInput.interviewId,
        interviewerId: feedbackInput.interviewerId
      });
    } catch (error) {
      this.logger.error('Error adding interview feedback:', error);
      throw error;
    }
  }

  /**
   * Check if all feedback has been collected
   */
  private async checkAllFeedbackCollected(interviewId: string): Promise<boolean> {
    const interview = await this.fetchInterview(interviewId);
    const interviewers = interview.interviewers || [];
    const feedback = interview.feedback || [];
    
    return feedback.length >= interviewers.length;
  }

  /**
   * Aggregate interview scores from all interviewers
   */
  private async aggregateInterviewScores(interviewId: string): Promise<any> {
    try {
      const interview = await this.fetchInterview(interviewId);
      const feedback = interview.feedback || [];

      if (feedback.length === 0) {
        return {
          overallScore: 0,
          recommendation: 'no',
          scores: {}
        };
      }

      // Calculate average scores
      const avgScores = {
        technicalSkills: this.calculateAverage(feedback.map((f: any) => f.scores.technicalSkills)),
        communication: this.calculateAverage(feedback.map((f: any) => f.scores.communication)),
        problemSolving: this.calculateAverage(feedback.map((f: any) => f.scores.problemSolving)),
        cultureFit: this.calculateAverage(feedback.map((f: any) => f.scores.cultureFit)),
        leadershipPotential: this.calculateAverage(feedback.map((f: any) => f.scores.leadershipPotential))
      };

      // Calculate overall score
      const overallScore = (
        avgScores.technicalSkills +
        avgScores.communication +
        avgScores.problemSolving +
        avgScores.cultureFit +
        avgScores.leadershipPotential
      ) / 5;

      // Determine consensus recommendation
      const recommendations = feedback.map((f: any) => f.recommendation);
      const recommendation = this.calculateConsensusRecommendation(recommendations);

      // Aggregate strengths and weaknesses
      const allStrengths = feedback.flatMap((f: any) => f.strengths);
      const allWeaknesses = feedback.flatMap((f: any) => f.weaknesses);
      const allConcerns = feedback.flatMap((f: any) => f.concerns || []);

      const aggregated = {
        overallScore,
        scores: avgScores,
        recommendation,
        strengths: Array.from(new Set(allStrengths)), // Unique strengths
        weaknesses: Array.from(new Set(allWeaknesses)), // Unique weaknesses
        concerns: Array.from(new Set(allConcerns)), // Unique concerns
        feedbackCount: feedback.length,
        unanimousDecision: recommendations.every((r: any) => r === recommendations[0])
      };

      // Update interview with aggregated scores
      await db.update(interviews)
        .set({
          scores: avgScores,
          overallScore: overallScore.toFixed(2),
          recommendation: recommendation as any,
          strengths: aggregated.strengths,
          weaknesses: aggregated.weaknesses,
          concerns: aggregated.concerns,
          updatedAt: new Date()
        })
        .where(eq(interviews.id, interviewId));

      return aggregated;
    } catch (error) {
      this.logger.error('Error aggregating interview scores:', error);
      throw error;
    }
  }

  /**
   * Calculate average of scores
   */
  private calculateAverage(scores: (number | undefined)[]): number {
    const validScores = scores.filter(s => s !== undefined && s !== null) as number[];
    if (validScores.length === 0) return 0;
    return validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
  }

  /**
   * Calculate consensus recommendation
   */
  private calculateConsensusRecommendation(recommendations: string[]): string {
    const counts = recommendations.reduce((acc, rec) => {
      acc[rec as any] = (acc[rec] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Find most common recommendation
    let maxCount = 0;
    let consensus = 'maybe';

    Object.entries(counts).forEach(([rec, count]) => {
      if (count > maxCount) {
        maxCount = count;
        consensus = rec;
      }
    });

    // If there's a strong_no, that overrides
    if (recommendations.includes('strong_no')) return 'strong_no';

    // If there's a strong_yes and majority positive
    if (recommendations.includes('strong_yes') && 
        recommendations.filter(r => r === 'strong_yes' || r === 'yes').length >= recommendations.length * 0.6) {
      return 'strong_yes';
    }

    return consensus;
  }

  /**
   * Update candidate status after interview
   */
  private async updateCandidateAfterInterview(candidateId: string, aggregatedScores: any): Promise<void> {
    try {
      const updateData: any = {
        updatedAt: new Date()
      };

      // Update status based on recommendation
      if (aggregatedScores.recommendation === 'strong_yes' || aggregatedScores.recommendation === 'yes') {
        updateData.status = 'offer';
        updateData.stage = 'offer';
      } else if (aggregatedScores.recommendation === 'maybe') {
        updateData.status = 'interview';
        updateData.stage = 'final_interview';
      } else {
        updateData.status = 'rejected';
        updateData.stage = 'interview';
      }

      await db.update(candidates)
        .set(updateData)
        .where(eq(candidates.id, candidateId));

      this.logger.info('Candidate status updated after interview', {
        candidateId,
        newStatus: updateData.status
      });
    } catch (error) {
      this.logger.error('Error updating candidate after interview:', error);
      throw error;
    }
  }

  /**
   * Determine actions after interview
   */
  private async determinePostInterviewActions(interviewId: string, aggregatedScores: any): Promise<any[]> {
    const interview = await this.fetchInterview(interviewId);
    const actions = [];

    if (aggregatedScores.recommendation === 'strong_yes') {
      actions.push({
        action: 'Proceed to offer',
        priority: 'high',
        timeline: '1-2 days',
        details: `Strong consensus to hire. Overall score: ${aggregatedScores.overallScore.toFixed(1)}/5`
      });
      actions.push({
        action: 'Prepare offer letter',
        priority: 'high',
        timeline: '2-3 days'
      });
    } else if (aggregatedScores.recommendation === 'yes') {
      if (interview.round < 3) {
        actions.push({
          action: 'Schedule final interview',
          priority: 'medium',
          timeline: '3-5 days',
          details: 'Positive feedback, proceed to final round'
        });
      } else {
        actions.push({
          action: 'Proceed to offer',
          priority: 'medium',
          timeline: '2-3 days'
        });
      }
    } else if (aggregatedScores.recommendation === 'maybe') {
      actions.push({
        action: 'Additional assessment',
        priority: 'medium',
        timeline: '3-5 days',
        details: 'Mixed feedback, conduct additional evaluation'
      });
    } else {
      actions.push({
        action: 'Send rejection notification',
        priority: 'low',
        timeline: '1 day',
        details: 'Did not meet interview expectations'
      });
    }

    return actions;
  }

  /**
   * Generate interview output triggers
   */
  private generateInterviewOutputTriggers(interview: any, aggregatedScores: any): any[] {
    const triggers = [];

    // Trigger offer generation for strong candidates
    if (aggregatedScores.recommendation === 'strong_yes' || 
        (aggregatedScores.recommendation === 'yes' && interview.round >= 3)) {
      triggers.push({
        type: 'generate_offer',
        priority: 'high',
        data: {
          candidateId: interview.candidateId,
          requisitionId: interview.requisitionId,
          interviewScores: aggregatedScores
        },
        targetModule: 'hiring',
        targetWorkflow: 'offer_management'
      });
    }

    return triggers;
  }

  /**
   * Send interview notifications
   */
  private async sendInterviewNotifications(
    interviewId: string,
    input: InterviewWorkflowInput,
    candidate: any
  ): Promise<void> {
    try {
      // Send notification to candidate
      const candidateNotification = {
        to: candidate.email,
        subject: `Interview Scheduled - ${input.interviewType} Interview`,
        template: 'interview_scheduled_candidate',
        data: {
          candidateName: `${candidate.firstName} ${candidate.lastName}`,
          interviewType: input.interviewType,
          scheduledDate: input.scheduledDate,
          location: input.location || 'Virtual',
          interviewers: input.interviewers.join(', '), // Array of interviewer IDs
          preparationInstructions: 'Please review the job description and prepare examples of your relevant experience.'
        }
      };

      // Send notifications to interviewers
      const interviewerNotifications = input.interviewers.map(interviewerId => ({
        to: `${interviewerId}@company.com`, // Mock email for interviewer ID
        subject: `Interview Scheduled - ${candidate.firstName} ${candidate.lastName}`,
        template: 'interview_scheduled_interviewer',
        data: {
          interviewerName: `Interviewer ${interviewerId}`, // Mock name for interviewer ID
          candidateName: `${candidate.firstName} ${candidate.lastName}`,
          interviewType: input.interviewType,
          scheduledDate: input.scheduledDate,
          location: input.location || 'Virtual',
          candidateResume: candidate.resume,
          interviewQuestions: [] // Questions not in interface
        }
      }));

      // Log notification sending (in production, would actually send emails)
      this.logger.info('Interview notifications queued', {
        interviewId,
        candidateEmail: candidate.email,
        interviewerEmails: input.interviewers.map(id => `${id}@company.com`),
        notificationsCount: 1 + input.interviewers.length
      });

      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      this.logger.error('Failed to send interview notifications:', error);
      throw error;
    }
  }

  /**
   * Generate interview preparation materials
   */
  private generatePreparationMaterials(
    input: InterviewWorkflowInput,
    candidate: any,
    requisition: any
  ): any {
    return {
      candidateProfile: {
        name: `${candidate.firstName} ${candidate.lastName}`,
        currentRole: candidate.currentTitle,
        experience: candidate.yearsOfExperience,
        skills: candidate.skills,
        cultureFitScore: candidate.cultureScore
      },
      focusAreas: input.focusAreas || [
        'Technical skills validation',
        'Culture fit assessment',
        'Problem-solving ability'
      ],
      suggestedQuestions: input.suggestedQuestions || [
        'Tell me about a challenging project you led',
        'How do you handle conflict in a team?',
        'What motivates you in your work?'
      ],
      competenciesToAssess: [
        'Technical expertise',
        'Communication',
        'Cultural alignment',
        'Leadership potential'
      ]
    };
  }
}

