/**
 * Hiring Routes
 * Production-ready implementation with real database queries
 */

import express from 'express';
import { authenticate } from '../middleware/auth';
import { db } from '../../db';
import {
  hiringRequisitions,
  jobPostings,
  candidates,
  candidateAssessments,
  interviews,
  offers
} from '../../db/schema/hiring';
import { eq, and, desc, count, sql } from 'drizzle-orm';

const router = express.Router();

// ============================================================================
// GET /api/hiring/overview - Dashboard overview data
// ============================================================================
router.get('/overview', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId;

    // Get requisition counts by status
    const requisitionStats = await db
      .select({
        status: hiringRequisitions.status,
        count: count()
      })
      .from(hiringRequisitions)
      .where(eq(hiringRequisitions.tenantId, tenantId))
      .groupBy(hiringRequisitions.status);

    // Get candidate counts by status
    const candidateStats = await db
      .select({
        status: candidates.status,
        count: count()
      })
      .from(candidates)
      .where(eq(candidates.tenantId, tenantId))
      .groupBy(candidates.status);

    // Get interview counts by status
    const interviewStats = await db
      .select({
        status: interviews.status,
        count: count()
      })
      .from(interviews)
      .where(eq(interviews.tenantId, tenantId))
      .groupBy(interviews.status);

    // Get offer counts by status
    const offerStats = await db
      .select({
        status: offers.status,
        count: count()
      })
      .from(offers)
      .where(eq(offers.tenantId, tenantId))
      .groupBy(offers.status);

    // Calculate metrics
    const openRequisitions = requisitionStats
      .filter(s => ['approved', 'posted'].includes(s.status || ''))
      .reduce((acc, s) => acc + (s.count || 0), 0);

    const totalCandidates = candidateStats.reduce((acc, s) => acc + (s.count || 0), 0);
    const activeCandidates = candidateStats
      .filter(s => ['applied', 'screening', 'interview'].includes(s.status || ''))
      .reduce((acc, s) => acc + (s.count || 0), 0);

    const scheduledInterviews = interviewStats
      .find(s => s.status === 'scheduled')?.count || 0;

    const pendingOffers = offerStats
      .filter(s => ['sent', 'negotiating'].includes(s.status || ''))
      .reduce((acc, s) => acc + (s.count || 0), 0);

    const hiredThisMonth = candidateStats
      .find(s => s.status === 'hired')?.count || 0;

    res.json({
      metrics: {
        openRequisitions,
        totalCandidates,
        activeCandidates,
        scheduledInterviews,
        pendingOffers,
        hiredThisMonth
      },
      requisitionStats,
      candidateStats,
      interviewStats,
      offerStats
    });
  } catch (error) {
    console.error('Error fetching hiring overview:', error);
    res.status(500).json({ error: 'Failed to fetch hiring overview' });
  }
});

// ============================================================================
// GET /api/hiring/requisitions - Get all requisitions
// ============================================================================
router.get('/requisitions', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId;

    const allRequisitions = await db
      .select()
      .from(hiringRequisitions)
      .where(eq(hiringRequisitions.tenantId, tenantId))
      .orderBy(desc(hiringRequisitions.createdAt));

    // Get candidate counts for each requisition
    const candidateCounts = await db
      .select({
        requisitionId: candidates.requisitionId,
        count: count()
      })
      .from(candidates)
      .where(eq(candidates.tenantId, tenantId))
      .groupBy(candidates.requisitionId);

    const countMap = new Map(candidateCounts.map(c => [c.requisitionId, c.count]));

    const requisitionsWithCounts = allRequisitions.map(req => ({
      id: req.id,
      positionTitle: req.positionTitle,
      department: req.department,
      level: req.level,
      type: req.type,
      location: req.location,
      remote: req.remote,
      status: req.status,
      urgency: req.urgency,
      numberOfPositions: req.numberOfPositions,
      positionsFilled: req.positionsFilled,
      targetStartDate: req.targetStartDate,
      createdAt: req.createdAt,
      candidateCount: countMap.get(req.id) || 0,
      compensationRange: req.compensationRange,
      requiredSkills: req.requiredSkills
    }));

    res.json({ requisitions: requisitionsWithCounts });
  } catch (error) {
    console.error('Error fetching requisitions:', error);
    res.status(500).json({ error: 'Failed to fetch requisitions' });
  }
});

