/**
 * Culture Analysis Integration
 * Handles integration between Hiring Module and Culture Analysis Module
 * Uses Mizan 7 Cylinders framework for candidate culture fit assessment
 */

import { logger } from '../../../../utils/logger.js';
import { db } from '../../../../db/index.js';
import { candidates, candidateAssessments } from '../../../../db/schema/hiring.js';
import { eq, and } from 'drizzle-orm';

export interface CultureAnalysisData {
  tenantId: string;
  analysisId: string;
  analysisType: 'culture_assessment' | 'culture_survey' | 'culture_analysis' | 'culture_audit';
  department?: string;
  role?: string;
  level?: 'entry' | 'mid' | 'senior' | 'executive' | 'leadership';
  cylinderScores: {
    cylinder1_safety_survival: number; // 0-100
    cylinder2_belonging_loyalty: number; // 0-100
    cylinder3_growth_achievement: number; // 0-100
    cylinder4_meaning_contribution: number; // 0-100
    cylinder5_integrity_justice: number; // 0-100
    cylinder6_wisdom_compassion: number; // 0-100
    cylinder7_transcendence_unity: number; // 0-100
  };
  enablingValues: Record<string, number>; // Scores for each enabling value
  limitingValues: Record<string, number>; // Scores for each limiting value
  cultureProfile: {
    dominantCylinders: number[]; // Which cylinders are strongest
    culturalMaturity: number; // Overall maturity (1-7)
    cultureStrength: number; // 0-100
    entropyScore: number; // 0-1 (higher = more limiting values)
  };
  recommendations: {
    hiringCriteria: string[];
    interviewQuestions: string[];
    assessmentMethods: string[];
    cultureFitWeight: number; // 0-1
    focusCylinders: number[]; // Which cylinders to assess
  };
  metadata: any;
}

export interface CultureFitAssessment {
  candidateId: string;
  tenantId: string;
  cultureAnalysisId: string;
  overallCultureFit: number; // 0-100
  cylinderAlignment: {
    cylinder1_safety_survival: number; // 0-100
    cylinder2_belonging_loyalty: number; // 0-100
    cylinder3_growth_achievement: number; // 0-100
    cylinder4_meaning_contribution: number; // 0-100
    cylinder5_integrity_justice: number; // 0-100
    cylinder6_wisdom_compassion: number; // 0-100
    cylinder7_transcendence_unity: number; // 0-100
  };
  enablingValuesDemonstrated: string[]; // Which enabling values candidate shows
  limitingValuesPresent: string[]; // Which limiting values candidate shows
  alignmentAnalysis: {
    strongCylinders: number[]; // Cylinders where candidate aligns well (1-7)
    weakCylinders: number[]; // Cylinders with gaps (1-7)
    developmentAreas: string[]; // Specific areas for development
    culturalRisks: string[]; // Potential cultural fit risks
  };
  recommendations: {
    hireRecommendation: 'strong_yes' | 'yes' | 'maybe' | 'no' | 'strong_no';
    confidence: number; // 0-100
    reasoning: string;
    interviewFocus: string[]; // What to probe in interviews
    onboardingNeeds: string[]; // Cultural onboarding priorities
  };
  assessmentDate: Date;
  assessedBy: string;
  metadata: any;
}

export class CultureIntegration {
  private logger = logger;

  constructor() {
    this.logger.info('Culture Integration initialized');
  }

  /**
   * Process culture analysis data and update hiring criteria
   */
  public async processCultureAnalysis(data: CultureAnalysisData): Promise<{
    success: boolean;
    updatedRequisitions: string[];
    cultureCriteria: any;
    errors: string[];
  }> {
    try {
      this.logger.info('Processing culture analysis data', {
        analysisId: data.analysisId,
        analysisType: data.analysisType,
        tenantId: data.tenantId
      });

      const updatedRequisitions: string[] = [];
      const errors: string[] = [];

      // Validate culture analysis data
      const validation = this.validateCultureAnalysisData(data);
      if (!validation.isValid) {
        errors.push(...validation.errors);
        return {
          success: false,
          updatedRequisitions: [],
          cultureCriteria: null,
          errors
        };
      }

      // Update hiring criteria based on culture analysis
      const cultureCriteria = await this.updateHiringCriteria(data);
      
      // Update existing requisitions with culture criteria
      if (data.department || data.role) {
        const requisitionUpdates = await this.updateRequisitionsWithCultureCriteria(data);
        updatedRequisitions.push(...requisitionUpdates);
      }

      this.logger.info('Culture analysis processing completed', {
        analysisId: data.analysisId,
        updatedRequisitions: updatedRequisitions.length,
        errors: errors.length
      });

      return {
        success: errors.length === 0,
        updatedRequisitions,
        cultureCriteria,
        errors
      };

    } catch (error) {
      this.logger.error('Error processing culture analysis:', error);
      return {
        success: false,
        updatedRequisitions: [],
        cultureCriteria: null,
        errors: [(error as Error).message]
      };
    }
  }

