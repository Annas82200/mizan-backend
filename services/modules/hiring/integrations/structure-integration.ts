/**
 * Structure Analysis Integration
 * Handles integration between Hiring Module and Structure Analysis Module
 * Receives hiring needs and organizational structure data
 */

import { logger } from '../../../../utils/logger.js';
import { db } from '../../../../db/index.js';
import { hiringRequisitions } from '../../../../db/schema/hiring.js';
import { eq, and, sql } from 'drizzle-orm';

export interface StructureAnalysisData {
  tenantId: string;
  analysisId: string;
  analysisType: 'organizational_restructure' | 'expansion' | 'reduction' | 'optimization';
  department: string;
  position: string;
  level: 'entry' | 'mid' | 'senior' | 'executive' | 'leadership';
  action: 'create' | 'modify' | 'eliminate' | 'consolidate';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  timeline: {
    startDate: Date;
    targetDate: Date;
    priority: number;
  };
  requirements: {
    skills: string[];
    experience: string;
    education: string;
    competencies: string[];
  };
  budget: {
    salaryRange: { min: number; max: number };
    totalBudget: number;
    approvalRequired: boolean;
  };
  impact: {
    affectedEmployees: number;
    newPositions: number;
    eliminatedPositions: number;
    departmentChanges: string[];
  };
  rationale: string;
  metadata: any;
}

export interface HiringNeed {
  tenantId: string;
  structureAnalysisId: string;
  department: string;
  positionTitle: string;
  location?: string;
  level: 'entry' | 'mid' | 'senior' | 'executive' | 'leadership';
  type: 'full_time' | 'part_time' | 'contract' | 'temporary' | 'intern';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  numberOfPositions: number;
  targetStartDate: Date | null;
  requiredSkills: string[];
  preferredSkills: string[];
  experienceRequired: string;
  educationRequired: string;
  salaryRange: { min: number; max: number };
  rationale: string;
  approvedBy: string;
  metadata: any;
}

export class StructureIntegration {
  private logger = logger;

  constructor() {
    this.logger.info('Structure Integration initialized');
  }

  /**
   * Process structure analysis data and create hiring needs
   */
  public async processStructureAnalysis(data: StructureAnalysisData): Promise<{
    success: boolean;
    hiringNeeds: HiringNeed[];
    requisitionsCreated: string[];
    errors: string[];
  }> {
    try {
      this.logger.info('Processing structure analysis data', {
        analysisId: data.analysisId,
        analysisType: data.analysisType,
        department: data.department,
        action: data.action
      });

      const hiringNeeds: HiringNeed[] = [];
      const requisitionsCreated: string[] = [];
      const errors: string[] = [];

      // Process based on analysis type and action
      switch (data.action) {
        case 'create':
          await this.handlePositionCreation(data, hiringNeeds, requisitionsCreated, errors);
          break;
        case 'modify':
          await this.handlePositionModification(data, hiringNeeds, requisitionsCreated, errors);
          break;
        case 'consolidate':
          await this.handlePositionConsolidation(data, hiringNeeds, requisitionsCreated, errors);
          break;
        case 'eliminate':
          await this.handlePositionElimination(data, errors);
          break;
        default:
          errors.push(`Unknown action type: ${data.action}`);
      }

      this.logger.info('Structure analysis processing completed', {
        analysisId: data.analysisId,
        hiringNeedsCreated: hiringNeeds.length,
        requisitionsCreated: requisitionsCreated.length,
        errors: errors.length
      });

      return {
        success: errors.length === 0,
        hiringNeeds,
        requisitionsCreated,
        errors
      };

    } catch (error) {
      this.logger.error('Error processing structure analysis:', error);
      return {
        success: false,
        hiringNeeds: [],
        requisitionsCreated: [],
        errors: [(error as Error).message]
      };
    }
  }

