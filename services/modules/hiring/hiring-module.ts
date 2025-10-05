import { Logger } from '../../../utils/logger.js';
import { RecruitmentStrategistAgent } from '../../agents/hiring/recruitment-strategist.js';
import { CandidateAssessorAgent } from '../../agents/hiring/candidate-assessor.js';
import { HiringOutputTriggerManager } from './integrations/output-triggers.js';
import { structureIntegration, StructureAnalysisData } from './integrations/structure-integration.js';
import { cultureIntegration, CultureAnalysisData, CultureFitAssessment } from './integrations/culture-integration.js';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface HiringModuleConfig {
  tenantId: string;
  moduleId: string;
  enabled: boolean;
  settings?: any;
}

export interface HiringTriggerContext {
  triggerType: string;
  tenantId: string;
  data: any;
  metadata?: any;
}

// ============================================================================
// HIRING MODULE ORCHESTRATOR
// ============================================================================

/**
 * Hiring Module Orchestrator
 * 
 * Coordinates the hiring process using:
 * - Recruitment Strategist Agent: Develops recruitment strategies
 * - Candidate Assessor Agent: Evaluates candidates with Mizan 7 Cylinders
 * - Existing hiring logic: Job posting, interviews, offers
 * 
 * Integrates with:
 * - Structure Analysis (input trigger)
 * - Onboarding Module (output trigger)
 * - Trigger Engine
 */
export class HiringModule {
  private config: HiringModuleConfig;
  private logger: Logger;
  private recruitmentStrategist: RecruitmentStrategistAgent;
  private candidateAssessor: CandidateAssessorAgent;
  private outputTriggerManager: HiringOutputTriggerManager;
  private initialized: boolean = false;

  constructor(config: HiringModuleConfig) {
    this.config = config;
    this.logger = new Logger('HiringModule');
    this.recruitmentStrategist = new RecruitmentStrategistAgent();
    this.candidateAssessor = new CandidateAssessorAgent();
    this.outputTriggerManager = new HiringOutputTriggerManager(config.tenantId);
  }

  // ============================================================================
  // MODULE LIFECYCLE
  // ============================================================================

  /**
   * Initialize the Hiring module
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Hiring Module', {
        tenantId: this.config.tenantId,
        moduleId: this.config.moduleId
      });

      // AI agents are ready to use (no initialization required)

      this.initialized = true;

      this.logger.info('Hiring Module initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing Hiring Module:', error);
      throw error;
    }
  }

  /**
   * Handle incoming triggers (compatible with trigger engine interface)
   */
  async handleTrigger(triggerType: string, config: any, unifiedResults: any): Promise<any> {
    // Convert to internal trigger context format
    const triggerContext: HiringTriggerContext = {
      triggerType,
      tenantId: unifiedResults.tenantId || config.tenantId || 'default-tenant',
      data: {
        ...config,
        ...unifiedResults,
        structureAnalysis: unifiedResults.structureAnalysis,
        hiringNeeds: unifiedResults.recommendations?.filter((r: any) => 
          r.category === 'structure' && 
          (r.title.toLowerCase().includes('hiring') || r.title.toLowerCase().includes('position'))
        ) || [],
        organizationalContext: unifiedResults.organizationalContext,
        cultureValues: unifiedResults.cultureAnalysis?.values || []
      },
      metadata: {
        triggeredAt: new Date().toISOString(),
        triggerEngine: true
      }
    };

    const result = await this.processHiringTrigger(triggerContext);
    
    // Process output triggers after successful trigger handling
    if (result.success && result.nextTriggers && result.nextTriggers.length > 0) {
      await this.processOutputTriggers(result);
    }
    
    return result;
  }

