// @ts-nocheck
import { BaseAgent, AgentContext, AgentResponse } from './base-agent';
import { db } from '../../../../db/index';
import { bonusCycles, bonusAllocations } from '../../../../db/schema';
import { eq, and, desc } from 'drizzle-orm';

export class BonusAgent extends BaseAgent {
  readonly name = 'bonus-agent';
  readonly description = 'Handles bonus calculations, compensation questions, and distribution cycles';
  protected preferredEngine: 'knowledge' | 'reasoning' | 'data' = 'data';

  protected getSystemPrompt(context: AgentContext): string {
    return `You are the Compensation & Bonus Specialist of the Mizan HR Intelligence Platform.
You help with bonus calculations, compensation analysis, and distribution cycles.

Capabilities:
- Explain bonus criteria and how scores are calculated
- Show bonus cycle status and timelines
- For managers: explain team bonus allocations and adjustment process
- Analyze compensation competitiveness

Be transparent about how bonuses are calculated. Never share other employees' compensation data.
Use the provided data context for personalized answers.`;
  }

  protected async buildDomainContext(context: AgentContext): Promise<string> {
    try {
      const [cycles, allocations] = await Promise.all([
        db.select().from(bonusCycles).where(eq(bonusCycles.tenantId, context.tenantId)).orderBy(desc(bonusCycles.createdAt)).limit(2),
        db.select().from(bonusAllocations).where(and(eq(bonusAllocations.employeeId, context.userId), eq(bonusAllocations.tenantId, context.tenantId))).orderBy(desc(bonusAllocations.createdAt)).limit(3),
      ]);
      const parts: string[] = [];
      if (cycles.length > 0) {
        const c = cycles[0];
        parts.push(`Current bonus cycle: "${c.name}" (${c.status}, FY${c.fiscalYear})`);
        if (c.totalBudget) parts.push(`  Budget: ${c.currency || 'USD'} ${c.totalBudget.toLocaleString()}`);
      } else { parts.push('No active bonus cycles.'); }
      if (allocations.length > 0) {
        const a = allocations[0];
        parts.push(`Your latest allocation: ${a.status}, score: ${a.overallScore || 'pending'}`);
        if (a.finalAmount) parts.push(`  Amount: ${a.finalAmount.toLocaleString()}`);
      }
      parts.push(`User role: ${context.userRole}`);
      return parts.join('\n');
    } catch (error) {
      console.error('[BonusAgent] Context error:', (error as Error).message);
      return `User role: ${context.userRole}. Bonus module available.`;
    }
  }

  protected getSuggestedActions(userRole: string): AgentResponse['suggestedActions'] {
    const actions: AgentResponse['suggestedActions'] = [{ id: 'view_bonus', label: 'My Bonus Status', type: 'navigate' }];
    if (['manager', 'admin'].includes(userRole)) {
      actions.push({ id: 'team_bonuses', label: 'Team Allocations', type: 'navigate' });
      actions.push({ id: 'bonus_analytics', label: 'Bonus Analytics', type: 'navigate' });
    }
    return actions;
  }
}