  /**
   * Assess candidate culture fit using Mizan 7 Cylinders
   */
  public async assessCandidateCultureFit(
    candidateId: string,
    cultureAnalysisId: string,
    candidateData: any
  ): Promise<CultureFitAssessment> {
    try {
      this.logger.info('Assessing candidate culture fit', {
        candidateId,
        cultureAnalysisId
      });

      // Get culture analysis data
      const cultureData = await this.getCultureAnalysisData(cultureAnalysisId);
      if (!cultureData) {
        throw new Error('Culture analysis data not found');
      }

      // Perform culture fit assessment
      const assessment = await this.performCultureFitAssessment(
        candidateData,
        cultureData
      );

      // Store assessment in database
      await this.storeCultureFitAssessment(candidateId, cultureAnalysisId, assessment);

      this.logger.info('Candidate culture fit assessment completed', {
        candidateId,
        overallFit: assessment.overallCultureFit,
        recommendation: assessment.recommendations.hireRecommendation
      });

      return assessment;

    } catch (error) {
      this.logger.error('Error assessing candidate culture fit:', error);
      throw error;
    }
  }

  /**
   * Update hiring criteria based on culture analysis
   */
  private async updateHiringCriteria(data: CultureAnalysisData): Promise<any> {
    const cultureCriteria = {
      focusCylinders: data.recommendations.focusCylinders,
      requiredEnablingValues: this.getRequiredEnablingValues(data.enablingValues),
      cultureFitWeight: data.recommendations.cultureFitWeight,
      interviewQuestions: data.recommendations.interviewQuestions,
      assessmentMethods: data.recommendations.assessmentMethods,
      minimumCultureScore: this.calculateMinimumCultureScore(data.cylinderScores),
      cultureProfile: data.cultureProfile
    };

    this.logger.info('Updated hiring criteria based on culture analysis', {
      analysisId: data.analysisId,
      focusCylinders: cultureCriteria.focusCylinders,
      cultureFitWeight: cultureCriteria.cultureFitWeight
    });

    return cultureCriteria;
  }

  /**
   * Update requisitions with culture criteria
   */
  private async updateRequisitionsWithCultureCriteria(data: CultureAnalysisData): Promise<string[]> {
    try {
      // This would typically update requisitions in the database
      // For now, we'll return a mock implementation
      const updatedRequisitions: string[] = [];

      this.logger.info('Updated requisitions with culture criteria', {
        analysisId: data.analysisId,
        department: data.department,
        role: data.role
      });

      return updatedRequisitions;

    } catch (error) {
      this.logger.error('Error updating requisitions with culture criteria:', error);
      return [];
    }
  }

