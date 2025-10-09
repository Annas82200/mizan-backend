import { EnsembleAI } from "../../ai-providers/ensemble.js";
import { readFile } from 'fs/promises';
import { join } from 'path';

// Load Mizan 7-Cylinder Framework from JSON file
let DEFAULT_VALUES_FRAMEWORK: any = [];
try {
  const frameworkPath = join(process.cwd(), 'mizan-framework-updated.json');
  const frameworkData = await readFile(frameworkPath, 'utf-8');
  DEFAULT_VALUES_FRAMEWORK = JSON.parse(frameworkData);
} catch (error) {
  console.error('Failed to load Mizan framework:', error);
  DEFAULT_VALUES_FRAMEWORK = [];
}

// Note: runTriad is no longer used in this implementation
// The agent uses EnsembleAI directly throughout

export type PerformanceMetrics = {
  productivity: number;
  quality: number;
  innovation: number;
  collaboration: number;
  goalAttainment: number;
  efficiency: number;
  customerSatisfaction: number;
  timeToMarket: number;
};

export type PerformanceResult = {
  predictedProductivity: number; // 0..1
  currentMetrics: PerformanceMetrics;
  leadingIndicators: string[];
  laggingIndicators: string[];
  performanceDrivers: PerformanceDriver[];
  bottlenecks: Bottleneck[];
  focusCylinder: number;
  trendAnalysis: TrendAnalysis;
  predictiveInsights: PredictiveInsight[];
  recommendations: string[];
  interventions: PerformanceIntervention[];
  triad: { consensus: string; confidence: number };
  score: number;
  confidence: number;
};

export type PerformanceDriver = {
  factor: string;
  impact: "high" | "medium" | "low";
  correlation: number; // -1 to 1
  improvementPotential: number; // 0 to 100%
  linkedCylinder: number;
};

export type Bottleneck = {
  area: string;
  severity: "critical" | "high" | "medium" | "low";
  impactedMetrics: string[];
  rootCauses: string[];
  suggestedActions: string[];
};

export type TrendAnalysis = {
  overallTrend: "improving" | "stable" | "declining";
  metricTrends: Record<string, "up" | "stable" | "down">;
  projectedPerformance: number; // 0..1 for next quarter
  confidenceInterval: [number, number];
};

export type PredictiveInsight = {
  prediction: string;
  likelihood: "high" | "medium" | "low";
  timeframe: string;
  earlyWarningSignals: string[];
  preventiveActions: string[];
};

export type PerformanceIntervention = {
  name: string;
  type: "process" | "skills" | "tools" | "structure" | "culture";
  description: string;
  targetMetrics: string[];
  expectedImprovement: number; // percentage
  implementationTime: string;
  effort: "low" | "medium" | "high";
  dependencies: string[];
};

export async function analyzePerformance(input: {
  metrics?: Partial<PerformanceMetrics>;
  historicalData?: any[];
  tenantId?: string;
  industryBenchmarks?: any;
  teamStructure?: any;
}): Promise<PerformanceResult> {
  // Process current metrics
  const currentMetrics = processMetrics(input.metrics);
  
  // Analyze performance drivers
  const drivers = await analyzeDrivers(currentMetrics, input.historicalData, input.tenantId);
  
  // Identify bottlenecks
  const bottlenecks = await identifyBottlenecks(currentMetrics, drivers, input.teamStructure, input.tenantId);
  
  // Trend analysis
  const trendAnalysis = analyzeTrends(currentMetrics, input.historicalData);
  
  // Predictive insights
  const predictiveInsights = await generatePredictiveInsights(
    currentMetrics,
    trendAnalysis,
    drivers,
    bottlenecks,
    input.tenantId
  );
  
  // Calculate predicted productivity
  const predictedProductivity = calculatePredictedProductivity(
    currentMetrics,
    trendAnalysis,
    drivers,
    bottlenecks
  );
  
  // Identify leading and lagging indicators
  const { leadingIndicators, laggingIndicators } = identifyIndicators(currentMetrics, drivers);
  
  // Determine focus cylinder
  const focusCylinder = determineFocusCylinder(drivers, bottlenecks, currentMetrics);
  
  // Generate interventions
  const interventions = await generateInterventions(
    currentMetrics,
    drivers,
    bottlenecks,
    focusCylinder,
    input.tenantId
  );
  
  // Run ensemble AI analysis for final synthesis
  const ensemble = new EnsembleAI({
    strategy: "weighted",
    providers: ["openai", "anthropic", "gemini"]
  });

  const triadResponse = await ensemble.call({
    agent: "Performance",
    engine: "reasoning",
    tenantId: input.tenantId,
    prompt: `Analyze performance patterns and recommend strategies to enhance ${DEFAULT_VALUES_FRAMEWORK[focusCylinder - 1]?.name}-driven performance.

Context:
- Current productivity: ${Math.round(currentMetrics.productivity * 100)}%
- Predicted: ${Math.round(predictedProductivity * 100)}%
- Trend: ${trendAnalysis.overallTrend}
- Critical bottlenecks: ${bottlenecks.filter((b: any) => b.severity === "critical").length}`,
    temperature: 0.7,
    maxTokens: 2000
  });

  const triad = {
    consensus: triadResponse.narrative,
    confidence: triadResponse.confidence
  };

  // Compile recommendations
  const recommendations = compileRecommendations(
    drivers,
    bottlenecks,
    predictiveInsights,
    interventions
  );

  return {
    predictedProductivity,
    currentMetrics,
    leadingIndicators,
    laggingIndicators,
    performanceDrivers: drivers,
    bottlenecks,
    focusCylinder,
    trendAnalysis,
    predictiveInsights,
    recommendations,
    interventions,
    triad,
    score: predictedProductivity,
    confidence: triad.confidence
  };
}

