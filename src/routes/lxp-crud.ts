/**
 * LXP CRUD Routes — Courses, enrollments, progress, learning paths
 */
import { Router, Request, Response } from 'express';
import { db } from '../db/index';
import { courses, courseModules, lessons, enrollments, lessonProgress, learningPaths, certificates } from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

const router = Router();
interface AuthRequest extends Request { userId: string; tenantId: string; }

// Overview
router.get('/overview', async (req: Request, res: Response) => {
  const { tenantId, userId } = req as AuthRequest;
  try {
    const [courseCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(courses).where(and(eq(courses.tenantId, tenantId), eq(courses.status, 'published')));
    const userEnrollments = await db.select().from(enrollments).where(and(eq(enrollments.tenantId, tenantId), eq(enrollments.userId, userId)));
    const completed = userEnrollments.filter(e => e.status === 'completed');
    return res.json({ totalCourses: Number(courseCount?.count) || 0, enrolled: userEnrollments.length, completed: completed.length, inProgress: userEnrollments.filter(e => e.status === 'in_progress').length });
  } catch (error) { console.error('[LXP] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to get overview' }); }
});

// Courses
router.get('/courses', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  const difficulty = req.query.difficulty as string;
  try {
    let query = eq(courses.tenantId, tenantId);
    const result = await db.select().from(courses).where(query).orderBy(desc(courses.createdAt));
    return res.json({ courses: difficulty ? result.filter(c => c.difficulty === difficulty) : result });
  } catch (error) { console.error('[LXP] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to list courses' }); }
});

router.post('/courses', async (req: Request, res: Response) => {
  const { tenantId, userId } = req as AuthRequest;
  const { title, description, difficulty, estimatedDurationMinutes, tags, skillsTargeted } = req.body;
  try {
    const [course] = await db.insert(courses).values({ tenantId, title, description, difficulty, estimatedDurationMinutes, tags, skillsTargeted, createdBy: userId }).returning();
    return res.status(201).json({ course });
  } catch (error) { console.error('[LXP] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to create course' }); }
});

router.put('/courses/:id', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  try {
    const { title, description, difficulty, estimatedDurationMinutes, tags, skillsTargeted, status, thumbnailUrl } = req.body;
    const [updated] = await db.update(courses).set({ title, description, difficulty, estimatedDurationMinutes, tags, skillsTargeted, status, thumbnailUrl, updatedAt: new Date() }).where(and(eq(courses.id, req.params.id), eq(courses.tenantId, tenantId))).returning();
    return res.json({ course: updated });
  } catch (error) { console.error('[LXP] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to update course' }); }
});

// Enrollments
router.post('/courses/:courseId/enroll', async (req: Request, res: Response) => {
  const { tenantId, userId } = req as AuthRequest;
  try {
    const [enrollment] = await db.insert(enrollments).values({ courseId: req.params.courseId, tenantId, userId, status: 'enrolled', startedAt: new Date() }).returning();
    await db.update(courses).set({ enrollmentCount: sql`${courses.enrollmentCount} + 1` }).where(and(eq(courses.id, req.params.courseId), eq(courses.tenantId, tenantId)));
    return res.status(201).json({ enrollment });
  } catch (error) { console.error('[LXP] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to enroll' }); }
});

// Progress
router.get('/progress', async (req: Request, res: Response) => {
  const { tenantId, userId } = req as AuthRequest;
  try {
    const userEnrollments = await db.select().from(enrollments).where(and(eq(enrollments.tenantId, tenantId), eq(enrollments.userId, userId)));
    return res.json({ enrollments: userEnrollments });
  } catch (error) { console.error('[LXP] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to get progress' }); }
});

// Learning paths
router.get('/learning-paths', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  try {
    const paths = await db.select().from(learningPaths).where(and(eq(learningPaths.tenantId, tenantId), eq(learningPaths.isActive, true)));
    return res.json({ paths });
  } catch (error) { console.error('[LXP] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to list paths' }); }
});

// Recommendations (AI-powered)
router.get('/recommendations', async (req: Request, res: Response) => {
  const { tenantId, userId } = req as AuthRequest;
  try {
    // Get courses the user hasn't enrolled in
    const enrolled = await db.select({ courseId: enrollments.courseId }).from(enrollments).where(and(eq(enrollments.tenantId, tenantId), eq(enrollments.userId, userId)));
    const enrolledIds = new Set(enrolled.map(e => e.courseId));
    const allCourses = await db.select().from(courses).where(and(eq(courses.tenantId, tenantId), eq(courses.status, 'published')));
    const recommendations = allCourses.filter(c => !enrolledIds.has(c.id)).slice(0, 10);
    return res.json({ recommendations });
  } catch (error) { console.error('[LXP] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to get recommendations' }); }
});

router.post('/recommendations/refresh', async (req: Request, res: Response) => {
  const { tenantId, userId } = req as AuthRequest;
  try {
    const allCourses = await db.select().from(courses).where(and(eq(courses.tenantId, tenantId), eq(courses.status, 'published')));
    return res.json({ recommendations: allCourses.slice(0, 10) });
  } catch (error) { console.error('[LXP] Error:', (error as Error).message); return res.status(500).json({ error: 'Failed to refresh' }); }
});

export default router;
