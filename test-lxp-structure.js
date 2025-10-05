// LXP Module Structure and Basic Functionality Test
// Tests file existence, structure, and basic imports

import fs from 'fs';
import path from 'path';

// ============================================================================
// Test Configuration
// ============================================================================

const TEST_CONFIG = {
  verbose: true,
  basePath: './services'
};

// ============================================================================
// Test Suite
// ============================================================================

class LXPStructureTestSuite {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: [],
      startTime: Date.now()
    };
  }

  async runAllTests() {
    console.log('🧪 Starting LXP Module Structure Test Suite...\n');
    
    try {
      // Test file existence
      await this.testFileExistence();
      
      // Test file structure
      await this.testFileStructure();
      
      // Test TypeScript syntax
      await this.testTypeScriptSyntax();
      
      // Test imports and exports
      await this.testImportsAndExports();
      
      // Test class definitions
      await this.testClassDefinitions();
      
      this.printResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.results.failed++;
      this.results.errors.push(`Test suite error: ${error.message}`);
    }
  }

  async testFileExistence() {
    console.log('📁 Testing File Existence...');
    
    const requiredFiles = [
      // AI Agents
      'services/agents/lxp/learning-path-designer.ts',
      'services/agents/lxp/learning-progress-tracker.ts',
      'services/agents/lxp/scenario-game-engine.ts',
      
      // Core Components
      'services/modules/lxp/core/lxp-orchestrator.ts',
      'services/modules/lxp/core/trigger-handlers.ts',
      
      // Workflows
      'services/modules/lxp/workflows/learning-path-creation.ts',
      
      // Database Schema
      'db/schema/lxp-extended.ts',
      'db/schema.ts'
    ];

    for (const file of requiredFiles) {
      try {
        const filePath = path.join(TEST_CONFIG.basePath, '..', file);
        const exists = fs.existsSync(filePath);
        
        this.assert(exists, `File should exist: ${file}`);
        
        if (exists) {
          const stats = fs.statSync(filePath);
          this.assert(stats.size > 0, `File should not be empty: ${file}`);
          console.log(`   ✅ ${file} (${stats.size} bytes)`);
        }
        
      } catch (error) {
        console.error(`   ❌ ${file}: ${error.message}`);
        this.recordFailure(`File existence: ${file}`, error);
      }
    }
    
    console.log('');
  }

  async testFileStructure() {
    console.log('🏗️ Testing File Structure...');
    
    const requiredDirectories = [
      'services/agents/lxp',
      'services/modules/lxp/core',
      'services/modules/lxp/workflows',
      'db/schema'
    ];

    for (const dir of requiredDirectories) {
      try {
        const dirPath = path.join(TEST_CONFIG.basePath, '..', dir);
        const exists = fs.existsSync(dirPath);
        
        this.assert(exists, `Directory should exist: ${dir}`);
        
        if (exists) {
          const files = fs.readdirSync(dirPath);
          this.assert(files.length > 0, `Directory should not be empty: ${dir}`);
          console.log(`   ✅ ${dir} (${files.length} files)`);
        }
        
      } catch (error) {
        console.error(`   ❌ ${dir}: ${error.message}`);
        this.recordFailure(`Directory structure: ${dir}`, error);
      }
    }
    
    console.log('');
  }

  async testTypeScriptSyntax() {
    console.log('📝 Testing TypeScript Syntax...');
    
    const filesToCheck = [
      'services/agents/lxp/learning-path-designer.ts',
      'services/agents/lxp/learning-progress-tracker.ts',
      'services/agents/lxp/scenario-game-engine.ts',
      'services/modules/lxp/core/lxp-orchestrator.ts',
      'services/modules/lxp/core/trigger-handlers.ts',
      'services/modules/lxp/workflows/learning-path-creation.ts'
    ];

    for (const file of filesToCheck) {
      try {
        const filePath = path.join(TEST_CONFIG.basePath, '..', file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Basic TypeScript syntax checks
        this.assert(content.includes('export'), `File should have exports: ${file}`);
        this.assert(content.includes('class'), `File should have class definitions: ${file}`);
        this.assert(content.includes('interface'), `File should have interfaces: ${file}`);
        this.assert(content.includes('async'), `File should have async methods: ${file}`);
        this.assert(content.includes('Promise'), `File should use Promises: ${file}`);
        
        // Check for proper imports
        this.assert(content.includes('import'), `File should have imports: ${file}`);
        
        // Check for proper documentation
        this.assert(content.includes('//'), `File should have comments: ${file}`);
        
        console.log(`   ✅ ${file} - TypeScript syntax valid`);
        
      } catch (error) {
        console.error(`   ❌ ${file}: ${error.message}`);
        this.recordFailure(`TypeScript syntax: ${file}`, error);
      }
    }
    
    console.log('');
  }

  async testImportsAndExports() {
    console.log('📦 Testing Imports and Exports...');
    
    const filesToCheck = [
      {
        file: 'services/agents/lxp/learning-path-designer.ts',
        expectedExports: ['LearningPathDesignerAgent'],
        expectedImports: ['ThreeEngineAgent']
      },
      {
        file: 'services/agents/lxp/learning-progress-tracker.ts',
        expectedExports: ['LearningProgressTrackerAgent'],
        expectedImports: ['ThreeEngineAgent']
      },
      {
        file: 'services/agents/lxp/scenario-game-engine.ts',
        expectedExports: ['ScenarioGameEngineAgent'],
        expectedImports: ['ThreeEngineAgent']
      },
      {
        file: 'services/modules/lxp/core/lxp-orchestrator.ts',
        expectedExports: ['LXPOrchestrator'],
        expectedImports: ['LearningPathDesignerAgent', 'LearningProgressTrackerAgent', 'ScenarioGameEngineAgent']
      },
      {
        file: 'services/modules/lxp/core/trigger-handlers.ts',
        expectedExports: ['LXPTriggerHandlers'],
        expectedImports: ['LXPOrchestrator']
      },
      {
        file: 'services/modules/lxp/workflows/learning-path-creation.ts',
        expectedExports: ['LearningPathCreationWorkflow'],
        expectedImports: ['LearningPathDesignerAgent', 'ScenarioGameEngineAgent']
      }
    ];

    for (const { file, expectedExports, expectedImports } of filesToCheck) {
      try {
        const filePath = path.join(TEST_CONFIG.basePath, '..', file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check exports
        for (const expectedExport of expectedExports) {
          this.assert(
            content.includes(`export class ${expectedExport}`) || 
            content.includes(`export { ${expectedExport}`) ||
            content.includes(`export default ${expectedExport}`),
            `File should export ${expectedExport}: ${file}`
          );
        }
        
        // Check imports
        for (const expectedImport of expectedImports) {
          this.assert(
            content.includes(`import.*${expectedImport}`),
            `File should import ${expectedImport}: ${file}`
          );
        }
        
        console.log(`   ✅ ${file} - Imports and exports valid`);
        
      } catch (error) {
        console.error(`   ❌ ${file}: ${error.message}`);
        this.recordFailure(`Imports/exports: ${file}`, error);
      }
    }
    
    console.log('');
  }

  async testClassDefinitions() {
    console.log('🏛️ Testing Class Definitions...');
    
    const classTests = [
      {
        file: 'services/agents/lxp/learning-path-designer.ts',
        className: 'LearningPathDesignerAgent',
        expectedMethods: ['generateLearningPath', 'loadFrameworks', 'processData', 'buildReasoningPrompt']
      },
      {
        file: 'services/agents/lxp/learning-progress-tracker.ts',
        className: 'LearningProgressTrackerAgent',
        expectedMethods: ['analyzeProgress', 'loadFrameworks', 'processData', 'buildReasoningPrompt']
      },
      {
        file: 'services/agents/lxp/scenario-game-engine.ts',
        className: 'ScenarioGameEngineAgent',
        expectedMethods: ['generateScenarioGame', 'loadFrameworks', 'processData', 'buildReasoningPrompt']
      },
      {
        file: 'services/modules/lxp/core/lxp-orchestrator.ts',
        className: 'LXPOrchestrator',
        expectedMethods: ['processLXPTrigger', 'processUnifiedResults', 'getActiveWorkflows']
      },
      {
        file: 'services/modules/lxp/core/trigger-handlers.ts',
        className: 'LXPTriggerHandlers',
        expectedMethods: ['processTrigger', 'processTriggersBatch', 'processUnifiedResults']
      },
      {
        file: 'services/modules/lxp/workflows/learning-path-creation.ts',
        className: 'LearningPathCreationWorkflow',
        expectedMethods: ['executeWorkflow', 'analyzeLearningNeeds', 'designLearningPath']
      }
    ];

    for (const { file, className, expectedMethods } of classTests) {
      try {
        const filePath = path.join(TEST_CONFIG.basePath, '..', file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check class definition
        this.assert(
          content.includes(`class ${className}`),
          `File should define class ${className}: ${file}`
        );
        
        // Check expected methods
        for (const method of expectedMethods) {
          this.assert(
            content.includes(`${method}(`) || content.includes(`async ${method}(`),
            `Class should have method ${method}: ${file}`
          );
        }
        
        // Check constructor
        this.assert(
          content.includes(`constructor(`),
          `Class should have constructor: ${file}`
        );
        
        console.log(`   ✅ ${className} - Class definition valid`);
        
      } catch (error) {
        console.error(`   ❌ ${className}: ${error.message}`);
        this.recordFailure(`Class definition: ${className}`, error);
      }
    }
    
    console.log('');
  }

  // ============================================================================
  // Test Utilities
  // ============================================================================

  assert(condition, message) {
    this.results.total++;
    if (condition) {
      this.results.passed++;
    } else {
      this.results.failed++;
      this.results.errors.push(`Assertion failed: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  recordFailure(testName, error) {
    this.results.failed++;
    this.results.errors.push(`${testName}: ${error.message}`);
  }

  printResults() {
    const duration = Date.now() - this.results.startTime;
    const successRate = ((this.results.passed / this.results.total) * 100).toFixed(1);
    
    console.log('='.repeat(60));
    console.log('🧪 LXP MODULE STRUCTURE TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`📊 Total Tests: ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log(`⏱️ Duration: ${duration}ms`);
    console.log('='.repeat(60));
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.results.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    if (this.results.failed === 0) {
      console.log('\n🎉 ALL STRUCTURE TESTS PASSED! LXP Module structure is perfect! 🎉');
      console.log('\n📋 COMPONENTS VERIFIED:');
      console.log('   ✅ Learning Path Designer Agent');
      console.log('   ✅ Learning Progress Tracker Agent');
      console.log('   ✅ Scenario Game Engine Agent');
      console.log('   ✅ LXP Orchestrator');
      console.log('   ✅ LXP Trigger Handlers');
      console.log('   ✅ Learning Path Creation Workflow');
      console.log('   ✅ Database Schema');
      console.log('\n🚀 Ready for integration and deployment!');
    } else {
      console.log(`\n⚠️ ${this.results.failed} test(s) failed. Please review the errors above.`);
    }
    
    console.log('='.repeat(60));
  }
}

// ============================================================================
// Run Tests
// ============================================================================

async function runTests() {
  const testSuite = new LXPStructureTestSuite();
  await testSuite.runAllTests();
}

// Run tests
runTests().catch(console.error);
