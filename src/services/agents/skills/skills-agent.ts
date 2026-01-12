// backend/src/services/agents/skills/skills-agent.ts

import { ThreeEngineAgent, ThreeEngineConfig } from '../base/three-engine-agent';
import { db } from '../../../../db/index';
import { tenants, users, departments, skills, skillsAssessments, skillsGaps, skillsFramework, companyStrategies } from '../../../../db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { skillsReAnalysisService } from '../../skills/skills-reanalysis-service';
import { logger } from '../../logger';

/**
 * Skills Agent - Three-Engine Architecture Implementation
 * Trained on organizational development practices and theories
 * Handles technical and soft skills across all organization types and industries
 */

// Type definitions for Skills Analysis
export interface SkillsAnalysisInput {
  tenantId: string;
  companyId: string;
  industry: string;
  organizationName: string;
  strategy?: string;
  employeeData?: EmployeeSkillData[];
  resumeData?: ResumeData[];
  csvData?: unknown;
}

export interface EmployeeSkillData {
  employeeId: string;
  name: string;
  department: string;
  role: string;
  skills: Skill[];
  experience: number;
}

export interface Skill {
  name: string;
  category: 'technical' | 'soft' | 'leadership' | 'analytical' | 'communication';
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsOfExperience?: number;
  verified?: boolean;
}

export interface ResumeData {
  employeeId: string;
  resumeText: string;
  extractedSkills?: Skill[];
  education?: string[];
  certifications?: string[];
}

export interface SkillsGap {
  skill: string;
  category: string;
  currentLevel: string;
  requiredLevel: string;
  gap: 'critical' | 'high' | 'medium' | 'low';
  priority: number;
  employeesAffected: number;
  businessImpact: string;
}

// Frontend-formatted skill gap for employee gap analysis
export interface FrontendSkillGap {
  id: string;
  skillName: string;
  category: string;
  requiredLevel: string;
  currentLevel: string;
  gapSeverity: 'critical' | 'high' | 'medium' | 'low';
  affectedEmployees: number;
  recommendations: string[];
  estimatedTrainingTime: string;
}

export interface SkillsFramework {
  tenantId: string;
  strategicSkills: Skill[];
  industryBenchmarks: Skill[];
  criticalSkills: Skill[];
  emergingSkills: Skill[];
  obsoleteSkills: Skill[];
}

// Type for raw AI-generated framework response (before normalization)
interface RawAIFrameworkResponse {
  strategicSkills?: Array<Record<string, unknown>>;
  industryBenchmarks?: Array<Record<string, unknown>>;
  criticalSkills?: Array<Record<string, unknown>>;
  emergingSkills?: Array<Record<string, unknown>>;
  obsoleteSkills?: Array<{ name: string; reason: string }>;
}

export interface SkillsAnalysisResult {
  overallScore: number;
  strategicAlignment: number;
  skillsCoverage: number;
  criticalGaps: SkillsGap[];

  // AI-generated narrative explanations
  scoreNarrative?: string; // Explains what the scores mean
  readinessAssessment?: string; // Answers "Does tenant have right skills for strategy?" with detailed WHY
  readinessStatus?: 'ready' | 'partial' | 'not_ready'; // Ready/Partially Ready/Not Ready
  gapAnalysisNarrative?: string; // Explains critical gaps and their impact on strategy

  skillCategories: {
    technical: SkillCategoryAnalysis;
    leadership: SkillCategoryAnalysis;
    communication: SkillCategoryAnalysis;
    analytical: SkillCategoryAnalysis;
    soft: SkillCategoryAnalysis;
  };

  gapAnalysis: {
    overallGapScore: number;
    criticalSkillsGapCount: number;
    topGaps: SkillsGap[];
    trainingPriority: 'critical' | 'high' | 'medium' | 'low';
  };

  emergingSkills: Array<{
    skill: string;
    importance: 'critical' | 'high' | 'medium';
    currentCapability: number;
    industryBenchmark: number;
  }>;

  marketAlignment: {
    demandMatch: number;
    futureReadiness: {
      currentReadiness: number;
      readinessGap: number;
      timeToReadiness: string;
    };
  };

  recommendations: Array<{
    type: 'training' | 'hiring' | 'development' | 'restructuring';
    priority: 'immediate' | 'short-term' | 'long-term';
    description: string;
    expectedImpact: string;
    estimatedCost?: string;
    timeline?: string; // Added for implementation timeline
    impact?: string; // Added for impact description
  }>;

  lxpTriggers?: Array<{
    employeeId: string;
    skillGaps: SkillsGap[];
    learningPaths: string[];
  }>;

  talentTriggers?: Array<{
    employeeId: string;
    potentialRole: string;
    readinessScore: number;
  }>;

  bonusTriggers?: Array<{
    employeeId: string;
    skillsAchieved: string[];
    recommendedBonus: number;
  }>;
}

export interface SkillCategoryAnalysis {
  score: number;
  coverage: number;
  criticalGaps: number;
  skills: Array<{
    name: string;
    currentLevel: number;
    requiredLevel: number;
    employeeCount: number;
  }>;
}

export class SkillsAgent extends ThreeEngineAgent {
  constructor() {
    const config: ThreeEngineConfig = {
      knowledge: {
        providers: ['anthropic', 'openai', 'gemini', 'mistral'],
        model: 'claude-3-opus-20240229',
        temperature: 0.2,
        maxTokens: 4000
      },
      data: {
        providers: ['anthropic', 'openai', 'gemini', 'mistral'],
        model: 'gpt-4',
        temperature: 0.1,
        maxTokens: 3000
      },
      reasoning: {
        providers: ['anthropic', 'openai', 'gemini', 'mistral'],
        model: 'claude-3-opus-20240229',
        temperature: 0.4,
        maxTokens: 4000
      },
      consensusThreshold: 0.8
    };

    super('skills', config);
  }

  protected getAgentDomain(): string {
    return 'Organizational Development, Skills Management, Talent Development, and Strategic Capability Planning';
  }

  protected async loadFrameworks(): Promise<Record<string, unknown>> {
    // Skills frameworks are loaded in getKnowledgeBase()
    // This includes industry standards, competency models, and development frameworks
    return this.getKnowledgeBase();
  }

  protected async processData(inputData: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Data processing is handled by the three-engine pipeline
    // Additional processing for resume extraction and CSV parsing happens here
    const skillsInput = inputData as unknown as SkillsAnalysisInput;
    
    if (skillsInput.csvData) {
      skillsInput.employeeData = await this.parseCSVData(skillsInput.csvData);
    }
    if (skillsInput.resumeData) {
      for (const resume of skillsInput.resumeData) {
        resume.extractedSkills = await this.extractSkillsFromResume(resume.resumeText);
      }
    }
    return skillsInput as unknown as Record<string, unknown>;
  }

  protected getKnowledgeSystemPrompt(): string {
    return `You are the Knowledge Engine for the Skills Agent. Your expertise includes:
    - Organizational development theories and practices
    - Industry-specific skill requirements and benchmarks
    - Competency frameworks and skill taxonomies
    - Strategic workforce planning methodologies
    - Learning and development best practices
    - Talent management and succession planning

    Apply this knowledge to understand skill requirements, identify gaps, and provide strategic recommendations.`;
  }

  protected getDataSystemPrompt(): string {
    return `You are the Data Engine for the Skills Agent. Your responsibilities include:
    - Extracting skills from resumes and employee profiles
    - Parsing and normalizing skill data from various sources
    - Categorizing skills into appropriate frameworks
    - Calculating skill levels and gaps
    - Aggregating skills data at individual, department, and organization levels
    - Identifying patterns and trends in skills data`;
  }

  protected getReasoningSystemPrompt(): string {
    return `You are the Reasoning Engine for the Skills Agent. Your role is to:
    - Analyze skills gaps against strategic requirements
    - Determine critical skills for organizational success
    - Prioritize skill development needs
    - Generate actionable recommendations for skills development
    - Identify opportunities for talent optimization
    - Assess organizational capability to execute strategy
    - Recommend learning paths and development programs`;
  }

  protected parseKnowledgeOutput(response: string): Record<string, unknown> {
    // Parse and structure knowledge engine output
    try {
      return JSON.parse(response) as Record<string, unknown>;
    } catch {
      return { rawResponse: response };
    }
  }

  protected parseDataOutput(response: string): Record<string, unknown> {
    // Parse and structure data engine output
    try {
      return JSON.parse(response) as Record<string, unknown>;
    } catch {
      return { rawResponse: response };
    }
  }

  protected parseReasoningOutput(response: string): Record<string, unknown> {
    // Parse and structure reasoning engine output into final result
    try {
      const result = JSON.parse(response) as SkillsAnalysisResult;
      return result as unknown as Record<string, unknown>;
    } catch {
      return { rawResponse: response };
    }
  }

  protected buildKnowledgePrompt(inputData: Record<string, unknown>, frameworks: Record<string, unknown>): string {
    const skillsInput = inputData as unknown as SkillsAnalysisInput;
    return `Analyze skills requirements for ${skillsInput.organizationName} in the ${skillsInput.industry} industry.

    Strategy: ${skillsInput.strategy || 'Not provided'}

    Provide:
    1. Industry-specific skill requirements and benchmarks
    2. Strategic skills needed to execute the company strategy
    3. Emerging skills trends in the industry
    4. Competency frameworks relevant to this organization
    5. Best practices for skills development in this context`;
  }

  protected buildDataPrompt(processedData: Record<string, unknown>, knowledgeOutput: Record<string, unknown>): string {
    const inputData = processedData as unknown as SkillsAnalysisInput;
    const employeeCount = inputData.employeeData?.length || 0;
    const resumeCount = inputData.resumeData?.length || 0;

    return `Process and analyze skills data for ${inputData.organizationName}:

    Data Sources:
    - Employee profiles: ${employeeCount}
    - Resumes: ${resumeCount}
    - Industry: ${inputData.industry}

    Tasks:
    1. Extract and categorize all skills from the data
    2. Determine skill levels and proficiency
    3. Calculate skill coverage by department and role
    4. Identify skill patterns and clusters
    5. Map skills to strategic requirements
    6. Generate skill distribution statistics`;
  }

