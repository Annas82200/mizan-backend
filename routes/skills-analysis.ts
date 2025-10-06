// server/routes/skills-analysis.ts

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import {
  employeeSkillsProfiles,
  strategySkillRequirements,
  skillsGapAnalysis,
  skillsReports
} from '../db/schema.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
// import { pdf as pdfParse } from 'pdf-parse'; // TODO: Fix PDF parsing - causes DOMMatrix error in Node
import mammoth from 'mammoth';

const router = Router();

// Configure multer for resume uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = './uploads/resumes';
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${randomUUID()}`;
    cb(null, `resume-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'));
    }
  }
});

/**
 * POST /api/skills/profile/upload-resume
 * Upload and parse resume
 */
router.post('/profile/upload-resume',
  authenticate,
  upload.single('resume'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No resume file uploaded'
        });
      }

      const employeeId = req.user!.id;
      const tenantId = req.user!.tenantId;

      // Extract text from resume
      const resumeText = await extractTextFromFile(req.file.path, req.file.mimetype);

      // Check if profile exists
      const existingProfile = await db.query.employeeSkillsProfiles.findFirst({
        where: and(
          eq(employeeSkillsProfiles.employeeId, employeeId),
          eq(employeeSkillsProfiles.tenantId, tenantId)
        )
      });

      if (existingProfile) {
        // Update existing profile
        await db.update(employeeSkillsProfiles)
          .set({
            profileType: existingProfile.profileType === 'manual_entry' ? 'hybrid' : 'resume_upload',
            resumeUrl: `/uploads/resumes/${req.file.filename}`,
            resumeFileName: req.file.originalname,
            resumeText,
            lastUpdated: new Date(),
            updatedAt: new Date()
          })
          .where(eq(employeeSkillsProfiles.id, existingProfile.id));

        // Trigger skills extraction
        await extractSkillsFromResume(existingProfile.id, resumeText, tenantId);

        return res.json({
          success: true,
          message: 'Resume uploaded and profile updated',
          profileId: existingProfile.id
        });
      } else {
        // Create new profile
        const [newProfile] = await db.insert(employeeSkillsProfiles)
          .values({
            tenantId,
            employeeId,
            profileType: 'resume_upload',
            resumeUrl: `/uploads/resumes/${req.file.filename}`,
            resumeFileName: req.file.originalname,
            resumeText,
            isComplete: false,
            completionPercentage: 30 // Resume uploaded but not fully parsed yet
          })
          .returning();

        // Trigger skills extraction
        await extractSkillsFromResume(newProfile.id, resumeText, tenantId);

        return res.json({
          success: true,
          message: 'Resume uploaded successfully',
          profileId: newProfile.id
        });
      }

    } catch (error: any) {
      console.error('Resume upload error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to upload resume'
      });
    }
  }
);

/**
 * POST /api/skills/profile/start-conversation
 * Start conversational profile building with HOT
 */
router.post('/profile/start-conversation', authenticate, async (req: Request, res: Response) => {
  try {
    const employeeId = req.user!.id;
    const tenantId = req.user!.tenantId;

    // Get existing profile if any
    const existingProfile = await db.query.employeeSkillsProfiles.findFirst({
      where: and(
        eq(employeeSkillsProfiles.employeeId, employeeId),
        eq(employeeSkillsProfiles.tenantId, tenantId)
      )
    });

    // Initialize Profile Builder HOT
    const { ProfileBuilderHOT } = await import('../services/agents/profile-builder-hot.js');
    const hot = new ProfileBuilderHOT();

    const conversation = await hot.startConversation(employeeId, tenantId, existingProfile);

    return res.json({
      success: true,
      conversation: {
        message: conversation.message,
        suggestions: conversation.suggestions,
        nextSteps: conversation.nextSteps
      },
      profileStatus: {
        exists: !!existingProfile,
        completionPercentage: existingProfile?.completionPercentage || 0
      }
    });

  } catch (error: any) {
    console.error('Start conversation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to start profile building conversation'
    });
  }
});

/**
 * POST /api/skills/profile/chat
 * Send message to HOT for conversational profile building
 */
router.post('/profile/chat', authenticate, async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      message: z.string().min(1),
      conversationHistory: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        message: z.string()
      })).optional(),
      currentSection: z.enum(['experience', 'education', 'skills', 'certifications', 'projects']).optional()
    });

    const { message, conversationHistory, currentSection } = schema.parse(req.body);
    const employeeId = req.user!.id;
    const tenantId = req.user!.tenantId;

    // Get current profile
    const currentProfile = await db.query.employeeSkillsProfiles.findFirst({
      where: and(
        eq(employeeSkillsProfiles.employeeId, employeeId),
        eq(employeeSkillsProfiles.tenantId, tenantId)
      )
    });

    // Initialize HOT
    const { ProfileBuilderHOT } = await import('../services/agents/profile-builder-hot.js');
    const hot = new ProfileBuilderHOT();

    // Process message
    const result = await hot.processMessage(
      {
        employeeId,
        tenantId,
        currentProfile: currentProfile || {},
        conversationHistory: conversationHistory || [],
        currentSection
      },
      message
    );

    // Update profile if HOT extracted new data
    if (result.profileUpdate && Object.keys(result.profileUpdate).length > 0) {
      if (currentProfile) {
        // Update existing profile
        await db.update(employeeSkillsProfiles)
          .set({
            ...result.profileUpdate,
            lastUpdated: new Date(),
            updatedAt: new Date()
          })
          .where(eq(employeeSkillsProfiles.id, currentProfile.id));
      } else {
        // Create new profile
        await db.insert(employeeSkillsProfiles)
          .values({
            tenantId,
            employeeId,
            profileType: 'manual_entry',
            ...result.profileUpdate,
            completionPercentage: 10, // Started
            isComplete: false
          });
      }
    }

    return res.json({
      success: true,
      response: result.response,
      extractedData: result.extractedData,
      suggestions: result.suggestions,
      sectionComplete: result.sectionComplete,
      nextSection: result.nextSection
    });

  } catch (error: any) {
    console.error('Chat error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid message data',
        details: error.errors
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Failed to process message'
    });
  }
});

