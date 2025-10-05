/**
 * Integration Test Setup
 * 
 * Setup configuration for LXP workflow integration tests
 * including mocks, utilities, and test environment configuration.
 */

import { jest } from '@jest/globals';

// ============================================================================
// GLOBAL TEST CONFIGURATION
// ============================================================================

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.AI_PROVIDER_TIMEOUT = '30000';
process.env.DATABASE_URL = 'sqlite://test.db';
process.env.REDIS_URL = 'redis://localhost:6379/1';

// ============================================================================
// MOCK CONFIGURATIONS
// ============================================================================

// Mock AI providers
jest.mock('../../../agents/lxp/learning-path-designer.js', () => ({
  LearningPathDesignerAgent: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue({ success: true }),
    analyze: jest.fn().mockImplementation(async (inputData) => {
      return {
        knowledge: {
          output: {
            frameworks: ['ADDIE', 'Bloom\'s Taxonomy'],
            principles: ['spaced_repetition', 'active_learning'],
            methodologies: ['competency_based', 'adaptive_learning']
          },
          confidence: 0.9
        },
        data: {
          output: {
            employeeProfile: {
              id: inputData.employeeId,
              skills: inputData.data?.currentSkills || ['technical'],
              preferences: inputData.data?.learningPreferences || { format: 'interactive' }
            },
            skillGaps: inputData.data?.skillGaps || ['leadership'],
            organizationalContext: inputData.data?.organizationalContext || { industry: 'technology' }
          },
          confidence: 0.85
        },
        reasoning: {
          output: {
            learningPath: {
              id: `lp_${Date.now()}`,
              title: 'Personalized Learning Path',
              description: 'Custom learning path based on skill gaps',
              courses: [
                {
                  id: 'course_001',
                  title: 'Leadership Fundamentals',
                  category: 'leadership',
                  skills: ['leadership', 'communication'],
                  duration: 120,
                  difficulty: 'intermediate'
                }
              ],
              estimatedDuration: 240,
              difficulty: 'intermediate',
              focus: inputData.data?.skillGaps?.includes('leadership') ? 'leadership' : 'general'
            },
            rationale: 'Learning path designed based on identified skill gaps and employee preferences',
            confidence: 0.8
          },
          confidence: 0.8
        },
        finalOutput: {
          learningPath: {
            id: `lp_${Date.now()}`,
            title: 'Personalized Learning Path',
            description: 'Custom learning path based on skill gaps',
            courses: [
              {
                id: 'course_001',
                title: 'Leadership Fundamentals',
                category: 'leadership',
                skills: ['leadership', 'communication'],
                duration: 120,
                difficulty: 'intermediate'
              }
            ],
            estimatedDuration: 240,
            difficulty: 'intermediate',
            focus: inputData.data?.skillGaps?.includes('leadership') ? 'leadership' : 'general'
          }
        },
        overallConfidence: 0.85,
        totalProcessingTime: 1500
      };
    })
  }))
}));

jest.mock('../../../agents/lxp/learning-progress-tracker.js', () => ({
  LearningProgressTrackerAgent: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue({ success: true }),
    analyze: jest.fn().mockImplementation(async (inputData) => {
      const progress = inputData.data?.currentProgress;
      const performance = inputData.data?.performanceData;
      
      return {
        knowledge: {
          output: {
            frameworks: ['Kirkpatrick Model', 'Learning Analytics Framework'],
            methodologies: ['progress_tracking', 'predictive_analytics'],
            metrics: ['completion_rate', 'engagement', 'performance']
          },
          confidence: 0.9
        },
        data: {
          output: {
            progressMetrics: {
              overallProgress: progress ? (progress.completedCourses / progress.totalCourses) * 100 : 0,
              timeEfficiency: performance ? performance.engagementMetrics?.sessionDuration || 30 : 30,
              skillDevelopment: performance ? (performance.quizScores?.reduce((a, b) => a + b, 0) / performance.quizScores?.length) || 75 : 75,
              engagement: performance ? performance.engagementMetrics?.interactionRate || 0.7 : 0.7
            },
            riskFactors: progress && progress.completedCourses < progress.totalCourses * 0.3 ? ['low_engagement', 'slow_progress'] : [],
            opportunities: performance && performance.quizScores?.every(score => score > 80) ? ['acceleration', 'advanced_content'] : []
          },
          confidence: 0.85
        },
        reasoning: {
          output: {
            progressAnalysis: {
              overallProgress: progress ? (progress.completedCourses / progress.totalCourses) * 100 : 0,
              skillDevelopment: performance ? (performance.quizScores?.reduce((a, b) => a + b, 0) / performance.quizScores?.length) || 75 : 75,
              timeEfficiency: performance ? performance.engagementMetrics?.sessionDuration || 30 : 30,
              performanceTrends: performance ? 'improving' : 'stable',
              engagement: performance ? performance.engagementMetrics?.interactionRate || 0.7 : 0.7
            },
            insights: [
              'Employee is making steady progress',
              'Engagement levels are good',
              'Performance scores are above average'
            ],
            recommendations: [
              {
                type: 'continue_current_path',
                priority: 'medium',
                description: 'Continue with current learning approach'
              }
            ],
            interventions: [],
            predictions: {
              completionTime: progress ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : new Date().toISOString(),
              successProbability: 0.85,
              riskFactors: []
            }
          },
          confidence: 0.8
        },
        finalOutput: {
          progressAnalysis: {
            overallProgress: progress ? (progress.completedCourses / progress.totalCourses) * 100 : 0,
            skillDevelopment: performance ? (performance.quizScores?.reduce((a, b) => a + b, 0) / performance.quizScores?.length) || 75 : 75,
            timeEfficiency: performance ? performance.engagementMetrics?.sessionDuration || 30 : 30,
            performanceTrends: performance ? 'improving' : 'stable',
            engagement: performance ? performance.engagementMetrics?.interactionRate || 0.7 : 0.7
          },
          insights: [
            'Employee is making steady progress',
            'Engagement levels are good',
            'Performance scores are above average'
          ],
          recommendations: [
            {
              type: 'continue_current_path',
              priority: 'medium',
              description: 'Continue with current learning approach'
            }
          ],
          interventions: [],
          predictions: {
            completionTime: progress ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : new Date().toISOString(),
            successProbability: 0.85,
            riskFactors: []
          }
        },
        overallConfidence: 0.85,
        totalProcessingTime: 1200
      };
    })
  }))
}));

