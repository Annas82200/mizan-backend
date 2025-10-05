import { Logger } from '../../../../utils/logger.js';
import { db } from '../../../../db/index.js';
import { offers, candidates, hiringRequisitions } from '../../../../db/schema/hiring.js';
import { eq, and } from 'drizzle-orm';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface OfferWorkflowInput {
  tenantId: string;
  candidateId: string;
  requisitionId: string;
  
  // Compensation
  salary: number;
  currency?: string;
  bonus?: {
    type: string;
    amount: number;
    description: string;
  };
  equity?: {
    type: string;
    amount: number;
    vestingSchedule: string;
  };
  signOnBonus?: number;
  
  // Benefits
  benefits?: any[];
  relocationAssistance?: boolean;
  relocationPackage?: any;
  
  // Employment terms
  startDate: Date;
  employmentType?: string;
  probationPeriod?: string;
  
  // Approval
  requiresApproval?: boolean;
  approvedBy?: string;
  
  metadata?: any;
}

export interface OfferNegotiationInput {
  offerId: string;
  counterOffer: {
    salary?: number;
    bonus?: number;
    equity?: any;
    startDate?: Date;
    otherTerms?: any;
  };
  candidateNotes?: string;
}

// ============================================================================
// OFFER MANAGEMENT WORKFLOW
// ============================================================================

/**
 * Offer Management Workflow
 * 
 * Manages the complete job offer lifecycle:
 * 1. Generate offer based on assessment and interview results
 * 2. Calculate compensation using market data and candidate value
 * 3. Create offer in database
 * 4. Route for approval if needed
 * 5. Send offer to candidate
 * 6. Track offer status and negotiations
 * 7. Handle offer acceptance → trigger onboarding
 * 8. Handle offer rejection → continue search
 */
