/**
 * API Endpoint Test Setup
 * 
 * Setup configuration for LXP API endpoint tests
 * including Express app setup, mocks, and test utilities.
 */

import { jest } from '@jest/globals';
import express from 'express';

// ============================================================================
// GLOBAL TEST CONFIGURATION
// ============================================================================

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.API_PORT = '3001';
process.env.DATABASE_URL = 'sqlite://test.db';
process.env.JWT_SECRET = 'test-jwt-secret';

// ============================================================================
// EXPRESS APP SETUP
// ============================================================================

// Create test Express app
global.testApp = express();

// Middleware setup
global.testApp.use(express.json({ limit: '10mb' }));
global.testApp.use(express.urlencoded({ extended: true }));

// Error handling middleware
global.testApp.use((err: any, req: any, res: any, next: any) => {
  console.error('Test API Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// ============================================================================
// MOCK CONFIGURATIONS
// ============================================================================

// Mock LXP Module
jest.mock('../../lxp-module.js', () => ({
  LXPModule: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue({ success: true }),
    handleTrigger: jest.fn().mockResolvedValue({
      success: true,
      action: 'test_action',
      confidence: 0.9,
      data: { testData: 'test' }
    }),
    checkHealth: jest.fn().mockResolvedValue({ healthy: true }),
    getStatus: jest.fn().mockReturnValue({ status: 'active' })
  }))
}));

// Mock database operations
global.mockDatabase = {
  learningPaths: new Map(),
  courses: new Map(),
  enrollments: new Map(),
  assessments: new Map(),
  progress: new Map(),
  analytics: new Map(),
  
  // Learning Path operations
  async saveLearningPath(path: any) {
    this.learningPaths.set(path.id, path);
    return { success: true, id: path.id };
  },
  
  async getLearningPath(id: string) {
    return this.learningPaths.get(id) || null;
  },
  
  async getAllLearningPaths(filters: any = {}) {
    let paths = Array.from(this.learningPaths.values());
    
    if (filters.category) {
      paths = paths.filter(p => p.category === filters.category);
    }
    if (filters.difficulty) {
      paths = paths.filter(p => p.difficulty === filters.difficulty);
    }
    
    return paths;
  },
  
  async deleteLearningPath(id: string) {
    return this.learningPaths.delete(id);
  },
  
  // Course operations
  async saveCourse(course: any) {
    this.courses.set(course.id, course);
    return { success: true, id: course.id };
  },
  
  async getCourse(id: string) {
    return this.courses.get(id) || null;
  },
  
  async getAllCourses(filters: any = {}) {
    let courses = Array.from(this.courses.values());
    
    if (filters.category) {
      courses = courses.filter(c => c.category === filters.category);
    }
    if (filters.difficulty) {
      courses = courses.filter(c => c.difficulty === filters.difficulty);
    }
    
    return courses;
  },
  
  // Enrollment operations
  async saveEnrollment(enrollment: any) {
    this.enrollments.set(enrollment.id, enrollment);
    return { success: true, id: enrollment.id };
  },
  
  async getEnrollment(id: string) {
    return this.enrollments.get(id) || null;
  },
  
  async getEmployeeEnrollments(employeeId: string) {
    return Array.from(this.enrollments.values())
      .filter(e => e.employeeId === employeeId);
  },
  
  // Assessment operations
  async saveAssessment(assessment: any) {
    this.assessments.set(assessment.id, assessment);
    return { success: true, id: assessment.id };
  },
  
  async getAssessment(id: string) {
    return this.assessments.get(id) || null;
  },
  
  // Progress operations
  async saveProgress(progress: any) {
    this.progress.set(progress.id, progress);
    return { success: true, id: progress.id };
  },
  
  async getProgress(id: string) {
    return this.progress.get(id) || null;
  },
  
  // Analytics operations
  async getAnalytics(type: string, filters: any = {}) {
    return this.analytics.get(type) || { data: [], total: 0 };
  }
};

