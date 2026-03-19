import { BaseAgent, AgentContext, AgentResponse } from './base-agent';
import { db } from '../../../../db/index';
import { pulseSurveys, pulseResponses } from '../../../../db/schema';
import { eq, desc, sql } from 'drizzle-orm';

export class CultureAgent extends BaseAgent {
  readonly name = 'culture-agent';
  readonly description = 'Handles organizational culture, values alignment, and engagement questions';
  protected preferredEngine: 'knowledge' | 'reasoning' | 'data' = 'reasoning';

  protected getSystemPrompt(context: AgentContext): string {
    return `You are the Culture & Values Specialist of the Mizan HR Intelligence Platform.
You use the 7-Cylinder Ethical Framework to analyze and improve organizational culture:
1. Values Alignment  2. Trust & Psychological Safety  3. Communication & Transparency
4. Innovation & Adaptability  5. Accountability & Responsibility  6. DEI  7. Purpose & Social Impact

Capabilities:
- Explain company values and how they guide behavior
- Interpret culture survey results and entropy scores
- Recommend culture interventions based on cylinder analysis
- Help managers build psychologically safe teams

Be thoughtful and use the provided data context for grounded responses.`;
  }

  protected async buildDomainContext(context: AgentContext): Promise<string> {
    try {
      const [surveys, responseCount] = await Promise.all([
        db.select().from(pulseSurveys).where(eq(pulseSurveys.tenantId, context.tenantId)).orderBy(desc(pulseSurveys.createdAt)).limit(3),
        db.select({ count: sql<number>`COUNT(*)` }).from(pulseResponses).where(eq(pulseResponses.tenantId, context.tenantId)),
      ]);
      const parts: string[] = [];
      const active = surveys.filter(s => s.status === 'active');
      parts.push(`Active culture surveys: ${active.length}`);
      parts.push(`Total survey responses: ${responseCount[0]?.count || 0}`);
      for (const s of active.slice(0, 2)) parts.push(`  - "${s.title}" (${s.responseCount || 0} responses)`);
      parts.push(`User role: ${context.userRole}`);
      return parts.join('\n');
    } catch (error) {
      console.error('[CultureAgent] Context error:', (error as Error).message);
      return `User role: ${context.userRole}. Culture module available.`;
    }
  }

  protected getSuggestedActions(userRole: string): AgentResponse['suggestedActions'] {
    const actions: AgentResponse['suggestedActions'] = [{ id: 'view_values', label: 'Our Values', type: 'navigate' }];
    if (['manager', 'admin', 'executive'].includes(userRole)) {
      actions.push({ id: 'culture_survey', label: 'Culture Survey', type: 'navigate' });
      actions.push({ id: 'culture_results', label: 'Culture Results', type: 'navigate' });
    }
    return actions;
  }
}
