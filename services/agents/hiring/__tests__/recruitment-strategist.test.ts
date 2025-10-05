/**
 * Recruitment Strategist Agent Unit Tests
 * Tests the Recruitment Strategist AI Agent functionality
 */

import { RecruitmentStrategistAgent } from '../recruitment-strategist.js';

// Mock the logger
jest.mock('../../../../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('RecruitmentStrategistAgent', () => {
  let agent: RecruitmentStrategistAgent;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      tenantId: 'test-tenant-id',
      agentType: 'recruitment-strategist',
      enabled: true,
      settings: {
        maxRetries: 3,
        timeout: 30000
      }
    };

    agent = new RecruitmentStrategistAgent(mockConfig);
  });

  describe('Agent Initialization', () => {
    test('should initialize with correct configuration', () => {
      expect(agent).toBeDefined();
      expect(agent.getConfig()).toEqual(mockConfig);
    });

    test('should have correct agent type', () => {
      expect(agent.getAgentType()).toBe('recruitment-strategist');
    });

    test('should be enabled by default', () => {
      expect(agent.isEnabled()).toBe(true);
    });
  });

  describe('Knowledge Engine', () => {
    test('should load recruitment frameworks', async () => {
      await agent.initialize();
      
      const knowledgePrompt = agent.getKnowledgeSystemPrompt();
      expect(knowledgePrompt).toContain('recruitment');
      expect(knowledgePrompt).toContain('strategy');
    });

    test('should include best practices in knowledge base', async () => {
      await agent.initialize();
      
      const knowledgePrompt = agent.getKnowledgeSystemPrompt();
      expect(knowledgePrompt).toContain('best practices');
      expect(knowledgePrompt).toContain('sourcing');
    });

    test('should include labor market insights', async () => {
      await agent.initialize();
      
      const knowledgePrompt = agent.getKnowledgeSystemPrompt();
      expect(knowledgePrompt).toContain('labor market');
      expect(knowledgePrompt).toContain('hiring');
    });
  });

  describe('Data Engine', () => {
    test('should process structure analysis data', async () => {
      const mockData = {
        structureAnalysis: {
          department: 'Engineering',
          position: 'Senior Developer',
          urgency: 'high'
        }
      };

      const dataPrompt = agent.getDataSystemPrompt();
      expect(dataPrompt).toContain('structure analysis');
      expect(dataPrompt).toContain('hiring needs');
    });

    test('should process organizational context', async () => {
      const mockData = {
        organizationalContext: {
          vision: 'Innovation',
          mission: 'Excellence',
          values: ['integrity', 'collaboration']
        }
      };

      const dataPrompt = agent.getDataSystemPrompt();
      expect(dataPrompt).toContain('organizational context');
      expect(dataPrompt).toContain('culture');
    });

    test('should process budget constraints', async () => {
      const mockData = {
        budget: {
          salaryRange: { min: 80000, max: 120000 },
          totalBudget: 120000
        }
      };

      const dataPrompt = agent.getDataSystemPrompt();
      expect(dataPrompt).toContain('budget');
      expect(dataPrompt).toContain('constraints');
    });
  });

  describe('Reasoning Engine', () => {
    test('should generate recruitment strategies', async () => {
      const mockInput = {
        tenantId: 'test-tenant',
        requisitionId: 'req-123',
        positionTitle: 'Senior Software Engineer',
        department: 'Engineering',
        level: 'senior',
        requiredSkills: ['JavaScript', 'Node.js'],
        experienceRequired: '5+ years',
        urgency: 'medium',
        location: 'Remote',
        remote: true
      };

      const strategy = await agent.developRecruitmentStrategy(mockInput);
      
      expect(strategy).toBeDefined();
      expect(strategy.recruitmentStrategy).toBeDefined();
      expect(strategy.jobDescription).toBeDefined();
      expect(strategy.sourcingPlan).toBeDefined();
    });

    test('should create job descriptions', async () => {
      const mockInput = {
        tenantId: 'test-tenant',
        requisitionId: 'req-123',
        positionTitle: 'Senior Software Engineer',
        department: 'Engineering',
        level: 'senior',
        requiredSkills: ['JavaScript', 'Node.js'],
        experienceRequired: '5+ years',
        urgency: 'medium',
        location: 'Remote',
        remote: true
      };

      const strategy = await agent.developRecruitmentStrategy(mockInput);
      
      expect(strategy.jobDescription).toHaveProperty('title');
      expect(strategy.jobDescription).toHaveProperty('description');
      expect(strategy.jobDescription).toHaveProperty('requirements');
      expect(strategy.jobDescription).toHaveProperty('responsibilities');
    });

    test('should develop sourcing plans', async () => {
      const mockInput = {
        tenantId: 'test-tenant',
        requisitionId: 'req-123',
        positionTitle: 'Senior Software Engineer',
        department: 'Engineering',
        level: 'senior',
        requiredSkills: ['JavaScript', 'Node.js'],
        experienceRequired: '5+ years',
        urgency: 'medium',
        location: 'Remote',
        remote: true
      };

      const strategy = await agent.developRecruitmentStrategy(mockInput);
      
      expect(strategy.sourcingPlan).toHaveProperty('channels');
      expect(strategy.sourcingPlan).toHaveProperty('timeline');
      expect(strategy.sourcingPlan).toHaveProperty('budget');
      expect(Array.isArray(strategy.sourcingPlan.channels)).toBe(true);
    });

    test('should set recruitment timelines', async () => {
      const mockInput = {
        tenantId: 'test-tenant',
        requisitionId: 'req-123',
        positionTitle: 'Senior Software Engineer',
        department: 'Engineering',
        level: 'senior',
        requiredSkills: ['JavaScript', 'Node.js'],
        experienceRequired: '5+ years',
        urgency: 'high',
        location: 'Remote',
        remote: true
      };

      const strategy = await agent.developRecruitmentStrategy(mockInput);
      
      expect(strategy.sourcingPlan.timeline).toBeDefined();
      expect(strategy.sourcingPlan.timeline).toHaveProperty('startDate');
      expect(strategy.sourcingPlan.timeline).toHaveProperty('targetDate');
    });

    test('should estimate hiring budgets', async () => {
      const mockInput = {
        tenantId: 'test-tenant',
        requisitionId: 'req-123',
        positionTitle: 'Senior Software Engineer',
        department: 'Engineering',
        level: 'senior',
        requiredSkills: ['JavaScript', 'Node.js'],
        experienceRequired: '5+ years',
        urgency: 'medium',
        location: 'Remote',
        remote: true
      };

      const strategy = await agent.developRecruitmentStrategy(mockInput);
      
      expect(strategy.sourcingPlan.budget).toBeDefined();
      expect(strategy.sourcingPlan.budget).toHaveProperty('total');
      expect(strategy.sourcingPlan.budget).toHaveProperty('breakdown');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid input gracefully', async () => {
      const invalidInput = {
        tenantId: '',
        requisitionId: null,
        positionTitle: undefined
      };

      await expect(agent.developRecruitmentStrategy(invalidInput as any))
        .rejects.toThrow();
    });

    test('should handle missing required fields', async () => {
      const incompleteInput = {
        tenantId: 'test-tenant'
        // Missing required fields
      };

      await expect(agent.developRecruitmentStrategy(incompleteInput as any))
        .rejects.toThrow();
    });

    test('should handle network errors gracefully', async () => {
      // Mock network error
      jest.spyOn(agent as any, 'analyze').mockRejectedValue(new Error('Network error'));

      const mockInput = {
        tenantId: 'test-tenant',
        requisitionId: 'req-123',
        positionTitle: 'Senior Software Engineer',
        department: 'Engineering',
        level: 'senior',
        requiredSkills: ['JavaScript', 'Node.js'],
        experienceRequired: '5+ years',
        urgency: 'medium',
        location: 'Remote',
        remote: true
      };

      await expect(agent.developRecruitmentStrategy(mockInput))
        .rejects.toThrow('Network error');
    });
  });

  describe('Performance', () => {
    test('should complete strategy development within reasonable time', async () => {
      const mockInput = {
        tenantId: 'test-tenant',
        requisitionId: 'req-123',
        positionTitle: 'Senior Software Engineer',
        department: 'Engineering',
        level: 'senior',
        requiredSkills: ['JavaScript', 'Node.js'],
        experienceRequired: '5+ years',
        urgency: 'medium',
        location: 'Remote',
        remote: true
      };

      const startTime = Date.now();
      await agent.developRecruitmentStrategy(mockInput);
      const endTime = Date.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should handle concurrent requests', async () => {
      const mockInput = {
        tenantId: 'test-tenant',
        requisitionId: 'req-123',
        positionTitle: 'Senior Software Engineer',
        department: 'Engineering',
        level: 'senior',
        requiredSkills: ['JavaScript', 'Node.js'],
        experienceRequired: '5+ years',
        urgency: 'medium',
        location: 'Remote',
        remote: true
      };

      const promises = Array(5).fill(null).map(() => 
        agent.developRecruitmentStrategy(mockInput)
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.recruitmentStrategy).toBeDefined();
      });
    });
  });

  describe('Configuration', () => {
    test('should update configuration', () => {
      const newConfig = {
        ...mockConfig,
        settings: {
          maxRetries: 5,
          timeout: 60000
        }
      };

      agent.updateConfig(newConfig);
      expect(agent.getConfig()).toEqual(newConfig);
    });

    test('should enable/disable agent', () => {
      agent.disable();
      expect(agent.isEnabled()).toBe(false);

      agent.enable();
      expect(agent.isEnabled()).toBe(true);
    });

    test('should validate configuration', () => {
      const invalidConfig = {
        tenantId: '',
        agentType: '',
        enabled: true
      };

      expect(() => agent.updateConfig(invalidConfig)).toThrow();
    });
  });
});
