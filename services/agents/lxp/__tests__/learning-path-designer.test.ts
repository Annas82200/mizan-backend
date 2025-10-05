// backend/services/agents/lxp/__tests__/learning-path-designer.test.ts
// Task Reference: Module 1 (LXP) - Section 1.6.1 (Unit Tests for AI Agents)

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { LearningPathDesignerAgent } from '../learning-path-designer.js';

// ============================================================================
// TASK 1.6.1: UNIT TESTS FOR LEARNING PATH DESIGNER AGENT
// ============================================================================
// Dependencies: 1.2.1-1.2.4 (Learning Path Designer Agent) ✅ Complete
// Description: Test AI agent functionality
// Test Coverage:
//   - Learning Path Designer agent
//   - Knowledge engine outputs
//   - Data engine processing
//   - Reasoning engine recommendations

describe('LearningPathDesignerAgent', () => {
  let agent: LearningPathDesignerAgent;
  let mockInputData: any;

  beforeEach(() => {
    agent = new LearningPathDesignerAgent();
    
    mockInputData = {
      employeeId: 'emp_001',
      tenantId: 'tenant_001',
      skillGaps: [
        {
          skillId: 'leadership_001',
          skillName: 'Team Leadership',
          currentLevel: 2,
          targetLevel: 4,
          gapSize: 2,
          importance: 'critical',
          category: 'leadership',
          estimatedTimeToClose: 40
        },
        {
          skillId: 'tech_001',
          skillName: 'JavaScript Programming',
          currentLevel: 3,
          targetLevel: 4,
          gapSize: 1,
          importance: 'important',
          category: 'technical',
          estimatedTimeToClose: 20
        }
      ],
      currentSkills: [
        {
          skillId: 'comm_001',
          skillName: 'Communication',
          level: 4,
          confidence: 0.85,
          lastAssessed: new Date(),
          source: 'assessment',
          evidence: ['presentation_feedback', 'peer_review']
        }
      ],
      learningHistory: [
        {
          courseId: 'course_001',
          courseTitle: 'Basic Leadership',
          completionDate: new Date('2023-01-15'),
          score: 85,
          skillsLearned: ['basic_leadership']
        }
      ],
      learningPreferences: {
        preferredFormats: ['interactive', 'video'],
        preferredDuration: 'medium',
        preferredFrequency: 'weekly',
        accessibility: ['screen_reader_compatible']
      },
      organizationalContext: {
        companyValues: ['Innovation', 'Collaboration'],
        industryContext: 'Technology',
        roleContext: 'Software Engineer',
        teamContext: 'Development Team'
      }
    };
  });

  // ============================================================================
  // KNOWLEDGE ENGINE TESTS
  // ============================================================================

  describe('Knowledge Engine', () => {
    it('should load frameworks successfully', async () => {
      const frameworks = await agent.loadFrameworks();
      
      expect(frameworks).toBeDefined();
      expect(frameworks.instructionalDesignFrameworks).toBeDefined();
      expect(frameworks.learningSciencePrinciples).toBeDefined();
      expect(frameworks.competencyFrameworks).toBeDefined();
      expect(frameworks.learningModalities).toBeDefined();
      expect(frameworks.assessmentStrategies).toBeDefined();
    });

    it('should include ADDIE framework in instructional design frameworks', async () => {
      const frameworks = await agent.loadFrameworks();
      
      expect(frameworks.instructionalDesignFrameworks.ADDIE).toBeDefined();
      expect(frameworks.instructionalDesignFrameworks.ADDIE.analysis).toBeDefined();
      expect(frameworks.instructionalDesignFrameworks.ADDIE.design).toBeDefined();
      expect(frameworks.instructionalDesignFrameworks.ADDIE.development).toBeDefined();
      expect(frameworks.instructionalDesignFrameworks.ADDIE.implementation).toBeDefined();
      expect(frameworks.instructionalDesignFrameworks.ADDIE.evaluation).toBeDefined();
    });

    it('should include Bloom\'s Taxonomy in learning frameworks', async () => {
      const frameworks = await agent.loadFrameworks();
      
      expect(frameworks.instructionalDesignFrameworks.bloomsTaxonomy).toBeDefined();
      expect(frameworks.instructionalDesignFrameworks.bloomsTaxonomy.levels).toBeDefined();
      expect(frameworks.instructionalDesignFrameworks.bloomsTaxonomy.levels.remember).toBeDefined();
      expect(frameworks.instructionalDesignFrameworks.bloomsTaxonomy.levels.understand).toBeDefined();
      expect(frameworks.instructionalDesignFrameworks.bloomsTaxonomy.levels.apply).toBeDefined();
      expect(frameworks.instructionalDesignFrameworks.bloomsTaxonomy.levels.analyze).toBeDefined();
      expect(frameworks.instructionalDesignFrameworks.bloomsTaxonomy.levels.evaluate).toBeDefined();
      expect(frameworks.instructionalDesignFrameworks.bloomsTaxonomy.levels.create).toBeDefined();
    });

    it('should include learning science principles', async () => {
      const frameworks = await agent.loadFrameworks();
      
      expect(frameworks.learningSciencePrinciples.spacedRepetition).toBeDefined();
      expect(frameworks.learningSciencePrinciples.activeLearning).toBeDefined();
      expect(frameworks.learningSciencePrinciples.retrievalPractice).toBeDefined();
      expect(frameworks.learningSciencePrinciples.interleaving).toBeDefined();
    });

    it('should include competency frameworks', async () => {
      const frameworks = await agent.loadFrameworks();
      
      expect(frameworks.competencyFrameworks.technicalSkills).toBeDefined();
      expect(frameworks.competencyFrameworks.softSkills).toBeDefined();
      expect(frameworks.competencyFrameworks.leadershipSkills).toBeDefined();
    });

    it('should include learning modalities', async () => {
      const frameworks = await agent.loadFrameworks();
      
      expect(frameworks.learningModalities.visual).toBeDefined();
      expect(frameworks.learningModalities.auditory).toBeDefined();
      expect(frameworks.learningModalities.kinesthetic).toBeDefined();
      expect(frameworks.learningModalities.readingWriting).toBeDefined();
    });

    it('should include assessment strategies', async () => {
      const frameworks = await agent.loadFrameworks();
      
      expect(frameworks.assessmentStrategies.formative).toBeDefined();
      expect(frameworks.assessmentStrategies.summative).toBeDefined();
      expect(frameworks.assessmentStrategies.authentic).toBeDefined();
      expect(frameworks.assessmentStrategies.selfAssessment).toBeDefined();
    });
  });

  // ============================================================================
  // DATA ENGINE TESTS
  // ============================================================================

  describe('Data Engine', () => {
    it('should process employee learning history successfully', async () => {
      const knowledgeResult = { output: await agent.loadFrameworks() };
      const dataResult = await agent.processData(mockInputData, knowledgeResult.output);
      
      expect(dataResult).toBeDefined();
      expect(dataResult.employeeProfile).toBeDefined();
      expect(dataResult.learningHistory).toBeDefined();
      expect(dataResult.skillGaps).toBeDefined();
      expect(dataResult.availableCourses).toBeDefined();
      expect(dataResult.organizationalContext).toBeDefined();
      expect(dataResult.triggerContext).toBeDefined();
    });

    it('should analyze learning style correctly', async () => {
      const knowledgeResult = { output: await agent.loadFrameworks() };
      const dataResult = await agent.processData(mockInputData, knowledgeResult.output);
      
      expect(dataResult.employeeProfile.learningStyle).toBeDefined();
      expect(dataResult.employeeProfile.learningStyle.preferredFormats).toEqual(['interactive', 'video']);
      expect(dataResult.employeeProfile.learningStyle.preferredDuration).toBe('medium');
      expect(dataResult.employeeProfile.learningStyle.preferredFrequency).toBe('weekly');
    });

    it('should analyze learning pace correctly', async () => {
      const knowledgeResult = { output: await agent.loadFrameworks() };
      const dataResult = await agent.processData(mockInputData, knowledgeResult.output);
      
      expect(dataResult.employeeProfile.learningPace).toBeDefined();
      expect(dataResult.employeeProfile.learningPace.averageCompletionTime).toBeDefined();
      expect(dataResult.employeeProfile.learningPace.consistency).toBeDefined();
    });

    it('should identify skill gaps correctly', async () => {
      const knowledgeResult = { output: await agent.loadFrameworks() };
      const dataResult = await agent.processData(mockInputData, knowledgeResult.output);
      
      expect(dataResult.skillGaps).toBeDefined();
      expect(dataResult.skillGaps.length).toBe(2);
      expect(dataResult.skillGaps[0].skillName).toBe('Team Leadership');
      expect(dataResult.skillGaps[1].skillName).toBe('JavaScript Programming');
    });

    it('should recommend courses based on skill gaps', async () => {
      const knowledgeResult = { output: await agent.loadFrameworks() };
      const dataResult = await agent.processData(mockInputData, knowledgeResult.output);
      
      expect(dataResult.availableCourses).toBeDefined();
      expect(dataResult.availableCourses.length).toBeGreaterThan(0);
      expect(dataResult.availableCourses[0].title).toBeDefined();
      expect(dataResult.availableCourses[0].skills).toBeDefined();
    });

    it('should analyze organizational context correctly', async () => {
      const knowledgeResult = { output: await agent.loadFrameworks() };
      const dataResult = await agent.processData(mockInputData, knowledgeResult.output);
      
      expect(dataResult.organizationalContext).toBeDefined();
      expect(dataResult.organizationalContext.companyValues).toEqual(['Innovation', 'Collaboration']);
      expect(dataResult.organizationalContext.industryContext).toBe('Technology');
      expect(dataResult.organizationalContext.roleContext).toBe('Software Engineer');
    });
  });

  // ============================================================================
  // REASONING ENGINE TESTS
  // ============================================================================

  describe('Reasoning Engine', () => {
    it('should generate learning path recommendations', async () => {
      const knowledgeResult = { output: await agent.loadFrameworks() };
      const dataResult = await agent.processData(mockInputData, knowledgeResult.output);
      
      const reasoningResult = await agent.buildReasoningPrompt(
        mockInputData,
        knowledgeResult.output,
        dataResult.output
      );
      
      expect(reasoningResult).toBeDefined();
      expect(reasoningResult).toContain('Learning Path Design');
      expect(reasoningResult).toContain('Employee Context');
      expect(reasoningResult).toContain('Knowledge Framework Analysis');
      expect(reasoningResult).toContain('Data Analysis');
    });

    it('should include specific requirements in reasoning prompt', async () => {
      const knowledgeResult = { output: await agent.loadFrameworks() };
      const dataResult = await agent.processData(mockInputData, knowledgeResult.output);
      
      const reasoningResult = await agent.buildReasoningPrompt(
        mockInputData,
        knowledgeResult.output,
        dataResult.output
      );
      
      expect(reasoningResult).toContain('Structure');
      expect(reasoningResult).toContain('Milestones');
      expect(reasoningResult).toContain('Timeline');
      expect(reasoningResult).toContain('Assessment');
      expect(reasoningResult).toContain('Rationale');
    });

    it('should parse reasoning output correctly', async () => {
      const mockReasoningOutput = {
        learningPath: {
          title: 'Leadership Development Path',
          description: 'Comprehensive leadership development program',
          objectives: ['Develop team leadership skills', 'Improve communication'],
          modules: [
            {
              title: 'Leadership Fundamentals',
              type: 'interactive',
              duration: 120,
              skills: ['team_leadership'],
              assessment: 'quiz'
            }
          ],
          timeline: {
            totalDuration: 120,
            milestones: [
              {
                title: 'Complete Leadership Fundamentals',
                targetDate: '2024-02-15',
                criteria: ['pass_assessment', 'complete_activities']
              }
            ]
          },
          assessment: {
            type: 'comprehensive',
            frequency: 'weekly',
            criteria: ['knowledge_retention', 'skill_application']
          }
        },
        rationale: 'This learning path addresses the critical leadership gap through structured, interactive learning modules.',
        confidence: 0.85
      };

      const parsedOutput = agent.parseReasoningOutput(JSON.stringify(mockReasoningOutput));
      
      expect(parsedOutput).toBeDefined();
      expect(parsedOutput.learningPath).toBeDefined();
      expect(parsedOutput.learningPath.title).toBe('Leadership Development Path');
      expect(parsedOutput.learningPath.modules).toBeDefined();
      expect(parsedOutput.learningPath.modules.length).toBe(1);
      expect(parsedOutput.rationale).toBeDefined();
      expect(parsedOutput.confidence).toBe(0.85);
    });

    it('should handle invalid reasoning output gracefully', async () => {
      const invalidOutput = 'invalid json';
      
      expect(() => {
        agent.parseReasoningOutput(invalidOutput);
      }).toThrow();
    });
  });

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  describe('Full Agent Analysis', () => {
    it('should complete full analysis successfully', async () => {
      const result = await agent.analyze(mockInputData);
      
      expect(result).toBeDefined();
      expect(result.knowledge).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.reasoning).toBeDefined();
      expect(result.finalOutput).toBeDefined();
      expect(result.overallConfidence).toBeDefined();
      expect(result.totalProcessingTime).toBeDefined();
    });

    it('should have valid knowledge engine output', async () => {
      const result = await agent.analyze(mockInputData);
      
      expect(result.knowledge.output).toBeDefined();
      expect(result.knowledge.confidence).toBeGreaterThan(0);
      expect(result.knowledge.processingTime).toBeGreaterThan(0);
    });

    it('should have valid data engine output', async () => {
      const result = await agent.analyze(mockInputData);
      
      expect(result.data.output).toBeDefined();
      expect(result.data.confidence).toBeGreaterThan(0);
      expect(result.data.processingTime).toBeGreaterThan(0);
    });

    it('should have valid reasoning engine output', async () => {
      const result = await agent.analyze(mockInputData);
      
      expect(result.reasoning.output).toBeDefined();
      expect(result.reasoning.confidence).toBeGreaterThan(0);
      expect(result.reasoning.processingTime).toBeGreaterThan(0);
    });

    it('should calculate overall confidence correctly', async () => {
      const result = await agent.analyze(mockInputData);
      
      expect(result.overallConfidence).toBeGreaterThan(0);
      expect(result.overallConfidence).toBeLessThanOrEqual(1);
    });

    it('should measure total processing time', async () => {
      const result = await agent.analyze(mockInputData);
      
      expect(result.totalProcessingTime).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle missing input data gracefully', async () => {
      const emptyInput = {};
      
      await expect(agent.analyze(emptyInput)).rejects.toThrow();
    });

    it('should handle invalid skill gaps data', async () => {
      const invalidInput = {
        ...mockInputData,
        skillGaps: 'invalid'
      };
      
      await expect(agent.analyze(invalidInput)).rejects.toThrow();
    });

    it('should handle missing learning preferences', async () => {
      const inputWithoutPreferences = {
        ...mockInputData,
        learningPreferences: undefined
      };
      
      await expect(agent.analyze(inputWithoutPreferences)).rejects.toThrow();
    });
  });

  // ============================================================================
  // PERFORMANCE TESTS
  // ============================================================================

  describe('Performance', () => {
    it('should complete analysis within reasonable time', async () => {
      const startTime = Date.now();
      await agent.analyze(mockInputData);
      const endTime = Date.now();
      
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle large skill gaps efficiently', async () => {
      const largeInput = {
        ...mockInputData,
        skillGaps: Array.from({ length: 50 }, (_, i) => ({
          skillId: `skill_${i}`,
          skillName: `Skill ${i}`,
          currentLevel: 2,
          targetLevel: 4,
          gapSize: 2,
          importance: 'important',
          category: 'technical',
          estimatedTimeToClose: 20
        }))
      };
      
      const startTime = Date.now();
      await agent.analyze(largeInput);
      const endTime = Date.now();
      
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});
