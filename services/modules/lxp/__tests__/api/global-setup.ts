/**
 * Global Setup for LXP API Endpoint Tests
 * 
 * Global setup tasks that run once before all API endpoint tests
 * including Express app initialization, database setup, and test data seeding.
 */

import { jest } from '@jest/globals';
import express from 'express';

export default async function globalSetup() {
  console.log('🚀 Starting LXP API Endpoint Tests Global Setup...');
  
  try {
    // ============================================================================
    // ENVIRONMENT CONFIGURATION
    // ============================================================================
    
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'error';
    process.env.API_PORT = '3001';
    process.env.DATABASE_URL = 'sqlite://test.db';
    process.env.REDIS_URL = 'redis://localhost:6379/1';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.ENCRYPTION_KEY = 'test-encryption-key';
    process.env.CORS_ORIGIN = 'http://localhost:3000';
    
    // ============================================================================
    // EXPRESS APP INITIALIZATION
    // ============================================================================
    
    console.log('🌐 Initializing Express test app...');
    
    // Create global test Express app
    global.testApp = express();
    
    // Middleware setup
    global.testApp.use(express.json({ limit: '10mb' }));
    global.testApp.use(express.urlencoded({ extended: true }));
    
    // CORS middleware for testing
    global.testApp.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
    
    // Request logging middleware (for debugging)
    global.testApp.use((req, res, next) => {
      if (process.env.LOG_LEVEL === 'debug') {
        console.log(`${req.method} ${req.path}`, req.body);
      }
      next();
    });
    
    // ============================================================================
    // DATABASE INITIALIZATION
    // ============================================================================
    
    console.log('📊 Initializing test database...');
    
    // Mock database initialization
    global.testDatabase = {
      initialized: true,
      connection: 'mock-connection',
      tables: [
        'learning_paths',
        'courses',
        'enrollments',
        'assessments',
        'assessment_results',
        'learning_analytics'
      ]
    };
    
    // ============================================================================
    // MOCK SERVICES SETUP
    // ============================================================================
    
    console.log('🔧 Setting up mock services...');
    
    // Mock LXP Module
    global.mockLXPModule = {
      initialize: jest.fn().mockResolvedValue({ success: true }),
      handleTrigger: jest.fn().mockResolvedValue({
        success: true,
        action: 'test_action',
        confidence: 0.9,
        data: { testData: 'test' }
      }),
      checkHealth: jest.fn().mockResolvedValue({ healthy: true }),
      getStatus: jest.fn().mockReturnValue({ status: 'active' })
    };
    
    // Mock external services
    global.mockExternalServices = {
      notificationService: {
        send: jest.fn().mockResolvedValue({ success: true }),
        sendBulk: jest.fn().mockResolvedValue({ success: true })
      },
      certificateService: {
        issue: jest.fn().mockResolvedValue({ 
          success: true, 
          certificateId: `cert_${Date.now()}` 
        }),
        validate: jest.fn().mockResolvedValue({ valid: true })
      },
      employeeService: {
        validate: jest.fn().mockResolvedValue({ 
          valid: true, 
          employee: { id: 'emp_001', name: 'Test Employee' } 
        }),
        update: jest.fn().mockResolvedValue({ success: true })
      },
      analyticsService: {
        generate: jest.fn().mockResolvedValue({ 
          success: true, 
          data: { metrics: {}, summary: {} } 
        })
      }
    };
    
    // ============================================================================
    // API ROUTER SETUP
    // ============================================================================
    
    console.log('🛣️ Setting up API routers...');
    
    // Import and mount API routers
    try {
      const learningPathsRouter = await import('../../api/learning-paths.js');
      const coursesRouter = await import('../../api/courses.js');
      const progressTrackingRouter = await import('../../api/progress-tracking.js');
      const assessmentsRouter = await import('../../api/assessments.js');
      const analyticsRouter = await import('../../api/analytics.js');
      const lxpApiRouter = await import('../../api/index.js');
      
      // Mount routers
      global.testApp.use('/api/lxp', lxpApiRouter.default);
      
      console.log('✅ API routers mounted successfully');
    } catch (error) {
      console.warn('⚠️ Could not mount API routers:', error.message);
      // Continue with setup - tests will handle missing routers
    }
    
    // ============================================================================
    // ERROR HANDLING MIDDLEWARE
    // ============================================================================
    
    console.log('🛡️ Setting up error handling...');
    
    // Global error handler
    global.testApp.use((err: any, req: any, res: any, next: any) => {
      console.error('API Test Error:', err);
      
      if (res.headersSent) {
        return next(err);
      }
      
      res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error',
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
      });
    });
    
    // 404 handler
    global.testApp.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    });
    
    // ============================================================================
    // TEST DATA INITIALIZATION
    // ============================================================================
    
    console.log('📋 Initializing test data...');
    
    // Initialize test data stores
    global.testDataStores = {
      learningPaths: new Map(),
      courses: new Map(),
      enrollments: new Map(),
      assessments: new Map(),
      progress: new Map(),
      analytics: new Map(),
      employees: new Map()
    };
    
    // Seed test data
    await seedAPITestData();
    
    // ============================================================================
    // PERFORMANCE MONITORING SETUP
    // ============================================================================
    
    console.log('⚡ Setting up performance monitoring...');
    
    global.performanceMetrics = {
      apiResponseTimes: [],
      requestCounts: new Map(),
      errorCounts: new Map(),
      totalTestExecutionTime: 0
    };
    
    // Request timing middleware
    global.testApp.use((req, res, next) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        global.performanceMetrics.apiResponseTimes.push(duration);
        
        const endpoint = `${req.method} ${req.path}`;
        global.performanceMetrics.requestCounts.set(
          endpoint, 
          (global.performanceMetrics.requestCounts.get(endpoint) || 0) + 1
        );
        
        if (res.statusCode >= 400) {
          global.performanceMetrics.errorCounts.set(
            endpoint,
            (global.performanceMetrics.errorCounts.get(endpoint) || 0) + 1
          );
        }
      });
      
      next();
    });
    
    // ============================================================================
    // TEST CONFIGURATION
    // ============================================================================
    
    console.log('⚙️ Configuring test settings...');
    
    global.testConfig = {
      maxConcurrentRequests: 20,
      defaultTimeout: 30000,
      retryAttempts: 3,
      performanceThresholds: {
        apiResponse: 1000, // 1 second
        databaseOperation: 500, // 500ms
        externalService: 2000 // 2 seconds
      },
      testDataSize: {
        learningPaths: 10,
        courses: 20,
        enrollments: 50,
        assessments: 15
      }
    };
    
    // ============================================================================
    // HEALTH CHECK ENDPOINT
    // ============================================================================
    
    global.testApp.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: 'test',
        version: '1.0.0'
      });
    });
    
    console.log('✅ LXP API Endpoint Tests Global Setup Complete');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

