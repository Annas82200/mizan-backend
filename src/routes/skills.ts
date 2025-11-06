// backend/src/routes/skills.ts
// Complete Skills Analysis API Routes with Tenant Isolation Security - AGENT_CONTEXT_ULTIMATE.md

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import pdfParse from 'pdf-parse-fork';
import mammoth from 'mammoth';
import { authenticate, authorize } from '../middleware/auth';
import { skillsAgent, type SkillsFramework, type Skill } from '../services/agents/skills/skills-agent';
import { db } from '../../db/index';
import { skills, skillsAssessments, skillsGaps, skillsFramework, skillsAssessmentSessions, skillsBotInteractions, skillsLearningTriggers, skillsTalentTriggers, skillsBonusTriggers, skillsProgress, employeeSkillsProfiles, users, tenants, departments } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { emailService } from '../services/email';
import { generateSkillsReportPDF, generateSkillsReportExcel, generateSkillsReportCSV } from '../services/reports/skills-report';

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
router.post('/resume/upload', authenticate, resumeUpload.single('resume'), async (req: Request, res: Response) => {
  try {
    const userTenantId = req.user!.tenantId;
    const userRole = req.user!.role;
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

    // Build query conditions - superadmins bypass tenant isolation
    const whereConditions = [eq(users.id, employeeId)];

    // Only enforce tenant isolation for non-superadmin users
    if (userRole !== 'superadmin') {
      whereConditions.push(eq(users.tenantId, userTenantId));
    }

    // Verify employee exists (and belongs to user's tenant if not superadmin)
    const employee = await db.select()
      .from(users)
      .where(and(...whereConditions))
      .limit(1);

    if (employee.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found or access denied'
      });
    }

    // Use employee's actual tenant ID (not requester's tenant ID)
    const employeeTenantId = employee[0].tenantId;

    // Extract text from resume
    const resumeText = await extractResumeText(req.file.buffer, req.file.mimetype);

    // Use skills agent to extract skills from resume text
    const extractedSkills = await skillsAgent['extractSkillsFromResume'](resumeText);

    if (extractedSkills.length === 0) {
      console.warn('[Resume Upload] No skills extracted from resume', {
        employeeId,
        tenantId: employeeTenantId,
        resumeLength: resumeText.length,
        timestamp: new Date().toISOString()
      });
      return res.status(200).json({
        success: true,
        message: 'No skills detected in resume. AI analysis did not identify recognizable skills. Please ensure the resume contains clear skill descriptions (e.g., "JavaScript", "Python", "Project Management").',
        skills: [],
        data: { extractedSkills: [] }
      });
    }

    // Store extracted skills in database with comprehensive error handling
    const newSkills = [];
    const failedSkills = [];

    for (const skill of extractedSkills) {
      try {
        const [newSkill] = await db.insert(skills).values({
          userId: employeeId,
          tenantId: employeeTenantId,
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

      } catch (error) {
        // Log error for monitoring but continue processing other skills
        console.error(`[Skills Insert] Failed for skill: ${skill.name}`, {
          employeeId,
          tenantId: employeeTenantId,
          skill,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorCode: error instanceof Error && 'code' in error ? (error as any).code : undefined,
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        });

        failedSkills.push({
          skillName: skill.name,
          category: skill.category,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // Continue with other skills instead of failing completely
      }
    }

    // Return comprehensive results
    const statusCode = newSkills.length > 0 ? 201 : (failedSkills.length > 0 ? 207 : 200);
    const message = failedSkills.length > 0
      ? `Successfully saved ${newSkills.length} skills, ${failedSkills.length} failed. ${
          failedSkills.length === extractedSkills.length
            ? 'This may indicate a database constraint issue. Please check logs.'
            : 'Review failed skills for details.'
        }`
      : `Successfully extracted and saved ${newSkills.length} skills from resume`;

    res.status(statusCode).json({
      success: newSkills.length > 0, // Success if at least some skills saved
      message,
      skills: newSkills,  // Keep for backward compatibility
      data: {
        extractedSkills: newSkills,
        totalExtracted: extractedSkills.length,
        successCount: newSkills.length,
        failureCount: failedSkills.length,
        failedSkills: failedSkills.length > 0 ? failedSkills : undefined
      }
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
router.post('/csv/import', authenticate, authorize(['superadmin', 'clientAdmin']), csvUpload.single('csv'), async (req: Request, res: Response) => {
  try {
    const userTenantId = req.user!.tenantId;
    const userRole = req.user!.role;

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
      // Build query conditions - superadmins bypass tenant isolation
      const whereConditions = [eq(users.id, employee.employeeId)];

      // Only enforce tenant isolation for non-superadmin users
      if (userRole !== 'superadmin') {
        whereConditions.push(eq(users.tenantId, userTenantId));
      }

      // Verify employee exists (and belongs to user's tenant if not superadmin)
      const existingEmployee = await db.select()
        .from(users)
        .where(and(...whereConditions))
        .limit(1);

      if (existingEmployee.length === 0) {
        // Skip employees not in the system
        console.warn(`Employee ${employee.employeeId} not found, skipping`);
        continue;
      }

      // Use employee's actual tenant ID (not requester's tenant ID)
      const employeeTenantId = existingEmployee[0].tenantId;

      // Import skills for this employee
      const importedSkills = [];
      for (const skill of employee.skills) {
        const [newSkill] = await db.insert(skills).values({
          userId: employee.employeeId,
          tenantId: employeeTenantId,
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
router.post('/analyze', authenticate, authorize(['superadmin', 'clientAdmin']), async (req: Request, res: Response) => {
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
router.post('/framework', authenticate, authorize(['superadmin', 'clientAdmin']), async (req: Request, res: Response) => {
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
router.put('/framework/:id', authenticate, authorize(['superadmin', 'clientAdmin']), async (req: Request, res: Response) => {
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
router.delete('/framework/:id', authenticate, authorize(['superadmin', 'clientAdmin']), async (req: Request, res: Response) => {
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
router.get('/employee/:employeeId/gap', authenticate, async (req: Request, res: Response) => {
    try {
        const { employeeId } = req.params;
        const userTenantId = req.user!.tenantId;
        const userRole = req.user!.role;

        // Resolve "current" to logged-in user's ID
        const resolvedEmployeeId = employeeId === 'current' ? req.user!.id : employeeId;

        // Build query conditions - superadmins bypass tenant isolation
        const whereConditions = [eq(users.id, resolvedEmployeeId)];

        // Only enforce tenant isolation for non-superadmin users
        if (userRole !== 'superadmin') {
            whereConditions.push(eq(users.tenantId, userTenantId));
        }

        // Verify employee exists (and belongs to user's tenant if not superadmin)
        const employee = await db.select()
            .from(users)
            .where(and(...whereConditions))
            .limit(1);

        if (employee.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Employee not found or access denied'
            });
        }

        // Use employee's actual tenant ID for framework query
        const employeeTenantId = employee[0].tenantId;

        // Get the strategic framework for the employee's tenant
        const frameworkFromDb = await db.select()
            .from(skillsFramework)
            .where(and(
                eq(skillsFramework.tenantId, employeeTenantId)
            ))
            .limit(1);

        // Handle missing framework gracefully
        if (frameworkFromDb.length === 0) {
            console.log(`[Skills Gap Analysis] No framework found for tenant ${employeeTenantId}, returning basic analysis`);

            // Return a helpful response with instructions
            return res.json({
                success: true,
                data: {
                    frameworkMissing: true,
                    message: 'No skills framework has been created for your organization yet. Please create a framework to enable gap analysis.',
                    helpText: 'Admins can create a framework using the "Create Framework" button in the Skills Analysis dashboard.',
                    overallGapScore: 0,
                    criticalGaps: [],
                    strengths: [],
                    recommendations: [
                        'Create a strategic skills framework to enable gap analysis',
                        'Contact your admin to set up the organizational skills framework',
                        'Continue adding your skills to prepare for analysis once the framework is ready'
                    ]
                }
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

        const gapAnalysis = await skillsAgent.analyzeEmployeeSkillsGap(resolvedEmployeeId, employeeTenantId, mappedFramework);
        res.json({ success: true, data: gapAnalysis });
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
        const userTenantId = req.user!.tenantId;
        const userRole = req.user!.role;

        // Resolve "current" to logged-in user's ID
        const resolvedEmployeeId = employeeId === 'current' ? req.user!.id : employeeId;

        // Build query conditions - superadmins bypass tenant isolation
        const whereConditions = [eq(users.id, resolvedEmployeeId)];

        // Only enforce tenant isolation for non-superadmin users
        if (userRole !== 'superadmin') {
            whereConditions.push(eq(users.tenantId, userTenantId));
        }

        // Verify employee exists (and belongs to user's tenant if not superadmin)
        const employee = await db.select()
            .from(users)
            .where(and(...whereConditions))
            .limit(1);

        if (employee.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Employee not found or access denied'
            });
        }

        // Get skills filtered by employee's actual tenant (not requester's tenant)
        const employeeTenantId = employee[0].tenantId;
        const userSkills = await db.select()
            .from(skills)
            .where(and(
                eq(skills.userId, resolvedEmployeeId),
                eq(skills.tenantId, employeeTenantId)
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
router.post('/employee/:employeeId', authenticate, async (req: Request, res: Response) => {
    try {
        const { employeeId } = req.params;
        const userTenantId = req.user!.tenantId;
        const userRole = req.user!.role;
        const skillsToAdd = z.array(SkillSchema).parse(req.body.skills);

        // Build query conditions - superadmins bypass tenant isolation
        const whereConditions = [eq(users.id, employeeId)];

        // Only enforce tenant isolation for non-superadmin users
        if (userRole !== 'superadmin') {
            whereConditions.push(eq(users.tenantId, userTenantId));
        }

        // Verify employee exists (and belongs to user's tenant if not superadmin)
        const employee = await db.select()
            .from(users)
            .where(and(...whereConditions))
            .limit(1);

        if (employee.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Employee not found or access denied'
            });
        }

        // Use employee's actual tenant ID (not requester's tenant ID)
        const employeeTenantId = employee[0].tenantId;

        const newSkills = [];
        for (const skill of skillsToAdd) {
            const [newSkill] = await db.insert(skills).values({
                userId: employeeId,
                tenantId: employeeTenantId, // Use employee's tenant ID for proper data association
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
router.get('/dashboard/stats', authenticate, async (req: Request, res: Response) => {
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

    // Helper function to convert skill level to numeric score
    const levelToScore = (level: string): number => {
      switch (level.toLowerCase()) {
        case 'expert': return 100;
        case 'advanced': return 75;
        case 'intermediate': return 50;
        case 'beginner': return 25;
        default: return 0;
      }
    };

    // Calculate skills by category with average scores
    const categoryStats: Record<string, { count: number; totalScore: number; gapCount: number }> = {};

    totalSkills.forEach(skill => {
      if (!categoryStats[skill.category]) {
        categoryStats[skill.category] = { count: 0, totalScore: 0, gapCount: 0 };
      }
      categoryStats[skill.category].count++;
      categoryStats[skill.category].totalScore += levelToScore(skill.level);
    });

    // Add gap counts per category
    skillsGapsList.forEach(gap => {
      if (categoryStats[gap.category]) {
        categoryStats[gap.category].gapCount++;
      } else {
        categoryStats[gap.category] = { count: 0, totalScore: 0, gapCount: 1 };
      }
    });

    // Calculate final scores (average) per category
    const skillsByCategory = Object.entries(categoryStats).reduce((acc, [category, data]) => {
      acc[category] = {
        count: data.count,
        averageScore: data.count > 0 ? Math.round(data.totalScore / data.count) : 0,
        gapCount: data.gapCount
      };
      return acc;
    }, {} as Record<string, { count: number; averageScore: number; gapCount: number }>);

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
router.post('/workflow/start', authenticate, authorize(['superadmin', 'clientAdmin']), async (req: Request, res: Response) => {
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
router.get('/workflow/sessions', authenticate, async (req: Request, res: Response) => {
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
router.post('/bot/query', authenticate, async (req: Request, res: Response) => {
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
router.get('/department/:departmentId/analysis', authenticate, async (req: Request, res: Response) => {
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
router.get('/organization/analysis', authenticate, authorize(['superadmin', 'clientAdmin']), async (req: Request, res: Response) => {
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
router.get('/frameworks', authenticate, async (req: Request, res: Response) => {
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
router.get('/gaps', authenticate, authorize(['superadmin', 'clientAdmin']), async (req: Request, res: Response) => {
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
router.get('/assessments', authenticate, authorize(['superadmin', 'clientAdmin']), async (req: Request, res: Response) => {
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
router.delete('/employee/:employeeId/skill/:skillName', authenticate, async (req: Request, res: Response) => {
    try {
        const { employeeId, skillName } = req.params;
        const userTenantId = req.user!.tenantId;
        const userRole = req.user!.role;

        // Build query conditions - superadmins bypass tenant isolation
        const whereConditions = [eq(users.id, employeeId)];

        // Only enforce tenant isolation for non-superadmin users
        if (userRole !== 'superadmin') {
            whereConditions.push(eq(users.tenantId, userTenantId));
        }

        // Verify employee exists (and belongs to user's tenant if not superadmin)
        const employee = await db.select()
            .from(users)
            .where(and(...whereConditions))
            .limit(1);

        if (employee.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Employee not found or access denied'
            });
        }

        // Use employee's actual tenant ID for skill deletion
        const employeeTenantId = employee[0].tenantId;

        // Delete skill with proper tenant isolation
        const deletedSkill = await db.delete(skills)
            .where(and(
                eq(skills.userId, employeeId),
                eq(skills.name, skillName),
                eq(skills.tenantId, employeeTenantId)
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
router.post('/notify', authenticate, authorize(['superadmin', 'clientAdmin']), async (req: Request, res: Response) => {
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

/**
 * GET /api/skills/progress/:employeeId
 * Get skill development progress for an employee
 */
router.get('/progress/:employeeId', authenticate, async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const userTenantId = req.user!.tenantId;
    const userRole = req.user!.role;

    // Resolve "current" to logged-in user's ID
    const resolvedEmployeeId = employeeId === 'current' ? req.user!.id : employeeId;

    // Build query conditions - superadmins bypass tenant isolation
    const whereConditions = [eq(users.id, resolvedEmployeeId)];

    // Only enforce tenant isolation for non-superadmin users
    if (userRole !== 'superadmin') {
      whereConditions.push(eq(users.tenantId, userTenantId));
    }

    // Verify employee exists (and belongs to user's tenant if not superadmin)
    const employee = await db.select()
      .from(users)
      .where(and(...whereConditions))
      .limit(1);

    if (employee.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found or access denied'
      });
    }

    // Use employee's actual tenant ID for progress query
    const employeeTenantId = employee[0].tenantId;

    // Get all progress records for this employee
    const progressRecords = await db.select()
      .from(skillsProgress)
      .where(and(
        eq(skillsProgress.employeeId, resolvedEmployeeId),
        eq(skillsProgress.tenantId, employeeTenantId)
      ))
      .orderBy(desc(skillsProgress.lastUpdated));

    // Calculate aggregate metrics
    const totalSkillsTracking = progressRecords.length;
    const averageProgress = totalSkillsTracking > 0
      ? Math.round(progressRecords.reduce((sum, record) => sum + (record.progressPercentage || 0), 0) / totalSkillsTracking)
      : 0;

    // Extract completed milestones
    const completedMilestones = progressRecords
      .flatMap(record => {
        const milestones = record.milestones as any[] || [];
        return milestones.map(m => ({
          ...m,
          skillName: record.skillName
        }));
      })
      .filter((milestone: any) => milestone.achievedAt);

    res.json({
      success: true,
      data: {
        employeeId,
        employeeName: employee[0].name || employee[0].email,
        totalSkillsTracking,
        averageProgress,
        skillsProgress: progressRecords,
        completedMilestones
      }
    });
  } catch (error: unknown) {
    console.error('Error fetching employee progress:', error);
    if (error instanceof Error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Failed to fetch progress' });
  }
});

/**
 * POST /api/skills/progress/:employeeId
 * Log/update skill improvement progress for an employee
 */
router.post('/progress/:employeeId', authenticate, async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const userTenantId = req.user!.tenantId;
    const userRole = req.user!.role;

    // Validation schema
    const ProgressSchema = z.object({
      skillName: z.string().min(1),
      currentLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
      targetLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
      progressPercentage: z.number().int().min(0).max(100),
      learningPathId: z.string().optional(),
      milestones: z.array(z.any()).optional()
    });

    const validatedData = ProgressSchema.parse(req.body);

    // Build query conditions - superadmins bypass tenant isolation
    const whereConditions = [eq(users.id, employeeId)];

    // Only enforce tenant isolation for non-superadmin users
    if (userRole !== 'superadmin') {
      whereConditions.push(eq(users.tenantId, userTenantId));
    }

    // Verify employee exists (and belongs to user's tenant if not superadmin)
    const employee = await db.select()
      .from(users)
      .where(and(...whereConditions))
      .limit(1);

    if (employee.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found or access denied'
      });
    }

    // Use employee's actual tenant ID for progress tracking
    const employeeTenantId = employee[0].tenantId;

    // Check if progress record already exists for this skill
    const existingProgress = await db.select()
      .from(skillsProgress)
      .where(and(
        eq(skillsProgress.employeeId, employeeId),
        eq(skillsProgress.tenantId, employeeTenantId),
        eq(skillsProgress.skillName, validatedData.skillName)
      ))
      .limit(1);

    let progressRecord;

    if (existingProgress.length > 0) {
      // Update existing record
      const [updated] = await db.update(skillsProgress)
        .set({
          currentLevel: validatedData.currentLevel,
          targetLevel: validatedData.targetLevel,
          progressPercentage: validatedData.progressPercentage,
          learningPathId: validatedData.learningPathId,
          milestones: validatedData.milestones as any,
          lastUpdated: new Date()
        })
        .where(eq(skillsProgress.id, existingProgress[0].id))
        .returning();

      progressRecord = updated;
    } else {
      // Create new progress record
      const [created] = await db.insert(skillsProgress)
        .values({
          tenantId: employeeTenantId,
          employeeId,
          skillId: randomUUID(), // Generate unique skill ID
          skillName: validatedData.skillName,
          currentLevel: validatedData.currentLevel,
          targetLevel: validatedData.targetLevel,
          progressPercentage: validatedData.progressPercentage,
          learningPathId: validatedData.learningPathId,
          milestones: validatedData.milestones as any
        })
        .returning();

      progressRecord = created;
    }

    res.json({
      success: true,
      data: progressRecord,
      message: existingProgress.length > 0 ? 'Progress updated successfully' : 'Progress logged successfully'
    });
  } catch (error: unknown) {
    console.error('Error logging progress:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid progress data', details: error.errors });
    }
    if (error instanceof Error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Failed to log progress' });
  }
});

/**
 * GET /api/skills/progress/department/:departmentId
 * Get aggregated skill progress for a department
 */
router.get('/progress/department/:departmentId', authenticate, authorize(['superadmin', 'clientAdmin']), async (req: Request, res: Response) => {
  try {
    const { departmentId } = req.params;
    const userTenantId = req.user!.tenantId;

    // Get all employees in this department
    const departmentEmployees = await db.select()
      .from(users)
      .where(and(
        eq(users.tenantId, userTenantId),
        eq(users.departmentId, departmentId)
      ));

    if (departmentEmployees.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Department not found or has no employees'
      });
    }

    // Query department name
    const department = await db.select()
      .from(departments)
      .where(and(
        eq(departments.id, departmentId),
        eq(departments.tenantId, userTenantId)
      ))
      .limit(1);

    const employeeIds = departmentEmployees.map(emp => emp.id);

    // Get all progress records for employees in this department
    const progressRecords = await db.select()
      .from(skillsProgress)
      .where(and(
        eq(skillsProgress.tenantId, userTenantId)
      ));

    // Filter by department employees
    const departmentProgress = progressRecords.filter(record =>
      employeeIds.includes(record.employeeId)
    );

    // Calculate department metrics
    const totalEmployees = departmentEmployees.length;
    const employeesWithProgress = new Set(departmentProgress.map(r => r.employeeId)).size;
    const averageDepartmentProgress = departmentProgress.length > 0
      ? Math.round(departmentProgress.reduce((sum, record) => sum + (record.progressPercentage || 0), 0) / departmentProgress.length)
      : 0;

    // Aggregate by skill
    const skillMap: Record<string, {
      skillName: string;
      totalProgress: number;
      employeeCount: number;
      levelCounts: Record<string, number>;
    }> = {};

    departmentProgress.forEach(record => {
      if (!skillMap[record.skillName]) {
        skillMap[record.skillName] = {
          skillName: record.skillName,
          totalProgress: 0,
          employeeCount: 0,
          levelCounts: { beginner: 0, intermediate: 0, advanced: 0, expert: 0 }
        };
      }
      skillMap[record.skillName].totalProgress += record.progressPercentage || 0;
      skillMap[record.skillName].employeeCount += 1;
      skillMap[record.skillName].levelCounts[record.currentLevel] =
        (skillMap[record.skillName].levelCounts[record.currentLevel] || 0) + 1;
    });

    // Format skill progression data
    const skillProgressionBySkill = Object.values(skillMap).map(skill => ({
      skillName: skill.skillName,
      averageProgressPercentage: Math.round(skill.totalProgress / skill.employeeCount),
      employeeCount: skill.employeeCount,
      levelDistribution: skill.levelCounts,
      averageCurrentLevel: Object.entries(skill.levelCounts)
        .reduce((max, [level, count]) => count > (skill.levelCounts[max] || 0) ? level : max, 'beginner')
    }));

    // Sort by employee count (most tracked skills first)
    skillProgressionBySkill.sort((a, b) => b.employeeCount - a.employeeCount);

    res.json({
      success: true,
      data: {
        departmentId,
        departmentName: department[0]?.name || 'Unknown Department',
        totalEmployees,
        employeesWithProgress,
        averageDepartmentProgress,
        skillProgressionBySkill
      }
    });
  } catch (error: unknown) {
    console.error('Error fetching department progress:', error);
    if (error instanceof Error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Failed to fetch department progress' });
  }
});

/**
 * POST /api/skills/report/generate
 * Generate skills gap analysis report in specified format
 */
router.post('/report/generate', authenticate, async (req: Request, res: Response) => {
  try {
    const userTenantId = req.user!.tenantId;
    const userId = req.user!.id;

    // Validation schema
    const ReportConfigSchema = z.object({
      reportType: z.enum(['organization', 'department']),
      departmentId: z.string().optional(),
      format: z.enum(['pdf', 'excel', 'csv'])
    });

    const config = ReportConfigSchema.parse(req.body);

    // Fetch analysis data based on report type
    let analysisData;
    if (config.reportType === 'organization') {
      analysisData = await skillsAgent.analyzeOrganizationSkills(userTenantId);
    } else if (config.reportType === 'department' && config.departmentId) {
      analysisData = await skillsAgent.analyzeDepartmentSkills(config.departmentId, userTenantId);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Department ID is required for department reports'
      });
    }

    // Prepare report data
    const reportData = {
      reportType: config.reportType,
      departmentName: config.reportType === 'department' ? 'Department' : undefined,
      totalEmployees: analysisData.totalEmployees || 0,
      assessedEmployees: analysisData.assessedEmployees || 0,
      criticalGaps: analysisData.criticalGaps || [],
      allGaps: analysisData.allGaps || [],
      bySeverity: analysisData.bySeverity || { critical: 0, high: 0, medium: 0, low: 0 },
      generatedAt: new Date(),
      generatedBy: userId
    };

    // Generate report in requested format
    let reportBuffer: Buffer | string;
    let contentType: string;
    let filename: string;

    if (config.format === 'pdf') {
      reportBuffer = await generateSkillsReportPDF(reportData);
      contentType = 'application/pdf';
      filename = `skills-gap-report-${Date.now()}.pdf`;
    } else if (config.format === 'excel') {
      reportBuffer = generateSkillsReportExcel(reportData);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      filename = `skills-gap-report-${Date.now()}.xlsx`;
    } else if (config.format === 'csv') {
      reportBuffer = generateSkillsReportCSV(reportData);
      contentType = 'text/csv';
      filename = `skills-gap-report-${Date.now()}.csv`;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid report format'
      });
    }

    // Set response headers for file download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Send the file
    res.send(reportBuffer);

  } catch (error: unknown) {
    console.error('Error generating report:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid report configuration', details: error.errors });
    }
    if (error instanceof Error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Failed to generate report' });
  }
});

/**
 * GET /api/skills/report/preview
 * Get report data without generating file (for preview)
 */
router.get('/report/preview', authenticate, async (req: Request, res: Response) => {
  try {
    const userTenantId = req.user!.tenantId;
    const { reportType, departmentId } = req.query;

    if (!reportType || (reportType !== 'organization' && reportType !== 'department')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid report type. Must be "organization" or "department"'
      });
    }

    // Fetch analysis data
    let analysisData;
    if (reportType === 'organization') {
      analysisData = await skillsAgent.analyzeOrganizationSkills(userTenantId);
    } else if (reportType === 'department') {
      if (!departmentId || typeof departmentId !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Department ID is required for department reports'
        });
      }
      analysisData = await skillsAgent.analyzeDepartmentSkills(departmentId, userTenantId);
    }

    // Return formatted data for preview
    res.json({
      success: true,
      data: {
        reportType,
        departmentId: reportType === 'department' ? departmentId : undefined,
        totalEmployees: analysisData.totalEmployees || 0,
        assessedEmployees: analysisData.assessedEmployees || 0,
        criticalGapsCount: (analysisData.criticalGaps || []).length,
        totalGapsCount: (analysisData.allGaps || []).length,
        bySeverity: analysisData.bySeverity || { critical: 0, high: 0, medium: 0, low: 0 },
        criticalGaps: (analysisData.criticalGaps || []).slice(0, 5), // Top 5 for preview
        topRecommendations: (analysisData.allGaps || [])
          .filter((gap: any) => gap.recommendations && gap.recommendations.length > 0)
          .slice(0, 5)
          .map((gap: any) => ({
            skillName: gap.skillName,
            recommendations: gap.recommendations
          }))
      }
    });

  } catch (error: unknown) {
    console.error('Error fetching report preview:', error);
    if (error instanceof Error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Failed to fetch report preview' });
  }
});

// ============================================================================
// LXP INTEGRATION ENDPOINTS - Phase 4.1
// ============================================================================

/**
 * POST /api/skills/lxp/completion
 * Handle LXP learning path completion and update skills profile
 * Called by LXP module when employee completes a learning path
 */
router.post('/lxp/completion', authenticate, async (req: Request, res: Response) => {
  try {
    // Validation schema
    const LXPCompletionSchema = z.object({
      employeeId: z.string().uuid(),
      tenantId: z.string().uuid(),
      learningExperienceId: z.string().uuid(),
      skillsAcquired: z.array(z.object({
        skillName: z.string(),
        skillCategory: z.string(),
        skillLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
        evidenceType: z.string(),
        validationStatus: z.enum(['pending', 'validated', 'not_validated', 'requires_review'])
      })),
      completionPercentage: z.number().min(0).max(100),
      totalScore: z.number().min(0)
    });

    const validatedData = LXPCompletionSchema.parse(req.body);

    // Verify tenant access
    if (req.user!.tenantId !== validatedData.tenantId && req.user!.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update skills for this tenant'
      });
    }

    // Call Skills Agent to handle completion (validatedData is guaranteed to have all required fields)
    const result = await skillsAgent.handleLXPCompletion(validatedData as {
      employeeId: string;
      tenantId: string;
      learningExperienceId: string;
      skillsAcquired: Array<{
        skillName: string;
        skillCategory: string;
        skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
        evidenceType: string;
        validationStatus: 'pending' | 'validated' | 'not_validated' | 'requires_review';
      }>;
      completionPercentage: number;
      totalScore: number;
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.message
      });
    }

    res.json({
      success: true,
      data: {
        profileUpdated: result.profileUpdated,
        skillsUpdated: result.skillsUpdated,
        message: result.message
      }
    });

  } catch (error: unknown) {
    console.error('Error handling LXP completion:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      });
    }
    if (error instanceof Error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Failed to handle LXP completion' });
  }
});

/**
 * GET /api/skills/lxp/triggers/:employeeId
 * Get pending LXP triggers for an employee
 * Used by LXP module to retrieve skill gaps and learning path recommendations
 */
router.get('/lxp/triggers/:employeeId', authenticate, async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const userTenantId = req.user!.tenantId;

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(employeeId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid employee ID format'
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
        error: 'Employee not found or not authorized'
      });
    }

    // Fetch pending LXP triggers for this employee
    const triggers = await db.select()
      .from(skillsLearningTriggers)
      .where(and(
        eq(skillsLearningTriggers.employeeId, employeeId),
        eq(skillsLearningTriggers.tenantId, userTenantId),
        eq(skillsLearningTriggers.status, 'pending')
      ))
      .orderBy(desc(skillsLearningTriggers.createdAt));

    res.json({
      success: true,
      data: {
        employeeId,
        employeeName: employee[0].name,
        triggers: triggers.map(trigger => ({
          id: trigger.id,
          sessionId: trigger.sessionId,
          skillGaps: trigger.skillGaps,
          learningPaths: trigger.learningPaths,
          priority: trigger.priority,
          createdAt: trigger.createdAt
        }))
      }
    });

  } catch (error: unknown) {
    console.error('Error fetching LXP triggers:', error);
    if (error instanceof Error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Failed to fetch LXP triggers' });
  }
});

/**
 * PUT /api/skills/lxp/triggers/:triggerId/status
 * Update LXP trigger status (for LXP module to mark as processing/completed)
 */
router.put('/lxp/triggers/:triggerId/status', authenticate, async (req: Request, res: Response) => {
  try {
    const { triggerId } = req.params;
    const { status, lxpPathId } = req.body;
    const userTenantId = req.user!.tenantId;

    // Validate inputs
    if (!status || !['pending', 'processing', 'completed', 'failed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be: pending, processing, completed, or failed'
      });
    }

    // Fetch trigger to verify tenant access
    const trigger = await db.select()
      .from(skillsLearningTriggers)
      .where(eq(skillsLearningTriggers.id, triggerId))
      .limit(1);

    if (trigger.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Trigger not found'
      });
    }

    if (trigger[0].tenantId !== userTenantId && req.user!.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this trigger'
      });
    }

    // Update trigger status
    await db.update(skillsLearningTriggers)
      .set({
        status,
        lxpPathId: lxpPathId || trigger[0].lxpPathId,
        processedAt: status === 'completed' || status === 'failed' ? new Date() : null
      })
      .where(eq(skillsLearningTriggers.id, triggerId));

    res.json({
      success: true,
      data: {
        triggerId,
        status,
        message: 'Trigger status updated successfully'
      }
    });

  } catch (error: unknown) {
    console.error('Error updating trigger status:', error);
    if (error instanceof Error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Failed to update trigger status' });
  }
});

export default router;