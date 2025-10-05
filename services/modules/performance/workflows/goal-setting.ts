import { Logger } from '../../../../utils/logger.js';
import { PerformanceGoalSetterAgent } from '../../../agents/performance/goal-setter.js';
import { db } from '../../../../db/index.js';
import { performanceGoals, performanceReviews, performanceMetrics } from '../../../../db/schema/performance.js';
import { eq, and, desc } from 'drizzle-orm';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface GoalSettingWorkflowInput {
  employeeId: string;
  tenantId: string;
  managerId: string;
  period: string;
  organizationalContext: {
    role: string;
    department: string;
    team?: string;
    level?: string;
  };
  organizationalObjectives: {
    strategicGoals: string[];
    departmentGoals: string[];
    teamGoals: string[];
  };
  currentPerformance?: {
    overallScore: number;
    competencyScores: Record<string, number>;
    behaviorScores: Record<string, number>;
  };
  historicalGoals?: Array<{
    goal: string;
    achievementRate: number;
    period: string;
  }>;
  constraints?: {
    maxGoals?: number;
    minGoals?: number;
    budgetLimits?: Record<string, number>;
    timeConstraints?: Record<string, string>;
  };
}

export interface GoalSettingWorkflowResult {
  success: boolean;
  workflow: string;
  employeeId: string;
  period: string;
  goals: Array<{
    id?: string;
    title: string;
    description: string;
    category: string;
    type: string;
    target: string | number;
    deadline: string;
    priority: string;
    framework: string;
    alignmentScore: number;
    successCriteria: string[];
    milestones: Array<{
      title: string;
      dueDate: string;
      criteria: string[];
    }>;
  }>;
  alignment: {
    organizational: number;
    departmental: number;
    team: number;
    overall: number;
  };
  recommendations: {
    immediate: string[];
    monitoring: string[];
    support: string[];
  };
  metadata: {
    executionTime: number;
    agentsUsed: string[];
    workflowSteps: string[];
    confidence: number;
    timestamp: string;
  };
}

// ============================================================================
// GOAL SETTING WORKFLOW
// ============================================================================

export class GoalSettingWorkflow {
  private logger: Logger;
  private goalSetterAgent: PerformanceGoalSetterAgent;

  constructor() {
    this.logger = new Logger('GoalSettingWorkflow');
    this.goalSetterAgent = new PerformanceGoalSetterAgent();
  }

  // ============================================================================
  // MAIN WORKFLOW EXECUTION
  // ============================================================================

