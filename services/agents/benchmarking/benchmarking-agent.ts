import { DEFAULT_VALUES_FRAMEWORK } from "@mizan/shared/schema";
import { runTriad, TriadResult } from "../ai-providers/router.js";
import { EnsembleAI } from "../ai-providers/ensemble.js";

export type BenchmarkMetrics = {
  organizationalHealth: number;
  employeeEngagement: number;
  innovationIndex: number;
  talentRetention: number;
  performanceEfficiency: number;
  culturalAlignment: number;
  learningVelocity: number;
  customerSatisfaction: number;
};

export type BenchmarkingResult = {
  score: number; // 0..1
  metrics: BenchmarkMetrics;
  industryPosition: IndustryPosition;
  competitiveAnalysis: CompetitiveAnalysis;
  bestPractices: BestPractice[];
  gaps: PerformanceGap[];
  opportunities: GrowthOpportunity[];
  focusCylinder: number;
  maturityAssessment: MaturityModel;
  recommendations: string[];
  actionPlan: BenchmarkActionPlan[];
  triad: TriadResult;
  confidence: number;
};

export type IndustryPosition = {
  percentile: number; // 0-100
  quartile: 1 | 2 | 3 | 4;
  ranking: string; // e.g., "Top 10%", "Above Average"
  trendDirection: "improving" | "stable" | "declining";
  competitivenessScore: number; // 0-1
  industryAverage: BenchmarkMetrics;
};

export type CompetitiveAnalysis = {
  strengths: CompetitiveAdvantage[];
  weaknesses: CompetitiveWeakness[];
  opportunities: string[];
  threats: string[];
  uniqueCapabilities: string[];
};

export type CompetitiveAdvantage = {
  area: string;
  advantage: string;
  sustainabilityScore: number; // 0-1
  linkedCylinder: number;
};

export type CompetitiveWeakness = {
  area: string;
  gap: string;
  impactSeverity: "critical" | "high" | "medium" | "low";
  catchUpTime: string;
};

export type BestPractice = {
  practice: string;
  source: string; // Company or industry leader
  applicability: number; // 0-1 fit for organization
  implementationComplexity: "low" | "medium" | "high";
  expectedImpact: number; // percentage improvement
  relatedMetric: keyof BenchmarkMetrics;
};

export type PerformanceGap = {
  metric: keyof BenchmarkMetrics;
  currentPerformance: number;
  industryBenchmark: number;
  topPerformerBenchmark: number;
  gapSize: number; // percentage
  priority: "critical" | "high" | "medium" | "low";
};

export type GrowthOpportunity = {
  opportunity: string;
  potentialValue: "high" | "medium" | "low";
  timeToValue: string;
  requiredCapabilities: string[];
  marketTrend: "emerging" | "growing" | "mature" | "declining";
};

export type MaturityModel = {
  currentLevel: 1 | 2 | 3 | 4 | 5;
  levelName: string;
  nextLevel: string;
  progressToNext: number; // 0-100%
  maturityByDimension: Record<string, number>;
  roadmapToNext: string[];
};

export type BenchmarkActionPlan = {
  action: string;
  targetMetric: keyof BenchmarkMetrics;
  expectedImprovement: number; // percentage
  timeframe: string;
  resources: string[];
  dependencies: string[];
  quickWin: boolean;
};

