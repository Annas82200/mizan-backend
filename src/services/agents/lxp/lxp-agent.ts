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
import { ReasoningEngine, AnalysisResult } from '../../../ai/engines/ReasoningEngine';
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

// Trigger data structure for processor service
interface TriggerData {
  sourceModule?: string;
  targetModule?: string;
  triggerType?: string;
  tenantId?: string;
  type?: string;
  data: Record<string, unknown>;
  status?: string;
}

// AI-generated learning design structure
interface AILearningDesign {
  title: string;
  description: string;
  gameType: 'simulation' | 'problem_solving' | 'skill_practice' | 'collaboration' | 'leadership';
  strategicAlignment: StrategicGoal[];
}

// Behavior change record structure (from AI analysis)
interface BehaviorChangeRecord {
  description?: string;
  type?: string;
  category?: string;
  confidence?: number;
  impact?: string;
}

interface TriggerProcessorService {
  createTrigger(trigger: TriggerData): Promise<Record<string, unknown>>;
  updateTriggerStatus(id: string, status: string): Promise<void>;
}

interface BaseLearningAnalytics {
  totalLearners: number;
  activeLearners: number;
  completionRate: number;
  averageScore: number;
}

interface EmployeeLearningAnalytics extends BaseLearningAnalytics {
  myProgress: LearningProgress[];
  myAchievements: Achievement[];
}

interface SupervisorLearningAnalytics extends BaseLearningAnalytics {
  teamProgress: LearningProgress[];
  teamCompletionRate: number;
  teamAverageScore: number;
}

interface AdminLearningAnalytics extends BaseLearningAnalytics {
  departmentProgress: Record<string, LearningProgress[]>;
  skillsGapClosingRate: number;
}

interface SuperadminLearningAnalytics extends BaseLearningAnalytics {
  platformWideProgress: Record<string, LearningProgress[]>;
  platformAdoptionRate: number;
}

type LearningAnalytics = EmployeeLearningAnalytics | SupervisorLearningAnalytics | AdminLearningAnalytics | SuperadminLearningAnalytics;

interface TenantStrategy {
    vision: string;
    mission: string;
    strategicPillars: string[];
}

interface CultureShapingGoals {
    desiredBehaviors: string[];
    keyMetrics: string[];
}