  /**
   * Handle creation of new positions
   */
  private async handlePositionCreation(
    data: StructureAnalysisData,
    hiringNeeds: HiringNeed[],
    requisitionsCreated: string[],
    errors: string[]
  ): Promise<void> {
    try {
      const hiringNeed: HiringNeed = {
        tenantId: data.tenantId,
        structureAnalysisId: data.analysisId,
        department: data.department,
        positionTitle: data.position,
        level: data.level,
        type: 'full_time', // Default to full-time, can be modified later
        urgency: data.urgency,
        numberOfPositions: data.impact.newPositions || 1,
        targetStartDate: data.timeline.targetDate,
        requiredSkills: data.requirements.skills,
        preferredSkills: [],
        experienceRequired: data.requirements.experience,
        educationRequired: data.requirements.education,
        salaryRange: data.budget.salaryRange,
        rationale: data.rationale,
        approvedBy: 'structure_analysis', // System approval
        metadata: {
          structureAnalysisId: data.analysisId,
          analysisType: data.analysisType,
          originalData: data
        }
      };

      hiringNeeds.push(hiringNeed);

      // Create requisition if budget is approved or approval not required
      if (!data.budget.approvalRequired || data.budget.totalBudget > 0) {
        const requisitionId = await this.createRequisitionFromHiringNeed(hiringNeed);
        if (requisitionId) {
          requisitionsCreated.push(requisitionId);
        }
      }

    } catch (error) {
      errors.push(`Error handling position creation: ${(error as Error).message}`);
    }
  }

  /**
   * Handle modification of existing positions
   */
  private async handlePositionModification(
    data: StructureAnalysisData,
    hiringNeeds: HiringNeed[],
    requisitionsCreated: string[],
    errors: string[]
  ): Promise<void> {
    try {
      // Check if we need to hire for modified positions
      if (data.impact.newPositions > 0) {
        const hiringNeed: HiringNeed = {
          tenantId: data.tenantId,
          structureAnalysisId: data.analysisId,
          department: data.department,
          positionTitle: data.position,
          level: data.level,
          type: 'full_time',
          urgency: data.urgency,
          numberOfPositions: data.impact.newPositions,
          targetStartDate: data.timeline.targetDate,
          requiredSkills: data.requirements.skills,
          preferredSkills: [],
          experienceRequired: data.requirements.experience,
          educationRequired: data.requirements.education,
          salaryRange: data.budget.salaryRange,
          rationale: `Position modification: ${data.rationale}`,
          approvedBy: 'structure_analysis',
          metadata: {
            structureAnalysisId: data.analysisId,
            analysisType: data.analysisType,
            modificationType: 'position_update',
            originalData: data
          }
        };

        hiringNeeds.push(hiringNeed);

        const requisitionId = await this.createRequisitionFromHiringNeed(hiringNeed);
        if (requisitionId) {
          requisitionsCreated.push(requisitionId);
        }
      }

    } catch (error) {
      errors.push(`Error handling position modification: ${(error as Error).message}`);
    }
  }

  /**
   * Handle consolidation of positions
   */
  private async handlePositionConsolidation(
    data: StructureAnalysisData,
    hiringNeeds: HiringNeed[],
    requisitionsCreated: string[],
    errors: string[]
  ): Promise<void> {
    try {
      // Create new consolidated position
      const hiringNeed: HiringNeed = {
        tenantId: data.tenantId,
        structureAnalysisId: data.analysisId,
        department: data.department,
        positionTitle: data.position,
        level: data.level,
        type: 'full_time',
        urgency: data.urgency,
        numberOfPositions: 1, // Usually one consolidated position
        targetStartDate: data.timeline.targetDate,
        requiredSkills: data.requirements.skills,
        preferredSkills: [],
        experienceRequired: data.requirements.experience,
        educationRequired: data.requirements.education,
        salaryRange: data.budget.salaryRange,
        rationale: `Position consolidation: ${data.rationale}`,
        approvedBy: 'structure_analysis',
        metadata: {
          structureAnalysisId: data.analysisId,
          analysisType: data.analysisType,
          consolidationType: 'position_merge',
          originalData: data
        }
      };

      hiringNeeds.push(hiringNeed);

      const requisitionId = await this.createRequisitionFromHiringNeed(hiringNeed);
      if (requisitionId) {
        requisitionsCreated.push(requisitionId);
      }

    } catch (error) {
      errors.push(`Error handling position consolidation: ${(error as Error).message}`);
    }
  }