  /**
   * Perform culture fit assessment using Mizan 7 Cylinders
   */
  private async performCultureFitAssessment(
    candidateData: any,
    cultureData: CultureAnalysisData
  ): Promise<CultureFitAssessment> {
    // Assess candidate alignment with each cylinder
    const cylinderAlignment = {
      cylinder1_safety_survival: this.assessCylinderAlignment(1, candidateData, cultureData),
      cylinder2_belonging_loyalty: this.assessCylinderAlignment(2, candidateData, cultureData),
      cylinder3_growth_achievement: this.assessCylinderAlignment(3, candidateData, cultureData),
      cylinder4_meaning_contribution: this.assessCylinderAlignment(4, candidateData, cultureData),
      cylinder5_integrity_justice: this.assessCylinderAlignment(5, candidateData, cultureData),
      cylinder6_wisdom_compassion: this.assessCylinderAlignment(6, candidateData, cultureData),
      cylinder7_transcendence_unity: this.assessCylinderAlignment(7, candidateData, cultureData)
    };

    // Identify enabling and limiting values demonstrated
    const enablingValuesDemonstrated = this.identifyEnablingValues(candidateData);
    const limitingValuesPresent = this.identifyLimitingValues(candidateData);

    const overallCultureFit = this.calculateOverallCultureFit(cylinderAlignment, cultureData.cylinderScores);

    const alignmentAnalysis = this.analyzeCylinderAlignment(cylinderAlignment, cultureData.cylinderScores);
    const recommendations = this.generateRecommendations(overallCultureFit, alignmentAnalysis);

    return {
      candidateId: candidateData.id,
      tenantId: cultureData.tenantId,
      cultureAnalysisId: cultureData.analysisId,
      overallCultureFit,
      cylinderAlignment,
      enablingValuesDemonstrated,
      limitingValuesPresent,
      alignmentAnalysis,
      recommendations,
      assessmentDate: new Date(),
      assessedBy: 'culture_integration',
      metadata: {
        cultureAnalysisType: cultureData.analysisType,
        assessmentMethod: 'mizan_7_cylinders',
        candidateData: candidateData
      }
    };
  }

  /**
   * Assess candidate alignment with a specific cylinder
   */
  private assessCylinderAlignment(
    cylinderNumber: number,
    candidateData: any,
    cultureData: CultureAnalysisData
  ): number {
    // This would typically use AI to analyze resume, experience, interview data
    // For now, we'll simulate based on candidate data
    const cylinderKey = `cylinder${cylinderNumber}_${this.getCylinderName(cylinderNumber)}` as keyof typeof cultureData.cylinderScores;
    const targetScore = cultureData.cylinderScores[cylinderKey];

    // Simulate assessment - in production this would use AI analysis
    const baseScore = Math.random() * 100;
    const variance = Math.random() * 20 - 10; // -10 to +10 variance
    const score = Math.max(0, Math.min(100, baseScore + variance));

    return Math.round(score);
  }

  /**
   * Get cylinder name for key construction
   */
  private getCylinderName(cylinderNumber: number): string {
    const names: Record<number, string> = {
      1: 'safety_survival',
      2: 'belonging_loyalty',
      3: 'growth_achievement',
      4: 'meaning_contribution',
      5: 'integrity_justice',
      6: 'wisdom_compassion',
      7: 'transcendence_unity'
    };
    return names[cylinderNumber] || '';
  }

  /**
   * Identify enabling values demonstrated by candidate
   */
  private identifyEnablingValues(candidateData: any): string[] {
    // This would use AI to analyze resume, cover letter, interview responses
    // For now, return sample values
    return ['Safety', 'Stability', 'Belonging', 'Integrity', 'Fairness'];
  }

  /**
   * Identify limiting values present in candidate
   */
  private identifyLimitingValues(candidateData: any): string[] {
    // This would use AI to identify red flags
    // For now, return empty or sample
    return [];
  }

  /**
   * Calculate overall culture fit score from cylinder alignment
   */
  private calculateOverallCultureFit(
    cylinderAlignment: any,
    targetScores: any
  ): number {
    // Weight cylinders - lower cylinders are more foundational
    const weights: Record<string, number> = {
      cylinder1_safety_survival: 0.20,
      cylinder2_belonging_loyalty: 0.18,
      cylinder3_growth_achievement: 0.16,
      cylinder4_meaning_contribution: 0.14,
      cylinder5_integrity_justice: 0.16,
      cylinder6_wisdom_compassion: 0.10,
      cylinder7_transcendence_unity: 0.06
    };

    let weightedSum = 0;
    let totalWeight = 0;

    for (const [cylinder, score] of Object.entries(cylinderAlignment)) {
      const weight = weights[cylinder as keyof typeof weights] || 0;
      weightedSum += (score as number) * weight;
      totalWeight += weight;
    }

    return Math.round(weightedSum / totalWeight);
  }