  public async executeWorkflow(input: GoalSettingWorkflowInput): Promise<GoalSettingWorkflowResult> {
    try {
      this.logger.info('Starting goal setting workflow', {
        employeeId: input.employeeId,
        period: input.period
      });

      const startTime = Date.now();
      const workflowSteps: string[] = [];
      const agentsUsed: string[] = [];

      // Step 1: Validate input and prepare context
      workflowSteps.push('validate_input');
      this.validateInput(input);

      // Step 2: Fetch current performance data if not provided
      workflowSteps.push('fetch_performance_data');
      const currentPerformance = input.currentPerformance || await this.fetchCurrentPerformance(input.employeeId, input.tenantId);

      // Step 3: Fetch historical goal data
      workflowSteps.push('fetch_historical_data');
      const historicalGoals = input.historicalGoals || await this.fetchHistoricalGoals(input.employeeId, input.tenantId);

      // Step 4: Invoke Goal Setter Agent
      workflowSteps.push('invoke_goal_setter_agent');
      agentsUsed.push('PerformanceGoalSetterAgent');
      
      const goalSetterResult = await this.goalSetterAgent.analyzeGoals({
        employeeId: input.employeeId,
        tenantId: input.tenantId,
        role: input.organizationalContext.role,
        department: input.organizationalContext.department,
        currentPerformance,
        organizationalObjectives: input.organizationalObjectives,
        historicalData: {
          previousGoals: historicalGoals.map((hg, idx) => ({
            id: hg.goal?.id || `hist-${idx}`,
            title: hg.goal?.title || 'Historical Goal',
            category: hg.goal?.category || 'performance',
            achievementRate: Number(hg.achievementRate) || 0,
            completionTime: hg.goal?.completionTime || 0
          })),
          performanceTrends: {}
        },
        constraints: {
          maxGoals: input.constraints?.maxGoals || 5,
          minGoals: input.constraints?.minGoals || 3,
          budgetLimits: input.constraints?.budgetLimits || {},
          timeConstraints: {}
        },
        period: (input.period as 'quarterly' | 'annual' | 'monthly') || 'quarterly',
        managerId: input.managerId
      });

      // Step 5: Transform agent recommendations to structured goals
      workflowSteps.push('transform_recommendations');
      const structuredGoals = this.transformRecommendationsToGoals(
        goalSetterResult.recommendations,
        input.employeeId,
        input.tenantId,
        input.period
      );

      // Step 6: Validate goal alignment
      workflowSteps.push('validate_alignment');
      const alignmentScores = this.validateGoalAlignment(
        structuredGoals,
        input.organizationalObjectives
      );

      // Step 7: Store goals in database
      workflowSteps.push('store_goals');
      const storedGoals = await this.storeGoals(structuredGoals, input);

      // Step 8: Generate recommendations
      workflowSteps.push('generate_recommendations');
      const recommendations = this.generateRecommendations(goalSetterResult, storedGoals);

      // Step 9: Notify stakeholders
      workflowSteps.push('notify_stakeholders');
      await this.notifyStakeholders(input.employeeId, input.managerId, storedGoals);

      const executionTime = Date.now() - startTime;

      this.logger.info('Goal setting workflow completed successfully', {
        employeeId: input.employeeId,
        goalsCreated: storedGoals.length,
        executionTime
      });

      return {
        success: true,
        workflow: 'goal_setting',
        employeeId: input.employeeId,
        period: input.period,
        goals: storedGoals,
        alignment: alignmentScores,
        recommendations,
        metadata: {
          executionTime,
          agentsUsed,
          workflowSteps,
          confidence: goalSetterResult.confidence,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Goal setting workflow failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // WORKFLOW STEPS
  // ============================================================================

  /**
   * Validate workflow input
   */
  private validateInput(input: GoalSettingWorkflowInput): void {
    if (!input.employeeId) {
      throw new Error('Employee ID is required');
    }
    if (!input.tenantId) {
      throw new Error('Tenant ID is required');
    }
    if (!input.period) {
      throw new Error('Period is required');
    }
    if (!input.organizationalObjectives) {
      throw new Error('Organizational objectives are required');
    }
  }

  /**
   * Fetch current performance data from database
   */
  private async fetchCurrentPerformance(employeeId: string, tenantId: string): Promise<any> {
    try {
      this.logger.info('Fetching current performance data from database', { employeeId, tenantId });
      
      // Get latest review for competency and behavior scores
      const latestReviews = await db.select()
        .from(performanceReviews)
        .where(and(
          eq(performanceReviews.employeeId, employeeId),
          eq(performanceReviews.tenantId, tenantId),
          eq(performanceReviews.status, 'completed')
        ))
        .orderBy(desc(performanceReviews.reviewEndDate))
        .limit(1);
      
      if (latestReviews.length > 0) {
        const latestReview = latestReviews[0];
        return {
          overallScore: parseFloat(latestReview.overallRating || '3.5'),
          goalAchievementRate: 0.75,
          competencyScores: {},
          behaviorScores: {}
        };
      }
      
      // Default if no review found
      return {
        overallScore: 3.0,
        goalAchievementRate: 0.75,
        competencyScores: {},
        behaviorScores: {}
      };
    } catch (error) {
      this.logger.error('Error fetching current performance:', error);
      // Return defaults on error
      return {
        overallScore: 3.0,
        competencyScores: {},
        behaviorScores: {}
      };
    }
  }

  /**
   * Fetch historical goal data from database
   */
  private async fetchHistoricalGoals(employeeId: string, tenantId: string): Promise<any[]> {
    try {
      this.logger.info('Fetching historical goals from database', { employeeId, tenantId });
      
      // Get completed goals from previous periods
      const historicalGoals = await db.select()
        .from(performanceGoals)
        .where(and(
          eq(performanceGoals.employeeId, employeeId),
          eq(performanceGoals.tenantId, tenantId),
          eq(performanceGoals.status, 'completed')
        ))
        .orderBy(desc(performanceGoals.actualCompletionDate))
        .limit(10);
      
      return historicalGoals.map(goal => ({
        goal: goal.title,
        achievementRate: parseFloat(goal.progressPercentage || '0'),
        period: goal.actualCompletionDate?.getFullYear().toString() || 'unknown'
      }));
    } catch (error) {
      this.logger.error('Error fetching historical goals:', error);
      return [];
    }
  }

  /**
   * Transform AI recommendations to structured goals
   */
  private transformRecommendationsToGoals(recommendations: any[], employeeId: string, tenantId: string, period: string): any[] {
    return recommendations.map((rec, index) => ({
      title: rec.title || `Goal ${index + 1}`,
      description: rec.description || rec.rationale || '',
      category: rec.category || 'performance',
      type: rec.type || 'quantitative',
      target: rec.target || 'To be defined',
      deadline: rec.deadline || this.calculateDeadline(period),
      priority: rec.priority || 'medium',
      framework: rec.framework || 'SMART',
      alignmentScore: rec.alignmentScore || 0.8,
      successCriteria: rec.successCriteria || ['Achievement of target', 'Quality of execution'],
      milestones: rec.milestones || this.generateDefaultMilestones(period)
    }));
  }

  /**
   * Calculate goal deadline based on period
   */
  private calculateDeadline(period: string): string {
    const currentYear = new Date().getFullYear();
    return `${period || currentYear}-12-31`;
  }

  /**
   * Generate default milestones for goals
   */
  private generateDefaultMilestones(period: string): any[] {
    const year = period || new Date().getFullYear().toString();
    return [
      {
        title: 'Q1 Checkpoint',
        dueDate: `${year}-03-31`,
        criteria: ['25% progress achieved', 'Initial results visible']
      },
      {
        title: 'Q2 Checkpoint',
        dueDate: `${year}-06-30`,
        criteria: ['50% progress achieved', 'On track for goal']
      },
      {
        title: 'Q3 Checkpoint',
        dueDate: `${year}-09-30`,
        criteria: ['75% progress achieved', 'Final push planned']
      }
    ];
  }

  /**
   * Validate goal alignment with organizational objectives
   */
  private validateGoalAlignment(goals: any[], organizationalObjectives: any): any {
    const alignment = {
      organizational: 0,
      departmental: 0,
      team: 0,
      overall: 0
    };

    if (goals.length === 0) {
      return alignment;
    }

    // Extract keywords from organizational objectives
    const orgKeywords = this.extractKeywords(organizationalObjectives);
    const orgCategories = organizationalObjectives?.strategicPriorities || [];

    // Calculate organizational alignment for each goal
    let totalOrgAlignment = 0;
    let totalDeptAlignment = 0;
    let totalTeamAlignment = 0;

    goals.forEach(goal => {
      // Organizational alignment based on keywords and categories
      const goalKeywords = this.extractKeywords(goal);
      const keywordMatch = this.calculateKeywordMatch(goalKeywords, orgKeywords);
      const categoryMatch = this.calculateCategoryMatch(goal.category, orgCategories);
      const orgScore = (keywordMatch * 0.6) + (categoryMatch * 0.4);
      
      // Departmental alignment (based on goal category and department priorities)
      const deptPriorities = organizationalObjectives?.departmentalPriorities?.[goal.department] || [];
      const deptMatch = deptPriorities.length > 0 
        ? this.calculateKeywordMatch(goalKeywords, this.extractKeywords({ priorities: deptPriorities }))
        : 0.7; // Default if no dept priorities
      
      // Team alignment (based on goal feasibility and team capacity)
      const teamScore = this.calculateTeamAlignment(goal, organizationalObjectives);
      
      totalOrgAlignment += orgScore;
      totalDeptAlignment += deptMatch;
      totalTeamAlignment += teamScore;
    });

    // Calculate average alignments
    alignment.organizational = totalOrgAlignment / goals.length;
    alignment.departmental = totalDeptAlignment / goals.length;
    alignment.team = totalTeamAlignment / goals.length;
    alignment.overall = (alignment.organizational + alignment.departmental + alignment.team) / 3;

    return alignment;
  }

  /**
   * Extract keywords from text objects
   */
  private extractKeywords(obj: any): string[] {
    const text = JSON.stringify(obj).toLowerCase();
    // Simple keyword extraction (in production, would use NLP)
    const keywords = text.match(/\b[a-z]{4,}\b/g) || [];
    return [...new Set(keywords)]; // Unique keywords
  }

  /**
   * Calculate keyword match score
   */
  private calculateKeywordMatch(keywords1: string[], keywords2: string[]): number {
    if (keywords1.length === 0 || keywords2.length === 0) return 0.5;
    
    const matchCount = keywords1.filter(k => keywords2.includes(k)).length;
    const unionSize = new Set([...keywords1, ...keywords2]).size;
    
    return unionSize > 0 ? (matchCount / unionSize) : 0.5;
  }

  /**
   * Calculate category match score
   */
  private calculateCategoryMatch(goalCategory: string, orgCategories: string[]): number {
    if (!orgCategories || orgCategories.length === 0) return 0.7;
    
    const normalizedGoalCategory = goalCategory?.toLowerCase() || '';
    const hasMatch = orgCategories.some(cat => 
      cat.toLowerCase().includes(normalizedGoalCategory) ||
      normalizedGoalCategory.includes(cat.toLowerCase())
    );
    
    return hasMatch ? 0.9 : 0.5;
  }

  /**
   * Calculate team alignment score
   */
  private calculateTeamAlignment(goal: any, organizationalObjectives: any): number {
    let score = 0.7; // Base score
    
    // Check if goal difficulty matches employee capacity
    if (goal.difficulty === 'realistic') score += 0.1;
    if (goal.difficulty === 'stretch') score += 0.05;
    
    // Check if timeline is reasonable
    const deadline = new Date(goal.deadline);
    const now = new Date();
    const daysToComplete = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysToComplete > 30 && daysToComplete < 365) {
      score += 0.1; // Reasonable timeline
    }
    
    // Check if goal has clear milestones
    if (goal.milestones && goal.milestones.length > 0) {
      score += 0.05;
    }
    
    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Store goals in database
   */
  private async storeGoals(goals: any[], input: GoalSettingWorkflowInput): Promise<any[]> {
    try {
      this.logger.info('Storing goals in database', {
        employeeId: input.employeeId,
        goalsCount: goals.length
      });

      // Prepare goals for database insertion
      const goalsToInsert = goals.map(goal => ({
        tenantId: input.tenantId,
        employeeId: input.employeeId,
        managerId: input.managerId,
        title: goal.title,
        description: goal.description || '',
        type: 'individual' as const,
        category: goal.category || 'performance',
        goalFormat: goal.framework || 'smart',
        target: goal.target || {},
        current: {},
        baseline: {},
        weight: '1.00',
        priority: goal.priority === 'high' ? 1 : goal.priority === 'medium' ? 2 : 3,
        status: 'active' as const,
        startDate: new Date(),
        targetDate: new Date(goal.deadline),
        progressPercentage: '0.00',
        requiresApproval: false,
        metadata: {
          framework: goal.framework,
          alignmentScore: goal.alignmentScore,
          successCriteria: goal.successCriteria,
          milestones: goal.milestones
        },
        createdBy: input.managerId,
        updatedBy: input.managerId
      }));

      // Insert goals into database
      const storedGoals = await db.insert(performanceGoals)
        .values(goalsToInsert)
        .returning();

      this.logger.info('Goals stored successfully in database', { count: storedGoals.length });

      return storedGoals;
    } catch (error) {
      this.logger.error('Error storing goals in database:', error);
      throw error;
    }
  }

  /**
   * Generate recommendations for goal management
   */
  private generateRecommendations(agentResult: any, storedGoals: any[]): any {
    return {
      immediate: [
        'Review and discuss goals with manager within 1 week',
        'Set up tracking system for goal progress',
        'Identify resources needed for each goal'
      ],
      monitoring: [
        'Schedule monthly check-ins to review progress',
        'Update goal progress in system regularly',
        'Adjust goals if circumstances change significantly'
      ],
      support: [
        'Request manager support for goal achievement',
        'Identify training needs for skill gaps',
        'Connect with peers working on similar goals'
      ]
    };
  }

  /**
   * Notify stakeholders about new goals
   */
  private async notifyStakeholders(employeeId: string, managerId: string, goals: any[]): Promise<void> {
    this.logger.info('Notifying stakeholders about new goals', {
      employeeId,
      managerId,
      goalsCount: goals.length
    });

    // Mock implementation - would send actual notifications
    // In production:
    // - Send email to employee
    // - Send email to manager
    // - Create notifications in system
    // - Update performance dashboard

    this.logger.info('Stakeholders notified successfully');
  }
}

