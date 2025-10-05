import { Logger } from '../../../../utils/logger.js';
import { PerformanceAnalyzerAgent } from '../../../agents/performance/performance-analyzer.js';
import { PerformanceCoachAgent } from '../../../agents/performance/performance-coach.js';
import { db } from '../../../../db/index.js';
import { performanceGoals, performanceReviews, performanceFeedback, performanceMetrics, performanceImprovementPlans } from '../../../../db/schema/performance.js';
import { eq, and, desc, gte } from 'drizzle-orm';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface CoachingWorkflowInput {
  employeeId: string;
  tenantId: string;
  coachingType: 'performance_improvement' | 'skill_development' | 'career_growth' | 'behavioral_coaching' | 'leadership_development';
  coachingDepth: 'quick_guidance' | 'detailed_coaching' | 'comprehensive_program';
  requestedBy: string; // employeeId or managerId
  reason?: string;
  coachingFrequency?: 'weekly' | 'biweekly' | 'monthly';
  focusAreas?: string[];
  desiredOutcomes?: string[];
  timeline?: string;
  organizationalContext: {
    role: string;
    department: string;
    team?: string;
    level?: string;
    managerId: string;
  };
}

export interface CoachingWorkflowResult {
  success: boolean;
  workflow: string;
  employeeId: string;
  coachingId: string;
  coachingType: string;
  
  gapAnalysis: {
    performanceGaps: string[];
    competencyGaps: Array<{
      competency: string;
      currentLevel: number;
      targetLevel: number;
      gap: number;
    }>;
    skillGaps: string[];
    behavioralGaps: string[];
    priorityGaps: string[];
  };
  
  coachingPlan: {
    objectives: Array<{
      id: string;
      title: string;
      description: string;
      priority: string;
      timeline: string;
      successCriteria: string[];
    }>;
    strategies: Array<{
      id: string;
      name: string;
      description: string;
      techniques: string[];
      resources: string[];
    }>;
    actionPlan: Array<{
      id: string;
      action: string;
      type: string;
      steps: string[];
      timeline: string;
      owner: string;
    }>;
  };
  
  developmentPlan: {
    phases: Array<{
      phase: number;
      name: string;
      duration: string;
      focus: string[];
      milestones: string[];
      activities: string[];
    }>;
    learningActivities: Array<{
      id: string;
      type: string;
      title: string;
      provider: string;
      duration: string;
      priority: string;
    }>;
    checkpoints: Array<{
      checkpoint: string;
      timing: string;
      criteria: string[];
    }>;
  };
  
  supportStructure: {
    mentoring: {
      recommended: boolean;
      mentorProfile?: string;
      focusAreas: string[];
      frequency?: string;
    };
    coaching: {
      coachingStyle: string;
      sessionFrequency: string;
      duration: string;
    };
    resources: Array<{
      type: string;
      name: string;
      description: string;
      accessMethod: string;
    }>;
  };
  
  progressTracking: {
    metrics: Array<{
      metric: string;
      baseline: number;
      target: number;
      trackingFrequency: string;
    }>;
    reviewSchedule: Array<{
      reviewType: string;
      frequency: string;
      participants: string[];
    }>;
  };
  
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
    confidence: number;
    timestamp: string;
  };
}

// ============================================================================
// COACHING & DEVELOPMENT WORKFLOW
// ============================================================================

export class CoachingDevelopmentWorkflow {
  private logger: Logger;
  private analyzerAgent: PerformanceAnalyzerAgent;
  private coachAgent: PerformanceCoachAgent;

  constructor() {
    this.logger = new Logger('CoachingDevelopmentWorkflow');
    this.analyzerAgent = new PerformanceAnalyzerAgent();
    this.coachAgent = new PerformanceCoachAgent();
  }

  // ============================================================================
  // MAIN WORKFLOW EXECUTION
  // ============================================================================

