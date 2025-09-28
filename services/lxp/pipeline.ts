// server/services/lxp/pipeline.ts

import { db } from '../../db/index.js';
import { learningProgress, users, talentProfiles } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

export interface LxpPipelineRun {
  id: string;
  tenantId: string;
  employeeId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  modules: LearningModule[];
  progress: number;
  startedAt: Date;
  completedAt?: Date;
  results?: any;
}

export interface LearningModule {
  id: string;
  type: 'structure' | 'culture' | 'skills' | 'engagement' | 'recognition' | 'performance';
  title: string;
  description: string;
  duration: number; // in minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  prerequisites: string[];
  learningObjectives: string[];
  content: ModuleContent[];
  assessment: Assessment;
}

export interface ModuleContent {
  type: 'video' | 'article' | 'interactive' | 'case_study' | 'quiz';
    title: string;
  content: string;
  duration: number;
  order: number;
}

export interface Assessment {
  questions: AssessmentQuestion[];
  passingScore: number;
  attempts: number;
}

export interface AssessmentQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'open_ended';
  question: string;
  options?: string[];
  correctAnswer?: string;
  points: number;
}

export class LxpPipelineService {
  async buildLxpPipeline(tenantId: string, employeeId: string): Promise<LxpPipelineRun | null> {
    try {
      console.log(`Building LXP pipeline for employee ${employeeId} in tenant ${tenantId}`);
      
      // Get employee profile and current learning progress
      const employee = await db.query.users.findFirst({
        where: eq(users.id, employeeId)
      });
      
      if (!employee) {
        throw new Error('Employee not found');
      }
      
      // Get talent profile
      const talentProfile = await db.query.talentProfiles.findFirst({
        where: eq(talentProfiles.userId, employeeId)
      });
      
      // Get current learning progress
      const currentProgress = await db.query.learningProgress.findMany({
        where: and(
          eq(learningProgress.userId, employeeId),
          eq(learningProgress.tenantId, tenantId)
        )
      });
      
      // Determine learning needs based on role and current progress
      const learningNeeds = await this.assessLearningNeeds(employee, talentProfile, currentProgress);
      
      // Build personalized learning path
      const modules = await this.buildLearningPath(learningNeeds, employee.role);
      
      // Create pipeline run
      const pipelineRun: LxpPipelineRun = {
        id: randomUUID(),
    tenantId,
    employeeId,
        status: 'pending',
        modules,
        progress: 0,
        startedAt: new Date()
      };
      
      console.log(`LXP pipeline built with ${modules.length} modules`);
      
      return pipelineRun;
    } catch (error) {
      console.error('Failed to build LXP pipeline:', error);
      return null;
    }
  }

  async executeLxpPipeline(pipelineRun: LxpPipelineRun): Promise<void> {
    try {
      console.log(`Executing LXP pipeline ${pipelineRun.id}`);
      
      // Update status to running
      pipelineRun.status = 'running';
      
      // Process each module
      for (let i = 0; i < pipelineRun.modules.length; i++) {
        const module = pipelineRun.modules[i];
        
        try {
          // Start module
          await this.startModule(pipelineRun.employeeId, pipelineRun.tenantId, module);
          
          // Update progress
          pipelineRun.progress = ((i + 1) / pipelineRun.modules.length) * 100;
          
          // Simulate module completion (in real implementation, this would be triggered by user completion)
          await this.completeModule(pipelineRun.employeeId, pipelineRun.tenantId, module);
          
        } catch (error) {
          console.error(`Failed to process module ${module.id}:`, error);
          // Continue with next module
        }
      }
      
      // Mark pipeline as completed
      pipelineRun.status = 'completed';
      pipelineRun.completedAt = new Date();
      
      console.log(`LXP pipeline ${pipelineRun.id} completed successfully`);
      
    } catch (error) {
      console.error('Failed to execute LXP pipeline:', error);
      pipelineRun.status = 'failed';
    }
  }

  private async assessLearningNeeds(employee: any, talentProfile: any, currentProgress: any[]): Promise<string[]> {
    const needs: string[] = [];
    
    // Assess based on role
    if (employee.role === 'employee') {
      needs.push('basic_organizational_understanding');
      needs.push('communication_skills');
      needs.push('teamwork');
    } else if (employee.role === 'clientAdmin') {
      needs.push('leadership_skills');
      needs.push('strategic_thinking');
      needs.push('organizational_analysis');
    }
    
    // Assess based on current progress
    const completedModules = currentProgress.filter(p => p.status === 'completed');
    if (completedModules.length === 0) {
      needs.push('onboarding');
    }
    
    // Assess based on talent profile
    if (talentProfile) {
      if (talentProfile.potential === 'high') {
        needs.push('leadership_development');
        needs.push('strategic_planning');
      }
      
      if (talentProfile.readiness === 'developing') {
        needs.push('skill_development');
        needs.push('performance_improvement');
      }
    }
    
    return needs;
  }

  private async buildLearningPath(learningNeeds: string[], role: string): Promise<LearningModule[]> {
    const modules: LearningModule[] = [];
    
    // Define available modules
    const availableModules = this.getAvailableModules();
    
    // Select modules based on needs
    for (const need of learningNeeds) {
      const module = availableModules.find(m => m.id === need);
      if (module) {
        modules.push(module);
      }
    }
    
    // Add role-specific modules
    if (role === 'clientAdmin') {
      const adminModule = availableModules.find(m => m.id === 'admin_training');
      if (adminModule) {
        modules.push(adminModule);
      }
    }
    
    // Sort modules by difficulty and prerequisites
    return this.sortModules(modules);
  }

