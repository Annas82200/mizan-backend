// import { ThreeEngineAgent } from '../base/three-engine-agent.js';
import { Logger } from '../../../utils/logger.js';
import { cultureIntegration, CultureFitAssessment } from '../../modules/hiring/integrations/culture-integration.js';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface CandidateAssessmentInput {
  tenantId: string;
  candidateId: string;
  requisitionId: string;
  candidate: {
    firstName: string;
    lastName: string;
    email: string;
    resume: any;
    skills: any[];
    experience: any[];
    education: any[];
    coverLetter?: string;
  };
  jobRequirements: {
    title: string;
    level: string;
    requiredSkills: any[];
    preferredSkills?: any[];
    experienceRequired: string;
    cultureFit: string[];
  };
  companyData: {
    vision?: string;
    mission?: string;
    values: string[]; // Mizan 7 Cylinders
    culture?: any;
  };
  assessmentType: 'comprehensive' | 'skills_only' | 'culture_only' | 'quick_screen';
  metadata?: any;
}

export interface CandidateAssessmentOutput {
  overallScore: number;
  recommendation: 'strong_hire' | 'hire' | 'maybe' | 'pass' | 'strong_pass';
  
  skillsAssessment: {
    score: number;
    requiredSkillsMatch: number;
    preferredSkillsMatch: number;
    skillGaps: Array<{
      skill: string;
      required: boolean;
      severity: string;
    }>;
    skillStrengths: string[];
  };
  
  experienceAssessment: {
    score: number;
    yearsOfExperience: number;
    relevantExperience: number;
    industryMatch: boolean;
    seniorityMatch: boolean;
    careerProgression: string;
  };
  
  cultureFitAssessment: {
    score: number;
    alignment: any; // Mizan 7 Cylinders alignment
    strengths: string[];
    concerns: string[];
    cylinders: {
      [key: string]: {
        score: number;
        evidence: string[];
        concerns: string[];
      };
    };
  };
  
  educationAssessment: {
    score: number;
    meetsRequirements: boolean;
    credentials: string[];
    certifications: string[];
  };
  
  overallAnalysis: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    concerns: string[];
    redFlags: string[];
  };
  
  interviewRecommendations: {
    shouldInterview: boolean;
    interviewType: string[];
    focusAreas: string[];
    suggestedQuestions: string[];
  };
  
  compensation: {
    suggestedSalary: number;
    negotiationRoom: number;
    justification: string;
  };
  
  nextSteps: Array<{
    action: string;
    priority: string;
    timeline: string;
  }>;
  
  metadata: any;
}

// ============================================================================
// CANDIDATE ASSESSOR AGENT
// ============================================================================

/**
 * Candidate Assessor Agent
 * 
 * Uses the Three Engine Agent System to comprehensively assess candidates:
 * - Knowledge Engine: Loads assessment frameworks, Mizan 7 Cylinders, competency models
 * - Data Engine: Processes candidate data, resume, skills, experience
 * - Reasoning Engine: Generates comprehensive assessment with culture fit
 */
export class CandidateAssessorAgent {
  private logger: Logger;
  private assessmentFrameworks: Map<string, any>;
  private cultureFitModels: Map<string, any>;
  private competencyModels: Map<string, any>;

  constructor(config?: any) {
    this.logger = new Logger('CandidateAssessorAgent');
    this.assessmentFrameworks = new Map();
    this.cultureFitModels = new Map();
    this.competencyModels = new Map();
    
    // Initialize frameworks
    this.initializeFrameworks();
  }

  private initializeFrameworks(): void {
    // Initialize assessment frameworks
    this.assessmentFrameworks.set('technical', {
      name: 'Technical Assessment Framework',
      criteria: ['programming', 'system_design', 'problem_solving']
    });
    
    this.cultureFitModels.set('mizan_7_cylinders', {
      name: 'Mizan 7 Cylinders Culture Fit',
      dimensions: ['innovation', 'collaboration', 'excellence', 'integrity', 'growth', 'impact', 'balance']
    });
  }

