// backend/src/routes/skills.ts
// Complete Skills Analysis API Routes - AGENT_CONTEXT_ULTIMATE.md Lines 287-292

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { skillsAgent } from '../../services/agents/skills/skills-agent.js';
import { db } from '../../db/index.js';
import { skills, skillsAssessments, skillsGaps, skillsFrameworks, skillsAssessmentSessions, skillsBotInteractions, skillsLearningTriggers, skillsTalentTriggers, skillsBonusTriggers, skillsProgress, employeeSkillsProfiles, users } from '../../db/schema.js';
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
router.post('/analyze', authenticate, authorize(['superadmin', 'clientAdmin']), async (req: Request, res: Response) => {
  try {
    const analysisInput = SkillsAnalysisInputSchema.parse(req.body);
    const result = await skillsAgent.analyzeSkills(analysisInput);
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
router.post('/framework', authenticate, authorize(['superadmin', 'clientAdmin']), async (req: Request, res: Response) => {
    try {
        const { tenantId, strategy, industry } = req.body;
        if (!tenantId || !strategy || !industry) {
            return res.status(400).json({ success: false, error: 'tenantId, strategy, and industry are required' });
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
router.get('/employee/:employeeId/gap', authenticate, async (req: Request, res: Response) => {
    try {
        const { employeeId } = req.params;
        const { tenantId } = req.user!;

        // First, get the strategic framework for the tenant
        const framework = await db.query.skillsFrameworks.findFirst({
            where: eq(skillsFrameworks.tenantId, tenantId)
        });

        if (!framework) {
            return res.status(404).json({ success: false, error: 'Skills framework not found for this tenant.' });
        }

        const gapAnalysis = await skillsAgent.analyzeEmployeeSkillsGap(employeeId, tenantId, framework);
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
router.get('/employee/:employeeId', authenticate, async (req: Request, res: Response) => {
    try {
        const { employeeId } = req.params;
        const userSkills = await db.query.skills.findMany({
            where: eq(skills.userId, employeeId)
        });
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
router.post('/employee/:employeeId', authenticate, async (req: Request, res: Response) => {
    try {
        const { employeeId } = req.params;
        const skillsToAdd = z.array(SkillSchema).parse(req.body.skills);

        const newSkills = [];
        for (const skill of skillsToAdd) {
            const [newSkill] = await db.insert(skills).values({
                id: randomUUID(),
                userId: employeeId,
                tenantId: req.user!.tenantId,
                ...skill
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


export default router;