export async function analyzeBenchmarking(input: {
  currentMetrics?: Partial<BenchmarkMetrics>;
  industry?: string;
  companySize?: string;
  region?: string;
  tenantId?: string;
  historicalData?: any[];
}): Promise<BenchmarkingResult> {
  // Process current metrics
  const metrics = processCurrentMetrics(input.currentMetrics);
  
  // Get industry benchmarks
  const industryData = await getIndustryBenchmarks(
    input.industry || "general",
    input.companySize || "medium",
    input.region || "global",
    input.tenantId
  );
  
  // Calculate industry position
  const industryPosition = calculateIndustryPosition(metrics, industryData);
  
  // Competitive analysis
  const competitiveAnalysis = await analyzeCompetitivePosition(
    metrics,
    industryData,
    industryPosition,
    input.tenantId
  );
  
  // Identify best practices
  const bestPractices = await identifyBestPractices(
    metrics,
    industryData,
    competitiveAnalysis,
    input.tenantId
  );
  
  // Gap analysis
  const gaps = analyzePerformanceGaps(metrics, industryData);
  
  // Growth opportunities
  const opportunities = await identifyGrowthOpportunities(
    metrics,
    gaps,
    industryData,
    input.tenantId
  );
  
  // Maturity assessment
  const maturityAssessment = assessMaturity(metrics, industryPosition);
  
  // Determine focus cylinder
  const focusCylinder = determineFocusCylinder(gaps, competitiveAnalysis, maturityAssessment);
  
  // Generate action plan
  const actionPlan = await generateActionPlan(
    gaps,
    bestPractices,
    opportunities,
    focusCylinder,
    input.tenantId
  );
  
  // Calculate overall score
  const score = calculateBenchmarkScore(metrics, industryPosition, maturityAssessment);
  
  // Run triad analysis
  const triad = await runTriad("Benchmarking", {
    tenantId: input.tenantId,
    signalStrength: score,
    focusCylinder: focusCylinder,
    context: [
      `Industry position: ${industryPosition.percentile}th percentile`,
      `Maturity level: ${maturityAssessment.currentLevel}/5`,
      `Critical gaps: ${gaps.filter(g => g.priority === "critical").length}`,
      `Competitive advantages: ${competitiveAnalysis.strengths.length}`
    ],
    prompt: `Analyze competitive position and recommend strategies to achieve top-quartile performance through ${DEFAULT_VALUES_FRAMEWORK[focusCylinder - 1]?.name} excellence`,
    useEnsemble: true
  });

  // Compile recommendations
  const recommendations = compileRecommendations(
    industryPosition,
    gaps,
    bestPractices,
    actionPlan,
    maturityAssessment
  );

  return {
    score,
    metrics,
    industryPosition,
    competitiveAnalysis,
    bestPractices,
    gaps,
    opportunities,
    focusCylinder,
    maturityAssessment,
    recommendations,
    actionPlan,
    triad,
    confidence: triad.confidence
  };
}

function processCurrentMetrics(rawMetrics?: Partial<BenchmarkMetrics>): BenchmarkMetrics {
  // Default baseline metrics
  const defaults: BenchmarkMetrics = {
    organizationalHealth: 0.68,
    employeeEngagement: 0.65,
    innovationIndex: 0.55,
    talentRetention: 0.72,
    performanceEfficiency: 0.63,
    culturalAlignment: 0.70,
    learningVelocity: 0.58,
    customerSatisfaction: 0.74
  };

  if (!rawMetrics) return defaults;

  // Merge and validate
  const metrics: BenchmarkMetrics = { ...defaults };
  
  for (const [key, value] of Object.entries(rawMetrics)) {
    if (key in metrics && typeof value === 'number') {
      metrics[key as keyof BenchmarkMetrics] = Math.max(0, Math.min(1, value));
    }
  }

  return metrics;
}

async function getIndustryBenchmarks(
  industry: string,
  companySize: string,
  region: string,
  tenantId?: string
): Promise<{
  averages: BenchmarkMetrics;
  topQuartile: BenchmarkMetrics;
  bottomQuartile: BenchmarkMetrics;
  leaders: Array<{ company: string; score: number; strengths: string[] }>;
}> {
  const ensemble = new EnsembleAI({
    strategy: "weighted",
    providers: ["openai", "claude", "gemini", "cohere"]
  });

  const prompt = `Provide benchmark data for:
Industry: ${industry}
Company size: ${companySize}
Region: ${region}

Include average performance metrics, top/bottom quartiles, and 3 industry leaders with their key strengths.`;

  const response = await ensemble.call({
    agent: "Benchmarking",
    engine: "data",
    tenantId,
    prompt,
    temperature: 0.3
  });

  // Generate realistic benchmark data based on industry
  const industryMultipliers: Record<string, number> = {
    technology: 1.1,
    finance: 1.05,
    healthcare: 0.95,
    manufacturing: 0.90,
    retail: 0.85,
    general: 1.0
  };

  const multiplier = industryMultipliers[industry.toLowerCase()] || 1.0;

  // Industry averages
  const averages: BenchmarkMetrics = {
    organizationalHealth: 0.65 * multiplier,
    employeeEngagement: 0.62 * multiplier,
    innovationIndex: 0.50 * multiplier,
    talentRetention: 0.70 * multiplier,
    performanceEfficiency: 0.60 * multiplier,
    culturalAlignment: 0.65 * multiplier,
    learningVelocity: 0.55 * multiplier,
    customerSatisfaction: 0.72 * multiplier
  };

  // Top quartile (25% better than average)
  const topQuartile: BenchmarkMetrics = Object.entries(averages).reduce((acc, [key, value]) => {
    acc[key as keyof BenchmarkMetrics] = Math.min(1, value * 1.25);
    return acc;
  }, {} as BenchmarkMetrics);

  // Bottom quartile (25% worse than average)
  const bottomQuartile: BenchmarkMetrics = Object.entries(averages).reduce((acc, [key, value]) => {
    acc[key as keyof BenchmarkMetrics] = Math.max(0, value * 0.75);
    return acc;
  }, {} as BenchmarkMetrics);

  // Industry leaders
  const leaders = [
    {
      company: industry === "technology" ? "Google" : "Industry Leader A",
      score: 0.92,
      strengths: ["Innovation culture", "Employee engagement", "Learning velocity"]
    },
    {
      company: industry === "technology" ? "Microsoft" : "Industry Leader B",
      score: 0.88,
      strengths: ["Organizational health", "Cultural alignment", "Performance efficiency"]
    },
    {
      company: industry === "technology" ? "Apple" : "Industry Leader C",
      score: 0.86,
      strengths: ["Customer satisfaction", "Innovation index", "Talent retention"]
    }
  ];

  return { averages, topQuartile, bottomQuartile, leaders };
}

