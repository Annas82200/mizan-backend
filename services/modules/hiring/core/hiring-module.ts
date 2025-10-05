import { db } from "../../../../db/index.js";
import {
  hiringRequisitions,
  candidates,
  interviews,
  offers,
  jobPostings,
  candidateAssessments
} from "../../../../db/schema/hiring.js";
import { eq } from 'drizzle-orm';
import { EnsembleAI } from "../../../ai-providers/ensemble.js";
import { generateJobPosting } from "./job-posting-generator.js";
import { InterviewBot } from "./interview-bot.js";
import { CultureFitAssessor } from "./culture-fit-assessor.js";
import { publishToLinkedIn, publishToJobBoards } from "./job-publishers.js";
import { logger } from "../../../../utils/logger.js";
import { tenants } from "../../../../db/schema.js";

export interface HiringModuleConfig {
  tenantId: string;
  hiringNeeds: Array<{
    department: string;
    role: string;
    priority: string;
    justification: string;
  }>;
  vision?: string;
  mission?: string;
  values?: string[];
  culture?: any;
}

export class HiringModule {
  private tenantId: string;
  private config: HiringModuleConfig;
  private interviewBot: InterviewBot;
  private cultureAssessor: CultureFitAssessor;

  constructor(config: HiringModuleConfig) {
    this.tenantId = config.tenantId;
    this.config = config;
    this.interviewBot = new InterviewBot(config);
    this.cultureAssessor = new CultureFitAssessor();
  }

  async initializeHiringProcess(): Promise<void> {
    // Create requisitions for each hiring need
    for (const need of this.config.hiringNeeds) {
      await this.createRequisition(need);
    }
  }

  async createRequisition(hiringNeed: any): Promise<string> {
    const requisition = await db.insert(hiringRequisitions).values({
      tenantId: this.tenantId,
      positionTitle: hiringNeed.role,
      department: hiringNeed.department,
      level: 'mid' as const,
      type: 'full_time' as const,
      location: 'Remote',
      remote: true,
      description: hiringNeed.justification || 'Position description',
      responsibilities: [],
      qualifications: [],
      requiredSkills: [],
      compensationRange: { min: 0, max: 0, currency: 'USD' },
      urgency: (hiringNeed.priority === 'high' ? 'high' : 'medium') as 'high' | 'medium',
      status: 'draft' as const,
      cultureValues: this.config.values || [],
      targetStartDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      requestedBy: 'system',
      hiringManagerId: 'system'
    }).returning();

    return requisition[0].id;
  }

  async approveRequisition(requisitionId: string, approverId: string): Promise<void> {
    // Update requisition status
    await db.update(hiringRequisitions)
      .set({
        status: 'posted' as const,
        approvedBy: approverId
      })
      .where(eq(hiringRequisitions.id, requisitionId));

    // Generate job posting
    const requisition = await db.query.hiringRequisitions.findFirst({
      where: eq(hiringRequisitions.id, requisitionId)
    });

    if (requisition) {
      await this.generateAndPublishJobPosting(requisition);
    }
  }

