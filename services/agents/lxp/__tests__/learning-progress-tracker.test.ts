// backend/services/agents/lxp/__tests__/learning-progress-tracker.test.ts
// Task Reference: Module 1 (LXP) - Section 1.6.1 (Unit Tests for AI Agents)

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { LearningProgressTrackerAgent } from '../learning-progress-tracker.js';

// ============================================================================
// TASK 1.6.1: UNIT TESTS FOR LEARNING PROGRESS TRACKER AGENT
// ============================================================================
// Dependencies: 1.2.5-1.2.8 (Learning Progress Tracker Agent) ✅ Complete
// Description: Test AI agent functionality
// Test Coverage:
//   - Progress Tracker agent
//   - Knowledge engine outputs
//   - Data engine processing
//   - Reasoning engine recommendations

describe('LearningProgressTrackerAgent', () => {
  let agent: LearningProgressTrackerAgent;
  let mockInputData: any;

  beforeEach(() => {
    agent = new LearningProgressTrackerAgent();
    
    mockInputData = {
      employeeId: 'emp_001',
      tenantId: 'tenant_001',
      learningPathId: 'path_001',
      currentProgress: {
        overallProgress: 45,
        moduleProgress: {
          'module_001': 80,
          'module_002': 30,
          'module_003': 0
        },
        timeSpent: 180, // minutes
        lastActivity: new Date('2024-01-15T10:30:00Z')
      },
      learningHistory: [
        {
          moduleId: 'module_001',
          moduleTitle: 'Leadership Fundamentals',
          startDate: new Date('2024-01-10T09:00:00Z'),
          completionDate: new Date('2024-01-12T16:30:00Z'),
          timeSpent: 120,
          score: 85,
          activitiesCompleted: ['video_1', 'quiz_1', 'activity_1']
        },
        {
          moduleId: 'module_002',
          moduleTitle: 'Team Management',
          startDate: new Date('2024-01-13T09:00:00Z'),
          completionDate: null,
          timeSpent: 60,
          score: null,
          activitiesCompleted: ['video_2', 'activity_2']
        }
      ],
      assessments: [
        {
          assessmentId: 'assess_001',
          moduleId: 'module_001',
          type: 'quiz',
          score: 85,
          maxScore: 100,
          completedDate: new Date('2024-01-12T16:00:00Z'),
          timeSpent: 15
        },
        {
          assessmentId: 'assess_002',
          moduleId: 'module_002',
          type: 'practical',
          score: 70,
          maxScore: 100,
          completedDate: new Date('2024-01-14T14:30:00Z'),
          timeSpent: 30
        }
      ],
      activities: [
        {
          activityId: 'activity_001',
          moduleId: 'module_001',
          type: 'video',
          duration: 45,
          completed: true,
          completionDate: new Date('2024-01-10T10:00:00Z')
        },
        {
          activityId: 'activity_002',
          moduleId: 'module_001',
          type: 'interactive',
          duration: 30,
          completed: true,
          completionDate: new Date('2024-01-11T11:00:00Z')
        },
        {
          activityId: 'activity_003',
          moduleId: 'module_002',
          type: 'reading',
          duration: 20,
          completed: false,
          completionDate: null
        }
      ],
      learningPath: {
        learningPathId: 'path_001',
        title: 'Leadership Development Program',
        totalModules: 5,
        estimatedDuration: 300, // minutes
        difficulty: 'intermediate',
        targetSkills: ['leadership', 'team_management', 'communication']
      },
      employeeProfile: {
        learningStyle: 'visual',
        preferredPace: 'medium',
        availableTime: 60, // minutes per week
        experience: 'intermediate'
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
      expect(frameworks.learningAnalyticsFrameworks).toBeDefined();
      expect(frameworks.progressTrackingMethodologies).toBeDefined();
      expect(frameworks.interventionStrategies).toBeDefined();
      expect(frameworks.predictiveAnalyticsModels).toBeDefined();
      expect(frameworks.assessmentStrategies).toBeDefined();
    });

    it('should include Kirkpatrick Model in learning analytics frameworks', async () => {
      const frameworks = await agent.loadFrameworks();
      
      expect(frameworks.learningAnalyticsFrameworks.kirkpatrickModel).toBeDefined();
      expect(frameworks.learningAnalyticsFrameworks.kirkpatrickModel.level1).toBeDefined();
      expect(frameworks.learningAnalyticsFrameworks.kirkpatrickModel.level2).toBeDefined();
      expect(frameworks.learningAnalyticsFrameworks.kirkpatrickModel.level3).toBeDefined();
      expect(frameworks.learningAnalyticsFrameworks.kirkpatrickModel.level4).toBeDefined();
    });

    it('should include Learning Analytics Framework', async () => {
      const frameworks = await agent.loadFrameworks();
      
      expect(frameworks.learningAnalyticsFrameworks.learningAnalyticsFramework).toBeDefined();
      expect(frameworks.learningAnalyticsFrameworks.learningAnalyticsFramework.dataCollection).toBeDefined();
      expect(frameworks.learningAnalyticsFrameworks.learningAnalyticsFramework.analysis).toBeDefined();
      expect(frameworks.learningAnalyticsFrameworks.learningAnalyticsFramework.prediction).toBeDefined();
      expect(frameworks.learningAnalyticsFrameworks.learningAnalyticsFramework.intervention).toBeDefined();
    });

    it('should include Engagement Metrics Framework', async () => {
      const frameworks = await agent.loadFrameworks();
      
      expect(frameworks.learningAnalyticsFrameworks.engagementMetricsFramework).toBeDefined();
      expect(frameworks.learningAnalyticsFrameworks.engagementMetricsFramework.behavioralEngagement).toBeDefined();
      expect(frameworks.learningAnalyticsFrameworks.engagementMetricsFramework.emotionalEngagement).toBeDefined();
      expect(frameworks.learningAnalyticsFrameworks.engagementMetricsFramework.cognitiveEngagement).toBeDefined();
    });

    it('should include progress tracking methodologies', async () => {
      const frameworks = await agent.loadFrameworks();
      
      expect(frameworks.progressTrackingMethodologies.completionTracking).toBeDefined();
      expect(frameworks.progressTrackingMethodologies.timeTracking).toBeDefined();
      expect(frameworks.progressTrackingMethodologies.performanceTracking).toBeDefined();
      expect(frameworks.progressTrackingMethodologies.engagementTracking).toBeDefined();
    });

    it('should include intervention strategies', async () => {
      const frameworks = await agent.loadFrameworks();
      
      expect(frameworks.interventionStrategies.earlyWarning).toBeDefined();
      expect(frameworks.interventionStrategies.personalizedSupport).toBeDefined();
      expect(frameworks.interventionStrategies.adaptiveContent).toBeDefined();
      expect(frameworks.interventionStrategies.peerSupport).toBeDefined();
    });

    it('should include predictive analytics models', async () => {
      const frameworks = await agent.loadFrameworks();
      
      expect(frameworks.predictiveAnalyticsModels.completionPrediction).toBeDefined();
      expect(frameworks.predictiveAnalyticsModels.performancePrediction).toBeDefined();
      expect(frameworks.predictiveAnalyticsModels.engagementPrediction).toBeDefined();
      expect(frameworks.predictiveAnalyticsModels.riskPrediction).toBeDefined();
    });
  });

  // ============================================================================
  // DATA ENGINE TESTS
  // ============================================================================

  describe('Data Engine', () => {
    it('should process progress data successfully', async () => {
      const knowledgeResult = { output: await agent.loadFrameworks() };
      const dataResult = await agent.processData(mockInputData, knowledgeResult.output);
      
      expect(dataResult).toBeDefined();
      expect(dataResult.progressMetrics).toBeDefined();
      expect(dataResult.skillDevelopment).toBeDefined();
      expect(dataResult.timeEfficiency).toBeDefined();
      expect(dataResult.performanceTrends).toBeDefined();
      expect(dataResult.engagement).toBeDefined();
      expect(dataResult.learningVelocity).toBeDefined();
      expect(dataResult.riskFactors).toBeDefined();
      expect(dataResult.predictiveIndicators).toBeDefined();
    });

    it('should calculate progress metrics correctly', async () => {
      const knowledgeResult = { output: await agent.loadFrameworks() };
      const dataResult = await agent.processData(mockInputData, knowledgeResult.output);
      
      expect(dataResult.progressMetrics.overallProgress).toBe(45);
      expect(dataResult.progressMetrics.completionRate).toBeDefined();
      expect(dataResult.progressMetrics.averageScore).toBeDefined();
      expect(dataResult.progressMetrics.timeOnTask).toBeDefined();
    });

    it('should analyze skill development correctly', async () => {
      const knowledgeResult = { output: await agent.loadFrameworks() };
      const dataResult = await agent.processData(mockInputData, knowledgeResult.output);
      
      expect(dataResult.skillDevelopment.skillsImproved).toBeDefined();
      expect(dataResult.skillDevelopment.improvementRate).toBeDefined();
      expect(dataResult.skillDevelopment.skillGaps).toBeDefined();
      expect(dataResult.skillDevelopment.competencyLevel).toBeDefined();
    });

    it('should calculate time efficiency correctly', async () => {
      const knowledgeResult = { output: await agent.loadFrameworks() };
      const dataResult = await agent.processData(mockInputData, knowledgeResult.output);
      
      expect(dataResult.timeEfficiency.actualTimeSpent).toBe(180);
      expect(dataResult.timeEfficiency.estimatedTime).toBeDefined();
      expect(dataResult.timeEfficiency.efficiencyRatio).toBeDefined();
      expect(dataResult.timeEfficiency.timePerModule).toBeDefined();
    });

    it('should analyze performance trends correctly', async () => {
      const knowledgeResult = { output: await agent.loadFrameworks() };
      const dataResult = await agent.processData(mockInputData, knowledgeResult.output);
      
      expect(dataResult.performanceTrends.scoreTrend).toBeDefined();
      expect(dataResult.performanceTrends.improvementRate).toBeDefined();
      expect(dataResult.performanceTrends.consistency).toBeDefined();
      expect(dataResult.performanceTrends.peakPerformance).toBeDefined();
    });

    it('should measure engagement correctly', async () => {
      const knowledgeResult = { output: await agent.loadFrameworks() };
      const dataResult = await agent.processData(mockInputData, knowledgeResult.output);
      
      expect(dataResult.engagement.overallEngagement).toBeDefined();
      expect(dataResult.engagement.activityEngagement).toBeDefined();
      expect(dataResult.engagement.assessmentEngagement).toBeDefined();
      expect(dataResult.engagement.timeEngagement).toBeDefined();
    });

    it('should calculate learning velocity correctly', async () => {
      const knowledgeResult = { output: await agent.loadFrameworks() };
      const dataResult = await agent.processData(mockInputData, knowledgeResult.output);
      
      expect(dataResult.learningVelocity.velocity).toBeDefined();
      expect(dataResult.learningVelocity.acceleration).toBeDefined();
      expect(dataResult.learningVelocity.consistency).toBeDefined();
      expect(dataResult.learningVelocity.predictedCompletion).toBeDefined();
    });

    it('should identify risk factors correctly', async () => {
      const knowledgeResult = { output: await agent.loadFrameworks() };
      const dataResult = await agent.processData(mockInputData, knowledgeResult.output);
      
      expect(dataResult.riskFactors.riskLevel).toBeDefined();
      expect(dataResult.riskFactors.riskFactors).toBeDefined();
      expect(dataResult.riskFactors.earlyWarningSigns).toBeDefined();
      expect(dataResult.riskFactors.interventionNeeded).toBeDefined();
    });

    it('should generate predictive indicators correctly', async () => {
      const knowledgeResult = { output: await agent.loadFrameworks() };
      const dataResult = await agent.processData(mockInputData, knowledgeResult.output);
      
      expect(dataResult.predictiveIndicators.completionProbability).toBeDefined();
      expect(dataResult.predictiveIndicators.performancePrediction).toBeDefined();
      expect(dataResult.predictiveIndicators.engagementPrediction).toBeDefined();
      expect(dataResult.predictiveIndicators.successProbability).toBeDefined();
    });
  });

  // ============================================================================
  // REASONING ENGINE TESTS
  // ============================================================================

  describe('Reasoning Engine', () => {
    it('should generate progress analysis recommendations', async () => {
      const knowledgeResult = { output: await agent.loadFrameworks() };
      const dataResult = await agent.processData(mockInputData, knowledgeResult.output);
      
      const reasoningResult = await agent.buildReasoningPrompt(
        mockInputData,
        knowledgeResult.output,
        dataResult.output
      );
      
      expect(reasoningResult).toBeDefined();
      expect(reasoningResult).toContain('Progress Analysis');
      expect(reasoningResult).toContain('Knowledge Framework Analysis');
      expect(reasoningResult).toContain('Data Analysis');
      expect(reasoningResult).toContain('Insights');
      expect(reasoningResult).toContain('Interventions');
      expect(reasoningResult).toContain('Predictions');
    });

    it('should include specific analysis requirements in reasoning prompt', async () => {
      const knowledgeResult = { output: await agent.loadFrameworks() };
      const dataResult = await agent.processData(mockInputData, knowledgeResult.output);
      
      const reasoningResult = await agent.buildReasoningPrompt(
        mockInputData,
        knowledgeResult.output,
        dataResult.output
      );
      
      expect(reasoningResult).toContain('Progress Analysis');
      expect(reasoningResult).toContain('Insights');
      expect(reasoningResult).toContain('Interventions');
      expect(reasoningResult).toContain('Predictions');
      expect(reasoningResult).toContain('Recommendations');
    });

    it('should parse reasoning output correctly', async () => {
      const mockReasoningOutput = {
        progressAnalysis: {
          overallProgress: 45,
          progressRate: 'moderate',
          completionPrediction: 'on_track',
          riskLevel: 'low'
        },
        insights: [
          'Employee is progressing at a steady pace',
          'Strong performance in completed modules',
          'Good engagement with interactive content'
        ],
        interventions: [
          {
            type: 'encouragement',
            priority: 'medium',
            description: 'Provide positive feedback on progress'
          }
        ],
        predictions: {
          completionDate: '2024-02-15',
          finalScore: 82,
          successProbability: 0.85
        },
        recommendations: [
          'Continue current learning pace',
          'Focus on upcoming challenging modules',
          'Maintain regular study schedule'
        ],
        confidence: 0.80
      };

      const parsedOutput = agent.parseReasoningOutput(JSON.stringify(mockReasoningOutput));
      
      expect(parsedOutput).toBeDefined();
      expect(parsedOutput.progressAnalysis).toBeDefined();
      expect(parsedOutput.progressAnalysis.overallProgress).toBe(45);
      expect(parsedOutput.insights).toBeDefined();
      expect(parsedOutput.insights.length).toBe(3);
      expect(parsedOutput.interventions).toBeDefined();
      expect(parsedOutput.interventions.length).toBe(1);
      expect(parsedOutput.predictions).toBeDefined();
      expect(parsedOutput.recommendations).toBeDefined();
      expect(parsedOutput.confidence).toBe(0.80);
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

    it('should handle invalid progress data', async () => {
      const invalidInput = {
        ...mockInputData,
        currentProgress: 'invalid'
      };
      
      await expect(agent.analyze(invalidInput)).rejects.toThrow();
    });

    it('should handle missing learning history', async () => {
      const inputWithoutHistory = {
        ...mockInputData,
        learningHistory: undefined
      };
      
      await expect(agent.analyze(inputWithoutHistory)).rejects.toThrow();
    });

    it('should handle empty assessments array', async () => {
      const inputWithoutAssessments = {
        ...mockInputData,
        assessments: []
      };
      
      const result = await agent.analyze(inputWithoutAssessments);
      expect(result).toBeDefined();
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

    it('should handle large learning history efficiently', async () => {
      const largeInput = {
        ...mockInputData,
        learningHistory: Array.from({ length: 100 }, (_, i) => ({
          moduleId: `module_${i}`,
          moduleTitle: `Module ${i}`,
          startDate: new Date(),
          completionDate: new Date(),
          timeSpent: 60,
          score: 80,
          activitiesCompleted: ['activity_1', 'activity_2']
        }))
      };
      
      const startTime = Date.now();
      await agent.analyze(largeInput);
      const endTime = Date.now();
      
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  // ============================================================================
  // EDGE CASE TESTS
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle zero progress correctly', async () => {
      const zeroProgressInput = {
        ...mockInputData,
        currentProgress: {
          overallProgress: 0,
          moduleProgress: {},
          timeSpent: 0,
          lastActivity: new Date()
        }
      };
      
      const result = await agent.analyze(zeroProgressInput);
      expect(result).toBeDefined();
      expect(result.finalOutput).toBeDefined();
    });

    it('should handle 100% progress correctly', async () => {
      const completeProgressInput = {
        ...mockInputData,
        currentProgress: {
          overallProgress: 100,
          moduleProgress: {
            'module_001': 100,
            'module_002': 100,
            'module_003': 100
          },
          timeSpent: 300,
          lastActivity: new Date()
        }
      };
      
      const result = await agent.analyze(completeProgressInput);
      expect(result).toBeDefined();
      expect(result.finalOutput).toBeDefined();
    });

    it('should handle missing module progress data', async () => {
      const inputWithoutModuleProgress = {
        ...mockInputData,
        currentProgress: {
          overallProgress: 45,
          moduleProgress: {},
          timeSpent: 180,
          lastActivity: new Date()
        }
      };
      
      const result = await agent.analyze(inputWithoutModuleProgress);
      expect(result).toBeDefined();
    });
  });
});
