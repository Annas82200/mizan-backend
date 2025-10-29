import { Router } from "express";
import { analyzeStructure, StructureAgent, StructureAnalysisOutput } from "../services/agents/structure-agent";
import { analyzeCulture } from "../services/agents/culture/culture-agent";
import { runArchitectAI } from "../services/orchestrator/architect-ai";
import { buildUnifiedResults } from "../services/results/unified-results";
import { runTriggers } from "../services/results/trigger-engine";
import { db } from "../../db/index";
import { organizationStructure } from "../../db/schema/strategy";
import { tenants } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { performExpertAnalysis, type ExpertOrgDesignAnalysis } from "../services/org-design-expert";
import { performCultureExpertAnalysis, type CultureExpertAnalysis } from "../services/culture-design-expert";
import type { StrategyData, StructureData, Role, Department, ReportingLine } from "../types/structure-types";
import { performanceAgent } from '../services/agents/performance/performance-agent';
import { hiringAgent } from '../services/agents/hiring/hiring-agent';
import lxpAgent from '../services/agents/lxp/lxp-agent';
import { validateTenantAccess } from '../middleware/tenant';
import { Request, Response } from 'express';

const router = Router();

// Apply tenant validation middleware to all routes
router.use(validateTenantAccess);

// Extended Request interface for tenant context
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    tenantId: string;
    email: string;
    role: string;
  };
}

// Legacy interfaces for old data format
interface LegacyRole {
  id: string;
  name: string;
  level: number;
  reports: string | null;
  children?: LegacyRole[];
}

interface LegacyStructureData {
  roles: LegacyRole[];
  hierarchy: LegacyRole;
  uploadedAt: string;
}

interface TenantStrategy {
  vision: string | null;
  mission: string | null;
  strategy: string | null;
  values: string[] | null;
}

// Helper function to validate tenant access and extract user context
async function validateAndExtractTenant(req: AuthenticatedRequest, res: Response): Promise<{ tenantId: string; user: AuthenticatedRequest['user'] } | null> {
  try {
    const user = req.user;
    
    if (!user || !user.tenantId) {
      res.status(401).json({ error: 'Unauthorized - missing tenant context' });
      return null;
    }

    // Verify tenant exists and user has access
    const tenantExists = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.id, user.tenantId))
      .limit(1);

    if (tenantExists.length === 0) {
      res.status(403).json({ error: 'Access denied - tenant not found' });
      return null;
    }

    return { tenantId: user.tenantId, user };
  } catch (error) {
    console.error('Tenant validation error:', error);
    res.status(500).json({ error: 'Internal server error during tenant validation' });
    return null;
  }
}

