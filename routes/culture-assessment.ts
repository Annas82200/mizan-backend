// server/routes/culture-assessment.ts

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/index.js';
import {
  cultureAssessments,
  cultureReports,
  users,
  tenants
} from '../db/schema.js';
import { CultureAgent } from '../services/agents/culture-agent.js';
import { authenticate } from '../middleware/auth.js';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

const router = Router();

// Schema for culture assessment submission
const CultureAssessmentSchema = z.object({
  personalValues: z.array(z.string()).length(10),
  currentExperienceValues: z.array(z.string()).length(10),
  desiredFutureValues: z.array(z.string()).length(10),
  engagementLevel: z.number().min(1).max(10),
  recognitionLevel: z.number().min(1).max(10)
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
 * Submit culture assessment
 */
router.post('/submit', authenticate, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = CultureAssessmentSchema.parse(req.body);

    // Save assessment to database (match actual schema)
    const assessment = await db.insert(cultureAssessments).values({
      tenantId: req.user!.tenantId,
      userId: req.user!.id,
      personalValues: validatedData.personalValues,
      currentExperience: validatedData.currentExperienceValues,
      desiredExperience: validatedData.desiredFutureValues,
      engagement: validatedData.engagementLevel,
      recognition: validatedData.recognitionLevel
    }).returning();

    // Trigger immediate individual report generation (async background)
    generateEmployeeReport(assessment[0].id, req.user!.id, req.user!.tenantId);

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
 * Get employee culture report
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
 * Helper Functions
 */

async function generateEmployeeReport(assessmentId: string, userId: string, tenantId: string) {
  setTimeout(async () => {
    try {
      const agent = new CultureAgent();

      const assessment = await db.query.cultureAssessments.findFirst({
        where: eq(cultureAssessments.id, assessmentId)
      });

      if (!assessment) return;

      const report = await agent.analyzeCompanyCulture({
        tenantId,
        targetType: 'individual',
        targetId: userId,
        assessmentIds: [assessmentId]
      });

      await db.insert(cultureReports).values({
        id: randomUUID(),
        tenantId,
        analysisId: assessmentId,
        reportType: 'employee',
        reportData: report,
        createdAt: new Date()
      });

      console.log('Employee report generated and saved:', assessmentId);

    } catch (error: any) {
      console.error('Error generating employee report:', error);
    }
  }, 0);
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
  const assessments = await db.query.cultureAssessments.findMany({
    where: eq(cultureAssessments.tenantId, tenantId),
    with: {
      user: true
    }
  });

  if (assessments.length === 0) {
    throw new Error('No culture assessments found for this department');
  }

  const assessmentIds = assessments.map(a => a.id);

  const agent = new CultureAgent();
  const report = await agent.analyzeCompanyCulture({
    tenantId,
    targetType: 'department',
    targetId: departmentId,
    assessmentIds
  });

  await db.insert(cultureReports).values({
    id: randomUUID(),
    tenantId,
    analysisId: departmentId,
    reportType: 'department',
    reportData: report,
    createdAt: new Date()
  });

  return report;
}

export default router;