  public async executeWorkflow(input: CoachingWorkflowInput): Promise<CoachingWorkflowResult> {
    try {
      this.logger.info('Starting coaching & development workflow', {
        employeeId: input.employeeId,
        coachingType: input.coachingType
      });

      const startTime = Date.now();
      const workflowSteps: string[] = [];
      const agentsUsed: string[] = [];

      // Step 1: Analyze performance gaps
      workflowSteps.push('analyze_performance_gaps');
      agentsUsed.push('PerformanceAnalyzerAgent');
      
      const performanceData = await this.collectPerformanceData(input.employeeId, input.tenantId);
      const analysisResult = await this.analyzerAgent.analyzePerformance({
        employeeId: input.employeeId,
        tenantId: input.tenantId,
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
          department: input.organizationalContext.department,
          team: input.organizationalContext.team || 'General',
          role: input.organizationalContext.role,
          level: input.organizationalContext.level || 'Individual Contributor',
          managerId: input.organizationalContext.managerId
        },
        analysisType: 'goal_focused',
        analysisDepth: 'detailed'
      });

      // Step 2: Extract gap analysis
      workflowSteps.push('extract_gap_analysis');
      const gapAnalysis = this.extractGapAnalysis(analysisResult);

      // Step 3: Invoke Coach Agent for personalized coaching
      workflowSteps.push('generate_coaching_plan');
      agentsUsed.push('PerformanceCoachAgent');
      
      const coachingResult = await this.coachAgent.coachEmployee({
        employeeId: input.employeeId,
        tenantId: input.tenantId,
        coachingType: input.coachingType,
        coachingDepth: input.coachingDepth,
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
          careerGoals: input.desiredOutcomes || [],
          developmentPriorities: input.focusAreas || analysisResult.competencyAnalysis.developmentAreas.slice(0, 3),
          timeline: input.timeline || '6 months'
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
          department: input.organizationalContext.department,
          team: input.organizationalContext.team || 'General',
          role: input.organizationalContext.role,
          level: input.organizationalContext.level || 'Individual Contributor',
          managerId: input.organizationalContext.managerId
        }
      });

      // Step 4: Create development plan
      workflowSteps.push('create_development_plan');
      const developmentPlan = this.createDevelopmentPlan(coachingResult, gapAnalysis);

      // Step 5: Assign learning activities
      workflowSteps.push('assign_learning_activities');
      const learningActivities = this.assignLearningActivities(developmentPlan, gapAnalysis);
      developmentPlan.learningActivities = learningActivities;

      // Step 6: Create improvement plan record
      workflowSteps.push('create_improvement_plan');
      const coachingId = await this.createImprovementPlan(input, gapAnalysis, coachingResult);

      // Step 7: Track coaching effectiveness
      workflowSteps.push('setup_tracking');
      const progressTracking = this.setupProgressTracking(coachingResult, input);

      // Step 8: Generate output triggers for LXP and other modules
      workflowSteps.push('generate_output_triggers');
      const outputTriggers = this.generateOutputTriggers(gapAnalysis, learningActivities, input);

      const executionTime = Date.now() - startTime;

      this.logger.info('Coaching & development workflow completed', {
        employeeId: input.employeeId,
        coachingType: input.coachingType,
        objectivesCreated: coachingResult.coachingPlan.objectives.length,
        learningActivities: learningActivities.length,
        executionTime
      });

