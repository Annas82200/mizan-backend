import { Router } from "express";
import { analyzeStructure, StructureAgent, StructureAnalysisOutput } from "../services/agents/structure-agent";
import { analyzeCulture } from "../services/agents/culture/culture-agent";
import { runArchitectAI } from "../services/orchestrator/architect-ai";
import { buildUnifiedResults } from "../services/results/unified-results";
import { runTriggers } from "../services/results/trigger-engine";
import { db } from "../db/index";
import { organizationStructure } from "../db/schema/strategy";
import { tenants } from "../db/schema";
import { eq } from "drizzle-orm";
import { performExpertAnalysis, type ExpertOrgDesignAnalysis } from "../services/org-design-expert";
import { performCultureExpertAnalysis, type CultureExpertAnalysis } from "../services/culture-design-expert";
import type { StrategyData, StructureData, Role, Department, ReportingLine } from "../types/structure-types";
import { performanceAgent } from '../services/agents/performance/performance-agent';
import { hiringAgent } from '../services/agents/hiring/hiring-agent';
import { lxpAgent } from '../services/agents/lxp/lxp-agent';


const router = Router();

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

// POST /api/analyses/structure
router.post("/structure", async (req, res) => {
  try {
    const { tenantId } = req.body;
    if (!tenantId) {
      return res.status(400).json({ error: "Missing tenantId" });
    }

    // Get organization structure from database
    const structures = await db
      .select()
      .from(organizationStructure)
      .where(eq(organizationStructure.tenantId, tenantId));

    if (structures.length === 0) {
      return res.status(404).json({ error: "No organization structure found for tenant" });
    }

    const rawStructureData = structures[0].structureData as Record<string, unknown>;
    
    // Get tenant strategy from database
    const tenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId));
    
    const tenantStrategy = tenant.length > 0 ? (tenant[0] as TenantStrategy) : undefined;
    
    // Ensure structureData has all required StructureData fields
    const structureData: StructureData = {
      roles: (rawStructureData.roles || []) as Role[],
      departments: (rawStructureData.departments || []) as Department[],
      reportingLines: (rawStructureData.reportingLines || []) as ReportingLine[],
    };

    // Run rich AI-powered structure analysis for human, contextual insights
    const structureAgent = new StructureAgent();
    let richAnalysis: StructureAnalysisOutput;
    try {
      richAnalysis = await structureAgent.generateRichStructureAnalysis({
        tenantId,
        structureData: structureData,
        strategyData: tenantStrategy,
      });
    } catch (error: unknown) {
      console.error('Failed to generate rich structure analysis:', error);
      richAnalysis = {
        keyInsights: ["AI analysis failed, showing basic analysis only."],
        recommendations: [],
        confidenceScore: 0.2
      };
    }
    
    const expertAnalysis = analyzeStructure(structureData, tenantStrategy);

    // Combine results
    const combinedResult = {
      ...expertAnalysis,
      ...richAnalysis,
    };

    return res.json(combinedResult);
  } catch (error: unknown) {
    console.error("structure analysis error", error);
    if (error instanceof Error) {
        return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: "structure failure" });
  }
});

// POST /api/analyses/culture
router.post("/culture", async (req, res) => {
  try {
    const { tenantId } = req.body;

    // Get tenant info for client-specific language
    let clientName = 'Your organization';
    if (tenantId) {
      const tenantData = await db
        .select({ name: tenants.name })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);
      if (tenantData.length > 0) {
        clientName = tenantData[0].name;
      }
    }

    // Run Mizan 7-Cylinder Framework analysis (unchanged - respects the approved framework)
    const result = await analyzeCulture(req.body || {});

    // Culture analysis returns recommendations in { immediate, shortTerm, longTerm } format
    // No enhancement needed - returning as-is from Culture Agent
    return res.json(result);
  } catch (error: unknown) {
    console.error('Culture analysis error:', error);
    if (error instanceof Error) {
        return res.status(500).json({ error: error.message });
    }
    return res.status(500).json({ error: "culture failure" });
  }
});

// POST /api/analyses/run-all
router.post("/run-all", async (req, res) => {
  try {
    const arch = await runArchitectAI(req.body || {});
    res.json(arch);
  } catch (error: unknown) {
    if (error instanceof Error) {
        res.status(500).json({ error: error.message });
    } else {
        res.status(500).json({ error: "orchestrator failure" });
    }
  }
});