/**
 * GET /api/skills/profile/suggestions
 * Get HOT suggestions for improving profile
 */
router.get('/profile/suggestions', authenticate, async (req: Request, res: Response) => {
  try {
    const employeeId = req.user!.id;
    const tenantId = req.user!.tenantId;

    const currentProfile = await db.query.employeeSkillsProfiles.findFirst({
      where: and(
        eq(employeeSkillsProfiles.employeeId, employeeId),
        eq(employeeSkillsProfiles.tenantId, tenantId)
      )
    });

    if (!currentProfile) {
      return res.json({
        success: true,
        suggestions: {
          missing: ['experience', 'education', 'skills', 'certifications', 'projects'],
          completionTips: [
            "Start by adding your current work experience",
            "Include your education background",
            "List your technical and soft skills"
          ]
        }
      });
    }

    const { ProfileBuilderHOT } = await import('../services/agents/profile-builder-hot.js');
    const hot = new ProfileBuilderHOT();

    const suggestions = await hot.suggestImprovements(currentProfile);

    return res.json({
      success: true,
      suggestions
    });

  } catch (error) {
    console.error('Suggestions error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get suggestions'
    });
  }
});

/**
 * GET /api/skills/profile/progress
 * Get progress summary from HOT
 */
router.get('/profile/progress', authenticate, async (req: Request, res: Response) => {
  try {
    const employeeId = req.user!.id;
    const tenantId = req.user!.tenantId;

    const currentProfile = await db.query.employeeSkillsProfiles.findFirst({
      where: and(
        eq(employeeSkillsProfiles.employeeId, employeeId),
        eq(employeeSkillsProfiles.tenantId, tenantId)
      )
    });

    if (!currentProfile) {
      return res.json({
        success: true,
        progress: {
          summary: "You haven't started your profile yet. Let's begin!",
          completed: [],
          pending: ['experience', 'education', 'skills', 'certifications', 'projects'],
          nextRecommendation: "Start by telling me about your current role and responsibilities.",
          completionPercentage: 0
        }
      });
    }

    const { ProfileBuilderHOT } = await import('../services/agents/profile-builder-hot.js');
    const hot = new ProfileBuilderHOT();

    const progress = await hot.generateProgressSummary(currentProfile);

    return res.json({
      success: true,
      progress: {
        ...progress,
        completionPercentage: currentProfile.completionPercentage || 0
      }
    });

  } catch (error) {
    console.error('Progress error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get progress'
    });
  }
});

/**
 * POST /api/skills/profile/create-manual
 * Create or update skills profile manually (direct data entry, no HOT)
 */
router.post('/profile/create-manual', authenticate, async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      currentExperience: z.array(z.object({
        company: z.string(),
        role: z.string(),
        startDate: z.string(),
        endDate: z.string().optional(),
        description: z.string().optional(),
        achievements: z.array(z.string()).optional()
      })).optional(),
      pastExperience: z.array(z.object({
        company: z.string(),
        role: z.string(),
        duration: z.string(),
        description: z.string().optional()
      })).optional(),
      education: z.array(z.object({
        degree: z.string(),
        institution: z.string(),
        year: z.string(),
        field: z.string().optional()
      })).optional(),
      certifications: z.array(z.object({
        name: z.string(),
        issuer: z.string(),
        date: z.string(),
        expiryDate: z.string().optional()
      })).optional(),
      projects: z.array(z.object({
        name: z.string(),
        description: z.string(),
        role: z.string().optional(),
        technologies: z.array(z.string()).optional()
      })).optional(),
      technicalSkills: z.array(z.object({
        skill: z.string(),
        proficiency: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
        yearsExperience: z.number().optional()
      })).optional(),
      softSkills: z.array(z.string()).optional(),
      languages: z.array(z.object({
        language: z.string(),
        proficiency: z.string()
      })).optional()
    });

    const data = schema.parse(req.body);
    const employeeId = req.user!.id;
    const tenantId = req.user!.tenantId;

    // Check if profile exists
    const existingProfile = await db.query.employeeSkillsProfiles.findFirst({
      where: and(
        eq(employeeSkillsProfiles.employeeId, employeeId),
        eq(employeeSkillsProfiles.tenantId, tenantId)
      )
    });

    // Calculate completion percentage
    const completionPercentage = calculateProfileCompletion(data);

    if (existingProfile) {
      // Update existing profile
      await db.update(employeeSkillsProfiles)
        .set({
          profileType: existingProfile.profileType === 'resume_upload' ? 'hybrid' : 'manual_entry',
          currentExperience: data.currentExperience,
          pastExperience: data.pastExperience,
          education: data.education,
          certifications: data.certifications,
          projects: data.projects,
          technicalSkills: data.technicalSkills,
          softSkills: data.softSkills,
          languages: data.languages,
          completionPercentage,
          isComplete: completionPercentage === 100,
          lastUpdated: new Date(),
          updatedAt: new Date()
        })
        .where(eq(employeeSkillsProfiles.id, existingProfile.id));

      return res.json({
        success: true,
        message: 'Skills profile updated',
        profileId: existingProfile.id,
        completionPercentage
      });
    } else {
      // Create new profile
      const [newProfile] = await db.insert(employeeSkillsProfiles)
        .values({
          tenantId,
          employeeId,
          profileType: 'manual_entry',
          currentExperience: data.currentExperience,
          pastExperience: data.pastExperience,
          education: data.education,
          certifications: data.certifications,
          projects: data.projects,
          technicalSkills: data.technicalSkills,
          softSkills: data.softSkills,
          languages: data.languages,
          completionPercentage,
          isComplete: completionPercentage === 100
        })
        .returning();

      return res.json({
        success: true,
        message: 'Skills profile created',
        profileId: newProfile.id,
        completionPercentage
      });
    }

  } catch (error: any) {
    console.error('Manual profile creation error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid profile data',
        details: error.errors
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Failed to create/update profile'
    });
  }
});

