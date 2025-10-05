/**
 * Culture Integration Tests
 * Tests the integration between Hiring Module and Culture Analysis Module
 */

import { cultureIntegration, CultureAnalysisData, CultureFitAssessment } from '../culture-integration.js';
import { db } from '../../../../../db/index.js';
import { candidates, candidateAssessments } from '../../../../../db/schema/hiring.js';

// Mock the database
jest.mock('../../../../../db/index.js', () => ({
  db: {
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 'test-assessment-id' }])
      })
    }),
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([])
      })
    })
  }
}));

describe('Culture Integration', () => {
  let mockCultureData: CultureAnalysisData;
  let mockCandidateData: any;

  beforeEach(() => {
    mockCultureData = {
      tenantId: 'test-tenant-id',
      analysisId: 'test-culture-analysis-id',
      analysisType: 'culture_assessment',
      department: 'Engineering',
      role: 'Senior Software Engineer',
      level: 'senior',
      cultureValues: {
        innovation: 85,
        collaboration: 90,
        integrity: 95,
        excellence: 88,
        customerFocus: 82,
        diversity: 75,
        sustainability: 80
      },
      cultureProfile: {
        dominantValues: ['integrity', 'collaboration', 'excellence'],
        cultureType: 'collaborative_excellence',
        cultureStrength: 88,
        alignmentScore: 85
      },
      recommendations: {
        hiringCriteria: ['High integrity', 'Collaborative mindset', 'Excellence focus'],
        interviewQuestions: [
          'Describe a time when you had to maintain integrity in a difficult situation',
          'How do you approach collaboration in your work?',
          'What does excellence mean to you?'
        ],
        assessmentMethods: ['Behavioral interviews', 'Culture fit assessment', 'Reference checks'],
        cultureFitWeight: 0.3
      },
      metadata: {}
    };

    mockCandidateData = {
      id: 'test-candidate-id',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      skills: ['JavaScript', 'Node.js', 'TypeScript'],
      experience: [
        {
          company: 'Tech Corp',
          position: 'Software Engineer',
          duration: '3 years',
          description: 'Developed web applications'
        }
      ],
      education: [
        {
          degree: 'Bachelor of Computer Science',
          institution: 'University of Technology',
          year: 2020
        }
      ]
    };
  });

  describe('validateCultureAnalysisData', () => {
    test('should validate correct culture analysis data', () => {
      const validation = cultureIntegration.validateCultureAnalysisData(mockCultureData);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should reject data with missing required fields', () => {
      const invalidData = { ...mockCultureData };
      delete invalidData.tenantId;
      delete invalidData.cultureValues;

      const validation = cultureIntegration.validateCultureAnalysisData(invalidData);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Tenant ID is required');
      expect(validation.errors).toContain('Culture values are required');
    });

    test('should reject data with invalid culture values', () => {
      const invalidData = { ...mockCultureData };
      invalidData.cultureValues.innovation = 150; // Invalid score

      const validation = cultureIntegration.validateCultureAnalysisData(invalidData);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Culture value innovation must be between 0 and 100');
    });

    test('should reject data with missing culture values', () => {
      const invalidData = { ...mockCultureData };
      delete invalidData.cultureValues.integrity;

      const validation = cultureIntegration.validateCultureAnalysisData(invalidData);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Culture value integrity must be a number');
    });
  });

  describe('processCultureAnalysis', () => {
    test('should process culture analysis successfully', async () => {
      const result = await cultureIntegration.processCultureAnalysis(mockCultureData);
      
      expect(result.success).toBe(true);
      expect(result.cultureCriteria).toBeDefined();
      expect(result.errors).toHaveLength(0);
      
      // Check culture criteria structure
      expect(result.cultureCriteria).toHaveProperty('requiredCultureValues');
      expect(result.cultureCriteria).toHaveProperty('cultureFitWeight');
      expect(result.cultureCriteria).toHaveProperty('interviewQuestions');
      expect(result.cultureCriteria).toHaveProperty('assessmentMethods');
      expect(result.cultureCriteria).toHaveProperty('minimumCultureScore');
      expect(result.cultureCriteria).toHaveProperty('cultureProfile');
    });

    test('should handle invalid data gracefully', async () => {
      const invalidData = { ...mockCultureData };
      delete invalidData.tenantId;

      const result = await cultureIntegration.processCultureAnalysis(invalidData);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should generate proper hiring criteria', async () => {
      const result = await cultureIntegration.processCultureAnalysis(mockCultureData);
      
      expect(result.cultureCriteria.requiredCultureValues).toContain('integrity');
      expect(result.cultureCriteria.requiredCultureValues).toContain('collaboration');
      expect(result.cultureCriteria.requiredCultureValues).toContain('excellence');
      expect(result.cultureCriteria.cultureFitWeight).toBe(0.3);
      expect(result.cultureCriteria.interviewQuestions).toHaveLength(3);
    });
  });

  describe('assessCandidateCultureFit', () => {
    test('should assess candidate culture fit successfully', async () => {
      const assessment = await cultureIntegration.assessCandidateCultureFit(
        'test-candidate-id',
        'test-culture-analysis-id',
        mockCandidateData
      );
      
      expect(assessment).toBeDefined();
      expect(assessment.candidateId).toBe('test-candidate-id');
      expect(assessment.tenantId).toBe('test-tenant-id');
      expect(assessment.cultureAnalysisId).toBe('test-culture-analysis-id');
      expect(assessment.overallCultureFit).toBeGreaterThanOrEqual(0);
      expect(assessment.overallCultureFit).toBeLessThanOrEqual(100);
      expect(assessment.individualScores).toHaveProperty('innovation');
      expect(assessment.individualScores).toHaveProperty('collaboration');
      expect(assessment.individualScores).toHaveProperty('integrity');
      expect(assessment.individualScores).toHaveProperty('excellence');
      expect(assessment.individualScores).toHaveProperty('customerFocus');
      expect(assessment.individualScores).toHaveProperty('diversity');
      expect(assessment.individualScores).toHaveProperty('sustainability');
      expect(assessment.alignmentAnalysis).toHaveProperty('strongMatches');
      expect(assessment.alignmentAnalysis).toHaveProperty('potentialGaps');
      expect(assessment.alignmentAnalysis).toHaveProperty('developmentAreas');
      expect(assessment.alignmentAnalysis).toHaveProperty('riskFactors');
      expect(assessment.recommendations).toHaveProperty('hireRecommendation');
      expect(assessment.recommendations).toHaveProperty('confidence');
      expect(assessment.recommendations).toHaveProperty('reasoning');
      expect(assessment.recommendations).toHaveProperty('interviewFocus');
      expect(assessment.recommendations).toHaveProperty('onboardingNeeds');
    });

    test('should handle assessment errors gracefully', async () => {
      // Mock database error
      (db.insert as jest.Mock).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(
        cultureIntegration.assessCandidateCultureFit(
          'test-candidate-id',
          'test-culture-analysis-id',
          mockCandidateData
        )
      ).rejects.toThrow('Database connection failed');
    });

    test('should generate appropriate recommendations based on culture fit', async () => {
      const assessment = await cultureIntegration.assessCandidateCultureFit(
        'test-candidate-id',
        'test-culture-analysis-id',
        mockCandidateData
      );
      
      expect(['strong_yes', 'yes', 'maybe', 'no', 'strong_no']).toContain(
        assessment.recommendations.hireRecommendation
      );
      expect(assessment.recommendations.confidence).toBeGreaterThanOrEqual(0);
      expect(assessment.recommendations.confidence).toBeLessThanOrEqual(100);
      expect(assessment.recommendations.reasoning).toBeTruthy();
    });
  });

  describe('getCandidateCultureAssessments', () => {
    test('should retrieve culture assessments for a candidate', async () => {
      const assessments = await cultureIntegration.getCandidateCultureAssessments('test-candidate-id');
      
      expect(Array.isArray(assessments)).toBe(true);
    });

    test('should handle database errors gracefully', async () => {
      // Mock database error
      (db.select as jest.Mock).mockImplementation(() => {
        throw new Error('Database query failed');
      });

      const assessments = await cultureIntegration.getCandidateCultureAssessments('test-candidate-id');
      
      expect(Array.isArray(assessments)).toBe(true);
      expect(assessments).toHaveLength(0);
    });
  });

  describe('Mizan 7 Cylinders Integration', () => {
    test('should assess all 7 culture cylinders', async () => {
      const assessment = await cultureIntegration.assessCandidateCultureFit(
        'test-candidate-id',
        'test-culture-analysis-id',
        mockCandidateData
      );
      
      const cylinders = assessment.individualScores;
      expect(cylinders.innovation).toBeDefined();
      expect(cylinders.collaboration).toBeDefined();
      expect(cylinders.integrity).toBeDefined();
      expect(cylinders.excellence).toBeDefined();
      expect(cylinders.customerFocus).toBeDefined();
      expect(cylinders.diversity).toBeDefined();
      expect(cylinders.sustainability).toBeDefined();
      
      // All scores should be between 0 and 100
      Object.values(cylinders).forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    test('should calculate overall culture fit correctly', async () => {
      const assessment = await cultureIntegration.assessCandidateCultureFit(
        'test-candidate-id',
        'test-culture-analysis-id',
        mockCandidateData
      );
      
      expect(assessment.overallCultureFit).toBeGreaterThanOrEqual(0);
      expect(assessment.overallCultureFit).toBeLessThanOrEqual(100);
    });

    test('should provide detailed alignment analysis', async () => {
      const assessment = await cultureIntegration.assessCandidateCultureFit(
        'test-candidate-id',
        'test-culture-analysis-id',
        mockCandidateData
      );
      
      const alignment = assessment.alignmentAnalysis;
      expect(Array.isArray(alignment.strongMatches)).toBe(true);
      expect(Array.isArray(alignment.potentialGaps)).toBe(true);
      expect(Array.isArray(alignment.developmentAreas)).toBe(true);
      expect(Array.isArray(alignment.riskFactors)).toBe(true);
    });
  });

  describe('Integration with Hiring Module', () => {
    test('should provide comprehensive assessment data', async () => {
      const assessment = await cultureIntegration.assessCandidateCultureFit(
        'test-candidate-id',
        'test-culture-analysis-id',
        mockCandidateData
      );
      
      // Check that all required fields are present
      expect(assessment).toHaveProperty('candidateId');
      expect(assessment).toHaveProperty('tenantId');
      expect(assessment).toHaveProperty('cultureAnalysisId');
      expect(assessment).toHaveProperty('overallCultureFit');
      expect(assessment).toHaveProperty('individualScores');
      expect(assessment).toHaveProperty('alignmentAnalysis');
      expect(assessment).toHaveProperty('recommendations');
      expect(assessment).toHaveProperty('assessmentDate');
      expect(assessment).toHaveProperty('assessedBy');
      expect(assessment).toHaveProperty('metadata');
    });

    test('should maintain data consistency across operations', async () => {
      // Process culture analysis
      const analysisResult = await cultureIntegration.processCultureAnalysis(mockCultureData);
      expect(analysisResult.success).toBe(true);
      
      // Assess candidate culture fit
      const assessment = await cultureIntegration.assessCandidateCultureFit(
        'test-candidate-id',
        mockCultureData.analysisId,
        mockCandidateData
      );
      expect(assessment.cultureAnalysisId).toBe(mockCultureData.analysisId);
      
      // Retrieve assessments
      const retrievedAssessments = await cultureIntegration.getCandidateCultureAssessments('test-candidate-id');
      expect(Array.isArray(retrievedAssessments)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing culture analysis data', async () => {
      // Mock getCultureAnalysisData to return null
      jest.spyOn(cultureIntegration as any, 'getCultureAnalysisData').mockResolvedValue(null);

      await expect(
        cultureIntegration.assessCandidateCultureFit(
          'test-candidate-id',
          'non-existent-analysis-id',
          mockCandidateData
        )
      ).rejects.toThrow('Culture analysis data not found');
    });

    test('should handle invalid candidate data', async () => {
      const invalidCandidateData = {
        id: 'test-candidate-id'
        // Missing required fields
      };

      const assessment = await cultureIntegration.assessCandidateCultureFit(
        'test-candidate-id',
        'test-culture-analysis-id',
        invalidCandidateData
      );
      
      // Should still complete assessment with default values
      expect(assessment).toBeDefined();
      expect(assessment.candidateId).toBe('test-candidate-id');
    });
  });
});
