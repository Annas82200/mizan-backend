/**
 * Metrics and Monitoring Service
 * Collects and exposes application metrics
 */

import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
import { logger } from '../../utils/logger.js';

// Enable default metrics collection
collectDefaultMetrics({
  prefix: 'mizan_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
});

// Custom metrics
export const httpRequestDuration = new Histogram({
  name: 'mizan_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

export const httpRequestTotal = new Counter({
  name: 'mizan_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

export const activeConnections = new Gauge({
  name: 'mizan_active_connections',
  help: 'Number of active connections'
});

export const databaseConnections = new Gauge({
  name: 'mizan_database_connections',
  help: 'Number of database connections',
  labelNames: ['state']
});

export const cacheHitRate = new Gauge({
  name: 'mizan_cache_hit_rate',
  help: 'Cache hit rate percentage',
  labelNames: ['cache_type']
});

export const jobQueueSize = new Gauge({
  name: 'mizan_job_queue_size',
  help: 'Number of jobs in queue',
  labelNames: ['queue_name']
});

export const apiResponseTime = new Histogram({
  name: 'mizan_api_response_time_seconds',
  help: 'API response time in seconds',
  labelNames: ['endpoint', 'method'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

export const errorRate = new Counter({
  name: 'mizan_errors_total',
  help: 'Total number of errors',
  labelNames: ['error_type', 'service']
});

export const businessMetrics = {
  usersActive: new Gauge({
    name: 'mizan_users_active',
    help: 'Number of active users'
  }),
  
  performanceGoalsCreated: new Counter({
    name: 'mizan_performance_goals_created_total',
    help: 'Total number of performance goals created'
  }),
  
  hiringRequisitionsCreated: new Counter({
    name: 'mizan_hiring_requisitions_created_total',
    help: 'Total number of hiring requisitions created'
  }),
  
  coursesCompleted: new Counter({
    name: 'mizan_courses_completed_total',
    help: 'Total number of courses completed'
  })
};

// Health check metrics
export const healthCheckStatus = new Gauge({
  name: 'mizan_health_check_status',
  help: 'Health check status (1 = healthy, 0 = unhealthy)',
  labelNames: ['service']
});

export class MetricsCollector {
  private static instance: MetricsCollector;
  private metricsInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startMetricsCollection();
  }

  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  private startMetricsCollection(): void {
    // Collect metrics every 30 seconds
    this.metricsInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.collectBusinessMetrics();
    }, 30000);

    logger.info('Metrics collection started');
  }

  private collectSystemMetrics(): void {
    try {
      // Memory usage
      const memUsage = process.memoryUsage();
      const memUsageGauge = new Gauge({
        name: 'mizan_memory_usage_bytes',
        help: 'Memory usage in bytes',
        labelNames: ['type']
      });

      memUsageGauge.set({ type: 'rss' }, memUsage.rss);
      memUsageGauge.set({ type: 'heapTotal' }, memUsage.heapTotal);
      memUsageGauge.set({ type: 'heapUsed' }, memUsage.heapUsed);
      memUsageGauge.set({ type: 'external' }, memUsage.external);

      // CPU usage
      const cpuUsage = process.cpuUsage();
      const cpuUsageGauge = new Gauge({
        name: 'mizan_cpu_usage_microseconds',
        help: 'CPU usage in microseconds',
        labelNames: ['type']
      });

      cpuUsageGauge.set({ type: 'user' }, cpuUsage.user);
      cpuUsageGauge.set({ type: 'system' }, cpuUsage.system);

      // Event loop lag
      const start = process.hrtime();
      setImmediate(() => {
        const delta = process.hrtime(start);
        const lag = delta[0] * 1000 + delta[1] / 1e6;
        
        const eventLoopLag = new Gauge({
          name: 'mizan_event_loop_lag_milliseconds',
          help: 'Event loop lag in milliseconds'
        });
        
        eventLoopLag.set(lag);
      });

    } catch (error) {
      logger.error('Error collecting system metrics:', error);
    }
  }

  private collectBusinessMetrics(): void {
    try {
      // This would typically query the database for business metrics
      // For now, we'll use placeholder values
      
      // Example: Count active users
      // const activeUsers = await db.select().from(users).where(eq(users.status, 'active'));
      // businessMetrics.usersActive.set(activeUsers.length);

    } catch (error) {
      logger.error('Error collecting business metrics:', error);
    }
  }

  public recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    httpRequestDuration
      .labels(method, route, statusCode.toString())
      .observe(duration);

    httpRequestTotal
      .labels(method, route, statusCode.toString())
      .inc();
  }

  public recordApiResponse(endpoint: string, method: string, duration: number): void {
    apiResponseTime
      .labels(endpoint, method)
      .observe(duration);
  }

  public recordError(errorType: string, service: string): void {
    errorRate
      .labels(errorType, service)
      .inc();
  }

  public updateHealthStatus(service: string, isHealthy: boolean): void {
    healthCheckStatus
      .labels(service)
      .set(isHealthy ? 1 : 0);
  }

  public getMetrics(): Promise<string> {
    return register.metrics();
  }

  public stop(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    logger.info('Metrics collection stopped');
  }
}

// Export singleton instance
export const metricsCollector = MetricsCollector.getInstance();
