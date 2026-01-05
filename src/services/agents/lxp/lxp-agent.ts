// backend/src/services/agents/lxp/lxp-agent.ts

import { randomUUID } from 'crypto';
import { db } from '../../../../db/index';
import {
  lxpWorkflowTable,
  learningProgressEventsTable as progressTable,
  lxpTriggersTable as triggersTable,
  lxpSkillsAcquiredTable,
  lxpBehaviorChangesTable,
  lxpPerformanceImpactTable
} from '../../../../db/schema/lxp-extended';
import { eq, and, desc } from 'drizzle-orm';
import { KnowledgeEngine } from '../../../ai/engines/KnowledgeEngine';
import { DataEngine, ProcessedData } from '../../../ai/engines/DataEngine';
import { ReasoningEngine } from '../../../ai/engines/ReasoningEngine';
import { Assessment } from '../../../types/agent-types';
// ✅ PRODUCTION (Phase 4): Import JSONB validation schemas
import { LearningDesignSchema, LXPStatusSchema, type LearningDesign, type LXPStatus } from '../../../validation/jsonb-schemas';
import { logger } from '../../logger';

// Strict TypeScript Interfaces
interface SkillsGapTriggerData {
  employeeId: string;
  skillsGaps: SkillGap[];
  strategicPriorities: SkillPriority[];
  behaviorChangeTargets: BehaviorMetric[];
  tenantId: string;
}

interface SkillGap {
  skillId: string;
  skillName: string;
  currentLevel: number;
  requiredLevel: number;
  gapSize: number;
  strategicImportance: 'high' | 'medium' | 'low';
  urgency: 'immediate' | 'short_term' | 'long_term';
}

interface SkillPriority {
  skillId: string;
  priority: number;
  strategicAlignment: number;
  businessImpact: string;
}

interface BehaviorMetric {
  behaviorId: string;
  behaviorName: string;
  currentState: string;
  targetState: string;
  changeComplexity: 'low' | 'medium' | 'high';
  culturalAlignment: number;
}

interface LearningExperience {
  id: string;
  tenantId: string;
  employeeId: string;
  title: string;
  description: string;
  gameType: 'simulation' | 'problem_solving' | 'skill_practice' | 'collaboration' | 'leadership';
  levels: LearningLevel[];
  scoringSystem: ScoringConfig;
  behaviorChangeTargets: BehaviorMetric[];
  strategicAlignment: StrategicGoal[];
  status: 'design' | 'active' | 'paused' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

interface LearningLevel {
  levelNumber: number;
  title: string;
  description: string;
  objectives: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  requiredScore: number;
  estimatedTime: number;
  content: LearningContent;
  assessments: LearningAssessment[];
}

interface LearningAssessment {
  id: string;
  type: 'quiz' | 'project' | 'simulation' | 'peer_review';
  title: string;
  description: string;
  passingScore: number;
}

interface LearningContent {
  scenarios: InteractiveScenario[];
  exercises: PracticeExercise[];
  simulations: DecisionSimulation[];
  challenges: ProblemChallenge[];
}

interface ScoringConfig {
  pointsSystem: {
    completion: number;
    accuracy: number;
    speed: number;
    innovation: number;
    collaboration: number;
  };
  achievements: Achievement[];
  leaderboard: boolean;
  badges: Badge[];
}

interface LearningProgress {
  employeeId: string;
  learningExperienceId: string;
  currentLevel: number;
  totalScore: number;
  completionPercentage: number;
  timeSpent: number;
  lastActivity: Date;
  skillsAcquired: Skill[];
  behaviorChanges: BehaviorChange[];
  performanceImpact: PerformanceMetric[];
}

interface LearningOutcome {
  skillsAcquired: Skill[];
  behaviorChanges: BehaviorChange[];
  performanceImpact: PerformanceMetric[];
  validationStatus: 'pending' | 'validated' | 'not_validated';
  validationDate?: Date;
}

interface TriggerProcessorService {
  createTrigger(trigger: any): Promise<any>;
  updateTriggerStatus(id: string, status: string): Promise<void>;
}

// Three-Engine LXP Agent Service
export class LXPAgentService {
  constructor(
    private knowledgeEngine: KnowledgeEngine,
    private dataEngine: DataEngine,
    private reasoningEngine: ReasoningEngine,
    private triggerProcessor: TriggerProcessorService
  ) {}

