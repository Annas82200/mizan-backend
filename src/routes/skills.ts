// backend/src/routes/skills.ts
// Complete Skills Analysis API Routes with Tenant Isolation Security - AGENT_CONTEXT_ULTIMATE.md

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth';
import { validateTenantAccess } from '../middleware/tenant';
import { skillsAgent, type SkillsFramework, type Skill } from '../services/agents/skills/skills-agent';
import { db } from '../db/index';
import { skills, skillsAssessments, skillsGaps, skillsFramework, skillsAssessmentSessions, skillsBotInteractions, skillsLearningTriggers, skillsTalentTriggers, skillsBonusTriggers, skillsProgress, employeeSkillsProfiles, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const router = Router();

// Zod Schemas for validation
const SkillSchema = z.object({
  name: z.string(),
  category: z.enum(['technical', 'soft', 'leadership', 'analytical', 'communication']),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  yearsOfExperience: z.number().optional(),
  verified: z.boolean().optional()
});

const SkillsAnalysisInputSchema = z.object({
  tenantId: z.string(),
  companyId: z.string(),
  industry: z.string(),
  organizationName: z.string(),
  strategy: z.string().optional(),
  employeeData: z.array(z.object({
    employeeId: z.string(),
    name: z.string(),
    department: z.string(),
    role: z.string(),
    skills: z.array(SkillSchema),
    experience: z.number()
  })).optional(),
  resumeData: z.array(z.object({
    employeeId: z.string(),
    resumeText: z.string()
  })).optional()
});

/**
 * POST /api/skills/analyze
 * Run a full skills analysis for a tenant
 */
router.post('/analyze', authenticate, authorize(['superadmin', 'clientAdmin']), validateTenantAccess, async (req: Request, res: Response) => {
  try {
    const validatedInput = SkillsAnalysisInputSchema.parse(req.body);
    const userTenantId = req.user!.tenantId;

    // Validate tenant access - ensure request tenantId matches user's tenant
    if (validatedInput.tenantId !== userTenantId) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied: Tenant mismatch' 
      });
    }

    // Verify tenant exists and user has access
    const tenantUser = await db.select()
      .from(users)
      .where(and(
        eq(users.id, req.user!.id),
        eq(users.tenantId, userTenantId)
      ))
      .limit(1);

    if (tenantUser.length === 0) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied: Invalid tenant access' 
      });
    }

    const result = await skillsAgent.analyzeSkills(validatedInput as Parameters<typeof skillsAgent.analyzeSkills>[0]);
    res.json({ success: true, analysis: result });
  } catch (error: unknown) {
    console.error('Skills analysis error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid input data', details: error.errors });
    }
    if (error instanceof Error) {
        return res.status(500).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Failed to perform skills analysis' });
  }
});

/**
 * POST /api/skills/framework
 * Create a strategic skills framework
 */
router.post('/framework', authenticate, authorize(['superadmin', 'clientAdmin']), validateTenantAccess, async (req: Request, res: Response) => {
    try {
        const { tenantId, strategy, industry } = req.body;
        const userTenantId = req.user!.tenantId;

        if (!tenantId || !strategy || !industry) {
            return res.status(400).json({ success: false, error: 'tenantId, strategy, and industry are required' });
        }

        // Validate tenant access - ensure request tenantId matches user's tenant
        if (tenantId !== userTenantId) {
            return res.status(403).json({ 
                success: false, 
                error: 'Access denied: Tenant mismatch' 
            });
        }

        // Verify tenant exists and user has access
        const tenantUser = await db.select()
            .from(users)
            .where(and(
                eq(users.id, req.user!.id),
                eq(users.tenantId, userTenantId)
            ))
            .limit(1);

        if (tenantUser.length === 0) {
            return res.status(403).json({ 
                success: false, 
                error: 'Access denied: Invalid tenant access' 
            });
        }

        const framework = await skillsAgent.createStrategicSkillsFramework(tenantId, strategy, industry);
        res.json({ success: true, framework });

    } catch (error: unknown) {
        console.error('Framework creation error:', error);
        if (error instanceof Error) {
            return res.status(500).json({ success: false, error: error.message });
        }
        res.status(500).json({ success: false, error: 'Failed to create skills framework' });
    }
});

