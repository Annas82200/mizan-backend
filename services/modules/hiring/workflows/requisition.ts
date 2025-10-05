import { Logger } from '../../../../utils/logger.js';
import { RecruitmentStrategistAgent } from '../../../agents/hiring/recruitment-strategist.js';
import { db } from '../../../../db/index.js';
import { hiringRequisitions } from '../../../../db/schema/hiring.js';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface RequisitionWorkflowInput {
  tenantId: string;
  requestedBy: string;
  hiringManagerId: string;
  requisitionId?: string;
  
  // Position details
  positionTitle: string;
  department: string;
  level: string;
  type: string;
  location: string;
  remote: boolean;
  
  // Requirements
  description?: string;
  responsibilities?: string[];
  requiredSkills: any[];
  preferredSkills?: any[];
  experienceRequired?: string;
  educationRequired?: string;
  
  // Culture and compensation
  cultureValues?: string[];
  compensationRange: {
    min: number;
    max: number;
    currency: string;
  };
  benefits?: string[];
  
  // Context
  urgency?: string;
  numberOfPositions?: number;
  targetStartDate?: Date;
  structureAnalysis?: any;
  organizationalContext?: any;
  
  metadata?: any;
}

// ============================================================================
// JOB REQUISITION WORKFLOW
// ============================================================================

/**
 * Job Requisition Workflow
 * 
 * Manages the complete job requisition lifecycle:
 * 1. Receive hiring needs (from structure analysis or manual request)
 * 2. Use Recruitment Strategist agent to develop strategy
 * 3. Generate comprehensive job description
 * 4. Create requisition in database
 * 5. Route for approval
 * 6. Prepare for job posting
 */
export class JobRequisitionWorkflow {
  private logger: Logger;
  private recruitmentStrategist: RecruitmentStrategistAgent;

  constructor() {
    this.logger = new Logger('JobRequisitionWorkflow');
    this.recruitmentStrategist = new RecruitmentStrategistAgent();
  }

  /**
   * Execute the job requisition workflow
   */
  async execute(input: RequisitionWorkflowInput): Promise<any> {
    try {
      this.logger.info('Executing job requisition workflow', {
        positionTitle: input.positionTitle,
        department: input.department,
        urgency: input.urgency
      });

      // Step 1: Validate input
      this.validateInput(input);

      // Step 2: Develop recruitment strategy using AI agent
      const recruitmentStrategy = await this.developRecruitmentStrategy(input);

      // Step 3: Enhance job description using AI recommendations
      const jobDescription = this.enhanceJobDescription(input, recruitmentStrategy);

      // Step 4: Create requisition in database
      const requisitionId = await this.createRequisition(input, recruitmentStrategy, jobDescription);

      // Step 5: Determine approval workflow
      const approvalRequired = this.determineApprovalRequirement(input);

      // Step 6: Generate next steps
      const nextSteps = this.generateNextSteps(approvalRequired, recruitmentStrategy);

      return {
        success: true,
        requisitionId,
        recruitmentStrategy,
        jobDescription,
        approvalRequired,
        nextSteps,
        metadata: {
          workflowExecutedAt: new Date().toISOString(),
          executedBy: 'JobRequisitionWorkflow'
        }
      };
    } catch (error) {
      this.logger.error('Error executing job requisition workflow:', error);
      throw error;
    }
  }

  // ============================================================================
  // WORKFLOW STEPS
  // ============================================================================

  /**
   * Validate input data
   */
  private validateInput(input: RequisitionWorkflowInput): void {
    if (!input.positionTitle) {
      throw new Error('Position title is required');
    }
    if (!input.department) {
      throw new Error('Department is required');
    }
    if (!input.hiringManagerId) {
      throw new Error('Hiring manager ID is required');
    }
    if (!input.compensationRange || !input.compensationRange.min || !input.compensationRange.max) {
      throw new Error('Compensation range is required');
    }
  }

  /**
   * Develop recruitment strategy using AI agent
   */
  private async developRecruitmentStrategy(input: RequisitionWorkflowInput): Promise<any> {
    this.logger.info('Developing recruitment strategy', {
      positionTitle: input.positionTitle
    });

    const strategy = await this.recruitmentStrategist.developRecruitmentStrategy({
      tenantId: input.tenantId,
      requisitionId: input.requisitionId || `req_${randomUUID().slice(0, 8)}_${Date.now()}`,
      positionTitle: input.positionTitle,
      department: input.department,
      level: input.level || 'mid',
      requiredSkills: input.requiredSkills,
      experienceRequired: input.experienceRequired || '2-5 years',
      budget: {
        min: input.compensationRange.min,
        max: input.compensationRange.max,
        currency: input.compensationRange.currency
      },
      urgency: input.urgency || 'medium',
      location: input.location,
      remote: input.remote,
      structureAnalysis: input.structureAnalysis,
      organizationalContext: input.organizationalContext,
      cultureValues: input.cultureValues
    });

    this.logger.info('Recruitment strategy developed', {
      approach: strategy.strategy.approach,
      timeline: strategy.timeline.totalDays,
      channels: strategy.sourcingPlan.channels.length
    });

    return strategy;
  }

