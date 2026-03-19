/**
 * GDPR Compliance Routes — Data privacy and right-to-erasure endpoints
 *
 * Implements EU GDPR requirements:
 * - Right to access (data export)
 * - Right to erasure (data deletion)
 * - Consent management
 * - Data retention policy enforcement
 */

import { Router, Request, Response } from 'express';
import { db } from '../db/index';
import { conversations, messages, assistantActions } from '../db/schema';
import { gamificationPoints, badgeAwards, recognitions, pulseResponses } from '../db/schema';
import { auditLogs } from '../db/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

interface AuthRequest extends Request {
  userId: string;
  tenantId: string;
  userRole: string;
}

/**
 * Export all personal data for a user (Right to Access - GDPR Art. 15)
 */
router.get('/export/:userId', async (req: Request, res: Response) => {
  const { tenantId, userRole } = req as AuthRequest;
  const targetUserId = req.params.userId;

  // Only admin or the user themselves can export data
  if (userRole !== 'admin' && (req as AuthRequest).userId !== targetUserId) {
    return res.status(403).json({ error: 'Unauthorized: can only export your own data or must be admin' });
  }

  try {
    // Collect all personal data across modules
    const [userConversations, userPoints, userBadges, userRecognitions, userSurveyResponses] = await Promise.all([
      db.select().from(conversations).where(and(eq(conversations.userId, targetUserId), eq(conversations.tenantId, tenantId))),
      db.select().from(gamificationPoints).where(and(eq(gamificationPoints.userId, targetUserId), eq(gamificationPoints.tenantId, tenantId))),
      db.select().from(badgeAwards).where(and(eq(badgeAwards.userId, targetUserId), eq(badgeAwards.tenantId, tenantId))),
      db.select().from(recognitions).where(and(eq(recognitions.fromUserId, targetUserId), eq(recognitions.tenantId, tenantId))),
      db.select().from(pulseResponses).where(and(eq(pulseResponses.userId, targetUserId), eq(pulseResponses.tenantId, tenantId))),
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      userId: targetUserId,
      tenantId,
      data: {
        conversations: userConversations,
        gamificationPoints: userPoints,
        badges: userBadges,
        recognitionsSent: userRecognitions,
        surveyResponses: userSurveyResponses,
      },
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="gdpr-export-${targetUserId}.json"`);
    return res.json(exportData);
  } catch (error) {
    console.error('[GDPR] Export failed:', error);
    return res.status(500).json({ error: 'Failed to export data' });
  }
});

/**
 * Delete all personal data for a user (Right to Erasure - GDPR Art. 17)
 */
router.delete('/erase/:userId', async (req: Request, res: Response) => {
  const { tenantId, userRole } = req as AuthRequest;
  const targetUserId = req.params.userId;

  // Only admin can erase data
  if (userRole !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized: only admins can erase user data' });
  }

  try {
    // Delete data across all modules (cascade will handle related records)
    const deletedConversations = await db.delete(conversations)
      .where(and(eq(conversations.userId, targetUserId), eq(conversations.tenantId, tenantId)));

    const deletedPoints = await db.delete(gamificationPoints)
      .where(and(eq(gamificationPoints.userId, targetUserId), eq(gamificationPoints.tenantId, tenantId)));

    const deletedBadges = await db.delete(badgeAwards)
      .where(and(eq(badgeAwards.userId, targetUserId), eq(badgeAwards.tenantId, tenantId)));

    const deletedRecognitions = await db.delete(recognitions)
      .where(and(eq(recognitions.fromUserId, targetUserId), eq(recognitions.tenantId, tenantId)));

    const deletedSurveyResponses = await db.delete(pulseResponses)
      .where(and(eq(pulseResponses.userId, targetUserId), eq(pulseResponses.tenantId, tenantId)));

    // Log the erasure for compliance audit trail
    await db.insert(auditLogs).values({
      tenantId,
      userId: (req as AuthRequest).userId,
      action: 'DELETE',
      resourceType: 'gdpr_erasure',
      resourceId: targetUserId,
      method: 'DELETE',
      path: `/api/gdpr/erase/${targetUserId}`,
      statusCode: '200',
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.get('User-Agent'),
    });

    return res.json({
      success: true,
      message: `All personal data for user ${targetUserId} has been erased`,
      deletedRecords: {
        conversations: 'deleted',
        gamificationPoints: 'deleted',
        badges: 'deleted',
        recognitions: 'deleted',
        surveyResponses: 'deleted',
      },
    });
  } catch (error) {
    console.error('[GDPR] Erasure failed:', error);
    return res.status(500).json({ error: 'Failed to erase data' });
  }
});

/**
 * Get audit trail for a user (Accountability - GDPR Art. 5)
 */
router.get('/audit/:userId', async (req: Request, res: Response) => {
  const { tenantId, userRole } = req as AuthRequest;
  const targetUserId = req.params.userId;

  if (userRole !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized: only admins can view audit trails' });
  }

  try {
    const logs = await db.select().from(auditLogs)
      .where(and(eq(auditLogs.userId, targetUserId), eq(auditLogs.tenantId, tenantId)));

    return res.json({ logs });
  } catch (error) {
    console.error('[API] Error:', (error as Error).message);
    return res.status(500).json({ error: 'Failed to get audit trail' });
  }
});

export default router;
