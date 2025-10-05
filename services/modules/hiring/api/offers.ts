import { Router } from 'express';
import { Logger } from '../../../../utils/logger.js';
import { db } from '../../../../db/index.js';
import { offers, candidates, hiringRequisitions } from '../../../../db/schema/hiring.js';
import { eq, and, desc, asc, gte, lte, like, or } from 'drizzle-orm';
import { OfferManagementWorkflow } from '../workflows/offers.js';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface OfferQueryParams {
  page?: string;
  limit?: string;
  status?: string;
  candidateId?: string;
  requisitionId?: string;
  salaryMin?: string;
  salaryMax?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface GenerateOfferRequest {
  candidateId: string;
  requisitionId: string;
  salary: number;
  currency?: string;
  bonus?: {
    type: string;
    amount: number;
    description: string;
  };
  equity?: {
    type: string;
    amount: number;
    vestingSchedule: string;
  };
  signOnBonus?: number;
  benefits?: any[];
  relocationAssistance?: boolean;
  relocationPackage?: any;
  startDate: Date;
  employmentType?: string;
  probationPeriod?: string;
  requiresApproval?: boolean;
  approvedBy?: string;
  metadata?: any;
}

interface UpdateOfferRequest {
  salary?: number;
  currency?: string;
  bonus?: {
    type: string;
    amount: number;
    description: string;
  };
  equity?: {
    type: string;
    amount: number;
    vestingSchedule: string;
  };
  signOnBonus?: number;
  benefits?: any[];
  relocationAssistance?: boolean;
  relocationPackage?: any;
  startDate?: Date;
  employmentType?: string;
  probationPeriod?: string;
  metadata?: any;
}

interface NegotiateOfferRequest {
  counterOffer: {
    salary?: number;
    bonus?: number;
    equity?: any;
    startDate?: Date;
    otherTerms?: any;
  };
  candidateNotes?: string;
}

// ============================================================================
// ROUTER SETUP
// ============================================================================

const router = Router();
const logger = new Logger('OfferAPI');

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * GET /api/hiring/offers
 * List all offers with filtering and pagination
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
      candidateId,
      requisitionId,
      salaryMin,
      salaryMax,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query as OfferQueryParams;

    logger.info('Fetching offers', {
      tenantId,
      page,
      limit,
      filters: { status, candidateId, requisitionId }
    });

    // Build query conditions
    const conditions = [eq(offers.tenantId, tenantId)];

    if (status) {
      conditions.push(eq(offers.status, status as any));
    }

    if (candidateId) {
      conditions.push(eq(offers.candidateId, candidateId as any));
    }

    if (requisitionId) {
      conditions.push(eq(offers.requisitionId, requisitionId as any));
    }

    if (salaryMin) {
      conditions.push(gte(offers.salary, salaryMin));
    }

    if (salaryMax) {
      conditions.push(lte(offers.salary, salaryMax));
    }

    if (dateFrom) {
      conditions.push(gte(offers.createdAt, new Date(dateFrom)));
    }

    if (dateTo) {
      conditions.push(lte(offers.createdAt, new Date(dateTo)));
    }

    // Build sort order
    const sortColumn = offers[sortBy as keyof typeof offers] || offers.createdAt;
    const orderFn = sortOrder === 'asc' ? asc : desc;

    // Execute query with pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const offersList = await db.select()
      .from(offers)
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn as any))
      .limit(limitNum)
      .offset(offset);

    // Get total count for pagination
    const totalOffers = await db.select({ count: offers.id })
      .from(offers)
      .where(and(...conditions));

    const total = totalOffers.length;
    const totalPages = Math.ceil(total / limitNum);

    logger.info('Offers fetched successfully', {
      count: offersList.length,
      total,
      page: pageNum,
      totalPages
    });

    return res.json({
      success: true,
      data: offersList,
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
    logger.error('Error fetching offers:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch offers'
    });
  }
});

