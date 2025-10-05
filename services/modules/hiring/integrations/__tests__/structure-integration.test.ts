/**
 * Structure Integration Tests
 * Tests the integration between Hiring Module and Structure Analysis Module
 */

import { structureIntegration, StructureAnalysisData } from '../structure-integration.js';
import { db } from '../../../../../db/index.js';
import { hiringRequisitions } from '../../../../../db/schema/hiring.js';

// Mock the database
jest.mock('../../../../../db/index.js', () => ({
  db: {
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 'test-requisition-id' }])
      })
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 'test-requisition-id' }])
        })
      })
    }),
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([])
      })
    })
  }
}));

describe('Structure Integration', () => {
  let mockStructureData: StructureAnalysisData;

  beforeEach(() => {
    mockStructureData = {
      tenantId: 'test-tenant-id',
      analysisId: 'test-analysis-id',
      analysisType: 'organizational_restructure',
      department: 'Engineering',
      position: 'Senior Software Engineer',
      level: 'senior',
      action: 'create',
      urgency: 'high',
      timeline: {
        startDate: new Date('2024-01-01'),
        targetDate: new Date('2024-02-01'),
        priority: 1
      },
      requirements: {
        skills: ['JavaScript', 'Node.js', 'TypeScript'],
        experience: '5+ years',
        education: 'Bachelor\'s degree',
        competencies: ['Leadership', 'Problem Solving']
      },
      budget: {
        salaryRange: { min: 80000, max: 120000 },
        totalBudget: 120000,
        approvalRequired: false
      },
      impact: {
        affectedEmployees: 0,
        newPositions: 1,
        eliminatedPositions: 0,
        departmentChanges: []
      },
      rationale: 'Need for senior engineering leadership',
      metadata: {}
    };
  });

  describe('validateStructureAnalysisData', () => {
    test('should validate correct structure analysis data', () => {
      const validation = structureIntegration.validateStructureAnalysisData(mockStructureData);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should reject data with missing required fields', () => {
      const invalidData = { ...mockStructureData };
      delete invalidData.tenantId;
      delete invalidData.department;
      delete invalidData.position;

      const validation = structureIntegration.validateStructureAnalysisData(invalidData);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Tenant ID is required');
      expect(validation.errors).toContain('Department is required');
      expect(validation.errors).toContain('Position is required');
    });

    test('should reject data with empty required arrays', () => {
      const invalidData = { ...mockStructureData };
      invalidData.requirements.skills = [];

      const validation = structureIntegration.validateStructureAnalysisData(invalidData);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Required skills are needed');
    });
  });

  describe('processStructureAnalysis', () => {
    test('should process position creation successfully', async () => {
      const result = await structureIntegration.processStructureAnalysis(mockStructureData);
      
      expect(result.success).toBe(true);
      expect(result.hiringNeeds).toHaveLength(1);
      expect(result.requisitionsCreated).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      
      const hiringNeed = result.hiringNeeds[0];
      expect(hiringNeed.positionTitle).toBe('Senior Software Engineer');
      expect(hiringNeed.department).toBe('Engineering');
      expect(hiringNeed.level).toBe('senior');
      expect(hiringNeed.urgency).toBe('high');
    });

    test('should handle position modification', async () => {
      const modificationData = {
        ...mockStructureData,
        action: 'modify' as const,
        impact: {
          ...mockStructureData.impact,
          newPositions: 2
        }
      };

      const result = await structureIntegration.processStructureAnalysis(modificationData);
      
      expect(result.success).toBe(true);
      expect(result.hiringNeeds).toHaveLength(1);
      expect(result.hiringNeeds[0].numberOfPositions).toBe(2);
    });

    test('should handle position consolidation', async () => {
      const consolidationData = {
        ...mockStructureData,
        action: 'consolidate' as const
      };

      const result = await structureIntegration.processStructureAnalysis(consolidationData);
      
      expect(result.success).toBe(true);
      expect(result.hiringNeeds).toHaveLength(1);
      expect(result.hiringNeeds[0].numberOfPositions).toBe(1);
    });

    test('should handle position elimination', async () => {
      const eliminationData = {
        ...mockStructureData,
        action: 'eliminate' as const
      };

      const result = await structureIntegration.processStructureAnalysis(eliminationData);
      
      expect(result.success).toBe(true);
      expect(result.hiringNeeds).toHaveLength(0);
      expect(result.requisitionsCreated).toHaveLength(0);
    });

    test('should handle invalid data gracefully', async () => {
      const invalidData = { ...mockStructureData };
      delete invalidData.tenantId;

      const result = await structureIntegration.processStructureAnalysis(invalidData);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('updateHiringNeedFromStructureAnalysis', () => {
    test('should update hiring needs based on structure analysis changes', async () => {
      const updates: Partial<StructureAnalysisData> = {
        department: 'Product Engineering',
        urgency: 'critical',
        requirements: {
          skills: ['React', 'Python', 'AWS'],
          experience: '7+ years',
          education: 'Master\'s degree',
          competencies: ['Architecture', 'Team Leadership']
        }
      };

      const result = await structureIntegration.updateHiringNeedFromStructureAnalysis(
        'test-analysis-id',
        updates
      );
      
      expect(result.success).toBe(true);
      expect(result.updatedRequisitions).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    test('should handle update errors gracefully', async () => {
      // Mock database error
      (db.update as jest.Mock).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await structureIntegration.updateHiringNeedFromStructureAnalysis(
        'test-analysis-id',
        { department: 'New Department' }
      );
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getHiringNeedsByStructureAnalysis', () => {
    test('should retrieve hiring needs by structure analysis ID', async () => {
      const result = await structureIntegration.getHiringNeedsByStructureAnalysis('test-analysis-id');
      
      expect(Array.isArray(result)).toBe(true);
    });

    test('should handle database errors gracefully', async () => {
      // Mock database error
      (db.select as jest.Mock).mockImplementation(() => {
        throw new Error('Database query failed');
      });

      const result = await structureIntegration.getHiringNeedsByStructureAnalysis('test-analysis-id');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });

  describe('Integration with Hiring Module', () => {
    test('should create proper hiring need structure', async () => {
      const result = await structureIntegration.processStructureAnalysis(mockStructureData);
      
      const hiringNeed = result.hiringNeeds[0];
      
      expect(hiringNeed).toHaveProperty('tenantId');
      expect(hiringNeed).toHaveProperty('structureAnalysisId');
      expect(hiringNeed).toHaveProperty('positionTitle');
      expect(hiringNeed).toHaveProperty('department');
      expect(hiringNeed).toHaveProperty('level');
      expect(hiringNeed).toHaveProperty('type');
      expect(hiringNeed).toHaveProperty('urgency');
      expect(hiringNeed).toHaveProperty('numberOfPositions');
      expect(hiringNeed).toHaveProperty('targetStartDate');
      expect(hiringNeed).toHaveProperty('requiredSkills');
      expect(hiringNeed).toHaveProperty('experienceRequired');
      expect(hiringNeed).toHaveProperty('educationRequired');
      expect(hiringNeed).toHaveProperty('salaryRange');
      expect(hiringNeed).toHaveProperty('rationale');
      expect(hiringNeed).toHaveProperty('approvedBy');
      expect(hiringNeed).toHaveProperty('metadata');
    });

    test('should maintain data integrity across operations', async () => {
      // Process initial structure analysis
      const initialResult = await structureIntegration.processStructureAnalysis(mockStructureData);
      expect(initialResult.success).toBe(true);
      
      // Update the analysis
      const updateResult = await structureIntegration.updateHiringNeedFromStructureAnalysis(
        mockStructureData.analysisId,
        { urgency: 'critical' }
      );
      expect(updateResult.success).toBe(true);
      
      // Retrieve the updated needs
      const retrievedNeeds = await structureIntegration.getHiringNeedsByStructureAnalysis(
        mockStructureData.analysisId
      );
      expect(Array.isArray(retrievedNeeds)).toBe(true);
    });
  });
});
