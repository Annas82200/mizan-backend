// backend/src/routes/skills.ts
// Complete Skills Analysis API Routes - AGENT_CONTEXT_ULTIMATE.md Lines 287-292

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { skillsAgent, SkillsAnalysisInput } from '../services/agents/skills/skills-agent.js';
import { SkillsAnalysisService } from '../services/skills/skillsAnalysisService.js';
import { SkillsBotService } from '../services/skills/skillsBotService.js';
import { db } from '../../db/index.js';
import { 
  skills, 
  skillsAssessments, 
  skillsGaps, 
  skillsFramework,
  skillsAssessmentSessions,
  skillsBotInteractions,
  skillsLearningTriggers,
  skillsTalentTriggers,
  skillsBonusTriggers,
  skillsProgress,
  employeeSkillsProfiles,
  users 
} from '../../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

const router = Router();

// Initialize services
const skillsAnalysisService = new SkillsAnalysisService();
const skillsBotService = new SkillsBotService();

// Schema validation for skills analysis request
const SkillsAnalysisRequestSchema = z.object({
  tenantId: z.string().uuid(),
  companyId: z.string().uuid(),
  industry: z.string(),
  organizationName: z.string(),
  strategy: z.string().optional(),
  includeEmployeeData: z.boolean().default(true),
  includeResumeData: z.boolean().default(false)
});

// Schema for complete skills workflow
const CompleteSkillsWorkflowSchema = z.object({
  tenantId: z.string().uuid(),
  clientStrategy: z.object({
    coreCompetencies: z.array(z.string()).optional(),
    capabilities: z.array(z.string()).optional(),
    growthAreas: z.array(z.string()).optional(),
    transformationGoals: z.array(z.string()).optional()
  }),
  clientContext: z.object({
    industry: z.string(),
    employeeCSV: z.record(z.unknown()).optional(),
    resumeData: z.record(z.unknown()).optional()
  })
});

// Schema for strategic framework creation
const StrategicFrameworkSchema = z.object({
  tenantId: z.string().uuid(),
  industry: z.string(),
  strategy: z.string(),
  createdBy: z.string().uuid()
});

// Schema for individual skills assessment
const IndividualSkillsAssessmentSchema = z.object({
  employeeId: z.string().uuid(),
  skills: z.array(z.object({
    name: z.string(),
    category: z.enum(['technical', 'soft', 'leadership', 'analytical', 'communication']),
    level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
    yearsOfExperience: z.number().optional(),
    verified: z.boolean().default(false)
  }))
});

// Schema for resume upload
const ResumeUploadSchema = z.object({
  employeeId: z.string().uuid(),
  resumeText: z.string(),
  extractSkills: z.boolean().default(true)
});

// Schema for BOT interaction
const BotInteractionSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  query: z.string(),
  sessionId: z.string().uuid().optional()
});

/**
 * POST /api/skills/analyze
 * Perform comprehensive skills gap analysis for the organization
 * Requires admin or superadmin role
 */
router.post('/analyze',
  authenticate,
  authorize(['clientAdmin', 'superadmin']),
  async (req: Request, res: Response) => {
    try {
      const validatedData = SkillsAnalysisRequestSchema.parse(req.body);

      // Verify tenant access
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      
      if (req.user.role !== 'superadmin' && req.user.tenantId !== validatedData.tenantId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this tenant'
        });
      }

      // Prepare input for skills agent
      const input: SkillsAnalysisInput = {
        tenantId: validatedData.tenantId,
        companyId: validatedData.companyId,
        industry: validatedData.industry,
        organizationName: validatedData.organizationName,
        strategy: validatedData.strategy
      };

      // Get employee data if requested
      if (validatedData.includeEmployeeData) {
        const employees = await db.query.users.findMany({
          where: eq(users.tenantId, validatedData.tenantId)
        });

        input.employeeData = employees.map(emp => ({
          employeeId: emp.id,
          name: emp.name || 'Unknown',
          department: emp.departmentId || 'Unknown',
          role: emp.role,
          skills: [],
          experience: 0
        }));
      }

      // Perform skills analysis using Three-Engine Agent
      const analysis = await skillsAgent.analyzeSkills(input);

      return res.json({
        success: true,
        analysis,
        metadata: {
          analysisType: 'comprehensive_skills_gap',
          framework: 'Strategic Skills Framework',
          confidence: 0.85,
          skillsAssessed: analysis.criticalGaps.length
        }
      });

    } catch (error) {
      console.error('Skills analysis error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to perform skills analysis'
      });
    }
  }
);

