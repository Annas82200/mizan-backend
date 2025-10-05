/**
 * Global Setup for LXP Trigger Integration Tests
 * 
 * Global setup tasks that run once before all trigger integration tests
 * including trigger engine initialization, module setup, and test data seeding.
 */

import { jest } from '@jest/globals';

export default async function globalSetup() {
  console.log('🚀 Starting LXP Trigger Integration Tests Global Setup...');
  
  try {
    // ============================================================================
    // ENVIRONMENT CONFIGURATION
    // ============================================================================
    
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'error';
    process.env.TRIGGER_ENGINE_TIMEOUT = '30000';
    process.env.DATABASE_URL = 'sqlite://test.db';
    process.env.REDIS_URL = 'redis://localhost:6379/1';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.ENCRYPTION_KEY = 'test-encryption-key';
    
    // ============================================================================
    // TRIGGER ENGINE INITIALIZATION
    // ============================================================================
    
    console.log('⚙️ Initializing trigger engine...');
    
    // Mock trigger engine initialization
    global.triggerEngine = {
      initialized: true,
      status: 'active',
      modules: ['lxp', 'skills_analysis', 'performance_management', 'culture_analysis'],
      triggers: new Map(),
      results: new Map()
    };
    
    // ============================================================================
    // MODULE INITIALIZATION
    // ============================================================================
    
    console.log('🔧 Initializing modules...');
    
    // Mock module initialization
    global.modules = {
      lxp: {
        id: 'lxp_module',
        name: 'Learning Experience Platform',
        status: 'active',
        health: 'healthy',
        triggers: [
          'skill_gaps_critical',
          'culture_learning_needed',
          'employee_skill_gap',
          'performance_improvement_lxp',
          'compliance_training_due',
          'safety_training_expired',
          'certification_expiring',
          'legal_requirement_change',
          'proactive_training'
        ]
      },
      skills_analysis: {
        id: 'skills_analysis_module',
        name: 'Skills Analysis',
        status: 'active',
        health: 'healthy',
        triggers: ['skills_analysis_update']
      },
      performance_management: {
        id: 'performance_management_module',
        name: 'Performance Management',
        status: 'active',
        health: 'healthy',
        triggers: ['performance_assessment_trigger']
      },
      culture_analysis: {
        id: 'culture_analysis_module',
        name: 'Culture Analysis',
        status: 'active',
        health: 'healthy',
        triggers: ['culture_analysis_update']
      }
    };
    
    // ============================================================================
    // TRIGGER CONFIGURATION SETUP
    // ============================================================================
    
    console.log('📋 Setting up trigger configurations...');
    
    // Initialize trigger configurations
    global.triggerConfigurations = {
      skill_gaps_critical: {
        id: 'trigger_skill_gaps',
        type: 'skill_gaps_critical',
        tenantId: 'tenant_001',
        conditions: {
          skillGapThreshold: 0.7,
          urgencyLevel: 'high'
        },
        actions: {
          moduleType: 'lxp',
          actionType: 'create_learning_path'
        }
      },
      culture_learning_needed: {
        id: 'trigger_culture_learning',
        type: 'culture_learning_needed',
        tenantId: 'tenant_001',
        conditions: {
          cultureGapThreshold: 0.6,
          urgencyLevel: 'medium'
        },
        actions: {
          moduleType: 'lxp',
          actionType: 'create_culture_learning_path'
        }
      },
      employee_skill_gap: {
        id: 'trigger_employee_skill_gap',
        type: 'employee_skill_gap',
        tenantId: 'tenant_001',
        conditions: {
          employeeId: 'emp_001',
          skillGapThreshold: 0.5
        },
        actions: {
          moduleType: 'lxp',
          actionType: 'create_personalized_learning_path'
        }
      },
      performance_improvement_lxp: {
        id: 'trigger_performance_improvement',
        type: 'performance_improvement_lxp',
        tenantId: 'tenant_001',
        conditions: {
          performanceThreshold: 0.8,
          improvementAreas: ['time_management', 'communication']
        },
        actions: {
          moduleType: 'lxp',
          actionType: 'create_performance_learning_path'
        }
      },
      compliance_training_due: {
        id: 'trigger_compliance_training',
        type: 'compliance_training_due',
        tenantId: 'tenant_001',
        conditions: {
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          trainingType: 'mandatory'
        },
        actions: {
          moduleType: 'lxp',
          actionType: 'create_compliance_training'
        }
      }
    };
    
    // ============================================================================
    // TEST DATA INITIALIZATION
    // ============================================================================
    
    console.log('📊 Initializing test data...');
    
    // Initialize test data stores
    global.testDataStores = {
      triggers: new Map(),
      results: new Map(),
      modules: new Map(),
      unifiedResults: new Map(),
      employees: new Map(),
      learningPaths: new Map()
    };
    
    // Seed test data
    await seedTriggerTestData();
    
    // ============================================================================
    // PERFORMANCE MONITORING SETUP
    // ============================================================================
    
    console.log('⚡ Setting up performance monitoring...');
    
    global.performanceMetrics = {
      triggerExecutionTimes: [],
      moduleResponseTimes: [],
      integrationTimes: [],
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
      maxConcurrentTriggers: 50,
      defaultTimeout: 45000,
      retryAttempts: 3,
      performanceThresholds: {
        triggerExecution: 2000, // 2 seconds
        moduleResponse: 1500,   // 1.5 seconds
        integration: 3000       // 3 seconds
      }
    };
    
    console.log('✅ LXP Trigger Integration Tests Global Setup Complete');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

/**
 * Seed test data for trigger integration tests
 */
async function seedTriggerTestData() {
  console.log('🌱 Seeding trigger test data...');
  
  // Seed trigger configurations
  Object.values(global.triggerConfigurations).forEach(trigger => {
    global.testDataStores.triggers.set(trigger.id, trigger);
  });
  
  // Seed unified results
  const unifiedResults = [
    {
      id: 'results_001',
      tenantId: 'tenant_001',
      timestamp: new Date().toISOString(),
      analysisResults: {
        culture: {
          id: 'culture_001',
          type: 'culture_analysis',
          confidence: 0.85,
          data: {
            values: ['collaboration', 'innovation'],
            alignment: 0.8,
            gaps: ['communication']
          }
        },
        skills: {
          id: 'skills_001',
          type: 'skills_analysis',
          confidence: 0.9,
          data: {
            currentSkills: ['javascript', 'typescript'],
            skillGaps: ['leadership', 'communication'],
            recommendations: ['leadership_training']
          }
        },
        structure: {
          id: 'structure_001',
          type: 'structure_analysis',
          confidence: 0.75,
          data: {
            layers: 3,
            positions: 15,
            efficiency: 0.7
          }
        }
      },
      overallHealth: 0.8,
      recommendations: ['improve_communication', 'add_leadership_training']
    },
    {
      id: 'results_002',
      tenantId: 'tenant_002',
      timestamp: new Date().toISOString(),
      analysisResults: {
        culture: {
          id: 'culture_002',
          type: 'culture_analysis',
          confidence: 0.9,
          data: {
            values: ['excellence', 'integrity'],
            alignment: 0.95,
            gaps: []
          }
        },
        skills: {
          id: 'skills_002',
          type: 'skills_analysis',
          confidence: 0.85,
          data: {
            currentSkills: ['leadership', 'communication'],
            skillGaps: ['technical_skills'],
            recommendations: ['technical_training']
          }
        }
      },
      overallHealth: 0.9,
      recommendations: ['technical_skill_development']
    }
  ];
  
  unifiedResults.forEach(result => {
    global.testDataStores.unifiedResults.set(result.id, result);
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
  
  // Seed trigger results
  const triggerResults = [
    {
      id: 'result_001',
      triggerId: 'trigger_skill_gaps',
      reason: 'Skill gaps detected in employee profile',
      action: 'learning_path_created',
      priority: 'high',
      data: { learningPathId: 'lp_001' },
      executed: true,
      timestamp: new Date().toISOString()
    },
    {
      id: 'result_002',
      triggerId: 'trigger_culture_learning',
      reason: 'Culture learning needs identified',
      action: 'culture_learning_path_created',
      priority: 'medium',
      data: { learningPathId: 'lp_culture_001' },
      executed: true,
      timestamp: new Date().toISOString()
    }
  ];
  
  triggerResults.forEach(result => {
    global.testDataStores.results.set(result.id, result);
  });
  
  console.log('✅ Trigger test data seeded successfully');
}
