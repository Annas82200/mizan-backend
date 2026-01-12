// backend/src/routes/lxp.ts

import express from 'express';
import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { validationMiddleware } from '../middleware/validation';
import { handleApiRequest } from '../utils/apiHandler';
import { lxpService } from '../services/lxpService';
import { learningPathService } from '../services/lxp/learningPathService';
import { courseService } from '../services/lxp/courseService';
import { progressService } from '../services/lxp/progressService';
import { recommendationService } from '../services/lxp/recommendationService';
import { db } from '../db/connection';
import { 
  lxpWorkflowTable, 
  learningPathsTable, 
  coursesTable, 
  learningProgressTable,
  learningRecommendationsTable,
  triggersTable 
} from '../db/schema/lxp';

const router = express.Router();

// Apply authentication and tenant middleware to all routes
router.use(authMiddleware);
router.use(tenantMiddleware);

// ========================================
// VALIDATION SCHEMAS
// ========================================

const createLearningExperienceSchema = z.object({
  employeeId: z.string().uuid(),
  skillsGaps: z.array(z.object({
    skillId: z.string(),
    skillName: z.string(),
    currentLevel: z.number().min(1).max(5),
    targetLevel: z.number().min(1).max(5),
    priority: z.enum(['critical', 'high', 'medium', 'low']),
    behaviorChangeTargets: z.array(z.string())
  })),
  strategicPriorities: z.array(z.string()),
  triggerSource: z.enum(['skills_gap', 'performance_goal', 'talent_development']),
  triggerData: z.record(z.any()).optional()
});

const updateProgressSchema = z.object({
  learningExperienceId: z.string().uuid(),
  employeeId: z.string().uuid(),
  currentLevel: z.number().min(1),
  totalScore: z.number().min(0),
  completionPercentage: z.number().min(0).max(100),
  timeSpent: z.number().min(0),
  skillsAcquired: z.array(z.object({
    skillId: z.string(),
    skillName: z.string(),
    acquisitionLevel: z.number().min(1).max(5),
    validationStatus: z.enum(['pending', 'validated', 'not_validated'])
  })).optional(),
  behaviorChangeMetrics: z.array(z.object({
    metricId: z.string(),
    metricName: z.string(),
    beforeValue: z.number(),
    afterValue: z.number(),
    changePercentage: z.number()
  })).optional()
});

const integrationGoalSchema = z.object({
  learningExperienceId: z.string().uuid(),
  employeeId: z.string().uuid(),
  performanceGoalId: z.string().uuid().optional(),
  supervisorId: z.string().uuid().optional(),
  goalWeight: z.number().min(0).max(100).optional(),
  integrate: z.boolean()
});

const completionSchema = z.object({
  learningExperienceId: z.string().uuid(),
  employeeId: z.string().uuid(),
  completionDate: z.string().datetime(),
  finalScore: z.number().min(0),
  skillsAcquired: z.array(z.object({
    skillId: z.string(),
    skillName: z.string(),
    acquisitionLevel: z.number().min(1).max(5)
  })),
  behaviorChanges: z.array(z.object({
    behaviorId: z.string(),
    behaviorName: z.string(),
    changeLevel: z.enum(['significant', 'moderate', 'minimal', 'none'])
  })),
  performanceImpact: z.array(z.object({
    metricName: z.string(),
    beforeValue: z.number(),
    afterValue: z.number(),
    impactPercentage: z.number()
  }))
});

// ========================================
// TRIGGER PROCESSING ROUTES
// ========================================

/**
 * POST /api/lxp/triggers/skills-gap
 * Process trigger from Skills Module when skills gap is detected
 */
