import { Router } from 'express';
import { Logger } from '../../../../utils/logger.js';
import { db } from '../../../../db/index.js';
import { performanceFeedback } from '../../../../db/schema/performance.js';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

const router = Router();
const logger = new Logger('PerformanceFeedbackAPI');

// ============================================================================
// FEEDBACK ENDPOINTS
// ============================================================================

/**
 * GET /api/performance/feedback
 * List all feedback with optional filters
 */
router.get('/feedback', async (req, res) => {
  try {
    const { tenantId, employeeId, providerId, type, startDate, endDate } = req.query;

    logger.info('Fetching feedback', { employeeId, providerId, type });

    // Mock implementation
    const feedback = await fetchFeedback({ tenantId, employeeId, providerId, type, startDate, endDate });

    return res.json({
      success: true,
      data: feedback,
      total: feedback.length,
      filters: { tenantId, employeeId, providerId, type }
    });
  } catch (error) {
    logger.error('Failed to fetch feedback:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch feedback',
      message: error instanceof Error ? error instanceof Error ? error.message : 'Unknown error' : 'Unknown error'
    });
  }
});

/**
 * POST /api/performance/feedback
 * Give feedback to an employee
 */
router.post('/feedback', async (req, res) => {
  try {
    const { employeeId, tenantId, providerId, type, rating, comments, category, strengths, improvementAreas, suggestions } = req.body;

    logger.info('Creating feedback', { employeeId, providerId, type, rating });

    // Mock implementation
    const feedback = await createFeedback({
      employeeId,
      tenantId,
      providerId,
      type: type || 'manager',
      rating,
      comments,
      category: category || 'general',
      strengths: strengths || [],
      improvementAreas: improvementAreas || [],
      suggestions: suggestions || []
    });

    return res.json({
      success: true,
      data: feedback,
      message: 'Feedback submitted successfully'
    });
  } catch (error) {
    logger.error('Failed to create feedback:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create feedback',
      message: error instanceof Error ? error instanceof Error ? error.message : 'Unknown error' : 'Unknown error'
    });
  }
});

/**
 * GET /api/performance/employees/:employeeId/feedback
 * Get all feedback for specific employee
 */
router.get('/employees/:employeeId/feedback', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { type, startDate, endDate, sentiment } = req.query;

    logger.info('Fetching employee feedback', { employeeId, filters: { type, sentiment } });

    // Mock implementation
    const feedback = await fetchEmployeeFeedback(employeeId, { type, startDate, endDate, sentiment });

    // Calculate feedback summary
    const summary = {
      totalFeedback: feedback.length,
      averageRating: feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length || 0,
      sentimentBreakdown: {
        positive: feedback.filter(f => f.sentiment === 'positive').length,
        neutral: feedback.filter(f => f.sentiment === 'neutral').length,
        negative: feedback.filter(f => f.sentiment === 'negative').length,
        mixed: feedback.filter(f => f.sentiment === 'mixed').length
      },
      byType: {
        manager: feedback.filter(f => f.type === 'manager').length,
        peer: feedback.filter(f => f.type === 'peer').length,
        subordinate: feedback.filter(f => f.type === 'subordinate').length,
        self: feedback.filter(f => f.type === 'self').length
      }
    };

    return res.json({
      success: true,
      data: feedback,
      summary,
      employeeId
    });
  } catch (error) {
    logger.error('Failed to fetch employee feedback:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch employee feedback',
      message: error instanceof Error ? error instanceof Error ? error.message : 'Unknown error' : 'Unknown error'
    });
  }
});

/**
 * GET /api/performance/feedback/sentiment-analysis
 * Get sentiment analysis for feedback
 */
router.get('/feedback/sentiment-analysis', async (req, res) => {
  try {
    const { employeeId, tenantId, startDate, endDate } = req.query;

    logger.info('Performing sentiment analysis', { employeeId, tenantId });

    // Mock implementation
    const sentimentAnalysis = await performSentimentAnalysis({ employeeId, tenantId, startDate, endDate });

    return res.json({
      success: true,
      data: sentimentAnalysis
    });
  } catch (error) {
    logger.error('Failed to perform sentiment analysis:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to perform sentiment analysis',
      message: error instanceof Error ? error instanceof Error ? error.message : 'Unknown error' : 'Unknown error'
    });
  }
});

// ============================================================================
// DATABASE OPERATIONS (Real Drizzle ORM queries)
// ============================================================================

async function fetchFeedback(filters: any): Promise<any[]> {
  try {
    const conditions = [];
    
    if (filters.tenantId) {
      conditions.push(eq(performanceFeedback.tenantId, filters.tenantId));
    }
    if (filters.employeeId) {
      conditions.push(eq(performanceFeedback.employeeId, filters.employeeId));
    }
    if (filters.providerId) {
      conditions.push(eq(performanceFeedback.reviewerId, filters.providerId));
    }
    if (filters.type) {
      conditions.push(eq(performanceFeedback.type, filters.type));
    }
    if (filters.startDate) {
      conditions.push(gte(performanceFeedback.createdAt, new Date(filters.startDate)));
    }
    if (filters.endDate) {
      conditions.push(lte(performanceFeedback.createdAt, new Date(filters.endDate)));
    }
    
    const queryBuilder = db.select().from(performanceFeedback);

    const feedback = conditions.length > 0
      ? await queryBuilder.where(and(...conditions)).orderBy(desc(performanceFeedback.createdAt))
      : await queryBuilder.orderBy(desc(performanceFeedback.createdAt));

    return feedback;
  } catch (error) {
    logger.error('Database error fetching feedback:', error);
    throw error;
  }
}

