/**
 * Engagement Routes — Pulse surveys, gamification, recognition
 */

import { Router, Request, Response } from 'express';
import { validate } from '../../src/middleware/validate';
import { createSurveySchema, sendRecognitionSchema, surveyResponseSchema } from '../../src/middleware/schemas';
import { db } from '../../db/index';
import {
  pulseSurveys, pulseResponses,
  gamificationPoints, badges, badgeAwards,
  challenges, challengeParticipations,
  recognitions, leaderboardSnapshots,
} from '../../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

const router = Router();

interface AuthRequest extends Request {
  userId: string;
  tenantId: string;
}

// Default points per recognition type (configurable via module settings in production)
const DEFAULT_POINTS: Record<string, number> = {
  kudos: 5,
  shoutout: 10,
  value_champion: 25,
  team_mvp: 50,
  innovation: 30,
};

function getDefaultPoints(recognitionType: string): number {
  return DEFAULT_POINTS[recognitionType] ?? 10;
}

// === Pulse Surveys ===

router.post('/surveys', validate(createSurveySchema), async (req: Request, res: Response) => {
  const { tenantId, userId } = req as AuthRequest;
  const { title, description, questions, targetAudience, startsAt, endsAt } = req.body;

  try {
    const [survey] = await db
      .insert(pulseSurveys)
      .values({ tenantId, title, description, questions, targetAudience, startsAt, endsAt, createdBy: userId })
      .returning();

    return res.status(201).json({ survey });
  } catch (error) {
    console.error('[API] Error:', (error as Error).message);
    return res.status(500).json({ error: 'Failed to create survey' });
  }
});

router.get('/surveys', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  try {
    const surveys = await db.select().from(pulseSurveys)
      .where(eq(pulseSurveys.tenantId, tenantId))
      .orderBy(desc(pulseSurveys.createdAt));
    return res.json({ surveys });
  } catch (error) {
    console.error('[API] Error:', (error as Error).message);
    return res.status(500).json({ error: 'Failed to list surveys' });
  }
});

router.post('/surveys/:id/respond', validate(surveyResponseSchema), async (req: Request, res: Response) => {
  const { tenantId, userId } = req as AuthRequest;
  const { answers, isAnonymous } = req.body;

  try {
    const [response_] = await db
      .insert(pulseResponses)
      .values({ surveyId: req.params.id, tenantId, userId, answers, isAnonymous })
      .returning();

    // Update response count
    await db.update(pulseSurveys)
      .set({ responseCount: sql`${pulseSurveys.responseCount} + 1` })
      .where(eq(pulseSurveys.id, req.params.id));

    return res.json({ response: response_ });
  } catch (error) {
    console.error('[API] Error:', (error as Error).message);
    return res.status(500).json({ error: 'Failed to submit response' });
  }
});

// === Recognition ===

router.post('/recognize', validate(sendRecognitionSchema), async (req: Request, res: Response) => {
  const { tenantId, userId } = req as AuthRequest;
  const { toUserId, recognitionType, companyValue, message, pointsAwarded } = req.body;

  try {
    const [recognition] = await db
      .insert(recognitions)
      .values({
        tenantId,
        fromUserId: userId,
        toUserId,
        recognitionType,
        companyValue,
        message,
        pointsAwarded: pointsAwarded ?? getDefaultPoints(recognitionType),
      })
      .returning();

    // Award points to the recipient (use the actual stored amount, not the client-sent value)
    const actualPoints = recognition.pointsAwarded || 0;
    if (actualPoints > 0) {
      await db.insert(gamificationPoints).values({
        tenantId,
        userId: toUserId,
        points: actualPoints,
        source: 'recognition_received',
        sourceId: recognition.id,
        description: `Recognition from colleague`,
      });
    }

    return res.status(201).json({ recognition });
  } catch (error) {
    console.error('[API] Error:', (error as Error).message);
    return res.status(500).json({ error: 'Failed to send recognition' });
  }
});

router.get('/recognition/feed', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  const limit = parseInt(req.query.limit as string) || 20;

  try {
    const feed = await db.select().from(recognitions)
      .where(and(eq(recognitions.tenantId, tenantId), eq(recognitions.isPublic, true)))
      .orderBy(desc(recognitions.createdAt))
      .limit(limit);

    return res.json({ feed });
  } catch (error) {
    console.error('[API] Error:', (error as Error).message);
    return res.status(500).json({ error: 'Failed to get recognition feed' });
  }
});

// === Leaderboard ===

router.get('/leaderboard', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  const period = (req.query.period as string) || 'monthly';

  try {
    const snapshots = await db.select().from(leaderboardSnapshots)
      .where(and(eq(leaderboardSnapshots.tenantId, tenantId), eq(leaderboardSnapshots.period, period)))
      .orderBy(desc(leaderboardSnapshots.computedAt))
      .limit(1);

    return res.json({ leaderboard: snapshots[0] || null });
  } catch (error) {
    console.error('[API] Error:', (error as Error).message);
    return res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// === Challenges ===

router.get('/challenges', async (req: Request, res: Response) => {
  const { tenantId } = req as AuthRequest;
  try {
    const activeChall = await db.select().from(challenges)
      .where(and(eq(challenges.tenantId, tenantId), eq(challenges.status, 'active')));
    return res.json({ challenges: activeChall });
  } catch (error) {
    console.error('[API] Error:', (error as Error).message);
    return res.status(500).json({ error: 'Failed to list challenges' });
  }
});

router.post('/challenges/:id/join', async (req: Request, res: Response) => {
  const { tenantId, userId } = req as AuthRequest;

  try {
    const [participation] = await db
      .insert(challengeParticipations)
      .values({ challengeId: req.params.id, tenantId, userId })
      .returning();

    return res.json({ participation });
  } catch (error) {
    console.error('[API] Error:', (error as Error).message);
    return res.status(500).json({ error: 'Failed to join challenge' });
  }
});

// === Badges & Points ===

router.get('/badges', async (req: Request, res: Response) => {
  const { tenantId, userId } = req as AuthRequest;

  try {
    const awards = await db.select().from(badgeAwards)
      .where(and(eq(badgeAwards.tenantId, tenantId), eq(badgeAwards.userId, userId)));

    return res.json({ badges: awards });
  } catch (error) {
    console.error('[API] Error:', (error as Error).message);
    return res.status(500).json({ error: 'Failed to get badges' });
  }
});

router.get('/points', async (req: Request, res: Response) => {
  const { tenantId, userId } = req as AuthRequest;

  try {
    const result = await db.select({
      totalPoints: sql<number>`COALESCE(SUM(${gamificationPoints.points}), 0)`,
    }).from(gamificationPoints)
      .where(and(eq(gamificationPoints.tenantId, tenantId), eq(gamificationPoints.userId, userId)));

    return res.json({ totalPoints: Number(result[0]?.totalPoints) || 0 });
  } catch (error) {
    console.error('[API] Error:', (error as Error).message);
    return res.status(500).json({ error: 'Failed to get points' });
  }
});

export default router;
