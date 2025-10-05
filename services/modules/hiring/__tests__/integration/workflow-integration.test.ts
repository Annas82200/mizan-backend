/**
 * Hiring Module Workflow Integration Tests
 * Tests complete workflows end-to-end
 */

import { HiringModule } from '../../hiring-module.js';
import { JobRequisitionWorkflow } from '../../workflows/requisition.js';
import { CandidateScreeningWorkflow } from '../../workflows/screening.js';
import { InterviewManagementWorkflow } from '../../workflows/interviews.js';
import { OfferManagementWorkflow } from '../../workflows/offers.js';

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

describe('Hiring Module Workflow Integration Tests', () => {
  let hiringModule: HiringModule;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      tenantId: 'test-tenant-id',
      moduleId: 'hiring-module',
      enabled: true,
      settings: {}
    };

    hiringModule = new HiringModule(mockConfig);
  });

  describe('Job Requisition Workflow', () => {
    test('should create job requisition end-to-end', async () => {
      const workflowInput = {
        tenantId: 'test-tenant-id',
        positionTitle: 'Senior Software Engineer',
        department: 'Engineering',
        level: 'senior' as const,
        type: 'full_time' as const,
        urgency: 'medium' as const,
        description: 'Looking for a senior software engineer',
        responsibilities: ['Develop web applications', 'Lead technical projects'],
        requiredSkills: ['JavaScript', 'Node.js', 'TypeScript'],
        preferredSkills: ['React', 'AWS'],
        cultureValues: ['innovation', 'collaboration', 'integrity'],
        experienceRequired: '5+ years',
        educationRequired: 'Bachelor\'s degree',
        compensationRange: { min: 80000, max: 120000 },
        benefits: ['Health insurance', '401k', 'Remote work'],
        location: 'Remote',
        remote: true,
        numberOfPositions: 1,
        targetStartDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        requestedBy: 'test-user-id',
        hiringManagerId: 'test-manager-id'
      };

      const workflow = new JobRequisitionWorkflow();
      const result = await workflow.execute(workflowInput);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.requisitionId).toBeDefined();
      expect(result.jobDescription).toBeDefined();
      expect(result.recruitmentStrategy).toBeDefined();
      expect(result.sourcingPlan).toBeDefined();
    });

    test('should handle requisition creation errors', async () => {
      const invalidInput = {
        tenantId: '',
        positionTitle: '',
        department: '',
        level: 'senior' as const,
        type: 'full_time' as const,
        urgency: 'medium' as const
      };

      const workflow = new JobRequisitionWorkflow();
      
      await expect(workflow.execute(invalidInput as any))
        .rejects.toThrow();
    });

    test('should generate recruitment strategy', async () => {
      const workflowInput = {
        tenantId: 'test-tenant-id',
        positionTitle: 'Senior Software Engineer',
        department: 'Engineering',
        level: 'senior' as const,
        type: 'full_time' as const,
        urgency: 'high' as const,
        description: 'Urgent need for senior engineer',
        responsibilities: ['Develop applications'],
        requiredSkills: ['JavaScript', 'Node.js'],
        preferredSkills: ['React'],
        cultureValues: ['innovation'],
        experienceRequired: '5+ years',
        educationRequired: 'Bachelor\'s degree',
        compensationRange: { min: 80000, max: 120000 },
        benefits: ['Health insurance'],
        location: 'Remote',
        remote: true,
        numberOfPositions: 1,
        targetStartDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        requestedBy: 'test-user-id',
        hiringManagerId: 'test-manager-id'
      };

      const workflow = new JobRequisitionWorkflow();
      const result = await workflow.execute(workflowInput);

      expect(result.recruitmentStrategy).toBeDefined();
      expect(result.recruitmentStrategy.channels).toBeDefined();
      expect(result.recruitmentStrategy.timeline).toBeDefined();
      expect(result.recruitmentStrategy.budget).toBeDefined();
    });
  });

  describe('Candidate Screening Workflow', () => {
    test('should screen candidate end-to-end', async () => {
      const workflowInput = {
        tenantId: 'test-tenant-id',
        candidateId: 'test-candidate-id',
        requisitionId: 'test-requisition-id',
        candidate: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
          resume: 'Resume content here',
          skills: ['JavaScript', 'Node.js'],
          experience: 5,
          education: ['Bachelor of Computer Science']
        },
        jobRequirements: {
          title: 'Senior Software Engineer',
          requiredSkills: ['JavaScript', 'Node.js'],
          preferredSkills: ['React'],
          experienceRequired: '5+ years',
          educationRequired: 'Bachelor\'s degree'
        },
        assessmentType: 'comprehensive' as const
      };

      const workflow = new CandidateScreeningWorkflow();
      const result = await workflow.execute(workflowInput);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.assessment).toBeDefined();
      expect(result.assessment.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.assessment.overallScore).toBeLessThanOrEqual(100);
      expect(result.assessment.recommendation).toBeDefined();
      expect(result.ranking).toBeDefined();
    });

    test('should perform culture fit assessment', async () => {
      const workflowInput = {
        tenantId: 'test-tenant-id',
        candidateId: 'test-candidate-id',
        requisitionId: 'test-requisition-id',
        candidate: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
          resume: 'Resume content here',
          skills: ['JavaScript', 'Node.js'],
          experience: 5,
          education: ['Bachelor of Computer Science']
        },
        jobRequirements: {
          title: 'Senior Software Engineer',
          requiredSkills: ['JavaScript', 'Node.js'],
          preferredSkills: ['React'],
          experienceRequired: '5+ years',
          educationRequired: 'Bachelor\'s degree'
        },
        assessmentType: 'comprehensive' as const
      };

      const workflow = new CandidateScreeningWorkflow();
      const result = await workflow.execute(workflowInput);

      expect(result.assessment.cultureFitAssessment).toBeDefined();
      expect(result.assessment.cultureFitAssessment.score).toBeGreaterThanOrEqual(0);
      expect(result.assessment.cultureFitAssessment.score).toBeLessThanOrEqual(100);
    });

    test('should rank candidates', async () => {
      const workflowInput = {
        tenantId: 'test-tenant-id',
        candidateId: 'test-candidate-id',
        requisitionId: 'test-requisition-id',
        candidate: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
          resume: 'Resume content here',
          skills: ['JavaScript', 'Node.js'],
          experience: 5,
          education: ['Bachelor of Computer Science']
        },
        jobRequirements: {
          title: 'Senior Software Engineer',
          requiredSkills: ['JavaScript', 'Node.js'],
          preferredSkills: ['React'],
          experienceRequired: '5+ years',
          educationRequired: 'Bachelor\'s degree'
        },
        assessmentType: 'comprehensive' as const
      };

      const workflow = new CandidateScreeningWorkflow();
      const result = await workflow.execute(workflowInput);

      expect(result.ranking).toBeDefined();
      expect(result.ranking.overallRank).toBeGreaterThanOrEqual(1);
      expect(result.ranking.skillsRank).toBeDefined();
      expect(result.ranking.cultureRank).toBeDefined();
      expect(result.ranking.experienceRank).toBeDefined();
    });
  });

  describe('Interview Management Workflow', () => {
    test('should schedule interview end-to-end', async () => {
      const workflowInput = {
        tenantId: 'test-tenant-id',
        candidateId: 'test-candidate-id',
        requisitionId: 'test-requisition-id',
        interviewType: 'technical' as const,
        round: 1,
        interviewers: ['interviewer-1', 'interviewer-2'],
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        duration: 60,
        location: 'Conference Room A',
        meetingLink: 'https://meet.example.com/room123'
      };

      const workflow = new InterviewManagementWorkflow();
      const result = await workflow.execute(workflowInput);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.interviewId).toBeDefined();
      expect(result.schedule).toBeDefined();
      expect(result.notifications).toBeDefined();
    });

    test('should collect interview feedback', async () => {
      const workflowInput = {
        tenantId: 'test-tenant-id',
        candidateId: 'test-candidate-id',
        requisitionId: 'test-requisition-id',
        interviewType: 'technical' as const,
        round: 1,
        interviewers: ['interviewer-1', 'interviewer-2'],
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        duration: 60,
        location: 'Conference Room A',
        meetingLink: 'https://meet.example.com/room123'
      };

      const workflow = new InterviewManagementWorkflow();
      const result = await workflow.execute(workflowInput);

      // Simulate feedback collection
      const feedbackResult = await workflow.collectFeedback(result.interviewId, {
        interviewerId: 'interviewer-1',
        scores: {
          technical: 8,
          communication: 9,
          culture: 7
        },
        recommendation: 'yes' as const,
        comments: 'Strong technical skills, good communication',
        strengths: ['Problem solving', 'Code quality'],
        areasForImprovement: ['System design knowledge']
      });

      expect(feedbackResult).toBeDefined();
      expect(feedbackResult.success).toBe(true);
      expect(feedbackResult.feedback).toBeDefined();
    });

    test('should complete interview process', async () => {
      const workflowInput = {
        tenantId: 'test-tenant-id',
        candidateId: 'test-candidate-id',
        requisitionId: 'test-requisition-id',
        interviewType: 'technical' as const,
        round: 1,
        interviewers: ['interviewer-1', 'interviewer-2'],
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        duration: 60,
        location: 'Conference Room A',
        meetingLink: 'https://meet.example.com/room123'
      };

      const workflow = new InterviewManagementWorkflow();
      const result = await workflow.execute(workflowInput);

      // Complete the interview
      const completionResult = await workflow.completeInterview(result.interviewId, {
        overallScore: 8.5,
        recommendation: 'yes' as const,
        summary: 'Strong candidate, recommend for next round',
        nextSteps: ['Schedule final interview']
      });

      expect(completionResult).toBeDefined();
      expect(completionResult.success).toBe(true);
      expect(completionResult.finalAssessment).toBeDefined();
    });
  });

  describe('Offer Management Workflow', () => {
    test('should create and send offer end-to-end', async () => {
      const workflowInput = {
        tenantId: 'test-tenant-id',
        candidateId: 'test-candidate-id',
        requisitionId: 'test-requisition-id',
        positionTitle: 'Senior Software Engineer',
        department: 'Engineering',
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        salary: 100000,
        bonus: 10000,
        equity: '0.1%',
        benefits: ['Health insurance', '401k', 'Remote work'],
        relocationAssistance: false,
        signOnBonus: 5000
      };

      const workflow = new OfferManagementWorkflow();
      const result = await workflow.execute(workflowInput);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.offerId).toBeDefined();
      expect(result.offerLetter).toBeDefined();
      expect(result.notifications).toBeDefined();
    });

    test('should handle offer acceptance', async () => {
      const workflowInput = {
        tenantId: 'test-tenant-id',
        candidateId: 'test-candidate-id',
        requisitionId: 'test-requisition-id',
        positionTitle: 'Senior Software Engineer',
        department: 'Engineering',
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        salary: 100000,
        bonus: 10000,
        equity: '0.1%',
        benefits: ['Health insurance', '401k', 'Remote work'],
        relocationAssistance: false,
        signOnBonus: 5000
      };

      const workflow = new OfferManagementWorkflow();
      const result = await workflow.execute(workflowInput);

      // Simulate offer acceptance
      const acceptanceResult = await workflow.acceptOffer(result.offerId, {
        acceptedDate: new Date(),
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        comments: 'Excited to join the team!'
      });

      expect(acceptanceResult).toBeDefined();
      expect(acceptanceResult.success).toBe(true);
      expect(acceptanceResult.onboardingTriggered).toBe(true);
    });

    test('should handle offer negotiation', async () => {
      const workflowInput = {
        tenantId: 'test-tenant-id',
        candidateId: 'test-candidate-id',
        requisitionId: 'test-requisition-id',
        positionTitle: 'Senior Software Engineer',
        department: 'Engineering',
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        salary: 100000,
        bonus: 10000,
        equity: '0.1%',
        benefits: ['Health insurance', '401k', 'Remote work'],
        relocationAssistance: false,
        signOnBonus: 5000
      };

      const workflow = new OfferManagementWorkflow();
      const result = await workflow.execute(workflowInput);

      // Simulate offer negotiation
      const negotiationResult = await workflow.negotiateOffer(result.offerId, {
        requestedSalary: 110000,
        requestedBonus: 15000,
        requestedEquity: '0.15%',
        comments: 'Based on my experience and market research'
      });

      expect(negotiationResult).toBeDefined();
      expect(negotiationResult.success).toBe(true);
      expect(negotiationResult.counterOffer).toBeDefined();
      expect(negotiationResult.negotiationHistory).toBeDefined();
    });
  });

  describe('End-to-End Hiring Process', () => {
    test('should complete full hiring process', async () => {
      // Step 1: Create job requisition
      const requisitionWorkflow = new JobRequisitionWorkflow();
      const requisitionResult = await requisitionWorkflow.execute({
        tenantId: 'test-tenant-id',
        positionTitle: 'Senior Software Engineer',
        department: 'Engineering',
        level: 'senior' as const,
        type: 'full_time' as const,
        urgency: 'medium' as const,
        description: 'Looking for a senior software engineer',
        responsibilities: ['Develop web applications'],
        requiredSkills: ['JavaScript', 'Node.js'],
        preferredSkills: ['React'],
        cultureValues: ['innovation', 'collaboration'],
        experienceRequired: '5+ years',
        educationRequired: 'Bachelor\'s degree',
        compensationRange: { min: 80000, max: 120000 },
        benefits: ['Health insurance'],
        location: 'Remote',
        remote: true,
        numberOfPositions: 1,
        targetStartDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        requestedBy: 'test-user-id',
        hiringManagerId: 'test-manager-id'
      });

      expect(requisitionResult.success).toBe(true);

      // Step 2: Screen candidate
      const screeningWorkflow = new CandidateScreeningWorkflow();
      const screeningResult = await screeningWorkflow.execute({
        tenantId: 'test-tenant-id',
        candidateId: 'test-candidate-id',
        requisitionId: requisitionResult.requisitionId,
        candidate: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
          resume: 'Resume content here',
          skills: ['JavaScript', 'Node.js'],
          experience: 5,
          education: ['Bachelor of Computer Science']
        },
        jobRequirements: {
          title: 'Senior Software Engineer',
          requiredSkills: ['JavaScript', 'Node.js'],
          preferredSkills: ['React'],
          experienceRequired: '5+ years',
          educationRequired: 'Bachelor\'s degree'
        },
        assessmentType: 'comprehensive' as const
      });

      expect(screeningResult.success).toBe(true);
      expect(screeningResult.assessment.recommendation).toBeDefined();

      // Step 3: Schedule interview
      const interviewWorkflow = new InterviewManagementWorkflow();
      const interviewResult = await interviewWorkflow.execute({
        tenantId: 'test-tenant-id',
        candidateId: 'test-candidate-id',
        requisitionId: requisitionResult.requisitionId,
        interviewType: 'technical' as const,
        round: 1,
        interviewers: ['interviewer-1'],
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        duration: 60,
        location: 'Conference Room A'
      });

      expect(interviewResult.success).toBe(true);

      // Step 4: Create and send offer
      const offerWorkflow = new OfferManagementWorkflow();
      const offerResult = await offerWorkflow.execute({
        tenantId: 'test-tenant-id',
        candidateId: 'test-candidate-id',
        requisitionId: requisitionResult.requisitionId,
        positionTitle: 'Senior Software Engineer',
        department: 'Engineering',
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        salary: 100000,
        bonus: 10000,
        benefits: ['Health insurance', '401k']
      });

      expect(offerResult.success).toBe(true);

      // Step 5: Accept offer
      const acceptanceResult = await offerWorkflow.acceptOffer(offerResult.offerId, {
        acceptedDate: new Date(),
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });

      expect(acceptanceResult.success).toBe(true);
      expect(acceptanceResult.onboardingTriggered).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle workflow errors gracefully', async () => {
      const workflow = new JobRequisitionWorkflow();
      
      await expect(workflow.execute(null as any))
        .rejects.toThrow();
    });

    test('should handle database errors', async () => {
      // Mock database error
      const { db } = require('../../../../db/index.js');
      db.insert.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const workflow = new JobRequisitionWorkflow();
      
      await expect(workflow.execute({
        tenantId: 'test-tenant-id',
        positionTitle: 'Senior Software Engineer',
        department: 'Engineering',
        level: 'senior' as const,
        type: 'full_time' as const,
        urgency: 'medium' as const,
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
        targetStartDate: new Date(),
        requestedBy: 'test-user-id',
        hiringManagerId: 'test-manager-id'
      }))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('Performance', () => {
    test('should complete workflows within reasonable time', async () => {
      const workflow = new JobRequisitionWorkflow();
      
      const startTime = Date.now();
      await workflow.execute({
        tenantId: 'test-tenant-id',
        positionTitle: 'Senior Software Engineer',
        department: 'Engineering',
        level: 'senior' as const,
        type: 'full_time' as const,
        urgency: 'medium' as const,
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
        targetStartDate: new Date(),
        requestedBy: 'test-user-id',
        hiringManagerId: 'test-manager-id'
      });
      const endTime = Date.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});
