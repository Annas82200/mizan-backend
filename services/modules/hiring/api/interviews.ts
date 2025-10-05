import { Router } from 'express';
import { Logger } from '../../../../utils/logger.js';
import { db } from '../../../../db/index.js';
import { interviews, candidates, hiringRequisitions } from '../../../../db/schema/hiring.js';
import { eq, and, desc, asc, gte, lte, like, or } from 'drizzle-orm';
import { InterviewManagementWorkflow } from '../workflows/interviews.js';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface InterviewQueryParams {
  page?: string;
  limit?: string;
  status?: string;
  type?: string;
  candidateId?: string;
  requisitionId?: string;
  interviewerId?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface ScheduleInterviewRequest {
  candidateId: string;
  requisitionId: string;
  interviewType: string;
  round: number;
  interviewers: string[];
  scheduledDate: string;
  duration?: number;
  timezone?: string;
  location?: string;
  meetingLink?: string;
  focusAreas?: string[];
  suggestedQuestions?: string[];
  metadata?: any;
}

interface UpdateInterviewRequest {
  scheduledDate?: string;
  duration?: number;
  timezone?: string;
  location?: string;
  meetingLink?: string;
  interviewers?: string[];
  focusAreas?: string[];
  suggestedQuestions?: string[];
  notes?: string;
  metadata?: any;
}

interface SubmitFeedbackRequest {
  interviewerId: string;
  technicalSkills?: number;
  communication?: number;
  problemSolving?: number;
  cultureFit?: number;
  leadershipPotential?: number;
  strengths: string[];
  weaknesses: string[];
  concerns?: string[];
  notes: string;
  recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no' | 'strong_no';
}

// ============================================================================
// ROUTER SETUP
// ============================================================================

const router = Router();
const logger = new Logger('InterviewAPI');

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * GET /api/hiring/interviews
 * List all interviews with filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const {
      page = '1',
      limit = '20',
      status,
      type,
      candidateId,
      requisitionId,
      interviewerId,
      dateFrom,
      dateTo,
      sortBy = 'scheduledDate',
      sortOrder = 'asc'
    } = req.query as InterviewQueryParams;

    logger.info('Fetching interviews', {
      tenantId,
      page,
      limit,
      filters: { status, type, candidateId, requisitionId, interviewerId }
    });

    // Build query conditions
    const conditions = [eq(interviews.tenantId, tenantId)];

    if (status) {
      // Type assertion - status comes from query param, validated by database enum
      conditions.push(eq(interviews.status, status as any));
    }

    if (type) {
      // Type assertion - type comes from query param, validated by database enum
      conditions.push(eq(interviews.interviewType, type as any));
    }

    if (candidateId) {
      conditions.push(eq(interviews.candidateId, candidateId as any));
    }

    if (requisitionId) {
      conditions.push(eq(interviews.requisitionId, requisitionId as any));
    }

    if (interviewerId) {
      // This would need a more complex query to search in the interviewers array
      // For now, we'll use a simple approach
      conditions.push(eq(interviews.primaryInterviewer, interviewerId as any));
    }

    if (dateFrom) {
      conditions.push(gte(interviews.scheduledDate, new Date(dateFrom)));
    }

    if (dateTo) {
      conditions.push(lte(interviews.scheduledDate, new Date(dateTo)));
    }

    // Build sort order
    const sortColumn = interviews[sortBy as keyof typeof interviews] || interviews.scheduledDate;
    const orderFn = sortOrder === 'asc' ? asc : desc;

    // Execute query with pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const interviewsList = await db.select()
      .from(interviews)
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn as any))
      .limit(limitNum)
      .offset(offset);

    // Get total count for pagination
    const totalInterviews = await db.select({ count: interviews.id })
      .from(interviews)
      .where(and(...conditions));

    const total = totalInterviews.length;
    const totalPages = Math.ceil(total / limitNum);

    logger.info('Interviews fetched successfully', {
      count: interviewsList.length,
      total,
      page: pageNum,
      totalPages
    });

    return res.json({
      success: true,
      data: interviewsList,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    logger.error('Error fetching interviews:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch interviews'
    });
  }
});

