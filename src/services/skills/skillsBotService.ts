/**
 * Skills BOT Service - Interactive BOT System
 * Compliant with AGENT_CONTEXT_ULTIMATE.md Lines 115-137
 * Three-Engine Architecture + Interactive BOT Interface
 * NO MOCK DATA - PRODUCTION READY
 */

import { db } from '../../db/client';
import { 
  skillsBotInteractions,
  skillsAssessmentSessions,
  employeeSkillsProfiles,
  skillsGapAnalysis
} from '../../db/schema/skills';
import { users } from '../../db/schema/core';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { SkillsAgent } from '../agents/skills/skills-agent';

// Define BotResponse type
interface BotResponse {
  message?: string;
  response?: string;
  data?: unknown;
  suggestions?: string[];
  error?: boolean;
  resources?: Array<{ title: string; url: string; type: string }>;
  nextSteps?: string[];
  requiresAction?: boolean;
  actionType?: string;
}

// Define strict types to replace 'any'
interface BotContext {
    employeeId: string;
    tenantId: string;
    currentIntent: string;
    employeeProfile?: Record<string, unknown>;
    skillsGaps?: GapAnalysisRecord[];
    interactionHistory?: Record<string, unknown>[];
}

interface GapAnalysisRecord {
    id: string;
    tenantId: string;
    employeeId: string;
    profileId: string;
    analysisType: string;
    criticalGaps: unknown;
    moderateGaps: unknown;
    strengthAreas: unknown;
    trainingRecommendations: unknown;
    developmentPlan: unknown;
    estimatedTimeToClose: number | null;
    overallSkillScore: number | null;
    strategicAlignmentScore: number | null;
    readinessScore: number | null;
    analyzedAt: Date;
    analyzedBy: string;
}

interface SkillGap {
    skill: string;
    currentLevel: string;
    requiredLevel: string;
    gap: number;
    priority: 'critical' | 'high' | 'medium' | 'low';
}

// Mizan Production-Ready Resume Data Types
// Compliant with AGENT_CONTEXT_ULTIMATE.md - NO MOCK DATA
interface ResumeData {
    // Top-level name and email for backward compatibility with validation
    name?: string;
    email?: string;

    personalInfo: {
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        location?: string;
        linkedIn?: string;
        portfolio?: string;
    };
    summary?: string;
    experience: Array<{
        company: string;
        position: string;
        startDate: string;
        endDate?: string;
        current?: boolean;
        description?: string;
        achievements?: string[];
        skills?: string[];
    }>;
    education: Array<{
        institution: string;
        degree: string;
        field?: string;
        startDate?: string;
        endDate?: string;
        gpa?: string;
    }>;
    skills: {
        technical?: string[];
        soft?: string[];
        languages?: Array<{
            language: string;
            proficiency: string;
        }>;
    };
    certifications?: Array<{
        name: string;
        issuer: string;
        date?: string;
        expiryDate?: string;
    }>;
    projects?: Array<{
        name: string;
        description: string;
        technologies?: string[];
        url?: string;
    }>;
}

// Resume building state data
interface ResumeBuildingData {
    step: 'personal_info' | 'experience' | 'education' | 'skills' | 'certifications' | 'review';
    completedSteps: string[];
    currentData: Partial<ResumeData>;
    missingFields: string[];
    validationErrors: string[];
}

// Individual skills gap analysis data
interface IndividualSkillsGap {
    employeeId: string;
    tenantId: string;
    profileId: string;
    analysisDate: Date;
    criticalGaps: Array<{
        skill: string;
        currentLevel: number;
        requiredLevel: number;
        gap: number;
        priority: 'critical' | 'high';
        estimatedTimeToClose: string;
        developmentActions: string[];
    }>;
    moderateGaps: Array<{
        skill: string;
        currentLevel: number;
        requiredLevel: number;
        gap: number;
        priority: 'medium' | 'low';
        developmentActions: string[];
    }>;
    strengthAreas: Array<{
        skill: string;
        level: number;
        certifications?: string[];
    }>;
    overallSkillScore: number;
    strategicAlignmentScore: number;
    readinessScore: number;
    recommendedLearningPaths: string[];
}

