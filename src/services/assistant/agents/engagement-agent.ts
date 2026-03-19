import { BaseAgent, AgentContext, AgentResponse } from './base-agent';
import { db } from '../../../db/index';
import { gamificationPoints, badgeAwards, challenges, challengeParticipations } from '../../../db/schema';
import { eq, and, sql } from 'drizzle-orm';

export class EngagementAgent extends BaseAgent {
  readonly name = 'engagement-agent';
  readonly description = 'Handles engagement surveys, recognition, gamification, challenges, and leaderboards';
  protected preferredEngine: 'knowledge' | 'reasoning' | 'data' = 'knowledge';

  protected getSystemPrompt(context: AgentContext): string {
    return `You are the Engagement & Recognition Specialist of the Mizan HR Intelligence Platform.
You drive employee engagement through recognition, gamification, and pulse surveys.

Capabilities:
- Help employees recognize colleagues (kudos, shoutouts, value champion awards)
- Explain active challenges and how to participate
- Show points balance, badges, and leaderboard standings
- For managers: interpret pulse survey results and engagement trends

Be enthusiastic and positive. Use provided data for personalized engagement.`;
  }

  protected async buildDomainContext(context: AgentContext): Promise<string> {
    try {
      const [pointsResult, badges, activeChallenges] = await Promise.all([
        db.select({ total: sql<number>`COALESCE(SUM(${gamificationPoints.points}), 0)` })
          .from(gamificationPoints).where(and(eq(gamificationPoints.userId, context.userId), eq(gamificationPoints.tenantId, context.tenantId))),
        db.select().from(badgeAwards).where(and(eq(badgeAwards.userId, context.userId), eq(badgeAwards.tenantId, context.tenantId))),
        db.select().from(challenges).where(and(eq(challenges.tenantId, context.tenantId), eq(challenges.status, 'active'))),
      ]);
      const parts: string[] = [];
      parts.push(`Your points: ${pointsResult[0]?.total || 0}`);
      parts.push(`Badges earned: ${badges.length}`);
      parts.push(`Active challenges: ${activeChallenges.length}`);
      for (const ch of activeChallenges.slice(0, 3)) {
        parts.push(`  - "${ch.title}" (value: ${ch.companyValue}, reward: ${ch.pointsReward} pts)`);
      }
      parts.push(`User role: ${context.userRole}`);
      return parts.join('\n');
    } catch (error) {
      console.error('[EngagementAgent] Context error:', (error as Error).message);
      return `User role: ${context.userRole}. Engagement module available.`;
    }
  }

  protected getSuggestedActions(userRole: string): AgentResponse['suggestedActions'] {
    const actions: AgentResponse['suggestedActions'] = [
      { id: 'send_recognition', label: 'Recognize Someone', type: 'action' },
      { id: 'view_challenges', label: 'Active Challenges', type: 'navigate' },
      { id: 'view_leaderboard', label: 'Leaderboard', type: 'navigate' },
      { id: 'my_badges', label: 'My Badges', type: 'navigate' },
    ];
    if (['manager', 'admin'].includes(userRole)) {
      actions.push({ id: 'survey_results', label: 'Survey Results', type: 'navigate' });
    }
    return actions;
  }
}
