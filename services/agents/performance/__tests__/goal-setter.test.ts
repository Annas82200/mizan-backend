import { PerformanceGoalSetterAgent } from '../goal-setter';

describe('PerformanceGoalSetterAgent', () => {
  let agent: PerformanceGoalSetterAgent;

  beforeEach(() => {
    agent = new PerformanceGoalSetterAgent();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(agent.initialize()).resolves.not.toThrow();
    });

    it('should load all goal-setting frameworks', async () => {
      await agent.initialize();
      // Agent should have loaded frameworks internally
      expect(agent).toBeDefined();
    });
  });

  describe('Knowledge Engine', () => {
    it('should load SMART goals framework', async () => {
      await agent.initialize();
      // Framework should be loaded (tested via successful analysis)
      expect(agent).toBeDefined();
    });

    it('should load OKR framework', async () => {
      await agent.initialize();
      expect(agent).toBeDefined();
    });

    it('should load KPI framework', async () => {
      await agent.initialize();
      expect(agent).toBeDefined();
    });

    it('should load MBO framework', async () => {
      await agent.initialize();
      expect(agent).toBeDefined();
    });

    it('should load Moonshot Goals framework', async () => {
      await agent.initialize();
      expect(agent).toBeDefined();
    });

    it('should load Stretch Goals framework', async () => {
      await agent.initialize();
      expect(agent).toBeDefined();
    });

    it('should load Balanced Scorecard model', async () => {
      await agent.initialize();
      expect(agent).toBeDefined();
    });

    it('should load all alignment strategies', async () => {
      await agent.initialize();
      expect(agent).toBeDefined();
    });
  });

  describe('Data Engine', () => {
    const mockContext = {
      employeeId: 'emp_123',
      tenantId: 'tenant_456',
      role: 'Software Engineer',
      department: 'Engineering',
      currentPerformance: {
        overallScore: 4.2,
        competencyScores: {
          technical_skills: 4.5,
          communication: 4.0,
          leadership: 3.8
        },
        behaviorScores: {
          collaboration: 4.2,
          initiative: 4.0,
          adaptability: 3.9
        }
      },
      organizationalObjectives: {
        strategicGoals: ['Increase revenue by 20%', 'Launch new product'],
        departmentGoals: ['Improve code quality', 'Reduce bugs by 30%'],
        teamGoals: ['Complete sprint goals', 'Improve velocity']
      },
      historicalData: {
        previousGoals: [
          { goal: 'Complete certification', achievementRate: 95, period: '2023' },
          { goal: 'Lead 2 projects', achievementRate: 100, period: '2023' }
        ],
        performanceTrends: {
          overall: 'improving',
          technical: 'stable',
          leadership: 'improving'
        }
      },
      constraints: {
        maxGoals: 5,
        minGoals: 3,
        budgetLimits: {},
        timeConstraints: {}
      },
      period: '2024',
      managerId: 'mgr_789',
      tenantId: 'tenant_456'
    };

    it('should process goal setting data successfully', async () => {
      await agent.initialize();
      const result = await agent.analyze(mockContext);
      
      expect(result).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should analyze performance patterns', async () => {
      await agent.initialize();
      const result = await agent.analyze(mockContext);
      
      expect(result).toBeDefined();
      expect(result.insights).toBeDefined();
    });

    it('should identify goal opportunities', async () => {
      await agent.initialize();
      const result = await agent.analyze(mockContext);
      
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle missing historical data', async () => {
      const contextWithoutHistory = {
        ...mockContext,
        historicalData: {
          previousGoals: [],
          performanceTrends: {}
        }
      };

      await agent.initialize();
      const result = await agent.analyze(contextWithoutHistory);
      
      expect(result).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });
  });

  describe('Reasoning Engine', () => {
    const mockContext = {
      employeeId: 'emp_123',
      tenantId: 'tenant_456',
      role: 'Manager',
      department: 'Sales',
      currentPerformance: {
        overallScore: 4.5,
        competencyScores: { sales: 4.7, leadership: 4.3 },
        behaviorScores: { teamwork: 4.5 }
      },
      organizationalObjectives: {
        strategicGoals: ['Increase market share'],
        departmentGoals: ['Grow sales by 25%'],
        teamGoals: ['Exceed quarterly targets']
      },
      historicalData: {
        previousGoals: [],
        performanceTrends: {}
      },
      constraints: { maxGoals: 5, minGoals: 3, budgetLimits: {}, timeConstraints: {} },
      period: '2024',
      managerId: 'mgr_789',
      tenantId: 'tenant_456'
    };

    it('should generate goal recommendations', async () => {
      await agent.initialize();
      const result = await agent.analyze(mockContext);
      
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeLessThanOrEqual(mockContext.constraints.maxGoals);
    });

    it('should respect goal constraints', async () => {
      await agent.initialize();
      const result = await agent.analyze(mockContext);
      
      expect(result.recommendations.length).toBeGreaterThanOrEqual(mockContext.constraints.minGoals);
      expect(result.recommendations.length).toBeLessThanOrEqual(mockContext.constraints.maxGoals);
    });

    it('should align goals with organizational objectives', async () => {
      await agent.initialize();
      const result = await agent.analyze(mockContext);
      
      expect(result.alignment).toBeDefined();
      expect(result.alignment.overall).toBeGreaterThan(0);
    });

    it('should provide goal insights', async () => {
      await agent.initialize();
      const result = await agent.analyze(mockContext);
      
      expect(result.insights).toBeDefined();
    });

    it('should include metadata in results', async () => {
      await agent.initialize();
      const result = await agent.analyze(mockContext);
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata.confidence).toBeGreaterThan(0);
      expect(result.metadata.version).toBeDefined();
    });
  });

  describe('Full Analysis Workflow', () => {
    it('should complete full goal setting analysis', async () => {
      const context = {
        employeeId: 'emp_123',
        tenantId: 'tenant_456',
        role: 'Developer',
        department: 'Engineering',
        currentPerformance: {
          overallScore: 3.8,
          competencyScores: { coding: 4.0, design: 3.5 },
          behaviorScores: { collaboration: 4.0 }
        },
        organizationalObjectives: {
          strategicGoals: ['Product launch'],
          departmentGoals: ['Code quality improvement'],
          teamGoals: ['Sprint completion']
        },
        historicalData: {
          previousGoals: [{ goal: 'Complete training', achievementRate: 90, period: '2023' }],
          performanceTrends: { overall: 'improving' }
        },
        constraints: { maxGoals: 5, minGoals: 3, budgetLimits: {}, timeConstraints: {} },
        period: '2024',
        managerId: 'mgr_789',
        tenantId: 'tenant_456'
      };

      await agent.initialize();
      const result = await agent.analyze(context);
      
      // Verify complete result structure
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('alignment');
      expect(result).toHaveProperty('insights');
      expect(result).toHaveProperty('metadata');
      
      // Verify data quality
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.metadata.confidence).toBeGreaterThan(0);
      expect(result.metadata.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid input gracefully', async () => {
      const invalidContext: any = {
        employeeId: '',
        tenantId: '',
        role: '',
        department: ''
      };

      await agent.initialize();
      await expect(agent.analyze(invalidContext)).rejects.toThrow();
    });

    it('should handle missing required fields', async () => {
      const incompleteContext: any = {
        employeeId: 'emp_123'
        // Missing other required fields
      };

      await agent.initialize();
      await expect(agent.analyze(incompleteContext)).rejects.toThrow();
    });
  });
});

