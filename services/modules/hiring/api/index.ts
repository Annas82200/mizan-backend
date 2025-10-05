import { Router } from 'express';
import requisitionsRouter from './requisitions.js';
import candidatesRouter from './candidates.js';
import interviewsRouter from './interviews.js';
import offersRouter from './offers.js';
import analyticsRouter from './analytics.js';

const router = Router();

// Mount sub-routers
router.use('/requisitions', requisitionsRouter);
router.use('/candidates', candidatesRouter);
router.use('/interviews', interviewsRouter);
router.use('/offers', offersRouter);
router.use('/analytics', analyticsRouter);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Hiring Module API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      requisitions: {
        status: 'active',
        endpoints: [
          'GET /requisitions',
          'GET /requisitions/:id',
          'POST /requisitions',
          'PUT /requisitions/:id',
          'PATCH /requisitions/:id/status',
          'DELETE /requisitions/:id',
          'GET /requisitions/:id/analytics',
          'POST /requisitions/:id/approve',
          'POST /requisitions/:id/reject'
        ]
      },
      candidates: {
        status: 'active',
        endpoints: [
          'GET /candidates',
          'GET /candidates/:id',
          'POST /candidates',
          'PUT /candidates/:id',
          'PATCH /candidates/:id/status',
          'POST /candidates/:id/assess',
          'GET /candidates/:id/assessments',
          'GET /candidates/by-requisition/:requisitionId',
          'POST /candidates/:id/notes',
          'DELETE /candidates/:id'
        ]
      },
      interviews: {
        status: 'active',
        endpoints: [
          'GET /interviews',
          'GET /interviews/:id',
          'POST /interviews',
          'PUT /interviews/:id',
          'PATCH /interviews/:id/status',
          'POST /interviews/:id/feedback',
          'POST /interviews/:id/complete',
          'GET /interviews/:id/feedback',
          'GET /interviews/by-candidate/:candidateId',
          'DELETE /interviews/:id'
        ]
      },
      offers: {
        status: 'active',
        endpoints: [
          'GET /offers',
          'GET /offers/:id',
          'POST /offers',
          'PUT /offers/:id',
          'POST /offers/:id/send',
          'POST /offers/:id/accept',
          'POST /offers/:id/reject',
          'POST /offers/:id/negotiate',
          'PATCH /offers/:id/status',
          'GET /offers/by-candidate/:candidateId',
          'DELETE /offers/:id'
        ]
      },
      analytics: {
        status: 'active',
        endpoints: [
          'GET /analytics/overview',
          'GET /analytics/funnel',
          'GET /analytics/sources',
          'GET /analytics/departments',
          'GET /analytics/time-series',
          'GET /analytics/performance',
          'GET /analytics/reports/summary'
        ]
      }
    }
  });
});

// API documentation endpoint
router.get('/docs', (req, res) => {
  res.json({
    success: true,
    title: 'Hiring Module API Documentation',
    version: '1.0.0',
    description: 'Complete API for managing the hiring process including requisitions, candidates, interviews, and offers',
    baseUrl: '/api/hiring',
    authentication: {
      required: true,
      headers: [
        'x-tenant-id: Tenant identifier (required)',
        'x-user-id: User identifier (required for write operations)'
      ]
    },
    modules: {
      requisitions: {
        description: 'Manage job requisitions',
        baseUrl: '/api/hiring/requisitions',
        status: 'active'
      },
      candidates: {
        description: 'Manage candidates and applications',
        baseUrl: '/api/hiring/candidates',
        status: 'active'
      },
      interviews: {
        description: 'Manage interview process',
        baseUrl: '/api/hiring/interviews',
        status: 'active'
      },
      offers: {
        description: 'Manage job offers',
        baseUrl: '/api/hiring/offers',
        status: 'active'
      },
      analytics: {
        description: 'Hiring analytics and reports',
        baseUrl: '/api/hiring/analytics',
        status: 'active'
      }
    }
  });
});

export default router;
