/**
 * LXP AI Routes — AI-powered course generation and adaptive exercises
 */

import { Router, Request, Response } from 'express';
import { validate } from '../middleware/validate';
import { generateCourseSchema } from '../middleware/schemas';
import { CourseGenerator } from '../services/modules/lxp/course-generator';

const router = Router();
const courseGenerator = new CourseGenerator();

interface AuthRequest extends Request {
  userId: string;
  tenantId: string;
}

// Generate a personalized course from skill gaps
router.post('/generate-course', validate(generateCourseSchema), async (req: Request, res: Response) => {
  const { userId, tenantId } = req as AuthRequest;
  const { skillGaps, learnerProfile, difficulty } = req.body;

  try {
    const course = await courseGenerator.generateCourse({
      tenantId,
      userId,
      skillGaps: skillGaps || [],
      learnerProfile: learnerProfile || { role: 'employee', experience: 'mid-level' },
      difficulty: difficulty || 'intermediate',
    });
    return res.json({ course });
  } catch (error) {
    console.error('[LXP-AI] Course generation error:', error);
    return res.status(500).json({ error: 'Failed to generate course' });
  }
});

// Generate an adaptive exercise based on learner performance
router.post('/adaptive-exercise', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  const { skill, currentScore, previousErrors, difficulty } = req.body;

  try {
    const exercise = await courseGenerator.generateAdaptiveExercise({
      tenantId,
      skill: skill || '',
      currentScore: currentScore || 50,
      previousErrors: previousErrors || [],
      difficulty: difficulty || 'intermediate',
    });
    return res.json({ exercise });
  } catch (error) {
    console.error('[LXP-AI] Adaptive exercise error:', error);
    return res.status(500).json({ error: 'Failed to generate exercise' });
  }
});

export default router;
