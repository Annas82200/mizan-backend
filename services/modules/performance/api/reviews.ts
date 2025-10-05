import { Router } from 'express';
import { Logger } from '../../../../utils/logger.js';
import { PerformanceReviewWorkflow } from '../workflows/review.js';
import { db } from '../../../../db/index.js';
import { performanceReviews } from '../../../../db/schema/performance.js';
import { eq, and, desc } from 'drizzle-orm';

const router = Router();
const logger = new Logger('PerformanceReviewsAPI');
const reviewWorkflow = new PerformanceReviewWorkflow();

// ============================================================================
// REVIEWS ENDPOINTS
// ============================================================================

/**
 * GET /api/performance/reviews
 * List all reviews with optional filters
 */
router.get('/reviews', async (req, res) => {
  try {
    const { tenantId, employeeId, reviewType, status, period } = req.query;

    logger.info('Fetching reviews', { tenantId, employeeId, filters: { reviewType, status, period } });

    // Mock implementation
    const reviews = await fetchReviews({ tenantId, employeeId, reviewType, status, period });

    return res.json({
      success: true,
      data: reviews,
      total: reviews.length,
      filters: { tenantId, employeeId, reviewType, status, period }
    });
  } catch (error) {
    logger.error('Failed to fetch reviews:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch reviews',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/performance/reviews/:id
 * Get review details by ID
 */
router.get('/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;

    logger.info('Fetching review details', { reviewId: id });

    // Mock implementation
    const review = await fetchReviewById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found'
      });
    }

    return res.json({
      success: true,
      data: review
    });
  } catch (error) {
    logger.error('Failed to fetch review:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch review',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/performance/reviews
 * Create new review (triggers workflow)
 */
router.post('/reviews', async (req, res) => {
  try {
    const { employeeId, tenantId, reviewerId, reviewType, period, organizationalContext, includeCoaching, include360Feedback } = req.body;

    logger.info('Creating review', { employeeId, reviewType });

    // Execute review workflow
    const result = await reviewWorkflow.executeWorkflow({
      employeeId,
      tenantId,
      reviewerId,
      reviewType: reviewType || 'quarterly',
      period: period || {
        startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString()
      },
      organizationalContext,
      includeCoaching,
      include360Feedback
    });

    return res.json({
      success: true,
      data: {
        reviewId: result.reviewId,
        performanceAnalysis: result.performanceAnalysis,
        coachingGuidance: result.coachingGuidance,
        reviewReport: result.reviewReport,
        outputTriggers: result.outputTriggers
      },
      metadata: result.metadata
    });
  } catch (error) {
    logger.error('Failed to create review:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create review',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/performance/reviews/:id
 * Update existing review
 */
router.put('/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    logger.info('Updating review', { reviewId: id });

    // Mock implementation
    const updatedReview = await updateReview(id, updates);

    return res.json({
      success: true,
      data: updatedReview
    });
  } catch (error) {
    logger.error('Failed to update review:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update review',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/performance/reviews/:id/complete
 * Complete and finalize review
 */
router.post('/reviews/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { finalComments, approvalStatus } = req.body;

    logger.info('Completing review', { reviewId: id });

    // Mock implementation
    const completedReview = await completeReview(id, finalComments, approvalStatus);

    return res.json({
      success: true,
      data: completedReview,
      message: 'Review completed and finalized'
    });
  } catch (error) {
    logger.error('Failed to complete review:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to complete review',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/performance/employees/:employeeId/reviews
 * Get all reviews for specific employee
 */
router.get('/employees/:employeeId/reviews', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { reviewType, status, limit } = req.query;

    logger.info('Fetching employee reviews', { employeeId, filters: { reviewType, status, limit } });

    // Mock implementation
    const reviews = await fetchEmployeeReviews(employeeId, { reviewType, status, limit });

    return res.json({
      success: true,
      data: reviews,
      total: reviews.length,
      employeeId
    });
  } catch (error) {
    logger.error('Failed to fetch employee reviews:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch employee reviews',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// DATABASE OPERATIONS (Real Drizzle ORM queries)
// ============================================================================

async function fetchReviews(filters: any): Promise<any[]> {
  try {
    const conditions = [];
    
    if (filters.tenantId) {
      conditions.push(eq(performanceReviews.tenantId, filters.tenantId));
    }
    if (filters.employeeId) {
      conditions.push(eq(performanceReviews.employeeId, filters.employeeId));
    }
    if (filters.reviewType) {
      conditions.push(eq(performanceReviews.type, filters.reviewType));
    }
    if (filters.status) {
      conditions.push(eq(performanceReviews.status, filters.status));
    }
    
    const queryBuilder = db.select().from(performanceReviews);

    const reviews = conditions.length > 0
      ? await queryBuilder.where(and(...conditions)).orderBy(desc(performanceReviews.reviewEndDate))
      : await queryBuilder.orderBy(desc(performanceReviews.reviewEndDate));

    return reviews;
  } catch (error) {
    logger.error('Database error fetching reviews:', error);
    throw error;
  }
}

async function fetchReviewById(id: string): Promise<any> {
  try {
    const reviews = await db.select()
      .from(performanceReviews)
      .where(eq(performanceReviews.id, id))
      .limit(1);
    
    return reviews[0] || null;
  } catch (error) {
    logger.error('Database error fetching review by ID:', error);
    throw error;
  }
}

async function updateReview(id: string, updates: any): Promise<any> {
  try {
    const updateData: any = {
      updatedAt: new Date()
    };
    
    if (updates.status) updateData.status = updates.status;
    if (updates.overallRating !== undefined) updateData.overallRating = updates.overallRating.toString();
    if (updates.reviewerComments) updateData.reviewerComments = updates.reviewerComments;
    if (updates.employeeComments) updateData.employeeComments = updates.employeeComments;
    if (updates.strengths) updateData.strengths = updates.strengths;
    if (updates.developmentAreas) updateData.developmentAreas = updates.developmentAreas;
    
    const [updated] = await db.update(performanceReviews)
      .set(updateData)
      .where(eq(performanceReviews.id, id))
      .returning();
    
    return updated;
  } catch (error) {
    logger.error('Database error updating review:', error);
    throw error;
  }
}

async function completeReview(id: string, finalComments: string, approvalStatus: string): Promise<any> {
  try {
    const [completed] = await db.update(performanceReviews)
      .set({
        status: 'completed',
        managerComments: finalComments,
        completedAt: new Date(),
        updatedAt: new Date()
        // Note: metadata field doesn't exist in schema - approval info stored in status
      })
      .where(eq(performanceReviews.id, id))
      .returning();

    return completed;
  } catch (error) {
    logger.error('Database error completing review:', error);
    throw error;
  }
}

async function fetchEmployeeReviews(employeeId: string, filters: any): Promise<any[]> {
  try {
    const conditions = [eq(performanceReviews.employeeId, employeeId)];

    if (filters.reviewType) {
      conditions.push(eq(performanceReviews.type, filters.reviewType));
    }
    if (filters.status) {
      conditions.push(eq(performanceReviews.status, filters.status));
    }

    const queryBuilder = db.select()
      .from(performanceReviews)
      .where(and(...conditions))
      .orderBy(desc(performanceReviews.reviewEndDate));

    const reviews = filters.limit
      ? await queryBuilder.limit(parseInt(filters.limit))
      : await queryBuilder;

    return reviews;
  } catch (error) {
    logger.error('Database error fetching employee reviews:', error);
    throw error;
  }
}

export default router;

