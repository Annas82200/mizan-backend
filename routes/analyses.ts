import { Router } from "express";
import { analyzeStructure } from "../services/agents/structure-agent.js";
import { analyzeCulture } from "../services/agents/culture-agent.js";
import { runArchitectAI } from "../services/orchestrator/architect-ai.js";
import { buildUnifiedResults } from "../services/results/unified-results.js";
import { runTriggers } from "../services/results/trigger-engine.js";
import { db } from "../db/index.js";
import { organizationStructure } from "../db/schema/strategy.js";
import { eq } from "drizzle-orm";

const router = Router();

interface Role {
  id: string;
  name: string;
  level: number;
  reports: string | null;
  children?: Role[];
}

interface StructureData {
  roles: Role[];
  hierarchy: Role;
  uploadedAt: string;
}

function calculateRealStructureAnalysis(structureData: StructureData) {
  const { roles } = structureData;

  // Calculate span of control for each manager
  const managerSpans = new Map<string, number>();
  roles.forEach(role => {
    if (role.reports) {
      managerSpans.set(role.reports, (managerSpans.get(role.reports) || 0) + 1);
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
  managerSpans.forEach((span, managerName) => {
    if (span > 10) {
      outliers.push({
        role: managerName,
        span,
        recommendation: `Consider adding middle management layer or splitting into ${Math.ceil(span / 7)} teams`
      });
    }
  });

  // Layer analysis
  const maxLevel = Math.max(...roles.map(r => r.level));
  const totalLayers = maxLevel + 1;

  // Find bottlenecks (layers with high avg span)
  const layerCounts = new Map<number, Role[]>();
  roles.forEach(role => {
    if (!layerCounts.has(role.level)) {
      layerCounts.set(role.level, []);
    }
    layerCounts.get(role.level)!.push(role);
  });

  const bottlenecks: Array<{ layer: number; roles: string[]; issue: string }> = [];
  layerCounts.forEach((rolesInLayer, layer) => {
    if (layer > 0 && layer < maxLevel) {
      const childCount = roles.filter(r => r.level === layer + 1).length;
      const avgChildrenPerRole = childCount / rolesInLayer.length;
      if (avgChildrenPerRole > 8) {
        bottlenecks.push({
          layer,
          roles: rolesInLayer.map(r => r.name),
          issue: `High span at this layer (avg ${avgChildrenPerRole.toFixed(1)} reports per manager)`
        });
      }
    }
  });

  // Calculate overall score
  const spanScore = averageSpan >= 4 && averageSpan <= 8 ? 100 : Math.max(0, 100 - Math.abs(averageSpan - 6) * 10);
  const layerScore = totalLayers <= 5 ? 100 : Math.max(0, 100 - (totalLayers - 5) * 15);
  const overallScore = Math.round((spanScore + layerScore) / 2);

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

  return {
    overallScore,
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
    strategyAlignment: {
      score: 75, // Placeholder - would need strategy data to calculate
      misalignments: []
    },
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

    const structureData = structures[0].structureData as StructureData;

    // Calculate real analysis from actual data
    const result = calculateRealStructureAnalysis(structureData);

    return res.json(result);
  } catch (e: any) {
    console.error('Structure analysis error:', e);
    return res.status(500).json({ error: e?.message || "structure failure" });
  }
});

// POST /api/analyses/culture
router.post("/culture", async (req, res) => {
  try {
    const result = await analyzeCulture(req.body || {});
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "culture failure" });
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

export default router;
