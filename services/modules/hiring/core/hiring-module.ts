import { db } from "../../../db/client.js";
import { 
  hiringRequisitions, 
  jobPostings, 
  candidates, 
  interviews,
  cultureFitAssessments,
  hiringStages 
} from "../../../db/schema.js";
import { EnsembleAI } from "../../ai-providers/ensemble.js";
import { generateJobPosting } from "./job-posting-generator.js";
import { InterviewBot } from "./interview-bot.js";
import { CultureFitAssessor } from "./culture-fit-assessor.js";
import { publishToLinkedIn, publishToJobBoards } from "./job-publishers.js";

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
    this.cultureAssessor = new CultureFitAssessor(config);
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
      department: hiringNeed.department,
      role: hiringNeed.role,
      priority: hiringNeed.priority,
      justification: hiringNeed.justification,
      status: "pending_approval",
      requiredSkills: [], // Will be enriched
      cultureFitCriteria: this.config.values || [],
      targetStartDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      createdAt: new Date(),
      createdBy: "system"
    }).returning();

    return requisition[0].id;
  }

  async approveRequisition(requisitionId: string, approverId: string): Promise<void> {
    // Update requisition status
    await db.update(hiringRequisitions)
      .set({ 
        status: "approved",
        approvedBy: approverId,
        approvedAt: new Date()
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

  async generateAndPublishJobPosting(requisition: any): Promise<void> {
    // Generate job posting content
    const jobPosting = await generateJobPosting({
      role: requisition.role,
      department: requisition.department,
      company: {
        vision: this.config.vision,
        mission: this.config.mission,
        values: this.config.values
      },
      requirements: requisition.requiredSkills,
      culture: this.config.culture
    });

    // Save job posting
    const savedPosting = await db.insert(jobPostings).values({
      requisitionId: requisition.id,
      tenantId: this.tenantId,
      title: jobPosting.title,
      description: jobPosting.description,
      requirements: jobPosting.requirements,
      benefits: jobPosting.benefits,
      linkedInOptimized: jobPosting.linkedInVersion,
      status: "draft",
      createdAt: new Date()
    }).returning();

    // Auto-publish for Enterprise clients
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, this.tenantId)
    });

    if (tenant?.plan === "enterprise") {
      await this.publishJobPosting(savedPosting[0].id);
    }
  }

  async publishJobPosting(jobPostingId: string): Promise<void> {
    const posting = await db.query.jobPostings.findFirst({
      where: eq(jobPostings.id, jobPostingId)
    });

    if (!posting) return;

    // Publish to various platforms
    const publishResults = await Promise.allSettled([
      publishToLinkedIn(posting),
      publishToJobBoards(posting),
      this.publishToCompanyWebsite(posting)
    ]);

    // Update posting status
    await db.update(jobPostings)
      .set({ 
        status: "published",
        publishedAt: new Date(),
        publishedPlatforms: ["linkedin", "indeed", "company_website"]
      })
      .where(eq(jobPostings.id, jobPostingId));
  }

  async processCandidate(candidateData: {
    jobPostingId: string;
    name: string;
    email: string;
    resume: string;
    linkedIn?: string;
  }): Promise<string> {
    // Create candidate record
    const candidate = await db.insert(candidates).values({
      jobPostingId: candidateData.jobPostingId,
      tenantId: this.tenantId,
      name: candidateData.name,
      email: candidateData.email,
      resume: candidateData.resume,
      linkedIn: candidateData.linkedIn,
      status: "new",
      stage: "screening",
      createdAt: new Date()
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
        screeningScore: screening.score,
        screeningNotes: screening.notes,
        status: screening.score > 0.7 ? "shortlisted" : "rejected",
        stage: screening.score > 0.7 ? "culture_fit" : "screening"
      })
      .where(eq(candidates.id, candidateId));

    // If shortlisted, trigger culture fit assessment
    if (screening.score > 0.7) {
      await this.triggerCultureFitAssessment(candidateId);
    }
  }

  async triggerCultureFitAssessment(candidateId: string): Promise<void> {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, this.tenantId)
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

    // Create interview record
    const interview = await db.insert(interviews).values({
      candidateId,
      tenantId: this.tenantId,
      type: interviewType,
      status: "scheduled",
      interviewers: [requisition.hiringManagerId],
      scheduledAt: new Date(), // Bot will handle actual scheduling
      createdAt: new Date()
    }).returning();

    // For Enterprise, bot handles scheduling
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, this.tenantId)
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
          with: { jobPosting: true }
        }
      }
    });

    if (!interview) {
      return { technical: [], cultural: [], behavioral: [] };
    }

    // Generate technical questions based on role
    const technicalQuestions = await this.generateTechnicalQuestions(
      interview.candidate.jobPosting.requirements
    );

    // Generate cultural fit questions
    const culturalQuestions = await this.cultureAssessor.generateInterviewQuestions(
      this.config.values || [],
      this.config.culture
    );

    // Generate behavioral questions
    const behavioralQuestions = await this.generateBehavioralQuestions(
      interview.candidate.jobPosting.title
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
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, this.tenantId)
    });

    if (tenant?.plan === "enterprise") {
      const enhancedFeedback = await this.interviewBot.enhanceFeedback(feedback);
      await db.update(interviews)
        .set({ enhancedFeedback })
        .where(eq(interviews.id, interviewId));
    }
  }

  async makeHiringDecision(candidateId: string): Promise<void> {
    // Aggregate all interview feedback
    const candidateInterviews = await db.query.interviews.findMany({
      where: eq(interviews.candidateId, candidateId)
    });

    const cultureFit = await db.query.cultureFitAssessments.findFirst({
      where: eq(cultureFitAssessments.candidateId, candidateId)
    });

    // AI-assisted decision making
    const decision = await this.makeAIAssistedDecision(candidateInterviews, cultureFit);

    // Update candidate status
    await db.update(candidates)
      .set({
        status: decision.hire ? "offer_extended" : "rejected",
        stage: decision.hire ? "offer" : "rejected",
        decisionNotes: decision.rationale
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
        stage: "onboarding",
        hiredAt: new Date()
      })
      .where(eq(candidates.id, candidateId));

    // Trigger onboarding module
    await this.triggerOnboarding(candidateId);
  }

  async triggerOnboarding(candidateId: string): Promise<void> {
    const candidate = await db.query.candidates.findFirst({
      where: eq(candidates.id, candidateId),
      with: { jobPosting: true }
    });

    if (!candidate) return;

    // Create employee record
    const employee = await db.insert(employees).values({
      tenantId: this.tenantId,
      name: candidate.name,
      email: candidate.email,
      department: candidate.jobPosting.department,
      title: candidate.jobPosting.title,
      startDate: new Date(),
      onboardingStatus: "pending",
      createdAt: new Date()
    }).returning();

    // Trigger onboarding module
    await this.startOnboarding(employee[0].id);
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
    return response.narrative.split("\n").filter(q => q.trim().length > 0).slice(0, 5);
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
