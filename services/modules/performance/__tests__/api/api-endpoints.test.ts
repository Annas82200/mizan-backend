import request from 'supertest';
import express from 'express';
import performanceRouter from '../../api/index';

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/performance', performanceRouter);

describe('Performance Management API Endpoints Tests', () => {
  
  // ============================================================================
  // GOALS ENDPOINTS TESTS (7 endpoints)
  // ============================================================================
  
  describe('Goals Endpoints', () => {
    describe('GET /api/performance/goals', () => {
      it('should list all goals', async () => {
        const response = await request(app)
          .get('/api/performance/goals')
          .query({ tenantId: 'tenant_123', employeeId: 'emp_456' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should filter goals by status', async () => {
        const response = await request(app)
          .get('/api/performance/goals')
          .query({ tenantId: 'tenant_123', status: 'in_progress' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should filter goals by period', async () => {
        const response = await request(app)
          .get('/api/performance/goals')
          .query({ period: '2024' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/performance/goals/:id', () => {
      it('should get goal details by ID', async () => {
        const response = await request(app)
          .get('/api/performance/goals/goal_123');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
      });

      it('should return 404 for non-existent goal', async () => {
        const response = await request(app)
          .get('/api/performance/goals/non_existent');

        expect(response.status).toBe(404);
      });
    });

    describe('POST /api/performance/goals', () => {
      it('should create AI-generated goals', async () => {
        const response = await request(app)
          .post('/api/performance/goals')
          .send({
            employeeId: 'emp_123',
            tenantId: 'tenant_456',
            managerId: 'mgr_789',
            period: '2024',
            useAI: true,
            goalData: {
              organizationalContext: {
                role: 'Engineer',
                department: 'Engineering'
              }
            },
            organizationalObjectives: {
              strategicGoals: ['Product launch'],
              departmentGoals: [],
              teamGoals: []
            }
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.aiGenerated).toBe(true);
      });

      it('should create manual goal', async () => {
        const response = await request(app)
          .post('/api/performance/goals')
          .send({
            employeeId: 'emp_123',
            tenantId: 'tenant_456',
            useAI: false,
            goalData: {
              title: 'Complete certification',
              description: 'Get AWS certification',
              category: 'learning',
              type: 'qualitative'
            }
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.aiGenerated).toBe(false);
      });
    });

    describe('PUT /api/performance/goals/:id', () => {
      it('should update goal', async () => {
        const response = await request(app)
          .put('/api/performance/goals/goal_123')
          .send({
            title: 'Updated goal title',
            progress: 75
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('DELETE /api/performance/goals/:id', () => {
      it('should delete goal', async () => {
        const response = await request(app)
          .delete('/api/performance/goals/goal_123');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('POST /api/performance/goals/:id/progress', () => {
      it('should update goal progress', async () => {
        const response = await request(app)
          .post('/api/performance/goals/goal_123/progress')
          .send({
            progress: 80,
            notes: 'Good progress this week',
            milestoneCompleted: true
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/performance/employees/:employeeId/goals', () => {
      it('should get employee goals', async () => {
        const response = await request(app)
          .get('/api/performance/employees/emp_123/goals');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.employeeId).toBe('emp_123');
      });
    });
  });

  // ============================================================================
  // REVIEWS ENDPOINTS TESTS (6 endpoints)
  // ============================================================================
  
  describe('Reviews Endpoints', () => {
    describe('GET /api/performance/reviews', () => {
      it('should list all reviews', async () => {
        const response = await request(app)
          .get('/api/performance/reviews')
          .query({ tenantId: 'tenant_123' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should filter reviews by type', async () => {
        const response = await request(app)
          .get('/api/performance/reviews')
          .query({ reviewType: 'annual' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/performance/reviews/:id', () => {
      it('should get review details', async () => {
        const response = await request(app)
          .get('/api/performance/reviews/review_123');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('POST /api/performance/reviews', () => {
      it('should create review with workflow integration', async () => {
        const response = await request(app)
          .post('/api/performance/reviews')
          .send({
            employeeId: 'emp_123',
            tenantId: 'tenant_456',
            reviewerId: 'mgr_789',
            reviewType: 'quarterly',
            organizationalContext: {
              role: 'Engineer',
              department: 'Engineering',
              managerId: 'mgr_789'
            }
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.reviewId).toBeDefined();
        expect(response.body.data.performanceAnalysis).toBeDefined();
      });

      it('should include coaching when requested', async () => {
        const response = await request(app)
          .post('/api/performance/reviews')
          .send({
            employeeId: 'emp_123',
            tenantId: 'tenant_456',
            reviewerId: 'mgr_789',
            reviewType: 'annual',
            includeCoaching: true,
            organizationalContext: {
              role: 'Manager',
              department: 'Sales',
              managerId: 'mgr_789'
            }
          });

        expect(response.status).toBe(200);
        expect(response.body.data.coachingGuidance).toBeDefined();
      });
    });

    describe('PUT /api/performance/reviews/:id', () => {
      it('should update review', async () => {
        const response = await request(app)
          .put('/api/performance/reviews/review_123')
          .send({ status: 'completed' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('POST /api/performance/reviews/:id/complete', () => {
      it('should complete review', async () => {
        const response = await request(app)
          .post('/api/performance/reviews/review_123/complete')
          .send({
            finalComments: 'Great performance this year',
            approvalStatus: 'approved'
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/performance/employees/:employeeId/reviews', () => {
      it('should get employee reviews', async () => {
        const response = await request(app)
          .get('/api/performance/employees/emp_123/reviews');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.employeeId).toBe('emp_123');
      });
    });
  });

  // ============================================================================
  // FEEDBACK ENDPOINTS TESTS (4 endpoints)
  // ============================================================================
  
  describe('Feedback Endpoints', () => {
    describe('GET /api/performance/feedback', () => {
      it('should list all feedback', async () => {
        const response = await request(app)
          .get('/api/performance/feedback')
          .query({ employeeId: 'emp_123' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('POST /api/performance/feedback', () => {
      it('should create feedback', async () => {
        const response = await request(app)
          .post('/api/performance/feedback')
          .send({
            employeeId: 'emp_123',
            tenantId: 'tenant_456',
            providerId: 'mgr_789',
            type: 'manager',
            rating: 4,
            comments: 'Excellent work on the project',
            strengths: ['Communication', 'Technical skills'],
            improvementAreas: ['Time management']
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/performance/employees/:employeeId/feedback', () => {
      it('should get employee feedback with summary', async () => {
        const response = await request(app)
          .get('/api/performance/employees/emp_123/feedback');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.summary).toBeDefined();
        expect(response.body.summary.totalFeedback).toBeGreaterThanOrEqual(0);
        expect(response.body.summary.sentimentBreakdown).toBeDefined();
      });
    });

    describe('GET /api/performance/feedback/sentiment-analysis', () => {
      it('should perform sentiment analysis', async () => {
        const response = await request(app)
          .get('/api/performance/feedback/sentiment-analysis')
          .query({ employeeId: 'emp_123' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.overallSentiment).toBeDefined();
      });
    });
  });

  // ============================================================================
  // ANALYTICS ENDPOINTS TESTS (6 endpoints)
  // ============================================================================
  
  describe('Analytics Endpoints', () => {
    describe('GET /api/performance/analytics/overview', () => {
      it('should get performance overview', async () => {
        const response = await request(app)
          .get('/api/performance/analytics/overview')
          .query({ tenantId: 'tenant_123' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.totalEmployees).toBeDefined();
        expect(response.body.data.averagePerformanceScore).toBeDefined();
      });
    });

    describe('GET /api/performance/analytics/employees/:employeeId', () => {
      it('should get employee analytics', async () => {
        const response = await request(app)
          .get('/api/performance/analytics/employees/emp_123');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.currentPeriod).toBeDefined();
        expect(response.body.data.trends).toBeDefined();
      });

      it('should include historical data when requested', async () => {
        const response = await request(app)
          .get('/api/performance/analytics/employees/emp_123')
          .query({ includeHistory: 'true' });

        expect(response.status).toBe(200);
        expect(response.body.data.historicalData).toBeDefined();
      });
    });

    describe('GET /api/performance/analytics/trends', () => {
      it('should get performance trends', async () => {
        const response = await request(app)
          .get('/api/performance/analytics/trends')
          .query({ metric: 'overall_performance' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.trend).toBeDefined();
        expect(response.body.data.dataPoints).toBeDefined();
      });
    });

    describe('GET /api/performance/analytics/distribution', () => {
      it('should get performance distribution', async () => {
        const response = await request(app)
          .get('/api/performance/analytics/distribution')
          .query({ tenantId: 'tenant_123' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.distribution).toBeDefined();
        expect(response.body.data.statistics).toBeDefined();
      });
    });

    describe('GET /api/performance/analytics/benchmarks', () => {
      it('should get performance benchmarks', async () => {
        const response = await request(app)
          .get('/api/performance/analytics/benchmarks')
          .query({ tenantId: 'tenant_123' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.internalBenchmark).toBeDefined();
        expect(response.body.data.externalBenchmark).toBeDefined();
      });
    });

    describe('GET /api/performance/analytics/risks', () => {
      it('should get performance risks', async () => {
        const response = await request(app)
          .get('/api/performance/analytics/risks')
          .query({ tenantId: 'tenant_123' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.risks).toBeDefined();
        expect(response.body.data.highRiskEmployees).toBeDefined();
      });
    });
  });

  // ============================================================================
  // COACHING ENDPOINTS TESTS (6 endpoints)
  // ============================================================================
  
  describe('Coaching Endpoints', () => {
    describe('POST /api/performance/coaching/request', () => {
      it('should create coaching request', async () => {
        const response = await request(app)
          .post('/api/performance/coaching/request')
          .send({
            employeeId: 'emp_123',
            tenantId: 'tenant_456',
            coachingType: 'performance_improvement',
            coachingDepth: 'detailed_coaching',
            requestedBy: 'mgr_789',
            organizationalContext: {
              role: 'Engineer',
              department: 'Engineering',
              managerId: 'mgr_789'
            }
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.coachingId).toBeDefined();
        expect(response.body.data.coachingPlan).toBeDefined();
      });

      it('should support different coaching types', async () => {
        const coachingTypes = [
          'performance_improvement',
          'skill_development',
          'career_growth',
          'behavioral_coaching',
          'leadership_development'
        ];

        for (const type of coachingTypes) {
          const response = await request(app)
            .post('/api/performance/coaching/request')
            .send({
              employeeId: 'emp_123',
              tenantId: 'tenant_456',
              coachingType: type,
              coachingDepth: 'quick_guidance',
              requestedBy: 'emp_123',
              organizationalContext: {
                role: 'Engineer',
                department: 'Engineering',
                managerId: 'mgr_789'
              }
            });

          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
        }
      });
    });

    describe('GET /api/performance/coaching/sessions', () => {
      it('should list coaching sessions', async () => {
        const response = await request(app)
          .get('/api/performance/coaching/sessions')
          .query({ employeeId: 'emp_123' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/performance/coaching/sessions/:id', () => {
      it('should get session details', async () => {
        const response = await request(app)
          .get('/api/performance/coaching/sessions/session_123');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('POST /api/performance/coaching/sessions/:id/complete', () => {
      it('should complete coaching session', async () => {
        const response = await request(app)
          .post('/api/performance/coaching/sessions/session_123/complete')
          .send({
            notes: 'Productive session',
            outcomes: ['Identified development areas'],
            nextSteps: ['Create action plan']
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/performance/coaching/employees/:employeeId/plans', () => {
      it('should get employee coaching plans', async () => {
        const response = await request(app)
          .get('/api/performance/coaching/employees/emp_123/plans');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.employeeId).toBe('emp_123');
      });
    });

    describe('GET /api/performance/coaching/effectiveness', () => {
      it('should get coaching effectiveness metrics', async () => {
        const response = await request(app)
          .get('/api/performance/coaching/effectiveness')
          .query({ tenantId: 'tenant_123' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.totalSessions).toBeDefined();
        expect(response.body.data.averageEffectiveness).toBeDefined();
      });
    });
  });

  // ============================================================================
  // MODULE ENDPOINTS TESTS (3 endpoints)
  // ============================================================================
  
  describe('Module Endpoints', () => {
    describe('GET /api/performance/health', () => {
      it('should return module health status', async () => {
        const response = await request(app)
          .get('/api/performance/health');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.healthy).toBeDefined();
      });
    });

    describe('GET /api/performance/status', () => {
      it('should return module status', async () => {
        const response = await request(app)
          .get('/api/performance/status');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.moduleId).toBe('performance_management');
      });
    });

    describe('GET /api/performance/docs', () => {
      it('should return API documentation', async () => {
        const response = await request(app)
          .get('/api/performance/docs');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.endpoints).toBeDefined();
        expect(response.body.totalEndpoints).toBe(32);
      });
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================
  
  describe('Error Handling', () => {
    it('should handle invalid goal creation', async () => {
      const response = await request(app)
        .post('/api/performance/goals')
        .send({});

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should handle invalid review creation', async () => {
      const response = await request(app)
        .post('/api/performance/reviews')
        .send({});

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should handle missing feedback data', async () => {
      const response = await request(app)
        .post('/api/performance/feedback')
        .send({});

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================
  
  describe('API Integration with Workflows', () => {
    it('should integrate goals API with Goal Setting Workflow', async () => {
      const response = await request(app)
        .post('/api/performance/goals')
        .send({
          employeeId: 'emp_123',
          tenantId: 'tenant_456',
          managerId: 'mgr_789',
          period: '2024',
          useAI: true,
          goalData: {
            organizationalContext: {
              role: 'Developer',
              department: 'Engineering'
            }
          },
          organizationalObjectives: {
            strategicGoals: [],
            departmentGoals: [],
            teamGoals: []
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      // Verify workflow was invoked
      expect(response.body.count).toBeGreaterThan(0);
    });

    it('should integrate reviews API with Review Workflow', async () => {
      const response = await request(app)
        .post('/api/performance/reviews')
        .send({
          employeeId: 'emp_123',
          tenantId: 'tenant_456',
          reviewerId: 'mgr_789',
          reviewType: 'quarterly',
          organizationalContext: {
            role: 'Engineer',
            department: 'Engineering',
            managerId: 'mgr_789'
          }
        });

      expect(response.status).toBe(200);
      // Verify workflow results included
      expect(response.body.data.performanceAnalysis).toBeDefined();
      expect(response.body.metadata).toBeDefined();
    });

    it('should integrate coaching API with Coaching Workflow', async () => {
      const response = await request(app)
        .post('/api/performance/coaching/request')
        .send({
          employeeId: 'emp_123',
          tenantId: 'tenant_456',
          coachingType: 'skill_development',
          coachingDepth: 'comprehensive_program',
          requestedBy: 'emp_123',
          organizationalContext: {
            role: 'Developer',
            department: 'Engineering',
            managerId: 'mgr_789'
          }
        });

      expect(response.status).toBe(200);
      // Verify workflow results included
      expect(response.body.data.gapAnalysis).toBeDefined();
      expect(response.body.data.developmentPlan).toBeDefined();
      expect(response.body.outputTriggers).toBeDefined();
    });
  });
});