/**
 * GET /api/hiring/offers/:id
 * Get a specific offer by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    logger.info('Fetching offer by ID', { tenantId, offerId: id });

    const offersList = await db.select()
      .from(offers)
      .where(and(
        eq(offers.id, id),
        eq(offers.tenantId, tenantId)
      ))
      .limit(1);

    if (offersList.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Offer not found'
      });
    }

    const offer = offersList[0];

    // Get candidate info
    const candidatesList = await db.select()
      .from(candidates)
      .where(eq(candidates.id, offer.candidateId))
      .limit(1);

    // Get requisition info
    const requisitionsList = await db.select()
      .from(hiringRequisitions)
      .where(eq(hiringRequisitions.id, offer.requisitionId))
      .limit(1);

    logger.info('Offer fetched successfully', { offerId: id });

    return res.json({
      success: true,
      data: {
        ...offer,
        candidate: candidatesList[0] || null,
        requisition: requisitionsList[0] || null
      }
    });
  } catch (error) {
    logger.error('Error fetching offer:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch offer'
    });
  }
});

/**
 * POST /api/hiring/offers
 * Generate a new job offer
 */
router.post('/', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const offerData: GenerateOfferRequest = req.body;

    logger.info('Generating new offer', {
      tenantId,
      userId,
      candidateId: offerData.candidateId,
      salary: offerData.salary
    });

    // Validate required fields
    if (!offerData.candidateId || !offerData.requisitionId || !offerData.salary || !offerData.startDate) {
      return res.status(400).json({
        success: false,
        error: 'Candidate ID, requisition ID, salary, and start date are required'
      });
    }

    // Validate candidate exists and is eligible for offer
    const candidatesList = await db.select()
      .from(candidates)
      .where(and(
        eq(candidates.id, offerData.candidateId),
        eq(candidates.tenantId, tenantId)
      ))
      .limit(1);

    if (candidatesList.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid candidate ID'
      });
    }

    const candidate = candidatesList[0];
    if (candidate.status !== 'interview' && candidate.status !== 'offer') {
      return res.status(400).json({
        success: false,
        error: 'Candidate must complete interviews before receiving an offer'
      });
    }

    // Validate requisition exists
    const requisitionsList = await db.select()
      .from(hiringRequisitions)
      .where(and(
        eq(hiringRequisitions.id, offerData.requisitionId),
        eq(hiringRequisitions.tenantId, tenantId)
      ))
      .limit(1);

    if (requisitionsList.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid requisition ID'
      });
    }

    // Check for existing active offers for this candidate
    const existingOffers = await db.select()
      .from(offers)
      .where(and(
        eq(offers.candidateId, offerData.candidateId),
        eq(offers.tenantId, tenantId),
        or(
          eq(offers.status, 'draft'),
          eq(offers.status, 'sent'),
          eq(offers.status, 'negotiating')
        )
      ))
      .limit(1);

    if (existingOffers.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Active offer already exists for this candidate'
      });
    }

    // Initialize offer workflow
    const workflow = new OfferManagementWorkflow();

    // Prepare workflow input
    const workflowInput = {
      tenantId,
      candidateId: offerData.candidateId,
      requisitionId: offerData.requisitionId,
      salary: offerData.salary,
      currency: offerData.currency,
      bonus: offerData.bonus,
      equity: offerData.equity,
      signOnBonus: offerData.signOnBonus,
      benefits: offerData.benefits,
      relocationAssistance: offerData.relocationAssistance,
      relocationPackage: offerData.relocationPackage,
      startDate: new Date(offerData.startDate),
      employmentType: offerData.employmentType,
      probationPeriod: offerData.probationPeriod,
      requiresApproval: offerData.requiresApproval,
      approvedBy: offerData.approvedBy,
      metadata: offerData.metadata
    };

    // Execute workflow
    const result = await workflow.generateOffer(workflowInput);

    logger.info('Offer generated successfully', {
      offerId: result.offerId,
      salary: offerData.salary,
      approvalRequired: result.approvalRequired
    });

    return res.status(201).json({
      success: true,
      data: {
        offerId: result.offerId,
        compensationPackage: result.compensationPackage,
        approvalRequired: result.approvalRequired,
        offerLetter: result.offerLetter,
        nextSteps: result.nextSteps
      },
      message: 'Offer generated successfully'
    });
  } catch (error) {
    logger.error('Error generating offer:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate offer'
    });
  }
});

