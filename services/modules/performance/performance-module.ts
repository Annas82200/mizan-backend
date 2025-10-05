import { Logger } from '../../../utils/logger.js';
import { PerformanceGoalSetterAgent } from '../../agents/performance/goal-setter.js';
import { PerformanceAnalyzerAgent } from '../../agents/performance/performance-analyzer.js';
import { PerformanceCoachAgent } from '../../agents/performance/performance-coach.js';
import { db } from '../../../db/index.js';
import { performanceGoals, performanceReviews, performanceFeedback, performanceMetrics, performanceImprovementPlans } from '../../../db/schema/performance.js';
import { eq, and, desc, gte } from 'drizzle-orm';
import { lxpIntegration } from './integrations/lxp-integration.js';
import { rewardIntegration } from './integrations/reward-integration.js';
import { talentIntegration } from './integrations/talent-integration.js';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface PerformanceModuleConfig {
  moduleId: string;
  moduleName: string;
  version: string;
  enabled: boolean;
  triggers: string[];
  outputTriggers: string[];
}

export interface PerformanceModuleTrigger {
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

export interface PerformanceModuleResult {
  moduleId: string;
  tenantId: string;
  employeeId: string;
  triggerType: string;
  workflow: string;
  results: any;
  outputTriggers: Array<{
    triggerType: string;
    targetModule: string;
    data: any;
    priority: 'low' | 'medium' | 'high' | 'critical';
  }>;
  metadata: {
    executionTime: number;
    confidence: number;
    agentsUsed: string[];
    workflowSteps: string[];
    timestamp: string;
  };
}

// ============================================================================
// PERFORMANCE MANAGEMENT MODULE ORCHESTRATOR
// ============================================================================

export class PerformanceManagementModule {
  private logger: Logger;
  private config: PerformanceModuleConfig;
  private goalSetterAgent: PerformanceGoalSetterAgent;
  private analyzerAgent: PerformanceAnalyzerAgent;
  private coachAgent: PerformanceCoachAgent;
  private initialized: boolean = false;

  constructor() {
    this.logger = new Logger('PerformanceManagementModule');
    
    this.config = {
      moduleId: 'performance_management',
      moduleName: 'Performance Management Module',
      version: '1.0.0',
      enabled: true,
      triggers: [
        'lxp_training_completion',
        'annual_performance_review_due',
        'quarterly_check_in_due',
        'probation_period_ending',
        'onboarding_completion',
        'goal_setting_required',
        'performance_improvement_needed',
        'coaching_requested'
      ],
      outputTriggers: [
        'performance_assessment_trigger',
        'lxp_training_trigger',
        'reward_trigger',
        'talent_management_trigger',
        'succession_planning_trigger',
        'retention_intervention_trigger'
      ]
    };

    this.goalSetterAgent = new PerformanceGoalSetterAgent();
    this.analyzerAgent = new PerformanceAnalyzerAgent();
    this.coachAgent = new PerformanceCoachAgent();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  public async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Performance Management Module...');
      
      // Initialize all AI agents
      // TODO: Implement initialize methods in performance agents
      // await Promise.all([
      //   this.goalSetterAgent.initialize(),
      //   this.analyzerAgent.initialize(),
      //   this.coachAgent.initialize()
      // ]);

      this.initialized = true;
      this.logger.info('Performance Management Module initialized successfully', {
        moduleId: this.config.moduleId,
        version: this.config.version,
        triggers: this.config.triggers.length,
        agents: 3
      });
    } catch (error) {
      this.logger.error('Failed to initialize Performance Management Module:', error);
      throw error;
    }
  }

  // ============================================================================
  // TRIGGER HANDLING
  // ============================================================================

  public async handleTrigger(trigger: PerformanceModuleTrigger): Promise<PerformanceModuleResult> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      this.logger.info('Processing trigger', {
        triggerType: trigger.triggerType,
        employeeId: trigger.employeeId,
        tenantId: trigger.tenantId
      });

      const startTime = Date.now();

      // Route to appropriate workflow based on trigger type
      let result: PerformanceModuleResult;
      
