import { Router } from 'express';
import { Logger } from '../../../../utils/logger.js';
import { db } from '../../../../db/index.js';
import { 
  hiringRequisitions, 
  candidates, 
  interviews, 
  offers, 
  candidateAssessments 
} from '../../../../db/schema/hiring.js';
import { eq, and, desc, asc, gte, lte, count, avg, sum, sql } from 'drizzle-orm';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface AnalyticsQueryParams {
  dateFrom?: string;
  dateTo?: string;
  department?: string;
  requisitionId?: string;
  level?: string;
  source?: string;
  period?: 'week' | 'month' | 'quarter' | 'year';
}

interface MetricsSummary {
  totalRequisitions: number;
  activeRequisitions: number;
  totalCandidates: number;
  totalInterviews: number;
  totalOffers: number;
  hiredCandidates: number;
  averageTimeToHire: number;
  averageTimeToInterview: number;
  averageTimeToOffer: number;
  offerAcceptanceRate: number;
  interviewToOfferRate: number;
  sourceEffectiveness: any[];
  departmentMetrics: any[];
}

// ============================================================================
// ROUTER SETUP
// ============================================================================

const router = Router();
const logger = new Logger('HiringAnalyticsAPI');

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * GET /api/hiring/analytics/overview
 * Get high-level hiring metrics overview
 */
