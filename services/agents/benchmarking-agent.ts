import { ThreeEngineAgent, ThreeEngineConfig } from './base/three-engine-agent.js';
import { db } from '../../db/index.js';
import { industryBenchmarks, tenantMetrics, tenants } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';

export interface BenchmarkingAnalysisInput {
  tenantId: string;
  metrics: string[];
  industry?: string;
  period?: string;
}

export interface BenchmarkingAnalysisOutput {
  tenantPerformance: {
    [metric: string]: {
      value: number;
      industryPercentile: number;
      industryAverage: number;
      gap: number;
      status: 'above' | 'at' | 'below';
    };
  };
  industryComparison: {
    industry: string;
    sampleSize: number;
    topPerformers: { [metric: string]: number };
    medianPerformers: { [metric: string]: number };
    bottomPerformers: { [metric: string]: number };
  };
  recommendations: Array<{
    metric: string;
    priority: 'high' | 'medium' | 'low';
    currentGap: number;
    targetImprovement: number;
    actionItems: string[];
    benchmarkSource: string;
  }>;
  peerComparison: {
    similarTenants: Array<{
      size: string;
      industry: string;
      metrics: { [metric: string]: number };
    }>;
    ranking: { [metric: string]: number };
  };
}

export class BenchmarkingAgent extends ThreeEngineAgent {
  constructor() {
    const config: ThreeEngineConfig = {
      knowledge: {
        providers: ['openai', 'anthropic'],
        model: 'gpt-4',
        temperature: 0.2,
        maxTokens: 2000
      },
      data: {
        providers: ['openai', 'anthropic'],
        model: 'gpt-4',
        temperature: 0.1,
        maxTokens: 3000
      },
      reasoning: {
        providers: ['openai', 'anthropic'],
        model: 'gpt-4',
        temperature: 0.3,
        maxTokens: 4000
      },
      consensusThreshold: 0.8
    };

    super('benchmarking', config);
  }

  async analyzeBenchmarks(input: BenchmarkingAnalysisInput): Promise<BenchmarkingAnalysisOutput> {
    const result = await this.analyze(input);
    return result.finalOutput;
  }

  protected async loadFrameworks(): Promise<any> {
    return {
      benchmarkSources: {
        gallup: {
          name: 'Gallup Engagement Benchmarks',
          metrics: ['engagement_score', 'wellbeing_score'],
          reliability: 'high'
        },
        mckinsey: {
          name: 'McKinsey Organizational Health',
          metrics: ['org_health_score', 'leadership_effectiveness'],
          reliability: 'high'
        },
        justCapital: {
          name: 'Just Capital Rankings',
          metrics: ['esg_score', 'worker_treatment'],
          reliability: 'medium'
        },
        internal: {
          name: 'Mizan Internal Benchmarks',
          metrics: ['entropy_score', 'cylinder_health'],
          reliability: 'high'
        }
      },
      percentileInterpretation: {
        90: 'Top 10% - Exceptional performance',
        75: 'Top 25% - Above average performance',
        50: 'Median - Average performance',
        25: 'Bottom 25% - Below average performance',
        10: 'Bottom 10% - Significant improvement needed'
      },
      industryCategories: [
        'Technology',
        'Healthcare',
        'Financial Services',
        'Manufacturing',
        'Retail',
        'Education',
        'Government',
        'Non-profit'
      ]
    };
  }