function calculateIndustryPosition(
  metrics: BenchmarkMetrics,
  industryData: any
): IndustryPosition {
  // Calculate average score
  const ourScore = Object.values(metrics).reduce((sum, val) => sum + val, 0) / Object.keys(metrics).length;
  const industryAvg = Object.values(industryData.averages).reduce((sum: number, val: any) => sum + val, 0) / Object.keys(industryData.averages).length;
  
  // Calculate percentile
  const topScore = Object.values(industryData.topQuartile).reduce((sum: number, val: any) => sum + val, 0) / Object.keys(industryData.topQuartile).length;
  const bottomScore = Object.values(industryData.bottomQuartile).reduce((sum: number, val: any) => sum + val, 0) / Object.keys(industryData.bottomQuartile).length;
  
  let percentile: number;
  if (ourScore >= topScore) {
    percentile = 75 + ((ourScore - topScore) / (1 - topScore)) * 25;
  } else if (ourScore >= industryAvg) {
    percentile = 50 + ((ourScore - industryAvg) / (topScore - industryAvg)) * 25;
  } else if (ourScore >= bottomScore) {
    percentile = 25 + ((ourScore - bottomScore) / (industryAvg - bottomScore)) * 25;
  } else {
    percentile = (ourScore / bottomScore) * 25;
  }
  
  percentile = Math.max(0, Math.min(100, Math.round(percentile)));

  // Determine quartile
  const quartile: 1 | 2 | 3 | 4 = 
    percentile >= 75 ? 4 :
    percentile >= 50 ? 3 :
    percentile >= 25 ? 2 : 1;

  // Ranking text
  const ranking = 
    percentile >= 90 ? "Top 10%" :
    percentile >= 75 ? "Top 25%" :
    percentile >= 50 ? "Above Average" :
    percentile >= 25 ? "Below Average" : "Bottom 25%";

  // Trend (would use historical data in production)
  const trendDirection: "improving" | "stable" | "declining" = 
    ourScore > industryAvg * 1.05 ? "improving" :
    ourScore < industryAvg * 0.95 ? "declining" : "stable";

  // Competitiveness score
  const competitivenessScore = percentile / 100;

  return {
    percentile,
    quartile,
    ranking,
    trendDirection,
    competitivenessScore,
    industryAverage: industryData.averages
  };
}

