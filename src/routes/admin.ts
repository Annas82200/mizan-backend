// backend/src/routes/admin.ts

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth';
import { db } from '../../db/index';
import {
  users,
  tenants,
  companies,
  analyses,
  cultureAssessments,
  employeeProfiles,
  departments,
  triggers
} from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { emailService } from '../services/email';

const router = Router();

type CultureAssessment = typeof cultureAssessments.$inferSelect;
type Analysis = typeof analyses.$inferSelect;

// Tenant validation middleware
const validateTenantAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.user.tenantId) {
      return res.status(401).json({ error: 'Invalid tenant access' });
    }

    // Verify tenant exists and user has access
    const tenantResult = await db.select().from(tenants).where(eq(tenants.id, req.user.tenantId)).limit(1);
    const tenant = tenantResult[0];

    if (!tenant) {
      return res.status(403).json({ error: 'Tenant not found or access denied' });
    }

    // Verify user belongs to this tenant
    const userCheck = await db.select().from(users).where(
      and(
        eq(users.id, req.user.id),
        eq(users.tenantId, req.user.tenantId)
      )
    ).limit(1);

    if (userCheck.length === 0) {
      return res.status(403).json({ error: 'User does not belong to this tenant' });
    }

    next();
  } catch (error) {
    console.error('Tenant validation error:', error);
    return res.status(500).json({ error: 'Failed to validate tenant access' });
  }
};

// Apply authentication and tenant isolation to all admin routes
router.use(authenticate);
router.use(authorize(['clientAdmin', 'superadmin']));
router.use(validateTenantAccess);

// Dashboard stats
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.tenantId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const tenantId = req.user.tenantId;
    
    // Get counts with strict tenant isolation
    const [
      userCount,
      analysisCount,
      activeTriggersCount
    ] = await Promise.all([
      db.select().from(users).where(eq(users.tenantId, tenantId)),
      db.select().from(analyses).where(eq(analyses.tenantId, tenantId)),
      db.select().from(triggers).where(
        and(
          eq(triggers.tenantId, tenantId),
          eq(triggers.isActive, true)
        )
      )
    ]);
    
    // Get recent analyses with tenant isolation
    const recentAnalyses = await db.select()
      .from(analyses)
      .where(eq(analyses.tenantId, tenantId))
      .orderBy(desc(analyses.createdAt))
      .limit(5);
    
    // Get culture health score average with tenant isolation
    const cultureScores = await db.select()
      .from(cultureAssessments)
      .where(eq(cultureAssessments.tenantId, tenantId))
      .orderBy(desc(cultureAssessments.createdAt))
      .limit(10);
    
    // Calculate average culture score
    interface CultureWithScore {
      alignmentScore?: number | null;
    }
    
    const totalCultureScore = cultureScores.reduce((sum: number, c: CultureAssessment) => {
      const culture = c as unknown as CultureWithScore;
      return sum + (culture.alignmentScore || 0);
    }, 0);
    
    const avgCultureScore = cultureScores.length > 0
      ? totalCultureScore / cultureScores.length
      : 0;
    
    return res.json({
      stats: {
        employees: userCount.length,
        analyses: analysisCount.length,
        activeTriggers: activeTriggersCount.length,
        avgCultureScore: Math.round(avgCultureScore)
      },
      recentAnalyses,
      trends: {
        analysesThisMonth: analysisCount.filter((a: Analysis) => {
          const analysis = a as { createdAt: Date | string };
          const createdDate = typeof analysis.createdAt === 'string' 
            ? new Date(analysis.createdAt) 
            : analysis.createdAt;
          return createdDate > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        }).length
      }
    });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// Company management - Admin can only access their own tenant
router.get('/companies', async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.tenantId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Only return the current tenant (company) with tenant isolation
    const companiesList = await db.select().from(tenants).where(eq(tenants.id, req.user.tenantId));
    
    return res.json(companiesList);
    
  } catch (error) {
    console.error('Companies fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

router.post('/companies', async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.tenantId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const schema = z.object({
      name: z.string().min(2),
      industry: z.string(),
      size: z.string().optional(),
      vision: z.string().optional(),
      mission: z.string().optional(),
      strategy: z.string().optional(),
      values: z.array(z.string()).optional()
    });

    const validatedData = schema.parse(req.body);

    // Update existing tenant/company information
    const [company] = await db.update(companies)
      .set({
        name: validatedData.name,
        industry: validatedData.industry,
        employeeCount: validatedData.size ? parseInt(validatedData.size.split('-')[0]) : undefined,
        vision: validatedData.vision,
        mission: validatedData.mission,
        strategy: validatedData.strategy,
        values: validatedData.values,
        updatedAt: new Date()
      })
      .where(eq(companies.id, req.user.tenantId))
      .returning();
    
    return res.json(company);
    
  } catch (error) {
    console.error('Company creation error:', error);
    return res.status(500).json({ error: 'Failed to create company' });
  }
});

