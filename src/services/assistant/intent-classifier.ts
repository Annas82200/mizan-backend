// @ts-nocheck
/**
 * Intent Classifier — Powered by Mistral (fast + cheap)
 *
 * First step in every AI Assistant interaction.
 * Classifies user intent and routes to the appropriate specialized agent.
 */

import { KnowledgeEngine } from '../ai-engines/engines/knowledge-engine';

export type AssistantIntent =
  | 'SKILLS_QUERY'
  | 'PERFORMANCE_QUERY'
  | 'LEARNING_QUERY'
  | 'HIRING_QUERY'
  | 'CULTURE_QUERY'
  | 'BONUS_QUERY'
  | 'ONBOARDING_QUERY'
  | 'ENGAGEMENT_QUERY'
  | 'POLICY_LOOKUP'
  | 'ACTION_REQUEST'
  | 'ANALYTICS_REQUEST'
  | 'GENERAL_CHAT';

export interface ClassificationResult {
  intent: AssistantIntent;
  confidence: number;
  entities: Record<string, string>; // extracted entities (employee name, department, date, etc.)
  suggestedAgent: string;
}

const INTENT_TO_AGENT: Record<AssistantIntent, string> = {
  SKILLS_QUERY: 'skills-agent',
  PERFORMANCE_QUERY: 'performance-agent',
  LEARNING_QUERY: 'lxp-agent',
  HIRING_QUERY: 'hiring-agent',
  CULTURE_QUERY: 'culture-agent',
  BONUS_QUERY: 'bonus-agent',
  ONBOARDING_QUERY: 'onboarding-agent',
  ENGAGEMENT_QUERY: 'engagement-agent',
  POLICY_LOOKUP: 'general-agent',
  ACTION_REQUEST: 'action-agent',
  ANALYTICS_REQUEST: 'analytics-agent',
  GENERAL_CHAT: 'general-agent',
};

export class IntentClassifier {
  private knowledgeEngine: KnowledgeEngine;

  constructor() {
    this.knowledgeEngine = new KnowledgeEngine();
  }

  /**
   * Classify a user message into an intent category
   */
  async classify(message: string, tenantId: string, conversationHistory?: string[]): Promise<ClassificationResult> {
    // Include recent conversation context for better classification of follow-up messages
    const contextualMessage = conversationHistory && conversationHistory.length > 0
      ? `Recent conversation:\n${conversationHistory.slice(-3).join('\n')}\n\nLatest message: ${message}`
      : message;

    const result = await this.knowledgeEngine.classifyIntent(contextualMessage, tenantId);

    const intent = (result.intent as AssistantIntent) || 'GENERAL_CHAT';

    return {
      intent,
      confidence: result.confidence,
      entities: {},
      suggestedAgent: INTENT_TO_AGENT[intent] || 'general-agent',
    };
  }

  /**
   * Quick classification without AI call — uses keyword matching as fast path
   */
  classifyQuick(message: string): ClassificationResult | null {
    const lower = message.toLowerCase();

    const patterns: Array<{ keywords: string[]; intent: AssistantIntent }> = [
      { keywords: ['skill', 'competency', 'gap analysis', 'upskill'], intent: 'SKILLS_QUERY' },
      { keywords: ['performance', 'goal', 'evaluation', 'review', 'kpi'], intent: 'PERFORMANCE_QUERY' },
      { keywords: ['learn', 'course', 'training', 'certificate', 'tutorial'], intent: 'LEARNING_QUERY' },
      { keywords: ['hire', 'candidate', 'recruit', 'interview', 'job posting'], intent: 'HIRING_QUERY' },
      { keywords: ['culture', 'values', 'entropy', 'engagement survey', 'cylinder'], intent: 'CULTURE_QUERY' },
      { keywords: ['bonus', 'compensation', 'salary', 'pay', 'incentive'], intent: 'BONUS_QUERY' },
      { keywords: ['onboard', 'new hire', 'checklist', 'first day', 'orientation'], intent: 'ONBOARDING_QUERY' },
      { keywords: ['badge', 'points', 'leaderboard', 'challenge', 'recognition'], intent: 'ENGAGEMENT_QUERY' },
      { keywords: ['policy', 'handbook', 'pto', 'leave', 'procedure', 'rule'], intent: 'POLICY_LOOKUP' },
      { keywords: ['send email', 'schedule', 'remind', 'approve', 'create task'], intent: 'ACTION_REQUEST' },
      { keywords: ['report', 'analytics', 'dashboard', 'metric', 'trend'], intent: 'ANALYTICS_REQUEST' },
    ];

    for (const { keywords, intent } of patterns) {
      if (keywords.some(kw => lower.includes(kw))) {
        return {
          intent,
          confidence: 0.7, // Quick classification has lower confidence
          entities: {},
          suggestedAgent: INTENT_TO_AGENT[intent],
        };
      }
    }

    return null; // No quick match — needs AI classification
  }
}
