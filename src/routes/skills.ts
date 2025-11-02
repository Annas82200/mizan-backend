// backend/src/routes/skills.ts
// Complete Skills Analysis API Routes with Tenant Isolation Security - AGENT_CONTEXT_ULTIMATE.md

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import pdfParse from 'pdf-parse-fork';
import mammoth from 'mammoth';
import { authenticate, authorize } from '../middleware/auth';
import { validateTenantAccess } from '../middleware/tenant';
import { skillsAgent, type SkillsFramework, type Skill } from '../services/agents/skills/skills-agent';
import { db } from '../../db/index';
import { skills, skillsAssessments, skillsGaps, skillsFramework, skillsAssessmentSessions, skillsBotInteractions, skillsLearningTriggers, skillsTalentTriggers, skillsBonusTriggers, skillsProgress, employeeSkillsProfiles, users, tenants } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { emailService } from '../services/email';

const router = Router();

// Configure multer for resume uploads
const resumeStorage = multer.memoryStorage();
const resumeUpload = multer({
  storage: resumeStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'text/plain'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, DOC, and TXT files are allowed.'));
    }
  },
});

// Configure multer for CSV uploads
const csvStorage = multer.memoryStorage();
const csvUpload = multer({
  storage: csvStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV files are allowed.'));
    }
  },
});

// Extract text from resume based on file type
async function extractResumeText(buffer: Buffer, mimetype: string): Promise<string> {
  try {
    if (mimetype === 'application/pdf') {
      const pdfData = await pdfParse(buffer);
      return pdfData.text;
    } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
               mimetype === 'application/msword') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } else if (mimetype === 'text/plain') {
      return buffer.toString('utf-8');
    } else {
      throw new Error('Unsupported file type');
    }
  } catch (error) {
    console.error('Error extracting resume text:', error);
    throw new Error('Failed to extract text from resume');
  }
}

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
 * POST /api/skills/resume/upload
 * Upload and analyze resume to extract skills
 */
router.post('/resume/upload', authenticate, validateTenantAccess, resumeUpload.single('resume'), async (req: Request, res: Response) => {
  try {
    const userTenantId = req.user!.tenantId;
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        error: 'employeeId is required'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Resume file is required'
      });
    }

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

    // Extract text from resume
    const resumeText = await extractResumeText(req.file.buffer, req.file.mimetype);

    // Use skills agent to extract skills from resume text
    const extractedSkills = await skillsAgent['extractSkillsFromResume'](resumeText);

    if (extractedSkills.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No skills found in resume',
        skills: []
      });
    }

    // Store extracted skills in database
    const newSkills = [];
    for (const skill of extractedSkills) {
      const [newSkill] = await db.insert(skills).values({
        userId: employeeId,
        tenantId: userTenantId,
        name: skill.name,
        category: skill.category,
        level: skill.level,
        yearsOfExperience: skill.yearsOfExperience,
        verified: false // Resume-extracted skills are not verified by default
      }).onConflictDoUpdate({
        target: [skills.userId, skills.name],
        set: {
          level: skill.level,
          category: skill.category,
          yearsOfExperience: skill.yearsOfExperience,
          updatedAt: new Date()
        }
      }).returning();
      newSkills.push(newSkill);
    }

    res.status(201).json({
      success: true,
      message: `Successfully extracted ${newSkills.length} skills from resume`,
      skills: newSkills
    });

  } catch (error: unknown) {
    console.error('Resume upload error:', error);
    if (error instanceof Error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Failed to process resume' });
  }
});

/**
 * POST /api/skills/csv/import
 * Import employee skills from CSV file
 */
