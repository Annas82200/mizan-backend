// server/db/index.ts

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { config } from '../config';

// ✅ PRODUCTION: Use validated config, no fallback connection strings
// Config module ensures DATABASE_URL exists or fails fast on startup
const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
});

// Create drizzle instance
export const db = drizzle(pool, { schema });

// Export pool for raw queries if needed
export { pool };
