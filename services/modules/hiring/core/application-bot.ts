/**
 * Application BOT
 * Assists candidates with filling out job applications
 * Extracts information from resumes and guides candidates through the process
 */

import { EnsembleAI } from "../../../ai-providers/ensemble.js";
import { db } from "../../../../db/index.js";
import { candidates, jobPostings } from "../../../../db/schema/hiring.js";
import { eq } from 'drizzle-orm';
import { logger } from "../../../../utils/logger.js";

export interface ApplicationSession {
  sessionId: string;
  jobPostingId: string;
  candidateData: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    linkedinUrl: string;
    resumeUrl: string;
    currentCompany: string;
    currentTitle: string;
    yearsOfExperience: number;
    education: any[];
    skills: any[];
    expectedSalary: number;
    availableStartDate: Date;
    willingToRelocate: boolean;
  }>;
  conversationHistory: Array<{
    role: 'bot' | 'candidate';
    message: string;
    timestamp: Date;
  }>;
  extractedFromResume: boolean;
  completionPercentage: number;
}

export class ApplicationBot {
  private ensemble: EnsembleAI;
  private sessions: Map<string, ApplicationSession> = new Map();

  constructor() {
    this.ensemble = new EnsembleAI({
      strategy: "weighted",
      providers: ["claude", "gpt-4"]
    });
  }

  /**
   * Start a new application session
   */
  async startApplication(jobPostingId: string, resumeUrl?: string): Promise<{
    sessionId: string;
    greeting: string;
    suggestions: string[];
    nextSteps: string[];
  }> {
    const sessionId = `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get job posting details
    const jobPosting = await db.query.jobPostings.findFirst({
      where: eq(jobPostings.id, jobPostingId),
      with: {
        requisition: true
      }
    });

    if (!jobPosting) {
      throw new Error('Job posting not found');
    }

    // Initialize session
    const session: ApplicationSession = {
      sessionId,
      jobPostingId,
      candidateData: {},
      conversationHistory: [],
      extractedFromResume: false,
      completionPercentage: 0
    };

    // If resume provided, extract information
    if (resumeUrl) {
      const extractedData = await this.extractFromResume(resumeUrl, jobPosting);
      session.candidateData = extractedData;
      session.extractedFromResume = true;
      session.completionPercentage = this.calculateCompletion(extractedData);
    }

    this.sessions.set(sessionId, session);

    // Generate greeting
    const greeting = session.extractedFromResume
      ? `Hi! I've reviewed your resume and pre-filled some information for you. Let me help you complete your application for the ${jobPosting.title} position.`
      : `Hi! I'm here to help you apply for the ${jobPosting.title} position. Let's start by gathering some information about you.`;

    const suggestions = this.getNextSuggestions(session);
    const nextSteps = this.getNextSteps(session);

    return {
      sessionId,
      greeting,
      suggestions,
      nextSteps
    };
  }

  /**
   * Process candidate message and update application
   */
  async processMessage(sessionId: string, message: string): Promise<{
    response: string;
    extractedData: any;
    suggestions: string[];
    completionPercentage: number;
    isComplete: boolean;
    nextQuestion?: string;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Add message to history
    session.conversationHistory.push({
      role: 'candidate',
      message,
      timestamp: new Date()
    });

    // Extract information from message using AI
    const extractedData = await this.extractInformationFromMessage(
      message,
      session.candidateData,
      session.conversationHistory
    );

    // Merge with existing data
    session.candidateData = {
      ...session.candidateData,
      ...extractedData
    };

    // Update completion percentage
    session.completionPercentage = this.calculateCompletion(session.candidateData);

    // Generate response
    const response = await this.generateResponse(session, extractedData);

    // Add bot response to history
    session.conversationHistory.push({
      role: 'bot',
      message: response,
      timestamp: new Date()
    });

    // Get suggestions for next input
    const suggestions = this.getNextSuggestions(session);

    // Check if application is complete
    const isComplete = session.completionPercentage >= 90;

    // Get next question if not complete
    const nextQuestion = isComplete ? undefined : this.getNextQuestion(session);

    return {
      response,
      extractedData,
      suggestions,
      completionPercentage: session.completionPercentage,
      isComplete,
      nextQuestion
    };
  }

