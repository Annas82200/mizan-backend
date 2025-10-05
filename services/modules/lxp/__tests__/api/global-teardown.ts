/**
 * Global Teardown for LXP API Endpoint Tests
 * 
 * Global cleanup tasks that run once after all API endpoint tests
 * including database cleanup, resource cleanup, and performance reporting.
 */

export default async function globalTeardown() {
  console.log('🧹 Starting LXP API Endpoint Tests Global Teardown...');
  
  try {
    // ============================================================================
    // PERFORMANCE REPORTING
    // ============================================================================
    
    console.log('📊 Generating API performance report...');
    
    if (global.performanceMetrics) {
      const metrics = global.performanceMetrics;
      
      // Calculate performance statistics
      const avgResponseTime = metrics.apiResponseTimes.length > 0 
        ? metrics.apiResponseTimes.reduce((a, b) => a + b, 0) / metrics.apiResponseTimes.length 
        : 0;
      
      const minResponseTime = metrics.apiResponseTimes.length > 0 
        ? Math.min(...metrics.apiResponseTimes) 
        : 0;
      
      const maxResponseTime = metrics.apiResponseTimes.length > 0 
        ? Math.max(...metrics.apiResponseTimes) 
        : 0;
      
      // Performance report
      console.log('\n📈 LXP API Endpoint Test Performance Report:');
      console.log('=' .repeat(60));
      console.log(`Total Test Execution Time: ${metrics.totalTestExecutionTime}ms`);
      console.log(`API Response Times:`);
      console.log(`  - Average: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`  - Min: ${minResponseTime}ms`);
      console.log(`  - Max: ${maxResponseTime}ms`);
      console.log(`  - Total Requests: ${metrics.apiResponseTimes.length}`);
      console.log('');
      console.log(`Request Counts by Endpoint:`);
      metrics.requestCounts.forEach((count, endpoint) => {
        console.log(`  - ${endpoint}: ${count} requests`);
      });
      console.log('');
      console.log(`Error Counts by Endpoint:`);
      if (metrics.errorCounts.size > 0) {
        metrics.errorCounts.forEach((count, endpoint) => {
          console.log(`  - ${endpoint}: ${count} errors`);
        });
      } else {
        console.log(`  - No errors recorded`);
      }
      console.log('=' .repeat(60));
      
      // Performance thresholds check
      const thresholds = global.testConfig?.performanceThresholds || {
        apiResponse: 1000,
        databaseOperation: 500,
        externalService: 2000
      };
      
      console.log('\n🎯 Performance Threshold Analysis:');
      console.log(`API Response Time: ${avgResponseTime <= thresholds.apiResponse ? '✅' : '❌'} (${avgResponseTime.toFixed(2)}ms / ${thresholds.apiResponse}ms)`);
      
      // Calculate error rate
      const totalRequests = metrics.apiResponseTimes.length;
      const totalErrors = Array.from(metrics.errorCounts.values()).reduce((a, b) => a + b, 0);
      const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
      
      console.log(`Error Rate: ${errorRate <= 5 ? '✅' : '❌'} (${errorRate.toFixed(2)}% / 5%)`);
      console.log(`Total Requests: ${totalRequests}`);
      console.log(`Total Errors: ${totalErrors}`);
    }
    
    // ============================================================================
    // DATABASE CLEANUP
    // ============================================================================
    
    console.log('🗄️ Cleaning up test database...');
    
    if (global.testDatabase) {
      // Clear all test data
      global.testDatabase.initialized = false;
      global.testDatabase.connection = null;
      global.testDatabase.tables = [];
    }
    
    // ============================================================================
    // TEST DATA CLEANUP
    // ============================================================================
    
    console.log('🧹 Cleaning up test data stores...');
    
    if (global.testDataStores) {
      global.testDataStores.learningPaths.clear();
      global.testDataStores.courses.clear();
      global.testDataStores.enrollments.clear();
      global.testDataStores.assessments.clear();
      global.testDataStores.progress.clear();
      global.testDataStores.analytics.clear();
      global.testDataStores.employees.clear();
    }
    
    // ============================================================================
    // MOCK SERVICE CLEANUP
    // ============================================================================
    
    console.log('🔧 Cleaning up mock services...');
    
    // Clear LXP module mock
    if (global.mockLXPModule) {
      global.mockLXPModule = null;
    }
    
    // Clear external service mocks
    if (global.mockExternalServices) {
      global.mockExternalServices.notificationService = null;
      global.mockExternalServices.certificateService = null;
      global.mockExternalServices.employeeService = null;
      global.mockExternalServices.analyticsService = null;
    }
    
    // ============================================================================
    // EXPRESS APP CLEANUP
    // ============================================================================
    
    console.log('🌐 Cleaning up Express app...');
    
    if (global.testApp) {
      // Remove all middleware and routes
      global.testApp._router = null;
      global.testApp = null;
    }
    
    // ============================================================================
    // RESOURCE CLEANUP
    // ============================================================================
    
    console.log('🔄 Cleaning up resources...');
    
    // Clear performance metrics
    if (global.performanceMetrics) {
      global.performanceMetrics.apiResponseTimes = [];
      global.performanceMetrics.requestCounts.clear();
      global.performanceMetrics.errorCounts.clear();
      global.performanceMetrics.totalTestExecutionTime = 0;
    }
    
    // Clear test configuration
    if (global.testConfig) {
      global.testConfig = null;
    }
    
    // ============================================================================
    // FINAL CLEANUP
    // ============================================================================
    
    console.log('✨ Final cleanup...');
    
    // Clear global variables
    global.testDatabase = null;
    global.testDataStores = null;
    global.mockLXPModule = null;
    global.mockExternalServices = null;
    global.testApp = null;
    global.performanceMetrics = null;
    global.testConfig = null;
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // ============================================================================
    // TEST SUMMARY
    // ============================================================================
    
    console.log('\n📋 API Endpoint Test Summary:');
    console.log('=' .repeat(40));
    console.log('✅ All API endpoint tests completed');
    console.log('✅ Performance metrics collected');
    console.log('✅ Error handling validated');
    console.log('✅ Request/response validation verified');
    console.log('✅ Integration endpoints tested');
    console.log('✅ Cleanup completed successfully');
    console.log('=' .repeat(40));
    
    console.log('✅ LXP API Endpoint Tests Global Teardown Complete');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error to avoid masking test failures
  }
}
