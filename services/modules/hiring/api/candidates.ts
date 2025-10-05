import { Router } from 'express';
import { Logger } from '../../../../utils/logger.js';
import { db } from '../../../../db/index.js';
import { candidates, candidateAssessments, hiringRequisitions } from '../../../../db/schema/hiring.js';
import { eq, and, desc, asc, gte, lte, like, or, inArray } from 'drizzle-orm';
import { CandidateScreeningWorkflow } from '../workflows/screening.js';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface CandidateQueryParams {
  page?: string;
  limit?: string;
  status?: string;
  stage?: string;
  requisitionId?: string;
  source?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
  minScore?: string;
  maxScore?: string;
}

interface CreateCandidateRequest {
  requisitionId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  currentTitle?: string;
  currentCompany?: string;
  yearsOfExperience?: number;
  location?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  resumeUrl?: string;
  coverLetterUrl?: string;
  source: string;
  referredBy?: string;
  expectedSalary?: number;
  availabilityDate?: Date;
  skills?: string[];
  education?: any[];
  workHistory?: any[];
  metadata?: any;
}

interface UpdateCandidateRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  currentTitle?: string;
  currentCompany?: string;
  yearsOfExperience?: number;
  location?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  resumeUrl?: string;
  coverLetterUrl?: string;
  expectedSalary?: number;
  availabilityDate?: Date;
  skills?: string[];
  education?: any[];
  workHistory?: any[];
  notes?: string;
  metadata?: any;
}

interface AssessmentRequest {
  candidateId: string;
  assessmentType?: string;
  skipScreening?: boolean;
  customWeights?: {
    skills?: number;
    experience?: number;
    culture?: number;
    communication?: number;
  };
}

// ============================================================================
// ROUTER SETUP
// ============================================================================

const router = Router();
const logger = new Logger('CandidateAPI');

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * GET /api/hiring/candidates
 * List all candidates with filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const {
      page = '1',
      limit = '20',
      status,
      stage,
      requisitionId,
      source,
      search,
      sortBy = 'appliedAt',
      sortOrder = 'desc',
      dateFrom,
      dateTo,
      minScore,
      maxScore
    } = req.query as CandidateQueryParams;

    logger.info('Fetching candidates', {
      tenantId,
      page,
      limit,
      filters: { status, stage, requisitionId, source, search }
    });

    // Build query conditions
    const conditions = [eq(candidates.tenantId, tenantId)];

    if (status) {
      // Cast required for runtime string to enum comparison - database validates at runtime
      conditions.push(eq(candidates.status, status as any));
    }

    if (stage) {
      // Cast required for runtime string to enum comparison - database validates at runtime
      conditions.push(eq(candidates.stage, stage as any));
    }

    if (requisitionId) {
      conditions.push(eq(candidates.requisitionId, requisitionId));
    }

    if (source) {
      // Cast required for runtime string to enum comparison - database validates at runtime
      conditions.push(eq(candidates.source, source as any));
    }

    if (search) {
      const searchCondition = or(
        like(candidates.firstName, `%${search}%`),
        like(candidates.lastName, `%${search}%`),
        like(candidates.email, `%${search}%`),
        like(candidates.currentTitle, `%${search}%`),
        like(candidates.currentCompany, `%${search}%`)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    if (dateFrom) {
      conditions.push(gte(candidates.appliedAt, new Date(dateFrom)));
    }

    if (dateTo) {
      conditions.push(lte(candidates.appliedAt, new Date(dateTo)));
    }

    if (minScore) {
      conditions.push(gte(candidates.overallScore, parseFloat(minScore).toString()));
    }

    if (maxScore) {
      conditions.push(lte(candidates.overallScore, parseFloat(maxScore).toString()));
    }

    // Build sort order
    const sortColumn = candidates[sortBy as keyof typeof candidates] || candidates.appliedAt;
    const orderFn = sortOrder === 'asc' ? asc : desc;

    // Execute query with pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const candidatesList = await db.select()
      .from(candidates)
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn as any))
      .limit(limitNum)
      .offset(offset);

    // Get total count for pagination
    const totalCandidates = await db.select({ count: candidates.id })
      .from(candidates)
      .where(and(...conditions));

    const total = totalCandidates.length;
    const totalPages = Math.ceil(total / limitNum);

    logger.info('Candidates fetched successfully', {
      count: candidatesList.length,
      total,
      page: pageNum,
      totalPages
    });

    return res.json({
      success: true,
      data: candidatesList,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    logger.error('Error fetching candidates:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch candidates'
    });
  }
});

