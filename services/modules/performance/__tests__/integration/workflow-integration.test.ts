import { GoalSettingWorkflow } from '../../workflows/goal-setting';
import { PerformanceReviewWorkflow } from '../../workflows/review';
import { PerformanceTrackingWorkflow } from '../../workflows/tracking';
import { CoachingDevelopmentWorkflow } from '../../workflows/coaching';

describe('Performance Management Workflows Integration Tests', () => {
  
  // ============================================================================
  // GOAL SETTING WORKFLOW TESTS
  // ============================================================================
  
  describe('Goal Setting Workflow', () => {
    let workflow: GoalSettingWorkflow;

    beforeEach(() => {
      workflow = new GoalSettingWorkflow();
    });

    it('should execute complete goal setting workflow', async () => {
      const input = {
        employeeId: 'emp_123',
        tenantId: 'tenant_456',
        managerId: 'mgr_789',
        period: '2024',
        organizationalContext: {
          role: 'Software Engineer',
          department: 'Engineering',
          team: 'Backend Team',
          level: 'Senior'
        },
        organizationalObjectives: {
          strategicGoals: ['Launch new product', 'Increase market share'],
          departmentGoals: ['Improve code quality', 'Reduce technical debt'],
          teamGoals: ['Complete sprint goals', 'Improve velocity by 20%']
        }
      };

      const result = await workflow.executeWorkflow(input);

      expect(result.success).toBe(true);
      expect(result.workflow).toBe('goal_setting');
      expect(result.goals).toBeDefined();
      expect(result.goals.length).toBeGreaterThan(0);
      expect(result.alignment).toBeDefined();
      expect(result.metadata.workflowSteps).toContain('invoke_goal_setter_agent');
    });

    it('should validate organizational alignment of generated goals', async () => {
      const input = {
        employeeId: 'emp_123',
        tenantId: 'tenant_456',
        managerId: 'mgr_789',
        period: '2024',
        organizationalContext: {
          role: 'Sales Manager',
          department: 'Sales'
        },
        organizationalObjectives: {
          strategicGoals: ['Revenue growth 25%'],
          departmentGoals: ['Expand customer base'],
          teamGoals: ['Meet quarterly targets']
        }
      };

      const result = await workflow.executeWorkflow(input);

      expect(result.alignment.overall).toBeGreaterThan(0);
      expect(result.alignment.overall).toBeLessThanOrEqual(1);
    });

    it('should respect goal constraints', async () => {
      const input = {
        employeeId: 'emp_123',
        tenantId: 'tenant_456',
        managerId: 'mgr_789',
        period: '2024',
        organizationalContext: {
          role: 'Developer',
          department: 'Engineering'
        },
        organizationalObjectives: {
          strategicGoals: [],
          departmentGoals: [],
          teamGoals: []
        },
        constraints: {
          maxGoals: 4,
          minGoals: 2
        }
      };

      const result = await workflow.executeWorkflow(input);

      expect(result.goals.length).toBeGreaterThanOrEqual(2);
      expect(result.goals.length).toBeLessThanOrEqual(4);
    });

    it('should generate milestones for each goal', async () => {
      const input = {
        employeeId: 'emp_123',
        tenantId: 'tenant_456',
        managerId: 'mgr_789',
        period: '2024',
        organizationalContext: {
          role: 'Product Manager',
          department: 'Product'
        },
        organizationalObjectives: {
          strategicGoals: ['Product launch'],
          departmentGoals: [],
          teamGoals: []
        }
      };

      const result = await workflow.executeWorkflow(input);

      result.goals.forEach(goal => {
        expect(goal.milestones).toBeDefined();
        expect(goal.milestones.length).toBeGreaterThan(0);
      });
    });

    it('should provide implementation recommendations', async () => {
      const input = {
        employeeId: 'emp_123',
        tenantId: 'tenant_456',
        managerId: 'mgr_789',
        period: '2024',
        organizationalContext: {
          role: 'Manager',
          department: 'Operations'
        },
        organizationalObjectives: {
          strategicGoals: ['Operational efficiency'],
          departmentGoals: [],
          teamGoals: []
        }
      };

      const result = await workflow.executeWorkflow(input);

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.immediate).toBeDefined();
      expect(result.recommendations.monitoring).toBeDefined();
      expect(result.recommendations.support).toBeDefined();
    });
  });

  // ============================================================================
  // PERFORMANCE REVIEW WORKFLOW TESTS
  // ============================================================================
  
  describe('Performance Review Workflow', () => {
    let workflow: PerformanceReviewWorkflow;

    beforeEach(() => {
      workflow = new PerformanceReviewWorkflow();
    });

    it('should execute complete annual review workflow', async () => {
      const input = {
        employeeId: 'emp_123',
        tenantId: 'tenant_456',
        reviewerId: 'mgr_789',
        reviewType: 'annual' as const,
        period: {
          startDate: '2023-01-01',
          endDate: '2023-12-31'
        },
        organizationalContext: {
          role: 'Engineer',
          department: 'Engineering',
          team: 'Platform',
          level: 'Senior',
          managerId: 'mgr_789'
        }
      };

      const result = await workflow.executeWorkflow(input);

      expect(result.success).toBe(true);
      expect(result.workflow).toBe('performance_review');
      expect(result.performanceAnalysis).toBeDefined();
      expect(result.reviewReport).toBeDefined();
      expect(result.metadata.workflowSteps).toContain('analyze_performance');
    });

    it('should include coaching guidance when requested', async () => {
      const input = {
        employeeId: 'emp_123',
        tenantId: 'tenant_456',
        reviewerId: 'mgr_789',
        reviewType: 'quarterly' as const,
        period: {
          startDate: '2024-01-01',
          endDate: '2024-03-31'
        },
        organizationalContext: {
          role: 'Manager',
          department: 'Sales',
          managerId: 'mgr_789'
        },
        includeCoaching: true
      };

      const result = await workflow.executeWorkflow(input);

      expect(result.coachingGuidance).toBeDefined();
      expect(result.metadata.agentsUsed).toContain('PerformanceCoachAgent');
    });

    it('should generate output triggers based on performance level', async () => {
      const input = {
        employeeId: 'emp_123',
        tenantId: 'tenant_456',
        reviewerId: 'mgr_789',
        reviewType: 'annual' as const,
        period: {
          startDate: '2023-01-01',
          endDate: '2023-12-31'
        },
        organizationalContext: {
          role: 'Sales Rep',
          department: 'Sales',
          managerId: 'mgr_789'
        }
      };

      const result = await workflow.executeWorkflow(input);

      expect(result.outputTriggers).toBeDefined();
      expect(Array.isArray(result.outputTriggers)).toBe(true);
    });

    it('should generate review report with all sections', async () => {
      const input = {
        employeeId: 'emp_123',
        tenantId: 'tenant_456',
        reviewerId: 'mgr_789',
        reviewType: 'annual' as const,
        period: {
          startDate: '2023-01-01',
          endDate: '2023-12-31'
        },
        organizationalContext: {
          role: 'Developer',
          department: 'Engineering',
          managerId: 'mgr_789'
        }
      };

      const result = await workflow.executeWorkflow(input);

      expect(result.reviewReport.summary).toBeDefined();
      expect(result.reviewReport.strengths).toBeDefined();
      expect(result.reviewReport.developmentAreas).toBeDefined();
      expect(result.reviewReport.recommendations).toBeDefined();
      expect(result.reviewReport.nextSteps).toBeDefined();
    });

    it('should support probation review type', async () => {
      const input = {
        employeeId: 'emp_123',
        tenantId: 'tenant_456',
        reviewerId: 'mgr_789',
        reviewType: 'probation' as const,
        period: {
          startDate: '2024-01-01',
          endDate: '2024-03-31'
        },
        organizationalContext: {
          role: 'New Hire',
          department: 'Engineering',
          managerId: 'mgr_789'
        }
      };

      const result = await workflow.executeWorkflow(input);

      expect(result.success).toBe(true);
      expect(result.reviewType).toBe('probation');
    });
  });

  // ============================================================================
  // PERFORMANCE TRACKING WORKFLOW TESTS
  // ============================================================================
  
  describe('Performance Tracking Workflow', () => {
    let workflow: PerformanceTrackingWorkflow;

    beforeEach(() => {
      workflow = new PerformanceTrackingWorkflow();
    });

    it('should execute ongoing performance tracking', async () => {
      const input = {
        employeeId: 'emp_123',
        tenantId: 'tenant_456',
        trackingType: 'ongoing' as const,
        trackingFrequency: 'weekly' as const
      };

      const result = await workflow.executeWorkflow(input);

      expect(result.success).toBe(true);
      expect(result.workflow).toBe('performance_tracking');
      expect(result.currentStatus).toBeDefined();
      expect(result.goalProgress).toBeDefined();
    });

    it('should identify at-risk goals', async () => {
      const input = {
        employeeId: 'emp_123',
        tenantId: 'tenant_456',
        trackingType: 'alert' as const
      };

      const result = await workflow.executeWorkflow(input);

      expect(result.alerts).toBeDefined();
      expect(Array.isArray(result.alerts)).toBe(true);
    });

    it('should generate performance insights', async () => {
      const input = {
        employeeId: 'emp_123',
        tenantId: 'tenant_456',
        trackingType: 'ongoing' as const
      };

      const result = await workflow.executeWorkflow(input);

      expect(result.insights).toBeDefined();
      expect(result.insights.patterns).toBeDefined();
      expect(result.insights.recommendations).toBeDefined();
    });

    it('should trigger interventions for critical issues', async () => {
      const input = {
        employeeId: 'emp_123',
        tenantId: 'tenant_456',
        trackingType: 'alert' as const,
        focusAreas: ['Goal 1', 'Goal 2']
      };

      const result = await workflow.executeWorkflow(input);

      expect(result.interventions).toBeDefined();
      expect(Array.isArray(result.interventions)).toBe(true);
    });

    it('should track milestone completion', async () => {
      const input = {
        employeeId: 'emp_123',
        tenantId: 'tenant_456',
        trackingType: 'milestone' as const,
        goalIds: ['goal_1', 'goal_2']
      };

      const result = await workflow.executeWorkflow(input);

      expect(result.success).toBe(true);
      expect(result.currentStatus).toBeDefined();
    });
  });

  // ============================================================================
  // COACHING & DEVELOPMENT WORKFLOW TESTS
  // ============================================================================
  
  describe('Coaching & Development Workflow', () => {
    let workflow: CoachingDevelopmentWorkflow;

    beforeEach(() => {
      workflow = new CoachingDevelopmentWorkflow();
    });

    it('should execute complete coaching workflow', async () => {
      const input = {
        employeeId: 'emp_123',
        tenantId: 'tenant_456',
        coachingType: 'performance_improvement' as const,
        coachingDepth: 'comprehensive_program' as const,
        requestedBy: 'mgr_789',
        organizationalContext: {
          role: 'Developer',
          department: 'Engineering',
          team: 'Backend',
          level: 'Mid',
          managerId: 'mgr_789'
        }
      };

      const result = await workflow.executeWorkflow(input);

      expect(result.success).toBe(true);
      expect(result.workflow).toBe('coaching_development');
      expect(result.gapAnalysis).toBeDefined();
      expect(result.coachingPlan).toBeDefined();
      expect(result.developmentPlan).toBeDefined();
      expect(result.metadata.agentsUsed).toContain('PerformanceAnalyzerAgent');
      expect(result.metadata.agentsUsed).toContain('PerformanceCoachAgent');
    });

    it('should analyze performance gaps', async () => {
      const input = {
        employeeId: 'emp_123',
        tenantId: 'tenant_456',
        coachingType: 'skill_development' as const,
        coachingDepth: 'detailed_coaching' as const,
        requestedBy: 'emp_123',
        focusAreas: ['Leadership', 'Communication'],
        organizationalContext: {
          role: 'Manager',
          department: 'Sales',
          managerId: 'mgr_789'
        }
      };

      const result = await workflow.executeWorkflow(input);

      expect(result.gapAnalysis).toBeDefined();
      expect(result.gapAnalysis.performanceGaps).toBeDefined();
      expect(result.gapAnalysis.competencyGaps).toBeDefined();
      expect(result.gapAnalysis.priorityGaps).toBeDefined();
    });

    it('should create comprehensive coaching plan', async () => {
      const input = {
        employeeId: 'emp_123',
        tenantId: 'tenant_456',
        coachingType: 'career_growth' as const,
        coachingDepth: 'comprehensive_program' as const,
        requestedBy: 'emp_123',
        desiredOutcomes: ['Senior Manager role', 'Lead larger team'],
        organizationalContext: {
          role: 'Manager',
          department: 'Product',
          managerId: 'mgr_789'
        }
      };

      const result = await workflow.executeWorkflow(input);

      expect(result.coachingPlan.objectives).toBeDefined();
      expect(result.coachingPlan.strategies).toBeDefined();
      expect(result.coachingPlan.actionPlan).toBeDefined();
    });

    it('should assign learning activities', async () => {
      const input = {
        employeeId: 'emp_123',
        tenantId: 'tenant_456',
        coachingType: 'leadership_development' as const,
        coachingDepth: 'comprehensive_program' as const,
        requestedBy: 'mgr_789',
        organizationalContext: {
          role: 'Senior Engineer',
          department: 'Engineering',
          managerId: 'mgr_789'
        }
      };

      const result = await workflow.executeWorkflow(input);

      expect(result.developmentPlan.learningActivities).toBeDefined();
      expect(result.developmentPlan.learningActivities.length).toBeGreaterThan(0);
    });

    it('should generate LXP integration triggers', async () => {
      const input = {
        employeeId: 'emp_123',
        tenantId: 'tenant_456',
        coachingType: 'skill_development' as const,
        coachingDepth: 'detailed_coaching' as const,
        requestedBy: 'emp_123',
        focusAreas: ['Python', 'Cloud Architecture'],
        organizationalContext: {
          role: 'Developer',
          department: 'Engineering',
          managerId: 'mgr_789'
        }
      };

      const result = await workflow.executeWorkflow(input);

      expect(result.outputTriggers).toBeDefined();
      const lxpTrigger = result.outputTriggers.find(t => t.targetModule === 'lxp_module');
      expect(lxpTrigger).toBeDefined();
    });

    it('should setup progress tracking', async () => {
      const input = {
        employeeId: 'emp_123',
        tenantId: 'tenant_456',
        coachingType: 'behavioral_coaching' as const,
        coachingDepth: 'detailed_coaching' as const,
        requestedBy: 'mgr_789',
        organizationalContext: {
          role: 'Team Lead',
          department: 'Engineering',
          managerId: 'mgr_789'
        }
      };

      const result = await workflow.executeWorkflow(input);

      expect(result.progressTracking).toBeDefined();
      expect(result.progressTracking.metrics).toBeDefined();
      expect(result.progressTracking.reviewSchedule).toBeDefined();
    });
  });

  // ============================================================================
  // WORKFLOW INTERACTION TESTS
  // ============================================================================
  
  describe('Workflow Interactions', () => {
    it('should complete full performance cycle', async () => {
      // Step 1: Set goals
      const goalWorkflow = new GoalSettingWorkflow();
      const goalResult = await goalWorkflow.executeWorkflow({
        employeeId: 'emp_123',
        tenantId: 'tenant_456',
        managerId: 'mgr_789',
        period: '2024',
        organizationalContext: {
          role: 'Engineer',
          department: 'Engineering'
        },
        organizationalObjectives: {
          strategicGoals: ['Product launch'],
          departmentGoals: [],
          teamGoals: []
        }
      });

      expect(goalResult.success).toBe(true);

      // Step 2: Track performance
      const trackingWorkflow = new PerformanceTrackingWorkflow();
      const trackingResult = await trackingWorkflow.executeWorkflow({
        employeeId: 'emp_123',
        tenantId: 'tenant_456',
        trackingType: 'ongoing',
        goalIds: goalResult.goals.map(g => g.id)
      });

      expect(trackingResult.success).toBe(true);

      // Step 3: Conduct review
      const reviewWorkflow = new PerformanceReviewWorkflow();
      const reviewResult = await reviewWorkflow.executeWorkflow({
        employeeId: 'emp_123',
        tenantId: 'tenant_456',
        reviewerId: 'mgr_789',
        reviewType: 'annual',
        period: {
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        },
        organizationalContext: {
          role: 'Engineer',
          department: 'Engineering',
          managerId: 'mgr_789'
        }
      });

      expect(reviewResult.success).toBe(true);

      // Step 4: Provide coaching if needed
      if (reviewResult.performanceAnalysis.performanceLevel !== 'significantly_exceeds') {
        const coachingWorkflow = new CoachingDevelopmentWorkflow();
        const coachingResult = await coachingWorkflow.executeWorkflow({
          employeeId: 'emp_123',
          tenantId: 'tenant_456',
          coachingType: 'performance_improvement',
          coachingDepth: 'detailed_coaching',
          requestedBy: 'mgr_789',
          organizationalContext: {
            role: 'Engineer',
            department: 'Engineering',
            managerId: 'mgr_789'
          }
        });

        expect(coachingResult.success).toBe(true);
      }
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================
  
  describe('Workflow Error Handling', () => {
    it('should handle missing required fields in goal setting', async () => {
      const workflow = new GoalSettingWorkflow();
      const invalidInput: any = {
        employeeId: '',
        tenantId: ''
      };

      await expect(workflow.executeWorkflow(invalidInput)).rejects.toThrow();
    });

    it('should handle invalid review type', async () => {
      const workflow = new PerformanceReviewWorkflow();
      const invalidInput: any = {
        employeeId: 'emp_123',
        tenantId: 'tenant_456',
        reviewerId: 'mgr_789',
        reviewType: 'invalid_type',
        period: {
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        },
        organizationalContext: {
          role: 'Engineer',
          department: 'Engineering',
          managerId: 'mgr_789'
        }
      };

      await expect(workflow.executeWorkflow(invalidInput)).rejects.toThrow();
    });

    it('should handle missing organizational context', async () => {
      const workflow = new CoachingDevelopmentWorkflow();
      const invalidInput: any = {
        employeeId: 'emp_123',
        tenantId: 'tenant_456',
        coachingType: 'performance_improvement',
        coachingDepth: 'detailed_coaching',
        requestedBy: 'mgr_789'
        // Missing organizationalContext
      };

      await expect(workflow.executeWorkflow(invalidInput)).rejects.toThrow();
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================
  
  describe('Workflow Performance', () => {
    it('should complete goal setting workflow within reasonable time', async () => {
      const workflow = new GoalSettingWorkflow();
      const startTime = Date.now();

      await workflow.executeWorkflow({
        employeeId: 'emp_123',
        tenantId: 'tenant_456',
        managerId: 'mgr_789',
        period: '2024',
        organizationalContext: {
          role: 'Engineer',
          department: 'Engineering'
        },
        organizationalObjectives: {
          strategicGoals: [],
          departmentGoals: [],
          teamGoals: []
        }
      });

      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should complete review workflow efficiently', async () => {
      const workflow = new PerformanceReviewWorkflow();
      const startTime = Date.now();

      await workflow.executeWorkflow({
        employeeId: 'emp_123',
        tenantId: 'tenant_456',
        reviewerId: 'mgr_789',
        reviewType: 'quarterly',
        period: {
          startDate: '2024-01-01',
          endDate: '2024-03-31'
        },
        organizationalContext: {
          role: 'Engineer',
          department: 'Engineering',
          managerId: 'mgr_789'
        }
      });

      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(15000); // Should complete within 15 seconds
    });
  });
});