  private async analyze(input: any): Promise<any> {
    // Simplified analysis for now
    return {
      knowledge: { confidence: 0.8 },
      data: { completeness: 0.9 },
      reasoning: { confidence: 0.85 }
    };
  }

  /**
   * Main entry point for candidate assessment
   */
  async assessCandidate(input: CandidateAssessmentInput): Promise<CandidateAssessmentOutput> {
    try {
      this.logger.info('Assessing candidate', {
        candidateId: input.candidateId,
        position: input.jobRequirements.title,
        assessmentType: input.assessmentType
      });

      // Run culture fit assessment if culture data is available
      let cultureFitAssessment: CultureFitAssessment | null = null;
      if (input.companyData.values && input.companyData.values.length > 0) {
        try {
          cultureFitAssessment = await cultureIntegration.assessCandidateCultureFit(
            input.candidateId,
            `culture_analysis_${Date.now()}`,
            input.candidate
          );
          this.logger.info('Culture fit assessment completed', {
            candidateId: input.candidateId,
            overallFit: cultureFitAssessment.overallCultureFit
          });
        } catch (error) {
          this.logger.warn('Culture fit assessment failed, continuing with skills assessment', {
            candidateId: input.candidateId,
            error: (error as Error).message
          });
        }
      }

      // Run the Three Engine process
      const result = await this.analyze({
        employeeId: input.candidateId,
        tenantId: input.tenantId,
        analysisType: 'candidate_assessment',
        analysisDepth: input.assessmentType === 'comprehensive' ? 'detailed_analysis' : 'quick_overview',
        includeRecommendations: true,
        currentState: {
          candidate: input.candidate,
          jobRequirements: input.jobRequirements,
          companyData: input.companyData,
          cultureFitAssessment
        },
        performanceData: {
          assessment: input
        },
        organizationalContext: {
          vision: input.companyData.vision,
          mission: input.companyData.mission,
          values: input.companyData.values,
          culture: input.companyData.culture
        },
        metadata: {
          ...input.metadata,
          cultureFitAssessment
        }
      });

      // Parse and structure the output
      return this.structureOutput(result, input, cultureFitAssessment);
    } catch (error) {
      this.logger.error('Error assessing candidate:', error);
      throw error;
    }
  }

  // ============================================================================
  // KNOWLEDGE ENGINE
  // ============================================================================