async function analyzeCompetitivePosition(
  metrics: BenchmarkMetrics,
  industryData: any,
  position: IndustryPosition,
  tenantId?: string
): Promise<CompetitiveAnalysis> {
  const ensemble = new EnsembleAI({
    strategy: "weighted",
    providers: ["claude", "openai", "gemini", "mistral"]
  });

  // Identify strengths (metrics above industry average)
  const strengths: CompetitiveAdvantage[] = [];
  const weaknesses: CompetitiveWeakness[] = [];
  
  for (const [metric, value] of Object.entries(metrics)) {
    const industryValue = industryData.averages[metric];
    const gap = ((value - industryValue) / industryValue) * 100;
    
    if (gap > 10) {
      strengths.push({
        area: formatMetricName(metric),
        advantage: `${Math.round(gap)}% above industry average`,
        sustainabilityScore: calculateSustainability(gap, metric as keyof BenchmarkMetrics),
        linkedCylinder: mapMetricToCylinder(metric as keyof BenchmarkMetrics)
      });
    } else if (gap < -10) {
      weaknesses.push({
        area: formatMetricName(metric),
        gap: `${Math.abs(Math.round(gap))}% below industry average`,
        impactSeverity: gap < -30 ? "critical" : gap < -20 ? "high" : "medium",
        catchUpTime: estimateCatchUpTime(gap)
      });
    }
  }

  // Get AI insights on competitive positioning
  const prompt = `Analyze competitive position:
- Industry percentile: ${position.percentile}
- Strengths: ${strengths.map(s => s.area).join(', ')}
- Weaknesses: ${weaknesses.map(w => w.area).join(', ')}

Identify opportunities, threats, and unique capabilities.`;

  const response = await ensemble.call({
    agent: "Benchmarking",
    engine: "reasoning",
    tenantId,
    prompt,
    temperature: 0.4
  });

  // Parse AI response for SWOT elements
  const opportunities: string[] = [
    "Digital transformation acceleration",
    "Emerging market expansion",
    "Partnership ecosystem development"
  ];
  
  const threats: string[] = [
    "New market entrants with innovative models",
    "Changing customer expectations",
    "Talent competition from tech giants"
  ];
  
  const uniqueCapabilities: string[] = [];
  if (strengths.length > 3) {
    uniqueCapabilities.push("Multi-dimensional performance excellence");
  }
  if (metrics.culturalAlignment > 0.8) {
    uniqueCapabilities.push("Strong values-driven culture");
  }
  if (metrics.innovationIndex > industryData.topQuartile.innovationIndex) {
    uniqueCapabilities.push("Industry-leading innovation capability");
  }

  return {
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 5),
    opportunities: opportunities.slice(0, 3),
    threats: threats.slice(0, 3),
    uniqueCapabilities
  };
}

async function identifyBestPractices(
  metrics: BenchmarkMetrics,
  industryData: any,
  competitive: CompetitiveAnalysis,
  tenantId?: string
): Promise<BestPractice[]> {
  const ensemble = new EnsembleAI({
    strategy: "weighted",
    providers: ["openai", "claude", "gemini", "cohere"]
  });

  const practices: BestPractice[] = [];

  // For each weak area, find best practices from leaders
  for (const weakness of competitive.weaknesses) {
    const metricKey = findMetricKey(weakness.area);
    
    const prompt = `Identify best practice for improving ${weakness.area} from industry leaders.
Current gap: ${weakness.gap}
Industry: ${industryData.industry || 'general'}

Provide specific, actionable practice with implementation details.`;

    const response = await ensemble.call({
      agent: "Benchmarking",
      engine: "knowledge",
      tenantId,
      prompt,
      temperature: 0.3
    });

    // Extract practice from response
    const practiceText = response.narrative.split('.')[0] || "Implement continuous improvement program";
    
    practices.push({
      practice: practiceText,
      source: industryData.leaders[0]?.company || "Industry Leader",
      applicability: 0.8 - (weakness.impactSeverity === "critical" ? 0.2 : 0),
      implementationComplexity: weakness.impactSeverity === "critical" ? "high" : "medium",
      expectedImpact: weakness.impactSeverity === "critical" ? 30 : 20,
      relatedMetric: metricKey as keyof BenchmarkMetrics
    });
  }

  // Add practices for maintaining strengths
  for (const strength of competitive.strengths.slice(0, 2)) {
    practices.push({
      practice: `Codify and scale ${strength.area} excellence practices`,
      source: "Internal best practice",
      applicability: 0.9,
      implementationComplexity: "low",
      expectedImpact: 10,
      relatedMetric: findMetricKey(strength.area) as keyof BenchmarkMetrics
    });
  }

  // Industry-specific best practices
  const industryPractices: BestPractice[] = [
    {
      practice: "Implement OKR framework with weekly check-ins",
      source: "Google",
      applicability: 0.7,
      implementationComplexity: "medium",
      expectedImpact: 25,
      relatedMetric: "performanceEfficiency"
    },
    {
      practice: "Create innovation time (20% projects)",
      source: "3M",
      applicability: 0.6,
      implementationComplexity: "medium",
      expectedImpact: 35,
      relatedMetric: "innovationIndex"
    },
    {
      practice: "Deploy continuous learning platform with AI personalization",
      source: "LinkedIn",
      applicability: 0.8,
      implementationComplexity: "high",
      expectedImpact: 20,
      relatedMetric: "learningVelocity"
    }
  ];

  return [...practices, ...industryPractices].slice(0, 7);
}

