/**
 * Trigger Integration Test Setup
 * 
 * Setup configuration for LXP trigger integration tests
 * including mocks, utilities, and test environment configuration.
 */

import { jest } from '@jest/globals';

// ============================================================================
// GLOBAL TEST CONFIGURATION
// ============================================================================

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.TRIGGER_ENGINE_TIMEOUT = '30000';
process.env.DATABASE_URL = 'sqlite://test.db';
process.env.REDIS_URL = 'redis://localhost:6379/1';

// ============================================================================
// MOCK CONFIGURATIONS
// ============================================================================

// Mock LXP Module
jest.mock('../../lxp-module.js', () => ({
  LXPModule: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue({ success: true }),
    handleTrigger: jest.fn().mockImplementation(async (triggerType, config, unifiedResults) => {
      // Default mock response based on trigger type
      const responses = {
        'skill_gaps_critical': {
          success: true,
          action: 'learning_path_created',
          confidence: 0.9,
          data: { learningPathId: 'lp_001' },
          nextTriggers: []
        },
        'culture_learning_needed': {
          success: true,
          action: 'culture_learning_path_created',
          confidence: 0.85,
          data: { learningPathId: 'lp_culture_001', focus: 'culture_alignment' },
          nextTriggers: []
        },
        'employee_skill_gap': {
          success: true,
          action: 'personalized_learning_path_created',
          confidence: 0.9,
          data: { learningPathId: 'lp_personal_001', employeeId: config.conditions?.employeeId },
          nextTriggers: []
        },
        'performance_improvement_lxp': {
          success: true,
          action: 'performance_learning_path_created',
          confidence: 0.8,
          data: { learningPathId: 'lp_performance_001', focus: 'performance_improvement' },
          nextTriggers: []
        },
        'compliance_training_due': {
          success: true,
          action: 'compliance_training_created',
          confidence: 0.95,
          data: { learningPathId: 'lp_compliance_001', type: 'compliance' },
          nextTriggers: []
        },
        'lxp_training_completion': {
          success: true,
          action: 'training_completed',
          confidence: 0.9,
          data: { courseId: config.conditions?.courseId, employeeId: config.conditions?.employeeId },
          nextTriggers: ['performance_assessment_trigger']
        },
        'skill_validation_complete': {
          success: true,
          action: 'skills_validated',
          confidence: 0.95,
          data: { employeeId: config.conditions?.employeeId, validatedSkills: config.conditions?.validatedSkills },
          nextTriggers: ['skills_analysis_update']
        },
        'culture_learning_complete': {
          success: true,
          action: 'culture_learning_completed',
          confidence: 0.9,
          data: { employeeId: config.conditions?.employeeId, alignmentScore: config.conditions?.alignmentScore },
          nextTriggers: ['culture_analysis_update']
        }
      };

      return responses[triggerType] || {
        success: true,
        action: 'default_action',
        confidence: 0.8,
        data: {},
        nextTriggers: []
      };
    }),
    checkHealth: jest.fn().mockResolvedValue({ healthy: true }),
    getStatus: jest.fn().mockReturnValue({ status: 'active' })
  }))
}));

// Mock Trigger Engine
jest.mock('../../../results/trigger-engine.js', () => ({
  processTrigger: jest.fn().mockImplementation(async (triggerConfig, unifiedResults) => {
    // Mock trigger processing logic
    return {
      id: `result_${Date.now()}`,
      triggerId: triggerConfig.id,
      reason: `Processed ${triggerConfig.type} trigger`,
      action: 'learning_path_created',
      priority: 'high',
      data: { learningPathId: 'lp_001' },
      executed: true,
      timestamp: new Date().toISOString()
    };
  }),
  createDefaultTriggers: jest.fn().mockReturnValue([
    {
      id: 'trigger_001',
      type: 'skill_gaps_critical',
      tenantId: 'tenant_001',
      conditions: { skillGapThreshold: 0.7 },
      actions: { moduleType: 'lxp', actionType: 'create_learning_path' }
    },
    {
      id: 'trigger_002',
      type: 'culture_learning_needed',
      tenantId: 'tenant_001',
      conditions: { cultureGapThreshold: 0.6 },
      actions: { moduleType: 'lxp', actionType: 'create_culture_learning_path' }
    },
    {
      id: 'trigger_003',
      type: 'employee_skill_gap',
      tenantId: 'tenant_001',
      conditions: { skillGapThreshold: 0.5 },
      actions: { moduleType: 'lxp', actionType: 'create_personalized_learning_path' }
    }
  ])
}));

