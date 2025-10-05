import { Logger } from '../../../../utils/logger.js';
import { PerformanceAnalyzerAgent } from '../../../agents/performance/performance-analyzer.js';
import { db } from '../../../../db/index.js';
import { performanceGoals, performanceMetrics, performanceFeedback } from '../../../../db/schema/performance.js';
import { eq, and, desc, gte, lte } from 'drizzle-orm';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface PerformanceTrackingWorkflowInput {
  employeeId: string;
  tenantId: string;
  trackingType: 'ongoing' | 'milestone' | 'alert' | 'scheduled';
  trackingFrequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  focusAreas?: string[];
  goalIds?: string[];
}

export interface PerformanceTrackingWorkflowResult {
  success: boolean;
  workflow: string;
  employeeId: string;
  trackingType: string;
  
  currentStatus: {
    overallProgress: number;
    goalsOnTrack: number;
    goalsAtRisk: number;
    goalsOverdue: number;
    performanceTrend: string;
  };
  
  goalProgress: Array<{
    goalId: string;
    title: string;
    progress: number;
    status: string;
    trend: string;
    daysRemaining: number;
    riskLevel: string;
  }>;
  
  alerts: Array<{
    type: 'warning' | 'critical' | 'info';
    goalId?: string;
    message: string;
    actionRequired: string;
    priority: string;
  }>;
  
  insights: {
    patterns: string[];
    recommendations: string[];
    earlyWarnings: string[];
  };
  