  /**
   * Extract information from resume
   */
  private async extractFromResume(resumeUrl: string, jobPosting: any): Promise<any> {
    const prompt = `Extract structured candidate information from this resume for the ${jobPosting.title} position.

Resume URL: ${resumeUrl}

Extract:
1. Full name (firstName, lastName)
2. Contact information (email, phone)
3. LinkedIn profile URL
4. Current company and title
5. Years of experience
6. Education (degree, institution, graduation year)
7. Skills (technical and soft skills)
8. Work history

Return as JSON with these fields.`;

    const response = await this.ensemble.call({
      agent: "Application",
      engine: "knowledge",
      tenantId: jobPosting.tenantId,
      prompt,
      temperature: 0.1
    });

    return typeof response === 'string' ? JSON.parse(response) : response;
  }

  /**
   * Extract information from candidate message
   */
  private async extractInformationFromMessage(
    message: string,
    currentData: any,
    conversationHistory: any[]
  ): Promise<any> {
    const prompt = `Extract structured information from this candidate's message.

Current Data:
${JSON.stringify(currentData, null, 2)}

Conversation History:
${conversationHistory.slice(-5).map(h => `${h.role}: ${h.message}`).join('\n')}

Latest Message: "${message}"

Extract any of these fields if mentioned:
- firstName, lastName
- email, phone
- linkedinUrl
- currentCompany, currentTitle
- yearsOfExperience
- education (array of objects)
- skills (array of strings)
- expectedSalary (number)
- availableStartDate (ISO date string)
- willingToRelocate (boolean)

Return ONLY the fields that were mentioned in the latest message.
Return as JSON.`;

    const response = await this.ensemble.call({
      agent: "Application",
      engine: "knowledge",
      tenantId: "system",
      prompt,
      temperature: 0.1
    });

    return typeof response === 'string' ? JSON.parse(response) : response;
  }

  /**
   * Generate conversational response
   */
  private async generateResponse(session: ApplicationSession, extractedData: any): Promise<string> {
    const fieldsExtracted = Object.keys(extractedData);

    if (fieldsExtracted.length === 0) {
      return "I didn't quite catch that. Could you provide more details?";
    }

    const jobPosting = await db.query.jobPostings.findFirst({
      where: eq(jobPostings.id, session.jobPostingId)
    });

    const prompt = `Generate a friendly, concise response acknowledging the information provided.

Job Position: ${jobPosting?.title}
Fields Just Provided: ${fieldsExtracted.join(', ')}
Completion: ${session.completionPercentage}%

The response should:
1. Acknowledge what was provided
2. Be encouraging and friendly
3. Be max 2 sentences
4. NOT ask the next question (that comes separately)

Example: "Great! I've noted your experience with Python and JavaScript. Thanks for sharing that."`;

    const response = await this.ensemble.call({
      agent: "Application",
      engine: "knowledge",
      tenantId: "system",
      prompt,
      temperature: 0.7
    });

    return typeof response === 'string' ? response : (response.narrative || 'Thank you for that information.');
  }

  /**
   * Get next question to ask candidate
   */
  private getNextQuestion(session: ApplicationSession): string {
    const data = session.candidateData;

    if (!data.firstName || !data.lastName) {
      return "What's your full name?";
    }
    if (!data.email) {
      return "What's the best email to reach you?";
    }
    if (!data.phone) {
      return "Could you provide your phone number?";
    }
    if (!data.currentCompany) {
      return "Where are you currently working?";
    }
    if (!data.currentTitle) {
      return "What's your current job title?";
    }
    if (!data.yearsOfExperience) {
      return "How many years of professional experience do you have?";
    }
    if (!data.skills || data.skills.length === 0) {
      return "What are your key technical skills?";
    }
    if (!data.education || data.education.length === 0) {
      return "What's your educational background?";
    }
    if (!data.expectedSalary) {
      return "What's your expected salary range?";
    }
    if (data.willingToRelocate === undefined) {
      return "Are you willing to relocate if needed?";
    }
    if (!data.availableStartDate) {
      return "When would you be available to start?";
    }

    return "Is there anything else you'd like to add?";
  }

