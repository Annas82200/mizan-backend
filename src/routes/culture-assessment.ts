// backend/src/routes/culture-assessment.ts

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/connection';
import {
  cultureAssessments,
  cultureReports,
  cultureSurveyInvitations,
  users,
  tenants,
  triggers
} from '../db/schema';
import { CultureAgentV2 as CultureAgent } from '../services/agents/culture/culture-agent';
import { EngagementAgent } from '../services/agents/engagement/engagement-agent';
import { RecognitionAgent } from '../services/agents/recognition/recognition-agent';
import { authenticate, authorize } from '../middleware/auth';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

// Type definitions for culture assessment
interface CylinderValue {
  value: string;
  type: 'enabling' | 'limiting';
  cylinder: number;
  cylinderName: string;
}

interface Cylinder {
  level?: number;
  name: string;
  definition: string;
  ethical_principle?: string;
  ethicalPrinciple?: string;  // Support both naming conventions
  enabling_values?: string[];
  limiting_values?: string[];
  enablingValues?: string[];  // Support camelCase
  limitingValues?: string[];  // Support camelCase
}

interface CylinderResponse {
  level: number;
  name: string;
  definition: string;
  ethicalPrinciple: string;
}

interface CultureAssessment {
  id: string;
  tenantId: string;
  userId: string;
  employeeName?: string;
  employeeEmail?: string;
  status: string;
  personalValues?: string[];
  currentExperienceValues?: string[];
  desiredFutureValues?: string[];
  engagementLevel?: number;
  recognitionLevel?: number;
  engagement?: number | null;  // Added for compatibility
  recognition?: number | null;  // Added for compatibility
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user?: {  // Added for user details
    id: string;
    email: string;
    name?: string;
  };
}

interface CultureReport {
  id: string;
  tenantId: string;
  assessmentId?: string;
  reportType: string;
  reportData: EmployeeReportData | CompanyReportData | DepartmentReportData | DepartmentReportData[];
  createdAt: Date;
  updatedAt: Date;
}

interface EmployeeReportData {
  userId?: string;  // Added for compatibility
  employeeId: string;
  employeeName: string;
  assessmentDate: Date | null;
  personalValues: {
    selected: string[];
    cylinderScores: Record<number, number>;
    interpretation: string;
    strengths: string[];
    gaps: string[];
  };
  visionForGrowth: {
    selected: string[];
    meaning: string;
    opportunities: string[];
  };
  cultureAlignment: {
    score: number;
    interpretation: string;
    strengths: string[];
    gaps: string[];
    recommendations: string[];
  };
  recommendations: string[];
  engagement: {
    score: number;
    interpretation: string;
    factors: string[];
    drivers: string[];
    barriers: string[];
    recommendations: string[];
  };
  recognition: {
    score: number;
    interpretation: string;
    patterns: string[];
    needs: string[];
    recommendations: string[];
  };
  overallSummary: {
    keyStrengths: string[];
    growthGaps: string[];
    nextSteps: string[];
  };
}

interface CompanyReportData {
  overallHealth: number;
  cylinderDistribution: Record<number, number>;
  recommendations: string[];
  insights: string[];
}

interface DepartmentReportData {
  departmentId?: string;
  departmentName?: string;
  employeeCount?: number;
  engagement?: number | {
    average: number;
    median: number;
    distribution: Record<number, number>;
    trend: string;
  };
  recognition?: number | {
    average: number;
    median: number;
    distribution: Record<number, number>;
    trend: string;
  };
  status?: string;
  reportType?: string;
  targetId?: string;
  generatedAt?: Date;
  participationRate?: number;
  tenantValues?: {
    values: string[];
    mappings: Array<{ value: string; cylinder: number }>;
    analysis: string;
    dominantCylinders: Array<{ cylinder: number; name: string; count: number }>;
    culturalOrientation: string;
  };
  employeeExperience?: {
    current: {
      topValues: Array<{ value: string; count: number }>;
      analysis: string;
      alignment: number;
      gaps: string[];
    };
    desired: {
      topValues: Array<{ value: string; count: number }>;
      analysis: string;
      alignment: number;
      aspirationalGaps: string[];
    };
  };
  culturalHealth?: {
    overallScore: number;
    status: string;
    strengths: string[];
    challenges: string[];
    cylinderDistribution: Record<number, number>;
  };
  departmentalBreakdown?: DepartmentReportData[];
  recommendations?: string[];
  nextSteps?: string[];
}

