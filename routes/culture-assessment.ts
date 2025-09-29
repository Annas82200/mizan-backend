// server/routes/culture-assessment.ts

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { 
  cultureAssessments, 
  cylinders, 
  cylinderValues,
  employees,
  companies 
} from '../db/schema';
import { CultureAgentV2 } from '../services/agents/base/three-engine-agent';
import { authenticate } from '../middleware/auth';
import { eq, and } from 'drizzle-orm';

const router = Router();

// Schema for culture assessment submission
const CultureAssessmentSchema = z.object({
  employeeId: z.string().uuid(),
  companyId: z.string().uuid(),
  tenantId: z.string().uuid(),
  personalValues: z.array(z.string()).length(10),
  currentExperienceValues: z.array(z.string()).length(10),
  desiredFutureValues: z.array(z.string()).length(10),
  engagementLevel: z.number().min(1).max(5),
  recognitionLevel: z.number().min(1).max(5)
});

/**
 * Get Mizan values for assessment
 */
router.get('/values/:tenantId', authenticate, async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    
    // Get all cylinders with their values
    const cylindersWithValues = await db.query.cylinders.findMany({
      where: eq(cylinders.tenantId, tenantId),
      with: {
        values: true
      },
      orderBy: (cylinders, { asc }) => [asc(cylinders.level)]
    });

    // Format for frontend
    const mizanValues = [];
    let valueId = 1;

    for (const cylinder of cylindersWithValues) {
      for (const value of cylinder.values) {
        mizanValues.push({
          id: valueId++,
          value: value.value,
          type: value.type,
          cylinder: cylinder.level,
          cylinderName: cylinder.name
        });
      }
    }

    res.json({
      success: true,
      values: mizanValues,
      cylinders: cylindersWithValues.map(c => ({
        level: c.level,
        name: c.name,
        definition: c.definition,
        ethicalPrinciple: c.ethicalPrinciple
      }))
    });

  } catch (error) {
    console.error('Error fetching Mizan values:', error);
    res.status(500).json({
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
    
    // Map values to cylinders
    const valueMapping = await mapValuesToCylinders(
      validatedData.tenantId,
      {
        personal: validatedData.personalValues,
        current: validatedData.currentExperienceValues,
        desired: validatedData.desiredFutureValues
      }
    );

    // Save assessment to database
    const assessment = await db.insert(cultureAssessments).values({
      ...validatedData,
      personalValuesCylinders: valueMapping.personal,
      currentCylinders: valueMapping.current,
      desiredCylinders: valueMapping.desired,
      completedAt: new Date(),
      ipAddress: req.ip,
      sessionId: req.sessionID
    }).returning();

    // Trigger immediate individual report generation
    generateEmployeeReport(assessment[0].id, validatedData.employeeId);

    // Check if we should trigger organizational analysis
    await checkAndTriggerOrgAnalysis(validatedData.companyId, validatedData.tenantId);

    res.json({
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
    
    res.status(500).json({
      success: false,
      error: 'Failed to submit assessment'
    });
  }
});

/**
 * Get assessment status for employee
 */
router.get('/status/:employeeId', authenticate, async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    
    const assessment = await db.query.cultureAssessments.findFirst({
      where: eq(cultureAssessments.employeeId, employeeId),
      orderBy: (assessments, { desc }) => [desc(assessments.completedAt)]
    });

    res.json({
      success: true,
      hasCompleted: !!assessment,
      completedAt: assessment?.completedAt,
      canRetake: !assessment || daysSince(assessment.completedAt) > 90
    });

  } catch (error) {
    console.error('Error checking assessment status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check status'
    });
  }
});

/**
 * Get employee culture report
 */
router.get('/report/employee/:employeeId', authenticate, async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    
    // Get latest assessment
    const assessment = await db.query.cultureAssessments.findFirst({
      where: eq(cultureAssessments.employeeId, employeeId),
      orderBy: (assessments, { desc }) => [desc(assessments.completedAt)]
    });

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: 'No assessment found'
      });
    }

    // Get or generate report
    const report = await getEmployeeReport(assessment.id, employeeId);

    res.json({
      success: true,
      report
    });

  } catch (error) {
    console.error('Error fetching employee report:', error);
    res.status(500).json({
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

    res.json({
      success: true,
      report
    });

  } catch (error) {
    console.error('Error fetching department report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch report'
    });
  }
});

/**
 * Helper Functions
 */

