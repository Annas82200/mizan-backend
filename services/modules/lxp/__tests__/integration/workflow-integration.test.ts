/**
 * LXP Workflow Integration Tests
 * 
 * Comprehensive integration tests for all LXP workflows:
 * - Learning Path Creation Workflow
 * - Progress Tracking Workflow  
 * - Course Completion Handler
 * - Assessment Engine
 * 
 * These tests verify end-to-end workflow functionality,
 * data flow between components, and integration with AI agents.
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { LXPOrchestrator } from '../../core/lxp-orchestrator.js';
import LearningPathCreationWorkflow from '../../workflows/learning-path-creation.js';
import ProgressTrackingWorkflow from '../../workflows/progress-tracking.js';
import CourseCompletionHandler from '../../workflows/course-completion.js';
import AssessmentEngine from '../../workflows/assessment-engine.js';
import { LXPTriggerContext, LXPWorkflowResult } from '../../core/lxp-orchestrator.js';

// Mock AI agents
jest.mock('../../../agents/lxp/learning-path-designer.js');
jest.mock('../../../agents/lxp/learning-progress-tracker.js');
jest.mock('../../../agents/lxp/scenario-game-engine.js');

describe('LXP Workflow Integration Tests', () => {
  let orchestrator: LXPOrchestrator;
  let learningPathWorkflow: LearningPathCreationWorkflow;
  let progressTrackingWorkflow: ProgressTrackingWorkflow;
  let courseCompletionHandler: CourseCompletionHandler;
  let assessmentEngine: AssessmentEngine;

  beforeEach(() => {
    // Initialize orchestrator and workflows
    orchestrator = new LXPOrchestrator();
    learningPathWorkflow = new LearningPathCreationWorkflow();
    progressTrackingWorkflow = new ProgressTrackingWorkflow();
    courseCompletionHandler = new CourseCompletionHandler();
    assessmentEngine = new AssessmentEngine();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // LEARNING PATH CREATION WORKFLOW INTEGRATION TESTS
  // ============================================================================

  describe('Learning Path Creation Workflow Integration', () => {
    test('should execute complete learning path creation workflow', async () => {
      const triggerContext: LXPTriggerContext = {
        triggerType: 'skill_gaps_critical',
        employeeId: 'emp_001',
        tenantId: 'tenant_001',
        data: {
          skillGaps: ['leadership', 'communication'],
          currentSkills: ['technical', 'problem-solving'],
          learningPreferences: {
            format: 'interactive',
            duration: 'medium',
            difficulty: 'intermediate'
          },
          organizationalContext: {
            industry: 'technology',
            role: 'senior-developer',
            team: 'engineering'
          }
        },
        urgency: 'high',
        priority: 'high',
        metadata: {
          source: 'skills_analysis',
          timestamp: new Date().toISOString()
        }
      };

      const result = await learningPathWorkflow.executeWorkflow(triggerContext);

      // Verify workflow execution
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.workflowType).toBe('learning_path_creation');
      expect(result.confidence).toBeGreaterThan(0.7);

      // Verify learning path creation
      expect(result.data.learningPath).toBeDefined();
      expect(result.data.learningPath.id).toBeDefined();
      expect(result.data.learningPath.title).toBeDefined();
      expect(result.data.learningPath.courses).toBeInstanceOf(Array);
      expect(result.data.learningPath.courses.length).toBeGreaterThan(0);

      // Verify scenario games generation
      expect(result.data.scenarioGames).toBeDefined();
      expect(result.data.scenarioGames.length).toBeGreaterThan(0);

      // Verify progress tracking setup
      expect(result.data.progressTracking).toBeDefined();
      expect(result.data.progressTracking.metrics).toBeDefined();
      expect(result.data.progressTracking.milestones).toBeInstanceOf(Array);

      // Verify assessment framework
      expect(result.data.assessmentFramework).toBeDefined();
      expect(result.data.assessmentFramework.criteria).toBeDefined();
      expect(result.data.assessmentFramework.methods).toBeInstanceOf(Array);

      // Verify next actions
      expect(result.nextActions).toBeInstanceOf(Array);
      expect(result.nextActions.length).toBeGreaterThan(0);

      // Verify output triggers
      expect(result.triggers).toBeInstanceOf(Array);
    });

    test('should handle skill gap trigger with culture learning needs', async () => {
      const triggerContext: LXPTriggerContext = {
        triggerType: 'culture_learning_needed',
        employeeId: 'emp_002',
        tenantId: 'tenant_001',
        data: {
          cultureGaps: ['collaboration', 'innovation'],
          currentValues: ['integrity', 'excellence'],
          learningNeeds: {
            focus: 'culture_alignment',
            urgency: 'medium',
            approach: 'experiential'
          },
          organizationalContext: {
            culture: 'innovative',
            values: ['collaboration', 'innovation', 'integrity'],
            mission: 'driving innovation through collaboration'
          }
        },
        urgency: 'medium',
        priority: 'medium'
      };

      const result = await learningPathWorkflow.executeWorkflow(triggerContext);

      expect(result.success).toBe(true);
      expect(result.data.learningPath.focus).toBe('culture_alignment');
      expect(result.data.scenarioGames[0].scenarioType).toBe('culture_simulation');
    });

    test('should handle performance improvement trigger', async () => {
      const triggerContext: LXPTriggerContext = {
        triggerType: 'performance_improvement_lxp',
        employeeId: 'emp_003',
        tenantId: 'tenant_001',
        data: {
          performanceGaps: ['time_management', 'communication'],
          currentPerformance: 75,
          targetPerformance: 90,
          improvementAreas: ['productivity', 'collaboration'],
          learningObjectives: {
            primary: 'improve_time_management',
            secondary: 'enhance_communication_skills'
          }
        },
        urgency: 'high',
        priority: 'high'
      };

      const result = await learningPathWorkflow.executeWorkflow(triggerContext);

      expect(result.success).toBe(true);
      expect(result.data.learningPath.focus).toBe('performance_improvement');
      expect(result.data.learningPath.courses.some(course => 
        course.skills.includes('time_management')
      )).toBe(true);
    });

    test('should handle compliance training trigger', async () => {
      const triggerContext: LXPTriggerContext = {
        triggerType: 'compliance_training_due',
        employeeId: 'emp_004',
        tenantId: 'tenant_001',
        data: {
          complianceRequirements: ['safety', 'data_protection'],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          regulatoryFramework: 'GDPR',
          trainingType: 'mandatory',
          completionDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
        },
        urgency: 'high',
        priority: 'high'
      };

      const result = await learningPathWorkflow.executeWorkflow(triggerContext);

      expect(result.success).toBe(true);
      expect(result.data.learningPath.type).toBe('compliance');
      expect(result.data.learningPath.courses.some(course => 
        course.category === 'compliance'
      )).toBe(true);
    });
  });

  // ============================================================================
  // PROGRESS TRACKING WORKFLOW INTEGRATION TESTS
  // ============================================================================

  describe('Progress Tracking Workflow Integration', () => {
    test('should execute complete progress tracking workflow', async () => {
      const triggerContext: LXPTriggerContext = {
        triggerType: 'progress_tracking',
        employeeId: 'emp_001',
        tenantId: 'tenant_001',
        data: {
          learningPathId: 'lp_001',
          currentProgress: {
            completedCourses: 3,
            totalCourses: 8,
            timeSpent: 120, // minutes
            lastActivity: new Date().toISOString()
          },
          performanceData: {
            quizScores: [85, 90, 78],
            assignmentScores: [88, 92],
            engagementMetrics: {
              loginFrequency: 5,
              sessionDuration: 25,
              interactionRate: 0.8
            }
          }
        },
        urgency: 'medium',
        priority: 'medium'
      };

      const result = await progressTrackingWorkflow.executeWorkflow(triggerContext);

      // Verify workflow execution
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.workflowType).toBe('progress_tracking');
      expect(result.confidence).toBeGreaterThan(0.7);

      // Verify progress analysis
      expect(result.data.progressAnalysis).toBeDefined();
      expect(result.data.progressAnalysis.overallProgress).toBeDefined();
      expect(result.data.progressAnalysis.skillDevelopment).toBeDefined();
      expect(result.data.progressAnalysis.timeEfficiency).toBeDefined();
      expect(result.data.progressAnalysis.performanceTrends).toBeDefined();

      // Verify insights and recommendations
      expect(result.data.insights).toBeInstanceOf(Array);
      expect(result.data.recommendations).toBeInstanceOf(Array);
      expect(result.data.interventions).toBeInstanceOf(Array);

      // Verify predictions
      expect(result.data.predictions).toBeDefined();
      expect(result.data.predictions.completionTime).toBeDefined();
      expect(result.data.predictions.successProbability).toBeDefined();
      expect(result.data.predictions.riskFactors).toBeInstanceOf(Array);

      // Verify next actions
      expect(result.nextActions).toBeInstanceOf(Array);
      expect(result.triggers).toBeInstanceOf(Array);
    });

    test('should detect at-risk learners and recommend interventions', async () => {
      const triggerContext: LXPTriggerContext = {
        triggerType: 'progress_tracking',
        employeeId: 'emp_002',
        tenantId: 'tenant_001',
        data: {
          learningPathId: 'lp_002',
          currentProgress: {
            completedCourses: 1,
            totalCourses: 6,
            timeSpent: 30,
            lastActivity: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          },
          performanceData: {
            quizScores: [45, 50],
            assignmentScores: [40],
            engagementMetrics: {
              loginFrequency: 1,
              sessionDuration: 10,
              interactionRate: 0.3
            }
          }
        },
        urgency: 'high',
        priority: 'high'
      };

      const result = await progressTrackingWorkflow.executeWorkflow(triggerContext);

      expect(result.success).toBe(true);
      expect(result.data.predictions.riskFactors.length).toBeGreaterThan(0);
      expect(result.data.interventions.some(intervention => 
        intervention.type === 'support' || intervention.type === 'motivation'
      )).toBe(true);
    });

    test('should identify high performers and recommend acceleration', async () => {
      const triggerContext: LXPTriggerContext = {
        triggerType: 'progress_tracking',
        employeeId: 'emp_003',
        tenantId: 'tenant_001',
        data: {
          learningPathId: 'lp_003',
          currentProgress: {
            completedCourses: 5,
            totalCourses: 6,
            timeSpent: 90,
            lastActivity: new Date().toISOString()
          },
          performanceData: {
            quizScores: [95, 98, 92, 96, 94],
            assignmentScores: [97, 95, 93],
            engagementMetrics: {
              loginFrequency: 8,
              sessionDuration: 35,
              interactionRate: 0.95
            }
          }
        },
        urgency: 'low',
        priority: 'medium'
      };

      const result = await progressTrackingWorkflow.executeWorkflow(triggerContext);

      expect(result.success).toBe(true);
      expect(result.data.predictions.successProbability).toBeGreaterThan(0.9);
      expect(result.data.recommendations.some(rec => 
        rec.type === 'acceleration' || rec.type === 'advanced_content'
      )).toBe(true);
    });
  });

  // ============================================================================
  // COURSE COMPLETION HANDLER INTEGRATION TESTS
  // ============================================================================

  describe('Course Completion Handler Integration', () => {
    test('should execute complete course completion workflow', async () => {
      const triggerContext: LXPTriggerContext = {
        triggerType: 'lxp_training_completion',
        employeeId: 'emp_001',
        tenantId: 'tenant_001',
        data: {
          courseId: 'course_001',
          learningPathId: 'lp_001',
          completionData: {
            completionDate: new Date().toISOString(),
            timeSpent: 120,
            finalScore: 88,
            attempts: 1,
            lastActivity: new Date().toISOString()
          },
          assessmentResults: {
            quizScore: 88,
            assignmentScore: 90,
            practicalScore: 85,
            overallScore: 88
          },
          learningOutcomes: {
            skillsAcquired: ['leadership', 'communication'],
            knowledgeGained: ['management_principles', 'team_dynamics'],
            competencies: ['team_leadership', 'conflict_resolution']
          }
        },
        urgency: 'medium',
        priority: 'medium'
      };

      const result = await courseCompletionHandler.executeHandler(triggerContext);

      // Verify workflow execution
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.workflowType).toBe('course_completion');
      expect(result.confidence).toBeGreaterThan(0.7);

      // Verify completion validation
      expect(result.data.completionValidation).toBeDefined();
      expect(result.data.completionValidation.isValid).toBe(true);
      expect(result.data.completionValidation.requirementsMet).toBe(true);

      // Verify learning outcomes assessment
      expect(result.data.learningOutcomes).toBeDefined();
      expect(result.data.learningOutcomes.effectiveness).toBeDefined();
      expect(result.data.learningOutcomes.skillAcquisition).toBeDefined();
      expect(result.data.learningOutcomes.knowledgeRetention).toBeDefined();

      // Verify record updates
      expect(result.data.recordUpdates).toBeDefined();
      expect(result.data.recordUpdates.employeeProfile).toBeDefined();
      expect(result.data.recordUpdates.learningHistory).toBeDefined();
      expect(result.data.recordUpdates.skillProfile).toBeDefined();

      // Verify certification
      expect(result.data.certification).toBeDefined();
      expect(result.data.certification.issued).toBe(true);
      expect(result.data.certification.certificateId).toBeDefined();

      // Verify next actions
      expect(result.nextActions).toBeInstanceOf(Array);
      expect(result.triggers).toBeInstanceOf(Array);
    });

    test('should handle incomplete course completion', async () => {
      const triggerContext: LXPTriggerContext = {
        triggerType: 'lxp_training_completion',
        employeeId: 'emp_002',
        tenantId: 'tenant_001',
        data: {
          courseId: 'course_002',
          learningPathId: 'lp_002',
          completionData: {
            completionDate: new Date().toISOString(),
            timeSpent: 60,
            finalScore: 45,
            attempts: 3,
            lastActivity: new Date().toISOString()
          },
          assessmentResults: {
            quizScore: 45,
            assignmentScore: 50,
            practicalScore: 40,
            overallScore: 45
          },
          learningOutcomes: {
            skillsAcquired: [],
            knowledgeGained: ['basic_concepts'],
            competencies: []
          }
        },
        urgency: 'high',
        priority: 'high'
      };

      const result = await courseCompletionHandler.executeHandler(triggerContext);

      expect(result.success).toBe(true);
      expect(result.data.completionValidation.isValid).toBe(false);
      expect(result.data.completionValidation.requirementsMet).toBe(false);
      expect(result.nextActions.some(action => 
        action.type === 'retake_course' || action.type === 'additional_support'
      )).toBe(true);
    });

    test('should handle certification renewal completion', async () => {
      const triggerContext: LXPTriggerContext = {
        triggerType: 'certification_expiring',
        employeeId: 'emp_003',
        tenantId: 'tenant_001',
        data: {
          courseId: 'cert_renewal_001',
          learningPathId: 'lp_cert_001',
          completionData: {
            completionDate: new Date().toISOString(),
            timeSpent: 180,
            finalScore: 92,
            attempts: 1,
            lastActivity: new Date().toISOString()
          },
          assessmentResults: {
            quizScore: 92,
            assignmentScore: 95,
            practicalScore: 90,
            overallScore: 92
          },
          learningOutcomes: {
            skillsAcquired: ['updated_regulations', 'new_procedures'],
            knowledgeGained: ['regulatory_changes', 'best_practices'],
            competencies: ['compliance_management', 'risk_assessment']
          },
          certificationContext: {
            previousCertification: 'cert_001',
            renewalType: 'mandatory',
            validityPeriod: 24 // months
          }
        },
        urgency: 'high',
        priority: 'high'
      };

      const result = await courseCompletionHandler.executeHandler(triggerContext);

      expect(result.success).toBe(true);
      expect(result.data.certification.renewed).toBe(true);
      expect(result.data.certification.validityPeriod).toBe(24);
      expect(result.data.recordUpdates.certificationHistory).toBeDefined();
    });
  });

  // ============================================================================
  // ASSESSMENT ENGINE INTEGRATION TESTS
  // ============================================================================

  describe('Assessment Engine Integration', () => {
    test('should execute complete assessment workflow', async () => {
      const triggerContext: LXPTriggerContext = {
        triggerType: 'assessment',
        employeeId: 'emp_001',
        tenantId: 'tenant_001',
        data: {
          courseId: 'course_001',
          assessmentType: 'comprehensive',
          learningObjectives: [
            'understand_leadership_principles',
            'apply_communication_techniques',
            'demonstrate_team_management'
          ],
          assessmentData: {
            quizResponses: [
              { questionId: 'q1', answer: 'A', timeSpent: 30 },
              { questionId: 'q2', answer: 'B', timeSpent: 45 },
              { questionId: 'q3', answer: 'C', timeSpent: 60 }
            ],
            assignmentSubmissions: [
              { assignmentId: 'a1', content: 'leadership_analysis', score: 0 },
              { assignmentId: 'a2', content: 'communication_plan', score: 0 }
            ],
            practicalExercises: [
              { exerciseId: 'e1', performance: 'excellent', score: 0 },
              { exerciseId: 'e2', performance: 'good', score: 0 }
            ]
          }
        },
        urgency: 'medium',
        priority: 'medium'
      };

      const result = await assessmentEngine.executeAssessment(triggerContext);

      // Verify workflow execution
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.workflowType).toBe('assessment');
      expect(result.confidence).toBeGreaterThan(0.7);

      // Verify assessment design
      expect(result.data.assessmentDesign).toBeDefined();
      expect(result.data.assessmentDesign.criteria).toBeDefined();
      expect(result.data.assessmentDesign.methods).toBeInstanceOf(Array);
      expect(result.data.assessmentDesign.scoring).toBeDefined();

      // Verify assessment administration
      expect(result.data.assessmentAdministration).toBeDefined();
      expect(result.data.assessmentAdministration.status).toBe('completed');
      expect(result.data.assessmentAdministration.duration).toBeDefined();

      // Verify scoring and analysis
      expect(result.data.scoringAnalysis).toBeDefined();
      expect(result.data.scoringAnalysis.overallScore).toBeDefined();
      expect(result.data.scoringAnalysis.sectionScores).toBeDefined();
      expect(result.data.scoringAnalysis.competencyScores).toBeDefined();

      // Verify feedback and recommendations
      expect(result.data.feedbackRecommendations).toBeDefined();
      expect(result.data.feedbackRecommendations.personalizedFeedback).toBeDefined();
      expect(result.data.feedbackRecommendations.improvementAreas).toBeInstanceOf(Array);
      expect(result.data.feedbackRecommendations.nextSteps).toBeInstanceOf(Array);

      // Verify record updates
      expect(result.data.recordUpdates).toBeDefined();
      expect(result.data.recordUpdates.assessmentResults).toBeDefined();
      expect(result.data.recordUpdates.learningRecords).toBeDefined();

      // Verify next actions
      expect(result.nextActions).toBeInstanceOf(Array);
      expect(result.triggers).toBeInstanceOf(Array);
    });

    test('should handle adaptive assessment workflow', async () => {
      const triggerContext: LXPTriggerContext = {
        triggerType: 'assessment',
        employeeId: 'emp_002',
        tenantId: 'tenant_001',
        data: {
          courseId: 'course_002',
          assessmentType: 'adaptive',
          learningObjectives: [
            'master_technical_skills',
            'apply_problem_solving',
            'demonstrate_innovation'
          ],
          assessmentData: {
            adaptiveResponses: [
              { questionId: 'q1', answer: 'A', difficulty: 'easy', timeSpent: 20 },
              { questionId: 'q2', answer: 'C', difficulty: 'medium', timeSpent: 45 },
              { questionId: 'q3', answer: 'B', difficulty: 'hard', timeSpent: 90 }
            ],
            performanceData: {
              accuracy: 0.85,
              speed: 0.7,
              consistency: 0.9
            }
          }
        },
        urgency: 'medium',
        priority: 'medium'
      };

      const result = await assessmentEngine.executeAssessment(triggerContext);

      expect(result.success).toBe(true);
      expect(result.data.assessmentDesign.type).toBe('adaptive');
      expect(result.data.scoringAnalysis.adaptiveScore).toBeDefined();
      expect(result.data.feedbackRecommendations.adaptiveFeedback).toBeDefined();
    });

    test('should handle peer assessment workflow', async () => {
      const triggerContext: LXPTriggerContext = {
        triggerType: 'assessment',
        employeeId: 'emp_003',
        tenantId: 'tenant_001',
        data: {
          courseId: 'course_003',
          assessmentType: 'peer_review',
          learningObjectives: [
            'collaborate_effectively',
            'provide_constructive_feedback',
            'receive_feedback_gracefully'
          ],
          assessmentData: {
            peerReviews: [
              { reviewerId: 'emp_004', rating: 4, feedback: 'excellent_collaboration' },
              { reviewerId: 'emp_005', rating: 5, feedback: 'great_leadership' },
              { reviewerId: 'emp_006', rating: 4, feedback: 'good_communication' }
            ],
            selfAssessment: {
              rating: 4,
              reflection: 'learned_a_lot_about_teamwork'
            }
          }
        },
        urgency: 'low',
        priority: 'low'
      };

      const result = await assessmentEngine.executeAssessment(triggerContext);

      expect(result.success).toBe(true);
      expect(result.data.assessmentDesign.type).toBe('peer_review');
      expect(result.data.scoringAnalysis.peerScore).toBeDefined();
      expect(result.data.feedbackRecommendations.peerFeedback).toBeDefined();
    });
  });

  // ============================================================================
  // END-TO-END WORKFLOW INTEGRATION TESTS
  // ============================================================================

  describe('End-to-End Workflow Integration', () => {
    test('should execute complete learning journey from creation to completion', async () => {
      // Step 1: Create learning path
      const creationContext: LXPTriggerContext = {
        triggerType: 'skill_gaps_critical',
        employeeId: 'emp_001',
        tenantId: 'tenant_001',
        data: {
          skillGaps: ['leadership', 'communication'],
          currentSkills: ['technical'],
          learningPreferences: { format: 'interactive', duration: 'medium' }
        },
        urgency: 'high',
        priority: 'high'
      };

      const creationResult = await learningPathWorkflow.executeWorkflow(creationContext);
      expect(creationResult.success).toBe(true);

      // Step 2: Track progress
      const progressContext: LXPTriggerContext = {
        triggerType: 'progress_tracking',
        employeeId: 'emp_001',
        tenantId: 'tenant_001',
        data: {
          learningPathId: creationResult.data.learningPath.id,
          currentProgress: {
            completedCourses: 2,
            totalCourses: 5,
            timeSpent: 90,
            lastActivity: new Date().toISOString()
          },
          performanceData: {
            quizScores: [85, 90],
            engagementMetrics: { loginFrequency: 4, sessionDuration: 30, interactionRate: 0.8 }
          }
        },
        urgency: 'medium',
        priority: 'medium'
      };

      const progressResult = await progressTrackingWorkflow.executeWorkflow(progressContext);
      expect(progressResult.success).toBe(true);

      // Step 3: Complete course
      const completionContext: LXPTriggerContext = {
        triggerType: 'lxp_training_completion',
        employeeId: 'emp_001',
        tenantId: 'tenant_001',
        data: {
          courseId: creationResult.data.learningPath.courses[0].id,
          learningPathId: creationResult.data.learningPath.id,
          completionData: {
            completionDate: new Date().toISOString(),
            timeSpent: 120,
            finalScore: 88,
            attempts: 1
          },
          assessmentResults: {
            quizScore: 88,
            assignmentScore: 90,
            overallScore: 88
          },
          learningOutcomes: {
            skillsAcquired: ['leadership'],
            knowledgeGained: ['management_principles']
          }
        },
        urgency: 'medium',
        priority: 'medium'
      };

      const completionResult = await courseCompletionHandler.executeHandler(completionContext);
      expect(completionResult.success).toBe(true);

      // Step 4: Conduct assessment
      const assessmentContext: LXPTriggerContext = {
        triggerType: 'assessment',
        employeeId: 'emp_001',
        tenantId: 'tenant_001',
        data: {
          courseId: creationResult.data.learningPath.courses[0].id,
          assessmentType: 'comprehensive',
          learningObjectives: ['understand_leadership_principles'],
          assessmentData: {
            quizResponses: [
              { questionId: 'q1', answer: 'A', timeSpent: 30 },
              { questionId: 'q2', answer: 'B', timeSpent: 45 }
            ]
          }
        },
        urgency: 'medium',
        priority: 'medium'
      };

      const assessmentResult = await assessmentEngine.executeAssessment(assessmentContext);
      expect(assessmentResult.success).toBe(true);

      // Verify end-to-end data consistency
      expect(creationResult.data.learningPath.id).toBe(progressResult.data.progressAnalysis.learningPathId);
      expect(completionResult.data.recordUpdates.learningHistory).toBeDefined();
      expect(assessmentResult.data.recordUpdates.assessmentResults).toBeDefined();
    });

    test('should handle workflow error recovery and fallback', async () => {
      const triggerContext: LXPTriggerContext = {
        triggerType: 'skill_gaps_critical',
        employeeId: 'emp_002',
        tenantId: 'tenant_001',
        data: {
          skillGaps: [], // Invalid data
          currentSkills: null, // Invalid data
          learningPreferences: {} // Incomplete data
        },
        urgency: 'high',
        priority: 'high'
      };

      const result = await learningPathWorkflow.executeWorkflow(triggerContext);

      // Should handle gracefully with fallback
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.fallbackActions).toBeDefined();
      expect(result.fallbackActions.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // PERFORMANCE AND SCALABILITY TESTS
  // ============================================================================

  describe('Performance and Scalability Tests', () => {
    test('should handle multiple concurrent workflow executions', async () => {
      const contexts = Array.from({ length: 10 }, (_, i) => ({
        triggerType: 'skill_gaps_critical' as const,
        employeeId: `emp_${i + 1}`,
        tenantId: 'tenant_001',
        data: {
          skillGaps: ['leadership', 'communication'],
          currentSkills: ['technical'],
          learningPreferences: { format: 'interactive', duration: 'medium' }
        },
        urgency: 'high' as const,
        priority: 'high' as const
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        contexts.map(context => learningPathWorkflow.executeWorkflow(context))
      );
      const endTime = Date.now();

      // Verify all workflows completed successfully
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Verify performance (should complete within reasonable time)
      expect(endTime - startTime).toBeLessThan(30000); // 30 seconds
    });

    test('should handle large dataset processing', async () => {
      const triggerContext: LXPTriggerContext = {
        triggerType: 'progress_tracking',
        employeeId: 'emp_001',
        tenantId: 'tenant_001',
        data: {
          learningPathId: 'lp_large_001',
          currentProgress: {
            completedCourses: 50,
            totalCourses: 100,
            timeSpent: 5000,
            lastActivity: new Date().toISOString()
          },
          performanceData: {
            quizScores: Array.from({ length: 100 }, () => Math.floor(Math.random() * 100)),
            assignmentScores: Array.from({ length: 50 }, () => Math.floor(Math.random() * 100)),
            engagementMetrics: {
              loginFrequency: 100,
              sessionDuration: 45,
              interactionRate: 0.85
            }
          }
        },
        urgency: 'medium',
        priority: 'medium'
      };

      const startTime = Date.now();
      const result = await progressTrackingWorkflow.executeWorkflow(triggerContext);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds
    });
  });
});
