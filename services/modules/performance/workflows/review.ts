import { Logger } from '../../../../utils/logger.js';
import { PerformanceAnalyzerAgent } from '../../../agents/performance/performance-analyzer.js';
import { PerformanceCoachAgent } from '../../../agents/performance/performance-coach.js';
import { db } from '../../../../db/index.js';
import { performanceGoals, performanceReviews, performanceFeedback, performanceMetrics } from '../../../../db/schema/performance.js';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface PerformanceReviewWorkflowInput {
  employeeId: string;
  tenantId: string;
  reviewerId: string;
  reviewType: 'annual' | 'quarterly' | 'monthly' | 'probation' | '360_degree';
  period: {
    startDate: string;
    endDate: string;
  };
  organizationalContext: {
    role: string;
    department: string;
    team?: string;
    level?: string;
    managerId: string;
  };
  includeCoaching?: boolean;
  include360Feedback?: boolean;
}

export interface PerformanceReviewWorkflowResult {
  success: boolean;
  workflow: string;
  employeeId: string;
  reviewId: string;
  reviewType: string;
  
  performanceAnalysis: {
    overallScore: number;
    performanceLevel: string;
    trend: string;
    goalAnalysis: any;
    competencyAnalysis: any;
    behaviorAnalysis: any;
    feedbackAnalysis: any;
    riskAssessment: any;
  };
  
  coachingGuidance?: {
    coachingPlan: any;
    developmentRoadmap: any;
    recommendations: any;
  };
  