  /**
   * Load assessment frameworks and models
   */
  protected async loadFrameworks(): Promise<void> {
    this.logger.info('Loading assessment frameworks');

    // Mizan 7 Cylinders Framework (Core Culture Assessment)
    this.cultureFitModels.set('mizan_7_cylinders', {
      name: 'Mizan 7 Cylinders Framework',
      description: 'Comprehensive culture fit assessment framework',
      cylinders: {
        vision_alignment: {
          weight: 0.15,
          description: 'Alignment with organizational vision',
          keyIndicators: ['future_orientation', 'strategic_thinking', 'purpose_driven']
        },
        mission_alignment: {
          weight: 0.15,
          description: 'Alignment with organizational mission',
          keyIndicators: ['goal_orientation', 'impact_focus', 'mission_driven']
        },
        values_alignment: {
          weight: 0.20,
          description: 'Alignment with core values',
          keyIndicators: ['integrity', 'collaboration', 'innovation', 'excellence']
        },
        leadership_style: {
          weight: 0.15,
          description: 'Leadership and management approach',
          keyIndicators: ['empowerment', 'decisiveness', 'accountability']
        },
        work_style: {
          weight: 0.15,
          description: 'Work preferences and habits',
          keyIndicators: ['autonomy', 'structure', 'pace', 'collaboration']
        },
        communication_style: {
          weight: 0.10,
          description: 'Communication preferences',
          keyIndicators: ['directness', 'frequency', 'formality', 'feedback_style']
        },
        decision_making: {
          weight: 0.10,
          description: 'Decision-making approach',
          keyIndicators: ['data_driven', 'consultative', 'speed', 'risk_tolerance']
        }
      }
    });

    // Competency Assessment Framework
    this.competencyModels.set('competency_assessment', {
      name: 'Competency Assessment Model',
      categories: {
        technical: {
          description: 'Role-specific technical skills',
          assessment: 'Depth and breadth of technical expertise'
        },
        functional: {
          description: 'Job function competencies',
          assessment: 'Ability to perform job duties'
        },
        behavioral: {
          description: 'Behavioral competencies',
          assessment: 'Soft skills and interpersonal abilities'
        },
        leadership: {
          description: 'Leadership and management skills',
          assessment: 'Ability to lead and influence'
        }
      }
    });

    // Skills Assessment Framework
    this.assessmentFrameworks.set('skills_assessment', {
      name: 'Skills Assessment Framework',
      methodology: {
        resume_analysis: 'Extract and verify stated skills',
        experience_validation: 'Validate through work history',
        proficiency_estimation: 'Estimate skill proficiency levels',
        gap_analysis: 'Identify gaps vs requirements',
        strength_identification: 'Highlight exceptional skills'
      },
      proficiencyLevels: {
        beginner: 'Basic knowledge, limited experience',
        intermediate: 'Working knowledge, some experience',
        advanced: 'Strong expertise, significant experience',
        expert: 'Deep expertise, extensive experience',
        master: 'Industry-recognized expertise'
      }
    });

    // Experience Assessment Framework
    this.assessmentFrameworks.set('experience_assessment', {
      name: 'Experience Assessment Framework',
      factors: {
        years: 'Total years of relevant experience',
        progression: 'Career growth and advancement',
        relevance: 'Industry and domain relevance',
        impact: 'Demonstrated impact and achievements',
        scope: 'Scale and complexity of responsibilities'
      },
      careerProgressionPatterns: {
        rapid: 'Fast promotions, increased responsibilities',
        steady: 'Consistent growth at reasonable pace',
        lateral: 'Horizontal moves for skill development',
        plateau: 'Limited advancement',
        diverse: 'Varied roles and industries'
      }
    });

    // Education Assessment Framework
    this.assessmentFrameworks.set('education_assessment', {
      name: 'Education Assessment Framework',
      criteria: {
        degree_level: 'Educational attainment level',
        field_relevance: 'Relevance to position',
        institution_quality: 'Quality of educational institution',
        certifications: 'Professional certifications',
        continuous_learning: 'Ongoing education and development'
      }
    });

    // Interview Recommendation Framework
    this.assessmentFrameworks.set('interview_recommendations', {
      name: 'Interview Recommendation Framework',
      scoringThresholds: {
        strong_hire: { min: 0.85, interviews: ['cultural_fit', 'final'] },
        hire: { min: 0.75, interviews: ['technical', 'behavioral', 'cultural_fit'] },
        maybe: { min: 0.65, interviews: ['technical', 'behavioral', 'skills_assessment'] },
        pass: { min: 0.50, interviews: [] },
        strong_pass: { min: 0.00, interviews: [] }
      },
      focusAreas: {
        high_skills_low_culture: 'Focus on culture fit validation',
        high_culture_low_skills: 'Deep-dive technical assessment',
        red_flags: 'Address concerns directly',
        overqualified: 'Assess long-term fit and motivation'
      }
    });

    this.logger.info('Assessment frameworks loaded', {
      assessmentFrameworks: this.assessmentFrameworks.size,
      cultureFitModels: this.cultureFitModels.size,
      competencyModels: this.competencyModels.size
    });
  }