interface UserWithPermissions {
  id: string;
  email: string;
  role: string;
  tenantId: string;
  departmentId?: string;
  permissions?: string[];
}

interface AggregatedAssessmentData {
  totalEmployees: number;
  completedAssessments: number;
  averageEngagement: number;
  averageRecognition: number;
  personalValuesDistribution: Record<string, number>;
  currentValuesDistribution: Record<string, number>;
  desiredValuesDistribution: Record<string, number>;
  alignmentScore: number;
  personalValues: Array<{ value: string; count: number }>;
  currentExperience: Array<{ value: string; count: number }>;
  desiredExperience: Array<{ value: string; count: number }>;
  cylinderDistribution?: Record<number, number>;
}

interface CulturalHealthMetrics {
  overallHealth: number;
  overallScore?: number;  // Alternative property name
  strengthAreas: string[];
  strengths?: string[];  // Alternative property name
  improvementAreas: string[];
  challenges?: string[];  // Alternative property name
  status?: string;
  cylinderDistribution?: { [key: number]: number };
  trends: Array<{
    metric: string;
    trend: 'improving' | 'declining' | 'stable';
    value: number;
  }>;
}

const router = Router();

// Tenant validation middleware
const validateTenantAccess = async (req: Request, res: Response, next: Function) => {
  try {
    if (!req.user?.tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Tenant context required'
      });
    }

    // For superadmin, allow tenant override
    const requestedTenantId = req.query.tenantId as string || req.body.tenantId as string;
    
    if (req.user.role === 'superadmin' && requestedTenantId) {
      // Validate that the requested tenant exists
      const tenant = await db.select()
        .from(tenants)
        .where(eq(tenants.id, requestedTenantId))
        .limit(1);
        
      if (tenant.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Requested tenant not found'
        });
      }
      
      req.user.tenantId = requestedTenantId;
    }

    next();
  } catch (error) {
    console.error('Tenant validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to validate tenant access'
    });
  }
};