  protected buildReasoningPrompt(
    inputData: Record<string, unknown>,
    knowledgeOutput: Record<string, unknown>,
    dataOutput: Record<string, unknown>
  ): string {
    const skillsInput = inputData as unknown as SkillsAnalysisInput;
    return `Generate strategic skills analysis and recommendations for ${skillsInput.organizationName}:

    Context:
    - Industry: ${skillsInput.industry}
    - Strategy: ${skillsInput.strategy || 'Not provided'}

    Analyze:
    1. Strategic capability assessment - can the organization execute its strategy with current skills?
    2. Critical skills gaps that prevent strategic success
    3. Priority areas for skill development
    4. Recommendations for closing skill gaps
    5. Learning and development priorities
    6. Talent optimization opportunities

    Provide specific, actionable recommendations with clear priorities and expected impact.

    **IMPORTANT**: Also include these narrative fields in your JSON response:
    - scoreNarrative: Brief 2-3 sentence explanation of what the scores mean
    - readinessAssessment: 4-5 sentence answer to "Does this organization have the right skills to execute strategy?" Include WHY
    - readinessStatus: "ready" (score >= 85 AND alignment >= 80), "partial" (score >= 60 OR alignment >= 60), or "not_ready" (score < 60 AND alignment < 60)
    - gapAnalysisNarrative: 4-5 sentences listing top 3-5 gaps and their impact on strategy execution`;
  }

  protected getKnowledgeBase(): Record<string, unknown> {
    return {
      // Competency Frameworks
      competencyFrameworks: {
        technical: {
          categories: ['Programming', 'Data Analysis', 'Cloud Computing', 'AI/ML', 'Cybersecurity'],
          levels: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
          assessmentCriteria: ['Knowledge', 'Application', 'Innovation', 'Leadership']
        },
        leadership: {
          categories: ['Strategic Thinking', 'Decision Making', 'Team Leadership', 'Change Management'],
          levels: ['Individual Contributor', 'Team Lead', 'Manager', 'Director', 'Executive'],
          assessmentCriteria: ['Influence', 'Impact', 'Scope', 'Complexity']
        },
        soft: {
          categories: ['Communication', 'Collaboration', 'Problem Solving', 'Adaptability'],
          universallyRequired: true,
          assessmentCriteria: ['Consistency', 'Effectiveness', 'Range', 'Impact']
        }
      },

      // Industry Skill Benchmarks
      industryBenchmarks: {
        technology: {
          critical: ['Software Development', 'Cloud Architecture', 'Data Science', 'DevOps'],
          emerging: ['AI/ML', 'Blockchain', 'Quantum Computing', 'Edge Computing'],
          declining: ['Legacy Systems', 'Manual Testing', 'Traditional IT Support']
        },
        finance: {
          critical: ['Risk Management', 'Regulatory Compliance', 'Data Analysis', 'Digital Banking'],
          emerging: ['Cryptocurrency', 'DeFi', 'RegTech', 'AI Trading'],
          declining: ['Manual Accounting', 'Paper Processing', 'Traditional Banking']
        },
        healthcare: {
          critical: ['Clinical Skills', 'Patient Care', 'Medical Technology', 'Data Privacy'],
          emerging: ['Telemedicine', 'AI Diagnostics', 'Genomics', 'Digital Health'],
          declining: ['Paper Records', 'Manual Scheduling', 'Traditional Diagnostics']
        }
      },

      // Skills Development Strategies
      developmentStrategies: {
        training: {
          methods: ['Online Courses', 'Workshops', 'Mentoring', 'Job Rotation', 'Certification'],
          effectiveness: {
            online: 0.7,
            workshop: 0.8,
            mentoring: 0.9,
            rotation: 0.85,
            certification: 0.75
          }
        },
        hiring: {
          triggers: ['Critical Gap', 'No Internal Capability', 'Rapid Growth', 'New Technology'],
          strategies: ['Direct Hire', 'Contract', 'Acquisition', 'Partnership']
        },
        partnerships: {
          types: ['University', 'Training Provider', 'Technology Partner', 'Consulting'],
          benefits: ['Access to Expertise', 'Cost Efficiency', 'Speed', 'Risk Mitigation']
        }
      },

      // Strategic Alignment Framework
      strategicAlignment: {
        growthStrategy: {
          requiredSkills: ['Innovation', 'Market Analysis', 'Business Development', 'Scaling'],
          priority: 'Expansion capabilities'
        },
        efficiencyStrategy: {
          requiredSkills: ['Process Optimization', 'Automation', 'Lean', 'Quality'],
          priority: 'Operational excellence'
        },
        innovationStrategy: {
          requiredSkills: ['R&D', 'Creative Thinking', 'Experimentation', 'Risk Taking'],
          priority: 'Breakthrough capabilities'
        },
        customerStrategy: {
          requiredSkills: ['Customer Service', 'UX Design', 'Data Analytics', 'Personalization'],
          priority: 'Customer-facing capabilities'
        }
      }
    };
  }

