// backend/src/services/agents/skills/skills-agent.ts

import { ThreeEngineAgent, ThreeEngineConfig } from '../base/three-engine-agent';
import { db } from '../../../../db/index';
import { tenants, users, departments, skills, skillsAssessments, skillsGaps, skillsFramework } from '../../../../db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

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

export interface SkillsFramework {
  tenantId: string;
  strategicSkills: Skill[];
  industryBenchmarks: Skill[];
  criticalSkills: Skill[];
  emergingSkills: Skill[];
  obsoleteSkills: Skill[];
}

export interface SkillsAnalysisResult {
  overallScore: number;
  strategicAlignment: number;
  skillsCoverage: number;
  criticalGaps: SkillsGap[];

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
    7. Hiring needs based on skill gaps

    Provide specific, actionable recommendations with clear priorities and expected impact.`;
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
    // Get strategy if not provided
    if (!input.strategy) {
      const strategy = await this.getCompanyStrategy(input.companyId);
      input.strategy = strategy;
    }

    // Get employee data if not provided
    if (!input.employeeData) {
      input.employeeData = await this.getEmployeeSkillsData(input.tenantId);
    }

    // Execute three-engine analysis - cast input to Record<string, unknown>
    const result = await this.analyze(input as unknown as Record<string, unknown>);

    // Structure the result - parse it as SkillsAnalysisResult
    const analysis = this.parseSkillsAnalysisResult(result.finalOutput);

    // Trigger LXP module if critical gaps identified
    if (analysis.criticalGaps.length > 0) {
      analysis.lxpTriggers = await this.triggerLXPModule(analysis.criticalGaps, input.tenantId);
    }

    // Trigger Talent module for high-potential employees
    if (analysis.talentTriggers && analysis.talentTriggers.length > 0) {
      await this.triggerTalentModule(analysis.talentTriggers, input.tenantId);
    }

    // Trigger Bonus module for skills achievements
    if (analysis.bonusTriggers && analysis.bonusTriggers.length > 0) {
      await this.triggerBonusModule(analysis.bonusTriggers, input.tenantId);
    }

    // Save analysis results
    await this.saveSkillsAnalysis(analysis, input);

    return analysis;
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

    return {
      overallScore: typeof output.overallScore === 'number' ? output.overallScore : 0,
      strategicAlignment: typeof output.strategicAlignment === 'number' ? output.strategicAlignment : 0,
      skillsCoverage: typeof output.skillsCoverage === 'number' ? output.skillsCoverage : 0,
      criticalGaps: Array.isArray(output.criticalGaps) ? output.criticalGaps as SkillsGap[] : [],
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
    industry: string
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
        createdBy: tenantId, // Using tenantId as placeholder - should be actual user ID
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return framework;

    } catch (error) {
      console.error('Error creating strategic skills framework:', error);
      throw new Error('Failed to create strategic skills framework');
    }
  }

  /**
   * Normalize skill list to ensure proper structure
   */
  private normalizeSkillList(skills: any[]): Skill[] {
    return skills
      .filter((skill: any) => skill.name && skill.category && skill.level)
      .map((skill: any) => ({
        name: skill.name.trim(),
        category: this.normalizeCategory(skill.category),
        level: this.normalizeLevel(skill.level),
        yearsOfExperience: skill.yearsOfExperience,
        verified: true // Framework skills are considered verified
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
    employeeId: string;
    gaps: SkillsGap[];
    developmentPlan: string[];
    learningPaths: string[];
  }> {
    const employeeSkills = await this.getEmployeeSkills(employeeId);
    const gaps = this.calculateSkillsGaps(employeeSkills, framework.strategicSkills);

    return {
      employeeId,
      gaps,
      developmentPlan: this.generateDevelopmentPlan(gaps),
      learningPaths: this.generateLearningPaths(gaps)
    };
  }

  // Helper methods
  private async getCompanyStrategy(companyId: string): Promise<string> {
    const tenantResult = await db.select().from(tenants).where(eq(tenants.id, companyId)).limit(1);
    const tenant = tenantResult.length > 0 ? tenantResult[0] : null;
    return tenant?.strategy || '';
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
        console.error('CSV data is not an array');
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
          console.warn('Skipping CSV record with missing employee_id or employee_name:', record);
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
            console.warn('Failed to parse skills JSON:', error);
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
      console.error('Error parsing CSV data:', error);
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

      // Use Data Engine for extraction (requires precision)
      const response = await this.dataAI.call({
        agent: 'skills',
        engine: 'data',
        prompt,
        requireJson: true,
        temperature: 0.3  // Low temperature for consistent extraction
      });

      // Parse AI response
      const parsedResponse = typeof response.narrative === 'string'
        ? JSON.parse(response.narrative)
        : response.narrative;

      if (!parsedResponse.skills || !Array.isArray(parsedResponse.skills)) {
        console.warn('AI returned invalid skills format, returning empty array');
        return [];
      }

      // Validate and normalize skills
      return parsedResponse.skills
        .filter((skill: any) => skill.name && skill.category && skill.level)
        .map((skill: any) => ({
          name: skill.name.trim(),
          category: this.normalizeCategory(skill.category),
          level: this.normalizeLevel(skill.level),
          yearsOfExperience: skill.yearsOfExperience || undefined,
          verified: false
        }));

    } catch (error) {
      console.error('Error extracting skills from resume:', error);
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

  private async triggerLXPModule(
    gaps: SkillsGap[],
    tenantId: string
  ): Promise<Array<{ employeeId: string; skillGaps: SkillsGap[]; learningPaths: string[] }>> {
    // Trigger LXP module for learning path creation
    console.log(`Triggering LXP module for ${gaps.length} skill gaps`);

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
    tenantId: string
  ): Promise<void> {
    // Trigger Talent module for high-potential employees
    console.log(`Triggering Talent module for ${talentTriggers.length} employees`);
  }

  private async triggerBonusModule(
    bonusTriggers: Array<{ employeeId: string; skillsAchieved: string[]; recommendedBonus: number }>,
    tenantId: string
  ): Promise<void> {
    // Trigger Bonus module for skills achievements
    console.log(`Triggering Bonus module for ${bonusTriggers.length} employees`);
  }

  private async saveSkillsAnalysis(
    analysis: SkillsAnalysisResult,
    input: SkillsAnalysisInput
  ): Promise<void> {
    // Save analysis results to database
    await db.insert(skillsAssessments).values({
      id: randomUUID(),
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
   * Handle interactive bot queries about skills
   */
  async handleBotQuery(
    query: string,
    tenantId: string,
    context?: any
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
      console.error('Error handling bot query:', error);
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
      console.error('Error analyzing department skills:', error);
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

      return {
        totalEmployees: uniqueEmployees,
        totalSkills: orgSkills.length,
        skillsCoverage: {},
        departmentComparison: [],
        organizationGaps: mappedGaps,
        strategicAlignment: 75, // Placeholder - calculate based on framework alignment
        recommendations: [
          'Implement organization-wide skills development program',
          'Create skills councils for critical skill areas',
          'Establish mentorship programs for knowledge transfer'
        ]
      };

    } catch (error) {
      console.error('Error analyzing organization skills:', error);
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