/**
 * GET /api/skills/employee/:employeeId/gap
 * Analyze skills gap for a single employee
 */
router.get('/employee/:employeeId/gap', authenticate, validateTenantAccess, async (req: Request, res: Response) => {
    try {
        const { employeeId } = req.params;
        const userTenantId = req.user!.tenantId;

        // Verify employee belongs to user's tenant
        const employee = await db.select()
            .from(users)
            .where(and(
                eq(users.id, employeeId),
                eq(users.tenantId, userTenantId)
            ))
            .limit(1);

        if (employee.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Employee not found or access denied' 
            });
        }

        // Get the strategic framework for the user's tenant only
        const frameworkFromDb = await db.select()
            .from(skillsFramework)
            .where(and(
                eq(skillsFramework.tenantId, userTenantId)
            ))
            .limit(1);

        if (frameworkFromDb.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Skills framework not found for this tenant.' 
            });
        }

        // Map database framework to SkillsFramework interface
        const mappedFramework: SkillsFramework = {
            tenantId: frameworkFromDb[0].tenantId,
            strategicSkills: (frameworkFromDb[0].strategicSkills as Skill[]) || [],
            industryBenchmarks: [],  // These should be populated from the database if available
            criticalSkills: [],      // These should be populated from the database if available
            emergingSkills: [],      // These should be populated from the database if available
            obsoleteSkills: []       // These should be populated from the database if available
        };

        const gapAnalysis = await skillsAgent.analyzeEmployeeSkillsGap(employeeId, userTenantId, mappedFramework);
        res.json({ success: true, gapAnalysis });
    } catch (error: unknown) {
        console.error('Employee skills gap analysis error:', error);
        if (error instanceof Error) {
            return res.status(500).json({ success: false, error: error.message });
        }
        res.status(500).json({ success: false, error: 'Failed to analyze employee skills gap' });
    }
});

/**
 * GET /api/skills/employee/:employeeId
 * Get skills for a specific employee
 */
router.get('/employee/:employeeId', authenticate, validateTenantAccess, async (req: Request, res: Response) => {
    try {
        const { employeeId } = req.params;
        const userTenantId = req.user!.tenantId;

        // Verify employee belongs to user's tenant
        const employee = await db.select()
            .from(users)
            .where(and(
                eq(users.id, employeeId),
                eq(users.tenantId, userTenantId)
            ))
            .limit(1);

        if (employee.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Employee not found or access denied' 
            });
        }

        // Get skills filtered by both userId and tenantId for security
        const userSkills = await db.select()
            .from(skills)
            .where(and(
                eq(skills.userId, employeeId),
                eq(skills.tenantId, userTenantId)
            ));

        res.json({ success: true, skills: userSkills });
    } catch (error: unknown) {
        console.error('Error fetching employee skills:', error);
        if (error instanceof Error) {
            return res.status(500).json({ success: false, error: error.message });
        }
        res.status(500).json({ success: false, error: 'Failed to fetch skills' });
    }
});

/**
 * POST /api/skills/employee/:employeeId
 * Add or update skills for an employee
 */
router.post('/employee/:employeeId', authenticate, validateTenantAccess, async (req: Request, res: Response) => {
    try {
        const { employeeId } = req.params;
        const userTenantId = req.user!.tenantId;
        const skillsToAdd = z.array(SkillSchema).parse(req.body.skills);

        // Verify employee belongs to user's tenant
        const employee = await db.select()
            .from(users)
            .where(and(
                eq(users.id, employeeId),
                eq(users.tenantId, userTenantId)
            ))
            .limit(1);

        if (employee.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Employee not found or access denied' 
            });
        }

        const newSkills = [];
        for (const skill of skillsToAdd) {
            const [newSkill] = await db.insert(skills).values({
                userId: employeeId,
                tenantId: userTenantId, // Always use user's tenant ID for security
                name: skill.name!,
                category: skill.category!,
                level: skill.level!,
                yearsOfExperience: skill.yearsOfExperience,
                verified: skill.verified
            }).onConflictDoUpdate({
                target: [skills.userId, skills.name],
                set: {
                    level: skill.level,
                    category: skill.category,
                    yearsOfExperience: skill.yearsOfExperience,
                    verified: skill.verified,
                    updatedAt: new Date()
                }
            }).returning();
            newSkills.push(newSkill);
        }

        res.status(201).json({ success: true, skills: newSkills });
    } catch (error: unknown) {
        console.error('Error adding/updating employee skills:', error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ success: false, error: 'Invalid skill data', details: error.errors });
        }
        if (error instanceof Error) {
            return res.status(500).json({ success: false, error: error.message });
        }
        res.status(500).json({ success: false, error: 'Failed to add or update skills' });
    }
});

