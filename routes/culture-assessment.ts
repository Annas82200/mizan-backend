// server/routes/culture-assessment.ts

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import {
  cultureAssessments,
  cultureReports,
  cultureSurveyInvitations,
  users,
  tenants,
  triggers
} from '../db/schema.js';
import { CultureAgent } from '../services/agents/culture-agent.js';
import { EngagementAgent } from '../services/agents/engagement-agent.js';
import { RecognitionAgent } from '../services/agents/recognition-agent.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

const router = Router();

// Schema for culture assessment submission
const CultureAssessmentSchema = z.object({
  personalValues: z.array(z.string()).length(10),
  currentExperienceValues: z.array(z.string()).length(10),
  desiredFutureValues: z.array(z.string()).length(10),
  engagementLevel: z.number().min(1).max(5),      // Fixed: 1-5 scale
  recognitionLevel: z.number().min(1).max(5)      // Fixed: 1-5 scale
});

/**
 * Get Mizan values for assessment
 * Returns Mizan 7 Cylinders framework values from CultureAgent
 */
router.get('/values/:tenantId', authenticate, async (req: Request, res: Response) => {
  try {
    const agent = new CultureAgent();
    const frameworks = await agent['loadFrameworks']();

    const cylinders = frameworks.cylinders || [];
    const values = cylinders.flatMap((cylinder: any, index: number) => {
      const enablingValues = (cylinder.enabling_values || []).map((value: string) => ({
        value,
        type: 'enabling',
        cylinder: index + 1,
        cylinderName: cylinder.name
      }));
      const limitingValues = (cylinder.limiting_values || []).map((value: string) => ({
        value,
        type: 'limiting',
        cylinder: index + 1,
        cylinderName: cylinder.name
      }));
      return [...enablingValues, ...limitingValues];
    });

    return res.json({
      success: true,
      values,
      cylinders: cylinders.map((c: any, index: number) => ({
        level: index + 1,
        name: c.name,
        definition: c.definition,
        ethicalPrinciple: c.ethical_principle
      }))
    });

  } catch (error) {
    console.error('Error fetching Mizan values:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch values'
    });
  }
});

/**
 * POST /api/culture-assessment/distribute
 * Distribute survey to all employees
 * Only accessible by clientAdmin or superadmin
 */
router.post('/distribute', authenticate, authorize(['clientAdmin', 'superadmin']),
  async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      campaignName: z.string().optional(),
      expiryDays: z.number().default(30),
      tenantId: z.string().optional()
    });

    const { campaignName, expiryDays, tenantId: requestTenantId } = schema.parse(req.body);

    // Superadmins can select any tenant, others use their own tenant
    const tenantId = req.user!.role === 'superadmin' && requestTenantId
      ? requestTenantId
      : req.user!.tenantId;

    console.log('[Culture Survey] Distributing for tenantId:', tenantId);
    console.log('[Culture Survey] Requested by user:', req.user!.email, 'role:', req.user!.role);

    // Get all active employees from tenant
    const employees = await db.query.users.findMany({
      where: and(
        eq(users.tenantId, tenantId),
        eq(users.isActive, true)
      ),
      columns: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });

    console.log('[Culture Survey] Found employees:', employees.length);
    if (employees.length > 0) {
      console.log('[Culture Survey] Sample employee:', employees[0]);
    }

    if (employees.length === 0) {
      // Check if any users exist for this tenant at all
      const allUsers = await db.query.users.findMany({
        where: eq(users.tenantId, tenantId),
        columns: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true
        }
      });

      console.log('[Culture Survey] Total users for tenant:', allUsers.length);
      console.log('[Culture Survey] All users:', allUsers);

      return res.status(400).json({
        error: 'No active employees found',
        debug: {
          tenantId,
          totalUsers: allUsers.length,
          users: allUsers
        }
      });
    }

    const campaignId = randomUUID();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    // Create invitations for all employees
    const invitations = [];
    for (const employee of employees) {
      const surveyToken = randomUUID();
      const surveyLink = `${frontendUrl}/survey/${surveyToken}`;

      const [invitation] = await db.insert(cultureSurveyInvitations).values({
        tenantId,
        campaignId,
        campaignName: campaignName || `Culture Survey - ${new Date().toLocaleDateString()}`,
        employeeId: employee.id,
        employeeEmail: employee.email,
        surveyToken,
        surveyLink,
        status: 'pending',
        expiresAt
      }).returning();

      invitations.push({
        employeeId: employee.id,
        email: employee.email,
        name: employee.name,
        surveyLink,
        surveyToken
      });

      // Email notification (optional integration)
      // Note: Email sending should be handled by the frontend or a separate notification service
      // The API returns the survey links for the admin to distribute
    }

    // Update all invitations to 'sent' status
    // (In production, only update after successful email send)
    await db.update(cultureSurveyInvitations)
      .set({
        status: 'sent',
        sentAt: new Date()
      })
      .where(eq(cultureSurveyInvitations.campaignId, campaignId));

    console.log(`✅ Distributed culture survey to ${invitations.length} employees`);

    return res.json({
      success: true,
      campaignId,
      campaignName: campaignName || `Culture Survey - ${new Date().toLocaleDateString()}`,
      invitationsSent: invitations.length,
      expiresAt,
      invitations: invitations.map(inv => ({
        employeeId: inv.employeeId,
        email: inv.email,
        surveyLink: inv.surveyLink
      }))
    });

  } catch (error) {
    console.error('Survey distribution error:', error);
    return res.status(500).json({
      error: 'Failed to distribute survey'
    });
  }
});

/**
 * GET /api/culture-assessment/employees
 * Get employees with survey completion status
 */
router.get('/employees', authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string || req.user!.tenantId;

    // Get all employees for tenant
    const allEmployees = await db.query.users.findMany({
      where: and(
        eq(users.tenantId, tenantId),
        eq(users.role, 'employee'),
        eq(users.isActive, true)
      ),
      columns: {
        id: true,
        email: true,
        name: true,
        title: true
      }
    });

    // Get survey completion status
    const employeesWithStatus = await Promise.all(
      allEmployees.map(async (emp) => {
        const assessment = await db.query.cultureAssessments.findFirst({
          where: and(
            eq(cultureAssessments.userId, emp.id),
            eq(cultureAssessments.tenantId, tenantId)
          ),
          orderBy: (assessments: any, { desc }: any) => [desc(assessments.completedAt)]
        });

        return {
          id: emp.id,
          name: emp.name,
          email: emp.email,
          department: emp.title || 'Unassigned',
          role: emp.title,
          hasCompletedSurvey: !!assessment
        };
      })
    );

    return res.json({
      success: true,
      employees: employeesWithStatus
    });

  } catch (error) {
    console.error('Error fetching employees:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch employees'
    });
  }
});

