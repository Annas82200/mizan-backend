import { Router } from "express";
import { analyzeStructure, StructureAgent } from "../services/agents/structure-agent.js";
import { analyzeCulture } from "../services/agents/culture/culture-agent.js";
import { runArchitectAI } from "../services/orchestrator/architect-ai.js";
import { buildUnifiedResults } from "../services/results/unified-results.js";
import { runTriggers } from "../services/results/trigger-engine.js";
import { db } from "../../db/index.js";
import { organizationStructure } from "../../db/schema/strategy.js";
import { tenants } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { performExpertAnalysis, type ExpertOrgDesignAnalysis } from "../services/org-design-expert.js";
import { performCultureExpertAnalysis, type CultureExpertAnalysis } from "../services/culture-design-expert.js";
import type { StrategyData, StructureData, Role } from "../types/structure-types.js";

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

function analyzeStrategyAlignment(structureData: StructureData, strategy: TenantStrategy) {
  const { roles, departments } = structureData;

  // Count employees by department
  const departmentCounts = new Map<string, number>();
  roles.forEach((role: Role) => {
    const dept = role.department || 'Unknown';
    departmentCounts.set(dept, (departmentCounts.get(dept) || 0) + 1);
  });

  const hasStrategy = !!(strategy.vision || strategy.mission || strategy.strategy);

  if (!hasStrategy) {
    return {
      score: 50,
      hasStrategy: false,
      alignmentReport: "No strategy statement found for this organization. To provide strategy alignment analysis, please add your organization's vision, mission, and strategic objectives in the tenant settings.",
      misalignments: [],
      strengths: []
    };
  }

  // Analyze structure against strategy
  const report: string[] = [];
  const misalignments: Array<{ area: string; issue: string; impact: 'high' | 'medium' | 'low' }> = [];
  const strengths: string[] = [];

  report.push("## Strategy-Structure Alignment Analysis\n");

  if (strategy.vision) {
    report.push(`**Vision**: ${strategy.vision}\n`);
  }

  if (strategy.mission) {
    report.push(`**Mission**: ${strategy.mission}\n`);
  }

  if (strategy.strategy) {
    report.push(`**Strategic Objectives**: ${strategy.strategy}\n`);
  }

  report.push("\n### Structural Assessment\n");

  // Analyze if structure supports strategy
  const totalEmployees = roles.length;
  const deptArray = Array.from(departmentCounts.entries()).sort((a: [string, number], b: [string, number]) => b[1] - a[1]);

  report.push(`The organization has ${totalEmployees} employees distributed across ${departmentCounts.size} functional areas:\n`);
  deptArray.forEach(([dept, count]: [string, number]) => {
    const percentage = ((count / totalEmployees) * 100).toFixed(1);
    report.push(`- **${dept}**: ${count} employees (${percentage}%)`);
  });

  report.push("\n### Strategy Alignment\n");

  // Check for strategic alignment based on department distribution
  const engineeringCount = departmentCounts.get('Engineering') || 0;
  const salesCount = departmentCounts.get('Sales') || 0;
  const productCount = departmentCounts.get('Product') || 0;
  const operationsCount = departmentCounts.get('Operations') || 0;

  const engineeringPercent = (engineeringCount / totalEmployees) * 100;
  const salesPercent = (salesCount / totalEmployees) * 100;

  // Analyze based on strategy keywords
  const strategyText = `${strategy.vision} ${strategy.mission} ${strategy.strategy}`.toLowerCase();

  if (strategyText.includes('innovation') || strategyText.includes('technology') || strategyText.includes('product')) {
    if (engineeringPercent < 30) {
      misalignments.push({
        area: 'Engineering Capacity',
        issue: `Strategy emphasizes innovation/technology but only ${engineeringPercent.toFixed(1)}% of workforce is in Engineering`,
        impact: 'high'
      });
      report.push(`\n⚠️ **Gap Identified**: Your strategy emphasizes innovation and technology, but Engineering represents only ${engineeringPercent.toFixed(1)}% of your workforce. Consider increasing technical capacity to support strategic objectives.`);
    } else {
      strengths.push(`Engineering team size (${engineeringPercent.toFixed(1)}%) aligns well with technology-focused strategy`);
      report.push(`\n✅ **Strength**: Engineering capacity (${engineeringPercent.toFixed(1)}%) is well-aligned with your technology-focused strategy.`);
    }
  }

  if (strategyText.includes('growth') || strategyText.includes('market') || strategyText.includes('revenue')) {
    if (salesPercent < 15) {
      misalignments.push({
        area: 'Sales & GTM',
        issue: `Strategy focuses on growth/market expansion but Sales is only ${salesPercent.toFixed(1)}% of workforce`,
        impact: 'high'
      });
      report.push(`\n⚠️ **Gap Identified**: Your strategy emphasizes growth and market expansion, but Sales represents only ${salesPercent.toFixed(1)}% of your workforce. Consider strengthening go-to-market capabilities.`);
    } else {
      strengths.push(`Sales team size (${salesPercent.toFixed(1)}%) supports growth-oriented strategy`);
      report.push(`\n✅ **Strength**: Sales capacity (${salesPercent.toFixed(1)}%) is appropriate for your growth-focused strategy.`);
    }
  }

  if (strategyText.includes('customer') || strategyText.includes('service') || strategyText.includes('experience')) {
    const customerFacingPercent = salesPercent + (departmentCounts.get('Support') || 0) / totalEmployees * 100;
    if (customerFacingPercent < 20) {
      misalignments.push({
        area: 'Customer-Facing Teams',
        issue: `Strategy emphasizes customer focus but only ${customerFacingPercent.toFixed(1)}% in customer-facing roles`,
        impact: 'medium'
      });
      report.push(`\n⚠️ **Gap Identified**: Your strategy emphasizes customer experience, but only ${customerFacingPercent.toFixed(1)}% of workforce is in customer-facing roles.`);
    } else {
      strengths.push(`Customer-facing capacity (${customerFacingPercent.toFixed(1)}%) aligns with customer-centric strategy`);
    }
  }

  // Calculate alignment score
  let score = 75; // Base score
  score -= misalignments.filter(m => m.impact === 'high').length * 15;
  score -= misalignments.filter(m => m.impact === 'medium').length * 10;
  score -= misalignments.filter(m => m.impact === 'low').length * 5;
  score += strengths.length * 5;
  score = Math.max(0, Math.min(100, score));

  // Determine if strategy is achievable with current structure
  const highImpactGaps = misalignments.filter(m => m.impact === 'high').length;
  const mediumImpactGaps = misalignments.filter(m => m.impact === 'medium').length;

  let canAchieveStrategy: 'yes' | 'no' | 'partial';
  let achievabilityExplanation: string;

  if (highImpactGaps > 0) {
    canAchieveStrategy = 'no';
    achievabilityExplanation = `**No, the current structure will likely prevent achieving your strategic objectives.** You have ${highImpactGaps} critical gap(s) that directly conflict with your strategy. Without addressing these structural misalignments, execution will be significantly hampered.`;
  } else if (mediumImpactGaps > 1) {
    canAchieveStrategy = 'partial';
    achievabilityExplanation = `**Partially - the structure has significant limitations.** While there are no critical gaps, ${mediumImpactGaps} medium-impact issues may slow progress toward strategic goals. Success is possible but will require workarounds and extra effort.`;
  } else if (mediumImpactGaps === 1) {
    canAchieveStrategy = 'partial';
    achievabilityExplanation = `**Mostly yes, with one caveat.** The structure generally supports your strategy, but one medium-impact gap may create friction. Addressing it would accelerate execution.`;
  } else {
    canAchieveStrategy = 'yes';
    achievabilityExplanation = `**Yes, your structure is well-positioned to achieve your strategic objectives.** The distribution of resources aligns with your strategic priorities, enabling effective execution.`;
  }

  report.push(`\n### Can You Achieve Your Strategy?\n`);
  report.push(achievabilityExplanation);

  if (misalignments.length > 0) {
    report.push(`\n### Critical Gaps to Address\n`);
    misalignments.forEach((m, i) => {
      report.push(`${i + 1}. **${m.area}** (${m.impact.toUpperCase()} IMPACT): ${m.issue}`);
    });
  }

  if (strengths.length > 0) {
    report.push(`\n### Structural Strengths\n`);
    strengths.forEach((s, i) => {
      report.push(`${i + 1}. ${s}`);
    });
  }

  return {
    score,
    hasStrategy: true,
    canAchieveStrategy,
    achievabilityExplanation,
    alignmentReport: report.join('\n'),
    misalignments,
    strengths
  };
}

