// backend/src/routes/employee.ts

import { Router } from 'express';

import { z } from 'zod';

import { authenticate } from '../middleware/auth';

import { requireTenant } from '../middleware/tenant';

import { db } from '../../db/index';

import {
  cultureAssessments,
  employeeProfiles,
  courseEnrollments,
  users,
  departments
} from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '../services/logger';


// Mizan Production-Ready Types
// Compliant with AGENT_CONTEXT_ULTIMATE.md - Strict TypeScript types
type CourseEnrollment = typeof courseEnrollments.$inferSelect;

const router = Router();

// Apply authentication to all employee routes
router.use(authenticate);

// Apply tenant validation to all employee routes
router.use(requireTenant);

// Get employee dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user!.id;
    const tenantId = req.user!.tenantId;
    
    // Get employee profile with tenant isolation
    const profile = await db.select({
      id: employeeProfiles.id,
      userId: employeeProfiles.userId,
      tenantId: employeeProfiles.tenantId,
      skills: employeeProfiles.skills,
      bio: employeeProfiles.bio,
      linkedinUrl: employeeProfiles.linkedinUrl,
      // Note: resumeData and departmentId not in employeeProfiles schema
      // These would need to be added to schema or stored elsewhere
      createdAt: employeeProfiles.createdAt,
      updatedAt: employeeProfiles.updatedAt,
      user: {
        id: users.id,
        email: users.email,
        name: users.name // Database has 'name' field, not firstName/lastName
      },
      department: {
        id: departments.id,
        name: departments.name
      }
    })
    .from(employeeProfiles)
    .leftJoin(users, eq(employeeProfiles.userId, users.id))
    .leftJoin(departments, eq(users.departmentId, departments.id)) // departmentId is on users table
    .where(
      and(
        eq(employeeProfiles.userId, userId),
        eq(employeeProfiles.tenantId, tenantId),
        eq(users.tenantId, tenantId) // Ensure user also belongs to tenant
      )
    )
    .limit(1);
    
    if (!profile || profile.length === 0) {
      return res.status(404).json({ 
        error: 'Employee profile not found',
        message: 'Profile does not exist for this tenant'
      });
    }
    
    // Get latest culture assessment with tenant isolation
    const latestAssessment = await db.select()
      .from(cultureAssessments)
      .where(
        and(
          eq(cultureAssessments.userId, userId),
          eq(cultureAssessments.tenantId, tenantId)
        )
      )
      .orderBy(desc(cultureAssessments.createdAt))
      .limit(1);
    
    // Get learning progress with tenant isolation
    const courseEnrollmentsData = await db.select()
      .from(courseEnrollments)
      .where(
        and(
          eq(courseEnrollments.employeeId, userId),
          eq(courseEnrollments.tenantId, tenantId)
        )
      )
      .orderBy(desc(courseEnrollments.updatedAt))
      .limit(5);
    
    return res.json({
      profile: profile[0],
      latestAssessment: latestAssessment[0] || null,
      courseEnrollments: courseEnrollmentsData,
      stats: {
        assessmentsCompleted: latestAssessment.length > 0 ? 1 : 0,
        coursesInProgress: courseEnrollmentsData.filter((enrollment: CourseEnrollment) => !enrollment.completionDate).length,
        coursesCompleted: courseEnrollmentsData.filter((enrollment: CourseEnrollment) => enrollment.completionDate).length
      }
    });
    
  } catch (error) {
    logger.error('Dashboard error:', error);
    return res.status(500).json({ 
      error: 'Failed to load dashboard',
      message: 'Internal server error occurred while loading dashboard data'
    });
  }
});

// Submit culture assessment
router.post('/assessment/culture', async (req, res) => {
  try {
    const schema = z.object({
      personalValues: z.array(z.string()).length(10),
      currentExperienceValues: z.array(z.string()).length(10),
      desiredFutureValues: z.array(z.string()).length(10),
      engagementLevel: z.number().min(1).max(5),
      recognitionLevel: z.number().min(1).max(5),
      additionalComments: z.string().optional()
    });
    
    const validatedData = schema.parse(req.body);
    const userId = req.user!.id;
    const tenantId = req.user!.tenantId;
    
    // Verify user belongs to tenant before creating assessment
    const userExists = await db.select()
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          eq(users.tenantId, tenantId)
        )
      )
      .limit(1);
    
    if (!userExists || userExists.length === 0) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'User does not belong to this tenant'
      });
    }
    
    // Check if assessment already exists for this user in this tenant
    const existingAssessment = await db.select()
      .from(cultureAssessments)
      .where(
        and(
          eq(cultureAssessments.userId, userId),
          eq(cultureAssessments.tenantId, tenantId)
        )
      )
      .limit(1);
    
    if (existingAssessment && existingAssessment.length > 0) {
      return res.status(400).json({
        error: 'Assessment already exists',
        message: 'Culture assessment has already been submitted for this user'
      });
    }
    
    const [assessment] = await db.insert(cultureAssessments)
      .values({
        id: crypto.randomUUID(),
        tenantId: tenantId,
        userId: userId,
        personalValues: validatedData.personalValues,
        currentExperience: validatedData.currentExperienceValues,
        desiredExperience: validatedData.desiredFutureValues,
        engagement: validatedData.engagementLevel,
        recognition: validatedData.recognitionLevel,
        additionalComments: validatedData.additionalComments,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return res.json({
      success: true,
      assessmentId: assessment.id,
      message: 'Culture assessment submitted successfully'
    });
    
  } catch (error) {
    logger.error('Assessment submission error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid assessment data',
        details: error.errors,
        message: 'Please check the submitted data and try again'
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to submit assessment',
      message: 'Internal server error occurred while submitting assessment'
    });
  }
});