/**
 * GET /api/hiring/interviews/:id
 * Get a specific interview by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    logger.info('Fetching interview by ID', { tenantId, interviewId: id });

    const interviewsList = await db.select()
      .from(interviews)
      .where(and(
        eq(interviews.id, id),
        eq(interviews.tenantId, tenantId)
      ))
      .limit(1);

    if (interviewsList.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Interview not found'
      });
    }

    const interview = interviewsList[0];

    // Get candidate info
    const candidatesList = await db.select()
      .from(candidates)
      .where(eq(candidates.id, interview.candidateId))
      .limit(1);

    // Get requisition info
    const requisitionsList = await db.select()
      .from(hiringRequisitions)
      .where(eq(hiringRequisitions.id, interview.requisitionId))
      .limit(1);

    logger.info('Interview fetched successfully', { interviewId: id });

    return res.json({
      success: true,
      data: {
        ...interview,
        candidate: candidatesList[0] || null,
        requisition: requisitionsList[0] || null
      }
    });
  } catch (error) {
    logger.error('Error fetching interview:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch interview'
    });
  }
});

/**
 * POST /api/hiring/interviews
 * Schedule a new interview
 */
router.post('/', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const interviewData: ScheduleInterviewRequest = req.body;

    logger.info('Scheduling new interview', {
      tenantId,
      userId,
      candidateId: interviewData.candidateId,
      interviewType: interviewData.interviewType
    });

    // Validate required fields
    if (!interviewData.candidateId || !interviewData.requisitionId || !interviewData.interviewType || !interviewData.scheduledDate) {
      return res.status(400).json({
        success: false,
        error: 'Candidate ID, requisition ID, interview type, and scheduled date are required'
      });
    }

    // Validate candidate exists
    const candidatesList = await db.select()
      .from(candidates)
      .where(and(
        eq(candidates.id, interviewData.candidateId),
        eq(candidates.tenantId, tenantId)
      ))
      .limit(1);

    if (candidatesList.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid candidate ID'
      });
    }

    // Validate requisition exists
    const requisitionsList = await db.select()
      .from(hiringRequisitions)
      .where(and(
        eq(hiringRequisitions.id, interviewData.requisitionId),
        eq(hiringRequisitions.tenantId, tenantId)
      ))
      .limit(1);

    if (requisitionsList.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid requisition ID'
      });
    }

    // Initialize interview workflow
    const workflow = new InterviewManagementWorkflow();

    // Prepare workflow input
    const workflowInput = {
      tenantId,
      candidateId: interviewData.candidateId,
      requisitionId: interviewData.requisitionId,
      interviewType: interviewData.interviewType,
      round: interviewData.round || 1,
      interviewers: interviewData.interviewers || [],
      scheduledDate: new Date(interviewData.scheduledDate),
      duration: interviewData.duration,
      timezone: interviewData.timezone,
      location: interviewData.location,
      meetingLink: interviewData.meetingLink,
      focusAreas: interviewData.focusAreas,
      suggestedQuestions: interviewData.suggestedQuestions,
      metadata: interviewData.metadata
    };

    // Execute workflow
    const result = await workflow.scheduleInterview(workflowInput);

    logger.info('Interview scheduled successfully', {
      interviewId: result.interviewId,
      scheduledDate: result.scheduledDate
    });

    return res.status(201).json({
      success: true,
      data: {
        interviewId: result.interviewId,
        scheduledDate: result.scheduledDate,
        interviewers: result.interviewers,
        nextSteps: result.nextSteps
      },
      message: 'Interview scheduled successfully'
    });
  } catch (error) {
    logger.error('Error scheduling interview:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to schedule interview'
    });
  }
});

/**
 * PUT /api/hiring/interviews/:id
 * Update an existing interview
 */
router.put('/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const updateData: UpdateInterviewRequest = req.body;

    logger.info('Updating interview', {
      tenantId,
      userId,
      interviewId: id
    });

    // Check if interview exists
    const existingInterviews = await db.select()
      .from(interviews)
      .where(and(
        eq(interviews.id, id),
        eq(interviews.tenantId, tenantId)
      ))
      .limit(1);

    if (existingInterviews.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Interview not found'
      });
    }

    const existingInterview = existingInterviews[0];

    // Check if interview can be updated
    if (existingInterview.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot update completed interview'
      });
    }

    // Prepare update data
    const updateFields: any = {
      ...updateData,
      updatedAt: new Date()
    };

    if (updateData.scheduledDate) {
      updateFields.scheduledDate = new Date(updateData.scheduledDate);
    }

    // Update interview
    const [updatedInterview] = await db.update(interviews)
      .set(updateFields)
      .where(and(
        eq(interviews.id, id),
        eq(interviews.tenantId, tenantId)
      ))
      .returning();

    logger.info('Interview updated successfully', { interviewId: id });

    return res.json({
      success: true,
      data: updatedInterview,
      message: 'Interview updated successfully'
    });
  } catch (error) {
    logger.error('Error updating interview:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update interview'
    });
  }
});