/**
 * PUT /api/hiring/offers/:id
 * Update an existing offer
 */
router.put('/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const updateData: UpdateOfferRequest = req.body;

    logger.info('Updating offer', {
      tenantId,
      userId,
      offerId: id
    });

    // Check if offer exists
    const existingOffers = await db.select()
      .from(offers)
      .where(and(
        eq(offers.id, id),
        eq(offers.tenantId, tenantId)
      ))
      .limit(1);

    if (existingOffers.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Offer not found'
      });
    }

    const existingOffer = existingOffers[0];

    // Check if offer can be updated
    if (existingOffer.status === 'accepted' || existingOffer.status === 'rejected') {
      return res.status(400).json({
        success: false,
        error: 'Cannot update accepted or rejected offer'
      });
    }

    // Prepare update data
    const updateFields: any = {
      ...updateData,
      updatedAt: new Date(),
      version: (existingOffer.version || 1) + 1
    };

    if (updateData.startDate) {
      updateFields.startDate = new Date(updateData.startDate);
    }

    if (updateData.salary) {
      updateFields.salary = updateData.salary.toFixed(2);
    }

    if (updateData.signOnBonus) {
      updateFields.signOnBonus = updateData.signOnBonus.toFixed(2);
    }

    // Update offer
    const [updatedOffer] = await db.update(offers)
      .set(updateFields)
      .where(and(
        eq(offers.id, id),
        eq(offers.tenantId, tenantId)
      ))
      .returning();

    logger.info('Offer updated successfully', { offerId: id });

    return res.json({
      success: true,
      data: updatedOffer,
      message: 'Offer updated successfully'
    });
  } catch (error) {
    logger.error('Error updating offer:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update offer'
    });
  }
});

/**
 * POST /api/hiring/offers/:id/send
 * Send offer to candidate
 */
router.post('/:id/send', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    logger.info('Sending offer', {
      tenantId,
      userId,
      offerId: id
    });

    // Check if offer exists and can be sent
    const offersList = await db.select()
      .from(offers)
      .where(and(
        eq(offers.id, id),
        eq(offers.tenantId, tenantId)
      ))
      .limit(1);

    if (offersList.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Offer not found'
      });
    }

    const offer = offersList[0];

    if (offer.status !== 'draft' && offer.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Can only send draft or approved offers'
      });
    }

    // Initialize offer workflow
    const workflow = new OfferManagementWorkflow();

    // Send offer using workflow
    const result = await workflow.sendOffer(id);

    logger.info('Offer sent successfully', {
      offerId: id,
      sentDate: result.sentDate,
      expiryDate: result.expiryDate
    });

    return res.json({
      success: true,
      data: {
        offerId: id,
        status: result.status,
        sentDate: result.sentDate,
        expiryDate: result.expiryDate
      },
      message: 'Offer sent successfully'
    });
  } catch (error) {
    logger.error('Error sending offer:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send offer'
    });
  }
});

/**
 * POST /api/hiring/offers/:id/accept
 * Accept an offer (candidate action)
 */