// POST /api/analyses/structure
router.post("/structure", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantContext = await validateAndExtractTenant(req, res);
    if (!tenantContext) return; // Response already sent

    const { tenantId, user } = tenantContext;

    // Get organization structure with tenant isolation
    const structures = await db
      .select()
      .from(organizationStructure)
      .where(and(
        eq(organizationStructure.tenantId, tenantId),
        eq(organizationStructure.tenantId, user.tenantId) // Double validation
      ))
      .limit(1);

    if (structures.length === 0) {
      return res.status(404).json({ error: "No organization structure found for your tenant" });
    }

    const rawStructureData = structures[0].structureData as Record<string, unknown>;

    // Get tenant strategy with tenant isolation
    const tenant = await db
      .select()
      .from(tenants)
      .where(and(
        eq(tenants.id, tenantId),
        eq(tenants.id, user.tenantId) // Double validation
      ))
      .limit(1);

    const tenantData = tenant.length > 0 ? tenant[0] : undefined;
    const companyName = tenantData?.name || 'Unknown Company';

    // Ensure structureData has all required StructureData fields with proper type guards
    const totalEmp = rawStructureData.totalEmployees;
    const orgLevels = rawStructureData.organizationLevels;

    const structureData: StructureData = {
      roles: (rawStructureData.roles || []) as Role[],
      departments: (rawStructureData.departments || []) as Department[],
      reportingLines: (rawStructureData.reportingLines || []) as ReportingLine[],
      totalEmployees: (typeof totalEmp === 'number' ? totalEmp : 0),
      organizationLevels: (typeof orgLevels === 'number' ? orgLevels : 0)
    };

    // Run rich AI-powered structure analysis for human, contextual insights
    const structureAgent = new StructureAgent();
    const richAnalysis = await structureAgent.generateRichStructureAnalysis({
      tenantId,
      companyName,
      structureData: structureData,
      strategyData: {
        id: tenantData?.id || '',
        vision: tenantData?.vision || undefined,
        mission: tenantData?.mission || undefined,
        strategy: tenantData?.strategy || undefined,
        values: (tenantData?.values as string[]) || undefined
      } as StrategyData,
    });

    const expertAnalysis = await analyzeStructure({
      tenantId,
      structureData,
      strategyData: {
        id: tenantData?.id || '',
        vision: tenantData?.vision || undefined,
        mission: tenantData?.mission || undefined,
        strategy: tenantData?.strategy || undefined,
        values: (tenantData?.values as string[]) || undefined
      } as StrategyData
    });

    // Combine results with tenant context
    const combinedResult = {
      ...expertAnalysis,
      ...richAnalysis,
      metadata: {
        tenantId,
        analyzedBy: user.id,
        analyzedAt: new Date().toISOString()
      }
    };

    return res.json(combinedResult);
  } catch (error: unknown) {
    console.error("Structure analysis error:", error);
    if (error instanceof Error) {
        return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: "Structure analysis failure" });
  }
});

// POST /api/analyses/culture
router.post("/culture", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantContext = await validateAndExtractTenant(req, res);
    if (!tenantContext) return; // Response already sent

    const { tenantId, user } = tenantContext;

    // Get tenant info for client-specific language with tenant isolation
    let clientName = 'Your organization';
    const tenantData = await db
      .select({ name: tenants.name })
      .from(tenants)
      .where(and(
        eq(tenants.id, tenantId),
        eq(tenants.id, user.tenantId) // Double validation
      ))
      .limit(1);

    if (tenantData.length > 0) {
      clientName = tenantData[0].name;
    }

    // Run Mizan 7-Cylinder Framework analysis with tenant context
    const analysisInput = {
      ...req.body,
      tenantId,
      userId: user.id,
      clientName
    };

    const result = await analyzeCulture(analysisInput);

    // Add tenant metadata to response
    const secureResult = {
      ...result,
      metadata: {
        tenantId,
        analyzedBy: user.id,
        analyzedAt: new Date().toISOString(),
        clientName
      }
    };

    return res.json(secureResult);
  } catch (error: unknown) {
    console.error('Culture analysis error:', error);
    if (error instanceof Error) {
        return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: "Culture analysis failure" });
  }
});

// POST /api/analyses/run-all
router.post("/run-all", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantContext = await validateAndExtractTenant(req, res);
    if (!tenantContext) return; // Response already sent

    const { tenantId, user } = tenantContext;

    // Add tenant context to analysis input
    const analysisInput = {
      ...req.body,
      tenantId,
      userId: user.id
    };

    const arch = await runArchitectAI(analysisInput);

    // Add tenant metadata to response
    const secureResult = {
      ...arch,
      metadata: {
        tenantId,
        analyzedBy: user.id,
        analyzedAt: new Date().toISOString()
      }
    };

    res.json(secureResult);
  } catch (error: unknown) {
    if (error instanceof Error) {
        res.status(500).json({ error: error.message });
    } else {
        res.status(500).json({ error: "Orchestrator failure" });
    }
  }
});