  /**
   * Generate knowledge system prompt
   */
  protected getKnowledgeSystemPrompt(): string {
    const mizan7Cylinders = this.cultureFitModels.get('mizan_7_cylinders');
    const competencyModel = this.competencyModels.get('competency_assessment');
    const skillsFramework = this.assessmentFrameworks.get('skills_assessment');
    const experienceFramework = this.assessmentFrameworks.get('experience_assessment');
    const educationFramework = this.assessmentFrameworks.get('education_assessment');
    const interviewRecs = this.assessmentFrameworks.get('interview_recommendations');

    return `You are an expert Candidate Assessor with deep knowledge of:

MIZAN 7 CYLINDERS FRAMEWORK (Core Culture Assessment):
${JSON.stringify(mizan7Cylinders, null, 2)}

COMPETENCY ASSESSMENT MODEL:
${JSON.stringify(competencyModel, null, 2)}

SKILLS ASSESSMENT FRAMEWORK:
${JSON.stringify(skillsFramework, null, 2)}

EXPERIENCE ASSESSMENT FRAMEWORK:
${JSON.stringify(experienceFramework, null, 2)}

EDUCATION ASSESSMENT FRAMEWORK:
${JSON.stringify(educationFramework, null, 2)}

INTERVIEW RECOMMENDATIONS:
${JSON.stringify(interviewRecs, null, 2)}

Your role is to:
1. Assess candidates comprehensively across skills, experience, education, and culture fit
2. Use the Mizan 7 Cylinders framework for culture fit analysis
3. Identify strengths, weaknesses, gaps, and red flags
4. Provide evidence-based recommendations
5. Generate interview focus areas and questions
6. Suggest compensation ranges
7. Recommend next steps in hiring process`;
  }

  // ============================================================================
  // DATA ENGINE
  // ============================================================================

  /**
   * Process candidate and job requirement data
   */
  protected async processData(data: any): Promise<any> {
    const input = data.performanceData?.assessment as CandidateAssessmentInput;
    
    if (!input) {
      throw new Error('No assessment data provided');
    }

    const processedData = {
      skillsAnalysis: this.analyzeSkills(input),
      experienceAnalysis: this.analyzeExperience(input),
      educationAnalysis: this.analyzeEducation(input),
      cultureFitAnalysis: this.analyzeCultureFit(input),
      resumeAnalysis: this.analyzeResume(input),
      fitAnalysis: this.analyzeFit(input)
    };

    return processedData;
  }

  /**
   * Analyze candidate skills
   */
  private analyzeSkills(input: CandidateAssessmentInput): any {
    const candidateSkills = input.candidate.skills || [];
    const requiredSkills = input.jobRequirements.requiredSkills || [];
    const preferredSkills = input.jobRequirements.preferredSkills || [];

    // Calculate required skills match
    const requiredMatches = requiredSkills.filter(reqSkill => 
      candidateSkills.some(candSkill => 
        this.skillsMatch(candSkill, reqSkill)
      )
    );

    // Calculate preferred skills match
    const preferredMatches = preferredSkills.filter(prefSkill => 
      candidateSkills.some(candSkill => 
        this.skillsMatch(candSkill, prefSkill)
      )
    );

    // Identify skill gaps
    const skillGaps = requiredSkills
      .filter(reqSkill => !requiredMatches.includes(reqSkill))
      .map(skill => ({
        skill: typeof skill === 'string' ? skill : skill.skill,
        required: true,
        severity: 'high'
      }));

    // Identify extra/bonus skills
    const bonusSkills = candidateSkills.filter(candSkill =>
      !requiredSkills.some(reqSkill => this.skillsMatch(candSkill, reqSkill)) &&
      !preferredSkills.some(prefSkill => this.skillsMatch(candSkill, prefSkill))
    );

    return {
      candidateSkillsCount: candidateSkills.length,
      requiredSkillsCount: requiredSkills.length,
      requiredSkillsMatched: requiredMatches.length,
      requiredSkillsMatchPercentage: requiredSkills.length > 0 
        ? (requiredMatches.length / requiredSkills.length) * 100 
        : 0,
      preferredSkillsMatched: preferredMatches.length,
      preferredSkillsMatchPercentage: preferredSkills.length > 0 
        ? (preferredMatches.length / preferredSkills.length) * 100 
        : 0,
      skillGaps,
      bonusSkills: bonusSkills.map(s => typeof s === 'string' ? s : s.skill)
    };
  }

