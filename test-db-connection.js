#!/usr/bin/env node

// Simple database connection test
const { Pool } = require('pg');

async function testConnection() {
  console.log('Testing database connection...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/mizan',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    query_timeout: 30000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
  });

  try {
    console.log('Attempting to connect to database...');
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Test basic query
    const result = await client.query('SELECT 1 as test');
    console.log('✅ Basic query successful:', result.rows[0]);
    
    // Test tenants table
    const tenantsResult = await client.query('SELECT COUNT(*) as count FROM tenants');
    console.log('✅ Tenants table accessible:', tenantsResult.rows[0]);
    
    // Test users table
    const usersResult = await client.query('SELECT COUNT(*) as count FROM users');
    console.log('✅ Users table accessible:', usersResult.rows[0]);
    
    client.release();
    await pool.end();
    console.log('✅ Database test completed successfully');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

testConnection();
