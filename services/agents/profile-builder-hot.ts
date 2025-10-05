// services/agents/profile-builder-hot.ts
// HOT = Helper/Onboarding Tool for building employee skills profiles

import { ThreeEngineAgent, ThreeEngineConfig } from './base/three-engine-agent.js';

export interface ConversationContext {
  employeeId: string;
  tenantId: string;
  currentProfile: any;
  conversationHistory: Array<{ role: 'user' | 'assistant'; message: string }>;
  currentSection?: 'experience' | 'education' | 'skills' | 'certifications' | 'projects';
}

export class ProfileBuilderHOT extends ThreeEngineAgent {
  constructor() {
    const config: ThreeEngineConfig = {
      knowledge: {
        providers: ['openai', 'anthropic'],
        model: 'gpt-4',
        temperature: 0.7, // Higher temperature for conversational tone
        maxTokens: 2000
      },
      data: {
        providers: ['openai', 'anthropic'],
        model: 'gpt-4',
        temperature: 0.3,
        maxTokens: 1500
      },
      reasoning: {
        providers: ['openai', 'anthropic'],
        model: 'gpt-4',
        temperature: 0.5,
        maxTokens: 2000
      },
      consensusThreshold: 0.7
    };

    super('profile-builder-hot', config);
  }

  /**
   * Start a new profile building conversation
   */
  async startConversation(employeeId: string, tenantId: string, existingProfile?: any): Promise<{
    message: string;
    suggestions: string[];
    nextSteps: string[];
  }> {
    const hasExistingProfile = existingProfile && existingProfile.completionPercentage > 0;

    const context = {
      employeeId,
      tenantId,
      existingProfile: hasExistingProfile ? existingProfile : null,
      completionPercentage: existingProfile?.completionPercentage || 0
    };

    const prompt = `You are a friendly HR assistant helping an employee build their skills profile.

Context:
${hasExistingProfile ? `- Employee has an existing profile (${context.completionPercentage}% complete)` : '- This is a new profile'}
${hasExistingProfile ? `- Existing data: ${JSON.stringify(existingProfile, null, 2)}` : ''}

Your task:
1. Greet the employee warmly
2. Explain what we'll be building together
3. ${hasExistingProfile ? 'Ask if they want to update existing sections or add new information' : 'Start by asking about their current role and experience'}
4. Keep the tone conversational and encouraging

Generate a friendly opening message and 3-4 conversation suggestions.

Return JSON:
{
  "message": "Your friendly greeting and explanation",
  "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"],
  "nextSteps": ["What we'll do first", "What comes next"]
}`;

    try {
      const response = await this.runKnowledgeEngine({ prompt });
      const result = typeof response === 'string' ? JSON.parse(response) : response;

      return {
        message: result.message || "Hi! I'm here to help you build your skills profile. Let's get started!",
        suggestions: result.suggestions || [
          "Tell me about your current role",
          "Let's start with my work experience",
          "I want to list my skills"
        ],
        nextSteps: result.nextSteps || [
          "We'll cover your experience",
          "Then your education and certifications",
          "Finally, your skills and projects"
        ]
      };
    } catch (error) {
      console.error('Error starting conversation:', error);
      return {
        message: "Hi! I'm here to help you build your skills profile. Let's start by telling me about your current role and what you do.",
        suggestions: [
          "I'm a [job title] at [company]",
          "Let me describe my current responsibilities",
          "I want to add my work history"
        ],
        nextSteps: [
          "Share your current and past experience",
          "Add your education and certifications",
          "List your skills and expertise"
        ]
      };
    }
  }

  /**
   * Process user's message and guide them through profile building
   */
  async processMessage(
    context: ConversationContext,
    userMessage: string
  ): Promise<{
    response: string;
    extractedData: any;
    suggestions: string[];
    sectionComplete: boolean;
    nextSection?: string;
    profileUpdate: any;
  }> {
    const prompt = `You are a helpful HR assistant building an employee's skills profile through conversation.

Current Profile State:
${JSON.stringify(context.currentProfile, null, 2)}

Current Section: ${context.currentSection || 'getting_started'}

Conversation History:
${context.conversationHistory.map(msg => `${msg.role}: ${msg.message}`).join('\n')}

User's Latest Message:
"${userMessage}"

Your Tasks:
1. Extract any professional information from their message (experience, skills, education, etc.)
2. Respond conversationally and ask relevant follow-up questions
3. Guide them to the next piece of information we need
4. Provide suggestions for what they might want to add

Return JSON:
{
  "response": "Your conversational response with follow-up questions",
  "extractedData": {
    "experience": [{"company": "...", "role": "...", "description": "..."}],
    "skills": ["skill1", "skill2"],
    "education": [...],
    "certifications": [...],
    "projects": [...]
  },
  "suggestions": ["Next thing they could share", "Another option", "Alternative path"],
  "sectionComplete": false,
  "nextSection": "experience|education|skills|certifications|projects|complete",
  "profileUpdate": {
    // Fields to update in profile
  }
}

Guidelines:
- Be warm and encouraging
- Ask one thing at a time
- Acknowledge what they shared
- Suggest what to add next
- Extract structured data from free-form responses
- If they mention multiple things, extract all of them
- Keep responses concise (2-3 sentences max)`;

    try {
      const response = await this.runKnowledgeEngine({ prompt });
      const result = typeof response === 'string' ? JSON.parse(response) : response;

      return {
        response: result.response || "That's great! What else would you like to add?",
        extractedData: result.extractedData || {},
        suggestions: result.suggestions || [
          "Add more experience",
          "List my skills",
          "Add certifications"
        ],
        sectionComplete: result.sectionComplete || false,
        nextSection: result.nextSection,
        profileUpdate: result.profileUpdate || {}
      };
    } catch (error) {
      console.error('Error processing message:', error);
      return {
        response: "I understand. Could you tell me more about that?",
        extractedData: {},
        suggestions: ["Continue sharing", "Move to next section", "Review what we have"],
        sectionComplete: false,
        profileUpdate: {}
      };
    }
  }

