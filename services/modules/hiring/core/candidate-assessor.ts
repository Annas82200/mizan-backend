/**
 * Candidate Assessor
 * Performs comprehensive assessment of candidates including:
 * - Resume screening
 * - Culture fit assessment (7 Cylinders - first 3 questions)
 * - Skills assessment (technical and soft skills)
 * - Overall candidate evaluation and ranking
 */

import { EnsembleAI } from "../../../ai-providers/ensemble.js";
import { db } from "../../../../db/index.js";
import { candidates, candidateAssessments, hiringRequisitions } from "../../../../db/schema/hiring.js";
import { eq } from 'drizzle-orm';
import { logger } from "../../../../utils/logger.js";
import { CultureAgent } from "../../../agents/culture/culture-agent.js";

export interface AssessmentResult {
  overallScore: number;
  skillsScore: number;
  cultureScore: number;
  experienceScore: number;
  recommendation: 'strong_hire' | 'hire' | 'maybe' | 'pass' | 'strong_pass';
  strengths: string[];
  weaknesses: string[];
  concerns: string[];
  nextSteps: string[];
}

export class CandidateAssessor {
  private ensemble: EnsembleAI;
  private cultureAgent: CultureAgent;

  constructor(private tenantId: string) {
    this.ensemble = new EnsembleAI({
      strategy: "weighted",
      providers: ["claude", "gpt-4", "cohere"]
    });
    this.cultureAgent = new CultureAgent();
  }

  /**
   * Perform initial resume screening
   */
  async screenResume(candidateId: string): Promise<{
    score: number;
    passed: boolean;
    insights: string[];
    redFlags: string[];
  }> {
    const candidate = await db.query.candidates.findFirst({
      where: eq(candidates.id, candidateId),
      with: {
        requisition: true
      }
    });

    if (!candidate) {
      throw new Error('Candidate not found');
    }

    const prompt = `Perform initial resume screening for this candidate.

Position: ${candidate.requisition?.positionTitle}
Required Skills: ${JSON.stringify(candidate.requisition?.requiredSkills)}
Required Experience: ${candidate.requisition?.experienceRequired}

Candidate Information:
- Name: ${candidate.firstName} ${candidate.lastName}
- Current Role: ${candidate.currentTitle} at ${candidate.currentCompany}
- Experience: ${candidate.yearsOfExperience} years
- Skills: ${JSON.stringify(candidate.skills)}
- Education: ${JSON.stringify(candidate.education)}

Evaluate:
1. Skills match (0-100)
2. Experience level match (0-100)
3. Education qualification (0-100)
4. Overall resume quality (0-100)
5. Any red flags

Return JSON:
{
  "score": number (0-100),
  "passed": boolean,
  "insights": string[],
  "redFlags": string[],
  "skillsMatch": number,
  "experienceMatch": number,
  "educationMatch": number
}`;

    const response = await this.ensemble.call({
      agent: "Hiring",
      engine: "reasoning",
      tenantId: this.tenantId,
      prompt,
      temperature: 0.2
    });

    const result = typeof response === 'string' ? JSON.parse(response) : response;

    // Store assessment
    await db.insert(candidateAssessments).values({
      tenantId: this.tenantId,
      candidateId,
      requisitionId: candidate.requisitionId,
      assessmentType: 'resume_review',
      assessmentName: 'Initial Resume Screening',
      assessedBy: 'AI',
      assessorRole: 'ai_agent',
      overallScore: String(result.score),
      scores: {
        skillsMatch: result.skillsMatch,
        experienceMatch: result.experienceMatch,
        educationMatch: result.educationMatch
      },
      passed: result.passed,
      strengths: result.insights || [],
      concerns: result.redFlags || [],
      recommendation: result.passed ? 'proceed' : 'reject'
    });

    return result;
  }

