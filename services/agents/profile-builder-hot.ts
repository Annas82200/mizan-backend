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
        model: 'gpt-4o',
        temperature: 0.7, // Higher temperature for conversational tone
        maxTokens: 2000
      },
      data: {
        providers: ['openai', 'anthropic'],
        model: 'gpt-4o',
        temperature: 0.3,
        maxTokens: 1500
      },
      reasoning: {
        providers: ['openai', 'anthropic'],
        model: 'gpt-4o',
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
    // Check if user wants to finish
    const finishKeywords = ['nothing', 'done', 'finished', 'complete', 'no', "that's all", "that's it", 'nope'];
    const isFinishing = finishKeywords.some(keyword =>
      userMessage.toLowerCase().trim() === keyword ||
      userMessage.toLowerCase().includes(`i'm ${keyword}`) ||
      userMessage.toLowerCase().includes(`im ${keyword}`)
    );

    // Determine current section based on what's missing
    const currentSection = context.currentSection || this.determineNextSection(context.currentProfile);

    const prompt = `You are an expert HR assistant specializing in skills extraction and profile building through natural conversation.

IMPORTANT CONTEXT:
- Current section focus: ${currentSection}
- User said: "${userMessage}"
- Is user trying to finish?: ${isFinishing ? 'YES' : 'NO'}

Current Profile Data:
${JSON.stringify(context.currentProfile, null, 2)}

Conversation History (last 6 messages):
${context.conversationHistory.slice(-6).map(msg => `${msg.role}: ${msg.message}`).join('\n')}

YOUR TASKS:
1. **Extract Information**: Parse ANY career details from user's message
2. **Detect Intent**: Is user finishing, continuing, or changing topic?
3. **Respond Appropriately**:
   ${isFinishing ? '- User wants to finish. Acknowledge completion, summarize what was collected, ask if they want to review/edit anything' : '- User is sharing info. Extract it, acknowledge it, ask relevant follow-up'}
4. **Structure Data**: Convert free-form text to proper JSON structures
5. **Guide Next Steps**: Suggest what's missing or what to add next

REQUIRED JSON OUTPUT:
{
  "response": "${isFinishing ? 'Completion acknowledgment + summary + option to review' : 'Acknowledgment of what they shared + specific follow-up question'}",
  "extractedData": {
    "currentExperience": [{"company": "string", "role": "string", "startDate": "string", "endDate": "Present|string", "description": "string", "achievements": ["string"]}],
    "pastExperience": [{"company": "string", "role": "string", "duration": "string", "description": "string"}],
    "education": [{"degree": "string", "institution": "string", "year": "string", "field": "string"}],
    "certifications": [{"name": "string", "issuer": "string", "date": "string", "expiryDate": "string|null"}],
    "technicalSkills": [{"skill": "string", "proficiency": "beginner|intermediate|advanced|expert", "yearsExperience": number}],
    "softSkills": ["string"],
    "projects": [{"name": "string", "description": "string", "role": "string", "technologies": ["string"]}],
    "languages": [{"language": "string", "proficiency": "string"}]
  },
  "suggestions": ["Specific next action 1", "Specific next action 2", "Specific next action 3"],
  "sectionComplete": ${isFinishing ? 'true' : 'false'},
  "nextSection": "${isFinishing ? 'complete' : 'experience|education|skills|certifications|projects'}",
  "profileUpdate": {
    // Merge extracted data here - add to existing arrays, don't replace
  }
}

EXTRACTION RULES - COMPREHENSIVE SKILLS MINING:
1. **From Current/Past Positions**:
   - Extract job title, company, duration → to currentExperience or pastExperience
   - CRITICAL: Extract ALL skills implied by the role (e.g., "Product Manager" implies: leadership, strategy, stakeholder management, analytics, roadmapping)
   - Extract technologies/tools mentioned (e.g., "managed AWS infrastructure" → AWS, cloud architecture, DevOps)
   - Extract achievements and quantify impact where possible

2. **From Projects**:
   - Project name, description, your role → to projects
   - Technologies/frameworks used → to technicalSkills
   - Skills demonstrated (project management, collaboration, problem-solving) → to softSkills/technicalSkills
   - Business impact or results achieved

3. **From Education & Training**:
   - Degrees, institutions, graduation years → to education
   - Courses, bootcamps, online learning → to certifications or training
   - Conferences attended (e.g., "attended AWS re:Invent 2023") → extract AWS skills, note conference
   - Webinars/workshops → extract topic as skill, note in training

4. **From Certifications**:
   - Certification name, issuing body, date → to certifications
   - CRITICAL: Extract ALL skills the certification implies (e.g., "AWS Solutions Architect" → AWS, cloud architecture, security, networking, databases)
   - Professional memberships → note and extract related skills

5. **Skill Extraction Patterns**:
   - Direct mentions: "I know Python" → Python to technicalSkills
   - Indirect mentions: "I built a REST API" → REST, API development, backend development
   - Tool usage: "used Jira for project management" → Jira, project management, Agile
   - Responsibilities: "led a team of 5" → leadership, team management, mentoring
   - Achievements: "improved performance by 40%" → optimization, analytics, problem-solving

6. **Training & Learning Extraction**:
   - Conferences: "attended KubeCon" → Kubernetes, containerization, cloud-native
   - Webinars: "completed Docker webinar series" → Docker, containerization
   - Courses: "took Harvard's CS50" → computer science fundamentals, problem-solving
   - Self-learning: "taught myself React" → React, self-directed learning

- ALWAYS extract EVERYTHING mentioned, even if indirect
- Infer related skills from context
- Merge with existing profile data, don't overwrite

RESPONSE RULES:
- If finishing: "Great job! You've shared [summary of sections completed]. Your profile is now [X]% complete. Would you like to review anything or add more details to any section?"
- If continuing: "Thanks for sharing [specific thing they mentioned]! [Specific follow-up question about that topic OR move to next needed section]"
- NEVER repeat the same question twice in a row
- Ask specific, targeted questions based on what's missing
- Keep responses under 3 sentences`;

    try {
      const response = await this.runKnowledgeEngine({ prompt });
      let result = typeof response === 'string' ? JSON.parse(response) : response;

      // Calculate completion percentage based on extracted data
      const profileUpdate = this.mergeProfileData(context.currentProfile, result.extractedData || {});
      const completionPercentage = this.calculateCompletion(profileUpdate);

      // Add completion percentage to profile update
      profileUpdate.completionPercentage = completionPercentage;

      return {
        response: result.response || "Thank you for sharing! What else would you like to add to your profile?",
        extractedData: result.extractedData || {},
        suggestions: result.suggestions || this.generateSmartSuggestions(profileUpdate, currentSection),
        sectionComplete: result.sectionComplete || isFinishing,
        nextSection: result.nextSection || this.determineNextSection(profileUpdate),
        profileUpdate
      };
    } catch (error) {
      console.error('Error processing message:', error);

      // Fallback: Try basic extraction
      const basicExtraction = this.basicExtract(userMessage);
      const profileUpdate = this.mergeProfileData(context.currentProfile, basicExtraction);
      const completionPercentage = this.calculateCompletion(profileUpdate);
      profileUpdate.completionPercentage = completionPercentage;

      return {
        response: isFinishing
          ? `Thanks for building your profile! It's now ${completionPercentage}% complete. You can always come back to add more details.`
          : "Thanks for sharing that! Could you tell me more about your current role and what you do day-to-day?",
        extractedData: basicExtraction,
        suggestions: this.generateSmartSuggestions(profileUpdate, currentSection),
        sectionComplete: isFinishing,
        nextSection: this.determineNextSection(profileUpdate),
        profileUpdate
      };
    }
  }

  /**
   * Enhanced extraction fallback (when AI fails) - comprehensive skill mining
   */
  private basicExtract(message: string): any {
    const extracted: any = {};
    const lowerMessage = message.toLowerCase();

    // Job role detection with implied skills
    const rolePatterns: { [key: string]: string[] } = {
      'software engineer': ['programming', 'debugging', 'software design', 'testing', 'version control'],
      'developer': ['coding', 'debugging', 'problem-solving', 'software development'],
      'product manager': ['product strategy', 'roadmapping', 'stakeholder management', 'analytics', 'leadership'],
      'project manager': ['project planning', 'risk management', 'team coordination', 'budgeting', 'scheduling'],
      'data scientist': ['data analysis', 'machine learning', 'statistics', 'python', 'data visualization'],
      'designer': ['design thinking', 'user experience', 'prototyping', 'visual design'],
      'manager': ['leadership', 'team management', 'decision making', 'strategic planning']
    };

    for (const [role, skills] of Object.entries(rolePatterns)) {
      if (lowerMessage.includes(role)) {
        extracted.currentExperience = [{
          role: role.charAt(0).toUpperCase() + role.slice(1),
          company: 'Company',
          description: message,
          startDate: 'Present'
        }];
        // Add implied skills
        if (!extracted.technicalSkills) extracted.technicalSkills = [];
        skills.forEach(skill => {
          extracted.technicalSkills.push({ skill, proficiency: 'intermediate' });
        });
        break;
      }
    }

    // Technical skills detection - expanded list
    const technicalSkills = [
      'python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'ruby', 'go', 'rust', 'php', 'swift',
      'react', 'angular', 'vue', 'node', 'express', 'django', 'flask', 'spring', 'rails',
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ansible', 'jenkins',
      'sql', 'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch',
      'git', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence',
      'agile', 'scrum', 'kanban', 'devops', 'ci/cd', 'microservices', 'rest', 'graphql',
      'machine learning', 'deep learning', 'neural networks', 'tensorflow', 'pytorch'
    ];

    const foundTechnicalSkills = technicalSkills.filter(skill => lowerMessage.includes(skill));
    if (foundTechnicalSkills.length > 0) {
      if (!extracted.technicalSkills) extracted.technicalSkills = [];
      foundTechnicalSkills.forEach(skill => {
        extracted.technicalSkills.push({ skill, proficiency: 'intermediate' });
      });
    }

    // Certification detection with implied skills
    const certPatterns: { [key: string]: string[] } = {
      'aws certified': ['aws', 'cloud computing', 'cloud architecture'],
      'pmp': ['project management', 'risk management', 'stakeholder management'],
      'scrum master': ['scrum', 'agile', 'team facilitation'],
      'cissp': ['security', 'risk assessment', 'compliance'],
      'google cloud': ['gcp', 'cloud computing', 'data engineering']
    };

    for (const [cert, skills] of Object.entries(certPatterns)) {
      if (lowerMessage.includes(cert)) {
        extracted.certifications = [{ name: cert.toUpperCase(), issuer: 'Professional', date: 'Recent' }];
        if (!extracted.technicalSkills) extracted.technicalSkills = [];
        skills.forEach(skill => {
          extracted.technicalSkills.push({ skill, proficiency: 'advanced' });
        });
      }
    }

    // Conference/training detection
    const trainingKeywords = ['conference', 'webinar', 'workshop', 'bootcamp', 'course', 'training', 'attended', 'completed'];
    const hasTraining = trainingKeywords.some(keyword => lowerMessage.includes(keyword));
    if (hasTraining) {
      // Extract potential training topics
      if (lowerMessage.includes('aws') && lowerMessage.includes('conference')) {
        if (!extracted.technicalSkills) extracted.technicalSkills = [];
        extracted.technicalSkills.push({ skill: 'AWS', proficiency: 'intermediate' });
        extracted.technicalSkills.push({ skill: 'Cloud Computing', proficiency: 'intermediate' });
      }
    }

    // Soft skills detection
    const softSkills = [
      'leadership', 'communication', 'teamwork', 'problem solving', 'critical thinking',
      'time management', 'adaptability', 'creativity', 'collaboration', 'mentoring'
    ];

    const foundSoftSkills = softSkills.filter(skill => lowerMessage.includes(skill));
    if (foundSoftSkills.length > 0) {
      extracted.softSkills = foundSoftSkills;
    }

    return extracted;
  }

  /**
   * Merge new data with existing profile (don't overwrite, append)
   */
  private mergeProfileData(existing: any, newData: any): any {
    const merged = { ...existing };

    // Merge arrays (append, don't replace)
    const arrayFields = ['currentExperience', 'pastExperience', 'education', 'certifications',
                        'technicalSkills', 'softSkills', 'projects', 'languages'];

    arrayFields.forEach(field => {
      if (newData[field] && Array.isArray(newData[field]) && newData[field].length > 0) {
        merged[field] = [...(merged[field] || []), ...newData[field]];
      }
    });

    return merged;
  }

  /**
   * Calculate profile completion percentage
   */
  private calculateCompletion(profile: any): number {
    const sections = {
      experience: (profile.currentExperience?.length || 0) + (profile.pastExperience?.length || 0),
      education: profile.education?.length || 0,
      skills: (profile.technicalSkills?.length || 0) + (profile.softSkills?.length || 0),
      certifications: profile.certifications?.length || 0,
      projects: profile.projects?.length || 0,
      languages: profile.languages?.length || 0
    };

    let score = 0;
    if (sections.experience > 0) score += 30; // Most important
    if (sections.skills > 0) score += 30; // Very important
    if (sections.education > 0) score += 20;
    if (sections.certifications > 0) score += 10;
    if (sections.projects > 0) score += 5;
    if (sections.languages > 0) score += 5;

    return Math.min(100, score);
  }

  /**
   * Determine what section to ask about next
   */
  private determineNextSection(profile: any): string {
    const hasExperience = (profile.currentExperience?.length || 0) + (profile.pastExperience?.length || 0) > 0;
    const hasSkills = (profile.technicalSkills?.length || 0) + (profile.softSkills?.length || 0) > 0;
    const hasEducation = profile.education?.length || 0 > 0;
    const hasCertifications = profile.certifications?.length || 0 > 0;
    const hasProjects = profile.projects?.length || 0 > 0;

    if (!hasExperience) return 'experience';
    if (!hasSkills) return 'skills';
    if (!hasEducation) return 'education';
    if (!hasCertifications) return 'certifications';
    if (!hasProjects) return 'projects';

    return 'complete';
  }

  /**
   * Generate smart suggestions for comprehensive skills extraction
   */
  private generateSmartSuggestions(profile: any, currentSection: string): string[] {
    const suggestions: string[] = [];

    if (currentSection === 'experience') {
      suggestions.push(
        "Tell me about your daily responsibilities and the skills they require",
        "What technologies and tools do you use in your current role?",
        "What are your proudest achievements and the impact they had?",
        "Have you managed teams or led any initiatives?"
      );
    } else if (currentSection === 'skills') {
      suggestions.push(
        "What programming languages and frameworks are you proficient in?",
        "What cloud platforms or DevOps tools have you worked with?",
        "What soft skills help you excel (leadership, communication, problem-solving)?",
        "Have you attended any conferences or completed training recently?"
      );
    } else if (currentSection === 'education') {
      suggestions.push(
        "What's your educational background (degree, institution, year)?",
        "Have you taken any online courses or bootcamps?",
        "Any relevant coursework that gave you specific skills?",
        "Did you participate in any academic projects or research?"
      );
    } else if (currentSection === 'certifications') {
      suggestions.push(
        "What professional certifications have you earned (AWS, PMP, Scrum, etc.)?",
        "Have you completed any online courses (Coursera, Udemy, etc.)?",
        "Attended any webinars or workshops recently?",
        "Any professional memberships or licenses?"
      );
    } else if (currentSection === 'projects') {
      suggestions.push(
        "Describe a challenging project you worked on - what skills did it require?",
        "What was your role and what technologies did you use?",
        "What problems did you solve and what was the business impact?",
        "Any side projects or open source contributions?"
      );
    } else {
      suggestions.push(
        "Review my extracted skills profile",
        "Add more details to a section",
        "I'm done for now"
      );
    }

    return suggestions;
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
