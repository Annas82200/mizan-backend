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
      .from(skillsTaxonomies);
      // .where(eq(skillsTaxonomies.isActive, true));

    return {
      onetFramework: taxonomies.find((t: any) => t.source === 'O*NET'),
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
      // .where(eq(companyStrategies.status, 'active'))
      .limit(1);

    const strategyData = strategy.length > 0 ? strategy[0] : null;
    const strategyObj = strategyData ? (strategyData.objectives as any) : {};
    const processedData = {
      currentSkills: this.aggregateCurrentSkills(employeeSkillsData),
      requiredSkills: strategyObj?.requiredSkills || {},
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
      reportData: {
        skillCoverage: result.finalOutput.overall_coverage?.toString(),
        skillGaps: result.finalOutput.skill_gaps,
        recommendations: result.finalOutput.recommendations,
        trainingTriggers: result.finalOutput.training_triggers,
        generatedBy: 'skills_agent'
      }
    });
  }

  /**
   * Extract skills from resume text using AI
   */
  async extractSkillsFromResume(resumeText: string): Promise<{
    technicalSkills: Array<{ skill: string; proficiency: string; yearsExperience?: number }>;
    softSkills: string[];
    domainKnowledge: string[];
    tools: string[];
    languages: string[];
    experience: any[];
    education: any[];
    certifications: any[];
  }> {
    const prompt = `You are an expert HR analyst. Extract structured skills information from this resume.

Resume Text:
${resumeText}

Extract and return JSON with the following structure:
{
  "technicalSkills": [{"skill": "Python", "proficiency": "expert", "yearsExperience": 5}],
  "softSkills": ["Leadership", "Communication"],
  "domainKnowledge": ["Machine Learning", "Cloud Computing"],
  "tools": ["AWS", "Docker", "Git"],
  "languages": ["English (Native)", "Spanish (Conversational)"],
  "experience": [
    {
      "company": "Company Name",
      "role": "Job Title",
      "startDate": "2020-01",
      "endDate": "2023-12",
      "description": "Brief description",
      "achievements": ["Achievement 1", "Achievement 2"]
    }
  ],
  "education": [
    {
      "degree": "B.S. Computer Science",
      "institution": "University",
      "year": "2019",
      "field": "Computer Science"
    }
  ],
  "certifications": [
    {
      "name": "AWS Certified",
      "issuer": "Amazon",
      "date": "2021-03"
    }
  ]
}

Guidelines:
- Infer proficiency from context (beginner/intermediate/advanced/expert)
- Extract years of experience when mentioned
- Be comprehensive but accurate
- Return only valid JSON`;

    try {
      const response = await this.runKnowledgeEngine({ prompt });
      const extracted = typeof response === 'string' ? JSON.parse(response) : response;

      return {
        technicalSkills: extracted.technicalSkills || [],
        softSkills: extracted.softSkills || [],
        domainKnowledge: extracted.domainKnowledge || [],
        tools: extracted.tools || [],
        languages: extracted.languages || [],
        experience: extracted.experience || [],
        education: extracted.education || [],
        certifications: extracted.certifications || []
      };
    } catch (error) {
      console.error('Skills extraction error:', error);

      // Fallback: basic keyword extraction
      return this.fallbackSkillsExtraction(resumeText);
    }
  }

  /**
   * Fallback skills extraction using keyword matching
   */
  private fallbackSkillsExtraction(resumeText: string): any {
    const text = resumeText.toLowerCase();

    const commonTechnicalSkills = [
      'javascript', 'python', 'java', 'c++', 'react', 'node.js', 'sql',
      'aws', 'docker', 'kubernetes', 'git', 'agile', 'scrum', 'ci/cd'
    ];

    const commonSoftSkills = [
      'leadership', 'communication', 'teamwork', 'problem solving',
      'critical thinking', 'time management', 'adaptability'
    ];

    const extractedTechnical = commonTechnicalSkills
      .filter(skill => text.includes(skill.toLowerCase()))
      .map(skill => ({
        skill: skill.charAt(0).toUpperCase() + skill.slice(1),
        proficiency: 'intermediate',
        yearsExperience: undefined
      }));

    const extractedSoft = commonSoftSkills
      .filter(skill => text.includes(skill.toLowerCase()))
      .map(skill => skill.charAt(0).toUpperCase() + skill.slice(1));

    return {
      technicalSkills: extractedTechnical,
      softSkills: extractedSoft,
      domainKnowledge: [],
      tools: [],
      languages: [],
      experience: [],
      education: [],
      certifications: []
    };
  }

  /**
   * Map strategy to required skills
   */
  async mapStrategyToRequiredSkills(
    tenantId: string,
    strategy: any
  ): Promise<{
    organizationalSkills: any;
    departmentalSkills: any;
    roleSkills: any;
    criticalSkills: string[];
    importantSkills: string[];
    niceToHaveSkills: string[];
  }> {
    const prompt = `You are a strategic HR analyst. Analyze this organizational strategy and determine required skills.

Strategy:
${JSON.stringify(strategy, null, 2)}

Determine:
1. What skills are needed organization-wide to achieve this strategy?
2. What skills are needed by each department?
3. What skills are needed for each role/position?
4. Which skills are critical (must-have)?
5. Which skills are important but not critical?
6. Which skills are nice-to-have?

Return JSON:
{
  "organizationalSkills": {
    "technical": ["Skill 1", "Skill 2"],
    "leadership": ["Skill 1"],
    "domain": ["Knowledge area 1"]
  },
  "departmentalSkills": {
    "Engineering": ["Python", "AWS"],
    "Sales": ["CRM", "Negotiation"]
  },
  "roleSkills": {
    "Software Engineer": ["Programming", "Testing"],
    "Product Manager": ["Strategy", "Communication"]
  },
  "criticalSkills": ["Critical skill 1", "Critical skill 2"],
  "importantSkills": ["Important skill 1"],
  "niceToHaveSkills": ["Nice to have 1"]
}`;

    try {
      const response = await this.runKnowledgeEngine({ prompt });
      const skillRequirements = typeof response === 'string' ? JSON.parse(response) : response;

      return {
        organizationalSkills: skillRequirements.organizationalSkills || {},
        departmentalSkills: skillRequirements.departmentalSkills || {},
        roleSkills: skillRequirements.roleSkills || {},
        criticalSkills: skillRequirements.criticalSkills || [],
        importantSkills: skillRequirements.importantSkills || [],
        niceToHaveSkills: skillRequirements.niceToHaveSkills || []
      };
    } catch (error) {
      console.error('Strategy skill mapping error:', error);
      return {
        organizationalSkills: {},
        departmentalSkills: {},
        roleSkills: {},
        criticalSkills: [],
        importantSkills: [],
        niceToHaveSkills: []
      };
    }
  }

  /**
   * Perform detailed skill gap analysis for an employee
   */
  async performSkillGapAnalysis(
    employeeProfile: any,
    requiredSkills: any,
    departmentSkills: string[],
    roleSkills: string[]
  ): Promise<{
    criticalGaps: any[];
    moderateGaps: any[];
    strengthAreas: any[];
    trainingRecommendations: any[];
    overallScore: number;
    strategicAlignmentScore: number;
    readinessScore: number;
  }> {
    // Extract employee's current skills
    const currentTechnical = (employeeProfile.technicalSkills || []).map((s: any) => s.skill.toLowerCase());
    const currentSoft = (employeeProfile.softSkills || []).map((s: string) => s.toLowerCase());
    const currentAll = [...currentTechnical, ...currentSoft];

    // Identify gaps
    const criticalGaps = [];
    const moderateGaps = [];
    const strengthAreas = [];

    // Check critical skills
    for (const skill of (requiredSkills.criticalSkills || [])) {
      const hasSkill = currentAll.some(s => s.includes(skill.toLowerCase()) || skill.toLowerCase().includes(s));
      if (!hasSkill) {
        criticalGaps.push({
          skill,
          gap: 'missing',
          priority: 'critical',
          impact: 'Cannot perform key job functions without this skill'
        });
      }
    }

    // Check department skills
    for (const skill of departmentSkills) {
      const hasSkill = currentAll.some(s => s.includes(skill.toLowerCase()) || skill.toLowerCase().includes(s));
      if (!hasSkill) {
        moderateGaps.push({
          skill,
          gap: 'missing',
          priority: 'high',
          impact: 'Needed for department collaboration and effectiveness'
        });
      }
    }

    // Check role skills
    for (const skill of roleSkills) {
      const hasSkill = currentAll.some(s => s.includes(skill.toLowerCase()) || skill.toLowerCase().includes(s));
      if (!hasSkill) {
        moderateGaps.push({
          skill,
          gap: 'missing',
          priority: 'medium',
          impact: 'Beneficial for role performance'
        });
      }
    }

    // Identify strengths
    for (const skill of employeeProfile.technicalSkills || []) {
      if (skill.proficiency === 'expert' || skill.proficiency === 'advanced') {
        strengthAreas.push({
          skill: skill.skill,
          proficiency: skill.proficiency,
          yearsExperience: skill.yearsExperience,
          opportunity: 'Can mentor others or lead projects in this area'
        });
      }
    }

    // Generate training recommendations
    const trainingRecommendations = [
      ...criticalGaps.map(gap => ({
        skill: gap.skill,
        priority: 'immediate',
        type: 'formal_training',
        estimatedDuration: '2-4 weeks',
        reason: gap.impact
      })),
      ...moderateGaps.slice(0, 5).map(gap => ({
        skill: gap.skill,
        priority: 'short-term',
        type: 'online_course',
        estimatedDuration: '1-2 weeks',
        reason: gap.impact
      }))
    ];

    // Calculate scores
    const totalRequired = (requiredSkills.criticalSkills || []).length +
                         departmentSkills.length +
                         roleSkills.length;
    const totalHas = totalRequired - criticalGaps.length - moderateGaps.length;

    const overallScore = totalRequired > 0 ? Math.round((totalHas / totalRequired) * 100) : 100;
    const strategicAlignmentScore = requiredSkills.criticalSkills?.length > 0
      ? Math.round(((requiredSkills.criticalSkills.length - criticalGaps.length) / requiredSkills.criticalSkills.length) * 100)
      : 100;
    const readinessScore = roleSkills.length > 0
      ? Math.round(((roleSkills.length - moderateGaps.filter((g: any) => roleSkills.includes(g.skill)).length) / roleSkills.length) * 100)
      : 100;

    return {
      criticalGaps,
      moderateGaps,
      strengthAreas,
      trainingRecommendations,
      overallScore,
      strategicAlignmentScore,
      readinessScore
    };
  }
}