router.post('/:id/accept', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const { acceptanceData } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    logger.info('Processing offer acceptance', {
      tenantId,
      offerId: id
    });

    // Check if offer exists and can be accepted
    const offersList = await db.select()
      .from(offers)
      .where(and(
        eq(offers.id, id),
        eq(offers.tenantId, tenantId)
      ))
      .limit(1);

    if (offersList.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Offer not found'
      });
    }

    const offer = offersList[0];

    if (offer.status !== 'sent' && offer.status !== 'negotiating') {
      return res.status(400).json({
        success: false,
        error: 'Can only accept sent or negotiating offers'
      });
    }

    // Check if offer has expired
    if (offer.expiryDate && new Date() > new Date(offer.expiryDate)) {
      return res.status(400).json({
        success: false,
        error: 'Offer has expired'
      });
    }

    // Initialize offer workflow
    const workflow = new OfferManagementWorkflow();

    // Accept offer using workflow
    const result = await workflow.acceptOffer(id, acceptanceData);

    logger.info('Offer accepted successfully', {
      offerId: id,
      candidateId: result.candidateId
    });

    return res.json({
      success: true,
      data: {
        offerId: id,
        candidateId: result.candidateId,
        status: result.status,
        nextSteps: result.nextSteps,
        outputTriggers: result.outputTriggers
      },
      message: 'Offer accepted successfully'
    });
  } catch (error) {
    logger.error('Error accepting offer:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to accept offer'
    });
  }
});

/**
 * POST /api/hiring/offers/:id/reject
 * Reject an offer (candidate action)
 */
router.post('/:id/reject', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    logger.info('Processing offer rejection', {
      tenantId,
      offerId: id,
      reason: rejectionReason
    });

    // Check if offer exists and can be rejected
    const offersList = await db.select()
      .from(offers)
      .where(and(
        eq(offers.id, id),
        eq(offers.tenantId, tenantId)
      ))
      .limit(1);

    if (offersList.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Offer not found'
      });
    }

    const offer = offersList[0];

    if (offer.status !== 'sent' && offer.status !== 'negotiating') {
      return res.status(400).json({
        success: false,
        error: 'Can only reject sent or negotiating offers'
      });
    }

    // Initialize offer workflow
    const workflow = new OfferManagementWorkflow();

    // Reject offer using workflow
    const result = await workflow.rejectOffer(id, rejectionReason);

    logger.info('Offer rejected successfully', {
      offerId: id,
      reason: rejectionReason
    });

    return res.json({
      success: true,
      data: {
        offerId: id,
        status: result.status,
        reason: result.reason,
        nextSteps: result.nextSteps
      },
      message: 'Offer rejected'
    });
  } catch (error) {
    logger.error('Error rejecting offer:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to reject offer'
    });
  }
});

/**
 * POST /api/hiring/offers/:id/negotiate
 * Submit counter offer (candidate action)
 */
router.post('/:id/negotiate', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const negotiationData: NegotiateOfferRequest = req.body;

    logger.info('Processing offer negotiation', {
      tenantId,
      offerId: id
    });

    // Validate required fields
    if (!negotiationData.counterOffer) {
      return res.status(400).json({
        success: false,
        error: 'Counter offer details are required'
      });
    }

    // Check if offer exists and can be negotiated
    const offersList = await db.select()
      .from(offers)
      .where(and(
        eq(offers.id, id),
        eq(offers.tenantId, tenantId)
      ))
      .limit(1);

    if (offersList.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Offer not found'
      });
    }

    const offer = offersList[0];

    if (offer.status !== 'sent' && offer.status !== 'negotiating') {
      return res.status(400).json({
        success: false,
        error: 'Can only negotiate sent or negotiating offers'
      });
    }

    // Initialize offer workflow
    const workflow = new OfferManagementWorkflow();

    // Process negotiation using workflow
    const result = await workflow.negotiateOffer({
      offerId: id,
      counterOffer: negotiationData.counterOffer,
      candidateNotes: negotiationData.candidateNotes
    });

    logger.info('Offer negotiation processed successfully', {
      offerId: id,
      negotiationRound: result.negotiationRound
    });

    return res.json({
      success: true,
      data: {
        offerId: id,
        status: result.status,
        negotiationRound: result.negotiationRound,
        nextSteps: result.nextSteps
      },
      message: 'Counter offer submitted successfully'
    });
  } catch (error) {
    logger.error('Error processing offer negotiation:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process negotiation'
    });
  }
});