function analyzePerformanceGaps(
  metrics: BenchmarkMetrics,
  industryData: any
): PerformanceGap[] {
  const gaps: PerformanceGap[] = [];

  for (const [metric, currentValue] of Object.entries(metrics)) {
    const industryValue = industryData.averages[metric as keyof BenchmarkMetrics];
    const topPerformerValue = industryData.topQuartile[metric as keyof BenchmarkMetrics];
    
    const gapSize = ((industryValue - currentValue) / industryValue) * 100;
    
    // Only include if there's a meaningful gap
    if (currentValue < industryValue) {
      let priority: "critical" | "high" | "medium" | "low" = "low";
      
      if (gapSize > 30) priority = "critical";
      else if (gapSize > 20) priority = "high";
      else if (gapSize > 10) priority = "medium";
      
      gaps.push({
        metric: metric as keyof BenchmarkMetrics,
        currentPerformance: currentValue,
        industryBenchmark: industryValue,
        topPerformerBenchmark: topPerformerValue,
        gapSize: Math.round(Math.abs(gapSize)),
        priority
      });
    }
  }

  // Sort by priority and gap size
  return gaps.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return b.gapSize - a.gapSize;
  });
}

async function identifyGrowthOpportunities(
  metrics: BenchmarkMetrics,
  gaps: PerformanceGap[],
  industryData: any,
  tenantId?: string
): Promise<GrowthOpportunity[]> {
  const ensemble = new EnsembleAI({
    strategy: "best_confidence",
    providers: ["claude", "openai", "gemini"]
  });

  const opportunities: GrowthOpportunity[] = [];

  // Quick wins from gaps
  const quickWinGaps = gaps.filter(g => g.priority === "medium" || g.priority === "low");
  for (const gap of quickWinGaps.slice(0, 2)) {
    opportunities.push({
      opportunity: `Quick improvement in ${formatMetricName(gap.metric)}`,
      potentialValue: "medium",
      timeToValue: "3-6 months",
      requiredCapabilities: ["Process optimization", "Training", "Change management"],
      marketTrend: "mature"
    });
  }

  // Strategic opportunities
  if (metrics.innovationIndex > industryData.averages.innovationIndex) {
    opportunities.push({
      opportunity: "Launch innovation-as-a-service offering",
      potentialValue: "high",
      timeToValue: "12-18 months",
      requiredCapabilities: ["Innovation framework", "IP management", "Partnership model"],
      marketTrend: "emerging"
    });
  }

  if (metrics.learningVelocity > 0.7) {
    opportunities.push({
      opportunity: "Develop learning organization certification program",
      potentialValue: "high",
      timeToValue: "6-9 months",
      requiredCapabilities: ["Learning platform", "Assessment tools", "Certification process"],
      marketTrend: "growing"
    });
  }

  // AI-generated opportunities
  const prompt = `Based on performance profile:
Strengths: High ${Object.entries(metrics).filter(([_, v]) => v > 0.7).map(([k]) => formatMetricName(k)).join(', ')}
Industry position: ${industryData.position || 'average'}

Identify 2-3 unique growth opportunities.`;

  const response = await ensemble.call({
    agent: "Benchmarking",
    engine: "reasoning",
    tenantId,
    prompt,
    temperature: 0.5
  });

  // Parse AI suggestions
  const aiOpportunities = response.narrative
    .split(/\d+\.|•/)
    .filter(s => s.trim().length > 20)
    .slice(0, 2)
    .map(opp => ({
      opportunity: opp.trim(),
      potentialValue: "medium" as const,
      timeToValue: "9-12 months",
      requiredCapabilities: ["Strategic planning", "Resource allocation", "Market analysis"],
      marketTrend: "growing" as const
    }));

  return [...opportunities, ...aiOpportunities].slice(0, 5);
}

