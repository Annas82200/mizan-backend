// @ts-nocheck
import { BaseAgent, AgentContext, AgentResponse } from './base-agent';
import { db } from '../../../../db/index';
import { developmentPlans } from '../../../../db/schema';
import { eq, and } from 'drizzle-orm';

export class LxpAgent extends BaseAgent {
  readonly name = 'lxp-agent';
  readonly description = 'Handles learning recommendations, course discovery, and progress tracking';
  protected preferredEngine: 'knowledge' | 'reasoning' | 'data' = 'knowledge';

  protected getSystemPrompt(context: AgentContext): string {
    return `You are the Learning Experience Specialist of the Mizan HR Intelligence Platform.
You help employees discover courses, track learning progress, and build skill development paths.

Capabilities:
- Recommend courses based on skill gaps and career goals
- Explain learning paths and how they connect to career progression
- Track and report on learning progress and certifications
- Suggest optimal learning strategies (spaced repetition, micro-learning)
- Create AI-generated adaptive courses

Be encouraging. Use provided data context for personalized recommendations.`;
  }

  protected async buildDomainContext(context: AgentContext): Promise<string> {
    try {
      const plans = await db.select().from(developmentPlans)
        .where(and(eq(developmentPlans.employeeId, context.userId), eq(developmentPlans.tenantId, context.tenantId)));

      const parts: string[] = [];
      const activePlans = plans.filter(p => p.status !== 'completed');
      parts.push(`Active development plans: ${activePlans.length}`);
      for (const plan of activePlans.slice(0, 3)) {
        const activities = (plan.learningActivities as Array<{ title: string; status: string }>) || [];
        const completed = activities.filter(a => a.status === 'completed').length;
        parts.push(`  - "${plan.title}": ${completed}/${activities.length} activities done, target: ${plan.targetRole || 'growth'}`);
      }
      parts.push(`User role: ${context.userRole}`);
      return parts.join('\n');
    } catch (error) {
      console.error('[LxpAgent] Context error:', (error as Error).message);
      return `User role: ${context.userRole}. LXP module with AI-generated courses available.`;
    }
  }

  protected getSuggestedActions(userRole: string): AgentResponse['suggestedActions'] {
    const actions: AgentResponse['suggestedActions'] = [
      { id: 'browse_courses', label: 'Browse Courses', type: 'navigate' },
      { id: 'my_learning', label: 'My Progress', type: 'navigate' },
      { id: 'recommendations', label: 'Recommended For Me', type: 'navigate' },
    ];
    if (['manager', 'admin'].includes(userRole)) {
      actions.push({ id: 'team_learning', label: 'Team Learning Report', type: 'report' });
    }
    return actions;
  }
}
