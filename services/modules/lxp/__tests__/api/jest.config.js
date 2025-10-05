/**
 * Jest Configuration for LXP API Endpoint Tests
 * 
 * Configuration for comprehensive API endpoint testing including
 * request/response validation, error handling, and performance testing.
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // TypeScript support
  preset: 'ts-jest',
  
  // Test file patterns
  testMatch: [
    '**/__tests__/api/**/*.test.ts',
    '**/__tests__/api/**/*.test.js'
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
  
  // Test timeout (increased for API tests)
  testTimeout: 30000, // 30 seconds
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    '../../api/**/*.ts',
    '../../lxp-module.ts',
    '!**/*.d.ts',
    '!**/__tests__/**',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },
  
  // Verbose output for API tests
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
  modulePaths: ['<rootDir>/../../'],
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(supertest|@types/supertest)/)'
  ]
};
