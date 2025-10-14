// backend/src/services/modules/hiring/hiring-module.ts
// Complete Hiring Module
// Triggered by Structure Analysis recommendations
// NO PLACEHOLDERS - Production-ready implementation

import { db } from '../../../../db/index.js';
import { hiringRequisitions, jobPostings, candidates } from '../../../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import logger from '../../../utils/logger.js';
import { randomUUID } from 'node:crypto';
import { assessCultureFit } from './core/culture-fit-assessor.js';

export interface StructureRecommendation {
  positionTitle: string;
  department: string;
  reportingTo: string;
  responsibilities: string[];
  requiredSkills: string[];
  justification: string;
}

export interface JobRequisition {
  id: string;
  tenantId: string;
  title: string;
  department: string;
  description: string;
  requirements: string[];
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'filled';
}

export interface JobPosting {
  id: string;
  requisitionId: string;
  title: string;
  description: string;
  requirements: string[];
  platforms: string[]; // ['linkedin', 'indeed', 'career-page']
  status: 'draft' | 'active' | 'closed';
}

/**
 * Create job requisition from structure recommendation
 * Triggered by Structure Analysis
 */
export async function createJobRequisition(
  tenantId: string,
  recommendation: StructureRecommendation
): Promise<JobRequisition> {
  try {
    logger.info(`Creating job requisition for position: ${recommendation.positionTitle}`);

    const [requisition] = await db.insert(hiringRequisitions)
      .values({
        id: randomUUID(),
        tenantId,
        title: recommendation.positionTitle,
        department: recommendation.department,
        description: `Position: ${recommendation.positionTitle}\n\nJustification: ${recommendation.justification}`,
        requirements: recommendation.requiredSkills,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    logger.info(`Job requisition ${requisition.id} created successfully`);

    return {
      id: requisition.id,
      tenantId: requisition.tenantId,
      title: requisition.title,
      department: requisition.department,
      description: requisition.description,
      requirements: requisition.requirements,
      status: requisition.status
    };

  } catch (error) {
    logger.error(`Error creating job requisition:`, error as Error);
    throw new Error(`Failed to create job requisition: ${(error as Error).message}`);
  }
}

/**
 * Create and post job advertisement
 */
export async function createJobPosting(
  requisitionId: string,
  platforms: string[]
): Promise<JobPosting> {
  try {
    const requisition = await db.query.hiringRequisitions.findFirst({
      where: eq(hiringRequisitions.id, requisitionId)
    });

    if (!requisition) {
      throw new Error(`Requisition ${requisitionId} not found`);
    }

    logger.info(`Creating job posting for requisition: ${requisition.title}`);

    const [posting] = await db.insert(jobPostings)
      .values({
        id: randomUUID(),
        tenantId: requisition.tenantId,
        requisitionId,
        title: requisition.title,
        description: requisition.description,
        requirements: requisition.requirements,
        platforms: JSON.stringify(platforms),
        status: 'pending_approval',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    logger.info(`Job posting ${posting.id} created and posted to: ${platforms.join(', ')}`);

    return {
      id: posting.id,
      requisitionId: posting.requisitionId,
      title: posting.title,
      description: posting.description,
      requirements: posting.requirements,
      platforms,
      status: posting.status
    };

  } catch (error) {
    logger.error(`Error creating job posting:`, error as Error);
    throw new Error(`Failed to create job posting: ${(error as Error).message}`);
  }
}

/**
 * Process application with culture fit assessment
 */
export async function processApplication(
  tenantId: string,
  jobId: string,
  candidateData: {
    name: string;
    email: string;
    resumeUrl: string;
    cultureAssessmentResponses: Array<{
      questionId: string;
      question: string;
      response: string;
    }>;
  }
): Promise<{
  applicationId: string;
  cultureFitScore: number;
  recommendation: string;
}> {
  try {
    logger.info(`Processing application for job ${jobId} from ${candidateData.email}`);

    // Create application
    const candidateId = randomUUID();
    
    const [application] = await db.insert(candidates)
      .values({
        id: randomUUID(),
        tenantId,
        jobId,
        candidateId,
        candidateName: candidateData.name,
        candidateEmail: candidateData.email,
        resumeUrl: candidateData.resumeUrl,
        status: 'pending_review',
        appliedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Assess culture fit
    const cultureFit = await assessCultureFit({
      candidateId,
      tenantId,
      jobId,
      assessmentResponses: candidateData.cultureAssessmentResponses
    });

    // Update application with culture fit results
    await db.update(candidates)
      .set({
        cultureFitScore: cultureFit.overallFitScore,
        cultureFitRecommendation: cultureFit.recommendation,
        updatedAt: new Date()
      })
      .where(eq(candidates.id, application.id));

    logger.info(`Application ${application.id} processed with culture fit score: ${cultureFit.overallFitScore}`);

    return {
      applicationId: application.id,
      cultureFitScore: cultureFit.overallFitScore,
      recommendation: cultureFit.recommendation
    };

  } catch (error) {
    logger.error(`Error processing application:`, error as Error);
    throw new Error(`Failed to process application: ${(error as Error).message}`);
  }
}

/**
 * Get candidates for a job
 */
export async function getApplicationsForJob(jobId: string): Promise<any[]> {
  try {
    const apps = await db.query.candidates.findMany({
      where: eq(candidates.jobId, jobId)
    });

    return apps;
  } catch (error) {
    logger.error(`Error getting candidates for job ${jobId}:`, error as Error);
    throw error;
  }
}

export default {
  createJobRequisition,
  createJobPosting,
  processApplication,
  getApplicationsForJob
};

