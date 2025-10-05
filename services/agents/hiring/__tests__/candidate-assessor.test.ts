/**
 * Candidate Assessor Agent Unit Tests
 * Tests the Candidate Assessor AI Agent functionality
 */

import { CandidateAssessorAgent } from '../candidate-assessor.js';

// Mock the logger
jest.mock('../../../../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock the culture integration
jest.mock('../../modules/hiring/integrations/culture-integration.js', () => ({
  cultureIntegration: {
    assessCandidateCultureFit: jest.fn().mockResolvedValue({
      candidateId: 'test-candidate-id',
      tenantId: 'test-tenant-id',
      cultureAnalysisId: 'test-analysis-id',
      overallCultureFit: 85,
      individualScores: {
        innovation: 80,
        collaboration: 90,
        integrity: 95,
        excellence: 85,
        customerFocus: 80,
        diversity: 75,
        sustainability: 85
      },
      alignmentAnalysis: {
        strongMatches: ['integrity', 'collaboration'],
        potentialGaps: ['diversity'],
        developmentAreas: [],
        riskFactors: []
      },
      recommendations: {
        hireRecommendation: 'yes',
        confidence: 85,
        reasoning: 'Good culture fit with minor development areas',
        interviewFocus: ['diversity'],
        onboardingNeeds: []
      },
      assessmentDate: new Date(),
      assessedBy: 'culture_integration',
      metadata: {}
    })
  }
}));

describe('CandidateAssessorAgent', () => {
  let agent: CandidateAssessorAgent;
  let mockConfig: any;
  let mockAssessmentInput: any;

  beforeEach(() => {
    mockConfig = {
      tenantId: 'test-tenant-id',
      agentType: 'candidate-assessor',
      enabled: true,
      settings: {
        maxRetries: 3,
        timeout: 30000
      }
    };

    agent = new CandidateAssessorAgent(mockConfig);

    mockAssessmentInput = {
      tenantId: 'test-tenant-id',
      candidateId: 'test-candidate-id',
      requisitionId: 'req-123',
      candidate: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        resume: {
          skills: ['JavaScript', 'Node.js', 'TypeScript'],
          experience: [
            {
              company: 'Tech Corp',
              position: 'Software Engineer',
              duration: '3 years',
              description: 'Developed web applications'
            }
          ],
          education: [
            {
              degree: 'Bachelor of Computer Science',
              institution: 'University of Technology',
              year: 2020
            }
          ]
        },
        skills: ['JavaScript', 'Node.js', 'TypeScript'],
        experience: [
          {
            company: 'Tech Corp',
            position: 'Software Engineer',
            duration: '3 years',
            description: 'Developed web applications'
            }
        ],
        education: [
          {
            degree: 'Bachelor of Computer Science',
            institution: 'University of Technology',
            year: 2020
          }
        ],
        coverLetter: 'I am passionate about software development...'
      },
      jobRequirements: {
        title: 'Senior Software Engineer',
        level: 'senior',
        requiredSkills: ['JavaScript', 'Node.js', 'TypeScript'],
        preferredSkills: ['React', 'AWS'],
        experienceRequired: '5+ years',
        cultureFit: ['innovation', 'collaboration', 'integrity']
      },
      companyData: {
        vision: 'Innovation through technology',
        mission: 'Building the future',
        values: ['innovation', 'collaboration', 'integrity', 'excellence'],
        culture: {
          type: 'collaborative',
          strength: 85
        }
      },
      assessmentType: 'comprehensive',
      metadata: {}
    };
  });

  describe('Agent Initialization', () => {
    test('should initialize with correct configuration', () => {
      expect(agent).toBeDefined();
      expect(agent.getConfig()).toEqual(mockConfig);
    });

    test('should have correct agent type', () => {
      expect(agent.getAgentType()).toBe('candidate-assessor');
    });

    test('should be enabled by default', () => {
      expect(agent.isEnabled()).toBe(true);
    });
  });

  describe('Knowledge Engine', () => {
    test('should load competency frameworks', async () => {
      await agent.initialize();
      
      const knowledgePrompt = agent.getKnowledgeSystemPrompt();
      expect(knowledgePrompt).toContain('competency');
      expect(knowledgePrompt).toContain('assessment');
    });

    test('should include Mizan 7 Cylinders framework', async () => {
      await agent.initialize();
      
      const knowledgePrompt = agent.getKnowledgeSystemPrompt();
      expect(knowledgePrompt).toContain('Mizan');
      expect(knowledgePrompt).toContain('culture');
    });

    test('should include assessment methodologies', async () => {
      await agent.initialize();
      
      const knowledgePrompt = agent.getKnowledgeSystemPrompt();
      expect(knowledgePrompt).toContain('assessment');
      expect(knowledgePrompt).toContain('methodology');
    });

    test('should include interview techniques', async () => {
      await agent.initialize();
      
      const knowledgePrompt = agent.getKnowledgeSystemPrompt();
      expect(knowledgePrompt).toContain('interview');
      expect(knowledgePrompt).toContain('technique');
    });
  });

  describe('Data Engine', () => {
    test('should process candidate resume data', async () => {
      const dataPrompt = agent.getDataSystemPrompt();
      expect(dataPrompt).toContain('resume');
      expect(dataPrompt).toContain('candidate');
    });

    test('should process application data', async () => {
      const dataPrompt = agent.getDataSystemPrompt();
      expect(dataPrompt).toContain('application');
      expect(dataPrompt).toContain('assessment');
    });

    test('should process interview feedback', async () => {
      const dataPrompt = agent.getDataSystemPrompt();
      expect(dataPrompt).toContain('interview');
      expect(dataPrompt).toContain('feedback');
    });

    test('should process reference data', async () => {
      const dataPrompt = agent.getDataSystemPrompt();
      expect(dataPrompt).toContain('reference');
      expect(dataPrompt).toContain('data');
    });
  });

  describe('Reasoning Engine', () => {
    test('should evaluate culture fit using Mizan framework', async () => {
      const assessment = await agent.assessCandidate(mockAssessmentInput);
      
      expect(assessment).toBeDefined();
      expect(assessment.cultureFitAssessment).toBeDefined();
      expect(assessment.cultureFitAssessment.score).toBeGreaterThanOrEqual(0);
      expect(assessment.cultureFitAssessment.score).toBeLessThanOrEqual(100);
    });

    test('should rank candidates', async () => {
      const assessment = await agent.assessCandidate(mockAssessmentInput);
      
      expect(assessment.overallScore).toBeGreaterThanOrEqual(0);
      expect(assessment.overallScore).toBeLessThanOrEqual(100);
      expect(['strong_hire', 'hire', 'maybe', 'pass', 'strong_pass']).toContain(
        assessment.recommendation
      );
    });

    test('should generate hiring recommendations', async () => {
      const assessment = await agent.assessCandidate(mockAssessmentInput);
      
      expect(assessment.recommendation).toBeDefined();
      expect(['strong_hire', 'hire', 'maybe', 'pass', 'strong_pass']).toContain(
        assessment.recommendation
      );
    });

    test('should predict candidate success', async () => {
      const assessment = await agent.assessCandidate(mockAssessmentInput);
      
      expect(assessment.overallAnalysis).toBeDefined();
      expect(assessment.overallAnalysis.strengths).toBeDefined();
      expect(assessment.overallAnalysis.weaknesses).toBeDefined();
      expect(assessment.overallAnalysis.opportunities).toBeDefined();
      expect(assessment.overallAnalysis.concerns).toBeDefined();
    });

    test('should identify red flags', async () => {
      const assessment = await agent.assessCandidate(mockAssessmentInput);
      
      expect(assessment.overallAnalysis.redFlags).toBeDefined();
      expect(Array.isArray(assessment.overallAnalysis.redFlags)).toBe(true);
    });
  });

  describe('Comprehensive Assessment', () => {
    test('should perform skills assessment', async () => {
      const assessment = await agent.assessCandidate(mockAssessmentInput);
      
      expect(assessment.skillsAssessment).toBeDefined();
      expect(assessment.skillsAssessment.score).toBeGreaterThanOrEqual(0);
      expect(assessment.skillsAssessment.score).toBeLessThanOrEqual(100);
      expect(assessment.skillsAssessment.requiredSkillsMatch).toBeDefined();
      expect(assessment.skillsAssessment.preferredSkillsMatch).toBeDefined();
      expect(Array.isArray(assessment.skillsAssessment.skillGaps)).toBe(true);
      expect(Array.isArray(assessment.skillsAssessment.skillStrengths)).toBe(true);
    });

    test('should perform experience assessment', async () => {
      const assessment = await agent.assessCandidate(mockAssessmentInput);
      
      expect(assessment.experienceAssessment).toBeDefined();
      expect(assessment.experienceAssessment.score).toBeGreaterThanOrEqual(0);
      expect(assessment.experienceAssessment.score).toBeLessThanOrEqual(100);
      expect(assessment.experienceAssessment.yearsOfExperience).toBeDefined();
      expect(assessment.experienceAssessment.relevantExperience).toBeDefined();
      expect(typeof assessment.experienceAssessment.industryMatch).toBe('boolean');
      expect(typeof assessment.experienceAssessment.seniorityMatch).toBe('boolean');
    });

    test('should perform culture fit assessment', async () => {
      const assessment = await agent.assessCandidate(mockAssessmentInput);
      
      expect(assessment.cultureFitAssessment).toBeDefined();
      expect(assessment.cultureFitAssessment.score).toBeGreaterThanOrEqual(0);
      expect(assessment.cultureFitAssessment.score).toBeLessThanOrEqual(100);
      expect(assessment.cultureFitAssessment.alignment).toBeDefined();
      expect(Array.isArray(assessment.cultureFitAssessment.strengths)).toBe(true);
      expect(Array.isArray(assessment.cultureFitAssessment.concerns)).toBe(true);
      expect(assessment.cultureFitAssessment.cylinders).toBeDefined();
    });

    test('should perform education assessment', async () => {
      const assessment = await agent.assessCandidate(mockAssessmentInput);
      
      expect(assessment.educationAssessment).toBeDefined();
      expect(assessment.educationAssessment.score).toBeGreaterThanOrEqual(0);
      expect(assessment.educationAssessment.score).toBeLessThanOrEqual(100);
      expect(typeof assessment.educationAssessment.meetsRequirements).toBe('boolean');
      expect(Array.isArray(assessment.educationAssessment.credentials)).toBe(true);
      expect(Array.isArray(assessment.educationAssessment.certifications)).toBe(true);
    });
  });

  describe('Interview Recommendations', () => {
    test('should provide interview recommendations', async () => {
      const assessment = await agent.assessCandidate(mockAssessmentInput);
      
      expect(assessment.interviewRecommendations).toBeDefined();
      expect(typeof assessment.interviewRecommendations.shouldInterview).toBe('boolean');
      expect(Array.isArray(assessment.interviewRecommendations.interviewType)).toBe(true);
      expect(Array.isArray(assessment.interviewRecommendations.focusAreas)).toBe(true);
      expect(Array.isArray(assessment.interviewRecommendations.questions)).toBe(true);
    });

    test('should recommend appropriate interview types', async () => {
      const assessment = await agent.assessCandidate(mockAssessmentInput);
      
      const validTypes = ['technical', 'behavioral', 'culture_fit', 'panel', 'phone'];
      assessment.interviewRecommendations.interviewType.forEach(type => {
        expect(validTypes).toContain(type);
      });
    });

    test('should provide specific interview questions', async () => {
      const assessment = await agent.assessCandidate(mockAssessmentInput);
      
      expect(assessment.interviewRecommendations.questions.length).toBeGreaterThan(0);
      assessment.interviewRecommendations.questions.forEach(question => {
        expect(typeof question).toBe('string');
        expect(question.length).toBeGreaterThan(10);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid input gracefully', async () => {
      const invalidInput = {
        tenantId: '',
        candidateId: null,
        requisitionId: undefined
      };

      await expect(agent.assessCandidate(invalidInput as any))
        .rejects.toThrow();
    });

    test('should handle missing candidate data', async () => {
      const incompleteInput = {
        ...mockAssessmentInput,
        candidate: {
          firstName: 'John'
          // Missing required fields
        }
      };

      await expect(agent.assessCandidate(incompleteInput))
        .rejects.toThrow();
    });

    test('should handle culture integration errors gracefully', async () => {
      // Mock culture integration error
      const { cultureIntegration } = require('../../modules/hiring/integrations/culture-integration.js');
      cultureIntegration.assessCandidateCultureFit.mockRejectedValue(new Error('Culture assessment failed'));

      const assessment = await agent.assessCandidate(mockAssessmentInput);
      
      // Should still complete assessment without culture fit
      expect(assessment).toBeDefined();
      expect(assessment.cultureFitAssessment).toBeDefined();
    });
  });

  describe('Performance', () => {
    test('should complete assessment within reasonable time', async () => {
      const startTime = Date.now();
      await agent.assessCandidate(mockAssessmentInput);
      const endTime = Date.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    test('should handle concurrent assessments', async () => {
      const promises = Array(3).fill(null).map((_, index) => 
        agent.assessCandidate({
          ...mockAssessmentInput,
          candidateId: `candidate-${index}`
        })
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.overallScore).toBeDefined();
        expect(result.recommendation).toBeDefined();
      });
    });
  });

  describe('Assessment Types', () => {
    test('should handle comprehensive assessment', async () => {
      const assessment = await agent.assessCandidate({
        ...mockAssessmentInput,
        assessmentType: 'comprehensive'
      });
      
      expect(assessment).toBeDefined();
      expect(assessment.skillsAssessment).toBeDefined();
      expect(assessment.experienceAssessment).toBeDefined();
      expect(assessment.cultureFitAssessment).toBeDefined();
      expect(assessment.educationAssessment).toBeDefined();
    });

    test('should handle skills-only assessment', async () => {
      const assessment = await agent.assessCandidate({
        ...mockAssessmentInput,
        assessmentType: 'skills_only'
      });
      
      expect(assessment).toBeDefined();
      expect(assessment.skillsAssessment).toBeDefined();
    });

    test('should handle culture-only assessment', async () => {
      const assessment = await agent.assessCandidate({
        ...mockAssessmentInput,
        assessmentType: 'culture_only'
      });
      
      expect(assessment).toBeDefined();
      expect(assessment.cultureFitAssessment).toBeDefined();
    });

    test('should handle quick screen assessment', async () => {
      const assessment = await agent.assessCandidate({
        ...mockAssessmentInput,
        assessmentType: 'quick_screen'
      });
      
      expect(assessment).toBeDefined();
      expect(assessment.overallScore).toBeDefined();
      expect(assessment.recommendation).toBeDefined();
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
  });
});
