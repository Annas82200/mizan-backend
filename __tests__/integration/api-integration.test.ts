/**
 * Comprehensive API Integration Tests
 * Tests all endpoints across all modules end-to-end
 */

import request from 'supertest';
import { app } from '../index.js';
import { db } from '../db/index.js';
import { tenants, users, departments } from '../db/schema.js';

describe('API Integration Tests', () => {
  let testTenantId: string;
  let testUserId: string;
  let testDepartmentId: string;
  let authToken: string;

  beforeAll(async () => {
    // Setup test data
    const [tenant] = await db.insert(tenants).values({
      name: 'Test Company',
      domain: 'test.mizan.com',
      plan: 'enterprise',
      status: 'active',
      industry: 'Technology',
      employeeCount: 100
    }).returning();

    testTenantId = tenant.id;

    const [user] = await db.insert(users).values({
      tenantId: testTenantId,
      email: 'test@mizan.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'admin',
      status: 'active'
    }).returning();

    testUserId = user.id;

    const [department] = await db.insert(departments).values({
      tenantId: testTenantId,
      name: 'Engineering',
      description: 'Software Engineering Department'
    }).returning();

    testDepartmentId = department.id;

    // Mock auth token
    authToken = 'test-auth-token';
  });

  afterAll(async () => {
    // Cleanup test data
    await db.delete(users).where(eq(users.tenantId, testTenantId));
    await db.delete(departments).where(eq(departments.tenantId, testTenantId));
    await db.delete(tenants).where(eq(tenants.id, testTenantId));
  });

  describe('Performance Management Module', () => {
    describe('Goals API', () => {
      test('POST /api/performance/goals - Create goal', async () => {
        const goalData = {
          employeeId: testUserId,
          managerId: testUserId,
          title: 'Increase team productivity',
          description: 'Improve team efficiency by 20%',
          category: 'productivity',
          priority: 'high',
          targetValue: 20,
          currentValue: 0,
          unit: 'percentage',
          startDate: new Date().toISOString(),
          targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active'
        };

        const response = await request(app)
          .post('/api/performance/goals')
          .set('x-tenant-id', testTenantId)
          .set('x-user-id', testUserId)
          .set('Authorization', `Bearer ${authToken}`)
          .send(goalData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe(goalData.title);
      });

      test('GET /api/performance/goals - List goals', async () => {
        const response = await request(app)
          .get('/api/performance/goals')
          .set('x-tenant-id', testTenantId)
          .set('x-user-id', testUserId)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.goals)).toBe(true);
      });
    });

    describe('Reviews API', () => {
      test('POST /api/performance/reviews - Create review', async () => {
        const reviewData = {
          employeeId: testUserId,
          managerId: testUserId,
          reviewType: 'annual',
          period: '2024',
          status: 'draft'
        };

        const response = await request(app)
          .post('/api/performance/reviews')
          .set('x-tenant-id', testTenantId)
          .set('x-user-id', testUserId)
          .set('Authorization', `Bearer ${authToken}`)
          .send(reviewData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.reviewType).toBe(reviewData.reviewType);
      });
    });
  });

  describe('Hiring Module', () => {
    describe('Requisitions API', () => {
      test('POST /api/hiring/requisitions - Create requisition', async () => {
        const requisitionData = {
          title: 'Senior Software Engineer',
          department: 'Engineering',
          level: 'senior',
          type: 'full_time',
          urgency: 'medium',
          description: 'Looking for a senior software engineer',
          requirements: ['5+ years experience', 'Node.js', 'TypeScript'],
          skills: ['javascript', 'nodejs', 'typescript'],
          location: 'Remote',
          salaryRange: { min: 80000, max: 120000 },
          status: 'draft'
        };

        const response = await request(app)
          .post('/api/hiring/requisitions')
          .set('x-tenant-id', testTenantId)
          .set('x-user-id', testUserId)
          .set('Authorization', `Bearer ${authToken}`)
          .send(requisitionData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe(requisitionData.title);
      });

      test('GET /api/hiring/requisitions - List requisitions', async () => {
        const response = await request(app)
          .get('/api/hiring/requisitions')
          .set('x-tenant-id', testTenantId)
          .set('x-user-id', testUserId)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.requisitions)).toBe(true);
      });
    });

    describe('Candidates API', () => {
      test('POST /api/hiring/candidates - Create candidate', async () => {
        const candidateData = {
          requisitionId: 'test-requisition-id',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
          resume: 'Resume content here',
          skills: ['javascript', 'nodejs'],
          experience: 5,
          expectedSalary: 100000,
          status: 'applied',
          stage: 'application'
        };

        const response = await request(app)
          .post('/api/hiring/candidates')
          .set('x-tenant-id', testTenantId)
          .set('x-user-id', testUserId)
          .set('Authorization', `Bearer ${authToken}`)
          .send(candidateData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.firstName).toBe(candidateData.firstName);
      });
    });
  });

  describe('LXP Module', () => {
    describe('Courses API', () => {
      test('POST /api/lxp/courses - Create course', async () => {
        const courseData = {
          title: 'Advanced JavaScript',
          description: 'Learn advanced JavaScript concepts',
          category: 'programming',
          difficulty: 'intermediate',
          duration: 120,
          skills: ['javascript', 'programming'],
          status: 'active'
        };

        const response = await request(app)
          .post('/api/lxp/courses')
          .set('x-tenant-id', testTenantId)
          .set('x-user-id', testUserId)
          .set('Authorization', `Bearer ${authToken}`)
          .send(courseData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe(courseData.title);
      });

      test('GET /api/lxp/courses - List courses', async () => {
        const response = await request(app)
          .get('/api/lxp/courses')
          .set('x-tenant-id', testTenantId)
          .set('x-user-id', testUserId)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.courses)).toBe(true);
      });
    });
  });

  describe('Cross-Module Integration', () => {
    test('Performance → LXP Integration', async () => {
      // Test that performance data triggers LXP recommendations
      const performanceData = {
        employeeId: testUserId,
        skillGaps: ['leadership', 'communication'],
        performanceScore: 75
      };

      const response = await request(app)
        .post('/api/performance/analytics/skill-gaps')
        .set('x-tenant-id', testTenantId)
        .set('x-user-id', testUserId)
        .set('Authorization', `Bearer ${authToken}`)
        .send(performanceData)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should trigger LXP recommendations
      expect(response.body.data.recommendations).toBeDefined();
    });

    test('Hiring → Onboarding Integration', async () => {
      // Test that successful hiring triggers onboarding
      const offerData = {
        candidateId: 'test-candidate-id',
        requisitionId: 'test-requisition-id',
        salary: 100000,
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'accepted'
      };

      const response = await request(app)
        .post('/api/hiring/offers')
        .set('x-tenant-id', testTenantId)
        .set('x-user-id', testUserId)
        .set('Authorization', `Bearer ${authToken}`)
        .send(offerData)
        .expect(201);

      expect(response.body.success).toBe(true);
      // Should trigger onboarding process
      expect(response.body.data.onboardingTriggered).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('Invalid tenant ID returns 400', async () => {
      const response = await request(app)
        .get('/api/performance/goals')
        .set('x-tenant-id', 'invalid-tenant')
        .set('x-user-id', testUserId)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('Missing authentication returns 401', async () => {
      const response = await request(app)
        .get('/api/performance/goals')
        .set('x-tenant-id', testTenantId)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    test('Invalid request data returns 400', async () => {
      const response = await request(app)
        .post('/api/performance/goals')
        .set('x-tenant-id', testTenantId)
        .set('x-user-id', testUserId)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ invalid: 'data' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    test('API response times are acceptable', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/performance/goals')
        .set('x-tenant-id', testTenantId)
        .set('x-user-id', testUserId)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    test('Concurrent requests handled properly', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .get('/api/performance/goals')
          .set('x-tenant-id', testTenantId)
          .set('x-user-id', testUserId)
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});