  private getAvailableModules(): LearningModule[] {
    return [
      {
        id: 'onboarding',
        type: 'structure',
        title: 'Organizational Onboarding',
        description: 'Introduction to organizational structure and culture',
        duration: 30,
        difficulty: 'beginner',
        prerequisites: [],
        learningObjectives: [
          'Understand organizational structure',
          'Learn about company culture',
          'Identify key stakeholders'
        ],
        content: [
          {
            type: 'video',
            title: 'Welcome to the Organization',
            content: 'Introduction video',
            duration: 10,
            order: 1
          },
          {
            type: 'article',
            title: 'Organizational Structure',
            content: 'Article about structure',
            duration: 15,
            order: 2
          },
          {
            type: 'quiz',
            title: 'Knowledge Check',
            content: 'Quiz questions',
            duration: 5,
            order: 3
          }
        ],
        assessment: {
          questions: [
            {
              id: 'q1',
              type: 'multiple_choice',
              question: 'What is the main purpose of organizational structure?',
              options: ['Efficiency', 'Control', 'Communication', 'All of the above'],
              correctAnswer: 'All of the above',
              points: 10
            }
          ],
          passingScore: 70,
          attempts: 3
        }
      },
      {
        id: 'basic_organizational_understanding',
        type: 'structure',
        title: 'Basic Organizational Understanding',
        description: 'Fundamentals of organizational design and structure',
        duration: 45,
        difficulty: 'beginner',
        prerequisites: ['onboarding'],
        learningObjectives: [
          'Understand organizational design principles',
          'Learn about different organizational structures',
          'Identify organizational roles and responsibilities'
        ],
        content: [
          {
            type: 'video',
            title: 'Organizational Design Principles',
            content: 'Video about design principles',
            duration: 20,
            order: 1
          },
          {
            type: 'interactive',
            title: 'Structure Explorer',
            content: 'Interactive structure exploration',
            duration: 20,
            order: 2
          },
          {
            type: 'quiz',
            title: 'Understanding Check',
            content: 'Quiz questions',
            duration: 5,
            order: 3
          }
        ],
        assessment: {
          questions: [
            {
              id: 'q1',
              type: 'multiple_choice',
              question: 'Which organizational structure is best for innovation?',
              options: ['Functional', 'Divisional', 'Matrix', 'Network'],
              correctAnswer: 'Matrix',
              points: 10
            }
          ],
          passingScore: 70,
          attempts: 3
        }
      },
      {
        id: 'leadership_skills',
        type: 'performance',
        title: 'Leadership Skills Development',
        description: 'Essential leadership skills for managers',
        duration: 60,
        difficulty: 'intermediate',
        prerequisites: ['basic_organizational_understanding'],
        learningObjectives: [
          'Develop leadership competencies',
          'Learn effective communication techniques',
          'Understand team management principles'
        ],
        content: [
          {
            type: 'video',
            title: 'Leadership Fundamentals',
            content: 'Video about leadership',
            duration: 25,
            order: 1
          },
          {
            type: 'case_study',
            title: 'Leadership Case Study',
            content: 'Case study analysis',
            duration: 25,
            order: 2
          },
          {
            type: 'quiz',
            title: 'Leadership Assessment',
            content: 'Quiz questions',
            duration: 10,
            order: 3
          }
        ],
        assessment: {
          questions: [
            {
              id: 'q1',
              type: 'multiple_choice',
              question: 'What is the most important leadership quality?',
              options: ['Vision', 'Communication', 'Empathy', 'All of the above'],
              correctAnswer: 'All of the above',
              points: 10
            }
          ],
          passingScore: 80,
          attempts: 2
        }
      }
    ];
  }

  private sortModules(modules: LearningModule[]): LearningModule[] {
    // Sort by difficulty and prerequisites
    return modules.sort((a, b) => {
      const difficultyOrder = { beginner: 0, intermediate: 1, advanced: 2 };
      const aDiff = difficultyOrder[a.difficulty];
      const bDiff = difficultyOrder[b.difficulty];
      
      if (aDiff !== bDiff) {
        return aDiff - bDiff;
      }
      
      return a.prerequisites.length - b.prerequisites.length;
    });
  }

  private async startModule(employeeId: string, tenantId: string, module: LearningModule): Promise<void> {
    try {
      // Create learning progress record
      await db.insert(learningProgress).values({
        id: randomUUID(),
        userId: employeeId,
        tenantId,
        moduleType: module.type,
        moduleId: module.id,
        status: 'in_progress',
        progress: 0,
        startedAt: new Date(),
        lastAccessedAt: new Date()
      });
      
      console.log(`Started module ${module.id} for employee ${employeeId}`);
    } catch (error) {
      console.error('Failed to start module:', error);
      throw error;
    }
  }

  private async completeModule(employeeId: string, tenantId: string, module: LearningModule): Promise<void> {
    try {
      // Update learning progress
      await db.update(learningProgress)
        .set({
          status: 'completed',
          progress: 100,
          completedAt: new Date(),
          lastAccessedAt: new Date()
        })
        .where(and(
          eq(learningProgress.userId, employeeId),
          eq(learningProgress.tenantId, tenantId),
          eq(learningProgress.moduleId, module.id)
        ));
      
      console.log(`Completed module ${module.id} for employee ${employeeId}`);
    } catch (error) {
      console.error('Failed to complete module:', error);
      throw error;
    }
  }
}

export const lxpPipelineService = new LxpPipelineService();

export function buildLxpPipeline(tenantId: string, employeeId: string): Promise<LxpPipelineRun | null> {
  return lxpPipelineService.buildLxpPipeline(tenantId, employeeId);
}

export function executeLxpPipeline(pipelineRun: LxpPipelineRun): Promise<void> {
  return lxpPipelineService.executeLxpPipeline(pipelineRun);
}