// ============================================================================
// POST /api/hiring/requisitions - Create a new requisition
// ============================================================================
router.post('/requisitions', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId;
    const employeeId = user.id;

    const [requisition] = await db
      .insert(hiringRequisitions)
      .values({
        tenantId,
        requestedBy: employeeId,
        hiringManagerId: employeeId,
        ...req.body
      })
      .returning();

    res.json({ success: true, requisition });
  } catch (error) {
    console.error('Error creating requisition:', error);
    res.status(500).json({ error: 'Failed to create requisition' });
  }
});

// ============================================================================
// GET /api/hiring/jobs - Get all job postings
// ============================================================================
router.get('/jobs', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId;

    const allJobs = await db
      .select()
      .from(jobPostings)
      .where(eq(jobPostings.tenantId, tenantId))
      .orderBy(desc(jobPostings.createdAt));

    const jobsWithStats = allJobs.map(job => ({
      id: job.id,
      title: job.title,
      description: job.description,
      location: job.location,
      remote: job.remote,
      status: job.status,
      salaryRange: job.salaryRange,
      views: job.views,
      applications: job.applications,
      publishedAt: job.publishedAt,
      expiresAt: job.expiresAt,
      requisitionId: job.requisitionId,
      companyName: job.companyName
    }));

    res.json({ jobs: jobsWithStats });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// ============================================================================
// GET /api/hiring/applications - Get all candidates/applications
// ============================================================================
router.get('/applications', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId;

    const allCandidates = await db
      .select({
        candidate: candidates,
        requisition: hiringRequisitions
      })
      .from(candidates)
      .leftJoin(hiringRequisitions, eq(candidates.requisitionId, hiringRequisitions.id))
      .where(eq(candidates.tenantId, tenantId))
      .orderBy(desc(candidates.appliedAt));

    const applicationsWithDetails = allCandidates.map(c => ({
      id: c.candidate.id,
      firstName: c.candidate.firstName,
      lastName: c.candidate.lastName,
      email: c.candidate.email,
      phone: c.candidate.phone,
      currentCompany: c.candidate.currentCompany,
      currentTitle: c.candidate.currentTitle,
      source: c.candidate.source,
      status: c.candidate.status,
      stage: c.candidate.stage,
      overallScore: c.candidate.overallScore,
      skillsScore: c.candidate.skillsScore,
      cultureScore: c.candidate.cultureScore,
      appliedAt: c.candidate.appliedAt,
      linkedinUrl: c.candidate.linkedinUrl,
      resumeUrl: c.candidate.resumeUrl,
      requisitionId: c.candidate.requisitionId,
      positionTitle: c.requisition?.positionTitle || 'Unknown Position',
      department: c.requisition?.department || ''
    }));

    res.json({ applications: applicationsWithDetails });
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// ============================================================================
// PUT /api/hiring/applications/:id/status - Update candidate status
// ============================================================================
router.put('/applications/:id/status', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId;
    const { id } = req.params;
    const { status, stage } = req.body;

    const [updated] = await db
      .update(candidates)
      .set({
        status,
        stage,
        updatedAt: new Date(),
        lastUpdatedBy: user.id
      })
      .where(and(
        eq(candidates.id, id),
        eq(candidates.tenantId, tenantId)
      ))
      .returning();

    res.json({ success: true, candidate: updated });
  } catch (error) {
    console.error('Error updating candidate status:', error);
    res.status(500).json({ error: 'Failed to update candidate status' });
  }
});

// ============================================================================
// GET /api/hiring/interviews - Get all interviews
// ============================================================================
router.get('/interviews', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId;

    const allInterviews = await db
      .select({
        interview: interviews,
        candidate: candidates,
        requisition: hiringRequisitions
      })
      .from(interviews)
      .leftJoin(candidates, eq(interviews.candidateId, candidates.id))
      .leftJoin(hiringRequisitions, eq(interviews.requisitionId, hiringRequisitions.id))
      .where(eq(interviews.tenantId, tenantId))
      .orderBy(desc(interviews.scheduledDate));

    const interviewsWithDetails = allInterviews.map(i => ({
      id: i.interview.id,
      title: i.interview.title,
      interviewType: i.interview.interviewType,
      round: i.interview.round,
      scheduledDate: i.interview.scheduledDate,
      duration: i.interview.duration,
      status: i.interview.status,
      location: i.interview.location,
      meetingLink: i.interview.meetingLink,
      interviewers: i.interview.interviewers,
      recommendation: i.interview.recommendation,
      overallScore: i.interview.overallScore,
      candidateId: i.interview.candidateId,
      candidateName: i.candidate ? `${i.candidate.firstName} ${i.candidate.lastName}` : 'Unknown',
      candidateEmail: i.candidate?.email || '',
      positionTitle: i.requisition?.positionTitle || 'Unknown Position',
      department: i.requisition?.department || ''
    }));

    res.json({ interviews: interviewsWithDetails });
  } catch (error) {
    console.error('Error fetching interviews:', error);
    res.status(500).json({ error: 'Failed to fetch interviews' });
  }
});

