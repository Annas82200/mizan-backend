/**
 * Global Setup for LXP Workflow Integration Tests
 * 
 * Global setup tasks that run once before all integration tests
 * including database initialization, service setup, and environment configuration.
 */

import { jest } from '@jest/globals';

export default async function globalSetup() {
  console.log('🚀 Starting LXP Workflow Integration Tests Global Setup...');
  
  try {
    // ============================================================================
    // ENVIRONMENT CONFIGURATION
    // ============================================================================
    
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'error';
    process.env.AI_PROVIDER_TIMEOUT = '30000';
    process.env.DATABASE_URL = 'sqlite://test.db';
    process.env.REDIS_URL = 'redis://localhost:6379/1';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.ENCRYPTION_KEY = 'test-encryption-key';
    
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
    // EXTERNAL SERVICE MOCKS
    // ============================================================================
    
    console.log('🔗 Setting up external service mocks...');
    
    // Mock AI service providers
    global.mockAIServices = {
      claude: {
        available: true,
        responseTime: 1500,
        successRate: 0.95
      },
      gpt4: {
        available: true,
        responseTime: 2000,
        successRate: 0.92
      },
      cohere: {
        available: true,
        responseTime: 1800,
        successRate: 0.90
      }
    };
    
    // Mock notification service
    global.mockNotificationService = {
      email: {
        send: jest.fn().mockResolvedValue({ success: true }),
        sendBulk: jest.fn().mockResolvedValue({ success: true })
      },
      sms: {
        send: jest.fn().mockResolvedValue({ success: true })
      },
      push: {
        send: jest.fn().mockResolvedValue({ success: true })
      }
    };
    
    // Mock file storage service
    global.mockFileStorage = {
      upload: jest.fn().mockResolvedValue({ 
        success: true, 
        url: 'https://mock-storage.com/file.pdf' 
      }),
      download: jest.fn().mockResolvedValue({ 
        success: true, 
        content: 'mock-file-content' 
      }),
      delete: jest.fn().mockResolvedValue({ success: true })
    };
    
    // ============================================================================
    // WORKFLOW TEST DATA
    // ============================================================================
    
    console.log('📋 Preparing test data...');
    
    // Initialize test data stores
    global.testDataStores = {
      employees: new Map(),
      learningPaths: new Map(),
      courses: new Map(),
      enrollments: new Map(),
      assessments: new Map(),
      progress: new Map(),
      analytics: new Map()
    };
    
    // Seed test data
    await seedTestData();
    
    // ============================================================================
    // PERFORMANCE MONITORING SETUP
    // ============================================================================
    
    console.log('⚡ Setting up performance monitoring...');
    
    global.performanceMetrics = {
      workflowExecutionTimes: [],
      aiAgentResponseTimes: [],
      databaseOperationTimes: [],
      totalTestExecutionTime: 0
    };
    
    // ============================================================================
    // ERROR HANDLING SETUP
    // ============================================================================
    
    console.log('🛡️ Setting up error handling...');
    
    // Global error handler for tests
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
    
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
    });
    
    // ============================================================================
    // TEST CONFIGURATION
    // ============================================================================
    
    console.log('⚙️ Configuring test settings...');
    
    global.testConfig = {
      maxConcurrentTests: 10,
      defaultTimeout: 60000,
      retryAttempts: 3,
      performanceThresholds: {
        workflowExecution: 5000, // 5 seconds
        aiAgentResponse: 3000,   // 3 seconds
        databaseOperation: 1000  // 1 second
      }
    };
    
    console.log('✅ LXP Workflow Integration Tests Global Setup Complete');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

/**
 * Seed test data for integration tests
 */