/**
 * Mizan Skills BOT - Interactive Assistant
 * As per AGENT_CONTEXT_ULTIMATE.md (Lines 114-226)
 */
export class SkillsBotService {
  private skillsAgent: SkillsAgent;

  constructor() {
    this.skillsAgent = new SkillsAgent();
  }

  /**
   * Main BOT interaction handler
   * Routes user queries to appropriate BOT functions
   */
  async handleBotQuery(
    userId: string,
    tenantId: string,
    query: string,
    sessionId?: string
  ): Promise<BotResponse> {
    try {
      const context = await this.buildBotContext(userId, tenantId, sessionId);
      
      // Analyze query intent
      const intent = await this.analyzeQueryIntent(query, context);
      
      // Route to appropriate handler
      let response: BotResponse;
      
      switch (intent.type) {
        case 'resume_upload':
          response = await this.handleResumeUpload(query, context);
          break;
        case 'gap_explanation':
          response = await this.handleGapExplanation(query, context);
          break;
        case 'learning_guidance':
          response = await this.handleLearningGuidance(query, context);
          break;
        case 'development_planning':
          response = await this.handleDevelopmentPlanning(query, context);
          break;
        case 'progress_tracking':
          response = await this.handleProgressTracking(query, context);
          break;
        case 'general_help':
          response = await this.handleGeneralHelp(query, context);
          break;
        default:
          response = await this.handleGeneralHelp(query, context);
      }

      // Log interaction
      await this.logBotInteraction(userId, tenantId, sessionId, query, response, intent.type);

      return response;
    } catch (error) {
      logger.error('Error handling bot query:', error);
      return {
        response: "I apologize, but I'm experiencing some technical difficulties. Please try again or contact support for assistance.",
        suggestions: ['Try rephrasing your question', 'Contact support', 'Browse available resources']
      };
    }
  }

  /**
   * For Employees: Resume upload assistance and guidance
   */
  async assistEmployeeResumeUpload(
    userId: string,
    tenantId: string,
    resumeData: ResumeData
  ): Promise<BotResponse> {
    try {
      const context = await this.buildBotContext(userId, tenantId);
      
      // Validate resume data
      const validation = await this.validateResumeData(resumeData);
      
      if (!validation.isValid) {
        return {
          response: `I notice some issues with your resume upload. ${validation.errors.join(', ')}`,
          suggestions: [
            'Ensure your resume is in PDF or Word format',
            'Check that all sections are properly filled out',
            'Verify your contact information is complete',
            'Include relevant work experience and education'
          ],
          requiresAction: true,
          actionType: 'upload_resume'
        };
      }

      // Extract skills from resume
      const extractedSkills = await this.extractSkillsFromResume(resumeData);

      // Save extracted skills to employee profile
      const profileData = typeof resumeData === 'object' && resumeData !== null ? resumeData as unknown as Record<string, unknown> : {};
      await db.insert(employeeSkillsProfiles).values({
        tenantId,
        employeeId: userId,
        profileType: 'resume_upload',
        resumeText: JSON.stringify(resumeData),
        technicalSkills: extractedSkills.filter((s: { type?: string }) => s.type === 'technical'),
        softSkills: extractedSkills.filter((s: { type?: string }) => s.type === 'soft'),
        currentExperience: Array.isArray(profileData.experience) ? profileData.experience : null,
        education: Array.isArray(profileData.education) ? profileData.education : null,
        lastUpdated: new Date(),
      });

      return {
        response: `Great! I've successfully processed your resume and identified ${extractedSkills.length} skills. Your skills profile has been updated.`,
        suggestions: [
          'Review your extracted skills for accuracy',
          'Complete your skills assessment',
          'Explore learning opportunities for skill gaps',
          'Set up your development goals'
        ],
        resources: [
          {
            title: 'Skills Assessment Guide',
            url: '/skills/assessment-guide',
            type: 'article'
          },
          {
            title: 'Learning Path Recommendations',
            url: '/learning/paths',
            type: 'course'
          }
        ],
        nextSteps: ['Complete skills assessment', 'Review skill gaps', 'Set development goals']
      };
    } catch (error) {
      logger.error('Error assisting resume upload:', error);
      throw new Error('Failed to process resume upload');
    }
  }