/**
 * GET /api/skills/profile/me
 * Get current user's skills profile
 */
router.get('/profile/me', authenticate, async (req: Request, res: Response) => {
  try {
    const employeeId = req.user!.id;
    const tenantId = req.user!.tenantId;

    const profile = await db.query.employeeSkillsProfiles.findFirst({
      where: and(
        eq(employeeSkillsProfiles.employeeId, employeeId),
        eq(employeeSkillsProfiles.tenantId, tenantId)
      )
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'No skills profile found. Please create one.'
      });
    }

    return res.json({
      success: true,
      profile
    });

  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
});

/**
 * POST /api/skills/strategy/map-required-skills
 * Map strategy to required skills (admin only)
 */
router.post('/strategy/map-required-skills',
  authenticate,
  authorize(['clientAdmin', 'superadmin']),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;

      // Get tenant's strategy
      const { companyStrategies } = await import('../db/schema.js');
      const strategy = await db.query.companyStrategies.findFirst({
        where: eq(companyStrategies.tenantId, tenantId)
      });

      if (!strategy) {
        return res.status(404).json({
          success: false,
          error: 'No strategy found. Please create a strategy first.'
        });
      }

      // Use Skills Agent to map strategy to required skills
      const { SkillsAgent } = await import('../services/agents/skills-agent.js');
      const skillsAgent = new SkillsAgent();

      const skillRequirements = await skillsAgent.mapStrategyToRequiredSkills(tenantId, strategy);

      // Store skill requirements
      const [saved] = await db.insert(strategySkillRequirements)
        .values({
          tenantId,
          strategyId: strategy.id,
          organizationalSkills: skillRequirements.organizationalSkills,
          departmentalSkills: skillRequirements.departmentalSkills,
          roleSkills: skillRequirements.roleSkills,
          criticalSkills: skillRequirements.criticalSkills,
          importantSkills: skillRequirements.importantSkills,
          niceToHaveSkills: skillRequirements.niceToHaveSkills,
          currentNeeds: skillRequirements.criticalSkills,
          futureNeeds: [...skillRequirements.importantSkills, ...skillRequirements.niceToHaveSkills]
        })
        .returning();

      return res.json({
        success: true,
        message: 'Strategy skills requirements mapped successfully',
        requirements: saved
      });

    } catch (error: any) {
      console.error('Strategy mapping error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to map strategy to skills'
      });
    }
  }
);

/**
 * POST /api/skills/gap-analysis/analyze
 * Perform skill gap analysis for an employee
 */
router.post('/gap-analysis/analyze',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const employeeId = req.user!.id;
      const tenantId = req.user!.tenantId;

      // Get employee's skills profile
      const profile = await db.query.employeeSkillsProfiles.findFirst({
        where: and(
          eq(employeeSkillsProfiles.employeeId, employeeId),
          eq(employeeSkillsProfiles.tenantId, tenantId)
        )
      });

      if (!profile) {
        return res.status(404).json({
          success: false,
          error: 'No skills profile found. Please create one first.'
        });
      }

      // Get strategy skill requirements
      const requirements = await db.query.strategySkillRequirements.findFirst({
        where: eq(strategySkillRequirements.tenantId, tenantId),
        orderBy: (reqs: any, { desc }: any) => [desc(reqs.createdAt)]
      });

      if (!requirements) {
        return res.status(404).json({
          success: false,
          error: 'No skill requirements found. Admin needs to map strategy to skills first.'
        });
      }

      // Get user's department and role (from request or user profile)
      const { department, role } = req.body as { department?: string; role?: string };

      const departmentSkills = department && (requirements.departmentalSkills as any)[department]
        ? (requirements.departmentalSkills as any)[department]
        : [];

      const roleSkills = role && (requirements.roleSkills as any)[role]
        ? (requirements.roleSkills as any)[role]
        : [];

      // Use Skills Agent to perform gap analysis
      const { SkillsAgent } = await import('../services/agents/skills-agent.js');
      const skillsAgent = new SkillsAgent();

      const gapAnalysis = await skillsAgent.performSkillGapAnalysis(
        profile,
        requirements,
        departmentSkills,
        roleSkills
      );

      // Store gap analysis results
      const [saved] = await db.insert(skillsGapAnalysis)
        .values({
          tenantId,
          employeeId,
          profileId: profile.id,
          analysisType: 'individual',
          criticalGaps: gapAnalysis.criticalGaps,
          moderateGaps: gapAnalysis.moderateGaps,
          strengthAreas: gapAnalysis.strengthAreas,
          trainingRecommendations: gapAnalysis.trainingRecommendations,
          overallSkillScore: gapAnalysis.overallScore,
          strategicAlignmentScore: gapAnalysis.strategicAlignmentScore,
          readinessScore: gapAnalysis.readinessScore
        })
        .returning();

      // Create LXP triggers if there are critical gaps
      if (gapAnalysis.criticalGaps.length > 0) {
        await createSkillGapTriggers(employeeId, tenantId, saved.id, gapAnalysis);
      }

      return res.json({
        success: true,
        message: 'Skill gap analysis completed',
        analysis: {
          ...gapAnalysis,
          analysisId: saved.id
        }
      });

    } catch (error: any) {
      console.error('Gap analysis error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to perform gap analysis'
      });
    }
  }
);

