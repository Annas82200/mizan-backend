/**
 * One-on-One Meeting BOT
 *
 * AI assistant that helps employees and managers with:
 * - Scheduling 1:1 meetings
 * - Preparing for meetings (both employee and manager)
 * - Facilitating quarterly evaluation meetings
 * - Documenting meeting outcomes
 * - Feeding insights to Engagement and Recognition agents
 */

import { db } from '../../../../db/index.js';
import { oneOnOneMeetings, performanceGoals, performanceFeedback } from '../../../../db/schema/performance.js';
import { employeeProfiles } from '../../../../db/schema/core.js';
import { eq, and, gte } from 'drizzle-orm';
import { EnsembleAI } from '../../../ai-providers/ensemble.js';

interface OneOnOneSession {
  sessionId: string;
  meetingId: string;
  userId: string;
  userRole: 'employee' | 'manager';
  conversationHistory: Array<{ role: string; content: string }>;
  preparationData: any;
  agendaItems: any[];
}

export class OneOnOneBot {
  private ensemble: EnsembleAI;
  private tenantId: string;
  private sessions: Map<string, OneOnOneSession> = new Map();

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.ensemble = new EnsembleAI({
      strategy: 'weighted',
      providers: ['claude', 'gpt-4', 'gemini']
    });
  }

  /**
   * Schedule a new 1:1 meeting
   */
  async scheduleMeeting(params: {
    employeeId: string;
    managerId: string;
    performanceCycleId?: string;
    scheduledDate: Date;
    duration?: number;
    meetingType?: string;
    createdBy: string;
  }): Promise<{
    meetingId: string;
    suggestions: string[];
    preparationTips: string[];
  }> {
    // Get employee and manager information
    const [employee, manager] = await Promise.all([
      db.query.employeeProfiles.findFirst({ where: (profiles, { eq }) => eq(profiles.id, params.employeeId) }),
      db.query.employeeProfiles.findFirst({ where: (profiles, { eq }) => eq(profiles.id, params.managerId) })
    ]);

    // Get recent goals and performance data
    const recentGoals = await db.query.performanceGoals.findMany({
      where: and(
        eq(performanceGoals.tenantId, this.tenantId),
        eq(performanceGoals.employeeId, params.employeeId)
      ),
      limit: 10
    });

    // Generate meeting suggestions using AI
    const suggestions = await this.generateMeetingSuggestions(employee, manager, recentGoals);

    // Create the meeting
    const [meeting] = await db.insert(oneOnOneMeetings).values({
      tenantId: this.tenantId,
      employeeId: params.employeeId,
      managerId: params.managerId,
      performanceCycleId: params.performanceCycleId,
      title: params.meetingType === 'quarterly_evaluation'
        ? 'Quarterly Performance Evaluation'
        : '1:1 Check-in',
      meetingType: params.meetingType || 'regular',
      scheduledDate: params.scheduledDate,
      duration: params.duration || 30,
      status: 'scheduled',
      botAssisted: true,
      suggestedTopics: suggestions.topics,
      createdBy: params.createdBy,
      updatedBy: params.createdBy
    }).returning();

    return {
      meetingId: meeting.id,
      suggestions: suggestions.topics.map((t: any) => t.topic),
      preparationTips: suggestions.preparationTips
    };
  }

  /**
   * Generate meeting suggestions based on context
   */
  private async generateMeetingSuggestions(
    employee: any,
    manager: any,
    recentGoals: any[]
  ): Promise<any> {
    const prompt = `Generate discussion topics and preparation tips for a 1:1 meeting.

    Employee ID: ${employee?.id}
    Employee Department: ${employee?.departmentId}

    Manager ID: ${manager?.id}

    Recent Goals:
    ${recentGoals.map(g => `- ${g.title} (${g.status}, ${g.progressPercentage}% complete)`).join('\n')}

    Generate:
    1. 5-7 relevant discussion topics based on goals and recent work
    2. Preparation tips for both employee and manager
    3. Questions the employee should be ready to answer
    4. Questions the manager should ask

    Return as JSON with structure:
    {
      "topics": [{ "topic": "...", "why": "...", "priority": "high|medium|low" }],
      "preparationTips": ["...", "..."],
      "employeeQuestions": ["...", "..."],
      "managerQuestions": ["...", "..."]
    }`;

    const response = await this.ensemble.call({
      agent: 'Performance',
      engine: 'reasoning',
      tenantId: this.tenantId,
      prompt
    });

    try {
      const result = typeof response === 'string' ? response : (response as any).result || response;
      return JSON.parse(result || '{}');
    } catch {
      return {
        topics: [],
        preparationTips: [],
        employeeQuestions: [],
        managerQuestions: []
      };
    }
  }

  /**
   * Start a preparation session for employee or manager
   */
  async startPreparation(
    meetingId: string,
    userId: string,
    userRole: 'employee' | 'manager'
  ): Promise<{
    sessionId: string;
    greeting: string;
    suggestedTopics: any[];
    preparationChecklist: string[];
  }> {
    const sessionId = `prep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get meeting details
    const meeting = await db.query.oneOnOneMeetings.findFirst({
      where: eq(oneOnOneMeetings.id, meetingId)
    });

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    // Get relevant context
    const goals = await db.query.performanceGoals.findMany({
      where: and(
        eq(performanceGoals.tenantId, this.tenantId),
        eq(performanceGoals.employeeId, meeting.employeeId)
      )
    });

    const recentFeedback = await db.query.performanceFeedback.findMany({
      where: and(
        eq(performanceFeedback.tenantId, this.tenantId),
        eq(performanceFeedback.employeeId, meeting.employeeId)
      ),
      limit: 5
    });

    // Generate personalized preparation guidance
    const preparationData = await this.generatePreparationGuidance(
      meeting,
      userRole,
      goals,
      recentFeedback
    );

    // Create session
    const session: OneOnOneSession = {
      sessionId,
      meetingId,
      userId,
      userRole,
      conversationHistory: [],
      preparationData,
      agendaItems: []
    };

    this.sessions.set(sessionId, session);

    const greeting = userRole === 'employee'
      ? `Hi! I'm here to help you prepare for your 1:1 with your manager. Let's make sure you get the most out of this conversation.`
      : `Hi! Let's prepare for your 1:1 with your team member. I'll help you create a productive and supportive conversation.`;

    return {
      sessionId,
      greeting,
      suggestedTopics: meeting.suggestedTopics as any[] || [],
      preparationChecklist: preparationData.checklist || []
    };
  }

  /**
   * Generate preparation guidance
   */
  private async generatePreparationGuidance(
    meeting: any,
    userRole: 'employee' | 'manager',
    goals: any[],
    recentFeedback: any[]
  ): Promise<any> {
    const prompt = `Generate preparation guidance for a ${userRole} before a 1:1 meeting.

    Meeting Type: ${meeting.meetingType}

    Employee Goals:
    ${goals.map(g => `- ${g.title}: ${g.status}, ${g.progressPercentage}% complete`).join('\n')}

    Recent Feedback:
    ${recentFeedback.map(f => `- ${f.type}: ${f.title}`).join('\n')}

    ${userRole === 'employee' ? `
    For the EMPLOYEE, provide:
    1. Key points to discuss about their progress
    2. Challenges or blockers to raise
    3. Questions to ask their manager
    4. Professional development topics to bring up
    5. Preparation checklist
    ` : `
    For the MANAGER, provide:
    1. Key points to discuss with the employee
    2. Coaching opportunities to explore
    3. Recognition moments to highlight
    4. Development areas to address constructively
    5. Questions to ask to understand employee needs
    6. Preparation checklist
    `}

    Return as JSON with structure matching the role.`;

    const response = await this.ensemble.call({
      agent: 'Performance',
      engine: 'reasoning',
      tenantId: this.tenantId,
      prompt
    });

    try {
      const result = typeof response === 'string' ? response : (response as any).result || response;
      return JSON.parse(result || '{}');
    } catch {
      return { checklist: [] };
    }
  }

  /**
   * Chat during preparation
   */
  async chatPreparation(
    sessionId: string,
    message: string
  ): Promise<{
    response: string;
    updatedChecklist?: string[];
    agendaItems?: any[];
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Add message to history
    session.conversationHistory.push({ role: 'user', content: message });

    // Get meeting context
    const meeting = await db.query.oneOnOneMeetings.findFirst({
      where: eq(oneOnOneMeetings.id, session.meetingId)
    });

    // Generate contextual response
    const prompt = `You are helping a ${session.userRole} prepare for a 1:1 meeting.

    Conversation History:
    ${session.conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}

    Meeting Context:
    ${JSON.stringify(meeting, null, 2)}

    Preparation Data:
    ${JSON.stringify(session.preparationData, null, 2)}

    User said: "${message}"

    Provide a helpful, supportive response that:
    1. Addresses their question or concern
    2. Offers specific, actionable advice
    3. Encourages productive conversation
    4. Maintains professional tone

    Also extract any new agenda items mentioned and add to the list.

    Return as JSON:
    {
      "response": "...",
      "newAgendaItems": [...],
      "updatedChecklist": [...]
    }`;

    const response = await this.ensemble.call({
      agent: 'Performance',
      engine: 'reasoning',
      tenantId: this.tenantId,
      prompt
    });

    try {
      const responseResult = typeof response === 'string' ? response : (response as any).result || response;
      const result = JSON.parse(responseResult || '{}');

      // Update session
      session.conversationHistory.push({ role: 'assistant', content: result.response });
      if (result.newAgendaItems) {
        session.agendaItems.push(...result.newAgendaItems);
      }

      return {
        response: result.response,
        updatedChecklist: result.updatedChecklist,
        agendaItems: session.agendaItems
      };
    } catch {
      return {
        response: 'I understand. Let me help you with that...',
        agendaItems: session.agendaItems
      };
    }
  }

  /**
   * Complete preparation and update meeting
   */
  async completePreparation(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const updateData = session.userRole === 'employee' ? {
      employeePreparationNotes: session.conversationHistory.map(m => m.content).join('\n'),
      employeePrepared: true,
      employeeTopics: session.agendaItems
    } : {
      managerPreparationNotes: session.conversationHistory.map(m => m.content).join('\n'),
      managerPrepared: true,
      managerTopics: session.agendaItems
    };

    await db.update(oneOnOneMeetings)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(oneOnOneMeetings.id, session.meetingId));

    // Clean up session
    this.sessions.delete(sessionId);
  }

  /**
   * Document meeting after it's completed
   */
  async documentMeeting(params: {
    meetingId: string;
    actualStartTime: Date;
    actualEndTime: Date;
    meetingNotes?: string;
    employeeNotes?: string;
    managerNotes?: string;
    discussionPoints?: any[];
    actionItems?: any[];
    decisions?: any[];
    documentedBy: string;
  }): Promise<{
    feedbackToEngagement: any;
    feedbackToRecognition: any;
  }> {
    // Get meeting
    const meeting = await db.query.oneOnOneMeetings.findFirst({
      where: eq(oneOnOneMeetings.id, params.meetingId)
    });

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    // Analyze meeting content to extract insights
    const insights = await this.analyzeMeetingInsights({
      ...meeting,
      ...params
    });

    // Update meeting with documentation
    await db.update(oneOnOneMeetings)
      .set({
        status: 'completed',
        actualStartTime: params.actualStartTime,
        actualEndTime: params.actualEndTime,
        meetingNotes: params.meetingNotes,
        employeeNotes: params.employeeNotes,
        managerNotes: params.managerNotes,
        keyDiscussionPoints: params.discussionPoints || [],
        actionItems: params.actionItems || [],
        decisions: params.decisions || [],
        meetingOutcome: insights.outcome,
        feedbackToEngagement: insights.engagementData,
        feedbackToRecognition: insights.recognitionData,
        developmentNeeds: insights.developmentNeeds,
        wellbeingIndicators: insights.wellbeingIndicators,
        updatedBy: params.documentedBy,
        updatedAt: new Date()
      })
      .where(eq(oneOnOneMeetings.id, params.meetingId));

    return {
      feedbackToEngagement: insights.engagementData,
      feedbackToRecognition: insights.recognitionData
    };
  }

  /**
   * Analyze meeting to extract insights for other agents
   */
  private async analyzeMeetingInsights(meetingData: any): Promise<any> {
    const prompt = `Analyze this 1:1 meeting to extract insights for Engagement and Recognition agents.

    Meeting Data:
    ${JSON.stringify(meetingData, null, 2)}

    Extract:

    1. ENGAGEMENT INDICATORS:
       - Employee sentiment (positive/neutral/negative)
       - Engagement level (high/medium/low)
       - Concerns or red flags
       - Team dynamics insights
       - Work-life balance signals
       - Cultural alignment

    2. RECOGNITION OPPORTUNITIES:
       - Achievements to celebrate
       - Wins to recognize publicly
       - Behaviors that exemplify values
       - Peer recognition suggestions
       - Milestone achievements

    3. DEVELOPMENT NEEDS:
       - Skills to develop
       - Learning opportunities
       - Coaching needs
       - Career growth areas

    4. WELLBEING INDICATORS:
       - Stress levels
       - Workload concerns
       - Support needed
       - Health/wellness signals

    5. MEETING OUTCOME:
       - Summary of key takeaways
       - Overall effectiveness
       - Action items priority

    Return as structured JSON.`;

    const response = await this.ensemble.call({
      agent: 'Performance',
      engine: 'reasoning',
      tenantId: this.tenantId,
      prompt
    });

    try {
      const result = typeof response === 'string' ? response : (response as any).result || response;
      return JSON.parse(result || '{}');
    } catch {
      return {
        engagementData: {},
        recognitionData: {},
        developmentNeeds: [],
        wellbeingIndicators: {},
        outcome: 'Meeting completed successfully'
      };
    }
  }

  /**
   * Get meeting preparation status
   */
  async getPreparationStatus(meetingId: string): Promise<{
    employeePrepared: boolean;
    managerPrepared: boolean;
    bothPrepared: boolean;
    readinessScore: number;
  }> {
    const meeting = await db.query.oneOnOneMeetings.findFirst({
      where: eq(oneOnOneMeetings.id, meetingId)
    });

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    const employeePrepared = meeting.employeePrepared || false;
    const managerPrepared = meeting.managerPrepared || false;
    const bothPrepared = employeePrepared && managerPrepared;

    let readinessScore = 0;
    if (employeePrepared) readinessScore += 40;
    if (managerPrepared) readinessScore += 40;
    if (meeting.agenda && (meeting.agenda as any[]).length > 0) readinessScore += 20;

    return {
      employeePrepared,
      managerPrepared,
      bothPrepared,
      readinessScore
    };
  }

  /**
   * Get upcoming meetings for an employee or manager
   */
  async getUpcomingMeetings(userId: string, role: 'employee' | 'manager'): Promise<any[]> {
    const whereCondition = role === 'employee'
      ? eq(oneOnOneMeetings.employeeId, userId)
      : eq(oneOnOneMeetings.managerId, userId);

    return db.query.oneOnOneMeetings.findMany({
      where: and(
        whereCondition,
        eq(oneOnOneMeetings.status, 'scheduled'),
        gte(oneOnOneMeetings.scheduledDate, new Date())
      ),
      orderBy: (meetings, { asc }) => [asc(meetings.scheduledDate)]
    });
  }
}
