// Jest setup for Performance API Endpoint Tests

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
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([])
      })
    }),
    delete: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue([])
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

// Mock performance module
jest.mock('../../performance-module', () => ({
  performanceModule: {
    initialize: jest.fn().mockResolvedValue(undefined),
    checkHealth: jest.fn().mockResolvedValue({ healthy: true, details: {} }),
    getStatus: jest.fn().mockReturnValue({ 
      moduleId: 'performance_management',
      moduleName: 'Performance Management Module',
      version: '1.0.0',
      enabled: true
    })
  }
}));

jest.setTimeout(30000);

console.log('Performance API endpoint tests setup complete');