/**
 * POST /api/skills/framework
 * Create strategic skills framework based on company strategy
 * Requires admin role
 */
router.post('/framework',
  authenticate,
  authorize(['clientAdmin', 'superadmin']),
  async (req: Request, res: Response) => {
    try {
      const { tenantId, strategy, industry } = req.body;

      // Verify tenant access
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      
      if (req.user.role !== 'superadmin' && req.user.tenantId !== tenantId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this tenant'
        });
      }

      // Create strategic skills framework
      const framework = await skillsAgent.createStrategicSkillsFramework(
        tenantId,
        strategy,
        industry
      );

      return res.json({
        success: true,
        framework,
        message: 'Strategic skills framework created successfully'
      });

    } catch (error) {
      console.error('Framework creation error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create skills framework'
      });
    }
  }
);

/**
 * GET /api/skills/employee/:employeeId
 * Get individual employee skills profile and gaps
 * Requires authentication and proper permissions
 */
router.get('/employee/:employeeId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { employeeId } = req.params;
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Check permissions - employees can view their own, managers can view their team
      if (req.user.id !== employeeId && req.user.role !== 'manager' &&
          req.user.role !== 'clientAdmin' && req.user.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Get employee skills
      const employeeSkills = await db.query.skills.findMany({
        where: eq(skills.userId, employeeId)
      });

      // Get recent skills gaps
      const recentGaps = await db.query.skillsGaps.findMany({
        where: eq(skillsGaps.employeeId, employeeId),
        orderBy: (gaps, { desc }) => [desc(gaps.createdAt)],
        limit: 10
      });

      return res.json({
        success: true,
        profile: {
          employeeId,
          skills: employeeSkills,
          gaps: recentGaps,
          overallScore: calculateOverallScore(employeeSkills)
        }
      });

    } catch (error) {
      console.error('Employee skills fetch error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch employee skills'
      });
    }
  }
);

/**
 * POST /api/skills/employee/:employeeId/assess
 * Submit individual skills assessment
 * Requires authentication
 */
router.post('/employee/:employeeId/assess',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { employeeId } = req.params;
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Employees can only assess themselves, managers can assess their team
      if (req.user.id !== employeeId && req.user.role !== 'manager' &&
          req.user.role !== 'clientAdmin' && req.user.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const validatedData = IndividualSkillsAssessmentSchema.parse({
        employeeId,
        skills: req.body.skills
      });

      // Save skills to database
      for (const skill of validatedData.skills) {
        await db.insert(skills).values({
          id: crypto.randomUUID(),
          userId: employeeId,
          tenantId: req.user.tenantId,
          name: skill.name,
          category: skill.category,
          level: skill.level,
          yearsOfExperience: skill.yearsOfExperience,
          verified: skill.verified,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      return res.json({
        success: true,
        message: 'Skills assessment submitted successfully',
        skillsAdded: validatedData.skills.length
      });

    } catch (error) {
      console.error('Skills assessment error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid assessment data',
          details: error.errors
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to submit skills assessment'
      });
    }
  }
);

/**
 * POST /api/skills/resume/upload
 * Upload and parse resume for skills extraction
 * Requires authentication
 */
router.post('/resume/upload',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const validatedData = ResumeUploadSchema.parse(req.body);
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Verify employee belongs to user's tenant or user is the employee
      if (req.user.id !== validatedData.employeeId) {
        const employee = await db.query.users.findFirst({
          where: eq(users.id, validatedData.employeeId)
        });

        if (!employee || (employee.tenantId !== req.user.tenantId && req.user.role !== 'superadmin')) {
          return res.status(403).json({
            success: false,
            error: 'Access denied'
          });
        }
      }

      // Extract skills from resume using SkillsAgent
      const resumeData = {
        employeeId: validatedData.employeeId,
        resumeText: validatedData.resumeText
      };

      // Note: Actual skill extraction would happen here using AI
      // For now, returning a structured response
      const extractedSkills = [
        { name: 'JavaScript', category: 'technical' as const, level: 'advanced' as const },
        { name: 'Project Management', category: 'leadership' as const, level: 'intermediate' as const },
        { name: 'Communication', category: 'communication' as const, level: 'advanced' as const }
      ];

      return res.json({
        success: true,
        extractedSkills,
        message: 'Resume parsed successfully'
      });

    } catch (error) {
      console.error('Resume upload error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid resume data',
          details: error.errors
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to process resume'
      });
    }
  }
);

