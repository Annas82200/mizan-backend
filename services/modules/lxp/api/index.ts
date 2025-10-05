// LXP Module API Router - Main Entry Point
// Task Reference: Module 1 (LXP) - Section 1.4 (API Endpoints)

import { Router } from 'express';
import learningPathsRouter from './learning-paths.js';
import coursesRouter from './courses.js';
import progressTrackingRouter from './progress-tracking.js';
import assessmentsRouter from './assessments.js';
import analyticsRouter from './analytics.js';
import skillsIntegrationRouter from './skills-integration.js';
import performanceIntegrationRouter from './performance-integration.js';
import cultureIntegrationRouter from './culture-integration.js';

// ============================================================================
// LXP Module API Router
// ============================================================================
// Status: ✅ Complete
// Description: Main API router that combines all LXP endpoints
// Dependencies: All 1.4.x tasks ✅ Complete

const router = Router();

// ============================================================================
// API Routes
// ============================================================================

// Learning Path endpoints
router.use('/learning-paths', learningPathsRouter);

// Course endpoints
router.use('/courses', coursesRouter);

// Progress tracking endpoints
router.use('/progress', progressTrackingRouter);

// Additional progress tracking endpoints (enrollment-based)
router.use('/enrollments', progressTrackingRouter);
router.use('/employees', progressTrackingRouter);

// Assessment endpoints
router.use('/assessments', assessmentsRouter);

// Analytics endpoints
router.use('/analytics', analyticsRouter);

// Skills Analysis integration endpoints
router.use('/skills-integration', skillsIntegrationRouter);

// Performance Management integration endpoints
router.use('/performance-integration', performanceIntegrationRouter);

// Culture Analysis integration endpoints
router.use('/culture-integration', cultureIntegrationRouter);

// ============================================================================
// Health Check Endpoint
// ============================================================================

/**
 * GET /api/lxp/health
 * LXP module health check
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    module: 'LXP',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: {
      learningPaths: '/api/lxp/learning-paths',
      courses: '/api/lxp/courses',
      progress: '/api/lxp/progress',
      assessments: '/api/lxp/assessments',
      analytics: '/api/lxp/analytics',
      skillsIntegration: '/api/lxp/skills-integration',
      performanceIntegration: '/api/lxp/performance-integration',
      cultureIntegration: '/api/lxp/culture-integration'
    }
  });
});

// ============================================================================
// API Documentation Endpoint
// ============================================================================

/**
 * GET /api/lxp/docs
 * API documentation
 */
router.get('/docs', (req, res) => {
  res.json({
    success: true,
    module: 'LXP',
    version: '1.0.0',
    description: 'Learning Experience Platform API',
    endpoints: {
      learningPaths: {
        base: '/api/lxp/learning-paths',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'Learning path management endpoints'
      },
      courses: {
        base: '/api/lxp/courses',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'Course management endpoints'
      },
      progress: {
        base: '/api/lxp/progress',
        methods: ['GET', 'PUT'],
        description: 'Progress tracking endpoints'
      },
      assessments: {
        base: '/api/lxp/assessments',
        methods: ['GET', 'POST'],
        description: 'Assessment endpoints'
      },
      analytics: {
        base: '/api/lxp/analytics',
        methods: ['GET'],
        description: 'Analytics endpoints'
      },
      skillsIntegration: {
        base: '/api/lxp/skills-integration',
        methods: ['GET', 'POST'],
        description: 'Skills Analysis integration endpoints'
      },
      performanceIntegration: {
        base: '/api/lxp/performance-integration',
        methods: ['GET', 'POST'],
        description: 'Performance Management integration endpoints'
      },
      cultureIntegration: {
        base: '/api/lxp/culture-integration',
        methods: ['GET', 'POST'],
        description: 'Culture Analysis integration endpoints'
      }
    },
    authentication: 'Bearer token required',
    rateLimit: '100 requests per minute per user'
  });
});

// ============================================================================
// Error Handling Middleware
// ============================================================================

router.use((err: any, req: any, res: any, next: any) => {
  console.error('LXP API Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    module: 'LXP',
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// 404 Handler
// ============================================================================

router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    module: 'LXP',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// Export Router
// ============================================================================

export default router;