/**
 * GET /api/culture-assessment/campaign/:campaignId/status
 * Get survey campaign status and completion rates
 */
router.get('/campaign/:campaignId/status', authenticate, authorize(['clientAdmin', 'superadmin']),
  async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const tenantId = req.user!.tenantId;

    const invitations = await db.query.cultureSurveyInvitations.findMany({
      where: and(
        eq(cultureSurveyInvitations.campaignId, campaignId),
        eq(cultureSurveyInvitations.tenantId, tenantId)
      )
    });

    if (invitations.length === 0) {
      return res.status(404).json({
        error: 'Campaign not found'
      });
    }

    const total = invitations.length;
    const completed = invitations.filter(inv => inv.status === 'completed').length;
    const pending = invitations.filter(inv => inv.status === 'pending' || inv.status === 'sent').length;
    const expired = invitations.filter(inv => inv.status === 'expired').length;

    return res.json({
      success: true,
      campaignId,
      campaignName: invitations[0].campaignName,
      statistics: {
        total,
        completed,
        pending,
        expired,
        completionRate: Math.round((completed / total) * 100)
      },
      expiresAt: invitations[0].expiresAt,
      invitations: invitations.map(inv => ({
        employeeId: inv.employeeId,
        employeeEmail: inv.employeeEmail,
        status: inv.status,
        sentAt: inv.sentAt,
        completedAt: inv.completedAt
      }))
    });

  } catch (error) {
    console.error('Campaign status error:', error);
    return res.status(500).json({
      error: 'Failed to fetch campaign status'
    });
  }
});

/**
 * Submit culture assessment (PUBLIC - uses survey token instead of auth)
 */
router.post('/submit', async (req: Request, res: Response) => {
  try {
    // Validate survey token first
    const schema = z.object({
      surveyToken: z.string().uuid(),
      personalValues: z.array(z.string()).length(10),
      currentExperience: z.array(z.string()).length(10),
      desiredExperience: z.array(z.string()).length(10),
      engagement: z.number().min(1).max(5),
      recognition: z.number().min(1).max(5)
    });

    const validatedData = schema.parse(req.body);

    // Find the survey invitation by token
    const invitation = await db.query.cultureSurveyInvitations.findFirst({
      where: eq(cultureSurveyInvitations.surveyToken, validatedData.surveyToken)
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: 'Invalid survey token'
      });
    }

    // Check if already completed
    if (invitation.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Survey already completed'
      });
    }

    // Check if expired
    if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Survey link has expired'
      });
    }

    // Save assessment to database
    const assessment = await db.insert(cultureAssessments).values({
      tenantId: invitation.tenantId,
      userId: invitation.employeeId,
      personalValues: validatedData.personalValues,
      currentExperience: validatedData.currentExperience,
      desiredExperience: validatedData.desiredExperience,
      engagement: validatedData.engagement,
      recognition: validatedData.recognition
    }).returning();

    // Mark survey invitation as completed
    await db.update(cultureSurveyInvitations)
      .set({
        status: 'completed',
        completedAt: new Date()
      })
      .where(eq(cultureSurveyInvitations.surveyToken, validatedData.surveyToken));

    // Trigger immediate individual report generation (async background)
    generateEmployeeReport(assessment[0].id, invitation.employeeId, invitation.tenantId);

    return res.json({
      success: true,
      assessmentId: assessment[0].id,
      message: 'Assessment submitted successfully'
    });

  } catch (error) {
    console.error('Error submitting assessment:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid assessment data',
        details: error.errors
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to submit assessment'
    });
  }
});

/**
 * POST /api/culture-assessment/map-values
 * Map tenant values to 7 Cylinders Framework
 * Only accessible by clientAdmin or superadmin
 */
router.post('/map-values', authenticate, authorize(['clientAdmin', 'superadmin']),
  async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      values: z.array(z.string()).min(1).max(20)
    });

    const { values } = schema.parse(req.body);
    const tenantId = req.user!.tenantId;

    // Get tenant info to fetch existing values if needed
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId)
    });

    if (!tenant) {
      return res.status(404).json({
        error: 'Tenant not found'
      });
    }

    // Use Culture Agent to map values
    const cultureAgent = new CultureAgent();
    const mapping = await cultureAgent.mapTenantValuesToCylinders(tenantId, values);

    return res.json({
      success: true,
      tenantId,
      tenantValues: values,
      ...mapping
    });

  } catch (error) {
    console.error('Values mapping error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid values data',
        details: error.errors
      });
    }

    return res.status(500).json({
      error: 'Failed to map values'
    });
  }
});

/**
 * Get assessment status for employee
 */
router.get('/status/:userId', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const assessment = await db.query.cultureAssessments.findFirst({
      where: eq(cultureAssessments.userId, userId),
      orderBy: (assessments: any, { desc }: any) => [desc(assessments.completedAt)]
    });

    return res.json({
      success: true,
      hasCompleted: !!assessment,
      completedAt: assessment?.completedAt,
      canRetake: !assessment || (assessment.completedAt && daysSince(assessment.completedAt) > 90)
    });

  } catch (error) {
    console.error('Error checking assessment status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check status'
    });
  }
});

/**
 * Get employee culture report by survey token (PUBLIC - no auth required)
 */
router.get('/report/survey/:surveyToken', async (req: Request, res: Response) => {
  try {
    const { surveyToken } = req.params;

    // Find the survey invitation
    const invitation = await db.query.cultureSurveyInvitations.findFirst({
      where: eq(cultureSurveyInvitations.surveyToken, surveyToken)
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: 'Invalid survey token'
      });
    }

    // Get the assessment for this employee
    const assessment = await db.query.cultureAssessments.findFirst({
      where: and(
        eq(cultureAssessments.userId, invitation.employeeId),
        eq(cultureAssessments.tenantId, invitation.tenantId)
      ),
      orderBy: (assessments: any, { desc }: any) => [desc(assessments.completedAt)]
    });

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'No assessment found. Report is being generated.',
        status: 'pending'
      });
    }

    // Get the report
    const report = await getEmployeeReport(assessment.id, invitation.employeeId);

    return res.json({
      success: true,
      report,
      status: report.userId ? 'pending' : 'completed'
    });

  } catch (error) {
    console.error('Error fetching employee report:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch report'
    });
  }
});

/**
 * Get employee culture report (AUTHENTICATED)
 */
