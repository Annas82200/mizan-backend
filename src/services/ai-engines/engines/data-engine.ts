/**
 * Data Engine — Powered by Google Gemini
 *
 * High-throughput engine for data processing tasks:
 * - Analytics and report generation
 * - Pattern recognition and trend analysis
 * - Large dataset processing
 * - Resume parsing and candidate screening
 * - Data transformation and normalization
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

export interface DataQuery {
  query: string;
  data?: Record<string, unknown> | Record<string, unknown>[];
  tenantId: string;
  userId?: string;
  outputFormat?: 'json' | 'markdown' | 'csv' | 'text';
  maxTokens?: number;
  temperature?: number;
}

export interface DataResponse {
  content: string;
  engine: 'data';
  provider: 'gemini';
  model: string;
  tokensUsed: { input: number; output: number; total: number };
  latencyMs: number;
  cached: boolean;
}

export class DataEngine {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private defaultModelName: string;

  constructor() {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY environment variable is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.defaultModelName = process.env.GEMINI_MODEL || 'gemini-1.5-pro';
    this.model = this.genAI.getGenerativeModel({ model: this.defaultModelName });
  }

  async query(input: DataQuery): Promise<DataResponse> {
    const startTime = Date.now();

    try {
      const prompt = this.buildPrompt(input);
      const result = await this.model.generateContent(prompt);
      const response = result.response;

      const latencyMs = Date.now() - startTime;
      const text = response.text();
      const usage = response.usageMetadata;

      return {
        content: text,
        engine: 'data',
        provider: 'gemini',
        model: this.defaultModelName,
        tokensUsed: {
          input: usage?.promptTokenCount || 0,
          output: usage?.candidatesTokenCount || 0,
          total: usage?.totalTokenCount || 0,
        },
        latencyMs,
        cached: false,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      console.error(`[DataEngine] Gemini API error (${latencyMs}ms):`, (error as Error).message);
      throw new Error(`Data engine failed: ${(error as Error).message}`);
    }
  }

  /**
   * Generate analytics report from HR data
   */
  async generateAnalyticsReport(data: {
    metrics: Record<string, unknown>;
    period: string;
    departments?: string[];
    reportType: string;
    tenantId: string;
  }): Promise<DataResponse> {
    return this.query({
      query: `Generate a ${data.reportType} analytics report for period ${data.period}.
${data.departments ? `Departments: ${data.departments.join(', ')}` : 'All departments'}

Metrics data: ${JSON.stringify(data.metrics)}

Produce:
- Executive summary with key findings
- Trend analysis with period-over-period comparisons
- Department-level breakdowns
- Anomaly detection (flag any unusual patterns)
- Data-driven recommendations
- Key metrics dashboard summary`,
      data: data.metrics,
      tenantId: data.tenantId,
      outputFormat: 'json',
    });
  }

  /**
   * Parse and score resumes for candidate screening
   */
  async screenCandidates(data: {
    jobRequirements: Record<string, unknown>;
    candidates: Array<{ id: string; resumeText: string }>;
    tenantId: string;
  }): Promise<DataResponse> {
    return this.query({
      query: `Screen the following candidates against the job requirements.

Job Requirements: ${JSON.stringify(data.jobRequirements)}

Candidates: ${JSON.stringify(data.candidates.map(c => ({ id: c.id, resume: c.resumeText.substring(0, 3000) })))}

For each candidate, provide:
- Overall match score (0-100)
- Skills match breakdown
- Experience relevance score
- Culture fit indicators (if available)
- Red flags or concerns
- Ranking recommendation

Return JSON array sorted by match score descending.`,
      tenantId: data.tenantId,
      outputFormat: 'json',
      maxTokens: 8192,
    });
  }

  /**
   * Process and detect patterns in engagement data
   */
  async analyzeEngagementPatterns(data: {
    surveyData: Record<string, unknown>[];
    historicalTrend: Record<string, unknown>[];
    tenantId: string;
  }): Promise<DataResponse> {
    return this.query({
      query: `Analyze employee engagement patterns from survey data.

Current data: ${JSON.stringify(data.surveyData)}
Historical trend: ${JSON.stringify(data.historicalTrend)}

Identify:
- Engagement score trends (improving/declining/stable)
- Department-level variations
- Correlation with performance metrics
- Turnover risk indicators
- Seasonal patterns
- Actionable insights

Return structured JSON.`,
      tenantId: data.tenantId,
      outputFormat: 'json',
    });
  }

  /**
   * Generate skills market benchmarking analysis
   */
  async benchmarkSkills(data: {
    orgSkillProfile: Record<string, unknown>;
    industryBenchmarks: Record<string, unknown>;
    tenantId: string;
  }): Promise<DataResponse> {
    return this.query({
      query: `Compare organization skills profile against industry benchmarks.

Organization profile: ${JSON.stringify(data.orgSkillProfile)}
Industry benchmarks: ${JSON.stringify(data.industryBenchmarks)}

Produce:
- Skills competitiveness index
- Critical gap areas vs industry
- Emerging skills the org should invest in
- Skills surplus areas
- Investment priority matrix

Return structured JSON.`,
      tenantId: data.tenantId,
      outputFormat: 'json',
    });
  }

  private buildPrompt(input: DataQuery): string {
    let prompt = `You are the Data Engine of the Mizan HR Intelligence Platform. You excel at processing, analyzing, and finding patterns in HR data.

Tenant: ${input.tenantId}
Output format: ${input.outputFormat || 'json'}

`;
    if (input.data) {
      prompt += `Data:\n${JSON.stringify(input.data)}\n\n`;
    }
    prompt += `Task:\n${input.query}`;

    if (input.outputFormat === 'json') {
      prompt += '\n\nRespond with valid JSON only. No markdown fences.';
    }

    return prompt;
  }
}
