/**
 * Test Setup for Hiring Module Integration Tests
 */

// Mock external dependencies
jest.mock('../../../../../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Global test timeout
jest.setTimeout(10000);