/**
 * Seed test data for API endpoint tests
 */
async function seedAPITestData() {
  console.log('🌱 Seeding API test data...');
  
  // Seed learning paths
  const learningPaths = [
    {
      id: 'lp_001',
      title: 'Leadership Development Path',
      description: 'Comprehensive leadership development program',
      category: 'leadership',
      difficulty: 'intermediate',
      courses: [
        {
          id: 'course_001',
          title: 'Leadership Fundamentals',
          duration: 120,
          skills: ['leadership', 'communication']
        }
      ],
      estimatedDuration: 240,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'lp_002',
      title: 'Technical Skills Enhancement',
      description: 'Advanced technical skills development',
      category: 'technical',
      difficulty: 'advanced',
      courses: [
        {
          id: 'course_002',
          title: 'Advanced JavaScript',
          duration: 180,
          skills: ['javascript', 'es6', 'async-programming']
        }
      ],
      estimatedDuration: 180,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  
  learningPaths.forEach(lp => {
    global.testDataStores.learningPaths.set(lp.id, lp);
  });
  
  // Seed courses
  const courses = [
    {
      id: 'course_001',
      title: 'Leadership Fundamentals',
      description: 'Learn the basics of effective leadership',
      category: 'leadership',
      difficulty: 'intermediate',
      duration: 120,
      skills: ['leadership', 'communication'],
      content: {
        modules: [
          {
            id: 'module_001',
            title: 'Introduction to Leadership',
            content: 'Leadership concepts and principles',
            duration: 30
          },
          {
            id: 'module_002',
            title: 'Communication Skills',
            content: 'Effective communication techniques',
            duration: 45
          }
        ]
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'course_002',
      title: 'Advanced JavaScript',
      description: 'Master advanced JavaScript concepts',
      category: 'technical',
      difficulty: 'advanced',
      duration: 180,
      skills: ['javascript', 'es6', 'async-programming'],
      content: {
        modules: [
          {
            id: 'module_003',
            title: 'ES6 Features',
            content: 'Modern JavaScript features',
            duration: 60
          },
          {
            id: 'module_004',
            title: 'Async Programming',
            content: 'Promises, async/await, and more',
            duration: 90
          }
        ]
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  
  courses.forEach(course => {
    global.testDataStores.courses.set(course.id, course);
  });
  
  // Seed enrollments
  const enrollments = [
    {
      id: 'enrollment_001',
      employeeId: 'emp_001',
      courseId: 'course_001',
      learningPathId: 'lp_001',
      status: 'in_progress',
      startDate: new Date().toISOString(),
      progress: {
        completedModules: 1,
        totalModules: 2,
        timeSpent: 30,
        lastActivity: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'enrollment_002',
      employeeId: 'emp_002',
      courseId: 'course_002',
      learningPathId: 'lp_002',
      status: 'completed',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      completionDate: new Date().toISOString(),
      progress: {
        completedModules: 2,
        totalModules: 2,
        timeSpent: 180,
        lastActivity: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  
  enrollments.forEach(enrollment => {
    global.testDataStores.enrollments.set(enrollment.id, enrollment);
  });
  
  // Seed assessments
  const assessments = [
    {
      id: 'assessment_001',
      courseId: 'course_001',
      title: 'Leadership Fundamentals Assessment',
      type: 'comprehensive',
      questions: [
        {
          id: 'q1',
          question: 'What is the most important quality of a leader?',
          options: ['Authority', 'Communication', 'Intelligence', 'Experience'],
          correctAnswer: 'Communication',
          points: 10
        },
        {
          id: 'q2',
          question: 'How should a leader handle team conflicts?',
          options: ['Avoid them', 'Address them directly', 'Delegate to HR', 'Ignore them'],
          correctAnswer: 'Address them directly',
          points: 10
        }
      ],
      passingScore: 70,
      timeLimit: 60,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  
  assessments.forEach(assessment => {
    global.testDataStores.assessments.set(assessment.id, assessment);
  });
  
  // Seed employees
  const employees = [
    {
      id: 'emp_001',
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: 'senior-developer',
      department: 'engineering',
      skills: ['javascript', 'typescript', 'react'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'emp_002',
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      role: 'team-lead',
      department: 'engineering',
      skills: ['leadership', 'communication', 'project-management'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  
  employees.forEach(emp => {
    global.testDataStores.employees.set(emp.id, emp);
  });
  
  // Seed analytics data
  const analyticsData = {
    overview: {
      totalLearningPaths: learningPaths.length,
      totalCourses: courses.length,
      totalEnrollments: enrollments.length,
      completionRate: 0.5,
      averageScore: 85
    },
    effectiveness: {
      metrics: {
        learningEffectiveness: 0.8,
        skillImprovement: 0.75,
        engagementScore: 0.85
      },
      improvementAreas: ['time_management', 'communication'],
      recommendations: ['increase_interactive_content', 'add_peer_learning']
    }
  };
  
  global.testDataStores.analytics.set('overview', analyticsData.overview);
  global.testDataStores.analytics.set('effectiveness', analyticsData.effectiveness);
  
  console.log('✅ API test data seeded successfully');
}
