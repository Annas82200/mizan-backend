import { PerformanceManagementModule } from '../../performance-module';
import { PerformanceTriggerHandlers } from '../../core/trigger-handlers';

describe('Performance Management Trigger Integration Tests', () => {
  let performanceModule: PerformanceManagementModule;
  let triggerHandlers: PerformanceTriggerHandlers;

  beforeEach(() => {
    performanceModule = new PerformanceManagementModule();
    triggerHandlers = new PerformanceTriggerHandlers(performanceModule);
  });

  // ============================================================================
  // MODULE TRIGGER PROCESSING TESTS
  // ============================================================================
  
  describe('Trigger Processing', () => {
    it('should initialize module before processing triggers', async () => {
      await expect(performanceModule.initialize()).resolves.not.toThrow();
    });

    it('should handle training completion trigger', async () => {
      const trigger = {
        triggerType: 'lxp_training_completion',
        tenantId: 'tenant_123',
        employeeId: 'emp_456',
        data: {
          courseId: 'course_789',
          courseName: 'Leadership Fundamentals',
          completionDate: '2024-09-30',
          skillsAcquired: ['Leadership', 'Communication'],
          performanceImprovement: { leadership: 0.5 }
        },
        metadata: {
          triggeredBy: 'lxp_module',
          timestamp: new Date().toISOString(),
          priority: 'medium' as const,
          context: {}
        }
      };

      const result = await triggerHandlers.processTrigger(trigger);

      expect(result.success).toBe(true);
      expect(result.workflow).toBe('training_completion_assessment');
      expect(result.metadata.workflowSteps).toContain('assess_skill_improvement');
    });

    it('should handle onboarding completion trigger', async () => {
      const trigger = {
        triggerType: 'onboarding_completion',
        tenantId: 'tenant_123',
        employeeId: 'emp_456',
        data: {
          onboardingId: 'onboarding_789',
          completionDate: '2024-09-30'
        },
        metadata: {
          triggeredBy: 'onboarding_module',
          timestamp: new Date().toISOString(),
          priority: 'high' as const,
          context: {}
        }
      };

      const result = await triggerHandlers.processTrigger(trigger);

      expect(result.success).toBe(true);
      expect(result.workflow).toBe('onboarding_baseline_setup');
      expect(result.outputTriggers).toBeDefined();
      const goalSettingTrigger = result.outputTriggers.find(t => t.triggerType === 'goal_setting');
      expect(goalSettingTrigger).toBeDefined();
    });

    it('should handle annual review trigger', async () => {
      const trigger = {
        triggerType: 'annual_performance_review_due',
        tenantId: 'tenant_123',
        employeeId: 'emp_456',
        data: {
          reviewYear: '2024',
          managerId: 'mgr_789'
        },
        metadata: {
          triggeredBy: 'system',
          timestamp: new Date().toISOString(),
          priority: 'high' as const,
          context: {}
        }
      };

      const result = await triggerHandlers.processTrigger(trigger);

      expect(result.success).toBe(true);
      expect(result.workflow).toBe('annual_performance_review');
      expect(result.metadata.agentsUsed).toContain('PerformanceAnalyzerAgent');
      expect(result.metadata.agentsUsed).toContain('PerformanceCoachAgent');
    });

    it('should handle quarterly check-in trigger', async () => {
      const trigger = {
        triggerType: 'quarterly_check_in_due',
        tenantId: 'tenant_123',
        employeeId: 'emp_456',
        data: {
          quarter: 'Q3',
          year: '2024'
        },
        metadata: {
          triggeredBy: 'system',
          timestamp: new Date().toISOString(),
          priority: 'medium' as const,
          context: {}
        }
      };

      const result = await triggerHandlers.processTrigger(trigger);

      expect(result.success).toBe(true);
      expect(result.workflow).toBe('quarterly_check_in');
    });

    it('should handle probation review trigger', async () => {
      const trigger = {
        triggerType: 'probation_period_ending',
        tenantId: 'tenant_123',
        employeeId: 'emp_456',
        data: {
          probationStartDate: '2024-07-01',
          probationEndDate: '2024-09-30'
        },
        metadata: {
          triggeredBy: 'system',
          timestamp: new Date().toISOString(),
          priority: 'critical' as const,
          context: {}
        }
      };

      const result = await triggerHandlers.processTrigger(trigger);

      expect(result.success).toBe(true);
      expect(result.workflow).toBe('probation_period_review');
    });

    it('should handle goal setting trigger', async () => {
      const trigger = {
        triggerType: 'goal_setting_required',
        tenantId: 'tenant_123',
        employeeId: 'emp_456',
        data: {
          period: '2024',
          organizationalGoals: ['Revenue growth'],
          departmentGoals: ['Team expansion']
        },
        metadata: {
          triggeredBy: 'system',
          timestamp: new Date().toISOString(),
          priority: 'high' as const,
          context: {}
        }
      };

      const result = await triggerHandlers.processTrigger(trigger);

      expect(result.success).toBe(true);
      expect(result.workflow).toBe('goal_setting');
    });

    it('should handle performance improvement trigger', async () => {
      const trigger = {
        triggerType: 'performance_improvement_needed',
        tenantId: 'tenant_123',
        employeeId: 'emp_456',
        data: {
          improvementAreas: ['Communication', 'Time management'],
          urgencyLevel: 'high',
          targetDate: '2024-12-31'
        },
        metadata: {
          triggeredBy: 'performance_review',
          timestamp: new Date().toISOString(),
          priority: 'high' as const,
          context: {}
        }
      };

      const result = await triggerHandlers.processTrigger(trigger);

      expect(result.success).toBe(true);
      expect(result.workflow).toBe('performance_improvement');
      expect(result.outputTriggers.length).toBeGreaterThan(0);
    });

    it('should handle coaching request trigger', async () => {
      const trigger = {
        triggerType: 'coaching_requested',
        tenantId: 'tenant_123',
        employeeId: 'emp_456',
        data: {
          coachingType: 'career_growth',
          focusAreas: ['Leadership development']
        },
        metadata: {
          triggeredBy: 'employee',
          timestamp: new Date().toISOString(),
          priority: 'medium' as const,
          context: {}
        }
      };

      const result = await triggerHandlers.processTrigger(trigger);

      expect(result.success).toBe(true);
      expect(result.workflow).toBe('coaching_program');
    });
  });

  // ============================================================================
  // OUTPUT TRIGGER GENERATION TESTS
  // ============================================================================
  
  describe('Output Trigger Generation', () => {
    it('should generate reward trigger for high performance', async () => {
      const trigger = {
        triggerType: 'annual_performance_review_due',
        tenantId: 'tenant_123',
        employeeId: 'emp_456',
        data: {
          performanceScore: 4.5,
          performanceLevel: 'exceeds_expectations'
        },
        metadata: {
          triggeredBy: 'system',
          timestamp: new Date().toISOString(),
          priority: 'high' as const,
          context: {}
        }
      };

      await performanceModule.initialize();
      const result = await performanceModule.handleTrigger(trigger);

      const rewardTrigger = result.outputTriggers.find(t => t.targetModule === 'reward_module');
      expect(rewardTrigger).toBeDefined();
      expect(rewardTrigger.priority).toBe('high');
    });

    it('should generate LXP trigger for development needs', async () => {
      const trigger = {
        triggerType: 'annual_performance_review_due',
        tenantId: 'tenant_123',
        employeeId: 'emp_456',
        data: {
          developmentAreas: ['Technical skills', 'Communication']
        },
        metadata: {
          triggeredBy: 'system',
          timestamp: new Date().toISOString(),
          priority: 'high' as const,
          context: {}
        }
      };

      await performanceModule.initialize();
      const result = await performanceModule.handleTrigger(trigger);

      const lxpTrigger = result.outputTriggers.find(t => t.targetModule === 'lxp_module');
      expect(lxpTrigger).toBeDefined();
    });

    it('should generate succession planning trigger for exceptional performance', async () => {
      const trigger = {
        triggerType: 'annual_performance_review_due',
        tenantId: 'tenant_123',
        employeeId: 'emp_456',
        data: {
          performanceScore: 4.8,
          performanceLevel: 'significantly_exceeds'
        },
        metadata: {
          triggeredBy: 'system',
          timestamp: new Date().toISOString(),
          priority: 'high' as const,
          context: {}
        }
      };

      await performanceModule.initialize();
      const result = await performanceModule.handleTrigger(trigger);

      const successionTrigger = result.outputTriggers.find(t => t.targetModule === 'succession_planning_module');
      expect(successionTrigger).toBeDefined();
    });
  });

  // ============================================================================
  // MODULE INTEGRATION TESTS
  // ============================================================================
  
  describe('Module Integration', () => {
    it('should check module health', async () => {
      const health = await performanceModule.checkHealth();

      expect(health.healthy).toBeDefined();
      expect(health.details).toBeDefined();
    });

    it('should get module status', () => {
      const status = performanceModule.getStatus();

      expect(status.moduleId).toBe('performance_management');
      expect(status.version).toBeDefined();
      expect(status.triggersSupported).toBeDefined();
      expect(status.triggersSupported.length).toBe(8);
    });

    it('should coordinate all AI agents', async () => {
      await performanceModule.initialize();
      
      const status = performanceModule.getStatus();
      expect(status.agentsLoaded.goalSetter).toBe(true);
      expect(status.agentsLoaded.analyzer).toBe(true);
      expect(status.agentsLoaded.coach).toBe(true);
    });
  });

  // ============================================================================
  // TRIGGER ENGINE WORKFLOW TESTS
  // ============================================================================
  
  describe('Trigger Engine Workflow', () => {
    it('should route trigger to correct workflow', async () => {
      const triggers = [
        { type: 'lxp_training_completion', expectedWorkflow: 'training_completion_assessment' },
        { type: 'onboarding_completion', expectedWorkflow: 'onboarding_baseline_setup' },
        { type: 'annual_performance_review_due', expectedWorkflow: 'annual_performance_review' },
        { type: 'goal_setting_required', expectedWorkflow: 'goal_setting' },
        { type: 'coaching_requested', expectedWorkflow: 'coaching_program' }
      ];

      for (const triggerConfig of triggers) {
        const trigger = {
          triggerType: triggerConfig.type,
          tenantId: 'tenant_123',
          employeeId: 'emp_456',
          data: {},
          metadata: {
            triggeredBy: 'system',
            timestamp: new Date().toISOString(),
            priority: 'medium' as const,
            context: {}
          }
        };

        const result = await triggerHandlers.processTrigger(trigger);
        expect(result.workflow).toBe(triggerConfig.expectedWorkflow);
      }
    });

    it('should track execution time for triggers', async () => {
      const trigger = {
        triggerType: 'goal_setting_required',
        tenantId: 'tenant_123',
        employeeId: 'emp_456',
        data: {},
        metadata: {
          triggeredBy: 'system',
          timestamp: new Date().toISOString(),
          priority: 'medium' as const,
          context: {}
        }
      };

      const result = await triggerHandlers.processTrigger(trigger);

      expect(result.metadata.executionTime).toBeGreaterThan(0);
    });

    it('should log agents used in trigger processing', async () => {
      const trigger = {
        triggerType: 'annual_performance_review_due',
        tenantId: 'tenant_123',
        employeeId: 'emp_456',
        data: {},
        metadata: {
          triggeredBy: 'system',
          timestamp: new Date().toISOString(),
          priority: 'high' as const,
          context: {}
        }
      };

      const result = await triggerHandlers.processTrigger(trigger);

      expect(result.metadata.agentsUsed).toBeDefined();
      expect(result.metadata.agentsUsed.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // PROBATION OUTCOME TESTS
  // ============================================================================
  
  describe('Probation Outcome Logic', () => {
    it('should pass probation with distinction for exceptional performance', async () => {
      const trigger = {
        triggerType: 'probation_period_ending',
        tenantId: 'tenant_123',
        employeeId: 'emp_456',
        data: {
          performanceLevel: 'significantly_exceeds'
        },
        metadata: {
          triggeredBy: 'system',
          timestamp: new Date().toISOString(),
          priority: 'critical' as const,
          context: {}
        }
      };

      await performanceModule.initialize();
      const result = await performanceModule.handleTrigger(trigger);

      expect(result.results.performanceLevel).toBeDefined();
    });
  });

  // ============================================================================
  // ERROR HANDLING & RECOVERY TESTS
  // ============================================================================
  
  describe('Error Handling', () => {
    it('should handle unknown trigger type', async () => {
      const trigger = {
        triggerType: 'unknown_trigger_type',
        tenantId: 'tenant_123',
        employeeId: 'emp_456',
        data: {},
        metadata: {
          triggeredBy: 'system',
          timestamp: new Date().toISOString(),
          priority: 'low' as const,
          context: {}
        }
      };

      const result = await triggerHandlers.processTrigger(trigger);

      expect(result.success).toBe(true);
      expect(result.workflow).toBe('default_performance_assessment');
    });

    it('should handle missing employee ID gracefully', async () => {
      const trigger = {
        triggerType: 'goal_setting_required',
        tenantId: 'tenant_123',
        employeeId: '',
        data: {},
        metadata: {
          triggeredBy: 'system',
          timestamp: new Date().toISOString(),
          priority: 'medium' as const,
          context: {}
        }
      };

      await expect(triggerHandlers.processTrigger(trigger)).rejects.toThrow();
    });

    it('should handle missing tenant ID gracefully', async () => {
      const trigger = {
        triggerType: 'goal_setting_required',
        tenantId: '',
        employeeId: 'emp_456',
        data: {},
        metadata: {
          triggeredBy: 'system',
          timestamp: new Date().toISOString(),
          priority: 'medium' as const,
          context: {}
        }
      };

      await expect(triggerHandlers.processTrigger(trigger)).rejects.toThrow();
    });
  });

  // ============================================================================
  // PERFORMANCE & SCALABILITY TESTS
  // ============================================================================
  
  describe('Performance Tests', () => {
    it('should process trigger within reasonable time', async () => {
      const trigger = {
        triggerType: 'goal_setting_required',
        tenantId: 'tenant_123',
        employeeId: 'emp_456',
        data: {},
        metadata: {
          triggeredBy: 'system',
          timestamp: new Date().toISOString(),
          priority: 'medium' as const,
          context: {}
        }
      };

      const startTime = Date.now();
      await triggerHandlers.processTrigger(trigger);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should handle multiple triggers sequentially', async () => {
      const triggers = [
        {
          triggerType: 'goal_setting_required',
          tenantId: 'tenant_123',
          employeeId: 'emp_456',
          data: {},
          metadata: {
            triggeredBy: 'system',
            timestamp: new Date().toISOString(),
            priority: 'medium' as const,
            context: {}
          }
        },
        {
          triggerType: 'coaching_requested',
          tenantId: 'tenant_123',
          employeeId: 'emp_789',
          data: {},
          metadata: {
            triggeredBy: 'employee',
            timestamp: new Date().toISOString(),
            priority: 'low' as const,
            context: {}
          }
        }
      ];

      for (const trigger of triggers) {
        const result = await triggerHandlers.processTrigger(trigger);
        expect(result.success).toBe(true);
      }
    });
  });

  // ============================================================================
  // TRIGGER CONFIGURATION TESTS
  // ============================================================================
  
  describe('Trigger Configuration', () => {
    it('should support all configured trigger types', () => {
      const status = performanceModule.getStatus();
      const supportedTriggers = status.triggersSupported;

      expect(supportedTriggers).toContain('lxp_training_completion');
      expect(supportedTriggers).toContain('annual_performance_review_due');
      expect(supportedTriggers).toContain('quarterly_check_in_due');
      expect(supportedTriggers).toContain('probation_period_ending');
      expect(supportedTriggers).toContain('onboarding_completion');
      expect(supportedTriggers).toContain('goal_setting_required');
      expect(supportedTriggers).toContain('performance_improvement_needed');
      expect(supportedTriggers).toContain('coaching_requested');
    });

    it('should define all output trigger types', () => {
      const status = performanceModule.getStatus();
      const outputTriggers = status.outputTriggers;

      expect(outputTriggers).toContain('performance_assessment_trigger');
      expect(outputTriggers).toContain('lxp_training_trigger');
      expect(outputTriggers).toContain('reward_trigger');
      expect(outputTriggers).toContain('talent_management_trigger');
      expect(outputTriggers).toContain('succession_planning_trigger');
      expect(outputTriggers).toContain('retention_intervention_trigger');
    });
  });

  // ============================================================================
  // INTEGRATION WITH OTHER MODULES TESTS
  // ============================================================================
  
  describe('Cross-Module Integration', () => {
    it('should generate LXP integration triggers', async () => {
      const trigger = {
        triggerType: 'performance_improvement_needed',
        tenantId: 'tenant_123',
        employeeId: 'emp_456',
        data: {
          improvementAreas: ['Python', 'System Design']
        },
        metadata: {
          triggeredBy: 'review',
          timestamp: new Date().toISOString(),
          priority: 'high' as const,
          context: {}
        }
      };

      const result = await triggerHandlers.processTrigger(trigger);

      const lxpTrigger = result.outputTriggers.find(t => t.targetModule === 'lxp_module');
      expect(lxpTrigger).toBeDefined();
      expect(lxpTrigger.data.improvementAreas).toEqual(['Python', 'System Design']);
    });

    it('should include performance tracking trigger for improvement plans', async () => {
      const trigger = {
        triggerType: 'performance_improvement_needed',
        tenantId: 'tenant_123',
        employeeId: 'emp_456',
        data: {
          improvementAreas: ['Communication'],
          urgencyLevel: 'high'
        },
        metadata: {
          triggeredBy: 'manager',
          timestamp: new Date().toISOString(),
          priority: 'high' as const,
          context: {}
        }
      };

      const result = await triggerHandlers.processTrigger(trigger);

      const trackingTrigger = result.outputTriggers.find(t => t.triggerType === 'performance_tracking_trigger');
      expect(trackingTrigger).toBeDefined();
    });
  });
});