router.get('/report/employee/:userId', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Get latest assessment
    const assessment = await db.query.cultureAssessments.findFirst({
      where: eq(cultureAssessments.userId, userId),
      orderBy: (assessments: any, { desc }: any) => [desc(assessments.completedAt)]
    });

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'No assessment found'
      });
    }

    // Get or generate report
    const report = await getEmployeeReport(assessment.id, userId);

    return res.json({
      success: true,
      report
    });

  } catch (error) {
    console.error('Error fetching employee report:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch report'
    });
  }
});

/**
 * Get department culture report
 */
router.get('/report/department/:departmentId', authenticate, async (req: Request, res: Response) => {
  try {
    const { departmentId } = req.params;
    const { tenantId, companyId } = req.query;

    // Check permissions - only managers and above
    if (!hasManagerPermissions(req.user, departmentId)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    const report = await getDepartmentReport(
      departmentId as string,
      companyId as string,
      tenantId as string
    );

    return res.json({
      success: true,
      report
    });

  } catch (error) {
    console.error('Error fetching department report:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch report'
    });
  }
});

/**
 * GET /api/culture-assessment/report/company
 * Get company-wide culture report (admin only)
 */
router.get('/report/company', authenticate, authorize(['clientAdmin', 'superadmin']),
  async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    // Check if report already exists
    const existingReport = await db.query.cultureReports.findFirst({
      where: and(
        eq(cultureReports.tenantId, tenantId),
        eq(cultureReports.reportType, 'company')
      ),
      orderBy: (reports: any, { desc }: any) => [desc(reports.createdAt)]
    });

    if (existingReport) {
      return res.json({
        success: true,
        report: existingReport.reportData
      });
    }

    // Generate new company report
    const assessments = await db.query.cultureAssessments.findMany({
      where: eq(cultureAssessments.tenantId, tenantId),
      with: {
        user: true
      }
    });

    if (assessments.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No culture assessments found. Please complete assessments first.'
      });
    }

    const report = await generateTenantReport(tenantId, assessments, 'company', tenantId);

    return res.json({
      success: true,
      report
    });

  } catch (error) {
    console.error('Error generating company report:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate company report'
    });
  }
});

/**
 * Helper Functions
 */

async function generateEmployeeReport(assessmentId: string, userId: string, tenantId: string) {
  setTimeout(async () => {
    try {
      const cultureAgent = new CultureAgent();
      const engagementAgent = new EngagementAgent();
      const recognitionAgent = new RecognitionAgent();

      // Get the assessment with user data
      const assessment = await db.query.cultureAssessments.findFirst({
        where: eq(cultureAssessments.id, assessmentId),
        with: {
          user: true
        }
      });

      if (!assessment) return;

      // Call Culture Agent to analyze individual employee
      const cultureAnalysis = await cultureAgent.analyzeIndividualEmployee({
        tenantId,
        employeeId: userId,
        employeeName: assessment.user?.name || 'Employee',
        personalValues: assessment.personalValues as string[],
        currentExperienceValues: assessment.currentExperience as string[],
        desiredExperienceValues: assessment.desiredExperience as string[]
      });

      // Get engagement insights from Engagement Agent
      const engagementAnalysis = await engagementAgent.analyzeIndividual({
        tenantId,
        employeeId: userId,
        engagementScore: assessment.engagement || 0,
        context: {
          valuesAlignment: cultureAnalysis.alignmentScore || 0,
          currentExperience: assessment.currentExperience as string[]
        }
      });

      // Get recognition insights from Recognition Agent
      const recognitionAnalysis = await recognitionAgent.analyzeIndividual({
        tenantId,
        employeeId: userId,
        recognitionScore: assessment.recognition || 0,
        context: {
          valuesAlignment: cultureAnalysis.alignmentScore || 0,
          engagement: assessment.engagement || 0
        }
      });

      // Build comprehensive employee report with rich AI insights
      const report = {
        employeeId: userId,
        employeeName: assessment.user?.name || 'Employee',
        assessmentDate: assessment.completedAt,

        // Personal values interpretation - what they mean personally
        personalValues: {
          selected: assessment.personalValues,
          interpretation: cultureAnalysis.personalValuesInterpretation || 'Analysis in progress...',
          dominantCylinders: cultureAnalysis.dominantCylinders || [],
          strengths: cultureAnalysis.strengths || [],
          limitingFactors: cultureAnalysis.limitingFactors || []
        },

        // Current experience - how they experience the company TODAY
        currentExperience: {
          selected: assessment.currentExperience,
          meaning: cultureAnalysis.currentExperienceMeaning || 'Analysis in progress...',
          cylinders: cultureAnalysis.currentExperienceCylinders || []
        },

        // Desired experience - how they WANT to experience the company
        desiredExperience: {
          selected: assessment.desiredExperience,
          meaning: cultureAnalysis.desiredExperienceMeaning || 'Analysis in progress...',
          gaps: cultureAnalysis.experienceGaps || [],
          opportunities: cultureAnalysis.growthOpportunities || []
        },

        // Alignment analysis
        alignment: {
          personalVsCurrent: cultureAnalysis.alignmentScore || 0,
          interpretation: cultureAnalysis.alignmentInterpretation || '',
          retentionRisk: cultureAnalysis.retentionRisk || 'medium',
          recommendations: cultureAnalysis.recommendations || []
        },

        // Engagement with score interpretation
        engagement: {
          score: assessment.engagement || 0,
          interpretation: engagementAnalysis.interpretation || '',
          meaning: engagementAnalysis.meaning || '',
          factors: engagementAnalysis.factors || [],
          recommendations: engagementAnalysis.recommendations || []
        },

        // Recognition with score interpretation
        recognition: {
          score: assessment.recognition || 0,
          interpretation: recognitionAnalysis.interpretation || '',
          meaning: recognitionAnalysis.meaning || '',
          impact: recognitionAnalysis.impact || '',
          recommendations: recognitionAnalysis.recommendations || []
        },

        // Overall summary
        overallSummary: {
          culturalFit: cultureAnalysis.alignmentScore >= 70 ? 'Strong' :
                       cultureAnalysis.alignmentScore >= 50 ? 'Moderate' : 'Needs Attention',
          keyStrengths: cultureAnalysis.strengths?.slice(0, 3) || [],
          developmentAreas: cultureAnalysis.recommendations?.slice(0, 3) || [],
          nextSteps: cultureAnalysis.nextSteps || [
            'Review your personalized insights',
            'Discuss development opportunities with your manager',
            'Explore recommended learning paths'
          ]
        }
      };

      await db.insert(cultureReports).values({
        id: randomUUID(),
        tenantId,
        analysisId: assessmentId,
        reportType: 'employee',
        reportData: report,
        createdAt: new Date()
      });

      console.log('✅ Employee report generated:', userId);

      // Phase 3: Create triggers for LXP and Performance based on culture gaps
      await createCultureTriggers(userId, tenantId, report, assessmentId);

    } catch (error: any) {
      console.error('Error generating employee report:', error);
    }
  }, 0);
}