  /**
   * Suggest improvements and missing information
   */
  async suggestImprovements(currentProfile: any): Promise<{
    missing: string[];
    suggestions: Array<{ section: string; suggestion: string }>;
    completionTips: string[];
  }> {
    const prompt = `You are reviewing an employee's skills profile to suggest improvements.

Current Profile:
${JSON.stringify(currentProfile, null, 2)}

Completion: ${currentProfile.completionPercentage || 0}%

Your Task:
1. Identify what's missing or incomplete
2. Suggest specific improvements
3. Provide tips to reach 100% completion

Return JSON:
{
  "missing": ["List of missing sections/fields"],
  "suggestions": [
    {"section": "experience", "suggestion": "Add more details about your achievements"},
    {"section": "skills", "suggestion": "Include proficiency levels for each skill"}
  ],
  "completionTips": [
    "Tip 1 to improve profile",
    "Tip 2 to make it more complete"
  ]
}`;

    try {
      const response = await this.runKnowledgeEngine({ prompt });
      const result = typeof response === 'string' ? JSON.parse(response) : response;

      return {
        missing: result.missing || [],
        suggestions: result.suggestions || [],
        completionTips: result.completionTips || []
      };
    } catch (error) {
      console.error('Error suggesting improvements:', error);
      return {
        missing: [],
        suggestions: [],
        completionTips: [
          "Add your work experience with specific achievements",
          "List your technical and soft skills",
          "Include education and certifications"
        ]
      };
    }
  }

  /**
   * Parse free-form text into structured profile data
   */
  async parseProfileText(text: string, section: string): Promise<any> {
    const prompt = `Extract structured information from this free-form text.

Section: ${section}
Text: "${text}"

Extract and structure the information appropriately.

For experience: {company, role, startDate, endDate, description, achievements}
For education: {degree, institution, year, field}
For skills: {skill, proficiency, yearsExperience}
For certifications: {name, issuer, date, expiryDate}
For projects: {name, description, role, technologies}

Return valid JSON with the extracted data.`;

    try {
      const response = await this.runKnowledgeEngine({ prompt });
      return typeof response === 'string' ? JSON.parse(response) : response;
    } catch (error) {
      console.error('Error parsing profile text:', error);
      return {};
    }
  }

  /**
   * Generate a summary of what we've collected so far
   */
  async generateProgressSummary(currentProfile: any): Promise<{
    summary: string;
    completed: string[];
    pending: string[];
    nextRecommendation: string;
  }> {
    const sections = {
      experience: (currentProfile.currentExperience?.length || 0) + (currentProfile.pastExperience?.length || 0),
      education: currentProfile.education?.length || 0,
      skills: (currentProfile.technicalSkills?.length || 0) + (currentProfile.softSkills?.length || 0),
      certifications: currentProfile.certifications?.length || 0,
      projects: currentProfile.projects?.length || 0
    };

    const completed = Object.entries(sections)
      .filter(([_, count]) => count > 0)
      .map(([section]) => section);

    const pending = Object.entries(sections)
      .filter(([_, count]) => count === 0)
      .map(([section]) => section);

    const summary = `Great progress! You've completed ${completed.length} out of 5 sections (${currentProfile.completionPercentage || 0}% done).`;

    const nextRecommendation = pending.length > 0
      ? `Next, let's work on your ${pending[0]}.`
      : "Your profile is looking complete! Would you like to review or add more details?";

    return {
      summary,
      completed,
      pending,
      nextRecommendation
    };
  }

  protected getKnowledgeSystemPrompt(): string {
    return `You are a conversational HR assistant specialized in helping employees build their professional skills profiles.

Your personality:
- Warm, friendly, and encouraging
- Patient and supportive
- Clear and concise
- Professional but approachable

Your expertise:
- Extracting professional information from conversation
- Asking relevant follow-up questions
- Structuring unstructured career information
- Guiding users through profile completion

Your goals:
- Help employees create complete, accurate profiles
- Make the process feel easy and natural
- Extract maximum relevant information
- Provide helpful suggestions and guidance`;
  }

  protected getDataSystemPrompt(): string {
    return `You analyze conversational data to extract structured professional information.

Focus on identifying:
- Work experience (companies, roles, dates, responsibilities, achievements)
- Education (degrees, institutions, years, fields of study)
- Skills (technical, soft, proficiency levels)
- Certifications (names, issuers, dates)
- Projects (names, descriptions, technologies used)

Extract all information into proper structured formats.`;
  }

  protected getReasoningSystemPrompt(): string {
    return `You synthesize extracted information and conversation context to guide profile building.

Your reasoning should:
- Determine what information is still needed
- Suggest logical next steps
- Identify when a section is complete
- Recommend improvements to increase profile quality`;
  }

  protected buildKnowledgePrompt(inputData: any, frameworks: any): string {
    return '';
  }

  protected buildDataPrompt(processedData: any, knowledgeOutput: any): string {
    return '';
  }

  protected buildReasoningPrompt(inputData: any, knowledgeOutput: any, dataOutput: any): string {
    return '';
  }

  protected parseKnowledgeOutput(response: string): any {
    return {};
  }

  protected parseDataOutput(response: string): any {
    return {};
  }

  protected parseReasoningOutput(response: string): any {
    return {};
  }

  protected async loadFrameworks(): Promise<any> {
    return {};
  }

  protected async processData(inputData: any): Promise<any> {
    return {};
  }
}