  /**
   * Check if two skills match
   */
  private skillsMatch(candidateSkill: any, requiredSkill: any): boolean {
    const candSkillName = (typeof candidateSkill === 'string' ? candidateSkill : candidateSkill.skill).toLowerCase();
    const reqSkillName = (typeof requiredSkill === 'string' ? requiredSkill : requiredSkill.skill).toLowerCase();
    
    return candSkillName.includes(reqSkillName) || reqSkillName.includes(candSkillName);
  }

  /**
   * Analyze candidate experience
   */
  private analyzeExperience(input: CandidateAssessmentInput): any {
    const experience = input.candidate.experience || [];
    
    // Calculate total years of experience
    const totalYears = experience.reduce((sum, exp) => {
      const start = new Date(exp.startDate);
      const end = exp.endDate ? new Date(exp.endDate) : new Date();
      const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
      return sum + years;
    }, 0);

    // Assess career progression
    const careerProgression = this.assessCareerProgression(experience);

    // Check industry match
    const industryMatch = this.assessIndustryMatch(experience, input);

    return {
      totalYears: Math.round(totalYears * 10) / 10,
      positionsCount: experience.length,
      careerProgression,
      industryMatch,
      relevantExperience: this.calculateRelevantExperience(experience, input),
      seniorityMatch: this.assessSeniorityMatch(input),
      companySizes: experience.map(e => e.companySize || 'unknown')
    };
  }

  /**
   * Assess career progression pattern
   */
  private assessCareerProgression(experience: any[]): string {
    if (experience.length < 2) return 'insufficient_data';
    
    let promotionCount = 0;
    let lateralMoveCount = 0;

    for (let i = 1; i < experience.length; i++) {
      const prev = experience[i];
      const current = experience[i - 1];
      
      const prevLevel = this.extractLevel(prev.title);
      const currentLevel = this.extractLevel(current.title);
      
      if (currentLevel > prevLevel) promotionCount++;
      else if (currentLevel === prevLevel) lateralMoveCount++;
    }

    if (promotionCount >= experience.length * 0.5) return 'rapid';
    if (promotionCount >= experience.length * 0.3) return 'steady';
    if (lateralMoveCount >= experience.length * 0.5) return 'lateral';
    if (promotionCount === 0) return 'plateau';
    return 'diverse';
  }

