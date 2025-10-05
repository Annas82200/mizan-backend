/**
 * Test Setup for Hiring AI Agents Unit Tests
 */

// Mock external dependencies
jest.mock('../../../../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock AI provider infrastructure
jest.mock('../../../ai/multi-provider-manager.js', () => ({
  MultiProviderManager: jest.fn().mockImplementation(() => ({
    generateWithConsensus: jest.fn().mockResolvedValue({
      consensus: 'mock_consensus',
      confidence: 0.8,
      responses: []
    })
  }))
}));

// Global test timeout
jest.setTimeout(15000);
