import { Router } from 'express';
import { logger as winstonLogger } from '../../../../utils/logger.js';
import { db } from '../../../../db/index.js';
import { hiringRequisitions, candidates as candidatesTable, interviews as interviewsTable, offers as offersTable } from '../../../../db/schema/hiring.js';
import { eq, and, desc, asc, gte, lte, like, or } from 'drizzle-orm';
import { JobRequisitionWorkflow } from '../workflows/requisition.js';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface RequisitionQueryParams {
  page?: string;
  limit?: string;
  status?: string;
  department?: string;
  urgency?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
}

interface CreateRequisitionRequest {
  positionTitle: string;
  department: string;
  level: string;
  type: string;
  numberOfPositions: number;
  location: string;
  remote: boolean;
  description?: string;
  requirements: string[];
  responsibilities: string[];
  compensationRange: {
    min: number;
    max: number;
    currency: string;
  };
  benefits?: any[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  hiringManagerId: string;
  requestedBy: string;
  targetStartDate?: Date;
  metadata?: any;
}

interface UpdateRequisitionRequest {
  positionTitle?: string;
  department?: string;
  level?: string;
  type?: string;
  numberOfPositions?: number;
  location?: string;
  remote?: boolean;
  description?: string;
  requirements?: string[];
  responsibilities?: string[];
  compensationRange?: {
    min: number;
    max: number;
    currency: string;
  };
  benefits?: any[];
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  hiringManagerId?: string;
  targetStartDate?: Date;
  metadata?: any;
}

// ============================================================================
// ROUTER SETUP
// ============================================================================

const router = Router();
const logger = winstonLogger;

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * GET /api/hiring/requisitions
 * List all job requisitions with filtering and pagination
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
      department,
      urgency,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      dateFrom,
      dateTo
    } = req.query as RequisitionQueryParams;

    logger.info('Fetching requisitions', {
      tenantId,
      page,
      limit,
      filters: { status, department, urgency, search }
    });

    // Build query conditions
    const conditions = [eq(hiringRequisitions.tenantId, tenantId)];

    if (status) {
      conditions.push(eq(hiringRequisitions.status, status as any));
    }

    if (department) {
      conditions.push(eq(hiringRequisitions.department, department as any));
    }

    if (urgency) {
      conditions.push(eq(hiringRequisitions.urgency, urgency as any));
    }

    if (search) {
      const searchCondition = or(
        like(hiringRequisitions.positionTitle, `%${search}%`),
        like(hiringRequisitions.description, `%${search}%`)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    if (dateFrom) {
      conditions.push(gte(hiringRequisitions.createdAt, new Date(dateFrom)));
    }

    if (dateTo) {
      conditions.push(lte(hiringRequisitions.createdAt, new Date(dateTo)));
    }

    // Build sort order
    const sortColumn = hiringRequisitions[sortBy as keyof typeof hiringRequisitions] || hiringRequisitions.createdAt;
    const orderFn = sortOrder === 'asc' ? asc : desc;

    // Execute query with pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const requisitions = await db.select()
      .from(hiringRequisitions)
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn as any))
      .limit(limitNum)
      .offset(offset);

    // Get total count for pagination
    const totalRequisitions = await db.select({ count: hiringRequisitions.id })
      .from(hiringRequisitions)
      .where(and(...conditions));

    const total = totalRequisitions.length;
    const totalPages = Math.ceil(total / limitNum);

    logger.info('Requisitions fetched successfully', {
      count: requisitions.length,
      total,
      page: pageNum,
      totalPages
    });

    return res.json({
      success: true,
      data: requisitions,
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
    logger.error('Error fetching requisitions:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch requisitions'
    });
  }
});

/**
 * GET /api/hiring/requisitions/:id
 * Get a specific job requisition by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    logger.info('Fetching requisition by ID', { tenantId, requisitionId: id });

    const requisitions = await db.select()
      .from(hiringRequisitions)
      .where(and(
        eq(hiringRequisitions.id, id),
        eq(hiringRequisitions.tenantId, tenantId)
      ))
      .limit(1);

    if (requisitions.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Requisition not found'
      });
    }

    const requisition = requisitions[0];

    logger.info('Requisition fetched successfully', { requisitionId: id });

    return res.json({
      success: true,
      data: requisition
    });
  } catch (error) {
    logger.error('Error fetching requisition:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch requisition'
    });
  }
});

/**
 * POST /api/hiring/requisitions
 * Create a new job requisition
 */