/**
 * GET /api/skills/frameworks
 * Get all skills frameworks for the user's tenant
 */
router.get('/frameworks', authenticate, validateTenantAccess, async (req: Request, res: Response) => {
    try {
        const userTenantId = req.user!.tenantId;

        const frameworks = await db.select()
            .from(skillsFramework)
            .where(eq(skillsFramework.tenantId, userTenantId));

        res.json({ success: true, frameworks });
    } catch (error: unknown) {
        console.error('Error fetching skills frameworks:', error);
        if (error instanceof Error) {
            return res.status(500).json({ success: false, error: error.message });
        }
        res.status(500).json({ success: false, error: 'Failed to fetch skills frameworks' });
    }
});

/**
 * GET /api/skills/gaps
 * Get all skills gaps for the user's tenant
 */
router.get('/gaps', authenticate, authorize(['superadmin', 'clientAdmin']), validateTenantAccess, async (req: Request, res: Response) => {
    try {
        const userTenantId = req.user!.tenantId;

        const gaps = await db.select()
            .from(skillsGaps)
            .where(eq(skillsGaps.tenantId, userTenantId));

        res.json({ success: true, gaps });
    } catch (error: unknown) {
        console.error('Error fetching skills gaps:', error);
        if (error instanceof Error) {
            return res.status(500).json({ success: false, error: error.message });
        }
        res.status(500).json({ success: false, error: 'Failed to fetch skills gaps' });
    }
});

/**
 * GET /api/skills/assessments
 * Get all skills assessments for the user's tenant
 */
router.get('/assessments', authenticate, authorize(['superadmin', 'clientAdmin']), validateTenantAccess, async (req: Request, res: Response) => {
    try {
        const userTenantId = req.user!.tenantId;

        const assessments = await db.select()
            .from(skillsAssessments)
            .where(eq(skillsAssessments.tenantId, userTenantId));

        res.json({ success: true, assessments });
    } catch (error: unknown) {
        console.error('Error fetching skills assessments:', error);
        if (error instanceof Error) {
            return res.status(500).json({ success: false, error: error.message });
        }
        res.status(500).json({ success: false, error: 'Failed to fetch skills assessments' });
    }
});

/**
 * DELETE /api/skills/employee/:employeeId/skill/:skillName
 * Delete a specific skill for an employee
 */
router.delete('/employee/:employeeId/skill/:skillName', authenticate, validateTenantAccess, async (req: Request, res: Response) => {
    try {
        const { employeeId, skillName } = req.params;
        const userTenantId = req.user!.tenantId;

        // Verify employee belongs to user's tenant
        const employee = await db.select()
            .from(users)
            .where(and(
                eq(users.id, employeeId),
                eq(users.tenantId, userTenantId)
            ))
            .limit(1);

        if (employee.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Employee not found or access denied' 
            });
        }

        // Delete skill with tenant isolation
        const deletedSkill = await db.delete(skills)
            .where(and(
                eq(skills.userId, employeeId),
                eq(skills.name, skillName),
                eq(skills.tenantId, userTenantId)
            ))
            .returning();

        if (deletedSkill.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Skill not found' 
            });
        }

        res.json({ success: true, message: 'Skill deleted successfully' });
    } catch (error: unknown) {
        console.error('Error deleting employee skill:', error);
        if (error instanceof Error) {
            return res.status(500).json({ success: false, error: error.message });
        }
        res.status(500).json({ success: false, error: 'Failed to delete skill' });
    }
});

export default router;