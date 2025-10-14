/**
 * Reasoning Engine - Analysis and Insights Generation
 * Part of Mizan Platform Three-Engine Architecture
 * NO MOCK DATA - PRODUCTION READY
 */

import { z } from 'zod';
import { DomainContext } from './KnowledgeEngine';
import { ProcessedData } from './DataEngine';

// Analysis result schema
const AnalysisResultSchema = z.object({
  insights: z.array(z.object({
    type: z.enum(['strength', 'weakness', 'opportunity', 'threat', 'trend', 'gap']),
    category: z.string(),
    description: z.string(),
    impact: z.enum(['high', 'medium', 'low']),
    confidence: z.number().min(0).max(1),
    evidence: z.array(z.string()),
    relatedMetrics: z.array(z.string())
  })),
  recommendations: z.array(z.object({
    priority: z.enum(['critical', 'high', 'medium', 'low']),
    category: z.string(),
    action: z.string(),
    rationale: z.string(),
    expectedImpact: z.string(),
    timeframe: z.enum(['immediate', 'short-term', 'medium-term', 'long-term']),
    resources: z.array(z.string()),
    dependencies: z.array(z.string()),
    successMetrics: z.array(z.string())
  })),
  confidence: z.number().min(0).max(1),
  risks: z.array(z.object({
    risk: z.string(),
    likelihood: z.enum(['high', 'medium', 'low']),
    impact: z.enum(['high', 'medium', 'low']),
    mitigation: z.string()
  })),
  opportunities: z.array(z.object({
    opportunity: z.string(),
    potential: z.enum(['high', 'medium', 'low']),
    effort: z.enum(['high', 'medium', 'low']),
    timeToValue: z.string()
  })),
  metrics: z.object({
    overallScore: z.number().min(0).max(100),
    dimensionScores: z.record(z.number().min(0).max(100)),
    benchmarkComparison: z.record(z.enum(['above', 'at', 'below'])),
    trendDirection: z.enum(['improving', 'stable', 'declining'])
  })
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

interface AnalysisContext extends DomainContext {
  industryBenchmarks?: Record<string, number>;
  strategicRequirements?: string[];
  historicalData?: ProcessedData[];
}

export class ReasoningEngine {
  private readonly insightThresholds = {
    high: 0.8,
    medium: 0.6,
    low: 0.4
  };

  private readonly confidenceFactors = {
    dataCompleteness: 0.3,
    dataQuality: 0.2,
    patternStrength: 0.2,
    benchmarkAlignment: 0.15,
    historicalConsistency: 0.15
  };

  async analyze(data: ProcessedData, context: AnalysisContext): Promise<AnalysisResult> {
    // Generate insights based on data patterns
    const insights = await this.generateInsights(data, context);

    // Generate recommendations based on insights and context
    const recommendations = await this.generateRecommendations(data, context, insights);

    // Calculate confidence score
    const confidence = await this.calculateConfidence(data, context);

    // Identify risks
    const risks = await this.identifyRisks(data, context, insights);

    // Identify opportunities
    const opportunities = await this.identifyOpportunities(data, context, insights);

    // Calculate metrics
    const metrics = await this.calculateMetrics(data, context);

    return {
      insights,
      recommendations,
      confidence,
      risks,
      opportunities,
      metrics
    };
  }

  async generateInsights(data: ProcessedData, context: AnalysisContext): Promise<AnalysisResult['insights']> {
    const insights: AnalysisResult['insights'] = [];

    // Analyze patterns in the data
    for (const pattern of data.structured.patterns) {
      const insight = this.patternToInsight(pattern, data, context);
      if (insight) {
        insights.push(insight);
      }
    }

    // Analyze metrics against benchmarks
    if (context.benchmarks) {
      for (const benchmark of context.benchmarks) {
        const metricValue = data.structured.metrics[benchmark.metric];
        if (metricValue !== undefined) {
          const insightFromBenchmark = this.benchmarkToInsight(benchmark, metricValue, context);
          if (insightFromBenchmark) {
            insights.push(insightFromBenchmark);
          }
        }
      }
    }

    // Analyze relationships for insights
    for (const relationship of data.structured.relationships) {
      if (relationship.strength > this.insightThresholds.medium) {
        insights.push({
          type: relationship.strength > this.insightThresholds.high ? 'strength' : 'opportunity',
          category: 'Relationships',
          description: `Strong ${relationship.type} relationship between ${relationship.from} and ${relationship.to}`,
          impact: relationship.strength > this.insightThresholds.high ? 'high' : 'medium',
          confidence: relationship.strength,
          evidence: [`Relationship strength: ${(relationship.strength * 100).toFixed(0)}%`],
          relatedMetrics: [relationship.from, relationship.to]
        });
      }
    }

    // Analyze data quality and completeness
    const qualityInsight = this.dataQualityToInsight(data.metadata);
    if (qualityInsight) {
      insights.push(qualityInsight);
    }

    return insights;
  }

  async generateRecommendations(
    data: ProcessedData,
    context: AnalysisContext,
    insights: AnalysisResult['insights']
  ): Promise<AnalysisResult['recommendations']> {
    const recommendations: AnalysisResult['recommendations'] = [];

    // Generate recommendations based on insights
    for (const insight of insights) {
      if (insight.type === 'gap' || insight.type === 'weakness') {
        const recommendation = this.insightToRecommendation(insight, context);
        if (recommendation) {
          recommendations.push(recommendation);
        }
      }
    }

    // Add best practice recommendations
    if (context.bestPractices) {
      for (const practice of context.bestPractices) {
        if (practice.priority === 'critical' || practice.priority === 'high') {
          const applicable = this.isPracticeApplicable(practice, data, insights);
          if (applicable) {
            recommendations.push({
              priority: practice.priority,
              category: 'Best Practice',
              action: practice.practice,
              rationale: practice.rationale,
              expectedImpact: practice.implementation,
              timeframe: practice.priority === 'critical' ? 'immediate' : 'short-term',
              resources: this.extractResourcesFromImplementation(practice.implementation),
              dependencies: [],
              successMetrics: this.defineSuccessMetrics(practice.practice)
            });
          }
        }
      }
    }

    // Add strategic recommendations
    if (context.strategicRequirements) {
      for (const requirement of context.strategicRequirements) {
        const strategicRec = this.strategicRequirementToRecommendation(requirement, data, insights);
        if (strategicRec) {
          recommendations.push(strategicRec);
        }
      }
    }

    // Prioritize and deduplicate recommendations
    return this.prioritizeRecommendations(recommendations);
  }

  async calculateConfidence(data: ProcessedData, context: AnalysisContext): Promise<number> {
    let confidence = 0;

    // Factor in data completeness
    confidence += data.metadata.completeness * this.confidenceFactors.dataCompleteness;

    // Factor in data quality
    confidence += data.metadata.quality * this.confidenceFactors.dataQuality;

    // Factor in pattern strength
    const avgPatternSignificance = data.structured.patterns.reduce(
      (sum, p) => sum + p.significance,
      0
    ) / Math.max(1, data.structured.patterns.length);
    confidence += avgPatternSignificance * this.confidenceFactors.patternStrength;

    // Factor in benchmark alignment
    if (context.benchmarks && context.benchmarks.length > 0) {
      const benchmarkAlignment = this.calculateBenchmarkAlignment(data, context);
      confidence += benchmarkAlignment * this.confidenceFactors.benchmarkAlignment;
    } else {
      // If no benchmarks, redistribute this weight
      confidence += 0.5 * this.confidenceFactors.benchmarkAlignment;
    }

    // Factor in historical consistency
    if (context.historicalData && context.historicalData.length > 0) {
      const consistency = this.calculateHistoricalConsistency(data, context.historicalData);
      confidence += consistency * this.confidenceFactors.historicalConsistency;
    } else {
      // If no historical data, redistribute this weight
      confidence += 0.5 * this.confidenceFactors.historicalConsistency;
    }

    return Math.min(1, Math.max(0, confidence));
  }

  async identifyRisks(
    data: ProcessedData,
    context: AnalysisContext,
    insights: AnalysisResult['insights']
  ): Promise<AnalysisResult['risks']> {
    const risks: AnalysisResult['risks'] = [];

    // Identify risks from weaknesses and threats
    for (const insight of insights) {
      if (insight.type === 'weakness' || insight.type === 'threat') {
        risks.push({
          risk: insight.description,
          likelihood: this.assessLikelihood(insight.confidence),
          impact: insight.impact,
          mitigation: this.suggestMitigation(insight, context)
        });
      }
    }

    // Identify risks from data quality issues
    if (data.metadata.quality < 0.6) {
      risks.push({
        risk: 'Data quality issues may impact analysis accuracy',
        likelihood: 'medium',
        impact: 'medium',
        mitigation: 'Implement data validation and cleaning processes'
      });
    }

    // Identify risks from anomalies
    if (data.metadata.anomalies.length > 3) {
      risks.push({
        risk: `Multiple data anomalies detected (${data.metadata.anomalies.length})`,
        likelihood: 'high',
        impact: 'medium',
        mitigation: 'Review and correct data anomalies before finalizing analysis'
      });
    }

    // Identify strategic risks
    if (context.strategicRequirements) {
      const unmetRequirements = this.identifyUnmetRequirements(data, context.strategicRequirements, insights);
      for (const requirement of unmetRequirements) {
        risks.push({
          risk: `Strategic requirement not met: ${requirement}`,
          likelihood: 'medium',
          impact: 'high',
          mitigation: `Develop action plan to address ${requirement}`
        });
      }
    }

    return risks;
  }

  async identifyOpportunities(
    data: ProcessedData,
    context: AnalysisContext,
    insights: AnalysisResult['insights']
  ): Promise<AnalysisResult['opportunities']> {
    const opportunities: AnalysisResult['opportunities'] = [];

    // Identify opportunities from strengths
    for (const insight of insights) {
      if (insight.type === 'strength') {
        opportunities.push({
          opportunity: `Leverage ${insight.description}`,
          potential: insight.impact,
          effort: 'low',
          timeToValue: '1-3 months'
        });
      }
    }

    // Identify opportunities from trends
    for (const insight of insights) {
      if (insight.type === 'trend') {
        opportunities.push({
          opportunity: `Capitalize on ${insight.description}`,
          potential: insight.impact,
          effort: 'medium',
          timeToValue: '3-6 months'
        });
      }
    }

    // Identify opportunities from industry context
    if (context.industryContext) {
      for (const opportunity of context.industryContext.opportunities) {
        const applicable = this.isOpportunityApplicable(opportunity, data, insights);
        if (applicable) {
          opportunities.push({
            opportunity: opportunity,
            potential: 'high',
            effort: 'medium',
            timeToValue: '6-12 months'
          });
        }
      }
    }

    // Identify quick wins
    const quickWins = this.identifyQuickWins(data, context, insights);
    for (const quickWin of quickWins) {
      opportunities.push(quickWin);
    }

    return opportunities;
  }

  async calculateMetrics(data: ProcessedData, context: AnalysisContext): Promise<AnalysisResult['metrics']> {
    // Calculate overall score
    const overallScore = this.calculateOverallScore(data, context);

    // Calculate dimension scores
    const dimensionScores = this.calculateDimensionScores(data, context);

    // Compare with benchmarks
    const benchmarkComparison = this.compareToBenchmarks(data, context);

    // Determine trend direction
    const trendDirection = this.determineTrendDirection(data, context);

    return {
      overallScore,
      dimensionScores,
      benchmarkComparison,
      trendDirection
    };
  }

  // Helper methods

  private patternToInsight(
    pattern: ProcessedData['structured']['patterns'][0],
    data: ProcessedData,
    context: AnalysisContext
  ): AnalysisResult['insights'][0] | null {
    if (pattern.significance < this.insightThresholds.low) {
      return null;
    }

    const type = pattern.pattern.includes('gap') ? 'gap' :
                pattern.pattern.includes('risk') ? 'threat' :
                pattern.pattern.includes('strength') ? 'strength' :
                'trend';

    const impact = pattern.significance > this.insightThresholds.high ? 'high' :
                  pattern.significance > this.insightThresholds.medium ? 'medium' :
                  'low';

    return {
      type,
      category: 'Pattern Analysis',
      description: `Detected ${pattern.pattern} with ${(pattern.frequency * 100).toFixed(0)}% frequency`,
      impact,
      confidence: pattern.significance,
      evidence: [`Pattern frequency: ${(pattern.frequency * 100).toFixed(0)}%`],
      relatedMetrics: Object.keys(data.structured.metrics)
    };
  }

  private benchmarkToInsight(
    benchmark: DomainContext['benchmarks'][0],
    value: number,
    context: AnalysisContext
  ): AnalysisResult['insights'][0] | null {
    const percentile = this.calculatePercentile(value, benchmark);

    if (percentile < 25) {
      return {
        type: 'weakness',
        category: 'Benchmark Comparison',
        description: `${benchmark.metric} is below industry 25th percentile`,
        impact: 'high',
        confidence: 0.9,
        evidence: [`Current value: ${value}`, `25th percentile: ${benchmark.percentile25}`],
        relatedMetrics: [benchmark.metric]
      };
    }

    if (percentile > 75) {
      return {
        type: 'strength',
        category: 'Benchmark Comparison',
        description: `${benchmark.metric} exceeds industry 75th percentile`,
        impact: 'high',
        confidence: 0.9,
        evidence: [`Current value: ${value}`, `75th percentile: ${benchmark.percentile75}`],
        relatedMetrics: [benchmark.metric]
      };
    }

    return null;
  }

  private dataQualityToInsight(metadata: ProcessedData['metadata']): AnalysisResult['insights'][0] | null {
    if (metadata.completeness < 0.7) {
      return {
        type: 'gap',
        category: 'Data Quality',
        description: 'Data completeness below threshold',
        impact: 'medium',
        confidence: 0.95,
        evidence: [`Completeness: ${(metadata.completeness * 100).toFixed(0)}%`],
        relatedMetrics: ['data_completeness']
      };
    }

    if (metadata.quality > 0.9) {
      return {
        type: 'strength',
        category: 'Data Quality',
        description: 'Excellent data quality',
        impact: 'medium',
        confidence: 0.95,
        evidence: [`Quality score: ${(metadata.quality * 100).toFixed(0)}%`],
        relatedMetrics: ['data_quality']
      };
    }

    return null;
  }

  private insightToRecommendation(
    insight: AnalysisResult['insights'][0],
    context: AnalysisContext
  ): AnalysisResult['recommendations'][0] | null {
    const priority = insight.impact === 'high' ? 'critical' :
                    insight.impact === 'medium' ? 'high' :
                    'medium';

    const timeframe = priority === 'critical' ? 'immediate' :
                     priority === 'high' ? 'short-term' :
                     'medium-term';

    return {
      priority,
      category: insight.category,
      action: `Address ${insight.description}`,
      rationale: `This ${insight.type} has ${insight.impact} impact on performance`,
      expectedImpact: `Improve ${insight.relatedMetrics.join(', ')}`,
      timeframe,
      resources: this.identifyRequiredResources(insight),
      dependencies: [],
      successMetrics: insight.relatedMetrics
    };
  }

  private isPracticeApplicable(
    practice: DomainContext['bestPractices'][0],
    data: ProcessedData,
    insights: AnalysisResult['insights']
  ): boolean {
    // Check if practice addresses any identified gaps or weaknesses
    const relevantInsights = insights.filter(i =>
      (i.type === 'gap' || i.type === 'weakness') &&
      i.description.toLowerCase().includes(practice.practice.toLowerCase().split(' ')[0])
    );

    return relevantInsights.length > 0 || practice.priority === 'critical';
  }

  private extractResourcesFromImplementation(implementation: string): string[] {
    const resources: string[] = [];

    if (implementation.includes('workshop')) resources.push('Facilitator');
    if (implementation.includes('survey')) resources.push('Survey platform');
    if (implementation.includes('training')) resources.push('Training materials');
    if (implementation.includes('system')) resources.push('Technology platform');
    if (implementation.includes('consultant')) resources.push('External expertise');

    return resources.length > 0 ? resources : ['Internal team'];
  }

  private defineSuccessMetrics(practice: string): string[] {
    const metrics: string[] = [];

    if (practice.includes('engagement')) metrics.push('engagement_score');
    if (practice.includes('culture')) metrics.push('culture_alignment');
    if (practice.includes('performance')) metrics.push('performance_rating');
    if (practice.includes('skills')) metrics.push('skills_coverage');
    if (practice.includes('hiring')) metrics.push('quality_of_hire');

    return metrics.length > 0 ? metrics : ['implementation_complete'];
  }

  private strategicRequirementToRecommendation(
    requirement: string,
    data: ProcessedData,
    insights: AnalysisResult['insights']
  ): AnalysisResult['recommendations'][0] | null {
    const relevantInsights = insights.filter(i =>
      i.description.toLowerCase().includes(requirement.toLowerCase())
    );

    if (relevantInsights.length === 0) {
      return {
        priority: 'high',
        category: 'Strategic Alignment',
        action: `Develop capabilities for ${requirement}`,
        rationale: 'Strategic requirement not currently addressed',
        expectedImpact: 'Enable strategic objective achievement',
        timeframe: 'medium-term',
        resources: ['Strategic planning team', 'Department leads'],
        dependencies: ['Strategy clarification', 'Resource allocation'],
        successMetrics: ['strategic_alignment', 'capability_maturity']
      };
    }

    return null;
  }

  private prioritizeRecommendations(
    recommendations: AnalysisResult['recommendations']
  ): AnalysisResult['recommendations'] {
    // Sort by priority and remove duplicates
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

    return recommendations
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
      .filter((rec, index, self) =>
        index === self.findIndex(r => r.action === rec.action)
      );
  }

  private assessLikelihood(confidence: number): 'high' | 'medium' | 'low' {
    return confidence > this.insightThresholds.high ? 'high' :
           confidence > this.insightThresholds.medium ? 'medium' :
           'low';
  }

  private suggestMitigation(
    insight: AnalysisResult['insights'][0],
    context: AnalysisContext
  ): string {
    const mitigations: Record<string, string> = {
      weakness: `Develop improvement plan for ${insight.category}`,
      threat: `Implement controls to address ${insight.description}`,
      gap: `Bridge the gap through targeted initiatives in ${insight.category}`
    };

    return mitigations[insight.type] || 'Conduct detailed assessment and develop action plan';
  }

  private identifyUnmetRequirements(
    data: ProcessedData,
    requirements: string[],
    insights: AnalysisResult['insights']
  ): string[] {
    const unmet: string[] = [];

    for (const requirement of requirements) {
      const isAddressed = insights.some(i =>
        i.description.toLowerCase().includes(requirement.toLowerCase()) &&
        i.type === 'strength'
      );

      if (!isAddressed) {
        unmet.push(requirement);
      }
    }

    return unmet;
  }

  private isOpportunityApplicable(
    opportunity: string,
    data: ProcessedData,
    insights: AnalysisResult['insights']
  ): boolean {
    // Check if organization has foundational capabilities
    const hasFoundation = insights.some(i =>
      i.type === 'strength' &&
      i.confidence > 0.7
    );

    // Check if not already pursuing
    const alreadyPursuing = insights.some(i =>
      i.description.toLowerCase().includes(opportunity.toLowerCase())
    );

    return hasFoundation && !alreadyPursuing;
  }

  private identifyQuickWins(
    data: ProcessedData,
    context: AnalysisContext,
    insights: AnalysisResult['insights']
  ): AnalysisResult['opportunities'] {
    const quickWins: AnalysisResult['opportunities'] = [];

    // Identify high-impact, low-effort improvements
    for (const insight of insights) {
      if (insight.type === 'gap' && insight.impact === 'medium') {
        quickWins.push({
          opportunity: `Quick fix for ${insight.description}`,
          potential: 'medium',
          effort: 'low',
          timeToValue: '1 month'
        });
      }
    }

    return quickWins;
  }

  private calculateOverallScore(data: ProcessedData, context: AnalysisContext): number {
    let score = 50; // Start at midpoint

    // Adjust based on data quality
    score += (data.metadata.quality - 0.5) * 20;

    // Adjust based on pattern significance
    const avgSignificance = data.structured.patterns.reduce(
      (sum, p) => sum + p.significance,
      0
    ) / Math.max(1, data.structured.patterns.length);
    score += (avgSignificance - 0.5) * 30;

    // Ensure score is between 0 and 100
    return Math.min(100, Math.max(0, score));
  }

  private calculateDimensionScores(
    data: ProcessedData,
    context: AnalysisContext
  ): Record<string, number> {
    const scores: Record<string, number> = {};

    for (const dimension of data.structured.dimensions) {
      // Calculate score based on related metrics
      const relatedMetrics = Object.entries(data.structured.metrics)
        .filter(([key]) => key.toLowerCase().includes(dimension.toLowerCase()));

      if (relatedMetrics.length > 0) {
        const avgMetric = relatedMetrics.reduce((sum, [, value]) => sum + value, 0) / relatedMetrics.length;
        scores[dimension] = Math.min(100, avgMetric * 100);
      } else {
        scores[dimension] = 50; // Default to midpoint if no metrics
      }
    }

    return scores;
  }

  private compareToBenchmarks(
    data: ProcessedData,
    context: AnalysisContext
  ): Record<string, 'above' | 'at' | 'below'> {
    const comparison: Record<string, 'above' | 'at' | 'below'> = {};

    if (context.benchmarks) {
      for (const benchmark of context.benchmarks) {
        const value = data.structured.metrics[benchmark.metric];
        if (value !== undefined) {
          const percentile = this.calculatePercentile(value, benchmark);
          comparison[benchmark.metric] = percentile > 60 ? 'above' :
                                        percentile > 40 ? 'at' :
                                        'below';
        }
      }
    }

    return comparison;
  }

  private calculatePercentile(
    value: number,
    benchmark: DomainContext['benchmarks'][0]
  ): number {
    if (value <= benchmark.percentile25) return 25;
    if (value <= benchmark.percentile50) return 50;
    if (value <= benchmark.percentile75) return 75;
    if (value <= benchmark.percentile90) return 90;
    return 95;
  }

  private determineTrendDirection(
    data: ProcessedData,
    context: AnalysisContext
  ): 'improving' | 'stable' | 'declining' {
    if (!context.historicalData || context.historicalData.length < 2) {
      return 'stable';
    }

    // Compare current metrics with historical average
    const currentScore = this.calculateOverallScore(data, context);
    const historicalScores = context.historicalData.map(d =>
      this.calculateOverallScore(d, context)
    );
    const historicalAvg = historicalScores.reduce((sum, s) => sum + s, 0) / historicalScores.length;

    const difference = currentScore - historicalAvg;

    if (difference > 5) return 'improving';
    if (difference < -5) return 'declining';
    return 'stable';
  }

  private calculateBenchmarkAlignment(
    data: ProcessedData,
    context: AnalysisContext
  ): number {
    if (!context.benchmarks) return 0.5;

    let alignmentSum = 0;
    let count = 0;

    for (const benchmark of context.benchmarks) {
      const value = data.structured.metrics[benchmark.metric];
      if (value !== undefined) {
        const percentile = this.calculatePercentile(value, benchmark);
        alignmentSum += percentile / 100;
        count++;
      }
    }

    return count > 0 ? alignmentSum / count : 0.5;
  }

  private calculateHistoricalConsistency(
    data: ProcessedData,
    historicalData: ProcessedData[]
  ): number {
    if (historicalData.length === 0) return 0.5;

    // Compare pattern consistency
    const currentPatterns = new Set(data.structured.patterns.map(p => p.pattern));
    let consistencyScore = 0;

    for (const historical of historicalData) {
      const historicalPatterns = new Set(historical.structured.patterns.map(p => p.pattern));
      const intersection = new Set([...currentPatterns].filter(x => historicalPatterns.has(x)));
      const union = new Set([...currentPatterns, ...historicalPatterns]);

      if (union.size > 0) {
        consistencyScore += intersection.size / union.size;
      }
    }

    return consistencyScore / historicalData.length;
  }

  private identifyRequiredResources(
    insight: AnalysisResult['insights'][0]
  ): string[] {
    const resources: string[] = [];

    if (insight.category === 'Skills') {
      resources.push('Training budget', 'Learning platform');
    } else if (insight.category === 'Culture') {
      resources.push('Change management team', 'Communication plan');
    } else if (insight.category === 'Structure') {
      resources.push('Org design consultant', 'HR team');
    } else if (insight.category === 'Performance') {
      resources.push('Performance management system', 'Manager training');
    } else {
      resources.push('Project team', 'Budget allocation');
    }

    return resources;
  }
}