function calculateRealStructureAnalysis(structureData: StructureData, strategy?: TenantStrategy) {
  const { roles } = structureData;

  // Calculate span of control for each manager (count direct reports)
  const managerSpans = new Map<string, number>();
  roles.forEach((role: Role) => {
    if (role.reportsTo) {
      managerSpans.set(role.reportsTo, (managerSpans.get(role.reportsTo) || 0) + 1);
    }
  });

  // Calculate average span
  const spans = Array.from(managerSpans.values());
  const averageSpan = spans.length > 0 ? spans.reduce((a, b) => a + b, 0) / spans.length : 0;

  // Distribution
  const distribution: { [key: string]: number } = {
    '1-3': 0,
    '4-7': 0,
    '8-12': 0,
    '13+': 0
  };

  spans.forEach(span => {
    if (span <= 3) distribution['1-3']++;
    else if (span <= 7) distribution['4-7']++;
    else if (span <= 12) distribution['8-12']++;
    else distribution['13+']++;
  });

  // Find outliers (span > 10)
  const outliers: Array<{ role: string; span: number; recommendation: string }> = [];
  managerSpans.forEach((span, managerId) => {
    if (span > 10) {
      const manager = roles.find((r: Role) => r.id === managerId);
      outliers.push({
        role: manager?.title || managerId,
        span,
        recommendation: `Consider adding middle management layer or splitting into ${Math.ceil(span / 7)} teams`
      });
    }
  });

  // Layer analysis
  const maxLevel = Math.max(...roles.map((r: Role) => r.level), 0);
  const totalLayers = maxLevel + 1;

  // Find bottlenecks (layers with high avg span)
  const layerCounts = new Map<number, Role[]>();
  roles.forEach((role: Role) => {
    if (!layerCounts.has(role.level)) {
      layerCounts.set(role.level, []);
    }
    layerCounts.get(role.level)!.push(role);
  });

  const bottlenecks: Array<{ layer: number; roles: string[]; issue: string }> = [];
  layerCounts.forEach((rolesInLayer, layer) => {
    if (layer > 0 && layer < maxLevel) {
      const childCount = roles.filter((r: Role) => r.level === layer + 1).length;
      const avgChildrenPerRole = childCount / rolesInLayer.length;
      if (avgChildrenPerRole > 8) {
        bottlenecks.push({
          layer,
          roles: rolesInLayer.map((r: Role) => r.title),
          issue: `High span at this layer (avg ${avgChildrenPerRole.toFixed(1)} reports per manager)`
        });
      }
    }
  });

  // Calculate operational efficiency scores
  const spanScore = averageSpan >= 4 && averageSpan <= 8 ? 100 : Math.max(0, 100 - Math.abs(averageSpan - 6) * 10);
  const layerScore = totalLayers <= 5 ? 100 : Math.max(0, 100 - (totalLayers - 5) * 15);
  const operationalScore = Math.round((spanScore + layerScore) / 2);

  // Overall score will incorporate strategy alignment later (weighted heavily)
  let overallScore = operationalScore; // Will be recalculated after strategy analysis

  // Generate recommendations
  const recommendations: Array<{
    category: 'span' | 'layers' | 'alignment' | 'efficiency';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    actionItems: string[];
  }> = [];

  if (averageSpan > 8) {
    recommendations.push({
      category: 'span',
      priority: 'high',
      title: 'Reduce Average Span of Control',
      description: `Current average span of ${averageSpan.toFixed(1)} exceeds optimal range of 5-8 direct reports`,
      actionItems: [
        'Add middle management positions in overloaded areas',
        'Distribute responsibilities more evenly',
        'Consider team lead roles for larger groups'
      ]
    });
  }

  if (averageSpan < 4 && spans.length > 0) {
    recommendations.push({
      category: 'efficiency',
      priority: 'medium',
      title: 'Optimize Span of Control',
      description: `Average span of ${averageSpan.toFixed(1)} is below optimal range - consider consolidating roles`,
      actionItems: [
        'Review necessity of all management positions',
        'Consider flattening structure in under-utilized areas',
        'Increase manager responsibilities where appropriate'
      ]
    });
  }

  if (totalLayers > 5) {
    recommendations.push({
      category: 'layers',
      priority: 'medium',
      title: 'Flatten Organizational Hierarchy',
      description: `${totalLayers} layers may create communication delays and slow decision-making`,
      actionItems: [
        'Evaluate necessity of each management layer',
        'Empower individual contributors with more autonomy',
        'Consider removing redundant approval layers'
      ]
    });
  }

  if (outliers.length > 0) {
    recommendations.push({
      category: 'efficiency',
      priority: 'high',
      title: 'Address Span of Control Outliers',
      description: `${outliers.length} manager(s) have excessive direct reports`,
      actionItems: outliers.map(o => `${o.role}: ${o.recommendation}`)
    });
  }

  // Add recommendation if structure looks good
  if (recommendations.length === 0) {
    recommendations.push({
      category: 'alignment',
      priority: 'low',
      title: 'Structure is Well-Balanced',
      description: 'Current organizational structure follows best practices for span and layers',
      actionItems: [
        'Continue monitoring as organization grows',
        'Review structure quarterly for optimization opportunities',
        'Maintain documentation of reporting relationships'
      ]
    });
  }

  // Calculate departments for detailed recommendations
  const departmentMap = new Map<string, number>();
  roles.forEach((role: Role) => {
    const dept = role.department || 'Unknown';
    departmentMap.set(dept, (departmentMap.get(dept) || 0) + 1);
  });

  // Calculate strategy alignment if strategy provided
  let strategyAlignment;
  let finalOverallScore = overallScore;

  if (strategy) {
    const alignment = analyzeStrategyAlignment(structureData, strategy);
    strategyAlignment = {
      score: alignment.score,
      hasStrategy: alignment.hasStrategy,
      canAchieveStrategy: alignment.canAchieveStrategy,
      achievabilityExplanation: alignment.achievabilityExplanation,
      alignmentReport: alignment.alignmentReport,
      misalignments: alignment.misalignments,
      strengths: alignment.strengths
    };

    // Recalculate overall score: Strategy alignment is 70%, operational efficiency is 30%
    // If you can't achieve strategy, overall score should be much lower
    finalOverallScore = Math.round((alignment.score * 0.7) + (operationalScore * 0.3));

    // Add strategy gaps to recommendations at HIGH priority with specific action items
    if (alignment.misalignments && alignment.misalignments.length > 0) {
      alignment.misalignments.forEach(gap => {
        let specificActions: string[] = [];

        console.log('📊 Processing gap:', gap.area);
        console.log('📊 Available departments:', Array.from(departmentMap.keys()));
        console.log('📊 Department counts:', Array.from(departmentMap.entries()));

        // Generate specific, actionable recommendations based on the gap
        if (gap.area === 'Engineering Capacity') {
          const engineeringCount = departmentMap.get('Engineering') || 0;
          const totalEmployees = roles.length;
          const currentPercent = ((engineeringCount / totalEmployees) * 100).toFixed(1);
          const targetPercent = 30; // Innovation strategies typically need 30-40% technical
          const neededHires = Math.ceil((totalEmployees * targetPercent / 100) - engineeringCount);

          specificActions = [
            `Hire ${neededHires} additional engineers to reach ${targetPercent}% technical capacity (currently ${currentPercent}%)`,
            `Focus on senior roles: 1 Principal Engineer, 1 Engineering Manager, ${neededHires - 2} Senior Engineers`,
            `Timeline: Begin hiring immediately - aim to fill ${Math.ceil(neededHires / 2)} roles in Q1, remaining in Q2`,
            `Budget allocation: Expect $${(neededHires * 150000).toLocaleString()} annual cost for competitive engineering talent`,
            `Alternative: Partner with development agencies for 3-6 months while building internal team`
          ];
        } else if (gap.area === 'Sales & GTM') {
          const salesCount = departmentMap.get('Sales') || 0;
          const totalEmployees = roles.length;
          const currentPercent = ((salesCount / totalEmployees) * 100).toFixed(1);
          const targetPercent = 20;
          const neededHires = Math.ceil((totalEmployees * targetPercent / 100) - salesCount);

          specificActions = [
            `Expand sales team by ${neededHires} people to reach ${targetPercent}% GTM capacity (currently ${currentPercent}%)`,
            `Hire: 1 VP Sales, 2 Account Executives, ${neededHires - 3} SDRs`,
            `Invest in sales enablement tools and CRM infrastructure`,
            `Establish clear sales territories and quotas aligned with growth targets`,
            `Timeline: Fill leadership role (VP Sales) in Q1, ramp team throughout year`
          ];
        } else if (gap.area === 'Customer-Facing Teams') {
          const supportCount = (departmentMap.get('Support') || 0) + (departmentMap.get('Sales') || 0);
          const totalEmployees = roles.length;
          const neededHires = Math.ceil((totalEmployees * 0.25) - supportCount);

          specificActions = [
            `Build dedicated Customer Success team: hire ${neededHires} CSMs to support growth`,
            `Implement customer health scoring and proactive outreach programs`,
            `Create escalation paths from Sales → CS → Support with clear handoff processes`,
            `Invest in customer feedback tools (NPS, in-app surveys) to measure experience`,
            `Target: Reduce churn by 25% and increase expansion revenue by 40% within 12 months`
          ];
        } else {
          // Generic but still specific
          specificActions = [
            `Conduct gap analysis: Compare current ${gap.area.toLowerCase()} capabilities to strategic requirements`,
            `Identify critical roles needed to execute strategy in this area`,
            `Develop 6-month hiring plan with specific role descriptions and timelines`,
            `Consider interim solutions: contractors, consultants, or agency partners`,
            `Set quarterly milestones to measure progress toward closing this gap`
          ];
        }

        recommendations.unshift({
          category: 'alignment',
          priority: gap.impact === 'high' ? 'high' : 'medium',
          title: `Address Strategy Gap: ${gap.area}`,
          description: gap.issue,
          actionItems: specificActions
        });
      });
    }
  } else {
    strategyAlignment = {
      score: 50,
      hasStrategy: false,
      canAchieveStrategy: 'partial' as const,
      achievabilityExplanation: "Cannot assess strategy achievability without strategy data.",
      alignmentReport: "No strategy data available for alignment analysis.",
      misalignments: [],
      strengths: []
    };
  }

  return {
    overallScore: finalOverallScore,
    operationalScore, // Keep operational score separate for reference
    spanAnalysis: {
      average: parseFloat(averageSpan.toFixed(1)),
      distribution,
      outliers
    },
    layerAnalysis: {
      totalLayers,
      averageLayersToBottom: parseFloat(((maxLevel + 1) / 2).toFixed(1)),
      bottlenecks
    },
    strategyAlignment,
    recommendations
  };
}