/**
 * GET /api/hiring/candidates/:id
 * Get a specific candidate by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    logger.info('Fetching candidate by ID', { tenantId, candidateId: id });

    const candidatesList = await db.select()
      .from(candidates)
      .where(and(
        eq(candidates.id, id),
        eq(candidates.tenantId, tenantId)
      ))
      .limit(1);

    if (candidatesList.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }

    const candidate = candidatesList[0];

    // Get candidate assessments
    const assessments = await db.select()
      .from(candidateAssessments)
      .where(eq(candidateAssessments.candidateId, id))
      .orderBy(desc(candidateAssessments.createdAt));

    logger.info('Candidate fetched successfully', { candidateId: id });

    return res.json({
      success: true,
      data: {
        ...candidate,
        assessments
      }
    });
  } catch (error) {
    logger.error('Error fetching candidate:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch candidate'
    });
  }
});

/**
 * POST /api/hiring/candidates
 * Create a new candidate application
 */
router.post('/', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const candidateData: CreateCandidateRequest = req.body;

    logger.info('Creating new candidate', {
      tenantId,
      email: candidateData.email,
      requisitionId: candidateData.requisitionId
    });

    // Validate required fields
    if (!candidateData.firstName || !candidateData.lastName || !candidateData.email || !candidateData.requisitionId) {
      return res.status(400).json({
        success: false,
        error: 'First name, last name, email, and requisition ID are required'
      });
    }

    // Check if requisition exists
    const requisitions = await db.select()
      .from(hiringRequisitions)
      .where(and(
        eq(hiringRequisitions.id, candidateData.requisitionId),
        eq(hiringRequisitions.tenantId, tenantId)
      ))
      .limit(1);

    if (requisitions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid requisition ID'
      });
    }

    // Check for duplicate candidate (same email + requisition)
    const existingCandidates = await db.select()
      .from(candidates)
      .where(and(
        eq(candidates.email, candidateData.email),
        eq(candidates.requisitionId, candidateData.requisitionId),
        eq(candidates.tenantId, tenantId)
      ))
      .limit(1);

    if (existingCandidates.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Candidate already applied for this position'
      });
    }

    // Create candidate
    const [newCandidate] = await db.insert(candidates)
      .values({
        tenantId,
        requisitionId: candidateData.requisitionId,
        firstName: candidateData.firstName || 'Unknown',
        lastName: candidateData.lastName || 'Unknown',
        email: candidateData.email,
        phone: candidateData.phone || '',
        currentTitle: candidateData.currentTitle || '',
        currentCompany: candidateData.currentCompany || '',
        yearsOfExperience: candidateData.yearsOfExperience || 0,
        // location: candidateData.location, // Property doesn't exist in schema
        linkedinUrl: candidateData.linkedinUrl || '',
        portfolioUrl: candidateData.portfolioUrl || '',
        resumeUrl: candidateData.resumeUrl || '',
        coverLetterUrl: candidateData.coverLetterUrl || '',
        source: candidateData.source as any || 'direct',
        referredBy: candidateData.referredBy || '',
        expectedSalary: candidateData.expectedSalary ? candidateData.expectedSalary.toFixed(2) : '0.00',
        availableStartDate: candidateData.availabilityDate,
        skills: candidateData.skills || [],
        education: candidateData.education || [],
        // workHistory: candidateData.workHistory || [], // Property doesn't exist in schema
        status: 'applied',
        stage: 'application',
        appliedAt: new Date()
      })
      .returning();

    logger.info('Candidate created successfully', {
      candidateId: newCandidate.id,
      email: candidateData.email
    });

    return res.status(201).json({
      success: true,
      data: newCandidate,
      message: 'Candidate application submitted successfully'
    });
  } catch (error) {
    logger.error('Error creating candidate:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create candidate'
    });
  }
});

/**
 * PUT /api/hiring/candidates/:id
 * Update an existing candidate
 */
router.put('/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const updateData: UpdateCandidateRequest = req.body;

    logger.info('Updating candidate', {
      tenantId,
      userId,
      candidateId: id
    });

    // Check if candidate exists
    const existingCandidates = await db.select()
      .from(candidates)
      .where(and(
        eq(candidates.id, id),
        eq(candidates.tenantId, tenantId)
      ))
      .limit(1);

    if (existingCandidates.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }

    // Update candidate
    const [updatedCandidate] = await db.update(candidates)
      .set({
        ...updateData,
        expectedSalary: updateData.expectedSalary ? updateData.expectedSalary.toString() : undefined,
        updatedAt: new Date()
      })
      .where(and(
        eq(candidates.id, id),
        eq(candidates.tenantId, tenantId)
      ))
      .returning();

    logger.info('Candidate updated successfully', { candidateId: id });

    return res.json({
      success: true,
      data: updatedCandidate,
      message: 'Candidate updated successfully'
    });
  } catch (error) {
    logger.error('Error updating candidate:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update candidate'
    });
  }
});