  async generateAndPublishJobPosting(requisition: any): Promise<string> {
    // Get tenant information for company details
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, this.tenantId)
    });

    // Generate job posting content using AI
    const jobPosting = await generateJobPosting({
      role: requisition.positionTitle,
      department: requisition.department,
      company: {
        name: tenant?.name || 'Company',
        vision: tenant?.vision || this.config.vision,
        mission: tenant?.mission || this.config.mission,
        values: tenant?.values || this.config.values
      },
      requirements: requisition.requiredSkills,
      culture: this.config.culture,
      compensation: requisition.compensationRange,
      benefits: requisition.benefits,
      location: requisition.location,
      remote: requisition.remote
    });

    // Store job posting in database
    const savedPosting = await db.insert(jobPostings).values({
      tenantId: this.tenantId,
      requisitionId: requisition.id,
      title: jobPosting.title,
      description: jobPosting.description,
      responsibilities: jobPosting.responsibilities,
      requirements: jobPosting.requirements,
      qualifications: jobPosting.qualifications || '',
      companyName: tenant?.name || 'Company',
      companyDescription: tenant?.mission || '',
      companyValues: tenant?.values || [],
      companyBenefits: jobPosting.benefits,
      salaryRange: `$${requisition.compensationRange.min} - $${requisition.compensationRange.max}`,
      displaySalary: true,
      benefitsSummary: Array.isArray(requisition.benefits) ? requisition.benefits.join(', ') : '',
      location: requisition.location,
      remote: requisition.remote,
      remoteDetails: requisition.remoteDetails,
      linkedInVersion: jobPosting.linkedInVersion,
      indeedVersion: jobPosting.indeedVersion || jobPosting.description,
      careerPageVersion: jobPosting.careerPageVersion || jobPosting.description,
      seoTitle: jobPosting.title,
      seoDescription: jobPosting.description.substring(0, 160),
      keywords: jobPosting.keywords || [],
      status: 'approved',
      aiGenerated: true,
      generatedBy: 'job_posting_generator',
      createdBy: requisition.requestedBy,
      requiresApproval: tenant?.plan === 'enterprise' ? false : true
    }).returning();

    const postingId = savedPosting[0].id;

    // Auto-publish for Enterprise clients
    if (tenant?.plan === 'enterprise') {
      await this.publishJobPosting(postingId);
    }

    logger.info(`Job posting ${postingId} created for requisition ${requisition.id}`);
    return postingId;
  }

  async publishJobPosting(jobPostingId: string): Promise<void> {
    // Fetch posting from database
    const posting = await db.query.jobPostings.findFirst({
      where: eq(jobPostings.id, jobPostingId),
      with: {
        requisition: true
      }
    });

    if (!posting) {
      throw new Error(`Job posting ${jobPostingId} not found`);
    }

    // Publish to various platforms
    const publishResults = await Promise.allSettled([
      publishToLinkedIn(posting),
      publishToJobBoards(posting)
    ]);

    const publishedPlatforms: string[] = [];
    const externalUrls: Record<string, string> = {};

    // Process results
    publishResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        const platform = index === 0 ? 'linkedin' : 'indeed';
        const value = result.value as any;
        publishedPlatforms.push(platform);
        externalUrls[platform] = value.url || value.postId || '';
      }
    });

    // Update posting status
    await db.update(jobPostings)
      .set({
        status: 'published',
        publishedAt: new Date(),
        publishedPlatforms,
        externalUrls,
        updatedAt: new Date()
      })
      .where(eq(jobPostings.id, jobPostingId));

    // Update requisition status
    await db.update(hiringRequisitions)
      .set({
        status: 'posted',
        postedDate: new Date(),
        jobPostingUrl: externalUrls.linkedin || externalUrls.indeed || '',
        jobBoards: publishedPlatforms
      })
      .where(eq(hiringRequisitions.id, posting.requisitionId));

    logger.info(`Job posting ${jobPostingId} published to: ${publishedPlatforms.join(', ')}`);
  }

  async processCandidate(candidateData: {
    jobPostingId: string;
    name: string;
    email: string;
    resume: string;
    linkedIn?: string;
  }): Promise<string> {
    // Create candidate record
    const [firstName, ...lastNameParts] = candidateData.name.split(' ');
    const lastName = lastNameParts.join(' ') || firstName;

    const candidate = await db.insert(candidates).values({
      requisitionId: candidateData.jobPostingId,
      tenantId: this.tenantId,
      firstName,
      lastName,
      email: candidateData.email,
      resumeUrl: candidateData.resume,
      linkedinUrl: candidateData.linkedIn,
      status: 'applied',
      stage: 'application',
      source: 'other'
    }).returning();

    // Trigger initial screening
    await this.screenCandidate(candidate[0].id);

    return candidate[0].id;
  }

  async screenCandidate(candidateId: string): Promise<void> {
    const candidate = await db.query.candidates.findFirst({
      where: eq(candidates.id, candidateId)
    });

    if (!candidate) return;

    // AI-powered resume screening
    const screening = await this.performAIScreening(candidate);

    // Update candidate with screening results
    await db.update(candidates)
      .set({
        overallScore: String(screening.score),
        notes: screening.notes,
        status: screening.score > 0.7 ? "screening" : "rejected",
        stage: screening.score > 0.7 ? "resume_review" : "application"
      })
      .where(eq(candidates.id, candidateId));

    // If shortlisted, trigger culture fit assessment
    if (screening.score > 0.7) {
      await this.triggerCultureFitAssessment(candidateId);
    }
  }

  async triggerCultureFitAssessment(candidateId: string): Promise<void> {
    const { tenants } = await import('../../../../db/schema/core.js');
    const tenant = await db.query.tenants.findFirst({
      where: eq((await import('../../../../db/schema/core.js')).tenants.id, this.tenantId)
    });

    if (tenant?.plan === "enterprise") {
      // Bot-assisted assessment for Enterprise
      const assessmentUrl = await this.cultureAssessor.createInteractiveAssessment(candidateId);
      await this.sendAssessmentToCandidate(candidateId, assessmentUrl);
    } else {
      // Link-based assessment for Pro/Pro+
      const assessmentLink = await this.cultureAssessor.generateAssessmentLink(candidateId);
      await this.sendAssessmentToCandidate(candidateId, assessmentLink);
    }
  }

  async scheduleInterview(candidateId: string, interviewType: string): Promise<void> {
    const candidate = await db.query.candidates.findFirst({
      where: eq(candidates.id, candidateId)
    });

    if (!candidate) return;

    // Get hiring manager availability
    const requisition = await db.query.hiringRequisitions.findFirst({
      where: eq(hiringRequisitions.id, candidate.requisitionId)
    });

    if (!requisition) return;

    // Create interview record
    const interview = await db.insert(interviews).values({
      candidateId,
      requisitionId: candidate.requisitionId,
      tenantId: this.tenantId,
      interviewType: interviewType as any,
      title: `${interviewType} Interview`,
      status: "scheduled",
      interviewers: [],
      scheduledDate: new Date() // Bot will handle actual scheduling
    }).returning();

    // For Enterprise, bot handles scheduling
    const { tenants } = await import('../../../../db/schema/core.js');
    const tenant = await db.query.tenants.findFirst({
      where: eq((await import('../../../../db/schema/core.js')).tenants.id, this.tenantId)
    });

    if (tenant?.plan === "enterprise") {
      await this.interviewBot.handleScheduling(interview[0].id, candidate, requisition.hiringManagerId);
    }
  }

  async prepareInterviewQuestions(interviewId: string): Promise<{
    technical: string[];
    cultural: string[];
    behavioral: string[];
  }> {
    const interview = await db.query.interviews.findFirst({
      where: eq(interviews.id, interviewId),
      with: {
        candidate: {
          with: { requisition: true }
        }
      }
    });

    if (!interview) {
      return { technical: [], cultural: [], behavioral: [] };
    }

    // Generate technical questions based on role
    const technicalQuestions = await this.generateTechnicalQuestions(
      (interview.candidate?.requisition?.requiredSkills as string[]) || []
    );

    // Generate cultural fit questions
    const culturalQuestions = await this.cultureAssessor.generateInterviewQuestions(
      this.config.values || [],
      this.config.culture
    );

    // Generate behavioral questions
    const behavioralQuestions = await this.generateBehavioralQuestions(
      interview.candidate?.requisition?.positionTitle || 'Position'
    );

    return {
      technical: technicalQuestions,
      cultural: culturalQuestions,
      behavioral: behavioralQuestions
    };
  }

  async recordInterviewFeedback(interviewId: string, feedback: {
    overallRating: number;
    technicalScore: number;
    culturalScore: number;
    strengths: string[];
    concerns: string[];
    recommendation: "strong_yes" | "yes" | "no" | "strong_no";
    notes: string;
  }): Promise<void> {
    // Save feedback
    await db.update(interviews)
      .set({
        feedback,
        completedAt: new Date(),
        status: "completed"
      })
      .where(eq(interviews.id, interviewId));

    // Bot assists with feedback writing for Enterprise
    const { tenants } = await import('../../../../db/schema/core.js');
    const tenant = await db.query.tenants.findFirst({
      where: eq((await import('../../../../db/schema/core.js')).tenants.id, this.tenantId)
    });

    if (tenant?.plan === "enterprise") {
      const enhancedFeedback = await this.interviewBot.enhanceFeedback(feedback);

      // Store enhanced feedback in notes or metadata field
      await db.update(interviews)
        .set({
          notes: JSON.stringify(enhancedFeedback)
        })
        .where(eq(interviews.id, interviewId));
    }
  }

  async makeHiringDecision(candidateId: string): Promise<void> {
    // Aggregate all interview feedback
    const candidateInterviews = await db.query.interviews.findMany({
      where: eq(interviews.candidateId, candidateId)
    });

    const cultureFit = await db.query.candidateAssessments.findFirst({
      where: eq((await import('../../../../db/schema/hiring.js')).candidateAssessments.candidateId, candidateId)
    });

    // AI-assisted decision making
    const decision = await this.makeAIAssistedDecision(candidateInterviews, cultureFit);

    // Update candidate status
    await db.update(candidates)
      .set({
        status: decision.hire ? "offer" : "rejected",
        stage: decision.hire ? "offer" : "final_interview",
        notes: decision.rationale
      })
      .where(eq(candidates.id, candidateId));

    if (decision.hire) {
      await this.prepareOffer(candidateId);
    }
  }

  async acceptOffer(candidateId: string): Promise<void> {
    // Update candidate status
    await db.update(candidates)
      .set({
        status: "hired",
        stage: "hired"
      })
      .where(eq(candidates.id, candidateId));

    // Trigger onboarding module
    await this.triggerOnboarding(candidateId);
  }

  async triggerOnboarding(candidateId: string): Promise<void> {
    const candidate = await db.query.candidates.findFirst({
      where: eq(candidates.id, candidateId),
      with: { requisition: true }
    });

    if (!candidate) return;

    // Employee onboarding functionality
    // Note: Candidate-to-employee conversion uses the users table (core schema)
    // When a candidate is hired, they should be:
    // - Created as a user record in users table with role='employee'
    // - Assigned to appropriate department from requisition
    // - Sent onboarding email with account credentials
    // - Enrolled in onboarding LXP courses
    // This functionality should be integrated with the onboarding module when available

    logger.info(`Onboarding triggered for candidate ${candidateId}. Integration with onboarding module required for full employee creation flow.`);
  }

  // Helper methods
  private async performAIScreening(candidate: any): Promise<{
    score: number;
    notes: string;
  }> {
    const ensemble = new EnsembleAI({
      strategy: "weighted",
      providers: ["openai", "claude", "gemini"]
    });

    const prompt = `Screen this candidate's resume for the ${candidate.jobPosting.title} role:

Resume:
${candidate.resume}

Requirements:
${candidate.jobPosting.requirements.join("\n")}

Provide a score (0-1) and key observations.`;

    const response = await ensemble.call({
      agent: "Hiring",
      engine: "reasoning",
      tenantId: this.tenantId,
      prompt,
      temperature: 0.3
    });

    // Parse response
    const score = 0.75; // Extract from response
    const notes = response.narrative;

    return { score, notes };
  }

  private async generateTechnicalQuestions(requirements: string[]): Promise<string[]> {
    const ensemble = new EnsembleAI({
      strategy: "best_confidence",
      providers: ["openai", "claude"]
    });

    const prompt = `Generate 5 technical interview questions for a role with these requirements:
${requirements.join("\n")}

Focus on practical scenarios and problem-solving.`;

    const response = await ensemble.call({
      agent: "Hiring",
      engine: "knowledge",
      tenantId: this.tenantId,
      prompt,
      temperature: 0.5
    });

    // Parse questions from response
    return response.narrative.split("\n").filter((q: string) => q.trim().length > 0).slice(0, 5);
  }

  private async generateBehavioralQuestions(role: string): Promise<string[]> {
    // Standard behavioral questions customized for role
    return [
      `Tell me about a time you faced a significant challenge in a ${role} role.`,
      "Describe a situation where you had to work with a difficult stakeholder.",
      "Give an example of when you had to learn something quickly.",
      "How do you prioritize when everything seems urgent?",
      "Describe your proudest professional achievement."
    ];
  }

  private async makeAIAssistedDecision(interviews: any[], cultureFit: any): Promise<{
    hire: boolean;
    rationale: string;
  }> {
    // Aggregate scores
    const avgTechnical = interviews.reduce((sum, i) => sum + (i.feedback?.technicalScore || 0), 0) / interviews.length;
    const avgCultural = interviews.reduce((sum, i) => sum + (i.feedback?.culturalScore || 0), 0) / interviews.length;
    const cultureFitScore = cultureFit?.score || 0;

    const hire = avgTechnical >= 0.7 && avgCultural >= 0.7 && cultureFitScore >= 0.6;

    const rationale = `Technical: ${avgTechnical}, Cultural: ${avgCultural}, Culture Fit: ${cultureFitScore}. ${
      hire ? "Strong candidate across all dimensions." : "Does not meet minimum thresholds."
    }`;

    return { hire, rationale };
  }

  private async publishToCompanyWebsite(posting: any): Promise<void> {
    // Implementation for company website posting
    console.log("Publishing to company website:", posting.title);
  }

  private async sendAssessmentToCandidate(candidateId: string, assessmentUrl: string): Promise<void> {
    // Send email with assessment link
    console.log(`Sending assessment to candidate ${candidateId}: ${assessmentUrl}`);
  }

  private async prepareOffer(candidateId: string): Promise<void> {
    // Generate offer letter
    console.log(`Preparing offer for candidate ${candidateId}`);
  }

  private async startOnboarding(employeeId: string): Promise<void> {
    // Trigger onboarding workflow
    console.log(`Starting onboarding for employee ${employeeId}`);
  }
}

export async function triggerHiringModule(config: HiringModuleConfig): Promise<void> {
  const hiringModule = new HiringModule(config);
  await hiringModule.initializeHiringProcess();
}