// Mock Unified Results
jest.mock('../../../results/unified-results.js', () => ({
  UnifiedResults: jest.fn().mockImplementation((data) => ({
    id: data.id || 'results_001',
    tenantId: data.tenantId || 'tenant_001',
    timestamp: data.timestamp || new Date().toISOString(),
    analysisResults: data.analysisResults || {
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
    overallHealth: data.overallHealth || 0.8,
    recommendations: data.recommendations || ['improve_communication', 'add_leadership_training']
  }))
}));

// ============================================================================
// TEST UTILITIES
// ============================================================================

// Mock database operations
global.mockDatabase = {
  triggers: new Map(),
  results: new Map(),
  modules: new Map(),
  
  async saveTrigger(trigger: any) {
    this.triggers.set(trigger.id, trigger);
    return { success: true, id: trigger.id };
  },
  
  async getTrigger(id: string) {
    return this.triggers.get(id) || null;
  },
  
  async getAllTriggers(filters: any = {}) {
    let triggers = Array.from(this.triggers.values());
    
    if (filters.tenantId) {
      triggers = triggers.filter(t => t.tenantId === filters.tenantId);
    }
    if (filters.type) {
      triggers = triggers.filter(t => t.type === filters.type);
    }
    
    return triggers;
  },
  
  async saveResult(result: any) {
    this.results.set(result.id, result);
    return { success: true, id: result.id };
  },
  
  async getResult(id: string) {
    return this.results.get(id) || null;
  },
  
  async saveModule(module: any) {
    this.modules.set(module.id, module);
    return { success: true, id: module.id };
  },
  
  async getModule(id: string) {
    return this.modules.get(id) || null;
  }
};

// Mock external services
global.mockExternalServices = {
  async sendNotification(tenantId: string, message: string) {
    console.log(`Mock notification sent to ${tenantId}: ${message}`);
    return { success: true };
  },
  
  async updateModuleStatus(moduleId: string, status: string) {
    console.log(`Mock module status update for ${moduleId}: ${status}`);
    return { success: true };
  },
  
  async logTriggerExecution(triggerId: string, result: any) {
    console.log(`Mock trigger execution logged for ${triggerId}:`, result);
    return { success: true };
  }
};

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

// Performance tracking utilities
global.performanceTracker = {
  startTime: 0,
  
  start() {
    this.startTime = Date.now();
  },
  
  end() {
    const duration = Date.now() - this.startTime;
    console.log(`Trigger integration test execution time: ${duration}ms`);
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
  generateTriggerConfig(overrides: any = {}) {
    return {
      id: `trigger_${Date.now()}`,
      type: 'skill_gaps_critical',
      tenantId: 'tenant_001',
      conditions: {
        skillGapThreshold: 0.7,
        urgencyLevel: 'high'
      },
      actions: {
        moduleType: 'lxp',
        actionType: 'create_learning_path'
      },
      ...overrides
    };
  },
  
  generateUnifiedResults(overrides: any = {}) {
    return {
      id: `results_${Date.now()}`,
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
        }
      },
      overallHealth: 0.8,
      recommendations: ['improve_communication', 'add_leadership_training'],
      ...overrides
    };
  },
  
  generateTriggerResult(overrides: any = {}) {
    return {
      id: `result_${Date.now()}`,
      triggerId: `trigger_${Date.now()}`,
      reason: 'Test trigger execution',
      action: 'learning_path_created',
      priority: 'high',
      data: { learningPathId: 'lp_001' },
      executed: true,
      timestamp: new Date().toISOString(),
      ...overrides
    };
  }
};

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

global.assertTriggerResult = (result: any, expectedAction: string) => {
  expect(result).toBeDefined();
  expect(result.success).toBe(true);
  expect(result.action).toBe(expectedAction);
  expect(result.data).toBeDefined();
  expect(result.timestamp).toBeDefined();
};

global.assertTriggerConfig = (config: any) => {
  expect(config).toBeDefined();
  expect(config.id).toBeDefined();
  expect(config.type).toBeDefined();
  expect(config.tenantId).toBeDefined();
  expect(config.conditions).toBeDefined();
  expect(config.actions).toBeDefined();
};

global.assertUnifiedResults = (results: any) => {
  expect(results).toBeDefined();
  expect(results.id).toBeDefined();
  expect(results.tenantId).toBeDefined();
  expect(results.timestamp).toBeDefined();
  expect(results.analysisResults).toBeDefined();
  expect(results.overallHealth).toBeDefined();
};

global.assertModuleIntegration = (integration: any) => {
  expect(integration).toBeDefined();
  expect(integration.success).toBe(true);
  expect(integration.data).toBeDefined();
  expect(integration.data.integrationStatus).toBe('success');
};

// ============================================================================
// CLEANUP UTILITIES
// ============================================================================

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Clear test data
  global.mockDatabase.triggers.clear();
  global.mockDatabase.results.clear();
  global.mockDatabase.modules.clear();
  
  // Reset performance tracker
  global.performanceTracker.startTime = 0;
});

console.log('✅ LXP Trigger Integration Test Setup Complete');
