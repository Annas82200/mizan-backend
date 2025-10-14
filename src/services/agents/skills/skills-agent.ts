// backend/src/services/agents/skills/skills-agent.ts

import { ThreeEngineAgent, ThreeEngineConfig } from '../base/three-engine-agent.js';
import { db } from '../../../../db/index.js';
import { tenants, users, departments, skills, skillsAssessments, skillsGaps } from '../../../../db/schema.js';
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

interface SkillCategoryAnalysis {
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

  protected async loadFrameworks(): Promise<void> {
    // Skills frameworks are loaded in getKnowledgeBase()
    // This includes industry standards, competency models, and development frameworks
  }

  protected async processData(inputData: SkillsAnalysisInput): Promise<SkillsAnalysisInput> {
    // Data processing is handled by the three-engine pipeline
    // Additional processing for resume extraction and CSV parsing happens here
    if (inputData.csvData) {
      inputData.employeeData = await this.parseCSVData(inputData.csvData);
    }
    if (inputData.resumeData) {
      for (const resume of inputData.resumeData) {
        resume.extractedSkills = await this.extractSkillsFromResume(resume.resumeText);
      }
    }
    return inputData;
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

  protected parseKnowledgeOutput(output: unknown): unknown {
    // Parse and structure knowledge engine output
    return output;
  }

  protected parseDataOutput(output: unknown): unknown {
    // Parse and structure data engine output
    return output;
  }

  protected parseReasoningOutput(output: unknown): SkillsAnalysisResult {
    // Parse and structure reasoning engine output into final result
    return output as SkillsAnalysisResult;
  }

  protected buildKnowledgePrompt(inputData: SkillsAnalysisInput): string {
    return `Analyze skills requirements for ${inputData.organizationName} in the ${inputData.industry} industry.

    Strategy: ${inputData.strategy || 'Not provided'}

    Provide:
    1. Industry-specific skill requirements and benchmarks
    2. Strategic skills needed to execute the company strategy
    3. Emerging skills trends in the industry
    4. Competency frameworks relevant to this organization
    5. Best practices for skills development in this context`;
  }

  protected buildDataPrompt(inputData: SkillsAnalysisInput): string {
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

  protected buildReasoningPrompt(inputData: SkillsAnalysisInput): string {
    return `Generate strategic skills analysis and recommendations for ${inputData.organizationName}:

    Context:
    - Industry: ${inputData.industry}
    - Strategy: ${inputData.strategy || 'Not provided'}

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

    // Execute three-engine analysis
    const result = await this.analyze(input);

    // Structure the result
    const analysis = result.finalOutput as SkillsAnalysisResult;

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
   * Create strategic skills framework based on company strategy
   */
  async createStrategicSkillsFramework(
    tenantId: string,
    strategy: string,
    industry: string
  ): Promise<SkillsFramework> {
    const knowledgeBase = this.getKnowledgeBase() as Record<string, unknown>;
    const industryBenchmarks = (knowledgeBase.industryBenchmarks as Record<string, unknown>)[industry.toLowerCase()] || {};

    // Use three-engine to generate framework
    const frameworkInput = {
      tenantId,
      strategy,
      industry,
      benchmarks: industryBenchmarks
    };

    const result = await this.analyze(frameworkInput);
    return result.finalOutput as SkillsFramework;
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
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, companyId)
    });
    return tenant?.strategy || '';
  }

  private async getEmployeeSkillsData(tenantId: string): Promise<EmployeeSkillData[]> {
    const employees = await db.query.users.findMany({
      where: eq(users.tenantId, tenantId),
      with: {
        skills: true
      }
    });

    return employees.map((emp: Record<string, unknown>) => ({
      employeeId: emp.id as string,
      name: emp.name as string,
      department: emp.departmentId as string,
      role: emp.role as string,
      skills: (emp.skills as Skill[]) || [],
      experience: emp.yearsOfExperience as number || 0
    }));
  }

  private async getEmployeeSkills(employeeId: string): Promise<Skill[]> {
    // Fetch skills from database
    const userSkills = await db.query.skills.findMany({
      where: eq(skills.userId, employeeId)
    });

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

  private async parseCSVData(csvData: unknown): Promise<EmployeeSkillData[]> {
    // Parse CSV data into employee skill data
    // Implementation depends on CSV format
    return [];
  }

  private async extractSkillsFromResume(resumeText: string): Promise<Skill[]> {
    // Extract skills from resume text using NLP
    // This would typically use AI to parse and extract skills
    return [];
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
      analysisData: JSON.stringify(analysis),
      overallScore: analysis.overallScore,
      strategicAlignment: analysis.strategicAlignment,
      criticalGapsCount: analysis.criticalGaps.length,
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
}

// Export singleton instance
export const skillsAgent = new SkillsAgent();