  /**
   * Perform culture fit assessment (first 3 questions from 7 Cylinders)
   */
  async assessCultureFit(candidateId: string, assessmentResponses: {
    question1: string; // Personal values
    question2: string; // Work environment preferences
    question3: string; // Team collaboration style
  }): Promise<{
    cultureScore: number;
    cylinderAlignment: any;
    cultureFitAnalysis: string;
    passed: boolean;
  }> {
    const candidate = await db.query.candidates.findFirst({
      where: eq(candidates.id, candidateId),
      with: {
        requisition: true
      }
    });

    if (!candidate) {
      throw new Error('Candidate not found');
    }

    // Initialize culture agent
    await this.cultureAgent.initialize(this.tenantId);

    // Analyze candidate values from responses
    const prompt = `Analyze this candidate's culture fit based on their assessment responses.

Assessment Responses:
1. Personal Values: "${assessmentResponses.question1}"
2. Work Environment Preferences: "${assessmentResponses.question2}"
3. Team Collaboration Style: "${assessmentResponses.question3}"

Company Culture Requirements (7 Cylinders):
${JSON.stringify(candidate.requisition?.cultureValues)}

Evaluate alignment with each of the 7 Cylinders:
1. Safety & Survival
2. Belonging & Loyalty
3. Growth & Achievement
4. Meaning & Contribution
5. Integrity & Justice
6. Wisdom & Compassion
7. Transcendence & Unity

Return JSON:
{
  "cylinderScores": {
    "1": number (0-100),
    "2": number (0-100),
    ...
  },
  "overallCultureScore": number (0-100),
  "enablingValues": string[],
  "limitingValues": string[],
  "cultureFitAnalysis": string,
  "passed": boolean (score >= 70)
}`;

    const response = await this.ensemble.call({
      agent: "Culture",
      engine: "reasoning",
      tenantId: this.tenantId,
      prompt,
      temperature: 0.3
    });

    const result = typeof response === 'string' ? JSON.parse(response) : response;

    // Store culture assessment
    await db.insert(candidateAssessments).values({
      tenantId: this.tenantId,
      candidateId,
      requisitionId: candidate.requisitionId,
      assessmentType: 'culture_fit',
      assessmentName: '7 Cylinders Culture Fit Assessment',
      assessedBy: 'AI',
      assessorRole: 'culture_agent',
      overallScore: String(result.overallCultureScore),
      scores: result.cylinderScores,
      cultureFitScore: String(result.overallCultureScore),
      cultureFitAnalysis: {
        analysis: result.cultureFitAnalysis,
        enablingValues: result.enablingValues,
        limitingValues: result.limitingValues
      },
      cultureAlignment: result.cylinderScores,
      passed: result.passed,
      recommendations: result.cultureFitAnalysis
    });

    // Update candidate record
    await db.update(candidates)
      .set({
        cultureScore: String(result.overallCultureScore),
        cultureAnalysis: result.cultureFitAnalysis,
        cultureAlignment: result.cylinderScores
      })
      .where(eq(candidates.id, candidateId));

    return {
      cultureScore: result.overallCultureScore,
      cylinderAlignment: result.cylinderScores,
      cultureFitAnalysis: result.cultureFitAnalysis,
      passed: result.passed
    };
  }

  /**
   * Perform skills assessment (technical and soft skills)
   */
  async assessSkills(candidateId: string, skillsData: {
    technicalSkills: Array<{ skill: string; level: string; yearsOfExperience: number }>;
    softSkills: string[];
    projectExperience: string[];
  }): Promise<{
    skillsScore: number;
    technicalScore: number;
    softSkillsScore: number;
    skillGaps: string[];
    skillStrengths: string[];
    passed: boolean;
  }> {
    const candidate = await db.query.candidates.findFirst({
      where: eq(candidates.id, candidateId),
      with: {
        requisition: true
      }
    });

    if (!candidate) {
      throw new Error('Candidate not found');
    }

    const prompt = `Assess candidate's technical and soft skills for this position.

Position: ${candidate.requisition?.positionTitle}
Required Skills: ${JSON.stringify(candidate.requisition?.requiredSkills)}
Preferred Skills: ${JSON.stringify(candidate.requisition?.preferredSkills)}

Candidate Skills:
Technical: ${JSON.stringify(skillsData.technicalSkills)}
Soft Skills: ${JSON.stringify(skillsData.softSkills)}
Project Experience: ${JSON.stringify(skillsData.projectExperience)}

Evaluate:
1. Technical skills match and proficiency level
2. Soft skills assessment
3. Skill gaps (required skills missing)
4. Skill strengths (above requirements)
5. Overall skills score

Return JSON:
{
  "technicalScore": number (0-100),
  "softSkillsScore": number (0-100),
  "overallSkillsScore": number (0-100),
  "skillGaps": string[],
  "skillStrengths": string[],
  "skillsMatched": string[],
  "proficiencyLevels": object,
  "passed": boolean (score >= 70)
}`;

    const response = await this.ensemble.call({
      agent: "Skills",
      engine: "reasoning",
      tenantId: this.tenantId,
      prompt,
      temperature: 0.2
    });

    const result = typeof response === 'string' ? JSON.parse(response) : response;

    // Store skills assessment
    await db.insert(candidateAssessments).values({
      tenantId: this.tenantId,
      candidateId,
      requisitionId: candidate.requisitionId,
      assessmentType: 'skills',
      assessmentName: 'Technical and Soft Skills Assessment',
      assessedBy: 'AI',
      assessorRole: 'skills_agent',
      overallScore: String(result.overallSkillsScore),
      scores: {
        technical: result.technicalScore,
        softSkills: result.softSkillsScore
      },
      skillsAssessed: result.skillsMatched,
      skillGaps: result.skillGaps,
      skillStrengths: result.skillStrengths,
      passed: result.passed
    });

    // Update candidate record
    await db.update(candidates)
      .set({
        skillsScore: String(result.overallSkillsScore),
        skills: skillsData.technicalSkills,
        strengths: result.skillStrengths,
        weaknesses: result.skillGaps
      })
      .where(eq(candidates.id, candidateId));

    return {
      skillsScore: result.overallSkillsScore,
      technicalScore: result.technicalScore,
      softSkillsScore: result.softSkillsScore,
      skillGaps: result.skillGaps,
      skillStrengths: result.skillStrengths,
      passed: result.passed
    };
  }

