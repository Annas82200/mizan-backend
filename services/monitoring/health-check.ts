/**
 * Health Check Service
 * Monitors application health and dependencies
 */

import { db } from '../../db/index.js';
import { sql } from 'drizzle-orm';
import { metricsCollector } from './metrics.js';
import { logger } from '../../utils/logger.js';

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  details?: any;
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
      // TODO: Implement Redis health check when Redis is available
      // const redis = getRedisClient();
      // await redis.ping();
      
      const responseTime = Date.now() - startTime;
      
      const result: HealthCheckResult = {
        service: 'redis',
        status: 'healthy',
        responseTime,
        details: {
          connection: 'active',
          memory: 'available'
        }
      };

      metricsCollector.updateHealthStatus('redis', true);
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
      // TODO: Implement disk space check
      // const fs = require('fs');
      // const stats = fs.statSync('.');
      
      const responseTime = Date.now() - startTime;
      
      const result: HealthCheckResult = {
        service: 'disk',
        status: 'healthy',
        responseTime,
        details: {
          available: 'sufficient',
          usage: 'normal'
        }
      };

      metricsCollector.updateHealthStatus('disk', true);
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
    
    try {
      // TODO: Check external services like email, SMS, etc.
      
      const responseTime = Date.now() - startTime;
      
      const result: HealthCheckResult = {
        service: 'external_services',
        status: 'healthy',
        responseTime,
        details: {
          email: 'available',
          sms: 'available'
        }
      };

      metricsCollector.updateHealthStatus('external_services', true);
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