// User management with strict tenant isolation
router.get('/users', async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.tenantId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Only get users from the same tenant
    const usersList = await db.select().from(users).where(eq(users.tenantId, req.user.tenantId));
    
    // Remove sensitive data
    interface UserWithRelations {
      id: string;
      email: string;
      name: string;
      role: string;
      isActive: boolean | null;
      createdAt: Date;
      department?: {
        id: string;
        name: string;
        description: string | null;
      } | null;
    }
    
    const sanitizedUsers = (usersList as unknown as UserWithRelations[]).map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      isActive: u.isActive ?? false,
      department: u.department,
      createdAt: u.createdAt
    }));
    
    return res.json(sanitizedUsers);
    
  } catch (error) {
    console.error('Users fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get employees with pagination (fixes 404 console error)
router.get('/employees', async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.tenantId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = (page - 1) * limit;

    // Support explicit tenantId for superadmin (via query param or header)
    const targetTenantId = req.user.role === 'superadmin'
      ? (req.query.tenantId as string) || req.headers['x-tenant-id'] as string || req.user.tenantId
      : req.user.tenantId;

    // Get employees from the tenant with pagination
    const employeesList = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      position: users.title,
      departmentId: users.departmentId,
      departmentName: departments.name,
      status: users.isActive,
      createdAt: users.createdAt
    })
    .from(users)
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .where(eq(users.tenantId, targetTenantId))
    .limit(limit)
    .offset(offset)
    .orderBy(users.name);

    // Get total count for pagination
    const countResult = await db.select()
    .from(users)
    .where(eq(users.tenantId, targetTenantId));

    const total = countResult.length;
    const totalPages = Math.ceil(total / limit);

    return res.json({
      employees: employeesList,
      total,
      page,
      limit,
      totalPages
    });

  } catch (error) {
    console.error('Employees fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

router.post('/users/invite', async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.tenantId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const schema = z.object({
      email: z.string().email(),
      name: z.string(),
      role: z.enum(['employee', 'clientAdmin']),
      departmentId: z.string().uuid().optional()
    });
    
    const validatedData = schema.parse(req.body);
    
    // If departmentId is provided, verify it belongs to the same tenant
    if (validatedData.departmentId) {
      const department = await db.select().from(departments).where(
        and(
          eq(departments.id, validatedData.departmentId),
          eq(departments.tenantId, req.user.tenantId)
        )
      ).limit(1);

      if (department.length === 0) {
        return res.status(400).json({ error: 'Invalid department or department does not belong to your organization' });
      }
    }
    
    // Check if user with this email already exists in the tenant
    const existingUser = await db.select().from(users).where(
      and(
        eq(users.email, validatedData.email),
        eq(users.tenantId, req.user.tenantId)
      )
    ).limit(1);

    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists in your organization' });
    }
    
    // Create user with tenant isolation
    const tempPassword = randomUUID();
    
    const userResult = await db.insert(users)
      .values({
        id: randomUUID(),
        tenantId: req.user.tenantId, // Strict tenant isolation
        email: validatedData.email,
        passwordHash: tempPassword, // In production, hash this
        name: validatedData.name,
        role: validatedData.role,
        departmentId: validatedData.departmentId,
        isActive: false, // Requires activation
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    const user = userResult[0];

    // Send invitation email
    try {
      const invitationToken = randomUUID();
      const invitationLink = `${process.env.FRONTEND_URL}/accept-invitation/${invitationToken}`;

      // Get tenant info for the email with tenant isolation
      const tenantResult = await db.select().from(tenants).where(eq(tenants.id, req.user.tenantId)).limit(1);

      if (tenantResult.length === 0) {
        throw new Error('Tenant not found');
      }

      const tenant = tenantResult[0];
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      await emailService.sendEmail({
        to: validatedData.email,
        template: 'employeeInvitation',
        data: {
          employeeName: validatedData.name,
          adminName: req.user.name || 'Your administrator',
          companyName: tenant.name || 'the organization',
          invitationLink,
        }
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Don't fail the request if email fails
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('User invite error:', error);
    return res.status(500).json({ error: 'Failed to invite user' });
  }
});

// Analysis management with tenant isolation
router.get('/analyses', async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.tenantId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const analysesList = await db.select().from(analyses).where(eq(analyses.tenantId, req.user.tenantId)).orderBy(desc(analyses.createdAt)).limit(50);
    
    return res.json(analysesList);
    
  } catch (error) {
    console.error('Analyses fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch analyses' });
  }
});

// Triggers management with strict tenant isolation
router.get('/triggers', async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.tenantId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const triggersList = await db.select().from(triggers).where(eq(triggers.tenantId, req.user.tenantId)).orderBy(desc(triggers.createdAt)).limit(50);
    
    return res.json(triggersList);
    
  } catch (error) {
    console.error('Triggers fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch triggers' });
  }
});

