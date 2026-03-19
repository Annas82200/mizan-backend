// @ts-nocheck
/**
 * Rate Limiter Middleware — Redis-backed sliding window rate limiting
 *
 * Supports per-tenant and per-user limits. Configurable per route.
 */

import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../infrastructure/redis';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
  keyExtractor?: (req: Request) => string;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 60,
  keyPrefix: 'rl',
};

export function rateLimiter(config?: Partial<RateLimitConfig>) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const redis = getRedisClient();
      const key = buildKey(req, cfg);
      const now = Date.now();
      const windowStart = now - cfg.windowMs;

      const pipeline = redis.pipeline();
      pipeline.zremrangebyscore(key, 0, windowStart);
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      pipeline.zcard(key);
      pipeline.expire(key, Math.ceil(cfg.windowMs / 1000));

      const results = await pipeline.exec();
      const requestCount = (results?.[2]?.[1] as number) || 0;

      res.setHeader('X-RateLimit-Limit', cfg.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, cfg.maxRequests - requestCount));
      res.setHeader('X-RateLimit-Reset', new Date(now + cfg.windowMs).toISOString());

      if (requestCount > cfg.maxRequests) {
        res.status(429).json({
          error: 'Too many requests',
          message: `Rate limit exceeded. Max ${cfg.maxRequests} requests per ${cfg.windowMs / 1000}s.`,
          retryAfter: Math.ceil(cfg.windowMs / 1000),
        });
        return;
      }

      next();
    } catch (err) {
      next(); // Fail-open if Redis is down
    }
  };
}

export const aiRateLimiter = rateLimiter({
  windowMs: 60_000,
  maxRequests: 20,
  keyPrefix: 'rl:ai',
});

export const hrisSyncRateLimiter = rateLimiter({
  windowMs: 300_000,
  maxRequests: 5,
  keyPrefix: 'rl:hris',
});

export const authRateLimiter = rateLimiter({
  windowMs: 900_000,
  maxRequests: 10,
  keyPrefix: 'rl:auth',
});

function buildKey(req: Request, cfg: RateLimitConfig): string {
  if (cfg.keyExtractor) {
    return `${cfg.keyPrefix}:${cfg.keyExtractor(req)}`;
  }
  const tenantId = (req as Record<string, unknown>).tenantId || 'unknown';
  const userId = (req as Record<string, unknown>).userId || req.ip;
  return `${cfg.keyPrefix}:${tenantId}:${userId}`;
}
