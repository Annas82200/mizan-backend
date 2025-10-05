// Comprehensive LXP Module Test Suite
// Tests all LXP components: AI Agents, Orchestrator, Trigger Handlers, and Workflows

import { LearningPathDesignerAgent } from './services/agents/lxp/learning-path-designer.js';
import { LearningProgressTrackerAgent } from './services/agents/lxp/learning-progress-tracker.js';
import { ScenarioGameEngineAgent } from './services/agents/lxp/scenario-game-engine.js';
import { LXPOrchestrator } from './services/modules/lxp/core/lxp-orchestrator.js';
import { LXPTriggerHandlers } from './services/modules/lxp/core/trigger-handlers.js';
import LearningPathCreationWorkflow from './services/modules/lxp/workflows/learning-path-creation.js';

// ============================================================================
// Test Configuration
// ============================================================================

const TEST_CONFIG = {
  tenantId: 'test_tenant_123',
  employeeId: 'test_employee_456',
  timeout: 30000, // 30 seconds per test
  verbose: true
};

// ============================================================================
// Test Data
// ============================================================================

const createTestTriggerContext = (triggerType, additionalData = {}) => ({
  tenantId: TEST_CONFIG.tenantId,
  employeeId: TEST_CONFIG.employeeId,
  triggerType,
  triggerData: {
    skillGaps: ['Communication', 'Leadership'],
    employeeProfile: {
      role: 'Manager',
      department: 'Engineering',
      experience: 'senior',
      learningStyle: 'visual',
      preferences: {
        interactionLevel: 'high',
        challengeLevel: 'advanced',
        feedbackFrequency: 'immediate'
      },
      currentSkills: ['Technical Skills', 'Problem Solving'],
      skillGaps: ['Communication', 'Leadership']
    },
    organizationalContext: {
      cultureValues: ['Innovation', 'Collaboration', 'Excellence'],
      strategicGoals: ['Digital Transformation', 'Team Development'],
      departmentNeeds: { engineering: 'Leadership Development' },
      industryContext: 'Technology'
    },
    performanceResults: {
      overallScore: 0.75,
      improvementAreas: ['Communication', 'Team Management'],
      strengths: ['Technical Expertise', 'Problem Solving']
    },
    surveyResponses: {
      engagementLevel: 0.8,
      satisfactionScore: 0.85,
      motivationFactors: ['Growth', 'Recognition', 'Autonomy']
    },
    cultureValues: ['Innovation', 'Collaboration', 'Excellence'],
    ...additionalData
  },
  urgencyLevel: 'medium',
  priority: 7,
  sourceModule: 'skills_analysis',
  targetSkills: ['Communication', 'Leadership'],
  learningObjectives: ['Improve communication skills', 'Develop leadership capabilities'],
  estimatedDuration: 60,
  constraints: {
    budget: 1000,
    timeLimit: 90,
    prerequisites: ['Basic Management Training'],
    certifications: ['Leadership Certificate']
  }
});

const createTestUnifiedResults = () => ({
  tenantId: TEST_CONFIG.tenantId,
  employeeId: TEST_CONFIG.employeeId,
  skillsAnalysis: {
    triggers: [{
      triggerType: 'skills_gap',
      moduleType: 'lxp',
      urgencyLevel: 'medium',
      priority: 7,
      data: {
        skillGaps: ['Communication', 'Leadership'],
        learningObjectives: ['Improve communication', 'Develop leadership']
      }
    }]
  },
  cultureAnalysis: {
    triggers: [{
      triggerType: 'culture_alignment',
      moduleType: 'lxp',
      urgencyLevel: 'high',
      priority: 8,
      data: {
        cultureValues: ['Innovation', 'Collaboration'],
        learningObjectives: ['Align with values', 'Improve cultural fit']
      }
    }]
  },
  performanceAnalysis: {
    triggers: [{
      triggerType: 'performance_improvement',
      moduleType: 'lxp',
      urgencyLevel: 'medium',
      priority: 6,
      data: {
        improvementAreas: ['Communication', 'Team Management'],
        learningObjectives: ['Improve performance', 'Address gaps']
      }
    }]
  }
});

// ============================================================================
// Test Suite
// ============================================================================

class LXPTestSuite {
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
    console.log('🧪 Starting Comprehensive LXP Module Test Suite...\n');
    
