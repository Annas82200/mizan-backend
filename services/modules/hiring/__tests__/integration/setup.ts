/**
 * Test Setup for Hiring Module Workflow Integration Tests
 */

// Mock external dependencies
jest.mock('../../../../db/index.js', () => ({
  db: {
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 'test-id' }])
      })
    }),
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockResolvedValue([])
        })
      })
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 'test-id' }])
        })
      })
    })
  }
}));

jest.mock('../../../../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock AI agents
jest.mock('../../../agents/hiring/recruitment-strategist.js', () => ({
  RecruitmentStrategistAgent: jest.fn().mockImplementation(() => ({
    developRecruitmentStrategy: jest.fn().mockResolvedValue({
      recruitmentStrategy: {
        channels: ['LinkedIn', 'Indeed'],
        timeline: {
          startDate: new Date(),
          targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        budget: {
          total: 5000,
          breakdown: {
            jobBoards: 2000,
            recruiter: 3000
          }
        }
      },
      jobDescription: {
        title: 'Senior Software Engineer',
        description: 'Looking for a senior software engineer',
        requirements: ['JavaScript', 'Node.js'],
        responsibilities: ['Develop applications']
      },
      sourcingPlan: {
        channels: ['LinkedIn', 'Indeed'],
        timeline: {
          startDate: new Date(),
          targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        budget: {
          total: 5000,
          breakdown: {
            jobBoards: 2000,
            recruiter: 3000
          }
        }
      }
    })
  }))
}));

jest.mock('../../../agents/hiring/candidate-assessor.js', () => ({
  CandidateAssessorAgent: jest.fn().mockImplementation(() => ({
    assessCandidate: jest.fn().mockResolvedValue({
      overallScore: 85,
      recommendation: 'hire',
      skillsAssessment: {
        score: 90,
        requiredSkillsMatch: 95,
        preferredSkillsMatch: 80,
        skillGaps: [],
        skillStrengths: ['JavaScript', 'Node.js']
      },
      experienceAssessment: {
        score: 85,
        yearsOfExperience: 5,
        relevantExperience: 4,
        industryMatch: true,
        seniorityMatch: true,
        careerProgression: 'steady'
      },
      cultureFitAssessment: {
        score: 80,
        alignment: {},
        strengths: ['collaboration', 'innovation'],
        concerns: [],
        cylinders: {
          innovation: 85,
          collaboration: 90,
          integrity: 95,
          excellence: 80,
          customerFocus: 75,
          diversity: 70,
          sustainability: 80
        }
      },
      educationAssessment: {
        score: 90,
        meetsRequirements: true,
        credentials: ['Bachelor of Computer Science'],
        certifications: []
      },
      overallAnalysis: {
        strengths: ['Strong technical skills', 'Good communication'],
        weaknesses: ['Limited system design experience'],
        opportunities: ['Growth potential'],
        concerns: [],
        redFlags: []
      },
      interviewRecommendations: {
        shouldInterview: true,
        interviewType: ['technical', 'behavioral'],
        focusAreas: ['System design', 'Leadership experience'],
        questions: [
          'Describe a challenging technical problem you solved',
          'How do you approach code reviews?'
        ]
      }
    })
  }))
}));

// Mock culture integration
jest.mock('../../integrations/culture-integration.js', () => ({
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

// Global test timeout
jest.setTimeout(30000);