// ============================================================================
// POST /api/hiring/interviews - Schedule a new interview
// ============================================================================
router.post('/interviews', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId;

    const [interview] = await db
      .insert(interviews)
      .values({
        tenantId,
        ...req.body
      })
      .returning();

    res.json({ success: true, interview });
  } catch (error) {
    console.error('Error scheduling interview:', error);
    res.status(500).json({ error: 'Failed to schedule interview' });
  }
});

// ============================================================================
// PUT /api/hiring/interviews/:id - Update interview
// ============================================================================
router.put('/interviews/:id', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId;
    const { id } = req.params;

    const [updated] = await db
      .update(interviews)
      .set({
        ...req.body,
        updatedAt: new Date()
      })
      .where(and(
        eq(interviews.id, id),
        eq(interviews.tenantId, tenantId)
      ))
      .returning();

    res.json({ success: true, interview: updated });
  } catch (error) {
    console.error('Error updating interview:', error);
    res.status(500).json({ error: 'Failed to update interview' });
  }
});

// ============================================================================
// GET /api/hiring/offers - Get all offers
// ============================================================================
router.get('/offers', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId;

    const allOffers = await db
      .select({
        offer: offers,
        candidate: candidates,
        requisition: hiringRequisitions
      })
      .from(offers)
      .leftJoin(candidates, eq(offers.candidateId, candidates.id))
      .leftJoin(hiringRequisitions, eq(offers.requisitionId, hiringRequisitions.id))
      .where(eq(offers.tenantId, tenantId))
      .orderBy(desc(offers.createdAt));

    const offersWithDetails = allOffers.map(o => ({
      id: o.offer.id,
      positionTitle: o.offer.positionTitle,
      department: o.offer.department,
      salary: o.offer.salary,
      currency: o.offer.currency,
      status: o.offer.status,
      startDate: o.offer.startDate,
      sentDate: o.offer.sentDate,
      expiryDate: o.offer.expiryDate,
      acceptedDate: o.offer.acceptedDate,
      candidateId: o.offer.candidateId,
      candidateName: o.candidate ? `${o.candidate.firstName} ${o.candidate.lastName}` : 'Unknown',
      candidateEmail: o.candidate?.email || '',
      bonus: o.offer.bonus,
      equity: o.offer.equity,
      benefits: o.offer.benefits
    }));

    res.json({ offers: offersWithDetails });
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

// ============================================================================
// GET /api/hiring/compensation - Get compensation data
// ============================================================================
router.get('/compensation', authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenantId;

    // Get compensation ranges from requisitions
    const requisitionsData = await db
      .select({
        positionTitle: hiringRequisitions.positionTitle,
        department: hiringRequisitions.department,
        level: hiringRequisitions.level,
        compensationRange: hiringRequisitions.compensationRange,
        location: hiringRequisitions.location
      })
      .from(hiringRequisitions)
      .where(eq(hiringRequisitions.tenantId, tenantId));

    // Get offer data for comparison
    const offersData = await db
      .select({
        positionTitle: offers.positionTitle,
        department: offers.department,
        level: offers.level,
        salary: offers.salary,
        currency: offers.currency,
        status: offers.status
      })
      .from(offers)
      .where(eq(offers.tenantId, tenantId));

    // Calculate compensation benchmarks by department
    const departmentBenchmarks = new Map<string, { count: number; totalMin: number; totalMax: number }>();

    requisitionsData.forEach(req => {
      const range = req.compensationRange as { min?: number; max?: number } | null;
      if (range?.min && range?.max) {
        const existing = departmentBenchmarks.get(req.department) || { count: 0, totalMin: 0, totalMax: 0 };
        departmentBenchmarks.set(req.department, {
          count: existing.count + 1,
          totalMin: existing.totalMin + range.min,
          totalMax: existing.totalMax + range.max
        });
      }
    });

    const benchmarks = Array.from(departmentBenchmarks.entries()).map(([dept, data]) => ({
      department: dept,
      avgMinSalary: Math.round(data.totalMin / data.count),
      avgMaxSalary: Math.round(data.totalMax / data.count),
      positionCount: data.count
    }));

    res.json({
      requisitions: requisitionsData,
      offers: offersData,
      benchmarks
    });
  } catch (error) {
    console.error('Error fetching compensation data:', error);
    res.status(500).json({ error: 'Failed to fetch compensation data' });
  }
});

export default router;