/**
 * PATCH /api/hiring/candidates/:id/status
 * Update candidate status and stage
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;
    const { status, stage, reason } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    logger.info('Updating candidate status', {
      tenantId,
      userId,
      candidateId: id,
      newStatus: status,
      newStage: stage
    });

    // Validate status and stage
    const validStatuses = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'];
    const validStages = ['application', 'screening', 'phone_screen', 'technical_interview', 'final_interview', 'offer', 'hired'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    if (stage && !validStages.includes(stage)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid stage'
      });
    }

    // Update status and stage
    const updateData: any = {
      status,
      statusReason: reason,
      updatedAt: new Date()
    };

    if (stage) {
      updateData.stage = stage;
    }

    // Set timestamps based on status
    if (status === 'screening') {
      updateData.screeningStartedDate = new Date();
    } else if (status === 'interview') {
      updateData.interviewStartedDate = new Date();
    } else if (status === 'offer') {
      updateData.offerExtendedDate = new Date();
    } else if (status === 'hired') {
      updateData.hiredDate = new Date();
    } else if (status === 'rejected') {
      updateData.rejectedDate = new Date();
    }

    const [updatedCandidate] = await db.update(candidates)
      .set(updateData)
      .where(and(
        eq(candidates.id, id),
        eq(candidates.tenantId, tenantId)
      ))
      .returning();

    if (!updatedCandidate) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }

    logger.info('Candidate status updated successfully', {
      candidateId: id,
      status,
      stage
    });

    return res.json({
      success: true,
      data: {
        id: updatedCandidate.id,
        status: updatedCandidate.status,
        stage: updatedCandidate.stage,
        // statusReason: updatedCandidate.statusReason // Property doesn't exist in schema
      },
      message: `Candidate status updated to ${status}`
    });
  } catch (error) {
    logger.error('Error updating candidate status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update candidate status'
    });
  }
});

/**
 * POST /api/hiring/candidates/:id/assess
 * Run assessment on a candidate using the screening workflow
 */
router.post('/:id/assess', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const assessmentRequest: AssessmentRequest = req.body;

    logger.info('Running candidate assessment', {
      tenantId,
      userId,
      candidateId: id,
      assessmentType: assessmentRequest.assessmentType
    });

    // Get candidate
    const candidatesList = await db.select()
      .from(candidates)
      .where(and(
        eq(candidates.id, id),
        eq(candidates.tenantId, tenantId)
      ))
      .limit(1);

    if (candidatesList.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }

    const candidate = candidatesList[0];

    // Initialize screening workflow
    const screeningWorkflow = new CandidateScreeningWorkflow();

    // Prepare workflow input
    const workflowInput = {
      tenantId,
      candidateId: id,
      requisitionId: candidate.requisitionId,
      assessmentType: (assessmentRequest.assessmentType || 'comprehensive') as 'comprehensive' | 'skills_only' | 'culture_only' | 'quick_screen',
      skipScreening: assessmentRequest.skipScreening || false,
      customWeights: assessmentRequest.customWeights,
      triggeredBy: userId || 'api'
    };

    // Execute screening workflow
    const assessmentResult = await screeningWorkflow.execute(workflowInput);

    logger.info('Candidate assessment completed', {
      candidateId: id,
      overallScore: assessmentResult.overallScore,
      recommendation: assessmentResult.recommendation
    });

    return res.json({
      success: true,
      data: {
        candidateId: id,
        assessmentId: assessmentResult.assessmentId,
        overallScore: assessmentResult.overallScore,
        scores: assessmentResult.scores,
        recommendation: assessmentResult.recommendation,
        nextSteps: assessmentResult.nextSteps,
        cultureFitAnalysis: assessmentResult.cultureFitAnalysis
      },
      message: 'Candidate assessment completed successfully'
    });
  } catch (error) {
    logger.error('Error running candidate assessment:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to run candidate assessment'
    });
  }
});

/**
 * GET /api/hiring/candidates/:id/assessments
 * Get all assessments for a candidate
 */
router.get('/:id/assessments', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    logger.info('Fetching candidate assessments', {
      tenantId,
      candidateId: id
    });

    // Verify candidate exists
    const candidatesList = await db.select()
      .from(candidates)
      .where(and(
        eq(candidates.id, id),
        eq(candidates.tenantId, tenantId)
      ))
      .limit(1);

    if (candidatesList.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }

    // Get assessments
    const assessments = await db.select()
      .from(candidateAssessments)
      .where(eq(candidateAssessments.candidateId, id))
      .orderBy(desc(candidateAssessments.createdAt));

    logger.info('Candidate assessments fetched', {
      candidateId: id,
      count: assessments.length
    });

    return res.json({
      success: true,
      data: assessments
    });
  } catch (error) {
    logger.error('Error fetching candidate assessments:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch candidate assessments'
    });
  }
});

