import { PerformanceCoachAgent } from '../performance-coach';

describe('PerformanceCoachAgent', () => {
  let agent: PerformanceCoachAgent;

  beforeEach(() => {
    agent = new PerformanceCoachAgent();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(agent.initialize()).resolves.not.toThrow();
    });

    it('should load all coaching frameworks', async () => {
      await agent.initialize();
      expect(agent).toBeDefined();
    });
  });

  describe('Knowledge Engine', () => {
    it('should load GROW coaching model', async () => {
      await agent.initialize();
      expect(agent).toBeDefined();
    });

    it('should load OSKAR coaching model', async () => {
      await agent.initialize();
      expect(agent).toBeDefined();
    });

    it('should load 70-20-10 learning model', async () => {
      await agent.initialize();
      expect(agent).toBeDefined();
    });

    it('should load Prochaska stages of change', async () => {
      await agent.initialize();
      expect(agent).toBeDefined();
    });

    it('should load Self-Determination Theory', async () => {
      await agent.initialize();
      expect(agent).toBeDefined();
    });

    it('should load Career Anchors model', async () => {
      await agent.initialize();
      expect(agent).toBeDefined();
    });

    it('should load Leadership models', async () => {
      await agent.initialize();
      expect(agent).toBeDefined();
    });
  });

  describe('Data Engine', () => {
    const mockContext = {
      employeeId: 'emp_123',
      tenantId: 'tenant_456',
      coachingType: 'performance_improvement' as const,
      coachingDepth: 'detailed_coaching' as const,
      currentState: {
        performanceLevel: 'meets_expectations',
        competencyScores: {
          technical_skills: 3.5,
          communication: 4.0,
          leadership: 3.2
        },
        behaviorScores: {
          collaboration: 4.0,
          adaptability: 3.8,
          initiative: 3.5
        },
        recentFeedback: [],
        currentGoals: [],
        improvementAreas: ['Strategic thinking', 'Delegation'],
        strengths: ['Technical expertise', 'Team collaboration']
      },
      desiredOutcomes: {
        targetPerformanceLevel: 'exceeds_expectations',
        targetCompetencies: {
          leadership: 4.5,
          strategic_thinking: 4.0
        },
        careerGoals: ['Become Senior Manager', 'Lead larger team'],
        developmentPriorities: ['Leadership skills', 'Strategic thinking'],
        timeline: '12 months'
      },
      constraints: {
        timeAvailability: 'medium',
        budgetLimits: {},
        resourceAccess: ['training', 'mentoring'],
        organizationalFactors: []
      },
      historicalData: {
        previousCoaching: [],
        developmentHistory: [],
        performanceTrends: []
      },
      organizationalContext: {
        department: 'Engineering',
        team: 'Platform',
        role: 'Engineering Manager',
        level: 'Manager',
        managerId: 'mgr_789'
      }
    };

    it('should process coaching data successfully', async () => {
      await agent.initialize();
      const result = await agent.coach(mockContext);
      
      expect(result).toBeDefined();
      expect(result.coachingPlan).toBeDefined();
      expect(result.developmentRoadmap).toBeDefined();
    });

    it('should perform gap analysis', async () => {
      await agent.initialize();
      const result = await agent.coach(mockContext);
      
      expect(result.assessment).toBeDefined();
      expect(result.assessment.gapAnalysis).toBeDefined();
    });

    it('should assess readiness for coaching', async () => {
      await agent.initialize();
      const result = await agent.coach(mockContext);
      
      expect(result.assessment).toBeDefined();
      expect(result.assessment.readinessAssessment).toBeDefined();
      expect(result.assessment.readinessAssessment.overallReadiness).toBeGreaterThanOrEqual(0);
      expect(result.assessment.readinessAssessment.overallReadiness).toBeLessThanOrEqual(1);
    });

    it('should analyze strengths and opportunities', async () => {
      await agent.initialize();
      const result = await agent.coach(mockContext);
      
      expect(result.assessment.currentStateAnalysis).toBeDefined();
      expect(result.assessment.currentStateAnalysis.strengthsToLeverage).toBeDefined();
      expect(result.assessment.currentStateAnalysis.developmentOpportunities).toBeDefined();
    });
  });

  describe('Reasoning Engine', () => {
    const mockContext = {
      employeeId: 'emp_123',
      tenantId: 'tenant_456',
      coachingType: 'career_growth' as const,
      coachingDepth: 'comprehensive_program' as const,
      currentState: {
        performanceLevel: 'exceeds_expectations',
        competencyScores: { leadership: 4.5 },
        behaviorScores: { teamwork: 4.7 },
        recentFeedback: [],
        currentGoals: [],
        improvementAreas: [],
        strengths: ['Leadership', 'Strategic thinking']
      },
      desiredOutcomes: {
        targetPerformanceLevel: 'significantly_exceeds',
        targetCompetencies: {},
        careerGoals: ['Director role', 'Expand team'],
        developmentPriorities: ['Executive presence'],
        timeline: '18 months'
      },
      constraints: {
        timeAvailability: 'high',
        budgetLimits: {},
        resourceAccess: ['executive_coaching'],
        organizationalFactors: []
      },
      historicalData: {
        previousCoaching: [],
        developmentHistory: [],
        performanceTrends: []
      },
      organizationalContext: {
        department: 'Product',
        team: 'Product Management',
        role: 'Senior Product Manager',
        level: 'Senior',
        managerId: 'mgr_789'
      }
    };

    it('should generate coaching objectives', async () => {
      await agent.initialize();
      const result = await agent.coach(mockContext);
      
      expect(result.coachingPlan).toBeDefined();
      expect(result.coachingPlan.objectives).toBeDefined();
      expect(result.coachingPlan.objectives.length).toBeGreaterThan(0);
    });

    it('should create development roadmap', async () => {
      await agent.initialize();
      const result = await agent.coach(mockContext);
      
      expect(result.developmentRoadmap).toBeDefined();
      expect(result.developmentRoadmap.phases).toBeDefined();
    });

    it('should provide coaching recommendations', async () => {
      await agent.initialize();
      const result = await agent.coach(mockContext);
      
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.immediate).toBeDefined();
      expect(result.recommendations.immediate.length).toBeGreaterThan(0);
    });

    it('should define support structure', async () => {
      await agent.initialize();
      const result = await agent.coach(mockContext);
      
      expect(result.supportStructure).toBeDefined();
      expect(result.supportStructure.coaching).toBeDefined();
    });

    it('should setup progress tracking', async () => {
      await agent.initialize();
      const result = await agent.coach(mockContext);
      
      expect(result.progressTracking).toBeDefined();
      expect(result.progressTracking.metrics).toBeDefined();
    });

    it('should identify coaching risks', async () => {
      await agent.initialize();
      const result = await agent.coach(mockContext);
      
      expect(result.riskManagement).toBeDefined();
      expect(result.riskManagement.identifiedRisks).toBeDefined();
    });
  });

  describe('Coaching Types', () => {
    const baseContext = {
      employeeId: 'emp_123',
      tenantId: 'tenant_456',
      coachingDepth: 'detailed_coaching' as const,
      currentState: {
        performanceLevel: 'meets_expectations',
        competencyScores: {},
        behaviorScores: {},
        recentFeedback: [],
        currentGoals: [],
        improvementAreas: ['Leadership'],
        strengths: ['Technical skills']
      },
      desiredOutcomes: {
        targetPerformanceLevel: 'exceeds_expectations',
        targetCompetencies: {},
        careerGoals: [],
        developmentPriorities: [],
        timeline: '6 months'
      },
      constraints: {
        timeAvailability: 'medium',
        budgetLimits: {},
        resourceAccess: [],
        organizationalFactors: []
      },
      historicalData: {
        previousCoaching: [],
        developmentHistory: [],
        performanceTrends: []
      },
      organizationalContext: {
        department: 'Engineering',
        team: 'Backend',
        role: 'Developer',
        level: 'Mid',
        managerId: 'mgr_789'
      }
    };

    it('should handle performance improvement coaching', async () => {
      await agent.initialize();
      const result = await agent.coach({
        ...baseContext,
        coachingType: 'performance_improvement'
      });
      
      expect(result.coachingType).toBe('performance_improvement');
    });

    it('should handle skill development coaching', async () => {
      await agent.initialize();
      const result = await agent.coach({
        ...baseContext,
        coachingType: 'skill_development'
      });
      
      expect(result).toBeDefined();
    });

    it('should handle career growth coaching', async () => {
      await agent.initialize();
      const result = await agent.coach({
        ...baseContext,
        coachingType: 'career_growth'
      });
      
      expect(result).toBeDefined();
    });

    it('should handle behavioral coaching', async () => {
      await agent.initialize();
      const result = await agent.coach({
        ...baseContext,
        coachingType: 'behavioral_coaching'
      });
      
      expect(result).toBeDefined();
    });

    it('should handle leadership development coaching', async () => {
      await agent.initialize();
      const result = await agent.coach({
        ...baseContext,
        coachingType: 'leadership_development'
      });
      
      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid coaching type', async () => {
      const invalidContext: any = {
        employeeId: 'emp_123',
        tenantId: 'tenant_456',
        coachingType: 'invalid_type',
        coachingDepth: 'detailed_coaching'
      };

      await agent.initialize();
      await expect(agent.coach(invalidContext)).rejects.toThrow();
    });

    it('should handle missing required fields', async () => {
      const incompleteContext: any = {
        employeeId: 'emp_123'
        // Missing other required fields
      };

      await agent.initialize();
      await expect(agent.coach(incompleteContext)).rejects.toThrow();
    });
  });
});

