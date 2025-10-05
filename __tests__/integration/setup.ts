/**
 * Integration Test Setup
 * Configures test environment and mocks
 */

import { db } from '../../db/index.js';

// Setup test database connection
beforeAll(async () => {
  // Ensure database is connected
  await db.$connect();
});

afterAll(async () => {
  // Close database connection
  await db.$disconnect();
});

// Global test timeout
jest.setTimeout(30000);

// Mock external services
jest.mock('../../services/ai/multi-provider-manager.js', () => ({
  MultiProviderManager: jest.fn().mockImplementation(() => ({
    generateWithConsensus: jest.fn().mockResolvedValue({
      consensus: 'mock_consensus',
      confidence: 0.8,
      responses: []
    })
  }))
}));

jest.mock('../../services/email.js', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
  sendSMS: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('../../services/queue.js', () => ({
  addJob: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
  processJobs: jest.fn()
}));