  /**
   * Analyze cylinder alignment between candidate and culture
   */
  private analyzeCylinderAlignment(cylinderAlignment: any, targetScores: any): any {
    const strongCylinders: number[] = [];
    const weakCylinders: number[] = [];
    const developmentAreas: string[] = [];
    const culturalRisks: string[] = [];

    for (let i = 1; i <= 7; i++) {
      const cylinderKey = `cylinder${i}_${this.getCylinderName(i)}` as keyof typeof cylinderAlignment;
      const candidateScore = cylinderAlignment[cylinderKey];
      const targetScore = targetScores[cylinderKey];
      const difference = Math.abs(candidateScore - targetScore);

      if (difference <= 15) {
        strongCylinders.push(i);
      } else if (difference >= 30) {
        weakCylinders.push(i);
        developmentAreas.push(`Cylinder ${i}: ${this.getCylinderFullName(i)}`);

        if (i <= 2) { // Cylinders 1-2 are foundational
          culturalRisks.push(`Foundational cylinder gap in ${this.getCylinderFullName(i)}`);
        }
      }
    }

    return {
      strongCylinders,
      weakCylinders,
      developmentAreas,
      culturalRisks
    };
  }

  /**
   * Get full cylinder name
   */
  private getCylinderFullName(cylinderNumber: number): string {
    const names: Record<number, string> = {
      1: 'Safety & Survival',
      2: 'Belonging & Loyalty',
      3: 'Growth & Achievement',
      4: 'Meaning & Contribution',
      5: 'Integrity & Justice',
      6: 'Wisdom & Compassion',
      7: 'Transcendence & Unity'
    };
    return names[cylinderNumber] || '';
  }

  /**
   * Generate hiring recommendations based on culture fit
   */
  private generateRecommendations(
    overallFit: number,
    alignmentAnalysis: any
  ): any {
    let hireRecommendation: 'strong_yes' | 'yes' | 'maybe' | 'no' | 'strong_no';
    let confidence: number;
    let reasoning: string;
    const interviewFocus: string[] = [];
    const onboardingNeeds: string[] = [];

    if (overallFit >= 85 && alignmentAnalysis.riskFactors.length === 0) {
      hireRecommendation = 'strong_yes';
      confidence = 95;
      reasoning = 'Excellent culture fit with strong alignment across all values';
    } else if (overallFit >= 75 && alignmentAnalysis.riskFactors.length <= 1) {
      hireRecommendation = 'yes';
      confidence = 85;
      reasoning = 'Good culture fit with minor development areas';
      interviewFocus.push(...alignmentAnalysis.potentialGaps);
    } else if (overallFit >= 65 && alignmentAnalysis.riskFactors.length <= 2) {
      hireRecommendation = 'maybe';
      confidence = 70;
      reasoning = 'Moderate culture fit with some development needs';
      interviewFocus.push(...alignmentAnalysis.developmentAreas);
      onboardingNeeds.push(...alignmentAnalysis.developmentAreas);
    } else if (overallFit >= 50) {
      hireRecommendation = 'no';
      confidence = 60;
      reasoning = 'Below average culture fit with significant gaps';
      interviewFocus.push(...alignmentAnalysis.riskFactors);
    } else {
      hireRecommendation = 'strong_no';
      confidence = 80;
      reasoning = 'Poor culture fit with major misalignment';
    }

    return {
      hireRecommendation,
      confidence,
      reasoning,
      interviewFocus,
      onboardingNeeds
    };
  }

  /**
   * Get required enabling values based on analysis
   */
  private getRequiredEnablingValues(enablingValues: Record<string, number>): string[] {
    const required: string[] = [];
    const threshold = 70; // Minimum score for required values

    for (const [value, score] of Object.entries(enablingValues)) {
      if (score >= threshold) {
        required.push(value);
      }
    }

    return required;
  }

  /**
   * Calculate minimum culture score for hiring based on cylinders
   */
  private calculateMinimumCultureScore(cylinderScores: any): number {
    const scores = Object.values(cylinderScores) as number[];
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return Math.round(average * 0.7); // 70% of average as minimum
  }