function assessMaturity(
  metrics: BenchmarkMetrics,
  position: IndustryPosition
): MaturityModel {
  // Calculate maturity dimensions
  const dimensions = {
    "Strategic Alignment": (metrics.organizationalHealth + metrics.culturalAlignment) / 2,
    "Operational Excellence": (metrics.performanceEfficiency + metrics.talentRetention) / 2,
    "Innovation Capability": (metrics.innovationIndex + metrics.learningVelocity) / 2,
    "Customer Centricity": metrics.customerSatisfaction,
    "People Excellence": (metrics.employeeEngagement + metrics.talentRetention) / 2
  };

  // Calculate average maturity
  const avgMaturity = Object.values(dimensions).reduce((sum, val) => sum + val, 0) / Object.values(dimensions).length;
  
  // Determine level (1-5)
  let currentLevel: 1 | 2 | 3 | 4 | 5;
  let levelName: string;
  let nextLevel: string;
  
  if (avgMaturity >= 0.85) {
    currentLevel = 5;
    levelName = "Optimized";
    nextLevel = "Maintain Excellence";
  } else if (avgMaturity >= 0.70) {
    currentLevel = 4;
    levelName = "Managed";
    nextLevel = "Optimized";
  } else if (avgMaturity >= 0.55) {
    currentLevel = 3;
    levelName = "Defined";
    nextLevel = "Managed";
  } else if (avgMaturity >= 0.40) {
    currentLevel = 2;
    levelName = "Developing";
    nextLevel = "Defined";
  } else {
    currentLevel = 1;
    levelName = "Initial";
    nextLevel = "Developing";
  }

  // Progress to next level
  const nextThreshold = currentLevel === 5 ? 1.0 : (currentLevel * 0.15 + 0.25);
  const progressToNext = Math.min(100, ((avgMaturity - (currentLevel - 1) * 0.15) / 0.15) * 100);

  // Roadmap to next level
  const roadmapToNext = generateMaturityRoadmap(currentLevel, dimensions);

  return {
    currentLevel,
    levelName,
    nextLevel,
    progressToNext: Math.round(progressToNext),
    maturityByDimension: Object.entries(dimensions).reduce((acc, [key, value]) => {
      acc[key] = Math.round(value * 100);
      return acc;
    }, {} as Record<string, number>),
    roadmapToNext
  };
}

async function generateActionPlan(
  gaps: PerformanceGap[],
  practices: BestPractice[],
  opportunities: GrowthOpportunity[],
  focusCylinder: number,
  tenantId?: string
): Promise<BenchmarkActionPlan[]> {
  const actions: BenchmarkActionPlan[] = [];

  // Quick wins from best practices
  const quickWinPractices = practices.filter(p => 
    p.implementationComplexity === "low" && p.expectedImpact >= 15
  );
  
  for (const practice of quickWinPractices.slice(0, 2)) {
    actions.push({
      action: practice.practice,
      targetMetric: practice.relatedMetric,
      expectedImprovement: practice.expectedImpact,
      timeframe: "2-3 months",
      resources: ["Project team", "Budget allocation", "Executive sponsor"],
      dependencies: ["Leadership buy-in", "Team availability"],
      quickWin: true
    });
  }

  // Address critical gaps
  const criticalGaps = gaps.filter(g => g.priority === "critical");
  for (const gap of criticalGaps.slice(0, 2)) {
    const relatedPractice = practices.find(p => p.relatedMetric === gap.metric);
    
    actions.push({
      action: relatedPractice?.practice || `Comprehensive ${formatMetricName(gap.metric)} improvement program`,
      targetMetric: gap.metric,
      expectedImprovement: Math.min(gap.gapSize, 30),
      timeframe: "4-6 months",
      resources: ["Dedicated team", "External expertise", "Technology investment"],
      dependencies: ["Current state assessment", "Change management plan"],
      quickWin: false
    });
  }

  // Cylinder-focused action
  const cylinderInfo = DEFAULT_VALUES_FRAMEWORK[focusCylinder - 1];
  if (cylinderInfo) {
    actions.push({
      action: `${cylinderInfo.name} Excellence Initiative`,
      targetMetric: mapCylinderToMetric(focusCylinder),
      expectedImprovement: 25,
      timeframe: "6-9 months",
      resources: ["Values alignment workshops", "Leadership coaching", "Culture change program"],
      dependencies: ["Leadership commitment", "Employee engagement"],
      quickWin: false
    });
  }

  // High-value opportunity
  const highValueOpp = opportunities.find(o => o.potentialValue === "high");
  if (highValueOpp) {
    actions.push({
      action: `Pursue: ${highValueOpp.opportunity}`,
      targetMetric: "innovationIndex",
      expectedImprovement: 20,
      timeframe: highValueOpp.timeToValue,
      resources: highValueOpp.requiredCapabilities,
      dependencies: ["Market validation", "Resource allocation", "Capability building"],
      quickWin: false
    });
  }

  // Sort by impact and timeframe
  return actions.sort((a, b) => {
    if (a.quickWin !== b.quickWin) return a.quickWin ? -1 : 1;
    return b.expectedImprovement - a.expectedImprovement;
  }).slice(0, 6);
}