// POST /api/analyses/structure
router.post("/structure", async (req, res) => {
  try {
    const { tenantId } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: "tenantId is required" });
    }

    // Get organization structure from database
    const structures = await db
      .select()
      .from(organizationStructure)
      .where(eq(organizationStructure.tenantId, tenantId))
      .limit(1);

    if (structures.length === 0) {
      return res.status(404).json({ error: "No organization structure found for tenant" });
    }

    const rawStructureData = structures[0].structureData as any;
    
    // Ensure structureData has all required StructureData fields
    const structureData: StructureData = {
      departments: rawStructureData.departments || [],
      reportingLines: rawStructureData.reportingLines || [],
      roles: rawStructureData.roles || [],
      totalEmployees: rawStructureData.totalEmployees || rawStructureData.employees?.length || 0,
      organizationLevels: rawStructureData.organizationLevels || 1
    };

    // Get tenant strategy data including name, industry, positioning
    const tenantData = await db
      .select({
        name: tenants.name,
        industry: tenants.industry,
        employeeCount: tenants.employeeCount,
        vision: tenants.vision,
        mission: tenants.mission,
        strategy: tenants.strategy,
        values: tenants.values
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    const tenantInfo = tenantData.length > 0 ? tenantData[0] : null;
    const tenantStrategy: TenantStrategy = tenantData.length > 0
      ? tenantData[0] as TenantStrategy
      : { vision: null, mission: null, strategy: null, values: null };

    // Convert TenantStrategy to StrategyData format for AI agents
    const strategyData: StrategyData | undefined = 
      (tenantStrategy.vision || tenantStrategy.mission || tenantStrategy.strategy)
        ? {
            id: tenantId, // Use tenantId as strategy id
            vision: tenantStrategy.vision || undefined,
            mission: tenantStrategy.mission || undefined,
            goals: [], // Could extract from strategy text in the future
            priorities: [],
            targetMarket: undefined,
            competitiveAdvantage: undefined,
            growthStrategy: tenantStrategy.strategy || undefined
          }
        : undefined;

    // Calculate real analysis from actual data with strategy alignment
    const result = calculateRealStructureAnalysis(structureData, tenantStrategy);

    // Run rich AI-powered structure analysis for human, contextual insights
    const structureAgent = new StructureAgent();
    let richAnalysis: any = null;
    try {
      richAnalysis = await structureAgent.generateRichStructureAnalysis({
        tenantId,
        companyName: tenantInfo?.name || 'Your Organization',
        structureData: structureData,
        strategyData: strategyData
      });
    } catch (error) {
      console.error('Failed to generate rich structure analysis:', error);
    }

    // Run expert organizational design analysis
    let expertAnalysis: ExpertOrgDesignAnalysis | null = null;
    if (tenantStrategy.vision || tenantStrategy.mission || tenantStrategy.strategy) {
      expertAnalysis = performExpertAnalysis(
        structureData,
        tenantStrategy,
        tenantInfo?.name,
        tenantInfo?.industry
      );

      // Replace generic recommendations with expert recommendations
      result.recommendations = expertAnalysis.expertRecommendations.map(rec => ({
        category: rec.category === 'Strategic Capability Gap' ? 'alignment' :
                  rec.category === 'Organizational Structure Evolution' ? 'alignment' :
                  rec.category === 'Organizational Agility' ? 'efficiency' : 'efficiency',
        priority: rec.priority === 'critical' ? 'high' : rec.priority,
        title: rec.title,
        description: `${rec.rationale}\n\n**Expected Impact:** ${rec.expectedImpact}\n**Timeframe:** ${rec.timeframe}`,
        actionItems: rec.actionItems
      }));
    }

    return res.json({
      ...result,
      richAnalysis: richAnalysis || null,
      expertInsights: expertAnalysis ? {
        companyStage: {
          stage: expertAnalysis.companyStage.stage,
          sizeRange: expertAnalysis.companyStage.sizeRange,
          description: expertAnalysis.companyStage.description,
          keyFocus: expertAnalysis.companyStage.keyFocus
        },
        strategicArchetype: {
          type: expertAnalysis.strategicArchetype.archetype,
          description: expertAnalysis.strategicArchetype.description,
          confidence: expertAnalysis.strategicArchetype.confidence
        },
        organizationalConfig: {
          type: expertAnalysis.mintzbergConfig.configuration,
          characteristics: expertAnalysis.mintzbergConfig.characteristics
        },
        industryContext: {
          industry: expertAnalysis.industryBenchmark.industry,
          context: expertAnalysis.industryBenchmark.context
        },
        structureAssessment: {
          currentType: expertAnalysis.galbraithStructure.structureType,
          appropriateness: expertAnalysis.galbraithStructure.appropriateness,
          reasoning: expertAnalysis.galbraithStructure.reasoning
        }
      } : null
    });
  } catch (e: any) {
    console.error('Structure analysis error:', e);
    return res.status(500).json({ error: e?.message || "structure failure" });
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
  } catch (e: any) {
    console.error('Culture analysis error:', e);
    return res.status(500).json({ error: e?.message || "culture failure" });
  }
});

