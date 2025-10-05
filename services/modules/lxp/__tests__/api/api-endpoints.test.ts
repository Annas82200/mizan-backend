/**
 * LXP API Endpoint Tests
 * 
 * Comprehensive tests for all LXP API endpoints:
 * - Learning Path API endpoints
 * - Course API endpoints
 * - Progress Tracking API endpoints
 * - Assessment API endpoints
 * - Analytics API endpoints
 * - Integration API endpoints
 * 
 * These tests verify API functionality, request/response handling,
 * error scenarios, authentication, and data validation.
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { LXPModule } from '../../lxp-module.js';

// Mock the LXP module
jest.mock('../../lxp-module.js');

// Create Express app for testing
const app = express();
app.use(express.json());

// Import API routers
import learningPathsRouter from '../../api/learning-paths.js';
import coursesRouter from '../../api/courses.js';
import progressTrackingRouter from '../../api/progress-tracking.js';
import assessmentsRouter from '../../api/assessments.js';
import analyticsRouter from '../../api/analytics.js';
import { default as lxpApiRouter } from '../../api/index.js';

// Mount routers
app.use('/api/lxp', lxpApiRouter);

describe('LXP API Endpoint Tests', () => {
  let mockLXPModule: jest.Mocked<LXPModule>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock LXP module
    mockLXPModule = {
      initialize: jest.fn().mockResolvedValue({ success: true }),
      handleTrigger: jest.fn().mockResolvedValue({
        success: true,
        action: 'learning_path_created',
        confidence: 0.9,
        data: { learningPathId: 'lp_001' }
      }),
      checkHealth: jest.fn().mockResolvedValue({ healthy: true }),
      getStatus: jest.fn().mockReturnValue({ status: 'active' })
    } as any;

    // Mock the LXP module instance
    (LXPModule as jest.MockedClass<typeof LXPModule>).mockImplementation(() => mockLXPModule);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // LEARNING PATH API ENDPOINT TESTS
  // ============================================================================

  describe('Learning Path API Endpoints', () => {
    describe('GET /api/lxp/learning-paths', () => {
      test('should return list of learning paths', async () => {
        const response = await request(app)
          .get('/api/lxp/learning-paths')
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBeGreaterThan(0);
        
        // Verify learning path structure
        const learningPath = response.body.data[0];
        expect(learningPath.id).toBeDefined();
        expect(learningPath.title).toBeDefined();
        expect(learningPath.description).toBeDefined();
        expect(learningPath.courses).toBeInstanceOf(Array);
      });

      test('should filter learning paths by category', async () => {
        const response = await request(app)
          .get('/api/lxp/learning-paths?category=leadership')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        
        // Verify all returned paths are leadership category
        response.body.data.forEach((path: any) => {
          expect(path.category).toBe('leadership');
        });
      });

      test('should filter learning paths by difficulty', async () => {
        const response = await request(app)
          .get('/api/lxp/learning-paths?difficulty=intermediate')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        
        // Verify all returned paths are intermediate difficulty
        response.body.data.forEach((path: any) => {
          expect(path.difficulty).toBe('intermediate');
        });
      });

      test('should handle pagination', async () => {
        const response = await request(app)
          .get('/api/lxp/learning-paths?page=1&limit=5')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.pagination).toBeDefined();
        expect(response.body.pagination.page).toBe(1);
        expect(response.body.pagination.limit).toBe(5);
      });
    });

    describe('GET /api/lxp/learning-paths/:id', () => {
      test('should return specific learning path', async () => {
        const response = await request(app)
          .get('/api/lxp/learning-paths/lp_001')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.id).toBe('lp_001');
        expect(response.body.data.title).toBeDefined();
        expect(response.body.data.courses).toBeInstanceOf(Array);
      });

      test('should return 404 for non-existent learning path', async () => {
        const response = await request(app)
          .get('/api/lxp/learning-paths/non_existent')
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });
    });

    describe('POST /api/lxp/learning-paths', () => {
      test('should create new learning path', async () => {
        const newLearningPath = {
          title: 'Test Learning Path',
          description: 'Test description',
          category: 'technical',
          difficulty: 'intermediate',
          courses: [
            {
              id: 'course_001',
              title: 'Test Course',
              duration: 120
            }
          ]
        };

        const response = await request(app)
          .post('/api/lxp/learning-paths')
          .send(newLearningPath)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.id).toBeDefined();
        expect(response.body.data.title).toBe(newLearningPath.title);
      });

      test('should validate required fields', async () => {
        const invalidLearningPath = {
          description: 'Missing title'
        };

        const response = await request(app)
          .post('/api/lxp/learning-paths')
          .send(invalidLearningPath)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('title');
      });

      test('should validate course structure', async () => {
        const invalidLearningPath = {
          title: 'Test Path',
          description: 'Test description',
          courses: [
            {
              // Missing required course fields
              title: 'Invalid Course'
            }
          ]
        };

        const response = await request(app)
          .post('/api/lxp/learning-paths')
          .send(invalidLearningPath)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('course');
      });
    });

    describe('PUT /api/lxp/learning-paths/:id', () => {
      test('should update existing learning path', async () => {
        const updateData = {
          title: 'Updated Learning Path',
          description: 'Updated description'
        };

        const response = await request(app)
          .put('/api/lxp/learning-paths/lp_001')
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe(updateData.title);
        expect(response.body.data.description).toBe(updateData.description);
      });

      test('should return 404 for non-existent learning path', async () => {
        const updateData = {
          title: 'Updated Title'
        };

        const response = await request(app)
          .put('/api/lxp/learning-paths/non_existent')
          .send(updateData)
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe('DELETE /api/lxp/learning-paths/:id', () => {
      test('should delete learning path', async () => {
        const response = await request(app)
          .delete('/api/lxp/learning-paths/lp_001')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('deleted');
      });

      test('should return 404 for non-existent learning path', async () => {
        const response = await request(app)
          .delete('/api/lxp/learning-paths/non_existent')
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/lxp/employees/:employeeId/learning-paths', () => {
      test('should return employee-specific learning paths', async () => {
        const response = await request(app)
          .get('/api/lxp/employees/emp_001/learning-paths')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        
        // Verify employee-specific data
        response.body.data.forEach((path: any) => {
          expect(path.employeeId).toBe('emp_001');
          expect(path.enrollment).toBeDefined();
        });
      });

      test('should return 404 for non-existent employee', async () => {
        const response = await request(app)
          .get('/api/lxp/employees/non_existent/learning-paths')
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });
  });

  // ============================================================================
  // COURSE API ENDPOINT TESTS
  // ============================================================================

  describe('Course API Endpoints', () => {
    describe('GET /api/lxp/courses', () => {
      test('should return list of courses', async () => {
        const response = await request(app)
          .get('/api/lxp/courses')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBeGreaterThan(0);
        
        // Verify course structure
        const course = response.body.data[0];
        expect(course.id).toBeDefined();
        expect(course.title).toBeDefined();
        expect(course.description).toBeDefined();
        expect(course.duration).toBeDefined();
      });

      test('should filter courses by category', async () => {
        const response = await request(app)
          .get('/api/lxp/courses?category=leadership')
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.forEach((course: any) => {
          expect(course.category).toBe('leadership');
        });
      });

      test('should filter courses by difficulty', async () => {
        const response = await request(app)
          .get('/api/lxp/courses?difficulty=beginner')
          .expect(200);

        expect(response.body.success).toBe(true);
        response.body.data.forEach((course: any) => {
          expect(course.difficulty).toBe('beginner');
        });
      });
    });

    describe('GET /api/lxp/courses/:id', () => {
      test('should return specific course', async () => {
        const response = await request(app)
          .get('/api/lxp/courses/course_001')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe('course_001');
        expect(response.body.data.title).toBeDefined();
        expect(response.body.data.content).toBeDefined();
      });

      test('should return 404 for non-existent course', async () => {
        const response = await request(app)
          .get('/api/lxp/courses/non_existent')
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/lxp/courses', () => {
      test('should create new course', async () => {
        const newCourse = {
          title: 'Test Course',
          description: 'Test course description',
          category: 'technical',
          difficulty: 'intermediate',
          duration: 120,
          content: {
            modules: [
              {
                title: 'Module 1',
                content: 'Module content',
                duration: 60
              }
            ]
          }
        };

        const response = await request(app)
          .post('/api/lxp/courses')
          .send(newCourse)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBeDefined();
        expect(response.body.data.title).toBe(newCourse.title);
      });

      test('should validate required fields', async () => {
        const invalidCourse = {
          description: 'Missing title'
        };

        const response = await request(app)
          .post('/api/lxp/courses')
          .send(invalidCourse)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('title');
      });
    });

    describe('POST /api/lxp/courses/:id/enroll', () => {
      test('should enroll employee in course', async () => {
        const enrollmentData = {
          employeeId: 'emp_001',
          learningPathId: 'lp_001'
        };

        const response = await request(app)
          .post('/api/lxp/courses/course_001/enroll')
          .send(enrollmentData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.enrollmentId).toBeDefined();
        expect(response.body.data.employeeId).toBe(enrollmentData.employeeId);
      });

      test('should validate enrollment data', async () => {
        const invalidEnrollment = {
          // Missing employeeId
          learningPathId: 'lp_001'
        };

        const response = await request(app)
          .post('/api/lxp/courses/course_001/enroll')
          .send(invalidEnrollment)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('employeeId');
      });
    });

    describe('GET /api/lxp/courses/:id/content', () => {
      test('should return course content', async () => {
        const response = await request(app)
          .get('/api/lxp/courses/course_001/content')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.content).toBeDefined();
        expect(response.body.data.modules).toBeInstanceOf(Array);
      });

      test('should return 404 for non-existent course', async () => {
        const response = await request(app)
          .get('/api/lxp/courses/non_existent/content')
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });
  });

  // ============================================================================
  // PROGRESS TRACKING API ENDPOINT TESTS
  // ============================================================================

  describe('Progress Tracking API Endpoints', () => {
    describe('GET /api/lxp/enrollments/:id/progress', () => {
      test('should return enrollment progress', async () => {
        const response = await request(app)
          .get('/api/lxp/enrollments/enrollment_001/progress')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.enrollmentId).toBe('enrollment_001');
        expect(response.body.data.progress).toBeDefined();
        expect(response.body.data.progress.completedModules).toBeDefined();
        expect(response.body.data.progress.totalModules).toBeDefined();
      });

      test('should return 404 for non-existent enrollment', async () => {
        const response = await request(app)
          .get('/api/lxp/enrollments/non_existent/progress')
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/lxp/enrollments/:id/progress', () => {
      test('should update enrollment progress', async () => {
        const progressData = {
          completedModules: 2,
          timeSpent: 120,
          lastActivity: new Date().toISOString()
        };

        const response = await request(app)
          .post('/api/lxp/enrollments/enrollment_001/progress')
          .send(progressData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.progress.completedModules).toBe(progressData.completedModules);
      });

      test('should validate progress data', async () => {
        const invalidProgress = {
          // Missing required fields
          timeSpent: 120
        };

        const response = await request(app)
          .post('/api/lxp/enrollments/enrollment_001/progress')
          .send(invalidProgress)
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/lxp/employees/:employeeId/progress', () => {
      test('should return employee progress summary', async () => {
        const response = await request(app)
          .get('/api/lxp/employees/emp_001/progress')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.employeeId).toBe('emp_001');
        expect(response.body.data.enrollments).toBeInstanceOf(Array);
        expect(response.body.data.overallProgress).toBeDefined();
      });

      test('should return 404 for non-existent employee', async () => {
        const response = await request(app)
          .get('/api/lxp/employees/non_existent/progress')
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/lxp/enrollments/:id/complete', () => {
      test('should mark enrollment as complete', async () => {
        const completionData = {
          completionDate: new Date().toISOString(),
          finalScore: 85
        };

        const response = await request(app)
          .post('/api/lxp/enrollments/enrollment_001/complete')
          .send(completionData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('completed');
        expect(response.body.data.completionDate).toBeDefined();
      });

      test('should validate completion data', async () => {
        const invalidCompletion = {
          // Missing completionDate
          finalScore: 85
        };

        const response = await request(app)
          .post('/api/lxp/enrollments/enrollment_001/complete')
          .send(invalidCompletion)
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });
  });

  // ============================================================================
  // ASSESSMENT API ENDPOINT TESTS
  // ============================================================================

  describe('Assessment API Endpoints', () => {
    describe('GET /api/lxp/assessments/:id', () => {
      test('should return assessment details', async () => {
        const response = await request(app)
          .get('/api/lxp/assessments/assessment_001')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe('assessment_001');
        expect(response.body.data.questions).toBeInstanceOf(Array);
        expect(response.body.data.passingScore).toBeDefined();
      });

      test('should return 404 for non-existent assessment', async () => {
        const response = await request(app)
          .get('/api/lxp/assessments/non_existent')
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/lxp/assessments/:id/start', () => {
      test('should start assessment', async () => {
        const startData = {
          employeeId: 'emp_001',
          enrollmentId: 'enrollment_001'
        };

        const response = await request(app)
          .post('/api/lxp/assessments/assessment_001/start')
          .send(startData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.assessmentSessionId).toBeDefined();
        expect(response.body.data.startTime).toBeDefined();
      });

      test('should validate start data', async () => {
        const invalidStart = {
          // Missing employeeId
          enrollmentId: 'enrollment_001'
        };

        const response = await request(app)
          .post('/api/lxp/assessments/assessment_001/start')
          .send(invalidStart)
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/lxp/assessments/:id/submit', () => {
      test('should submit assessment', async () => {
        const submissionData = {
          employeeId: 'emp_001',
          responses: [
            {
              questionId: 'q1',
              answer: 'A',
              timeSpent: 30
            },
            {
              questionId: 'q2',
              answer: 'B',
              timeSpent: 45
            }
          ]
        };

        const response = await request(app)
          .post('/api/lxp/assessments/assessment_001/submit')
          .send(submissionData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.score).toBeDefined();
        expect(response.body.data.passed).toBeDefined();
        expect(response.body.data.feedback).toBeDefined();
      });

      test('should validate submission data', async () => {
        const invalidSubmission = {
          employeeId: 'emp_001'
          // Missing responses
        };

        const response = await request(app)
          .post('/api/lxp/assessments/assessment_001/submit')
          .send(invalidSubmission)
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/lxp/assessments/:id/results', () => {
      test('should return assessment results', async () => {
        const response = await request(app)
          .get('/api/lxp/assessments/assessment_001/results?employeeId=emp_001')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.employeeId).toBe('emp_001');
        expect(response.body.data.score).toBeDefined();
        expect(response.body.data.results).toBeDefined();
      });

      test('should require employeeId parameter', async () => {
        const response = await request(app)
          .get('/api/lxp/assessments/assessment_001/results')
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('employeeId');
      });
    });
  });

  // ============================================================================
  // ANALYTICS API ENDPOINT TESTS
  // ============================================================================

  describe('Analytics API Endpoints', () => {
    describe('GET /api/lxp/analytics/overview', () => {
      test('should return analytics overview', async () => {
        const response = await request(app)
          .get('/api/lxp/analytics/overview')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.totalLearningPaths).toBeDefined();
        expect(response.body.data.totalCourses).toBeDefined();
        expect(response.body.data.totalEnrollments).toBeDefined();
        expect(response.body.data.completionRate).toBeDefined();
      });

      test('should filter by date range', async () => {
        const response = await request(app)
          .get('/api/lxp/analytics/overview?startDate=2024-01-01&endDate=2024-12-31')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
      });
    });

    describe('GET /api/lxp/analytics/employees/:employeeId', () => {
      test('should return employee analytics', async () => {
        const response = await request(app)
          .get('/api/lxp/analytics/employees/emp_001')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.employeeId).toBe('emp_001');
        expect(response.body.data.learningProgress).toBeDefined();
        expect(response.body.data.performanceMetrics).toBeDefined();
        expect(response.body.data.engagementMetrics).toBeDefined();
      });

      test('should return 404 for non-existent employee', async () => {
        const response = await request(app)
          .get('/api/lxp/analytics/employees/non_existent')
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/lxp/analytics/courses/:courseId', () => {
      test('should return course analytics', async () => {
        const response = await request(app)
          .get('/api/lxp/analytics/courses/course_001')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.courseId).toBe('course_001');
        expect(response.body.data.enrollmentStats).toBeDefined();
        expect(response.body.data.completionStats).toBeDefined();
        expect(response.body.data.performanceStats).toBeDefined();
      });

      test('should return 404 for non-existent course', async () => {
        const response = await request(app)
          .get('/api/lxp/analytics/courses/non_existent')
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/lxp/analytics/effectiveness', () => {
      test('should return learning effectiveness analytics', async () => {
        const response = await request(app)
          .get('/api/lxp/analytics/effectiveness')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.effectivenessMetrics).toBeDefined();
        expect(response.body.data.improvementAreas).toBeDefined();
        expect(response.body.data.recommendations).toBeDefined();
      });

      test('should filter by time period', async () => {
        const response = await request(app)
          .get('/api/lxp/analytics/effectiveness?period=last_30_days')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
      });
    });
  });

  // ============================================================================
  // INTEGRATION API ENDPOINT TESTS
  // ============================================================================

  describe('Integration API Endpoints', () => {
    describe('Skills Integration API', () => {
      test('GET /api/lxp/integrations/skills/gaps/:employeeId', async () => {
        const response = await request(app)
          .get('/api/lxp/integrations/skills/gaps/emp_001')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.employeeId).toBe('emp_001');
        expect(response.body.data.skillGaps).toBeInstanceOf(Array);
        expect(response.body.data.recommendations).toBeInstanceOf(Array);
      });

      test('POST /api/lxp/integrations/skills/update-skills', async () => {
        const updateData = {
          employeeId: 'emp_001',
          skills: ['leadership', 'communication'],
          source: 'course_completion'
        };

        const response = await request(app)
          .post('/api/lxp/integrations/skills/update-skills')
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.updated).toBe(true);
      });
    });

    describe('Performance Integration API', () => {
      test('POST /api/lxp/integrations/performance/send-completion', async () => {
        const completionData = {
          employeeId: 'emp_001',
          courseId: 'course_001',
          completionDate: new Date().toISOString(),
          score: 85
        };

        const response = await request(app)
          .post('/api/lxp/integrations/performance/send-completion')
          .send(completionData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.sent).toBe(true);
      });

      test('POST /api/lxp/integrations/performance/trigger-assessment', async () => {
        const assessmentData = {
          employeeId: 'emp_001',
          triggerType: 'training_completion',
          courseId: 'course_001'
        };

        const response = await request(app)
          .post('/api/lxp/integrations/performance/trigger-assessment')
          .send(assessmentData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.triggered).toBe(true);
      });
    });

    describe('Culture Integration API', () => {
      test('GET /api/lxp/integrations/culture/learning-needs/:employeeId', async () => {
        const response = await request(app)
          .get('/api/lxp/integrations/culture/learning-needs/emp_001')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.employeeId).toBe('emp_001');
        expect(response.body.data.cultureGaps).toBeInstanceOf(Array);
        expect(response.body.data.learningNeeds).toBeDefined();
      });

      test('POST /api/lxp/integrations/culture/create-learning-path', async () => {
        const learningPathData = {
          employeeId: 'emp_001',
          cultureGaps: ['collaboration', 'innovation'],
          focus: 'culture_alignment'
        };

        const response = await request(app)
          .post('/api/lxp/integrations/culture/create-learning-path')
          .send(learningPathData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.learningPathId).toBeDefined();
      });
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('Error Handling', () => {
    test('should handle invalid JSON', async () => {
      const response = await request(app)
        .post('/api/lxp/learning-paths')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('JSON');
    });

    test('should handle missing content type', async () => {
      const response = await request(app)
        .post('/api/lxp/learning-paths')
        .send({ title: 'Test' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should handle server errors gracefully', async () => {
      // Mock a server error
      mockLXPModule.handleTrigger.mockRejectedValueOnce(new Error('Server error'));

      const response = await request(app)
        .get('/api/lxp/learning-paths')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================

  describe('Performance Tests', () => {
    test('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/lxp/learning-paths')
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.body.success).toBe(true);
      expect(responseTime).toBeLessThan(1000); // 1 second
    });

    test('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, () =>
        request(app).get('/api/lxp/learning-paths')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});