    try {
      // Test AI Agents
      await this.testLearningPathDesignerAgent();
      await this.testLearningProgressTrackerAgent();
      await this.testScenarioGameEngineAgent();
      
      // Test Core Components
      await this.testLXPOrchestrator();
      await this.testLXPTriggerHandlers();
      
      // Test Workflows
      await this.testLearningPathCreationWorkflow();
      
      // Test Integration
      await this.testFullIntegration();
      
      this.printResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.results.failed++;
      this.results.errors.push(`Test suite error: ${error.message}`);
    }
  }

  async testLearningPathDesignerAgent() {
    console.log('🎯 Testing Learning Path Designer Agent...');
    
    try {
      const agent = new LearningPathDesignerAgent();
      const input = {
        tenantId: TEST_CONFIG.tenantId,
        employeeId: TEST_CONFIG.employeeId,
        learningObjectives: ['Improve communication', 'Develop leadership'],
        skillTargets: ['Communication', 'Leadership'],
        triggerData: createTestTriggerContext('skills_gap').triggerData,
        employeeProfile: createTestTriggerContext('skills_gap').triggerData.employeeProfile,
        organizationalContext: createTestTriggerContext('skills_gap').triggerData.organizationalContext,
        constraints: createTestTriggerContext('skills_gap').constraints
      };

      const result = await agent.generateLearningPath(input);
      
      this.assert(result, 'Learning path should be generated');
      this.assert(result.learningPath, 'Learning path should have learningPath property');
      this.assert(result.learningPath.modules, 'Learning path should have modules');
      this.assert(result.learningPath.modules.length > 0, 'Learning path should have at least one module');
      this.assert(result.confidence > 0, 'Learning path should have confidence score');
      
      console.log('✅ Learning Path Designer Agent: PASSED');
      console.log(`   - Generated ${result.learningPath.modules.length} modules`);
      console.log(`   - Confidence: ${result.confidence}`);
      console.log(`   - Duration: ${result.learningPath.estimatedDuration} minutes\n`);
      
    } catch (error) {
      console.error('❌ Learning Path Designer Agent: FAILED');
      console.error(`   Error: ${error.message}\n`);
      this.recordFailure('Learning Path Designer Agent', error);
    }
  }

  async testLearningProgressTrackerAgent() {
    console.log('📊 Testing Learning Progress Tracker Agent...');
    
    try {
      const agent = new LearningProgressTrackerAgent();
      const input = {
        tenantId: TEST_CONFIG.tenantId,
        employeeId: TEST_CONFIG.employeeId,
        learningPathId: 'test_path_123',
        courseId: 'test_course_456',
        progressData: {
          completionRate: 0.75,
          engagementScore: 0.8,
          timeSpent: 120,
          modulesCompleted: 3,
          totalModules: 4,
          lastActivity: new Date(),
          performanceMetrics: {
            quizScores: [85, 90, 78],
            practicalExercises: [88, 92],
            peerReviews: [4.2, 4.5]
          }
        },
        trackingType: 'comprehensive',
        timeRange: 'current',
        focusAreas: ['engagement', 'performance', 'completion']
      };

      const result = await agent.analyzeProgress(input);
      
      this.assert(result, 'Progress analysis should be generated');
      this.assert(result.progressAnalysis, 'Result should have progressAnalysis property');
      this.assert(result.progressAnalysis.overallProgress, 'Should have overall progress');
      this.assert(result.progressAnalysis.engagementScore, 'Should have engagement score');
      this.assert(result.confidence > 0, 'Should have confidence score');
      
      console.log('✅ Learning Progress Tracker Agent: PASSED');
      console.log(`   - Overall Progress: ${result.progressAnalysis.overallProgress}`);
      console.log(`   - Engagement Score: ${result.progressAnalysis.engagementScore}`);
      console.log(`   - Confidence: ${result.confidence}\n`);
      
    } catch (error) {
      console.error('❌ Learning Progress Tracker Agent: FAILED');
      console.error(`   Error: ${error.message}\n`);
      this.recordFailure('Learning Progress Tracker Agent', error);
    }
  }

  async testScenarioGameEngineAgent() {
    console.log('🎮 Testing Scenario Game Engine Agent...');
    
    try {
      const agent = new ScenarioGameEngineAgent();
      const input = {
        tenantId: TEST_CONFIG.tenantId,
        employeeId: TEST_CONFIG.employeeId,
        gameType: 'scenario_based',
        learningObjectives: ['Improve communication', 'Develop leadership'],
        skillTargets: ['Communication', 'Leadership'],
        triggerData: createTestTriggerContext('skills_gap').triggerData,
        employeeProfile: createTestTriggerContext('skills_gap').triggerData.employeeProfile,
        organizationalContext: createTestTriggerContext('skills_gap').triggerData.organizationalContext,
        gameParameters: {
          difficulty: 'intermediate',
          duration: 30,
          interactivity: 'high',
          realism: 'high'
        }
      };

      const result = await agent.generateScenarioGame(input);
      
      this.assert(result, 'Scenario game should be generated');
      this.assert(result.gameScenario, 'Result should have gameScenario property');
      this.assert(result.gameScenario.id, 'Game should have ID');
      this.assert(result.gameScenario.title, 'Game should have title');
      this.assert(result.gameScenario.scenario, 'Game should have scenario');
      this.assert(result.gameScenario.gameplay, 'Game should have gameplay');
      this.assert(result.confidence > 0, 'Should have confidence score');
      
      console.log('✅ Scenario Game Engine Agent: PASSED');
      console.log(`   - Game ID: ${result.gameScenario.id}`);
      console.log(`   - Title: ${result.gameScenario.title}`);
      console.log(`   - Type: ${result.gameScenario.type}`);
      console.log(`   - Duration: ${result.gameScenario.estimatedDuration} minutes`);
      console.log(`   - Confidence: ${result.confidence}\n`);
      
    } catch (error) {
      console.error('❌ Scenario Game Engine Agent: FAILED');
      console.error(`   Error: ${error.message}\n`);
      this.recordFailure('Scenario Game Engine Agent', error);
    }
  }

  async testLXPOrchestrator() {
    console.log('🎭 Testing LXP Orchestrator...');
    
    try {
      const orchestrator = new LXPOrchestrator();
      const triggerContext = createTestTriggerContext('skills_gap');

      const result = await orchestrator.processLXPTrigger(triggerContext);
      
      this.assert(result, 'Orchestration result should be generated');
      this.assert(result.success, 'Orchestration should be successful');
      this.assert(result.workflowId, 'Should have workflow ID');
      this.assert(result.result, 'Should have result');
      this.assert(result.nextActions, 'Should have next actions');
      this.assert(result.triggers, 'Should have triggers');
      this.assert(result.confidence > 0, 'Should have confidence score');
      
      console.log('✅ LXP Orchestrator: PASSED');
      console.log(`   - Workflow ID: ${result.workflowId}`);
      console.log(`   - Success: ${result.success}`);
      console.log(`   - Next Actions: ${result.nextActions.length}`);
      console.log(`   - Triggers: ${result.triggers.length}`);
      console.log(`   - Confidence: ${result.confidence}`);
      console.log(`   - Processing Time: ${result.processingTime}ms\n`);
      
    } catch (error) {
      console.error('❌ LXP Orchestrator: FAILED');
      console.error(`   Error: ${error.message}\n`);
      this.recordFailure('LXP Orchestrator', error);
    }
  }

  async testLXPTriggerHandlers() {
    console.log('🔧 Testing LXP Trigger Handlers...');
    
    try {
      const orchestrator = new LXPOrchestrator();
      const handlers = new LXPTriggerHandlers(orchestrator);

      // Test individual trigger processing
      const triggerContext = createTestTriggerContext('skills_gap');
      const result = await handlers.processTrigger('skills_gap', triggerContext.triggerData);
      
      this.assert(result, 'Trigger processing result should be generated');
      this.assert(result.success, 'Trigger processing should be successful');
      this.assert(result.handlerId, 'Should have handler ID');
      this.assert(result.triggerType, 'Should have trigger type');
      this.assert(result.processingTime > 0, 'Should have processing time');
      
      // Test batch processing
      const batchTriggers = [
        { type: 'skills_gap', data: triggerContext.triggerData },
        { type: 'culture_alignment', data: triggerContext.triggerData }
      ];
      const batchResult = await handlers.processTriggersBatch(batchTriggers);
      
      this.assert(batchResult, 'Batch processing result should be generated');
      this.assert(batchResult.length === 2, 'Should process 2 triggers');
      
      // Test unified results processing
      const unifiedResults = createTestUnifiedResults();
      const unifiedResult = await handlers.processUnifiedResults(unifiedResults);
      
      this.assert(unifiedResult, 'Unified results processing should work');
      this.assert(unifiedResult.length > 0, 'Should process at least one trigger');
      
      console.log('✅ LXP Trigger Handlers: PASSED');
      console.log(`   - Individual trigger: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      console.log(`   - Batch processing: ${batchResult.length} triggers`);
      console.log(`   - Unified results: ${unifiedResult.length} triggers`);
      console.log(`   - Processing time: ${result.processingTime}ms\n`);
      
    } catch (error) {
      console.error('❌ LXP Trigger Handlers: FAILED');
      console.error(`   Error: ${error.message}\n`);
      this.recordFailure('LXP Trigger Handlers', error);
    }
  }

  async testLearningPathCreationWorkflow() {
    console.log('🛤️ Testing Learning Path Creation Workflow...');
    
    try {
      const workflow = new LearningPathCreationWorkflow();
      const triggerContext = createTestTriggerContext('skills_gap');

      const result = await workflow.executeWorkflow(triggerContext);
      
      this.assert(result, 'Workflow result should be generated');
      this.assert(result.success, 'Workflow should be successful');
      this.assert(result.learningPath, 'Should have learning path');
      this.assert(result.scenarioGames, 'Should have scenario games array');
      this.assert(result.progressTracking, 'Should have progress tracking');
      this.assert(result.assessmentFramework, 'Should have assessment framework');
      this.assert(result.learningNeeds, 'Should have learning needs');
      this.assert(result.metadata, 'Should have metadata');
      this.assert(result.nextActions, 'Should have next actions');
      this.assert(result.triggers, 'Should have triggers');
      
      console.log('✅ Learning Path Creation Workflow: PASSED');
      console.log(`   - Success: ${result.success}`);
      console.log(`   - Learning Path: ${result.learningPath ? 'GENERATED' : 'MISSING'}`);
      console.log(`   - Scenario Games: ${result.scenarioGames.length}`);
      console.log(`   - Progress Tracking: ${result.progressTracking ? 'CONFIGURED' : 'MISSING'}`);
      console.log(`   - Assessment Framework: ${result.assessmentFramework ? 'INITIALIZED' : 'MISSING'}`);
      console.log(`   - Next Actions: ${result.nextActions.length}`);
      console.log(`   - Triggers: ${result.triggers.length}`);
      console.log(`   - Processing Time: ${result.metadata.processingTime}ms\n`);
      
    } catch (error) {
      console.error('❌ Learning Path Creation Workflow: FAILED');
      console.error(`   Error: ${error.message}\n`);
      this.recordFailure('Learning Path Creation Workflow', error);
    }
  }

  async testFullIntegration() {
    console.log('🔗 Testing Full Integration...');
    
    try {
      const orchestrator = new LXPOrchestrator();
      const handlers = new LXPTriggerHandlers(orchestrator);
      
      // Test complete flow: Unified Results → Trigger Handlers → Orchestrator → Workflow
      const unifiedResults = createTestUnifiedResults();
      
      console.log('   - Processing unified results...');
      const triggerResults = await handlers.processUnifiedResults(unifiedResults);
      
      this.assert(triggerResults, 'Trigger results should be generated');
      this.assert(triggerResults.length > 0, 'Should have trigger results');
      
      // Check that at least one trigger was successful
      const successfulTriggers = triggerResults.filter(r => r.success);
      this.assert(successfulTriggers.length > 0, 'At least one trigger should be successful');
      
      console.log('✅ Full Integration: PASSED');
      console.log(`   - Unified Results Processed: ${unifiedResults.tenantId}`);
      console.log(`   - Triggers Generated: ${triggerResults.length}`);
      console.log(`   - Successful Triggers: ${successfulTriggers.length}`);
      console.log(`   - Failed Triggers: ${triggerResults.length - successfulTriggers.length}\n`);
      
    } catch (error) {
      console.error('❌ Full Integration: FAILED');
      console.error(`   Error: ${error.message}\n`);
      this.recordFailure('Full Integration', error);
    }
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
    console.log('🧪 LXP MODULE TEST RESULTS');
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
      console.log('\n🎉 ALL TESTS PASSED! LXP Module is working perfectly! 🎉');
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
  const testSuite = new LXPTestSuite();
  await testSuite.runAllTests();
}

// Export for use in other test files
export { LXPTestSuite, createTestTriggerContext, createTestUnifiedResults };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}
