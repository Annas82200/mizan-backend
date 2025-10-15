/**
 * Health Check Service
 * Monitors application health and dependencies
 */

import { db } from '../../db/index';
import { sql } from 'drizzle-orm';
import { metricsCollector } from './metrics';
import { logger } from '../../utils/logger';

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  details?: Record<string, unknown>;
  error?: string;
}

export interface OverallHealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  services: HealthCheckResult[];
  uptime: number;
  version: string;
}

export class HealthCheckService {
  private static instance: HealthCheckService;
  private startTime: number;

  private constructor() {
    this.startTime = Date.now();
  }

  public static getInstance(): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService();
    }
    return HealthCheckService.instance;
  }

  public async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Test database connection
      await db.execute(sql`SELECT 1`);
      
      const responseTime = Date.now() - startTime;
      const status = responseTime < 1000 ? 'healthy' : responseTime < 3000 ? 'degraded' : 'unhealthy';
      
      const result: HealthCheckResult = {
        service: 'database',
        status,
        responseTime,
        details: {
          connectionPool: 'active',
          queryTime: responseTime
        }
      };

      metricsCollector.updateHealthStatus('database', status === 'healthy');
      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      const result: HealthCheckResult = {
        service: 'database',
        status: 'unhealthy',
        responseTime,
        error: (error as Error).message
      };

      metricsCollector.updateHealthStatus('database', false);
      return result;
    }
  }

  public async checkRedis(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Create a Redis client using the same connection config as BullMQ
      const ioredis = await import('ioredis');
      const Redis = ioredis.default || ioredis;
      const redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null
      });

      // Ping Redis to check connectivity
      const pingResult = await redis.ping();

      // Get Redis info for additional health metrics
      const info = await redis.info('memory');
      const memoryLines = info.split('\r\n');
      const usedMemory = memoryLines.find((line: string) => line.startsWith('used_memory_human:'))?.split(':')[1] || 'unknown';

      // Clean up connection
      await redis.quit();

      const responseTime = Date.now() - startTime;

      const result: HealthCheckResult = {
        service: 'redis',
        status: pingResult === 'PONG' ? 'healthy' : 'unhealthy',
        responseTime,
        details: {
          connection: 'active',
          memory: usedMemory,
          ping: pingResult
        }
      };

      metricsCollector.updateHealthStatus('redis', result.status === 'healthy');
      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      const result: HealthCheckResult = {
        service: 'redis',
        status: 'unhealthy',
        responseTime,
        error: (error as Error).message
      };

      metricsCollector.updateHealthStatus('redis', false);
      return result;
    }
  }

  public async checkMemory(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const memUsage = process.memoryUsage();
      const totalMemory = memUsage.heapTotal;
      const usedMemory = memUsage.heapUsed;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;
      
      let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
      if (memoryUsagePercent > 90) {
        status = 'unhealthy';
      } else if (memoryUsagePercent > 75) {
        status = 'degraded';
      }
      
      const responseTime = Date.now() - startTime;
      
      const result: HealthCheckResult = {
        service: 'memory',
        status,
        responseTime,
        details: {
          heapUsed: Math.round(usedMemory / 1024 / 1024), // MB
          heapTotal: Math.round(totalMemory / 1024 / 1024), // MB
          usagePercent: Math.round(memoryUsagePercent)
        }
      };

      metricsCollector.updateHealthStatus('memory', status === 'healthy');
      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      const result: HealthCheckResult = {
        service: 'memory',
        status: 'unhealthy',
        responseTime,
        error: (error as Error).message
      };

      metricsCollector.updateHealthStatus('memory', false);
      return result;
    }
  }

  public async checkDisk(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Use Node.js built-in fs module to check disk space
      const { statfsSync } = await import('fs');
      const os = await import('os');

      // Get disk space for the temp directory (cross-platform)
      const tempDir = os.tmpdir();
      const stats = statfsSync(tempDir);

      // Calculate disk usage
      const totalSpace = stats.blocks * stats.bsize;
      const freeSpace = stats.bavail * stats.bsize;
      const usedSpace = totalSpace - freeSpace;
      const usagePercent = (usedSpace / totalSpace) * 100;

      // Determine health status based on usage
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (usagePercent > 90) {
        status = 'unhealthy';
      } else if (usagePercent > 80) {
        status = 'degraded';
      }

      const responseTime = Date.now() - startTime;

      const result: HealthCheckResult = {
        service: 'disk',
        status,
        responseTime,
        details: {
          totalGB: Math.round(totalSpace / 1024 / 1024 / 1024),
          freeGB: Math.round(freeSpace / 1024 / 1024 / 1024),
          usedGB: Math.round(usedSpace / 1024 / 1024 / 1024),
          usagePercent: Math.round(usagePercent)
        }
      };

      metricsCollector.updateHealthStatus('disk', status === 'healthy');
      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      const result: HealthCheckResult = {
        service: 'disk',
        status: 'unhealthy',
        responseTime,
        error: (error as Error).message
      };

      metricsCollector.updateHealthStatus('disk', false);
      return result;
    }
  }

  public async checkExternalServices(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const serviceStatuses: Record<string, string> = {};

    try {
      // Check SendGrid email service if configured
      if (process.env.SENDGRID_API_KEY) {
        try {
          // Make a lightweight API call to SendGrid to verify connectivity
          const response = await fetch('https://api.sendgrid.com/v3/scopes', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
              'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(5000) // 5 second timeout
          });

          serviceStatuses.email = response.ok ? 'operational' : 'degraded';
        } catch (emailError) {
          serviceStatuses.email = 'unavailable';
          logger.warn('SendGrid health check failed:', emailError);
        }
      } else {
        serviceStatuses.email = 'not_configured';
      }

      // Check AI providers if configured
      if (process.env.OPENAI_API_KEY) {
        serviceStatuses.openai = 'configured';
      }
      if (process.env.ANTHROPIC_API_KEY) {
        serviceStatuses.anthropic = 'configured';
      }

      // Check LinkedIn OAuth if configured
      if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
        serviceStatuses.linkedin = 'configured';
      } else {
        serviceStatuses.linkedin = 'not_configured';
      }

      // Determine overall status
      const hasUnavailable = Object.values(serviceStatuses).includes('unavailable');
      const hasDegraded = Object.values(serviceStatuses).includes('degraded');
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      if (hasUnavailable) {
        status = 'unhealthy';
      } else if (hasDegraded) {
        status = 'degraded';
      }

      const responseTime = Date.now() - startTime;

      const result: HealthCheckResult = {
        service: 'external_services',
        status,
        responseTime,
        details: serviceStatuses
      };

      metricsCollector.updateHealthStatus('external_services', status === 'healthy');
      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      const result: HealthCheckResult = {
        service: 'external_services',
        status: 'unhealthy',
        responseTime,
        error: (error as Error).message
      };

      metricsCollector.updateHealthStatus('external_services', false);
      return result;
    }
  }

  public async performHealthCheck(): Promise<OverallHealthStatus> {
    logger.info('Performing health check...');
    
    const startTime = Date.now();
    
    try {
      // Run all health checks in parallel
      const [
        database,
        redis,
        memory,
        disk,
        externalServices
      ] = await Promise.all([
        this.checkDatabase(),
        this.checkRedis(),
        this.checkMemory(),
        this.checkDisk(),
        this.checkExternalServices()
      ]);

      const services = [database, redis, memory, disk, externalServices];
      
      // Determine overall status
      const unhealthyServices = services.filter(s => s.status === 'unhealthy');
      const degradedServices = services.filter(s => s.status === 'degraded');
      
      let overallStatus: 'healthy' | 'unhealthy' | 'degraded';
      if (unhealthyServices.length > 0) {
        overallStatus = 'unhealthy';
      } else if (degradedServices.length > 0) {
        overallStatus = 'degraded';
      } else {
        overallStatus = 'healthy';
      }

      const result: OverallHealthStatus = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        services,
        uptime: Date.now() - this.startTime,
        version: process.env.npm_package_version || '1.0.0'
      };

      const responseTime = Date.now() - startTime;
      logger.info(`Health check completed in ${responseTime}ms with status: ${overallStatus}`);

      return result;

    } catch (error) {
      logger.error('Health check failed:', error);
      
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: [],
        uptime: Date.now() - this.startTime,
        version: process.env.npm_package_version || '1.0.0'
      };
    }
  }

  public async getHealthStatus(): Promise<OverallHealthStatus> {
    return this.performHealthCheck();
  }
}

// Export singleton instance
export const healthCheckService = HealthCheckService.getInstance();