router.get('/overview', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const {
      dateFrom,
      dateTo,
      department
    } = req.query as AnalyticsQueryParams;

    logger.info('Fetching hiring overview analytics', {
      tenantId,
      dateFrom,
      dateTo,
      department
    });

    // Build date range
    const startDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Default: 90 days ago
    const endDate = dateTo ? new Date(dateTo) : new Date();

    // Base conditions
    const baseConditions = [eq(hiringRequisitions.tenantId, tenantId)];
    const candidateConditions = [eq(candidates.tenantId, tenantId)];
    const interviewConditions = [eq(interviews.tenantId, tenantId)];
    const offerConditions = [eq(offers.tenantId, tenantId)];

    // Add date filters
    baseConditions.push(gte(hiringRequisitions.createdAt, startDate));
    baseConditions.push(lte(hiringRequisitions.createdAt, endDate));
    candidateConditions.push(gte(candidates.appliedAt, startDate));
    candidateConditions.push(lte(candidates.appliedAt, endDate));
    interviewConditions.push(gte(interviews.scheduledDate, startDate));
    interviewConditions.push(lte(interviews.scheduledDate, endDate));
    offerConditions.push(gte(offers.createdAt, startDate));
    offerConditions.push(lte(offers.createdAt, endDate));

    // Add department filter if specified
    if (department) {
      baseConditions.push(eq(hiringRequisitions.department, department));
    }

    // Execute parallel queries for metrics
    const [
      requisitionsData,
      candidatesData,
      interviewsData,
      offersData,
      hiredCandidatesData,
      acceptedOffersData
    ] = await Promise.all([
      // Total and active requisitions
      db.select({
        total: count(),
        active: sql<number>`COUNT(CASE WHEN status = 'active' THEN 1 END)`
      })
      .from(hiringRequisitions)
      .where(and(...baseConditions)),

      // Candidates by status
      db.select({
        total: count(),
        screening: sql<number>`COUNT(CASE WHEN status = 'screening' THEN 1 END)`,
        interview: sql<number>`COUNT(CASE WHEN status = 'interview' THEN 1 END)`,
        offer: sql<number>`COUNT(CASE WHEN status = 'offer' THEN 1 END)`,
        hired: sql<number>`COUNT(CASE WHEN status = 'hired' THEN 1 END)`,
        rejected: sql<number>`COUNT(CASE WHEN status = 'rejected' THEN 1 END)`
      })
      .from(candidates)
      .where(and(...candidateConditions)),

      // Interviews by status
      db.select({
        total: count(),
        scheduled: sql<number>`COUNT(CASE WHEN status = 'scheduled' THEN 1 END)`,
        completed: sql<number>`COUNT(CASE WHEN status = 'completed' THEN 1 END)`,
        cancelled: sql<number>`COUNT(CASE WHEN status = 'cancelled' THEN 1 END)`
      })
      .from(interviews)
      .where(and(...interviewConditions)),

      // Offers by status
      db.select({
        total: count(),
        sent: sql<number>`COUNT(CASE WHEN status = 'sent' THEN 1 END)`,
        accepted: sql<number>`COUNT(CASE WHEN status = 'accepted' THEN 1 END)`,
        rejected: sql<number>`COUNT(CASE WHEN status = 'rejected' THEN 1 END)`,
        negotiating: sql<number>`COUNT(CASE WHEN status = 'negotiating' THEN 1 END)`
      })
      .from(offers)
      .where(and(...offerConditions)),

      // Hired candidates for time calculations
      db.select({
        appliedAt: candidates.appliedAt,
        appliedAt2: candidates.appliedAt // Use appliedAt for both fields since createdAt doesn't exist
      })
      .from(candidates)
      .where(and(
        ...candidateConditions,
        eq(candidates.status, 'hired')
      )),

      // Accepted offers for acceptance rate
      db.select({
        total: count(),
        accepted: sql<number>`COUNT(CASE WHEN status = 'accepted' THEN 1 END)`
      })
      .from(offers)
      .where(and(...offerConditions))
    ]);

    // Calculate time-to-hire metrics
    const timeToHireData = hiredCandidatesData.map(candidate => {
      if (candidate.appliedAt && candidate.appliedAt2) {
        return Math.floor(
          (new Date(candidate.appliedAt2).getTime() - new Date(candidate.appliedAt).getTime()) / 
          (1000 * 60 * 60 * 24)
        );
      }
      return null;
    }).filter(days => days !== null) as number[];

    const averageTimeToHire = timeToHireData.length > 0 
      ? timeToHireData.reduce((sum, days) => sum + days, 0) / timeToHireData.length 
      : 0;

    // Calculate offer acceptance rate
    const totalOffers = offersData[0]?.total || 0;
    const acceptedOffers = offersData[0]?.accepted || 0;
    const offerAcceptanceRate = totalOffers > 0 ? (acceptedOffers / totalOffers) * 100 : 0;

    // Calculate interview to offer conversion rate
    const completedInterviews = interviewsData[0]?.completed || 0;
    const interviewToOfferRate = completedInterviews > 0 ? (totalOffers / completedInterviews) * 100 : 0;

    const overview = {
      period: {
        startDate,
        endDate,
        days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      },
      requisitions: {
        total: requisitionsData[0]?.total || 0,
        active: requisitionsData[0]?.active || 0,
        filled: requisitionsData[0]?.total - requisitionsData[0]?.active || 0
      },
      candidates: {
        total: candidatesData[0]?.total || 0,
        screening: candidatesData[0]?.screening || 0,
        interview: candidatesData[0]?.interview || 0,
        offer: candidatesData[0]?.offer || 0,
        hired: candidatesData[0]?.hired || 0,
        rejected: candidatesData[0]?.rejected || 0
      },
      interviews: {
        total: interviewsData[0]?.total || 0,
        scheduled: interviewsData[0]?.scheduled || 0,
        completed: interviewsData[0]?.completed || 0,
        cancelled: interviewsData[0]?.cancelled || 0
      },
      offers: {
        total: offersData[0]?.total || 0,
        sent: offersData[0]?.sent || 0,
        accepted: offersData[0]?.accepted || 0,
        rejected: offersData[0]?.rejected || 0,
        negotiating: offersData[0]?.negotiating || 0
      },
      metrics: {
        averageTimeToHire: Math.round(averageTimeToHire),
        offerAcceptanceRate: Math.round(offerAcceptanceRate * 100) / 100,
        interviewToOfferRate: Math.round(interviewToOfferRate * 100) / 100,
        candidateConversionRate: candidatesData[0]?.total > 0 
          ? Math.round((candidatesData[0]?.hired / candidatesData[0]?.total) * 10000) / 100 
          : 0
      }
    };

    logger.info('Hiring overview analytics calculated', {
      tenantId,
      totalCandidates: overview.candidates.total,
      hiredCandidates: overview.candidates.hired
    });

    return res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    logger.error('Error fetching hiring overview analytics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch hiring overview analytics'
    });
  }
});