async function mapValuesToCylinders(
  tenantId: string,
  values: { personal: string[], current: string[], desired: string[] }
): Promise<any> {
  // Get cylinder mappings
  const cylinderData = await db.query.cylinders.findMany({
    where: eq(cylinders.tenantId, tenantId),
    with: { values: true }
  });

  const valueMap = new Map();
  cylinderData.forEach(cyl => {
    cyl.values.forEach(val => {
      valueMap.set(val.value, {
        cylinder: cyl.level,
        type: val.type
      });
    });
  });

  // Map each set of values
  const mapValueSet = (valueSet: string[]) => {
    const cylinderCounts = {};
    valueSet.forEach(value => {
      const mapping = valueMap.get(value);
      if (mapping) {
        const key = `cylinder${mapping.cylinder}`;
        if (!cylinderCounts[key]) {
          cylinderCounts[key] = { enabling: 0, limiting: 0 };
        }
        cylinderCounts[key][mapping.type]++;
      }
    });
    return cylinderCounts;
  };

  return {
    personal: mapValueSet(values.personal),
    current: mapValueSet(values.current),
    desired: mapValueSet(values.desired)
  };
}

async function generateEmployeeReport(assessmentId: string, employeeId: string) {
  // This runs async in background
  setTimeout(async () => {
    try {
      const agent = new CultureAgentV2(await getTenantId(employeeId));
      
      // Get assessment data
      const assessment = await db.query.cultureAssessments.findFirst({
        where: eq(cultureAssessments.id, assessmentId)
      });

      // Generate personalized insights
      const report = await agent.analyzeCulture({
        assessmentData: assessment,
        reportType: 'employee',
        employeeId
      });

      // Save report (implementation depends on your schema)
      console.log('Employee report generated:', report);
      
    } catch (error) {
      console.error('Error generating employee report:', error);
    }
  }, 0);
}

async function checkAndTriggerOrgAnalysis(companyId: string, tenantId: string) {
  // Count completed assessments
  const assessmentCount = await db
    .select({ count: db.count() })
    .from(cultureAssessments)
    .where(
      and(
        eq(cultureAssessments.companyId, companyId),
        eq(cultureAssessments.tenantId, tenantId)
      )
    );

  const totalEmployees = await db
    .select({ count: db.count() })
    .from(employees)
    .where(eq(employees.companyId, companyId));

  const completionRate = (assessmentCount[0].count / totalEmployees[0].count) * 100;

  // Trigger org analysis if threshold met (e.g., 70% completion)
  if (completionRate >= 70) {
    triggerOrganizationalAnalysis(companyId, tenantId);
  }
}

async function triggerOrganizationalAnalysis(companyId: string, tenantId: string) {
  // Run full organizational culture analysis
  setTimeout(async () => {
    try {
      const agent = new CultureAgentV2(tenantId);
      
      // Get all assessments
      const assessments = await db.query.cultureAssessments.findMany({
        where: and(
          eq(cultureAssessments.companyId, companyId),
          eq(cultureAssessments.tenantId, tenantId)
        )
      });

      // Get company strategy
      const company = await db.query.companies.findFirst({
        where: eq(companies.id, companyId),
        with: { strategy: true }
      });

      // Run comprehensive analysis
      const orgReport = await agent.analyzeCulture({
        companyId,
        tenantId,
        companyValues: company.values,
        strategy: company.strategy,
        employeeAssessments: assessments,
        reportType: 'organization'
      });

      // Save and notify
      console.log('Organizational culture analysis complete:', orgReport);
      
    } catch (error) {
      console.error('Error in organizational analysis:', error);
    }
  }, 0);
}

function daysSince(date: Date): number {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function hasManagerPermissions(user: any, departmentId: string): boolean {
  // Implementation depends on your auth system
  return user.role === 'manager' || user.role === 'admin' || user.departmentId === departmentId;
}

async function getTenantId(employeeId: string): Promise<string> {
  const employee = await db.query.employees.findFirst({
    where: eq(employees.id, employeeId)
  });
  return employee?.tenantId || '';
}

async function getEmployeeReport(assessmentId: string, employeeId: string): Promise<any> {
  // Check if report exists, otherwise generate
  // This is a placeholder - implement based on your report storage
  return {
    employeeId,
    assessmentId,
    insights: [],
    recommendations: []
  };
}

async function getDepartmentReport(
  departmentId: string,
  companyId: string,
  tenantId: string
): Promise<any> {
  // Aggregate department assessments and generate report
  // This is a placeholder - implement based on your needs
  return {
    departmentId,
    companyId,
    aggregateInsights: [],
    departmentHealth: {}
  };
}

export default router;