/**
 * GET /api/skills/gap-analysis/me
 * Get my latest gap analysis
 */
router.get('/gap-analysis/me', authenticate, async (req: Request, res: Response) => {
  try {
    const employeeId = req.user!.id;
    const tenantId = req.user!.tenantId;

    const analysis = await db.query.skillsGapAnalysis.findFirst({
      where: and(
        eq(skillsGapAnalysis.employeeId, employeeId),
        eq(skillsGapAnalysis.tenantId, tenantId)
      ),
      orderBy: (analyses: any, { desc }: any) => [desc(analyses.createdAt)]
    });

    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: 'No gap analysis found. Please perform analysis first.'
      });
    }

    return res.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Get gap analysis error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch gap analysis'
    });
  }
});

/**
 * GET /api/skills/report/employee/:employeeId
 * Generate employee skills report
 */
router.get('/report/employee/:employeeId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { employeeId } = req.params;
      const tenantId = req.user!.tenantId;

      // Check permissions - only self or admin can view
      if (req.user!.id !== employeeId && !['clientAdmin', 'superadmin'].includes(req.user!.role)) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to view this report'
        });
      }

      const report = await generateEmployeeSkillsReport(employeeId, tenantId);

      return res.json({
        success: true,
        report
      });

    } catch (error: any) {
      console.error('Employee report error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate employee report'
      });
    }
  }
);

/**
 * GET /api/skills/report/department/:departmentId
 * Generate department skills report (admin only)
 */
router.get('/report/department/:departmentId',
  authenticate,
  authorize(['clientAdmin', 'superadmin']),
  async (req: Request, res: Response) => {
    try {
      const { departmentId } = req.params;
      const tenantId = req.user!.tenantId;

      const report = await generateDepartmentSkillsReport(departmentId, tenantId);

      return res.json({
        success: true,
        report
      });

    } catch (error: any) {
      console.error('Department report error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate department report'
      });
    }
  }
);

/**
 * GET /api/skills/report/organization
 * Generate organization-wide skills report (admin only)
 */
router.get('/report/organization',
  authenticate,
  authorize(['clientAdmin', 'superadmin']),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;

      const report = await generateOrganizationSkillsReport(tenantId);

      return res.json({
        success: true,
        report
      });

    } catch (error: any) {
      console.error('Organization report error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate organization report'
      });
    }
  }
);

/**
 * Helper Functions
 */

// Create LXP triggers for skill gaps
async function createSkillGapTriggers(
  employeeId: string,
  tenantId: string,
  analysisId: string,
  gapAnalysis: any
): Promise<void> {
  try {
    const { triggers } = await import('../db/schema.js');

    const triggersToCreate = [];

    // Create trigger for critical gaps
    if (gapAnalysis.criticalGaps.length > 0) {
      triggersToCreate.push({
        tenantId,
        name: `Critical Skill Gaps - ${employeeId}`,
        description: `Employee has ${gapAnalysis.criticalGaps.length} critical skill gaps`,
        type: 'event_based',
        sourceModule: 'skills',
        eventType: 'skill_gaps_critical',
        conditions: {
          source: 'skills_gap_analysis',
          analysisId,
          gapCount: gapAnalysis.criticalGaps.length,
          gaps: gapAnalysis.criticalGaps.map((g: any) => g.skill)
        },
        targetModule: 'lxp',
        action: 'assign_skill_training',
        actionConfig: {
          employeeId,
          criticalGaps: gapAnalysis.criticalGaps,
          trainingRecommendations: gapAnalysis.trainingRecommendations.filter((t: any) => t.priority === 'immediate')
        },
        isActive: true,
        priority: 10, // Highest priority
        triggerCount: 0,
        successCount: 0,
        failureCount: 0,
        metadata: { employeeId, analysisId }
      });
    }

    // Create trigger for moderate gaps
    if (gapAnalysis.moderateGaps.length > 0) {
      triggersToCreate.push({
        tenantId,
        name: `Skill Development - ${employeeId}`,
        description: `Employee has ${gapAnalysis.moderateGaps.length} areas for development`,
        type: 'event_based',
        sourceModule: 'skills',
        eventType: 'employee_skill_gap',
        conditions: {
          source: 'skills_gap_analysis',
          analysisId,
          gapCount: gapAnalysis.moderateGaps.length,
          gaps: gapAnalysis.moderateGaps.map((g: any) => g.skill)
        },
        targetModule: 'lxp',
        action: 'create_development_plan',
        actionConfig: {
          employeeId,
          moderateGaps: gapAnalysis.moderateGaps,
          trainingRecommendations: gapAnalysis.trainingRecommendations.filter((t: any) => t.priority === 'short-term')
        },
        isActive: true,
        priority: 7,
        triggerCount: 0,
        successCount: 0,
        failureCount: 0,
        metadata: { employeeId, analysisId }
      });
    }

    if (triggersToCreate.length > 0) {
      await db.insert(triggers).values(triggersToCreate);
      console.log(`✅ Created ${triggersToCreate.length} skill gap triggers for employee ${employeeId}`);
    }

  } catch (error) {
    console.error('Error creating skill gap triggers:', error);
    // Don't throw - trigger creation failure shouldn't block gap analysis
  }
}

