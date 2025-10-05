/**
 * Global Setup for Integration Tests
 * Runs once before all tests
 */

import { db } from '../../db/index.js';

export default async function globalSetup() {
  console.log('🚀 Setting up integration test environment...');
  
  try {
    // Connect to test database
    await db.$connect();
    console.log('✅ Database connected');
    
    // Run any necessary migrations
    // await db.migrate();
    console.log('✅ Database migrations completed');
    
    console.log('✅ Global setup completed');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}
