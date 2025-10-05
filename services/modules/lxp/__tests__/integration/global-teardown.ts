/**
 * Global Teardown for LXP Workflow Integration Tests
 * 
 * Global cleanup tasks that run once after all integration tests
 * including database cleanup, resource cleanup, and performance reporting.
 */

export default async function globalTeardown() {
  console.log('🧹 Starting LXP Workflow Integration Tests Global Teardown...');
  
  try {
    // ============================================================================
    // PERFORMANCE REPORTING
    // ============================================================================
    
    console.log('📊 Generating performance report...');
    
    if (global.performanceMetrics) {
      const metrics = global.performanceMetrics;
      
      // Calculate performance statistics
      const workflowAvgTime = metrics.workflowExecutionTimes.length > 0 
        ? metrics.workflowExecutionTimes.reduce((a, b) => a + b, 0) / metrics.workflowExecutionTimes.length 
        : 0;
      
      const aiAgentAvgTime = metrics.aiAgentResponseTimes.length > 0 
        ? metrics.aiAgentResponseTimes.reduce((a, b) => a + b, 0) / metrics.aiAgentResponseTimes.length 
        : 0;
      
      const dbOpAvgTime = metrics.databaseOperationTimes.length > 0 
        ? metrics.databaseOperationTimes.reduce((a, b) => a + b, 0) / metrics.databaseOperationTimes.length 
        : 0;
      
      // Performance report
      console.log('\n📈 LXP Workflow Integration Test Performance Report:');
      console.log('=' .repeat(60));
      console.log(`Total Test Execution Time: ${metrics.totalTestExecutionTime}ms`);
      console.log(`Workflow Execution Times:`);
      console.log(`  - Average: ${workflowAvgTime.toFixed(2)}ms`);
      console.log(`  - Min: ${Math.min(...metrics.workflowExecutionTimes)}ms`);
      console.log(`  - Max: ${Math.max(...metrics.workflowExecutionTimes)}ms`);
      console.log(`  - Count: ${metrics.workflowExecutionTimes.length}`);
      console.log(`AI Agent Response Times:`);
      console.log(`  - Average: ${aiAgentAvgTime.toFixed(2)}ms`);
      console.log(`  - Min: ${Math.min(...metrics.aiAgentResponseTimes)}ms`);
      console.log(`  - Max: ${Math.max(...metrics.aiAgentResponseTimes)}ms`);
      console.log(`  - Count: ${metrics.aiAgentResponseTimes.length}`);
      console.log(`Database Operation Times:`);
      console.log(`  - Average: ${dbOpAvgTime.toFixed(2)}ms`);
      console.log(`  - Min: ${Math.min(...metrics.databaseOperationTimes)}ms`);
      console.log(`  - Max: ${Math.max(...metrics.databaseOperationTimes)}ms`);
      console.log(`  - Count: ${metrics.databaseOperationTimes.length}`);
      console.log('=' .repeat(60));
      
      // Performance thresholds check
      const thresholds = global.testConfig?.performanceThresholds || {
        workflowExecution: 5000,
        aiAgentResponse: 3000,
        databaseOperation: 1000
      };
      
      console.log('\n🎯 Performance Threshold Analysis:');
      console.log(`Workflow Execution: ${workflowAvgTime <= thresholds.workflowExecution ? '✅' : '❌'} (${workflowAvgTime.toFixed(2)}ms / ${thresholds.workflowExecution}ms)`);
      console.log(`AI Agent Response: ${aiAgentAvgTime <= thresholds.aiAgentResponse ? '✅' : '❌'} (${aiAgentAvgTime.toFixed(2)}ms / ${thresholds.aiAgentResponse}ms)`);
      console.log(`Database Operations: ${dbOpAvgTime <= thresholds.databaseOperation ? '✅' : '❌'} (${dbOpAvgTime.toFixed(2)}ms / ${thresholds.databaseOperation}ms)`);
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
      global.testDataStores.employees.clear();
      global.testDataStores.learningPaths.clear();
      global.testDataStores.courses.clear();
      global.testDataStores.enrollments.clear();
      global.testDataStores.assessments.clear();
      global.testDataStores.progress.clear();
      global.testDataStores.analytics.clear();
    }
    
    // ============================================================================
    // MOCK SERVICE CLEANUP
    // ============================================================================
    
    console.log('🔧 Cleaning up mock services...');
    
    // Clear AI service mocks
    if (global.mockAIServices) {
      global.mockAIServices.claude = null;
      global.mockAIServices.gpt4 = null;
      global.mockAIServices.cohere = null;
    }
    
    // Clear notification service mocks
    if (global.mockNotificationService) {
      global.mockNotificationService.email = null;
      global.mockNotificationService.sms = null;
      global.mockNotificationService.push = null;
    }
    
    // Clear file storage mocks
    if (global.mockFileStorage) {
      global.mockFileStorage = null;
    }
    
    // ============================================================================
    // RESOURCE CLEANUP
    // ============================================================================
    
    console.log('🔄 Cleaning up resources...');
    
    // Clear performance metrics
    if (global.performanceMetrics) {
      global.performanceMetrics.workflowExecutionTimes = [];
      global.performanceMetrics.aiAgentResponseTimes = [];
      global.performanceMetrics.databaseOperationTimes = [];
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
    global.mockAIServices = null;
    global.mockNotificationService = null;
    global.mockFileStorage = null;
    global.performanceMetrics = null;
    global.testConfig = null;
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    console.log('✅ LXP Workflow Integration Tests Global Teardown Complete');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error to avoid masking test failures
  }
}
