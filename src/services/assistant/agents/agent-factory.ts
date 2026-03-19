/**
 * AgentFactory — Lazily instantiates specialized agents by name
 *
 * The intent classifier returns an agent name (e.g., "skills-agent").
 * The factory creates (and caches) the corresponding agent instance.
 */

import { BaseAgent } from './base-agent';
import { SkillsAgent } from './skills-agent';
import { PerformanceAgent } from './performance-agent';
import { LxpAgent } from './lxp-agent';
import { HiringAgent } from './hiring-agent';
import { CultureAgent } from './culture-agent';
import { BonusAgent } from './bonus-agent';
import { OnboardingAgent } from './onboarding-agent';
import { EngagementAgent } from './engagement-agent';
import { GeneralAgent } from './general-agent';

const agentCache = new Map<string, BaseAgent>();

const AGENT_CONSTRUCTORS: Record<string, () => BaseAgent> = {
  'skills-agent': () => new SkillsAgent(),
  'performance-agent': () => new PerformanceAgent(),
  'lxp-agent': () => new LxpAgent(),
  'hiring-agent': () => new HiringAgent(),
  'culture-agent': () => new CultureAgent(),
  'bonus-agent': () => new BonusAgent(),
  'onboarding-agent': () => new OnboardingAgent(),
  'engagement-agent': () => new EngagementAgent(),
  'general-agent': () => new GeneralAgent(),
  'action-agent': () => new GeneralAgent(), // Actions handled by controller, general agent for response
  'analytics-agent': () => new GeneralAgent(), // Analytics routed to data engine via general agent
};

/**
 * Get or create an agent by name
 */
export function getAgent(agentName: string): BaseAgent {
  if (!agentCache.has(agentName)) {
    const constructor = AGENT_CONSTRUCTORS[agentName];
    if (!constructor) {
      // Fallback to general agent for unknown agent names
      agentCache.set(agentName, new GeneralAgent());
    } else {
      agentCache.set(agentName, constructor());
    }
  }
  return agentCache.get(agentName)!;
}

/**
 * List all available agents
 */
export function listAgents(): Array<{ name: string; description: string }> {
  return Object.keys(AGENT_CONSTRUCTORS).map(name => {
    const agent = getAgent(name);
    return { name: agent.name, description: agent.description };
  });
}