// POST /api/analyses/run-all
router.post("/run-all", async (req, res) => {
  try {
    const arch = await runArchitectAI(req.body || {});
    res.json(arch);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "orchestrator failure" });
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
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "results failure" });
  }
});

// POST /api/analyses/skills - Mock skills analysis
router.post("/skills", async (req, res) => {
  try {
    const result = {
      overallScore: Math.floor(65 + Math.random() * 25), // 65-90
      skillGaps: [
        {
          skill: 'AI/Machine Learning',
          category: 'Technical',
          currentLevel: 45,
          requiredLevel: 80,
          gap: 35,
          priority: 'critical' as const,
          affectedEmployees: 12
        },
        {
          skill: 'Cloud Architecture',
          category: 'Technical',
          currentLevel: 60,
          requiredLevel: 85,
          gap: 25,
          priority: 'high' as const,
          affectedEmployees: 8
        },
        {
          skill: 'Leadership',
          category: 'Soft Skills',
          currentLevel: 55,
          requiredLevel: 75,
          gap: 20,
          priority: 'high' as const,
          affectedEmployees: 15
        },
        {
          skill: 'Data Analysis',
          category: 'Technical',
          currentLevel: 70,
          requiredLevel: 85,
          gap: 15,
          priority: 'medium' as const,
          affectedEmployees: 6
        }
      ],
      skillSurplus: [
        {
          skill: 'Legacy System Maintenance',
          currentLevel: 85,
          requiredLevel: 50,
          surplus: 35,
          opportunity: 'Retrain these experts in modern technologies'
        }
      ],
      recommendations: [
        {
          category: 'training' as const,
          priority: 'high' as const,
          title: 'Launch AI/ML Training Program',
          description: 'Critical gap in AI capabilities affecting product roadmap',
          cost: 50000,
          timeMonths: 6,
          expectedROI: 250000
        },
        {
          category: 'hiring' as const,
          priority: 'high' as const,
          title: 'Hire Cloud Architecture Lead',
          description: 'Need senior expertise to guide cloud migration',
          cost: 150000,
          timeMonths: 3,
          expectedROI: 500000
        }
      ]
    };

    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "skills analysis failure" });
  }
});

