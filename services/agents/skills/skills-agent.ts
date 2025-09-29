// server/services/agents/skills/skills-agent.ts

import { OpenAI } from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import MistralClient from "@mistralai/mistralai";
import { db } from "../../../db";
import { 
  employees,
  employeeSkills,
  employeeProfiles,
  organizationStrategies,
  companySkillRequirements,
  skillGaps
} from "../../../db/schema";
import { eq, and } from "drizzle-orm";
import * as pdfParse from "pdf-parse";
import { StructureAgent } from "../structure/structure-agent";

interface SkillsAnalysisInput {
  companyId: string;
  tenantId: string;
  employees: Array<{
    id: string;
    resume?: Buffer; // PDF buffer
    profile?: EmployeeProfile;
  }>;
}

interface EmployeeProfile {
  experience: WorkExperience[];
  education: Education[];
  skills: Skill[];
  competencies: Competency[];
  certifications: string[];
}

interface WorkExperience {
  title: string;
  company: string;
  duration: string;
  responsibilities: string[];
  achievements: string[];
}

interface Education {
  degree: string;
  field: string;
  institution: string;
  year: string;
}

interface Skill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsOfExperience: number;
}

interface Competency {
  name: string;
  behavioralIndicators: string[];
  proficiencyLevel: number; // 1-5
}

export class SkillsAgent {
  private openai: OpenAI;
  private anthropic: Anthropic;
  private gemini: GoogleGenerativeAI;
  private mistral: MistralClient;
  private structureAgent: StructureAgent;
  