// Mock external services
global.mockExternalServices = {
  async sendNotification(employeeId: string, message: string) {
    console.log(`Mock notification sent to ${employeeId}: ${message}`);
    return { success: true };
  },
  
  async updateEmployeeProfile(employeeId: string, updates: any) {
    console.log(`Mock profile update for ${employeeId}:`, updates);
    return { success: true };
  },
  
  async issueCertificate(employeeId: string, courseId: string) {
    console.log(`Mock certificate issued to ${employeeId} for course ${courseId}`);
    return { success: true, certificateId: `cert_${Date.now()}` };
  },
  
  async validateEmployee(employeeId: string) {
    return { valid: true, employee: { id: employeeId, name: 'Test Employee' } };
  },
  
  async validateCourse(courseId: string) {
    return { valid: true, course: { id: courseId, title: 'Test Course' } };
  }
};

// ============================================================================
// TEST UTILITIES
// ============================================================================

// API request utilities
global.apiTestUtils = {
  async makeRequest(method: string, url: string, data: any = null, headers: any = {}) {
    const request = global.testApp[method.toLowerCase()](url);
    
    if (headers) {
      Object.keys(headers).forEach(key => {
        request.set(key, headers[key]);
      });
    }
    
    if (data) {
      request.send(data);
    }
    
    return request;
  },
  
  async expectSuccess(response: any, expectedData: any = null) {
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(300);
    expect(response.body.success).toBe(true);
    
    if (expectedData) {
      expect(response.body.data).toMatchObject(expectedData);
    }
  },
  
  async expectError(response: any, expectedStatus: number, expectedError: string = null) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body.success).toBe(false);
    
    if (expectedError) {
      expect(response.body.error).toContain(expectedError);
    }
  },
  
  async expectValidationError(response: any, field: string) {
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain(field);
  }
};

// Performance monitoring utilities
global.performanceTracker = {
  startTime: 0,
  
  start() {
    this.startTime = Date.now();
  },
  
  end() {
    const duration = Date.now() - this.startTime;
    console.log(`API test execution time: ${duration}ms`);
    return duration;
  },
  
  measure<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    return fn().then(result => ({
      result,
      duration: Date.now() - start
    }));
  }
};

// ============================================================================
// TEST DATA GENERATORS
// ============================================================================

global.testDataGenerators = {
  generateLearningPath(overrides: any = {}) {
    return {
      id: `lp_${Date.now()}`,
      title: 'Test Learning Path',
      description: 'Test learning path description',
      category: 'technical',
      difficulty: 'intermediate',
      courses: [
        {
          id: 'course_001',
          title: 'Test Course',
          duration: 120,
          skills: ['javascript', 'typescript']
        }
      ],
      estimatedDuration: 240,
      ...overrides
    };
  },
  
  generateCourse(overrides: any = {}) {
    return {
      id: `course_${Date.now()}`,
      title: 'Test Course',
      description: 'Test course description',
      category: 'technical',
      difficulty: 'intermediate',
      duration: 120,
      content: {
        modules: [
          {
            id: 'module_001',
            title: 'Module 1',
            content: 'Module content',
            duration: 60
          }
        ]
      },
      ...overrides
    };
  },
  
  generateEnrollment(overrides: any = {}) {
    return {
      id: `enrollment_${Date.now()}`,
      employeeId: 'emp_001',
      courseId: 'course_001',
      learningPathId: 'lp_001',
      status: 'in_progress',
      startDate: new Date().toISOString(),
      progress: {
        completedModules: 1,
        totalModules: 2,
        timeSpent: 60,
        lastActivity: new Date().toISOString()
      },
      ...overrides
    };
  },
  
  generateAssessment(overrides: any = {}) {
    return {
      id: `assessment_${Date.now()}`,
      courseId: 'course_001',
      title: 'Test Assessment',
      type: 'comprehensive',
      questions: [
        {
          id: 'q1',
          question: 'Test question 1?',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 'A',
          points: 10
        }
      ],
      passingScore: 70,
      timeLimit: 60,
      ...overrides
    };
  },
  
  generateEmployee(overrides: any = {}) {
    return {
      id: `emp_${Date.now()}`,
      name: 'Test Employee',
      email: 'test@example.com',
      role: 'developer',
      department: 'engineering',
      skills: ['javascript', 'typescript'],
      ...overrides
    };
  }
};

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

global.assertAPIResponse = (response: any, expectedStatus: number, expectedSuccess: boolean) => {
  expect(response.status).toBe(expectedStatus);
  expect(response.body.success).toBe(expectedSuccess);
  expect(response.body).toHaveProperty('data');
  expect(response.body).toHaveProperty('timestamp');
};