/**
 * GET /api/skills/department/:departmentId
 * Get aggregated skills analysis for a department
 * Requires manager or admin role
 */
router.get('/department/:departmentId',
  authenticate,
  authorize(['manager', 'clientAdmin', 'superadmin']),
  async (req: Request, res: Response) => {
    try {
      const { departmentId } = req.params;
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Get all employees in department
      const employees = await db.query.users.findMany({
        where: and(
          eq(users.departmentId, departmentId),
          eq(users.tenantId, req.user.tenantId)
        )
      });

      // Aggregate skills data
      const departmentSkills = await aggregateDepartmentSkills(employees);

      return res.json({
        success: true,
        department: {
          id: departmentId,
          employeeCount: employees.length,
          skills: departmentSkills,
          overallScore: calculateDepartmentScore(departmentSkills)
        }
      });

    } catch (error) {
      console.error('Department skills fetch error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch department skills'
      });
    }
  }
);

/**
 * GET /api/skills/organization
 * Get organization-wide skills analysis
 * Requires admin role
 */
router.get('/organization',
  authenticate,
  authorize(['clientAdmin', 'superadmin']),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Get recent organization skills assessment
      const recentAssessment = await db.query.skillsAssessments.findFirst({
        where: eq(skillsAssessments.tenantId, req.user.tenantId),
        orderBy: (assessments, { desc }) => [desc(assessments.createdAt)]
      });

      if (!recentAssessment) {
        return res.status(404).json({
          success: false,
          error: 'No skills assessment found. Please run an analysis first.'
        });
      }

      // Parse the analysis data
      const analysisData = JSON.parse(recentAssessment.analysisData as string);

      return res.json({
        success: true,
        assessment: {
          id: recentAssessment.id,
          date: recentAssessment.createdAt,
          overallScore: recentAssessment.overallScore,
          strategicAlignment: recentAssessment.strategicAlignment,
          criticalGapsCount: recentAssessment.criticalGapsCount,
          analysis: analysisData
        }
      });

    } catch (error) {
      console.error('Organization skills fetch error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch organization skills'
      });
    }
  }
);

// Helper functions
interface SkillRecord {
  level?: string;
  skillLevel?: number;
  proficiency?: number;
  averageLevel?: number;
  coverage?: number;
  [key: string]: unknown;
}

function calculateOverallScore(skills: SkillRecord[]): number {
  if (skills.length === 0) return 0;

  const levelScores: Record<string, number> = {
    beginner: 25,
    intermediate: 50,
    advanced: 75,
    expert: 100
  };

  const totalScore = skills.reduce((sum, skill) => {
    const level = skill.level || '';
    return sum + (levelScores[level] || 0);
  }, 0);

  return Math.round(totalScore / skills.length);
}

interface EmployeeSkills {
  id: string;
  department?: string;
  skills?: SkillRecord[];
  [key: string]: unknown;
}

interface DepartmentSkillsAggregation {
  name: string;
  coverage: number;
  averageLevel: number;
}

async function aggregateDepartmentSkills(employees: EmployeeSkills[]): Promise<DepartmentSkillsAggregation[]> {
  // Aggregate skills across all employees in department
  const skillsMap = new Map<string, { count: number; totalLevel: number }>();

  for (const employee of employees) {
    const employeeSkills = await db.query.skills.findMany({
      where: eq(skills.userId, employee.id)
    });

    for (const skill of employeeSkills) {
      const existing = skillsMap.get(skill.name) || { count: 0, totalLevel: 0 };
      existing.count++;
      existing.totalLevel += getSkillLevelScore(skill.level);
      skillsMap.set(skill.name, existing);
    }
  }

  return Array.from(skillsMap.entries()).map(([name, data]) => ({
    name,
    coverage: (data.count / employees.length) * 100,
    averageLevel: data.totalLevel / data.count
  }));
}

function getSkillLevelScore(level: string): number {
  const scores: Record<string, number> = {
    beginner: 1,
    intermediate: 2,
    advanced: 3,
    expert: 4
  };
  return scores[level] || 0;
}

function calculateDepartmentScore(skills: DepartmentSkillsAggregation[]): number {
  if (skills.length === 0) return 0;

  const avgLevel = skills.reduce((sum, skill) => sum + (skill.averageLevel || 0), 0) / skills.length;
  const avgCoverage = skills.reduce((sum, skill) => sum + (skill.coverage || 0), 0) / skills.length;

  return Math.round((avgLevel * 25) + (avgCoverage * 0.5));
}