async function createFeedback(feedbackData: any): Promise<any> {
  try {
    const now = new Date();
    const periodStart = feedbackData.periodStart ? new Date(feedbackData.periodStart) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const periodEnd = feedbackData.periodEnd ? new Date(feedbackData.periodEnd) : now;

    const newFeedback = {
      tenantId: feedbackData.tenantId,
      employeeId: feedbackData.employeeId,
      reviewerId: feedbackData.providerId || feedbackData.reviewerId,
      type: feedbackData.type || 'manager_feedback',
      title: feedbackData.title || `Feedback for ${feedbackData.employeeId}`,
      description: feedbackData.comments || feedbackData.description || '',
      strengths: feedbackData.strengths || [],
      improvementAreas: feedbackData.improvementAreas || [],
      specificExamples: feedbackData.suggestions || [],
      overallRating: feedbackData.rating ? feedbackData.rating.toString() : undefined,
      categories: feedbackData.category ? [feedbackData.category] : [],
      feedbackPeriodStart: periodStart,
      feedbackPeriodEnd: periodEnd,
      createdBy: feedbackData.providerId || feedbackData.reviewerId,
      updatedBy: feedbackData.providerId || feedbackData.reviewerId
    };

    const [created] = await db.insert(performanceFeedback).values(newFeedback).returning();
    return created;
  } catch (error) {
    logger.error('Database error creating feedback:', error);
    throw error;
  }
}

async function fetchEmployeeFeedback(employeeId: string, filters: any): Promise<any[]> {
  try {
    const conditions = [eq(performanceFeedback.employeeId, employeeId)];

    if (filters.type) {
      conditions.push(eq(performanceFeedback.type, filters.type));
    }
    // if (filters.sentiment) {
    //   conditions.push(eq(performanceFeedback.rating, filters.sentiment));
    // }
    if (filters.startDate) {
      conditions.push(gte(performanceFeedback.createdAt, new Date(filters.startDate)));
    }
    if (filters.endDate) {
      conditions.push(lte(performanceFeedback.createdAt, new Date(filters.endDate)));
    }
    
    const feedback = await db.select()
      .from(performanceFeedback)
      .where(and(...conditions))
      .orderBy(desc(performanceFeedback.createdAt));
    
    return feedback;
  } catch (error) {
    logger.error('Database error fetching employee feedback:', error);
    throw error;
  }
}

async function performSentimentAnalysis(params: any): Promise<any> {
  try {
    const conditions = [];
    
    if (params.employeeId) {
      conditions.push(eq(performanceFeedback.employeeId, params.employeeId));
    }
    if (params.tenantId) {
      conditions.push(eq(performanceFeedback.tenantId, params.tenantId));
    }
    if (params.startDate) {
      conditions.push(gte(performanceFeedback.createdAt, new Date(params.startDate)));
    }
    if (params.endDate) {
      conditions.push(lte(performanceFeedback.createdAt, new Date(params.endDate)));
    }
    
    const queryBuilder = db.select().from(performanceFeedback);

    const allFeedback = conditions.length > 0
      ? await queryBuilder.where(and(...conditions))
      : await queryBuilder;
    
    // Calculate sentiment breakdown
    const breakdown = {
      positive: allFeedback.filter(f => (f as any).sentiment === 'positive').length,
      neutral: allFeedback.filter(f => (f as any).sentiment === 'neutral').length,
      negative: allFeedback.filter(f => (f as any).sentiment === 'negative').length,
      mixed: allFeedback.filter(f => (f as any).sentiment === 'mixed').length
    };
    
    // Calculate overall sentiment score
    const totalFeedback = allFeedback.length;
    const sentimentScore = totalFeedback > 0
      ? (breakdown.positive * 1 + breakdown.neutral * 0.5 + breakdown.mixed * 0.3) / totalFeedback
      : 0;
    
    // Determine overall sentiment
    let overallSentiment = 'neutral';
    if (sentimentScore >= 0.7) overallSentiment = 'positive';
    else if (sentimentScore <= 0.3) overallSentiment = 'negative';
    
    // Extract themes from comments (simple keyword extraction)
    const allComments = allFeedback.map(f => (f as any).comments || '').join(' ').toLowerCase();
    const keyThemes = [];
    if (allComments.includes('leadership')) keyThemes.push('leadership');
    if (allComments.includes('communication')) keyThemes.push('communication');
    if (allComments.includes('collaboration') || allComments.includes('teamwork')) keyThemes.push('collaboration');
    if (allComments.includes('technical')) keyThemes.push('technical_skills');
    
    return {
      overallSentiment,
      sentimentScore,
      breakdown,
      trends: 'stable', // Would calculate from historical data
      keyThemes
    };
  } catch (error) {
    logger.error('Database error performing sentiment analysis:', error);
    throw error;
  }
}

function calculateSentiment(rating: number, comments: string): string {
  // Sentiment based on rating
  if (rating >= 4) return 'positive';
  if (rating <= 2) return 'negative';
  
  // Check comments for additional context
  const lowerComments = comments?.toLowerCase() || '';
  if (lowerComments.includes('excellent') || lowerComments.includes('outstanding')) return 'positive';
  if (lowerComments.includes('poor') || lowerComments.includes('needs improvement')) return 'negative';
  if (lowerComments.includes('however') || lowerComments.includes('but')) return 'mixed';
  
  return 'neutral';
}

export default router;