  /**
   * Main analysis method - Analyzes skills and generates strategic recommendations
   */
  async analyzeSkills(input: SkillsAnalysisInput): Promise<SkillsAnalysisResult> {
    try {
      // Validate input
      if (!input.tenantId || !input.companyId) {
        throw new Error('Missing required fields: tenantId and companyId are required');
      }

      // Get strategy if not provided
      if (!input.strategy) {
        try {
          const strategy = await this.getCompanyStrategy(input.companyId);
          input.strategy = strategy;
        } catch (error) {
          logger.error('[Skills Agent] Error fetching company strategy:', error);
          // Continue with empty strategy rather than failing
          input.strategy = '';
        }
      }

      // Get employee data if not provided
      if (!input.employeeData) {
        try {
          input.employeeData = await this.getEmployeeSkillsData(input.tenantId);
        } catch (error) {
          logger.error('[Skills Agent] Error fetching employee data:', error);
          // Continue with empty employee data
          input.employeeData = [];
        }
      }

      // Execute three-engine analysis - cast input to Record<string, unknown>
      let result;
      try {
        result = await this.analyze(input as unknown as Record<string, unknown>);
      } catch (error) {
        logger.error('[Skills Agent] Error during three-engine analysis:', error);
        throw new Error(`Skills analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Validate analysis result
      if (!result || !result.finalOutput) {
        logger.error('[Skills Agent] Invalid analysis result - missing finalOutput');
        throw new Error('Skills analysis returned invalid result');
      }

      // Structure the result - parse it as SkillsAnalysisResult
      let analysis: SkillsAnalysisResult;
      try {
        analysis = this.parseSkillsAnalysisResult(result.finalOutput);
      } catch (error) {
        logger.error('[Skills Agent] Error parsing analysis result:', error);
        logger.error('[Skills Agent] Raw finalOutput:', JSON.stringify(result.finalOutput, null, 2));
        throw new Error('Failed to parse skills analysis result');
      }

      // Create session ID for tracking (use analysisId or generate new)
      const sessionId = randomUUID();

      // Save analysis results first to get session context (non-blocking)
      try {
        await this.saveSkillsAnalysis(analysis, input, sessionId);
      } catch (error) {
        logger.error('[Skills Agent] Error saving analysis results:', error);
        // Log but don't fail - analysis can still be returned
      }

      // Trigger LXP module if critical gaps identified (non-blocking)
      if (analysis.criticalGaps.length > 0 && input.employeeData && input.employeeData.length > 0) {
        try {
          // Create LXP triggers for each employee with critical gaps
          for (const employee of input.employeeData) {
            await this.createLXPTrigger(
              employee.employeeId,
              input.tenantId,
              sessionId,
              analysis.criticalGaps
            );
          }

          logger.info(`[Skills Agent] Created LXP triggers for ${input.employeeData.length} employees`);
        } catch (error) {
          logger.error('[Skills Agent] Error triggering LXP module:', error);
          // Non-critical - continue without LXP triggers
        }
      }

      // Trigger Talent module for high-potential employees (non-blocking)
      if (analysis.talentTriggers && analysis.talentTriggers.length > 0) {
        try {
          await this.triggerTalentModule(analysis.talentTriggers, input.tenantId, sessionId);
        } catch (error) {
          logger.error('[Skills Agent] Error triggering Talent module:', error);
          // Non-critical - continue
        }
      }

      // Trigger Bonus module for skills achievements (non-blocking)
      if (analysis.bonusTriggers && analysis.bonusTriggers.length > 0) {
        try {
          await this.triggerBonusModule(analysis.bonusTriggers, input.tenantId, sessionId);
        } catch (error) {
          logger.error('[Skills Agent] Error triggering Bonus module:', error);
          // Non-critical - continue
        }
      }

      return analysis;

    } catch (error) {
      logger.error('[Skills Agent] Fatal error in analyzeSkills:', error);
      logger.error('[Skills Agent] Input:', JSON.stringify({
        tenantId: input.tenantId,
        companyId: input.companyId,
        organizationName: input.organizationName,
        industry: input.industry,
        hasStrategy: !!input.strategy,
        hasEmployeeData: !!input.employeeData
      }, null, 2));
      throw error;
    }
  }

  /**
   * Calculate readiness status based on scores
   */
  private calculateReadinessStatus(
    overallScore: number,
    strategicAlignment: number
  ): 'ready' | 'partial' | 'not_ready' {
    if (overallScore >= 85 && strategicAlignment >= 80) {
      return 'ready';
    } else if (overallScore >= 60 || strategicAlignment >= 60) {
      return 'partial';
    } else {
      return 'not_ready';
    }
  }

  /**
   * Parse analysis result into proper SkillsAnalysisResult type
   */
  private parseSkillsAnalysisResult(output: Record<string, unknown>): SkillsAnalysisResult {
    // Type guards for safe parsing
    const isSkillCategoriesValid = (value: unknown): value is SkillsAnalysisResult['skillCategories'] => {
      return typeof value === 'object' && value !== null;
    };

    const isGapAnalysisValid = (value: unknown): value is SkillsAnalysisResult['gapAnalysis'] => {
      return typeof value === 'object' && value !== null;
    };

    const isMarketAlignmentValid = (value: unknown): value is SkillsAnalysisResult['marketAlignment'] => {
      return typeof value === 'object' && value !== null;
    };

    const defaultSkillCategory: SkillCategoryAnalysis = {
      score: 0,
      coverage: 0,
      criticalGaps: 0,
      skills: []
    };

    // Parse numerical values
    const overallScore = typeof output.overallScore === 'number' ? output.overallScore : 0;
    const strategicAlignment = typeof output.strategicAlignment === 'number' ? output.strategicAlignment : 0;
    const skillsCoverage = typeof output.skillsCoverage === 'number' ? output.skillsCoverage : 0;
    const criticalGaps = Array.isArray(output.criticalGaps) ? output.criticalGaps as SkillsGap[] : [];

    // Narrative field validation with fallbacks
    const scoreNarrative = typeof output.scoreNarrative === 'string' && output.scoreNarrative.trim().length > 0
      ? output.scoreNarrative
      : `The organization shows a ${overallScore}% overall skills score with ${strategicAlignment}% strategic alignment. ` +
        (overallScore >= 75
          ? 'This indicates strong capability to execute strategic initiatives.'
          : overallScore >= 50
            ? 'This suggests moderate capability with room for improvement in key areas.'
            : 'This indicates significant skill gaps that may hinder strategic execution.');

    const readinessStatus = (output.readinessStatus === 'ready' || output.readinessStatus === 'partial' || output.readinessStatus === 'not_ready')
      ? output.readinessStatus
      : this.calculateReadinessStatus(overallScore, strategicAlignment);

    const readinessAssessment = typeof output.readinessAssessment === 'string' && output.readinessAssessment.trim().length > 0
      ? output.readinessAssessment
      : `The organization is ${readinessStatus === 'ready' ? 'well-positioned' : readinessStatus === 'partial' ? 'partially ready' : 'not yet ready'} to achieve its strategic goals. ` +
        `With an overall skills score of ${overallScore}% and strategic alignment at ${strategicAlignment}%, ` +
        (readinessStatus === 'ready'
          ? 'the workforce has the critical skills needed to execute the strategy effectively.'
          : readinessStatus === 'partial'
            ? 'some strategic initiatives can proceed, but key skill gaps need to be addressed for full execution capability.'
            : 'significant skill development is required before strategic objectives can be fully pursued.');

    const gapAnalysisNarrative = typeof output.gapAnalysisNarrative === 'string' && output.gapAnalysisNarrative.trim().length > 0
      ? output.gapAnalysisNarrative
      : criticalGaps.length > 0
        ? `Analysis identified ${criticalGaps.length} critical skill gap${criticalGaps.length > 1 ? 's' : ''} that could impact strategic execution. ` +
          `The top gaps include: ${criticalGaps.slice(0, 3).map((gap, idx) => `${idx + 1}. ${gap.skill || gap.category} (${gap.gap || 'high'} priority)`).join('; ')}. ` +
          'Addressing these gaps should be a priority for talent development and recruitment efforts.'
        : 'No critical skill gaps were identified in the current analysis. The organization appears to have adequate skills coverage for strategic initiatives.';

    return {
      overallScore,
      strategicAlignment,
      skillsCoverage,
      criticalGaps,
      // Narrative explanations with guaranteed values
      scoreNarrative,
      readinessAssessment,
      readinessStatus,
      gapAnalysisNarrative,
      skillCategories: isSkillCategoriesValid(output.skillCategories) ? output.skillCategories : {
        technical: defaultSkillCategory,
        leadership: defaultSkillCategory,
        communication: defaultSkillCategory,
        analytical: defaultSkillCategory,
        soft: defaultSkillCategory
      },
      gapAnalysis: isGapAnalysisValid(output.gapAnalysis) ? output.gapAnalysis : {
        overallGapScore: 0,
        criticalSkillsGapCount: 0,
        topGaps: [],
        trainingPriority: 'low' as const
      },
      emergingSkills: Array.isArray(output.emergingSkills) ? output.emergingSkills as SkillsAnalysisResult['emergingSkills'] : [],
      marketAlignment: isMarketAlignmentValid(output.marketAlignment) ? output.marketAlignment : {
        demandMatch: 0,
        futureReadiness: { currentReadiness: 0, readinessGap: 0, timeToReadiness: 'Unknown' }
      },
      recommendations: Array.isArray(output.recommendations) ? output.recommendations as SkillsAnalysisResult['recommendations'] : []
    };
  }

  /**
   * Create strategic skills framework based on company strategy
   */
  async createStrategicSkillsFramework(
    tenantId: string,
    strategy: string,
    industry: string,
    userId: string
  ): Promise<SkillsFramework> {
    try {
      // Use Knowledge Engine to generate strategic skills framework
      const prompt = `Based on the following company strategy and industry, generate a comprehensive strategic skills framework.

Company Strategy:
${strategy}

Industry: ${industry}

Please analyze and provide a JSON response with the following structure:
{
  "strategicSkills": [
    {
      "name": "skill name",
      "category": "technical|soft|leadership|analytical|communication",
      "level": "beginner|intermediate|advanced|expert",
      "strategic_importance": "critical|high|medium|low",
      "rationale": "why this skill is strategically important"
    }
  ],
  "industryBenchmarks": [
    {
      "name": "industry-standard skill",
      "category": "technical|soft|leadership|analytical|communication",
      "level": "expected proficiency level",
      "prevalence": "percentage of companies requiring this skill"
    }
  ],
  "criticalSkills": [
    {
      "name": "mission-critical skill",
      "category": "technical|soft|leadership|analytical|communication",
      "level": "required minimum level",
      "urgency": "immediate|short-term|medium-term"
    }
  ],
  "emergingSkills": [
    {
      "name": "future-relevant skill",
      "category": "technical|soft|leadership|analytical|communication",
      "level": "recommended level",
      "timeline": "when this skill will become important"
    }
  ],
  "obsoleteSkills": [
    {
      "name": "declining skill",
      "reason": "why this skill is becoming less relevant"
    }
  ]
}

Consider:
1. Current industry trends and technological shifts
2. Strategic objectives and business goals
3. Competitive landscape requirements
4. Future-ready capabilities needed
5. Regulatory and compliance needs (if applicable)`;

      const response = await this.knowledgeAI.call({
        agent: 'skills',
        engine: 'knowledge',
        prompt,
        requireJson: true,
        temperature: 0.4  // Slightly higher for creative strategic thinking
      });

      const parsedResponse = typeof response.narrative === 'string'
        ? JSON.parse(response.narrative)
        : response.narrative;

      // Validate and normalize the framework
      const framework: SkillsFramework = {
        tenantId,
        strategicSkills: this.normalizeSkillList(parsedResponse.strategicSkills || []),
        industryBenchmarks: this.normalizeSkillList(parsedResponse.industryBenchmarks || []),
        criticalSkills: this.normalizeSkillList(parsedResponse.criticalSkills || []),
        emergingSkills: this.normalizeSkillList(parsedResponse.emergingSkills || []),
        obsoleteSkills: parsedResponse.obsoleteSkills || []
      };

      // Store framework in database (map to schema fields)
      // Separate skills by category for database storage
      const technicalSkillsList = framework.strategicSkills.filter(s => s.category === 'technical');
      const softSkillsList = framework.strategicSkills.filter(s => s.category === 'soft');

      // For now, use a simple framework name based on industry
      const frameworkName = `${industry} Strategic Skills Framework`;

      await db.insert(skillsFramework).values({
        tenantId,
        frameworkName,
        industry,
        strategicSkills: framework.strategicSkills as unknown as Record<string, unknown>[],
        technicalSkills: technicalSkillsList as unknown as Record<string, unknown>[],
        softSkills: softSkillsList as unknown as Record<string, unknown>[],
        prioritization: framework.criticalSkills as unknown as Record<string, unknown>[],
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return framework;

    } catch (error) {
      logger.error('Error creating strategic skills framework:', error);
      throw new Error('Failed to create strategic skills framework');
    }
  }

  /**
   * Auto-generate skills framework from organization data
   * Automatically pulls industry, strategy, and organization structure
   * Uses three-engine AI system for intelligent framework generation
   */
  async autoGenerateFrameworkFromOrgData(tenantId: string, userId: string): Promise<SkillsFramework> {
    // Declare variables in function scope for error handling
    let industry = 'Unknown';
    let strategyText = '';
    let departmentCount = 0;

    try {
      logger.info(`[Auto-Generate Framework] Starting for tenant ${tenantId}`);

      // Step 1: Get tenant data (industry)
      const tenantResult = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
      const tenant = tenantResult.length > 0 ? tenantResult[0] : null;

      if (!tenant) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }

      industry = tenant.industry || 'General Business';
      logger.info(`[Auto-Generate Framework] Industry: ${industry}`);

      // Step 2: Get company strategy
      const strategy = await this.getCompanyStrategy(tenantId);
      strategyText = strategy || 'Growth-focused organization committed to excellence and innovation';
      logger.info(`[Auto-Generate Framework] Strategy retrieved: ${strategyText.substring(0, 100)}...`);

      // Step 3: Get organization structure
      const departmentsList = await db.select().from(departments).where(eq(departments.tenantId, tenantId));
      departmentCount = departmentsList.length;
      const structureContext = departmentsList.length > 0
        ? `Organization has ${departmentsList.length} departments: ${departmentsList.map(d => d.name).join(', ')}`
        : 'Flat organizational structure';
      logger.info(`[Auto-Generate Framework] Structure: ${structureContext}`);

      // Step 4: Enhanced prompt with all three-engine context
      const enhancedPrompt = `You are an expert organizational development consultant with deep knowledge of industry trends, strategic workforce planning, and skills development.

**Organization Context:**
Industry: ${industry}
${structureContext}

**Strategic Context:**
${strategyText}

**Your Task:**
Generate a comprehensive strategic skills framework that aligns with this organization's industry, structure, and strategic direction. Use your expertise to identify:

1. **Strategic Skills** - Skills that directly support the strategic objectives and competitive positioning
2. **Industry Benchmarks** - Standard skills required across the ${industry} industry
3. **Critical Skills** - Must-have skills for immediate organizational success
4. **Emerging Skills** - Future-relevant skills based on industry trends and technological shifts
5. **Obsolete Skills** - Skills that are declining in relevance

**Response Format (JSON):**
{
  "strategicSkills": [
    {
      "name": "skill name",
      "category": "technical|soft|leadership|analytical|communication",
      "level": "beginner|intermediate|advanced|expert",
      "strategic_importance": "critical|high|medium|low",
      "rationale": "why this skill aligns with organizational strategy"
    }
  ],
  "industryBenchmarks": [
    {
      "name": "industry-standard skill",
      "category": "technical|soft|leadership|analytical|communication",
      "level": "expected proficiency level",
      "prevalence": "percentage or description of industry adoption"
    }
  ],
  "criticalSkills": [
    {
      "name": "mission-critical skill",
      "category": "technical|soft|leadership|analytical|communication",
      "level": "required minimum level",
      "urgency": "immediate|short-term|medium-term"
    }
  ],
  "emergingSkills": [
    {
      "name": "future-relevant skill",
      "category": "technical|soft|leadership|analytical|communication",
      "level": "recommended level",
      "timeline": "when this skill will become important"
    }
  ],
  "obsoleteSkills": [
    {
      "name": "declining skill",
      "reason": "why this skill is becoming less relevant"
    }
  ]
}

**Considerations:**
- Current ${industry} industry trends and technological disruptions
- The organization's strategic direction and business goals
- Departmental needs across the ${departmentsList.length} departments
- Competitive landscape and market positioning
- Future-ready capabilities for sustained success
- Regulatory and compliance requirements specific to ${industry}`;

      // Step 5: Use Knowledge Engine with EnsembleAI for framework generation
      logger.info(`[Auto-Generate Framework] Calling Knowledge Engine with EnsembleAI`);
      const response = await this.knowledgeAI.call({
        agent: 'skills-agent',  // Fixed: Use consistent agent name matching config
        engine: 'knowledge',
        prompt: enhancedPrompt,
        requireJson: true,
        temperature: 0.4  // Balanced creativity and consistency
      });

      logger.info(`[Auto-Generate Framework] Received response from ${response.provider} with confidence ${response.confidence}`);

      // Step 5.5: Safe JSON parsing with comprehensive error handling
      let parsedResponse: RawAIFrameworkResponse;
      try {
        if (typeof response.narrative === 'string') {
          // Log raw response for debugging (first 500 chars to avoid log overflow)
          logger.info(`[Auto-Generate Framework] Raw response preview: ${response.narrative.substring(0, 500)}...`);

          // Attempt JSON parse with error recovery
          parsedResponse = JSON.parse(response.narrative);
          logger.info(`[Auto-Generate Framework] JSON parsed successfully`);
        } else {
          parsedResponse = response.narrative;
          logger.info(`[Auto-Generate Framework] Response already in object format`);
        }
      } catch (parseError) {
        // Log detailed parse error for debugging
        logger.error(`[Auto-Generate Framework] JSON parse failed:`, {
          provider: response.provider,
          confidence: response.confidence,
          engine: response.engine,
          error: parseError instanceof Error ? parseError.message : String(parseError),
          narrativeLength: response.narrative.length,
          narrativePreview: typeof response.narrative === 'string'
            ? response.narrative.substring(0, 1000)
            : 'Not a string',
          narrativeSuffix: typeof response.narrative === 'string'
            ? response.narrative.substring(Math.max(0, response.narrative.length - 500))
            : 'Not a string'
        });

        throw new Error(
          `AI provider ${response.provider} returned malformed JSON (confidence: ${response.confidence}). ` +
          `Parse error: ${parseError instanceof Error ? parseError.message : String(parseError)}. ` +
          `This usually indicates the AI response was truncated or improperly formatted. ` +
          `Please try again or create the framework manually.`
        );
      }

      // Step 5.6: Validate response structure before using
      if (!parsedResponse || typeof parsedResponse !== 'object') {
        logger.error(`[Auto-Generate Framework] Invalid response structure:`, {
          provider: response.provider,
          confidence: response.confidence,
          parsedType: typeof parsedResponse,
          parsedValue: parsedResponse
        });
        throw new Error(
          `AI provider ${response.provider} returned invalid response structure. ` +
          `Expected object with framework sections, got ${typeof parsedResponse}.`
        );
      }

      // Validate required sections exist (allow empty arrays)
      const requiredSections = ['strategicSkills', 'industryBenchmarks', 'criticalSkills', 'emergingSkills', 'obsoleteSkills'];
      const missingSections = requiredSections.filter(section => !Array.isArray(parsedResponse[section]));

      if (missingSections.length > 0) {
        logger.warn(`[Auto-Generate Framework] Missing or invalid sections: ${missingSections.join(', ')}. Using empty arrays.`);
        // Initialize missing sections as empty arrays instead of failing
        missingSections.forEach(section => {
          parsedResponse[section] = [];
        });
      }

      // Step 6: Validate and normalize the framework
      const framework: SkillsFramework = {
        tenantId,
        strategicSkills: this.normalizeSkillList(parsedResponse.strategicSkills || []),
        industryBenchmarks: this.normalizeSkillList(parsedResponse.industryBenchmarks || []),
        criticalSkills: this.normalizeSkillList(parsedResponse.criticalSkills || []),
        emergingSkills: this.normalizeSkillList(parsedResponse.emergingSkills || []),
        obsoleteSkills: this.normalizeObsoleteSkillList(parsedResponse.obsoleteSkills || [])
      };

      logger.info(`[Auto-Generate Framework] Framework generated - Strategic: ${framework.strategicSkills.length}, Benchmarks: ${framework.industryBenchmarks.length}, Critical: ${framework.criticalSkills.length}`);

      // Step 7: Store framework in database
      const technicalSkillsList = framework.strategicSkills.filter(s => s.category === 'technical');
      const softSkillsList = framework.strategicSkills.filter(s => s.category === 'soft');
      const frameworkName = `${industry} Auto-Generated Framework`;

      await db.insert(skillsFramework).values({
        tenantId,
        frameworkName,
        industry,
        strategicSkills: framework.strategicSkills as unknown as Record<string, unknown>[],
        technicalSkills: technicalSkillsList as unknown as Record<string, unknown>[],
        softSkills: softSkillsList as unknown as Record<string, unknown>[],
        prioritization: framework.criticalSkills as unknown as Record<string, unknown>[],
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      logger.info(`[Auto-Generate Framework] Framework stored in database successfully`);

      return framework;

    } catch (error) {
      // Preserve detailed error information for debugging
      const errorDetails = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        tenantId,
        industry,
        departmentCount,
        strategyLength: strategyText.length,
        timestamp: new Date().toISOString()
      };

      logger.error('[Auto-Generate Framework] Error:', errorDetails);

      // Re-throw with detailed context instead of generic message
      if (error instanceof Error) {
        // Preserve original error message for debugging
        throw error;
      } else {
        throw new Error('Failed to auto-generate skills framework from organization data');
      }
    }
  }

  /**
   * Normalize skill list to ensure proper structure
   */
  private normalizeSkillList(skills: Array<Record<string, unknown>>): Skill[] {
    return skills
      .filter((skill) => skill.name && skill.category && skill.level)
      .map((skill) => ({
        name: (skill.name as string).trim(),
        category: this.normalizeCategory(skill.category as string),
        level: this.normalizeLevel(skill.level as string),
        yearsOfExperience: typeof skill.yearsOfExperience === 'number' ? skill.yearsOfExperience : undefined,
        verified: true // Framework skills are considered verified
      }));
  }

  /**
   * Normalize obsolete skills list (which may have name/reason format)
   */
  private normalizeObsoleteSkillList(skills: Array<{ name: string; reason: string }>): Skill[] {
    return skills
      .filter((skill) => skill.name)
      .map((skill) => ({
        name: skill.name.trim(),
        category: 'technical' as const, // Obsolete skills default to technical
        level: 'beginner' as const, // Obsolete skills are considered beginner level
        verified: false
      }));
  }

  /**
   * Analyze individual employee skills gap
   */
  async analyzeEmployeeSkillsGap(
    employeeId: string,
    tenantId: string,
    framework: SkillsFramework
  ): Promise<{
    gapAnalysis: {
      employeeId: string;
      employeeName: string;
      overallGapScore: number;
      criticalGaps: FrontendSkillGap[];
      gaps: FrontendSkillGap[];
      strengths: Skill[];
      recommendations: string[];
    }
  }> {
    // 1. Get employee information
    const employeeInfo = await this.getEmployeeInfo(employeeId);

    // 2. Get employee skills
    const employeeSkills = await this.getEmployeeSkills(employeeId);

    // 3. Calculate all skill gaps
    const rawGaps = this.calculateSkillsGaps(employeeSkills, framework.strategicSkills);

    // 4. Transform gaps to match frontend SkillGap interface
    const transformedGaps = rawGaps.map((gap, index) => ({
      id: `gap-${employeeId}-${index}`,
      skillName: gap.skill,
      category: gap.category,
      requiredLevel: gap.requiredLevel,
      currentLevel: gap.currentLevel,
      gapSeverity: gap.gap,
      affectedEmployees: 1, // Individual analysis always 1
      recommendations: this.generateSkillRecommendations(gap),
      estimatedTrainingTime: this.estimateTrainingTime(gap.currentLevel, gap.requiredLevel)
    }));

    // 5. Filter critical gaps (critical or high severity)
    const criticalGaps = transformedGaps.filter(
      gap => gap.gapSeverity === 'critical' || gap.gapSeverity === 'high'
    );

    // 6. Identify strengths (skills where employee exceeds requirements or has advanced/expert level)
    const strengths = this.identifyStrengths(employeeSkills, framework.strategicSkills);

    // 7. Calculate overall gap score (0-100, where 100 = no gaps)
    const overallGapScore = this.calculateOverallGapScore(rawGaps, framework.strategicSkills.length);

    // 8. Generate personalized recommendations using existing development plan
    const developmentPlanRecommendations = this.generateDevelopmentPlan(rawGaps);
    const learningPathRecommendations = this.generateLearningPaths(rawGaps).slice(0, 3);

    const recommendations = [
      ...developmentPlanRecommendations,
      ...learningPathRecommendations
    ].slice(0, 5); // Top 5 recommendations

    return {
      gapAnalysis: {
        employeeId,
        employeeName: employeeInfo.name,
        overallGapScore,
        criticalGaps,
        gaps: transformedGaps,
        strengths,
        recommendations
      }
    };
  }

  // Helper methods for gap analysis

  /**
   * Get employee information (name)
   */
  private async getEmployeeInfo(employeeId: string): Promise<{ name: string }> {
    const result = await db.select()
      .from(users)
      .where(eq(users.id, employeeId))
      .limit(1);

    if (result.length === 0) {
      return { name: 'Unknown Employee' };
    }

    return { name: result[0].name || 'Unknown Employee' };
  }

  /**
   * Identify employee strengths (skills at or above requirements, or advanced/expert skills)
   */
  private identifyStrengths(
    currentSkills: Skill[],
    requiredSkills: Skill[]
  ): Skill[] {
    const strengths: Skill[] = [];

    for (const current of currentSkills) {
      // Find if this skill is in requirements
      const required = requiredSkills.find(r => r.name === current.name);

      if (required) {
        // Strength if current level meets or exceeds required level
        if (this.getSkillLevelScore(current.level) >= this.getSkillLevelScore(required.level)) {
          strengths.push(current);
        }
      } else {
        // Also consider advanced/expert skills as strengths even if not in framework
        if (current.level === 'advanced' || current.level === 'expert') {
          strengths.push(current);
        }
      }
    }

    return strengths;
  }

  /**
   * Calculate overall gap score (0-100, where 100 = perfect alignment, 0 = many critical gaps)
   */
  private calculateOverallGapScore(gaps: SkillsGap[], totalRequiredSkills: number): number {
    if (totalRequiredSkills === 0) return 100;

    // Calculate weighted gap penalty
    let totalPenalty = 0;
    const severityWeights = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1
    };

    for (const gap of gaps) {
      totalPenalty += severityWeights[gap.gap] || 1;
    }

    // Maximum possible penalty (if all skills were critical gaps)
    const maxPossiblePenalty = totalRequiredSkills * severityWeights.critical;

    // Score: 100 - (actual penalty as percentage of max)
    const score = Math.max(0, 100 - Math.round((totalPenalty / maxPossiblePenalty) * 100));

    return score;
  }

  /**
   * Generate recommendations for a specific skill gap
   */
  private generateSkillRecommendations(gap: SkillsGap): string[] {
    const recommendations: string[] = [];

    // Recommendation based on gap severity
    if (gap.gap === 'critical') {
      recommendations.push('Immediate training required - high priority for role effectiveness');
    } else if (gap.gap === 'high') {
      recommendations.push('Schedule training within next quarter');
    } else if (gap.gap === 'medium') {
      recommendations.push('Include in annual development plan');
    }

    // Category-specific recommendation
    const categoryRecommendations: Record<string, string> = {
      technical: 'Consider online courses, certifications, or hands-on projects',
      leadership: 'Seek mentoring, leadership workshops, or stretch assignments',
      communication: 'Practice through presentations, writing, or public speaking opportunities',
      analytical: 'Engage in data analysis projects, problem-solving workshops, or case studies',
      soft: 'Participate in team exercises, request feedback, or work with a coach'
    };

    if (categoryRecommendations[gap.category]) {
      recommendations.push(categoryRecommendations[gap.category]);
    }

    return recommendations;
  }

  /**
   * Estimate training time needed to close a skill gap
   */
  private estimateTrainingTime(currentLevel: string, requiredLevel: string): string {
    const gap = this.getSkillLevelScore(requiredLevel) - this.getSkillLevelScore(currentLevel);

    const timeEstimates: Record<number, string> = {
      0: 'No training needed',
      1: '1-2 months',
      2: '3-6 months',
      3: '6-12 months',
      4: '12-18 months'
    };

    return timeEstimates[gap] || '6-12 months';
  }

  private async getCompanyStrategy(companyId: string): Promise<string> {
    // Edge case: Validate companyId
    if (!companyId || typeof companyId !== 'string' || companyId.trim() === '') {
      logger.warn('[Skills Agent] getCompanyStrategy called with invalid companyId:', companyId);
      return '';
    }

    try {
      // First, try to read from companyStrategies table (primary source)
      const strategyResult = await db.select()
        .from(companyStrategies)
        .where(eq(companyStrategies.tenantId, companyId))
        .limit(1);

      if (strategyResult.length > 0) {
        const strategy = strategyResult[0];
        // Combine vision, mission, values, and objectives into comprehensive strategy
        const parts: string[] = [];

        if (strategy.vision && typeof strategy.vision === 'string' && strategy.vision.trim() !== '') {
          parts.push(`Vision: ${strategy.vision}`);
        }

        if (strategy.mission && typeof strategy.mission === 'string' && strategy.mission.trim() !== '') {
          parts.push(`Mission: ${strategy.mission}`);
        }

        if (strategy.values) {
          const valuesArray = Array.isArray(strategy.values) ? strategy.values : [];
          const validValues = valuesArray.filter((v: unknown) =>
            v && (typeof v === 'string' ? v.trim() !== '' : true)
          );
          if (validValues.length > 0) {
            parts.push(`Values: ${validValues.join(', ')}`);
          }
        }

        if (strategy.objectives) {
          const objectivesArray = Array.isArray(strategy.objectives) ? strategy.objectives : [];
          const validObjectives = objectivesArray.filter((obj: unknown) =>
            obj && (typeof obj === 'string' ? obj.trim() !== '' : (obj as Record<string, unknown>).title || (obj as Record<string, unknown>).name)
          );
          if (validObjectives.length > 0) {
            parts.push(`Strategic Objectives: ${validObjectives.map((obj: unknown) =>
              typeof obj === 'string' ? obj : (obj as Record<string, unknown>).title || (obj as Record<string, unknown>).name || JSON.stringify(obj)
            ).join('; ')}`);
          }
        }

        if (parts.length > 0) {
          return parts.join('\n\n');
        }
      }

      // Fallback to legacy tenants.strategy field for backward compatibility
      const tenantResult = await db.select().from(tenants).where(eq(tenants.id, companyId)).limit(1);
      const tenant = tenantResult.length > 0 ? tenantResult[0] : null;

      if (!tenant) {
        logger.warn(`[Skills Agent] Tenant not found for companyId: ${companyId}`);
        return '';
      }

      const legacyStrategy = tenant?.strategy || '';

      if (!legacyStrategy || legacyStrategy.trim() === '') {
        logger.warn(`[Skills Agent] No strategy found for tenant ${companyId} - analysis will proceed without strategic context`);
        return '';
      }

      return legacyStrategy;

    } catch (error) {
      logger.error('[Skills Agent] Error fetching company strategy:', error);
      logger.error(`  CompanyId: ${companyId}`);
      // Return empty string rather than throwing - allow analysis to continue without strategy
      return '';
    }
  }

  private async getEmployeeSkillsData(tenantId: string): Promise<EmployeeSkillData[]> {
    const employees = await db.select().from(users).where(eq(users.tenantId, tenantId));

    // Fetch skills for each employee
    const employeeData: EmployeeSkillData[] = [];
    for (const emp of employees) {
      const empSkills = await this.getEmployeeSkills(emp.id);
      employeeData.push({
        employeeId: emp.id,
        name: emp.name || 'Unknown',
        department: emp.departmentId || 'General',
        role: emp.role,
        skills: empSkills,
        experience: 0
      });
    }

    return employeeData;
  }

  private async getEmployeeSkills(employeeId: string): Promise<Skill[]> {
    // Fetch skills from database
    const userSkills = await db.select().from(skills).where(eq(skills.userId, employeeId));

    return userSkills.map((s: Record<string, unknown>) => ({
      name: s.name as string,
      category: s.category as 'technical' | 'soft' | 'leadership' | 'analytical' | 'communication',
      level: s.level as 'beginner' | 'intermediate' | 'advanced' | 'expert',
      yearsOfExperience: s.yearsOfExperience as number,
      verified: s.verified as boolean
    }));
  }

  private calculateSkillsGaps(
    currentSkills: Skill[],
    requiredSkills: Skill[]
  ): SkillsGap[] {
    const gaps: SkillsGap[] = [];

    for (const required of requiredSkills) {
      const current = currentSkills.find(s => s.name === required.name);

      if (!current || this.getSkillLevelScore(current.level) < this.getSkillLevelScore(required.level)) {
        gaps.push({
          skill: required.name,
          category: required.category,
          currentLevel: current?.level || 'none',
          requiredLevel: required.level,
          gap: this.calculateGapSeverity(current?.level, required.level),
          priority: this.calculatePriority(required),
          employeesAffected: 1,
          businessImpact: this.assessBusinessImpact(required)
        });
      }
    }

    return gaps;
  }

  private getSkillLevelScore(level: string): number {
    const scores: Record<string, number> = {
      none: 0,
      beginner: 1,
      intermediate: 2,
      advanced: 3,
      expert: 4
    };
    return scores[level] || 0;
  }

  private calculateGapSeverity(
    currentLevel: string | undefined,
    requiredLevel: string
  ): 'critical' | 'high' | 'medium' | 'low' {
    const gap = this.getSkillLevelScore(requiredLevel) - this.getSkillLevelScore(currentLevel || 'none');

    if (gap >= 3) return 'critical';
    if (gap === 2) return 'high';
    if (gap === 1) return 'medium';
    return 'low';
  }

  private calculatePriority(skill: Skill): number {
    // Priority based on skill category and level
    const categoryPriority: Record<string, number> = {
      leadership: 5,
      technical: 4,
      analytical: 3,
      communication: 2,
      soft: 1
    };

    const levelPriority: Record<string, number> = {
      expert: 4,
      advanced: 3,
      intermediate: 2,
      beginner: 1
    };

    return (categoryPriority[skill.category] || 1) * (levelPriority[skill.level] || 1);
  }

  private assessBusinessImpact(skill: Skill): string {
    // Assess the business impact of missing this skill
    const impacts: Record<string, string> = {
      leadership: 'Strategic execution and team performance',
      technical: 'Product quality and innovation capability',
      analytical: 'Decision making and problem solving',
      communication: 'Collaboration and stakeholder management',
      soft: 'Team dynamics and culture'
    };

    return impacts[skill.category] || 'General productivity';
  }

  private generateDevelopmentPlan(gaps: SkillsGap[]): string[] {
    // Generate personalized development plan based on gaps
    return gaps
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5)
      .map(gap => `Develop ${gap.skill} from ${gap.currentLevel} to ${gap.requiredLevel}`);
  }

  private generateLearningPaths(gaps: SkillsGap[]): string[] {
    // Generate learning path recommendations
    return gaps.map(gap => {
      const paths: Record<string, string[]> = {
        technical: ['Online Course', 'Certification', 'Hands-on Project'],
        leadership: ['Mentoring', 'Leadership Workshop', 'Stretch Assignment'],
        communication: ['Presentation Training', 'Writing Workshop', 'Public Speaking'],
        analytical: ['Data Analysis Course', 'Problem Solving Workshop', 'Case Studies'],
        soft: ['Team Exercises', 'Feedback Sessions', 'Coaching']
      };

      return paths[gap.category]?.join(', ') || 'Self-directed Learning';
    });
  }

  /**
   * Parse CSV data into employee skill data
   * Expected CSV format:
   * employee_id,employee_name,department,role,skill_name,skill_category,skill_level,years_of_experience,experience
   *
   * Alternative format (one employee per row with multiple skills):
   * employee_id,employee_name,department,role,skills (JSON array),experience
   */
  private async parseCSVData(csvData: unknown): Promise<EmployeeSkillData[]> {
    try {
      if (!Array.isArray(csvData)) {
        logger.error('CSV data is not an array');
        return [];
      }

      // Group skills by employee
      const employeeMap = new Map<string, EmployeeSkillData>();

      for (const record of csvData as Array<Record<string, string>>) {
        const employeeId = record.employee_id || record.employeeId || '';
        const employeeName = record.employee_name || record.name || '';
        const department = record.department || '';
        const role = record.role || '';
        const experience = parseInt(record.experience || '0', 10);

        if (!employeeId || !employeeName) {
          logger.warn('Skipping CSV record with missing employee_id or employee_name:', record);
          continue;
        }

        // Get or create employee entry
        if (!employeeMap.has(employeeId)) {
          employeeMap.set(employeeId, {
            employeeId,
            name: employeeName,
            department,
            role,
            skills: [],
            experience
          });
        }

        const employee = employeeMap.get(employeeId)!;

        // Check if skills are provided as JSON array in one column
        if (record.skills) {
          try {
            const skillsArray = JSON.parse(record.skills);
            if (Array.isArray(skillsArray)) {
              for (const skill of skillsArray) {
                employee.skills.push({
                  name: skill.name || skill.skill_name,
                  category: this.normalizeCategory(skill.category || skill.skill_category || 'technical'),
                  level: this.normalizeLevel(skill.level || skill.skill_level || 'intermediate'),
                  yearsOfExperience: skill.years_of_experience || skill.yearsOfExperience,
                  verified: false
                });
              }
            }
          } catch (error) {
            logger.warn('Failed to parse skills JSON:', error);
          }
        }
        // Otherwise, expect one skill per row
        else if (record.skill_name || record.skillName) {
          const skillName = record.skill_name || record.skillName || '';
          const skillCategory = record.skill_category || record.skillCategory || 'technical';
          const skillLevel = record.skill_level || record.skillLevel || 'intermediate';
          const yearsOfExp = record.years_of_experience || record.yearsOfExperience;

          if (skillName) {
            employee.skills.push({
              name: skillName.trim(),
              category: this.normalizeCategory(skillCategory),
              level: this.normalizeLevel(skillLevel),
              yearsOfExperience: yearsOfExp ? parseInt(yearsOfExp, 10) : undefined,
              verified: false
            });
          }
        }
      }

      return Array.from(employeeMap.values());

    } catch (error) {
      logger.error('Error parsing CSV data:', error);
      return [];
    }
  }

  /**
   * Extract skills from resume text using AI analysis
   * Uses Knowledge Engine for skill recognition and categorization
   * Production-ready implementation with AI provider integration
   */
  private async extractSkillsFromResume(resumeText: string): Promise<Skill[]> {
    try {
      logger.info('[Skills Agent] Starting skill extraction from resume', {
        resumeLength: resumeText.length,
        resumePreview: resumeText.substring(0, 200) + '...',
        timestamp: new Date().toISOString()
      });

      const prompt = `Analyze the following resume and extract all professional skills. Categorize each skill and assess the proficiency level based on the context.

Resume Text:
${resumeText}

Please extract skills in the following JSON format:
{
  "skills": [
    {
      "name": "skill name",
      "category": "technical|soft|leadership|analytical|communication",
      "level": "beginner|intermediate|advanced|expert",
      "yearsOfExperience": number (if mentioned),
      "verified": false
    }
  ]
}

Guidelines:
- Technical: Programming languages, software, tools, frameworks, technical methodologies
- Soft: Interpersonal, teamwork, adaptability, time management
- Leadership: Management, mentoring, strategic planning, decision-making
- Analytical: Data analysis, problem-solving, research, critical thinking
- Communication: Writing, presenting, negotiation, public speaking

Assess level based on:
- Job titles and responsibilities
- Years of experience mentioned
- Project complexity
- Certifications and achievements`;

      logger.info('[Skills Agent] Calling Data Engine for skill extraction', {
        agent: 'skills',
        engine: 'data',
        promptLength: prompt.length,
        temperature: 0.3,
        requireJson: true
      });

      // Use Data Engine for extraction (requires precision)
      const response = await this.dataAI.call({
        agent: 'skills',
        engine: 'data',
        prompt,
        requireJson: true,
        temperature: 0.3  // Low temperature for consistent extraction
      });

      logger.info('[Skills Agent] Received AI response for skill extraction', {
        provider: response.provider,
        confidence: response.confidence,
        narrativeType: typeof response.narrative,
        narrativeLength: typeof response.narrative === 'string' ? response.narrative.length : JSON.stringify(response.narrative).length,
        timestamp: new Date().toISOString()
      });

      // Parse AI response
      const parsedResponse = typeof response.narrative === 'string'
        ? JSON.parse(response.narrative)
        : response.narrative;

      if (!parsedResponse.skills || !Array.isArray(parsedResponse.skills)) {
        logger.warn('[Skills Agent] AI returned invalid skills format', {
          hasSkillsProperty: 'skills' in parsedResponse,
          skillsType: typeof parsedResponse.skills,
          isArray: Array.isArray(parsedResponse.skills),
          parsedResponseKeys: Object.keys(parsedResponse)
        });
        return [];
      }

      // Validate and normalize skills
      const extractedSkills = parsedResponse.skills
        .filter((skill: Record<string, unknown>) => skill.name && skill.category && skill.level)
        .map((skill: Record<string, unknown>) => ({
          name: (skill.name as string).trim(),
          category: this.normalizeCategory(skill.category as string),
          level: this.normalizeLevel(skill.level as string),
          yearsOfExperience: (skill.yearsOfExperience as number) || undefined,
          verified: false
        }));

      logger.info('[Skills Agent] Successfully extracted and normalized skills', {
        totalRawSkills: parsedResponse.skills.length,
        validSkills: extractedSkills.length,
        skills: extractedSkills.map(s => `${s.name} (${s.category}/${s.level})`),
        timestamp: new Date().toISOString()
      });

      return extractedSkills;

    } catch (error) {
      logger.error('[Skills Agent] Error extracting skills from resume:', error);
      logger.error('[Skills Agent] Error context:', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        resumeLength: resumeText.length,
        timestamp: new Date().toISOString()
      });
      // Return empty array instead of throwing to allow graceful degradation
      return [];
    }
  }

  /**
   * Normalize skill category to valid enum value
   */
  private normalizeCategory(category: string): Skill['category'] {
    const cat = category.toLowerCase().trim();
    const validCategories = ['technical', 'soft', 'leadership', 'analytical', 'communication'];

    if (validCategories.includes(cat)) {
      return cat as Skill['category'];
    }

    // Smart mapping for common variations
    if (cat.includes('tech') || cat.includes('program') || cat.includes('software')) return 'technical';
    if (cat.includes('lead') || cat.includes('manag')) return 'leadership';
    if (cat.includes('commun') || cat.includes('present')) return 'communication';
    if (cat.includes('analy') || cat.includes('data')) return 'analytical';

    return 'technical'; // default fallback
  }

  /**
   * Normalize skill level to valid enum value
   */
  private normalizeLevel(level: string): Skill['level'] {
    const lvl = level.toLowerCase().trim();
    const validLevels = ['beginner', 'intermediate', 'advanced', 'expert'];

    if (validLevels.includes(lvl)) {
      return lvl as Skill['level'];
    }

    // Smart mapping for common variations
    if (lvl.includes('begin') || lvl.includes('entry') || lvl.includes('junior')) return 'beginner';
    if (lvl.includes('inter') || lvl.includes('mid')) return 'intermediate';
    if (lvl.includes('advan') || lvl.includes('senior')) return 'advanced';
    if (lvl.includes('expert') || lvl.includes('master') || lvl.includes('lead')) return 'expert';

    return 'intermediate'; // default fallback
  }

  /**
   * Create LXP trigger for learning path generation
   * Production-ready implementation with proper error handling and validation
   */
  private async createLXPTrigger(
    employeeId: string,
    tenantId: string,
    sessionId: string,
    criticalGaps: SkillsGap[]
  ): Promise<void> {
    try {
      // Validate inputs
      if (!employeeId || !tenantId || !criticalGaps || criticalGaps.length === 0) {
        logger.warn('[Skills Agent] createLXPTrigger: Invalid inputs', {
          hasEmployeeId: !!employeeId,
          hasTenantId: !!tenantId,
          gapsCount: criticalGaps?.length || 0
        });
        return;
      }

      // Filter gaps by priority - only trigger for critical and high gaps
      const highPriorityGaps = criticalGaps.filter(gap =>
        gap.gap === 'critical' || gap.gap === 'high'
      );

      if (highPriorityGaps.length === 0) {
        logger.info('[Skills Agent] No high-priority gaps to trigger LXP for');
        return;
      }

      // Generate learning path recommendations for each gap
      const learningPaths = highPriorityGaps.map(gap => ({
        skillName: gap.skill,
        category: gap.category,
        currentLevel: gap.currentLevel,
        targetLevel: gap.requiredLevel,
        priority: gap.gap,
        estimatedDuration: this.estimateLearningDuration(gap),
        recommendedResources: this.generateLearningResources(gap)
      }));

      // Import skillsLearningTriggers table
      const { skillsLearningTriggers } = await import('../../../../db/schema/skills.js');

      // Insert trigger record
      await db.insert(skillsLearningTriggers).values({
        id: randomUUID(),
        tenantId,
        employeeId,
        sessionId,
        skillGaps: highPriorityGaps as unknown as Record<string, unknown>,
        learningPaths: learningPaths as unknown as Record<string, unknown>,
        priority: highPriorityGaps[0].gap, // Use highest priority gap
        status: 'pending',
        lxpPathId: null,
        createdAt: new Date(),
        processedAt: null
      });

      logger.info(`[Skills Agent] Created LXP trigger for employee ${employeeId} with ${highPriorityGaps.length} skill gaps`);
    } catch (error) {
      // Non-blocking error - log and continue
      logger.error('[Skills Agent] Error creating LXP trigger:', error);
      logger.error('[Skills Agent] Trigger data:', {
        employeeId,
        tenantId,
        sessionId,
        gapsCount: criticalGaps.length
      });
    }
  }

  /**
   * Estimate learning duration based on gap severity and skill complexity
   */
  private estimateLearningDuration(gap: SkillsGap): string {
    const severityMultiplier = {
      critical: 3,
      high: 2,
      medium: 1.5,
      low: 1
    };

    const levelDifference = this.getSkillLevelScore(gap.requiredLevel) -
                           this.getSkillLevelScore(gap.currentLevel);

    const baseWeeks = 4; // Base learning time
    const estimatedWeeks = Math.ceil(baseWeeks * levelDifference * severityMultiplier[gap.gap]);

    if (estimatedWeeks <= 4) return '1-4 weeks';
    if (estimatedWeeks <= 8) return '1-2 months';
    if (estimatedWeeks <= 12) return '2-3 months';
    return '3-6 months';
  }

  /**
   * Generate learning resource recommendations based on skill gap
   */
  private generateLearningResources(gap: SkillsGap): string[] {
    const resources: string[] = [];

    // Recommend resources based on category
    switch (gap.category) {
      case 'technical':
        resources.push('Online Course (Udemy/Coursera)');
        resources.push('Hands-on Project');
        resources.push('Technical Certification');
        break;
      case 'leadership':
        resources.push('Leadership Workshop');
        resources.push('Executive Mentoring');
        resources.push('Stretch Assignment');
        break;
      case 'communication':
        resources.push('Presentation Training');
        resources.push('Writing Workshop');
        resources.push('Public Speaking Course');
        break;
      case 'analytical':
        resources.push('Data Analysis Course');
        resources.push('Problem Solving Workshop');
        resources.push('Case Study Practice');
        break;
      case 'soft':
        resources.push('Team Collaboration Exercises');
        resources.push('Coaching Sessions');
        resources.push('Feedback Training');
        break;
      default:
        resources.push('Self-directed Learning');
        resources.push('On-the-job Training');
    }

    return resources.slice(0, 3); // Return top 3 recommendations
  }

  private async triggerLXPModule(
    gaps: SkillsGap[],
    tenantId: string
  ): Promise<Array<{ employeeId: string; skillGaps: SkillsGap[]; learningPaths: string[] }>> {
    // Trigger LXP module for learning path creation
    logger.info(`Triggering LXP module for ${gaps.length} skill gaps`);

    // Create triggers in database
    const { triggers } = await import('../../../../db/schema.js');

    for (const gap of gaps) {
      await db.insert(triggers).values({
        id: randomUUID(),
        tenantId: tenantId,
        name: `Skills Gap: ${gap.skill}`,
        description: `Critical skill gap identified: ${gap.skill}`,
        type: 'event_based',
        sourceModule: 'skills_analysis',
        eventType: 'skill_gap_critical',
        conditions: {
          gap: gap.gap,
          skill: gap.skill
        },
        targetModule: 'lxp',
        action: 'create_learning_path',
        actionConfig: {
          skill: gap.skill,
          currentLevel: gap.currentLevel,
          targetLevel: gap.requiredLevel,
          priority: gap.priority
        },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    return [];
  }

  private async triggerTalentModule(
    talentTriggers: Array<{ employeeId: string; potentialRole: string; readinessScore: number }>,
    tenantId: string,
    sessionId?: string
  ): Promise<void> {
    if (talentTriggers.length === 0) {
      logger.info('[Skills Agent] No talent triggers to process');
      return;
    }

    logger.info(`[Skills Agent] Triggering Talent module for ${talentTriggers.length} employees`);

    try {
      // Import the trigger table
      const { skillsTalentTriggers } = await import('../../../db/schema/skills');

      for (const trigger of talentTriggers) {
        try {
          // Store trigger in database
          const [triggerRecord] = await db.insert(skillsTalentTriggers).values({
            tenantId,
            employeeId: trigger.employeeId,
            sessionId: sessionId || `skills-${Date.now()}`,
            skillsData: {
              readinessScore: trigger.readinessScore,
              potentialRole: trigger.potentialRole,
              timestamp: new Date().toISOString()
            },
            potentialRoles: [trigger.potentialRole],
            readinessScore: trigger.readinessScore,
            status: 'pending'
          }).returning();

          logger.info(`[Skills Agent] Talent trigger created for employee ${trigger.employeeId}: ${triggerRecord.id}`);

          // Optionally, call the Talent API to process immediately
          // This would require an HTTP client or direct function call
          // For now, we'll let the Talent module poll for pending triggers

        } catch (error) {
          logger.error(`[Skills Agent] Failed to create talent trigger for employee ${trigger.employeeId}:`, error);
        }
      }

      logger.info(`[Skills Agent] Successfully created ${talentTriggers.length} talent trigger(s)`);

    } catch (error) {
      logger.error('[Skills Agent] Error in triggerTalentModule:', error);
      throw error;
    }
  }

  private async triggerBonusModule(
    bonusTriggers: Array<{ employeeId: string; skillsAchieved: string[]; recommendedBonus: number }>,
    tenantId: string,
    sessionId?: string
  ): Promise<void> {
    if (bonusTriggers.length === 0) {
      logger.info('[Skills Agent] No bonus triggers to process');
      return;
    }

    logger.info(`[Skills Agent] Triggering Bonus module for ${bonusTriggers.length} employees`);

    try {
      // Import the trigger table
      const { skillsBonusTriggers } = await import('../../../db/schema/skills');

      for (const trigger of bonusTriggers) {
        try {
          // Store trigger in database
          const [triggerRecord] = await db.insert(skillsBonusTriggers).values({
            tenantId,
            employeeId: trigger.employeeId,
            sessionId: sessionId || `skills-${Date.now()}`,
            skillsAchievements: trigger.skillsAchieved,
            recommendedBonus: trigger.recommendedBonus,
            bonusCriteria: {
              source: 'skills_assessment',
              achievedSkills: trigger.skillsAchieved,
              timestamp: new Date().toISOString()
            },
            status: 'pending'
          }).returning();

          logger.info(`[Skills Agent] Bonus trigger created for employee ${trigger.employeeId}: ${triggerRecord.id}`);

          // Optionally, call the Bonus API to process immediately
          // This would require an HTTP client or direct function call
          // For now, we'll let the Bonus module poll for pending triggers

        } catch (error) {
          logger.error(`[Skills Agent] Failed to create bonus trigger for employee ${trigger.employeeId}:`, error);
        }
      }

      logger.info(`[Skills Agent] Successfully created ${bonusTriggers.length} bonus trigger(s)`);

    } catch (error) {
      logger.error('[Skills Agent] Error in triggerBonusModule:', error);
      throw error;
    }
  }

  private async saveSkillsAnalysis(
    analysis: SkillsAnalysisResult,
    input: SkillsAnalysisInput,
    sessionId?: string
  ): Promise<void> {
    // Save analysis results to database
    const assessmentId = sessionId || randomUUID();

    await db.insert(skillsAssessments).values({
      id: assessmentId,
      tenantId: input.tenantId,
      userId: input.companyId, // Use companyId as userId for organization-level assessments
      analysisData: JSON.stringify(analysis),
      overallScore: analysis.overallScore,
      strategicAlignment: analysis.strategicAlignment,
      criticalGapsCount: analysis.criticalGaps.length,
      currentSkills: input.employeeData ? JSON.stringify(input.employeeData) : null,
      requiredSkills: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Save individual skill gaps
    for (const gap of analysis.criticalGaps) {
      await db.insert(skillsGaps).values({
        id: randomUUID(),
        tenantId: input.tenantId,
        skill: gap.skill,
        category: gap.category,
        currentLevel: gap.currentLevel,
        requiredLevel: gap.requiredLevel,
        gapSeverity: gap.gap,
        priority: gap.priority,
        businessImpact: gap.businessImpact,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }

  /**
   * Handle LXP completion and update skills profile
   * Called by LXP module when a learning path is completed
   * Production-ready with comprehensive validation and error handling
   */
  async handleLXPCompletion(input: {
    employeeId: string;
    tenantId: string;
    learningExperienceId: string;
    skillsAcquired: Array<{
      skillName: string;
      skillCategory: string;
      skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
      evidenceType: string;
      validationStatus: 'pending' | 'validated' | 'not_validated' | 'requires_review';
    }>;
    completionPercentage: number;
    totalScore: number;
  }): Promise<{
    success: boolean;
    profileUpdated: boolean;
    skillsUpdated: number;
    message: string;
  }> {
    try {
      // Validate inputs
      if (!input.employeeId || !input.tenantId || !input.learningExperienceId) {
        return {
          success: false,
          profileUpdated: false,
          skillsUpdated: 0,
          message: 'Missing required fields: employeeId, tenantId, or learningExperienceId'
        };
      }

      if (!input.skillsAcquired || input.skillsAcquired.length === 0) {
        return {
          success: true,
          profileUpdated: false,
          skillsUpdated: 0,
          message: 'No skills to update'
        };
      }

      // Import skills table
      const { skills, skillsProgress, skillsLearningTriggers } = await import('../../../../db/schema/skills.js');

      let skillsUpdated = 0;

      // Update or create skill records for validated skills
      for (const skill of input.skillsAcquired) {
        if (skill.validationStatus !== 'validated' && skill.validationStatus !== 'pending') {
          logger.warn(`[Skills Agent] Skipping non-validated skill: ${skill.skillName}`);
          continue;
        }

        try {
          // Check if skill already exists for employee
          const existingSkill = await db.select()
            .from(skills)
            .where(and(
              eq(skills.userId, input.employeeId),
              eq(skills.name, skill.skillName)
            ))
            .limit(1);

          if (existingSkill.length > 0) {
            // Update existing skill if new level is higher
            const currentLevelScore = this.getSkillLevelScore(existingSkill[0].level);
            const newLevelScore = this.getSkillLevelScore(skill.skillLevel);

            if (newLevelScore > currentLevelScore) {
              await db.update(skills)
                .set({
                  level: skill.skillLevel,
                  verified: skill.validationStatus === 'validated',
                  updatedAt: new Date()
                })
                .where(eq(skills.id, existingSkill[0].id));

              skillsUpdated++;
              logger.info(`[Skills Agent] Updated skill ${skill.skillName} for employee ${input.employeeId} to ${skill.skillLevel}`);
            }
          } else {
            // Create new skill record
            await db.insert(skills).values({
              id: randomUUID(),
              userId: input.employeeId,
              tenantId: input.tenantId,
              name: skill.skillName,
              category: skill.skillCategory as any,
              level: skill.skillLevel,
              verified: skill.validationStatus === 'validated',
              createdAt: new Date(),
              updatedAt: new Date()
            });

            skillsUpdated++;
            logger.info(`[Skills Agent] Created new skill ${skill.skillName} for employee ${input.employeeId}`);
          }

          // Update progress tracking
          await db.update(skillsProgress)
            .set({
              currentLevel: skill.skillLevel,
              progressPercentage: 100,
              lastUpdated: new Date()
            })
            .where(and(
              eq(skillsProgress.employeeId, input.employeeId),
              eq(skillsProgress.skillName, skill.skillName)
            ));

        } catch (error) {
          logger.error(`[Skills Agent] Error updating skill ${skill.skillName}:`, error);
          // Continue with other skills even if one fails
        }
      }

      // Update LXP trigger status to completed
      try {
        await db.update(skillsLearningTriggers)
          .set({
            status: 'completed',
            lxpPathId: input.learningExperienceId,
            processedAt: new Date()
          })
          .where(and(
            eq(skillsLearningTriggers.employeeId, input.employeeId),
            eq(skillsLearningTriggers.status, 'pending')
          ));
      } catch (error) {
        logger.error('[Skills Agent] Error updating trigger status:', error);
        // Non-critical - continue
      }

      // Trigger re-analysis if significant skills were acquired
      if (skillsUpdated >= 2 && input.completionPercentage === 100) {
        logger.info(`[Skills Agent] Employee ${input.employeeId} acquired ${skillsUpdated} skills - triggering automatic re-analysis check`);

        // Check if re-analysis triggers are met and automatically queue if needed
        try {
          const reAnalysisTriggered = await skillsReAnalysisService.checkReAnalysisTriggers(
            input.employeeId,
            input.tenantId
          );

          if (reAnalysisTriggered) {
            logger.info(`[Skills Agent] Re-analysis successfully queued for employee ${input.employeeId}`);
          } else {
            logger.info(`[Skills Agent] Re-analysis not needed at this time for employee ${input.employeeId}`);
          }
        } catch (error) {
          logger.error('[Skills Agent] Error checking re-analysis triggers:', error);
          // Non-critical - continue even if re-analysis check fails
        }
      }

      return {
        success: true,
        profileUpdated: true,
        skillsUpdated,
        message: `Successfully updated ${skillsUpdated} skill(s) for employee`
      };

    } catch (error) {
      logger.error('[Skills Agent] Error handling LXP completion:', error);
      return {
        success: false,
        profileUpdated: false,
        skillsUpdated: 0,
        message: `Failed to handle LXP completion: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Handle interactive bot queries about skills
   */
  async handleBotQuery(
    query: string,
    tenantId: string,
    context?: Record<string, unknown>
  ): Promise<{
    answer: string;
    intent: string;
    confidence: number;
    suggestions: string[];
  }> {
    try {
      const prompt = `You are an AI skills advisor helping with organizational skills analysis.

User query: "${query}"

Context: ${context ? JSON.stringify(context) : 'No additional context provided'}

Please provide:
1. A clear, helpful answer to the query
2. The intent of the question (e.g., "skills_gap", "training_recommendation", "employee_assessment", "general_inquiry")
3. Your confidence level (0-1)
4. 2-3 helpful follow-up suggestions

Respond in JSON format:
{
  "answer": "your answer here",
  "intent": "intent category",
  "confidence": 0.85,
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
}`;

      const response = await this.reasoningAI.call({
        agent: 'skills',
        engine: 'reasoning',
        prompt,
        requireJson: true,
        temperature: 0.6
      });

      const parsedResponse = typeof response.narrative === 'string'
        ? JSON.parse(response.narrative)
        : response.narrative;

      return {
        answer: parsedResponse.answer || 'I apologize, but I could not process your query.',
        intent: parsedResponse.intent || 'unknown',
        confidence: parsedResponse.confidence || 0.5,
        suggestions: parsedResponse.suggestions || []
      };

    } catch (error) {
      logger.error('Error handling bot query:', error);
      return {
        answer: 'I apologize, but I encountered an error processing your query. Please try rephrasing or contact support.',
        intent: 'error',
        confidence: 0,
        suggestions: []
      };
    }
  }

  /**
   * Analyze skills at department level
   */
  async analyzeDepartmentSkills(
    departmentId: string,
    tenantId: string
  ): Promise<{
    departmentId: string;
    totalEmployees: number;
    skillsCoverage: Record<string, number>;
    criticalGaps: SkillsGap[];
    topSkills: Array<{ skill: string; proficiency: number; employeeCount: number }>;
    recommendations: string[];
  }> {
    try {
      // Get all skills for employees in the department
      const departmentSkills = await db.select()
        .from(skills)
        .innerJoin(users, eq(skills.userId, users.id))
        .where(and(
          eq(skills.tenantId, tenantId),
          eq(users.departmentId, departmentId)
        ));

      // Aggregate skills data
      const skillsMap = new Map<string, { count: number; levels: string[] }>();

      for (const row of departmentSkills) {
        const skill = row.skills;
        const existing = skillsMap.get(skill.name);
        if (existing) {
          existing.count++;
          existing.levels.push(skill.level);
        } else {
          skillsMap.set(skill.name, { count: 1, levels: [skill.level] });
        }
      }

      // Calculate top skills
      const topSkills = Array.from(skillsMap.entries())
        .map(([skill, data]) => ({
          skill,
          proficiency: this.calculateAverageProficiency(data.levels),
          employeeCount: data.count
        }))
        .sort((a, b) => b.proficiency - a.proficiency)
        .slice(0, 10);

      return {
        departmentId,
        totalEmployees: new Set(departmentSkills.map(s => s.users.id)).size,
        skillsCoverage: {},
        criticalGaps: [],
        topSkills,
        recommendations: [
          'Focus on upskilling in identified gap areas',
          'Leverage top performers as mentors',
          'Consider cross-training programs'
        ]
      };

    } catch (error) {
      logger.error('Error analyzing department skills:', error);
      throw new Error('Failed to analyze department skills');
    }
  }

  /**
   * Analyze skills at organization level
   */
  async analyzeOrganizationSkills(
    tenantId: string
  ): Promise<{
    totalEmployees: number;
    totalSkills: number;
    skillsCoverage: Record<string, number>;
    departmentComparison: Array<{
      departmentId: string;
      departmentName: string;
      skillsScore: number;
      criticalGaps: number;
    }>;
    organizationGaps: SkillsGap[];
    strategicAlignment: number;
    recommendations: string[];
  }> {
    try {
      // Get all skills for the organization
      const orgSkills = await db.select()
        .from(skills)
        .where(eq(skills.tenantId, tenantId));

      // Get unique employees
      const uniqueEmployees = new Set(orgSkills.map(s => s.userId)).size;

      // Get skills gaps
      const gaps = await db.select()
        .from(skillsGaps)
        .where(eq(skillsGaps.tenantId, tenantId));

      // Map database gaps to SkillsGap interface
      const mappedGaps: SkillsGap[] = gaps.map(gap => ({
        skill: gap.skill,
        category: gap.category,
        currentLevel: gap.currentLevel,
        requiredLevel: gap.requiredLevel,
        gap: gap.gapSeverity as 'critical' | 'high' | 'medium' | 'low',
        priority: gap.priority,
        employeesAffected: 1, // Default to 1, could aggregate by skill if needed
        businessImpact: gap.businessImpact
      }));

      // Calculate real department comparison
      const tenantDepartments = await db.select()
        .from(departments)
        .where(eq(departments.tenantId, tenantId));

      const departmentComparison = await Promise.all(
        tenantDepartments.map(async (dept) => {
          // Get users in this department
          const deptUsers = await db.select()
            .from(users)
            .where(and(
              eq(users.tenantId, tenantId),
              eq(users.departmentId, dept.id)
            ));

          const userIds = deptUsers.map(u => u.id);

          // Get skills for department users
          const deptSkills = orgSkills.filter(s => userIds.includes(s.userId));

          // Calculate average proficiency score
          const proficiencyScores = deptSkills.map(s => {
            const levelMap: Record<string, number> = {
              beginner: 25,
              intermediate: 50,
              advanced: 75,
              expert: 100
            };
            return levelMap[s.level] || 0;
          });

          const avgScore = proficiencyScores.length > 0
            ? Math.round(proficiencyScores.reduce((a, b) => a + b, 0) / proficiencyScores.length)
            : 0;

          // Count critical gaps for this department
          const deptGaps = gaps.filter(g => userIds.includes(g.employeeId!));
          const criticalGaps = deptGaps.filter(g => g.gapSeverity === 'critical').length;

          return {
            departmentId: dept.id,
            departmentName: dept.name,
            skillsScore: avgScore,
            criticalGaps
          };
        })
      );

      // Calculate real strategic alignment
      let strategicAlignment = 0;
      try {
        const framework = await db.select()
          .from(skillsFramework)
          .where(eq(skillsFramework.tenantId, tenantId))
          .limit(1);

        if (framework.length > 0 && framework[0].strategicSkills) {
          const requiredSkills = (framework[0].strategicSkills as Record<string, unknown>[]) || [];
          const requiredSkillNames = requiredSkills.map((s: Record<string, unknown>) =>
            ((s.name as string) || (s.skill as string) || '').toLowerCase()
          );

          const orgSkillNames = new Set(
            orgSkills.map(s => s.name.toLowerCase())
          );

          const matchedSkills = requiredSkillNames.filter((name: string) =>
            orgSkillNames.has(name)
          ).length;

          strategicAlignment = requiredSkillNames.length > 0
            ? Math.round((matchedSkills / requiredSkillNames.length) * 100)
            : 0;
        }
      } catch (frameworkError) {
        logger.info('[Organization Analysis] No framework found or error calculating alignment:', frameworkError);
        // strategicAlignment remains 0
      }

      // Generate context-aware recommendations based on actual gaps
      const recommendations: string[] = [];

      // Analyze gap patterns
      const gapsBySkill: Record<string, number> = {};
      gaps.forEach(gap => {
        const skill = gap.skill.toLowerCase();
        gapsBySkill[skill] = (gapsBySkill[skill] || 0) + 1;
      });

      // Sort by frequency
      const sortedGaps = Object.entries(gapsBySkill)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);

      // Generate specific recommendations
      if (sortedGaps.length > 0) {
        sortedGaps.forEach(([skill, count]) => {
          recommendations.push(
            `Address ${skill} skill gap affecting ${count} employee${count > 1 ? 's' : ''} - consider targeted training programs`
          );
        });
      }

      // Add department-specific recommendations if there are large variances
      const scores = departmentComparison.map(d => d.skillsScore);
      if (scores.length > 1) {
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);
        if (maxScore - minScore > 30) {
          const topDept = departmentComparison.find(d => d.skillsScore === maxScore);
          const bottomDept = departmentComparison.find(d => d.skillsScore === minScore);
          recommendations.push(
            `Establish knowledge sharing program between ${topDept?.departmentName} and ${bottomDept?.departmentName} departments to level up skills`
          );
        }
      }

      // Add general recommendations if needed
      if (recommendations.length === 0) {
        recommendations.push('Implement organization-wide skills development program');
        recommendations.push('Create skills councils for critical skill areas');
        recommendations.push('Establish mentorship programs for knowledge transfer');
      }

      return {
        totalEmployees: uniqueEmployees,
        totalSkills: orgSkills.length,
        skillsCoverage: {},
        departmentComparison,
        organizationGaps: mappedGaps,
        strategicAlignment,
        recommendations
      };

    } catch (error) {
      logger.error('Error analyzing organization skills:', error);
      throw new Error('Failed to analyze organization skills');
    }
  }

  /**
   * Calculate average proficiency from skill levels
   */
  private calculateAverageProficiency(levels: string[]): number {
    const levelMap: Record<string, number> = {
      beginner: 1,
      intermediate: 2,
      advanced: 3,
      expert: 4
    };

    const sum = levels.reduce((acc, level) => acc + (levelMap[level] || 0), 0);
    return sum / levels.length;
  }
}

// Export singleton instance
export const skillsAgent = new SkillsAgent();