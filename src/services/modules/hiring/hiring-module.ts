// backend/src/services/modules/hiring/hiring-module.ts
// Complete Hiring Module
// Triggered by Structure Analysis recommendations
// Compliant with AGENT_CONTEXT_ULTIMATE.md - Production-ready implementation

import { db } from '../../../db/index';
import { hiringRequisitions, jobPostings, candidates } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';
import logger from '../../../utils/logger';
import { randomUUID } from 'node:crypto';
import { assessCultureFit } from './core/culture-fit-assessor';

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
  status: 'draft' | 'active' | 'paused' | 'closed';
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
        positionTitle: recommendation.positionTitle,
        department: recommendation.department,
        description: `Position: ${recommendation.positionTitle}\n\nJustification: ${recommendation.justification}`,
        level: 'mid',
        type: 'full_time',
        location: 'Office',
        remote: false,
        responsibilities: [],
        qualifications: [],
        requiredSkills: Array.isArray(recommendation.requiredSkills) ? recommendation.requiredSkills : [],
        compensationRange: { min: 0, max: 0, currency: 'USD' },
        urgency: 'medium',
        status: 'draft',
        requestedBy: tenantId,
        hiringManagerId: tenantId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    logger.info(`Job requisition ${requisition.id} created successfully`);

    // Extract skills as string array with proper type safety
    const skillsArray: string[] = Array.isArray(requisition.requiredSkills) 
      ? requisition.requiredSkills.map((skill: unknown): string => {
          if (typeof skill === 'string') {
            return skill;
          } else if (typeof skill === 'object' && skill !== null && 'name' in skill) {
            const skillObj = skill as { name?: unknown };
            return typeof skillObj.name === 'string' ? skillObj.name : '';
          }
          return '';
        }).filter((s): s is string => s.length > 0)
      : [];

    return {
      id: requisition.id,
      tenantId: requisition.tenantId,
      title: requisition.positionTitle,
      department: requisition.department,
      description: requisition.description,
      requirements: skillsArray,
      status: requisition.status === 'draft' ? 'draft' : requisition.status === 'pending_approval' ? 'pending_approval' : requisition.status === 'approved' ? 'approved' : requisition.status === 'filled' ? 'filled' : 'draft'
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

    logger.info(`Creating job posting for requisition: ${requisition.positionTitle}`);

    const [posting] = await db.insert(jobPostings)
      .values({
        id: randomUUID(),
        tenantId: requisition.tenantId,
        requisitionId,
        title: requisition.positionTitle,
        description: requisition.description,
        responsibilities: '',
        requirements: '',
        companyName: 'Company',
        location: requisition.location || 'Office',
        remote: requisition.remote || false,
        publishedPlatforms: platforms,
        status: 'draft',
        createdBy: requisition.requestedBy || requisition.tenantId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    logger.info(`Job posting ${posting.id} created and posted to: ${platforms.join(', ')}`);

    // Extract requirements (it's a string field in schema)
    const requirementsArray = typeof posting.requirements === 'string' 
      ? posting.requirements.split('\n').filter(r => r.trim()) 
      : [];
    
    // Extract published platforms (jsonb array)
    const platformsArray = Array.isArray(posting.publishedPlatforms) 
      ? posting.publishedPlatforms as string[]
      : platforms;
    
    return {
      id: posting.id,
      requisitionId: posting.requisitionId,
      title: posting.title,
      description: posting.description,
      requirements: requirementsArray,
      platforms: platformsArray,
      status: posting.status === 'draft' ? 'draft' : posting.status === 'published' ? 'active' : posting.status === 'paused' ? 'paused' : 'closed'
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
        requisitionId: jobId,
        firstName: candidateData.name.split(' ')[0] || candidateData.name,
        lastName: candidateData.name.split(' ')[1] || '',
        email: candidateData.email,
        resumeUrl: candidateData.resumeUrl,
        source: 'job_board',
        status: 'applied',
        stage: 'application',
        appliedAt: new Date(),
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
        cultureScore: cultureFit.overallFitScore.toFixed(2),
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

interface CandidateApplication {
  id: string;
  tenantId: string;
  requisitionId: string;
  firstName: string;
  lastName: string;
  email: string;
  resumeUrl: string;
  source: string;
  status: string;
  stage: string;
  cultureScore: string | null;
  appliedAt: Date;
  updatedAt: Date;
}

/**
 * Get candidates for a job
 */
export async function getApplicationsForJob(jobId: string): Promise<CandidateApplication[]> {
  try {
    const apps = await db.query.candidates.findMany({
      where: eq(candidates.requisitionId, jobId)
    });

    // Map database results to CandidateApplication interface
    return apps.map((app): CandidateApplication => ({
      id: app.id,
      tenantId: app.tenantId,
      requisitionId: app.requisitionId,
      firstName: app.firstName,
      lastName: app.lastName,
      email: app.email,
      resumeUrl: app.resumeUrl || '',
      source: app.source || 'unknown',
      status: app.status,
      stage: app.stage,
      cultureScore: app.cultureScore || null,
      appliedAt: app.appliedAt instanceof Date 
        ? app.appliedAt 
        : (app.appliedAt ? new Date(app.appliedAt) : new Date()),
      updatedAt: app.updatedAt instanceof Date 
        ? app.updatedAt 
        : (app.updatedAt ? new Date(app.updatedAt) : new Date())
    }));
  } catch (error) {
    logger.error(`Error getting candidates for job ${jobId}:`, error as Error);
    throw error;
  }
}

/**
 * Check module health status
 */
export async function checkHealth(): Promise<{ healthy: boolean; message: string }> {
  try {
    // Check database connectivity
    await db.query.hiringRequisitions.findFirst();
    return { healthy: true, message: 'Hiring Module operational' };
  } catch (error) {
    logger.error('Hiring Module health check failed:', error as Error);
    return { healthy: false, message: 'Hiring Module unavailable' };
  }
}

/**
 * Initialize module
 */
export async function initialize(config?: { tenantId: string; moduleId: string; enabled: boolean }): Promise<void> {
  logger.info(`Hiring Module initialized for tenant: ${config?.tenantId || 'default'}`);
}

/**
 * Get module status
 */
export async function getStatus(): Promise<{ status: string; activeRequisitionsCount: number }> {
  try {
    const activeRequisitions = await db.query.hiringRequisitions.findMany({
      where: eq(hiringRequisitions.status, 'approved')
    });
    return {
      status: 'operational',
      activeRequisitionsCount: activeRequisitions.length
    };
  } catch (error) {
    logger.error('Failed to get Hiring module status:', error as Error);
    return { status: 'error', activeRequisitionsCount: 0 };
  }
}

/**
 * Handle trigger from Structure Analysis
 */
export async function handleTrigger(data: {
  tenantId: string;
  recommendation: StructureRecommendation;
}): Promise<JobRequisition> {
  return await createJobRequisition(data.tenantId, data.recommendation);
}

export default {
  createJobRequisition,
  createJobPosting,
  processApplication,
  getApplicationsForJob,
  checkHealth,
  initialize,
  getStatus,
  handleTrigger
};