  /**
   * Handle elimination of positions
   */
  private async handlePositionElimination(
    data: StructureAnalysisData,
    errors: string[]
  ): Promise<void> {
    try {
      // Cancel any pending requisitions for eliminated positions
      const cancelledRequisitions = await db
        .update(hiringRequisitions)
        .set({
          status: 'cancelled',
          updatedAt: new Date(),
          metadata: {
            ...hiringRequisitions.metadata,
            cancellationReason: 'position_eliminated',
            structureAnalysisId: data.analysisId,
            cancelledAt: new Date()
          }
        })
        .where(
          and(
            eq(hiringRequisitions.tenantId, data.tenantId),
            eq(hiringRequisitions.department, data.department),
            eq(hiringRequisitions.positionTitle, data.position),
            eq(hiringRequisitions.status, 'draft')
          )
        )
        .returning({ id: hiringRequisitions.id });

      this.logger.info('Cancelled requisitions due to position elimination', {
        analysisId: data.analysisId,
        cancelledCount: cancelledRequisitions.length
      });

    } catch (error) {
      errors.push(`Error handling position elimination: ${(error as Error).message}`);
    }
  }

  /**
   * Create a requisition from hiring need data
   */
  private async createRequisitionFromHiringNeed(hiringNeed: HiringNeed): Promise<string | null> {
    try {
      const [requisition] = await db
        .insert(hiringRequisitions)
        .values({
          tenantId: hiringNeed.tenantId,
          positionTitle: hiringNeed.positionTitle,
          department: hiringNeed.department,
          location: hiringNeed.location || 'To be determined',
          level: hiringNeed.level as any,
          type: hiringNeed.type as any,
          urgency: hiringNeed.urgency as any,
          description: `Position created from structure analysis: ${hiringNeed.rationale}`,
          responsibilities: [
            'Responsibilities will be defined based on role requirements',
            'Position created through organizational structure analysis'
          ],
          requiredSkills: hiringNeed.requiredSkills,
          preferredSkills: hiringNeed.preferredSkills,
          cultureValues: [], // Will be populated by Recruitment Strategist
          experienceRequired: hiringNeed.experienceRequired,
          educationRequired: hiringNeed.educationRequired,
          compensationRange: hiringNeed.salaryRange,
          benefits: [], // Will be populated by Recruitment Strategist
          status: 'draft',
          requestedBy: hiringNeed.approvedBy,
          approvedBy: hiringNeed.approvedBy,
          hiringManagerId: hiringNeed.approvedBy, // Will be updated when manager is assigned
          numberOfPositions: hiringNeed.numberOfPositions,
          targetStartDate: hiringNeed.targetStartDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          metadata: hiringNeed.metadata
        })
        .returning({ id: hiringRequisitions.id });

      this.logger.info('Created requisition from structure analysis', {
        requisitionId: requisition.id,
        positionTitle: hiringNeed.positionTitle,
        department: hiringNeed.department
      });

      return requisition.id;

    } catch (error) {
      this.logger.error('Error creating requisition from hiring need:', error);
      return null;
    }
  }