  /**
   * Enhance job description with AI recommendations
   */
  private enhanceJobDescription(input: RequisitionWorkflowInput, strategy: any): any {
    const aiJobDescription = strategy.jobDescription;

    return {
      title: aiJobDescription.title || input.positionTitle,
      summary: aiJobDescription.summary || input.description || `Join our team as a ${input.positionTitle}`,
      responsibilities: aiJobDescription.responsibilities || input.responsibilities || [],
      requirements: aiJobDescription.requirements || input.requiredSkills.map(s => s.skill || s),
      qualifications: aiJobDescription.qualifications || input.preferredSkills?.map(s => s.skill || s) || [],
      benefits: aiJobDescription.benefits || input.benefits || [],
      cultureFit: aiJobDescription.cultureFit || input.cultureValues || [],
      
      // Additional AI enhancements
      optimizedForSEO: true,
      targetAudience: strategy.sourcingPlan.targetAudience,
      generatedBy: 'AI'
    };
  }

  /**
   * Create requisition in database
   */
  private async createRequisition(
    input: RequisitionWorkflowInput,
    strategy: any,
    jobDescription: any
  ): Promise<string> {
    try {
      this.logger.info('Creating requisition in database', {
        positionTitle: input.positionTitle,
        department: input.department
      });

      const requisitionData = {
        tenantId: input.tenantId,
        
        // Position details
        positionTitle: input.positionTitle,
        department: input.department,
        level: (input.level || 'mid') as 'entry' | 'mid' | 'senior' | 'executive' | 'leadership',
        type: (input.type || 'full_time') as 'full_time' | 'part_time' | 'contract' | 'temporary' | 'intern',
        
        // Location
        location: input.location,
        remote: input.remote,
        remoteDetails: input.remote ? 'fully_remote' : 'on_site',
        
        // Job description
        description: jobDescription.summary,
        responsibilities: jobDescription.responsibilities,
        qualifications: [...jobDescription.requirements, ...jobDescription.qualifications],
        
        // Skills
        requiredSkills: input.requiredSkills,
        preferredSkills: input.preferredSkills || [],
        experienceRequired: input.experienceRequired || '2-5 years',
        educationRequired: input.educationRequired,
        
        // Culture
        cultureValues: input.cultureValues || [],
        cultureFitWeight: '0.30',
        
        // Compensation
        compensationRange: input.compensationRange,
        benefits: input.benefits || [],
        relocationPackage: false,
        
        // Management
        urgency: (input.urgency || 'medium') as 'low' | 'medium' | 'high' | 'critical',
        status: 'draft' as 'draft' | 'pending_approval' | 'approved' | 'posted' | 'filled' | 'cancelled' | 'on_hold',
        numberOfPositions: input.numberOfPositions || 1,
        positionsFilled: 0,
        
        // Dates
        targetStartDate: input.targetStartDate || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        
        // Ownership
        requestedBy: input.requestedBy,
        hiringManagerId: input.hiringManagerId,
        
        // AI and automation
        aiGenerated: true,
        aiRecommendations: {
          strategy: strategy.strategy,
          sourcingPlan: strategy.sourcingPlan,
          timeline: strategy.timeline,
          budget: strategy.budget,
          risks: strategy.risks
        },
        
        // Metadata
        metadata: {
          recruitmentStrategy: strategy,
          jobDescription: jobDescription,
          createdBy: 'JobRequisitionWorkflow',
          workflowVersion: '1.0.0'
        }
      };

      const [created] = await db.insert(hiringRequisitions)
        .values(requisitionData)
        .returning();

      this.logger.info('Requisition created successfully', {
        requisitionId: created.id,
        status: created.status
      });

      return created.id;
    } catch (error) {
      this.logger.error('Error creating requisition:', error);
      throw error;
    }
  }

  /**
   * Determine if approval is required
   */
  private determineApprovalRequirement(input: RequisitionWorkflowInput): boolean {
    // Approval required if:
    // - Executive or leadership position
    // - Compensation above threshold
    // - Multiple positions
    // - Critical urgency

    if (input.level === 'executive' || input.level === 'leadership') return true;
    if (input.compensationRange.max > 150000) return true;
    if ((input.numberOfPositions || 1) > 3) return true;
    if (input.urgency === 'critical') return true;

    return false;
  }

  /**
   * Generate next steps
   */
  private generateNextSteps(approvalRequired: boolean, strategy: any): string[] {
    const steps = [];

    if (approvalRequired) {
      steps.push('Submit for approval');
      steps.push('Await approval decision');
    } else {
      steps.push('Auto-approve requisition');
    }

    steps.push('Generate job posting');
    steps.push(`Publish to ${strategy.sourcingPlan?.channels?.length || 3} channels`);
    steps.push('Begin candidate sourcing');
    steps.push(`Timeline: ${strategy.timeline?.totalDays || 45} days`);

    return steps;
  }
}