// POST /api/analyses/performance - Mock performance analysis
router.post("/performance", async (req, res) => {
  try {
    const { employeeId } = req.body;

    const result = {
      overallScore: Math.floor(70 + Math.random() * 25), // 70-95
      goals: [
        {
          id: '1',
          title: 'Complete Product Roadmap Q1',
          progress: 85,
          status: 'on-track' as const,
          dueDate: '2025-03-31'
        },
        {
          id: '2',
          title: 'Increase Team Velocity by 20%',
          progress: 60,
          status: 'at-risk' as const,
          dueDate: '2025-06-30'
        }
      ],
      metrics: {
        productivity: 82,
        quality: 88,
        collaboration: 76,
        innovation: 72
      },
      strengths: [
        'Strong technical leadership',
        'Excellent cross-team collaboration',
        'Consistent delivery quality'
      ],
      developmentAreas: [
        'Time management for competing priorities',
        'Delegation to team members',
        'Strategic thinking beyond immediate tasks'
      ],
      feedback: {
        recent: [
          {
            from: 'Manager',
            rating: 4.5,
            comment: 'Consistently delivers high-quality work and helps team members grow'
          },
          {
            from: 'Peer',
            rating: 4.0,
            comment: 'Great collaborator, always willing to help'
          }
        ],
        trends: 'Positive' as const
      },
      recommendations: [
        {
          priority: 'high' as const,
          title: 'Leadership Development Program',
          description: 'Invest in strategic leadership training to prepare for VP role',
          expectedImpact: 'Increase team effectiveness by 25%'
        }
      ]
    };

    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "performance analysis failure" });
  }
});