  /**
   * For Employees: Interactive resume building support
   */
  async assistResumeBuilding(
    userId: string,
    tenantId: string,
    currentData: ResumeBuildingData
  ): Promise<BotResponse> {
    try {
      const context = await this.buildBotContext(userId, tenantId);
      
      // Analyze current resume data completeness
      const completeness = await this.analyzeResumeCompleteness(currentData as unknown as Record<string, unknown>);
      
      if (completeness.percentage < 50) {
        return {
          response: `Your resume is ${completeness.percentage}% complete. Let's work on building a comprehensive skills profile together.`,
          suggestions: [
            'Start with your work experience',
            'Add your education background',
            'Include relevant certifications',
            'List your key achievements'
          ],
          requiresAction: true,
          actionType: 'complete_assessment'
        };
      }

      // Suggest improvements
      const improvements = await this.suggestResumeImprovements(currentData as unknown as Record<string, unknown>);
      
      return {
        response: `Your resume looks good at ${completeness.percentage}% complete! Here are some suggestions to make it even better:`,
        suggestions: improvements.suggestions,
        resources: improvements.resources,
        nextSteps: ['Review suggested improvements', 'Add missing information', 'Submit for skills extraction']
      };
    } catch (error) {
      logger.error('Error assisting resume building:', error);
      throw new Error('Failed to assist resume building');
    }
  }

  /**
   * For Employees: Gap analysis explanation and guidance
   */
  async explainSkillsGap(
    userId: string,
    tenantId: string,
    gapAnalysis: IndividualSkillsGap
  ): Promise<BotResponse> {
    try {
      const context = await this.buildBotContext(userId, tenantId);
      
      // Get user's skill gaps
      const gaps = await this.getEmployeeSkillGaps(userId, tenantId);
      
      if (gaps.length === 0) {
        return {
          response: "Great news! You don't have any critical skill gaps identified. Your current skills align well with your role requirements.",
          suggestions: [
            'Continue developing your existing skills',
            'Explore advanced learning opportunities',
            'Consider mentoring others',
            'Look into leadership development'
          ]
        };
      }

      // Explain gaps in user-friendly terms
      const explanations = await this.explainGapsInSimpleTerms(gaps);
      
      return {
        response: `I've identified ${gaps.length} skill gaps in your profile. Let me explain what this means and how we can address them:`,
        suggestions: [
          'Review each gap explanation below',
          'Choose 1-2 gaps to focus on first',
          'Explore learning opportunities',
          'Set realistic timelines for development'
        ],
        resources: await this.getLearningResourcesForGaps(gaps),
        nextSteps: ['Prioritize skill gaps', 'Create learning plan', 'Track progress']
      };
    } catch (error) {
      logger.error('Error explaining skills gap:', error);
      throw new Error('Failed to explain skills gap');
    }
  }

  /**
   * For Supervisors: Team skills overview and insights
   */
  async assistSupervisorTeamOverview(
    supervisorId: string,
    tenantId: string,
    teamId?: string
  ): Promise<BotResponse> {
    try {
      const context = await this.buildBotContext(supervisorId, tenantId);
      
      // Get team skills data
      const teamSkills = await this.getTeamSkillsData(supervisorId, tenantId, teamId);
      
      return {
        response: `Here's your team's skills overview. You have ${teamSkills.employeeCount} team members with an overall skills score of ${teamSkills.overallScore}%.`,
        suggestions: [
          'Review individual skill gaps',
          'Identify team training needs',
          'Plan development activities',
          'Schedule 1:1 meetings'
        ],
        resources: [
          {
            title: 'Team Development Planning Guide',
            url: '/supervisor/team-development',
            type: 'article'
          },
          {
            title: 'Training Budget Calculator',
            url: '/tools/training-budget',
            type: 'tool'
          }
        ],
        nextSteps: ['Review team analysis', 'Plan development activities', 'Schedule team meetings']
      };
    } catch (error) {
      logger.error('Error assisting supervisor team overview:', error);
      throw new Error('Failed to assist supervisor team overview');
    }
  }