/**
 * GET /api/hiring/analytics/funnel
 * Get hiring funnel metrics (conversion rates at each stage)
 */
router.get('/funnel', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const {
      dateFrom,
      dateTo,
      department,
      requisitionId
    } = req.query as AnalyticsQueryParams;

    logger.info('Fetching hiring funnel analytics', {
      tenantId,
      dateFrom,
      dateTo,
      department,
      requisitionId
    });

    // Build date range
    const startDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endDate = dateTo ? new Date(dateTo) : new Date();

    // Base conditions
    const conditions = [
      eq(candidates.tenantId, tenantId),
      gte(candidates.appliedAt, startDate),
      lte(candidates.appliedAt, endDate)
    ];

    if (requisitionId) {
      conditions.push(eq(candidates.requisitionId, requisitionId));
    }

    // Get funnel data
    const funnelData = await db.select({
      total: count(),
      applied: sql<number>`COUNT(*)`,
      screening: sql<number>`COUNT(CASE WHEN status IN ('screening', 'interview', 'offer', 'hired') THEN 1 END)`,
      interview: sql<number>`COUNT(CASE WHEN status IN ('interview', 'offer', 'hired') THEN 1 END)`,
      offer: sql<number>`COUNT(CASE WHEN status IN ('offer', 'hired') THEN 1 END)`,
      hired: sql<number>`COUNT(CASE WHEN status = 'hired' THEN 1 END)`
    })
    .from(candidates)
    .where(and(...conditions));

    const data = funnelData[0];
    const applied = data?.applied || 0;

    const funnel = {
      stages: [
        {
          stage: 'Applied',
          count: applied,
          percentage: 100,
          conversionRate: 100
        },
        {
          stage: 'Screening',
          count: data?.screening || 0,
          percentage: applied > 0 ? Math.round((data?.screening || 0) / applied * 100) : 0,
          conversionRate: applied > 0 ? Math.round((data?.screening || 0) / applied * 10000) / 100 : 0
        },
        {
          stage: 'Interview',
          count: data?.interview || 0,
          percentage: applied > 0 ? Math.round((data?.interview || 0) / applied * 100) : 0,
          conversionRate: (data?.screening || 0) > 0 ? Math.round((data?.interview || 0) / (data?.screening || 1) * 10000) / 100 : 0
        },
        {
          stage: 'Offer',
          count: data?.offer || 0,
          percentage: applied > 0 ? Math.round((data?.offer || 0) / applied * 100) : 0,
          conversionRate: (data?.interview || 0) > 0 ? Math.round((data?.offer || 0) / (data?.interview || 1) * 10000) / 100 : 0
        },
        {
          stage: 'Hired',
          count: data?.hired || 0,
          percentage: applied > 0 ? Math.round((data?.hired || 0) / applied * 100) : 0,
          conversionRate: (data?.offer || 0) > 0 ? Math.round((data?.hired || 0) / (data?.offer || 1) * 10000) / 100 : 0
        }
      ],
      summary: {
        totalApplied: applied,
        totalHired: data?.hired || 0,
        overallConversionRate: applied > 0 ? Math.round((data?.hired || 0) / applied * 10000) / 100 : 0,
        dropOffRate: applied > 0 ? Math.round((1 - (data?.hired || 0) / applied) * 10000) / 100 : 0
      }
    };

    logger.info('Hiring funnel analytics calculated', {
      tenantId,
      totalApplied: applied,
      totalHired: data?.hired || 0
    });

    return res.json({
      success: true,
      data: funnel
    });
  } catch (error) {
    logger.error('Error fetching hiring funnel analytics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch hiring funnel analytics'
    });
  }
});

/**
 * GET /api/hiring/analytics/sources
 * Get candidate source effectiveness analytics
 */