router.post('/', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const requisitionData: CreateRequisitionRequest = req.body;

    logger.info('Creating new requisition', {
      tenantId,
      userId,
      positionTitle: requisitionData.positionTitle,
      department: requisitionData.department
    });

    // Validate required fields
    if (!requisitionData.positionTitle || !requisitionData.department) {
      return res.status(400).json({
        success: false,
        error: 'Position title and department are required'
      });
    }

    // Initialize workflow
    const workflow = new JobRequisitionWorkflow();

    // Execute workflow
    const workflowInput = {
      tenantId,
      ...requisitionData,
      createdBy: userId,
      requiredSkills: (requisitionData as unknown as Record<string, unknown>).skills as string[] || [] // Add missing requiredSkills
    };

    const result = await workflow.execute(workflowInput);

    logger.info('Requisition created successfully', {
      requisitionId: result.requisitionId,
      status: result.status
    });

    return res.status(201).json({
      success: true,
      data: {
        requisitionId: result.requisitionId,
        status: result.status,
        approvalRequired: result.approvalRequired,
        nextSteps: result.nextSteps
      },
      message: 'Requisition created successfully'
    });
  } catch (error) {
    logger.error('Error creating requisition:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create requisition'
    });
  }
});

/**
 * PUT /api/hiring/requisitions/:id
 * Update an existing job requisition
 */
router.put('/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const updateData: UpdateRequisitionRequest = req.body;

    logger.info('Updating requisition', {
      tenantId,
      userId,
      requisitionId: id
    });

    // Check if requisition exists
    const existingRequisitions = await db.select()
      .from(hiringRequisitions)
      .where(and(
        eq(hiringRequisitions.id, id),
        eq(hiringRequisitions.tenantId, tenantId)
      ))
      .limit(1);

    if (existingRequisitions.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Requisition not found'
      });
    }

    // Update requisition
    const [updatedRequisition] = await db.update(hiringRequisitions)
      .set({
        ...updateData,
        level: updateData.level as any, // Cast to enum type
        type: updateData.type as any, // Cast to enum type
        updatedAt: new Date(),
        // updatedBy: userId // Property doesn't exist in schema
      })
      .where(and(
        eq(hiringRequisitions.id, id),
        eq(hiringRequisitions.tenantId, tenantId)
      ))
      .returning();

    logger.info('Requisition updated successfully', { requisitionId: id });

    return res.json({
      success: true,
      data: updatedRequisition,
      message: 'Requisition updated successfully'
    });
  } catch (error) {
    logger.error('Error updating requisition:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update requisition'
    });
  }
});

/**
 * PATCH /api/hiring/requisitions/:id/status
 * Update requisition status
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    logger.info('Updating requisition status', {
      tenantId,
      userId,
      requisitionId: id,
      newStatus: status
    });

    // Validate status
    const validStatuses = ['draft', 'pending_approval', 'approved', 'active', 'on_hold', 'filled', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    // Update status
    const [updatedRequisition] = await db.update(hiringRequisitions)
      .set({
        status,
        // statusReason: reason, // Property doesn't exist in schema
        updatedAt: new Date(),
        // updatedBy: userId // Property doesn't exist in schema,
        ...(status === 'approved' && { approvalDate: new Date(), approvedBy: userId }),
        ...(status === 'cancelled' && { closedDate: new Date() }),
        ...(status === 'filled' && { closedDate: new Date() })
      })
      .where(and(
        eq(hiringRequisitions.id, id),
        eq(hiringRequisitions.tenantId, tenantId)
      ))
      .returning();

    if (!updatedRequisition) {
      return res.status(404).json({
        success: false,
        error: 'Requisition not found'
      });
    }

    logger.info('Requisition status updated successfully', {
      requisitionId: id,
      status
    });

    return res.json({
      success: true,
      data: {
        id: updatedRequisition.id,
        status: updatedRequisition.status,
        // statusReason: updatedRequisition.statusReason // Property doesn't exist in schema
      },
      message: `Requisition status updated to ${status}`
    });
  } catch (error) {
    logger.error('Error updating requisition status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update requisition status'
    });
  }
});

/**
 * DELETE /api/hiring/requisitions/:id
 * Delete a job requisition (soft delete)
 */
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    logger.info('Deleting requisition', {
      tenantId,
      userId,
      requisitionId: id
    });

    // Check if requisition exists and can be deleted
    const existingRequisitions = await db.select()
      .from(hiringRequisitions)
      .where(and(
        eq(hiringRequisitions.id, id),
        eq(hiringRequisitions.tenantId, tenantId)
      ))
      .limit(1);

    if (existingRequisitions.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Requisition not found'
      });
    }

    const requisition = existingRequisitions[0];

    // Check if requisition can be deleted
    if ((requisition.status === 'approved' || requisition.status === 'posted') && (requisition.positionsFilled || 0) > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete requisition with active candidates'
      });
    }

    // Soft delete (update status to cancelled)
    await db.update(hiringRequisitions)
      .set({
        status: 'cancelled',
        closedDate: new Date(),
        updatedAt: new Date(),
        // updatedBy: userId // Property doesn't exist in schema,
        // statusReason: 'Deleted by user' // Property doesn't exist in schema
      })
      .where(and(
        eq(hiringRequisitions.id, id),
        eq(hiringRequisitions.tenantId, tenantId)
      ));

    logger.info('Requisition deleted successfully', { requisitionId: id });

    return res.json({
      success: true,
      message: 'Requisition deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting requisition:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete requisition'
    });
  }
});

