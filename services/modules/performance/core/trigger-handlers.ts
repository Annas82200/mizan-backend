import { Logger } from '../../../../utils/logger.js';
import { PerformanceManagementModule } from '../performance-module.js';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface TriggerHandlerContext {
  triggerType: string;
  tenantId: string;
  employeeId: string;
  data: any;
  metadata: {
    triggeredBy: string;
    timestamp: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    context: Record<string, any>;
  };
}

export interface TriggerHandlerResult {
  success: boolean;
  workflow: string;
  results: any;
  outputTriggers: Array<{
    triggerType: string;
    targetModule: string;
    data: any;
    priority: string;
  }>;
  metadata: {
    executionTime: number;
    agentsUsed: string[];
    workflowSteps: string[];
    timestamp: string;
  };
}

// ============================================================================
// PERFORMANCE TRIGGER HANDLERS
// ============================================================================

export class PerformanceTriggerHandlers {
  private logger: Logger;
  private performanceModule: PerformanceManagementModule;

  constructor(performanceModule: PerformanceManagementModule) {
    this.logger = new Logger('PerformanceTriggerHandlers');
    this.performanceModule = performanceModule;
  }

  // ============================================================================
  // MAIN TRIGGER PROCESSOR
  // ============================================================================

  public async processTrigger(context: TriggerHandlerContext): Promise<TriggerHandlerResult> {
    try {
      this.logger.info('Processing trigger', {
        triggerType: context.triggerType,
        employeeId: context.employeeId,
        priority: context.metadata.priority
      });

      const startTime = Date.now();
      let result: TriggerHandlerResult;

      // Route to appropriate handler based on trigger type
      switch (context.triggerType) {
        case 'lxp_training_completion':
          result = await this.handleTrainingCompletion(context);
          break;

        case 'onboarding_completion':
          result = await this.handleOnboardingCompletion(context);
          break;

        case 'annual_performance_review_due':
          result = await this.handleAnnualReview(context);
          break;

        case 'quarterly_check_in_due':
          result = await this.handleQuarterlyCheckIn(context);
          break;

        case 'probation_period_ending':
          result = await this.handleProbationReview(context);
          break;

        case 'goal_setting_required':
          result = await this.handleGoalSetting(context);
          break;

        case 'performance_improvement_needed':
          result = await this.handlePerformanceImprovement(context);
          break;

        case 'coaching_requested':
          result = await this.handleCoachingRequest(context);
          break;

        default:
          this.logger.warn('Unknown trigger type', { triggerType: context.triggerType });
          result = await this.handleDefaultTrigger(context);
      }

      result.metadata.executionTime = Date.now() - startTime;

      this.logger.info('Trigger processed successfully', {
        triggerType: context.triggerType,
        workflow: result.workflow,
        success: result.success,
        executionTime: result.metadata.executionTime
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to process trigger:', error);
      throw error;
    }
  }

  // ============================================================================
  // SPECIFIC TRIGGER HANDLERS
  // ============================================================================

  /**
   * Handle training completion from LXP module
   * Trigger Type: lxp_training_completion
   * Expected Data: { courseId, courseName, completionDate, skillsAcquired, performanceImprovement }
   */
  private async handleTrainingCompletion(context: TriggerHandlerContext): Promise<TriggerHandlerResult> {
    this.logger.info('Handling LXP training completion trigger');

    const workflowSteps = ['validate_training_data', 'assess_skill_improvement', 'update_performance_baseline'];
    const agentsUsed = ['PerformanceAnalyzerAgent'];

    // Step 1: Validate training completion data
    const trainingData = {
      courseId: context.data.courseId,
      courseName: context.data.courseName,
      completionDate: context.data.completionDate,
      skillsAcquired: context.data.skillsAcquired || [],
      performanceImprovement: context.data.performanceImprovement || {}
    };

    // Step 2: Trigger performance assessment
    const moduleResult = await this.performanceModule.handleTrigger({
      triggerType: context.triggerType,
      tenantId: context.tenantId,
      employeeId: context.employeeId,
      data: {
        ...context.data,
        assessmentType: 'post_training',
        focusAreas: trainingData.skillsAcquired
      },
      metadata: context.metadata
    });

    return {
      success: true,
      workflow: 'training_completion_assessment',
      results: {
        trainingData,
        performanceAssessment: moduleResult.results,
        skillValidation: trainingData.skillsAcquired
      },
      outputTriggers: moduleResult.outputTriggers,
      metadata: {
        executionTime: 0,
        agentsUsed,
        workflowSteps,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Handle onboarding completion
   * Trigger Type: onboarding_completion
   * Expected Data: { onboardingId, completionDate, initialAssessment }
   */
  private async handleOnboardingCompletion(context: TriggerHandlerContext): Promise<TriggerHandlerResult> {
    this.logger.info('Handling onboarding completion trigger');

    const workflowSteps = ['validate_onboarding_data', 'set_performance_baseline', 'create_initial_goals'];
    const agentsUsed = ['PerformanceGoalSetterAgent', 'PerformanceAnalyzerAgent'];

    // Step 1: Set performance baseline
    const moduleResult = await this.performanceModule.handleTrigger({
      triggerType: context.triggerType,
      tenantId: context.tenantId,
      employeeId: context.employeeId,
      data: {
        ...context.data,
        assessmentType: 'baseline',
        isNewEmployee: true
      },
      metadata: context.metadata
    });

    // Step 2: Create initial performance goals
    workflowSteps.push('generate_initial_goals');
    const goalSettingTrigger = {
      triggerType: 'goal_setting',
      targetModule: 'performance_management',
      data: {
        employeeId: context.employeeId,
        tenantId: context.tenantId,
        isInitialGoals: true,
        period: new Date().getFullYear().toString()
      },
      priority: 'high' as const
    };

    return {
      success: true,
      workflow: 'onboarding_baseline_setup',
      results: {
        baselineAssessment: moduleResult.results,
        initialGoalsRecommended: true
      },
      outputTriggers: [goalSettingTrigger, ...moduleResult.outputTriggers],
      metadata: {
        executionTime: 0,
        agentsUsed,
        workflowSteps,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Handle annual performance review
   * Trigger Type: annual_performance_review_due
   * Expected Data: { reviewYear, reviewType, managerId }
   */
  private async handleAnnualReview(context: TriggerHandlerContext): Promise<TriggerHandlerResult> {
    this.logger.info('Handling annual performance review trigger');

    const workflowSteps = ['schedule_review', 'collect_data', 'analyze_performance', 'generate_coaching', 'determine_actions'];
    const agentsUsed = ['PerformanceAnalyzerAgent', 'PerformanceCoachAgent'];

    // Process comprehensive annual review
    const moduleResult = await this.performanceModule.handleTrigger({
      triggerType: context.triggerType,
      tenantId: context.tenantId,
      employeeId: context.employeeId,
      data: {
        ...context.data,
        reviewType: 'annual',
        comprehensiveAnalysis: true
      },
      metadata: context.metadata
    });

    return {
      success: true,
      workflow: 'annual_performance_review',
      results: moduleResult.results,
      outputTriggers: moduleResult.outputTriggers,
      metadata: {
        executionTime: 0,
        agentsUsed,
        workflowSteps,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Handle quarterly check-in
   * Trigger Type: quarterly_check_in_due
   * Expected Data: { quarter, year, managerId }
   */
  private async handleQuarterlyCheckIn(context: TriggerHandlerContext): Promise<TriggerHandlerResult> {
    this.logger.info('Handling quarterly check-in trigger');

    const workflowSteps = ['collect_quarterly_data', 'analyze_progress', 'review_goals', 'provide_feedback'];
    const agentsUsed = ['PerformanceAnalyzerAgent'];

    const moduleResult = await this.performanceModule.handleTrigger({
      triggerType: context.triggerType,
      tenantId: context.tenantId,
      employeeId: context.employeeId,
      data: {
        ...context.data,
        reviewType: 'quarterly',
        focusOn: 'goal_progress'
      },
      metadata: context.metadata
    });

    return {
      success: true,
      workflow: 'quarterly_check_in',
      results: moduleResult.results,
      outputTriggers: moduleResult.outputTriggers,
      metadata: {
        executionTime: 0,
        agentsUsed,
        workflowSteps,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Handle probation period ending
   * Trigger Type: probation_period_ending
   * Expected Data: { probationStartDate, probationEndDate, managerId }
   */
  private async handleProbationReview(context: TriggerHandlerContext): Promise<TriggerHandlerResult> {
    this.logger.info('Handling probation review trigger');

    const workflowSteps = ['evaluate_probation_performance', 'make_recommendation', 'determine_continuation'];
    const agentsUsed = ['PerformanceAnalyzerAgent', 'PerformanceCoachAgent'];

    const moduleResult = await this.performanceModule.handleTrigger({
      triggerType: context.triggerType,
      tenantId: context.tenantId,
      employeeId: context.employeeId,
      data: {
        ...context.data,
        reviewType: 'probation',
        criticalAssessment: true
      },
      metadata: context.metadata
    });

    // Determine probation outcome based on performance
    const performanceLevel = moduleResult.results.performanceLevel || 'meets_expectations';
    const probationOutcome = this.determineProbationOutcome(performanceLevel);

    return {
      success: true,
      workflow: 'probation_period_review',
      results: {
        ...moduleResult.results,
        probationOutcome,
        recommendation: probationOutcome.recommendation
      },
      outputTriggers: moduleResult.outputTriggers,
      metadata: {
        executionTime: 0,
        agentsUsed,
        workflowSteps,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Handle goal setting required
   * Trigger Type: goal_setting_required
   * Expected Data: { period, organizationalGoals, departmentGoals }
   */
  private async handleGoalSetting(context: TriggerHandlerContext): Promise<TriggerHandlerResult> {
    this.logger.info('Handling goal setting trigger');

    const workflowSteps = ['prepare_context', 'generate_goals', 'align_goals', 'store_goals'];
    const agentsUsed = ['PerformanceGoalSetterAgent'];

    const moduleResult = await this.performanceModule.handleTrigger({
      triggerType: context.triggerType,
      tenantId: context.tenantId,
      employeeId: context.employeeId,
      data: context.data,
      metadata: context.metadata
    });

    return {
      success: true,
      workflow: 'goal_setting',
      results: moduleResult.results,
      outputTriggers: moduleResult.outputTriggers,
      metadata: {
        executionTime: 0,
        agentsUsed,
        workflowSteps,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Handle performance improvement needed
   * Trigger Type: performance_improvement_needed
   * Expected Data: { improvementAreas, urgencyLevel, targetDate }
   */
  private async handlePerformanceImprovement(context: TriggerHandlerContext): Promise<TriggerHandlerResult> {
    this.logger.info('Handling performance improvement trigger');

    const workflowSteps = ['analyze_gaps', 'generate_improvement_plan', 'create_coaching_program', 'assign_resources'];
    const agentsUsed = ['PerformanceAnalyzerAgent', 'PerformanceCoachAgent'];

    const moduleResult = await this.performanceModule.handleTrigger({
      triggerType: context.triggerType,
      tenantId: context.tenantId,
      employeeId: context.employeeId,
      data: {
        ...context.data,
        coachingType: 'performance_improvement',
        urgencyLevel: context.data.urgencyLevel || 'high'
      },
      metadata: context.metadata
    });

    // Add improvement plan specific triggers
    const improvementTriggers = [
      {
        triggerType: 'lxp_training_trigger',
        targetModule: 'lxp_module',
        data: {
          improvementAreas: context.data.improvementAreas || [],
          urgencyLevel: context.data.urgencyLevel,
          targetDate: context.data.targetDate
        },
        priority: 'high'
      },
      {
        triggerType: 'performance_tracking_trigger',
        targetModule: 'performance_management',
        data: {
          trackingFrequency: 'weekly',
          focusAreas: context.data.improvementAreas,
          reviewDate: context.data.targetDate
        },
        priority: 'high'
      }
    ];

    return {
      success: true,
      workflow: 'performance_improvement',
      results: {
        ...moduleResult.results,
        improvementPlan: moduleResult.results.coachingPlan,
        trackingSchedule: 'weekly'
      },
      outputTriggers: [...moduleResult.outputTriggers, ...improvementTriggers],
      metadata: {
        executionTime: 0,
        agentsUsed,
        workflowSteps,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Handle coaching request
   * Trigger Type: coaching_requested
   * Expected Data: { coachingType, focusAreas, desiredOutcomes }
   */
  private async handleCoachingRequest(context: TriggerHandlerContext): Promise<TriggerHandlerResult> {
    this.logger.info('Handling coaching request trigger');

    const workflowSteps = ['validate_request', 'assess_needs', 'generate_coaching_plan', 'assign_coach'];
    const agentsUsed = ['PerformanceCoachAgent'];

    const moduleResult = await this.performanceModule.handleTrigger({
      triggerType: context.triggerType,
      tenantId: context.tenantId,
      employeeId: context.employeeId,
      data: {
        ...context.data,
        coachingType: context.data.coachingType || 'career_growth',
        coachingDepth: 'comprehensive_program'
      },
      metadata: context.metadata
    });

    return {
      success: true,
      workflow: 'coaching_program',
      results: moduleResult.results,
      outputTriggers: moduleResult.outputTriggers,
      metadata: {
        executionTime: 0,
        agentsUsed,
        workflowSteps,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Handle default/unknown triggers
   */
  private async handleDefaultTrigger(context: TriggerHandlerContext): Promise<TriggerHandlerResult> {
    this.logger.info('Handling default trigger');

    return {
      success: true,
      workflow: 'default_performance_assessment',
      results: {
        message: 'Trigger processed with default workflow',
        triggerType: context.triggerType
      },
      outputTriggers: [],
      metadata: {
        executionTime: 0,
        agentsUsed: [],
        workflowSteps: ['default_processing'],
        timestamp: new Date().toISOString()
      }
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Determine probation outcome based on performance level
   */
  private determineProbationOutcome(performanceLevel: string): any {
    const outcomes = {
      significantly_exceeds: {
        outcome: 'pass_with_distinction',
        recommendation: 'Confirm employment with accelerated development path',
        nextSteps: ['Confirm employment', 'Create advanced development plan', 'Consider for fast-track program']
      },
      exceeds_expectations: {
        outcome: 'pass',
        recommendation: 'Confirm employment with standard progression',
        nextSteps: ['Confirm employment', 'Set regular performance goals', 'Continue development']
      },
      meets_expectations: {
        outcome: 'pass',
        recommendation: 'Confirm employment with development support',
        nextSteps: ['Confirm employment', 'Identify development areas', 'Provide additional training']
      },
      below_expectations: {
        outcome: 'extend_probation',
        recommendation: 'Extend probation period with improvement plan',
        nextSteps: ['Extend probation 30-60 days', 'Create improvement plan', 'Increase coaching frequency']
      },
      significantly_below: {
        outcome: 'fail',
        recommendation: 'Terminate employment or significant role change',
        nextSteps: ['HR consultation', 'Termination process', 'Exit interview']
      }
    };

    return outcomes[performanceLevel as keyof typeof outcomes] || outcomes.meets_expectations;
  }

  /**
   * Validate trigger data
   */
  private validateTriggerData(context: TriggerHandlerContext): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!context.employeeId) {
      errors.push('Missing employeeId');
    }

    if (!context.tenantId) {
      errors.push('Missing tenantId');
    }

    if (!context.triggerType) {
      errors.push('Missing triggerType');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

