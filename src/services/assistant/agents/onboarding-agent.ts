import { BaseAgent, AgentContext, AgentResponse } from './base-agent';
import { db } from '../../../../db/index';
import { onboardingAssignments, onboardingChecklists, mentorMatches } from '../../../../db/schema';
import { eq, and } from 'drizzle-orm';

export class OnboardingAgent extends BaseAgent {
  readonly name = 'onboarding-agent';
  readonly description = 'Handles onboarding workflows, checklists, mentor matching, and 30/60/90 day plans';
  protected preferredEngine: 'knowledge' | 'reasoning' | 'data' = 'knowledge';

  protected getSystemPrompt(context: AgentContext): string {
    return `You are the Onboarding Specialist of the Mizan HR Intelligence Platform.
You help new employees navigate their onboarding journey and help managers set up effective onboarding.

Capabilities:
- Guide new employees through their onboarding checklist
- Explain company processes, tools, and culture
- Help with 30/60/90 day plan creation and tracking
- Facilitate mentor-mentee connections
- For managers: help design onboarding workflows

Be welcoming and supportive. Use the provided data context.`;
  }

  protected async buildDomainContext(context: AgentContext): Promise<string> {
    try {
      const [assignments, mentors] = await Promise.all([
        db.select().from(onboardingAssignments)
          .where(and(eq(onboardingAssignments.employeeId, context.userId), eq(onboardingAssignments.tenantId, context.tenantId))),
        db.select().from(mentorMatches)
          .where(and(eq(mentorMatches.menteeId, context.userId), eq(mentorMatches.tenantId, context.tenantId))),
      ]);
      const parts: string[] = [];
      if (assignments.length > 0) {
        const a = assignments[0];
        parts.push(`Onboarding: ${a.status}, ${a.completionPercentage || 0}% complete`);
        // Get checklist items
        const items = await db.select().from(onboardingChecklists)
          .where(eq(onboardingChecklists.assignmentId, a.id));
        const completed = items.filter(i => i.status === 'completed').length;
        parts.push(`Checklist: ${completed}/${items.length} items done`);
        const pending = items.filter(i => i.status === 'pending').slice(0, 3);
        for (const item of pending) parts.push(`  Next: ${item.title}`);
      } else {
        parts.push('No active onboarding assignment.');
      }
      if (mentors.length > 0) {
        parts.push(`Mentor assigned: ${mentors[0].status}`);
      }
      parts.push(`User role: ${context.userRole}`);
      return parts.join('\n');
    } catch (error) {
      console.error('[OnboardingAgent] Context error:', (error as Error).message);
      return `User role: ${context.userRole}. Onboarding module available.`;
    }
  }

  protected getSuggestedActions(userRole: string): AgentResponse['suggestedActions'] {
    const actions: AgentResponse['suggestedActions'] = [
      { id: 'my_checklist', label: 'My Checklist', type: 'navigate' },
      { id: 'my_mentor', label: 'My Mentor', type: 'navigate' },
    ];
    if (['manager', 'admin'].includes(userRole)) {
      actions.push({ id: 'manage_workflows', label: 'Manage Workflows', type: 'navigate' });
      actions.push({ id: 'new_hires', label: 'New Hires Status', type: 'navigate' });
    }
    return actions;
  }
}