  /**
   * Store culture fit assessment in database
   */
  private async storeCultureFitAssessment(
    candidateId: string,
    cultureAnalysisId: string,
    assessment: CultureFitAssessment
  ): Promise<void> {
    try {
      await db.insert(candidateAssessments).values({
        tenantId: assessment.tenantId,
        candidateId: assessment.candidateId,
        requisitionId: assessment.candidateId,
        assessmentType: 'culture_fit',
        assessmentName: 'Mizan 7 Cylinders Culture Fit Assessment',
        assessedBy: assessment.assessedBy,
        assessorRole: 'ai_agent',
        scores: assessment.cylinderAlignment,
        overallScore: assessment.overallCultureFit.toFixed(2),
        strengths: assessment.enablingValuesDemonstrated,
        weaknesses: assessment.limitingValuesPresent,
        cultureFitAnalysis: {
          overallFit: assessment.overallCultureFit,
          cylinderAlignment: assessment.cylinderAlignment,
          enablingValuesDemonstrated: assessment.enablingValuesDemonstrated,
          limitingValuesPresent: assessment.limitingValuesPresent,
          alignmentAnalysis: assessment.alignmentAnalysis,
          recommendations: assessment.recommendations
        },
        recommendations: assessment.recommendations.reasoning,
        assessmentDate: assessment.assessmentDate,
        metadata: assessment.metadata
      });

      this.logger.info('Stored culture fit assessment', {
        candidateId,
        overallFit: assessment.overallCultureFit,
        strongCylinders: assessment.alignmentAnalysis.strongCylinders,
        weakCylinders: assessment.alignmentAnalysis.weakCylinders
      });

    } catch (error) {
      this.logger.error('Error storing culture fit assessment:', error);
      throw error;
    }
  }

  /**
   * Get culture analysis data by ID
   */
  private async getCultureAnalysisData(analysisId: string): Promise<CultureAnalysisData | null> {
    // This would typically query the culture analysis database
    // For now, we'll return mock data based on 7 Cylinders
    return {
      tenantId: 'test-tenant',
      analysisId,
      analysisType: 'culture_assessment',
      cylinderScores: {
        cylinder1_safety_survival: 85,
        cylinder2_belonging_loyalty: 88,
        cylinder3_growth_achievement: 82,
        cylinder4_meaning_contribution: 78,
        cylinder5_integrity_justice: 92,
        cylinder6_wisdom_compassion: 75,
        cylinder7_transcendence_unity: 70
      },
      enablingValues: {
        'Safety': 85,
        'Stability': 80,
        'Belonging': 88,
        'Respect': 90,
        'Integrity': 95,
        'Fairness': 90,
        'Discipline': 82,
        'Accountability': 85
      },
      limitingValues: {
        'Fear': 15,
        'Instability': 20,
        'Dishonesty': 5,
        'Favoritism': 10
      },
      cultureProfile: {
        dominantCylinders: [5, 2, 1], // Integrity & Justice, Belonging & Loyalty, Safety & Survival
        culturalMaturity: 5, // Reached Cylinder 5
        cultureStrength: 85,
        entropyScore: 0.12 // Low entropy (few limiting values)
      },
      recommendations: {
        hiringCriteria: ['High integrity', 'Strong sense of belonging', 'Values fairness and transparency'],
        interviewQuestions: [
          'Describe a time when you had to maintain integrity in a difficult situation',
          'How do you foster belonging in a team?',
          'Tell me about a time you faced an unfair situation and how you handled it'
        ],
        assessmentMethods: ['7 Cylinders Assessment', 'Behavioral interviews', 'Values alignment check'],
        cultureFitWeight: 0.35,
        focusCylinders: [1, 2, 5] // Focus on foundational cylinders
      },
      metadata: {
        assessmentMethod: 'mizan_7_cylinders',
        assessmentDate: new Date()
      }
    };
  }