function processMetrics(rawMetrics?: Partial<PerformanceMetrics>): PerformanceMetrics {
  // Default baseline metrics
  const defaults: PerformanceMetrics = {
    productivity: 0.65,
    quality: 0.72,
    innovation: 0.58,
    collaboration: 0.70,
    goalAttainment: 0.68,
    efficiency: 0.63,
    customerSatisfaction: 0.75,
    timeToMarket: 0.60
  };

  if (!rawMetrics) return defaults;

  // Merge and normalize
  const metrics: PerformanceMetrics = { ...defaults };
  
  for (const [key, value] of Object.entries(rawMetrics)) {
    if (key in metrics && typeof value === 'number') {
      metrics[key as keyof PerformanceMetrics] = Math.max(0, Math.min(1, value));
    }
  }

  return metrics;
}

async function analyzeDrivers(
  metrics: PerformanceMetrics,
  historicalData?: any[],
  tenantId?: string
): Promise<PerformanceDriver[]> {
  const ensemble = new EnsembleAI({
    strategy: "weighted",
    providers: ["openai", "claude", "gemini"]
  });

  // Statistical analysis of correlations
  const drivers: PerformanceDriver[] = [];

  // Known performance drivers from research
  const knownDrivers: Array<{
    factor: string;
    impactMetrics: (keyof PerformanceMetrics)[];
    cylinder: number;
  }> = [
    { factor: "Clear goal setting", impactMetrics: ["goalAttainment", "productivity"], cylinder: 1 },
    { factor: "Team collaboration", impactMetrics: ["collaboration", "innovation", "quality"], cylinder: 2 },
    { factor: "Skill-task fit", impactMetrics: ["productivity", "quality", "efficiency"], cylinder: 3 },
    { factor: "Decision autonomy", impactMetrics: ["innovation", "timeToMarket", "productivity"], cylinder: 4 },
    { factor: "Purpose alignment", impactMetrics: ["customerSatisfaction", "quality", "goalAttainment"], cylinder: 5 },
    { factor: "Continuous learning", impactMetrics: ["innovation", "efficiency", "quality"], cylinder: 6 },
    { factor: "Process optimization", impactMetrics: ["efficiency", "timeToMarket", "productivity"], cylinder: 6 }
  ];

  // Analyze each driver
  for (const driver of knownDrivers) {
    // Calculate average performance of impacted metrics
    const avgPerformance = driver.impactMetrics
      .map(metric => metrics[metric])
      .reduce((sum, val) => sum + val, 0) / driver.impactMetrics.length;

    // Determine impact level
    let impact: "high" | "medium" | "low" = "medium";
    if (avgPerformance < 0.5) impact = "high"; // High impact opportunity
    else if (avgPerformance > 0.75) impact = "low"; // Already performing well

    // Calculate correlation (simplified - in production use proper statistics)
    const correlation = avgPerformance < 0.5 ? -0.7 : avgPerformance > 0.75 ? 0.8 : 0.3;

    // Calculate improvement potential
    const improvementPotential = (1 - avgPerformance) * 100;

    drivers.push({
      factor: driver.factor,
      impact,
      correlation,
      improvementPotential,
      linkedCylinder: driver.cylinder
    });
  }

  // Get AI insights on additional drivers
  const prompt = `Analyze performance metrics:
${Object.entries(metrics).map(([k, v]) => `${k}: ${Math.round(v * 100)}%`).join(', ')}

Identify top 3 performance drivers not already covered.`;

  const response = await ensemble.call({
    agent: "Performance",
    engine: "reasoning",
    tenantId,
    prompt,
    temperature: 0.4
  });

  // Parse AI-identified drivers (simplified parsing)
  const aiDrivers = response.narrative
    .split(/\d+\.|•/)
    .filter((s: any) => s.trim().length > 10)
    .slice(0, 3)
    .map((driver: any) => ({
      factor: driver.trim().split('.')[0] || driver.trim(),
      impact: "medium" as const,
      correlation: 0.5,
      improvementPotential: 30,
      linkedCylinder: 6 // Default to Evolution
    }));

  return [...drivers, ...aiDrivers].sort((a, b) => b.improvementPotential - a.improvementPotential);
}

