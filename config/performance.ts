/**
 * Performance Configuration
 * Optimizes application performance for production
 */

export const performanceConfig = {
  // Database connection pooling
  database: {
    pool: {
      min: 5,
      max: 20,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200
    },
    query: {
      timeout: 30000,
      slowQueryThreshold: 1000 // Log queries slower than 1 second
    }
  },

  // Redis caching
  redis: {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    },
    cache: {
      defaultTTL: 3600, // 1 hour
      maxMemory: '256mb',
      evictionPolicy: 'allkeys-lru'
    }
  },

  // API rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  },

  // Request/Response optimization
  compression: {
    level: 6,
    threshold: 1024,
    filter: (req: any, res: any) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return true;
    }
  },

  // Memory management
  memory: {
    maxHeapSize: '1g',
    gcInterval: 30000, // 30 seconds
    memoryWarningThreshold: 0.8 // Warn when memory usage exceeds 80%
  },

  // Logging optimization
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    maxFiles: 5,
    maxSize: '10m',
    datePattern: 'YYYY-MM-DD',
    compress: true
  },

  // API response optimization
  api: {
    timeout: 30000, // 30 seconds
    maxRequestSize: '10mb',
    enableCORS: true,
    corsOptions: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
      optionsSuccessStatus: 200
    }
  },

  // Background job processing
  jobs: {
    concurrency: 5,
    maxAttempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 10,
    removeOnFail: 5
  },

  // File upload optimization
  uploads: {
    maxFileSize: '50mb',
    maxFiles: 10,
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'],
    tempDir: './temp',
    cleanupInterval: 3600000 // 1 hour
  },

  // WebSocket optimization
  websocket: {
    pingInterval: 25000,
    pingTimeout: 60000,
    maxConnections: 1000,
    compression: true
  },

  // Monitoring and metrics
  metrics: {
    enabled: true,
    port: 9090,
    path: '/metrics',
    collectDefaultMetrics: true,
    prefix: 'mizan_'
  },

  // Health checks
  health: {
    enabled: true,
    path: '/health',
    interval: 30000, // 30 seconds
    timeout: 5000, // 5 seconds
    checks: [
      'database',
      'redis',
      'memory',
      'disk'
    ]
  }
};

export default performanceConfig;