// POST /api/analyses/hiring - Mock hiring analysis
router.post("/hiring", async (req, res) => {
  try {
    const result = {
      hiringHealthScore: Math.floor(70 + Math.random() * 20), // 70-90
      metrics: {
        timeToHire: 32, // days
        costPerHire: 5200,
        offerAcceptanceRate: 78,
        qualityOfHire: 82
      },
      activeRequisitions: [
        {
          id: 'req-1',
          position: 'Senior Software Engineer',
          department: 'Engineering',
          status: 'active' as const,
          applicants: 45,
          daysOpen: 18
        },
        {
          id: 'req-2',
          position: 'Product Manager',
          department: 'Product',
          status: 'active' as const,
          applicants: 28,
          daysOpen: 12
        }
      ],
      topCandidates: [
        {
          id: 'cand-1',
          name: 'Sarah Johnson',
          position: 'Senior Software Engineer',
          stage: 'offer' as const,
          cultureFitScore: 88, // Based on 7-Cylinder framework
          skillsMatch: 92
        },
        {
          id: 'cand-2',
          name: 'Michael Chen',
          position: 'Product Manager',
          stage: 'interview' as const,
          cultureFitScore: 85,
          skillsMatch: 87
        }
      ],
      pipeline: {
        screening: 73,
        interview: 18,
        offer: 3,
        hired: 12,
        rejected: 145
      },
      recommendations: [
        {
          priority: 'high' as const,
          title: 'Improve Time to Hire',
          description: 'Average 32 days is above industry standard of 25 days',
          actions: [
            'Streamline interview scheduling',
            'Reduce interview rounds from 5 to 4',
            'Implement async video screening'
          ]
        }
      ]
    };

    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "hiring analysis failure" });
  }
});