router.post('/triggers/skills-gap', 
  validationMiddleware(createLearningExperienceSchema),
  async (req, res) => {
    await handleApiRequest(async () => {
      const { employeeId, skillsGaps, strategicPriorities, triggerData } = req.body;
      const { tenantId, userId } = req.user;

      // Validate employee belongs to tenant
      const employeeExists = await lxpService.validateEmployeeAccess(employeeId, tenantId);
      if (!employeeExists) {
        return res.status(403).json({ error: 'Employee access denied' });
      }

      // Create learning experience based on skills gaps
      const learningExperience = await lxpService.createLearningExperience({
        tenantId,
        employeeId,
        triggeredBy: 'skills_gap',
        skillsGaps,
        strategicPriorities,
        triggerData
      });

      // Create personalized learning path
      const learningPath = await learningPathService.generatePersonalizedPath({
        learningExperienceId: learningExperience.id,
        employeeId,
        skillsGaps,
        strategicPriorities,
        tenantId
      });

      // Generate gamified learning experience
      const gameDesign = await lxpService.generateGameDesign({
        skillsGaps,
        behaviorChangeTargets: skillsGaps.flatMap(gap => gap.behaviorChangeTargets),
        strategicAlignment: strategicPriorities,
        employeeProfile: await lxpService.getEmployeeProfile(employeeId, tenantId)
      });

      // Send notification to employee and supervisor
      await lxpService.sendLearningAssignmentNotifications({
        employeeId,
        learningExperienceId: learningExperience.id,
        supervisorId: await lxpService.getSupervisorId(employeeId, tenantId),
        tenantId
      });

      res.status(201).json({
        success: true,
        data: {
          learningExperienceId: learningExperience.id,
          learningPathId: learningPath.id,
          gameDesign,
          status: 'assigned'
        }
      });
    }, 'Create learning experience from skills gap');
  }
);

/**
 * POST /api/lxp/triggers/performance-goal
 * Process trigger from Performance Module for goal integration
 */
router.post('/triggers/performance-goal',
  validationMiddleware(integrationGoalSchema),
  async (req, res) => {
    await handleApiRequest(async () => {
      const { learningExperienceId, employeeId, performanceGoalId, supervisorId, goalWeight, integrate } = req.body;
      const { tenantId } = req.user;

      // Validate access
      const accessValid = await lxpService.validateLearningExperienceAccess(learningExperienceId, employeeId, tenantId);
      if (!accessValid) {
        return res.status(403).json({ error: 'Learning experience access denied' });
      }

      if (integrate) {
        // Integrate learning experience into performance goal
        const integration = await lxpService.integrateWithPerformanceGoal({
          learningExperienceId,
          employeeId,
          performanceGoalId,
          supervisorId,
          goalWeight,
          tenantId
        });

        res.json({
          success: true,
          data: {
            integrationId: integration.id,
            status: 'integrated',
            goalWeight,
            trackingEnabled: true
          }
        });
      } else {
        // Remove integration
        await lxpService.removePerformanceGoalIntegration(learningExperienceId, tenantId);
        
        res.json({
          success: true,
          data: {
            status: 'integration_removed'
          }
        });
      }
    }, 'Process performance goal integration');
  }
);

/**
 * POST /api/lxp/triggers/talent-development
 * Process trigger from Talent Module for development plans
 */
router.post('/triggers/talent-development',
  validationMiddleware(z.object({
    employeeId: z.string().uuid(),
    developmentPlanId: z.string().uuid(),
    learningPriorities: z.array(z.string()),
    developmentNeeds: z.array(z.object({
      category: z.string(),
      priority: z.enum(['critical', 'high', 'medium', 'low']),
      targetLevel: z.number().min(1).max(5),
      timelineRequirements: z.string()
    })),
    timelineRequirements: z.string()
  })),
  async (req, res) => {
    await handleApiRequest(async () => {
      const { employeeId, developmentPlanId, learningPriorities, developmentNeeds, timelineRequirements } = req.body;
      const { tenantId } = req.user;

      // Create learning experience for talent development
      const learningExperience = await lxpService.createLearningExperience({
        tenantId,
        employeeId,
        triggeredBy: 'talent_development',
        developmentPlanId,
        learningPriorities,
        developmentNeeds,
        timelineRequirements
      });

      // Generate specialized development path for high-potential employees
      const developmentPath = await learningPathService.generateTalentDevelopmentPath({
        learningExperienceId: learningExperience.id,
        employeeId,
        developmentNeeds,
        learningPriorities,
        timeline: timelineRequirements,
        tenantId
      });

      res.status(201).json({
        success: true,
        data: {
          learningExperienceId: learningExperience.id,
          developmentPathId: developmentPath.id,
          estimatedCompletion: developmentPath.estimatedCompletion
        }
      });
    }, 'Create talent development learning experience');
  }
);

