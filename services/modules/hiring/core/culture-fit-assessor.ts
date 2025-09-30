// server/services/hiring/culture-fit-assessor.ts

import { db } from '../../db/index.js';
import { hiringRequisitions, users } from '../../db/schema.js';
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
        where: eq('id', companyId)
      });
      
      return {
        values: company?.values || [],
        cultureType: company?.cultureType || 'collaborative',
        workEnvironment: company?.workEnvironment || 'hybrid'
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
      indicators[indicator] = words.reduce((count, word) => {
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
      return total + (score * weights[key]);
    }, 0);
  }
}

export const cultureFitAssessor = new CultureFitAssessor();

export async function assessCultureFit(candidate: Candidate, job: Job, tenantId: string): Promise<CultureFitAssessment> {
  return cultureFitAssessor.assessCultureFit(candidate, job, tenantId);
}