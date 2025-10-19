// server/db/index.ts

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Database connection configuration following AGENT_CONTEXT_ULTIMATE.md requirements
const getDatabaseConfig = () => {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.warn('⚠️ DATABASE_URL not found. Using fallback configuration.');
    // For development, use a more flexible connection string
    return {
      connectionString: 'postgresql://localhost:5432/mizan',
      ssl: false,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      query_timeout: 30000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000
    };
  }

  return {
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    query_timeout: 30000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
  };
};

// Create connection pool with proper error handling
const config = getDatabaseConfig();
const pool = new Pool(config);

// Create drizzle instance
export const db = drizzle(pool, { schema });

// Enhanced connection monitoring
pool.on('connect', (client) => {
  console.log('✅ Database connection established');
});

pool.on('error', (err) => {
  console.error('❌ Database pool error:', err);
  // In production, you might want to trigger alerts here
});

pool.on('remove', () => {
  console.log('📤 Database connection removed from pool');
});

// Test connection with proper error handling
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Initial database connection successful');
    client.release();
  } catch (error) {
    console.error('❌ Initial database connection failed:', error);
    
    // Provide helpful error messages based on common issues
    if (error instanceof Error) {
      if (error.message.includes('role "postgres" does not exist')) {
        console.error('💡 Suggestion: Create PostgreSQL user or use different connection string');
      } else if (error.message.includes('ECONNREFUSED')) {
        console.error('💡 Suggestion: Ensure PostgreSQL is running and accessible');
      } else if (error.message.includes('database') && error.message.includes('does not exist')) {
        console.error('💡 Suggestion: Create the database or check DATABASE_URL');
      }
    }
  }
};

// Test connection immediately
testConnection();

// Export pool for raw queries if needed
export { pool };
