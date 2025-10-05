/**
 * Performance Cycle Manager
 *
 * Manages performance cycles with multi-agent integration:
 * - Gets culture priorities from Culture Agent
 * - Gets learning needs from LXP
 * - Reads and understands strategy
 * - Gets structure from Structure Agent
 * - Cascades goals: strategy → department → individual
 * - Manages quarterly cycles (default, configurable by admin)
 */

import { db } from '../../../../db/index.js';
import { performanceCycles, performanceGoals, oneOnOneMeetings } from '../../../../db/schema/performance.js';
import { employeeProfiles, structureAnalysisResults } from '../../../../db/schema/core.js';
import { cultureAssessments } from '../../../../db/schema/culture.js';
import { skillsGapAnalysis } from '../../../../db/schema/skills.js';
import { eq, and, desc } from 'drizzle-orm';
import { EnsembleAI } from '../../../ai-providers/ensemble.js';
import { Logger } from '../../../../utils/logger.js';

export class PerformanceCycleManager {
  private ensemble: EnsembleAI;
  private tenantId: string;
  private logger: Logger;

  // Freshness thresholds
  private readonly STRUCTURE_FRESHNESS_HOURS = 1; // Structure should be updated within 1 hour
  private readonly CULTURE_FRESHNESS_DAYS = 7; // Culture assessments valid for 7 days

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.logger = new Logger('PerformanceCycleManager');
    this.ensemble = new EnsembleAI({
      strategy: 'weighted',
      providers: ['claude', 'gpt-4', 'gemini']
    });
  }

  /**
   * Create a new performance cycle with multi-agent integration
   */
  async createCycle(params: {
    name: string;
    cycleType: 'quarterly' | 'annual' | 'monthly' | 'custom';
    fiscalYear: number;
    quarter?: number;
    startDate: Date;
    endDate: Date;
    reviewDueDate?: Date;
    createdBy: string;
  }): Promise<string> {
    // Step 1: Get culture priorities from Culture Agent
    const culturePriorities = await this.getCulturePriorities();

    // Step 2: Get learning needs from LXP
    const learningNeeds = await this.getLearningNeeds();

    // Step 3: Get and understand strategy
    const strategy = await this.getStrategy();

    // Step 4: Get organizational structure from Structure Agent
    const structure = await this.getStructure();

    // Step 5: Create the cycle with integrated data
    const [cycle] = await db.insert(performanceCycles).values({
      tenantId: this.tenantId,
      name: params.name,
      cycleType: params.cycleType,
      fiscalYear: params.fiscalYear,
      quarter: params.quarter,
      startDate: params.startDate,
      endDate: params.endDate,
      reviewDueDate: params.reviewDueDate || params.endDate,
      status: 'upcoming',
      isDefault: params.cycleType === 'quarterly',
      priorities: culturePriorities,
      skillsNeeded: learningNeeds,
      cultureFocus: culturePriorities,
      strategyAlignment: strategy,
      createdBy: params.createdBy,
      updatedBy: params.createdBy
    }).returning();

    // Step 6: Cascade goals from strategy to departments to individuals
    await this.cascadeGoals(cycle.id, strategy, structure);

    return cycle.id;
  }

  /**
   * Get culture priorities from latest culture assessment (DB query with freshness check)
   */
  private async getCulturePriorities(): Promise<any[]> {
    try {
      // Get latest culture assessment from database
      const latestAssessment = await db.query.cultureAssessments.findFirst({
        where: (assessments, { eq }) => eq(assessments.tenantId, this.tenantId),
        orderBy: (assessments, { desc }) => [desc(assessments.createdAt)]
      });

      if (!latestAssessment) {
        this.logger.warn('No culture assessment found for tenant', { tenantId: this.tenantId });
        return [];
      }

      // Check freshness (7 days)
      const assessmentAge = Date.now() - latestAssessment.createdAt.getTime();
      const freshnessThreshold = this.CULTURE_FRESHNESS_DAYS * 24 * 60 * 60 * 1000;
      const isFresh = assessmentAge < freshnessThreshold;

      if (!isFresh) {
        this.logger.warn('Culture assessment is stale', {
          tenantId: this.tenantId,
          assessmentAge: `${Math.floor(assessmentAge / (24 * 60 * 60 * 1000))} days`,
          threshold: `${this.CULTURE_FRESHNESS_DAYS} days`
        });
      } else {
        this.logger.info('Using fresh culture assessment', {
          tenantId: this.tenantId,
          assessmentAge: `${Math.floor(assessmentAge / (60 * 60 * 1000))} hours`
        });
      }

      // Extract priorities from assessment
      // Culture assessments store values in personalValues, currentExperience, desiredExperience
      const priorities = [
        ...(latestAssessment.personalValues as any[] || []),
        ...(latestAssessment.currentExperience as any[] || []),
        ...(latestAssessment.desiredExperience as any[] || [])
      ];

      return Array.isArray(priorities) ? priorities : [];
    } catch (error) {
      this.logger.error('Error getting culture priorities from DB:', error);
      return [];
    }
  }

  /**
   * Get learning needs from skills gap analysis (DB query with freshness check)
   */
  private async getLearningNeeds(): Promise<any[]> {
    try {
      // Get latest skills gap analysis from database
      const latestGapAnalysis = await db.query.skillsGapAnalysis.findFirst({
        where: (analysis, { eq }) => eq(analysis.tenantId, this.tenantId),
        orderBy: (analysis, { desc }) => [desc(analysis.createdAt)]
      });

      if (!latestGapAnalysis) {
        this.logger.warn('No skills gap analysis found for tenant', { tenantId: this.tenantId });
        return [];
      }

      // Check freshness (7 days - skills gaps change less frequently than structure)
      const analysisAge = Date.now() - latestGapAnalysis.createdAt.getTime();
      const freshnessThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days
      const isFresh = analysisAge < freshnessThreshold;

      if (!isFresh) {
        this.logger.warn('Skills gap analysis is stale', {
          tenantId: this.tenantId,
          analysisAge: `${Math.floor(analysisAge / (24 * 60 * 60 * 1000))} days`,
          threshold: '7 days'
        });
      } else {
        this.logger.info('Using fresh skills gap analysis', {
          tenantId: this.tenantId,
          analysisAge: `${Math.floor(analysisAge / (24 * 60 * 60 * 1000))} days`
        });
      }

      // Extract learning needs from gap analysis
      // Skills gap analysis has: criticalGaps, moderateGaps, trainingRecommendations, developmentPlan
      const learningNeeds = [
        ...(latestGapAnalysis.criticalGaps as any[] || []),
        ...(latestGapAnalysis.moderateGaps as any[] || []),
        ...(latestGapAnalysis.trainingRecommendations as any[] || [])
      ];

      return Array.isArray(learningNeeds) ? learningNeeds : [];
    } catch (error) {
      this.logger.error('Error getting learning needs from DB:', error);
      return [];
    }
  }

  /**
   * Get and understand company strategy
   */
  private async getStrategy(): Promise<any> {
    // Get strategy from database (stored during strategy session)
    const tenant = await db.query.tenants.findFirst({
      where: (tenants, { eq }) => eq(tenants.id, this.tenantId)
    });

    const strategyContext = {
      vision: tenant?.vision,
      mission: tenant?.mission,
      values: tenant?.values,
      strategicObjectives: [],
      keyInitiatives: []
    };

    // Use AI to analyze and extract actionable insights
    const response = await this.ensemble.call({
      agent: 'Performance',
      engine: 'reasoning',
      tenantId: this.tenantId,
      prompt: `Analyze the company strategy and extract actionable performance objectives:

      Strategy Context:
      ${JSON.stringify(strategyContext, null, 2)}

      For each strategic objective:
      1. Identify measurable outcomes
      2. Define success metrics
      3. Break down into departmental objectives
      4. Suggest timeline and milestones

      Return as structured JSON with clear goal definitions.`
    });

    try {
      const result = typeof response === 'string' ? response : (response as any).result || response;
      return JSON.parse(result || '{}');
    } catch {
      return strategyContext;
    }
  }

  /**
   * Get organizational structure from latest structure analysis (DB query with freshness check)
   */
  private async getStructure(): Promise<any> {
    try {
      // Get latest structure analysis from database
      const latestAnalysis = await db.query.structureAnalysisResults.findFirst({
        where: (results, { eq }) => eq(results.tenantId, this.tenantId),
        orderBy: (results, { desc }) => [desc(results.createdAt)]
      });

      if (!latestAnalysis) {
        this.logger.warn('No structure analysis found for tenant', { tenantId: this.tenantId });
        return { departments: [], hierarchy: {} };
      }

      // Check freshness (1 hour - structure changes frequently with hiring)
      const analysisAge = Date.now() - latestAnalysis.createdAt.getTime();
      const freshnessThreshold = this.STRUCTURE_FRESHNESS_HOURS * 60 * 60 * 1000;
      const isFresh = analysisAge < freshnessThreshold;

      if (!isFresh) {
        this.logger.warn('Structure analysis is stale - may not reflect recent hires', {
          tenantId: this.tenantId,
          analysisAge: `${Math.floor(analysisAge / (60 * 60 * 1000))} hours`,
          threshold: `${this.STRUCTURE_FRESHNESS_HOURS} hour(s)`,
          recommendation: 'Consider triggering structure re-analysis'
        });
      } else {
        this.logger.info('Using fresh structure analysis', {
          tenantId: this.tenantId,
          analysisAge: `${Math.floor(analysisAge / (60 * 1000))} minutes`
        });
      }

      // Extract structure data from analysis
      // Structure analysis stores data in 'results' field
      const analysisData = latestAnalysis.results as any;
      return {
        departments: analysisData?.departments || [],
        hierarchy: analysisData?.hierarchy || {},
        roles: analysisData?.roles || [],
        reportingLines: analysisData?.reportingLines || [],
        lastUpdated: latestAnalysis.createdAt,
        isFresh
      };
    } catch (error) {
      this.logger.error('Error getting structure from DB:', error);
      return { departments: [], hierarchy: {} };
    }
  }

  /**
   * Cascade goals from strategy to departments to individuals
   */
  private async cascadeGoals(
    cycleId: string,
    strategy: any,
    structure: any
  ): Promise<void> {
    const strategicObjectives = strategy.objectives || [];

    // Step 1: Create organizational-level goals from strategic objectives
    const orgGoals = await this.createOrganizationalGoals(cycleId, strategicObjectives);

    // Step 2: Cascade to department goals
    const departments = structure.departments || [];
    for (const dept of departments) {
      await this.createDepartmentGoals(cycleId, dept, orgGoals);
    }

    // Step 3: Individual goals will be created when cycle activates
    // (each employee will work with their manager to set goals aligned with department)
  }

  /**
   * Create organizational-level goals
   */
  private async createOrganizationalGoals(
    cycleId: string,
    objectives: any[]
  ): Promise<any[]> {
    const goals = [];

    for (const objective of objectives) {
      const [goal] = await db.insert(performanceGoals).values({
        tenantId: this.tenantId,
        employeeId: 'organization', // Special ID for org-level goals
        managerId: 'organization',
        title: objective.title,
        description: objective.description,
        type: 'organizational',
        category: objective.category || 'operational_excellence',
        goalFormat: 'okr',
        target: objective.keyResults || {},
        weight: objective.weight || 1.0,
        priority: objective.priority || 1,
        status: 'active',
        startDate: new Date(),
        targetDate: objective.targetDate || new Date(),
        metadata: {
          cycleId,
          strategicAlignment: objective.strategicAlignment || 'high',
          keyInitiatives: objective.keyInitiatives || []
        },
        createdBy: 'system',
        updatedBy: 'system'
      }).returning();

      goals.push(goal);
    }

    return goals;
  }

  /**
   * Create department-level goals aligned with organizational goals
   */
  private async createDepartmentGoals(
    cycleId: string,
    department: any,
    orgGoals: any[]
  ): Promise<void> {
    // Use AI to determine how department contributes to org goals
    const response = await this.ensemble.call({
      agent: 'Performance',
      engine: 'reasoning',
      tenantId: this.tenantId,
      prompt: `Create department-level goals for ${department.name} aligned with organizational objectives.

      Department: ${department.name}
      Department Function: ${department.function || 'N/A'}

      Organizational Goals:
      ${JSON.stringify(orgGoals.map(g => ({ title: g.title, target: g.target })), null, 2)}

      For each relevant organizational goal:
      1. Define how this department contributes
      2. Create specific, measurable department objectives
      3. Set realistic targets based on department capabilities
      4. Identify dependencies and required resources

      Return as structured JSON array of department goals.`
    });

    try {
      const result = typeof response === 'string' ? response : (response as any).result || response;
      const deptGoals = JSON.parse(result || '[]');

      for (const deptGoal of deptGoals) {
        const parentGoal = orgGoals.find(g => g.id === deptGoal.parentGoalId);

        await db.insert(performanceGoals).values({
          tenantId: this.tenantId,
          employeeId: department.leaderId || 'department',
          managerId: department.leaderId || 'department',
          title: deptGoal.title,
          description: deptGoal.description,
          type: 'team',
          category: deptGoal.category || 'operational_excellence',
          goalFormat: 'smart',
          target: deptGoal.target || {},
          weight: deptGoal.weight || 1.0,
          priority: deptGoal.priority || 1,
          status: 'active',
          parentGoalId: parentGoal?.id,
          startDate: new Date(),
          targetDate: deptGoal.targetDate || new Date(),
          metadata: {
            cycleId,
            departmentId: department.id,
            departmentName: department.name,
            alignment: 'organizational'
          },
          createdBy: 'system',
          updatedBy: 'system'
        });
      }
    } catch (error) {
      console.error('Error creating department goals:', error);
    }
  }

  /**
   * Create individual goals for an employee based on department goals
   */
  async createIndividualGoals(
    cycleId: string,
    employeeId: string,
    managerId: string,
    departmentId: string
  ): Promise<any[]> {
    // Get department goals
    const deptGoals = await db.query.performanceGoals.findMany({
      where: and(
        eq(performanceGoals.tenantId, this.tenantId),
        eq(performanceGoals.type, 'team')
      )
    });

    // Get employee information
    const employee = await db.query.employeeProfiles.findFirst({
      where: (profiles, { eq }) => eq(profiles.id, employeeId)
    });

    // Use AI to create personalized goals
    const response = await this.ensemble.call({
      agent: 'Performance',
      engine: 'reasoning',
      tenantId: this.tenantId,
      prompt: `Create individual performance goals for this employee aligned with department objectives.

      Employee: ${employee?.id}
      User ID: ${employee?.userId}

      Department Goals:
      ${JSON.stringify(deptGoals.map(g => ({ title: g.title, target: g.target })), null, 2)}

      Create 3-5 SMART goals that:
      1. Directly support department objectives
      2. Match the employee's role and capabilities
      3. Include stretch goals for development
      4. Are measurable and time-bound

      Return as structured JSON array.`
    });

    try {
      const result = typeof response === 'string' ? response : (response as any).result || response;
      const individualGoals = JSON.parse(result || '[]');
      const createdGoals = [];

      for (const goal of individualGoals) {
        const parentGoal = deptGoals.find(g => g.id === goal.parentGoalId);

        const [created] = await db.insert(performanceGoals).values({
          tenantId: this.tenantId,
          employeeId,
          managerId,
          title: goal.title,
          description: goal.description,
          type: 'individual',
          category: goal.category || 'productivity',
          goalFormat: 'smart',
          target: goal.target || {},
          weight: goal.weight || 1.0,
          priority: goal.priority || 1,
          status: 'draft',
          parentGoalId: parentGoal?.id,
          startDate: new Date(),
          targetDate: goal.targetDate || new Date(),
          metadata: {
            cycleId,
            departmentId,
            suggestedByAI: true
          },
          createdBy: managerId,
          updatedBy: managerId
        }).returning();

        createdGoals.push(created);
      }

      return createdGoals;
    } catch (error) {
      console.error('Error creating individual goals:', error);
      return [];
    }
  }

  /**
   * Activate a performance cycle
   */
  async activateCycle(cycleId: string): Promise<void> {
    await db.update(performanceCycles)
      .set({
        status: 'active',
        isActive: true,
        updatedAt: new Date()
      })
      .where(eq(performanceCycles.id, cycleId));

    // Get all employees for this tenant
    const allEmployees = await db.query.employeeProfiles.findMany({
      where: (profiles, { eq }) => eq(profiles.tenantId, this.tenantId)
    });

    // Create individual goals for each employee
    // Note: managerId and departmentId should come from metadata or be passed separately
    for (const employee of allEmployees) {
      const managerId = (employee.metadata as any)?.managerId || 'system';
      const departmentId = (employee.metadata as any)?.departmentId || 'unknown';

      await this.createIndividualGoals(
        cycleId,
        employee.id,
        managerId,
        departmentId
      );
    }
  }

  /**
   * Complete a performance cycle
   */
  async completeCycle(cycleId: string): Promise<void> {
    await db.update(performanceCycles)
      .set({
        status: 'completed',
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(performanceCycles.id, cycleId));

    // Archive all goals and reviews for this cycle
    await db.update(performanceGoals)
      .set({
        status: 'completed',
        updatedAt: new Date()
      })
      .where(and(
        eq(performanceGoals.tenantId, this.tenantId),
        eq(performanceGoals.metadata, { cycleId } as any)
      ));
  }

  /**
   * Get cycle status and analytics
   */
  async getCycleStatus(cycleId: string): Promise<any> {
    const cycle = await db.query.performanceCycles.findFirst({
      where: eq(performanceCycles.id, cycleId)
    });

    const goals = await db.query.performanceGoals.findMany({
      where: and(
        eq(performanceGoals.tenantId, this.tenantId),
        eq(performanceGoals.metadata, { cycleId } as any)
      )
    });

    const reviews = await db.query.performanceReviews.findMany({
      where: eq(performanceGoals.tenantId, this.tenantId)
    });

    const oneOnOnes = await db.query.oneOnOneMeetings.findMany({
      where: eq(oneOnOneMeetings.performanceCycleId, cycleId)
    });

    return {
      cycle,
      stats: {
        totalGoals: goals.length,
        completedGoals: goals.filter(g => g.status === 'completed').length,
        totalReviews: reviews.length,
        completedReviews: reviews.filter(r => r.status === 'completed').length,
        totalOneOnOnes: oneOnOnes.length,
        completedOneOnOnes: oneOnOnes.filter(m => m.status === 'completed').length,
        completionRate: cycle?.completionRate || 0
      }
    };
  }
}