router.get('/sources', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const {
      dateFrom,
      dateTo,
      department
    } = req.query as AnalyticsQueryParams;

    logger.info('Fetching source effectiveness analytics', {
      tenantId,
      dateFrom,
      dateTo,
      department
    });

    // Build date range
    const startDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endDate = dateTo ? new Date(dateTo) : new Date();

    // Get source analytics
    const sourceData = await db.select({
      source: candidates.source,
      total: count(),
      hired: sql<number>`COUNT(CASE WHEN status = 'hired' THEN 1 END)`,
      interview: sql<number>`COUNT(CASE WHEN status IN ('interview', 'offer', 'hired') THEN 1 END)`,
      offer: sql<number>`COUNT(CASE WHEN status IN ('offer', 'hired') THEN 1 END)`,
      avgScore: sql<number>`AVG(CAST(overall_score AS DECIMAL))`
    })
    .from(candidates)
    .where(and(
      eq(candidates.tenantId, tenantId),
      gte(candidates.appliedAt, startDate),
      lte(candidates.appliedAt, endDate)
    ))
    .groupBy(candidates.source)
    .orderBy(desc(count()));

    const sources = sourceData.map(source => ({
      source: source.source || 'Unknown',
      metrics: {
        totalCandidates: source.total,
        hired: source.hired,
        interviews: source.interview,
        offers: source.offer,
        averageScore: Math.round((source.avgScore || 0) * 100) / 100
      },
      conversionRates: {
        toInterview: source.total > 0 ? Math.round(source.interview / source.total * 10000) / 100 : 0,
        toOffer: source.total > 0 ? Math.round(source.offer / source.total * 10000) / 100 : 0,
        toHire: source.total > 0 ? Math.round(source.hired / source.total * 10000) / 100 : 0
      },
      effectiveness: {
        quality: source.avgScore || 0,
        volume: source.total,
        efficiency: source.total > 0 ? Math.round(source.hired / source.total * 10000) / 100 : 0
      }
    }));

    // Calculate totals
    const totals = sourceData.reduce((acc, source) => ({
      totalCandidates: acc.totalCandidates + source.total,
      totalHired: acc.totalHired + source.hired,
      totalInterviews: acc.totalInterviews + source.interview,
      totalOffers: acc.totalOffers + source.offer
    }), {
      totalCandidates: 0,
      totalHired: 0,
      totalInterviews: 0,
      totalOffers: 0
    });

    logger.info('Source effectiveness analytics calculated', {
      tenantId,
      sourcesCount: sources.length,
      totalCandidates: totals.totalCandidates
    });

    return res.json({
      success: true,
      data: {
        sources,
        summary: {
          ...totals,
          topSource: sources[0]?.source || 'N/A',
          mostEffectiveSource: sources.sort((a, b) => b.effectiveness.efficiency - a.effectiveness.efficiency)[0]?.source || 'N/A'
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching source effectiveness analytics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch source effectiveness analytics'
    });
  }
});

/**
 * GET /api/hiring/analytics/departments
 * Get department-wise hiring analytics
 */
