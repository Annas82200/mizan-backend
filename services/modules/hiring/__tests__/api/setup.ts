/**
 * Test Setup for Hiring Module API Endpoint Tests
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
    }),
    delete: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue([{ id: 'test-id' }])
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

// Mock workflows
jest.mock('../../workflows/requisition.js', () => ({
  JobRequisitionWorkflow: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue({
      success: true,
      requisitionId: 'req-123',
      jobDescription: {
        title: 'Senior Software Engineer',
        description: 'Looking for a senior software engineer'
      },
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

jest.mock('../../workflows/screening.js', () => ({
  CandidateScreeningWorkflow: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue({
      success: true,
      assessment: {
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
      },
      ranking: {
        overallRank: 1,
        skillsRank: 1,
        cultureRank: 2,
        experienceRank: 1
      }
    })
  }))
}));

jest.mock('../../workflows/interviews.js', () => ({
  InterviewManagementWorkflow: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue({
      success: true,
      interviewId: 'int-123',
      schedule: {
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        duration: 60,
        location: 'Conference Room A',
        meetingLink: 'https://meet.example.com/room123'
      },
      notifications: {
        candidate: true,
        interviewers: true
      }
    }),
    collectFeedback: jest.fn().mockResolvedValue({
      success: true,
      feedback: {
        interviewerId: 'interviewer-1',
        scores: {
          technical: 8,
          communication: 9,
          culture: 7
        },
        recommendation: 'yes',
        comments: 'Strong technical skills, good communication',
        strengths: ['Problem solving', 'Code quality'],
        areasForImprovement: ['System design knowledge']
      }
    }),
    completeInterview: jest.fn().mockResolvedValue({
      success: true,
      finalAssessment: {
        overallScore: 8.5,
        recommendation: 'yes',
        summary: 'Strong candidate, recommend for next round',
        nextSteps: ['Schedule final interview']
      }
    })
  }))
}));

jest.mock('../../workflows/offers.js', () => ({
  OfferManagementWorkflow: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue({
      success: true,
      offerId: 'offer-123',
      offerLetter: {
        position: 'Senior Software Engineer',
        salary: 100000,
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      notifications: {
        candidate: true,
        hiringManager: true
      }
    }),
    acceptOffer: jest.fn().mockResolvedValue({
      success: true,
      onboardingTriggered: true
    }),
    rejectOffer: jest.fn().mockResolvedValue({
      success: true,
      reason: 'Accepted another offer'
    }),
    negotiateOffer: jest.fn().mockResolvedValue({
      success: true,
      counterOffer: {
        salary: 110000,
        bonus: 15000
      },
      negotiationHistory: [
        {
          type: 'counter_offer',
          salary: 110000,
          bonus: 15000,
          date: new Date()
        }
      ]
    })
  }))
}));

// Global test timeout
jest.setTimeout(30000);