  /**
   * Extract seniority level from job title
   */
  private extractLevel(title: string): number {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('executive') || lowerTitle.includes('chief') || lowerTitle.includes('vp')) return 5;
    if (lowerTitle.includes('director') || lowerTitle.includes('head of')) return 4;
    if (lowerTitle.includes('senior') || lowerTitle.includes('lead') || lowerTitle.includes('principal')) return 3;
    if (lowerTitle.includes('junior') || lowerTitle.includes('associate')) return 1;
    return 2; // Mid-level
  }

  /**
   * Assess industry match
   */
  private assessIndustryMatch(experience: any[], input: CandidateAssessmentInput): boolean {
    // Simplified - would use more sophisticated matching in production
    return experience.length > 0;
  }

  /**
   * Calculate relevant experience
   */
  private calculateRelevantExperience(experience: any[], input: CandidateAssessmentInput): number {
    // Simplified - would analyze job titles and responsibilities
    return experience.length > 0 ? experience.length * 0.7 : 0;
  }

  /**
   * Assess seniority match
   */
  private assessSeniorityMatch(input: CandidateAssessmentInput): boolean {
    const requiredLevel = input.jobRequirements.level?.toLowerCase();
    const candidateExperience = input.candidate.experience || [];
    
    if (candidateExperience.length === 0) return false;
    
    const latestRole = candidateExperience[0];
    const candidateLevel = this.extractLevel(latestRole.title);
    
    const levelMap = { entry: 1, mid: 2, senior: 3, executive: 4, leadership: 5 };
    const requiredLevelNum = (levelMap as any)[requiredLevel] || 2;
    
    return Math.abs(candidateLevel - requiredLevelNum) <= 1;
  }

  /**
   * Analyze candidate education
   */
  private analyzeEducation(input: CandidateAssessmentInput): any {
    const education = input.candidate.education || [];
    
    return {
      degrees: education.map(e => e.degree),
      fields: education.map(e => e.field),
      institutions: education.map(e => e.institution),
      meetsRequirements: this.checkEducationRequirements(education, input.jobRequirements),
      highestDegree: this.getHighestDegree(education)
    };
  }

  /**
   * Check if education meets requirements
   */
  private checkEducationRequirements(education: any[], requirements: any): boolean {
    if (!requirements.educationRequired) return true;
    
    const required = requirements.educationRequired.toLowerCase();
    return education.some(e => 
      e.degree?.toLowerCase().includes(required) ||
      required.includes(e.degree?.toLowerCase())
    );
  }

  /**
   * Get highest degree
   */
  private getHighestDegree(education: any[]): string {
    const degreeHierarchy = ['phd', 'doctorate', 'masters', 'mba', 'bachelors', 'associates'];
    
    for (const degree of degreeHierarchy) {
      if (education.some(e => e.degree?.toLowerCase().includes(degree))) {
        return degree;
      }
    }
    
    return 'none';
  }

  /**
   * Analyze culture fit using Mizan 7 Cylinders
   */
  private analyzeCultureFit(input: CandidateAssessmentInput): any {
    const mizan = this.cultureFitModels.get('mizan_7_cylinders');
    const companyValues = input.companyData.values || [];
    
    // Extract indicators from resume and cover letter
    const candidateText = [
      input.candidate.resume?.summary || '',
      input.candidate.coverLetter || ''
    ].join(' ').toLowerCase();

    // Assess each cylinder
    const cylinderScores: any = {};
    
    Object.entries(mizan.cylinders).forEach(([cylinder, config]: [string, any]) => {
      const indicators = config.keyIndicators || [];
      const matchCount = indicators.filter((indicator: string) => 
        candidateText.includes(indicator.replace('_', ' '))
      ).length;
      
      const score = indicators.length > 0 
        ? (matchCount / indicators.length) * 100 
        : 70; // Default neutral score
      
      cylinderScores[cylinder] = {
        score: Math.min(score, 100),
        evidence: indicators.filter((i: string) => candidateText.includes(i.replace('_', ' '))),
        concerns: indicators.filter((i: string) => !candidateText.includes(i.replace('_', ' ')))
      };
    });

    // Calculate overall culture fit score
    const overallCultureScore = Object.entries(mizan.cylinders).reduce((sum, [cylinder, config]: [string, any]) => {
      const weight = config.weight || 0.14;
      const score = cylinderScores[cylinder].score || 0;
      return sum + (score * weight);
    }, 0);

    return {
      overallScore: Math.round(overallCultureScore * 10) / 10,
      cylinders: cylinderScores,
      companyValues,
      valueAlignment: this.assessValueAlignment(candidateText, companyValues)
    };
  }

  /**
   * Assess alignment with company values
   */
  private assessValueAlignment(candidateText: string, companyValues: string[]): number {
    if (companyValues.length === 0) return 70;
    
    const matchCount = companyValues.filter(value => 
      candidateText.includes(value.toLowerCase())
    ).length;
    
    return (matchCount / companyValues.length) * 100;
  }

  /**
   * Analyze resume quality and content
   */
  private analyzeResume(input: CandidateAssessmentInput): any {
    return {
      hasResume: !!input.candidate.resume,
      hasCoverLetter: !!input.candidate.coverLetter,
      completeness: this.assessResumeCompleteness(input.candidate),
      clarity: 'good', // Would use AI analysis in production
      formatting: 'professional' // Would use AI analysis in production
    };
  }

  /**
   * Assess resume completeness
   */
  private assessResumeCompleteness(candidate: any): number {
    let score = 0;
    if (candidate.skills && candidate.skills.length > 0) score += 25;
    if (candidate.experience && candidate.experience.length > 0) score += 25;
    if (candidate.education && candidate.education.length > 0) score += 25;
    if (candidate.resume) score += 25;
    return score;
  }

  /**
   * Analyze overall candidate-job fit
   */
  private analyzeFit(input: CandidateAssessmentInput): any {
    return {
      positionTitle: input.jobRequirements.title,
      candidateName: `${input.candidate.firstName} ${input.candidate.lastName}`,
      overallFitScore: 0, // Will be calculated by reasoning engine
      keyMatches: [],
      keyGaps: []
    };
  }

  /**
   * Generate data system prompt
   */
  protected getDataSystemPrompt(): string {
    return `Analyze the following candidate assessment data:

SKILLS ANALYSIS: Candidate skills vs job requirements
EXPERIENCE ANALYSIS: Career history, progression, and relevance
EDUCATION ANALYSIS: Educational background and certifications
CULTURE FIT ANALYSIS: Mizan 7 Cylinders alignment
RESUME ANALYSIS: Resume quality and completeness
FIT ANALYSIS: Overall candidate-job match

Your analysis should provide:
1. Quantitative metrics (match percentages, scores)
2. Qualitative insights (strengths, weaknesses)
3. Gap identification (missing skills, experience)
4. Red flag detection (inconsistencies, concerns)
5. Cultural alignment assessment (7 Cylinders)
6. Evidence-based observations`;
  }

  // ============================================================================
  // REASONING ENGINE
  // ============================================================================

  /**
   * Build reasoning prompt for candidate assessment
   */
  protected buildReasoningPrompt(knowledgeResult: any, dataResult: any): string {
    return `Based on the assessment frameworks and the analyzed candidate data, provide a comprehensive candidate evaluation.

Generate:
1. OVERALL ASSESSMENT:
   - Overall score (0-100)
   - Recommendation (strong_hire/hire/maybe/pass/strong_pass)
   - Summary statement

2. SKILLS ASSESSMENT:
   - Skills score (0-100)
   - Required skills match percentage
   - Preferred skills match percentage
   - Skill gaps (list with severity)
   - Skill strengths (exceptional skills)

3. EXPERIENCE ASSESSMENT:
   - Experience score (0-100)
   - Years of experience
   - Relevant experience percentage
   - Career progression pattern
   - Seniority match (yes/no)

4. CULTURE FIT ASSESSMENT (Mizan 7 Cylinders):
   - Culture fit score (0-100)
   - Score for each of 7 cylinders
   - Evidence for alignment
   - Concerns for each cylinder
   - Overall cultural alignment

5. EDUCATION ASSESSMENT:
   - Education score (0-100)
   - Meets requirements (yes/no)
   - Credentials list
   - Certifications

6. OVERALL ANALYSIS:
   - Top 5 strengths
   - Top 5 weaknesses
   - Development opportunities
   - Concerns or red flags

7. INTERVIEW RECOMMENDATIONS:
   - Should interview? (yes/no)
   - Recommended interview types
   - Focus areas for interviews
   - 5 suggested interview questions

8. COMPENSATION:
   - Suggested salary range
   - Negotiation room
   - Justification

9. NEXT STEPS:
   - Recommended actions (priority, timeline)

Return as JSON with these exact keys: overallScore, recommendation, skillsAssessment, experienceAssessment, cultureFitAssessment, educationAssessment, overallAnalysis, interviewRecommendations, compensation, nextSteps`;
  }

  /**
   * Parse reasoning output
   */
  protected parseReasoningOutput(output: string): any {
    try {
      // Try to parse as JSON
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Return structured fallback
      return {
        overallScore: 70,
        recommendation: 'maybe',
        skillsAssessment: { score: 70 },
        experienceAssessment: { score: 70 },
        cultureFitAssessment: { score: 70 },
        educationAssessment: { score: 70 },
        overallAnalysis: { strengths: [], weaknesses: [] },
        interviewRecommendations: { shouldInterview: true },
        compensation: { suggestedSalary: 0 },
        nextSteps: []
      };
    } catch (error) {
      this.logger.error('Error parsing reasoning output:', error);
      throw error;
    }
  }

  // ============================================================================
  // OUTPUT STRUCTURING
  // ============================================================================

  /**
   * Structure the final assessment output
   */
  private structureOutput(result: any, input: CandidateAssessmentInput, cultureFitAssessment?: CultureFitAssessment | null): CandidateAssessmentOutput {
    const reasoning = result.reasoning || {};

    return {
      overallScore: reasoning.overallScore || 70,
      recommendation: reasoning.recommendation || 'maybe',
      
      skillsAssessment: reasoning.skillsAssessment || {
        score: 70,
        requiredSkillsMatch: 70,
        preferredSkillsMatch: 50,
        skillGaps: [],
        skillStrengths: []
      },
      
      experienceAssessment: reasoning.experienceAssessment || {
        score: 70,
        yearsOfExperience: 0,
        relevantExperience: 0,
        industryMatch: false,
        seniorityMatch: false,
        careerProgression: 'unknown'
      },
      
      cultureFitAssessment: cultureFitAssessment ? {
        score: cultureFitAssessment.overallCultureFit,
        alignment: cultureFitAssessment.alignmentAnalysis,
        strongCylinders: cultureFitAssessment.alignmentAnalysis.strongCylinders,
        weakCylinders: cultureFitAssessment.alignmentAnalysis.weakCylinders,
        enablingValues: cultureFitAssessment.enablingValuesDemonstrated,
        limitingValues: cultureFitAssessment.limitingValuesPresent,
        culturalRisks: cultureFitAssessment.alignmentAnalysis.culturalRisks,
        cylinderAlignment: cultureFitAssessment.cylinderAlignment,
        recommendation: cultureFitAssessment.recommendations.hireRecommendation,
        confidence: cultureFitAssessment.recommendations.confidence,
        reasoning: cultureFitAssessment.recommendations.reasoning,
        interviewFocus: cultureFitAssessment.recommendations.interviewFocus,
        onboardingNeeds: cultureFitAssessment.recommendations.onboardingNeeds
      } : (reasoning.cultureFitAssessment || {
        score: 70,
        alignment: {},
        strongCylinders: [],
        weakCylinders: [],
        cylinderAlignment: {}
      }),
      
      educationAssessment: reasoning.educationAssessment || {
        score: 70,
        meetsRequirements: false,
        credentials: [],
        certifications: []
      },
      
      overallAnalysis: reasoning.overallAnalysis || {
        strengths: [],
        weaknesses: [],
        opportunities: [],
        concerns: [],
        redFlags: []
      },
      
      interviewRecommendations: reasoning.interviewRecommendations || {
        shouldInterview: true,
        interviewType: ['behavioral'],
        focusAreas: [],
        suggestedQuestions: []
      },
      
      compensation: reasoning.compensation || {
        suggestedSalary: 0,
        negotiationRoom: 0,
        justification: ''
      },
      
      nextSteps: reasoning.nextSteps || [],
      
      metadata: {
        generatedBy: 'CandidateAssessorAgent',
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
        assessmentType: input.assessmentType,
        knowledgeEngineScore: result.knowledge?.confidence || 0,
        dataEngineScore: result.data?.completeness || 0,
        reasoningEngineScore: result.reasoning?.confidence || 0
      }
    };
  }

}