  reviewReport: {
    summary: string;
    strengths: string[];
    developmentAreas: string[];
    achievements: string[];
    recommendations: string[];
    nextSteps: string[];
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
// PERFORMANCE REVIEW WORKFLOW
// ============================================================================

export class PerformanceReviewWorkflow {
  private logger: Logger;
  private analyzerAgent: PerformanceAnalyzerAgent;
  private coachAgent: PerformanceCoachAgent;

  constructor() {
    this.logger = new Logger('PerformanceReviewWorkflow');
    this.analyzerAgent = new PerformanceAnalyzerAgent();
    this.coachAgent = new PerformanceCoachAgent();
  }

  // ============================================================================
  // MAIN WORKFLOW EXECUTION
  // ============================================================================

  public async executeWorkflow(input: PerformanceReviewWorkflowInput): Promise<PerformanceReviewWorkflowResult> {
    try {
      this.logger.info('Starting performance review workflow', {
        employeeId: input.employeeId,
        reviewType: input.reviewType
      });

      const startTime = Date.now();
      const workflowSteps: string[] = [];
      const agentsUsed: string[] = [];

      // Step 1: Schedule and prepare review
      workflowSteps.push('schedule_review');
      const reviewId = `review_${Date.now()}`;

      // Step 2: Collect performance data
      workflowSteps.push('collect_performance_data');
      const performanceData = await this.collectPerformanceData(input);

      // Step 3: Collect feedback (self, manager, peer)
      workflowSteps.push('collect_feedback');
      const feedbackData = await this.collectFeedback(input);

      // Step 4: Invoke Analyzer Agent for comprehensive analysis
      workflowSteps.push('analyze_performance');
      agentsUsed.push('PerformanceAnalyzerAgent');
      
      const analysisResult = await this.analyzerAgent.analyzePerformance({
        employeeId: input.employeeId,
        tenantId: input.tenantId,
        period: {
          startDate: input.period.startDate,
          endDate: input.period.endDate,
          type: input.reviewType as any
        },
        performanceData,
        historicalData: {
          previousPeriods: [],
          trends: [],
          benchmarks: []
        },
        organizationalContext: input.organizationalContext as any,
        analysisType: 'comprehensive',
        analysisDepth: input.reviewType === 'annual' ? 'comprehensive' : 'detailed'
      });

      // Step 5: Generate coaching recommendations if requested
      let coachingGuidance = undefined;
      if (input.includeCoaching !== false) {
        workflowSteps.push('generate_coaching');
        agentsUsed.push('PerformanceCoachAgent');
        
        coachingGuidance = await this.generateCoachingGuidance(input, analysisResult);
      }

      // Step 6: Calculate overall score
      workflowSteps.push('calculate_overall_score');
      const overallScore = this.calculateOverallScore(analysisResult, feedbackData);

      // Step 7: Generate review report
      workflowSteps.push('generate_review_report');
      const reviewReport = this.generateReviewReport(analysisResult, coachingGuidance, input);

      // Step 8: Store review in database
      workflowSteps.push('store_review');
      await this.storeReview(reviewId, input, analysisResult, overallScore);

      // Step 9: Determine next actions based on score
      workflowSteps.push('determine_next_actions');
      const outputTriggers = this.determineNextActions(analysisResult, input);

      // Step 10: Notify stakeholders
      workflowSteps.push('notify_stakeholders');
      await this.notifyStakeholders(input, reviewReport);

      const executionTime = Date.now() - startTime;

      this.logger.info('Performance review workflow completed successfully', {
        employeeId: input.employeeId,
        reviewType: input.reviewType,
        overallScore,
        executionTime
      });

      return {
        success: true,
        workflow: 'performance_review',
        employeeId: input.employeeId,
        reviewId,
        reviewType: input.reviewType,
        performanceAnalysis: {
          overallScore: analysisResult.overallAssessment.overallScore,
          performanceLevel: analysisResult.overallAssessment.performanceLevel,
          trend: analysisResult.overallAssessment.trend,
          goalAnalysis: analysisResult.goalAnalysis,
          competencyAnalysis: analysisResult.competencyAnalysis,
          behaviorAnalysis: analysisResult.behaviorAnalysis,
          feedbackAnalysis: analysisResult.feedbackAnalysis,
          riskAssessment: analysisResult.riskAssessment
        },
        coachingGuidance,
        reviewReport,
        outputTriggers,
        metadata: {
          executionTime,
          agentsUsed,
          workflowSteps,
          confidence: analysisResult.metadata.confidence,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Performance review workflow failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // WORKFLOW STEPS
  // ============================================================================

  /**
   * Collect performance data for review period from database
   */
  private async collectPerformanceData(input: PerformanceReviewWorkflowInput): Promise<any> {
    try {
      this.logger.info('Collecting performance data from database', {
        employeeId: input.employeeId,
        period: input.period
      });

      // Use the period dates from input
      const startDate = new Date(input.period.startDate);
      const endDate = new Date(input.period.endDate);

      // Query goals for the period
      const goals = await db.select()
        .from(performanceGoals)
        .where(and(
          eq(performanceGoals.employeeId, input.employeeId),
          eq(performanceGoals.tenantId, input.tenantId),
          gte(performanceGoals.startDate, startDate),
          lte(performanceGoals.targetDate, endDate)
        ))
        .orderBy(desc(performanceGoals.priority));

      // Query previous reviews
      const reviews = await db.select()
        .from(performanceReviews)
        .where(and(
          eq(performanceReviews.employeeId, input.employeeId),
          eq(performanceReviews.tenantId, input.tenantId),
          gte(performanceReviews.reviewEndDate, startDate),
          lte(performanceReviews.reviewEndDate, endDate)
        ))
        .orderBy(desc(performanceReviews.reviewEndDate));

      // Query feedback for the period
      const feedback = await db.select()
        .from(performanceFeedback)
        .where(and(
          eq(performanceFeedback.employeeId, input.employeeId),
          eq(performanceFeedback.tenantId, input.tenantId),
          gte(performanceFeedback.createdAt, startDate),
          lte(performanceFeedback.createdAt, endDate)
        ))
        .orderBy(desc(performanceFeedback.createdAt));

      // Query metrics for the period
      const metrics = await db.select()
        .from(performanceMetrics)
        .where(and(
          eq(performanceMetrics.employeeId, input.employeeId),
          eq(performanceMetrics.tenantId, input.tenantId),
          gte(performanceMetrics.measurementEndDate, startDate),
          lte(performanceMetrics.measurementEndDate, endDate)
        ))
        .orderBy(desc(performanceMetrics.measurementEndDate));

      this.logger.info('Performance data collected', {
        goalsCount: goals.length,
        reviewsCount: reviews.length,
        feedbackCount: feedback.length,
        metricsCount: metrics.length
      });

      return {
        goals,
        reviews,
        feedback,
        metrics,
        improvementPlans: [] // Would query improvement plans table if exists
      };
    } catch (error) {
      this.logger.error('Error collecting performance data:', error);
      // Return empty data on error
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
   * Calculate date range for review period
   */
  private calculateReviewPeriod(period: string, reviewType: string): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    let startDate = new Date();

    switch (reviewType) {
      case 'annual':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'semi_annual':
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case 'quarterly':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'probation':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        // Try to parse period as year
        const year = parseInt(period);
        if (!isNaN(year)) {
          startDate = new Date(year, 0, 1);
          endDate.setFullYear(year, 11, 31);
        } else {
          startDate.setFullYear(startDate.getFullYear() - 1);
        }
    }

    return { startDate, endDate };
  }

  /**
   * Collect feedback from multiple sources from database
   */
  private async collectFeedback(input: PerformanceReviewWorkflowInput): Promise<any> {
    try {
      this.logger.info('Collecting feedback from database', {
        employeeId: input.employeeId,
        include360: input.include360Feedback
      });

      // Use the period dates from input
      const startDate = new Date(input.period.startDate);
      const endDate = new Date(input.period.endDate);

      // Query all feedback for the employee during the period
      const allFeedback = await db.select()
        .from(performanceFeedback)
        .where(and(
          eq(performanceFeedback.employeeId, input.employeeId),
          eq(performanceFeedback.tenantId, input.tenantId),
          gte(performanceFeedback.createdAt, startDate),
          lte(performanceFeedback.createdAt, endDate)
        ))
        .orderBy(desc(performanceFeedback.createdAt));

      // Categorize feedback by type
      const feedbackByType = {
        selfFeedback: allFeedback.filter(f => f.type === 'self_assessment'),
        managerFeedback: allFeedback.filter(f => f.type === 'manager_feedback'),
        peerFeedback: input.include360Feedback ? allFeedback.filter(f => f.type === 'peer_feedback') : [],
        subordinateFeedback: input.include360Feedback ? allFeedback.filter(f => f.type === '360_feedback') : [],
        customerFeedback: input.include360Feedback ? allFeedback.filter(f => f.type === 'customer_feedback' || f.type === 'stakeholder_feedback') : []
      };

      this.logger.info('Feedback collected', {
        selfCount: feedbackByType.selfFeedback.length,
        managerCount: feedbackByType.managerFeedback.length,
        peerCount: feedbackByType.peerFeedback.length,
        subordinateCount: feedbackByType.subordinateFeedback.length,
        customerCount: feedbackByType.customerFeedback.length
      });

      return feedbackByType;
    } catch (error) {
      this.logger.error('Error collecting feedback:', error);
      // Return empty feedback on error
      return {
        selfFeedback: [],
        managerFeedback: [],
        peerFeedback: [],
        subordinateFeedback: [],
        customerFeedback: []
      };
    }
  }

  /**
   * Generate coaching guidance using Coach Agent
   */
  private async generateCoachingGuidance(input: PerformanceReviewWorkflowInput, analysisResult: any): Promise<any> {
    const coachingResult = await this.coachAgent.coachEmployee({
      employeeId: input.employeeId,
      tenantId: input.tenantId,
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
        developmentPriorities: analysisResult.competencyAnalysis.developmentAreas.slice(0, 3),
        timeline: input.reviewType === 'annual' ? '12 months' : '3 months'
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
      organizationalContext: input.organizationalContext as any
    });

    return {
      coachingPlan: coachingResult.coachingPlan,
      developmentRoadmap: coachingResult.developmentRoadmap,
      recommendations: coachingResult.recommendations
    };
  }

  /**
   * Calculate overall performance score
   */
  private calculateOverallScore(analysisResult: any, feedbackData: any): number {
    // Weighted calculation
    const weights = {
      goalAchievement: 0.4,
      competency: 0.3,
      behavior: 0.2,
      feedback: 0.1
    };

    const scores = {
      goalAchievement: analysisResult.goalAnalysis?.achievementRate || 0,
      competency: analysisResult.competencyAnalysis?.overallCompetencyScore || 0,
      behavior: analysisResult.behaviorAnalysis?.overallBehaviorScore || 0,
      feedback: analysisResult.feedbackAnalysis?.averageRating || 0
    };

    const overallScore = 
      (scores.goalAchievement / 100) * 5 * weights.goalAchievement +
      scores.competency * weights.competency +
      scores.behavior * weights.behavior +
      scores.feedback * weights.feedback;

    return Math.min(Math.max(overallScore, 0), 5);
  }

  /**
   * Generate comprehensive review report
   */
  private generateReviewReport(analysisResult: any, coachingGuidance: any, input: PerformanceReviewWorkflowInput): any {
    return {
      summary: analysisResult.overallAssessment.summary || `Performance review for ${input.reviewType} period completed`,
      strengths: analysisResult.competencyAnalysis.strengths,
      developmentAreas: analysisResult.competencyAnalysis.developmentAreas,
      achievements: analysisResult.goalAnalysis.topPerformingGoals?.map((g: any) => g.title) || [],
      recommendations: [
        ...analysisResult.recommendations.immediate,
        ...analysisResult.recommendations.shortTerm,
        ...(coachingGuidance?.recommendations.immediate.map((r: any) => r.recommendation) || [])
      ],
      nextSteps: analysisResult.nextSteps.actionItems
    };
  }

  /**
   * Store review in database
   */
  private async storeReview(reviewId: string, input: PerformanceReviewWorkflowInput, analysisResult: any, overallScore: number): Promise<void> {
    try {
      this.logger.info('Storing performance review in database', {
        reviewId,
        employeeId: input.employeeId,
        reviewType: input.reviewType
      });

      const now = new Date();
      const reviewStartDate = input.period?.startDate ? new Date(input.period.startDate) : new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      const reviewData = {
        id: reviewId,
        tenantId: input.tenantId,
        employeeId: input.employeeId,
        reviewerId: input.reviewerId,
        title: `${input.reviewType} Performance Review - ${input.employeeId}`,
        reviewStartDate,
        reviewEndDate: now,
        dueDate: now,
        type: input.reviewType,
        period: input.period,
        status: 'completed' as const,
        overallRating: overallScore.toFixed(2),

        // Analysis results
        competencyRatings: analysisResult.competencyAnalysis?.competencyScores || {},
        behaviorRatings: analysisResult.behaviorAnalysis?.behaviorScores || {},

        // Strengths and development areas
        strengths: analysisResult.competencyAnalysis?.strengths || [],
        developmentAreas: analysisResult.competencyAnalysis?.developmentAreas || [],

        // Goal analysis
        goalsAchieved: analysisResult.goalAnalysis?.completedGoalsCount || 0,
        goalsTotal: analysisResult.goalAnalysis?.totalGoalsCount || 0,
        goalAchievementRate: analysisResult.goalAnalysis?.achievementRate || 0,

        // Comments
        reviewerComments: analysisResult.overallAssessment?.summary || '',
        employeeComments: (input as any).selfAssessment?.comments || '',

        // Performance level
        performanceLevel: analysisResult.overallAssessment?.performanceLevel || 'meets_expectations',

        // Recommendations
        recommendations: analysisResult.recommendations?.immediate || [],
        actionItems: analysisResult.nextSteps?.actionItems || [],

        // Completion
        completedDate: now,

        // Metadata
        metadata: {
          include360Feedback: input.include360Feedback,
          analysisType: 'ai_assisted',
          reviewDuration: 'standard',
          competencyAnalysis: analysisResult.competencyAnalysis,
          goalAnalysis: analysisResult.goalAnalysis,
          feedbackAnalysis: analysisResult.feedbackAnalysis
        },

        // Audit fields
        createdBy: input.reviewerId,
        updatedBy: input.reviewerId
      };

      await db.insert(performanceReviews).values(reviewData);

      this.logger.info('Performance review stored successfully in database', { reviewId });
    } catch (error) {
      this.logger.error('Error storing performance review:', error);
      throw error;
    }
  }

  /**
   * Determine next actions and output triggers based on performance score
   */
  private determineNextActions(analysisResult: any, input: PerformanceReviewWorkflowInput): any[] {
    const triggers: any[] = [];
    const performanceLevel = analysisResult.overallAssessment.performanceLevel;
    const overallScore = analysisResult.overallAssessment.overallScore;

    // High performance → Reward module
    if (performanceLevel === 'exceeds_expectations' || performanceLevel === 'significantly_exceeds') {
      triggers.push({
        triggerType: 'reward_trigger',
        targetModule: 'reward_module',
        data: {
          reason: 'excellent_performance',
          performanceScore: overallScore,
          reviewType: input.reviewType
        },
        priority: 'high'
      });
    }

    // Exceptional performance → Talent Management & Succession Planning
    if (overallScore >= 4.5) {
      triggers.push({
        triggerType: 'talent_management_trigger',
        targetModule: 'talent_management_module',
        data: {
          reason: 'high_potential',
          performanceScore: overallScore,
          talents: analysisResult.competencyAnalysis.strengths
        },
        priority: 'high'
      });

      triggers.push({
        triggerType: 'succession_planning_trigger',
        targetModule: 'succession_planning_module',
        data: {
          reason: 'leadership_potential',
          performanceScore: overallScore
        },
        priority: 'medium'
      });
    }

    // Development needs → LXP module
    if (analysisResult.competencyAnalysis.developmentAreas.length > 0) {
      triggers.push({
        triggerType: 'lxp_training_trigger',
        targetModule: 'lxp_module',
        data: {
          skillGaps: analysisResult.competencyAnalysis.developmentAreas,
          developmentPriorities: analysisResult.competencyAnalysis.developmentAreas.slice(0, 3),
          urgency: performanceLevel === 'below_expectations' ? 'high' : 'medium'
        },
        priority: performanceLevel === 'below_expectations' ? 'high' : 'medium'
      });
    }

    // Performance concerns → Retention intervention
    if (analysisResult.riskAssessment.overallRiskLevel === 'high') {
      triggers.push({
        triggerType: 'retention_intervention_trigger',
        targetModule: 'retention_module',
        data: {
          riskLevel: analysisResult.riskAssessment.overallRiskLevel,
          riskFactors: analysisResult.riskAssessment.riskFactors,
          performanceScore: overallScore
        },
        priority: 'critical'
      });
    }

    // Below expectations → Performance improvement plan
    if (performanceLevel === 'below_expectations' || performanceLevel === 'significantly_below') {
      triggers.push({
        triggerType: 'performance_improvement_trigger',
        targetModule: 'performance_management',
        data: {
          improvementAreas: analysisResult.competencyAnalysis.developmentAreas,
          urgencyLevel: 'high',
          targetDate: this.calculateImprovementDeadline(input.reviewType)
        },
        priority: 'critical'
      });
    }

    return triggers;
  }

  /**
   * Calculate improvement deadline based on review type
   */
  private calculateImprovementDeadline(reviewType: string): string {
    const now = new Date();
    const months = reviewType === 'annual' ? 6 : reviewType === 'quarterly' ? 2 : 1;
    now.setMonth(now.getMonth() + months);
    return now.toISOString().split('T')[0];
  }

  /**
   * Notify stakeholders about review completion
   */
  private async notifyStakeholders(input: PerformanceReviewWorkflowInput, reviewReport: any): Promise<void> {
    this.logger.info('Notifying stakeholders about review completion', {
      employeeId: input.employeeId,
      reviewType: input.reviewType
    });

    // Mock implementation - would send actual notifications
    // In production:
    // - Send review report to employee
    // - Send review report to manager
    // - Create notifications in system
    // - Schedule follow-up meetings

    this.logger.info('Stakeholders notified successfully');
  }
}

