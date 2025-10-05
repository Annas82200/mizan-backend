// backend/services/agents/lxp/__tests__/jest.config.js
// Task Reference: Module 1 (LXP) - Section 1.6.1 (Unit Tests for AI Agents)

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  
  // TypeScript support
  preset: 'ts-jest',
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Transform files
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  
  // Module name mapping for ES modules
  moduleNameMapping: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  
  // Test timeout
  testTimeout: 30000,
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    '../**/*.ts',
    '!../**/*.d.ts',
    '!../**/__tests__/**',
    '!../**/node_modules/**'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks between tests
  restoreMocks: true,
  
  // Error on deprecated
  errorOnDeprecated: true,
  
  // Max workers
  maxWorkers: '50%',
  
  // Test results processor
  testResultsProcessor: 'jest-sonar-reporter',
  
  // Global setup
  globalSetup: '<rootDir>/global-setup.ts',
  
  // Global teardown
  globalTeardown: '<rootDir>/global-teardown.ts'
};