// Helper: Analyze what personal values mean
async function analyzeValuesMeaning(
  values: string[],
  cylinders: any,
  context: 'personal' | 'current' | 'desired'
): Promise<{
  analysis: string;
  dominantCylinders: Array<{ cylinder: number; name: string; count: number }>;
  interpretation: string;
}> {
  // Map values to cylinders
  const cylinderMapping: { [key: number]: number } = {};

  values.forEach(value => {
    const valueLower = value.toLowerCase();

    // Find which cylinder this value belongs to
    Object.entries(cylinders).forEach(([num, cyl]: [string, any]) => {
      const enablingLower = cyl.enablingValues.map((v: string) => v.toLowerCase());
      const limitingLower = cyl.limitingValues.map((v: string) => v.toLowerCase());

      if (enablingLower.includes(valueLower) || limitingLower.includes(valueLower)) {
        const cylinderNum = parseInt(num);
        cylinderMapping[cylinderNum] = (cylinderMapping[cylinderNum] || 0) + 1;
      }
    });
  });

  // Find dominant cylinders
  const dominantCylinders = Object.entries(cylinderMapping)
    .map(([cyl, count]) => ({
      cylinder: parseInt(cyl),
      name: cylinders[parseInt(cyl)].name,
      count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Generate interpretation
  const topCylinder = dominantCylinders[0];
  const interpretation = topCylinder
    ? `Your ${context} values are primarily oriented toward ${topCylinder.name} (Cylinder ${topCylinder.cylinder}), which emphasizes ${cylinders[topCylinder.cylinder].definition.toLowerCase()}`
    : 'Your values span multiple dimensions of the cultural framework.';

  const analysis = `Selected ${values.length} values across ${Object.keys(cylinderMapping).length} cylinders. ${interpretation}`;

  return {
    analysis,
    dominantCylinders,
    interpretation
  };
}

// Helper: Analyze gap between current and desired experience
async function analyzeExperienceGap(
  currentValues: string[],
  desiredValues: string[],
  cylinders: any
): Promise<{
  gaps: Array<{ value: string; type: 'missing' | 'unwanted' }>;
  analysis: string;
  priorities: string[];
}> {
  const currentSet = new Set(currentValues.map(v => v.toLowerCase()));
  const desiredSet = new Set(desiredValues.map(v => v.toLowerCase()));

  // Find values desired but not currently experienced
  const missing = Array.from(desiredSet).filter(v => !currentSet.has(v));

  // Find values currently experienced but not desired
  const unwanted = Array.from(currentSet).filter(v => !desiredSet.has(v));

  const gaps = [
    ...missing.map(v => ({ value: v, type: 'missing' as const })),
    ...unwanted.map(v => ({ value: v, type: 'unwanted' as const }))
  ];

  const analysis = `You identified ${missing.length} values you'd like to experience more and ${unwanted.length} values you'd prefer to see less of in your work environment.`;

  const priorities = missing.slice(0, 5);

  return {
    gaps,
    analysis,
    priorities
  };
}

// Helper: Calculate participation rate
async function calculateParticipationRate(
  tenantId: string,
  completedCount: number
): Promise<{
  total: number;
  completed: number;
  percentage: number;
  message: string;
}> {
  // Get total active employees in tenant
  const totalEmployees = await db.query.users.findMany({
    where: and(
      eq(users.tenantId, tenantId),
      eq(users.isActive, true)
    )
  });

  const total = totalEmployees.length;
  const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  return {
    total,
    completed: completedCount,
    percentage,
    message: `${completedCount} out of ${total} employees completed the assessment (${percentage}%)`
  };
}

// Helper: Analyze alignment between personal values and current experience
async function analyzeValueAlignment(
  personalValues: string[],
  currentExperience: string[],
  cylinders: any
): Promise<{
  alignmentScore: number;
  gaps: string[];
  strengths: string[];
  recommendations: string[];
}> {
  const personalSet = new Set(personalValues.map(v => v.toLowerCase()));
  const currentSet = new Set(currentExperience.map(v => v.toLowerCase()));

  // Calculate overlap
  const overlap = Array.from(personalSet).filter(v => currentSet.has(v));
  const alignmentScore = Math.round((overlap.length / personalValues.length) * 100);

  // Identify gaps (personal values not experienced at work)
  const gaps = Array.from(personalSet).filter(v => !currentSet.has(v));

  // Identify strengths (personal values that ARE experienced)
  const strengths = overlap;

  // Generate recommendations based on gaps
  const recommendations = gaps.slice(0, 3).map(gap =>
    `Seek opportunities to bring more "${gap}" into your work`
  );

  return {
    alignmentScore,
    gaps,
    strengths,
    recommendations
  };
}

function daysSince(date: Date | null): number {
  if (!date) return 999;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function hasManagerPermissions(user: any, departmentId: string): boolean {
  // Implementation depends on your auth system
  return user.role === 'manager' || user.role === 'admin' || user.departmentId === departmentId;
}

async function getEmployeeReport(assessmentId: string, userId: string): Promise<any> {
  const report = await db.query.cultureReports.findFirst({
    where: eq(cultureReports.analysisId, assessmentId)
  });

  if (report) {
    return report.reportData;
  }

  return {
    userId,
    assessmentId,
    status: 'generating',
    message: 'Report is being generated in the background'
  };
}

async function getDepartmentReport(
  departmentId: string,
  companyId: string,
  tenantId: string
): Promise<any> {
  // Check if report already exists
  const existingReport = await db.query.cultureReports.findFirst({
    where: and(
      eq(cultureReports.tenantId, tenantId),
      eq(cultureReports.analysisId, departmentId),
      eq(cultureReports.reportType, 'department')
    ),
    orderBy: (reports: any, { desc }: any) => [desc(reports.createdAt)]
  });

  if (existingReport) {
    return existingReport.reportData;
  }

  // Generate new report
  const assessments = await db.query.cultureAssessments.findMany({
    where: eq(cultureAssessments.tenantId, tenantId),
    with: {
      user: true
    }
  });

  if (assessments.length === 0) {
    throw new Error('No culture assessments found for this department');
  }

  // Filter assessments for this department (assuming user has departmentId)
  const deptAssessments = assessments.filter(
    a => a.user && (a.user as any).departmentId === departmentId
  );

  if (deptAssessments.length === 0) {
    throw new Error('No assessments found for this specific department');
  }

  const report = await generateTenantReport(tenantId, deptAssessments, 'department', departmentId);

  return report;
}

async function generateTenantReport(
  tenantId: string,
  assessments: any[],
  reportType: 'department' | 'company',
  targetId?: string
): Promise<any> {
  const agent = new CultureAgent();
  const frameworks = await agent['loadFrameworks']();
  const cylinders = frameworks.cylinders;

  // Get tenant values mapping
  const tenantMapping = await db.query.cultureReports.findFirst({
    where: and(
      eq(cultureReports.tenantId, tenantId),
      eq(cultureReports.reportType, 'values_mapping')
    ),
    orderBy: (reports: any, { desc }: any) => [desc(reports.createdAt)]
  });

  // Extract tenant values and their cylinder mapping
  const reportData = tenantMapping?.reportData as any || {};
  const tenantValues = reportData.tenantValues || [];
  const valuesMappings = reportData.mappings || [];

  // Analyze what tenant values mean (using 7 Cylinders)
  const tenantValuesAnalysis = await analyzeTenantValuesMeaning(
    tenantValues,
    valuesMappings,
    cylinders
  );

  // Aggregate employee data
  const aggregatedData = aggregateEmployeeAssessments(assessments);

  // Analyze: How employees experience the company vs. tenant values
  const currentExperienceAnalysis = await analyzeEmployeeExperienceVsTenantValues(
    aggregatedData.currentExperience,
    tenantValues,
    cylinders
  );

  // Analyze: How employees want to experience vs. tenant values
  const desiredExperienceAnalysis = await analyzeEmployeeExperienceVsTenantValues(
    aggregatedData.desiredExperience,
    tenantValues,
    cylinders
  );

  // Calculate engagement and recognition stats
  const engagementStats = calculateStats(assessments.map(a => a.engagement));
  const recognitionStats = calculateStats(assessments.map(a => a.recognition));

  // Identify cultural strengths and gaps
  const culturalHealth = analyzeCulturalHealth(
    aggregatedData,
    tenantValues,
    cylinders
  );

  // Generate departmental breakdown (if company-level report)
  let departmentalBreakdown = null;
  if (reportType === 'company') {
    departmentalBreakdown = await generateDepartmentalBreakdown(assessments, cylinders);
  }

  // Build comprehensive tenant report
  const report = {
    reportType,
    targetId,
    generatedAt: new Date(),
    participationRate: await calculateParticipationRate(tenantId, assessments.length),

    tenantValues: {
      values: tenantValues,
      mappings: valuesMappings,
      analysis: tenantValuesAnalysis.analysis,
      dominantCylinders: tenantValuesAnalysis.dominantCylinders,
      culturalOrientation: tenantValuesAnalysis.culturalOrientation
    },

    employeeExperience: {
      current: {
        topValues: aggregatedData.currentExperience.slice(0, 10),
        analysis: currentExperienceAnalysis.analysis,
        alignment: currentExperienceAnalysis.alignment,
        gaps: currentExperienceAnalysis.gaps
      },
      desired: {
        topValues: aggregatedData.desiredExperience.slice(0, 10),
        analysis: desiredExperienceAnalysis.analysis,
        alignment: desiredExperienceAnalysis.alignment,
        aspirationalGaps: desiredExperienceAnalysis.gaps
      }
    },

    culturalHealth: {
      overallScore: culturalHealth.overallScore,
      status: culturalHealth.status,
      strengths: culturalHealth.strengths,
      challenges: culturalHealth.challenges,
      cylinderDistribution: culturalHealth.cylinderDistribution
    },

    engagement: {
      average: engagementStats.average,
      median: engagementStats.median,
      distribution: engagementStats.distribution,
      trend: engagementStats.average >= 4 ? 'Highly Engaged' : engagementStats.average >= 3 ? 'Moderately Engaged' : 'Needs Attention'
    },

    recognition: {
      average: recognitionStats.average,
      median: recognitionStats.median,
      distribution: recognitionStats.distribution,
      trend: recognitionStats.average >= 4 ? 'Well Recognized' : recognitionStats.average >= 3 ? 'Moderately Recognized' : 'Needs Attention'
    },

    departmentalBreakdown,

    recommendations: generateOrganizationalRecommendations(
      culturalHealth,
      currentExperienceAnalysis,
      desiredExperienceAnalysis,
      engagementStats,
      recognitionStats
    ),

    nextSteps: [
      'Review cultural health metrics with leadership',
      'Address identified gaps through targeted interventions',
      'Assign culture-shaping learning experiences',
      'Set culture-aligned performance goals',
      'Schedule follow-up assessment in 6 months'
    ]
  };

  // Store the report
  await db.insert(cultureReports).values({
    id: randomUUID(),
    tenantId,
    analysisId: targetId || tenantId,
    reportType,
    reportData: report,
    createdAt: new Date()
  });

  console.log(`✅ ${reportType} report generated for tenant:`, tenantId);

  return report;
}

// Helper: Analyze what tenant values mean using 7 Cylinders
function analyzeTenantValuesMeaning(
  tenantValues: string[],
  mappings: any[],
  cylinders: any
): {
  analysis: string;
  dominantCylinders: Array<{ cylinder: number; name: string; count: number }>;
  culturalOrientation: string;
} {
  // Count which cylinders the tenant values map to
  const cylinderCounts: { [key: number]: number } = {};

  mappings.forEach(mapping => {
    const cyl = mapping.cylinder;
    cylinderCounts[cyl] = (cylinderCounts[cyl] || 0) + 1;
  });

  const dominantCylinders = Object.entries(cylinderCounts)
    .map(([cyl, count]) => ({
      cylinder: parseInt(cyl),
      name: cylinders[parseInt(cyl)].name,
      count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const topCylinder = dominantCylinders[0];
  const culturalOrientation = topCylinder
    ? `Your organization's stated values emphasize ${topCylinder.name} (Cylinder ${topCylinder.cylinder}), which focuses on ${cylinders[topCylinder.cylinder].definition.toLowerCase()}`
    : 'Your organizational values span multiple cultural dimensions.';

  const analysis = `Your organization has defined ${tenantValues.length} core values, primarily mapped to ${dominantCylinders.map(c => c.name).join(', ')}.`;

  return {
    analysis,
    dominantCylinders,
    culturalOrientation
  };
}

// Helper: Aggregate all employee assessments
function aggregateEmployeeAssessments(assessments: any[]): {
  personalValues: Array<{ value: string; count: number }>;
  currentExperience: Array<{ value: string; count: number }>;
  desiredExperience: Array<{ value: string; count: number }>;
} {
  const aggregate = (field: string) => {
    const counts: { [key: string]: number } = {};

    assessments.forEach(assessment => {
      const values = assessment[field] as string[];
      if (Array.isArray(values)) {
        values.forEach(value => {
          const v = value.toLowerCase();
          counts[v] = (counts[v] || 0) + 1;
        });
      }
    });

    return Object.entries(counts)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  };

  return {
    personalValues: aggregate('personalValues'),
    currentExperience: aggregate('currentExperience'),
    desiredExperience: aggregate('desiredExperience')
  };
}

// Helper: Analyze how employees experience company vs. tenant values
async function analyzeEmployeeExperienceVsTenantValues(
  employeeValues: Array<{ value: string; count: number }>,
  tenantValues: string[],
  cylinders: any
): Promise<{
  analysis: string;
  alignment: number;
  gaps: string[];
}> {
  const tenantSet = new Set(tenantValues.map(v => v.toLowerCase()));
  const employeeSet = new Set(employeeValues.map(v => v.value.toLowerCase()));

  // Calculate alignment: how many tenant values are being experienced by employees
  const experiencedTenantValues = tenantValues.filter(tv =>
    employeeSet.has(tv.toLowerCase())
  );

  const alignment = Math.round((experiencedTenantValues.length / tenantValues.length) * 100);

  // Identify gaps: tenant values NOT being experienced
  const gaps = tenantValues.filter(tv => !employeeSet.has(tv.toLowerCase()));

  const analysis = `Employees are experiencing ${experiencedTenantValues.length} out of ${tenantValues.length} organizational values (${alignment}% alignment). ${gaps.length > 0 ? `Gap areas include: ${gaps.join(', ')}.` : 'Strong value alignment across the organization.'}`;

  return {
    analysis,
    alignment,
    gaps
  };
}

// Helper: Calculate statistical metrics
function calculateStats(values: number[]): {
  average: number;
  median: number;
  distribution: { [key: number]: number };
} {
  const validValues = values.filter(v => v !== null && v !== undefined);

  if (validValues.length === 0) {
    return { average: 0, median: 0, distribution: {} };
  }

  const sum = validValues.reduce((acc, v) => acc + v, 0);
  const average = Math.round((sum / validValues.length) * 10) / 10;

  const sorted = [...validValues].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  const distribution: { [key: number]: number } = {};
  validValues.forEach(v => {
    distribution[v] = (distribution[v] || 0) + 1;
  });

  return { average, median, distribution };
}

// Helper: Analyze overall cultural health
function analyzeCulturalHealth(
  aggregatedData: any,
  tenantValues: string[],
  cylinders: any
): {
  overallScore: number;
  status: string;
  strengths: string[];
  challenges: string[];
  cylinderDistribution: { [key: number]: number };
} {
  const currentValues = aggregatedData.currentExperience;

  // Map current experience to cylinders
  const cylinderDistribution: { [key: number]: number } = {};

  currentValues.forEach((item: { value: string; count: number }) => {
    const valueLower = item.value.toLowerCase();

    Object.entries(cylinders).forEach(([num, cyl]: [string, any]) => {
      const enablingLower = cyl.enablingValues.map((v: string) => v.toLowerCase());
      if (enablingLower.includes(valueLower)) {
        const cylinderNum = parseInt(num);
        cylinderDistribution[cylinderNum] = (cylinderDistribution[cylinderNum] || 0) + item.count;
      }
    });
  });

  // Calculate overall score based on cylinder distribution
  const totalCount = Object.values(cylinderDistribution).reduce((sum: number, count: number) => sum + count, 0);
  const weightedSum = Object.entries(cylinderDistribution).reduce(
    (sum, [cyl, count]) => sum + (parseInt(cyl) * (count as number)),
    0
  );
  const overallScore = totalCount > 0 ? Math.round((weightedSum / totalCount) * 100 / 7) : 0;

  const status = overallScore >= 70 ? 'Healthy' : overallScore >= 50 ? 'Developing' : 'Needs Attention';

  // Identify top 3 cylinders as strengths
  const strengths = Object.entries(cylinderDistribution)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 3)
    .map(([cyl]) => cylinders[parseInt(cyl)].name);

  // Identify cylinders with low representation as challenges
  const challenges = Object.entries(cylinders)
    .filter(([num]) => !cylinderDistribution[parseInt(num)] || cylinderDistribution[parseInt(num)] < 5)
    .map(([, cyl]: [string, any]) => cyl.name)
    .slice(0, 3);

  return {
    overallScore,
    status,
    strengths,
    challenges,
    cylinderDistribution
  };
}

// Helper: Generate departmental breakdown
async function generateDepartmentalBreakdown(
  assessments: any[],
  cylinders: any
): Promise<any> {
  // Group assessments by department
  const departmentGroups: { [key: string]: any[] } = {};

  assessments.forEach(assessment => {
    const deptId = (assessment.user as any)?.departmentId || 'unknown';
    if (!departmentGroups[deptId]) {
      departmentGroups[deptId] = [];
    }
    departmentGroups[deptId].push(assessment);
  });

  // Analyze each department
  const breakdown = Object.entries(departmentGroups).map(([deptId, deptAssessments]) => {
    const engagementAvg = deptAssessments.reduce((sum, a) => sum + (a.engagement || 0), 0) / deptAssessments.length;
    const recognitionAvg = deptAssessments.reduce((sum, a) => sum + (a.recognition || 0), 0) / deptAssessments.length;

    return {
      departmentId: deptId,
      employeeCount: deptAssessments.length,
      engagement: Math.round(engagementAvg * 10) / 10,
      recognition: Math.round(recognitionAvg * 10) / 10,
      status: engagementAvg >= 4 && recognitionAvg >= 4 ? 'Healthy' : 'Needs Attention'
    };
  });

  return breakdown;
}

// Helper: Generate organizational recommendations
function generateOrganizationalRecommendations(
  culturalHealth: any,
  currentAnalysis: any,
  desiredAnalysis: any,
  engagementStats: any,
  recognitionStats: any
): Array<{
  category: string;
  priority: string;
  title: string;
  description: string;
  actionItems: string[];
}> {
  const recommendations = [];

  // Culture alignment recommendations
  if (currentAnalysis.alignment < 70) {
    recommendations.push({
      category: 'Culture Alignment',
      priority: 'high',
      title: 'Bridge Values-Experience Gap',
      description: `Only ${currentAnalysis.alignment}% of organizational values are being experienced by employees.`,
      actionItems: [
        `Focus on reinforcing: ${currentAnalysis.gaps.slice(0, 3).join(', ')}`,
        'Conduct leadership workshops on values embodiment',
        'Integrate values into recognition programs'
      ]
    });
  }

  // Engagement recommendations
  if (engagementStats.average < 3.5) {
    recommendations.push({
      category: 'Engagement',
      priority: 'high',
      title: 'Boost Employee Engagement',
      description: `Average engagement score is ${engagementStats.average}/5, indicating room for improvement.`,
      actionItems: [
        'Conduct engagement focus groups to identify root causes',
        'Implement targeted engagement initiatives',
        'Review and adjust work environment factors'
      ]
    });
  }

  // Recognition recommendations
  if (recognitionStats.average < 3.5) {
    recommendations.push({
      category: 'Recognition',
      priority: 'high',
      title: 'Enhance Recognition Practices',
      description: `Average recognition score is ${recognitionStats.average}/5, suggesting insufficient recognition.`,
      actionItems: [
        'Train managers on effective recognition practices',
        'Implement peer-to-peer recognition system',
        'Align recognition with organizational values'
      ]
    });
  }

  // Cultural health recommendations
  if (culturalHealth.challenges.length > 0) {
    recommendations.push({
      category: 'Cultural Development',
      priority: 'medium',
      title: 'Develop Underrepresented Cultural Dimensions',
      description: `Low representation in: ${culturalHealth.challenges.join(', ')}`,
      actionItems: [
        'Design learning experiences targeting these cylinders',
        'Set goals aligned with these cultural dimensions',
        'Celebrate examples of these values in action'
      ]
    });
  }

  return recommendations;
}

// Helper: Analyze engagement score using Engagement Agent
async function analyzeEngagementScore(
  employeeId: string,
  tenantId: string,
  engagementScore: number,
  culturalAlignment: number
): Promise<{
  score: number;
  level: string;
  message: string;
  insights: string[];
  recommendations: string[];
  riskLevel: string;
}> {
  try {
    const engagementAgent = new EngagementAgent();

    // Build context for engagement analysis
    const context = {
      employeeId,
      tenantId,
      engagementScore,
      culturalAlignment,
      timestamp: new Date()
    };

    // Get AI-powered insights (we'll use it in future, for now use rule-based)
    // const analysis = await engagementAgent['runKnowledgeEngine'](context);

    // Determine risk level based on score and cultural alignment
    let riskLevel = 'low';
    if (engagementScore <= 2 || (engagementScore === 3 && culturalAlignment < 50)) {
      riskLevel = 'high';
    } else if (engagementScore === 3 || (engagementScore === 4 && culturalAlignment < 60)) {
      riskLevel = 'medium';
    }

    // Generate insights
    const insights = [];
    if (engagementScore <= 2) {
      insights.push('Critical: Low engagement indicates significant dissatisfaction or disengagement');
    }
    if (culturalAlignment < 50 && engagementScore <= 3) {
      insights.push('Cultural misalignment is likely contributing to low engagement');
    }
    if (engagementScore >= 4 && culturalAlignment >= 70) {
      insights.push('Strong cultural fit and high engagement - retention risk is low');
    }

    // Generate recommendations
    const recommendations = [];
    if (engagementScore <= 2) {
      recommendations.push('Schedule immediate 1-on-1 with manager to discuss concerns');
      recommendations.push('Consider role adjustment or career development opportunities');
    } else if (engagementScore === 3) {
      recommendations.push('Identify specific engagement drivers through focused conversation');
      recommendations.push('Provide growth opportunities aligned with personal values');
    } else if (engagementScore >= 4) {
      recommendations.push('Maintain current positive conditions');
      recommendations.push('Explore opportunities for increased responsibility or leadership');
    }

    return {
      score: engagementScore,
      level: engagementScore >= 4 ? 'High' : engagementScore >= 3 ? 'Moderate' : 'Low',
      message: `Your engagement score is ${engagementScore}/5${riskLevel === 'high' ? ' - immediate attention needed' : ''}`,
      insights,
      recommendations,
      riskLevel
    };
  } catch (error) {
    console.error('Error analyzing engagement:', error);

    // Fallback to basic analysis
    return {
      score: engagementScore,
      level: engagementScore >= 4 ? 'High' : engagementScore >= 3 ? 'Moderate' : 'Low',
      message: `Your engagement score is ${engagementScore}/5`,
      insights: [],
      recommendations: [],
      riskLevel: engagementScore <= 2 ? 'high' : engagementScore === 3 ? 'medium' : 'low'
    };
  }
}

// Helper: Analyze recognition score using Recognition Agent
async function analyzeRecognitionScore(
  employeeId: string,
  tenantId: string,
  recognitionScore: number,
  culturalAlignment: number
): Promise<{
  score: number;
  level: string;
  message: string;
  insights: string[];
  recommendations: string[];
  impactOnEngagement: string;
}> {
  try {
    const recognitionAgent = new RecognitionAgent();

    // Build context for recognition analysis
    const context = {
      employeeId,
      tenantId,
      recognitionScore,
      culturalAlignment,
      timestamp: new Date()
    };

    // Get AI-powered insights (we'll use it in future, for now use rule-based)
    // const analysis = await recognitionAgent['runKnowledgeEngine'](context);

    // Generate insights
    const insights = [];
    if (recognitionScore <= 2) {
      insights.push('Critical lack of recognition - major contributor to disengagement');
      insights.push('Under-recognized employees are 2x more likely to leave within 6 months');
    }
    if (recognitionScore === 3) {
      insights.push('Recognition is present but inconsistent or not meaningful enough');
    }
    if (recognitionScore >= 4) {
      insights.push('Strong recognition culture - contributes to positive engagement and retention');
    }

    // Generate recommendations based on score
    const recommendations = [];
    if (recognitionScore <= 2) {
      recommendations.push('Implement regular recognition program (weekly/bi-weekly)');
      recommendations.push('Train managers on specific, timely recognition practices');
      recommendations.push('Create peer-to-peer recognition channels');
    } else if (recognitionScore === 3) {
      recommendations.push('Increase frequency and specificity of recognition');
      recommendations.push('Align recognition with company values and behaviors');
      recommendations.push('Ensure recognition is both public and private');
    } else if (recognitionScore >= 4) {
      recommendations.push('Continue current recognition practices');
      recommendations.push('Share recognition as case studies with other teams');
    }

    // Determine impact on engagement
    let impactOnEngagement = 'positive';
    if (recognitionScore <= 2) {
      impactOnEngagement = 'severely negative';
    } else if (recognitionScore === 3) {
      impactOnEngagement = 'neutral to slightly negative';
    }

    return {
      score: recognitionScore,
      level: recognitionScore >= 4 ? 'High' : recognitionScore >= 3 ? 'Moderate' : 'Low',
      message: `Your recognition score is ${recognitionScore}/5`,
      insights,
      recommendations,
      impactOnEngagement
    };
  } catch (error) {
    console.error('Error analyzing recognition:', error);

    // Fallback to basic analysis
    return {
      score: recognitionScore,
      level: recognitionScore >= 4 ? 'High' : recognitionScore >= 3 ? 'Moderate' : 'Low',
      message: `Your recognition score is ${recognitionScore}/5`,
      insights: [],
      recommendations: [],
      impactOnEngagement: recognitionScore >= 4 ? 'positive' : recognitionScore >= 3 ? 'neutral' : 'negative'
    };
  }
}

// Helper: Create triggers for LXP and Performance based on culture gaps
async function createCultureTriggers(
  employeeId: string,
  tenantId: string,
  report: any,
  assessmentId: string
): Promise<void> {
  try {
    const triggersToCreate = [];

    // Trigger 1: LXP culture learning if alignment is low or gaps exist
    const alignmentScore = report.alignment?.personalVsCurrent || 0;
    const culturalFit = report.overallSummary?.culturalFit;

    if (alignmentScore < 70 || culturalFit === 'Needs Attention') {
      // Create LXP trigger for culture learning
      triggersToCreate.push({
        tenantId,
        name: `Culture Learning for Employee ${employeeId}`,
        description: `Employee needs culture learning experiences due to ${alignmentScore}% alignment`,
        type: 'event_based',
        sourceModule: 'culture',
        eventType: 'culture_learning_needed',
        conditions: {
          source: 'culture_assessment',
          assessmentId,
          alignmentScore,
          culturalFit,
          gaps: report.alignment?.gaps || []
        },
        targetModule: 'lxp',
        action: 'assign_culture_learning_path',
        actionConfig: {
          employeeId,
          gaps: report.alignment?.gaps || [],
          personalValues: report.personalValues?.selected || [],
          currentExperience: report.experienceGap?.current || [],
          desiredExperience: report.experienceGap?.desired || [],
          dominantCylinders: report.personalValues?.dominantCylinders || [],
          recommendations: report.alignment?.recommendations || []
        },
        isActive: true,
        priority: alignmentScore < 50 ? 9 : 7,
        triggerCount: 0,
        successCount: 0,
        failureCount: 0,
        metadata: { employeeId, assessmentId }
      });

      console.log(`[Culture Triggers] Created LXP culture learning trigger for employee ${employeeId}`);
    }

    // Trigger 2: Performance module for culture-shaping goals
    if (alignmentScore < 80 || culturalFit !== 'Strong') {
      triggersToCreate.push({
        tenantId,
        name: `Culture Goals for Employee ${employeeId}`,
        description: `Create culture-shaping goals for ${alignmentScore}% alignment`,
        type: 'event_based',
        sourceModule: 'culture',
        eventType: 'culture_goals_needed',
        conditions: {
          source: 'culture_assessment',
          assessmentId,
          alignmentScore,
          culturalFit,
          experienceGaps: report.experienceGap?.gaps || []
        },
        targetModule: 'performance',
        action: 'create_culture_goals',
        actionConfig: {
          employeeId,
          experienceGaps: report.experienceGap?.gaps || [],
          priorities: report.experienceGap?.priorities || [],
          desiredValues: report.experienceGap?.desired || [],
          recommendations: report.alignment?.recommendations || [],
          culturalOrientation: report.personalValues?.interpretation || ''
        },
        isActive: true,
        priority: alignmentScore < 60 ? 9 : 6,
        triggerCount: 0,
        successCount: 0,
        failureCount: 0,
        metadata: { employeeId, assessmentId }
      });

      console.log(`[Culture Triggers] Created Performance culture goals trigger for employee ${employeeId}`);
    }

    // Trigger 3: Engagement intervention if engagement is low
    const engagementScore = report.engagement?.score || 0;
    const engagementRiskLevel = report.engagement?.riskLevel;

    if (engagementScore <= 3 || engagementRiskLevel === 'high') {
      triggersToCreate.push({
        tenantId,
        name: `Engagement Intervention for Employee ${employeeId}`,
        description: `Schedule engagement intervention for ${engagementScore}/5 score`,
        type: 'event_based',
        sourceModule: 'culture',
        eventType: 'engagement_intervention_needed',
        conditions: {
          source: 'culture_assessment',
          assessmentId,
          engagementScore,
          riskLevel: engagementRiskLevel,
          culturalAlignment: alignmentScore
        },
        targetModule: 'performance',
        action: 'schedule_engagement_intervention',
        actionConfig: {
          employeeId,
          engagementScore,
          riskLevel: engagementRiskLevel,
          insights: report.engagement?.insights || [],
          recommendations: report.engagement?.recommendations || [],
          culturalAlignment: alignmentScore
        },
        isActive: true,
        priority: engagementRiskLevel === 'high' ? 10 : 7,
        triggerCount: 0,
        successCount: 0,
        failureCount: 0,
        metadata: { employeeId, assessmentId }
      });

      console.log(`[Culture Triggers] Created engagement intervention trigger for employee ${employeeId}`);
    }

    // Trigger 4: Recognition program if recognition is low
    const recognitionScore = report.recognition?.score || 0;

    if (recognitionScore <= 3) {
      triggersToCreate.push({
        tenantId,
        name: `Recognition Program for Employee ${employeeId}`,
        description: `Enhance recognition for ${recognitionScore}/5 score`,
        type: 'event_based',
        sourceModule: 'culture',
        eventType: 'recognition_program_needed',
        conditions: {
          source: 'culture_assessment',
          assessmentId,
          recognitionScore,
          impactOnEngagement: report.recognition?.impactOnEngagement
        },
        targetModule: 'performance',
        action: 'enhance_recognition',
        actionConfig: {
          employeeId,
          recognitionScore,
          insights: report.recognition?.insights || [],
          recommendations: report.recognition?.recommendations || [],
          managerNotification: true
        },
        isActive: true,
        priority: recognitionScore <= 2 ? 9 : 6,
        triggerCount: 0,
        successCount: 0,
        failureCount: 0,
        metadata: { employeeId, assessmentId }
      });

      console.log(`[Culture Triggers] Created recognition program trigger for employee ${employeeId}`);
    }

    // Insert all triggers
    if (triggersToCreate.length > 0) {
      await db.insert(triggers).values(triggersToCreate);
      console.log(`✅ Created ${triggersToCreate.length} culture-based triggers for employee ${employeeId}`);
    } else {
      console.log(`No triggers needed for employee ${employeeId} - strong cultural alignment and engagement`);
    }

  } catch (error) {
    console.error('Error creating culture triggers:', error);
    // Don't throw - allow report generation to succeed even if triggers fail
  }
}

export default router;
