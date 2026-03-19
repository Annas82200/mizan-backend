/**
 * Conversation Manager — Manages chat sessions, context, and memory
 *
 * Short-term memory: Redis (last N messages for active conversations)
 * Long-term memory: PostgreSQL (full conversation history, searchable)
 */

import { db } from '../../../db/index';
import { conversations, messages, conversationContexts } from '../../../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getRedisClient } from '../../infrastructure/redis';

const CONTEXT_WINDOW_SIZE = 10; // Last N messages kept in short-term memory
const CACHE_TTL = 3600; // 1 hour

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  intent?: string;
  agentUsed?: string;
  timestamp: Date;
}

export class ConversationManager {
  /**
   * Get or create a conversation for a user
   */
  async getOrCreateConversation(tenantId: string, userId: string, conversationId?: string): Promise<string> {
    if (conversationId) {
      // Verify the conversation belongs to this user
      const existing = await db
        .select()
        .from(conversations)
        .where(and(
          eq(conversations.id, conversationId),
          eq(conversations.tenantId, tenantId),
          eq(conversations.userId, userId)
        ))
        .limit(1);

      if (existing.length > 0) return conversationId;
    }

    // Create new conversation
    const [created] = await db
      .insert(conversations)
      .values({ tenantId, userId, status: 'active' })
      .returning();

    return created.id;
  }

  /**
   * Add a message to a conversation (persists to DB + Redis cache)
   */
  async addMessage(params: {
    conversationId: string;
    tenantId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    intent?: string;
    agentUsed?: string;
    engineUsed?: string;
    tokensUsed?: number;
    latencyMs?: number;
    suggestedActions?: unknown[];
  }): Promise<string> {
    const [message] = await db
      .insert(messages)
      .values({
        conversationId: params.conversationId,
        tenantId: params.tenantId,
        role: params.role,
        content: params.content,
        intent: params.intent,
        agentUsed: params.agentUsed,
        engineUsed: params.engineUsed,
        tokensUsed: params.tokensUsed,
        latencyMs: params.latencyMs,
        suggestedActions: params.suggestedActions || [],
      })
      .returning();

    // Update conversation metadata (atomic increment, no full table scan)
    await db
      .update(conversations)
      .set({
        lastMessageAt: new Date(),
        messageCount: sql`COALESCE(${conversations.messageCount}, 0) + 1`,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, params.conversationId));

    // Update Redis cache with latest messages
    await this.updateContextCache(params.conversationId, params.tenantId);

    return message.id;
  }

  /**
   * Get the recent conversation context (for AI prompt building)
   */
  async getContext(conversationId: string, tenantId: string): Promise<ConversationMessage[]> {
    const redis = getRedisClient();
    const cacheKey = `conv:${conversationId}:context`;

    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from DB
    const recentMessages = await db
      .select()
      .from(messages)
      .where(and(
        eq(messages.conversationId, conversationId),
        eq(messages.tenantId, tenantId)
      ))
      .orderBy(desc(messages.createdAt))
      .limit(CONTEXT_WINDOW_SIZE);

    const context: ConversationMessage[] = recentMessages.reverse().map(m => ({
      role: m.role,
      content: m.content,
      intent: m.intent || undefined,
      agentUsed: m.agentUsed || undefined,
      timestamp: m.createdAt,
    }));

    // Cache for quick access
    await redis.set(cacheKey, JSON.stringify(context), 'EX', CACHE_TTL);

    return context;
  }

  /**
   * Build a context string for AI prompt (includes conversation history + user context)
   */
  async buildPromptContext(conversationId: string, tenantId: string, userId: string): Promise<string> {
    const recentMessages = await this.getContext(conversationId, tenantId);

    // Get any stored context data (user profile, recent activity, etc.)
    const contexts = await db
      .select()
      .from(conversationContexts)
      .where(and(
        eq(conversationContexts.conversationId, conversationId),
        eq(conversationContexts.tenantId, tenantId)
      ));

    let promptContext = '';

    // Add user context data
    for (const ctx of contexts) {
      promptContext += `[${ctx.contextType}]: ${JSON.stringify(ctx.contextData)}\n`;
    }

    // Add conversation history
    if (recentMessages.length > 0) {
      promptContext += '\nConversation history:\n';
      for (const msg of recentMessages) {
        promptContext += `${msg.role}: ${msg.content}\n`;
      }
    }

    return promptContext;
  }

  /**
   * List conversations for a user
   */
  async listConversations(tenantId: string, userId: string, limit: number = 20) {
    return db
      .select()
      .from(conversations)
      .where(and(
        eq(conversations.tenantId, tenantId),
        eq(conversations.userId, userId),
        eq(conversations.status, 'active')
      ))
      .orderBy(desc(conversations.lastMessageAt))
      .limit(limit);
  }

  /**
   * Store context data for a conversation (e.g., user's current module, recent activity)
   */
  async setContext(conversationId: string, tenantId: string, contextType: string, data: unknown): Promise<void> {
    await db
      .insert(conversationContexts)
      .values({
        conversationId,
        tenantId,
        contextType,
        contextData: data,
      });
  }

  private async updateContextCache(conversationId: string, tenantId: string): Promise<void> {
    const redis = getRedisClient();
    const cacheKey = `conv:${conversationId}:context`;
    await redis.del(cacheKey); // Invalidate — will be rebuilt on next getContext call
  }
}