      return {
        success: true,
        workflow: 'coaching_development',
        employeeId: input.employeeId,
        coachingId,
        coachingType: input.coachingType,
        gapAnalysis,
        coachingPlan: coachingResult.coachingPlan,
        developmentPlan,
        supportStructure: {
          ...coachingResult.supportStructure,
          resources: []
        },
        progressTracking,
        outputTriggers,
        metadata: {
          executionTime,
          agentsUsed,
          workflowSteps,
          confidence: coachingResult.metadata.confidenceLevel,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Coaching & development workflow failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // WORKFLOW STEPS
  // ============================================================================

  /**
   * Collect performance data
   */
  private async collectPerformanceData(employeeId: string, tenantId: string): Promise<any> {
    try {
      this.logger.info('Collecting performance data from database', { employeeId, tenantId });

      // Get date 6 months ago for historical data
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // Query goals
      const goals = await db.select()
        .from(performanceGoals)
        .where(and(
          eq(performanceGoals.employeeId, employeeId),
          eq(performanceGoals.tenantId, tenantId)
        ))
        .orderBy(desc(performanceGoals.priority));

      // Query reviews (last 6 months)
      const reviews = await db.select()
        .from(performanceReviews)
        .where(and(
          eq(performanceReviews.employeeId, employeeId),
          eq(performanceReviews.tenantId, tenantId),
          gte(performanceReviews.reviewEndDate, sixMonthsAgo)
        ))
        .orderBy(desc(performanceReviews.reviewEndDate));

      // Query feedback (last 6 months)
      const feedback = await db.select()
        .from(performanceFeedback)
        .where(and(
          eq(performanceFeedback.employeeId, employeeId),
          eq(performanceFeedback.tenantId, tenantId),
          gte(performanceFeedback.createdAt, sixMonthsAgo)
        ))
        .orderBy(desc(performanceFeedback.createdAt));

      // Query metrics (last 6 months)
      const metrics = await db.select()
        .from(performanceMetrics)
        .where(and(
          eq(performanceMetrics.employeeId, employeeId),
          eq(performanceMetrics.tenantId, tenantId),
          gte(performanceMetrics.measurementEndDate, sixMonthsAgo)
        ))
        .orderBy(desc(performanceMetrics.measurementEndDate));

      // Query improvement plans
      const improvementPlans = await db.select()
        .from(performanceImprovementPlans)
        .where(and(
          eq(performanceImprovementPlans.employeeId, employeeId),
          eq(performanceImprovementPlans.tenantId, tenantId)
        ))
        .orderBy(desc(performanceImprovementPlans.createdAt));

      this.logger.info('Performance data collected', {
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
   * Extract gap analysis from performance analysis
   */
  private extractGapAnalysis(analysisResult: any): any {
    return {
      performanceGaps: analysisResult.competencyAnalysis.developmentAreas,
      competencyGaps: Object.entries(analysisResult.competencyAnalysis.competencyBreakdown || {})
        .filter(([_, data]: [string, any]) => data.gap > 0)
        .map(([competency, data]: [string, any]) => ({
          competency,
          currentLevel: data.score,
          targetLevel: data.score + data.gap,
          gap: data.gap
        })),
      skillGaps: analysisResult.competencyAnalysis.developmentAreas,
      behavioralGaps: analysisResult.behaviorAnalysis.behavioralConcerns,
      priorityGaps: analysisResult.competencyAnalysis.developmentAreas.slice(0, 3)
    };
  }

  /**
   * Create development plan from coaching results
   */
  private createDevelopmentPlan(coachingResult: any, gapAnalysis: any): any {
    return {
      phases: coachingResult.developmentRoadmap.phases,
      learningActivities: [], // Will be populated
      checkpoints: coachingResult.developmentRoadmap.checkpoints
    };
  }

  /**
   * Assign learning activities based on gaps
   */
  private assignLearningActivities(developmentPlan: any, gapAnalysis: any): any[] {
    const activities: any[] = [];

    // Create learning activities for each priority gap
    gapAnalysis.priorityGaps.forEach((gap: string, index: number) => {
      activities.push({
        id: `learning_${Date.now()}_${index}`,
        type: 'training',
        title: `${gap} Development Program`,
        provider: 'LXP Module',
        duration: '4-6 weeks',
        priority: index === 0 ? 'high' : 'medium'
      });
    });

    // Add coaching sessions
    activities.push({
      id: `coaching_${Date.now()}`,
      type: 'coaching',
      title: 'One-on-one Coaching Sessions',
      provider: 'Internal Coach',
      duration: '3-6 months',
      priority: 'high'
    });

    return activities;
  }

  /**
   * Create improvement plan record in database
   */
  private async createImprovementPlan(input: CoachingWorkflowInput, gapAnalysis: any, coachingResult: any): Promise<string> {
    try {
      const planId = `plan_${Date.now()}`;
      
      this.logger.info('Creating improvement plan record in database', {
        planId,
        employeeId: input.employeeId
      });

      const inputAny = input as any;
      const planData = {
        id: planId,
        tenantId: input.tenantId,
        employeeId: input.employeeId,
        managerId: inputAny.coachId || inputAny.managerId,

        // Plan details
        title: `Performance Improvement Plan - ${new Date().toLocaleDateString()}`,
        description: coachingResult.coachingPlan?.overview || 'Comprehensive performance improvement plan',
        status: 'active' as const,

        // Performance issues (REQUIRED)
        performanceIssues: gapAnalysis.developmentAreas?.map((area: any) => ({
          issue: area.area || area,
          severity: area.priority || 'medium',
          description: area.description || ''
        })) || [],

        // Improvement objectives (REQUIRED)
        objectives: gapAnalysis.developmentAreas?.slice(0, 5).map((area: any) => ({
          objective: area.area || area,
          description: area.description || '',
          priority: area.priority || 'medium'
        })) || [],

        // Success criteria (REQUIRED)
        successCriteria: coachingResult.coachingPlan?.successMetrics?.map((metric: any) => ({
          criterion: metric.metric || metric,
          target: metric.target || '',
          measurement: metric.measurement || ''
        })) || [],

        // Target timeline in days (REQUIRED)
        targetTimeline: 90,

        // Action items (REQUIRED)
        actionItems: coachingResult.actionPlan?.actionItems || [],
        milestones: coachingResult.developmentRoadmap?.milestones || [],

        // Timeline (REQUIRED)
        startDate: new Date(),
        targetCompletionDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days default

        // Progress tracking
        progressPercentage: '0.00',

        // Metadata
        metadata: {
          coachingType: input.coachingType,
          reason: input.reason || 'Performance coaching and development',
          reviewFrequency: input.coachingFrequency || 'biweekly',
          completedActions: 0,
          totalActions: coachingResult.actionPlan?.actionItems?.length || 0,
          gapAnalysis,
          coachingResult: {
            overview: coachingResult.coachingPlan?.overview,
            developmentRoadmap: coachingResult.developmentRoadmap,
            recommendations: coachingResult.recommendations
          },
          createdBy: 'ai_coach'
        },

        // Audit fields (REQUIRED)
        createdBy: inputAny.coachId || inputAny.managerId,
        updatedBy: inputAny.coachId || inputAny.managerId
      };

      await db.insert(performanceImprovementPlans).values(planData);

      this.logger.info('Improvement plan created successfully', { planId });
      return planId;
    } catch (error) {
      this.logger.error('Error creating improvement plan:', error);
      throw error;
    }
  }

  /**
   * Setup progress tracking for coaching
   */
  private setupProgressTracking(coachingResult: any, input: CoachingWorkflowInput): any {
    return {
      metrics: coachingResult.progressTracking.metrics,
      reviewSchedule: [
        {
          reviewType: 'coaching_check_in',
          frequency: 'biweekly',
          participants: [input.employeeId, 'coach', input.organizationalContext.managerId]
        },
        {
          reviewType: 'progress_review',
          frequency: 'monthly',
          participants: [input.employeeId, input.organizationalContext.managerId]
        }
      ]
    };
  }

  /**
   * Generate output triggers for LXP and other modules
   */
  private generateOutputTriggers(gapAnalysis: any, learningActivities: any[], input: CoachingWorkflowInput): any[] {
    const triggers: any[] = [];

    // Trigger LXP for learning activities
    if (learningActivities.length > 0) {
      triggers.push({
        triggerType: 'lxp_create_learning_path',
        targetModule: 'lxp_module',
        data: {
          employeeId: input.employeeId,
          skillGaps: gapAnalysis.skillGaps,
          developmentPriorities: gapAnalysis.priorityGaps,
          timeline: input.timeline || '6 months',
          coachingContext: true
        },
        priority: 'high'
      });
    }

    // Trigger performance tracking
    triggers.push({
      triggerType: 'performance_tracking_start',
      targetModule: 'performance_management',
      data: {
        employeeId: input.employeeId,
        trackingType: 'ongoing',
        trackingFrequency: 'weekly',
        focusAreas: gapAnalysis.priorityGaps
      },
      priority: 'medium'
    });

    return triggers;
  }
}

