import { BaseAgent, AgentContext, AgentResponse } from './base-agent';
import { db } from '../../../db/index';
import { employees, developmentPlans } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';

export class SkillsAgent extends BaseAgent {
  readonly name = 'skills-agent';
  readonly description = 'Handles skills assessment, gap analysis, and competency questions';
  protected preferredEngine: 'knowledge' | 'reasoning' | 'data' = 'reasoning';

  protected getSystemPrompt(context: AgentContext): string {
    return `You are the Skills Specialist of the Mizan HR Intelligence Platform.
You help employees understand their skill profiles, identify gaps, and plan development.

Capabilities:
- Analyze individual skill profiles and identify strengths/gaps
- Compare skills against role requirements and industry benchmarks
- Recommend specific development actions and learning paths
- Explain competency frameworks and assessment criteria

Respond concisely and actionably. Use the provided data context to give personalized answers.`;
  }

  protected async buildDomainContext(context: AgentContext): Promise<string> {
    try {
      const [empData, devPlans] = await Promise.all([
        db.select({ id: employees.id, firstName: employees.firstName, lastName: employees.lastName })
          .from(employees)
          .where(and(eq(employees.id, context.userId), eq(employees.tenantId, context.tenantId)))
          .limit(1),
        db.select()
          .from(developmentPlans)
          .where(and(eq(developmentPlans.employeeId, context.userId), eq(developmentPlans.tenantId, context.tenantId))),
      ]);

      const parts: string[] = [];
      if (empData[0]) {
        parts.push(`Employee: ${empData[0].firstName} ${empData[0].lastName}`);
      }
      if (devPlans.length > 0) {
        const activePlans = devPlans.filter(p => p.status !== 'completed');
        parts.push(`Active development plans: ${activePlans.length}`);
        for (const plan of activePlans.slice(0, 3)) {
          const targets = (plan.skillTargets as Array<{ skillId: string; currentLevel: number; targetLevel: number }>) || [];
          parts.push(`  - "${plan.title}" (${plan.status}, ${plan.progressPercentage || 0}% complete, ${targets.length} skill targets)`);
        }
      } else {
        parts.push('No active development plans found.');
      }
      parts.push(`User role: ${context.userRole}`);
      return parts.join('\n');
    } catch (error) {
      console.error('[SkillsAgent] Context build error:', (error as Error).message);
      return `User role: ${context.userRole}. Skills module available.`;
    }
  }

  protected getSuggestedActions(userRole: string): AgentResponse['suggestedActions'] {
    const actions: AgentResponse['suggestedActions'] = [
      { id: 'view_skills_profile', label: 'View My Skills', type: 'navigate' },
      { id: 'start_assessment', label: 'Start Assessment', type: 'navigate' },
      { id: 'view_gaps', label: 'View Skill Gaps', type: 'navigate' },
    ];
    if (['manager', 'admin', 'executive'].includes(userRole)) {
      actions.push({ id: 'team_skills', label: 'Team Skills Report', type: 'report' });
    }
    return actions;
  }
}