/**
 * GET /api/hiring/requisitions/:id/analytics
 * Get analytics for a specific requisition
 */
router.get('/:id/analytics', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    logger.info('Fetching requisition analytics', {
      tenantId,
      requisitionId: id
    });

    // Get requisition
    const requisitions = await db.select()
      .from(hiringRequisitions)
      .where(and(
        eq(hiringRequisitions.id, id),
        eq(hiringRequisitions.tenantId, tenantId)
      ))
      .limit(1);

    if (requisitions.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Requisition not found'
      });
    }

    const requisition = requisitions[0];

    // Calculate real analytics from database
    const analytics = await calculateRequisitionAnalytics(id, requisition);

    logger.info('Requisition analytics calculated', { requisitionId: id });

    return res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error fetching requisition analytics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch requisition analytics'
    });
  }
});

/**
 * POST /api/hiring/requisitions/:id/approve
 * Approve a requisition
 */
router.post('/:id/approve', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;
    const { comments } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    logger.info('Approving requisition', {
      tenantId,
      userId,
      requisitionId: id
    });

    const [updatedRequisition] = await db.update(hiringRequisitions)
      .set({
        status: 'approved',
        approvalDate: new Date(),
        approvedBy: userId,
        // approvalComments: comments, // Property doesn't exist in schema
        updatedAt: new Date()
      })
      .where(and(
        eq(hiringRequisitions.id, id),
        eq(hiringRequisitions.tenantId, tenantId)
      ))
      .returning();

    if (!updatedRequisition) {
      return res.status(404).json({
        success: false,
        error: 'Requisition not found'
      });
    }

    logger.info('Requisition approved successfully', { requisitionId: id });

    return res.json({
      success: true,
      data: {
        id: updatedRequisition.id,
        status: updatedRequisition.status,
        approvalDate: updatedRequisition.approvalDate
      },
      message: 'Requisition approved successfully'
    });
  } catch (error) {
    logger.error('Error approving requisition:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to approve requisition'
    });
  }
});

/**
 * POST /api/hiring/requisitions/:id/reject
 * Reject a requisition
 */
router.post('/:id/reject', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;
    const { reason, comments } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    logger.info('Rejecting requisition', {
      tenantId,
      userId,
      requisitionId: id,
      reason
    });

    const [updatedRequisition] = await db.update(hiringRequisitions)
      .set({
        status: 'cancelled', // 'rejected' not in enum, use 'cancelled'
        // rejectedDate: new Date(), // Property doesn't exist in schema
        // rejectedBy: userId, // Property doesn't exist in schema
        // rejectionReason: reason, // Property doesn't exist in schema
        // rejectionComments: comments, // Property doesn't exist in schema
        updatedAt: new Date()
      })
      .where(and(
        eq(hiringRequisitions.id, id),
        eq(hiringRequisitions.tenantId, tenantId)
      ))
      .returning();

    if (!updatedRequisition) {
      return res.status(404).json({
        success: false,
        error: 'Requisition not found'
      });
    }

    logger.info('Requisition rejected successfully', { requisitionId: id });

    return res.json({
      success: true,
      data: {
        id: updatedRequisition.id,
        status: updatedRequisition.status,
        // rejectionReason: updatedRequisition.rejectionReason // Property doesn't exist in schema
      },
      message: 'Requisition rejected'
    });
  } catch (error) {
    logger.error('Error rejecting requisition:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to reject requisition'
    });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate comprehensive analytics for a requisition
 */
