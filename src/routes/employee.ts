// server/routes/employee.ts

import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { db } from '../../db/index.js';
import {
  cultureAssessments,
  employeeProfiles,
  courseEnrollments,
  users
} from '../../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

const router = Router();

// Apply authentication to all employee routes
router.use(authenticate);

// Get employee dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Get employee profile
    const profile = await db.query.employeeProfiles.findFirst({
      where: eq(employeeProfiles.userId, userId),
      with: {
        user: true,
        department: true
      }
    });
    
    // Get latest culture assessment
    const latestAssessment = await db.query.cultureAssessments.findFirst({
      where: eq(cultureAssessments.userId, userId),
      orderBy: [desc(cultureAssessments.createdAt)]
    });
    
    // Get learning progress
    const courseEnrollmentsData = await db.query.courseEnrollments.findMany({
      where: eq(courseEnrollments.employeeId, userId),
      orderBy: [desc(courseEnrollments.updatedAt)],
      limit: 5
    });
    
    return res.json({
      profile,
      latestAssessment,
      courseEnrollments: courseEnrollmentsData,
      stats: {
        assessmentsCompleted: latestAssessment ? 1 : 0,
        coursesInProgress: courseEnrollmentsData.filter((l: any) => !l.completedAt).length,
        coursesCompleted: courseEnrollmentsData.filter((l: any) => l.completedAt).length
      }
    });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// Submit culture assessment
router.post('/assessment/culture', async (req, res) => {
  try {
    const schema = z.object({
      companyId: z.string().uuid(),
      personalValues: z.array(z.string()).length(10),
      currentExperienceValues: z.array(z.string()).length(10),
      desiredFutureValues: z.array(z.string()).length(10),
      engagementLevel: z.number().min(1).max(5),
      recognitionLevel: z.number().min(1).max(5),
      additionalComments: z.string().optional()
    });
    
    const validatedData = schema.parse(req.body);
    
    const [assessment] = await db.insert(cultureAssessments)
      .values({
        tenantId: req.user!.tenantId,
        userId: req.user!.id,
        personalValues: validatedData.personalValues,
        currentExperience: validatedData.currentExperienceValues,
        desiredExperience: validatedData.desiredFutureValues,
        engagement: validatedData.engagementLevel,
        recognition: validatedData.recognitionLevel
      })
      .returning();
    
    return res.json({
      success: true,
      assessmentId: assessment.id,
      message: 'Culture assessment submitted successfully'
    });
    
  } catch (error) {
    console.error('Assessment submission error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid assessment data',
        details: error.errors
      });
    }
    
    return res.status(500).json({ error: 'Failed to submit assessment' });
  }
});

// Get assessment results
router.get('/assessment/:id/results', async (req, res) => {
  try {
    const assessment = await db.query.cultureAssessments.findFirst({
      where: and(
        eq(cultureAssessments.id, req.params.id),
        eq(cultureAssessments.userId, req.user!.id)
      )
    });
    
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    if (!assessment.completedAt) {
      return res.status(400).json({
        error: 'Results not ready yet',
        message: 'Assessment has not been analyzed yet'
      });
    }

    return res.json({
      assessment
    });
    
  } catch (error) {
    console.error('Results fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch results' });
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
    
    // Check if profile exists
    const existingProfile = await db.query.employeeProfiles.findFirst({
      where: eq(employeeProfiles.userId, req.user!.id)
    });
    
    if (existingProfile) {
      // Update existing
      const [updated] = await db.update(employeeProfiles)
        .set({
          ...validatedData,
          updatedAt: new Date()
        })
        .where(eq(employeeProfiles.userId, req.user!.id))
        .returning();
      
      return res.json(updated);
    } else {
      // Create new
      const [created] = await db.insert(employeeProfiles)
        .values({
          id: crypto.randomUUID(),
          userId: req.user!.id,
          tenantId: req.user!.tenantId,
          ...validatedData
        })
        .returning();
      
      return res.json(created);
    }
    
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get learning modules
router.get('/learning', async (req, res) => {
  try {
    const progress = await db.query.courseEnrollments.findMany({
      where: eq(courseEnrollments.employeeId, req.user!.id),
      with: {
        course: true
      }
    });
    
    return res.json(progress);
    
  } catch (error) {
    console.error('Learning fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch learning modules' });
  }
});

export default router;