  /**
   * Perform comprehensive candidate evaluation
   * Combines all assessments and generates final recommendation
   */
  async evaluateCandidate(candidateId: string): Promise<AssessmentResult> {
    const candidate = await db.query.candidates.findFirst({
      where: eq(candidates.id, candidateId),
      with: {
        requisition: true,
        assessments: true
      }
    });

    if (!candidate) {
      throw new Error('Candidate not found');
    }

    // Get all assessment scores
    const resumeAssessment = candidate.assessments.find(a => a.assessmentType === 'resume_review');
    const cultureAssessment = candidate.assessments.find(a => a.assessmentType === 'culture_fit');
    const skillsAssessment = candidate.assessments.find(a => a.assessmentType === 'skills');

    const resumeScore = resumeAssessment ? parseFloat(String(resumeAssessment.overallScore)) : 0;
    const cultureScore = cultureAssessment ? parseFloat(String(cultureAssessment.overallScore)) : 0;
    const skillsScore = skillsAssessment ? parseFloat(String(skillsAssessment.overallScore)) : 0;

    // Calculate weighted overall score
    const cultureFitWeight = parseFloat(String(candidate.requisition?.cultureFitWeight)) || 0.3;
    const skillsWeight = 0.4;
    const experienceWeight = 0.3;

    const overallScore =
      (cultureScore * cultureFitWeight) +
      (skillsScore * skillsWeight) +
      (resumeScore * experienceWeight);

    // Determine recommendation
    let recommendation: 'strong_hire' | 'hire' | 'maybe' | 'pass' | 'strong_pass';
    if (overallScore >= 90) recommendation = 'strong_hire';
    else if (overallScore >= 75) recommendation = 'hire';
    else if (overallScore >= 60) recommendation = 'maybe';
    else if (overallScore >= 40) recommendation = 'pass';
    else recommendation = 'strong_pass';

    // Collect strengths and weaknesses
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const concerns: string[] = [];

    candidate.assessments.forEach(assessment => {
      if (assessment.strengths) strengths.push(...(assessment.strengths as string[]));
      if (assessment.weaknesses) weaknesses.push(...(assessment.weaknesses as string[]));
      if (assessment.concerns) concerns.push(...(assessment.concerns as string[]));
    });

    // Determine next steps
    const nextSteps: string[] = [];
    if (recommendation === 'strong_hire' || recommendation === 'hire') {
      nextSteps.push('Schedule technical interview');
      nextSteps.push('Conduct behavioral interview');
      nextSteps.push('Check references');
    } else if (recommendation === 'maybe') {
      nextSteps.push('Additional skills assessment');
      nextSteps.push('Hiring manager review');
    } else {
      nextSteps.push('Send rejection email');
    }

    // Update candidate record
    await db.update(candidates)
      .set({
        overallScore: String(overallScore),
        skillsScore: String(skillsScore),
        cultureScore: String(cultureScore),
        experienceScore: String(resumeScore),
        assessmentSummary: {
          overallScore,
          cultureFitWeight,
          recommendation,
          assessmentDate: new Date()
        },
        strengths: Array.from(new Set(strengths)),
        weaknesses: Array.from(new Set(weaknesses)),
        redFlags: concerns,
        aiRecommendation: recommendation,
        status: recommendation === 'strong_hire' || recommendation === 'hire' ? 'screening' :
                recommendation === 'maybe' ? 'screening' : 'rejected',
        stage: recommendation === 'strong_hire' || recommendation === 'hire' ? 'technical_assessment' :
               recommendation === 'maybe' ? 'phone_screen' : 'application'
      })
      .where(eq(candidates.id, candidateId));

    logger.info(`Candidate ${candidateId} evaluated: ${recommendation} (score: ${overallScore})`);

    return {
      overallScore,
      skillsScore,
      cultureScore,
      experienceScore: resumeScore,
      recommendation,
      strengths: Array.from(new Set(strengths)),
      weaknesses: Array.from(new Set(weaknesses)),
      concerns,
      nextSteps
    };
  }

  /**
   * Rank candidates for a requisition
   */
  async rankCandidates(requisitionId: string): Promise<Array<{
    candidateId: string;
    name: string;
    overallScore: number;
    rank: number;
    recommendation: string;
  }>> {
    const allCandidates = await db.query.candidates.findMany({
      where: eq(candidates.requisitionId, requisitionId)
    });

    // Sort by overall score
    const ranked = allCandidates
      .filter(c => c.overallScore !== null)
      .sort((a, b) => parseFloat(String(b.overallScore)) - parseFloat(String(a.overallScore)))
      .map((c, index) => ({
        candidateId: c.id,
        name: `${c.firstName} ${c.lastName}`,
        overallScore: parseFloat(String(c.overallScore)),
        rank: index + 1,
        recommendation: c.aiRecommendation || 'pending'
      }));

    logger.info(`Ranked ${ranked.length} candidates for requisition ${requisitionId}`);
    return ranked;
  }
}
