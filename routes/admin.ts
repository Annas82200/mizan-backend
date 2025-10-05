// server/routes/admin.ts

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { db } from '../db/index.js';
import {
  users,
  tenants,
  companies,
  analyses,
  cultureAssessments,
  employeeProfiles,
  departments,
  triggers
} from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

const router = Router();

// Apply authentication to all admin routes
router.use(authenticate);
router.use(authorize(['clientAdmin', 'superadmin']));

// Dashboard stats
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
      return;
    }
    const tenantId = req.user.tenantId;
    
    // Get counts
    const [
      userCount,
      analysisCount,
      activeTriggersCount
    ] = await Promise.all([
      db.query.users.findMany({ where: eq(users.tenantId, tenantId) }),
      db.query.analyses.findMany({ where: eq(analyses.tenantId, tenantId) }),
      db.query.triggers.findMany({
        where: and(
          eq(triggers.tenantId, tenantId),
          eq(triggers.isActive, true)
        )
      })
    ]);
    
    // Get recent analyses
    const recentAnalyses = await db.query.analyses.findMany({
      where: eq(analyses.tenantId, tenantId),
      orderBy: [desc(analyses.createdAt)],
      limit: 5
    });
    
    // Get culture health score average
    const cultureScores = await db.query.cultureAssessments.findMany({
      where: eq(cultureAssessments.tenantId, tenantId),
      orderBy: [desc(cultureAssessments.createdAt)],
      limit: 10
    });
    
    const avgCultureScore = cultureScores.length > 0
      ? cultureScores.reduce((sum: number, c: any) => sum + (c.alignmentScore || 0), 0) / cultureScores.length
      : 0;
    
    res.json({
      stats: {
        employees: userCount.length,
        analyses: analysisCount.length,
        activeTriggers: activeTriggersCount.length,
        avgCultureScore: Math.round(avgCultureScore)
      },
      recentAnalyses,
      trends: {
        // Add trend calculations here
        analysesThisMonth: analysisCount.filter((a: any) => 
          a.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        ).length
      }
    });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
      return;
});

// Company management
router.get('/companies', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    // Get the current tenant (company) with its departments
    const companiesList = await db.query.tenants.findMany({
      where: eq(tenants.id, req.user.tenantId),
      with: {
        departments: true,
        users: true
      }
    });
    
    res.json(companiesList);
    
  } catch (error) {
    console.error('Companies fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
      return;
});

router.post('/companies', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const schema = z.object({
      name: z.string().min(2),
      industry: z.string(),
      size: z.string(),
      strategy: z.string().optional()
    });
    
    const validatedData = schema.parse(req.body);
    
    const [company] = await db.insert(companies)
      .values({
        id: randomUUID(),
        ...validatedData
      })
      .returning();
    
    res.json(company);
    
  } catch (error) {
    console.error('Company creation error:', error);
    res.status(500).json({ error: 'Failed to create company' });
  }
      return;
});

// User management
router.get('/users', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const usersList = await db.query.users.findMany({
      where: eq(users.tenantId, req.user.tenantId),
      with: {
        department: true
      }
    });
    
    // Remove sensitive data
    const sanitizedUsers = usersList.map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      isActive: u.isActive,
      department: u.department,
      profile: u.profile,
      createdAt: u.createdAt
    }));
    
    res.json(sanitizedUsers);
    
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
      return;
});

router.post('/users/invite', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const schema = z.object({
      email: z.string().email(),
      name: z.string(),
      role: z.enum(['employee', 'clientAdmin']),
      departmentId: z.string().uuid().optional()
    });
    
    const validatedData = schema.parse(req.body);
    
    // Create user with temporary password
    const tempPassword = randomUUID();
    
    const userResult = await db.insert(users)
      .values({
        id: randomUUID(),
        tenantId: req.user.tenantId,
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
    
    // TODO: Send invitation email
    
    res.json({
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
    res.status(500).json({ error: 'Failed to invite user' });
  }
      return;
});

// Analysis management
router.get('/analyses', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const analysesList = await db.query.analyses.findMany({
      where: eq(analyses.tenantId, req.user.tenantId),
      orderBy: [desc(analyses.createdAt)],
      with: {
        company: true,
        requestedByUser: true
      }
    });
    
    res.json(analysesList);
    
  } catch (error) {
    console.error('Analyses fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch analyses' });
  }
      return;
});

// Triggers management
router.get('/triggers', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const triggersList = await db.query.triggers.findMany({
      where: eq(triggers.tenantId, req.user.tenantId),
      orderBy: [desc(triggers.createdAt)],
      with: {
        executions: {
          orderBy: [desc(triggers.createdAt)],
          limit: 5
        }
      }
    });
    
    res.json(triggersList);
    
  } catch (error) {
    console.error('Triggers fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch triggers' });
  }
      return;
});

router.put('/triggers/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const { isActive, actionConfig } = req.body;

    const [updated] = await db.update(triggers)
      .set({
        isActive,
        actionConfig,
        updatedAt: new Date()
      })
      .where(and(
        eq(triggers.id, req.params.id),
        eq(triggers.tenantId, req.user.tenantId)
      ))
      .returning();
    
    if (!updated) {
      res.status(404).json({ error: 'Trigger not found' });
    }
      return;
    
    res.json(updated);
    
  } catch (error) {
    console.error('Trigger update error:', error);
    res.status(500).json({ error: 'Failed to update trigger' });
  }
      return;
});

// Department management
router.get('/departments', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const departmentsList = await db.query.departments.findMany({
      where: eq(departments.tenantId, req.user.tenantId),
      with: {
        manager: true,
        users: true
      }
    });
    
    res.json(departmentsList);
    
  } catch (error) {
    console.error('Departments fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
      return;
});

// Reports
router.get('/reports/culture', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const { companyId } = req.query;
    
    const assessments = await db.query.cultureAssessments.findMany({
      where: and(
        eq(cultureAssessments.tenantId, req.user.tenantId),
        companyId ? eq(cultureAssessments.companyId, companyId as string) : undefined
      ),
      with: {
        tenant: true,
        user: true
      }
    });
    
    res.json({
      assessments,
      summary: {
        totalAssessments: assessments.length,
        avgAlignmentScore: assessments.reduce((sum: number, a: any) => sum + (a.alignmentScore || 0), 0) / assessments.length,
        // Add more summary stats
      }
    });
    
  } catch (error) {
    console.error('Culture report error:', error);
    res.status(500).json({ error: 'Failed to generate culture report' });
  }
      return;
});

export default router;