/**
 * Helper Functions
 */

// Extract text from uploaded file
async function extractTextFromFile(filePath: string, mimeType: string): Promise<string> {
  try {
    // Plain text files
    if (mimeType === 'text/plain') {
      return await fs.readFile(filePath, 'utf-8');
    }

    // PDF files - TEMPORARILY DISABLED due to DOMMatrix error
    if (mimeType === 'application/pdf' || filePath.toLowerCase().endsWith('.pdf')) {
      // TODO: Fix PDF parsing - use alternative library or canvas polyfill
      throw new Error('PDF parsing temporarily unavailable. Please upload DOCX or TXT instead.');
      // const dataBuffer = await fs.readFile(filePath);
      // const data = await pdfParse(dataBuffer);
      // return data.text;
    }

    // DOCX files
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        filePath.toLowerCase().endsWith('.docx')) {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    }

    // DOC files (older Word format)
    if (mimeType === 'application/msword' || filePath.toLowerCase().endsWith('.doc')) {
      // For .doc files, try mammoth as fallback (works for some .doc files)
      try {
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
      } catch (docError) {
        console.warn('Could not parse .doc file, returning placeholder');
        return '[.doc file format not fully supported - please upload as .docx or PDF]';
      }
    }

    // Unsupported format
    console.warn(`Unsupported file type: ${mimeType}`);
    return `[Unsupported file format: ${mimeType}. Please upload PDF, DOCX, or TXT]`;

  } catch (error) {
    console.error('Text extraction error:', error);
    return '[Failed to extract text from file]';
  }
}

// Extract skills from resume text using Skills Agent
async function extractSkillsFromResume(
  profileId: string,
  resumeText: string,
  tenantId: string
): Promise<void> {
  try {
    console.log(`[Skills Extraction] Starting extraction for profile ${profileId}`);

    // Import Skills Agent
    const { SkillsAgent } = await import('../services/agents/skills-agent.js');
    const skillsAgent = new SkillsAgent();

    // Extract skills using AI
    const extracted = await skillsAgent.extractSkillsFromResume(resumeText);

    // Update profile with extracted skills
    const { employeeSkillsProfiles } = await import('../db/schema.js');

    await db.update(employeeSkillsProfiles)
      .set({
        technicalSkills: extracted.technicalSkills,
        softSkills: extracted.softSkills,
        domainKnowledge: extracted.domainKnowledge,
        tools: extracted.tools,
        languages: extracted.languages,
        currentExperience: extracted.experience.filter((exp: any) => !exp.endDate || exp.endDate === 'Present'),
        pastExperience: extracted.experience.filter((exp: any) => exp.endDate && exp.endDate !== 'Present'),
        education: extracted.education,
        certifications: extracted.certifications,
        completionPercentage: 80, // Mostly complete after extraction
        isComplete: true,
        lastUpdated: new Date(),
        updatedAt: new Date()
      })
      .where(eq(employeeSkillsProfiles.id, profileId));

    console.log(`✅ Skills extraction completed for profile ${profileId}`);
  } catch (error) {
    console.error('[Skills Extraction] Error:', error);
    // Don't throw - extraction failure shouldn't block resume upload
  }
}

// Calculate profile completion percentage
function calculateProfileCompletion(data: any): number {
  const sections = [
    'currentExperience',
    'education',
    'technicalSkills',
    'softSkills',
    'certifications',
    'projects',
    'languages'
  ];

  let completed = 0;
  sections.forEach(section => {
    if (data[section] && Array.isArray(data[section]) && data[section].length > 0) {
      completed++;
    }
  });

  return Math.round((completed / sections.length) * 100);
}

