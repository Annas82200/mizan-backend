module.exports = {
  displayName: 'API Integration Tests',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'services/**/*.ts',
    '!services/**/*.d.ts',
    '!services/**/__tests__/**',
    '!services/**/node_modules/**',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],
  globalSetup: '<rootDir>/global-setup.ts',
  globalTeardown: '<rootDir>/global-teardown.ts',
  verbose: true,
  testTimeout: 30000,
  maxWorkers: 1, // Run tests sequentially to avoid database conflicts
};