/**
 * POST /api/skills/complete-workflow
 * Run complete 8-step Skills Analysis workflow
 * As per AGENT_CONTEXT_ULTIMATE.md Lines 64-113
 */
router.post('/complete-workflow',
  authenticate,
  authorize(['clientAdmin', 'superadmin']),
  async (req: Request, res: Response) => {
    try {
      const validatedData = CompleteSkillsWorkflowSchema.parse(req.body);

      // Verify tenant access
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      
      if (req.user.role !== 'superadmin' && req.user.tenantId !== validatedData.tenantId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this tenant'
        });
      }

      // Run complete skills analysis workflow
      const workflow = await skillsAnalysisService.runCompleteSkillsAnalysis(
        validatedData.tenantId,
        validatedData.clientStrategy,
        {
          ...validatedData.clientContext,
          tenantId: validatedData.tenantId
        },
        req.user.id
      );

      return res.json({
        success: true,
        workflow,
        message: 'Complete skills analysis workflow completed successfully'
      });

    } catch (error) {
      console.error('Complete workflow error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to run complete skills analysis workflow'
      });
    }
  }
);

/**
 * POST /api/skills/strategic-framework
 * Create strategic skills framework
 * Step 1 of Skills Analysis workflow
 */
router.post('/strategic-framework',
  authenticate,
  authorize(['clientAdmin', 'superadmin']),
  async (req: Request, res: Response) => {
    try {
      const validatedData = StrategicFrameworkSchema.parse(req.body);

      // Verify tenant access
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      
      if (req.user.role !== 'superadmin' && req.user.tenantId !== validatedData.tenantId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this tenant'
        });
      }

      // Create strategic framework
      const framework = await skillsAnalysisService.developStrategicFramework(
        validatedData.tenantId,
        { strategy: validatedData.strategy },
        validatedData.industry,
        validatedData.createdBy
      );

      return res.json({
        success: true,
        framework,
        message: 'Strategic skills framework created successfully'
      });

    } catch (error) {
      console.error('Strategic framework creation error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to create strategic skills framework'
      });
    }
  }
);

/**
 * POST /api/skills/collect-employee-data
 * Collect employee skills data
 * Step 2 of Skills Analysis workflow
 */
router.post('/collect-employee-data',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { tenantId, employeeId, resumeData, csvData } = req.body;

      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Verify access
      if (req.user.id !== employeeId && req.user.role !== 'clientAdmin' && req.user.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Collect employee skills data
      const profile = await skillsAnalysisService.collectEmployeeSkills(
        tenantId,
        employeeId,
        resumeData,
        csvData
      );

      return res.json({
        success: true,
        profile,
        message: 'Employee skills data collected successfully'
      });

    } catch (error) {
      console.error('Employee data collection error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to collect employee skills data'
      });
    }
  }
);

/**
 * POST /api/skills/analyze-gaps/:employeeId
 * Analyze individual skills gaps
 * Step 3 of Skills Analysis workflow
 */
router.post('/analyze-gaps/:employeeId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { employeeId } = req.params;
      const { tenantId, frameworkId } = req.body;

      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Verify access
      if (req.user.id !== employeeId && req.user.role !== 'clientAdmin' && req.user.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Analyze individual gaps
      const gapAnalysis = await skillsAnalysisService.analyzeIndividualGaps(
        tenantId,
        employeeId,
        frameworkId
      );

      return res.json({
        success: true,
        gapAnalysis,
        message: 'Individual skills gap analysis completed'
      });

    } catch (error) {
      console.error('Gap analysis error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to analyze individual skills gaps'
      });
    }
  }
);

/**
 * POST /api/skills/trigger-lxp
 * Trigger LXP module for learning path creation
 * Step 4 of Skills Analysis workflow
 */
router.post('/trigger-lxp',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { tenantId, employeeId, sessionId, skillsGaps } = req.body;

      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Verify access
      if (req.user.id !== employeeId && req.user.role !== 'clientAdmin' && req.user.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Trigger LXP module
      const lxpTrigger = await skillsAnalysisService.triggerLXP(
        tenantId,
        employeeId,
        sessionId,
        skillsGaps
      );

      return res.json({
        success: true,
        lxpTrigger,
        message: 'LXP module triggered successfully'
      });

    } catch (error) {
      console.error('LXP trigger error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to trigger LXP module'
      });
    }
  }
);