jest.mock('../../../agents/lxp/scenario-game-engine.js', () => ({
  ScenarioGameEngineAgent: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue({ success: true }),
    analyze: jest.fn().mockImplementation(async (inputData) => {
      return {
        knowledge: {
          output: {
            frameworks: ['Game Design Framework', 'Serious Games Methodology'],
            methodologies: ['scenario_based_learning', 'gamification'],
            techniques: ['role_playing', 'simulation', 'decision_trees']
          },
          confidence: 0.9
        },
        data: {
          output: {
            employeeProfile: {
              id: inputData.employeeId,
              learningStyle: 'visual',
              preferences: inputData.data?.learningPreferences || { format: 'interactive' }
            },
            triggerContext: inputData.triggerType,
            personalizationFactors: {
              difficulty: 'intermediate',
              content: 'relevant',
              interaction: 'engaging'
            }
          },
          confidence: 0.85
        },
        reasoning: {
          output: {
            scenarioGame: {
              id: `game_${Date.now()}`,
              title: 'Leadership Challenge',
              scenarioType: inputData.triggerType === 'culture_learning_needed' ? 'culture_simulation' : 'skill_development',
              description: 'Interactive scenario-based learning game',
              gameplay: {
                mechanics: ['decision_making', 'role_playing', 'problem_solving'],
                duration: 45,
                difficulty: 'intermediate',
                objectives: ['apply_leadership_skills', 'make_ethical_decisions']
              },
              personalization: {
                difficulty: 'intermediate',
                content: 'relevant',
                feedback: 'immediate'
              },
              assessment: {
                type: 'scenario_completion',
                criteria: ['decision_quality', 'leadership_effectiveness'],
                scoring: 'competency_based'
              }
            }
          },
          confidence: 0.8
        },
        finalOutput: {
          scenarioGame: {
            id: `game_${Date.now()}`,
            title: 'Leadership Challenge',
            scenarioType: inputData.triggerType === 'culture_learning_needed' ? 'culture_simulation' : 'skill_development',
            description: 'Interactive scenario-based learning game',
            gameplay: {
              mechanics: ['decision_making', 'role_playing', 'problem_solving'],
              duration: 45,
              difficulty: 'intermediate',
              objectives: ['apply_leadership_skills', 'make_ethical_decisions']
            },
            personalization: {
              difficulty: 'intermediate',
              content: 'relevant',
              feedback: 'immediate'
            },
            assessment: {
              type: 'scenario_completion',
              criteria: ['decision_quality', 'leadership_effectiveness'],
              scoring: 'competency_based'
            }
          }
        },
        overallConfidence: 0.85,
        totalProcessingTime: 1800
      };
    })
  }))
}));

// ============================================================================
// TEST UTILITIES
// ============================================================================

// Mock database operations
global.mockDatabase = {
  learningPaths: new Map(),
  courses: new Map(),
  enrollments: new Map(),
  assessments: new Map(),
  progress: new Map(),
  
  async saveLearningPath(path: any) {
    this.learningPaths.set(path.id, path);
    return { success: true, id: path.id };
  },
  
  async getLearningPath(id: string) {
    return this.learningPaths.get(id) || null;
  },
  
  async saveCourse(course: any) {
    this.courses.set(course.id, course);
    return { success: true, id: course.id };
  },
  
  async getCourse(id: string) {
    return this.courses.get(id) || null;
  },
  
  async saveEnrollment(enrollment: any) {
    this.enrollments.set(enrollment.id, enrollment);
    return { success: true, id: enrollment.id };
  },
  
  async getEnrollment(id: string) {
    return this.enrollments.get(id) || null;
  },
  
  async saveAssessment(assessment: any) {
    this.assessments.set(assessment.id, assessment);
    return { success: true, id: assessment.id };
  },
  
  async getAssessment(id: string) {
    return this.assessments.get(id) || null;
  },
  
  async saveProgress(progress: any) {
    this.progress.set(progress.id, progress);
    return { success: true, id: progress.id };
  },
  
  async getProgress(id: string) {
    return this.progress.get(id) || null;
  }
};

