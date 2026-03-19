// @ts-nocheck
/**
 * Reasoning Engine — Powered by Anthropic Claude
 *
 * High-capability engine for complex analytical tasks:
 * - Culture and skills deep analysis
 * - Strategic recommendations and decision support
 * - Complex multi-step reasoning
 * - Evaluation calibration and bias detection
 * - Onboarding plan and development plan generation
 */

import Anthropic from '@anthropic-ai/sdk';

export interface ReasoningQuery {
  query: string;
  context?: string;
  tenantId: string;
  userId?: string;
  systemPrompt?: string;
  structuredOutput?: boolean;
  maxTokens?: number;
  temperature?: number;
}

export interface ReasoningResponse {
  content: string;
  engine: 'reasoning';
  provider: 'claude';
  model: string;
  tokensUsed: { input: number; output: number; total: number };
  latencyMs: number;
  cached: boolean;
  stopReason: string;
}

export class ReasoningEngine {
  private client: Anthropic;
  private defaultModel: string;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    this.client = new Anthropic({ apiKey });
    this.defaultModel = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
  }

  async query(input: ReasoningQuery): Promise<ReasoningResponse> {
    const startTime = Date.now();

    try {
      const systemPrompt = input.systemPrompt || this.buildSystemPrompt(input);

      const response = await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: input.maxTokens || 4096,
        temperature: input.temperature ?? 0.4,
        system: systemPrompt,
        messages: [
          { role: 'user', content: this.buildUserMessage(input) },
        ],
      });

      const latencyMs = Date.now() - startTime;
      const textBlock = response.content.find(b => b.type === 'text');

      return {
        content: textBlock?.text || '',
        engine: 'reasoning',
        provider: 'claude',
        model: this.defaultModel,
        tokensUsed: {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
          total: response.usage.input_tokens + response.usage.output_tokens,
        },
        latencyMs,
        cached: false,
        stopReason: response.stop_reason || 'end_turn',
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      console.error(`[ReasoningEngine] Claude API error (${latencyMs}ms):`, (error as Error).message);
      throw new Error(`Reasoning engine failed: ${(error as Error).message}`);
    }
  }

  /**
   * Perform culture analysis using the 7-Cylinder Ethical Framework
   */
  async analyzeCulture(data: {
    surveyResponses: Record<string, unknown>[];
    organizationContext: string;
    tenantId: string;
  }): Promise<ReasoningResponse> {
    return this.query({
      query: JSON.stringify(data.surveyResponses),
      tenantId: data.tenantId,
      systemPrompt: `You are the Mizan Culture Analysis Engine. Analyze the survey data using the 7-Cylinder Ethical Framework:

1. Values Alignment Cylinder
2. Trust & Psychological Safety Cylinder
3. Communication & Transparency Cylinder
4. Innovation & Adaptability Cylinder
5. Accountability & Responsibility Cylinder
6. Diversity, Equity & Inclusion Cylinder
7. Purpose & Social Impact Cylinder

Organization context: ${data.organizationContext}

Produce a structured analysis with:
- Overall cultural entropy score (0-100, lower is better)
- Per-cylinder health scores (0-100)
- Value gaps identified
- Priority interventions
- Recommendations with timeline

Return valid JSON.`,
      structuredOutput: true,
      maxTokens: 8192,
    });
  }

  /**
   * Generate 360-degree evaluation summary for executives
   */
  async generate360Summary(data: {
    selfAssessment: Record<string, unknown>;
    peerReviews: Record<string, unknown>[];
    directReportReviews: Record<string, unknown>[];
    managerReview?: Record<string, unknown>;
    tenantId: string;
  }): Promise<ReasoningResponse> {
    return this.query({
      query: JSON.stringify({
        self: data.selfAssessment,
        peers: data.peerReviews,
        directReports: data.directReportReviews,
        manager: data.managerReview,
      }),
      tenantId: data.tenantId,
      systemPrompt: `You are the Mizan Performance Analysis Engine. Generate a comprehensive 360-degree evaluation summary.

Analyze the multi-source feedback and produce:
- Overall performance score (calibrated)
- Strengths identified across all sources
- Development areas with blind spot analysis (self vs others)
- Leadership effectiveness metrics
- Recommendations for development
- Confidence-weighted scores (more weight to sources with higher consistency)

Be objective and evidence-based. Flag any potential biases in the feedback.
Return valid JSON.`,
      structuredOutput: true,
      maxTokens: 4096,
    });
  }

  /**
   * Generate AI-powered development plan
   */
  async generateDevelopmentPlan(data: {
    employeeProfile: Record<string, unknown>;
    skillGaps: Record<string, unknown>[];
    targetRole: string;
    organizationNeeds: string;
    tenantId: string;
  }): Promise<ReasoningResponse> {
    return this.query({
      query: JSON.stringify(data),
      tenantId: data.tenantId,
      systemPrompt: `You are the Mizan Career Development Engine. Create a personalized development plan.

Based on the employee profile, skill gaps, and target role, generate:
- Prioritized development objectives (SMART format)
- Recommended learning activities (courses, mentoring, stretch assignments)
- Milestones with realistic timelines
- Skills to develop with target proficiency levels
- Suggested mentor profile
- Risk factors and mitigation strategies

Return valid JSON.`,
      structuredOutput: true,
      maxTokens: 4096,
    });
  }

  private buildSystemPrompt(input: ReasoningQuery): string {
    return `You are the Reasoning Engine of the Mizan HR Intelligence Platform. You handle complex analytical tasks requiring deep reasoning, nuanced understanding, and strategic thinking.

Tenant ID: ${input.tenantId}

Your analysis should be:
- Evidence-based and well-reasoned
- Structured with clear conclusions
- Actionable with specific recommendations
- Aware of potential biases and limitations`;
  }

  private buildUserMessage(input: ReasoningQuery): string {
    let message = input.query;
    if (input.context) {
      message = `Context: ${input.context}\n\nTask: ${input.query}`;
    }
    return message;
  }
}