// POST /api/analyses/results  (orchestrator -> unified snapshot -> triggers)
router.post("/results", async (req, res) => {
  try {
    const arch = await runArchitectAI(req.body || {});
    const snapshot = await buildUnifiedResults(arch);
    const snapshotWithTenant = { ...snapshot, tenantId: req.body.tenantId || 'default-tenant' };
    const triggers = await runTriggers(snapshotWithTenant);
    res.json({ snapshot, triggers });
  } catch (error: unknown) {
    if (error instanceof Error) {
        res.status(500).json({ error: error.message });
    } else {
        res.status(500).json({ error: "results failure" });
    }
  }
});


// POST /api/analyses/performance - Production Performance Analysis using Three-Engine Architecture
router.post("/performance", async (req, res) => {
  try {
    const { tenantId, employeeId } = req.body;
    
    if (!tenantId) {
      return res.status(400).json({ error: "tenantId is required" });
    }
    
    // Get tenant info for context
    const tenantInfo = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId)
    });
    
    if (!tenantInfo) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    // Run performance analysis using the new PerformanceAgent
    const analysis = await performanceAgent.processPerformanceCycle({
      tenantId,
      clientStrategy: {
        vision: tenantInfo.vision || undefined,
        mission: tenantInfo.mission || undefined,
        strategy: tenantInfo.strategy || undefined,
        values: tenantInfo.values || undefined
      },
      clientContext: {
        industry: tenantInfo.industry || 'General',
        size: tenantInfo.employeeCount?.toString() || 'medium',
        marketPosition: tenantInfo.marketPosition || undefined
      },
      // departmentStructure and individualGoalsCSV can be passed from req.body if available
      departmentStructure: req.body.departmentStructure,
      individualGoalsCSV: req.body.individualGoalsCSV,
    });
    
    // The new agent returns a simpler object. We can expand this later if needed.
    // For now, there's no employee-specific filtering here as the agent handles the whole cycle.
    // This can be a future enhancement.
    
    res.json({
      ...analysis,
      metadata: {
        analysisDate: new Date().toISOString(),
        tenantId,
        status: 'completed' // Assuming the agent completes the process
      }
    });
  } catch (error: unknown) {
    console.error('Performance analysis error:', error);
    if (error instanceof Error) {
        res.status(500).json({ error: error.message });
    } else {
        res.status(500).json({ error: "performance analysis failure" });
    }
  }
});

// POST /api/analyses/hiring - Production Hiring Analysis using Three-Engine Architecture
router.post("/hiring", async (req, res) => {
  try {
    const { tenantId, structureRecommendation } = req.body;
    
    if (!tenantId) {
      return res.status(400).json({ error: "tenantId is required" });
    }
    
    // Get tenant info for context
    const tenantInfo = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId)
    });
    
    if (!tenantInfo) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    // Run hiring analysis using the new HiringAgent
    const analysis = await hiringAgent.processHiringRequest({
      tenantId,
      structureRecommendation,
      clientContext: {
        industry: tenantInfo.industry || 'General',
        companySize: tenantInfo.employeeCount?.toString() || 'medium',
        location: tenantInfo.location || 'Remote',
        culture: tenantInfo.values?.join(', ') || undefined,
        strategy: tenantInfo.strategy || undefined
      }
    });
    
    res.json({
      ...analysis,
      metadata: {
        analysisDate: new Date().toISOString(),
        tenantId,
        status: 'active'
      }
    });
  } catch (error: unknown) {
    console.error('Hiring analysis error:', error);
    if (error instanceof Error) {
        res.status(500).json({ error: error.message });
    } else {
        res.status(500).json({ error: "hiring analysis failure" });
    }
  }
});

// POST /api/analyses/lxp - Learning Experience Platform (Triggered by Skills Analysis)
router.post("/lxp", async (req, res) => {
  try {
    const { tenantId, employeeId, skillsGaps } = req.body;
    
    if (!tenantId || !employeeId || !skillsGaps) {
      return res.status(400).json({ error: "tenantId, employeeId, and skillsGaps are required" });
    }
    
    // Use the new LXPAgent to create a learning path
    const learningPath = await lxpAgent.createLearningPathForEmployee({
      tenantId,
      employeeId,
      skillsGaps,
    });
    
    res.json({
      success: true,
      learningPath,
      metadata: {
        triggeredBy: 'skills_analysis', // Or could be another source
        tenantId,
        employeeId,
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

// Skills analysis endpoint is already defined above with proper Three-Engine Architecture

export default router;
