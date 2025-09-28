import { ThreeEngineAgent, ThreeEngineConfig } from './base/three-engine-agent.js';
import { db } from '../../db/index.js';
import { skillsTaxonomies, employeeSkills, companyStrategies, skillsReports } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export interface SkillsAnalysisInput {
  tenantId: string;
  targetType: 'individual' | 'department' | 'company';
  targetId?: string;
  strategyId?: string;
}

export interface SkillsAnalysisOutput {
  overallCoverage: number;
  skillGaps: Array<{
    skill: string;
    category: string;
    currentLevel: number;
    requiredLevel: number;
    gap: number;
    priority: 'critical' | 'high' | 'medium' | 'low';
    affectedEmployees: number;
  }>;
  skillSurplus: Array<{
    skill: string;
    category: string;
    currentLevel: number;
    utilization: number;
    opportunity: string;
  }>;
  recommendations: Array<{
    category: 'training' | 'hiring' | 'reallocation' | 'development';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    targetSkills: string[];
    estimatedTime: string;
    expectedImpact: string;
  }>;
  trainingTriggers: Array<{
    type: 'lxp' | 'external' | 'mentoring' | 'project';
    targetEmployees: string[];
    skills: string[];
    urgency: 'immediate' | 'short-term' | 'long-term';
  }>;
}