  /**
   * Validate culture analysis data
   */
  public validateCultureAnalysisData(data: CultureAnalysisData): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.tenantId) errors.push('Tenant ID is required');
    if (!data.analysisId) errors.push('Analysis ID is required');
    if (!data.cylinderScores) errors.push('Cylinder scores are required');
    if (!data.cultureProfile) errors.push('Culture profile is required');
    if (!data.recommendations) errors.push('Recommendations are required');

    // Validate cylinder scores
    if (data.cylinderScores) {
      const requiredCylinders = [
        'cylinder1_safety_survival',
        'cylinder2_belonging_loyalty',
        'cylinder3_growth_achievement',
        'cylinder4_meaning_contribution',
        'cylinder5_integrity_justice',
        'cylinder6_wisdom_compassion',
        'cylinder7_transcendence_unity'
      ];

      for (const cylinder of requiredCylinders) {
        if (typeof data.cylinderScores[cylinder as keyof typeof data.cylinderScores] !== 'number') {
          errors.push(`Cylinder score ${cylinder} must be a number`);
        } else {
          const score = data.cylinderScores[cylinder as keyof typeof data.cylinderScores];
          if (score < 0 || score > 100) {
            errors.push(`Cylinder score ${cylinder} must be between 0 and 100`);
          }
        }
      }
    }

    // Validate culture profile
    if (data.cultureProfile) {
      if (!Array.isArray(data.cultureProfile.dominantCylinders)) {
        errors.push('Culture profile dominantCylinders must be an array');
      }
      if (typeof data.cultureProfile.culturalMaturity !== 'number' ||
          data.cultureProfile.culturalMaturity < 1 ||
          data.cultureProfile.culturalMaturity > 7) {
        errors.push('Cultural maturity must be a number between 1 and 7');
      }
      if (typeof data.cultureProfile.entropyScore !== 'number' ||
          data.cultureProfile.entropyScore < 0 ||
          data.cultureProfile.entropyScore > 1) {
        errors.push('Entropy score must be a number between 0 and 1');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get culture fit assessments for a candidate
   */
  public async getCandidateCultureAssessments(candidateId: string): Promise<CultureFitAssessment[]> {
    try {
      const assessments = await db
        .select()
        .from(candidateAssessments)
        .where(
          and(
            eq(candidateAssessments.candidateId, candidateId),
            eq(candidateAssessments.assessmentType, 'culture_fit')
          )
        );

      return assessments.map(assessment => {
        const metadata = (assessment.metadata || {}) as Record<string, unknown>;
        const cultureFitAnalysis = (assessment.cultureFitAnalysis || {}) as Record<string, unknown>;
        const overallScore = typeof assessment.overallScore === 'string'
          ? parseFloat(assessment.overallScore)
          : (assessment.overallScore as number);

        const cylinderScores = assessment.scores as Record<string, number>;
        return {
          candidateId: assessment.candidateId,
          tenantId: assessment.tenantId,
          cultureAnalysisId: (metadata.cultureAnalysisId as string) || '',
          overallCultureFit: overallScore,
          cylinderAlignment: {
            cylinder1_safety_survival: cylinderScores.cylinder1_safety_survival || 0,
            cylinder2_belonging_loyalty: cylinderScores.cylinder2_belonging_loyalty || 0,
            cylinder3_growth_achievement: cylinderScores.cylinder3_growth_achievement || 0,
            cylinder4_meaning_contribution: cylinderScores.cylinder4_meaning_contribution || 0,
            cylinder5_integrity_justice: cylinderScores.cylinder5_integrity_justice || 0,
            cylinder6_wisdom_compassion: cylinderScores.cylinder6_wisdom_compassion || 0,
            cylinder7_transcendence_unity: cylinderScores.cylinder7_transcendence_unity || 0
          },
          enablingValuesDemonstrated: (cultureFitAnalysis.enablingValuesDemonstrated as string[]) || [],
          limitingValuesPresent: (cultureFitAnalysis.limitingValuesPresent as string[]) || [],
          alignmentAnalysis: cultureFitAnalysis.alignmentAnalysis as CultureFitAssessment['alignmentAnalysis'] || {
            strongCylinders: [],
            weakCylinders: [],
            developmentAreas: [],
            culturalRisks: []
          },
          recommendations: {
            hireRecommendation: this.mapScoreToRecommendation(overallScore),
            confidence: 80,
            reasoning: (assessment.recommendations as string) || '',
            interviewFocus: [],
            onboardingNeeds: []
          },
          assessmentDate: assessment.assessmentDate || new Date(),
          assessedBy: assessment.assessedBy,
          metadata: assessment.metadata
        };
      });

    } catch (error) {
      this.logger.error('Error getting candidate culture assessments:', error);
      return [];
    }
  }

  /**
   * Map score to recommendation
   */
  private mapScoreToRecommendation(score: number): 'strong_yes' | 'yes' | 'maybe' | 'no' | 'strong_no' {
    if (score >= 85) return 'strong_yes';
    if (score >= 75) return 'yes';
    if (score >= 65) return 'maybe';
    if (score >= 50) return 'no';
    return 'strong_no';
  }
}

// Export singleton instance
export const cultureIntegration = new CultureIntegration();