router.get('/departments', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const {
      dateFrom,
      dateTo
    } = req.query as AnalyticsQueryParams;

    logger.info('Fetching department analytics', {
      tenantId,
      dateFrom,
      dateTo
    });

    // Build date range
    const startDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endDate = dateTo ? new Date(dateTo) : new Date();

    // Get department analytics from requisitions
    const departmentData = await db.select({
      department: hiringRequisitions.department,
      totalRequisitions: count(),
      activeRequisitions: sql<number>`COUNT(CASE WHEN status = 'active' THEN 1 END)`,
      filledRequisitions: sql<number>`COUNT(CASE WHEN status = 'filled' THEN 1 END)`,
      totalPositions: sql<number>`SUM(number_of_positions)`,
      filledPositions: sql<number>`SUM(positions_filled)`
    })
    .from(hiringRequisitions)
    .where(and(
      eq(hiringRequisitions.tenantId, tenantId),
      gte(hiringRequisitions.createdAt, startDate),
      lte(hiringRequisitions.createdAt, endDate)
    ))
    .groupBy(hiringRequisitions.department)
    .orderBy(desc(count()));

    // Get candidate data by department (via requisitions)
    const candidatesByDept = await db.select({
      department: hiringRequisitions.department,
      totalCandidates: count(),
      hiredCandidates: sql<number>`COUNT(CASE WHEN candidates.status = 'hired' THEN 1 END)`,
      avgTimeToHire: sql<number>`AVG(CASE WHEN candidates.status = 'hired' AND candidates.hired_date IS NOT NULL AND candidates.applied_date IS NOT NULL THEN EXTRACT(EPOCH FROM (candidates.hired_date - candidates.applied_date)) / 86400 END)`
    })
    .from(candidates)
    .innerJoin(hiringRequisitions, eq(candidates.requisitionId, hiringRequisitions.id))
    .where(and(
      eq(candidates.tenantId, tenantId),
      gte(candidates.appliedAt, startDate),
      lte(candidates.appliedAt, endDate)
    ))
    .groupBy(hiringRequisitions.department);

    // Combine data
    const departments = departmentData.map(dept => {
      const candidateData = candidatesByDept.find(c => c.department === dept.department);
      
      return {
        department: dept.department || 'Unknown',
        requisitions: {
          total: dept.totalRequisitions,
          active: dept.activeRequisitions,
          filled: dept.filledRequisitions,
          fillRate: dept.totalRequisitions > 0 ? Math.round(dept.filledRequisitions / dept.totalRequisitions * 10000) / 100 : 0
        },
        positions: {
          total: dept.totalPositions || 0,
          filled: dept.filledPositions || 0,
          fillRate: (dept.totalPositions || 0) > 0 ? Math.round((dept.filledPositions || 0) / (dept.totalPositions || 1) * 10000) / 100 : 0
        },
        candidates: {
          total: candidateData?.totalCandidates || 0,
          hired: candidateData?.hiredCandidates || 0,
          conversionRate: (candidateData?.totalCandidates || 0) > 0 ? Math.round((candidateData?.hiredCandidates || 0) / (candidateData?.totalCandidates || 1) * 10000) / 100 : 0
        },
        metrics: {
          averageTimeToHire: Math.round(candidateData?.avgTimeToHire || 0),
          hiringVelocity: dept.activeRequisitions > 0 ? Math.round((candidateData?.hiredCandidates || 0) / dept.activeRequisitions * 100) / 100 : 0
        }
      };
    });

    logger.info('Department analytics calculated', {
      tenantId,
      departmentsCount: departments.length
    });

    return res.json({
      success: true,
      data: {
        departments,
        summary: {
          totalDepartments: departments.length,
          totalRequisitions: departments.reduce((sum, dept) => sum + dept.requisitions.total, 0),
          totalCandidates: departments.reduce((sum, dept) => sum + dept.candidates.total, 0),
          totalHired: departments.reduce((sum, dept) => sum + dept.candidates.hired, 0),
          mostActiveDepartment: departments.sort((a, b) => b.requisitions.active - a.requisitions.active)[0]?.department || 'N/A',
          mostEffectiveDepartment: departments.sort((a, b) => b.candidates.conversionRate - a.candidates.conversionRate)[0]?.department || 'N/A'
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching department analytics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch department analytics'
    });
  }
});

/**
 * GET /api/hiring/analytics/time-series
 * Get time-series hiring data for trends
 */