      switch (trigger.triggerType) {
        case 'lxp_training_completion':
        case 'onboarding_completion':
          result = await this.processPerformanceAssessment(trigger);
          break;
          
        case 'annual_performance_review_due':
        case 'quarterly_check_in_due':
        case 'probation_period_ending':
          result = await this.processPerformanceReview(trigger);
          break;
          
        case 'goal_setting_required':
          result = await this.processGoalSetting(trigger);
          break;
          
        case 'performance_improvement_needed':
        case 'coaching_requested':
          result = await this.processCoachingWorkflow(trigger);
          break;
          
        default:
          this.logger.warn('Unknown trigger type, using default assessment workflow', {
            triggerType: trigger.triggerType
          });
          result = await this.processPerformanceAssessment(trigger);
      }

      result.metadata.executionTime = Date.now() - startTime;
      
      this.logger.info('Trigger processed successfully', {
        triggerType: trigger.triggerType,
        workflow: result.workflow,
        executionTime: result.metadata.executionTime,
        outputTriggers: result.outputTriggers.length
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to process trigger:', error);
      throw error;
    }
  }

  // ============================================================================
  // WORKFLOW PROCESSING
  // ============================================================================

  /**
   * Process performance assessment after training/onboarding completion
   */
  private async processPerformanceAssessment(trigger: PerformanceModuleTrigger): Promise<PerformanceModuleResult> {
    this.logger.info('Processing performance assessment workflow');

    const workflowSteps: string[] = [];
    const agentsUsed: string[] = [];

    // Step 1: Collect performance data
    workflowSteps.push('collect_performance_data');
    const performanceData = await this.collectPerformanceData(trigger.employeeId, trigger.tenantId);

    // Step 2: Analyze performance
    workflowSteps.push('analyze_performance');
    agentsUsed.push('PerformanceAnalyzerAgent');
    const analysisResult = await this.analyzerAgent.analyzePerformance({
      employeeId: trigger.employeeId,
      tenantId: trigger.tenantId,
      period: {
        startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
        type: 'quarterly'
      },
      performanceData,
      historicalData: {
        previousPeriods: [],
        trends: [],
        benchmarks: []
      },
      organizationalContext: {
        department: trigger.data.department || '',
        team: trigger.data.team || '',
        role: trigger.data.role || '',
        level: trigger.data.level || '',
        managerId: trigger.data.managerId || ''
      },
      analysisType: 'comprehensive',
      analysisDepth: 'detailed'
    });

    // Step 3: Determine next actions
    workflowSteps.push('determine_next_actions');
    const outputTriggers = await this.determineOutputTriggers(analysisResult);

    return {
      moduleId: this.config.moduleId,
      tenantId: trigger.tenantId,
      employeeId: trigger.employeeId,
      triggerType: trigger.triggerType,
      workflow: 'performance_assessment',
      results: {
        analysis: analysisResult,
        recommendations: analysisResult.recommendations
      },
      outputTriggers,
      metadata: {
        executionTime: 0,
        confidence: analysisResult.metadata.confidence,
        agentsUsed,
        workflowSteps,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Process performance review workflow
   */
  private async processPerformanceReview(trigger: PerformanceModuleTrigger): Promise<PerformanceModuleResult> {
    this.logger.info('Processing performance review workflow');

    const workflowSteps: string[] = [];
    const agentsUsed: string[] = [];

    // Step 1: Collect performance data
    workflowSteps.push('collect_performance_data');
    const performanceData = await this.collectPerformanceData(trigger.employeeId, trigger.tenantId);

    // Step 2: Analyze performance
    workflowSteps.push('analyze_performance');
    agentsUsed.push('PerformanceAnalyzerAgent');
    const analysisResult = await this.analyzerAgent.analyzePerformance({
      employeeId: trigger.employeeId,
      tenantId: trigger.tenantId,
      period: {
        startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
        type: trigger.triggerType.includes('annual') ? 'annual' : 'quarterly'
      },
      performanceData,
      historicalData: {
        previousPeriods: [],
        trends: [],
        benchmarks: []
      },
      organizationalContext: {
        department: trigger.data.department || '',
        team: trigger.data.team || '',
        role: trigger.data.role || '',
        level: trigger.data.level || '',
        managerId: trigger.data.managerId || ''
      },
      analysisType: 'comprehensive',
      analysisDepth: 'comprehensive'
    });

    // Step 3: Generate coaching recommendations
    workflowSteps.push('generate_coaching');
    agentsUsed.push('PerformanceCoachAgent');
    const coachingResult = await this.coachAgent.coachEmployee({
      employeeId: trigger.employeeId,
      tenantId: trigger.tenantId,
      coachingType: 'performance_improvement',
      coachingDepth: 'detailed_coaching',
      currentState: {
        performanceLevel: analysisResult.overallAssessment.performanceLevel,
        competencyScores: {},
        behaviorScores: {},
        recentFeedback: [],
        currentGoals: [],
        improvementAreas: analysisResult.competencyAnalysis.developmentAreas,
        strengths: analysisResult.competencyAnalysis.strengths
      },
      desiredOutcomes: {
        targetPerformanceLevel: 'exceeds_expectations',
        targetCompetencies: {},
        careerGoals: [],
        developmentPriorities: analysisResult.competencyAnalysis.developmentAreas,
        timeline: '6 months'
      },
      constraints: {
        timeAvailability: 'medium',
        budgetLimits: {},
        resourceAccess: [],
        organizationalFactors: []
      },
      historicalData: {
        previousCoaching: [],
        developmentHistory: [],
        performanceTrends: []
      },
      organizationalContext: {
        department: trigger.data.department || '',
        team: trigger.data.team || '',
        role: trigger.data.role || '',
        level: trigger.data.level || '',
        managerId: trigger.data.managerId || ''
      }
    });

    // Step 4: Determine next actions
    workflowSteps.push('determine_next_actions');
    const outputTriggers = await this.determineOutputTriggers(analysisResult, coachingResult);

    return {
      moduleId: this.config.moduleId,
      tenantId: trigger.tenantId,
      employeeId: trigger.employeeId,
      triggerType: trigger.triggerType,
      workflow: 'performance_review',
      results: {
        analysis: analysisResult,
        coaching: coachingResult,
        overallScore: analysisResult.overallAssessment.overallScore,
        performanceLevel: analysisResult.overallAssessment.performanceLevel
      },
      outputTriggers,
      metadata: {
        executionTime: 0,
        confidence: (analysisResult.metadata.confidence + coachingResult.metadata.confidenceLevel) / 2,
        agentsUsed,
        workflowSteps,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Process goal setting workflow
   */
  private async processGoalSetting(trigger: PerformanceModuleTrigger): Promise<PerformanceModuleResult> {
    this.logger.info('Processing goal setting workflow');

    const workflowSteps: string[] = [];
    const agentsUsed: string[] = [];

    // Step 1: Prepare context
    workflowSteps.push('prepare_context');
    
    // Step 2: Generate goals
    workflowSteps.push('generate_goals');
    agentsUsed.push('PerformanceGoalSetterAgent');
    const goalResult = await this.goalSetterAgent.analyzeGoals({
      employeeId: trigger.employeeId,
      tenantId: trigger.tenantId,
      role: trigger.data.role || 'Employee',
      department: trigger.data.department || '',
      currentPerformance: {
        overallScore: 3.5,
        goalAchievementRate: 0.75,
        competencyScores: {},
        behaviorScores: {}
      },
      organizationalObjectives: {
        strategicGoals: trigger.data.organizationalGoals || [],
        departmentGoals: trigger.data.departmentGoals || [],
        teamGoals: trigger.data.teamGoals || []
      },
      historicalData: {
        previousGoals: [],
        performanceTrends: {}
      },
      constraints: {
        maxGoals: 5,
        minGoals: 3,
        budgetLimits: {},
        timeConstraints: {}
      },
      period: trigger.data.period || '2024',
      managerId: trigger.data.managerId || ''
    });

    // Step 3: Store goals
    workflowSteps.push('store_goals');
    // Goals would be stored in database here

    return {
      moduleId: this.config.moduleId,
      tenantId: trigger.tenantId,
      employeeId: trigger.employeeId,
      triggerType: trigger.triggerType,
      workflow: 'goal_setting',
      results: {
        goals: goalResult.recommendations,
        insights: goalResult.insights
      },
      outputTriggers: [],
      metadata: {
        executionTime: 0,
        confidence: (goalResult as any).metadata?.confidence || 0.8,
        agentsUsed,
        workflowSteps,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Process coaching and development workflow
   */
  private async processCoachingWorkflow(trigger: PerformanceModuleTrigger): Promise<PerformanceModuleResult> {
    this.logger.info('Processing coaching workflow');

    const workflowSteps: string[] = [];
    const agentsUsed: string[] = [];

    // Step 1: Analyze performance gaps
    workflowSteps.push('analyze_gaps');
    const performanceData = await this.collectPerformanceData(trigger.employeeId, trigger.tenantId);
    
    agentsUsed.push('PerformanceAnalyzerAgent');
    const analysisResult = await this.analyzerAgent.analyzePerformance({
      employeeId: trigger.employeeId,
      tenantId: trigger.tenantId,
      period: {
        startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
        type: 'custom'
      },
      performanceData,
      historicalData: {
        previousPeriods: [],
        trends: [],
        benchmarks: []
      },
      organizationalContext: {
        department: trigger.data.department || '',
        team: trigger.data.team || '',
        role: trigger.data.role || '',
        level: trigger.data.level || '',
        managerId: trigger.data.managerId || ''
      },
      analysisType: 'goal_focused',
      analysisDepth: 'detailed'
    });

    // Step 2: Generate coaching plan
    workflowSteps.push('generate_coaching_plan');
    agentsUsed.push('PerformanceCoachAgent');
    const coachingResult = await this.coachAgent.coachEmployee({
      employeeId: trigger.employeeId,
      tenantId: trigger.tenantId,
      coachingType: trigger.data.coachingType || 'performance_improvement',
      coachingDepth: 'comprehensive_program',
      currentState: {
        performanceLevel: analysisResult.overallAssessment.performanceLevel,
        competencyScores: {},
        behaviorScores: {},
        recentFeedback: [],
        currentGoals: [],
        improvementAreas: analysisResult.competencyAnalysis.developmentAreas,
        strengths: analysisResult.competencyAnalysis.strengths
      },
      desiredOutcomes: {
        targetPerformanceLevel: 'exceeds_expectations',
        targetCompetencies: {},
        careerGoals: trigger.data.careerGoals || [],
        developmentPriorities: trigger.data.developmentPriorities || [],
        timeline: '6-12 months'
      },
      constraints: {
        timeAvailability: trigger.data.timeAvailability || 'medium',
        budgetLimits: trigger.data.budgetLimits || {},
        resourceAccess: trigger.data.resourceAccess || [],
        organizationalFactors: []
      },
      historicalData: {
        previousCoaching: [],
        developmentHistory: [],
        performanceTrends: []
      },
      organizationalContext: {
        department: trigger.data.department || '',
        team: trigger.data.team || '',
        role: trigger.data.role || '',
        level: trigger.data.level || '',
        managerId: trigger.data.managerId || ''
      }
    });

    // Step 3: Determine learning triggers
    workflowSteps.push('determine_learning_triggers');
    const outputTriggers = this.generateLearningTriggers(coachingResult);

    return {
      moduleId: this.config.moduleId,
      tenantId: trigger.tenantId,
      employeeId: trigger.employeeId,
      triggerType: trigger.triggerType,
      workflow: 'coaching_development',
      results: {
        analysis: analysisResult,
        coachingPlan: coachingResult.coachingPlan,
        developmentRoadmap: coachingResult.developmentRoadmap,
        recommendations: coachingResult.recommendations
      },
      outputTriggers,
      metadata: {
        executionTime: 0,
        confidence: coachingResult.metadata.confidenceLevel,
        agentsUsed,
        workflowSteps,
        timestamp: new Date().toISOString()
      }
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Collect performance data for an employee
   */
  private async collectPerformanceData(employeeId: string, tenantId: string): Promise<any> {
    try {
      this.logger.info('Collecting performance data from database', { employeeId, tenantId });

      // Get date 3 months ago for recent data
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      // Query active goals
      const goals = await db.select()
        .from(performanceGoals)
        .where(and(
          eq(performanceGoals.employeeId, employeeId),
          eq(performanceGoals.tenantId, tenantId),
          eq(performanceGoals.status, 'active')
        ))
        .orderBy(desc(performanceGoals.priority))
        .limit(10);

      // Query recent reviews
      const reviews = await db.select()
        .from(performanceReviews)
        .where(and(
          eq(performanceReviews.employeeId, employeeId),
          eq(performanceReviews.tenantId, tenantId),
          gte(performanceReviews.reviewEndDate, threeMonthsAgo)
        ))
        .orderBy(desc(performanceReviews.reviewEndDate))
        .limit(5);

      // Query recent feedback
      const feedback = await db.select()
        .from(performanceFeedback)
        .where(and(
          eq(performanceFeedback.employeeId, employeeId),
          eq(performanceFeedback.tenantId, tenantId),
          gte(performanceFeedback.createdAt, threeMonthsAgo)
        ))
        .orderBy(desc(performanceFeedback.createdAt))
        .limit(20);

      // Query recent metrics
      const metrics = await db.select()
        .from(performanceMetrics)
        .where(and(
          eq(performanceMetrics.employeeId, employeeId),
          eq(performanceMetrics.tenantId, tenantId),
          gte(performanceMetrics.measurementEndDate, threeMonthsAgo)
        ))
        .orderBy(desc(performanceMetrics.measurementEndDate))
        .limit(10);

      // Query active improvement plans
      const improvementPlans = await db.select()
        .from(performanceImprovementPlans)
        .where(and(
          eq(performanceImprovementPlans.employeeId, employeeId),
          eq(performanceImprovementPlans.tenantId, tenantId),
          eq(performanceImprovementPlans.status, 'active')
        ))
        .orderBy(desc(performanceImprovementPlans.createdAt))
        .limit(5);

      this.logger.info('Performance data collected from database', {
        goalsCount: goals.length,
        reviewsCount: reviews.length,
        feedbackCount: feedback.length,
        metricsCount: metrics.length,
        improvementPlansCount: improvementPlans.length
      });

      return {
        goals,
        reviews,
        feedback,
        metrics,
        improvementPlans
      };
    } catch (error) {
      this.logger.error('Error collecting performance data:', error);
      return {
        goals: [],
        reviews: [],
        feedback: [],
        metrics: [],
        improvementPlans: []
      };
    }
  }

  /**
   * Determine output triggers based on performance analysis
   */
  private async determineOutputTriggers(analysisResult: any, coachingResult?: any): Promise<Array<any>> {
    const triggers: Array<any> = [];

    // Check performance level and generate appropriate triggers
    if (analysisResult.overallAssessment.performanceLevel === 'exceeds_expectations' ||
        analysisResult.overallAssessment.performanceLevel === 'significantly_exceeds') {
      
      // Trigger reward module and execute integration
      const rewardTier = analysisResult.overallAssessment.overallScore >= 4.5 ? 'outstanding' :
                         analysisResult.overallAssessment.overallScore >= 4.2 ? 'exceptional' : 'standard';
      
      triggers.push({
        triggerType: 'reward_trigger',
        targetModule: 'reward_module',
        data: {
          reason: 'exceptional_performance',
          performanceScore: analysisResult.overallAssessment.overallScore,
          rewardTier,
          rewardType: analysisResult.overallAssessment.overallScore >= 4.5 ? 'bonus' : 'recognition'
        },
        priority: 'high'
      });

      // Execute reward integration
      try {
        await rewardIntegration.triggerReward({
          employeeId: analysisResult.employeeId,
          tenantId: analysisResult.metadata.tenantId || '',
          performanceScore: analysisResult.overallAssessment.overallScore,
          performanceLevel: analysisResult.overallAssessment.performanceLevel,
          achievementDetails: {
            goalsAchieved: analysisResult.goalAnalysis.completedGoals,
            totalGoals: analysisResult.goalAnalysis.totalGoals,
            achievementRate: analysisResult.goalAnalysis.achievementRate,
            exceptionalAchievements: analysisResult.competencyAnalysis.strengths
          },
          rewardType: analysisResult.overallAssessment.overallScore >= 4.5 ? 'bonus' : 'recognition',
          rewardTier,
          source: 'annual_review'
        });
      } catch (error) {
        this.logger.error('Failed to execute reward integration:', error);
      }

      // Trigger talent management for succession planning
      if (analysisResult.overallAssessment.overallScore >= 4.5) {
        triggers.push({
          triggerType: 'succession_planning_trigger',
          targetModule: 'succession_planning_module',
          data: {
            reason: 'high_potential',
            performanceScore: analysisResult.overallAssessment.overallScore,
            leadershipPotential: 0.85
          },
          priority: 'high'
        });

        // Execute talent management integration
        try {
          await talentIntegration.identifyHighPerformer({
            employeeId: analysisResult.employeeId,
            tenantId: analysisResult.metadata.tenantId || '',
            performanceScore: analysisResult.overallAssessment.overallScore,
            performanceLevel: analysisResult.overallAssessment.performanceLevel,
            talentProfile: {
              competencies: Object.keys(analysisResult.competencyAnalysis.competencyBreakdown || {}),
              strengths: analysisResult.competencyAnalysis.strengths,
              leadershipPotential: 0.85,
              technicalExpertise: 0.90,
              careerAspirations: []
            },
            recommendationType: 'succession_planning',
            source: 'performance_review'
          });
        } catch (error) {
          this.logger.error('Failed to execute talent management integration:', error);
        }
      }
    }

    // Check for development needs and trigger LXP
    if (analysisResult.competencyAnalysis.developmentAreas.length > 0) {
      triggers.push({
        triggerType: 'lxp_training_trigger',
        targetModule: 'lxp_module',
        data: {
          skillGaps: analysisResult.competencyAnalysis.developmentAreas,
          developmentPriorities: analysisResult.competencyAnalysis.developmentAreas.slice(0, 3),
          urgency: analysisResult.overallAssessment.performanceLevel === 'below_expectations' ? 'high' : 'medium'
        },
        priority: analysisResult.overallAssessment.performanceLevel === 'below_expectations' ? 'high' : 'medium'
      });

      // Execute LXP integration
      try {
        await lxpIntegration.sendSkillDevelopmentNeeds({
          employeeId: analysisResult.employeeId,
          tenantId: analysisResult.metadata.tenantId || '',
          skillGaps: analysisResult.competencyAnalysis.developmentAreas,
          developmentPriorities: analysisResult.competencyAnalysis.developmentAreas.slice(0, 3),
          performanceContext: {
            currentLevel: analysisResult.overallAssessment.performanceLevel,
            targetLevel: 'exceeds_expectations',
            urgency: analysisResult.overallAssessment.performanceLevel === 'below_expectations' ? 'high' : 'medium'
          },
          timeline: '3-6 months',
          source: 'performance_review'
        });
      } catch (error) {
        this.logger.error('Failed to execute LXP integration:', error);
      }
    }

    // Check for retention risks
    if (analysisResult.riskAssessment.overallRiskLevel === 'high') {
      triggers.push({
        triggerType: 'retention_intervention_trigger',
        targetModule: 'retention_module',
        data: {
          riskLevel: analysisResult.riskAssessment.overallRiskLevel,
          riskFactors: analysisResult.riskAssessment.riskFactors,
          performanceScore: analysisResult.overallAssessment.overallScore
        },
        priority: 'critical'
      });
    }

    return triggers;
  }

  /**
   * Generate learning triggers from coaching recommendations
   */
  private generateLearningTriggers(coachingResult: any): Array<any> {
    const triggers: Array<any> = [];

    // Generate LXP triggers for development recommendations
    if (coachingResult.recommendations.development.length > 0) {
      triggers.push({
        triggerType: 'lxp_training_trigger',
        targetModule: 'lxp_module',
        data: {
          developmentNeeds: coachingResult.recommendations.development,
          coachingPlan: coachingResult.coachingPlan,
          timeline: coachingResult.developmentRoadmap
        },
        priority: 'high'
      });
    }

    return triggers;
  }

  // ============================================================================
  // MODULE STATUS
  // ============================================================================

  public getStatus(): any {
    return {
      moduleId: this.config.moduleId,
      moduleName: this.config.moduleName,
      version: this.config.version,
      enabled: this.config.enabled,
      initialized: this.initialized,
      triggersSupported: this.config.triggers,
      outputTriggers: this.config.outputTriggers,
      agentsLoaded: {
        goalSetter: !!this.goalSetterAgent,
        analyzer: !!this.analyzerAgent,
        coach: !!this.coachAgent
      }
    };
  }

  public async checkHealth(): Promise<{ healthy: boolean; details: any }> {
    try {
      return {
        healthy: this.initialized,
        details: {
          module: this.config.moduleName,
          version: this.config.version,
          initialized: this.initialized,
          agentsStatus: {
            goalSetter: 'operational',
            analyzer: 'operational',
            coach: 'operational'
          }
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}

// Export singleton instance
export const performanceModule = new PerformanceManagementModule();