/**
 * PATCH /api/hiring/offers/:id/status
 * Update offer status
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

    logger.info('Updating offer status', {
      tenantId,
      userId,
      offerId: id,
      newStatus: status
    });

    // Validate status
    const validStatuses = ['draft', 'pending_approval', 'approved', 'sent', 'negotiating', 'accepted', 'rejected', 'expired', 'withdrawn'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    // Update status
    const updateData: any = {
      status,
      statusReason: reason,
      updatedAt: new Date()
    };

    // Set timestamps based on status
    if (status === 'approved') {
      updateData.approvedDate = new Date();
      updateData.approvedBy = userId;
    } else if (status === 'sent') {
      updateData.sentDate = new Date();
      updateData.expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    } else if (status === 'accepted') {
      updateData.acceptedDate = new Date();
      updateData.respondedDate = new Date();
    } else if (status === 'rejected') {
      updateData.rejectedDate = new Date();
      updateData.respondedDate = new Date();
    } else if (status === 'expired') {
      updateData.expiredDate = new Date();
    }

    const [updatedOffer] = await db.update(offers)
      .set(updateData)
      .where(and(
        eq(offers.id, id),
        eq(offers.tenantId, tenantId)
      ))
      .returning();

    if (!updatedOffer) {
      return res.status(404).json({
        success: false,
        error: 'Offer not found'
      });
    }

    logger.info('Offer status updated successfully', {
      offerId: id,
      status
    });

    return res.json({
      success: true,
      data: {
        id: updatedOffer.id,
        status: updatedOffer.status,
        // statusReason: updatedOffer.statusReason // Property doesn't exist in schema
      },
      message: `Offer status updated to ${status}`
    });
  } catch (error) {
    logger.error('Error updating offer status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update offer status'
    });
  }
});

/**
 * GET /api/hiring/offers/by-candidate/:candidateId
 * Get all offers for a specific candidate
 */
router.get('/by-candidate/:candidateId', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { candidateId } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    logger.info('Fetching offers by candidate', {
      tenantId,
      candidateId
    });

    const offersList = await db.select()
      .from(offers)
      .where(and(
        eq(offers.tenantId, tenantId),
        eq(offers.candidateId, candidateId)
      ))
      .orderBy(desc(offers.createdAt));

    logger.info('Offers fetched by candidate', {
      candidateId,
      count: offersList.length
    });

    return res.json({
      success: true,
      data: offersList,
      summary: {
        total: offersList.length,
        byStatus: offersList.reduce((acc, offer) => {
          acc[offer.status] = (acc[offer.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        latestOffer: offersList[0] || null,
        totalValue: offersList.reduce((sum, offer) => sum + parseFloat(offer.salary || '0'), 0)
      }
    });
  } catch (error) {
    logger.error('Error fetching offers by candidate:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch offers by candidate'
    });
  }
});

/**
 * DELETE /api/hiring/offers/:id
 * Withdraw an offer
 */
router.delete('/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;
    const { reason } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    logger.info('Withdrawing offer', {
      tenantId,
      userId,
      offerId: id,
      reason
    });

    // Check if offer exists
    const existingOffers = await db.select()
      .from(offers)
      .where(and(
        eq(offers.id, id),
        eq(offers.tenantId, tenantId)
      ))
      .limit(1);

    if (existingOffers.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Offer not found'
      });
    }

    const offer = existingOffers[0];

    // Check if offer can be withdrawn
    if (offer.status === 'accepted') {
      return res.status(400).json({
        success: false,
        error: 'Cannot withdraw accepted offer'
      });
    }

    // Withdraw offer (update status)
    await db.update(offers)
      .set({
        status: 'withdrawn',
        // statusReason: reason || 'Withdrawn by employer', // Property doesn't exist in schema
        // withdrawnDate: new Date(), // Property doesn't exist in schema
        updatedAt: new Date()
      })
      .where(and(
        eq(offers.id, id),
        eq(offers.tenantId, tenantId)
      ));

    logger.info('Offer withdrawn successfully', { offerId: id });

    return res.json({
      success: true,
      message: 'Offer withdrawn successfully'
    });
  } catch (error) {
    logger.error('Error withdrawing offer:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to withdraw offer'
    });
  }
});

export default router;