router.post('/csv/import', authenticate, authorize(['superadmin', 'clientAdmin']), validateTenantAccess, csvUpload.single('csv'), async (req: Request, res: Response) => {
  try {
    const userTenantId = req.user!.tenantId;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'CSV file is required'
      });
    }

    // Parse CSV file
    const records = parse(req.file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Array<Record<string, string>>;

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'CSV file is empty'
      });
    }

    // Use skills agent to parse CSV data
    const employeeData = await skillsAgent['parseCSVData'](records);

    if (employeeData.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid employee data found in CSV'
      });
    }

    // Store skills for each employee
    let totalSkillsImported = 0;
    const importResults = [];

    for (const employee of employeeData) {
      // Verify/create employee in users table
      const existingEmployee = await db.select()
        .from(users)
        .where(and(
          eq(users.id, employee.employeeId),
          eq(users.tenantId, userTenantId)
        ))
        .limit(1);

      if (existingEmployee.length === 0) {
        // Skip employees not in the system
        console.warn(`Employee ${employee.employeeId} not found in tenant ${userTenantId}, skipping`);
        continue;
      }

      // Import skills for this employee
      const importedSkills = [];
      for (const skill of employee.skills) {
        const [newSkill] = await db.insert(skills).values({
          userId: employee.employeeId,
          tenantId: userTenantId,
          name: skill.name,
          category: skill.category,
          level: skill.level,
          yearsOfExperience: skill.yearsOfExperience,
          verified: false // CSV-imported skills are not verified by default
        }).onConflictDoUpdate({
          target: [skills.userId, skills.name],
          set: {
            level: skill.level,
            category: skill.category,
            yearsOfExperience: skill.yearsOfExperience,
            updatedAt: new Date()
          }
        }).returning();
        importedSkills.push(newSkill);
        totalSkillsImported++;
      }

      importResults.push({
        employeeId: employee.employeeId,
        employeeName: employee.name,
        skillsImported: importedSkills.length
      });
    }

    res.status(201).json({
      success: true,
      message: `Successfully imported ${totalSkillsImported} skills for ${importResults.length} employees`,
      totalSkills: totalSkillsImported,
      employeesProcessed: importResults.length,
      details: importResults
    });

  } catch (error: unknown) {
    console.error('CSV import error:', error);
    if (error instanceof Error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Failed to import CSV' });
  }
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
 * PUT /api/skills/framework/:id
 * Update an existing strategic skills framework
 */
router.put('/framework/:id', authenticate, authorize(['superadmin', 'clientAdmin']), validateTenantAccess, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { frameworkName, industry, strategicSkills, technicalSkills, softSkills, prioritization } = req.body;
        const userTenantId = req.user!.tenantId;

        if (!id) {
            return res.status(400).json({ success: false, error: 'Framework ID is required' });
        }

        // Verify framework exists and belongs to user's tenant
        const existingFramework = await db.select()
            .from(skillsFramework)
            .where(and(
                eq(skillsFramework.id, id),
                eq(skillsFramework.tenantId, userTenantId)
            ))
            .limit(1);

        if (existingFramework.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Framework not found or access denied'
            });
        }

        // Build update object with only provided fields
        const updateData: any = {
            updatedAt: new Date()
        };

        if (frameworkName !== undefined) updateData.frameworkName = frameworkName;
        if (industry !== undefined) updateData.industry = industry;
        if (strategicSkills !== undefined) updateData.strategicSkills = strategicSkills;
        if (technicalSkills !== undefined) updateData.technicalSkills = technicalSkills;
        if (softSkills !== undefined) updateData.softSkills = softSkills;
        if (prioritization !== undefined) updateData.prioritization = prioritization;

        // Update the framework
        const updatedFramework = await db.update(skillsFramework)
            .set(updateData)
            .where(and(
                eq(skillsFramework.id, id),
                eq(skillsFramework.tenantId, userTenantId)
            ))
            .returning();

        if (updatedFramework.length === 0) {
            return res.status(500).json({
                success: false,
                error: 'Failed to update framework'
            });
        }

        res.json({
            success: true,
            framework: updatedFramework[0],
            message: 'Framework updated successfully'
        });

    } catch (error: unknown) {
        console.error('Framework update error:', error);
        if (error instanceof Error) {
            return res.status(500).json({ success: false, error: error.message });
        }
        res.status(500).json({ success: false, error: 'Failed to update skills framework' });
    }
});

/**
 * DELETE /api/skills/framework/:id
 * Delete a strategic skills framework
 * Note: This will fail if there are dependent assessment sessions
 */