// Get assessment results
router.get('/assessment/:id/results', async (req, res) => {
  try {
    const assessmentId = req.params.id;
    const userId = req.user!.id;
    const tenantId = req.user!.tenantId;
    
    // Validate UUID format
    const uuidSchema = z.string().uuid();
    const validatedId = uuidSchema.parse(assessmentId);
    
    // Get assessment with strict tenant isolation
    const assessment = await db.select()
      .from(cultureAssessments)
      .where(
        and(
          eq(cultureAssessments.id, validatedId),
          eq(cultureAssessments.userId, userId),
          eq(cultureAssessments.tenantId, tenantId)
        )
      )
      .limit(1);
    
    if (!assessment || assessment.length === 0) {
      return res.status(404).json({ 
        error: 'Assessment not found',
        message: 'Assessment does not exist or you do not have access to it'
      });
    }
    
    const assessmentData = assessment[0];

    if (!assessmentData.completedAt) {
      return res.status(400).json({
        error: 'Results not ready yet',
        message: 'Assessment has not been analyzed yet'
      });
    }

    return res.json({
      assessment: assessmentData
    });
    
  } catch (error) {
    logger.error('Results fetch error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid assessment ID',
        message: 'Assessment ID must be a valid UUID'
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to fetch results',
      message: 'Internal server error occurred while fetching assessment results'
    });
  }
});

// Update profile
router.put('/profile', async (req, res) => {
  try {
    const schema = z.object({
      skills: z.array(z.string()).optional(),
      bio: z.string().optional(),
      linkedinUrl: z.string().url().optional(),
      resumeData: z.any().optional()
    });
    
    const validatedData = schema.parse(req.body);
    const userId = req.user!.id;
    const tenantId = req.user!.tenantId;
    
    // Verify user belongs to tenant
    const userExists = await db.select()
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          eq(users.tenantId, tenantId)
        )
      )
      .limit(1);
    
    if (!userExists || userExists.length === 0) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'User does not belong to this tenant'
      });
    }
    
    // Check if profile exists with tenant isolation
    const existingProfile = await db.select()
      .from(employeeProfiles)
      .where(
        and(
          eq(employeeProfiles.userId, userId),
          eq(employeeProfiles.tenantId, tenantId)
        )
      )
      .limit(1);
    
    if (existingProfile && existingProfile.length > 0) {
      // Update existing profile with tenant validation
      const [updated] = await db.update(employeeProfiles)
        .set({
          ...validatedData,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(employeeProfiles.userId, userId),
            eq(employeeProfiles.tenantId, tenantId)
          )
        )
        .returning();
      
      return res.json({
        success: true,
        profile: updated,
        message: 'Profile updated successfully'
      });
    } else {
      // Create new profile with tenant isolation
      const [created] = await db.insert(employeeProfiles)
        .values({
          id: crypto.randomUUID(),
          userId: userId,
          tenantId: tenantId,
          ...validatedData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return res.json({
        success: true,
        profile: created,
        message: 'Profile created successfully'
      });
    }
    
  } catch (error) {
    logger.error('Profile update error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid profile data',
        details: error.errors,
        message: 'Please check the submitted data and try again'
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to update profile',
      message: 'Internal server error occurred while updating profile'
    });
  }
});

// Get learning modules
router.get('/learning', async (req, res) => {
  try {
    const userId = req.user!.id;
    const tenantId = req.user!.tenantId;
    
    // Verify user belongs to tenant
    const userExists = await db.select()
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          eq(users.tenantId, tenantId)
        )
      )
      .limit(1);
    
    if (!userExists || userExists.length === 0) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'User does not belong to this tenant'
      });
    }
    
    // Get learning progress with tenant isolation
    const progress = await db.select()
      .from(courseEnrollments)
      .where(
        and(
          eq(courseEnrollments.employeeId, userId),
          eq(courseEnrollments.tenantId, tenantId)
        )
      )
      .orderBy(desc(courseEnrollments.updatedAt));
    
    return res.json({
      success: true,
      learning: progress,
      message: 'Learning modules retrieved successfully'
    });
    
  } catch (error) {
    logger.error('Learning fetch error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch learning modules',
      message: 'Internal server error occurred while fetching learning data'
    });
  }
});

// Get all assessments for user (with tenant isolation)
router.get('/assessments', async (req, res) => {
  try {
    const userId = req.user!.id;
    const tenantId = req.user!.tenantId;
    
    const assessments = await db.select()
      .from(cultureAssessments)
      .where(
        and(
          eq(cultureAssessments.userId, userId),
          eq(cultureAssessments.tenantId, tenantId)
        )
      )
      .orderBy(desc(cultureAssessments.createdAt));
    
    return res.json({
      success: true,
      assessments,
      message: 'Assessments retrieved successfully'
    });
    
  } catch (error) {
    logger.error('Assessments fetch error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch assessments',
      message: 'Internal server error occurred while fetching assessments'
    });
  }
});

export default router;