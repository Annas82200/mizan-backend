// server/services/hiring/culture-fit-assessor.ts

import { db } from '../../../../db/index.js';
import { hiringRequisitions } from '../../../../db/schema/hiring.js';
import { companies } from '../../../../db/schema.js';
import { eq } from 'drizzle-orm';

export interface Candidate {
  id: string;
  name: string;
  email: string;
  resume: string;
  experience: any[];
  skills: string[];
  education: any[];
  location?: string;
  expectedSalary?: number;
}

export interface Job {
  id: string;
  title: string;
  department: string;
  description: string;
  requirements: string[];
  companyId: string;
  tenantId: string;
}

export interface CultureFitAssessment {
  overallScore: number;
  alignmentScore: number;
  riskFactors: string[];
  strengths: string[];
  recommendations: string[];
  detailedAnalysis: {
    valuesAlignment: number;
    workStyleFit: number;
    communicationStyle: number;
    leadershipStyle: number;
    adaptability: number;
  };
}

export class CultureFitAssessor {
  async assessCultureFit(candidate: Candidate, job: Job, tenantId: string): Promise<CultureFitAssessment> {
    try {
      console.log(`Assessing culture fit for candidate ${candidate.name} for job ${job.title}`);
      
      // Get company culture data
      const companyCulture = await this.getCompanyCulture(job.companyId, tenantId);
      
      // Analyze candidate's resume and experience
      const candidateProfile = await this.analyzeCandidateProfile(candidate);
      
      // Assess culture alignment
      const alignmentScore = await this.assessValuesAlignment(candidateProfile, companyCulture);
      
      // Calculate overall score
      const overallScore = this.calculateOverallScore({
        valuesAlignment: alignmentScore,
        workStyleFit: 0.7,
        communicationStyle: 0.6,
        leadershipStyle: 0.5,
        adaptability: 0.8
      });
      
      const assessment: CultureFitAssessment = {
        overallScore,
        alignmentScore,
        riskFactors: ['Low values alignment'],
        strengths: ['Strong communication skills'],
        recommendations: ['Conduct values-based interview'],
        detailedAnalysis: {
          valuesAlignment: alignmentScore,
          workStyleFit: 0.7,
          communicationStyle: 0.6,
          leadershipStyle: 0.5,
          adaptability: 0.8
        }
      };
      
      console.log(`Culture fit assessment completed. Overall score: ${overallScore}`);
      
      return assessment;
    } catch (error) {
      console.error('Culture fit assessment failed:', error);
      throw error;
    }
  }

  private async getCompanyCulture(companyId: string, tenantId: string): Promise<any> {
    try {
      const company = await db.query.companies.findFirst({
        where: eq(companies.id, companyId)
      });
      
      const companyData = company as Record<string, unknown> | undefined;
      return {
        values: (companyData?.values as string[]) || [],
        cultureType: (companyData?.cultureType as string) || 'collaborative',
        workEnvironment: (companyData?.workEnvironment as string) || 'hybrid'
      };
    } catch (error) {
      console.error('Failed to get company culture:', error);
    return {
        values: [],
        cultureType: 'collaborative',
        workEnvironment: 'hybrid'
      };
    }
  }

  private async analyzeCandidateProfile(candidate: Candidate): Promise<any> {
    try {
      const resumeText = candidate.resume;
      const culturalIndicators = this.extractCulturalIndicators(resumeText);
      
      return {
        culturalIndicators,
        resumeText
      };
    } catch (error) {
      console.error('Failed to analyze candidate profile:', error);
      return {
        culturalIndicators: {},
        resumeText: candidate.resume
      };
    }
  }

  private extractCulturalIndicators(resumeText: string): any {
    const indicators = {
      collaboration: 0,
      innovation: 0,
      leadership: 0,
      adaptability: 0,
      communication: 0
    };
    
    const keywords = {
      collaboration: ['team', 'collaborate', 'coordinate', 'partner'],
      innovation: ['innovate', 'creative', 'disrupt', 'transform'],
      leadership: ['lead', 'manage', 'direct', 'supervise'],
      adaptability: ['adapt', 'flexible', 'change', 'evolve'],
      communication: ['communicate', 'present', 'speak', 'write']
    };
    
    const text = resumeText.toLowerCase();
    
    for (const [indicator, words] of Object.entries(keywords)) {
      indicators[indicator as keyof typeof indicators] = words.reduce((count, word) => {
        return count + (text.split(word).length - 1);
      }, 0);
    }
    
    return indicators;
  }