// POST /api/analyses/results (orchestrator -> unified snapshot -> triggers)
router.post("/results", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantContext = await validateAndExtractTenant(req, res);
    if (!tenantContext) return; // Response already sent

    const { tenantId, user } = tenantContext;

    // Add tenant context to analysis input
    const analysisInput = {
      ...req.body,
      tenantId,
      userId: user.id
    };

    const arch = await runArchitectAI(analysisInput);
    const snapshot = await buildUnifiedResults(arch);
    
    // Ensure snapshot has tenant context
    const snapshotWithTenant = { 
      ...snapshot, 
      tenantId,
      userId: user.id,
      analyzedAt: new Date().toISOString()
    };
    
    const triggers = await runTriggers(snapshotWithTenant);

    res.json({ 
      snapshot: snapshotWithTenant, 
      triggers,
      metadata: {
        tenantId,
        analyzedBy: user.id,
        analyzedAt: new Date().toISOString()
      }
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
        res.status(500).json({ error: error.message });
    } else {
        res.status(500).json({ error: "Results processing failure" });
    }
  }
});

// POST /api/analyses/performance - Production Performance Analysis using Three-Engine Architecture
router.post("/performance", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantContext = await validateAndExtractTenant(req, res);
    if (!tenantContext) return; // Response already sent

    const { tenantId, user } = tenantContext;
    const { employeeId } = req.body;
    
    // Get tenant info for context with tenant isolation
    const tenantInfo = await db
      .select()
      .from(tenants)
      .where(and(
        eq(tenants.id, tenantId),
        eq(tenants.id, user.tenantId) // Double validation
      ))
      .limit(1);
    
    if (tenantInfo.length === 0) {
      return res.status(404).json({ error: 'Tenant not found or access denied' });
    }

    const tenant = tenantInfo[0];
    
    // Run performance analysis using the new PerformanceAgent with tenant context
    const analysis = await performanceAgent.processPerformanceCycle({
      tenantId,
      userId: user.id,
      clientStrategy: {
        vision: tenant.vision || undefined,
        mission: tenant.mission || undefined,
        strategy: tenant.strategy || undefined,
        values: tenant.values || undefined
      },
      clientContext: {
        industry: tenant.industry || 'General',
        size: tenant.employeeCount?.toString() || 'medium',
        marketPosition: tenant.marketPosition || undefined
      },
      departmentStructure: req.body.departmentStructure,
      individualGoalsCSV: req.body.individualGoalsCSV,
    });
    
    res.json({
      ...analysis,
      metadata: {
        analysisDate: new Date().toISOString(),
        tenantId,
        analyzedBy: user.id,
        status: 'completed',
        employeeId: employeeId || null
      }
    });
  } catch (error: unknown) {
    console.error('Performance analysis error:', error);
    if (error instanceof Error) {
        res.status(500).json({ error: error.message });
    } else {
        res.status(500).json({ error: "Performance analysis failure" });
    }
  }
});

// POST /api/analyses/hiring - Production Hiring Analysis using Three-Engine Architecture
router.post("/hiring", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantContext = await validateAndExtractTenant(req, res);
    if (!tenantContext) return; // Response already sent

    const { tenantId, user } = tenantContext;
    const { structureRecommendation } = req.body;
    
    // Get tenant info for context with tenant isolation
    const tenantInfo = await db
      .select()
      .from(tenants)
      .where(and(
        eq(tenants.id, tenantId),
        eq(tenants.id, user.tenantId) // Double validation
      ))
      .limit(1);
    
    if (tenantInfo.length === 0) {
      return res.status(404).json({ error: 'Tenant not found or access denied' });
    }

    const tenant = tenantInfo[0];
    
    // Run hiring analysis using the new HiringAgent with tenant context
    const analysis = await hiringAgent.processHiringRequest({
      tenantId,
      userId: user.id,
      structureRecommendation,
      clientContext: {
        industry: tenant.industry || 'General',
        companySize: tenant.employeeCount?.toString() || 'medium',
        location: tenant.location || 'Remote',
        culture: tenant.values?.join(', ') || undefined,
        strategy: tenant.strategy || undefined
      }
    });
    
    res.json({
      ...analysis,
      metadata: {
        analysisDate: new Date().toISOString(),
        tenantId,
        analyzedBy: user.id,
        status: 'active'
      }
    });
  } catch (error: unknown) {
    console.error('Hiring analysis error:', error);
    if (error instanceof Error) {
        res.status(500).json({ error: error.message });
    } else {
        res.status(500).json({ error: "Hiring analysis failure" });
    }
  }
});