// POST /api/analyses/lxp - Mock learning/LXP analysis
router.post("/lxp", async (req, res) => {
  try {
    const { employeeId } = req.body;

    const result = {
      overallEngagement: Math.floor(65 + Math.random() * 30), // 65-95
      metrics: {
        totalEnrollments: employeeId ? 5 : 247,
        completionRate: Math.floor(60 + Math.random() * 30), // 60-90
        engagementScore: Math.floor(70 + Math.random() * 25), // 70-95
        skillsAcquired: employeeId ? 8 : 142
      },
      learningPaths: [
        {
          id: 'lp-1',
          title: 'Leadership Fundamentals',
          category: 'Leadership',
          progress: 65,
          enrolledCount: 32,
          completionRate: 58,
          estimatedHours: 24
        },
        {
          id: 'lp-2',
          title: 'Cloud Architecture Mastery',
          category: 'Technical',
          progress: 40,
          enrolledCount: 18,
          completionRate: 35,
          estimatedHours: 40
        },
        {
          id: 'lp-3',
          title: 'Data Science Essentials',
          category: 'Technical',
          progress: 80,
          enrolledCount: 25,
          completionRate: 72,
          estimatedHours: 30
        }
      ],
      courses: [
        {
          id: 'course-1',
          title: 'Strategic Thinking',
          progress: 75,
          status: 'in-progress' as const,
          completedAt: null
        },
        {
          id: 'course-2',
          title: 'Python for Data Science',
          progress: 100,
          status: 'completed' as const,
          completedAt: '2025-09-15'
        }
      ],
      recommendations: [
        {
          priority: 'high' as const,
          title: 'Increase Course Completion Rates',
          description: 'Current 62% completion rate is below target of 75%',
          actions: [
            'Add more microlearning modules',
            'Implement completion incentives',
            'Improve course quality based on feedback'
          ]
        }
      ]
    };

    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "LXP analysis failure" });
  }
});