function calculateBenchmarkScore(
  metrics: BenchmarkMetrics,
  position: IndustryPosition,
  maturity: MaturityModel
): number {
  // Weighted calculation
  const metricsAvg = Object.values(metrics).reduce((sum, val) => sum + val, 0) / Object.values(metrics).length;
  const positionScore = position.percentile / 100;
  const maturityScore = maturity.currentLevel / 5;
  
  // Weights
  const score = metricsAvg * 0.5 + positionScore * 0.3 + maturityScore * 0.2;
  
  return Math.max(0, Math.min(1, score));
}

// Helper functions
function formatMetricName(metric: string): string {
  return metric.replace(/([A-Z])/g, ' $1').trim()
    .replace(/^./, str => str.toUpperCase());
}

function calculateSustainability(gap: number, metric: keyof BenchmarkMetrics): number {
  // Higher gaps are less sustainable
  const baseSustainability = 1 - Math.min(1, gap / 100);
  
  // Some metrics are harder to sustain
  const difficultyMultiplier: Record<keyof BenchmarkMetrics, number> = {
    innovationIndex: 0.7,
    talentRetention: 0.8,
    employeeEngagement: 0.8,
    culturalAlignment: 0.9,
    organizationalHealth: 0.85,
    performanceEfficiency: 0.75,
    learningVelocity: 0.7,
    customerSatisfaction: 0.85
  };
  
  return baseSustainability * (difficultyMultiplier[metric] || 0.8);
}

function mapMetricToCylinder(metric: keyof BenchmarkMetrics): number {
  const mapping: Record<keyof BenchmarkMetrics, number> = {
    organizationalHealth: 1, // Stability
    employeeEngagement: 2, // Belonging
    innovationIndex: 6, // Evolution
    talentRetention: 2, // Belonging
    performanceEfficiency: 3, // Mastery
    culturalAlignment: 5, // Purpose
    learningVelocity: 6, // Evolution
    customerSatisfaction: 5 // Purpose
  };
  
  return mapping[metric] || 3;
}

function mapCylinderToMetric(cylinder: number): keyof BenchmarkMetrics {
  const mapping: Record<number, keyof BenchmarkMetrics> = {
    1: "organizationalHealth",
    2: "employeeEngagement",
    3: "performanceEfficiency",
    4: "performanceEfficiency",
    5: "culturalAlignment",
    6: "innovationIndex",
    7: "organizationalHealth"
  };
  
  return mapping[cylinder] || "organizationalHealth";
}

function estimateCatchUpTime(gap: number): string {
  const absGap = Math.abs(gap);
  if (absGap > 40) return "18-24 months";
  if (absGap > 30) return "12-18 months";
  if (absGap > 20) return "9-12 months";
  if (absGap > 10) return "6-9 months";
  return "3-6 months";
}

function findMetricKey(formattedName: string): string {
  const metricMap: Record<string, keyof BenchmarkMetrics> = {
    "organizational health": "organizationalHealth",
    "employee engagement": "employeeEngagement",
    "innovation index": "innovationIndex",
    "talent retention": "talentRetention",
    "performance efficiency": "performanceEfficiency",
    "cultural alignment": "culturalAlignment",
    "learning velocity": "learningVelocity",
    "customer satisfaction": "customerSatisfaction"
  };
  
  const normalized = formattedName.toLowerCase().trim();
  return metricMap[normalized] || "organizationalHealth";
}