// Generate employee skills report
async function generateEmployeeSkillsReport(employeeId: string, tenantId: string): Promise<any> {
  // Get employee profile
  const profile = await db.query.employeeSkillsProfiles.findFirst({
    where: and(
      eq(employeeSkillsProfiles.employeeId, employeeId),
      eq(employeeSkillsProfiles.tenantId, tenantId)
    )
  });

  if (!profile) {
    throw new Error('No skills profile found for this employee');
  }

  // Get gap analysis
  const gapAnalysis = await db.query.skillsGapAnalysis.findFirst({
    where: and(
      eq(skillsGapAnalysis.employeeId, employeeId),
      eq(skillsGapAnalysis.tenantId, tenantId)
    ),
    orderBy: (analyses: any, { desc }: any) => [desc(analyses.createdAt)]
  });

  // Get strategy requirements
  const requirements = await db.query.strategySkillRequirements.findFirst({
    where: eq(strategySkillRequirements.tenantId, tenantId),
    orderBy: (reqs: any, { desc }: any) => [desc(reqs.createdAt)]
  });

  const report = {
    employeeId,
    generatedAt: new Date(),
    profileCompletion: profile.completionPercentage,

    currentSkills: {
      technical: profile.technicalSkills || [],
      soft: profile.softSkills || [],
      domain: profile.domainKnowledge || [],
      tools: profile.tools || [],
      languages: profile.languages || []
    },

    experience: {
      current: profile.currentExperience || [],
      past: profile.pastExperience || [],
      education: profile.education || [],
      certifications: profile.certifications || []
    },

    gapAnalysis: gapAnalysis ? {
      criticalGaps: gapAnalysis.criticalGaps || [],
      moderateGaps: gapAnalysis.moderateGaps || [],
      strengthAreas: gapAnalysis.strengthAreas || [],
      trainingRecommendations: gapAnalysis.trainingRecommendations || [],
      scores: {
        overall: gapAnalysis.overallSkillScore,
        strategicAlignment: gapAnalysis.strategicAlignmentScore,
        roleReadiness: gapAnalysis.readinessScore
      }
    } : null,

    strategyAlignment: requirements ? {
      criticalSkillsMet: calculateSkillsMet(profile, requirements.criticalSkills as string[] || []),
      importantSkillsMet: calculateSkillsMet(profile, requirements.importantSkills as string[] || []),
      readinessForStrategy: gapAnalysis?.strategicAlignmentScore || 0
    } : null,

    recommendations: gapAnalysis?.trainingRecommendations || [],

    summary: {
      totalSkills: (profile.technicalSkills as any[] || []).length + (profile.softSkills as any[] || []).length,
      criticalGapsCount: (gapAnalysis?.criticalGaps as any[] || []).length,
      overallScore: gapAnalysis?.overallSkillScore || 0,
      status: gapAnalysis && (gapAnalysis.overallSkillScore || 0) >= 80 ? 'Highly Skilled' :
              gapAnalysis && (gapAnalysis.overallSkillScore || 0) >= 60 ? 'Competent' :
              gapAnalysis && (gapAnalysis.overallSkillScore || 0) >= 40 ? 'Developing' : 'Needs Development'
    }
  };

  // Store report
  await db.insert(skillsReports).values({
    tenantId,
    reportType: 'individual',
    targetId: employeeId,
    reportData: report
  });

  return report;
}

// Generate department skills report
async function generateDepartmentSkillsReport(departmentId: string, tenantId: string): Promise<any> {
  // Get all employees in department
  const { users } = await import('../db/schema.js');
  const employees = await db.query.users.findMany({
    where: and(
      eq(users.tenantId, tenantId),
      eq(users.departmentId, departmentId)
    )
  });

  if (employees.length === 0) {
    throw new Error('No employees found in this department');
  }

  // Get all profiles for department employees
  const profiles = await db.query.employeeSkillsProfiles.findMany({
    where: and(
      eq(employeeSkillsProfiles.tenantId, tenantId)
    )
  });

  const deptProfiles = profiles.filter(p =>
    employees.some(e => e.id === p.employeeId)
  );

  // Get all gap analyses for department
  const analyses = await db.query.skillsGapAnalysis.findMany({
    where: eq(skillsGapAnalysis.tenantId, tenantId)
  });

  const deptAnalyses = analyses.filter(a =>
    employees.some(e => e.id === a.employeeId)
  );

  // Aggregate skills
  const aggregatedSkills = aggregateSkills(deptProfiles);
  const aggregatedGaps = aggregateGaps(deptAnalyses);

  // Get strategy requirements
  const requirements = await db.query.strategySkillRequirements.findFirst({
    where: eq(strategySkillRequirements.tenantId, tenantId),
    orderBy: (reqs: any, { desc }: any) => [desc(reqs.createdAt)]
  });

  const deptRequirements = requirements && (requirements.departmentalSkills as any)[departmentId]
    ? (requirements.departmentalSkills as any)[departmentId]
    : [];

  const report = {
    departmentId,
    generatedAt: new Date(),
    employeeCount: employees.length,

    skillInventory: {
      totalUniqueSkills: aggregatedSkills.uniqueSkills.length,
      topSkills: aggregatedSkills.topSkills.slice(0, 10),
      skillCoverage: aggregatedSkills.coverage,
      proficiencyDistribution: aggregatedSkills.proficiencyDistribution
    },

    gapAnalysis: {
      criticalGapsAcrossDept: aggregatedGaps.criticalGaps.slice(0, 10),
      commonGaps: aggregatedGaps.commonGaps.slice(0, 10),
      averageScores: {
        overall: aggregatedGaps.avgOverallScore,
        strategicAlignment: aggregatedGaps.avgStrategicAlignment,
        roleReadiness: aggregatedGaps.avgReadiness
      }
    },

    departmentRequirements: {
      required: deptRequirements,
      met: deptRequirements.filter((skill: string) =>
        aggregatedSkills.uniqueSkills.includes(skill.toLowerCase())
      ).length,
      coverage: deptRequirements.length > 0
        ? Math.round((deptRequirements.filter((skill: string) =>
            aggregatedSkills.uniqueSkills.includes(skill.toLowerCase())
          ).length / deptRequirements.length) * 100)
        : 100
    },

    recommendations: generateDepartmentRecommendations(aggregatedGaps, deptRequirements),

    employeeBreakdown: deptAnalyses.map(analysis => ({
      employeeId: analysis.employeeId,
      overallScore: analysis.overallSkillScore,
      criticalGapsCount: (analysis.criticalGaps as any[] || []).length,
      status: (analysis.overallSkillScore || 0) >= 80 ? 'High Performer' :
              (analysis.overallSkillScore || 0) >= 60 ? 'Competent' : 'Needs Development'
    }))
  };

  // Store report
  await db.insert(skillsReports).values({
    tenantId,
    reportType: 'department',
    targetId: departmentId,
    reportData: report
  });

  return report;
}