// Helper function to get default agent configuration
const getDefaultAgentConfig = () => ({
  knowledge: {
    providers: ['anthropic'] as string[],
    model: 'claude-3-opus-20240229',
    temperature: 0.7,
    maxTokens: 4000
  },
  data: {
    providers: ['anthropic'] as string[],
    model: 'claude-3-opus-20240229',
    temperature: 0.3,
    maxTokens: 4000
  },
  reasoning: {
    providers: ['anthropic'] as string[],
    model: 'claude-3-opus-20240229',
    temperature: 0.5,
    maxTokens: 4000
  },
  consensusThreshold: 0.7
});

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
router.get('/values/:tenantId', authenticate, validateTenantAccess, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    // Validate tenant access
    const tenant = await db.select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (tenant.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found'
      });
    }

    // Get the Mizan 7 Cylinders framework directly
    const cylinders: Cylinder[] = [
      {
        name: 'Safety & Survival',
        definition: 'Protecting life and dignity by ensuring health, stability, and freedom from harm. Organizations grounded here safeguard people\'s wellbeing before all else.',
        ethical_principle: 'Preservation of Life',
        enabling_values: ['Safety', 'Stability', 'Preparedness', 'Wellbeing'],
        limiting_values: ['Fear', 'Neglect', 'Instability', 'Complacency']
      },
      {
        name: 'Belonging & Loyalty',
        definition: 'Fostering genuine connection, trust, and shared identity within teams and communities.',
        ethical_principle: 'Human Dignity',
        enabling_values: ['Inclusion', 'Trust', 'Collaboration', 'Compassion'],
        limiting_values: ['Cliquishness', 'Bias', 'Distrust', 'Favoritism']
      },
      {
        name: 'Growth & Achievement',
        definition: 'Encouraging learning, mastery, and performance that honor both excellence and humility.',
        ethical_principle: 'Striving with Excellence',
        enabling_values: ['Discipline', 'Learning', 'Ambition', 'Accountability'],
        limiting_values: ['Ego', 'Burnout', 'Competition', 'Arrogance']
      },
      {
        name: 'Meaning & Contribution',
        definition: 'Connecting personal and collective work to purpose and long-term impact.',
        ethical_principle: 'Service',
        enabling_values: ['Purpose', 'Stewardship', 'Empowerment', 'Recognition'],
        limiting_values: ['Apathy', 'Self-interest', 'Cynicism', 'Disconnection']
      },
      {
        name: 'Integrity & Justice',
        definition: 'Upholding truth, fairness, and ethical responsibility as the foundation of trust.',
        ethical_principle: 'Justice and Accountability',
        enabling_values: ['Integrity', 'Fairness', 'Transparency', 'Courage'],
        limiting_values: ['Deception', 'Injustice', 'Blame', 'Corruption']
      },
      {
        name: 'Wisdom & Compassion',
        definition: 'Integrating intellect and empathy to lead with understanding and balance.',
        ethical_principle: 'Mercy and Knowledge',
        enabling_values: ['Humility', 'Empathy', 'Discernment', 'Patience'],
        limiting_values: ['Pride', 'Indifference', 'Impulsiveness', 'Judgmentalism']
      },
      {
        name: 'Transcendence & Unity',
        definition: 'Achieving harmony between self, others, and the greater purpose of existence.',
        ethical_principle: 'Unity of Being',
        enabling_values: ['Alignment', 'Gratitude', 'Purposeful Reflection', 'Harmony'],
        limiting_values: ['Division', 'Materialism', 'Alienation', 'Despair']
      }
    ];

    const values = cylinders.flatMap((cylinder: Cylinder, index: number) => {
      const enablingValues = (cylinder.enabling_values || []).map((value: string) => ({
        value,
        type: 'enabling' as const,
        cylinder: index + 1,
        cylinderName: cylinder.name
      }));
      const limitingValues = (cylinder.limiting_values || []).map((value: string) => ({
        value,
        type: 'limiting' as const,
        cylinder: index + 1,
        cylinderName: cylinder.name
      }));
      return [...enablingValues, ...limitingValues];
    });

    return res.json({
      success: true,
      values,
      cylinders: cylinders.map((c: Cylinder, index: number) => ({
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
router.post('/distribute', authenticate, authorize(['clientAdmin', 'superadmin']), validateTenantAccess,
  async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      campaignName: z.string().optional(),
      expiryDays: z.number().default(30),
      tenantId: z.string().optional()
    });

    const { campaignName, expiryDays } = schema.parse(req.body);
    const tenantId = req.user!.tenantId;

    console.log('[Culture Survey] Distributing for tenantId:', tenantId);
    console.log('[Culture Survey] Requested by user:', req.user!.email, 'role:', req.user!.role);

    // Get all active employees from tenant (tenant isolation)
    const employees = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role
    })
    .from(users)
    .where(and(
      eq(users.tenantId, tenantId),
      eq(users.isActive, true)
    ));

    console.log('[Culture Survey] Found employees:', employees.length);
    if (employees.length > 0) {
      console.log('[Culture Survey] Sample employee:', employees[0]);
    }

    if (employees.length === 0) {
      // Check if any users exist for this tenant at all
      const allUsers = await db.select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive
      })
      .from(users)
      .where(eq(users.tenantId, tenantId));

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
    }

    // Update all invitations to 'sent' status
    await db.update(cultureSurveyInvitations)
      .set({
        status: 'sent',
        sentAt: new Date()
      })
      .where(and(
        eq(cultureSurveyInvitations.campaignId, campaignId),
        eq(cultureSurveyInvitations.tenantId, tenantId)
      ));

    console.log(`Successfully distributed culture survey to ${invitations.length} employees`);

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
router.get('/employees', authenticate, validateTenantAccess, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    // Get all employees for tenant (tenant isolation)
    const allEmployees = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      title: users.title
    })
    .from(users)
    .where(and(
      eq(users.tenantId, tenantId),
      eq(users.role, 'employee'),
      eq(users.isActive, true)
    ));

    // Get survey completion status
    const employeesWithStatus = await Promise.all(
      allEmployees.map(async (emp) => {
        const assessment = await db.select()
          .from(cultureAssessments)
          .where(and(
            eq(cultureAssessments.userId, emp.id),
            eq(cultureAssessments.tenantId, tenantId)
          ))
          .orderBy(desc(cultureAssessments.completedAt))
          .limit(1);

        return {
          id: emp.id,
          name: emp.name,
          email: emp.email,
          department: emp.title || 'Unassigned',
          role: emp.title,
          hasCompletedSurvey: assessment.length > 0
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
router.get('/campaign/:campaignId/status', authenticate, authorize(['clientAdmin', 'superadmin']), validateTenantAccess,
  async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const tenantId = req.user!.tenantId;

    const invitations = await db.select()
      .from(cultureSurveyInvitations)
      .where(and(
        eq(cultureSurveyInvitations.campaignId, campaignId),
        eq(cultureSurveyInvitations.tenantId, tenantId)
      ));

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
    const invitation = await db.select()
      .from(cultureSurveyInvitations)
      .where(eq(cultureSurveyInvitations.surveyToken, validatedData.surveyToken))
      .limit(1);

    if (invitation.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invalid survey token'
      });
    }

    const invitationData = invitation[0];

    // Check if already completed
    if (invitationData.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Survey already completed'
      });
    }

    // Check if expired
    if (invitationData.expiresAt && new Date(invitationData.expiresAt) < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Survey link has expired'
      });
    }

    // Save assessment to database
    const assessment = await db.insert(cultureAssessments).values({
      tenantId: invitationData.tenantId,
      userId: invitationData.employeeId,
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
    generateEmployeeReport(assessment[0].id, invitationData.employeeId, invitationData.tenantId);

    // Delete cached company-level reports to force regeneration with new data
    await db.delete(cultureReports)
      .where(and(
        eq(cultureReports.tenantId, invitationData.tenantId),
        eq(cultureReports.reportType, 'company')
      ));

    console.log(`Deleted company reports for tenant ${invitationData.tenantId} to trigger regeneration`);

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
router.post('/map-values', authenticate, authorize(['clientAdmin', 'superadmin']), validateTenantAccess,
  async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      values: z.array(z.string()).min(1).max(20)
    });

    const { values } = schema.parse(req.body);
    const tenantId = req.user!.tenantId;

    // Get tenant info to fetch existing values if needed (tenant isolation)
    const tenant = await db.select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (tenant.length === 0) {
      return res.status(404).json({
        error: 'Tenant not found'
      });
    }

    // Use Culture Agent to map values
    const cultureAgent = new CultureAgent('culture', getDefaultAgentConfig());
    const mapping = await cultureAgent.mapTenantValuesToCylinders(values);

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
router.get('/status/:userId', authenticate, validateTenantAccess, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const tenantId = req.user!.tenantId;

    // Verify user belongs to tenant
    const user = await db.select()
      .from(users)
      .where(and(
        eq(users.id, userId),
        eq(users.tenantId, tenantId)
      ))
      .limit(1);

    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const assessment = await db.select()
      .from(cultureAssessments)
      .where(and(
        eq(cultureAssessments.userId, userId),
        eq(cultureAssessments.tenantId, tenantId)
      ))
      .orderBy(desc(cultureAssessments.completedAt))
      .limit(1);

    return res.json({
      success: true,
      hasCompleted: assessment.length > 0,
      completedAt: assessment.length > 0 ? assessment[0].completedAt : null,
      canRetake: assessment.length === 0 || (assessment[0].completedAt && daysSince(assessment[0].completedAt) > 90)
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
    const invitation = await db.select()
      .from(cultureSurveyInvitations)
      .where(eq(cultureSurveyInvitations.surveyToken, surveyToken))
      .limit(1);

    if (invitation.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invalid survey token'
      });
    }

    const invitationData = invitation[0];

    // Get the assessment for this employee (tenant isolation through invitation)
    const assessment = await db.select()
      .from(cultureAssessments)
      .where(and(
        eq(cultureAssessments.userId, invitationData.employeeId),
        eq(cultureAssessments.tenantId, invitationData.tenantId)
      ))
      .orderBy(desc(cultureAssessments.completedAt))
      .limit(1);

    if (assessment.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No assessment found.'
      });
    }

    return res.json({
      success: true,
      assessment: assessment[0]
    });
  } catch (error) {
    console.error('Error fetching assessment:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch assessment'
    });
  }
});

export default router;