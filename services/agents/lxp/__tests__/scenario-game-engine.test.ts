// backend/services/agents/lxp/__tests__/scenario-game-engine.test.ts
// Task Reference: Module 1 (LXP) - Section 1.6.1 (Unit Tests for AI Agents)

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ScenarioGameEngineAgent } from '../scenario-game-engine.js';

// ============================================================================
// TASK 1.6.1: UNIT TESTS FOR SCENARIO GAME ENGINE AGENT
// ============================================================================
// Dependencies: 1.2.9-1.2.12 (Scenario Game Engine Agent) ✅ Complete
// Description: Test AI agent functionality
// Test Coverage:
//   - Scenario Game Engine agent
//   - Knowledge engine outputs
//   - Data engine processing
//   - Reasoning engine recommendations

describe('ScenarioGameEngineAgent', () => {
  let agent: ScenarioGameEngineAgent;
  let mockInputData: any;

  beforeEach(() => {
    agent = new ScenarioGameEngineAgent();
    
    mockInputData = {
      employeeId: 'emp_001',
      tenantId: 'tenant_001',
      triggerType: 'skill_gaps_critical',
      employeeProfile: {
        name: 'John Doe',
        role: 'Software Engineer',
        experience: 'intermediate',
        learningStyle: 'visual',
        preferences: {
          preferredFormats: ['interactive', 'scenario-based'],
          preferredDuration: 'medium',
          preferredFrequency: 'weekly'
        }
      },
      skillProfile: {
        currentSkills: [
          {
            skillId: 'leadership_001',
            skillName: 'Team Leadership',
            level: 2,
            confidence: 0.6
          },
          {
            skillId: 'comm_001',
            skillName: 'Communication',
            level: 3,
            confidence: 0.8
          }
        ],
        skillGaps: [
          {
            skillId: 'leadership_001',
            skillName: 'Team Leadership',
            currentLevel: 2,
            targetLevel: 4,
            gapSize: 2,
            importance: 'critical'
          }
        ]
      },
      experience: {
        yearsOfExperience: 5,
        previousRoles: ['Junior Developer', 'Developer'],
        industryExperience: 'Technology',
        teamSize: 8
      },
      motivation: {
        learningMotivation: 'career_advancement',
        goals: ['become_team_lead', 'improve_leadership_skills'],
        interests: ['technology', 'leadership', 'team_building']
      },
      learningStyle: {
        primaryStyle: 'visual',
        secondaryStyle: 'kinesthetic',
        preferredContent: ['interactive', 'scenario-based', 'hands-on'],
        preferredAssessment: ['practical', 'scenario_response']
      },
      triggerContext: {
        triggerType: 'skill_gaps_critical',
        urgency: 'high',
        priority: 8,
        sourceModule: 'skills_analysis',
        targetSkills: ['leadership', 'team_management']
      },
      organizationalContext: {
        companyValues: ['Innovation', 'Collaboration', 'Excellence'],
        culture: 'innovative',
        goals: ['growth', 'innovation', 'team_development'],
        industry: 'Technology',
        role: 'Software Engineer',
        team: 'Development Team'
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
      expect(frameworks.gameDesignFrameworks).toBeDefined();
      expect(frameworks.scenarioBasedLearningMethodologies).toBeDefined();
      expect(frameworks.personalizationApproaches).toBeDefined();
      expect(frameworks.narrativeDesignStructures).toBeDefined();
      expect(frameworks.assessmentDesignMethods).toBeDefined();
      expect(frameworks.engagementStrategies).toBeDefined();
    });

    it('should include Game Design Framework', async () => {
      const frameworks = await agent.loadFrameworks();
      
      expect(frameworks.gameDesignFrameworks.gameDesignFramework).toBeDefined();
      expect(frameworks.gameDesignFrameworks.gameDesignFramework.mechanics).toBeDefined();
      expect(frameworks.gameDesignFrameworks.gameDesignFramework.dynamics).toBeDefined();
      expect(frameworks.gameDesignFrameworks.gameDesignFramework.aesthetics).toBeDefined();
    });

    it('should include Serious Games Methodology', async () => {
      const frameworks = await agent.loadFrameworks();
      
      expect(frameworks.gameDesignFrameworks.seriousGamesMethodology).toBeDefined();
      expect(frameworks.gameDesignFrameworks.seriousGamesMethodology.learningObjectives).toBeDefined();
      expect(frameworks.gameDesignFrameworks.seriousGamesMethodology.gameMechanics).toBeDefined();
      expect(frameworks.gameDesignFrameworks.seriousGamesMethodology.assessment).toBeDefined();
    });

    it('should include Gamification Principles', async () => {
      const frameworks = await agent.loadFrameworks();
      
      expect(frameworks.gameDesignFrameworks.gamificationPrinciples).toBeDefined();
      expect(frameworks.gameDesignFrameworks.gamificationPrinciples.points).toBeDefined();
      expect(frameworks.gameDesignFrameworks.gamificationPrinciples.badges).toBeDefined();
      expect(frameworks.gameDesignFrameworks.gamificationPrinciples.leaderboards).toBeDefined();
      expect(frameworks.gameDesignFrameworks.gamificationPrinciples.challenges).toBeDefined();
    });

    it('should include scenario-based learning methodologies', async () => {
      const frameworks = await agent.loadFrameworks();
      
      expect(frameworks.scenarioBasedLearningMethodologies.caseBasedLearning).toBeDefined();
      expect(frameworks.scenarioBasedLearningMethodologies.problemBasedLearning).toBeDefined();
      expect(frameworks.scenarioBasedLearningMethodologies.situatedLearning).toBeDefined();
    });

    it('should include scenario techniques', async () => {
      const frameworks = await agent.loadFrameworks();
      
      expect(frameworks.scenarioBasedLearningMethodologies.techniques.rolePlaying).toBeDefined();
      expect(frameworks.scenarioBasedLearningMethodologies.techniques.simulation).toBeDefined();
      expect(frameworks.scenarioBasedLearningMethodologies.techniques.decisionTrees).toBeDefined();
      expect(frameworks.scenarioBasedLearningMethodologies.techniques.branchingNarratives).toBeDefined();
    });

    it('should include personalization approaches', async () => {
      const frameworks = await agent.loadFrameworks();
      
      expect(frameworks.personalizationApproaches.adaptiveContent).toBeDefined();
      expect(frameworks.personalizationApproaches.adaptiveDifficulty).toBeDefined();
      expect(frameworks.personalizationApproaches.adaptivePacing).toBeDefined();
      expect(frameworks.personalizationApproaches.adaptiveAssessment).toBeDefined();
    });

    it('should include narrative design structures', async () => {
      const frameworks = await agent.loadFrameworks();
      
      expect(frameworks.narrativeDesignStructures.storyArc).toBeDefined();
      expect(frameworks.narrativeDesignStructures.characterDevelopment).toBeDefined();
      expect(frameworks.narrativeDesignStructures.conflictResolution).toBeDefined();
      expect(frameworks.narrativeDesignStructures.branchingNarratives).toBeDefined();
    });

    it('should include assessment design methods', async () => {
      const frameworks = await agent.loadFrameworks();
      
      expect(frameworks.assessmentDesignMethods.embeddedAssessment).toBeDefined();
      expect(frameworks.assessmentDesignMethods.performanceBasedAssessment).toBeDefined();
      expect(frameworks.assessmentDesignMethods.peerAssessment).toBeDefined();
      expect(frameworks.assessmentDesignMethods.selfAssessment).toBeDefined();
    });

    it('should include engagement strategies', async () => {
      const frameworks = await agent.loadFrameworks();
      
      expect(frameworks.engagementStrategies.intrinsicMotivation).toBeDefined();
      expect(frameworks.engagementStrategies.extrinsicMotivation).toBeDefined();
      expect(frameworks.engagementStrategies.socialEngagement).toBeDefined();
      expect(frameworks.engagementStrategies.challengeEngagement).toBeDefined();
    });
  });

  // ============================================================================
  // DATA ENGINE TESTS
  // ============================================================================

  describe('Data Engine', () => {
    it('should process employee data successfully', async () => {
      const knowledgeResult = { output: await agent.loadFrameworks() };
      const dataResult = await agent.processData(mockInputData, knowledgeResult.output);
      
      expect(dataResult).toBeDefined();
      expect(dataResult.employeeProfile).toBeDefined();
      expect(dataResult.learningPreferences).toBeDefined();
      expect(dataResult.skillProfile).toBeDefined();
      expect(dataResult.experience).toBeDefined();
      expect(dataResult.motivation).toBeDefined();
      expect(dataResult.learningStyle).toBeDefined();
    });

    it('should process trigger data correctly', async () => {
      const knowledgeResult = { output: await agent.loadFrameworks() };
      const dataResult = await agent.processData(mockInputData, knowledgeResult.output);
      
      expect(dataResult.triggerData).toBeDefined();
      expect(dataResult.triggerData.triggerType).toBe('skill_gaps_critical');
      expect(dataResult.triggerData.urgency).toBe('high');
      expect(dataResult.triggerData.priority).toBe(8);
      expect(dataResult.triggerData.targetSkills).toEqual(['leadership', 'team_management']);
    });

    it('should process organizational context correctly', async () => {
      const knowledgeResult = { output: await agent.loadFrameworks() };
      const dataResult = await agent.processData(mockInputData, knowledgeResult.output);
      
      expect(dataResult.organizationalContext).toBeDefined();
      expect(dataResult.organizationalContext.culture).toBe('innovative');
      expect(dataResult.organizationalContext.companyValues).toEqual(['Innovation', 'Collaboration', 'Excellence']);
      expect(dataResult.organizationalContext.industry).toBe('Technology');
      expect(dataResult.organizationalContext.role).toBe('Software Engineer');
    });

    it('should calculate personalization factors correctly', async () => {
      const knowledgeResult = { output: await agent.loadFrameworks() };
      const dataResult = await agent.processData(mockInputData, knowledgeResult.output);
      
      expect(dataResult.personalizationFactors).toBeDefined();
      expect(dataResult.personalizationFactors.difficulty).toBeDefined();
      expect(dataResult.personalizationFactors.content).toBeDefined();
      expect(dataResult.personalizationFactors.interaction).toBeDefined();
      expect(dataResult.personalizationFactors.feedback).toBeDefined();
    });

    it('should customize game elements correctly', async () => {
      const knowledgeResult = { output: await agent.loadFrameworks() };
      const dataResult = await agent.processData(mockInputData, knowledgeResult.output);
      
      expect(dataResult.gameCustomization).toBeDefined();
      expect(dataResult.gameCustomization.scenarioRelevance).toBeDefined();
      expect(dataResult.gameCustomization.character).toBeDefined();
      expect(dataResult.gameCustomization.narrative).toBeDefined();
      expect(dataResult.gameCustomization.challenge).toBeDefined();
      expect(dataResult.gameCustomization.duration).toBeDefined();
      expect(dataResult.gameCustomization.assessment).toBeDefined();
    });

    it('should analyze learning preferences correctly', async () => {
      const knowledgeResult = { output: await agent.loadFrameworks() };
      const dataResult = await agent.processData(mockInputData, knowledgeResult.output);
      
      expect(dataResult.learningPreferences.preferredFormats).toEqual(['interactive', 'scenario-based']);
      expect(dataResult.learningPreferences.preferredDuration).toBe('medium');
      expect(dataResult.learningPreferences.preferredFrequency).toBe('weekly');
    });

    it('should analyze skill profile correctly', async () => {
      const knowledgeResult = { output: await agent.loadFrameworks() };
      const dataResult = await agent.processData(mockInputData, knowledgeResult.output);
      
      expect(dataResult.skillProfile.currentSkills).toBeDefined();
      expect(dataResult.skillProfile.currentSkills.length).toBe(2);
      expect(dataResult.skillProfile.skillGaps).toBeDefined();
      expect(dataResult.skillProfile.skillGaps.length).toBe(1);
    });

    it('should analyze experience correctly', async () => {
      const knowledgeResult = { output: await agent.loadFrameworks() };
      const dataResult = await agent.processData(mockInputData, knowledgeResult.output);
      
      expect(dataResult.experience.yearsOfExperience).toBe(5);
      expect(dataResult.experience.previousRoles).toEqual(['Junior Developer', 'Developer']);
      expect(dataResult.experience.industryExperience).toBe('Technology');
      expect(dataResult.experience.teamSize).toBe(8);
    });

    it('should analyze motivation correctly', async () => {
      const knowledgeResult = { output: await agent.loadFrameworks() };
      const dataResult = await agent.processData(mockInputData, knowledgeResult.output);
      
      expect(dataResult.motivation.learningMotivation).toBe('career_advancement');
      expect(dataResult.motivation.goals).toEqual(['become_team_lead', 'improve_leadership_skills']);
      expect(dataResult.motivation.interests).toEqual(['technology', 'leadership', 'team_building']);
    });

    it('should analyze learning style correctly', async () => {
      const knowledgeResult = { output: await agent.loadFrameworks() };
      const dataResult = await agent.processData(mockInputData, knowledgeResult.output);
      
      expect(dataResult.learningStyle.primaryStyle).toBe('visual');
      expect(dataResult.learningStyle.secondaryStyle).toBe('kinesthetic');
      expect(dataResult.learningStyle.preferredContent).toEqual(['interactive', 'scenario-based', 'hands-on']);
      expect(dataResult.learningStyle.preferredAssessment).toEqual(['practical', 'scenario_response']);
    });
  });

  // ============================================================================
  // REASONING ENGINE TESTS
  // ============================================================================

  describe('Reasoning Engine', () => {
    it('should generate scenario game recommendations', async () => {
      const knowledgeResult = { output: await agent.loadFrameworks() };
      const dataResult = await agent.processData(mockInputData, knowledgeResult.output);
      
      const reasoningResult = await agent.buildReasoningPrompt(
        mockInputData,
        knowledgeResult.output,
        dataResult.output
      );
      
      expect(reasoningResult).toBeDefined();
      expect(reasoningResult).toContain('Scenario-Based Game Design');
      expect(reasoningResult).toContain('Input Requirements');
      expect(reasoningResult).toContain('Trigger Context');
      expect(reasoningResult).toContain('Organizational Context');
      expect(reasoningResult).toContain('Knowledge Framework Analysis');
      expect(reasoningResult).toContain('Data Analysis');
    });

    it('should include specific design requirements in reasoning prompt', async () => {
      const knowledgeResult = { output: await agent.loadFrameworks() };
      const dataResult = await agent.processData(mockInputData, knowledgeResult.output);
      
      const reasoningResult = await agent.buildReasoningPrompt(
        mockInputData,
        knowledgeResult.output,
        dataResult.output
      );
      
      expect(reasoningResult).toContain('Scenario Design');
      expect(reasoningResult).toContain('Gameplay Mechanics');
      expect(reasoningResult).toContain('Personalization');
      expect(reasoningResult).toContain('Assessment & Feedback');
      expect(reasoningResult).toContain('Learning Integration');
    });

    it('should parse reasoning output correctly', async () => {
      const mockReasoningOutput = {
        game: {
          title: 'Leadership Challenge: Team Crisis',
          description: 'Navigate through a team crisis scenario to develop leadership skills',
          type: 'scenario-based',
          difficulty: 'intermediate',
          estimatedDuration: 45,
          learningObjectives: [
            'Develop team leadership skills',
            'Practice decision-making under pressure',
            'Improve communication in crisis situations'
          ]
        },
        scenario: {
          title: 'Team Crisis Management',
          description: 'Your team is facing a critical deadline crisis. Lead them through the challenge.',
          situation: 'A major client project is at risk due to technical issues and team conflicts.',
          characters: [
            { name: 'You', role: 'Team Lead', personality: 'decisive' },
            { name: 'Sarah', role: 'Senior Developer', personality: 'analytical' },
            { name: 'Mike', role: 'Junior Developer', personality: 'anxious' }
          ],
          decisions: [
            {
              id: 'decision_001',
              text: 'Call an emergency team meeting',
              consequences: ['Team alignment', 'Time pressure'],
              learningPoints: ['Crisis communication', 'Team coordination']
            }
          ],
          outcomes: [
            {
              id: 'outcome_001',
              description: 'Team successfully resolves crisis',
              feedback: 'Excellent leadership during crisis',
              learningAchieved: ['Crisis management', 'Team leadership']
            }
          ]
        },
        gameplay: {
          mechanics: ['decision-making', 'consequence-tracking', 'skill-progression'],
          progression: 'linear_with_branches',
          feedback: 'immediate',
          assessment: 'embedded'
        },
        personalization: {
          difficulty: 'adaptive',
          content: 'role-relevant',
          interaction: 'preference-based',
          feedback: 'motivation-aligned'
        },
        assessment: {
          type: 'embedded',
          criteria: ['decision_quality', 'leadership_effectiveness', 'communication_skills'],
          feedback: 'immediate',
          scoring: 'competency-based'
        },
        learningIntegration: {
          skills: ['leadership', 'team_management', 'crisis_communication'],
          competencies: ['decision_making', 'team_coordination', 'stress_management'],
          application: 'workplace_scenarios'
        },
        rationale: 'This scenario-based game addresses the critical leadership gap through realistic workplace challenges.',
        confidence: 0.90
      };

      const parsedOutput = agent.parseReasoningOutput(JSON.stringify(mockReasoningOutput));
      
      expect(parsedOutput).toBeDefined();
      expect(parsedOutput.game).toBeDefined();
      expect(parsedOutput.game.title).toBe('Leadership Challenge: Team Crisis');
      expect(parsedOutput.scenario).toBeDefined();
      expect(parsedOutput.scenario.title).toBe('Team Crisis Management');
      expect(parsedOutput.gameplay).toBeDefined();
      expect(parsedOutput.personalization).toBeDefined();
      expect(parsedOutput.assessment).toBeDefined();
      expect(parsedOutput.learningIntegration).toBeDefined();
      expect(parsedOutput.rationale).toBeDefined();
      expect(parsedOutput.confidence).toBe(0.90);
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

    it('should handle invalid employee profile data', async () => {
      const invalidInput = {
        ...mockInputData,
        employeeProfile: 'invalid'
      };
      
      await expect(agent.analyze(invalidInput)).rejects.toThrow();
    });

    it('should handle missing skill profile', async () => {
      const inputWithoutSkillProfile = {
        ...mockInputData,
        skillProfile: undefined
      };
      
      await expect(agent.analyze(inputWithoutSkillProfile)).rejects.toThrow();
    });

    it('should handle missing organizational context', async () => {
      const inputWithoutOrgContext = {
        ...mockInputData,
        organizationalContext: undefined
      };
      
      await expect(agent.analyze(inputWithoutOrgContext)).rejects.toThrow();
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

    it('should handle complex skill profiles efficiently', async () => {
      const complexInput = {
        ...mockInputData,
        skillProfile: {
          currentSkills: Array.from({ length: 50 }, (_, i) => ({
            skillId: `skill_${i}`,
            skillName: `Skill ${i}`,
            level: Math.floor(Math.random() * 5) + 1,
            confidence: Math.random()
          })),
          skillGaps: Array.from({ length: 20 }, (_, i) => ({
            skillId: `gap_${i}`,
            skillName: `Gap ${i}`,
            currentLevel: 2,
            targetLevel: 4,
            gapSize: 2,
            importance: 'important'
          }))
        }
      };
      
      const startTime = Date.now();
      await agent.analyze(complexInput);
      const endTime = Date.now();
      
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  // ============================================================================
  // EDGE CASE TESTS
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty skill gaps correctly', async () => {
      const inputWithoutGaps = {
        ...mockInputData,
        skillProfile: {
          ...mockInputData.skillProfile,
          skillGaps: []
        }
      };
      
      const result = await agent.analyze(inputWithoutGaps);
      expect(result).toBeDefined();
      expect(result.finalOutput).toBeDefined();
    });

    it('should handle beginner experience level correctly', async () => {
      const beginnerInput = {
        ...mockInputData,
        experience: {
          yearsOfExperience: 1,
          previousRoles: ['Intern'],
          industryExperience: 'Technology',
          teamSize: 3
        }
      };
      
      const result = await agent.analyze(beginnerInput);
      expect(result).toBeDefined();
      expect(result.finalOutput).toBeDefined();
    });

    it('should handle expert experience level correctly', async () => {
      const expertInput = {
        ...mockInputData,
        experience: {
          yearsOfExperience: 15,
          previousRoles: ['Senior Developer', 'Tech Lead', 'Engineering Manager'],
          industryExperience: 'Technology',
          teamSize: 20
        }
      };
      
      const result = await agent.analyze(expertInput);
      expect(result).toBeDefined();
      expect(result.finalOutput).toBeDefined();
    });
  });
});