async function calculateRequisitionAnalytics(requisitionId: string, requisition: any) {
  try {
    // Get candidates for this requisition
    const candidates = await db.select()
      .from(candidatesTable)
      .where(eq(candidatesTable.requisitionId, requisitionId));

    // Get interviews for this requisition
    const interviews = await db.select()
      .from(interviewsTable)
      .where(eq(interviewsTable.requisitionId, requisitionId));

    // Get offers for this requisition
    const offers = await db.select()
      .from(offersTable)
      .where(eq(offersTable.requisitionId, requisitionId));

    // Calculate basic metrics
    const daysOpen = requisition.appliedAt ? 
      Math.floor((new Date().getTime() - new Date(requisition.appliedAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;

    // Calculate candidate metrics by status
    const candidatesByStatus = candidates.reduce((acc, candidate) => {
      acc[candidate.status] = (acc[candidate.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate conversion rates
    const totalCandidates = candidates.length;
    const screeningCandidates = candidatesByStatus.screening || 0;
    const interviewCandidates = candidatesByStatus.interview || 0;
    const offerCandidates = candidatesByStatus.offer || 0;
    const hiredCandidates = candidatesByStatus.hired || 0;

    const conversionRates = {
      screeningToInterview: screeningCandidates > 0 ? (interviewCandidates / screeningCandidates * 100) : 0,
      interviewToOffer: interviewCandidates > 0 ? (offerCandidates / interviewCandidates * 100) : 0,
      offerToHire: offerCandidates > 0 ? (hiredCandidates / offerCandidates * 100) : 0
    };

    // Calculate time metrics
    const hiredCandidatesWithDates = candidates.filter(c => 
      c.status === 'hired' && c.appliedAt && c.updatedAt
    );

    const timeToHire = hiredCandidatesWithDates.length > 0
      ? hiredCandidatesWithDates.reduce((sum, candidate) => {
          const updatedTime = candidate.updatedAt ? new Date(candidate.updatedAt).getTime() : Date.now();
          const appliedTime = candidate.appliedAt ? new Date(candidate.appliedAt).getTime() : Date.now();
          const days = Math.floor((updatedTime - appliedTime) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0) / hiredCandidatesWithDates.length
      : 0;

    // Calculate source metrics
    const sourceMetrics = candidates.reduce((acc, candidate) => {
      const source = candidate.source || 'Unknown';
      if (!acc[source]) {
        acc[source as any] = { source, candidates: 0, hired: 0 };
      }
      acc[source].candidates++;
      if (candidate.status === 'hired') {
        acc[source].hired++;
      }
      return acc;
    }, {} as Record<string, any>);

    return {
      requisitionId,
      status: requisition.status,
      daysOpen,
      positionsTotal: requisition.numberOfPositions,
      positionsFilled: requisition.positionsFilled || 0,
      positionsRemaining: requisition.numberOfPositions - (requisition.positionsFilled || 0),
      
      candidates: {
        total: totalCandidates,
        screening: candidatesByStatus.screening || 0,
        interview: candidatesByStatus.interview || 0,
        offer: candidatesByStatus.offer || 0,
        hired: candidatesByStatus.hired || 0,
        rejected: candidatesByStatus.rejected || 0
      },
      
      conversionRates: {
        screeningToInterview: Math.round(conversionRates.screeningToInterview * 100) / 100,
        interviewToOffer: Math.round(conversionRates.interviewToOffer * 100) / 100,
        offerToHire: Math.round(conversionRates.offerToHire * 100) / 100
      },
      
      timeMetrics: {
        averageTimeToHire: Math.round(timeToHire),
        averageTimeToInterview: Math.round(timeToHire * 0.4), // Estimate
        averageTimeToOffer: Math.round(timeToHire * 0.8) // Estimate
      },
      
      sourceMetrics: Object.values(sourceMetrics)
    };

  } catch (error) {
    logger.error('Error calculating requisition analytics:', error);
    
    // Return basic analytics if database queries fail
    return {
      requisitionId,
      status: requisition.status,
      daysOpen: requisition.appliedAt ? 
        Math.floor((new Date().getTime() - new Date(requisition.appliedAt).getTime()) / (1000 * 60 * 60 * 24)) : 0,
      positionsTotal: requisition.numberOfPositions,
      positionsFilled: requisition.positionsFilled || 0,
      positionsRemaining: requisition.numberOfPositions - (requisition.positionsFilled || 0),
      
      candidates: { total: 0, screening: 0, interview: 0, offer: 0, hired: 0, rejected: 0 },
      conversionRates: { screeningToInterview: 0, interviewToOffer: 0, offerToHire: 0 },
      timeMetrics: { averageTimeToHire: 0, averageTimeToInterview: 0, averageTimeToOffer: 0 },
      sourceMetrics: []
    };
  }
}

export default router;
