/**
 * Hiring Module API Routes
 * Complete hiring flow from job posting to offer
 *
 * Flow:
 * 1. Create job requisition (from structure recommendations)
 * 2. Generate and publish job posting
 * 3. Candidate applies (with BOT assistance)
 * 4. Culture assessment (first 3 questions)
 * 5. Skills assessment
 * 6. Candidate evaluation and ranking
 * 7. Interview scheduling (with BOT)
 * 8. Final evaluation
 * 9. Offer generation
 */

import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import {
  hiringRequisitions,
  jobPostings,
  candidates,
  candidateAssessments,
  interviews,
  offers
} from '../db/schema/hiring.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { eq, and, desc } from 'drizzle-orm';
import { HiringModule } from '../services/modules/hiring/core/hiring-module.js';
import { ApplicationBot } from '../services/modules/hiring/core/application-bot.js';
import { CandidateAssessor } from '../services/modules/hiring/core/candidate-assessor.js';
import { InterviewBot } from '../services/modules/hiring/core/interview-bot.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ============================================================================
// JOB REQUISITIONS
// ============================================================================

/**
 * Create job requisition (from structure analysis)
 */
router.post('/requisitions',
  authenticate,
  authorize(['clientAdmin', 'superadmin', 'manager']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        positionTitle,
        department,
        level,
        type,
        location,
        remote,
        requiredSkills,
        compensationRange,
        cultureValues,
        urgency
      } = req.body;

      const user = (req as any).user;

      const requisition = await db.insert(hiringRequisitions).values({
        tenantId: user.tenantId,
        positionTitle,
        department,
        level,
        type: type || 'full_time',
        location,
        remote: remote || false,
        description: req.body.description || `We are hiring a ${positionTitle} for ${department}`,
        responsibilities: req.body.responsibilities || [],
        qualifications: req.body.qualifications || [],
        requiredSkills: requiredSkills || [],
        preferredSkills: req.body.preferredSkills || [],
        cultureValues: cultureValues || [],
        compensationRange,
        benefits: req.body.benefits || [],
        urgency: urgency || 'medium',
        status: 'draft',
        numberOfPositions: req.body.numberOfPositions || 1,
        requestedBy: user.id,
        hiringManagerId: req.body.hiringManagerId || user.id,
        metadata: {
          createdVia: 'api',
          sourceAnalysis: req.body.structureAnalysisId
        }
      }).returning();

      logger.info(`Requisition created: ${requisition[0].id}`);

      res.json({
        success: true,
        requisitionId: requisition[0].id,
        requisition: requisition[0]
      });
    } catch (error: any) {
      logger.error('Error creating requisition:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Approve requisition and generate job posting
 */
router.post('/requisitions/:id/approve',
  authenticate,
  authorize(['clientAdmin', 'superadmin', 'manager']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const requisition = await db.query.hiringRequisitions.findFirst({
        where: eq(hiringRequisitions.id, req.params.id)
      });

      if (!requisition) return;


      // Update requisition status
      await db.update(hiringRequisitions)
        .set({
          status: 'approved',
          approvedBy: user.id,
          approvalDate: new Date()
        })
        .where(eq(hiringRequisitions.id, req.params.id));

      // Generate and publish job posting
      const hiringModule = new HiringModule({
        tenantId: user.tenantId,
        hiringNeeds: [],
        vision: '',
        mission: '',
        values: [],
        culture: {}
      });

      const jobPostingId = await hiringModule.generateAndPublishJobPosting(requisition);

      res.json({
        success: true,
        jobPostingId,
        message: 'Requisition approved and job posting created'
      });
    } catch (error: any) {
      logger.error('Error approving requisition:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================================================
// JOB POSTINGS
// ============================================================================

/**
 * Get active job postings (public endpoint for career page)
 */
router.get('/postings',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId, department, location } = req.query;

      let whereConditions = eq(jobPostings.status, 'published');

      const postings = await db.select().from(jobPostings).where(whereConditions);

      res.json({
        success: true,
        count: postings.length,
        postings: postings.map(p => ({
          id: p.id,
          title: p.title,
          department: req.query.department,
          location: p.location,
          remote: p.remote,
          description: p.description.substring(0, 200) + '...',
          salaryRange: p.salaryRange,
          publishedAt: p.publishedAt
        }))
      });
    } catch (error: any) {
      logger.error('Error fetching postings:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Get job posting details (public)
 */
router.get('/postings/:id',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const posting = await db.query.jobPostings.findFirst({
        where: eq(jobPostings.id, req.params.id),
        with: {
          requisition: true
        }
      });

      if (!posting) return;


      // Increment view count
      await db.update(jobPostings)
        .set({ views: (posting.views || 0) + 1 })
        .where(eq(jobPostings.id, req.params.id));

      res.json({
        success: true,
        posting: {
          id: posting.id,
          title: posting.title,
          description: posting.description,
          responsibilities: posting.responsibilities,
          requirements: posting.requirements,
          qualifications: posting.qualifications,
          companyName: posting.companyName,
          companyDescription: posting.companyDescription,
          companyValues: posting.companyValues,
          benefits: posting.companyBenefits,
          location: posting.location,
          remote: posting.remote,
          salaryRange: posting.displaySalary ? posting.salaryRange : null,
          publishedAt: posting.publishedAt
        }
      });
    } catch (error: any) {
      logger.error('Error fetching posting:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================================================
// CANDIDATE APPLICATION (with BOT assistance)
// ============================================================================

/**
 * Start application session with BOT
 */
router.post('/apply/start',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { jobPostingId, resumeUrl } = req.body;

      const applicationBot = new ApplicationBot();
      const session = await applicationBot.startApplication(jobPostingId, resumeUrl);

      res.json({
        success: true,
        ...session
      });
    } catch (error: any) {
      logger.error('Error starting application:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Chat with application BOT
 */
router.post('/apply/chat',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId, message } = req.body;

      const applicationBot = new ApplicationBot();
      const result = await applicationBot.processMessage(sessionId, message);

      res.json({
        success: true,
        result
      });
    } catch (error: any) {
      logger.error('Error processing chat:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Get application progress
 */
router.get('/apply/progress/:sessionId',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const applicationBot = new ApplicationBot();
      const progress = applicationBot.getProgress(req.params.sessionId);

      res.json({
        success: true,
        ...progress
      });
    } catch (error: any) {
      logger.error('Error getting progress:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Submit application
 */
router.post('/apply/submit',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId, requisitionId, tenantId } = req.body;

      const applicationBot = new ApplicationBot();
      const candidateId = await applicationBot.submitApplication(sessionId, requisitionId, tenantId);

      res.json({
        success: true,
        candidateId,
        message: 'Application submitted successfully',
        nextStep: 'culture_assessment'
      });
    } catch (error: any) {
      logger.error('Error submitting application:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================================================
// CANDIDATE ASSESSMENT
// ============================================================================

/**
 * Submit culture assessment (first 3 questions from 7 Cylinders)
 */
router.post('/candidates/:id/culture-assessment',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { question1, question2, question3 } = req.body;

      const candidate = await db.query.candidates.findFirst({
        where: eq(candidates.id, req.params.id)
      });

      if (!candidate) return;


      const assessor = new CandidateAssessor(candidate.tenantId);
      const result = await assessor.assessCultureFit(req.params.id, {
        question1,
        question2,
        question3
      });

      res.json({
        success: true,
        ...result,
        nextStep: result.passed ? 'skills_assessment' : 'rejected'
      });
    } catch (error: any) {
      logger.error('Error assessing culture fit:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Submit skills assessment
 */
router.post('/candidates/:id/skills-assessment',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { technicalSkills, softSkills, projectExperience } = req.body;

      const candidate = await db.query.candidates.findFirst({
        where: eq(candidates.id, req.params.id)
      });

      if (!candidate) return;


      const assessor = new CandidateAssessor(candidate.tenantId);
      const result = await assessor.assessSkills(req.params.id, {
        technicalSkills,
        softSkills,
        projectExperience
      });

      res.json({
        success: true,
        ...result,
        nextStep: result.passed ? 'evaluation' : 'rejected'
      });
    } catch (error: any) {
      logger.error('Error assessing skills:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Evaluate candidate (combines all assessments)
 */
router.post('/candidates/:id/evaluate',
  authenticate,
  authorize(['clientAdmin', 'superadmin', 'manager']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const candidate = await db.query.candidates.findFirst({
        where: eq(candidates.id, req.params.id)
      });

      if (!candidate) return;


      const assessor = new CandidateAssessor(candidate.tenantId);
      const result = await assessor.evaluateCandidate(req.params.id);

      res.json({
        success: true,
        result
      });
    } catch (error: any) {
      logger.error('Error evaluating candidate:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Rank candidates for a requisition
 */
router.get('/requisitions/:id/candidates/ranked',
  authenticate,
  authorize(['clientAdmin', 'superadmin', 'manager']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;
      const assessor = new CandidateAssessor(user.tenantId);
      const ranked = await assessor.rankCandidates(req.params.id);

      res.json({
        success: true,
        count: ranked.length,
        candidates: ranked
      });
    } catch (error: any) {
      logger.error('Error ranking candidates:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================================================
// INTERVIEWS
// ============================================================================

/**
 * Schedule interview with BOT assistance
 */
router.post('/candidates/:id/schedule-interview',
  authenticate,
  authorize(['clientAdmin', 'superadmin', 'manager']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { interviewType, interviewers } = req.body;

      const candidate = await db.query.candidates.findFirst({
        where: eq(candidates.id, req.params.id),
        with: { requisition: true }
      });

      if (!candidate) return;


      const interviewBot = new InterviewBot({ tenantId: candidate.tenantId });
      const result = await interviewBot.handleScheduling(
        req.params.id,
        candidate,
        candidate.requisition?.hiringManagerId || ''
      );

      res.json({
        success: true,
        result
      });
    } catch (error: any) {
      logger.error('Error scheduling interview:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Submit interview feedback
 */
router.post('/interviews/:id/feedback',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { scores, feedback, recommendation, strengths, weaknesses } = req.body;
      const user = (req as any).user;

      await db.update(interviews)
        .set({
          scores,
          feedback,
          recommendation,
          strengths,
          weaknesses,
          overallScore: scores.overall,
          status: 'completed',
          completedAt: new Date()
        })
        .where(eq(interviews.id, req.params.id));

      res.json({
        success: true,
        message: 'Interview feedback submitted'
      });
    } catch (error: any) {
      logger.error('Error submitting feedback:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ============================================================================
// OFFERS
// ============================================================================

/**
 * Generate offer for candidate
 */
router.post('/candidates/:id/generate-offer',
  authenticate,
  authorize(['clientAdmin', 'superadmin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { salary, bonus, equity, startDate, benefits } = req.body;
      const user = (req as any).user;

      const candidate = await db.query.candidates.findFirst({
        where: eq(candidates.id, req.params.id),
        with: { requisition: true }
      });

      if (!candidate) return;


      const offer = await db.insert(offers).values({
        tenantId: user.tenantId,
        candidateId: req.params.id,
        requisitionId: candidate.requisitionId,
        positionTitle: candidate.requisition?.positionTitle || '',
        department: candidate.requisition?.department || '',
        level: candidate.requisition?.level || 'mid',
        type: candidate.requisition?.type || 'full_time',
        location: candidate.requisition?.location || '',
        remote: candidate.requisition?.remote || false,
        salary,
        currency: 'USD',
        bonus,
        equity,
        startDate,
        benefits: benefits || candidate.requisition?.benefits || [],
        status: 'draft',
        requiresApproval: true,
        createdBy: user.id
      }).returning();

      res.json({
        success: true,
        offerId: offer[0].id,
        offer: offer[0]
      });
    } catch (error: any) {
      logger.error('Error generating offer:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Approve and send offer
 */
router.post('/offers/:id/approve',
  authenticate,
  authorize(['clientAdmin', 'superadmin']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = (req as any).user;

      await db.update(offers)
        .set({
          status: 'approved',
          approvedBy: user.id,
          approvalDate: new Date()
        })
        .where(eq(offers.id, req.params.id));

      res.json({
        success: true,
        message: 'Offer approved. Ready to send to candidate.'
      });
    } catch (error: any) {
      logger.error('Error approving offer:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * Candidate accepts offer
 */
router.post('/offers/:id/accept',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const offer = await db.query.offers.findFirst({
        where: eq(offers.id, req.params.id)
      });

      if (!offer) return;


      await db.update(offers)
        .set({
          status: 'accepted',
          acceptedDate: new Date(),
          respondedDate: new Date()
        })
        .where(eq(offers.id, req.params.id));

      // Update candidate status
      await db.update(candidates)
        .set({
          status: 'hired',
          stage: 'hired'
        })
        .where(eq(candidates.id, offer.candidateId));

      res.json({
        success: true,
        message: 'Offer accepted! Welcome to the team.',
        nextStep: 'onboarding'
      });
    } catch (error: any) {
      logger.error('Error accepting offer:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