/**
 * GET /api/hiring/candidates/by-requisition/:requisitionId
 * Get all candidates for a specific requisition
 */
router.get('/by-requisition/:requisitionId', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { requisitionId } = req.params;
    const { status, stage, sortBy = 'overallScore', sortOrder = 'desc' } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    logger.info('Fetching candidates by requisition', {
      tenantId,
      requisitionId,
      filters: { status, stage }
    });

    // Build conditions
    const conditions = [
      eq(candidates.tenantId, tenantId),
      eq(candidates.requisitionId, requisitionId)
    ];

    if (status) {
      // Cast required for runtime string to enum comparison - database validates at runtime
      conditions.push(eq(candidates.status, status as any));
    }

    if (stage) {
      // Cast required for runtime string to enum comparison - database validates at runtime
      conditions.push(eq(candidates.stage, stage as any));
    }

    // Build sort order
    const sortColumn = candidates[sortBy as keyof typeof candidates] || candidates.overallScore;
    const orderFn = sortOrder === 'asc' ? asc : desc;

    const candidatesList = await db.select()
      .from(candidates)
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn as any));

    logger.info('Candidates fetched by requisition', {
      requisitionId,
      count: candidatesList.length
    });

    return res.json({
      success: true,
      data: candidatesList,
      summary: {
        total: candidatesList.length,
        byStatus: candidatesList.reduce((acc, candidate) => {
          acc[candidate.status] = (acc[candidate.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byStage: candidatesList.reduce((acc, candidate) => {
          acc[candidate.stage] = (acc[candidate.stage] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      }
    });
  } catch (error) {
    logger.error('Error fetching candidates by requisition:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch candidates by requisition'
    });
  }
});

/**
 * POST /api/hiring/candidates/:id/notes
 * Add notes to a candidate
 */
router.post('/:id/notes', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;
    const { note, type = 'general' } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    if (!note) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    logger.info('Adding note to candidate', {
      tenantId,
      userId,
      candidateId: id,
      noteType: type
    });

    // Get current candidate
    const candidatesList = await db.select()
      .from(candidates)
      .where(and(
        eq(candidates.id, id),
        eq(candidates.tenantId, tenantId)
      ))
      .limit(1);

    if (candidatesList.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }

    const candidate = candidatesList[0];
    // Notes is actually a text field in schema, but code treats it as array
    // Parse as array if it's JSON, otherwise start with empty array
    const existingNotes: Array<{id: string; content: string; type?: string; addedBy?: string; addedAt: string}> =
      typeof candidate.notes === 'string' && candidate.notes.startsWith('[')
        ? JSON.parse(candidate.notes)
        : [];

    // Add new note
    const newNote = {
      id: Date.now().toString(),
      content: note,
      type,
      addedBy: userId,
      addedAt: new Date().toISOString()
    };

    existingNotes.push(newNote);

    // Update candidate
    await db.update(candidates)
      .set({
        notes: JSON.stringify(existingNotes),
        updatedAt: new Date()
      })
      .where(and(
        eq(candidates.id, id),
        eq(candidates.tenantId, tenantId)
      ));

    logger.info('Note added to candidate successfully', { candidateId: id });

    return res.json({
      success: true,
      data: newNote,
      message: 'Note added successfully'
    });
  } catch (error) {
    logger.error('Error adding note to candidate:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to add note'
    });
  }
});

/**
 * DELETE /api/hiring/candidates/:id
 * Delete a candidate (soft delete)
 */
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    logger.info('Deleting candidate', {
      tenantId,
      userId,
      candidateId: id
    });

    // Check if candidate exists
    const existingCandidates = await db.select()
      .from(candidates)
      .where(and(
        eq(candidates.id, id),
        eq(candidates.tenantId, tenantId)
      ))
      .limit(1);

    if (existingCandidates.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Candidate not found'
      });
    }

    const candidate = existingCandidates[0];

    // Check if candidate can be deleted
    if (candidate.status === 'hired') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete hired candidate'
      });
    }

    // Soft delete (update status to withdrawn)
    await db.update(candidates)
      .set({
        status: 'withdrawn',
        // statusReason: 'Deleted by user', // Property doesn't exist in schema
        updatedAt: new Date()
      })
      .where(and(
        eq(candidates.id, id),
        eq(candidates.tenantId, tenantId)
      ));

    logger.info('Candidate deleted successfully', { candidateId: id });

    return res.json({
      success: true,
      message: 'Candidate deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting candidate:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete candidate'
    });
  }
});

export default router;