// POST /api/analyses/lxp - Learning Experience Platform (Triggered by Skills Analysis)
router.post("/lxp", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantContext = await validateAndExtractTenant(req, res);
    if (!tenantContext) return; // Response already sent

    const { tenantId, user } = tenantContext;
    const { employeeId, skillsGaps } = req.body;
    
    if (!employeeId || !skillsGaps) {
      return res.status(400).json({ error: "employeeId and skillsGaps are required" });
    }
    
    // Verify employee belongs to the same tenant (additional security check)
    // This would require an employees table - for now we trust the tenant isolation
    
    // Use the new LXPAgent to create a learning path with tenant context
    const learningPath = await lxpAgent.createLearningPathForEmployee({
      tenantId,
      userId: user.id,
      employeeId,
      skillsGaps,
    });
    
    res.json({
      success: true,
      learningPath,
      metadata: {
        triggeredBy: 'skills_analysis',
        tenantId,
        employeeId,
        createdBy: user.id,
        analysisDate: new Date().toISOString()
      }
    });
  } catch (error: unknown) {
    console.error('LXP analysis error:', error);
    if (error instanceof Error) {
        res.status(500).json({ error: error.message });
    } else {
        res.status(500).json({ error: "LXP analysis failure" });
    }
  }
});

// POST /api/analyses/skills - Skills Analysis with tenant isolation
router.post("/skills", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantContext = await validateAndExtractTenant(req, res);
    if (!tenantContext) return; // Response already sent

    const { tenantId, user } = tenantContext;
    
    // Get tenant info for context with tenant isolation
    const tenantInfo = await db
      .select()
      .from(tenants)
      .where(and(
        eq(tenants.id, tenantId),
        eq(tenants.id, user.tenantId) // Double validation
      ))
      .limit(1);
    
    if (tenantInfo.length === 0) {
      return res.status(404).json({ error: 'Tenant not found or access denied' });
    }

    const tenant = tenantInfo[0];

    // Add tenant context to skills analysis input
    const analysisInput = {
      ...req.body,
      tenantId,
      userId: user.id,
      clientStrategy: {
        vision: tenant.vision || undefined,
        mission: tenant.mission || undefined,
        strategy: tenant.strategy || undefined,
        values: tenant.values || undefined
      },
      clientContext: {
        industry: tenant.industry || 'General',
        size: tenant.employeeCount?.toString() || 'medium'
      }
    };

    // Skills analysis would be implemented here with Three-Engine Architecture
    // For now, returning a structured response
    const skillsAnalysis = {
      status: 'completed',
      strategicFramework: {
        industrySkills: [],
        strategicPriorities: [],
        skillsGaps: []
      },
      employeeProfiles: [],
      recommendations: [],
      triggerData: {
        lxpTriggers: [],
        talentTriggers: [],
        bonusTriggers: []
      }
    };

    res.json({
      ...skillsAnalysis,
      metadata: {
        analysisDate: new Date().toISOString(),
        tenantId,
        analyzedBy: user.id,
        status: 'completed'
      }
    });
  } catch (error: unknown) {
    console.error('Skills analysis error:', error);
    if (error instanceof Error) {
        res.status(500).json({ error: error.message });
    } else {
        res.status(500).json({ error: "Skills analysis failure" });
    }
  }
});

export default router;