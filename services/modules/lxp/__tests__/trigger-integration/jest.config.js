/**
 * Jest Configuration for LXP Trigger Integration Tests
 * 
 * Configuration for comprehensive trigger integration testing including
 * trigger engine integration, module communication, and workflow coordination.
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // TypeScript support
  preset: 'ts-jest',
  
  // Test file patterns
  testMatch: [
    '**/__tests__/trigger-integration/**/*.test.ts',
    '**/__tests__/trigger-integration/**/*.test.js'
  ],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  
  // Module name mapping for ES modules
  moduleNameMapping: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],
  
  // Global setup and teardown
  globalSetup: '<rootDir>/global-setup.ts',
  globalTeardown: '<rootDir>/global-teardown.ts',
  
  // Test timeout (increased for integration tests)
  testTimeout: 45000, // 45 seconds
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    '../../lxp-module.ts',
    '../../../results/trigger-engine.ts',
    '../../../results/unified-results.ts',
    '!**/*.d.ts',
    '!**/__tests__/**',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Verbose output for integration tests
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Performance monitoring
  detectOpenHandles: true,
  forceExit: true,
  
  // Test results processor
  testResultsProcessor: '<rootDir>/test-results-processor.js',
  
  // Custom test environment
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  
  // Module paths for testing
  modulePaths: ['<rootDir>/../../../'],
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ]
};
