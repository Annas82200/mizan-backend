import { Logger } from '../../../../utils/logger.js';
import { randomUUID } from 'node:crypto';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface OutputTriggerData {
  triggerType: string;
  sourceModule: string;
  sourceTrigger: string;
  sourceAction: string;
  candidateId?: string;
  requisitionId?: string;
  employeeId?: string;
  tenantId: string;
  timestamp: Date;
  priority: 'critical' | 'high' | 'medium' | 'low';
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low';
  data: any;
}

export interface TriggerQueueResult {
  success: boolean;
  triggersQueued: number;
  errors: string[];
}

// ============================================================================
// OUTPUT TRIGGER MANAGER
// ============================================================================

/**
 * Manages output trigger generation and queuing for the Hiring Module
 * 
 * This service handles:
 * - Creating structured trigger data
 * - Queuing triggers for processing
 * - Managing trigger priorities and urgency
 * - Integration with message queues and databases
 */
export class HiringOutputTriggerManager {
  private logger: Logger;
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.logger = new Logger('HiringOutputTriggerManager');
  }

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * Process and queue multiple output triggers
   */
  async processOutputTriggers(triggerTypes: string[], sourceResult: any): Promise<TriggerQueueResult> {
    const result: TriggerQueueResult = {
      success: true,
      triggersQueued: 0,
      errors: []
    };

    try {
      this.logger.info(`Processing ${triggerTypes.length} output triggers`, {
        triggerTypes,
        sourceModule: 'hiring',
        tenantId: this.tenantId
      });

      for (const triggerType of triggerTypes) {
        try {
          const triggerData = this.createOutputTriggerData(triggerType, sourceResult);
          
          if (triggerData) {
            await this.queueTrigger(triggerData);
            result.triggersQueued++;
          } else {
            result.errors.push(`Failed to create trigger data for: ${triggerType}`);
          }
        } catch (error) {
          const errorMsg = `Error processing trigger ${triggerType}: ${(error as Error).message}`;
          this.logger.error(errorMsg, error as Error);
          result.errors.push(errorMsg);
          result.success = false;
        }
      }

      this.logger.info(`Output trigger processing complete`, {
        triggersQueued: result.triggersQueued,
        errors: result.errors.length,
        success: result.success
      });

      return result;

    } catch (error) {
      this.logger.error('Critical error in output trigger processing:', error);
      return {
        success: false,
        triggersQueued: 0,
        errors: [`Critical error: ${(error as Error).message}`]
      };
    }
  }

  /**
   * Create a single output trigger and queue it
   */
  async createAndQueueTrigger(triggerType: string, sourceResult: any): Promise<boolean> {
    try {
      const triggerData = this.createOutputTriggerData(triggerType, sourceResult);
      
      if (!triggerData) {
        this.logger.warn(`Failed to create trigger data for: ${triggerType}`);
        return false;
      }

      await this.queueTrigger(triggerData);
      return true;

    } catch (error) {
      this.logger.error(`Error creating and queuing trigger ${triggerType}:`, error);
      return false;
    }
  }

  // ============================================================================
  // TRIGGER DATA CREATION
  // ============================================================================

  /**
   * Create structured trigger data based on trigger type and source result
   */
  private createOutputTriggerData(triggerType: string, sourceResult: any): OutputTriggerData | null {
    try {
      const baseData: Partial<OutputTriggerData> = {
        triggerType,
        sourceModule: 'hiring',
        sourceTrigger: sourceResult.triggerType,
        sourceAction: sourceResult.action,
        candidateId: sourceResult.data?.candidateId,
        requisitionId: sourceResult.data?.requisitionId,
        employeeId: sourceResult.data?.employeeId,
        tenantId: this.tenantId,
        timestamp: new Date(),
        priority: this.getTriggerPriority(triggerType),
        urgencyLevel: this.getTriggerUrgency(triggerType)
      };

      // Add specific data based on trigger type
      const specificData = this.getSpecificTriggerData(triggerType, sourceResult);
      
      if (!specificData) {
        return null;
      }

      return {
        ...baseData,
        data: specificData
      } as OutputTriggerData;

    } catch (error) {
      this.logger.error(`Error creating trigger data for ${triggerType}:`, error);
      return null;
    }
  }

  /**
   * Get specific trigger data based on trigger type
   */
  private getSpecificTriggerData(triggerType: string, sourceResult: any): any | null {
    switch (triggerType) {
      case 'job_requisition_creation_required':
        return {
          hiringStrategies: sourceResult.data?.results || [],
          positionsToCreate: sourceResult.data?.results?.filter((r: any) => r.status === 'strategy_created').length || 0,
          urgency: 'high',
          targetModule: 'hiring_workflows',
          workflowType: 'job_requisition',
          estimatedTimeToComplete: '2-3 days',
          requiredApprovals: ['hiring_manager', 'department_head']
        };

      case 'candidate_screening_required':
        return {
          candidateId: sourceResult.data?.candidateId,
          requisitionId: sourceResult.data?.requisitionId,
          screeningType: 'comprehensive',
          assessmentRequired: true,
          targetModule: 'hiring_workflows',
          workflowType: 'candidate_screening',
          estimatedTimeToComplete: '1-2 hours',
          screeningSteps: [
            'resume_review',
            'skills_assessment',
            'culture_fit_evaluation',
            'initial_scoring'
          ]
        };

      case 'interview_scheduling_required':
        return {
          candidateId: sourceResult.data?.candidateId,
          requisitionId: sourceResult.data?.requisitionId,
          interviewType: sourceResult.data?.assessment?.interviewRecommendations?.interviewType || 'technical',
          priority: sourceResult.data?.assessment?.overallScore > 4.0 ? 'high' : 'medium',
          targetModule: 'hiring_workflows',
          workflowType: 'interview_management',
          estimatedTimeToComplete: '30 minutes',
          interviewRounds: this.determineInterviewRounds(sourceResult.data?.assessment),
          requiredInterviewers: this.getRequiredInterviewers(sourceResult.data?.requisitionId)
        };

      case 'offer_generation_required':
        return {
          candidateId: sourceResult.data?.candidateId,
          requisitionId: sourceResult.data?.requisitionId,
          interviewScore: sourceResult.data?.interviewScore || 0,
          recommendation: sourceResult.data?.recommendation,
          urgency: 'high',
          targetModule: 'hiring_workflows',
          workflowType: 'offer_management',
          estimatedTimeToComplete: '4-6 hours',
          offerComponents: [
            'salary_calculation',
            'benefits_package',
            'equity_allocation',
            'contract_generation'
          ],
          requiredApprovals: ['hiring_manager', 'hr_director', 'finance_approval']
        };

      case 'onboarding_trigger':
        return {
          employeeId: sourceResult.data?.employeeId,
          position: sourceResult.data?.position,
          department: sourceResult.data?.department,
          startDate: sourceResult.data?.startDate,
          hiringData: sourceResult.data?.hiringData,
          cultureFitScores: sourceResult.data?.hiringData?.candidate?.cultureFitScores,
          urgency: 'critical',
          targetModule: 'onboarding',
          workflowType: 'employee_onboarding',
          estimatedTimeToComplete: '2-3 weeks',
          onboardingTasks: [
            'welcome_email',
            'documentation_collection',
            'system_access_setup',
            'orientation_scheduling',
            'mentor_assignment',
            'first_day_preparation'
          ]
        };

      case 'employee_setup_required':
        return {
          employeeId: sourceResult.data?.employeeId,
          position: sourceResult.data?.position,
          department: sourceResult.data?.department,
          startDate: sourceResult.data?.startDate,
          targetModule: 'employee_management',
          workflowType: 'employee_setup',
          estimatedTimeToComplete: '1-2 days',
          setupTasks: [
            'create_user_accounts',
            'assign_equipment',
            'setup_workspace',
            'schedule_orientation',
            'create_employee_profile',
            'setup_payroll'
          ],
          requiredDepartments: ['IT', 'HR', 'Facilities']
        };

      default:
        this.logger.warn(`Unknown output trigger type: ${triggerType}`);
        return null;
    }
  }

  // ============================================================================
  // TRIGGER QUEUING AND PROCESSING
  // ============================================================================

  /**
   * Queue a trigger for processing
   */
  private async queueTrigger(triggerData: OutputTriggerData): Promise<void> {
    try {
      // Store trigger in database
      await this.storeTriggerInDatabase(triggerData);
      
      // Queue for message processing
      await this.queueTriggerForProcessing(triggerData);
      
      // Log successful queuing
      this.logger.info(`Successfully queued trigger: ${triggerData.triggerType}`, {
        triggerType: triggerData.triggerType,
        priority: triggerData.priority,
        targetModule: triggerData.data?.targetModule,
        estimatedTime: triggerData.data?.estimatedTimeToComplete
      });

    } catch (error) {
      this.logger.error(`Error queuing trigger ${triggerData.triggerType}:`, error);
      throw error;
    }
  }

  /**
   * Store trigger in database for tracking (simulated)
   */
  private async storeTriggerInDatabase(triggerData: OutputTriggerData): Promise<void> {
    try {
      const triggerId = randomUUID();
      
      // Simulate database storage
      this.logger.debug(`[SIMULATED] Stored trigger in database: ${triggerId}`, {
        triggerType: triggerData.triggerType,
        priority: triggerData.priority,
        tenantId: this.tenantId
      });

      // In a real implementation, this would:
      // 1. Store trigger in triggers table
      // 2. Store triggered action in triggeredActions table
      // 3. Update trigger status and metadata

    } catch (error) {
      this.logger.error('Error simulating trigger database storage:', error);
      // Don't throw - queuing can continue without database storage
    }
  }

  /**
   * Queue trigger for message processing (simulated)
   */
  private async queueTriggerForProcessing(triggerData: OutputTriggerData): Promise<void> {
    // Simulate async processing delay
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // In a real implementation, this would:
    // 1. Send to message queue (Redis/RabbitMQ/AWS SQS)
    // 2. Emit event to event bus
    // 3. Update metrics and monitoring
    // 4. Send notifications if high priority
    
    this.logger.debug(`[SIMULATED] Trigger queued for processing`, {
      triggerType: triggerData.triggerType,
      priority: triggerData.priority,
      targetModule: triggerData.data?.targetModule,
      queuedAt: triggerData.timestamp
    });
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get trigger priority based on type
   */
  private getTriggerPriority(triggerType: string): 'critical' | 'high' | 'medium' | 'low' {
    const priorityMap: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
      'onboarding_trigger': 'critical',
      'offer_generation_required': 'high',
      'job_requisition_creation_required': 'high',
      'employee_setup_required': 'high',
      'candidate_screening_required': 'medium',
      'interview_scheduling_required': 'medium'
    };

    return priorityMap[triggerType] || 'medium';
  }

  /**
   * Get trigger urgency level
   */
  private getTriggerUrgency(triggerType: string): 'critical' | 'high' | 'medium' | 'low' {
    const urgencyMap: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
      'onboarding_trigger': 'critical',
      'offer_generation_required': 'high',
      'employee_setup_required': 'high',
      'job_requisition_creation_required': 'medium',
      'candidate_screening_required': 'medium',
      'interview_scheduling_required': 'medium'
    };

    return urgencyMap[triggerType] || 'medium';
  }

  /**
   * Get display name for trigger type
   */
  private getTriggerDisplayName(triggerType: string): string {
    const nameMap: Record<string, string> = {
      'job_requisition_creation_required': 'Job Requisition Creation Required',
      'candidate_screening_required': 'Candidate Screening Required',
      'interview_scheduling_required': 'Interview Scheduling Required',
      'offer_generation_required': 'Offer Generation Required',
      'onboarding_trigger': 'Employee Onboarding Trigger',
      'employee_setup_required': 'Employee Setup Required'
    };

    return nameMap[triggerType] || triggerType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Determine interview rounds based on assessment
   */
  private determineInterviewRounds(assessment: any): string[] {
    if (!assessment) return ['technical', 'behavioral'];

    const rounds = ['technical'];
    
    if (assessment.overallScore > 4.0) {
      rounds.push('behavioral', 'final');
    } else {
      rounds.push('behavioral');
    }

    return rounds;
  }

  /**
   * Get required interviewers for a requisition
   */
  private getRequiredInterviewers(requisitionId: string): string[] {
    // In a real implementation, this would query the database
    return ['hiring_manager', 'technical_lead', 'team_member'];
  }
}