  interventions: Array<{
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
// PERFORMANCE TRACKING WORKFLOW
// ============================================================================

export class PerformanceTrackingWorkflow {
  private logger: Logger;
  private analyzerAgent: PerformanceAnalyzerAgent;

  constructor() {
    this.logger = new Logger('PerformanceTrackingWorkflow');
    this.analyzerAgent = new PerformanceAnalyzerAgent();
  }

  // ============================================================================
  // MAIN WORKFLOW EXECUTION
  // ============================================================================

  public async executeWorkflow(input: PerformanceTrackingWorkflowInput): Promise<PerformanceTrackingWorkflowResult> {
    try {
      this.logger.info('Starting performance tracking workflow', {
        employeeId: input.employeeId,
        trackingType: input.trackingType
      });

      const startTime = Date.now();
      const workflowSteps: string[] = [];
      const agentsUsed: string[] = [];

      // Step 1: Collect ongoing performance data
      workflowSteps.push('collect_ongoing_data');
      const performanceData = await this.collectOngoingPerformanceData(input);

      // Step 2: Track goal progress
      workflowSteps.push('track_goal_progress');
      const goalProgress = await this.trackGoalProgress(input);

      // Step 3: Update metrics regularly
      workflowSteps.push('update_metrics');
      await this.updatePerformanceMetrics(input, performanceData);

      // Step 4: Identify issues early
      workflowSteps.push('identify_issues');
      const alerts = this.identifyPerformanceIssues(goalProgress, performanceData);

      // Step 5: Analyze trends if needed
      if (input.trackingType === 'ongoing' || alerts.some(a => a.type === 'critical')) {
        workflowSteps.push('analyze_trends');
        agentsUsed.push('PerformanceAnalyzerAgent');
        
        // Use analyzer for trend analysis
        await this.analyzeTrends(input, performanceData);
      }

      // Step 6: Calculate current status
      workflowSteps.push('calculate_status');
      const currentStatus = this.calculateCurrentStatus(goalProgress);

      // Step 7: Generate insights and recommendations
      workflowSteps.push('generate_insights');
      const insights = this.generateTrackingInsights(goalProgress, alerts, currentStatus);

      // Step 8: Trigger interventions if needed
      workflowSteps.push('trigger_interventions');
      const interventions = this.triggerInterventionsIfNeeded(alerts, currentStatus, input);

      const executionTime = Date.now() - startTime;

      this.logger.info('Performance tracking workflow completed', {
        employeeId: input.employeeId,
        goalsTracked: goalProgress.length,
        alertsRaised: alerts.length,
        executionTime
      });

      return {
        success: true,
        workflow: 'performance_tracking',
        employeeId: input.employeeId,
        trackingType: input.trackingType,
        currentStatus,
        goalProgress,
        alerts,
        insights,
        interventions,
        metadata: {
          executionTime,
          agentsUsed,
          workflowSteps,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Performance tracking workflow failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // WORKFLOW STEPS
  // ============================================================================

  /**
   * Collect ongoing performance data from database
   */
  private async collectOngoingPerformanceData(input: PerformanceTrackingWorkflowInput): Promise<any> {
    try {
      this.logger.info('Collecting ongoing performance data from database', {
        employeeId: input.employeeId
      });

      // Get current date for relative queries
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Query active goals
      const goals = await db.select()
        .from(performanceGoals)
        .where(and(
          eq(performanceGoals.employeeId, input.employeeId),
          eq(performanceGoals.tenantId, input.tenantId),
          eq(performanceGoals.status, 'active')
        ))
        .orderBy(desc(performanceGoals.priority));

      // Query recent metrics (last 30 days)
      const metrics = await db.select()
        .from(performanceMetrics)
        .where(and(
          eq(performanceMetrics.employeeId, input.employeeId),
          eq(performanceMetrics.tenantId, input.tenantId),
          gte(performanceMetrics.lastMeasuredAt, thirtyDaysAgo)
        ))
        .orderBy(desc(performanceMetrics.lastMeasuredAt));

      // Query recent feedback (last 30 days)
      const recentFeedback = await db.select()
        .from(performanceFeedback)
        .where(and(
          eq(performanceFeedback.employeeId, input.employeeId),
          eq(performanceFeedback.tenantId, input.tenantId),
          gte(performanceFeedback.createdAt, thirtyDaysAgo)
        ))
        .orderBy(desc(performanceFeedback.createdAt))
        .limit(10);

      this.logger.info('Ongoing performance data collected', {
        goalsCount: goals.length,
        metricsCount: metrics.length,
        feedbackCount: recentFeedback.length
      });

      return {
        goals,
        metrics,
        recentFeedback,
        recentActivities: [] // Would query activity log if exists
      };
    } catch (error) {
      this.logger.error('Error collecting ongoing performance data:', error);
      return {
        goals: [],
        metrics: [],
        recentFeedback: [],
        recentActivities: []
      };
    }
  }

  /**
   * Track goal progress for all active goals from database
   */
  private async trackGoalProgress(input: PerformanceTrackingWorkflowInput): Promise<any[]> {
    try {
      this.logger.info('Tracking goal progress from database', {
        employeeId: input.employeeId,
        goalIds: input.goalIds?.length || 'all'
      });

      // Build query conditions
      const conditions = [
        eq(performanceGoals.employeeId, input.employeeId),
        eq(performanceGoals.tenantId, input.tenantId)
      ];

      // If specific goal IDs provided, filter by them
      if (input.goalIds && input.goalIds.length > 0) {
        // For specific goals, don't filter by status
      } else {
        // Otherwise, get only active goals
        conditions.push(eq(performanceGoals.status, 'active'));
      }

      // Query goals
      const goals = await db.select()
        .from(performanceGoals)
        .where(and(...conditions))
        .orderBy(desc(performanceGoals.priority));

      // Calculate progress tracking for each goal
      const now = new Date();
      const trackedGoals = goals.map(goal => {
        const progress = parseFloat(goal.progressPercentage || '0');
        const targetDate = goal.targetDate ? new Date(goal.targetDate) : null;
        const daysRemaining = targetDate ? Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        
        // Determine trend and risk level
        let trend = 'on_track';
        let riskLevel = 'low';

        if (targetDate) {
          const totalDuration = targetDate.getTime() - new Date(goal.startDate).getTime();
          const elapsedDuration = now.getTime() - new Date(goal.startDate).getTime();
          const expectedProgress = (elapsedDuration / totalDuration) * 100;

          if (progress < expectedProgress - 20) {
            trend = 'behind';
            riskLevel = 'high';
          } else if (progress < expectedProgress - 10) {
            trend = 'at_risk';
            riskLevel = 'medium';
          } else if (progress > expectedProgress + 10) {
            trend = 'ahead';
            riskLevel = 'low';
          }

          // Check for overdue
          if (daysRemaining < 0 && progress < 100) {
            trend = 'overdue';
            riskLevel = 'critical';
          }
        }

        return {
          goalId: goal.id,
          title: goal.title,
          progress,
          status: goal.status,
          trend,
          daysRemaining,
          riskLevel,
          priority: goal.priority,
          targetDate: goal.targetDate,
          startDate: goal.startDate,
          category: goal.category
        };
      });

      this.logger.info('Goal progress tracked', {
        totalGoals: trackedGoals.length,
        atRisk: trackedGoals.filter(g => g.riskLevel === 'high' || g.riskLevel === 'critical').length
      });

      return trackedGoals;
    } catch (error) {
      this.logger.error('Error tracking goal progress:', error);
      return [];
    }
  }

  /**
   * Update performance metrics in database
   */
  private async updatePerformanceMetrics(input: PerformanceTrackingWorkflowInput, performanceData: any): Promise<void> {
    try {
      this.logger.info('Updating performance metrics in database', {
        employeeId: input.employeeId
      });

      const now = new Date();

      // Calculate aggregate metrics from performance data
      const goals = performanceData.goals || [];
      const activeGoals = goals.filter((g: any) => g.status === 'active');
      const completedGoals = goals.filter((g: any) => g.status === 'completed');

      // Calculate average progress across all active goals
      const avgProgress = activeGoals.length > 0
        ? activeGoals.reduce((sum: number, g: any) => sum + parseFloat(g.progressPercentage || '0'), 0) / activeGoals.length
        : 0;

      // Calculate goal completion rate
      const totalGoals = goals.length;
      const completionRate = totalGoals > 0 ? (completedGoals.length / totalGoals) * 100 : 0;

      // Count at-risk goals
      const atRiskGoals = activeGoals.filter((g: any) => {
        const progress = parseFloat(g.progressPercentage || '0');
        const targetDate = g.targetDate ? new Date(g.targetDate) : null;
        if (!targetDate) return false;
        
        const totalDuration = targetDate.getTime() - new Date(g.startDate).getTime();
        const elapsedDuration = now.getTime() - new Date(g.startDate).getTime();
        const expectedProgress = (elapsedDuration / totalDuration) * 100;
        
        return progress < expectedProgress - 10;
      }).length;

      // Calculate feedback sentiment
      const recentFeedback = performanceData.recentFeedback || [];
      const avgFeedbackRating = recentFeedback.length > 0
        ? recentFeedback.reduce((sum: number, f: any) => sum + parseFloat(f.rating || '0'), 0) / recentFeedback.length
        : 0;

      // Insert new metric record
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const metricData = {
        tenantId: input.tenantId,
        employeeId: input.employeeId,
        name: 'Overall Performance Tracking',
        type: 'quantitative' as const,
        category: 'overall',
        actualValue: avgProgress.toFixed(2),
        unit: 'percentage',
        dataSource: 'automated_tracking',
        measurementStartDate: monthStart,
        measurementEndDate: monthEnd,
        createdBy: input.employeeId,
        updatedBy: input.employeeId,

        // Additional metrics in tags/notes
        tags: ['performance_tracking', 'automated'],
        notes: `Tracked at ${now.toISOString()}. Completion rate: ${completionRate.toFixed(2)}%`
      };

      await db.insert(performanceMetrics).values(metricData);

      this.logger.info('Performance metrics updated successfully', {
        avgProgress: avgProgress.toFixed(2),
        completionRate: completionRate.toFixed(2),
        atRiskGoals
      });
    } catch (error) {
      this.logger.error('Error updating performance metrics:', error);
      // Don't throw - metrics update failure shouldn't stop the workflow
    }
  }

  /**
   * Identify performance issues and generate alerts
   */
  private identifyPerformanceIssues(goalProgress: any[], performanceData: any): any[] {
    const alerts: any[] = [];

    // Check for at-risk or overdue goals
    goalProgress.forEach(goal => {
      if (goal.riskLevel === 'high' || goal.status === 'overdue') {
        alerts.push({
          type: 'critical',
          goalId: goal.goalId,
          message: `Goal "${goal.title}" is ${goal.status === 'overdue' ? 'overdue' : 'at high risk'}`,
          actionRequired: 'Immediate intervention needed - review resources and timeline',
          priority: 'high'
        });
      } else if (goal.riskLevel === 'medium' || goal.trend === 'at_risk') {
        alerts.push({
          type: 'warning',
          goalId: goal.goalId,
          message: `Goal "${goal.title}" needs attention`,
          actionRequired: 'Review progress and adjust plan if needed',
          priority: 'medium'
        });
      }
    });

    // Check for overall performance concerns
    const avgProgress = goalProgress.reduce((sum, g) => sum + g.progress, 0) / goalProgress.length;
    if (avgProgress < 50 && goalProgress.some(g => g.daysRemaining < 60)) {
      alerts.push({
        type: 'warning',
        message: 'Overall goal progress is below expected pace',
        actionRequired: 'Schedule check-in with manager to review priorities',
        priority: 'medium'
      });
    }

    return alerts;
  }

  /**
   * Analyze performance trends
   */
  private async analyzeTrends(input: PerformanceTrackingWorkflowInput, performanceData: any): Promise<any> {
    this.logger.info('Analyzing performance trends', {
      employeeId: input.employeeId
    });

    // Would use PerformanceAnalyzerAgent for deeper trend analysis
    return {
      overallTrend: 'stable',
      concerningTrends: [],
      positiveTrends: []
    };
  }

  /**
   * Calculate current performance status
   */
  private calculateCurrentStatus(goalProgress: any[]): any {
    const totalGoals = goalProgress.length;
    const goalsOnTrack = goalProgress.filter(g => g.trend === 'on_track' || g.trend === 'ahead').length;
    const goalsAtRisk = goalProgress.filter(g => g.trend === 'at_risk').length;
    const goalsOverdue = goalProgress.filter(g => g.status === 'overdue').length;
    const avgProgress = goalProgress.reduce((sum, g) => sum + g.progress, 0) / totalGoals;

    let performanceTrend = 'stable';
    if (avgProgress >= 75) {
      performanceTrend = 'ahead';
    } else if (avgProgress < 50) {
      performanceTrend = 'behind';
    }

    return {
      overallProgress: Math.round(avgProgress),
      goalsOnTrack,
      goalsAtRisk,
      goalsOverdue,
      performanceTrend
    };
  }

  /**
   * Generate tracking insights and recommendations
   */
  private generateTrackingInsights(goalProgress: any[], alerts: any[], currentStatus: any): any {
    const insights = {
      patterns: [] as string[],
      recommendations: [] as string[],
      earlyWarnings: [] as string[]
    };

    // Identify patterns
    if (currentStatus.goalsOnTrack >= goalProgress.length * 0.8) {
      insights.patterns.push('Strong goal achievement trajectory - maintain current pace');
    }
    
    if (currentStatus.goalsAtRisk > 0) {
      insights.patterns.push(`${currentStatus.goalsAtRisk} goal(s) need attention - early intervention recommended`);
    }

    // Generate recommendations
    if (currentStatus.performanceTrend === 'behind') {
      insights.recommendations.push('Schedule check-in with manager to reprioritize goals');
      insights.recommendations.push('Identify and remove blockers to goal achievement');
    } else if (currentStatus.performanceTrend === 'ahead') {
      insights.recommendations.push('Consider stretch goals or additional objectives');
      insights.recommendations.push('Document success factors for future application');
    }

    // Early warnings
    if (alerts.some(a => a.type === 'critical')) {
      insights.earlyWarnings.push('Critical performance issues detected - immediate action required');
    }

    goalProgress.forEach(goal => {
      if (goal.progress < 30 && goal.daysRemaining < 60) {
        insights.earlyWarnings.push(`Goal "${goal.title}" at risk - ${goal.daysRemaining} days remaining with only ${goal.progress}% progress`);
      }
    });

    return insights;
  }

  /**
   * Trigger interventions if performance issues detected
   */
  private triggerInterventionsIfNeeded(alerts: any[], currentStatus: any, input: PerformanceTrackingWorkflowInput): any[] {
    const interventions: any[] = [];

    // Critical alerts → Performance coaching
    const criticalAlerts = alerts.filter(a => a.type === 'critical');
    if (criticalAlerts.length > 0) {
      interventions.push({
        triggerType: 'coaching_trigger',
        targetModule: 'performance_management',
        data: {
          coachingType: 'performance_improvement',
          urgencyLevel: 'high',
          focusAreas: criticalAlerts.map(a => a.goalId),
          reason: 'critical_performance_alerts'
        },
        priority: 'critical'
      });
    }

    // Multiple at-risk goals → Manager intervention
    if (currentStatus.goalsAtRisk >= 2) {
      interventions.push({
        triggerType: 'manager_intervention_trigger',
        targetModule: 'performance_management',
        data: {
          reason: 'multiple_goals_at_risk',
          goalCount: currentStatus.goalsAtRisk,
          employeeId: input.employeeId
        },
        priority: 'high'
      });
    }

    // Behind trend → Development support
    if (currentStatus.performanceTrend === 'behind') {
      interventions.push({
        triggerType: 'development_support_trigger',
        targetModule: 'lxp_module',
        data: {
          reason: 'performance_support_needed',
          focusAreas: input.focusAreas || [],
          urgency: 'medium'
        },
        priority: 'medium'
      });
    }

    return interventions;
  }
}

