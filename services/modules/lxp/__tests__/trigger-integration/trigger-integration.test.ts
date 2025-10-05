/**
 * LXP Trigger Integration Tests
 * 
 * Comprehensive tests for trigger engine integration with LXP module:
 * - LXP trigger processing and routing
 * - Output trigger generation
 * - Module integration and communication
 * - Trigger engine workflow coordination
 * - Error handling and recovery
 * - Performance and scalability
 * 
 * These tests verify end-to-end trigger functionality,
 * data flow between trigger engine and LXP module,
 * and integration with other Mizan modules.
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { LXPModule } from '../../lxp-module.js';
import { processTrigger, createDefaultTriggers } from '../../../results/trigger-engine.js';
import { UnifiedResults } from '../../../results/unified-results.js';

// Mock the LXP module
jest.mock('../../lxp-module.js');

describe('LXP Trigger Integration Tests', () => {
  let mockLXPModule: jest.Mocked<LXPModule>;
  let mockUnifiedResults: UnifiedResults;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock LXP module
    mockLXPModule = {
      initialize: jest.fn().mockResolvedValue({ success: true }),
      handleTrigger: jest.fn().mockResolvedValue({
        success: true,
        action: 'learning_path_created',
        confidence: 0.9,
        data: { learningPathId: 'lp_001' },
        nextTriggers: []
      }),
      checkHealth: jest.fn().mockResolvedValue({ healthy: true }),
      getStatus: jest.fn().mockReturnValue({ status: 'active' })
    } as any;

    // Mock the LXP module instance
    (LXPModule as jest.MockedClass<typeof LXPModule>).mockImplementation(() => mockLXPModule);

    // Create mock unified results
    mockUnifiedResults = {
      id: 'results_001',
      tenantId: 'tenant_001',
      timestamp: new Date().toISOString(),
      analysisResults: {
        culture: {
          id: 'culture_001',
          type: 'culture_analysis',
          confidence: 0.85,
          data: {
            values: ['collaboration', 'innovation'],
            alignment: 0.8,
            gaps: ['communication']
          }
        },
        skills: {
          id: 'skills_001',
          type: 'skills_analysis',
          confidence: 0.9,
          data: {
            currentSkills: ['javascript', 'typescript'],
            skillGaps: ['leadership', 'communication'],
            recommendations: ['leadership_training']
          }
        },
        structure: {
          id: 'structure_001',
          type: 'structure_analysis',
          confidence: 0.75,
          data: {
            layers: 3,
            positions: 15,
            efficiency: 0.7
          }
        }
      },
      overallHealth: 0.8,
      recommendations: ['improve_communication', 'add_leadership_training']
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // LXP TRIGGER PROCESSING TESTS
  // ============================================================================

  describe('LXP Trigger Processing', () => {
    test('should process skill gaps critical trigger through LXP module', async () => {
      const triggerConfig = {
        id: 'trigger_001',
        type: 'skill_gaps_critical',
        tenantId: 'tenant_001',
        conditions: {
          skillGapThreshold: 0.7,
          urgencyLevel: 'high'
        },
        actions: {
          moduleType: 'lxp',
          actionType: 'create_learning_path'
        }
      };

      const result = await processTrigger(triggerConfig, mockUnifiedResults);

      // Verify trigger was processed
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.action).toBe('learning_path_created');
      expect(result.data.learningPathId).toBe('lp_001');

      // Verify LXP module was called
      expect(mockLXPModule.handleTrigger).toHaveBeenCalledWith(
        'skill_gaps_critical',
        triggerConfig,
        mockUnifiedResults
      );
    });

    test('should process culture learning needed trigger through LXP module', async () => {
      const triggerConfig = {
        id: 'trigger_002',
        type: 'culture_learning_needed',
        tenantId: 'tenant_001',
        conditions: {
          cultureGapThreshold: 0.6,
          urgencyLevel: 'medium'
        },
        actions: {
          moduleType: 'lxp',
          actionType: 'create_culture_learning_path'
        }
      };

      // Mock culture learning response
      mockLXPModule.handleTrigger.mockResolvedValueOnce({
        success: true,
        action: 'culture_learning_path_created',
        confidence: 0.85,
        data: { 
          learningPathId: 'lp_culture_001',
          focus: 'culture_alignment',
          courses: ['culture_course_001']
        },
        nextTriggers: []
      });

      const result = await processTrigger(triggerConfig, mockUnifiedResults);

      expect(result.success).toBe(true);
      expect(result.action).toBe('culture_learning_path_created');
      expect(result.data.focus).toBe('culture_alignment');
      expect(mockLXPModule.handleTrigger).toHaveBeenCalledWith(
        'culture_learning_needed',
        triggerConfig,
        mockUnifiedResults
      );
    });

    test('should process employee skill gap trigger through LXP module', async () => {
      const triggerConfig = {
        id: 'trigger_003',
        type: 'employee_skill_gap',
        tenantId: 'tenant_001',
        conditions: {
          employeeId: 'emp_001',
          skillGapThreshold: 0.5
        },
        actions: {
          moduleType: 'lxp',
          actionType: 'create_personalized_learning_path'
        }
      };

      // Mock employee skill gap response
      mockLXPModule.handleTrigger.mockResolvedValueOnce({
        success: true,
        action: 'personalized_learning_path_created',
        confidence: 0.9,
        data: { 
          learningPathId: 'lp_personal_001',
          employeeId: 'emp_001',
          skillGaps: ['leadership', 'communication']
        },
        nextTriggers: []
      });

      const result = await processTrigger(triggerConfig, mockUnifiedResults);

      expect(result.success).toBe(true);
      expect(result.action).toBe('personalized_learning_path_created');
      expect(result.data.employeeId).toBe('emp_001');
      expect(mockLXPModule.handleTrigger).toHaveBeenCalledWith(
        'employee_skill_gap',
        triggerConfig,
        mockUnifiedResults
      );
    });

    test('should process performance improvement trigger through LXP module', async () => {
      const triggerConfig = {
        id: 'trigger_004',
        type: 'performance_improvement_lxp',
        tenantId: 'tenant_001',
        conditions: {
          performanceThreshold: 0.8,
          improvementAreas: ['time_management', 'communication']
        },
        actions: {
          moduleType: 'lxp',
          actionType: 'create_performance_learning_path'
        }
      };

      // Mock performance improvement response
      mockLXPModule.handleTrigger.mockResolvedValueOnce({
        success: true,
        action: 'performance_learning_path_created',
        confidence: 0.8,
        data: { 
          learningPathId: 'lp_performance_001',
          focus: 'performance_improvement',
          improvementAreas: ['time_management', 'communication']
        },
        nextTriggers: []
      });

      const result = await processTrigger(triggerConfig, mockUnifiedResults);

      expect(result.success).toBe(true);
      expect(result.action).toBe('performance_learning_path_created');
      expect(result.data.focus).toBe('performance_improvement');
      expect(mockLXPModule.handleTrigger).toHaveBeenCalledWith(
        'performance_improvement_lxp',
        triggerConfig,
        mockUnifiedResults
      );
    });

    test('should process compliance training due trigger through LXP module', async () => {
      const triggerConfig = {
        id: 'trigger_005',
        type: 'compliance_training_due',
        tenantId: 'tenant_001',
        conditions: {
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          trainingType: 'mandatory'
        },
        actions: {
          moduleType: 'lxp',
          actionType: 'create_compliance_training'
        }
      };

      // Mock compliance training response
      mockLXPModule.handleTrigger.mockResolvedValueOnce({
        success: true,
        action: 'compliance_training_created',
        confidence: 0.95,
        data: { 
          learningPathId: 'lp_compliance_001',
          type: 'compliance',
          dueDate: triggerConfig.conditions.dueDate
        },
        nextTriggers: []
      });

      const result = await processTrigger(triggerConfig, mockUnifiedResults);

      expect(result.success).toBe(true);
      expect(result.action).toBe('compliance_training_created');
      expect(result.data.type).toBe('compliance');
      expect(mockLXPModule.handleTrigger).toHaveBeenCalledWith(
        'compliance_training_due',
        triggerConfig,
        mockUnifiedResults
      );
    });
  });

  // ============================================================================
  // OUTPUT TRIGGER GENERATION TESTS
  // ============================================================================

  describe('Output Trigger Generation', () => {
    test('should generate performance assessment trigger after training completion', async () => {
      const triggerConfig = {
        id: 'trigger_006',
        type: 'lxp_training_completion',
        tenantId: 'tenant_001',
        conditions: {
          courseId: 'course_001',
          employeeId: 'emp_001',
          completionScore: 0.85
        },
        actions: {
          moduleType: 'lxp',
          actionType: 'process_completion'
        }
      };

      // Mock training completion with output triggers
      mockLXPModule.handleTrigger.mockResolvedValueOnce({
        success: true,
        action: 'training_completed',
        confidence: 0.9,
        data: { 
          courseId: 'course_001',
          employeeId: 'emp_001',
          completionScore: 0.85
        },
        nextTriggers: ['performance_assessment_trigger']
      });

      const result = await processTrigger(triggerConfig, mockUnifiedResults);

      expect(result.success).toBe(true);
      expect(result.action).toBe('training_completed');
      expect(result.nextTriggers).toContain('performance_assessment_trigger');
    });

    test('should generate skills analysis update trigger after skill validation', async () => {
      const triggerConfig = {
        id: 'trigger_007',
        type: 'skill_validation_complete',
        tenantId: 'tenant_001',
        conditions: {
          employeeId: 'emp_001',
          validatedSkills: ['leadership', 'communication'],
          validationScore: 0.9
        },
        actions: {
          moduleType: 'lxp',
          actionType: 'validate_skills'
        }
      };

      // Mock skill validation with output triggers
      mockLXPModule.handleTrigger.mockResolvedValueOnce({
        success: true,
        action: 'skills_validated',
        confidence: 0.95,
        data: { 
          employeeId: 'emp_001',
          validatedSkills: ['leadership', 'communication'],
          validationScore: 0.9
        },
        nextTriggers: ['skills_analysis_update']
      });

      const result = await processTrigger(triggerConfig, mockUnifiedResults);

      expect(result.success).toBe(true);
      expect(result.action).toBe('skills_validated');
      expect(result.nextTriggers).toContain('skills_analysis_update');
    });

    test('should generate culture analysis update trigger after culture learning', async () => {
      const triggerConfig = {
        id: 'trigger_008',
        type: 'culture_learning_complete',
        tenantId: 'tenant_001',
        conditions: {
          employeeId: 'emp_001',
          cultureValues: ['collaboration', 'innovation'],
          alignmentScore: 0.85
        },
        actions: {
          moduleType: 'lxp',
          actionType: 'complete_culture_learning'
        }
      };

      // Mock culture learning completion with output triggers
      mockLXPModule.handleTrigger.mockResolvedValueOnce({
        success: true,
        action: 'culture_learning_completed',
        confidence: 0.9,
        data: { 
          employeeId: 'emp_001',
          cultureValues: ['collaboration', 'innovation'],
          alignmentScore: 0.85
        },
        nextTriggers: ['culture_analysis_update']
      });

      const result = await processTrigger(triggerConfig, mockUnifiedResults);

      expect(result.success).toBe(true);
      expect(result.action).toBe('culture_learning_completed');
      expect(result.nextTriggers).toContain('culture_analysis_update');
    });
  });

  // ============================================================================
  // MODULE INTEGRATION TESTS
  // ============================================================================

  describe('Module Integration', () => {
    test('should integrate with Skills Analysis module', async () => {
      const triggerConfig = {
        id: 'trigger_009',
        type: 'skills_analysis_update',
        tenantId: 'tenant_001',
        conditions: {
          employeeId: 'emp_001',
          updatedSkills: ['leadership', 'communication'],
          source: 'lxp_completion'
        },
        actions: {
          moduleType: 'skills_analysis',
          actionType: 'update_employee_skills'
        }
      };

      // Mock skills analysis integration
      mockLXPModule.handleTrigger.mockResolvedValueOnce({
        success: true,
        action: 'skills_updated',
        confidence: 0.9,
        data: { 
          employeeId: 'emp_001',
          updatedSkills: ['leadership', 'communication'],
          integrationStatus: 'success'
        },
        nextTriggers: []
      });

      const result = await processTrigger(triggerConfig, mockUnifiedResults);

      expect(result.success).toBe(true);
      expect(result.action).toBe('skills_updated');
      expect(result.data.integrationStatus).toBe('success');
    });

    test('should integrate with Performance Management module', async () => {
      const triggerConfig = {
        id: 'trigger_010',
        type: 'performance_assessment_trigger',
        tenantId: 'tenant_001',
        conditions: {
          employeeId: 'emp_001',
          courseId: 'course_001',
          completionScore: 0.85
        },
        actions: {
          moduleType: 'performance_management',
          actionType: 'trigger_assessment'
        }
      };

      // Mock performance management integration
      mockLXPModule.handleTrigger.mockResolvedValueOnce({
        success: true,
        action: 'performance_assessment_triggered',
        confidence: 0.85,
        data: { 
          employeeId: 'emp_001',
          assessmentId: 'assessment_001',
          integrationStatus: 'success'
        },
        nextTriggers: []
      });

      const result = await processTrigger(triggerConfig, mockUnifiedResults);

      expect(result.success).toBe(true);
      expect(result.action).toBe('performance_assessment_triggered');
      expect(result.data.assessmentId).toBe('assessment_001');
    });

    test('should integrate with Culture Analysis module', async () => {
      const triggerConfig = {
        id: 'trigger_011',
        type: 'culture_analysis_update',
        tenantId: 'tenant_001',
        conditions: {
          employeeId: 'emp_001',
          cultureValues: ['collaboration', 'innovation'],
          alignmentScore: 0.85
        },
        actions: {
          moduleType: 'culture_analysis',
          actionType: 'update_culture_alignment'
        }
      };

      // Mock culture analysis integration
      mockLXPModule.handleTrigger.mockResolvedValueOnce({
        success: true,
        action: 'culture_alignment_updated',
        confidence: 0.9,
        data: { 
          employeeId: 'emp_001',
          alignmentScore: 0.85,
          integrationStatus: 'success'
        },
        nextTriggers: []
      });

      const result = await processTrigger(triggerConfig, mockUnifiedResults);

      expect(result.success).toBe(true);
      expect(result.action).toBe('culture_alignment_updated');
      expect(result.data.alignmentScore).toBe(0.85);
    });
  });

  // ============================================================================
  // TRIGGER ENGINE WORKFLOW TESTS
  // ============================================================================

  describe('Trigger Engine Workflow', () => {
    test('should handle complete learning journey workflow', async () => {
      // Step 1: Skill gap detected
      const skillGapTrigger = {
        id: 'trigger_012',
        type: 'skill_gaps_critical',
        tenantId: 'tenant_001',
        conditions: { skillGapThreshold: 0.7 },
        actions: { moduleType: 'lxp', actionType: 'create_learning_path' }
      };

      mockLXPModule.handleTrigger.mockResolvedValueOnce({
        success: true,
        action: 'learning_path_created',
        confidence: 0.9,
        data: { learningPathId: 'lp_001' },
        nextTriggers: []
      });

      const step1Result = await processTrigger(skillGapTrigger, mockUnifiedResults);
      expect(step1Result.success).toBe(true);
      expect(step1Result.action).toBe('learning_path_created');

      // Step 2: Training completion
      const completionTrigger = {
        id: 'trigger_013',
        type: 'lxp_training_completion',
        tenantId: 'tenant_001',
        conditions: { courseId: 'course_001', employeeId: 'emp_001' },
        actions: { moduleType: 'lxp', actionType: 'process_completion' }
      };

      mockLXPModule.handleTrigger.mockResolvedValueOnce({
        success: true,
        action: 'training_completed',
        confidence: 0.9,
        data: { courseId: 'course_001', employeeId: 'emp_001' },
        nextTriggers: ['performance_assessment_trigger']
      });

      const step2Result = await processTrigger(completionTrigger, mockUnifiedResults);
      expect(step2Result.success).toBe(true);
      expect(step2Result.nextTriggers).toContain('performance_assessment_trigger');

      // Step 3: Performance assessment
      const assessmentTrigger = {
        id: 'trigger_014',
        type: 'performance_assessment_trigger',
        tenantId: 'tenant_001',
        conditions: { employeeId: 'emp_001', courseId: 'course_001' },
        actions: { moduleType: 'performance_management', actionType: 'trigger_assessment' }
      };

      mockLXPModule.handleTrigger.mockResolvedValueOnce({
        success: true,
        action: 'performance_assessment_triggered',
        confidence: 0.85,
        data: { assessmentId: 'assessment_001' },
        nextTriggers: []
      });

      const step3Result = await processTrigger(assessmentTrigger, mockUnifiedResults);
      expect(step3Result.success).toBe(true);
      expect(step3Result.action).toBe('performance_assessment_triggered');
    });

    test('should handle multiple concurrent triggers', async () => {
      const triggers = [
        {
          id: 'trigger_015',
          type: 'skill_gaps_critical',
          tenantId: 'tenant_001',
          conditions: { skillGapThreshold: 0.7 },
          actions: { moduleType: 'lxp', actionType: 'create_learning_path' }
        },
        {
          id: 'trigger_016',
          type: 'culture_learning_needed',
          tenantId: 'tenant_001',
          conditions: { cultureGapThreshold: 0.6 },
          actions: { moduleType: 'lxp', actionType: 'create_culture_learning_path' }
        },
        {
          id: 'trigger_017',
          type: 'compliance_training_due',
          tenantId: 'tenant_001',
          conditions: { dueDate: new Date().toISOString() },
          actions: { moduleType: 'lxp', actionType: 'create_compliance_training' }
        }
      ];

      // Mock responses for each trigger
      mockLXPModule.handleTrigger
        .mockResolvedValueOnce({
          success: true,
          action: 'learning_path_created',
          confidence: 0.9,
          data: { learningPathId: 'lp_001' },
          nextTriggers: []
        })
        .mockResolvedValueOnce({
          success: true,
          action: 'culture_learning_path_created',
          confidence: 0.85,
          data: { learningPathId: 'lp_culture_001' },
          nextTriggers: []
        })
        .mockResolvedValueOnce({
          success: true,
          action: 'compliance_training_created',
          confidence: 0.95,
          data: { learningPathId: 'lp_compliance_001' },
          nextTriggers: []
        });

      const results = await Promise.all(
        triggers.map(trigger => processTrigger(trigger, mockUnifiedResults))
      );

      // Verify all triggers were processed successfully
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      expect(results[0].action).toBe('learning_path_created');
      expect(results[1].action).toBe('culture_learning_path_created');
      expect(results[2].action).toBe('compliance_training_created');
    });
  });

  // ============================================================================
  // ERROR HANDLING AND RECOVERY TESTS
  // ============================================================================

  describe('Error Handling and Recovery', () => {
    test('should handle LXP module initialization failure', async () => {
      // Mock initialization failure
      mockLXPModule.initialize.mockRejectedValueOnce(new Error('Initialization failed'));

      const triggerConfig = {
        id: 'trigger_018',
        type: 'skill_gaps_critical',
        tenantId: 'tenant_001',
        conditions: { skillGapThreshold: 0.7 },
        actions: { moduleType: 'lxp', actionType: 'create_learning_path' }
      };

      const result = await processTrigger(triggerConfig, mockUnifiedResults);

      // Should handle gracefully with fallback
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Initialization failed');
    });

    test('should handle LXP module processing failure', async () => {
      // Mock processing failure
      mockLXPModule.handleTrigger.mockRejectedValueOnce(new Error('Processing failed'));

      const triggerConfig = {
        id: 'trigger_019',
        type: 'skill_gaps_critical',
        tenantId: 'tenant_001',
        conditions: { skillGapThreshold: 0.7 },
        actions: { moduleType: 'lxp', actionType: 'create_learning_path' }
      };

      const result = await processTrigger(triggerConfig, mockUnifiedResults);

      // Should handle gracefully with fallback
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Processing failed');
    });

    test('should handle invalid trigger configuration', async () => {
      const invalidTriggerConfig = {
        id: 'trigger_020',
        type: 'invalid_trigger_type',
        tenantId: 'tenant_001',
        conditions: {},
        actions: {}
      };

      const result = await processTrigger(invalidTriggerConfig, mockUnifiedResults);

      // Should handle gracefully
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle missing unified results', async () => {
      const triggerConfig = {
        id: 'trigger_021',
        type: 'skill_gaps_critical',
        tenantId: 'tenant_001',
        conditions: { skillGapThreshold: 0.7 },
        actions: { moduleType: 'lxp', actionType: 'create_learning_path' }
      };

      const result = await processTrigger(triggerConfig, null as any);

      // Should handle gracefully
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should recover from temporary LXP module unavailability', async () => {
      // Mock temporary unavailability
      mockLXPModule.checkHealth.mockResolvedValueOnce({ healthy: false });
      mockLXPModule.initialize.mockResolvedValueOnce({ success: true });

      const triggerConfig = {
        id: 'trigger_022',
        type: 'skill_gaps_critical',
        tenantId: 'tenant_001',
        conditions: { skillGapThreshold: 0.7 },
        actions: { moduleType: 'lxp', actionType: 'create_learning_path' }
      };

      // Mock successful processing after recovery
      mockLXPModule.handleTrigger.mockResolvedValueOnce({
        success: true,
        action: 'learning_path_created',
        confidence: 0.9,
        data: { learningPathId: 'lp_001' },
        nextTriggers: []
      });

      const result = await processTrigger(triggerConfig, mockUnifiedResults);

      // Should recover and process successfully
      expect(result.success).toBe(true);
      expect(result.action).toBe('learning_path_created');
      expect(mockLXPModule.initialize).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // PERFORMANCE AND SCALABILITY TESTS
  // ============================================================================

  describe('Performance and Scalability', () => {
    test('should handle high volume of concurrent triggers', async () => {
      const triggerCount = 50;
      const triggers = Array.from({ length: triggerCount }, (_, i) => ({
        id: `trigger_${i + 1}`,
        type: 'skill_gaps_critical',
        tenantId: 'tenant_001',
        conditions: { skillGapThreshold: 0.7 },
        actions: { moduleType: 'lxp', actionType: 'create_learning_path' }
      }));

      // Mock responses for all triggers
      triggers.forEach(() => {
        mockLXPModule.handleTrigger.mockResolvedValueOnce({
          success: true,
          action: 'learning_path_created',
          confidence: 0.9,
          data: { learningPathId: 'lp_001' },
          nextTriggers: []
        });
      });

      const startTime = Date.now();
      const results = await Promise.all(
        triggers.map(trigger => processTrigger(trigger, mockUnifiedResults))
      );
      const endTime = Date.now();

      // Verify all triggers were processed successfully
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Verify performance (should complete within reasonable time)
      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds
    });

    test('should handle large unified results data', async () => {
      // Create large unified results
      const largeUnifiedResults = {
        ...mockUnifiedResults,
        analysisResults: {
          ...mockUnifiedResults.analysisResults,
          // Add large amounts of data
          largeDataset: {
            id: 'large_001',
            type: 'large_analysis',
            confidence: 0.8,
            data: Array.from({ length: 1000 }, (_, i) => ({
              id: `item_${i}`,
              value: `value_${i}`,
              metadata: { index: i, timestamp: new Date().toISOString() }
            }))
          }
        }
      };

      const triggerConfig = {
        id: 'trigger_023',
        type: 'skill_gaps_critical',
        tenantId: 'tenant_001',
        conditions: { skillGapThreshold: 0.7 },
        actions: { moduleType: 'lxp', actionType: 'create_learning_path' }
      };

      mockLXPModule.handleTrigger.mockResolvedValueOnce({
        success: true,
        action: 'learning_path_created',
        confidence: 0.9,
        data: { learningPathId: 'lp_001' },
        nextTriggers: []
      });

      const startTime = Date.now();
      const result = await processTrigger(triggerConfig, largeUnifiedResults);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
    });

    test('should maintain performance under load', async () => {
      const loadTestTriggers = Array.from({ length: 100 }, (_, i) => ({
        id: `load_trigger_${i + 1}`,
        type: 'skill_gaps_critical',
        tenantId: 'tenant_001',
        conditions: { skillGapThreshold: 0.7 },
        actions: { moduleType: 'lxp', actionType: 'create_learning_path' }
      }));

      // Mock responses for all triggers
      loadTestTriggers.forEach(() => {
        mockLXPModule.handleTrigger.mockResolvedValueOnce({
          success: true,
          action: 'learning_path_created',
          confidence: 0.9,
          data: { learningPathId: 'lp_001' },
          nextTriggers: []
        });
      });

      const startTime = Date.now();
      const results = await Promise.all(
        loadTestTriggers.map(trigger => processTrigger(trigger, mockUnifiedResults))
      );
      const endTime = Date.now();

      // Verify all triggers were processed successfully
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Verify performance under load
      const averageTime = (endTime - startTime) / loadTestTriggers.length;
      expect(averageTime).toBeLessThan(100); // 100ms per trigger
    });
  });

  // ============================================================================
  // TRIGGER CONFIGURATION TESTS
  // ============================================================================

  describe('Trigger Configuration', () => {
    test('should validate trigger configuration structure', () => {
      const defaultTriggers = createDefaultTriggers();
      
      expect(defaultTriggers).toBeInstanceOf(Array);
      expect(defaultTriggers.length).toBeGreaterThan(0);
      
      // Verify each trigger has required structure
      defaultTriggers.forEach(trigger => {
        expect(trigger).toHaveProperty('id');
        expect(trigger).toHaveProperty('type');
        expect(trigger).toHaveProperty('tenantId');
        expect(trigger).toHaveProperty('conditions');
        expect(trigger).toHaveProperty('actions');
      });
    });

    test('should include LXP-related triggers in default configuration', () => {
      const defaultTriggers = createDefaultTriggers();
      
      const lxpTriggerTypes = [
        'skill_gaps_critical',
        'culture_learning_needed',
        'employee_skill_gap',
        'performance_improvement_lxp',
        'compliance_training_due',
        'safety_training_expired',
        'certification_expiring',
        'legal_requirement_change',
        'proactive_training'
      ];
      
      lxpTriggerTypes.forEach(triggerType => {
        const trigger = defaultTriggers.find(t => t.type === triggerType);
        expect(trigger).toBeDefined();
        expect(trigger.actions.moduleType).toBe('lxp');
      });
    });

    test('should validate trigger conditions and actions', () => {
      const defaultTriggers = createDefaultTriggers();
      
      defaultTriggers.forEach(trigger => {
        // Validate conditions
        expect(trigger.conditions).toBeDefined();
        expect(typeof trigger.conditions).toBe('object');
        
        // Validate actions
        expect(trigger.actions).toBeDefined();
        expect(trigger.actions.moduleType).toBeDefined();
        expect(trigger.actions.actionType).toBeDefined();
      });
    });
  });
});
