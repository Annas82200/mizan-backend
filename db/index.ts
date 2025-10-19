// server/db/index.ts

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Create connection pool (AGENT_CONTEXT_ULTIMATE.md - Drizzle ORM requirement)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/mizan',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 10000, // maximum time to wait for a connection
  query_timeout: 30000, // query timeout in milliseconds
  keepAlive: true, // enable TCP keep-alive
  keepAliveInitialDelayMillis: 10000
});

// Create drizzle instance
export const db = drizzle(pool, { schema });

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Database connection established');
});

pool.on('error', (err) => {
  console.error('❌ Database pool error:', err);
});

// Test connection immediately
(async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Initial database connection successful');
    client.release();
  } catch (error) {
    console.error('❌ Initial database connection failed:', error);
  }
})();

// Export pool for raw queries if needed
export { pool };