interface EmployeeProfile {
    id: string;
    name: string;
    role: string;
    department: string;
    skills: Skill[];
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
      // ✅ PRODUCTION (Phase 4): Use Record<string, unknown> for flexible AI engine context
      // AI engine accepts flexible context structure
      const extendedContext: Record<string, unknown> = {
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
      const learningDesign = await this.reasoningEngine.analyze(processedData, extendedContext);

      // Create learning experience
      const learningExperience = await this.createLearningExperience(
        triggerData,
        learningDesign as unknown as AILearningDesign
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
    design: AILearningDesign
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
        await this.updateBehaviorChangeMetrics(learningExperienceId, employeeId, behaviorChanges as unknown as BehaviorChangeRecord[]);
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
  async getLearningAnalytics(tenantId: string, scope: 'employee' | 'supervisor' | 'admin' | 'superadmin'): Promise<LearningAnalytics> {
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
        gameType?: 'simulation' | 'problem_solving' | 'skill_practice' | 'collaboration' | 'leadership';
        levels?: LearningLevel[];
        scoringSystem?: ScoringConfig;
        behaviorTargets?: BehaviorMetric[];
        strategicAlignment?: StrategicGoal[];
      }> | null;

      // Map database status to LearningExperience status
      type LearningExpStatus = 'design' | 'active' | 'paused' | 'completed';
      let mappedStatus: LearningExpStatus = 'design';
      if (row.status === 'in_progress') mappedStatus = 'active';
      else if (row.status === 'completed') mappedStatus = 'completed';
      else if (row.status === 'paused' || row.status === 'cancelled' || row.status === 'withdrawn') mappedStatus = 'paused';

      return {
        id: row.learningExperienceId,
        tenantId: row.tenantId,
        employeeId: row.employeeId,
        title: design?.title || '',
        description: design?.description || '',
        gameType: design?.gameType || 'simulation',
        levels: design?.levels || [],
        scoringSystem: design?.scoringSystem || {} as ScoringConfig,
        behaviorChangeTargets: design?.behaviorTargets || [],
        strategicAlignment: design?.strategicAlignment || [],
        status: mappedStatus,
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

  private async getTenantStrategy(tenantId: string): Promise<TenantStrategy> {
    try {
      // Import tenants table dynamically to avoid circular dependencies
      const { tenants } = await import('../../../../db/schema/core');

      const [tenant] = await db.select({
        vision: tenants.vision,
        mission: tenants.mission,
        strategy: tenants.strategy,
        values: tenants.values
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

      if (!tenant) {
        return { vision: '', mission: '', strategicPillars: [] };
      }

      return {
        vision: tenant.vision || '',
        mission: tenant.mission || '',
        strategicPillars: (tenant.values as string[]) || []
      };
    } catch (error) {
      logger.error('Error getting tenant strategy:', error);
      return { vision: '', mission: '', strategicPillars: [] };
    }
  }

  private async getCultureShapingGoals(tenantId: string): Promise<CultureShapingGoals> {
    try {
      // Query culture assessments for desired behaviors and metrics
      const { cultureAssessments } = await import('../../../../db/schema/culture');

      const assessments = await db.select({
        desiredExperience: cultureAssessments.desiredExperience,
        personalValues: cultureAssessments.personalValues
      })
      .from(cultureAssessments)
      .where(eq(cultureAssessments.tenantId, tenantId))
      .orderBy(desc(cultureAssessments.createdAt))
      .limit(5); // Get recent assessments to aggregate

      if (assessments.length === 0) {
        return { desiredBehaviors: [], keyMetrics: [] };
      }

      // Extract desired behaviors from desiredExperience field
      const allDesiredBehaviors: string[] = [];
      const allValues: string[] = [];

      assessments.forEach(a => {
        if (a.desiredExperience) {
          const desired = a.desiredExperience as Record<string, unknown>;
          if (Array.isArray(desired.behaviors)) {
            allDesiredBehaviors.push(...(desired.behaviors as string[]));
          }
          if (typeof desired.description === 'string') {
            allDesiredBehaviors.push(desired.description);
          }
        }
        if (a.personalValues && Array.isArray(a.personalValues)) {
          allValues.push(...(a.personalValues as string[]));
        }
      });

      // Deduplicate and get unique behaviors
      const desiredBehaviors = [...new Set([...allDesiredBehaviors, ...allValues])].slice(0, 10);
      const keyMetrics = ['engagement', 'collaboration', 'innovation', 'alignment', 'recognition'];

      return { desiredBehaviors, keyMetrics };
    } catch (error) {
      logger.error('Error getting culture shaping goals:', error);
      return { desiredBehaviors: [], keyMetrics: [] };
    }
  }

  private async getEmployeeProfile(employeeId: string, tenantId: string): Promise<EmployeeProfile> {
    try {
      const { users, departments } = await import('../../../../db/schema/core');

      const [employee] = await db.select({
        id: users.id,
        name: users.name,
        role: users.role,
        departmentId: users.departmentId
      })
      .from(users)
      .where(and(
        eq(users.id, employeeId),
        eq(users.tenantId, tenantId)
      ))
      .limit(1);

      if (!employee) {
        return { id: employeeId, name: '', role: '', department: '', skills: [] };
      }

      // Get department name if departmentId exists
      let departmentName = '';
      if (employee.departmentId) {
        const [dept] = await db.select({ name: departments.name })
          .from(departments)
          .where(eq(departments.id, employee.departmentId))
          .limit(1);
        departmentName = dept?.name || '';
      }

      // Get employee skills from skills profiles if available
      let skills: Skill[] = [];
      try {
        const { employeeSkillsProfiles } = await import('../../../../db/schema/skills');
        const [profile] = await db.select({
          technicalSkills: employeeSkillsProfiles.technicalSkills,
          softSkills: employeeSkillsProfiles.softSkills,
          domainKnowledge: employeeSkillsProfiles.domainKnowledge,
          tools: employeeSkillsProfiles.tools
        })
          .from(employeeSkillsProfiles)
          .where(and(
            eq(employeeSkillsProfiles.employeeId, employeeId),
            eq(employeeSkillsProfiles.tenantId, tenantId)
          ))
          .limit(1);

        if (profile) {
          // Combine all skill categories into a single array
          const allSkills: Array<{ skill?: string; name?: string; proficiency?: number; level?: number }> = [];

          // Technical skills: Array of {skill, proficiency, yearsExperience}
          if (profile.technicalSkills && Array.isArray(profile.technicalSkills)) {
            allSkills.push(...(profile.technicalSkills as Array<{ skill: string; proficiency?: number }>));
          }

          // Soft skills: Array of soft skill names or objects
          if (profile.softSkills && Array.isArray(profile.softSkills)) {
            const softSkillsArr = profile.softSkills as Array<string | { name: string; level?: number }>;
            softSkillsArr.forEach(s => {
              if (typeof s === 'string') {
                allSkills.push({ name: s, level: 3 });
              } else {
                allSkills.push({ name: s.name, level: s.level });
              }
            });
          }

          // Domain knowledge: Industry/domain expertise
          if (profile.domainKnowledge && Array.isArray(profile.domainKnowledge)) {
            const domainArr = profile.domainKnowledge as Array<string | { name: string; level?: number }>;
            domainArr.forEach(d => {
              if (typeof d === 'string') {
                allSkills.push({ name: d, level: 3 });
              } else {
                allSkills.push({ name: d.name, level: d.level });
              }
            });
          }

          // Tools: Tools/software proficiency
          if (profile.tools && Array.isArray(profile.tools)) {
            const toolsArr = profile.tools as Array<string | { name: string; proficiency?: number }>;
            toolsArr.forEach(t => {
              if (typeof t === 'string') {
                allSkills.push({ name: t, level: 3 });
              } else {
                allSkills.push({ name: t.name, level: t.proficiency });
              }
            });
          }

          // Map to Skill format
          skills = allSkills.map(s => ({
            skillId: randomUUID(),
            skillName: s.skill || s.name || 'Unknown',
            level: s.proficiency || s.level || 1,
            validated: false
          }));
        }
      } catch {
        // Skills module might not be available
      }

      return {
        id: employee.id,
        name: employee.name,
        role: employee.role,
        department: departmentName,
        skills
      };
    } catch (error) {
      logger.error('Error getting employee profile:', error);
      return { id: employeeId, name: '', role: '', department: '', skills: [] };
    }
  }

  private async generateLearningLevels(design: AILearningDesign, skillsGaps: SkillGap[]): Promise<LearningLevel[]> {
    // Generate progressive learning levels based on skills gaps
    const levels: LearningLevel[] = [];

    // Sort skills gaps by urgency and strategic importance
    const sortedGaps = [...skillsGaps].sort((a, b) => {
      const urgencyOrder = { immediate: 0, short_term: 1, long_term: 2 };
      const importanceOrder = { high: 0, medium: 1, low: 2 };
      return (urgencyOrder[a.urgency] - urgencyOrder[b.urgency]) ||
             (importanceOrder[a.strategicImportance] - importanceOrder[b.strategicImportance]);
    });

    // Create levels based on gap size and complexity
    const difficulties: Array<'beginner' | 'intermediate' | 'advanced' | 'expert'> =
      ['beginner', 'intermediate', 'advanced', 'expert'];

    sortedGaps.forEach((gap, index) => {
      const levelNumber = index + 1;
      const difficulty = difficulties[Math.min(gap.gapSize - 1, 3)];
      const estimatedTime = 30 * gap.gapSize; // 30 mins per gap level

      levels.push({
        levelNumber,
        title: `${gap.skillName} Development - Level ${levelNumber}`,
        description: `Close the gap in ${gap.skillName} from level ${gap.currentLevel} to ${gap.requiredLevel}`,
        objectives: [
          `Understand ${gap.skillName} fundamentals`,
          `Apply ${gap.skillName} in practical scenarios`,
          `Demonstrate ${gap.skillName} proficiency at level ${gap.requiredLevel}`
        ],
        difficulty,
        requiredScore: 70 + (gap.gapSize * 5), // Higher gap = higher required score
        estimatedTime,
        content: {
          scenarios: [],
          exercises: [],
          simulations: [],
          challenges: []
        },
        assessments: [{
          id: randomUUID(),
          type: gap.gapSize > 2 ? 'project' : 'quiz',
          title: `${gap.skillName} Assessment`,
          description: `Assess your ${gap.skillName} proficiency`,
          passingScore: 70
        }]
      });
    });

    // Ensure at least one level exists
    if (levels.length === 0) {
      levels.push({
        levelNumber: 1,
        title: `${design.title} - Foundation`,
        description: design.description,
        objectives: ['Complete foundational learning', 'Apply basic concepts'],
        difficulty: 'beginner',
        requiredScore: 70,
        estimatedTime: 60,
        content: { scenarios: [], exercises: [], simulations: [], challenges: [] },
        assessments: [{
          id: randomUUID(),
          type: 'quiz',
          title: 'Foundation Assessment',
          description: 'Test your foundational knowledge',
          passingScore: 70
        }]
      });
    }

    return levels;
  }

  private createScoringSystem(_design: AILearningDesign): ScoringConfig {
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
    try {
      // Create a trigger to notify the employee about their new learning experience
      await this.triggerProcessor.createTrigger({
        sourceModule: 'lxp',
        targetModule: 'notifications',
        triggerType: 'learning_assigned',
        tenantId: learningExp.tenantId,
        data: {
          employeeId: learningExp.employeeId,
          learningExperienceId: learningExp.id,
          title: learningExp.title,
          description: learningExp.description,
          estimatedTime: learningExp.levels.reduce((total, level) => total + level.estimatedTime, 0),
          notificationType: 'employee',
          message: `You have been assigned a new learning experience: ${learningExp.title}`
        },
        status: 'pending'
      });
      logger.info(`Employee notification created for learning experience ${learningExp.id}`);
    } catch (error) {
      logger.error('Error creating employee notification:', error);
      // Non-critical error, don't throw
    }
  }

  private async createSupervisorNotification(learningExp: LearningExperience): Promise<void> {
    try {
      // Get employee's manager
      const { users } = await import('../../../../db/schema/core');
      const [employee] = await db.select({ managerId: users.managerId })
        .from(users)
        .where(eq(users.id, learningExp.employeeId))
        .limit(1);

      if (!employee?.managerId) {
        logger.debug('No supervisor found for employee, skipping notification');
        return;
      }

      // Create a trigger to notify the supervisor
      await this.triggerProcessor.createTrigger({
        sourceModule: 'lxp',
        targetModule: 'notifications',
        triggerType: 'learning_assigned_supervisor',
        tenantId: learningExp.tenantId,
        data: {
          supervisorId: employee.managerId,
          employeeId: learningExp.employeeId,
          learningExperienceId: learningExp.id,
          title: learningExp.title,
          notificationType: 'supervisor',
          message: `A team member has been assigned a learning experience: ${learningExp.title}`
        },
        status: 'pending'
      });
      logger.info(`Supervisor notification created for learning experience ${learningExp.id}`);
    } catch (error) {
      logger.error('Error creating supervisor notification:', error);
      // Non-critical error, don't throw
    }
  }

  private async initializeProgressTracking(learningExp: LearningExperience): Promise<void> {
    try {
      // Create initial progress event
      const { learningAnalytics } = await import('../../../../db/schema/lxp-extended');

      await db.insert(learningAnalytics).values({
        tenantId: learningExp.tenantId,
        employeeId: learningExp.employeeId,
        courseId: learningExp.id,
        eventType: 'started',
        eventData: {
          learningExperienceId: learningExp.id,
          title: learningExp.title,
          totalLevels: learningExp.levels.length,
          gameType: learningExp.gameType
        },
        engagementScore: '0',
        timestamp: new Date()
      });

      logger.info(`Progress tracking initialized for learning experience ${learningExp.id}`);
    } catch (error) {
      logger.error('Error initializing progress tracking:', error);
      // Non-critical error, don't throw
    }
  }

  private async saveProgressUpdate(progress: LearningProgress): Promise<void> {
    try {
      // Update the workflow table with new progress
      await db.update(lxpWorkflowTable)
        .set({
          currentLevel: progress.currentLevel,
          totalScore: progress.totalScore,
          completionPercentage: progress.completionPercentage,
          timeSpent: progress.timeSpent,
          lastActivity: progress.lastActivity,
          updatedAt: new Date()
        })
        .where(eq(lxpWorkflowTable.learningExperienceId, progress.learningExperienceId));

      // Also log a progress event
      const { learningAnalytics } = await import('../../../../db/schema/lxp-extended');
      await db.insert(learningAnalytics).values({
        tenantId: '', // Will be filled from workflow lookup if needed
        employeeId: progress.employeeId,
        courseId: progress.learningExperienceId,
        eventType: 'progress',
        eventData: {
          currentLevel: progress.currentLevel,
          totalScore: progress.totalScore,
          completionPercentage: progress.completionPercentage,
          timeSpent: progress.timeSpent
        },
        engagementScore: String(Math.min(100, progress.completionPercentage + (progress.totalScore / 10))),
        timestamp: new Date()
      });

      logger.info(`Progress saved for learning experience ${progress.learningExperienceId}`);
    } catch (error) {
      logger.error('Error saving progress update:', error);
      throw error;
    }
  }

  private async updateBehaviorChangeMetrics(
    learningExperienceId: string,
    employeeId: string,
    behaviorChanges: BehaviorChangeRecord[]
  ): Promise<void> {
    try {
      // Get the workflow ID for this learning experience
      const [workflow] = await db.select({ id: lxpWorkflowTable.id, tenantId: lxpWorkflowTable.tenantId })
        .from(lxpWorkflowTable)
        .where(eq(lxpWorkflowTable.learningExperienceId, learningExperienceId))
        .limit(1);

      if (!workflow) {
        logger.warn(`No workflow found for learning experience ${learningExperienceId}`);
        return;
      }

      // Insert behavior change records
      for (const change of behaviorChanges) {
        await db.insert(lxpBehaviorChangesTable).values({
          tenantId: workflow.tenantId,
          workflowId: workflow.id,
          employeeId,
          behaviorType: change.type || 'general',
          changeDescription: change.description,
          measurementMethod: 'ai_assessment',
          improvementPercentage: Math.round((change.confidence || 0.5) * 100),
          validated: false,
          metadata: { impact: change.impact, category: change.category },
          measuredAt: new Date()
        });
      }

      logger.info(`Behavior change metrics updated for ${behaviorChanges.length} behaviors`);
    } catch (error) {
      logger.error('Error updating behavior change metrics:', error);
      // Non-critical, don't throw
    }
  }

  private async generateLearningOutcome(
    learningExp: LearningExperience,
    progress: LearningProgress
  ): Promise<LearningOutcome> {
    try {
      // Generate outcome based on progress and learning experience design
      const skillsAcquired: Skill[] = [];
      const behaviorChanges: BehaviorChange[] = [];
      const performanceImpact: PerformanceMetric[] = [];

      // Map progress skills to outcome skills
      if (progress.skillsAcquired && progress.skillsAcquired.length > 0) {
        skillsAcquired.push(...progress.skillsAcquired);
      } else {
        // Generate skills from learning experience design if no progress skills
        learningExp.levels.forEach(level => {
          level.objectives.forEach((objective, idx) => {
            skillsAcquired.push({
              skillId: `${learningExp.id}-skill-${idx}`,
              skillName: objective,
              level: Math.ceil(progress.completionPercentage / 25), // 1-4 based on completion
              validated: progress.completionPercentage >= 100
            });
          });
        });
      }

      // Map progress behavior changes
      if (progress.behaviorChanges && progress.behaviorChanges.length > 0) {
        behaviorChanges.push(...progress.behaviorChanges);
      } else {
        // Generate behavior changes from targets
        learningExp.behaviorChangeTargets.forEach(target => {
          behaviorChanges.push({
            behaviorId: target.behaviorId,
            behaviorName: target.behaviorName,
            before: target.currentState,
            after: progress.completionPercentage >= 80 ? target.targetState : target.currentState,
            measuredImpact: Math.round(progress.completionPercentage * 0.8)
          });
        });
      }

      // Map performance impact
      if (progress.performanceImpact && progress.performanceImpact.length > 0) {
        performanceImpact.push(...progress.performanceImpact);
      }

      return {
        skillsAcquired,
        behaviorChanges,
        performanceImpact,
        validationStatus: 'pending'
      };
    } catch (error) {
      logger.error('Error generating learning outcome:', error);
      return {
        skillsAcquired: [],
        behaviorChanges: [],
        performanceImpact: [],
        validationStatus: 'pending'
      };
    }
  }

  private async validateLearningOutcome(outcome: LearningOutcome): Promise<LearningOutcome> {
    try {
      // Validate skills acquisition - check if minimum criteria met
      const validatedSkills = outcome.skillsAcquired.map(skill => ({
        ...skill,
        validated: skill.level >= 2 // Require at least level 2 for validation
      }));

      // Check if sufficient skills are validated
      const validSkillCount = validatedSkills.filter(s => s.validated).length;
      const validationThreshold = Math.ceil(outcome.skillsAcquired.length * 0.7); // 70% threshold

      const isValidated = validSkillCount >= validationThreshold;

      return {
        skillsAcquired: validatedSkills,
        behaviorChanges: outcome.behaviorChanges,
        performanceImpact: outcome.performanceImpact,
        validationStatus: isValidated ? 'validated' : 'not_validated',
        validationDate: new Date()
      };
    } catch (error) {
      logger.error('Error validating learning outcome:', error);
      return {
        ...outcome,
        validationStatus: 'not_validated'
      };
    }
  }

  private async getEmployeeLearningAnalytics(tenantId: string): Promise<EmployeeLearningAnalytics> {
    try {
      // Get all workflows for the tenant
      const workflows = await db.select()
        .from(lxpWorkflowTable)
        .where(eq(lxpWorkflowTable.tenantId, tenantId));

      const totalLearners = new Set(workflows.map(w => w.employeeId)).size;
      const activeLearners = new Set(
        workflows.filter(w => w.status === 'in_progress').map(w => w.employeeId)
      ).size;
      const completedCount = workflows.filter(w => w.status === 'completed').length;
      const completionRate = workflows.length > 0 ? Math.round((completedCount / workflows.length) * 100) : 0;
      const averageScore = workflows.length > 0
        ? Math.round(workflows.reduce((sum, w) => sum + (w.totalScore || 0), 0) / workflows.length)
        : 0;

      return {
        totalLearners,
        activeLearners,
        completionRate,
        averageScore,
        myProgress: [],
        myAchievements: []
      };
    } catch (error) {
      logger.error('Error getting employee learning analytics:', error);
      return { totalLearners: 0, activeLearners: 0, completionRate: 0, averageScore: 0, myProgress: [], myAchievements: [] };
    }
  }

  private async getSupervisorLearningAnalytics(tenantId: string): Promise<SupervisorLearningAnalytics> {
    try {
      const workflows = await db.select()
        .from(lxpWorkflowTable)
        .where(eq(lxpWorkflowTable.tenantId, tenantId));

      const totalLearners = new Set(workflows.map(w => w.employeeId)).size;
      const activeLearners = new Set(
        workflows.filter(w => w.status === 'in_progress').map(w => w.employeeId)
      ).size;
      const completedCount = workflows.filter(w => w.status === 'completed').length;
      const completionRate = workflows.length > 0 ? Math.round((completedCount / workflows.length) * 100) : 0;
      const averageScore = workflows.length > 0
        ? Math.round(workflows.reduce((sum, w) => sum + (w.totalScore || 0), 0) / workflows.length)
        : 0;

      return {
        totalLearners,
        activeLearners,
        completionRate,
        averageScore,
        teamProgress: [],
        teamCompletionRate: completionRate,
        teamAverageScore: averageScore
      };
    } catch (error) {
      logger.error('Error getting supervisor learning analytics:', error);
      return { totalLearners: 0, activeLearners: 0, completionRate: 0, averageScore: 0, teamProgress: [], teamCompletionRate: 0, teamAverageScore: 0 };
    }
  }

  private async getAdminLearningAnalytics(tenantId: string): Promise<AdminLearningAnalytics> {
    try {
      const workflows = await db.select()
        .from(lxpWorkflowTable)
        .where(eq(lxpWorkflowTable.tenantId, tenantId));

      // Get skills gap data
      const skillsAcquired = await db.select()
        .from(lxpSkillsAcquiredTable)
        .where(eq(lxpSkillsAcquiredTable.tenantId, tenantId));

      const totalLearners = new Set(workflows.map(w => w.employeeId)).size;
      const activeLearners = new Set(
        workflows.filter(w => w.status === 'in_progress').map(w => w.employeeId)
      ).size;
      const completedCount = workflows.filter(w => w.status === 'completed').length;
      const completionRate = workflows.length > 0 ? Math.round((completedCount / workflows.length) * 100) : 0;
      const averageScore = workflows.length > 0
        ? Math.round(workflows.reduce((sum, w) => sum + (w.totalScore || 0), 0) / workflows.length)
        : 0;

      // Calculate skills gap closing rate
      const validatedSkills = skillsAcquired.filter(s => s.validatedBy !== null).length;
      const skillsGapClosingRate = skillsAcquired.length > 0
        ? Math.round((validatedSkills / skillsAcquired.length) * 100)
        : 0;

      return {
        totalLearners,
        activeLearners,
        completionRate,
        averageScore,
        departmentProgress: {},
        skillsGapClosingRate
      };
    } catch (error) {
      logger.error('Error getting admin learning analytics:', error);
      return { totalLearners: 0, activeLearners: 0, completionRate: 0, averageScore: 0, departmentProgress: {}, skillsGapClosingRate: 0 };
    }
  }

  private async getSuperadminLearningAnalytics(): Promise<SuperadminLearningAnalytics> {
    try {
      // Get all workflows across all tenants (superadmin view)
      const workflows = await db.select().from(lxpWorkflowTable);

      const totalLearners = new Set(workflows.map(w => w.employeeId)).size;
      const activeLearners = new Set(
        workflows.filter(w => w.status === 'in_progress').map(w => w.employeeId)
      ).size;
      const completedCount = workflows.filter(w => w.status === 'completed').length;
      const completionRate = workflows.length > 0 ? Math.round((completedCount / workflows.length) * 100) : 0;
      const averageScore = workflows.length > 0
        ? Math.round(workflows.reduce((sum, w) => sum + (w.totalScore || 0), 0) / workflows.length)
        : 0;

      // Calculate platform adoption rate (active learners / total possible learners)
      const platformAdoptionRate = totalLearners > 0
        ? Math.round((activeLearners / totalLearners) * 100)
        : 0;

      return {
        totalLearners,
        activeLearners,
        completionRate,
        averageScore,
        platformWideProgress: {},
        platformAdoptionRate
      };
    } catch (error) {
      logger.error('Error getting superadmin learning analytics:', error);
      return { totalLearners: 0, activeLearners: 0, completionRate: 0, averageScore: 0, platformWideProgress: {}, platformAdoptionRate: 0 };
    }
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

interface VariableConstraints {
  min?: number;
  max?: number;
  allowedValues?: (string | number | boolean)[];
}

interface Variable {
  name: string;
  type: 'number' | 'boolean' | 'string';
  initialValue: string | number | boolean;
  constraints: VariableConstraints;
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