async function seedTestData() {
  console.log('🌱 Seeding test data...');
  
  // Seed employee data
  const employees = [
    {
      id: 'emp_001',
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: 'senior-developer',
      department: 'engineering',
      skills: ['javascript', 'typescript', 'react'],
      learningPreferences: {
        format: 'interactive',
        duration: 'medium',
        difficulty: 'intermediate'
      }
    },
    {
      id: 'emp_002',
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      role: 'team-lead',
      department: 'engineering',
      skills: ['leadership', 'communication', 'project-management'],
      learningPreferences: {
        format: 'video',
        duration: 'long',
        difficulty: 'advanced'
      }
    },
    {
      id: 'emp_003',
      name: 'Bob Johnson',
      email: 'bob.johnson@example.com',
      role: 'junior-developer',
      department: 'engineering',
      skills: ['javascript', 'html', 'css'],
      learningPreferences: {
        format: 'text',
        duration: 'short',
        difficulty: 'beginner'
      }
    }
  ];
  
  employees.forEach(emp => {
    global.testDataStores.employees.set(emp.id, emp);
  });
  
  // Seed learning path data
  const learningPaths = [
    {
      id: 'lp_001',
      title: 'Leadership Development Path',
      description: 'Comprehensive leadership development program',
      courses: [
        {
          id: 'course_001',
          title: 'Leadership Fundamentals',
          category: 'leadership',
          skills: ['leadership', 'communication'],
          duration: 120,
          difficulty: 'intermediate'
        },
        {
          id: 'course_002',
          title: 'Team Management',
          category: 'leadership',
          skills: ['team_management', 'conflict_resolution'],
          duration: 90,
          difficulty: 'intermediate'
        }
      ],
      estimatedDuration: 240,
      difficulty: 'intermediate',
      focus: 'leadership'
    },
    {
      id: 'lp_002',
      title: 'Technical Skills Enhancement',
      description: 'Advanced technical skills development',
      courses: [
        {
          id: 'course_003',
          title: 'Advanced JavaScript',
          category: 'technical',
          skills: ['javascript', 'es6', 'async-programming'],
          duration: 180,
          difficulty: 'advanced'
        }
      ],
      estimatedDuration: 180,
      difficulty: 'advanced',
      focus: 'technical'
    }
  ];
  
  learningPaths.forEach(lp => {
    global.testDataStores.learningPaths.set(lp.id, lp);
  });
  
  // Seed course data
  const courses = [
    {
      id: 'course_001',
      title: 'Leadership Fundamentals',
      description: 'Learn the basics of effective leadership',
      category: 'leadership',
      skills: ['leadership', 'communication'],
      duration: 120,
      difficulty: 'intermediate',
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
      }
    },
    {
      id: 'course_002',
      title: 'Team Management',
      description: 'Learn how to manage and lead teams effectively',
      category: 'leadership',
      skills: ['team_management', 'conflict_resolution'],
      duration: 90,
      difficulty: 'intermediate',
      content: {
        modules: [
          {
            id: 'module_003',
            title: 'Team Dynamics',
            content: 'Understanding team dynamics and behavior',
            duration: 30
          },
          {
            id: 'module_004',
            title: 'Conflict Resolution',
            content: 'Techniques for resolving team conflicts',
            duration: 60
          }
        ]
      }
    }
  ];
  
  courses.forEach(course => {
    global.testDataStores.courses.set(course.id, course);
  });
  
  // Seed enrollment data
  const enrollments = [
    {
      id: 'enrollment_001',
      employeeId: 'emp_001',
      learningPathId: 'lp_001',
      courseId: 'course_001',
      status: 'in_progress',
      startDate: new Date().toISOString(),
      progress: {
        completedModules: 1,
        totalModules: 2,
        timeSpent: 30,
        lastActivity: new Date().toISOString()
      }
    },
    {
      id: 'enrollment_002',
      employeeId: 'emp_002',
      learningPathId: 'lp_001',
      courseId: 'course_002',
      status: 'completed',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      completionDate: new Date().toISOString(),
      progress: {
        completedModules: 2,
        totalModules: 2,
        timeSpent: 90,
        lastActivity: new Date().toISOString()
      }
    }
  ];
  
  enrollments.forEach(enrollment => {
    global.testDataStores.enrollments.set(enrollment.id, enrollment);
  });
  
  // Seed assessment data
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
      timeLimit: 60
    }
  ];
  
  assessments.forEach(assessment => {
    global.testDataStores.assessments.set(assessment.id, assessment);
  });
  
  console.log('✅ Test data seeded successfully');
}
