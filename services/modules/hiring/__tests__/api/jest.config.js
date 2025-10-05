module.exports = {
  displayName: 'Hiring Module API Endpoint Tests',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    '../../api/*.ts',
    '!../../api/*.d.ts',
    '!../../api/node_modules/**',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/setup.ts'],
  verbose: true,
  testTimeout: 30000,
};