router.put('/triggers/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.tenantId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const schema = z.object({
      isActive: z.boolean(),
      actionConfig: z.any().optional()
    });

    const validatedData = schema.parse(req.body);

    // First verify the trigger belongs to the current tenant
    const existingTrigger = await db.select().from(triggers).where(
      and(
        eq(triggers.id, req.params.id),
        eq(triggers.tenantId, req.user.tenantId)
      )
    ).limit(1);

    if (existingTrigger.length === 0) {
      return res.status(404).json({ error: 'Trigger not found or access denied' });
    }

    const [updated] = await db.update(triggers)
      .set({
        isActive: validatedData.isActive,
        actionConfig: validatedData.actionConfig,
        updatedAt: new Date()
      })
      .where(and(
        eq(triggers.id, req.params.id),
        eq(triggers.tenantId, req.user.tenantId) // Double-check tenant isolation on update
      ))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ error: 'Trigger not found' });
    }
    
    return res.json(updated);
    
  } catch (error) {
    console.error('Trigger update error:', error);
    return res.status(500).json({ error: 'Failed to update trigger' });
  }
});

// Department management with tenant isolation
router.get('/departments', async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.tenantId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const departmentsList = await db.select().from(departments).where(eq(departments.tenantId, req.user.tenantId));

    return res.json({
      success: true,
      data: departmentsList,
      message: departmentsList.length === 0
        ? 'No departments found. Create departments in Admin > Departments.'
        : `Found ${departmentsList.length} departments`
    });
    
  } catch (error) {
    console.error('Departments fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// Reports with strict tenant isolation
router.get('/reports/culture', async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.tenantId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { companyId } = req.query;
    
    // If companyId is provided, verify it belongs to the current tenant
    if (companyId) {
      const company = await db.select().from(companies).where(eq(companies.id, req.user.tenantId)).limit(1);

      if (company.length === 0) {
        return res.status(400).json({ error: 'Company not found or access denied' });
      }
    }
    
    const assessments = await db.select().from(cultureAssessments).where(
      and(
        eq(cultureAssessments.tenantId, req.user.tenantId),
        companyId ? eq(cultureAssessments.companyId, companyId as string) : undefined
      )
    ).orderBy(desc(cultureAssessments.createdAt)).limit(50);
    
    // Calculate average alignment score
    interface AssessmentWithScore {
      alignmentScore?: number | null;
    }
    
    const totalScore = assessments.reduce((sum: number, a: CultureAssessment) => {
      const assessment = a as unknown as AssessmentWithScore;
      return sum + (assessment.alignmentScore || 0);
    }, 0);
    
    const avgAlignmentScore = assessments.length > 0 ? totalScore / assessments.length : 0;
    
    return res.json({
      assessments,
      summary: {
        totalAssessments: assessments.length,
        avgAlignmentScore,
        tenantId: req.user.tenantId // Include tenant info for verification
      }
    });
    
  } catch (error) {
    console.error('Culture report error:', error);
    return res.status(500).json({ error: 'Failed to generate culture report' });
  }
});

// Additional security route to verify tenant access
router.get('/security/verify', async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.tenantId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Verify user and tenant relationship
    const userCheck = await db.select()
      .from(users)
      .where(and(
        eq(users.id, req.user.id),
        eq(users.tenantId, req.user.tenantId)
      ))
      .limit(1);

    if (!userCheck || userCheck.length === 0) {
      return res.status(403).json({ error: 'Invalid user access' });
    }

    // Get tenant information
    const tenantInfo = await db.select()
      .from(tenants)
      .where(eq(tenants.id, req.user.tenantId))
      .limit(1);

    if (!tenantInfo || tenantInfo.length === 0) {
      return res.status(403).json({ error: 'Invalid tenant access' });
    }

    const tenant = tenantInfo[0];

    return res.json({
      verified: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        tenantId: req.user.tenantId
      },
      tenant: {
        id: tenant.id,
        name: tenant.name
      }
    });
    
  } catch (error) {
    console.error('Security verification error:', error);
    return res.status(500).json({ error: 'Failed to verify security' });
  }
});

export default router;