  /**
   * Get hiring needs by structure analysis ID
   */
  public async getHiringNeedsByStructureAnalysis(analysisId: string): Promise<HiringNeed[]> {
    try {
      // Query using JSONB operators
      const requisitions = await db
        .select()
        .from(hiringRequisitions)
        .where(sql`${hiringRequisitions.metadata}->>'structureAnalysisId' = ${analysisId}`);

      return requisitions.map(req => ({
        tenantId: req.tenantId,
        structureAnalysisId: analysisId,
        department: req.department,
        positionTitle: req.positionTitle,
        level: req.level,
        type: req.type,
        urgency: req.urgency,
        numberOfPositions: req.numberOfPositions,
        targetStartDate: req.targetStartDate,
        requiredSkills: Array.isArray(req.requiredSkills) ? req.requiredSkills : [],
        preferredSkills: Array.isArray(req.preferredSkills) ? req.preferredSkills : [],
        experienceRequired: req.experienceRequired || '',
        educationRequired: req.educationRequired || '',
        salaryRange: (req.compensationRange as { min: number; max: number }) || { min: 0, max: 0 },
        rationale: req.description,
        approvedBy: req.approvedBy || '',
        metadata: req.metadata
      }));

    } catch (error) {
      this.logger.error('Error getting hiring needs by structure analysis:', error);
      return [];
    }
  }

  /**
   * Update hiring need based on structure analysis changes
   */
  public async updateHiringNeedFromStructureAnalysis(
    analysisId: string,
    updates: Partial<StructureAnalysisData>
  ): Promise<{ success: boolean; updatedRequisitions: string[]; errors: string[] }> {
    try {
      const updatedRequisitions: string[] = [];
      const errors: string[] = [];

      // Find requisitions related to this structure analysis using JSONB operators
      const requisitions = await db
        .select()
        .from(hiringRequisitions)
        .where(sql`${hiringRequisitions.metadata}->>'structureAnalysisId' = ${analysisId}`);

      for (const requisition of requisitions) {
        try {
          const updateData: any = {};

          // Update fields based on structure analysis changes
          if (updates.department) updateData.department = updates.department;
          if (updates.position) updateData.positionTitle = updates.position;
          if (updates.level) updateData.level = updates.level as any;
          if (updates.urgency) updateData.urgency = updates.urgency as any;
          if (updates.requirements?.skills) updateData.requiredSkills = updates.requirements.skills;
          if (updates.requirements?.experience) updateData.experienceRequired = updates.requirements.experience;
          if (updates.requirements?.education) updateData.educationRequired = updates.requirements.education;
          if (updates.budget?.salaryRange) updateData.compensationRange = updates.budget.salaryRange;
          if (updates.timeline?.targetDate) updateData.targetStartDate = updates.timeline.targetDate;

          updateData.updatedAt = new Date();
          const existingMetadata = (requisition.metadata && typeof requisition.metadata === 'object')
            ? requisition.metadata as Record<string, unknown>
            : {};
          updateData.metadata = {
            ...existingMetadata,
            lastStructureUpdate: new Date(),
            structureAnalysisUpdates: updates
          };

          await db
            .update(hiringRequisitions)
            .set(updateData)
            .where(eq(hiringRequisitions.id, requisition.id));

          updatedRequisitions.push(requisition.id);

        } catch (error) {
          errors.push(`Error updating requisition ${requisition.id}: ${(error as Error).message}`);
        }
      }

      this.logger.info('Updated hiring needs from structure analysis', {
        analysisId,
        updatedCount: updatedRequisitions.length,
        errors: errors.length
      });

      return {
        success: errors.length === 0,
        updatedRequisitions,
        errors
      };

    } catch (error) {
      this.logger.error('Error updating hiring needs from structure analysis:', error);
      return {
        success: false,
        updatedRequisitions: [],
        errors: [(error as Error).message]
      };
    }
  }

  /**
   * Validate structure analysis data
   */
  public validateStructureAnalysisData(data: StructureAnalysisData): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.tenantId) errors.push('Tenant ID is required');
    if (!data.analysisId) errors.push('Analysis ID is required');
    if (!data.department) errors.push('Department is required');
    if (!data.position) errors.push('Position is required');
    if (!data.level) errors.push('Level is required');
    if (!data.action) errors.push('Action is required');
    if (!data.urgency) errors.push('Urgency is required');
    if (!data.timeline?.targetDate) errors.push('Target date is required');
    if (!data.requirements?.skills?.length) errors.push('Required skills are needed');
    if (!data.budget?.salaryRange) errors.push('Salary range is required');

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const structureIntegration = new StructureIntegration();
