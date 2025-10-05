// Jest setup for Performance Trigger Integration Tests

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Mock database
jest.mock('../../../../../db/index', () => ({
  db: {
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockResolvedValue([])
    }),
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([])
      })
    })
  }
}));

// Mock logger
jest.mock('../../../../../utils/logger', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }))
}));

jest.setTimeout(30000);

console.log('Performance trigger integration tests setup complete');