// ========================================
// LEARNING EXPERIENCE MANAGEMENT
// ========================================

/**
 * GET /api/lxp/experiences
 * Get all learning experiences for tenant (Admin/Superadmin)
 */
router.get('/experiences', async (req, res) => {
  await handleApiRequest(async () => {
    const { tenantId, role } = req.user;
    
    // Check admin permissions
    if (!['admin', 'superadmin'].includes(role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const experiences = await db.select()
      .from(lxpWorkflowTable)
      .where(eq(lxpWorkflowTable.tenantId, tenantId))
      .orderBy(desc(lxpWorkflowTable.createdAt));

    res.json({
      success: true,
      data: experiences
    });
  }, 'Get all learning experiences');
});

/**
 * GET /api/lxp/experiences/employee/:employeeId
 * Get learning experiences for specific employee
 */
router.get('/experiences/employee/:employeeId', async (req, res) => {
  await handleApiRequest(async () => {
    const { employeeId } = req.params;
    const { tenantId, userId, role } = req.user;

    // Validate access - employee can see own, supervisors can see direct reports, admins can see all
    const accessValid = await lxpService.validateEmployeeAccess(employeeId, tenantId, userId, role);
    if (!accessValid) {
      return res.status(403).json({ error: 'Employee access denied' });
    }

    const experiences = await db.select()
      .from(lxpWorkflowTable)
      .where(
        and(
          eq(lxpWorkflowTable.tenantId, tenantId),
          eq(lxpWorkflowTable.employeeId, employeeId)
        )
      )
      .orderBy(desc(lxpWorkflowTable.createdAt));

    res.json({
      success: true,
      data: experiences
    });
  }, 'Get employee learning experiences');
});

/**
 * GET /api/lxp/experiences/:experienceId
 * Get specific learning experience details
 */
router.get('/experiences/:experienceId', async (req, res) => {
  await handleApiRequest(async () => {
    const { experienceId } = req.params;
    const { tenantId, userId, role } = req.user;

    // Get learning experience with access validation
    const experience = await lxpService.getLearningExperienceWithAccess(experienceId, tenantId, userId, role);
    if (!experience) {
      return res.status(404).json({ error: 'Learning experience not found' });
    }

    // Get related learning paths and progress
    const [learningPaths, progress, recommendations] = await Promise.all([
      learningPathService.getPathsByExperience(experienceId, tenantId),
      progressService.getProgressByExperience(experienceId, tenantId),
      recommendationService.getRecommendationsByExperience(experienceId, tenantId)
    ]);

    res.json({
      success: true,
      data: {
        experience,
        learningPaths,
        progress,
        recommendations
      }
    });
  }, 'Get learning experience details');
});

/**
 * PUT /api/lxp/experiences/:experienceId/progress
 * Update learning progress
 */
router.put('/experiences/:experienceId/progress',
  validationMiddleware(updateProgressSchema),
  async (req, res) => {
    await handleApiRequest(async () => {
      const { experienceId } = req.params;
      const { employeeId, currentLevel, totalScore, completionPercentage, timeSpent, skillsAcquired, behaviorChangeMetrics } = req.body;
      const { tenantId, userId } = req.user;

      // Validate employee can update this experience
      const canUpdate = await lxpService.validateUpdateAccess(experienceId, employeeId, tenantId, userId);
      if (!canUpdate) {
        return res.status(403).json({ error: 'Update access denied' });
      }

      // Update progress
      const updatedProgress = await progressService.updateProgress({
        learningExperienceId: experienceId,
        employeeId,
        currentLevel,
        totalScore,
        completionPercentage,
        timeSpent,
        skillsAcquired,
        behaviorChangeMetrics,
        tenantId
      });

      // If performance goal integration exists, update goal progress
      const integration = await lxpService.getPerformanceGoalIntegration(experienceId, tenantId);
      if (integration) {
        await lxpService.updatePerformanceGoalProgress({
          performanceGoalId: integration.performanceGoalId,
          learningProgress: completionPercentage,
          employeeId,
          tenantId
        });
      }

      // Check for completion and trigger callbacks if needed
      if (completionPercentage === 100) {
        await lxpService.handleLearningCompletion({
          learningExperienceId: experienceId,
          employeeId,
          skillsAcquired: skillsAcquired || [],
          behaviorChangeMetrics: behaviorChangeMetrics || [],
          tenantId
        });
      }

      res.json({
        success: true,
        data: updatedProgress
      });
    }, 'Update learning progress');
  }
);

/**
 * POST /api/lxp/experiences/:experienceId/complete
 * Mark learning experience as completed
 */
router.post('/experiences/:experienceId/complete',
  validationMiddleware(completionSchema),
  async (req, res) => {
    await handleApiRequest(async () => {
      const { experienceId } = req.params;
      const { employeeId, completionDate, finalScore, skillsAcquired, behaviorChanges, performanceImpact } = req.body;
      const { tenantId, userId } = req.user;

      // Validate completion access
      const canComplete = await lxpService.validateUpdateAccess(experienceId, employeeId, tenantId, userId);
      if (!canComplete) {
        return res.status(403).json({ error: 'Completion access denied' });
      }

      // Complete learning experience
      const completion = await lxpService.completeLearningExperience({
        learningExperienceId: experienceId,
        employeeId,
        completionDate: new Date(completionDate),
        finalScore,
        skillsAcquired,
        behaviorChanges,
        performanceImpact,
        tenantId
      });

      // Update Skills Module with acquired skills
      await lxpService.updateSkillsModuleProfile({
        employeeId,
        skillsAcquired,
        behaviorChangeMetrics: behaviorChanges.map(change => ({
          behaviorId: change.behaviorId,
          behaviorName: change.behaviorName,
          changeLevel: change.changeLevel,
          completionDate: new Date(completionDate)
        })),
        tenantId
      });

      // Update Performance Module goal progress if integrated
      const integration = await lxpService.getPerformanceGoalIntegration(experienceId, tenantId);
      if (integration) {
        await lxpService.updatePerformanceGoalProgress({
          performanceGoalId: integration.performanceGoalId,
          learningProgress: 100,
          completionStatus: 'completed',
          employeeId,
          tenantId
        });
      }

      res.json({
        success: true,
        data: completion
      });
    }, 'Complete learning experience');
  }
);

// ========================================
// LEARNING PATHS MANAGEMENT
// ========================================

/**
 * GET /api/lxp/learning-paths/employee/:employeeId
 * Get learning paths for employee
 */
router.get('/learning-paths/employee/:employeeId', async (req, res) => {
  await handleApiRequest(async () => {
    const { employeeId } = req.params;
    const { tenantId, userId, role } = req.user;

    // Validate access
    const accessValid = await lxpService.validateEmployeeAccess(employeeId, tenantId, userId, role);
    if (!accessValid) {
      return res.status(403).json({ error: 'Employee access denied' });
    }

    const learningPaths = await learningPathService.getPathsByEmployee(employeeId, tenantId);

    res.json({
      success: true,
      data: learningPaths
    });
  }, 'Get employee learning paths');
});

/**
 * GET /api/lxp/learning-paths/:pathId
 * Get specific learning path details
 */
router.get('/learning-paths/:pathId', async (req, res) => {
  await handleApiRequest(async () => {
    const { pathId } = req.params;
    const { tenantId, userId, role } = req.user;

    const learningPath = await learningPathService.getPathWithAccess(pathId, tenantId, userId, role);
    if (!learningPath) {
      return res.status(404).json({ error: 'Learning path not found' });
    }

    // Get courses and progress for this path
    const [courses, progress] = await Promise.all([
      courseService.getCoursesByPath(pathId, tenantId),
      progressService.getProgressByPath(pathId, tenantId)
    ]);

    res.json({
      success: true,
      data: {
        learningPath,
        courses,
        progress
      }
    });
  }, 'Get learning path details');
});

// ========================================
// COURSES MANAGEMENT
// ========================================

/**
 * GET /api/lxp/courses
 * Get available courses for tenant
 */
router.get('/courses', async (req, res) => {
  await handleApiRequest(async () => {
    const { tenantId } = req.user;
    const { category, difficulty, search } = req.query;

    const courses = await courseService.getCourses({
      tenantId,
      category: category as string,
      difficulty: difficulty as string,
      search: search as string
    });

    res.json({
      success: true,
      data: courses
    });
  }, 'Get available courses');
});

/**
 * GET /api/lxp/courses/:courseId
 * Get specific course details
 */
router.get('/courses/:courseId', async (req, res) => {
  await handleApiRequest(async () => {
    const { courseId } = req.params;
    const { tenantId, userId, role } = req.user;

    const course = await courseService.getCourseWithAccess(courseId, tenantId, userId, role);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json({
      success: true,
      data: course
    });
  }, 'Get course details');
});

// ========================================
// RECOMMENDATIONS
// ========================================

/**
 * GET /api/lxp/recommendations/employee/:employeeId
 * Get learning recommendations for employee
 */
router.get('/recommendations/employee/:employeeId', async (req, res) => {
  await handleApiRequest(async () => {
    const { employeeId } = req.params;
    const { tenantId, userId, role } = req.user;

    // Validate access
    const accessValid = await lxpService.validateEmployeeAccess(employeeId, tenantId, userId, role);
    if (!accessValid) {
      return res.status(403).json({ error: 'Employee access denied' });
    }

    const recommendations = await recommendationService.generateRecommendations({
      employeeId,
      tenantId,
      includeStrategicPriorities: true,
      includeBehaviorTargets: true
    });

    res.json({
      success: true,
      data: recommendations
    });
  }, 'Get learning recommendations');
});

// ========================================
// ANALYTICS & REPORTING
// ========================================

/**
 * GET /api/lxp/analytics/tenant
 * Get tenant-wide LXP analytics (Admin/Superadmin only)
 */
router.get('/analytics/tenant', async (req, res) => {
  await handleApiRequest(async () => {
    const { tenantId, role } = req.user;

    if (!['admin', 'superadmin'].includes(role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const analytics = await lxpService.getTenantAnalytics(tenantId);

    res.json({
      success: true,
      data: analytics
    });
  }, 'Get tenant LXP analytics');
});

/**
 * GET /api/lxp/analytics/employee/:employeeId
 * Get employee-specific LXP analytics
 */
router.get('/analytics/employee/:employeeId', async (req, res) => {
  await handleApiRequest(async () => {
    const { employeeId } = req.params;
    const { tenantId, userId, role } = req.user;

    // Validate access
    const accessValid = await lxpService.validateEmployeeAccess(employeeId, tenantId, userId, role);
    if (!accessValid) {
      return res.status(403).json({ error: 'Employee access denied' });
    }

    const analytics = await lxpService.getEmployeeAnalytics(employeeId, tenantId);

    res.json({
      success: true,
      data: analytics
    });
  }, 'Get employee LXP analytics');
});

// ========================================
// DASHBOARD DATA
// ========================================

/**
 * GET /api/lxp/dashboard/employee/:employeeId
 * Get employee dashboard data
 */
router.get('/dashboard/employee/:employeeId', async (req, res) => {
  await handleApiRequest(async () => {
    const { employeeId } = req.params;
    const { tenantId, userId, role } = req.user;

    // Validate access - employee can see own data, supervisors can see reports, admins can see all
    const accessValid = await lxpService.validateEmployeeAccess(employeeId, tenantId, userId, role);
    if (!accessValid) {
      return res.status(403).json({ error: 'Employee access denied' });
    }

    const [experiences, progress, recommendations, achievements] = await Promise.all([
      lxpService.getActiveExperiences(employeeId, tenantId),
      progressService.getOverallProgress(employeeId, tenantId),
      recommendationService.getActiveRecommendations(employeeId, tenantId),
      lxpService.getAchievements(employeeId, tenantId)
    ]);

    res.json({
      success: true,
      data: {
        activeExperiences: experiences,
        overallProgress: progress,
        recommendations,
        achievements,
        nextActions: await lxpService.getNextActions(employeeId, tenantId)
      }
    });
  }, 'Get employee LXP dashboard data');
});

/**
 * GET /api/lxp/dashboard/supervisor/:supervisorId
 * Get supervisor dashboard data
 */
router.get('/dashboard/supervisor/:supervisorId', async (req, res) => {
  await handleApiRequest(async () => {
    const { supervisorId } = req.params;
    const { tenantId, userId, role } = req.user;

    // Validate supervisor access
    const isSupervisor = await lxpService.validateSupervisorAccess(supervisorId, tenantId, userId, role);
    if (!isSupervisor) {
      return res.status(403).json({ error: 'Supervisor access denied' });
    }

    const [teamProgress, completionRates, skillsGapClosure, goalIntegrations] = await Promise.all([
      lxpService.getTeamProgress(supervisorId, tenantId),
      lxpService.getTeamCompletionRates(supervisorId, tenantId),
      lxpService.getSkillsGapClosure(supervisorId, tenantId),
      lxpService.getGoalIntegrations(supervisorId, tenantId)
    ]);

    res.json({
      success: true,
      data: {
        teamProgress,
        completionRates,
        skillsGapClosure,
        goalIntegrations,
        teamAnalytics: await lxpService.getTeamAnalytics(supervisorId, tenantId)
      }
    });
  }, 'Get supervisor LXP dashboard data');
});

/**
 * GET /api/lxp/dashboard/admin
 * Get admin dashboard data
 */
router.get('/dashboard/admin', async (req, res) => {
  await handleApiRequest(async () => {
    const { tenantId, role } = req.user;

    if (!['admin', 'superadmin'].includes(role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const [learningEffectiveness, skillsGapClosure, behaviorChangeMetrics, roiAnalytics] = await Promise.all([
      lxpService.getLearningEffectivenessMetrics(tenantId),
      lxpService.getSkillsGapClosureMetrics(tenantId),
      lxpService.getBehaviorChangeMetrics(tenantId),
      lxpService.getROIAnalytics(tenantId)
    ]);

    res.json({
      success: true,
      data: {
        learningEffectiveness,
        skillsGapClosure,
        behaviorChangeMetrics,
        roiAnalytics,
        tenantOverview: await lxpService.getTenantOverview(tenantId)
      }
    });
  }, 'Get admin LXP dashboard data');
});

// ========================================
// TRIGGER STATUS & PROCESSING
// ========================================

/**
 * GET /api/lxp/triggers/pending
 * Get pending LXP triggers (for processing)
 */
router.get('/triggers/pending', async (req, res) => {
  await handleApiRequest(async () => {
    const { tenantId, role } = req.user;

    if (!['admin', 'superadmin'].includes(role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const pendingTriggers = await db.select()
      .from(triggersTable)
      .where(
        and(
          eq(triggersTable.tenantId, tenantId),
          eq(triggersTable.targetModule, 'lxp'),
          eq(triggersTable.status, 'pending')
        )
      )
      .orderBy(desc(triggersTable.createdAt));

    res.json({
      success: true,
      data: pendingTriggers
    });
  }, 'Get pending LXP triggers');
});

/**
 * POST /api/lxp/triggers/:triggerId/process
 * Process a specific trigger
 */
router.post('/triggers/:triggerId/process', async (req, res) => {
  await handleApiRequest(async () => {
    const { triggerId } = req.params;
    const { tenantId, role } = req.user;

    if (!['admin', 'superadmin'].includes(role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Process the trigger
    const result = await lxpService.processTrigger(triggerId, tenantId);

    res.json({
      success: true,
      data: result
    });
  }, 'Process LXP trigger');
});

export default router;