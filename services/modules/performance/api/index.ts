import { Router } from 'express';
import goalsRouter from './goals.js';
import reviewsRouter from './reviews.js';
import feedbackRouter from './feedback.js';
import analyticsRouter from './analytics.js';
import coachingRouter from './coaching.js';
import cyclesRouter from './cycles.js';
import oneOnOneRouter from './one-on-one.js';
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
router.use('/cycles', cyclesRouter);
router.use('/one-on-one', oneOnOneRouter);

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
      cycles: {
        'POST /api/performance/cycles': 'Create performance cycle (with multi-agent integration)',
        'POST /api/performance/cycles/:id/activate': 'Activate cycle and create individual goals',
        'POST /api/performance/cycles/:id/complete': 'Complete and archive cycle',
        'GET /api/performance/cycles/:id/status': 'Get cycle status and analytics',
        'POST /api/performance/cycles/:id/employees/:employeeId/goals': 'Create individual goals for employee'
      },
      oneOnOne: {
        'POST /api/performance/one-on-one/schedule': 'Schedule 1:1 meeting with BOT assistance',
        'POST /api/performance/one-on-one/:meetingId/prepare': 'Start preparation for meeting',
        'POST /api/performance/one-on-one/prepare/:sessionId/chat': 'Chat with BOT during preparation',
        'POST /api/performance/one-on-one/prepare/:sessionId/complete': 'Complete preparation',
        'POST /api/performance/one-on-one/:meetingId/document': 'Document meeting outcomes',
        'GET /api/performance/one-on-one/:meetingId/preparation-status': 'Get preparation status',
        'GET /api/performance/one-on-one/upcoming': 'Get upcoming meetings'
      },
      module: {
        'GET /api/performance/health': 'Module health check',
        'GET /api/performance/status': 'Module status and configuration',
        'GET /api/performance/docs': 'API documentation'
      }
    },
    totalEndpoints: 44,
    documentation: 'See individual endpoint descriptions for request/response formats'
  });
});

export default router;