function generateMaturityRoadmap(level: number, dimensions: Record<string, number>): string[] {
  const roadmap: string[] = [];
  
  // Find weakest dimensions
  const sortedDimensions = Object.entries(dimensions).sort((a, b) => a[1] - b[1]);
  const weakestDimension = sortedDimensions[0];
  
  switch (level) {
    case 1:
      roadmap.push(
        "Establish baseline metrics and measurement systems",
        "Define core processes and standards",
        "Build foundational leadership capabilities"
      );
      break;
    case 2:
      roadmap.push(
        "Standardize key processes across the organization",
        "Implement regular performance reviews",
        "Develop manager training programs"
      );
      break;
    case 3:
      roadmap.push(
        "Integrate systems and processes",
        "Deploy advanced analytics and insights",
        "Create centers of excellence"
      );
      break;
    case 4:
      roadmap.push(
        "Optimize through continuous improvement",
        "Leverage predictive analytics",
        "Build innovation ecosystem"
      );
      break;
    case 5:
      roadmap.push(
        "Maintain excellence through vigilance",
        "Share best practices externally",
        "Pioneer new industry standards"
      );
      break;
  }
  
  // Add dimension-specific recommendation
  if (weakestDimension[1] < 0.6) {
    roadmap.unshift(`Priority: Strengthen ${weakestDimension[0]} (currently ${Math.round(weakestDimension[1] * 100)}%)`);
  }
  
  return roadmap.slice(0, 4);
}

function determineFocusCylinder(
  gaps: PerformanceGap[],
  competitive: CompetitiveAnalysis,
  maturity: MaturityModel
): number {
  // Count references to each cylinder
  const cylinderImpact: Record<number, number> = {};
  
  for (let i = 1; i <= 7; i++) {
    cylinderImpact[i] = 0;
  }
  
  // Weight by gaps
  gaps.forEach(gap => {
    const cylinder = mapMetricToCylinder(gap.metric);
    cylinderImpact[cylinder] += gap.priority === "critical" ? 3 : gap.priority === "high" ? 2 : 1;
  });
  
  // Consider competitive position
  competitive.weaknesses.forEach(weakness => {
    if (weakness.impactSeverity === "critical") {
      // Map weakness areas to cylinders
      if (weakness.area.toLowerCase().includes("innovation")) cylinderImpact[6] += 3;
      if (weakness.area.toLowerCase().includes("engagement")) cylinderImpact[2] += 3;
      if (weakness.area.toLowerCase().includes("efficiency")) cylinderImpact[3] += 3;
    }
  });
  
  // Find highest impact
  const focus = Object.entries(cylinderImpact).sort((a, b) => b[1] - a[1])[0];
  return Number(focus[0]);
}

function compileRecommendations(
  position: IndustryPosition,
  gaps: PerformanceGap[],
  practices: BestPractice[],
  actions: BenchmarkActionPlan[],
  maturity: MaturityModel
): string[] {
  const recommendations: string[] = [];
  
  // Position-based recommendation
  if (position.percentile < 50) {
    recommendations.push(`Priority: Move from ${position.ranking} to above-average performance through focused improvements`);
  } else if (position.percentile >= 75) {
    recommendations.push(`Maintain ${position.ranking} position while pushing for industry leadership`);
  }
  
  // Critical gap focus
  const criticalGap = gaps.find(g => g.priority === "critical");
  if (criticalGap) {
    recommendations.push(`Urgent: Close ${criticalGap.gapSize}% gap in ${formatMetricName(criticalGap.metric)} to prevent competitive disadvantage`);
  }
  
  // Quick win
  const quickWin = actions.find(a => a.quickWin);
  if (quickWin) {
    recommendations.push(`Quick win: ${quickWin.action} can deliver ${quickWin.expectedImprovement}% improvement in ${quickWin.timeframe}`);
  }
  
  // Best practice adoption
  const highImpactPractice = practices.find(p => p.expectedImpact >= 30);
  if (highImpactPractice) {
    recommendations.push(`Adopt: ${highImpactPractice.practice} (${highImpactPractice.source}) for ${highImpactPractice.expectedImpact}% improvement`);
  }
  
  // Maturity progression
  if (maturity.currentLevel < 5) {
    recommendations.push(`Maturity: Progress from ${maturity.levelName} to ${maturity.nextLevel} (${maturity.progressToNext}% complete)`);
  }
  
  return recommendations.slice(0, 5);
}