/**
 * PATCH /api/hiring/interviews/:id/status
 * Update interview status
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    logger.info('Updating interview status', {
      tenantId,
      userId,
      interviewId: id,
      newStatus: status
    });

    // Validate status
    const validStatuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    // Update status
    const updateData: any = {
      status,
      statusReason: reason,
      updatedAt: new Date()
    };

    // Set timestamps based on status
    if (status === 'confirmed') {
      updateData.confirmationSent = true;
    } else if (status === 'in_progress') {
      updateData.startedAt = new Date();
    } else if (status === 'completed') {
      updateData.completedAt = new Date();
    } else if (status === 'cancelled') {
      updateData.cancelledAt = new Date();
    }

    const [updatedInterview] = await db.update(interviews)
      .set(updateData)
      .where(and(
        eq(interviews.id, id),
        eq(interviews.tenantId, tenantId)
      ))
      .returning();

    if (!updatedInterview) {
      return res.status(404).json({
        success: false,
        error: 'Interview not found'
      });
    }

    logger.info('Interview status updated successfully', {
      interviewId: id,
      status
    });

    return res.json({
      success: true,
      data: {
        id: updatedInterview.id,
        status: updatedInterview.status,
        // statusReason: updatedInterview.statusReason // Property doesn't exist in schema
      },
      message: `Interview status updated to ${status}`
    });
  } catch (error) {
    logger.error('Error updating interview status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update interview status'
    });
  }
});

/**
 * POST /api/hiring/interviews/:id/feedback
 * Submit feedback for an interview
 */
router.post('/:id/feedback', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const feedbackData: SubmitFeedbackRequest = req.body;

    logger.info('Submitting interview feedback', {
      tenantId,
      userId,
      interviewId: id,
      interviewerId: feedbackData.interviewerId
    });

    // Validate required fields
    if (!feedbackData.interviewerId || !feedbackData.recommendation || !feedbackData.notes) {
      return res.status(400).json({
        success: false,
        error: 'Interviewer ID, recommendation, and notes are required'
      });
    }

    // Check if interview exists
    const interviewsList = await db.select()
      .from(interviews)
      .where(and(
        eq(interviews.id, id),
        eq(interviews.tenantId, tenantId)
      ))
      .limit(1);

    if (interviewsList.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Interview not found'
      });
    }

    const interview = interviewsList[0];

    // Check if interview can receive feedback
    if (interview.status !== 'completed' && interview.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        error: 'Can only submit feedback for in-progress or completed interviews'
      });
    }

    // Initialize interview workflow
    const workflow = new InterviewManagementWorkflow();

    // Submit feedback using workflow
    const result = await workflow.submitInterviewFeedback({
      interviewId: id,
      interviewerId: feedbackData.interviewerId,
      technicalSkills: feedbackData.technicalSkills,
      communication: feedbackData.communication,
      problemSolving: feedbackData.problemSolving,
      cultureFit: feedbackData.cultureFit,
      leadershipPotential: feedbackData.leadershipPotential,
      strengths: feedbackData.strengths,
      weaknesses: feedbackData.weaknesses,
      concerns: feedbackData.concerns,
      notes: feedbackData.notes,
      recommendation: feedbackData.recommendation
    });

    logger.info('Interview feedback submitted successfully', {
      interviewId: id,
      interviewerId: feedbackData.interviewerId,
      allFeedbackCollected: result.allFeedbackCollected
    });

    return res.json({
      success: true,
      data: {
        interviewId: id,
        feedbackSubmitted: result.feedbackSubmitted,
        allFeedbackCollected: result.allFeedbackCollected,
        aggregatedScores: result.aggregatedScores,
        nextActions: result.nextActions
      },
      message: 'Interview feedback submitted successfully'
    });
  } catch (error) {
    logger.error('Error submitting interview feedback:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to submit interview feedback'
    });
  }
});

