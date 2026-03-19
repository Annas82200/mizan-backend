import { BaseAgent, AgentContext, AgentResponse } from './base-agent';
import { db } from '../../../db/index';
import { employees, developmentPlans } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';

export class PerformanceAgent extends BaseAgent {
  readonly name = 'performance-agent';
  readonly description = 'Handles performance goals, evaluations, 360 feedback, and calibration';
  protected preferredEngine: 'knowledge' | 'reasoning' | 'data' = 'reasoning';

  protected getSystemPrompt(context: AgentContext): string {
    return `You are the Performance Management Specialist of the Mizan HR Intelligence Platform.
You help with goal setting (SMART goals), performance reviews, 360-degree feedback, and calibration.

Capabilities:
- Guide employees in setting effective SMART goals
- Help prepare for performance reviews (self-assessment tips)
- Explain the evaluation framework (competencies, ratings, calibration)
- For managers: guide on giving constructive feedback and running 1:1s
- For executives: explain 360-degree evaluation process

Be supportive and constructive. Use the provided data context for personalized guidance.`;
  }

  protected async buildDomainContext(context: AgentContext): Promise<string> {
    try {
      const [empData, devPlans] = await Promise.all([
        db.select({ firstName: employees.firstName, lastName: employees.lastName })
          .from(employees).where(and(eq(employees.id, context.userId), eq(employees.tenantId, context.tenantId))).limit(1),
        db.select().from(developmentPlans)
          .where(and(eq(developmentPlans.employeeId, context.userId), eq(developmentPlans.tenantId, context.tenantId))),
      ]);
      const parts: string[] = [];
      if (empData[0]) parts.push(`Employee: ${empData[0].firstName} ${empData[0].lastName}`);
      parts.push(`Development plans: ${devPlans.length} total, ${devPlans.filter(p => p.status === 'in_progress').length} in progress`);
      for (const plan of devPlans.filter(p => p.status !== 'completed').slice(0, 2)) {
        parts.push(`  - "${plan.title}" (${plan.progressPercentage || 0}% complete)`);
      }
      parts.push(`User role: ${context.userRole}`);
      return parts.join('\n');
    } catch (error) {
      console.error('[PerformanceAgent] Context error:', (error as Error).message);
      return `User role: ${context.userRole}. Performance module available.`;
    }
  }

  protected getSuggestedActions(userRole: string): AgentResponse['suggestedActions'] {
    const actions: AgentResponse['suggestedActions'] = [
      { id: 'view_goals', label: 'My Goals', type: 'navigate' },
      { id: 'view_evaluations', label: 'My Evaluations', type: 'navigate' },
    ];
    if (['manager', 'admin'].includes(userRole)) {
      actions.push({ id: 'team_goals', label: 'Team Goals', type: 'navigate' });
      actions.push({ id: 'schedule_1on1', label: 'Schedule 1:1', type: 'action' });
    }
    if (userRole === 'executive') {
      actions.push({ id: 'calibration', label: 'View Calibration', type: 'navigate' });
    }
    return actions;
  }
}
