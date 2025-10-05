import { Router } from 'express';
import goalsRouter from './goals.js';
import reviewsRouter from './reviews.js';
import feedbackRouter from './feedback.js';
import analyticsRouter from './analytics.js';
import coachingRouter from './coaching.js';
import { performanceModule } from '../performance-module.js';

const router = Router();

// ============================================================================
// MOUNT ROUTERS
// ============================================================================

// Mount all performance management API routers
router.use('/', goalsRouter);
router.use('/', reviewsRouter);
router.use('/', feedbackRouter);
router.use('/', analyticsRouter);
router.use('/', coachingRouter);

// ============================================================================
// MODULE STATUS & HEALTH ENDPOINTS
// ============================================================================

/**
 * GET /api/performance/health
 * Health check for Performance Management module
 */
router.get('/health', async (req, res) => {
  try {
    const health = await performanceModule.checkHealth();
    
    res.json({
      success: true,
      ...health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      healthy: false,
      error: error instanceof Error ? (error as any).message : 'Unknown error'
    });
  }
});

/**
 * GET /api/performance/status
 * Get module status and configuration
 */
router.get('/status', async (req, res) => {
  try {
    const status = performanceModule.getStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? (error as any).message : 'Unknown error'
    });
  }
});

/**
 * GET /api/performance/docs
 * API documentation endpoint
 */
router.get('/docs', (req, res) => {
  res.json({
    success: true,
    module: 'Performance Management API',
    version: '1.0.0',
    endpoints: {
      goals: {
        'GET /api/performance/goals': 'List all goals',
        'GET /api/performance/goals/:id': 'Get goal details',
        'POST /api/performance/goals': 'Create goal (manual or AI-generated)',
        'PUT /api/performance/goals/:id': 'Update goal',
        'DELETE /api/performance/goals/:id': 'Delete goal',
        'POST /api/performance/goals/:id/progress': 'Update goal progress',
        'GET /api/performance/employees/:employeeId/goals': 'Get employee goals'
      },
      reviews: {
        'GET /api/performance/reviews': 'List all reviews',
        'GET /api/performance/reviews/:id': 'Get review details',
        'POST /api/performance/reviews': 'Create review (triggers workflow)',
        'PUT /api/performance/reviews/:id': 'Update review',
        'POST /api/performance/reviews/:id/complete': 'Complete and finalize review',
        'GET /api/performance/employees/:employeeId/reviews': 'Get employee reviews'
      },
      feedback: {
        'GET /api/performance/feedback': 'List all feedback',
        'POST /api/performance/feedback': 'Give feedback',
        'GET /api/performance/employees/:employeeId/feedback': 'Get employee feedback',
        'GET /api/performance/feedback/sentiment-analysis': 'Get sentiment analysis'
      },
      analytics: {
        'GET /api/performance/analytics/overview': 'Get performance overview',
        'GET /api/performance/analytics/employees/:employeeId': 'Get employee analytics',
        'GET /api/performance/analytics/trends': 'Get performance trends',
        'GET /api/performance/analytics/distribution': 'Get score distribution',
        'GET /api/performance/analytics/benchmarks': 'Get performance benchmarks',
        'GET /api/performance/analytics/risks': 'Get performance risks'
      },
      coaching: {
        'POST /api/performance/coaching/request': 'Request coaching session or program',
        'GET /api/performance/coaching/sessions': 'List coaching sessions',
        'GET /api/performance/coaching/sessions/:id': 'Get session details',
        'POST /api/performance/coaching/sessions/:id/complete': 'Complete coaching session',
        'GET /api/performance/coaching/employees/:employeeId/plans': 'Get employee coaching plans',
        'GET /api/performance/coaching/effectiveness': 'Get coaching effectiveness metrics'
      },
      module: {
        'GET /api/performance/health': 'Module health check',
        'GET /api/performance/status': 'Module status and configuration',
        'GET /api/performance/docs': 'API documentation'
      }
    },
    totalEndpoints: 32,
    documentation: 'See individual endpoint descriptions for request/response formats'
  });
});

export default router;