  protected async processData(inputData: BenchmarkingAnalysisInput): Promise<any> {
    // Get tenant information
    const tenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, inputData.tenantId))
      .limit(1);

    if (tenant.length === 0) {
      throw new Error('Tenant not found');
    }

    const tenantInfo = tenant[0];
    const industry = inputData.industry || tenantInfo.industry || 'Technology';

    // Get tenant metrics
    const tenantMetricsData = await db
      .select()
      .from(tenantMetrics)
      .where(
        and(
          eq(tenantMetrics.tenantId, inputData.tenantId),
          inputData.period ? eq(tenantMetrics.period, inputData.period) : undefined
        )
      );

    // Get industry benchmarks
    const benchmarks = await db
      .select()
      .from(industryBenchmarks)
      .where(eq(industryBenchmarks.industry, industry));

    // Get peer data (anonymized)
    const peerMetrics = await db
      .select()
      .from(tenantMetrics)
      .where(eq(tenantMetrics.isAnonymized, true));

    return {
      tenant: {
        id: tenantInfo.id,
        industry: tenantInfo.industry,
        employeeCount: tenantInfo.employeeCount,
        plan: tenantInfo.plan
      },
      tenantMetrics: this.processMetrics(tenantMetricsData, inputData.metrics),
      industryBenchmarks: this.processBenchmarks(benchmarks, inputData.metrics),
      peerData: this.processPeerData(peerMetrics, tenantInfo, inputData.metrics),
      requestedMetrics: inputData.metrics
    };
  }

  protected getKnowledgeSystemPrompt(): string {
    return `You are the Knowledge Engine for Mizan's Benchmarking Agent. Your role is to apply benchmarking frameworks and industry analysis principles.

Key frameworks to consider:
1. Industry benchmark standards (Gallup, McKinsey, etc.)
2. Percentile interpretation and statistical significance
3. Peer comparison methodologies
4. Performance gap analysis frameworks
5. Benchmarking best practices

Your output should be structured JSON containing:
- benchmark_standards: Relevant benchmarking standards
- statistical_methods: How to interpret percentiles and gaps
- comparison_frameworks: Methods for peer comparison
- improvement_targets: How to set realistic improvement goals

Focus on statistically sound benchmarking principles.`;
  }

  protected getDataSystemPrompt(): string {
    return `You are the Data Engine for Mizan's Benchmarking Agent. Your role is to analyze performance metrics against industry and peer benchmarks.

You will receive:
- Tenant performance metrics
- Industry benchmark data
- Anonymized peer performance data
- Tenant context (industry, size, etc.)

Your output should be structured JSON containing:
- performance_analysis: How tenant performs vs benchmarks
- percentile_rankings: Statistical position in industry
- peer_comparison: Performance vs similar organizations
- gap_analysis: Specific performance gaps
- trend_analysis: Performance trends over time

Focus on accurate statistical analysis and meaningful comparisons.`;
  }

  protected getReasoningSystemPrompt(): string {
    return `You are the Reasoning Engine for Mizan's Benchmarking Agent. Your role is to synthesize benchmarking knowledge with performance data to provide actionable insights.

You will receive:
- Benchmarking framework insights
- Performance analysis results
- Industry and peer context

Your output should be structured JSON containing:
- tenant_performance: Comprehensive performance assessment
- industry_comparison: Detailed industry positioning
- recommendations: Prioritized improvement recommendations
- peer_comparison: Peer ranking and insights

Connect benchmarking theory with data to provide clear improvement pathways.`;
  }

  protected buildKnowledgePrompt(inputData: BenchmarkingAnalysisInput, frameworks: any): string {
    return `Analyze the benchmarking context:

Analysis Type: Performance Benchmarking
Tenant ID: ${inputData.tenantId}
Metrics: ${inputData.metrics.join(', ')}
Industry: ${inputData.industry || 'Not specified'}

Available Frameworks:
${JSON.stringify(frameworks, null, 2)}

Please identify which benchmarking frameworks are most applicable and provide guidance for analyzing performance against industry standards. Consider statistical significance, peer comparison methods, and improvement target setting.

What benchmarking principles should guide this analysis?`;
  }

  protected buildDataPrompt(processedData: any, knowledgeOutput: any): string {
    return `Analyze this performance benchmarking data:

Performance Data:
${JSON.stringify(processedData, null, 2)}

Benchmarking Context:
${JSON.stringify(knowledgeOutput, null, 2)}

Please analyze for:
1. Tenant performance vs industry benchmarks
2. Percentile rankings and statistical significance
3. Peer comparison and relative positioning
4. Performance gaps and improvement opportunities
5. Trend analysis and performance trajectory

Provide accurate statistical analysis and meaningful insights.`;
  }

  protected buildReasoningPrompt(inputData: BenchmarkingAnalysisInput, knowledgeOutput: any, dataOutput: any): string {
    return `Synthesize benchmarking frameworks with performance analysis:

Input Context:
${JSON.stringify(inputData, null, 2)}

Benchmarking Theory:
${JSON.stringify(knowledgeOutput, null, 2)}

Performance Analysis:
${JSON.stringify(dataOutput, null, 2)}

Please provide:
1. Comprehensive tenant performance assessment
2. Industry positioning with percentile rankings
3. Prioritized improvement recommendations
4. Peer comparison insights
5. Realistic improvement targets

Ensure recommendations are data-driven and achievable.`;
  }

  protected parseKnowledgeOutput(response: string): any {
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse knowledge output:', error);
      return { error: 'Failed to parse knowledge output' };
    }
  }

  protected parseDataOutput(response: string): any {
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse data output:', error);
      return { error: 'Failed to parse data output' };
    }
  }

  protected parseReasoningOutput(response: string): any {
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse reasoning output:', error);
      return { error: 'Failed to parse reasoning output' };
    }
  }

  private processMetrics(tenantMetricsData: any[], requestedMetrics: string[]): any {
    const metrics: { [metric: string]: number } = {};
    
    tenantMetricsData.forEach(metric => {
      if (requestedMetrics.includes(metric.metric)) {
        metrics[metric.metric] = parseFloat(metric.value);
      }
    });

    return metrics;
  }

  private processBenchmarks(benchmarks: any[], requestedMetrics: string[]): any {
    const processed: { [metric: string]: any } = {};

    benchmarks.forEach(benchmark => {
      if (requestedMetrics.includes(benchmark.metric)) {
        processed[benchmark.metric] = {
          value: parseFloat(benchmark.value),
          percentile25: parseFloat(benchmark.percentile25),
          percentile50: parseFloat(benchmark.percentile50),
          percentile75: parseFloat(benchmark.percentile75),
          sampleSize: benchmark.sampleSize,
          source: benchmark.source,
          year: benchmark.year
        };
      }
    });

    return processed;
  }

  private processPeerData(peerMetrics: any[], tenantInfo: any, requestedMetrics: string[]): any {
    // Group peer data by similar characteristics
    const similarPeers = peerMetrics.filter(metric => {
      // Filter for similar size/industry (simplified)
      return requestedMetrics.includes(metric.metric);
    });

    const peerStats: { [metric: string]: { values: number[], average: number } } = {};

    similarPeers.forEach(metric => {
      if (!peerStats[metric.metric]) {
        peerStats[metric.metric] = { values: [], average: 0 };
      }
      peerStats[metric.metric].values.push(parseFloat(metric.value));
    });

    // Calculate averages
    Object.keys(peerStats).forEach(metric => {
      const values = peerStats[metric].values;
      peerStats[metric].average = values.reduce((sum, val) => sum + val, 0) / values.length;
    });

    return peerStats;
  }
}