// Generate organization-wide skills report
async function generateOrganizationSkillsReport(tenantId: string): Promise<any> {
  // Get all profiles
  const profiles = await db.query.employeeSkillsProfiles.findMany({
    where: eq(employeeSkillsProfiles.tenantId, tenantId)
  });

  // Get all gap analyses
  const analyses = await db.query.skillsGapAnalysis.findMany({
    where: eq(skillsGapAnalysis.tenantId, tenantId)
  });

  // Aggregate organization-wide
  const aggregatedSkills = aggregateSkills(profiles);
  const aggregatedGaps = aggregateGaps(analyses);

  // Get strategy requirements
  const requirements = await db.query.strategySkillRequirements.findFirst({
    where: eq(strategySkillRequirements.tenantId, tenantId),
    orderBy: (reqs: any, { desc }: any) => [desc(reqs.createdAt)]
  });

  // Department breakdown
  const { users } = await import('../db/schema.js');
  const allEmployees = await db.query.users.findMany({
    where: eq(users.tenantId, tenantId)
  });

  const departments = [...new Set(allEmployees.map(e => e.departmentId).filter(Boolean))];
  const departmentBreakdown = await Promise.all(
    departments.map(async dept => {
      const deptEmployees = allEmployees.filter(e => e.departmentId === dept);
      const deptAnalyses = analyses.filter(a =>
        deptEmployees.some(e => e.id === a.employeeId)
      );

      const avgScore = deptAnalyses.length > 0
        ? deptAnalyses.reduce((sum, a) => sum + (a.overallSkillScore || 0), 0) / deptAnalyses.length
        : 0;

      return {
        department: dept,
        employeeCount: deptEmployees.length,
        averageSkillScore: Math.round(avgScore),
        criticalGapsCount: deptAnalyses.reduce((sum, a) =>
          sum + (a.criticalGaps as any[] || []).length, 0
        )
      };
    })
  );

  const report = {
    tenantId,
    generatedAt: new Date(),
    totalEmployees: profiles.length,

    organizationSkillInventory: {
      totalUniqueSkills: aggregatedSkills.uniqueSkills.length,
      topSkills: aggregatedSkills.topSkills.slice(0, 20),
      skillCoverage: aggregatedSkills.coverage,
      proficiencyDistribution: aggregatedSkills.proficiencyDistribution
    },

    organizationGapAnalysis: {
      criticalGapsAcrossOrg: aggregatedGaps.criticalGaps.slice(0, 15),
      commonGaps: aggregatedGaps.commonGaps.slice(0, 15),
      averageScores: {
        overall: aggregatedGaps.avgOverallScore,
        strategicAlignment: aggregatedGaps.avgStrategicAlignment,
        roleReadiness: aggregatedGaps.avgReadiness
      }
    },

    strategyAlignment: requirements ? {
      criticalSkills: requirements.criticalSkills,
      criticalSkillsCoverage: calculateOrganizationSkillsCoverage(
        aggregatedSkills,
        requirements.criticalSkills as string[] || []
      ),
      importantSkills: requirements.importantSkills,
      importantSkillsCoverage: calculateOrganizationSkillsCoverage(
        aggregatedSkills,
        requirements.importantSkills as string[] || []
      ),
      organizationReadiness: aggregatedGaps.avgStrategicAlignment
    } : null,

    departmentBreakdown,

    recommendations: generateOrganizationRecommendations(aggregatedGaps, requirements),

    summary: {
      organizationSkillHealth: aggregatedGaps.avgOverallScore >= 70 ? 'Healthy' :
                               aggregatedGaps.avgOverallScore >= 50 ? 'Developing' : 'Needs Attention',
      topPriorities: aggregatedGaps.criticalGaps.slice(0, 5).map((gap: any) => gap.skill),
      estimatedTrainingNeeded: analyses.reduce((sum, a) =>
        sum + (a.trainingRecommendations as any[] || []).length, 0
      )
    }
  };

  // Store report
  await db.insert(skillsReports).values({
    tenantId,
    reportType: 'company',
    targetId: tenantId,
    reportData: report
  });

  return report;
}

// Helper: Calculate skills met
function calculateSkillsMet(profile: any, requiredSkills: string[]): number {
  const currentSkills = [
    ...(profile.technicalSkills || []).map((s: any) => s.skill.toLowerCase()),
    ...(profile.softSkills || []).map((s: string) => s.toLowerCase())
  ];

  const met = requiredSkills.filter(skill =>
    currentSkills.some(cs => cs.includes(skill.toLowerCase()) || skill.toLowerCase().includes(cs))
  ).length;

  return requiredSkills.length > 0 ? Math.round((met / requiredSkills.length) * 100) : 100;
}

