import { BaseAgent, AgentContext, AgentResponse } from './base-agent';
import { db } from '../../../../db/index';
import { positions, employees } from '../../../../db/schema';
import { eq, and, sql } from 'drizzle-orm';

export class HiringAgent extends BaseAgent {
  readonly name = 'hiring-agent';
  readonly description = 'Handles recruitment, candidate screening, job postings, and interview scheduling';
  protected preferredEngine: 'knowledge' | 'reasoning' | 'data' = 'reasoning';

  protected getSystemPrompt(context: AgentContext): string {
    return `You are the Talent Acquisition Specialist of the Mizan HR Intelligence Platform.
You help with recruitment, candidate management, and hiring decisions.

Capabilities:
- Help create job descriptions and requisitions
- Screen and rank candidates against job requirements
- Schedule and prepare for interviews
- Analyze compensation competitiveness for offers
- Track hiring pipeline metrics

Be data-driven. Use the provided context for informed answers.`;
  }

  protected async buildDomainContext(context: AgentContext): Promise<string> {
    try {
      const [vacantPositions, employeeCount] = await Promise.all([
        db.select().from(positions).where(and(eq(positions.tenantId, context.tenantId), eq(positions.isVacant, true))),
        db.select({ count: sql<number>`COUNT(*)` }).from(employees).where(eq(employees.tenantId, context.tenantId)),
      ]);
      const parts: string[] = [];
      parts.push(`Open positions: ${vacantPositions.length}`);
      parts.push(`Total employees: ${employeeCount[0]?.count || 0}`);
      for (const pos of vacantPositions.slice(0, 5)) {
        parts.push(`  - ${pos.title}${pos.level ? ` (${pos.level})` : ''}`);
      }
      parts.push(`User role: ${context.userRole}`);
      return parts.join('\n');
    } catch (error) {
      console.error('[HiringAgent] Context error:', (error as Error).message);
      return `User role: ${context.userRole}. Hiring module available.`;
    }
  }

  protected getSuggestedActions(userRole: string): AgentResponse['suggestedActions'] {
    if (!['manager', 'admin', 'executive'].includes(userRole)) {
      return [{ id: 'open_positions', label: 'View Open Positions', type: 'navigate' }];
    }
    return [
      { id: 'view_pipeline', label: 'Hiring Pipeline', type: 'navigate' },
      { id: 'create_requisition', label: 'New Requisition', type: 'action' },
      { id: 'view_candidates', label: 'Review Candidates', type: 'navigate' },
      { id: 'schedule_interview', label: 'Schedule Interview', type: 'action' },
    ];
  }
}