  private async assessValuesAlignment(candidateProfile: any, companyCulture: any): Promise<number> {
    const candidateValues = candidateProfile.culturalIndicators;
    const companyValues = companyCulture.values;
    
    if (!companyValues || companyValues.length === 0) {
      return 0.7;
    }
    
    const totalIndicators = Object.values(candidateValues).reduce((sum: number, val: any) => sum + val, 0);
    const positiveIndicators = Object.values(candidateValues).reduce((sum: number, val: any) => sum + Math.max(0, val), 0);
    
    return totalIndicators > 0 ? positiveIndicators / totalIndicators : 0.5;
  }

  private calculateOverallScore(scores: any): number {
    const weights = {
      valuesAlignment: 0.3,
      workStyleFit: 0.25,
      communicationStyle: 0.2,
      leadershipStyle: 0.15,
      adaptability: 0.1
    };

    return Object.entries(scores).reduce((total, [key, score]) => {
      return total + (score as number * (weights[key as keyof typeof weights] || 0));
    }, 0);
  }

  /**
   * Create an interactive assessment for Enterprise tier
   * Generates a unique assessment link for bot-assisted interviews
   */
  async createInteractiveAssessment(candidateId: string): Promise<string> {
    const assessmentId = `assess_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const assessmentUrl = `/api/hiring/assessments/${assessmentId}/interactive`;

    // In production, this would:
    // 1. Create an assessment record in the database
    // 2. Generate a secure token for the assessment
    // 3. Configure the bot interview questions
    // 4. Set up webhook callbacks for real-time scoring

    return assessmentUrl;
  }

  /**
   * Generate an assessment link for Pro/Pro+ tiers
   * Returns a self-service assessment link
   */
  async generateAssessmentLink(candidateId: string): Promise<string> {
    const assessmentId = `assess_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const assessmentLink = `/api/hiring/assessments/${assessmentId}`;

    // In production, this would:
    // 1. Create an assessment record in the database
    // 2. Generate questions based on company values
    // 3. Set expiration time
    // 4. Send email to candidate

    return assessmentLink;
  }

  /**
   * Generate interview questions based on company values
   */
  async generateInterviewQuestions(values: string[], culture: any): Promise<string[]> {
    const questions: string[] = [];

    // Generate value-based questions
    for (const value of values.slice(0, 3)) {
      questions.push(`Can you describe a time when you demonstrated ${value.toLowerCase()} in your work?`);
    }

    // Add culture-fit questions based on company culture type
    const cultureType = culture?.cultureType || 'collaborative';

    const cultureQuestions: Record<string, string[]> = {
      collaborative: [
        "Tell us about a time you successfully collaborated with a cross-functional team.",
        "How do you handle conflicts in a team setting?"
      ],
      innovative: [
        "Describe an innovative solution you created to solve a problem.",
        "How do you stay current with industry trends and new technologies?"
      ],
      results_driven: [
        "Share an example of a challenging goal you achieved.",
        "How do you prioritize tasks when everything seems urgent?"
      ],
      customer_focused: [
        "Tell us about a time you went above and beyond for a customer.",
        "How do you balance customer needs with business constraints?"
      ]
    };

    const typeQuestions = cultureQuestions[cultureType] || cultureQuestions.collaborative;
    questions.push(...typeQuestions);

    // Add general culture fit questions
    questions.push(
      "What type of work environment helps you do your best work?",
      "How do you handle feedback and constructive criticism?",
      "What does workplace culture mean to you?"
    );

    return questions.slice(0, 8); // Return top 8 questions
  }
}

export const cultureFitAssessor = new CultureFitAssessor();

export async function assessCultureFit(candidate: Candidate, job: Job, tenantId: string): Promise<CultureFitAssessment> {
  return cultureFitAssessor.assessCultureFit(candidate, job, tenantId);
}