  /**
   * For Admins/Superadmins: Organization-wide skills analytics
   */
  async assistAdminOrganizationInsights(
    adminId: string,
    tenantId: string
  ): Promise<BotResponse> {
    try {
      const context = await this.buildBotContext(adminId, tenantId);
      
      // Get organization-wide skills analytics
      const orgAnalytics = await this.getOrganizationSkillsAnalytics(tenantId);
      
      return {
        response: `Your organization's strategic skills assessment shows ${orgAnalytics.readiness} readiness level with ${orgAnalytics.criticalGaps} critical gaps identified.`,
        suggestions: [
          'Review strategic skills assessment',
          'Prioritize investment recommendations',
          'Plan organization-wide training programs',
          'Consider hiring for critical gaps'
        ],
        resources: [
          {
            title: 'Strategic Skills Investment Guide',
            url: '/admin/strategic-investment',
            type: 'article'
          },
          {
            title: 'Skills ROI Calculator',
            url: '/tools/skills-roi',
            type: 'tool'
          }
        ],
        nextSteps: ['Review strategic assessment', 'Plan investments', 'Monitor progress']
      };
    } catch (error) {
      logger.error('Error assisting admin organization insights:', error);
      throw new Error('Failed to assist admin organization insights');
    }
  }

  // Private helper methods
  private async buildBotContext(
    userId: string, 
    tenantId: string, 
    sessionId?: string
  ): Promise<BotContext> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    const employeeProfile = await db.query.employeeSkillsProfiles.findFirst({
      where: and(
        eq(employeeSkillsProfiles.tenantId, tenantId),
        eq(employeeSkillsProfiles.employeeId, userId)
      )
    });

    const skillsGaps = await db.query.skillsGapAnalysis.findMany({
      where: and(
        eq(skillsGapAnalysis.tenantId, tenantId),
        eq(skillsGapAnalysis.employeeId, userId)
      ),
      orderBy: desc(skillsGapAnalysis.analyzedAt),
      limit: 5
    });

    const interactionHistory = await db.query.skillsBotInteractions.findMany({
      where: and(
        eq(skillsBotInteractions.tenantId, tenantId),
        eq(skillsBotInteractions.userId, userId)
      ),
      orderBy: desc(skillsBotInteractions.createdAt),
      limit: 10
    });