export class OfferManagementWorkflow {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('OfferManagementWorkflow');
  }

  /**
   * Generate and create job offer
   */
  async generateOffer(input: OfferWorkflowInput): Promise<any> {
    try {
      this.logger.info('Generating job offer', {
        candidateId: input.candidateId,
        requisitionId: input.requisitionId
      });

      // Step 1: Fetch candidate and requisition data
      const candidate = await this.fetchCandidate(input.candidateId, input.tenantId);
      const requisition = await this.fetchRequisition(input.requisitionId, input.tenantId);

      // Step 2: Validate offer parameters
      this.validateOfferParameters(input, requisition);

      // Step 3: Calculate total compensation package
      const compensationPackage = this.calculateCompensationPackage(input);

      // Step 4: Create offer in database
      const offerId = await this.createOffer(input, candidate, requisition, compensationPackage);

      // Step 5: Determine if approval is needed
      const approvalRequired = this.determineOfferApprovalRequirement(input, requisition);

      // Step 6: Generate offer letter (would call document generation service)
      const offerLetter = await this.generateOfferLetter(input, candidate, requisition);

      // Step 7: Prepare next steps
      const nextSteps = this.generateOfferNextSteps(approvalRequired);

      return {
        success: true,
        offerId,
        compensationPackage,
        approvalRequired,
        offerLetter,
        nextSteps,
        metadata: {
          workflowExecutedAt: new Date().toISOString(),
          executedBy: 'OfferManagementWorkflow'
        }
      };
    } catch (error) {
      this.logger.error('Error generating offer:', error);
      throw error;
    }
  }

  /**
   * Send offer to candidate
   */
  async sendOffer(offerId: string): Promise<any> {
    try {
      this.logger.info('Sending job offer', { offerId });

      // Update offer status to sent
      const [updatedOffer] = await db.update(offers)
        .set({
          status: 'sent',
          sentDate: new Date(),
          expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiry
          updatedAt: new Date()
        })
        .where(eq(offers.id, offerId))
        .returning();

      // Send offer email notification
      await this.sendOfferNotification(offerId, updatedOffer);
      
      this.logger.info('Offer email sent', {
        offerId,
        expiryDate: updatedOffer.expiryDate
      });

      return {
        success: true,
        offerId,
        sentDate: updatedOffer.sentDate,
        expiryDate: updatedOffer.expiryDate,
        status: 'sent'
      };
    } catch (error) {
      this.logger.error('Error sending offer:', error);
      throw error;
    }
  }

  /**
   * Handle offer acceptance
   */
  async acceptOffer(offerId: string, acceptanceData?: any): Promise<any> {
    try {
      this.logger.info('Processing offer acceptance', { offerId });

      // Step 1: Update offer status
      const [updatedOffer] = await db.update(offers)
        .set({
          status: 'accepted',
          acceptedDate: new Date(),
          respondedDate: new Date(),
          updatedAt: new Date(),
          metadata: {
            ...acceptanceData,
            acceptedAt: new Date().toISOString()
          }
        })
        .where(eq(offers.id, offerId))
        .returning();

      // Step 2: Update candidate status to hired
      await db.update(candidates)
        .set({
          status: 'hired',
          stage: 'hired',
          updatedAt: new Date()
        })
        .where(eq(candidates.id, updatedOffer.candidateId));

      // Step 3: Update requisition (increment positions filled)
      const requisition = await this.fetchRequisition(updatedOffer.requisitionId, updatedOffer.tenantId);
      const newPositionsFilled = (requisition.positionsFilled || 0) + 1;
      const allPositionsFilled = newPositionsFilled >= requisition.numberOfPositions;

      await db.update(hiringRequisitions)
        .set({
          positionsFilled: newPositionsFilled,
          status: allPositionsFilled ? 'filled' : requisition.status,
          closedDate: allPositionsFilled ? new Date() : null,
          updatedAt: new Date()
        })
        .where(eq(hiringRequisitions.id, updatedOffer.requisitionId));

      // Step 4: Generate onboarding trigger
      const onboardingTrigger = {
        type: 'onboarding_trigger',
        priority: 'high',
        data: {
          employeeId: updatedOffer.candidateId,
          tenantId: updatedOffer.tenantId,
          positionTitle: updatedOffer.positionTitle,
          department: updatedOffer.department,
          startDate: updatedOffer.startDate,
          hiringData: {
            offerId,
            salary: updatedOffer.salary,
            benefits: updatedOffer.benefits,
            requisitionId: updatedOffer.requisitionId
          }
        },
        targetModule: 'onboarding'
      };

      // Step 5: Generate structure update trigger (org chart changed - new employee)
      const structureUpdateTrigger = {
        type: 'structure_analysis_update',
        priority: 'high',
        data: {
          employeeId: updatedOffer.candidateId,
          tenantId: updatedOffer.tenantId,
          positionTitle: updatedOffer.positionTitle,
          department: updatedOffer.department,
          startDate: updatedOffer.startDate,
          updateReason: 'new_hire',
          impactedDepartment: updatedOffer.department,
          requiresReanalysis: true
        },
        targetModule: 'structure'
      };

      this.logger.info('Offer accepted, onboarding and structure update triggered', {
        offerId,
        candidateId: updatedOffer.candidateId,
        department: updatedOffer.department
      });

      return {
        success: true,
        offerId,
        candidateId: updatedOffer.candidateId,
        status: 'accepted',
        nextSteps: [
          'Trigger onboarding process',
          'Update organizational structure',
          'Send welcome package',
          'Schedule first day',
          'Prepare workspace'
        ],
        outputTriggers: [onboardingTrigger, structureUpdateTrigger]
      };
    } catch (error) {
      this.logger.error('Error accepting offer:', error);
      throw error;
    }
  }

  /**
   * Handle offer rejection
   */
  async rejectOffer(offerId: string, rejectionReason?: string): Promise<any> {
    try {
      this.logger.info('Processing offer rejection', { offerId });

      // Update offer status
      const [updatedOffer] = await db.update(offers)
        .set({
          status: 'rejected',
          rejectedDate: new Date(),
          respondedDate: new Date(),
          rejectionReason: rejectionReason || 'Not specified',
          updatedAt: new Date()
        })
        .where(eq(offers.id, offerId))
        .returning();

      // Update candidate status
      await db.update(candidates)
        .set({
          status: 'rejected',
          updatedAt: new Date()
        })
        .where(eq(candidates.id, updatedOffer.candidateId));

      this.logger.info('Offer rejected, candidate updated', {
        offerId,
        reason: rejectionReason
      });

      return {
        success: true,
        offerId,
        status: 'rejected',
        reason: rejectionReason,
        nextSteps: [
          'Continue search for candidates',
          'Re-evaluate recruitment strategy',
          'Consider backup candidates'
        ]
      };
    } catch (error) {
      this.logger.error('Error rejecting offer:', error);
      throw error;
    }
  }

  /**
   * Handle offer negotiation
   */
  async negotiateOffer(input: OfferNegotiationInput): Promise<any> {
    try {
      this.logger.info('Processing offer negotiation', { offerId: input.offerId });

      // Fetch current offer
      const offersList = await db.select()
        .from(offers)
        .where(eq(offers.id, input.offerId))
        .limit(1);

      if (offersList.length === 0) {
        throw new Error(`Offer not found: ${input.offerId}`);
      }

      const currentOffer = offersList[0];

      // Add to negotiation history
      const negotiationHistory = Array.isArray(currentOffer.negotiationHistory)
        ? currentOffer.negotiationHistory
        : [];
      negotiationHistory.push({
        date: new Date().toISOString(),
        counterOffer: input.counterOffer,
        notes: input.candidateNotes,
        version: (currentOffer.version || 1) + 1
      });

      const counterOffers = Array.isArray(currentOffer.counterOffers)
        ? currentOffer.counterOffers
        : [];

      // Update offer with negotiation
      await db.update(offers)
        .set({
          status: 'negotiating',
          negotiationHistory,
          counterOffers: [...counterOffers, input.counterOffer],
          negotiationNotes: input.candidateNotes,
          version: (currentOffer.version || 1) + 1,
          updatedAt: new Date()
        })
        .where(eq(offers.id, input.offerId));

      return {
        success: true,
        offerId: input.offerId,
        status: 'negotiating',
        negotiationRound: negotiationHistory.length,
        nextSteps: [
          'Review counter offer with hiring manager',
          'Evaluate budget flexibility',
          'Prepare revised offer or maintain position',
          'Respond within 48 hours'
        ]
      };
    } catch (error) {
      this.logger.error('Error processing negotiation:', error);
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
   * Create offer in database
   */
  private async createOffer(
    input: OfferWorkflowInput,
    candidate: any,
    requisition: any,
    compensationPackage: any
  ): Promise<string> {
    try {
      const offerData = {
        tenantId: input.tenantId,
        candidateId: input.candidateId,
        requisitionId: input.requisitionId,
        
        // Position details
        positionTitle: requisition.positionTitle,
        department: requisition.department,
        level: requisition.level,
        type: requisition.type,
        location: requisition.location,
        remote: requisition.remote,
        
        // Compensation
        salary: input.salary.toFixed(2),
        currency: input.currency || 'USD',
        payFrequency: 'annual',
        bonus: input.bonus,
        equity: input.equity,
        signOnBonus: input.signOnBonus?.toFixed(2),
        
        // Benefits
        benefits: input.benefits || requisition.benefits || [],
        benefitsValue: this.estimateBenefitsValue(input.benefits || []).toFixed(2),
        
        // Relocation
        relocationAssistance: input.relocationAssistance || false,
        relocationPackage: input.relocationPackage,
        
        // Employment terms
        startDate: input.startDate,
        employmentType: input.employmentType || 'at_will',
        probationPeriod: input.probationPeriod || '90 days',
        
        // Status
        status: 'draft' as 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'withdrawn' | 'sent' | 'negotiating' | 'accepted' | 'expired',
        version: 1,
        
        // Approval
        requiresApproval: input.requiresApproval !== false,
        approvedBy: input.approvedBy,
        
        // Metadata
        createdBy: 'system',
        metadata: {
          compensationPackage,
          interviewScores: candidate.assessmentSummary,
          cultureFitScore: candidate.cultureScore,
          generatedBy: 'OfferManagementWorkflow'
        }
      };

      const [created] = await db.insert(offers)
        .values(offerData)
        .returning();

      this.logger.info('Offer created successfully', {
        offerId: created.id,
        salary: input.salary,
        status: created.status
      });

      return created.id;
    } catch (error) {
      this.logger.error('Error creating offer:', error);
      throw error;
    }
  }

  /**
   * Validate offer parameters
   */
  private validateOfferParameters(input: OfferWorkflowInput, requisition: any): void {
    // Check salary is within requisition range
    const compensationRange = requisition.compensationRange;
    if (compensationRange) {
      if (input.salary < compensationRange.min || input.salary > compensationRange.max) {
        this.logger.warn('Salary outside requisition range', {
          offered: input.salary,
          min: compensationRange.min,
          max: compensationRange.max
        });
      }
    }

    // Validate required fields
    if (!input.salary || input.salary <= 0) {
      throw new Error('Valid salary is required');
    }
    if (!input.startDate) {
      throw new Error('Start date is required');
    }
  }

  /**
   * Calculate total compensation package
   */
  private calculateCompensationPackage(input: OfferWorkflowInput): any {
    const baseSalary = input.salary;
    const bonusAmount = input.bonus?.amount || 0;
    const signOnBonus = input.signOnBonus || 0;
    const estimatedBenefits = this.estimateBenefitsValue(input.benefits || []);

    const totalCash = baseSalary + bonusAmount + signOnBonus;
    const totalCompensation = totalCash + estimatedBenefits;

    return {
      baseSalary,
      bonus: bonusAmount,
      signOnBonus,
      equity: input.equity,
      benefits: estimatedBenefits,
      totalCash,
      totalCompensation,
      currency: input.currency || 'USD',
      breakdown: {
        base: baseSalary,
        variable: bonusAmount,
        oneTime: signOnBonus,
        benefits: estimatedBenefits,
        equity: input.equity?.amount || 0
      }
    };
  }

  /**
   * Estimate benefits value
   */
  private estimateBenefitsValue(benefits: any[]): number {
    if (!benefits || benefits.length === 0) return 0;
    
    let totalValue = 0;
    
    for (const benefit of benefits) {
      switch (benefit.type) {
        case 'health_insurance':
          totalValue += benefit.employerContribution || 8000; // Annual employer contribution
          break;
        case 'dental_insurance':
          totalValue += benefit.employerContribution || 1200;
          break;
        case 'vision_insurance':
          totalValue += benefit.employerContribution || 600;
          break;
        case 'retirement_401k':
          totalValue += benefit.matchPercentage ? (benefit.matchPercentage * 0.01 * 60000) : 3000; // Assume $60k average for match calculation
          break;
        case 'life_insurance':
          totalValue += benefit.coverage || 500;
          break;
        case 'disability_insurance':
          totalValue += benefit.premium || 800;
          break;
        case 'pto_vacation':
          // Calculate based on daily rate and days
          const dailyRate = 250; // Approximate daily rate
          totalValue += (benefit.days || 15) * dailyRate;
          break;
        case 'professional_development':
          totalValue += benefit.budget || 2000;
          break;
        default:
          totalValue += benefit.value || 1000; // Default value for other benefits
      }
    }
    
    return Math.round(totalValue);
  }

  /**
   * Determine if offer requires approval
   */
  private determineOfferApprovalRequirement(input: OfferWorkflowInput, requisition: any): boolean {
    // Approval required if:
    // - Salary above requisition max
    // - Executive/leadership position
    // - Sign-on bonus over threshold
    // - Equity grant included

    const compensationRange = requisition.compensationRange;
    if (compensationRange && input.salary > compensationRange.max) return true;
    if (requisition.level === 'executive' || requisition.level === 'leadership') return true;
    if (input.signOnBonus && input.signOnBonus > 10000) return true;
    if (input.equity) return true;

    return false;
  }

  /**
   * Send offer notification email
   */
  private async sendOfferNotification(offerId: string, offer: any): Promise<void> {
    try {
      // In production, this would integrate with email service (SendGrid, SES, etc.)
      const emailData = {
        to: offer.candidateEmail,
        subject: `Job Offer - ${offer.positionTitle}`,
        template: 'offer_notification',
        data: {
          candidateName: offer.candidateName,
          positionTitle: offer.positionTitle,
          companyName: 'Mizan',
          offerUrl: `https://offers.mizan.ai/view/${offerId}`,
          expiryDate: offer.expiryDate
        }
      };

      this.logger.info('Offer notification email queued', {
        offerId,
        recipient: offer.candidateEmail,
        template: emailData.template
      });

      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      this.logger.error('Failed to send offer notification:', error);
      throw error;
    }
  }

  /**
   * Generate offer letter document
   */
  private async generateOfferLetter(
    input: OfferWorkflowInput,
    candidate: any,
    requisition: any
  ): Promise<any> {
    try {
      // In production, this would integrate with document generation service
      const documentData = {
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        position: requisition.positionTitle,
        department: requisition.department,
        salary: input.salary,
        startDate: input.startDate,
        benefits: input.benefits || [],
        signOnBonus: input.signOnBonus,
        equity: input.equity,
        companyName: 'Mizan',
        generatedDate: new Date()
      };

      // Simulate document generation
      const documentId = `offer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      this.logger.info('Offer letter generated', {
        documentId,
        candidateName: documentData.candidateName,
        position: documentData.position
      });

      return {
        documentId,
        url: `https://documents.mizan.ai/offers/${documentId}.pdf`,
        generated: true,
        ...documentData
      };
      
    } catch (error) {
      this.logger.error('Failed to generate offer letter:', error);
      throw error;
    }
  }

  /**
   * Generate next steps for offer process
   */
  private generateOfferNextSteps(approvalRequired: boolean): string[] {
    const steps = [];

    if (approvalRequired) {
      steps.push('Submit offer for executive approval');
      steps.push('Await approval decision');
      steps.push('Send approved offer to candidate');
    } else {
      steps.push('Send offer to candidate');
    }

    steps.push('Track offer response (7-day expiry)');
    steps.push('Handle acceptance or negotiate terms');
    steps.push('Trigger onboarding upon acceptance');

    return steps;
  }
}

