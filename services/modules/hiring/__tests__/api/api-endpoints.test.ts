/**
 * Hiring Module API Endpoint Tests
 * Tests all API endpoints using supertest
 */

import request from 'supertest';
import express from 'express';
import { hiringModuleRouter } from '../../api/index.js';

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

describe('Hiring Module API Endpoints', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/hiring', hiringModuleRouter);
  });

  describe('Requisitions API', () => {
    describe('POST /api/hiring/requisitions', () => {
      test('should create a new requisition', async () => {
        const requisitionData = {
          positionTitle: 'Senior Software Engineer',
          department: 'Engineering',
          level: 'senior',
          type: 'full_time',
          urgency: 'medium',
          description: 'Looking for a senior software engineer',
          responsibilities: ['Develop web applications'],
          requiredSkills: ['JavaScript', 'Node.js'],
          preferredSkills: ['React'],
          cultureValues: ['innovation', 'collaboration'],
          experienceRequired: '5+ years',
          educationRequired: 'Bachelor\'s degree',
          compensationRange: { min: 80000, max: 120000 },
          benefits: ['Health insurance', '401k'],
          location: 'Remote',
          remote: true,
          numberOfPositions: 1,
          targetStartDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          requestedBy: 'test-user-id',
          hiringManagerId: 'test-manager-id'
        };

        const response = await request(app)
          .post('/api/hiring/requisitions')
          .send(requisitionData)
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('requisitionId');
        expect(response.body).toHaveProperty('jobDescription');
        expect(response.body).toHaveProperty('recruitmentStrategy');
      });

      test('should validate required fields', async () => {
        const invalidData = {
          positionTitle: '',
          department: ''
        };

        await request(app)
          .post('/api/hiring/requisitions')
          .send(invalidData)
          .expect(400);
      });
    });

    describe('GET /api/hiring/requisitions', () => {
      test('should get all requisitions', async () => {
        const response = await request(app)
          .get('/api/hiring/requisitions')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('requisitions');
        expect(Array.isArray(response.body.requisitions)).toBe(true);
      });

      test('should filter requisitions by status', async () => {
        const response = await request(app)
          .get('/api/hiring/requisitions?status=approved')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('requisitions');
      });

      test('should filter requisitions by department', async () => {
        const response = await request(app)
          .get('/api/hiring/requisitions?department=Engineering')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('requisitions');
      });
    });

    describe('GET /api/hiring/requisitions/:id', () => {
      test('should get requisition by ID', async () => {
        const response = await request(app)
          .get('/api/hiring/requisitions/req-123')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('requisition');
      });

      test('should return 404 for non-existent requisition', async () => {
        await request(app)
          .get('/api/hiring/requisitions/non-existent')
          .expect(404);
      });
    });

    describe('PUT /api/hiring/requisitions/:id', () => {
      test('should update requisition', async () => {
        const updateData = {
          status: 'approved',
          description: 'Updated description'
        };

        const response = await request(app)
          .put('/api/hiring/requisitions/req-123')
          .send(updateData)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('requisition');
      });
    });

    describe('DELETE /api/hiring/requisitions/:id', () => {
      test('should delete requisition', async () => {
        const response = await request(app)
          .delete('/api/hiring/requisitions/req-123')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
      });
    });
  });

  describe('Candidates API', () => {
    describe('POST /api/hiring/candidates', () => {
      test('should create a new candidate', async () => {
        const candidateData = {
          requisitionId: 'req-123',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
          resume: 'Resume content here',
          skills: ['JavaScript', 'Node.js'],
          experience: 5,
          education: ['Bachelor of Computer Science'],
          coverLetter: 'I am passionate about software development...'
        };

        const response = await request(app)
          .post('/api/hiring/candidates')
          .send(candidateData)
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('candidateId');
      });
    });

    describe('GET /api/hiring/candidates', () => {
      test('should get all candidates', async () => {
        const response = await request(app)
          .get('/api/hiring/candidates')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('candidates');
        expect(Array.isArray(response.body.candidates)).toBe(true);
      });

      test('should filter candidates by requisition', async () => {
        const response = await request(app)
          .get('/api/hiring/candidates?requisitionId=req-123')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('candidates');
      });
    });

    describe('POST /api/hiring/candidates/:id/screen', () => {
      test('should screen candidate', async () => {
        const screeningData = {
          assessmentType: 'comprehensive'
        };

        const response = await request(app)
          .post('/api/hiring/candidates/candidate-123/screen')
          .send(screeningData)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('assessment');
        expect(response.body).toHaveProperty('ranking');
      });
    });
  });

  describe('Interviews API', () => {
    describe('POST /api/hiring/interviews', () => {
      test('should schedule interview', async () => {
        const interviewData = {
          candidateId: 'candidate-123',
          requisitionId: 'req-123',
          interviewType: 'technical',
          round: 1,
          interviewers: ['interviewer-1', 'interviewer-2'],
          scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          duration: 60,
          location: 'Conference Room A',
          meetingLink: 'https://meet.example.com/room123'
        };

        const response = await request(app)
          .post('/api/hiring/interviews')
          .send(interviewData)
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('interviewId');
        expect(response.body).toHaveProperty('schedule');
      });
    });

    describe('POST /api/hiring/interviews/:id/feedback', () => {
      test('should submit interview feedback', async () => {
        const feedbackData = {
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
        };

        const response = await request(app)
          .post('/api/hiring/interviews/int-123/feedback')
          .send(feedbackData)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('feedback');
      });
    });

    describe('POST /api/hiring/interviews/:id/complete', () => {
      test('should complete interview', async () => {
        const completionData = {
          overallScore: 8.5,
          recommendation: 'yes',
          summary: 'Strong candidate, recommend for next round',
          nextSteps: ['Schedule final interview']
        };

        const response = await request(app)
          .post('/api/hiring/interviews/int-123/complete')
          .send(completionData)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('finalAssessment');
      });
    });
  });

  describe('Offers API', () => {
    describe('POST /api/hiring/offers', () => {
      test('should create and send offer', async () => {
        const offerData = {
          candidateId: 'candidate-123',
          requisitionId: 'req-123',
          positionTitle: 'Senior Software Engineer',
          department: 'Engineering',
          startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          salary: 100000,
          bonus: 10000,
          equity: '0.1%',
          benefits: ['Health insurance', '401k', 'Remote work'],
          relocationAssistance: false,
          signOnBonus: 5000
        };

        const response = await request(app)
          .post('/api/hiring/offers')
          .send(offerData)
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('offerId');
        expect(response.body).toHaveProperty('offerLetter');
      });
    });

    describe('POST /api/hiring/offers/:id/accept', () => {
      test('should accept offer', async () => {
        const acceptanceData = {
          acceptedDate: new Date().toISOString(),
          startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          comments: 'Excited to join the team!'
        };

        const response = await request(app)
          .post('/api/hiring/offers/offer-123/accept')
          .send(acceptanceData)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('onboardingTriggered', true);
      });
    });

    describe('POST /api/hiring/offers/:id/reject', () => {
      test('should reject offer', async () => {
        const rejectionData = {
          reason: 'Accepted another offer',
          rejectedDate: new Date().toISOString()
        };

        const response = await request(app)
          .post('/api/hiring/offers/offer-123/reject')
          .send(rejectionData)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
      });
    });

    describe('POST /api/hiring/offers/:id/negotiate', () => {
      test('should negotiate offer', async () => {
        const negotiationData = {
          requestedSalary: 110000,
          requestedBonus: 15000,
          requestedEquity: '0.15%',
          comments: 'Based on my experience and market research'
        };

        const response = await request(app)
          .post('/api/hiring/offers/offer-123/negotiate')
          .send(negotiationData)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('counterOffer');
        expect(response.body).toHaveProperty('negotiationHistory');
      });
    });
  });

  describe('Analytics API', () => {
    describe('GET /api/hiring/analytics/overview', () => {
      test('should get hiring analytics overview', async () => {
        const response = await request(app)
          .get('/api/hiring/analytics/overview')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('analytics');
        expect(response.body.analytics).toHaveProperty('totalRequisitions');
        expect(response.body.analytics).toHaveProperty('totalCandidates');
        expect(response.body.analytics).toHaveProperty('totalInterviews');
        expect(response.body.analytics).toHaveProperty('totalOffers');
      });
    });

    describe('GET /api/hiring/analytics/funnel', () => {
      test('should get hiring funnel analytics', async () => {
        const response = await request(app)
          .get('/api/hiring/analytics/funnel')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('funnel');
        expect(response.body.funnel).toHaveProperty('stages');
        expect(Array.isArray(response.body.funnel.stages)).toBe(true);
      });
    });

    describe('GET /api/hiring/analytics/sources', () => {
      test('should get source effectiveness analytics', async () => {
        const response = await request(app)
          .get('/api/hiring/analytics/sources')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('sources');
        expect(Array.isArray(response.body.sources)).toBe(true);
      });
    });

    describe('GET /api/hiring/analytics/departments', () => {
      test('should get department performance analytics', async () => {
        const response = await request(app)
          .get('/api/hiring/analytics/departments')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('departments');
        expect(Array.isArray(response.body.departments)).toBe(true);
      });
    });

    describe('GET /api/hiring/analytics/trends', () => {
      test('should get time-series trends', async () => {
        const response = await request(app)
          .get('/api/hiring/analytics/trends')
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('trends');
        expect(response.body.trends).toHaveProperty('applications');
        expect(response.body.trends).toHaveProperty('interviews');
        expect(response.body.trends).toHaveProperty('offers');
        expect(response.body.trends).toHaveProperty('hires');
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid JSON', async () => {
      await request(app)
        .post('/api/hiring/requisitions')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });

    test('should handle missing required fields', async () => {
      await request(app)
        .post('/api/hiring/requisitions')
        .send({})
        .expect(400);
    });

    test('should handle database errors', async () => {
      // Mock database error
      const { db } = require('../../../../db/index.js');
      db.insert.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const requisitionData = {
        positionTitle: 'Senior Software Engineer',
        department: 'Engineering',
        level: 'senior',
        type: 'full_time',
        urgency: 'medium',
        description: 'Test description',
        responsibilities: ['Test responsibility'],
        requiredSkills: ['JavaScript'],
        preferredSkills: ['React'],
        cultureValues: ['innovation'],
        experienceRequired: '5+ years',
        educationRequired: 'Bachelor\'s degree',
        compensationRange: { min: 80000, max: 120000 },
        benefits: ['Health insurance'],
        location: 'Remote',
        remote: true,
        numberOfPositions: 1,
        targetStartDate: new Date().toISOString(),
        requestedBy: 'test-user-id',
        hiringManagerId: 'test-manager-id'
      };

      await request(app)
        .post('/api/hiring/requisitions')
        .send(requisitionData)
        .expect(500);
    });
  });

  describe('Performance', () => {
    test('should respond within reasonable time', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/hiring/requisitions')
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });
  });
});