global.assertLearningPathResponse = (response: any) => {
  expect(response.body.data).toHaveProperty('id');
  expect(response.body.data).toHaveProperty('title');
  expect(response.body.data).toHaveProperty('description');
  expect(response.body.data).toHaveProperty('courses');
  expect(Array.isArray(response.body.data.courses)).toBe(true);
};

global.assertCourseResponse = (response: any) => {
  expect(response.body.data).toHaveProperty('id');
  expect(response.body.data).toHaveProperty('title');
  expect(response.body.data).toHaveProperty('description');
  expect(response.body.data).toHaveProperty('duration');
  expect(response.body.data).toHaveProperty('content');
};

global.assertEnrollmentResponse = (response: any) => {
  expect(response.body.data).toHaveProperty('id');
  expect(response.body.data).toHaveProperty('employeeId');
  expect(response.body.data).toHaveProperty('courseId');
  expect(response.body.data).toHaveProperty('status');
  expect(response.body.data).toHaveProperty('progress');
};

global.assertAssessmentResponse = (response: any) => {
  expect(response.body.data).toHaveProperty('id');
  expect(response.body.data).toHaveProperty('questions');
  expect(Array.isArray(response.body.data.questions)).toBe(true);
  expect(response.body.data).toHaveProperty('passingScore');
};

global.assertAnalyticsResponse = (response: any) => {
  expect(response.body.data).toHaveProperty('metrics');
  expect(response.body.data).toHaveProperty('summary');
  expect(response.body.data).toHaveProperty('trends');
};

// ============================================================================
// SEED TEST DATA
// ============================================================================

global.seedTestData = async () => {
  console.log('🌱 Seeding API test data...');
  
  // Seed learning paths
  const learningPaths = [
    global.testDataGenerators.generateLearningPath({
      id: 'lp_001',
      title: 'Leadership Development',
      category: 'leadership',
      difficulty: 'intermediate'
    }),
    global.testDataGenerators.generateLearningPath({
      id: 'lp_002',
      title: 'Technical Skills',
      category: 'technical',
      difficulty: 'advanced'
    })
  ];
  
  learningPaths.forEach(lp => {
    global.mockDatabase.learningPaths.set(lp.id, lp);
  });
  
  // Seed courses
  const courses = [
    global.testDataGenerators.generateCourse({
      id: 'course_001',
      title: 'Leadership Fundamentals',
      category: 'leadership',
      difficulty: 'intermediate'
    }),
    global.testDataGenerators.generateCourse({
      id: 'course_002',
      title: 'Advanced JavaScript',
      category: 'technical',
      difficulty: 'advanced'
    })
  ];
  
  courses.forEach(course => {
    global.mockDatabase.courses.set(course.id, course);
  });
  
  // Seed enrollments
  const enrollments = [
    global.testDataGenerators.generateEnrollment({
      id: 'enrollment_001',
      employeeId: 'emp_001',
      courseId: 'course_001',
      status: 'in_progress'
    }),
    global.testDataGenerators.generateEnrollment({
      id: 'enrollment_002',
      employeeId: 'emp_002',
      courseId: 'course_002',
      status: 'completed'
    })
  ];
  
  enrollments.forEach(enrollment => {
    global.mockDatabase.enrollments.set(enrollment.id, enrollment);
  });
  
  // Seed assessments
  const assessments = [
    global.testDataGenerators.generateAssessment({
      id: 'assessment_001',
      courseId: 'course_001',
      title: 'Leadership Assessment'
    })
  ];
  
  assessments.forEach(assessment => {
    global.mockDatabase.assessments.set(assessment.id, assessment);
  });
  
  console.log('✅ API test data seeded successfully');
};

// ============================================================================
// CLEANUP UTILITIES
// ============================================================================

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Clear test data
  global.mockDatabase.learningPaths.clear();
  global.mockDatabase.courses.clear();
  global.mockDatabase.enrollments.clear();
  global.mockDatabase.assessments.clear();
  global.mockDatabase.progress.clear();
  global.mockDatabase.analytics.clear();
  
  // Reset performance tracker
  global.performanceTracker.startTime = 0;
});

console.log('✅ LXP API Endpoint Test Setup Complete');