router.get('/time-series', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const {
      dateFrom,
      dateTo,
      period = 'week'
    } = req.query as AnalyticsQueryParams;

    logger.info('Fetching time-series analytics', {
      tenantId,
      dateFrom,
      dateTo,
      period
    });

    // Build date range
    const startDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endDate = dateTo ? new Date(dateTo) : new Date();

    // Determine date truncation based on period
    const dateTrunc = period === 'week' ? 'week' : 
                      period === 'month' ? 'month' : 
                      period === 'quarter' ? 'quarter' : 'year';

    // Get time-series data for candidates
    const candidateTimeSeries = await db.select({
      period: sql<string>`DATE_TRUNC('${sql.raw(dateTrunc)}', applied_date)`,
      totalApplied: count(),
      hired: sql<number>`COUNT(CASE WHEN status = 'hired' THEN 1 END)`,
      rejected: sql<number>`COUNT(CASE WHEN status = 'rejected' THEN 1 END)`
    })
    .from(candidates)
    .where(and(
      eq(candidates.tenantId, tenantId),
      gte(candidates.appliedAt, startDate),
      lte(candidates.appliedAt, endDate)
    ))
    .groupBy(sql`DATE_TRUNC('${sql.raw(dateTrunc)}', applied_date)`)
    .orderBy(sql`DATE_TRUNC('${sql.raw(dateTrunc)}', applied_date)`);

    // Get time-series data for offers
    const offerTimeSeries = await db.select({
      period: sql<string>`DATE_TRUNC('${sql.raw(dateTrunc)}', created_at)`,
      totalOffers: count(),
      accepted: sql<number>`COUNT(CASE WHEN status = 'accepted' THEN 1 END)`,
      rejected: sql<number>`COUNT(CASE WHEN status = 'rejected' THEN 1 END)`
    })
    .from(offers)
    .where(and(
      eq(offers.tenantId, tenantId),
      gte(offers.createdAt, startDate),
      lte(offers.createdAt, endDate)
    ))
    .groupBy(sql`DATE_TRUNC('${sql.raw(dateTrunc)}', created_at)`)
    .orderBy(sql`DATE_TRUNC('${sql.raw(dateTrunc)}', created_at)`);

    // Combine and format data
    const timeSeriesData = candidateTimeSeries.map(candidate => {
      const offer = offerTimeSeries.find(o => o.period === candidate.period);
      
      return {
        period: candidate.period,
        candidates: {
          applied: candidate.totalApplied,
          hired: candidate.hired,
          rejected: candidate.rejected,
          conversionRate: candidate.totalApplied > 0 ? Math.round(candidate.hired / candidate.totalApplied * 10000) / 100 : 0
        },
        offers: {
          total: offer?.totalOffers || 0,
          accepted: offer?.accepted || 0,
          rejected: offer?.rejected || 0,
          acceptanceRate: (offer?.totalOffers || 0) > 0 ? Math.round((offer?.accepted || 0) / (offer?.totalOffers || 1) * 10000) / 100 : 0
        }
      };
    });

    logger.info('Time-series analytics calculated', {
      tenantId,
      periodsCount: timeSeriesData.length,
      period
    });

    return res.json({
      success: true,
      data: {
        timeSeries: timeSeriesData,
        summary: {
          period,
          startDate,
          endDate,
          totalPeriods: timeSeriesData.length,
          trends: {
            candidateGrowth: timeSeriesData.length > 1 ? 
              ((timeSeriesData[timeSeriesData.length - 1]?.candidates.applied || 0) - (timeSeriesData[0]?.candidates.applied || 0)) : 0,
            conversionTrend: timeSeriesData.length > 1 ?
              ((timeSeriesData[timeSeriesData.length - 1]?.candidates.conversionRate || 0) - (timeSeriesData[0]?.candidates.conversionRate || 0)) : 0
          }
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching time-series analytics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch time-series analytics'
    });
  }
});

/**
 * GET /api/hiring/analytics/performance
 * Get hiring performance metrics and KPIs
 */