router.delete('/framework/:id', authenticate, authorize(['superadmin', 'clientAdmin']), validateTenantAccess, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userTenantId = req.user!.tenantId;

        if (!id) {
            return res.status(400).json({ success: false, error: 'Framework ID is required' });
        }

        // Use transaction to prevent race conditions between check and delete
        const result = await db.transaction(async (tx) => {
            // Verify framework exists and belongs to user's tenant
            const existingFramework = await tx.select()
                .from(skillsFramework)
                .where(and(
                    eq(skillsFramework.id, id),
                    eq(skillsFramework.tenantId, userTenantId)
                ))
                .limit(1);

            if (existingFramework.length === 0) {
                throw new Error('Framework not found or access denied');
            }

            // Check for dependent assessment sessions
            const dependentSessions = await tx.select()
                .from(skillsAssessmentSessions)
                .where(and(
                    eq(skillsAssessmentSessions.frameworkId, id),
                    eq(skillsAssessmentSessions.tenantId, userTenantId)
                ))
                .limit(1);

            if (dependentSessions.length > 0) {
                throw new Error('DEPENDENT_SESSIONS_EXIST');
            }

            // Delete the framework within transaction
            const deletedFramework = await tx.delete(skillsFramework)
                .where(and(
                    eq(skillsFramework.id, id),
                    eq(skillsFramework.tenantId, userTenantId)
                ))
                .returning();

            if (deletedFramework.length === 0) {
                throw new Error('Failed to delete framework');
            }

            return deletedFramework[0];
        });

        res.json({
            success: true,
            message: 'Framework deleted successfully',
            deletedFramework: result
        });

    } catch (error: unknown) {
        console.error('Framework deletion error:', error);

        if (error instanceof Error) {
            // Handle specific error cases
            if (error.message === 'Framework not found or access denied') {
                return res.status(404).json({ success: false, error: error.message });
            }
            if (error.message === 'DEPENDENT_SESSIONS_EXIST') {
                return res.status(409).json({
                    success: false,
                    error: 'Cannot delete framework: Active assessment sessions exist. Please complete or delete those sessions first.'
                });
            }
            return res.status(500).json({ success: false, error: error.message });
        }

        res.status(500).json({ success: false, error: 'Failed to delete skills framework' });
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
 * GET /api/skills/dashboard/stats
 * Get skills dashboard statistics for tenant
 */
router.get('/dashboard/stats', authenticate, validateTenantAccess, async (req: Request, res: Response) => {
  try {
    const userTenantId = req.user!.tenantId;

    // Get total skills count
    const totalSkills = await db.select()
      .from(skills)
      .where(eq(skills.tenantId, userTenantId));

    // Get total employees with skills
    const employeesWithSkills = await db.selectDistinct({ userId: skills.userId })
      .from(skills)
      .where(eq(skills.tenantId, userTenantId));

    // Get skills gaps count
    const skillsGapsList = await db.select()
      .from(skillsGaps)
      .where(eq(skillsGaps.tenantId, userTenantId));

    // Get latest assessments
    const latestAssessments = await db.select()
      .from(skillsAssessments)
      .where(eq(skillsAssessments.tenantId, userTenantId))
      .limit(10);

    // Calculate skills by category
    const skillsByCategory = totalSkills.reduce((acc, skill) => {
      acc[skill.category] = (acc[skill.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate skills by level
    const skillsByLevel = totalSkills.reduce((acc, skill) => {
      acc[skill.level] = (acc[skill.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get frameworks
    const frameworks = await db.select()
      .from(skillsFramework)
      .where(eq(skillsFramework.tenantId, userTenantId));

    const stats = {
      overview: {
        totalSkills: totalSkills.length,
        totalEmployees: employeesWithSkills.length,
        totalGaps: skillsGapsList.length,
        totalFrameworks: frameworks.length,
        totalAssessments: latestAssessments.length
      },
      distribution: {
        byCategory: skillsByCategory,
        byLevel: skillsByLevel
      },
      gaps: {
        critical: skillsGapsList.filter(g => g.gapSeverity === 'critical').length,
        high: skillsGapsList.filter(g => g.gapSeverity === 'high').length,
        medium: skillsGapsList.filter(g => g.gapSeverity === 'medium').length,
        low: skillsGapsList.filter(g => g.gapSeverity === 'low').length
      },
      recentAssessments: latestAssessments.slice(0, 5).map(a => ({
        id: a.id,
        userId: a.userId,
        createdAt: a.createdAt,
        overallScore: a.overallScore
      }))
    };

    res.json({ success: true, stats });

  } catch (error: unknown) {
    console.error('Error fetching dashboard stats:', error);
    if (error instanceof Error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
  }
});

/**
 * POST /api/skills/workflow/start
 * Start full skills analysis workflow
 */
router.post('/workflow/start', authenticate, authorize(['superadmin', 'clientAdmin']), validateTenantAccess, async (req: Request, res: Response) => {
  try {
    const userTenantId = req.user!.tenantId;
    const { strategy, industry, organizationName } = req.body;

    if (!strategy || !industry || !organizationName) {
      return res.status(400).json({
        success: false,
        error: 'strategy, industry, and organizationName are required'
      });
    }

    // Create workflow input
    const workflowInput = {
      tenantId: userTenantId,
      companyId: userTenantId,
      industry,
      organizationName,
      strategy
    };

    // Execute full skills analysis workflow
    const analysis = await skillsAgent.analyzeSkills(workflowInput);

    // Store analysis results in database
    await db.insert(skillsAssessments).values({
      tenantId: userTenantId,
      userId: req.user!.id,
      currentSkills: analysis.skillCategories as unknown as Record<string, unknown>,
      requiredSkills: analysis.emergingSkills as unknown as Record<string, unknown>,
      analysisData: analysis as unknown as Record<string, unknown>,
      overallScore: analysis.overallScore,
      strategicAlignment: analysis.strategicAlignment,
      criticalGapsCount: analysis.criticalGaps.length,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Store critical gaps
    for (const gap of analysis.criticalGaps) {
      await db.insert(skillsGaps).values({
        tenantId: userTenantId,
        employeeId: null, // Organization-level gap
        skill: gap.skill,
        category: gap.category,
        currentLevel: gap.currentLevel,
        requiredLevel: gap.requiredLevel,
        gapSeverity: gap.gap,
        priority: gap.priority,
        businessImpact: gap.businessImpact,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    res.status(201).json({
      success: true,
      message: 'Skills analysis workflow completed successfully',
      analysis: {
        overallScore: analysis.overallScore,
        strategicAlignment: analysis.strategicAlignment,
        skillsCoverage: analysis.skillsCoverage,
        criticalGapsCount: analysis.criticalGaps.length,
        lxpTriggersCount: analysis.lxpTriggers?.length || 0,
        talentTriggersCount: analysis.talentTriggers?.length || 0,
        bonusTriggersCount: analysis.bonusTriggers?.length || 0
      }
    });

  } catch (error: unknown) {
    console.error('Workflow start error:', error);
    if (error instanceof Error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Failed to start workflow' });
  }
});

/**
 * GET /api/skills/workflow/sessions
 * Get all workflow sessions for the tenant
 */
router.get('/workflow/sessions', authenticate, validateTenantAccess, async (req: Request, res: Response) => {
  try {
    const userTenantId = req.user!.tenantId;

    // Get all assessments (workflow sessions) for the tenant
    const sessions = await db.select()
      .from(skillsAssessments)
      .where(eq(skillsAssessments.tenantId, userTenantId))
      .orderBy(desc(skillsAssessments.createdAt));

    // Format sessions with status and progress
    const formattedSessions = sessions.map(session => ({
      id: session.id,
      userId: session.userId,
      overallScore: session.overallScore,
      strategicAlignment: session.strategicAlignment,
      criticalGapsCount: session.criticalGapsCount,
      status: session.overallScore ? 'completed' : 'in_progress',
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      currentSkills: session.currentSkills,
      requiredSkills: session.requiredSkills
    }));

    res.json({
      success: true,
      sessions: formattedSessions,
      totalCount: formattedSessions.length
    });

  } catch (error: unknown) {
    console.error('Workflow sessions error:', error);
    if (error instanceof Error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Failed to retrieve workflow sessions' });
  }
});

/**
 * POST /api/skills/bot/query
 * Interactive skills bot queries
 */
router.post('/bot/query', authenticate, validateTenantAccess, async (req: Request, res: Response) => {
  try {
    const userTenantId = req.user!.tenantId;
    const { query, context } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'query is required'
      });
    }

    // Use skills bot to answer query
    const response = await skillsAgent.handleBotQuery(query, userTenantId, context);

    // Store bot interaction
    await db.insert(skillsBotInteractions).values({
      tenantId: userTenantId,
      userId: req.user!.id,
      interactionType: response.intent,
      userQuery: query,
      botResponse: response.answer,
      context: {
        ...context,
        confidence: response.confidence,
        suggestions: response.suggestions
      } as unknown as Record<string, unknown>,
      resolved: true,
      createdAt: new Date()
    });

    res.json({
      success: true,
      response: {
        answer: response.answer,
        intent: response.intent,
        confidence: response.confidence,
        suggestions: response.suggestions
      }
    });

  } catch (error: unknown) {
    console.error('Bot query error:', error);
    if (error instanceof Error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Failed to process bot query' });
  }
});

/**
 * GET /api/skills/department/:departmentId/analysis
 * Analyze skills at department level
 */
router.get('/department/:departmentId/analysis', authenticate, validateTenantAccess, async (req: Request, res: Response) => {
  try {
    const userTenantId = req.user!.tenantId;
    const { departmentId } = req.params;

    // Analyze department skills
    const analysis = await skillsAgent.analyzeDepartmentSkills(departmentId, userTenantId);

    res.json({
      success: true,
      analysis
    });

  } catch (error: unknown) {
    console.error('Department analysis error:', error);
    if (error instanceof Error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Failed to analyze department skills' });
  }
});

/**
 * GET /api/skills/organization/analysis
 * Analyze skills at organization level
 */
router.get('/organization/analysis', authenticate, authorize(['superadmin', 'clientAdmin']), validateTenantAccess, async (req: Request, res: Response) => {
  try {
    const userTenantId = req.user!.tenantId;

    // Analyze organization skills
    const analysis = await skillsAgent.analyzeOrganizationSkills(userTenantId);

    res.json({
      success: true,
      analysis
    });

  } catch (error: unknown) {
    console.error('Organization analysis error:', error);
    if (error instanceof Error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Failed to analyze organization skills' });
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

/**
 * POST /api/skills/notify
 * Send skills-related email notifications
 */
router.post('/notify', authenticate, authorize(['superadmin', 'clientAdmin']), validateTenantAccess, async (req: Request, res: Response) => {
  try {
    const userTenantId = req.user!.tenantId;
    const { notificationType, recipients, data } = req.body;

    // Validate required fields
    if (!notificationType || !recipients || !data) {
      return res.status(400).json({
        success: false,
        error: 'notificationType, recipients, and data are required'
      });
    }

    // Ensure recipients is an array
    const recipientList = Array.isArray(recipients) ? recipients : [recipients];

    // Get tenant information for email context
    const tenant = await db.select()
      .from(tenants)
      .where(eq(tenants.id, userTenantId))
      .limit(1);

    const companyName = tenant[0]?.name || 'Your Organization';
    const frontendUrl = process.env.FRONTEND_URL || 'https://www.mizan.work';

    // Map notification type to email template
    const templateMap: Record<string, string> = {
      'analysis_complete': 'skillsAnalysisComplete',
      'gap_detected': 'skillsGapDetected',
      'framework_created': 'skillsFrameworkCreated',
      'assessment_reminder': 'skillsAssessmentReminder',
      'learning_recommendation': 'skillsLearningRecommendation'
    };

    const templateName = templateMap[notificationType];
    if (!templateName) {
      return res.status(400).json({
        success: false,
        error: `Invalid notification type: ${notificationType}`
      });
    }

    // Prepare email data with context
    const emailData = {
      ...data,
      companyName,
      dashboardLink: `${frontendUrl}/dashboard/skills`,
      actionUrl: data.actionUrl || `${frontendUrl}/dashboard/skills`,
      assessmentLink: data.assessmentLink || `${frontendUrl}/dashboard/skills/assessment`,
      lxpLink: data.lxpLink || `${frontendUrl}/dashboard/lxp`
    };

    // Send emails to all recipients
    const emailPromises = recipientList.map(async (recipient: { email: string; name: string }) => {
      try {
        await emailService.sendEmail({
          to: recipient.email,
          template: templateName,
          data: {
            ...emailData,
            name: recipient.name || recipient.email,
            employeeName: recipient.name || recipient.email
          }
        });
        return { success: true, email: recipient.email };
      } catch (error) {
        console.error(`Failed to send email to ${recipient.email}:`, error);
        return { success: false, email: recipient.email, error: (error as Error).message };
      }
    });

    const results = await Promise.allSettled(emailPromises);

    // Count successes and failures
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    res.json({
      success: true,
      message: `Notifications sent: ${successful} successful, ${failed} failed`,
      results: results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: 'Promise rejected' })
    });

  } catch (error: unknown) {
    console.error('Notification error:', error);
    if (error instanceof Error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Failed to send notifications' });
  }
});

export default router;