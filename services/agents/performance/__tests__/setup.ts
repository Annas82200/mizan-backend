// Jest setup file for Performance AI Agent tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce noise in tests

// Mock logger to reduce console output during tests
jest.mock('../../../../utils/logger', () => {
  return {
    Logger: jest.fn().mockImplementation(() => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    }))
  };
});

// Global test timeout
jest.setTimeout(30000);

// Mock database if needed
global.mockDatabase = {
  connected: true,
  // Add mock database methods here
};

console.log('Performance AI Agent tests setup complete');