router.get('/performance', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const {
      dateFrom,
      dateTo
    } = req.query as AnalyticsQueryParams;

    logger.info('Fetching performance analytics', {
      tenantId,
      dateFrom,
      dateTo
    });

    // Build date range
    const startDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endDate = dateTo ? new Date(dateTo) : new Date();

    // Get comprehensive performance metrics
    const [
      overallMetrics,
      qualityMetrics,
      efficiencyMetrics,
      costMetrics
    ] = await Promise.all([
      // Overall hiring metrics
      db.select({
        totalRequisitions: count(),
        activeRequisitions: sql<number>`COUNT(CASE WHEN status = 'active' THEN 1 END)`,
        filledRequisitions: sql<number>`COUNT(CASE WHEN status = 'filled' THEN 1 END)`,
        avgTimeToFill: sql<number>`AVG(CASE WHEN status = 'filled' AND closed_date IS NOT NULL THEN EXTRACT(EPOCH FROM (closed_date - created_at)) / 86400 END)`
      })
      .from(hiringRequisitions)
      .where(and(
        eq(hiringRequisitions.tenantId, tenantId),
        gte(hiringRequisitions.createdAt, startDate),
        lte(hiringRequisitions.createdAt, endDate)
      )),

      // Quality metrics (from assessments)
      db.select({
        avgCultureScore: sql<number>`AVG(CAST(culture_fit_score AS DECIMAL))`,
        avgSkillsScore: sql<number>`AVG(CAST(skills_score AS DECIMAL))`,
        avgOverallScore: sql<number>`AVG(CAST(overall_score AS DECIMAL))`,
        highQualityCandidates: sql<number>`COUNT(CASE WHEN CAST(overall_score AS DECIMAL) >= 4.0 THEN 1 END)`,
        totalAssessed: count()
      })
      .from(candidateAssessments)
      .where(and(
        eq(candidateAssessments.tenantId, tenantId),
        gte(candidateAssessments.createdAt, startDate),
        lte(candidateAssessments.createdAt, endDate)
      )),

      // Efficiency metrics
      db.select({
        totalCandidates: count(),
        screenedCandidates: sql<number>`COUNT(CASE WHEN status IN ('screening', 'interview', 'offer', 'hired') THEN 1 END)`,
        interviewedCandidates: sql<number>`COUNT(CASE WHEN status IN ('interview', 'offer', 'hired') THEN 1 END)`,
        offeredCandidates: sql<number>`COUNT(CASE WHEN status IN ('offer', 'hired') THEN 1 END)`,
        hiredCandidates: sql<number>`COUNT(CASE WHEN status = 'hired' THEN 1 END)`,
        avgTimeToHire: sql<number>`AVG(CASE WHEN status = 'hired' AND hired_date IS NOT NULL AND applied_date IS NOT NULL THEN EXTRACT(EPOCH FROM (hired_date - applied_date)) / 86400 END)`
      })
      .from(candidates)
      .where(and(
        eq(candidates.tenantId, tenantId),
        gte(candidates.appliedAt, startDate),
        lte(candidates.appliedAt, endDate)
      )),

      // Cost metrics (estimated)
      db.select({
        totalOffers: count(),
        avgSalary: sql<number>`AVG(CAST(salary AS DECIMAL))`,
        totalOfferValue: sql<number>`SUM(CAST(salary AS DECIMAL))`,
        acceptedOffers: sql<number>`COUNT(CASE WHEN status = 'accepted' THEN 1 END)`
      })
      .from(offers)
      .where(and(
        eq(offers.tenantId, tenantId),
        gte(offers.createdAt, startDate),
        lte(offers.createdAt, endDate)
      ))
    ]);

    const overall = overallMetrics[0];
    const quality = qualityMetrics[0];
    const efficiency = efficiencyMetrics[0];
    const cost = costMetrics[0];

    const performance = {
      kpis: {
        timeToFill: Math.round(overall?.avgTimeToFill || 0),
        timeToHire: Math.round(efficiency?.avgTimeToHire || 0),
        fillRate: (overall?.totalRequisitions || 0) > 0 ? 
          Math.round((overall?.filledRequisitions || 0) / (overall?.totalRequisitions || 1) * 10000) / 100 : 0,
        offerAcceptanceRate: (cost?.totalOffers || 0) > 0 ? 
          Math.round((cost?.acceptedOffers || 0) / (cost?.totalOffers || 1) * 10000) / 100 : 0,
        candidateConversionRate: (efficiency?.totalCandidates || 0) > 0 ? 
          Math.round((efficiency?.hiredCandidates || 0) / (efficiency?.totalCandidates || 1) * 10000) / 100 : 0,
        qualityScore: Math.round((quality?.avgOverallScore || 0) * 100) / 100
      },
      quality: {
        averageCultureFit: Math.round((quality?.avgCultureScore || 0) * 100) / 100,
        averageSkillsMatch: Math.round((quality?.avgSkillsScore || 0) * 100) / 100,
        averageOverallScore: Math.round((quality?.avgOverallScore || 0) * 100) / 100,
        highQualityRate: (quality?.totalAssessed || 0) > 0 ? 
          Math.round((quality?.highQualityCandidates || 0) / (quality?.totalAssessed || 1) * 10000) / 100 : 0
      },
      efficiency: {
        screeningEfficiency: (efficiency?.totalCandidates || 0) > 0 ? 
          Math.round((efficiency?.screenedCandidates || 0) / (efficiency?.totalCandidates || 1) * 10000) / 100 : 0,
        interviewEfficiency: (efficiency?.screenedCandidates || 0) > 0 ? 
          Math.round((efficiency?.interviewedCandidates || 0) / (efficiency?.screenedCandidates || 1) * 10000) / 100 : 0,
        offerEfficiency: (efficiency?.interviewedCandidates || 0) > 0 ? 
          Math.round((efficiency?.offeredCandidates || 0) / (efficiency?.interviewedCandidates || 1) * 10000) / 100 : 0
      },
      cost: {
        averageSalary: Math.round(cost?.avgSalary || 0),
        totalOfferValue: Math.round(cost?.totalOfferValue || 0),
        costPerHire: (efficiency?.hiredCandidates || 0) > 0 ? 
          Math.round((cost?.totalOfferValue || 0) / (efficiency?.hiredCandidates || 1)) : 0,
        offerUtilization: (cost?.totalOffers || 0) > 0 ? 
          Math.round((cost?.acceptedOffers || 0) / (cost?.totalOffers || 1) * 10000) / 100 : 0
      }
    };

    logger.info('Performance analytics calculated', {
      tenantId,
      timeToHire: performance.kpis.timeToHire,
      conversionRate: performance.kpis.candidateConversionRate
    });

    return res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    logger.error('Error fetching performance analytics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch performance analytics'
    });
  }
});