  /**
   * Internal trigger processing method
   */
  async processHiringTrigger(triggerContext: HiringTriggerContext): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }

    this.logger.info('Processing hiring trigger', {
      triggerType: triggerContext.triggerType,
      tenantId: triggerContext.tenantId
    });

    try {
      switch (triggerContext.triggerType) {
        case 'structure_analysis_expansion':
          return await this.handleStructureExpansionTrigger(triggerContext);
        
        case 'hiring_needs_urgent':
          return await this.handleUrgentHiringTrigger(triggerContext);
        
        case 'candidate_applied':
          return await this.handleCandidateApplicationTrigger(triggerContext);
        
        case 'interview_completed':
          return await this.handleInterviewCompletedTrigger(triggerContext);
        
        case 'offer_accepted':
          return await this.handleOfferAcceptedTrigger(triggerContext);
        
        default:
          this.logger.warn('Unknown trigger type', { triggerType: triggerContext.triggerType });
          return {
            success: false,
            message: `Unknown trigger type: ${triggerContext.triggerType}`
          };
      }
    } catch (error) {
      this.logger.error('Error handling trigger:', error);
      throw error;
    }
  }

  // ============================================================================
  // TRIGGER HANDLERS
  // ============================================================================

  /**
   * Handle structure analysis expansion trigger
   * Triggered when: Organization needs more layers/positions
   */
  private async handleStructureExpansionTrigger(context: HiringTriggerContext): Promise<any> {
    this.logger.info('Handling structure expansion trigger', {
      tenantId: context.tenantId
    });

    try {
      // Process structure analysis data through the integration
      const structureData: StructureAnalysisData = {
        tenantId: context.tenantId,
        analysisId: context.data.analysisId || `analysis_${Date.now()}`,
        analysisType: context.data.analysisType || 'organizational_restructure',
        department: context.data.department,
        position: context.data.position,
        level: context.data.level || 'mid',
        action: context.data.action || 'create',
        urgency: context.data.urgency || 'medium',
        timeline: {
          startDate: new Date(),
          targetDate: context.data.targetDate ? new Date(context.data.targetDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          priority: context.data.priority || 1
        },
        requirements: {
          skills: context.data.requiredSkills || [],
          experience: context.data.experienceRequired || '2-5 years',
          education: context.data.educationRequired || 'Bachelor\'s degree',
          competencies: context.data.competencies || []
        },
        budget: {
          salaryRange: context.data.salaryRange || { min: 50000, max: 100000 },
          totalBudget: context.data.totalBudget || 100000,
          approvalRequired: context.data.approvalRequired || false
        },
        impact: {
          affectedEmployees: context.data.affectedEmployees || 0,
          newPositions: context.data.newPositions || 1,
          eliminatedPositions: context.data.eliminatedPositions || 0,
          departmentChanges: context.data.departmentChanges || []
        },
        rationale: context.data.rationale || 'Organizational structure analysis',
        metadata: context.data.metadata || {}
      };

      // Validate structure analysis data
      const validation = structureIntegration.validateStructureAnalysisData(structureData);
      if (!validation.isValid) {
        this.logger.error('Invalid structure analysis data', { errors: validation.errors });
        return {
          success: false,
          moduleId: this.config.moduleId,
          triggerType: context.triggerType,
          action: 'structure_analysis_validation_failed',
          data: { errors: validation.errors },
          nextTriggers: [],
          confidence: 0,
          processingTime: 0
        };
      }

      // Process structure analysis through integration
      const integrationResult = await structureIntegration.processStructureAnalysis(structureData);
      
      if (!integrationResult.success) {
        this.logger.error('Structure analysis processing failed', { errors: integrationResult.errors });
        return {
          success: false,
          moduleId: this.config.moduleId,
          triggerType: context.triggerType,
          action: 'structure_analysis_processing_failed',
          data: { errors: integrationResult.errors },
          nextTriggers: [],
          confidence: 0,
          processingTime: 0
        };
      }

      // Process each created hiring need through recruitment strategist
      const results = [];
      
      for (const hiringNeed of integrationResult.hiringNeeds) {
        try {
          // Develop recruitment strategy using AI agent
          const strategy = await this.recruitmentStrategist.developRecruitmentStrategy({
            tenantId: context.tenantId,
            requisitionId: `req_${Date.now()}`,
            positionTitle: hiringNeed.positionTitle,
            department: hiringNeed.department,
            level: hiringNeed.level,
            requiredSkills: hiringNeed.requiredSkills,
            experienceRequired: hiringNeed.experienceRequired,
            urgency: hiringNeed.urgency,
            location: 'Remote', // Default, can be updated
            remote: true,
            structureAnalysis: structureData,
            organizationalContext: context.data.organizationalContext,
            cultureValues: context.data.cultureValues || []
          });

          results.push({
            position: hiringNeed.positionTitle,
            department: hiringNeed.department,
            requisitionId: hiringNeed.structureAnalysisId,
            strategy,
            status: 'strategy_created'
          });
        } catch (error) {
          this.logger.error('Error processing hiring need:', error as Error);
          results.push({
            position: hiringNeed.positionTitle,
            error: (error as Error).message,
            status: 'failed'
          });
        }
      }

      const nextTriggers = this.generateNextTriggers('structure_analysis_expansion', results);

      return {
        success: true,
        moduleId: this.config.moduleId,
        triggerType: 'structure_analysis_expansion',
        action: this.getActionForTrigger('structure_analysis_expansion'),
        data: {
          structureAnalysisId: structureData.analysisId,
          hiringNeedsCreated: integrationResult.hiringNeeds.length,
          requisitionsCreated: integrationResult.requisitionsCreated.length,
          strategiesCreated: results.length,
          successfulStrategies: results.filter(r => r.status === 'strategy_created').length,
          failedStrategies: results.filter(r => r.status === 'failed').length,
          results,
          nextSteps: [
            'Job requisitions created from structure analysis',
            'Recruitment strategies developed',
            'Ready for candidate sourcing'
          ]
        },
        nextTriggers,
        confidence: this.calculateConfidence(results),
        processingTime: Date.now() - Date.now() // Will be calculated properly
      };

    } catch (error) {
      this.logger.error('Error handling structure expansion trigger:', error as Error);
      return {
        success: false,
        moduleId: this.config.moduleId,
        triggerType: context.triggerType,
        action: 'structure_analysis_processing_failed',
        data: { error: (error as Error).message },
        nextTriggers: [],
        confidence: 0,
        processingTime: 0
      };
    }
  }

  /**
   * Handle urgent hiring trigger
   */
  private async handleUrgentHiringTrigger(context: HiringTriggerContext): Promise<any> {
    this.logger.info('Handling urgent hiring trigger', {
      tenantId: context.tenantId
    });

    // Similar to structure expansion but with higher urgency
    return await this.handleStructureExpansionTrigger({
      ...context,
      data: {
        ...context.data,
        structureAnalysis: {
          ...context.data.structureAnalysis,
          urgency: 'critical'
        }
      }
    });
  }

  /**
   * Handle candidate application trigger
   */
  private async handleCandidateApplicationTrigger(context: HiringTriggerContext): Promise<any> {
    this.logger.info('Handling candidate application trigger', {
      tenantId: context.tenantId,
      candidateId: context.data.candidateId
    });

    const { candidate, requisition } = context.data;

    // Assess candidate using AI agent
    const assessment = await this.candidateAssessor.assessCandidate({
      tenantId: context.tenantId,
      candidateId: candidate.id,
      requisitionId: requisition.id,
      candidate: {
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email,
        resume: candidate.resume,
        skills: candidate.skills || [],
        experience: candidate.experience || [],
        education: candidate.education || [],
        coverLetter: candidate.coverLetter
      },
      jobRequirements: {
        title: requisition.positionTitle,
        level: requisition.level,
        requiredSkills: requisition.requiredSkills || [],
        preferredSkills: requisition.preferredSkills || [],
        experienceRequired: requisition.experienceRequired,
        cultureFit: requisition.cultureValues || []
      },
      companyData: context.data.companyData || {
        values: requisition.cultureValues || []
      },
      assessmentType: 'comprehensive'
    });

    const nextTriggers = this.generateNextTriggers('candidate_applied', assessment);

    return {
      success: true,
      moduleId: this.config.moduleId,
      triggerType: 'candidate_applied',
      action: this.getActionForTrigger('candidate_applied'),
      data: {
        assessment,
        candidateId: candidate.id,
        requisitionId: requisition.id,
        shouldInterview: assessment.interviewRecommendations.shouldInterview,
        nextSteps: assessment.interviewRecommendations.shouldInterview
          ? ['Schedule interview', 'Prepare interview questions']
          : ['Send rejection notification']
      },
      nextTriggers,
      confidence: this.calculateConfidence(assessment),
      processingTime: 0
    };
  }

  /**
   * Handle interview completed trigger
   */
  private async handleInterviewCompletedTrigger(context: HiringTriggerContext): Promise<any> {
    this.logger.info('Handling interview completed trigger', {
      tenantId: context.tenantId,
      interviewId: context.data.interviewId
    });

    const { interview, candidate } = context.data;

    // Check if this was the final interview
    const isFinalInterview = interview.type === 'final' || interview.round >= 3;

    const result = {
      recommendation: isFinalInterview && interview.recommendation === 'strong_yes' 
        ? 'proceed_to_offer' 
        : 'continue_process',
      candidateId: candidate.id,
      requisitionId: interview.requisitionId,
      interviewScore: interview.score || 0,
      isFinalInterview
    };

    const nextTriggers = this.generateNextTriggers('interview_completed', result);

    return {
      success: true,
      moduleId: this.config.moduleId,
      triggerType: 'interview_completed',
      action: this.getActionForTrigger('interview_completed'),
      data: {
        ...result,
        nextSteps: result.recommendation === 'proceed_to_offer' 
          ? ['Generate offer', 'Prepare offer letter']
          : ['Continue interview process', 'Schedule next round if needed']
      },
      nextTriggers,
      confidence: this.calculateConfidence(result),
      processingTime: 0
    };
  }

  /**
   * Handle offer accepted trigger
   */
  private async handleOfferAcceptedTrigger(context: HiringTriggerContext): Promise<any> {
    this.logger.info('Handling offer accepted trigger', {
      tenantId: context.tenantId,
      offerId: context.data.offerId
    });

    const { offer, candidate } = context.data;

    const result = {
      success: true,
      employeeId: candidate.id,
      position: offer.positionTitle,
      department: offer.department,
      startDate: offer.startDate,
      hiringData: {
        offer,
        candidate,
        cultureFitScores: candidate.cultureFitScores
      }
    };

    const nextTriggers = this.generateNextTriggers('offer_accepted', result);

    return {
      success: true,
      moduleId: this.config.moduleId,
      triggerType: 'offer_accepted',
      action: this.getActionForTrigger('offer_accepted'),
      data: {
        ...result,
        nextSteps: ['Begin onboarding process', 'Setup employee accounts', 'Prepare workspace']
      },
      nextTriggers,
      confidence: this.calculateConfidence(result),
      processingTime: 0
    };
  }

  // ============================================================================
  // MODULE MANAGEMENT
  // ============================================================================

  // ============================================================================
  // HELPER METHODS FOR TRIGGER ENGINE COMPATIBILITY
  // ============================================================================

  /**
   * Generate next triggers based on hiring workflow results
   */
  private generateNextTriggers(triggerType: string, results: any): string[] {
    const nextTriggers: string[] = [];

    switch (triggerType) {
      case 'structure_analysis_expansion':
      case 'hiring_needs_urgent':
        // After hiring strategies are created, we need to create requisitions
        if (results.filter && results.filter((r: any) => r.status === 'strategy_created').length > 0) {
          nextTriggers.push('job_requisition_creation_required');
        }
        break;

      case 'candidate_applied':
        // After candidate applies, trigger screening
        nextTriggers.push('candidate_screening_required');
        break;

      case 'interview_completed':
        // After interview, check if candidate should get offer
        if (results.recommendation === 'proceed_to_offer') {
          nextTriggers.push('offer_generation_required');
        } else if (results.recommendation === 'additional_interview') {
          nextTriggers.push('interview_scheduling_required');
        }
        break;

      case 'offer_accepted':
        // After offer accepted, trigger onboarding
        nextTriggers.push('onboarding_trigger');
        nextTriggers.push('employee_setup_required');
        break;
    }

    return nextTriggers;
  }

  /**
   * Calculate confidence score based on results
   */
  private calculateConfidence(results: any): number {
    if (!results) return 0.5;

    // For array results (like hiring strategies)
    if (Array.isArray(results)) {
      const successCount = results.filter((r: any) => r.status === 'strategy_created' || r.status === 'success').length;
      return successCount > 0 ? Math.min(0.9, 0.6 + (successCount / results.length) * 0.3) : 0.3;
    }

    // For single results
    if (results.success !== undefined) {
      return results.success ? 0.85 : 0.2;
    }

    // Default confidence
    return 0.7;
  }

  /**
   * Get action description for trigger type
   */
  private getActionForTrigger(triggerType: string): string {
    const actionMap: Record<string, string> = {
      'structure_analysis_expansion': 'hiring_strategies_created',
      'hiring_needs_urgent': 'urgent_hiring_initiated',
      'candidate_applied': 'candidate_screening_initiated',
      'interview_completed': 'interview_results_processed',
      'offer_accepted': 'onboarding_triggered'
    };

    return actionMap[triggerType] || 'hiring_action_completed';
  }


  /**
   * Process and queue output triggers after workflow completion
   */
  async processOutputTriggers(result: any): Promise<void> {
    if (result.nextTriggers && result.nextTriggers.length > 0) {
      this.logger.info(`Processing ${result.nextTriggers.length} output triggers`);
      
      const triggerResult = await this.outputTriggerManager.processOutputTriggers(
        result.nextTriggers, 
        result
      );
      
      if (!triggerResult.success) {
        this.logger.warn('Some output triggers failed to process', {
          errors: triggerResult.errors,
          triggersQueued: triggerResult.triggersQueued
        });
      } else {
        this.logger.info(`Successfully processed ${triggerResult.triggersQueued} output triggers`);
      }
    }
  }

  /**
   * Check module health
   */
  async checkHealth(): Promise<any> {
    return {
      module: 'hiring',
      status: this.initialized ? 'healthy' : 'not_initialized',
      agents: {
        recruitmentStrategist: 'operational',
        candidateAssessor: 'operational'
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get module status
   */
  getStatus(): any {
    return {
      moduleId: this.config.moduleId,
      tenantId: this.config.tenantId,
      enabled: this.config.enabled,
      initialized: this.initialized,
      agents: {
        recruitmentStrategist: {
          name: 'RecruitmentStrategist',
          status: 'ready',
          version: '1.0.0'
        },
        candidateAssessor: {
          name: 'CandidateAssessor',
          status: 'ready',
          version: '1.0.0'
        }
      }
    };
  }

  /**
   * Handle structure analysis updates
   * Called when structure analysis data changes
   */
  public async handleStructureAnalysisUpdate(
    analysisId: string,
    updates: Partial<StructureAnalysisData>
  ): Promise<{ success: boolean; updatedRequisitions: string[]; errors: string[] }> {
    try {
      this.logger.info('Handling structure analysis update', {
        analysisId,
        tenantId: this.config.tenantId
      });

      const result = await structureIntegration.updateHiringNeedFromStructureAnalysis(
        analysisId,
        updates
      );

      this.logger.info('Structure analysis update completed', {
        analysisId,
        success: result.success,
        updatedRequisitions: result.updatedRequisitions.length,
        errors: result.errors.length
      });

      return result;

    } catch (error) {
      this.logger.error('Error handling structure analysis update:', error as Error);
      return {
        success: false,
        updatedRequisitions: [],
        errors: [(error as Error).message]
      };
    }
  }

  /**
   * Get hiring needs by structure analysis ID
   */
  public async getHiringNeedsByStructureAnalysis(analysisId: string): Promise<any[]> {
    try {
      return await structureIntegration.getHiringNeedsByStructureAnalysis(analysisId);
    } catch (error) {
      this.logger.error('Error getting hiring needs by structure analysis:', error as Error);
      return [];
    }
  }

  /**
   * Handle culture analysis updates
   * Called when culture analysis data changes
   */
  public async handleCultureAnalysisUpdate(
    analysisId: string,
    updates: Partial<CultureAnalysisData>
  ): Promise<{ success: boolean; updatedRequisitions: string[]; errors: string[] }> {
    try {
      this.logger.info('Handling culture analysis update', {
        analysisId,
        tenantId: this.config.tenantId
      });

      const result = await cultureIntegration.processCultureAnalysis(updates as CultureAnalysisData);

      this.logger.info('Culture analysis update completed', {
        analysisId,
        success: result.success,
        updatedRequisitions: result.updatedRequisitions.length,
        errors: result.errors.length
      });

      return {
        success: result.success,
        updatedRequisitions: result.updatedRequisitions,
        errors: result.errors
      };

    } catch (error) {
      this.logger.error('Error handling culture analysis update:', error as Error);
      return {
        success: false,
        updatedRequisitions: [],
        errors: [(error as Error).message]
      };
    }
  }

  /**
   * Assess candidate culture fit using Mizan 7 Cylinders
   */
  public async assessCandidateCultureFit(
    candidateId: string,
    cultureAnalysisId: string,
    candidateData: any
  ): Promise<CultureFitAssessment> {
    try {
      this.logger.info('Assessing candidate culture fit', {
        candidateId,
        cultureAnalysisId,
        tenantId: this.config.tenantId
      });

      const assessment = await cultureIntegration.assessCandidateCultureFit(
        candidateId,
        cultureAnalysisId,
        candidateData
      );

      this.logger.info('Candidate culture fit assessment completed', {
        candidateId,
        overallFit: assessment.overallCultureFit,
        recommendation: assessment.recommendations.hireRecommendation
      });

      return assessment;

    } catch (error) {
      this.logger.error('Error assessing candidate culture fit:', error as Error);
      throw error;
    }
  }

  /**
   * Get culture fit assessments for a candidate
   */
  public async getCandidateCultureAssessments(candidateId: string): Promise<CultureFitAssessment[]> {
    try {
      return await cultureIntegration.getCandidateCultureAssessments(candidateId);
    } catch (error) {
      this.logger.error('Error getting candidate culture assessments:', error as Error);
      return [];
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get module configuration
   */
  getConfig(): HiringModuleConfig {
    return this.config;
  }

  /**
   * Update module configuration
   */
  updateConfig(updates: Partial<HiringModuleConfig>): void {
    this.config = { ...this.config, ...updates };
    this.logger.info('Hiring module configuration updated', { updates });
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let hiringModuleInstance: HiringModule | null = null;

export const hiringModule = {
  /**
   * Initialize the hiring module
   */
  async initialize(config: HiringModuleConfig): Promise<HiringModule> {
    if (!hiringModuleInstance) {
      hiringModuleInstance = new HiringModule(config);
      await hiringModuleInstance.initialize();
    }
    return hiringModuleInstance;
  },

  /**
   * Get the hiring module instance
   */
  getInstance(): HiringModule | null {
    return hiringModuleInstance;
  },

  /**
   * Handle a trigger (legacy interface - converts to new format)
   */
  async handleTrigger(context: HiringTriggerContext): Promise<any> {
    if (!hiringModuleInstance) {
      throw new Error('Hiring module not initialized');
    }
    // Convert old interface to new trigger engine interface
    return await hiringModuleInstance.handleTrigger(
      context.triggerType,
      context.data,
      { tenantId: context.tenantId, ...context.data }
    );
  },

  /**
   * Check health
   */
  async checkHealth(): Promise<any> {
    if (!hiringModuleInstance) {
      return {
        module: 'hiring',
        status: 'not_initialized',
        timestamp: new Date().toISOString()
      };
    }
    return await hiringModuleInstance.checkHealth();
  },

  /**
   * Get status
   */
  getStatus(): any {
    if (!hiringModuleInstance) {
      return {
        module: 'hiring',
        status: 'not_initialized'
      };
    }
    return hiringModuleInstance.getStatus();
  }
};

