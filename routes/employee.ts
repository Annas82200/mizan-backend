// server/routes/employee.ts

import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { 
  cultureAssessments, 
  employeeProfiles,
  learningProgress,
  users 
} from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

const router = Router();

// Apply authentication to all employee routes
router.use(authenticate);

// Get employee dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.id;
    
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
      where: eq(cultureAssessments.employeeId, userId),
      orderBy: [desc(cultureAssessments.createdAt)]
    });
    
    // Get learning progress
    const learningProgressData = await db.query.learningProgress.findMany({
      where: eq(learningProgress.userId, userId),
      orderBy: [desc(learningProgress.updatedAt)],
      limit: 5
    });
    
    res.json({
      profile,
      latestAssessment,
      learningProgress: learningProgressData,
      stats: {
        assessmentsCompleted: latestAssessment ? 1 : 0,
        coursesInProgress: learningProgressData.filter(l => l.status === 'in_progress').length,
        coursesCompleted: learningProgressData.filter(l => l.status === 'completed').length
      }
    });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
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
        id: crypto.randomUUID(),
        tenantId: req.user.tenantId,
        companyId: validatedData.companyId,
        employeeId: req.user.id,
        assessmentData: {
          personalValues: validatedData.personalValues,
          currentExperienceValues: validatedData.currentExperienceValues,
          desiredFutureValues: validatedData.desiredFutureValues,
          engagement: validatedData.engagementLevel,
          recognition: validatedData.recognitionLevel,
          comments: validatedData.additionalComments
        },
        status: 'submitted',
        createdAt: new Date()
      })
      .returning();
    
    res.json({
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
    
    res.status(500).json({ error: 'Failed to submit assessment' });
  }
});

// Get assessment results
router.get('/assessment/:id/results', async (req, res) => {
  try {
    const assessment = await db.query.cultureAssessments.findFirst({
      where: and(
        eq(cultureAssessments.id, req.params.id),
        eq(cultureAssessments.employeeId, req.user.id)
      )
    });
    
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }
    
    if (assessment.status !== 'analyzed') {
      return res.status(400).json({ 
        error: 'Results not ready yet',
        status: assessment.status 
      });
    }
    
    res.json({
      assessment,
      report: assessment.results
    });
    
  } catch (error) {
    console.error('Results fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
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
      where: eq(employeeProfiles.userId, req.user.id)
    });
    
    if (existingProfile) {
      // Update existing
      const [updated] = await db.update(employeeProfiles)
        .set({
          ...validatedData,
          updatedAt: new Date()
        })
        .where(eq(employeeProfiles.userId, req.user.id))
        .returning();
      
      res.json(updated);
    } else {
      // Create new
      const [created] = await db.insert(employeeProfiles)
        .values({
          id: crypto.randomUUID(),
          userId: req.user.id,
          ...validatedData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      res.json(created);
    }
    
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get learning modules
router.get('/learning', async (req, res) => {
  try {
    const progress = await db.query.learningProgress.findMany({
      where: eq(learningProgress.userId, req.user.id),
      with: {
        content: true
      }
    });
    
    res.json(progress);
    
  } catch (error) {
    console.error('Learning fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch learning modules' });
  }
});

export default router;
