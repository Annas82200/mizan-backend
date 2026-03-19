import { BaseAgent, AgentContext, AgentResponse } from './base-agent';
import { db } from '../../../../db/index';
import { employees, moduleConfigs } from '../../../../db/schema';
import { eq, and } from 'drizzle-orm';

export class GeneralAgent extends BaseAgent {
  readonly name = 'general-agent';
  readonly description = 'Handles general questions, policy lookups, greetings, and unclassified queries';
  protected preferredEngine: 'knowledge' | 'reasoning' | 'data' = 'knowledge';

  protected getSystemPrompt(context: AgentContext): string {
    return `You are the AI Assistant of the Mizan HR Intelligence Platform.
You help employees with general HR questions, company policies, and platform navigation.

Available modules you can direct users to:
- Skills: Skill assessments, gap analysis, competency profiles
- Performance: Goals, evaluations, 1:1 meetings, 360 feedback
- Learning (LXP): Courses, learning paths, certifications
- Hiring: Job postings, candidate pipeline, interviews
- Culture: Company values, culture surveys, engagement
- Bonus: Compensation, bonus cycles, calculations
- Onboarding: New hire checklists, mentors, 30/60/90 plans
- Engagement: Recognition, badges, challenges, leaderboards

If you can't answer, suggest which module or specialist might help. Use the provided context.`;
  }

  protected async buildDomainContext(context: AgentContext): Promise<string> {
    try {
      const [empData, enabledModules] = await Promise.all([
        db.select({ firstName: employees.firstName, lastName: employees.lastName })
          .from(employees).where(and(eq(employees.id, context.userId), eq(employees.tenantId, context.tenantId))).limit(1),
        db.select({ moduleId: moduleConfigs.moduleId }).from(moduleConfigs)
          .where(and(eq(moduleConfigs.tenantId, context.tenantId), eq(moduleConfigs.isEnabled, true))),
      ]);
      const parts: string[] = [];
      if (empData[0]) parts.push(`Hello ${empData[0].firstName} ${empData[0].lastName}`);
      parts.push(`Enabled modules: ${enabledModules.map(m => m.moduleId).join(', ') || 'all'}`);
      parts.push(`User role: ${context.userRole}`);
      return parts.join('\n');
    } catch (error) {
      console.error('[GeneralAgent] Context error:', (error as Error).message);
      return `User role: ${context.userRole}. All modules available.`;
    }
  }

  protected getSuggestedActions(userRole: string): AgentResponse['suggestedActions'] {
    return [
      { id: 'my_dashboard', label: 'My Dashboard', type: 'navigate' },
      { id: 'my_goals', label: 'My Goals', type: 'navigate' },
      { id: 'browse_courses', label: 'Browse Courses', type: 'navigate' },
      { id: 'send_recognition', label: 'Recognize Someone', type: 'action' },
    ];
  }
}
