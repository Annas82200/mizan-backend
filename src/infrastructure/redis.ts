/**
 * Redis Client — Centralized Redis connection for caching, sessions, pub/sub
 *
 * Used by: AI response caching, rate limiting, session storage, WebSocket scaling
 */

import { Redis } from 'ioredis';

let redisClient: Redis | null = null;
let subscriberClient: Redis | null = null;

let redisAvailable = false;

function createRedisClient(): Redis {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy(times: number) {
      if (times > 5) {
        console.warn('[Redis] Max reconnection attempts reached. Redis features disabled.');
        return null; // Stop retrying — Redis is optional
      }
      return Math.min(times * 500, 5000);
    },
    enableReadyCheck: true,
    lazyConnect: true, // Don't connect until first command
    enableOfflineQueue: false, // Fail fast if not connected
  });

  client.on('error', (err) => {
    if (redisAvailable) {
      console.error('[Redis] Connection lost:', err.message);
    }
    redisAvailable = false;
  });

  client.on('connect', () => {
    redisAvailable = true;
    console.info('[Redis] Connected successfully');
  });

  // Attempt connection but don't crash if it fails
  client.connect().catch(() => {
    console.warn('[Redis] Not available — caching, rate limiting, and WebSocket scaling disabled. Platform will function without Redis.');
  });

  return client;
}

/**
 * Check if Redis is currently available
 */
export function isRedisAvailable(): boolean {
  return redisAvailable;
}

/**
 * Get the main Redis client (for get/set/del operations)
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
}

/**
 * Get a dedicated subscriber client (for pub/sub — requires separate connection)
 */
export function getSubscriberClient(): Redis {
  if (!subscriberClient) {
    subscriberClient = createRedisClient();
  }
  return subscriberClient;
}

/**
 * Cache helper — get or set with automatic TTL
 */
export async function cacheGetOrSet<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 3600
): Promise<T> {
  // If Redis is down, skip caching and fetch directly
  if (!redisAvailable) {
    return fetchFn();
  }

  try {
    const redis = getRedisClient();
    const cached = await redis.get(key);

    if (cached) {
      return JSON.parse(cached) as T;
    }

    const data = await fetchFn();
    await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
    return data;
  } catch (err) {
    // Redis failed mid-operation — fall back to direct fetch
    return fetchFn();
  }
}

/**
 * Invalidate cache keys by pattern
 */
export async function invalidateCache(pattern: string): Promise<number> {
  if (!redisAvailable) return 0;
  try {
    const redis = getRedisClient();
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return 0;
    return redis.del(...keys);
  } catch (err) {
    return 0;
  }
}

/**
 * Graceful shutdown
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
  if (subscriberClient) {
    await subscriberClient.quit();
    subscriberClient = null;
  }
}