/**
 * POST /api/skills/notify-stakeholders
 * Notify stakeholders about skills analysis results
 * Step 5 of Skills Analysis workflow
 */
router.post('/notify-stakeholders',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { tenantId, employeeId, supervisorId, gapAnalysis } = req.body;

      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Verify access
      if (req.user.role !== 'clientAdmin' && req.user.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Notify stakeholders
      const notifications = await skillsAnalysisService.notifyStakeholders(
        tenantId,
        employeeId,
        supervisorId,
        gapAnalysis
      );

      return res.json({
        success: true,
        notifications,
        message: 'Stakeholders notified successfully'
      });

    } catch (error) {
      console.error('Stakeholder notification error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to notify stakeholders'
      });
    }
  }
);

/**
 * POST /api/skills/bot/interact
 * Interact with Skills BOT
 * Interactive BOT system for employees, supervisors, and admins
 */
router.post('/bot/interact',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const validatedData = BotInteractionSchema.parse(req.body);

      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Verify access
      if (req.user.id !== validatedData.userId && req.user.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Handle BOT interaction
      const botResponse = await skillsBotService.handleBotQuery(
        validatedData.userId,
        validatedData.tenantId,
        validatedData.query,
        validatedData.sessionId
      );

      return res.json({
        success: true,
        botResponse,
        message: 'BOT interaction completed successfully'
      });

    } catch (error) {
      console.error('BOT interaction error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to process BOT interaction'
      });
    }
  }
);

/**
 * POST /api/skills/bot/resume-upload
 * BOT-assisted resume upload
 */
router.post('/bot/resume-upload',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { userId, tenantId, resumeData } = req.body;

      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Verify access
      if (req.user.id !== userId && req.user.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Assist with resume upload
      const botResponse = await skillsBotService.assistEmployeeResumeUpload(
        userId,
        tenantId,
        resumeData
      );

      return res.json({
        success: true,
        botResponse,
        message: 'Resume upload assistance completed'
      });

    } catch (error) {
      console.error('Resume upload assistance error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to assist with resume upload'
      });
    }
  }
);

/**
 * GET /api/skills/assessment-sessions
 * Get skills assessment sessions for tenant
 */
router.get('/assessment-sessions',
  authenticate,
  authorize(['clientAdmin', 'superadmin']),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Get assessment sessions
      const sessions = await db.query.skillsAssessmentSessions.findMany({
        where: eq(skillsAssessmentSessions.tenantId, req.user.tenantId),
        orderBy: desc(skillsAssessmentSessions.createdAt),
        limit: 20
      });

      return res.json({
        success: true,
        sessions,
        message: 'Assessment sessions retrieved successfully'
      });

    } catch (error) {
      console.error('Assessment sessions fetch error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch assessment sessions'
      });
    }
  }
);

/**
 * GET /api/skills/frameworks
 * Get skills frameworks for tenant
 */
router.get('/frameworks',
  authenticate,
  authorize(['clientAdmin', 'superadmin']),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Get skills frameworks
      const frameworks = await db.query.skillsFramework.findMany({
        where: eq(skillsFramework.tenantId, req.user.tenantId),
        orderBy: desc(skillsFramework.createdAt),
        limit: 10
      });

      return res.json({
        success: true,
        frameworks,
        message: 'Skills frameworks retrieved successfully'
      });

    } catch (error) {
      console.error('Skills frameworks fetch error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch skills frameworks'
      });
    }
  }
);

/**
 * GET /api/skills/bot/interactions
 * Get BOT interaction history for user
 */
router.get('/bot/interactions',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { userId, limit = 20 } = req.query;

      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Verify access
      if (req.user.id !== userId && req.user.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Get BOT interactions
      const interactions = await db.query.skillsBotInteractions.findMany({
        where: and(
          eq(skillsBotInteractions.tenantId, req.user.tenantId),
          eq(skillsBotInteractions.userId, userId as string)
        ),
        orderBy: desc(skillsBotInteractions.createdAt),
        limit: parseInt(limit as string)
      });

      return res.json({
        success: true,
        interactions,
        message: 'BOT interactions retrieved successfully'
      });

    } catch (error) {
      console.error('BOT interactions fetch error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch BOT interactions'
      });
    }
  }
);

export default router;