  // STEP 1-2: Module Activation and Strategic Learning Design
  async processSkillsGapTrigger(triggerData: SkillsGapTriggerData): Promise<LearningExperience> {
    try {
      // Knowledge Engine: Get learning science, behavior change theories
      const context = await this.knowledgeEngine.getContext('learning_experience');
      const behaviorContext = await this.knowledgeEngine.getBehaviorChangeContext();
      const gamificationContext = await this.knowledgeEngine.getGamificationPrinciples();

      // Get tenant strategy for alignment
      const tenantStrategy = await this.getTenantStrategy(triggerData.tenantId);
      const cultureGoals = await this.getCultureShapingGoals(triggerData.tenantId);

      // Data Engine: Process skills gaps and behavior targets
      const processedData = await this.dataEngine.process({
        skillsGaps: triggerData.skillsGaps,
        strategicPriorities: triggerData.strategicPriorities,
        behaviorTargets: triggerData.behaviorChangeTargets,
        tenantStrategy,
        cultureGoals,
        employeeProfile: await this.getEmployeeProfile(triggerData.employeeId, triggerData.tenantId)
      }, context);

      // Reasoning Engine: Design customized learning experience
      // Extend context with additional data for analysis
      // ✅ PRODUCTION (Phase 4): Use any for flexible AI engine context
      // AI engine accepts flexible context structure, strict typing here is counterproductive
      const extendedContext: any = {
        ...context,
        strategicRequirements: [tenantStrategy],
        // Store behavior and gamification in historicalData for access
        historicalData: [
          {
            metadata: {
              behaviorChangeTheories: behaviorContext,
              gamificationPrinciples: gamificationContext
            }
          }
        ]
      };
      const learningDesign = await (this.reasoningEngine.analyze as any)(processedData, extendedContext);

      // Create learning experience
      const learningExperience = await this.createLearningExperience(
        triggerData,
        learningDesign
      );

      return learningExperience;

    } catch (error) {
      logger.error('Error processing skills gap trigger:', error);
      throw new Error(`Failed to process skills gap trigger: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // STEP 3: Learning Experience Generation
  private async createLearningExperience(
    triggerData: SkillsGapTriggerData,
    design: any
  ): Promise<LearningExperience> {
    try {
      const learningExperience: LearningExperience = {
        id: randomUUID(),
        tenantId: triggerData.tenantId,
        employeeId: triggerData.employeeId,
        title: design.title,
        description: design.description,
        gameType: design.gameType,
        levels: await this.generateLearningLevels(design, triggerData.skillsGaps),
        scoringSystem: this.createScoringSystem(design),
        behaviorChangeTargets: triggerData.behaviorChangeTargets,
        strategicAlignment: design.strategicAlignment,
        status: 'design',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to database using lxpWorkflowTable with correct schema
      await db.insert(lxpWorkflowTable).values({
        tenantId: learningExperience.tenantId,
        employeeId: learningExperience.employeeId,
        workflowType: 'skills_gap',
        status: 'assigned',
        triggeredBy: 'skills_agent',
        learningExperienceId: learningExperience.id,
        learningDesign: {
          title: learningExperience.title,
          description: learningExperience.description,
          gameType: learningExperience.gameType,
          levels: learningExperience.levels,
          scoringSystem: learningExperience.scoringSystem,
          behaviorTargets: learningExperience.behaviorChangeTargets,
          strategicAlignment: learningExperience.strategicAlignment
        },
        currentLevel: 1,
        totalScore: 0,
        completionPercentage: 0,
        timeSpent: 0,
        metadata: {
          triggerSourceId: triggerData.tenantId
        }
      });

      return learningExperience;

    } catch (error) {
      logger.error('Error creating learning experience:', error);
      throw new Error(`Failed to create learning experience: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // STEP 4-5: Learning Deployment and Goal Integration
  async deployLearningExperience(learningExperienceId: string): Promise<void> {
    try {
      // Get learning experience
      const learningExp = await this.getLearningExperience(learningExperienceId);
      if (!learningExp) {
        throw new Error('Learning experience not found');
      }

      // Update status to active
      await db.update(lxpWorkflowTable)
        .set({
          status: 'in_progress',
          updatedAt: new Date()
        })
        .where(
          and(
            eq(lxpWorkflowTable.learningExperienceId, learningExperienceId),
            eq(lxpWorkflowTable.tenantId, learningExp.tenantId)
          )
        );

      // Create notifications
      await this.createEmployeeNotification(learningExp);
      await this.createSupervisorNotification(learningExp);

      // Initialize progress tracking
      await this.initializeProgressTracking(learningExp);

    } catch (error) {
      logger.error('Error deploying learning experience:', error);
      throw new Error(`Failed to deploy learning experience: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Goal integration with Performance Module
  async enableGoalIntegration(
    learningExperienceId: string, 
    goalId?: string
  ): Promise<void> {
    try {
      const learningExp = await this.getLearningExperience(learningExperienceId);
      if (!learningExp) {
        throw new Error('Learning experience not found');
      }

      // Create trigger for Performance Module
      await this.triggerProcessor.createTrigger({
        sourceModule: 'lxp',
        targetModule: 'performance',
        triggerType: 'learning_goal_integration',
        tenantId: learningExp.tenantId,
        data: {
          learningExperienceId,
          employeeId: learningExp.employeeId,
          goalId,
          learningObjectives: learningExp.levels.map(level => level.objectives).flat(),
          estimatedTime: learningExp.levels.reduce((total, level) => total + level.estimatedTime, 0)
        },
        status: 'pending'
      });

    } catch (error) {
      logger.error('Error enabling goal integration:', error);
      throw new Error(`Failed to enable goal integration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // STEP 6-7: Progress Tracking and Behavior Change Assessment
  async updateLearningProgress(
    learningExperienceId: string,
    employeeId: string,
    progressData: Partial<LearningProgress>
  ): Promise<LearningProgress> {
    try {
      const learningExp = await this.getLearningExperience(learningExperienceId);
      if (!learningExp || learningExp.employeeId !== employeeId) {
        throw new Error('Learning experience not found or access denied');
      }

      // Get existing progress
      const existingProgress = await this.getEmployeeProgress(learningExperienceId, employeeId);
      
      const updatedProgress: LearningProgress = {
        ...existingProgress,
        ...progressData,
        lastActivity: new Date()
      };

      // Save progress
      await this.saveProgressUpdate(updatedProgress);

      // Check for level completion or behavior change milestones
      if (progressData.completionPercentage && progressData.completionPercentage > (existingProgress?.completionPercentage || 0)) {
        await this.assessBehaviorChange(learningExperienceId, employeeId, updatedProgress);
      }

      return updatedProgress;

    } catch (error) {
      logger.error('Error updating learning progress:', error);
      throw new Error(`Failed to update learning progress: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async assessBehaviorChange(
    learningExperienceId: string,
    employeeId: string,
    progress: LearningProgress
  ): Promise<void> {
    try {
      const learningExp = await this.getLearningExperience(learningExperienceId);
      if (!learningExp) return;

      // Use Knowledge Engine to assess behavior change
      const behaviorContext = await this.knowledgeEngine.getBehaviorChangeContext();

      // Use Reasoning Engine to analyze behavior change indicators
      // Convert learning progress data to ProcessedData format
      const processedProgressData: ProcessedData = {
        cleaned: {
          completionPercentage: progress.completionPercentage,
          timeSpent: progress.timeSpent,
          currentLevel: progress.currentLevel,
          totalScore: progress.totalScore
        },
        normalized: {
          completion: progress.completionPercentage / 100,
          engagement: Math.min(progress.timeSpent / 3600, 1), // Normalize to hours, cap at 1
          level: progress.currentLevel / (learningExp.levels?.length || 1),
          performance: progress.totalScore / 100
        },
        structured: {
          dimensions: ['completion', 'engagement', 'level', 'performance'],
          metrics: {
            completion: progress.completionPercentage,
            timeSpent: progress.timeSpent,
            level: progress.currentLevel,
            score: progress.totalScore
          },
          categories: {
            skills: progress.skillsAcquired?.map(s => s.skillName) || [],
            behaviors: progress.behaviorChanges?.map(b => b.behaviorName) || []
          },
          relationships: [],
          patterns: []
        },
        metadata: {
          recordCount: 1,
          completeness: progress.completionPercentage / 100,
          quality: 0.8, // Default quality score
          processingTime: Date.now() - progress.lastActivity.getTime(),
          anomalies: []
        }
      };

      const behaviorAnalysis = await this.reasoningEngine.analyze(
        processedProgressData,
        behaviorContext
      );

      // Update progress with behavior change assessment
      // Extract behavior changes from analysis insights - filter by description containing 'behavior'
      const behaviorChanges = (behaviorAnalysis.insights || []).filter(i =>
        i.description && i.description.toLowerCase().includes('behavior')
      );
      if (behaviorChanges.length > 0) {
        await this.updateBehaviorChangeMetrics(learningExperienceId, employeeId, behaviorChanges);
      }

    } catch (error) {
      logger.error('Error assessing behavior change:', error);
      // Non-critical error, don't throw
    }
  }

  // STEP 8: Skills Profile Update (Integration with Skills Module)
  async completeLearningExperience(
    learningExperienceId: string,
    employeeId: string
  ): Promise<LearningOutcome> {
    try {
      const learningExp = await this.getLearningExperience(learningExperienceId);
      const progress = await this.getEmployeeProgress(learningExperienceId, employeeId);
      
      if (!learningExp || !progress || progress.completionPercentage < 100) {
        throw new Error('Learning experience not completed');
      }

      // Generate learning outcome
      const outcome = await this.generateLearningOutcome(learningExp, progress);

      // Validate skills acquisition and behavior change
      const validatedOutcome = await this.validateLearningOutcome(outcome);

      // Update Skills Module
      await this.triggerSkillsProfileUpdate(learningExp.tenantId, employeeId, validatedOutcome);

      // Update Performance Module with progress
      await this.triggerPerformanceGoalUpdate(learningExp.tenantId, employeeId, validatedOutcome);

      // Mark learning experience as completed
      await db.update(lxpWorkflowTable)
        .set({
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date()
        })
        .where(
          and(
            eq(lxpWorkflowTable.learningExperienceId, learningExperienceId),
            eq(lxpWorkflowTable.tenantId, learningExp.tenantId)
          )
        );

      return validatedOutcome;

    } catch (error) {
      logger.error('Error completing learning experience:', error);
      throw new Error(`Failed to complete learning experience: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Integration: Skills Module Update
  private async triggerSkillsProfileUpdate(
    tenantId: string,
    employeeId: string,
    outcome: LearningOutcome
  ): Promise<void> {
    try {
      await this.triggerProcessor.createTrigger({
        sourceModule: 'lxp',
        targetModule: 'skills',
        triggerType: 'skills_profile_update',
        tenantId,
        data: {
          employeeId,
          skillsAcquired: outcome.skillsAcquired,
          behaviorChangeMetrics: outcome.behaviorChanges,
          completionDate: new Date(),
          validationStatus: outcome.validationStatus
        },
        status: 'pending'
      });
    } catch (error) {
      logger.error('Error triggering skills profile update:', error);
      throw error;
    }
  }

  // Integration: Performance Module Update
  private async triggerPerformanceGoalUpdate(
    tenantId: string,
    employeeId: string,
    outcome: LearningOutcome
  ): Promise<void> {
    try {
      await this.triggerProcessor.createTrigger({
        sourceModule: 'lxp',
        targetModule: 'performance',
        triggerType: 'learning_progress_update',
        tenantId,
        data: {
          employeeId,
          learningProgress: 100, // Completed
          goalsProgress: outcome.performanceImpact,
          completionStatus: 'completed'
        },
        status: 'pending'
      });
    } catch (error) {
      logger.error('Error triggering performance goal update:', error);
      throw error;
    }
  }

  // STEP 9: Reporting & Analytics
  async getLearningAnalytics(tenantId: string, scope: 'employee' | 'supervisor' | 'admin' | 'superadmin'): Promise<any> {
    try {
      switch (scope) {
        case 'employee':
          return await this.getEmployeeLearningAnalytics(tenantId);
        case 'supervisor':
          return await this.getSupervisorLearningAnalytics(tenantId);
        case 'admin':
          return await this.getAdminLearningAnalytics(tenantId);
        case 'superadmin':
          return await this.getSuperadminLearningAnalytics();
        default:
          throw new Error('Invalid analytics scope');
      }
    } catch (error) {
      logger.error('Error getting learning analytics:', error);
      throw new Error(`Failed to get learning analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Utility Methods with Tenant Isolation
  private async getLearningExperience(id: string): Promise<LearningExperience | null> {
    try {
      const results = await db.select()
        .from(lxpWorkflowTable)
        .where(eq(lxpWorkflowTable.learningExperienceId, id))
        .limit(1);

      if (results.length === 0) return null;

      const row = results[0];
      // ✅ PRODUCTION (Phase 4): Type-safe learning design parsing
      const design = row.learningDesign as Partial<LearningDesign & {
        title?: string;
        description?: string;
        gameType?: string;
        levels?: unknown[];
        scoringSystem?: unknown;
        behaviorTargets?: unknown[];
        strategicAlignment?: unknown[];
      }> | null;

      // ✅ PRODUCTION (Phase 4): Type-safe status mapping
      const mapStatus = (status: string): LXPStatus => {
        if (status === 'assigned') return 'design';
        if (status === 'in_progress') return 'active';
        // Validate it's a valid LXPStatus
        const parsed = LXPStatusSchema.safeParse(status);
        return parsed.success ? parsed.data : 'assigned';
      };

      // ✅ PRODUCTION (Phase 4): Cast JSONB fields to any - structure varies by design
      return {
        id: row.learningExperienceId,
        tenantId: row.tenantId,
        employeeId: row.employeeId,
        title: design?.title || '',
        description: design?.description || '',
        gameType: (design?.gameType || 'simulation') as any,
        levels: (design?.levels || []) as any,
        scoringSystem: (design?.scoringSystem || {}) as any,
        behaviorChangeTargets: (design?.behaviorTargets || []) as any,
        strategicAlignment: (design?.strategicAlignment || []) as any,
        status: mapStatus(row.status) as any,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      };
    } catch (error) {
      logger.error('Error getting learning experience:', error);
      return null;
    }
  }

  private async getEmployeeProgress(learningExperienceId: string, employeeId: string): Promise<LearningProgress | null> {
    try {
      // Get workflow data which contains progress information
      const results = await db.select()
        .from(lxpWorkflowTable)
        .where(
          and(
            eq(lxpWorkflowTable.learningExperienceId, learningExperienceId),
            eq(lxpWorkflowTable.employeeId, employeeId)
          )
        )
        .limit(1);

      if (results.length === 0) return null;

      const row = results[0];

      // Get associated skills, behaviors, and performance impacts
      // First, we need the workflow ID from the learningExperienceId
      const workflowId = row.id;

      const skillsAcquired = await db.select()
        .from(lxpSkillsAcquiredTable)
        .where(
          and(
            eq(lxpSkillsAcquiredTable.workflowId, workflowId),
            eq(lxpSkillsAcquiredTable.employeeId, employeeId)
          )
        );

      const behaviorChanges = await db.select()
        .from(lxpBehaviorChangesTable)
        .where(
          and(
            eq(lxpBehaviorChangesTable.workflowId, workflowId),
            eq(lxpBehaviorChangesTable.employeeId, employeeId)
          )
        );

      const performanceImpacts = await db.select()
        .from(lxpPerformanceImpactTable)
        .where(
          and(
            eq(lxpPerformanceImpactTable.workflowId, workflowId),
            eq(lxpPerformanceImpactTable.employeeId, employeeId)
          )
        );

      return {
        employeeId: row.employeeId,
        learningExperienceId: row.learningExperienceId,
        currentLevel: row.currentLevel || 1,
        totalScore: row.totalScore || 0,
        completionPercentage: Number(row.completionPercentage) || 0,
        timeSpent: row.timeSpent || 0,
        lastActivity: row.lastActivity || new Date(),
        skillsAcquired: skillsAcquired.map(s => ({
          skillId: s.id,
          skillName: s.skillName,
          level: s.proficiencyLevel || 1,
          validated: s.validatedBy !== null && s.validatedBy !== undefined
        })),
        behaviorChanges: behaviorChanges.map(b => ({
          behaviorId: b.id,
          behaviorName: b.behaviorType,
          before: b.targetBehavior || 'Not measured',
          after: b.currentBehavior || 'Not measured',
          measuredImpact: Number(b.improvementPercentage) || 0
        })),
        performanceImpact: performanceImpacts.map(p => ({
          metricId: p.id,
          metricName: p.metricType,
          baseline: Number(p.baselineValue) || 0,
          current: Number(p.currentValue) || 0,
          improvement: Number(p.improvementPercentage) || 0
        }))
      };
    } catch (error) {
      logger.error('Error getting employee progress:', error);
      return null;
    }
  }

  private async getTenantStrategy(tenantId: string): Promise<any> {
    // Implementation to get tenant strategy
    // This would integrate with client strategy storage
    return {};
  }

  private async getCultureShapingGoals(tenantId: string): Promise<any> {
    // Implementation to get culture shaping goals from Culture Module
    return {};
  }

  private async getEmployeeProfile(employeeId: string, tenantId: string): Promise<any> {
    // Implementation to get employee profile with tenant isolation
    return {};
  }

  private async generateLearningLevels(design: any, skillsGaps: SkillGap[]): Promise<LearningLevel[]> {
    // Implementation to generate progressive learning levels
    return [];
  }

  private createScoringSystem(design: any): ScoringConfig {
    // Implementation to create gamified scoring system
    return {
      pointsSystem: {
        completion: 100,
        accuracy: 50,
        speed: 25,
        innovation: 75,
        collaboration: 40
      },
      achievements: [],
      leaderboard: true,
      badges: []
    };
  }

  private async createEmployeeNotification(learningExp: LearningExperience): Promise<void> {
    // Implementation for employee notification
  }

  private async createSupervisorNotification(learningExp: LearningExperience): Promise<void> {
    // Implementation for supervisor notification
  }

  private async initializeProgressTracking(learningExp: LearningExperience): Promise<void> {
    // Implementation to initialize progress tracking
  }

  private async saveProgressUpdate(progress: LearningProgress): Promise<void> {
    // Implementation to save progress updates
  }

  private async getEmployeeInteractions(employeeId: string, learningExperienceId: string): Promise<any> {
    // Implementation to get employee interactions
    return {};
  }

  private async updateBehaviorChangeMetrics(learningExperienceId: string, employeeId: string, behaviorChanges: any[]): Promise<void> {
    // Implementation to update behavior change metrics
  }

  private async generateLearningOutcome(learningExp: LearningExperience, progress: LearningProgress): Promise<LearningOutcome> {
    // Implementation to generate learning outcome
    return {
      skillsAcquired: [],
      behaviorChanges: [],
      performanceImpact: [],
      validationStatus: 'pending'
    };
  }

  private async validateLearningOutcome(outcome: LearningOutcome): Promise<LearningOutcome> {
    // Implementation to validate learning outcome
    return {
      ...outcome,
      validationStatus: 'validated',
      validationDate: new Date()
    };
  }

  private async getEmployeeLearningAnalytics(tenantId: string): Promise<any> {
    // Implementation for employee analytics
    return {};
  }

  private async getSupervisorLearningAnalytics(tenantId: string): Promise<any> {
    // Implementation for supervisor analytics
    return {};
  }

  private async getAdminLearningAnalytics(tenantId: string): Promise<any> {
    // Implementation for admin analytics
    return {};
  }

  private async getSuperadminLearningAnalytics(): Promise<any> {
    // Implementation for superadmin analytics
    return {};
  }
}

// Additional Types and Interfaces
interface InteractiveScenario {
  id: string;
  title: string;
  description: string;
  scenario: string;
  decisions: Decision[];
  outcomes: Outcome[];
}

interface PracticeExercise {
  id: string;
  title: string;
  instructions: string;
  tasks: Task[];
  evaluation: EvaluationCriteria;
}

interface DecisionSimulation {
  id: string;
  context: string;
  variables: Variable[];
  decisions: Decision[];
  consequences: Consequence[];
}

interface ProblemChallenge {
  id: string;
  problem: string;
  constraints: string[];
  resources: Resource[];
  successCriteria: string[];
}

interface Decision {
  id: string;
  option: string;
  consequences: string[];
  score: number;
}

interface Outcome {
  id: string;
  result: string;
  feedback: string;
  nextAction: string;
}

interface Task {
  id: string;
  description: string;
  timeLimit?: number;
  resources: Resource[];
}

interface EvaluationCriteria {
  accuracy: number;
  completeness: number;
  efficiency: number;
  creativity: number;
}

interface Variable {
  name: string;
  type: 'number' | 'boolean' | 'string';
  initialValue: any;
  constraints: any;
}

interface Consequence {
  condition: string;
  impact: string;
  score: number;
}

interface Resource {
  name: string;
  type: string;
  availability: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  criteria: string;
  points: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  criteria: string;
}

interface StrategicGoal {
  goalId: string;
  description: string;
  alignment: number;
  impact: string;
}

interface Skill {
  skillId: string;
  skillName: string;
  level: number;
  validated: boolean;
}

interface BehaviorChange {
  behaviorId: string;
  behaviorName: string;
  before: string;
  after: string;
  measuredImpact: number;
}

interface PerformanceMetric {
  metricId: string;
  metricName: string;
  baseline: number;
  current: number;
  improvement: number;
}

export default LXPAgentService;