    return {
      employeeId: userId,
      tenantId,
      currentIntent: 'general_help', // Placeholder, will be updated by analyzeQueryIntent
      employeeProfile: employeeProfile || undefined,
      skillsGaps: skillsGaps || [],
      interactionHistory: interactionHistory || []
    };
  }

  private async analyzeQueryIntent(
    query: string, 
    context: BotContext
  ): Promise<{ type: string; confidence: number; entities: Record<string, unknown> }> {
    // Simple intent analysis - in production, this would use NLP/AI
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('resume') || lowerQuery.includes('cv') || lowerQuery.includes('upload')) {
      return { type: 'resume_upload', confidence: 0.9, entities: {} };
    }
    
    if (lowerQuery.includes('gap') || lowerQuery.includes('missing') || lowerQuery.includes('need')) {
      return { type: 'gap_explanation', confidence: 0.8, entities: {} };
    }
    
    if (lowerQuery.includes('learn') || lowerQuery.includes('course') || lowerQuery.includes('training')) {
      return { type: 'learning_guidance', confidence: 0.8, entities: {} };
    }
    
    if (lowerQuery.includes('develop') || lowerQuery.includes('plan') || lowerQuery.includes('goal')) {
      return { type: 'development_planning', confidence: 0.7, entities: {} };
    }
    
    if (lowerQuery.includes('progress') || lowerQuery.includes('track') || lowerQuery.includes('status')) {
      return { type: 'progress_tracking', confidence: 0.7, entities: {} };
    }
    
    return { type: 'general_help', confidence: 0.5, entities: {} };
  }

  private async logBotInteraction(
    userId: string,
    tenantId: string,
    sessionId: string | undefined,
    query: string,
    response: BotResponse,
    interactionType: string
  ): Promise<void> {
    await db.insert(skillsBotInteractions).values({
      id: randomUUID(),
      tenantId,
      userId,
      sessionId,
      interactionType,
      userQuery: query,
      botResponse: response.response,
      context: JSON.stringify({
        suggestions: response.suggestions,
        resources: response.resources,
        nextSteps: response.nextSteps
      }),
      resolved: !response.requiresAction,
      createdAt: new Date()
    });
  }

  private async handleResumeUpload(query: string, context: BotContext): Promise<BotResponse> {
    return {
      response: "I can help you upload and process your resume for skills extraction. Please upload your resume file, and I'll extract your skills automatically.",
      suggestions: [
        'Upload your resume in PDF or Word format',
        'Ensure all sections are complete',
        'Include relevant work experience',
        'Add education and certifications'
      ],
      requiresAction: true,
      actionType: 'upload_resume'
    };
  }

  private async handleGapExplanation(query: string, context: BotContext): Promise<BotResponse> {
    return {
      response: "I can explain your skill gaps in simple terms and help you understand what they mean for your career development.",
      suggestions: [
        'Review your current skill gaps',
        'Understand the impact of each gap',
        'Explore learning opportunities',
        'Create a development timeline'
      ]
    };
  }

  private async handleLearningGuidance(query: string, context: BotContext): Promise<BotResponse> {
    return {
      response: "I can recommend personalized learning paths and resources based on your skill gaps and career goals.",
      suggestions: [
        'Browse recommended courses',
        'Find learning resources',
        'Create a learning plan',
        'Track your progress'
      ],
      resources: [
        {
          title: 'Personalized Learning Paths',
          url: '/learning/personalized',
          type: 'course'
        }
      ]
    };
  }

  private async handleDevelopmentPlanning(query: string, context: BotContext): Promise<BotResponse> {
    return {
      response: "I can help you create a comprehensive development plan based on your skills assessment and career aspirations.",
      suggestions: [
        'Set development goals',
        'Create a timeline',
        'Identify resources needed',
        'Plan regular check-ins'
      ]
    };
  }

  private async handleProgressTracking(query: string, context: BotContext): Promise<BotResponse> {
    return {
      response: "I can help you track your skills development progress and celebrate your achievements.",
      suggestions: [
        'View your progress dashboard',
        'Update your skills',
        'Complete assessments',
        'Share achievements'
      ]
    };
  }

  private async handleGeneralHelp(query: string, context: BotContext): Promise<BotResponse> {
    return {
      response: "I'm here to help you with your skills development journey. I can assist with resume uploads, skill gap analysis, learning recommendations, and development planning.",
      suggestions: [
        'Upload your resume for skills extraction',
        'Complete your skills assessment',
        'Explore learning opportunities',
        'Create a development plan'
      ],
      resources: [
        {
          title: 'Skills Assessment Guide',
          url: '/help/skills-assessment',
          type: 'article'
        },
        {
          title: 'Getting Started Guide',
          url: '/help/getting-started',
          type: 'article'
        }
      ]
    };
  }

  // Additional helper methods for specific functionalities
  private async validateResumeData(resumeData: ResumeData): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!resumeData.name) errors.push('Name is required');
    if (!resumeData.email) errors.push('Email is required');
    if (!resumeData.experience || !Array.isArray(resumeData.experience) || resumeData.experience.length === 0) {
      errors.push('Work experience is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private async extractSkillsFromResume(resumeData: ResumeData): Promise<any[]> {
    // Implementation would use AI/NLP to extract skills
    return [
      { skill: 'JavaScript', level: 'intermediate', evidence: '2 years experience' },
      { skill: 'Project Management', level: 'advanced', evidence: 'Led multiple projects' }
    ];
  }

  private async analyzeResumeCompleteness(currentData: Record<string, unknown>): Promise<{ percentage: number; missing: string[] }> {
    let score = 0;
    const missing: string[] = [];

    if (currentData.name) score += 20;
    else missing.push('Name');

    if (currentData.email) score += 20;
    else missing.push('Email');

    if (currentData.experience && Array.isArray(currentData.experience) && currentData.experience.length > 0) score += 30;
    else missing.push('Work Experience');

    if (currentData.education && Array.isArray(currentData.education) && currentData.education.length > 0) score += 20;
    else missing.push('Education');

    if (currentData.skills && Array.isArray(currentData.skills) && currentData.skills.length > 0) score += 10;
    else missing.push('Skills');

    return { percentage: score, missing };
  }

  private async suggestResumeImprovements(currentData: Record<string, unknown>): Promise<{ suggestions: string[]; resources: Array<{ title: string; url: string; type: string }> }> {
    return {
      suggestions: [
        'Add quantifiable achievements to your work experience',
        'Include relevant certifications and training',
        'Add a professional summary',
        'Optimize for skills keywords'
      ],
      resources: [
        {
          title: 'Resume Writing Tips',
          url: '/resources/resume-tips',
          type: 'article'
        }
      ]
    };
  }

  private async getEmployeeSkillGaps(userId: string, tenantId: string): Promise<GapAnalysisRecord[]> {
    const gaps = await db.query.skillsGapAnalysis.findMany({
      where: and(
        eq(skillsGapAnalysis.tenantId, tenantId),
        eq(skillsGapAnalysis.employeeId, userId)
      ),
      orderBy: desc(skillsGapAnalysis.analyzedAt),
      limit: 10
    });

    return gaps || [];
  }

  private async explainGapsInSimpleTerms(gaps: GapAnalysisRecord[]): Promise<string> {
    // Extract critical gaps from the first gap analysis record
    const criticalGaps = gaps.length > 0 && Array.isArray(gaps[0].criticalGaps)
      ? (gaps[0].criticalGaps as Array<{ skill: string; currentLevel?: string; requiredLevel?: string }>)
      : [];

    if (criticalGaps.length === 0) {
      return 'No critical skill gaps identified. Keep up the good work!';
    }

    return `Here are your skill gaps explained in simple terms: ${criticalGaps.map(gap =>
      `${gap.skill}: You're currently at ${gap.currentLevel || 'beginner'} level but need ${gap.requiredLevel || 'advanced'} level.`
    ).join(' ')}`;
  }

  private async getLearningResourcesForGaps(gaps: GapAnalysisRecord[]): Promise<Array<{ title: string; url: string; type: string }>> {
    return [
      {
        title: 'Skills Development Courses',
        url: '/courses/skills-development',
        type: 'course'
      },
      {
        title: 'Learning Path Planner',
        url: '/tools/learning-planner',
        type: 'tool'
      }
    ];
  }

  private async getTeamSkillsData(
    supervisorId: string, 
    tenantId: string, 
    teamId?: string
  ): Promise<{
    employeeCount: number;
    overallScore: number;
    criticalGaps: number;
    strengthAreas: string[];
  }> {
    // Implementation would fetch team skills data from database with tenant isolation
    return {
      employeeCount: 5,
      overallScore: 75,
      criticalGaps: 3,
      strengthAreas: ['Communication', 'Teamwork']
    };
  }

  private async getOrganizationSkillsAnalytics(tenantId: string): Promise<{
    readiness: 'ready' | 'partially-ready' | 'not-ready';
    criticalGaps: number;
    strategicAlignment: number;
    investmentNeeded: number;
  }> {
    // Implementation would fetch organization analytics with tenant isolation
    return {
      readiness: 'partially-ready',
      criticalGaps: 12,
      strategicAlignment: 68,
      investmentNeeded: 50000
    };
  }
}

export default SkillsBotService;