export class SkillsAgent extends ThreeEngineAgent {
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
        temperature: 0.4,
        maxTokens: 4000
      },
      consensusThreshold: 0.75
    };

    super('skills', config);
  }

  async analyzeSkills(input: SkillsAnalysisInput): Promise<SkillsAnalysisOutput> {
    const result = await this.analyze(input);
    
    // Store analysis in database
    await this.storeAnalysis(input, result);
    
    return result.finalOutput;
  }

  protected async loadFrameworks(): Promise<any> {
    const taxonomies = await db
      .select()
      .from(skillsTaxonomies)
      .where(eq(skillsTaxonomies.isActive, true));

    return {
      onetFramework: taxonomies.find(t => t.source === 'O*NET'),
      bloomsTaxonomy: {
        name: "Bloom's Taxonomy",
        levels: ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'],
        description: 'Framework for categorizing learning objectives and skills'
      },
      competencyModel: {
        name: 'Competency Modeling Framework',
        categories: [
          'Technical Skills',
          'Behavioral Competencies',
          'Leadership Skills',
          'Domain Knowledge'
        ]
      },
      skillCategories: {
        technical: ['Programming', 'Data Analysis', 'System Design', 'Testing'],
        leadership: ['Team Management', 'Strategic Thinking', 'Decision Making'],
        communication: ['Written Communication', 'Presentation', 'Negotiation'],
        analytical: ['Problem Solving', 'Critical Thinking', 'Research'],
        creative: ['Innovation', 'Design Thinking', 'Creativity']
      },
      proficiencyLevels: {
        1: 'Novice - Basic awareness',
        2: 'Advanced Beginner - Limited experience',
        3: 'Competent - Practical application',
        4: 'Proficient - Integrated understanding',
        5: 'Expert - Intuitive grasp and teaching ability'
      }
    };
  }

  protected async processData(inputData: SkillsAnalysisInput): Promise<any> {
    // Get employee skills data
    const employeeSkillsData = await db
      .select()
      .from(employeeSkills)
      .where(eq(employeeSkills.tenantId, inputData.tenantId));

    // Get strategy requirements
    const strategy = await db
      .select()
      .from(companyStrategies)
      .where(eq(companyStrategies.tenantId, inputData.tenantId))
      .where(eq(companyStrategies.status, 'active'))
      .limit(1);

    const processedData = {
      currentSkills: this.aggregateCurrentSkills(employeeSkillsData),
      requiredSkills: strategy.length > 0 ? strategy[0].requiredSkills : {},
      employeeCount: employeeSkillsData.length,
      skillDistribution: this.calculateSkillDistribution(employeeSkillsData),
      certificationData: this.aggregateCertifications(employeeSkillsData),
      experienceData: this.aggregateExperience(employeeSkillsData)
    };

    return processedData;
  }

  protected getKnowledgeSystemPrompt(): string {
    return `You are the Knowledge Engine for Mizan's Skills Agent. Your role is to apply skills taxonomy frameworks and competency models.

Key frameworks to consider:
1. O*NET Skills Taxonomy - Comprehensive skills database
2. Bloom's Taxonomy - Learning and skill development levels
3. Competency Modeling - Behavioral and technical competencies
4. Skills-based hiring frameworks
5. Learning and development best practices

Your output should be structured JSON containing:
- applicable_frameworks: Most relevant skills frameworks
- skill_categories: How to categorize and group skills
- proficiency_standards: Standards for measuring skill levels
- development_pathways: How skills can be developed

Focus on evidence-based skills assessment and development theory.`;
  }

  protected getDataSystemPrompt(): string {
    return `You are the Data Engine for Mizan's Skills Agent. Your role is to analyze employee skills data and identify patterns.

You will receive:
- Current employee skills with proficiency levels
- Required skills from strategy
- Certification and experience data
- Skill distribution across the organization

Your output should be structured JSON containing:
- skill_inventory: Current organizational skill inventory
- gap_analysis: Detailed gaps between current and required skills
- skill_patterns: Patterns in skill distribution and development
- utilization_analysis: How well skills are being utilized
- development_opportunities: Areas for skill development

Focus on quantitative analysis and clear gap identification.`;
  }

  protected getReasoningSystemPrompt(): string {
    return `You are the Reasoning Engine for Mizan's Skills Agent. Your role is to synthesize skills frameworks with data analysis to provide actionable recommendations.

You will receive:
- Skills framework insights
- Skills data analysis
- Strategic context

Your output should be structured JSON containing:
- overall_coverage: Overall skill coverage percentage
- skill_gaps: Prioritized skill gaps with impact analysis
- skill_surplus: Underutilized skills and opportunities
- recommendations: Specific development recommendations
- training_triggers: Automated training assignments

Connect skills theory with data to provide clear development pathways.`;
  }

  protected buildKnowledgePrompt(inputData: SkillsAnalysisInput, frameworks: any): string {
    return `Analyze the skills development context:

Analysis Type: ${inputData.targetType} skills analysis
Tenant ID: ${inputData.tenantId}

Available Frameworks:
${JSON.stringify(frameworks, null, 2)}

Please identify which skills frameworks are most applicable and provide guidance for analyzing organizational skills. Consider skill categorization, proficiency measurement, and development pathways.

What principles should guide this skills analysis?`;
  }

  protected buildDataPrompt(processedData: any, knowledgeOutput: any): string {
    return `Analyze this skills data:

Skills Data:
${JSON.stringify(processedData, null, 2)}

Framework Context:
${JSON.stringify(knowledgeOutput, null, 2)}

Please analyze for:
1. Current skill inventory and distribution
2. Gaps between current and required skills
3. Skill utilization and efficiency
4. Development opportunities and priorities
5. Certification and experience patterns

Provide quantitative gap analysis and development insights.`;
  }

  protected buildReasoningPrompt(inputData: SkillsAnalysisInput, knowledgeOutput: any, dataOutput: any): string {
    return `Synthesize skills frameworks with data analysis:

Input Context:
${JSON.stringify(inputData, null, 2)}

Skills Theory:
${JSON.stringify(knowledgeOutput, null, 2)}

Skills Analysis:
${JSON.stringify(dataOutput, null, 2)}

Please provide:
1. Overall skill coverage assessment
2. Prioritized skill gaps with business impact
3. Skill surplus and reallocation opportunities
4. Specific development recommendations
5. Training triggers for immediate action

Ensure recommendations are practical and aligned with business needs.`;
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

  private aggregateCurrentSkills(employeeSkillsData: any[]): any {
    const skillAggregation: { [skill: string]: { total: number, count: number, levels: number[] } } = {};

    employeeSkillsData.forEach(employee => {
      if (employee.skills && typeof employee.skills === 'object') {
        Object.entries(employee.skills).forEach(([skill, level]) => {
          if (!skillAggregation[skill]) {
            skillAggregation[skill] = { total: 0, count: 0, levels: [] };
          }
          skillAggregation[skill].total += level as number;
          skillAggregation[skill].count += 1;
          skillAggregation[skill].levels.push(level as number);
        });
      }
    });

    // Calculate averages and distributions
    const result: { [skill: string]: any } = {};
    Object.entries(skillAggregation).forEach(([skill, data]) => {
      result[skill] = {
        averageLevel: data.total / data.count,
        employeeCount: data.count,
        levelDistribution: this.calculateLevelDistribution(data.levels),
        coverage: (data.count / employeeSkillsData.length) * 100
      };
    });

    return result;
  }

  private calculateSkillDistribution(employeeSkillsData: any[]): any {
    const categories: { [category: string]: number } = {};
    const levels: { [level: number]: number } = {};

    employeeSkillsData.forEach(employee => {
      if (employee.skills && typeof employee.skills === 'object') {
        Object.entries(employee.skills).forEach(([skill, level]) => {
          // Categorize skill (simplified)
          const category = this.categorizeSkill(skill);
          categories[category] = (categories[category] || 0) + 1;
          levels[level as number] = (levels[level as number] || 0) + 1;
        });
      }
    });

    return { categories, levels };
  }

  private aggregateCertifications(employeeSkillsData: any[]): any {
    const certifications: { [cert: string]: number } = {};

    employeeSkillsData.forEach(employee => {
      if (employee.certifications && Array.isArray(employee.certifications)) {
        employee.certifications.forEach((cert: string) => {
          certifications[cert] = (certifications[cert] || 0) + 1;
        });
      }
    });

    return certifications;
  }

  private aggregateExperience(employeeSkillsData: any[]): any {
    const experienceData: { [area: string]: { total: number, count: number } } = {};

    employeeSkillsData.forEach(employee => {
      if (employee.experience && typeof employee.experience === 'object') {
        Object.entries(employee.experience).forEach(([area, years]) => {
          if (!experienceData[area]) {
            experienceData[area] = { total: 0, count: 0 };
          }
          experienceData[area].total += years as number;
          experienceData[area].count += 1;
        });
      }
    });

    const result: { [area: string]: number } = {};
    Object.entries(experienceData).forEach(([area, data]) => {
      result[area] = data.total / data.count;
    });

    return result;
  }

  private calculateLevelDistribution(levels: number[]): { [level: number]: number } {
    const distribution: { [level: number]: number } = {};
    levels.forEach(level => {
      distribution[level] = (distribution[level] || 0) + 1;
    });
    return distribution;
  }

  private categorizeSkill(skill: string): string {
    // Simplified skill categorization
    const technical = ['programming', 'coding', 'development', 'technical', 'software', 'data'];
    const leadership = ['management', 'leadership', 'team', 'strategy', 'planning'];
    const communication = ['communication', 'presentation', 'writing', 'speaking'];
    
    const skillLower = skill.toLowerCase();
    
    if (technical.some(term => skillLower.includes(term))) return 'technical';
    if (leadership.some(term => skillLower.includes(term))) return 'leadership';
    if (communication.some(term => skillLower.includes(term))) return 'communication';
    
    return 'other';
  }

  private async storeAnalysis(input: SkillsAnalysisInput, result: any): Promise<void> {
    await db.insert(skillsReports).values({
      tenantId: input.tenantId,
      reportType: input.targetType,
      targetId: input.targetId || null,
      skillCoverage: result.finalOutput.overall_coverage?.toString(),
      skillGaps: result.finalOutput.skill_gaps,
      recommendations: result.finalOutput.recommendations,
      trainingTriggers: result.finalOutput.training_triggers,
      generatedBy: 'skills_agent'
    });
  }
}
