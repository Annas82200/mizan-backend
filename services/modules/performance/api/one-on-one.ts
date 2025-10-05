/**
 * One-on-One Meetings API
 *
 * BOT-assisted 1:1 meetings for employees and managers
 */

import { Router, Request, Response } from 'express';
import { OneOnOneBot } from '../core/one-on-one-bot.js';

const router = Router();

/**
 * Schedule a 1:1 meeting
 * POST /api/performance/one-on-one/schedule
 */
router.post('/schedule', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      tenantId,
      createdBy,
      employeeId,
      managerId,
      performanceCycleId,
      scheduledDate,
      duration,
      meetingType
    } = req.body;

    const bot = new OneOnOneBot(tenantId);

    const result = await bot.scheduleMeeting({
      employeeId,
      managerId,
      performanceCycleId,
      scheduledDate: new Date(scheduledDate),
      duration,
      meetingType,
      createdBy
    });

    res.status(201).json({
      success: true,
      ...result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Start preparation for a meeting
 * POST /api/performance/one-on-one/:meetingId/prepare
 */
router.post('/:meetingId/prepare', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId, userId } = req.body;
    const { meetingId } = req.params;
    const { role } = req.body; // 'employee' or 'manager'

    const bot = new OneOnOneBot(tenantId);

    const result = await bot.startPreparation(meetingId, userId, role);

    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Chat during preparation
 * POST /api/performance/one-on-one/prepare/:sessionId/chat
 */
router.post('/prepare/:sessionId/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.body;
    const { sessionId } = req.params;
    const { message } = req.body;

    const bot = new OneOnOneBot(tenantId);

    const result = await bot.chatPreparation(sessionId, message);

    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Complete preparation
 * POST /api/performance/one-on-one/prepare/:sessionId/complete
 */
router.post('/prepare/:sessionId/complete', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.body;
    const { sessionId } = req.params;

    const bot = new OneOnOneBot(tenantId);
    await bot.completePreparation(sessionId);

    res.json({
      success: true,
      message: 'Preparation completed and saved to meeting'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Document meeting after completion
 * POST /api/performance/one-on-one/:meetingId/document
 */
router.post('/:meetingId/document', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId, documentedBy } = req.body;
    const { meetingId } = req.params;
    const {
      actualStartTime,
      actualEndTime,
      meetingNotes,
      employeeNotes,
      managerNotes,
      discussionPoints,
      actionItems,
      decisions
    } = req.body;

    const bot = new OneOnOneBot(tenantId);

    const result = await bot.documentMeeting({
      meetingId,
      actualStartTime: new Date(actualStartTime),
      actualEndTime: new Date(actualEndTime),
      meetingNotes,
      employeeNotes,
      managerNotes,
      discussionPoints,
      actionItems,
      decisions,
      documentedBy
    });

    res.json({
      success: true,
      message: 'Meeting documented and insights sent to Engagement and Recognition agents',
      ...result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get preparation status for a meeting
 * GET /api/performance/one-on-one/:meetingId/preparation-status
 */
router.get('/:meetingId/preparation-status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.query;
    const { meetingId } = req.params;

    const bot = new OneOnOneBot(tenantId as string);
    const status = await bot.getPreparationStatus(meetingId);

    res.json({
      success: true,
      data: status
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get upcoming meetings for current user
 * GET /api/performance/one-on-one/upcoming
 */
router.get('/upcoming', async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId, userId } = req.query;
    const { role } = req.query; // 'employee' or 'manager'

    const bot = new OneOnOneBot(tenantId as string);
    const meetings = await bot.getUpcomingMeetings(userId as string, role as 'employee' | 'manager');

    res.json({
      success: true,
      meetings
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