/**
 * POST /api/hiring/interviews/:id/complete
 * Complete an interview and aggregate all feedback
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    logger.info('Completing interview', {
      tenantId,
      userId,
      interviewId: id
    });

    // Check if interview exists
    const interviewsList = await db.select()
      .from(interviews)
      .where(and(
        eq(interviews.id, id),
        eq(interviews.tenantId, tenantId)
      ))
      .limit(1);

    if (interviewsList.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Interview not found'
      });
    }

    const interview = interviewsList[0];

    // Check if interview can be completed
    if (interview.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Interview is already completed'
      });
    }

    // Initialize interview workflow
    const workflow = new InterviewManagementWorkflow();

    // Complete interview using workflow
    const result = await workflow.completeInterview(id);

    logger.info('Interview completed successfully', {
      interviewId: id,
      overallScore: result.aggregatedScores?.overallScore,
      recommendation: result.aggregatedScores?.recommendation
    });

    return res.json({
      success: true,
      data: {
        interviewId: id,
        aggregatedScores: result.aggregatedScores,
        nextActions: result.nextActions,
        outputTriggers: result.outputTriggers
      },
      message: 'Interview completed successfully'
    });
  } catch (error) {
    logger.error('Error completing interview:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to complete interview'
    });
  }
});

/**
 * GET /api/hiring/interviews/:id/feedback
 * Get all feedback for an interview
 */
router.get('/:id/feedback', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    logger.info('Fetching interview feedback', {
      tenantId,
      interviewId: id
    });

    // Get interview with feedback
    const interviewsList = await db.select()
      .from(interviews)
      .where(and(
        eq(interviews.id, id),
        eq(interviews.tenantId, tenantId)
      ))
      .limit(1);

    if (interviewsList.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Interview not found'
      });
    }

    const interview = interviewsList[0];

    const feedbackArray = Array.isArray(interview.feedback) ? interview.feedback : [];
    const interviewersArray = Array.isArray(interview.interviewers) ? interview.interviewers : [];

    logger.info('Interview feedback fetched', {
      interviewId: id,
      feedbackCount: feedbackArray.length
    });

    return res.json({
      success: true,
      data: {
        interviewId: id,
        feedback: interview.feedback || [],
        aggregatedScores: {
          overallScore: interview.overallScore,
          scores: interview.scores,
          recommendation: interview.recommendation,
          strengths: interview.strengths,
          weaknesses: interview.weaknesses,
          concerns: interview.concerns
        },
        interviewers: interview.interviewers,
        feedbackComplete: feedbackArray.length >= interviewersArray.length
      }
    });
  } catch (error) {
    logger.error('Error fetching interview feedback:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch interview feedback'
    });
  }
});

/**
 * GET /api/hiring/interviews/by-candidate/:candidateId
 * Get all interviews for a specific candidate
 */
router.get('/by-candidate/:candidateId', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { candidateId } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    logger.info('Fetching interviews by candidate', {
      tenantId,
      candidateId
    });

    const interviewsList = await db.select()
      .from(interviews)
      .where(and(
        eq(interviews.tenantId, tenantId),
        eq(interviews.candidateId, candidateId)
      ))
      .orderBy(asc(interviews.round), desc(interviews.scheduledDate));

    logger.info('Interviews fetched by candidate', {
      candidateId,
      count: interviewsList.length
    });

    return res.json({
      success: true,
      data: interviewsList,
      summary: {
        total: interviewsList.length,
        byStatus: interviewsList.reduce((acc, interview) => {
          acc[interview.status] = (acc[interview.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byType: interviewsList.reduce((acc, interview) => {
          acc[interview.interviewType] = (acc[interview.interviewType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        rounds: Math.max(...interviewsList.map(i => i.round || 1), 0)
      }
    });
  } catch (error) {
    logger.error('Error fetching interviews by candidate:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch interviews by candidate'
    });
  }
});

/**
 * DELETE /api/hiring/interviews/:id
 * Cancel an interview
 */
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;
    const { reason } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    logger.info('Cancelling interview', {
      tenantId,
      userId,
      interviewId: id,
      reason
    });

    // Check if interview exists
    const existingInterviews = await db.select()
      .from(interviews)
      .where(and(
        eq(interviews.id, id),
        eq(interviews.tenantId, tenantId)
      ))
      .limit(1);

    if (existingInterviews.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Interview not found'
      });
    }

    const interview = existingInterviews[0];

    // Check if interview can be cancelled
    if (interview.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel completed interview'
      });
    }

    // Cancel interview (update status)
    await db.update(interviews)
      .set({
        status: 'cancelled',
        // statusReason: reason || 'Cancelled by user', // Property doesn't exist in schema
        cancelledAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(interviews.id, id),
        eq(interviews.tenantId, tenantId)
      ));

    logger.info('Interview cancelled successfully', { interviewId: id });

    return res.json({
      success: true,
      message: 'Interview cancelled successfully'
    });
  } catch (error) {
    logger.error('Error cancelling interview:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to cancel interview'
    });
  }
});

export default router;