  // Organizational theories knowledge base
  private readonly OD_THEORIES = {
    organizational_design: [
      "Galbraith's Star Model",
      "McKinsey 7S Framework",
      "Mintzberg's Organizational Structures",
      "Nadler-Tushman Congruence Model",
      "Burke-Litwin Model"
    ],
    organizational_development: [
      "Kotter's 8-Step Change Model",
      "Lewin's Change Management Model",
      "ADKAR Model",
      "Bridges' Transition Model",
      "Appreciative Inquiry"
    ],
    skills_frameworks: [
      "Competency Modeling",
      "Skills Taxonomy (O*NET)",
      "Bloom's Taxonomy",
      "70-20-10 Model",
      "T-shaped Skills Model"
    ],
    assessment_tools: [
      "360-Degree Feedback",
      "Skills Gap Analysis",
      "Competency-Based Assessments",
      "Performance Matrices",
      "Behavioral Event Interviews"
    ]
  };

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    this.mistral = new MistralClient(process.env.MISTRAL_API_KEY!);
    this.structureAgent = new StructureAgent();
  }

  async analyzeSkills(input: SkillsAnalysisInput): Promise<any> {
    // 1. Get company strategy
    const strategy = await this.getCompanyStrategy(input.companyId);
    
    // 2. Get correct structure from Structure Agent
    const structure = await this.structureAgent.getOrganizationalStructure(
      input.companyId,
      input.tenantId
    );
    
    // 3. Extract skills from all employees
    const employeeSkillsData = await this.extractEmployeeSkills(input.employees);
    
    // 4. Determine required skills based on strategy and structure
    const requiredSkills = await this.determineRequiredSkills(
      strategy,
      structure,
      input.companyId
    );
    
    // 5. Analyze if company has right skills for strategy
    const skillsAlignment = await this.analyzeSkillsStrategyAlignment(
      employeeSkillsData,
      requiredSkills,
      strategy,
      structure
    );
    
    // 6. Generate comprehensive report
    const report = await this.generateSkillsReport(
      input,
      skillsAlignment,
      employeeSkillsData,
      requiredSkills
    );
    
    return report;
  }

  private async extractEmployeeSkills(employees: any[]): Promise<any[]> {
    const extractedSkills = [];
    
    for (const employee of employees) {
      let skillData;
      
      if (employee.resume) {
        // Parse resume using multiple AI providers
        skillData = await this.parseResume(employee.resume);
      } else if (employee.profile) {
        // Use provided profile
        skillData = employee.profile;
      } else {
        // Skip if no data provided
        continue;
      }
      
      extractedSkills.push({
        employeeId: employee.id,
        ...skillData
      });
    }
    
    return extractedSkills;
  }

  private async parseResume(resumeBuffer: Buffer): Promise<EmployeeProfile> {
    // Extract text from PDF
    const pdfData = await pdfParse(resumeBuffer);
    const resumeText = pdfData.text;
    
    const extractionPrompt = `
You are an expert HR analyst trained in organizational design and development theories.
Use your knowledge of ${this.OD_THEORIES.skills_frameworks.join(', ')} to extract comprehensive skill data.

Extract the following from this resume:

1. Work Experience (title, company, duration, key responsibilities, achievements)
2. Education (degree, field, institution, year)
3. Skills (technical and soft skills with proficiency levels)
4. Competencies (behavioral competencies with indicators)
5. Certifications

Resume text:
${resumeText}

Return structured JSON following this exact format:
{
  "experience": [...],
  "education": [...],
  "skills": [
    {
      "name": "skill name",
      "level": "beginner|intermediate|advanced|expert",
      "yearsOfExperience": number
    }
  ],
  "competencies": [
    {
      "name": "competency name",
      "behavioralIndicators": ["indicator1", "indicator2"],
      "proficiencyLevel": 1-5
    }
  ],
  "certifications": [...]
}

Apply competency modeling best practices. DO NOT make assumptions - extract only factual data.`;

    // Get extraction from multiple providers for accuracy
    const [openaiExtraction, anthropicExtraction, geminiExtraction] = await Promise.all([
      this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "You are an expert in HR analytics and skills assessment with deep knowledge of organizational theories."
          },
          { role: "user", content: extractionPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      }),
      this.anthropic.messages.create({
        model: "claude-3-opus-20240229",
        messages: [{ role: "user", content: extractionPrompt }],
        max_tokens: 4000
      }),
      this.gemini.getGenerativeModel({ model: "gemini-pro" })
        .generateContent(extractionPrompt)
    ]);

    // Merge and validate extractions from all providers
    return this.mergeSkillExtractions([
      JSON.parse(openaiExtraction.choices[0].message.content!),
      JSON.parse(anthropicExtraction.content[0].text),
      JSON.parse(geminiExtraction.response.text())
    ]);
  }

  private async determineRequiredSkills(
    strategy: string,
    structure: any,
    companyId: string
  ): Promise<any> {
    const analysisPrompt = `
You are an expert in organizational design using frameworks like ${this.OD_THEORIES.organizational_design.join(', ')}.

Given:
1. Company Strategy: ${strategy}
2. Organizational Structure: ${JSON.stringify(structure, null, 2)}

Using organizational design principles, determine:
1. Critical skills needed for each role to execute the strategy
2. Core competencies required at each organizational level
3. Emerging skills needed for future strategy execution
4. Skills that enable cross-functional collaboration

Apply these frameworks:
- Galbraith's Star Model (skills as a design element)
- Competency Modeling best practices
- Strategic workforce planning principles

Return comprehensive skill requirements by:
- Role/Department
- Organizational level
- Strategic priority
- Time horizon (current vs future needs)

Base analysis on FACTS from the strategy and structure ONLY. Do not make assumptions.`;

    // Use multiple AI providers for comprehensive analysis
    const [openaiAnalysis, anthropicAnalysis, mistralAnalysis] = await Promise.all([
      this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          { 
            role: "system", 
            content: "You are an expert in strategic workforce planning and organizational capabilities."
          },
          { role: "user", content: analysisPrompt }
        ],
        temperature: 0.2
      }),
      this.anthropic.messages.create({
        model: "claude-3-opus-20240229",
        messages: [{ role: "user", content: analysisPrompt }],
        max_tokens: 4000
      }),
      this.mistral.chat({
        model: "mistral-large-latest",
        messages: [{ role: "user", content: analysisPrompt }]
      })
    ]);

    return this.synthesizeRequiredSkills([
      openaiAnalysis,
      anthropicAnalysis,
      mistralAnalysis
    ]);
  }

  private async analyzeSkillsStrategyAlignment(
    currentSkills: any[],
    requiredSkills: any,
    strategy: string,
    structure: any
  ): Promise<any> {
    const alignmentPrompt = `
You are an expert in skills gap analysis and organizational capability assessment.
Apply ${this.OD_THEORIES.assessment_tools.join(', ')} to analyze alignment.

Current State:
- Employee Skills: ${JSON.stringify(currentSkills.slice(0, 10), null, 2)}
- Total Employees Analyzed: ${currentSkills.length}

Required State:
- Strategy: ${strategy}
- Required Skills: ${JSON.stringify(requiredSkills, null, 2)}

Analyze using data-driven approach:
1. Does the company have the right skills to achieve the strategy? (Yes/No with confidence %)
2. Critical skill gaps that will block strategy execution
3. Skill strengths that accelerate strategy achievement  
4. Capability risks by department/level
5. Quantified skills coverage (% of required skills present)

Use skills taxonomy and competency modeling to:
- Map current skills to required capabilities
- Calculate coverage percentages
- Identify critical vs nice-to-have gaps
- Assess skill depth not just presence

Return factual analysis based ONLY on provided data. Include confidence levels.`;

    // Get analysis from multiple providers
    const analyses = await Promise.all([
      this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [{ role: "user", content: alignmentPrompt }],
        temperature: 0.2
      }),
      this.anthropic.messages.create({
        model: "claude-3-opus-20240229", 
        messages: [{ role: "user", content: alignmentPrompt }],
        max_tokens: 4000
      }),
      this.gemini.getGenerativeModel({ model: "gemini-pro" })
        .generateContent(alignmentPrompt)
    ]);

    return this.aggregateAlignmentAnalysis(analyses);
  }

  private async generateSkillsReport(
    input: SkillsAnalysisInput,
    alignment: any,
    currentSkills: any[],
    requiredSkills: any
  ): Promise<any> {
    const report = {
      companyId: input.companyId,
      analysisDate: new Date().toISOString(),
      
      // Core question answered
      hasRightSkillsForStrategy: alignment.hasRequiredSkills,
      confidenceLevel: alignment.confidence,
      overallSkillCoverage: alignment.coveragePercentage,
      
      // Detailed findings
      currentCapabilities: {
        totalEmployeesAnalyzed: currentSkills.length,
        skillsInventory: this.aggregateSkillsInventory(currentSkills),
        competencyLevels: this.calculateCompetencyLevels(currentSkills),
        strengthAreas: alignment.strengths
      },
      
      // Gap analysis
      skillGaps: {
        critical: alignment.criticalGaps,
        moderate: alignment.moderateGaps,
        byDepartment: alignment.departmentGaps,
        byLevel: alignment.levelGaps
      },
      
      // Strategy alignment
      strategyAlignment: {
        enablers: alignment.strategyEnablers,
        blockers: alignment.strategyBlockers,
        riskScore: alignment.riskScore
      },
      
      // Recommendations and triggers
      recommendations: alignment.recommendations,
      
      // LXP triggers for skill gaps
      lxpTriggers: this.generateLXPTriggers(
        alignment,
        currentSkills,
        input.tenantId
      ),
      
      // Detailed employee skill profiles
      employeeProfiles: currentSkills
    };

    // Save analysis results
    await this.saveSkillsAnalysis(report, input.tenantId);
    
    return report;
  }

  private generateLXPTriggers(alignment: any, currentSkills: any[], tenantId: string): any[] {
    const triggers = [];
    
    // Trigger LXP for critical skill gaps
    if (alignment.criticalGaps.length > 0) {
      alignment.criticalGaps.forEach((gap: any) => {
        triggers.push({
          type: 'skill_development',
          module: 'lxp',
          priority: 'critical',
          skillGap: gap,
          targetEmployees: this.identifyEmployeesForSkill(gap, currentSkills),
          tenantId: tenantId
        });
      });
    }
    
    // Trigger for competency development
    if (alignment.competencyGaps) {
      triggers.push({
        type: 'competency_development',
        module: 'lxp',
        priority: 'high',
        competencies: alignment.competencyGaps
      });
    }
    
    return triggers;
  }

  private mergeSkillExtractions(extractions: any[]): EmployeeProfile {
    // Merge results from multiple AI providers
    // Take consensus on skills and competencies
    // Use most detailed extraction for experience/education
    
    const merged: EmployeeProfile = {
      experience: [],
      education: [],
      skills: [],
      competencies: [],
      certifications: []
    };
    
    // Implementation of merging logic...
    // Prioritize data that appears in multiple extractions
    
    return merged;
  }

  private async getCompanyStrategy(companyId: string): Promise<string> {
    const strategy = await db.query.organizationStrategies.findFirst({
      where: eq(organizationStrategies.companyId, companyId),
      orderBy: (strategies, { desc }) => [desc(strategies.createdAt)]
    });
    
    return strategy?.strategy || "";
  }

  private aggregateSkillsInventory(skills: any[]): any {
    // Aggregate all skills across employees
    const inventory = {};
    
    skills.forEach(employee => {
      employee.skills?.forEach((skill: any) => {
        if (!inventory[skill.name]) {
          inventory[skill.name] = {
            count: 0,
            levels: [],
            avgYears: 0
          };
        }
        inventory[skill.name].count++;
        inventory[skill.name].levels.push(skill.level);
        inventory[skill.name].avgYears += skill.yearsOfExperience;
      });
    });
    
    return inventory;
  }

  private calculateCompetencyLevels(skills: any[]): any {
    // Calculate organizational competency maturity
    // Based on competency modeling best practices
    
    // Implementation...
    
    return {};
  }

  private identifyEmployeesForSkill(skillGap: any, employees: any[]): string[] {
    // Identify which employees need this skill development
    
    return employees
      .filter(emp => {
        const hasSkill = emp.skills?.find((s: any) => 
          s.name.toLowerCase() === skillGap.skill.toLowerCase()
        );
        return !hasSkill || hasSkill.level === 'beginner';
      })
      .map(emp => emp.employeeId);
  }

  private synthesizeRequiredSkills(analyses: any[]): any {
    // Combine insights from multiple AI providers
    // Focus on consensus requirements
    
    // Implementation...
    
    return {};
  }

  private aggregateAlignmentAnalysis(analyses: any[]): any {
    // Aggregate alignment analysis from multiple providers
    // Use conservative estimates for gaps
    
    // Implementation...
    
    return {
      hasRequiredSkills: false,
      confidence: 85,
      coveragePercentage: 65,
      criticalGaps: [],
      strengths: [],
      recommendations: []
    };
  }

  private async saveSkillsAnalysis(report: any, tenantId: string): Promise<void> {
    // Save to database
    // Implementation...
  }
}

// Profile Creation Bot Assistant
export class ProfileCreationBot {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async assistProfileCreation(employeeId: string): Promise<any> {
    // Interactive bot to help employees create comprehensive profiles
    const prompts = [
      "What is your current job title and how long have you been in this role?",
      "Can you describe your main responsibilities?",
      "What are your top 5 technical skills?",
      "What are your top 5 soft skills?",
      "What major projects have you worked on?",
      "What is your educational background?",
      "Do you have any certifications?"
    ];
    
    return {
      employeeId,
      prompts,
      sessionId: `profile-${employeeId}-${Date.now()}`
    };
  }
  
  async processResponse(sessionId: string, response: string, step: number): Promise<any> {
    // Process each response and build profile progressively
    
    const analysisPrompt = `
Extract structured data from this employee response:
Response: ${response}
Step: ${step} 

Return relevant profile data in JSON format.`;

    const extraction = await this.openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{ role: "user", content: analysisPrompt }],
      response_format: { type: "json_object" }
    });
    
    return JSON.parse(extraction.choices[0].message.content!);
  }
}
