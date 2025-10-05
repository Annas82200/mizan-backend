/**
 * Global Teardown for Integration Tests
 * Runs once after all tests
 */

import { db } from '../../db/index.js';

export default async function globalTeardown() {
  console.log('🧹 Cleaning up integration test environment...');
  
  try {
    // Disconnect from database
    await db.$disconnect();
    console.log('✅ Database disconnected');
    
    console.log('✅ Global teardown completed');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    throw error;
  }
}