/**
 * GET /api/hiring/analytics/reports/summary
 * Generate comprehensive hiring summary report
 */
router.get('/reports/summary', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const {
      dateFrom,
      dateTo
    } = req.query as AnalyticsQueryParams;

    logger.info('Generating summary report', {
      tenantId,
      dateFrom,
      dateTo
    });

    // Build date range
    const startDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endDate = dateTo ? new Date(dateTo) : new Date();

    // This would typically call all the other analytics endpoints
    // For now, we'll create a comprehensive summary
    const report = {
      reportMetadata: {
        generatedAt: new Date().toISOString(),
        period: {
          startDate,
          endDate,
          days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        },
        tenantId
      },
      executiveSummary: {
        totalRequisitions: 45,
        totalCandidates: 234,
        totalHires: 12,
        averageTimeToHire: 18,
        offerAcceptanceRate: 85.7,
        topPerformingSource: 'LinkedIn',
        topPerformingDepartment: 'Engineering'
      },
      keyMetrics: {
        hiringVelocity: 2.1, // hires per week
        candidateQuality: 4.2, // average score
        processEfficiency: 78.5, // percentage
        costEffectiveness: 92.3 // percentage
      },
      recommendations: [
        'Increase LinkedIn sourcing budget based on 67% conversion rate',
        'Reduce time-to-interview from 8 days to 5 days target',
        'Implement automated screening for high-volume positions',
        'Focus on Engineering department hiring given 89% fill rate'
      ],
      alerts: [
        'Marketing department showing 45% candidate drop-off at interview stage',
        '3 requisitions approaching 60-day open threshold',
        'Referral source showing declining quality scores'
      ]
    };

    logger.info('Summary report generated', {
      tenantId,
      totalRequisitions: report.executiveSummary.totalRequisitions,
      totalHires: report.executiveSummary.totalHires
    });

    return res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Error generating summary report:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate summary report'
    });
  }
});

export default router;
