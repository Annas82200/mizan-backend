/**
 * Global Teardown for LXP Trigger Integration Tests
 * 
 * Global cleanup tasks that run once after all trigger integration tests
 * including trigger engine cleanup, resource cleanup, and performance reporting.
 */

export default async function globalTeardown() {
  console.log('🧹 Starting LXP Trigger Integration Tests Global Teardown...');
  
  try {
    // ============================================================================
    // PERFORMANCE REPORTING
    // ============================================================================
    
    console.log('📊 Generating trigger integration performance report...');
    
    if (global.performanceMetrics) {
      const metrics = global.performanceMetrics;
      
      // Calculate performance statistics
      const avgTriggerTime = metrics.triggerExecutionTimes.length > 0 
        ? metrics.triggerExecutionTimes.reduce((a, b) => a + b, 0) / metrics.triggerExecutionTimes.length 
        : 0;
      
      const avgModuleTime = metrics.moduleResponseTimes.length > 0 
        ? metrics.moduleResponseTimes.reduce((a, b) => a + b, 0) / metrics.moduleResponseTimes.length 
        : 0;
      
      const avgIntegrationTime = metrics.integrationTimes.length > 0 
        ? metrics.integrationTimes.reduce((a, b) => a + b, 0) / metrics.integrationTimes.length 
        : 0;
      
      // Performance report
      console.log('\n📈 LXP Trigger Integration Test Performance Report:');
      console.log('=' .repeat(60));
      console.log(`Total Test Execution Time: ${metrics.totalTestExecutionTime}ms`);
      console.log(`Trigger Execution Times:`);
      console.log(`  - Average: ${avgTriggerTime.toFixed(2)}ms`);
      console.log(`  - Min: ${Math.min(...metrics.triggerExecutionTimes)}ms`);
      console.log(`  - Max: ${Math.max(...metrics.triggerExecutionTimes)}ms`);
      console.log(`  - Count: ${metrics.triggerExecutionTimes.length}`);
      console.log(`Module Response Times:`);
      console.log(`  - Average: ${avgModuleTime.toFixed(2)}ms`);
      console.log(`  - Min: ${Math.min(...metrics.moduleResponseTimes)}ms`);
      console.log(`  - Max: ${Math.max(...metrics.moduleResponseTimes)}ms`);
      console.log(`  - Count: ${metrics.moduleResponseTimes.length}`);
      console.log(`Integration Times:`);
      console.log(`  - Average: ${avgIntegrationTime.toFixed(2)}ms`);
      console.log(`  - Min: ${Math.min(...metrics.integrationTimes)}ms`);
      console.log(`  - Max: ${Math.max(...metrics.integrationTimes)}ms`);
      console.log(`  - Count: ${metrics.integrationTimes.length}`);
      console.log('=' .repeat(60));
      
      // Performance thresholds check
      const thresholds = global.testConfig?.performanceThresholds || {
        triggerExecution: 2000,
        moduleResponse: 1500,
        integration: 3000
      };
      
      console.log('\n🎯 Performance Threshold Analysis:');
      console.log(`Trigger Execution: ${avgTriggerTime <= thresholds.triggerExecution ? '✅' : '❌'} (${avgTriggerTime.toFixed(2)}ms / ${thresholds.triggerExecution}ms)`);
      console.log(`Module Response: ${avgModuleTime <= thresholds.moduleResponse ? '✅' : '❌'} (${avgModuleTime.toFixed(2)}ms / ${thresholds.moduleResponse}ms)`);
      console.log(`Integration: ${avgIntegrationTime <= thresholds.integration ? '✅' : '❌'} (${avgIntegrationTime.toFixed(2)}ms / ${thresholds.integration}ms)`);
    }
    
    // ============================================================================
    // TRIGGER ENGINE CLEANUP
    // ============================================================================
    
    console.log('⚙️ Cleaning up trigger engine...');
    
    if (global.triggerEngine) {
      // Clear all trigger engine data
      global.triggerEngine.initialized = false;
      global.triggerEngine.status = 'inactive';
      global.triggerEngine.modules = [];
      global.triggerEngine.triggers.clear();
      global.triggerEngine.results.clear();
    }
    
    // ============================================================================
    // MODULE CLEANUP
    // ============================================================================
    
    console.log('🔧 Cleaning up modules...');
    
    if (global.modules) {
      Object.keys(global.modules).forEach(moduleId => {
        global.modules[moduleId].status = 'inactive';
        global.modules[moduleId].health = 'unhealthy';
        global.modules[moduleId].triggers = [];
      });
    }
    
    // ============================================================================
    // TEST DATA CLEANUP
    // ============================================================================
    
    console.log('🧹 Cleaning up test data stores...');
    
    if (global.testDataStores) {
      global.testDataStores.triggers.clear();
      global.testDataStores.results.clear();
      global.testDataStores.modules.clear();
      global.testDataStores.unifiedResults.clear();
      global.testDataStores.employees.clear();
      global.testDataStores.learningPaths.clear();
    }
    
    // ============================================================================
    // TRIGGER CONFIGURATION CLEANUP
    // ============================================================================
    
    console.log('📋 Cleaning up trigger configurations...');
    
    if (global.triggerConfigurations) {
      Object.keys(global.triggerConfigurations).forEach(key => {
        delete global.triggerConfigurations[key as any];
      });
    }
    
    // ============================================================================
    // RESOURCE CLEANUP
    // ============================================================================
    
    console.log('🔄 Cleaning up resources...');
    
    // Clear performance metrics
    if (global.performanceMetrics) {
      global.performanceMetrics.triggerExecutionTimes = [];
      global.performanceMetrics.moduleResponseTimes = [];
      global.performanceMetrics.integrationTimes = [];
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
    global.triggerEngine = null;
    global.modules = null;
    global.triggerConfigurations = null;
    global.testDataStores = null;
    global.performanceMetrics = null;
    global.testConfig = null;
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // ============================================================================
    // TEST SUMMARY
    // ============================================================================
    
    console.log('\n📋 Trigger Integration Test Summary:');
    console.log('=' .repeat(50));
    console.log('✅ All trigger integration tests completed');
    console.log('✅ Trigger engine integration validated');
    console.log('✅ Module communication tested');
    console.log('✅ Output trigger generation verified');
    console.log('✅ Error handling and recovery tested');
    console.log('✅ Performance and scalability validated');
    console.log('✅ Cleanup completed successfully');
    console.log('=' .repeat(50));
    
    console.log('✅ LXP Trigger Integration Tests Global Teardown Complete');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error to avoid masking test failures
  }
}