// Helper: Aggregate skills across profiles
function aggregateSkills(profiles: any[]): any {
  const skillCounts: { [skill: string]: { count: number; proficiencies: string[] } } = {};

  profiles.forEach(profile => {
    (profile.technicalSkills || []).forEach((skill: any) => {
      const skillName = skill.skill.toLowerCase();
      if (!skillCounts[skillName]) {
        skillCounts[skillName] = { count: 0, proficiencies: [] };
      }
      skillCounts[skillName].count++;
      if (skill.proficiency) {
        skillCounts[skillName].proficiencies.push(skill.proficiency);
      }
    });

    (profile.softSkills || []).forEach((skill: string) => {
      const skillName = skill.toLowerCase();
      if (!skillCounts[skillName]) {
        skillCounts[skillName] = { count: 0, proficiencies: [] };
      }
      skillCounts[skillName].count++;
    });
  });

  const topSkills = Object.entries(skillCounts)
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([skill, data]) => ({
      skill,
      employeeCount: data.count,
      coverage: Math.round((data.count / profiles.length) * 100)
    }));

  const proficiencyDist: { [level: string]: number } = {};
  Object.values(skillCounts).forEach(data => {
    data.proficiencies.forEach(prof => {
      proficiencyDist[prof] = (proficiencyDist[prof] || 0) + 1;
    });
  });

  return {
    uniqueSkills: Object.keys(skillCounts),
    topSkills,
    coverage: Math.round((Object.keys(skillCounts).length / (profiles.length * 10)) * 100), // Assuming avg 10 skills per person
    proficiencyDistribution: proficiencyDist
  };
}

// Helper: Aggregate gaps across analyses
function aggregateGaps(analyses: any[]): any {
  const criticalGapCounts: { [skill: string]: number } = {};
  const moderateGapCounts: { [skill: string]: number } = {};

  let totalOverall = 0;
  let totalStrategic = 0;
  let totalReadiness = 0;

  analyses.forEach(analysis => {
    (analysis.criticalGaps || []).forEach((gap: any) => {
      const skill = typeof gap === 'string' ? gap : gap.skill;
      criticalGapCounts[skill] = (criticalGapCounts[skill] || 0) + 1;
    });

    (analysis.moderateGaps || []).forEach((gap: any) => {
      const skill = typeof gap === 'string' ? gap : gap.skill;
      moderateGapCounts[skill] = (moderateGapCounts[skill] || 0) + 1;
    });

    totalOverall += analysis.overallSkillScore || 0;
    totalStrategic += analysis.strategicAlignmentScore || 0;
    totalReadiness += analysis.readinessScore || 0;
  });

  const count = analyses.length || 1;

  return {
    criticalGaps: Object.entries(criticalGapCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([skill, count]) => ({ skill, employeeCount: count })),
    commonGaps: Object.entries(moderateGapCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([skill, count]) => ({ skill, employeeCount: count })),
    avgOverallScore: Math.round(totalOverall / count),
    avgStrategicAlignment: Math.round(totalStrategic / count),
    avgReadiness: Math.round(totalReadiness / count)
  };
}

// Helper: Calculate organization skills coverage
function calculateOrganizationSkillsCoverage(aggregatedSkills: any, requiredSkills: string[]): number {
  const met = requiredSkills.filter(skill =>
    aggregatedSkills.uniqueSkills.some((s: string) =>
      s.includes(skill.toLowerCase()) || skill.toLowerCase().includes(s)
    )
  ).length;

  return requiredSkills.length > 0 ? Math.round((met / requiredSkills.length) * 100) : 100;
}

// Helper: Generate department recommendations
function generateDepartmentRecommendations(aggregatedGaps: any, deptRequirements: string[]): any[] {
  const recommendations = [];

  if (aggregatedGaps.criticalGaps.length > 0) {
    recommendations.push({
      priority: 'high',
      category: 'Critical Skills',
      title: 'Address Critical Skill Gaps',
      description: `Department has ${aggregatedGaps.criticalGaps.length} critical skill gaps affecting multiple employees`,
      actionItems: aggregatedGaps.criticalGaps.slice(0, 3).map((gap: any) =>
        `Provide training for: ${gap.skill} (${gap.employeeCount} employees need this)`
      )
    });
  }

  if (aggregatedGaps.avgOverallScore < 70) {
    recommendations.push({
      priority: 'medium',
      category: 'Skill Development',
      title: 'Improve Overall Skill Level',
      description: `Department average skill score is ${aggregatedGaps.avgOverallScore}/100`,
      actionItems: [
        'Implement department-wide training program',
        'Pair experienced employees with those needing development',
        'Create learning circles for knowledge sharing'
      ]
    });
  }

  return recommendations;
}

// Helper: Generate organization recommendations
function generateOrganizationRecommendations(aggregatedGaps: any, requirements: any): any[] {
  const recommendations = [];

  if (aggregatedGaps.criticalGaps.length > 0) {
    recommendations.push({
      priority: 'critical',
      category: 'Strategic Skills',
      title: 'Close Critical Skill Gaps Organization-Wide',
      description: `${aggregatedGaps.criticalGaps.length} critical skills are missing across the organization`,
      actionItems: [
        `Top priority: ${aggregatedGaps.criticalGaps.slice(0, 3).map((g: any) => g.skill).join(', ')}`,
        'Launch organization-wide training initiative',
        'Consider strategic hiring for critical gaps'
      ]
    });
  }

  if (aggregatedGaps.avgStrategicAlignment < 70 && requirements) {
    recommendations.push({
      priority: 'high',
      category: 'Strategy Alignment',
      title: 'Align Skills with Strategic Goals',
      description: `Organization skill alignment with strategy is ${aggregatedGaps.avgStrategicAlignment}%`,
      actionItems: [
        'Focus training on strategy-critical skills',
        'Review and update role requirements',
        'Implement skills-based succession planning'
      ]
    });
  }

  return recommendations;
}

export default router;
