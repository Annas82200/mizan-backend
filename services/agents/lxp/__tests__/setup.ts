// backend/services/agents/lxp/__tests__/setup.ts
// Task Reference: Module 1 (LXP) - Section 1.6.1 (Unit Tests for AI Agents)

import { jest } from '@jest/globals';

// ============================================================================
// TEST SETUP CONFIGURATION
// ============================================================================

// Global test setup
beforeAll(async () => {
  // Setup global test environment
  console.log('Setting up LXP AI Agents test environment...');
  
  // Mock console methods to reduce noise during tests
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

// Cleanup after all tests
afterAll(async () => {
  // Restore console methods
  jest.restoreAllMocks();
  
  console.log('LXP AI Agents test environment cleanup completed.');
});

// Setup before each test
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

// Cleanup after each test
afterEach(() => {
  // Additional cleanup if needed
});

// ============================================================================
// GLOBAL TEST UTILITIES
// ============================================================================

// Mock data generators
export const generateMockEmployeeData = (overrides = {}) => ({
  employeeId: 'emp_001',
  tenantId: 'tenant_001',
  name: 'John Doe',
  role: 'Software Engineer',
  experience: 'intermediate',
  learningStyle: 'visual',
  ...overrides
});

export const generateMockSkillGaps = (count = 3) => 
  Array.from({ length: count }, (_, i) => ({
    skillId: `skill_${i}`,
    skillName: `Skill ${i}`,
    currentLevel: 2,
    targetLevel: 4,
    gapSize: 2,
    importance: 'important',
    category: 'technical',
    estimatedTimeToClose: 20
  }));

export const generateMockLearningHistory = (count = 5) =>
  Array.from({ length: count }, (_, i) => ({
    courseId: `course_${i}`,
    courseTitle: `Course ${i}`,
    completionDate: new Date(),
    score: 80 + Math.floor(Math.random() * 20),
    skillsLearned: [`skill_${i}`]
  }));

// Test assertions helpers
export const expectValidAnalysisResult = (result) => {
  expect(result).toBeDefined();
  expect(result.knowledge).toBeDefined();
  expect(result.data).toBeDefined();
  expect(result.reasoning).toBeDefined();
  expect(result.finalOutput).toBeDefined();
  expect(result.overallConfidence).toBeGreaterThan(0);
  expect(result.overallConfidence).toBeLessThanOrEqual(1);
  expect(result.totalProcessingTime).toBeGreaterThan(0);
};

export const expectValidFrameworkOutput = (frameworks) => {
  expect(frameworks).toBeDefined();
  expect(typeof frameworks).toBe('object');
  expect(Object.keys(frameworks).length).toBeGreaterThan(0);
};

export const expectValidDataOutput = (data) => {
  expect(data).toBeDefined();
  expect(typeof data).toBe('object');
  expect(Object.keys(data).length).toBeGreaterThan(0);
};

// Performance test helpers
export const measurePerformance = async (fn, maxTime = 5000) => {
  const startTime = Date.now();
  const result = await fn();
  const endTime = Date.now();
  const processingTime = endTime - startTime;
  
  expect(processingTime).toBeLessThan(maxTime);
  return { result, processingTime };
};

// Error test helpers
export const expectToThrowWithMessage = async (fn, expectedMessage) => {
  await expect(fn).rejects.toThrow(expectedMessage);
};

// Mock AI provider responses
export const mockAIResponse = (response) => {
  return jest.fn().mockResolvedValue({
    content: JSON.stringify(response),
    usage: {
      promptTokens: 100,
      completionTokens: 200,
      totalTokens: 300
    }
  });
};

// ============================================================================
// TEST CONSTANTS
// ============================================================================

export const TEST_CONSTANTS = {
  TIMEOUTS: {
    SHORT: 1000,
    MEDIUM: 5000,
    LONG: 10000
  },
  CONFIDENCE_THRESHOLDS: {
    MINIMUM: 0.5,
    GOOD: 0.7,
    EXCELLENT: 0.9
  },
  PERFORMANCE_THRESHOLDS: {
    FAST: 1000,
    ACCEPTABLE: 5000,
    SLOW: 10000
  }
};

// ============================================================================
// MOCK IMPLEMENTATIONS
// ============================================================================

// Mock ThreeEngineAgent base class methods
export const mockThreeEngineAgent = () => ({
  runKnowledgeEngine: jest.fn().mockResolvedValue({
    output: {},
    confidence: 0.8,
    processingTime: 100
  }),
  runDataEngine: jest.fn().mockResolvedValue({
    output: {},
    confidence: 0.8,
    processingTime: 100
  }),
  runReasoningEngine: jest.fn().mockResolvedValue({
    output: {},
    confidence: 0.8,
    processingTime: 100
  }),
  calculateOverallConfidence: jest.fn().mockReturnValue(0.8)
});

// Mock MultiProviderManager
export const mockMultiProviderManager = () => ({
  generateResponse: jest.fn().mockResolvedValue({
    content: '{"test": "response"}',
    usage: {
      promptTokens: 100,
      completionTokens: 200,
      totalTokens: 300
    }
  })
});

// ============================================================================
// TEST DATA FIXTURES
// ============================================================================

export const FIXTURES = {
  EMPLOYEE_PROFILE: {
    employeeId: 'emp_001',
    tenantId: 'tenant_001',
    name: 'John Doe',
    role: 'Software Engineer',
    experience: 'intermediate',
    learningStyle: 'visual'
  },
  
  SKILL_GAPS: [
    {
      skillId: 'leadership_001',
      skillName: 'Team Leadership',
      currentLevel: 2,
      targetLevel: 4,
      gapSize: 2,
      importance: 'critical',
      category: 'leadership',
      estimatedTimeToClose: 40
    }
  ],
  
  LEARNING_PREFERENCES: {
    preferredFormats: ['interactive', 'video'],
    preferredDuration: 'medium',
    preferredFrequency: 'weekly',
    accessibility: ['screen_reader_compatible']
  },
  
  ORGANIZATIONAL_CONTEXT: {
    companyValues: ['Innovation', 'Collaboration'],
    industryContext: 'Technology',
    roleContext: 'Software Engineer',
    teamContext: 'Development Team'
  }
};
