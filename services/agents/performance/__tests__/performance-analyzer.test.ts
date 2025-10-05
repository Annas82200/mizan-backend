import { PerformanceAnalyzerAgent } from '../performance-analyzer';

describe('PerformanceAnalyzerAgent', () => {
  let agent: PerformanceAnalyzerAgent;

  beforeEach(() => {
    agent = new PerformanceAnalyzerAgent();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(agent.initialize()).resolves.not.toThrow();
    });

    it('should load all performance analysis frameworks', async () => {
      await agent.initialize();
      expect(agent).toBeDefined();
    });
  });

  describe('Knowledge Engine', () => {
    it('should load Balanced Scorecard framework', async () => {
      await agent.initialize();
      expect(agent).toBeDefined();
    });

    it('should load OKR framework', async () => {
      await agent.initialize();
      expect(agent).toBeDefined();
    });

    it('should load Performance Dashboard framework', async () => {
      await agent.initialize();
      expect(agent).toBeDefined();
    });

    it('should load 360-degree analysis methodology', async () => {
      await agent.initialize();
      expect(agent).toBeDefined();
    });

    it('should load trend analysis methodology', async () => {
      await agent.initialize();
      expect(agent).toBeDefined();
    });

    it('should load risk assessment methodology', async () => {
      await agent.initialize();
      expect(agent).toBeDefined();
    });
  });

  describe('Data Engine', () => {
    const mockContext = {
      employeeId: 'emp_123',
      tenantId: 'tenant_456',
      period: {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        type: 'annual' as const
      },
      performanceData: {
        goals: [
          {
            id: 'goal_1',
            title: 'Increase sales by 20%',
            description: 'Achieve 20% sales growth',
            category: 'revenue',
            type: 'quantitative' as const,
            target: 20,
            currentProgress: 85,
            status: 'in_progress' as const,
            priority: 'high' as const,
            dueDate: '2024-12-31',
            achievementRate: 85,
            qualityScore: 4.5,
            impactScore: 4.8,
            effortScore: 4.0,
            alignmentScore: 4.7,
            metadata: {}
          }
        ],
        reviews: [
          {
            id: 'review_1',
            type: 'annual' as const,
            status: 'completed' as const,
            overallRating: 4.2,
            competencyRatings: { technical: 4.5, leadership: 4.0 },
            behaviorRatings: { teamwork: 4.3, initiative: 4.1 },
            goalRatings: { goal_1: 4.5 },
            strengths: ['Technical expertise', 'Team collaboration'],
            developmentAreas: ['Strategic thinking'],
            achievements: ['Led successful project'],
            challenges: ['Time management'],
            recommendations: ['Focus on leadership development'],
            reviewerId: 'mgr_789',
            reviewDate: '2024-06-30',
            nextReviewDate: '2025-06-30',
            metadata: {}
          }
        ],
        feedback: [
          {
            id: 'feedback_1',
            type: 'manager' as const,
            providerId: 'mgr_789',
            providerRole: 'Manager',
            rating: 4,
            comments: 'Excellent performance',
            strengths: ['Communication'],
            improvementAreas: ['Time management'],
            suggestions: ['Prioritize tasks better'],
            category: 'leadership' as const,
            sentiment: 'positive' as const,
            confidence: 0.9,
            date: '2024-06-15',
            metadata: {}
          }
        ],
        metrics: [],
        improvementPlans: []
      },
      historicalData: {
        previousPeriods: [],
        trends: [],
        benchmarks: []
      },
      organizationalContext: {
        department: 'Sales',
        team: 'Enterprise Sales',
        role: 'Sales Manager',
        level: 'Senior',
        managerId: 'mgr_789'
      },
      analysisType: 'comprehensive' as const,
      analysisDepth: 'detailed' as const
    };

    it('should process performance analysis data successfully', async () => {
      await agent.initialize();
      const result = await agent.analyze(mockContext);
      
      expect(result).toBeDefined();
      expect(result.overallAssessment).toBeDefined();
      expect(result.goalAnalysis).toBeDefined();
      expect(result.competencyAnalysis).toBeDefined();
    });

    it('should analyze performance data', async () => {
      await agent.initialize();
      const result = await agent.analyze(mockContext);
      
      expect(result.overallAssessment.overallScore).toBeGreaterThan(0);
      expect(result.overallAssessment.performanceLevel).toBeDefined();
    });

    it('should analyze competency data', async () => {
      await agent.initialize();
      const result = await agent.analyze(mockContext);
      
      expect(result.competencyAnalysis).toBeDefined();
      expect(result.competencyAnalysis.overallCompetencyScore).toBeGreaterThanOrEqual(0);
    });

    it('should analyze behavioral data', async () => {
      await agent.initialize();
      const result = await agent.analyze(mockContext);
      
      expect(result.behaviorAnalysis).toBeDefined();
      expect(result.behaviorAnalysis.overallBehaviorScore).toBeGreaterThanOrEqual(0);
    });

    it('should analyze feedback data', async () => {
      await agent.initialize();
      const result = await agent.analyze(mockContext);
      
      expect(result.feedbackAnalysis).toBeDefined();
      expect(result.feedbackAnalysis.totalFeedback).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Reasoning Engine', () => {
    const mockContext = {
      employeeId: 'emp_123',
      tenantId: 'tenant_456',
      period: {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        type: 'annual' as const
      },
      performanceData: {
        goals: [],
        reviews: [],
        feedback: [],
        metrics: [],
        improvementPlans: []
      },
      historicalData: {
        previousPeriods: [],
        trends: [],
        benchmarks: []
      },
      organizationalContext: {
        department: 'Engineering',
        team: 'Platform',
        role: 'Senior Engineer',
        level: 'Senior',
        managerId: 'mgr_789'
      },
      analysisType: 'comprehensive' as const,
      analysisDepth: 'detailed' as const
    };

    it('should generate performance insights', async () => {
      await agent.initialize();
      const result = await agent.analyze(mockContext);
      
      expect(result.insights).toBeDefined();
      expect(result.insights.keyInsights).toBeDefined();
      expect(Array.isArray(result.insights.keyInsights)).toBe(true);
    });

    it('should generate recommendations', async () => {
      await agent.initialize();
      const result = await agent.analyze(mockContext);
      
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.immediate).toBeDefined();
      expect(Array.isArray(result.recommendations.immediate)).toBe(true);
    });

    it('should assess performance risks', async () => {
      await agent.initialize();
      const result = await agent.analyze(mockContext);
      
      expect(result.riskAssessment).toBeDefined();
      expect(result.riskAssessment.overallRiskLevel).toBeDefined();
    });

    it('should provide benchmarking data', async () => {
      await agent.initialize();
      const result = await agent.analyze(mockContext);
      
      expect(result.benchmarking).toBeDefined();
      expect(result.benchmarking.internalComparison).toBeDefined();
    });

    it('should include next steps', async () => {
      await agent.initialize();
      const result = await agent.analyze(mockContext);
      
      expect(result.nextSteps).toBeDefined();
      expect(result.nextSteps.actionItems).toBeDefined();
    });
  });

  describe('Full Analysis Workflow', () => {
    it('should complete comprehensive performance analysis', async () => {
      const context = {
        employeeId: 'emp_123',
        tenantId: 'tenant_456',
        period: {
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          type: 'annual' as const
        },
        performanceData: {
          goals: [],
          reviews: [],
          feedback: [],
          metrics: [],
          improvementPlans: []
        },
        historicalData: {
          previousPeriods: [],
          trends: [],
          benchmarks: []
        },
        organizationalContext: {
          department: 'Marketing',
          team: 'Digital Marketing',
          role: 'Marketing Manager',
          level: 'Manager',
          managerId: 'mgr_789'
        },
        analysisType: 'comprehensive' as const,
        analysisDepth: 'comprehensive' as const
      };

      await agent.initialize();
      const result = await agent.analyze(context);
      
      // Verify complete result structure
      expect(result).toHaveProperty('overallAssessment');
      expect(result).toHaveProperty('goalAnalysis');
      expect(result).toHaveProperty('competencyAnalysis');
      expect(result).toHaveProperty('behaviorAnalysis');
      expect(result).toHaveProperty('feedbackAnalysis');
      expect(result).toHaveProperty('improvementAnalysis');
      expect(result).toHaveProperty('riskAssessment');
      expect(result).toHaveProperty('benchmarking');
      expect(result).toHaveProperty('insights');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('nextSteps');
      expect(result).toHaveProperty('metadata');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing employee ID', async () => {
      const invalidContext: any = {
        employeeId: '',
        tenantId: 'tenant_456'
      };

      await agent.initialize();
      await expect(agent.analyze(invalidContext)).rejects.toThrow();
    });

    it('should handle missing performance data', async () => {
      const invalidContext: any = {
        employeeId: 'emp_123',
        tenantId: 'tenant_456',
        period: {
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          type: 'annual'
        }
        // Missing performanceData
      };

      await agent.initialize();
      await expect(agent.analyze(invalidContext)).rejects.toThrow();
    });
  });
});