/**
 * POST /api/analyses/skills
 * Perform skills gap analysis for an organization
 */
router.post('/skills', async (req, res) => {
  try {
    console.log('🎯 Skills analysis endpoint called');

    const { tenantId, targetType = 'company' } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId is required for skills analysis'
      });
    }

    // Import SkillsAgent
    const { SkillsAgent } = await import('../services/agents/skills-agent.js');
    const skillsAgent = new SkillsAgent();

    console.log('📊 Running skills analysis for tenant:', tenantId);
    const startTime = Date.now();

    // Get tenant info for analysis
    const tenantInfo = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId)
    });

    if (!tenantInfo) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found'
      });
    }

    // Run the actual skills analysis
    const analysis = await skillsAgent.analyzeSkills({
      tenantId,
      companyId: tenantId,
      industry: tenantInfo.industry || 'General',
      organizationName: tenantInfo.name || 'Organization',
      strategy: tenantInfo.strategy || undefined
    });

    console.log('✅ Skills analysis complete:', {
      tenantId,
      overallScore: analysis.overallScore,
      criticalGapsCount: analysis.criticalGaps.length,
      executionTime: Date.now() - startTime
    });

    // Return the analysis results in the format the frontend expects
    return res.json({
      overallScore: analysis.overallScore,
      strategicAlignment: analysis.strategicAlignment,
      skillsCoverage: analysis.skillsCoverage,
      criticalGaps: analysis.criticalGaps,
      recommendations: analysis.recommendations,
      lxpTriggers: analysis.lxpTriggers || [],
      metadata: {
        analysisDate: new Date().toISOString(),
        executionTime: Date.now() - startTime,
        targetType,
        tenantId
      }
    });

  } catch (error: any) {
    console.error('❌ Skills analysis error:', error);
    return res.status(500).json({
      success: false,
      error: 'Skills analysis failed',
      details: error.message
    });
  }
});

export default router;