// Mock external service calls
global.mockExternalServices = {
  async sendNotification(employeeId: string, message: string) {
    console.log(`Mock notification sent to ${employeeId}: ${message}`);
    return { success: true };
  },
  
  async updateEmployeeProfile(employeeId: string, updates: any) {
    console.log(`Mock profile update for ${employeeId}:`, updates);
    return { success: true };
  },
  
  async issueCertificate(employeeId: string, courseId: string) {
    console.log(`Mock certificate issued to ${employeeId} for course ${courseId}`);
    return { success: true, certificateId: `cert_${Date.now()}` };
  }
};

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

// Performance tracking utilities
global.performanceTracker = {
  startTime: 0,
  
  start() {
    this.startTime = Date.now();
  },
  
  end() {
    const duration = Date.now() - this.startTime;
    console.log(`Test execution time: ${duration}ms`);
    return duration;
  },
  
  measure<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    return fn().then(result => ({
      result,
      duration: Date.now() - start
    }));
  }
};

// ============================================================================
// TEST DATA GENERATORS
// ============================================================================

global.testDataGenerators = {
  generateEmployeeData(overrides: any = {}) {
    return {
      id: `emp_${Date.now()}`,
      name: 'Test Employee',
      email: 'test@example.com',
      role: 'developer',
      department: 'engineering',
      skills: ['javascript', 'typescript'],
      learningPreferences: {
        format: 'interactive',
        duration: 'medium',
        difficulty: 'intermediate'
      },
      ...overrides
    };
  },
  
  generateLearningPathData(overrides: any = {}) {
    return {
      id: `lp_${Date.now()}`,
      title: 'Test Learning Path',
      description: 'Test learning path description',
      courses: [
        {
          id: 'course_001',
          title: 'Test Course',
          category: 'technical',
          skills: ['javascript'],
          duration: 120,
          difficulty: 'intermediate'
        }
      ],
      estimatedDuration: 240,
      difficulty: 'intermediate',
      ...overrides
    };
  },
  
  generateAssessmentData(overrides: any = {}) {
    return {
      id: `assessment_${Date.now()}`,
      courseId: 'course_001',
      type: 'comprehensive',
      questions: [
        {
          id: 'q1',
          question: 'Test question 1?',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 'A',
          points: 10
        }
      ],
      passingScore: 70,
      timeLimit: 60,
      ...overrides
    };
  }
};

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

global.assertWorkflowResult = (result: any, expectedType: string) => {
  expect(result).toBeDefined();
  expect(result.success).toBe(true);
  expect(result.workflowType).toBe(expectedType);
  expect(result.confidence).toBeGreaterThan(0.7);
  expect(result.data).toBeDefined();
  expect(result.nextActions).toBeInstanceOf(Array);
  expect(result.triggers).toBeInstanceOf(Array);
};

global.assertLearningPath = (learningPath: any) => {
  expect(learningPath).toBeDefined();
  expect(learningPath.id).toBeDefined();
  expect(learningPath.title).toBeDefined();
  expect(learningPath.courses).toBeInstanceOf(Array);
  expect(learningPath.courses.length).toBeGreaterThan(0);
  expect(learningPath.estimatedDuration).toBeDefined();
  expect(learningPath.difficulty).toBeDefined();
};

global.assertProgressAnalysis = (analysis: any) => {
  expect(analysis).toBeDefined();
  expect(analysis.overallProgress).toBeDefined();
  expect(analysis.skillDevelopment).toBeDefined();
  expect(analysis.timeEfficiency).toBeDefined();
  expect(analysis.performanceTrends).toBeDefined();
  expect(analysis.engagement).toBeDefined();
};

global.assertAssessmentResult = (result: any) => {
  expect(result).toBeDefined();
  expect(result.assessmentDesign).toBeDefined();
  expect(result.assessmentAdministration).toBeDefined();
  expect(result.scoringAnalysis).toBeDefined();
  expect(result.feedbackRecommendations).toBeDefined();
  expect(result.recordUpdates).toBeDefined();
};

// ============================================================================
// CLEANUP UTILITIES
// ============================================================================

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Clear test data
  global.mockDatabase.learningPaths.clear();
  global.mockDatabase.courses.clear();
  global.mockDatabase.enrollments.clear();
  global.mockDatabase.assessments.clear();
  global.mockDatabase.progress.clear();
  
  // Reset performance tracker
  global.performanceTracker.startTime = 0;
});

console.log('✅ LXP Workflow Integration Test Setup Complete');