async function identifyBottlenecks(
  metrics: PerformanceMetrics,
  drivers: PerformanceDriver[],
  teamStructure?: any,
  tenantId?: string
): Promise<Bottleneck[]> {
  const bottlenecks: Bottleneck[] = [];

  // Check for metric-based bottlenecks
  for (const [metric, value] of Object.entries(metrics)) {
    if (value < 0.5) {
      const bottleneck = await analyzeBottleneck(metric as keyof PerformanceMetrics, value, drivers, tenantId);
      bottlenecks.push(bottleneck);
    }
  }

  // Check for structural bottlenecks
  if (teamStructure?.spanOfControl?.max > 10) {
    bottlenecks.push({
      area: "Organizational Structure",
      severity: "high",
      impactedMetrics: ["productivity", "communication", "efficiency"],
      rootCauses: [
        "Manager overload with too many direct reports",
        "Communication delays due to wide spans",
        "Insufficient 1:1 time with team members"
      ],
      suggestedActions: [
        "Add team lead layer to distribute management load",
        "Implement structured communication protocols",
        "Use asynchronous updates for routine matters"
      ]
    });
  }

  // Check for process bottlenecks
  if (metrics.timeToMarket < 0.5 && metrics.efficiency < 0.5) {
    bottlenecks.push({
      area: "Process Efficiency",
      severity: "critical",
      impactedMetrics: ["timeToMarket", "efficiency", "productivity"],
      rootCauses: [
        "Manual processes that could be automated",
        "Excessive approval layers",
        "Lack of standardized workflows"
      ],
      suggestedActions: [
        "Map and streamline critical processes",
        "Implement automation for repetitive tasks",
        "Reduce approval requirements for low-risk decisions"
      ]
    });
  }

  // Innovation bottlenecks
  if (metrics.innovation < 0.4) {
    bottlenecks.push({
      area: "Innovation Capacity",
      severity: "high",
      impactedMetrics: ["innovation", "goalAttainment", "customerSatisfaction"],
      rootCauses: [
        "Limited time for experimentation",
        "Risk-averse culture",
        "Lack of cross-functional collaboration"
      ],
      suggestedActions: [
        "Allocate 20% time for innovation projects",
        "Create safe-to-fail experiment framework",
        "Form cross-functional innovation teams"
      ]
    });
  }

  // Sort by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return bottlenecks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

async function analyzeBottleneck(
  metric: keyof PerformanceMetrics,
  value: number,
  drivers: PerformanceDriver[],
  tenantId?: string
): Promise<Bottleneck> {
  const ensemble = new EnsembleAI({
    strategy: "best_confidence",
    providers: ["claude", "openai"]
  });

  const relatedDrivers = drivers.filter(d => 
    d.factor.toLowerCase().includes(metric.toLowerCase()) || 
    d.improvementPotential > 50
  );

  const prompt = `Analyze performance bottleneck:
Metric: ${metric} at ${Math.round(value * 100)}% (below 50% threshold)
Related factors: ${relatedDrivers.map(d => d.factor).join(', ')}

Identify root causes and suggest specific actions.`;

  const response = await ensemble.call({
    agent: "Performance",
    engine: "reasoning",
    tenantId,
    prompt,
    temperature: 0.3
  });

  // Parse response for root causes and actions
  const narrative = response.narrative;
  const rootCauses: string[] = [];
  const suggestedActions: string[] = [];

  // Simple parsing (in production, use structured output)
  if (narrative.includes("cause")) {
    const causeSection = narrative.split("cause")[1]?.split(/[.!?]/)[0];
    if (causeSection) rootCauses.push(causeSection.trim());
  }

  // Default root causes based on metric
  const metricRootCauses: Record<string, string[]> = {
    productivity: ["Unclear priorities", "Tool inefficiencies", "Meeting overload"],
    quality: ["Insufficient review processes", "Skill gaps", "Rushed timelines"],
    innovation: ["Risk-averse culture", "Limited experimentation time", "Siloed teams"],
    collaboration: ["Poor communication tools", "Remote work challenges", "Conflicting goals"],
    efficiency: ["Manual processes", "Redundant work", "Poor resource allocation"]
  };

  rootCauses.push(...(metricRootCauses[metric] || []));

  // Generate actions
  suggestedActions.push(
    `Implement ${metric} improvement program`,
    `Set clear ${metric} targets and tracking`,
    `Provide ${metric}-focused training`
  );

  return {
    area: `${metric.charAt(0).toUpperCase() + metric.slice(1)} Performance`,
    severity: value < 0.3 ? "critical" : value < 0.4 ? "high" : "medium",
    impactedMetrics: [metric],
    rootCauses: rootCauses.slice(0, 3),
    suggestedActions: suggestedActions.slice(0, 3)
  };
}

function analyzeTrends(
  currentMetrics: PerformanceMetrics,
  historicalData?: any[]
): TrendAnalysis {
  // If no historical data, assume stable
  if (!historicalData || historicalData.length < 2) {
    return {
      overallTrend: "stable",
      metricTrends: Object.keys(currentMetrics).reduce((acc, key) => {
        acc[key] = "stable";
        return acc;
      }, {} as Record<string, "up" | "stable" | "down">),
      projectedPerformance: Object.values(currentMetrics).reduce((sum, val) => sum + val, 0) / Object.keys(currentMetrics).length,
      confidenceInterval: [0.5, 0.7]
    };
  }

  // Calculate trends
  const metricTrends: Record<string, "up" | "stable" | "down"> = {};
  const recentData = historicalData[historicalData.length - 1];
  
  for (const [metric, currentValue] of Object.entries(currentMetrics)) {
    const previousValue = recentData[metric] || currentValue;
    const change = currentValue - previousValue;
    
    if (change > 0.05) metricTrends[metric] = "up";
    else if (change < -0.05) metricTrends[metric] = "down";
    else metricTrends[metric] = "stable";
  }

  // Overall trend
  const upCount = Object.values(metricTrends).filter(t => t === "up").length;
  const downCount = Object.values(metricTrends).filter(t => t === "down").length;
  
  let overallTrend: "improving" | "stable" | "declining";
  if (upCount > downCount + 2) overallTrend = "improving";
  else if (downCount > upCount + 2) overallTrend = "declining";
  else overallTrend = "stable";

  // Simple projection
  const avgCurrent = Object.values(currentMetrics).reduce((sum, val) => sum + val, 0) / Object.keys(currentMetrics).length;
  const trendMultiplier = overallTrend === "improving" ? 1.05 : overallTrend === "declining" ? 0.95 : 1;
  const projectedPerformance = Math.min(1, avgCurrent * trendMultiplier);

  // Confidence interval
  const variance = overallTrend === "stable" ? 0.05 : 0.1;
  const confidenceInterval: [number, number] = [
    Math.max(0, projectedPerformance - variance),
    Math.min(1, projectedPerformance + variance)
  ];

  return {
    overallTrend,
    metricTrends,
    projectedPerformance,
    confidenceInterval
  };
}

async function generatePredictiveInsights(
  metrics: PerformanceMetrics,
  trends: TrendAnalysis,
  drivers: PerformanceDriver[],
  bottlenecks: Bottleneck[],
  tenantId?: string
): Promise<PredictiveInsight[]> {
  const insights: PredictiveInsight[] = [];

  // Critical bottleneck predictions
  const criticalBottlenecks = bottlenecks.filter((b: any) => b.severity === "critical");
  if (criticalBottlenecks.length > 0) {
    insights.push({
      prediction: `Performance will decline by 15-20% if ${criticalBottlenecks[0].area} bottleneck is not addressed`,
      likelihood: "high",
      timeframe: "3 months",
      earlyWarningSignals: [
        "Increasing cycle times",
        "Rising error rates",
        "Employee frustration indicators"
      ],
      preventiveActions: criticalBottlenecks[0].suggestedActions
    });
  }

  // Trend-based predictions
  if (trends.overallTrend === "declining") {
    insights.push({
      prediction: "Continued performance decline will impact team morale and retention",
      likelihood: "medium",
      timeframe: "6 months",
      earlyWarningSignals: [
        "Decreased engagement scores",
        "Increased absenteeism",
        "Quality complaints"
      ],
      preventiveActions: [
        "Implement performance recovery plan",
        "Address top 3 bottlenecks immediately",
        "Increase recognition and support"
      ]
    });
  }

  // Innovation predictions
  if (metrics.innovation < 0.5 && trends.metricTrends.innovation !== "up") {
    insights.push({
      prediction: "Innovation deficit will impact competitive position",
      likelihood: "high",
      timeframe: "12 months",
      earlyWarningSignals: [
        "Competitor advances",
        "Customer feature requests unmet",
        "Stagnant product development"
      ],
      preventiveActions: [
        "Launch innovation sprint program",
        "Create cross-functional innovation teams",
        "Establish innovation metrics and rewards"
      ]
    });
  }

  // Positive predictions
  const highPerformingMetrics = Object.entries(metrics).filter(([_, value]) => value > 0.8);
  if (highPerformingMetrics.length > 3) {
    insights.push({
      prediction: "High performance foundation enables breakthrough results",
      likelihood: "medium",
      timeframe: "6 months",
      earlyWarningSignals: [
        "Consistent goal exceeding",
        "Increased innovation proposals",
        "Rising customer satisfaction"
      ],
      preventiveActions: [
        "Maintain current practices",
        "Document and scale successful approaches",
        "Invest in advanced capabilities"
      ]
    });
  }

  return insights.sort((a, b) => {
    const likelihoodOrder = { high: 0, medium: 1, low: 2 };
    return likelihoodOrder[a.likelihood] - likelihoodOrder[b.likelihood];
  });
}

function calculatePredictedProductivity(
  metrics: PerformanceMetrics,
  trends: TrendAnalysis,
  drivers: PerformanceDriver[],
  bottlenecks: Bottleneck[]
): number {
  // Base productivity
  let productivity = metrics.productivity;

  // Trend adjustment
  if (trends.overallTrend === "improving") productivity *= 1.1;
  else if (trends.overallTrend === "declining") productivity *= 0.9;

  // Driver impact
  const highImpactDrivers = drivers.filter(d => d.impact === "high" && d.correlation > 0.5);
  productivity += highImpactDrivers.length * 0.05;

  // Bottleneck penalty
  const criticalBottlenecks = bottlenecks.filter((b: any) => b.severity === "critical");
  productivity -= criticalBottlenecks.length * 0.1;

  // Other metrics influence
  productivity = productivity * 0.5 + 
    (metrics.quality * 0.15) +
    (metrics.efficiency * 0.15) +
    (metrics.goalAttainment * 0.15) +
    (metrics.innovation * 0.05);

  return Math.max(0, Math.min(1, productivity));
}

function identifyIndicators(
  metrics: PerformanceMetrics,
  drivers: PerformanceDriver[]
): { leadingIndicators: string[]; laggingIndicators: string[] } {
  const leadingIndicators: string[] = [];
  const laggingIndicators: string[] = [];

  // Leading indicators (predictive)
  if (metrics.innovation > 0) leadingIndicators.push("Innovation rate");
  if (metrics.collaboration > 0) leadingIndicators.push("Team collaboration index");
  leadingIndicators.push("Employee engagement");
  leadingIndicators.push("Skill development hours");
  leadingIndicators.push("Process improvement suggestions");

  // Add driver-based leading indicators
  drivers
    .filter(d => d.impact === "high")
    .forEach(d => leadingIndicators.push(d.factor));

  // Lagging indicators (results)
  laggingIndicators.push("Goal attainment rate");
  laggingIndicators.push("Customer satisfaction scores");
  laggingIndicators.push("Quality metrics");
  laggingIndicators.push("Revenue per employee");
  laggingIndicators.push("Time to market");

  return {
    leadingIndicators: leadingIndicators.slice(0, 5),
    laggingIndicators: laggingIndicators.slice(0, 5)
  };
}

function determineFocusCylinder(
  drivers: PerformanceDriver[],
  bottlenecks: Bottleneck[],
  metrics: PerformanceMetrics
): number {
  // Count cylinder references
  const cylinderImpact: Record<number, number> = {};
  
  for (let i = 1; i <= 7; i++) {
    cylinderImpact[i] = 0;
  }

  // Weight by driver importance
  drivers.forEach(driver => {
    if (driver.impact === "high") {
      cylinderImpact[driver.linkedCylinder] += 3;
    } else if (driver.impact === "medium") {
      cylinderImpact[driver.linkedCylinder] += 2;
    } else {
      cylinderImpact[driver.linkedCylinder] += 1;
    }
  });

  // Consider performance gaps
  if (metrics.innovation < 0.5) cylinderImpact[6] += 5; // Evolution
  if (metrics.quality < 0.5) cylinderImpact[3] += 5; // Mastery
  if (metrics.collaboration < 0.5) cylinderImpact[2] += 5; // Belonging
  if (metrics.goalAttainment < 0.5) cylinderImpact[1] += 5; // Stability

  // Find highest impact cylinder
  const focusCylinder = Object.entries(cylinderImpact)
    .sort((a, b) => b[1] - a[1])[0];

  return Number(focusCylinder[0]);
}

async function generateInterventions(
  metrics: PerformanceMetrics,
  drivers: PerformanceDriver[],
  bottlenecks: Bottleneck[],
  focusCylinder: number,
  tenantId?: string
): Promise<PerformanceIntervention[]> {
  const interventions: PerformanceIntervention[] = [];

  // Address critical bottlenecks first
  for (const bottleneck of bottlenecks.filter((b: any) => b.severity === "critical")) {
    interventions.push({
      name: `${bottleneck.area} Recovery Plan`,
      type: "process",
      description: `Comprehensive intervention to address ${bottleneck.area} bottleneck`,
      targetMetrics: bottleneck.impactedMetrics,
      expectedImprovement: 25,
      implementationTime: "2 months",
      effort: "high",
      dependencies: ["Leadership commitment", "Resource allocation", "Team buy-in"]
    });
  }

  // Cylinder-specific intervention
  const cylinderInfo = DEFAULT_VALUES_FRAMEWORK[focusCylinder - 1];
  if (cylinderInfo) {
    interventions.push({
      name: `${cylinderInfo.name} Excellence Program`,
      type: "culture",
      description: `Strengthen ${cylinderInfo.name} practices across the organization`,
      targetMetrics: ["productivity", "quality", "collaboration"],
      expectedImprovement: 20,
      implementationTime: "3 months",
      effort: "medium",
      dependencies: ["Values alignment", "Training resources"]
    });
  }

  // Metric-specific interventions
  for (const [metric, value] of Object.entries(metrics)) {
    if (value < 0.5) {
      interventions.push(createMetricIntervention(metric as keyof PerformanceMetrics, value));
    }
  }

  // Innovation intervention if needed
  if (metrics.innovation < 0.6) {
    interventions.push({
      name: "Innovation Accelerator",
      type: "structure",
      description: "Create dedicated innovation time and resources",
      targetMetrics: ["innovation", "timeToMarket"],
      expectedImprovement: 30,
      implementationTime: "4 months",
      effort: "medium",
      dependencies: ["Budget approval", "Time allocation", "Executive sponsorship"]
    });
  }

  // Quick wins
  interventions.push({
    name: "Performance Quick Wins",
    type: "process",
    description: "Implement immediate improvements for visible impact",
    targetMetrics: ["efficiency", "productivity"],
    expectedImprovement: 10,
    implementationTime: "1 month",
    effort: "low",
    dependencies: ["Team participation"]
  });

  return interventions
    .sort((a, b) => {
      // Sort by impact/effort ratio
      const ratioA = a.expectedImprovement / (a.effort === "low" ? 1 : a.effort === "medium" ? 2 : 3);
      const ratioB = b.expectedImprovement / (b.effort === "low" ? 1 : b.effort === "medium" ? 2 : 3);
      return ratioB - ratioA;
    })
    .slice(0, 5);
}

function createMetricIntervention(metric: keyof PerformanceMetrics, value: number): PerformanceIntervention {
  const interventionMap: Record<keyof PerformanceMetrics, PerformanceIntervention> = {
    productivity: {
      name: "Productivity Enhancement Initiative",
      type: "tools",
      description: "Upgrade tools and workflows for productivity gains",
      targetMetrics: ["productivity", "efficiency"],
      expectedImprovement: 20,
      implementationTime: "2 months",
      effort: "medium",
      dependencies: ["Tool selection", "Training plan"]
    },
    quality: {
      name: "Quality Excellence Program",
      type: "process",
      description: "Implement quality gates and continuous improvement",
      targetMetrics: ["quality", "customerSatisfaction"],
      expectedImprovement: 25,
      implementationTime: "3 months",
      effort: "medium",
      dependencies: ["Quality standards", "Review processes"]
    },
    innovation: {
      name: "Innovation Lab",
      type: "structure",
      description: "Create innovation lab with dedicated resources",
      targetMetrics: ["innovation", "timeToMarket"],
      expectedImprovement: 35,
      implementationTime: "4 months",
      effort: "high",
      dependencies: ["Budget", "Space", "Facilitators"]
    },
    collaboration: {
      name: "Collaboration Transformation",
      type: "culture",
      description: "Enhance cross-functional collaboration practices",
      targetMetrics: ["collaboration", "productivity"],
      expectedImprovement: 20,
      implementationTime: "2 months",
      effort: "low",
      dependencies: ["Communication tools", "Team workshops"]
    },
    goalAttainment: {
      name: "OKR Implementation",
      type: "process",
      description: "Implement objectives and key results framework",
      targetMetrics: ["goalAttainment", "productivity"],
      expectedImprovement: 30,
      implementationTime: "3 months",
      effort: "medium",
      dependencies: ["Training", "Tracking system"]
    },
    efficiency: {
      name: "Process Automation",
      type: "tools",
      description: "Automate repetitive tasks and streamline workflows",
      targetMetrics: ["efficiency", "productivity"],
      expectedImprovement: 25,
      implementationTime: "3 months",
      effort: "medium",
      dependencies: ["Automation tools", "Process mapping"]
    },
    customerSatisfaction: {
      name: "Customer Excellence",
      type: "skills",
      description: "Enhance customer service skills and processes",
      targetMetrics: ["customerSatisfaction", "quality"],
      expectedImprovement: 20,
      implementationTime: "2 months",
      effort: "low",
      dependencies: ["Training program", "Feedback system"]
    },
    timeToMarket: {
      name: "Agile Acceleration",
      type: "process",
      description: "Implement agile practices to reduce cycle time",
      targetMetrics: ["timeToMarket", "efficiency"],
      expectedImprovement: 30,
      implementationTime: "3 months",
      effort: "medium",
      dependencies: ["Agile training", "Tool adoption"]
    }
  };

  return interventionMap[metric];
}

function compileRecommendations(
  drivers: PerformanceDriver[],
  bottlenecks: Bottleneck[],
  insights: PredictiveInsight[],
  interventions: PerformanceIntervention[]
): string[] {
  const recommendations: string[] = [];

  // Address critical bottlenecks
  const critical = bottlenecks.filter((b: any) => b.severity === "critical");
  if (critical.length > 0) {
    recommendations.push(`URGENT: Address ${critical[0].area} bottleneck immediately to prevent performance collapse`);
  }

  // Leverage high-impact drivers
  const topDriver = drivers.find(d => d.impact === "high" && d.improvementPotential > 50);
  if (topDriver) {
    recommendations.push(`Focus on ${topDriver.factor} for ${Math.round(topDriver.improvementPotential)}% improvement potential`);
  }

  // Quick wins
  const quickWin = interventions.find(i => i.implementationTime.includes("1 month"));
  if (quickWin) {
    recommendations.push(`Quick win: ${quickWin.name} can deliver ${quickWin.expectedImprovement}% improvement in 30 days`);
  }

  // Predictive action
  const highLikelihood = insights.find(i => i.likelihood === "high");
  if (highLikelihood) {
    recommendations.push(`Proactive: ${highLikelihood.preventiveActions[0]} to avoid predicted issues`);
  }

  // Strategic recommendation
  const strategicIntervention = interventions.find(i => i.type === "culture" || i.type === "structure");
  if (strategicIntervention) {
    recommendations.push(`Strategic: ${strategicIntervention.name} for sustainable performance improvement`);
  }

  return recommendations.slice(0, 5);
}