  /**
   * Get suggestions for candidate input
   */
  private getNextSuggestions(session: ApplicationSession): string[] {
    const data = session.candidateData;
    const suggestions: string[] = [];

    if (!data.linkedinUrl) {
      suggestions.push("Share LinkedIn profile");
    }
    if (!data.yearsOfExperience) {
      suggestions.push("5 years experience");
    }
    if (!data.expectedSalary) {
      suggestions.push("$100k - $120k");
    }
    if (data.willingToRelocate === undefined) {
      suggestions.push("Yes, willing to relocate");
    }

    return suggestions.slice(0, 3);
  }

  /**
   * Get next steps in application
   */
  private getNextSteps(session: ApplicationSession): string[] {
    const steps: string[] = [];

    if (session.completionPercentage < 50) {
      steps.push("Complete basic information");
      steps.push("Add work experience details");
    } else if (session.completionPercentage < 90) {
      steps.push("Add education and skills");
      steps.push("Specify salary expectations");
    } else {
      steps.push("Review and submit application");
      steps.push("Complete culture fit assessment");
    }

    return steps;
  }

  /**
   * Calculate application completion percentage
   */
  private calculateCompletion(data: any): number {
    const requiredFields = [
      'firstName', 'lastName', 'email', 'phone',
      'currentCompany', 'currentTitle', 'yearsOfExperience',
      'skills', 'education'
    ];

    const optionalFields = [
      'linkedinUrl', 'expectedSalary', 'availableStartDate', 'willingToRelocate'
    ];

    let completed = 0;
    const requiredWeight = 70;
    const optionalWeight = 30;

    // Required fields (70% weight)
    requiredFields.forEach(field => {
      if (data[field]) {
        if (Array.isArray(data[field])) {
          if (data[field].length > 0) completed += requiredWeight / requiredFields.length;
        } else {
          completed += requiredWeight / requiredFields.length;
        }
      }
    });

    // Optional fields (30% weight)
    optionalFields.forEach(field => {
      if (data[field] !== undefined && data[field] !== null) {
        completed += optionalWeight / optionalFields.length;
      }
    });

    return Math.round(completed);
  }

  /**
   * Submit completed application
   */
  async submitApplication(sessionId: string, requisitionId: string, tenantId: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.completionPercentage < 80) {
      throw new Error('Application is not complete enough to submit');
    }

    const data = session.candidateData;

    // Create candidate record
    const candidate = await db.insert(candidates).values({
      tenantId,
      requisitionId,
      firstName: data.firstName!,
      lastName: data.lastName!,
      email: data.email!,
      phone: data.phone,
      linkedinUrl: data.linkedinUrl,
      resumeUrl: data.resumeUrl || '',
      currentCompany: data.currentCompany,
      currentTitle: data.currentTitle,
      yearsOfExperience: data.yearsOfExperience,
      education: data.education || [],
      skills: data.skills || [],
      expectedSalary: data.expectedSalary ? String(data.expectedSalary) : null,
      availableStartDate: data.availableStartDate,
      willingToRelocate: data.willingToRelocate,
      status: 'applied',
      stage: 'application',
      source: 'career_page',
      metadata: {
        applicationSessionId: sessionId,
        botAssisted: true,
        conversationLength: session.conversationHistory.length
      }
    }).returning();

    const candidateId = candidate[0].id;

    // Clean up session
    this.sessions.delete(sessionId);

    logger.info(`Application submitted for candidate ${candidateId}`);
    return candidateId;
  }

  /**
   * Get application progress
   */
  getProgress(sessionId: string): {
    completionPercentage: number;
    completedFields: string[];
    missingFields: string[];
  } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const allFields = [
      'firstName', 'lastName', 'email', 'phone',
      'currentCompany', 'currentTitle', 'yearsOfExperience',
      'skills', 'education', 'linkedinUrl', 'expectedSalary',
      'availableStartDate', 'willingToRelocate'
    ];

    const completedFields = allFields.filter(field => {
      const value = session.candidateData[field as keyof typeof session.candidateData];
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null;
    });

    const missingFields = allFields.filter(field => !completedFields.includes(field));

    return {
      completionPercentage: session.completionPercentage,
      completedFields,
      missingFields
    };
  }
}
