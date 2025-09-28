// server/services/results/trigger-engine.ts

import { UnifiedResults } from './unified-results.js';
import { db } from '../../db/index.js';
import { triggers, triggeredActions } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

export interface Trigger {
  id: string;
  name: string;
  type: string;
  config: any;
  status: 'active' | 'inactive' | 'paused';
  tenantId: string;
}

export interface TriggerResult {
  id: string;
  triggerId: string;
  reason: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  data: any;
  executed: boolean;
}

export async function runTriggers(unifiedResults: UnifiedResults): Promise<TriggerResult[]> {
  console.log('Running trigger engine for unified results');
  
  try {
    // Get active triggers for the tenant
    const activeTriggers = await db.query.triggers.findMany({
      where: and(
        eq(triggers.status, 'active'),
        eq(triggers.tenantId, unifiedResults.tenantId || 'default-tenant')
      )
    });
    
    const triggerResults: TriggerResult[] = [];
    
    // Process each trigger
    for (const trigger of activeTriggers) {
      try {
        const result = await processTrigger(trigger, unifiedResults);
        if (result) {
          triggerResults.push(result);
          
          // Log the triggered action
          await logTriggeredAction(trigger, result, unifiedResults);
        }
      } catch (error) {
        console.error(`Trigger ${trigger.id} failed:`, error);
      }
    }
    
    console.log(`Trigger engine completed. ${triggerResults.length} triggers executed.`);
    
    return triggerResults;
    
  } catch (error) {
    console.error('Trigger engine failed:', error);
    throw error;
  }
}

async function processTrigger(trigger: any, unifiedResults: UnifiedResults): Promise<TriggerResult | null> {
  const { type, config } = trigger;
  
  switch (type) {
    case 'health_score_below':
      return processHealthScoreTrigger(trigger, unifiedResults, config);
    
    case 'critical_gaps':
      return processCriticalGapsTrigger(trigger, unifiedResults, config);
    
    case 'culture_entropy_high':
      return processCultureEntropyTrigger(trigger, unifiedResults, config);
    
    case 'skill_gaps_critical':
      return processSkillGapsTrigger(trigger, unifiedResults, config);
    
    case 'hiring_needs_urgent':
      return processHiringNeedsTrigger(trigger, unifiedResults, config);
    
    case 'performance_decline':
      return processPerformanceDeclineTrigger(trigger, unifiedResults, config);
    
    default:
      console.warn(`Unknown trigger type: ${type}`);
      return null;
  }
}

function processHealthScoreTrigger(trigger: any, results: UnifiedResults, config: any): TriggerResult | null {
  const threshold = config.threshold || 0.6;
  
  if (results.overall_health_score < threshold) {
    return {
      id: randomUUID(),
      triggerId: trigger.id,
      reason: `Overall health score (${results.overall_health_score}) is below threshold (${threshold})`,
      action: 'schedule_leadership_meeting',
      priority: 'high',
      data: {
        healthScore: results.overall_health_score,
        threshold,
        recommendations: results.recommendations.slice(0, 3)
      },
      executed: false
    };
  }
  
  return null;
}

function processCriticalGapsTrigger(trigger: any, results: UnifiedResults, config: any): TriggerResult | null {
  const criticalGaps = results.detailed_analysis.structure.weaknesses.filter(
    weakness => weakness.toLowerCase().includes('critical') || weakness.toLowerCase().includes('urgent')
  );
  
  if (criticalGaps.length > 0) {
    return {
      id: randomUUID(),
      triggerId: trigger.id,
      reason: `Critical structural gaps identified: ${criticalGaps.join(', ')}`,
      action: 'create_action_plan',
      priority: 'high',
      data: {
        gaps: criticalGaps,
        recommendations: results.recommendations.filter(r => r.category === 'structure')
      },
      executed: false
    };
  }
  
  return null;
}

function processCultureEntropyTrigger(trigger: any, results: UnifiedResults, config: any): TriggerResult | null {
  const entropyThreshold = config.entropyThreshold || 0.3;
  const cultureData = results.detailed_analysis.culture;
  
  // Check if culture section indicates high entropy
  const hasHighEntropy = cultureData.risks.some(risk => 
    risk.toLowerCase().includes('entropy') || risk.toLowerCase().includes('misalignment')
  );
  
  if (hasHighEntropy) {
    return {
      id: randomUUID(),
      triggerId: trigger.id,
      reason: 'High cultural entropy detected - values misalignment risk',
      action: 'schedule_culture_intervention',
      priority: 'medium',
      data: {
        cultureScore: cultureData.score,
        risks: cultureData.risks,
        recommendations: results.recommendations.filter(r => r.category === 'culture')
      },
      executed: false
    };
  }
  
  return null;
}

function processSkillGapsTrigger(trigger: any, results: UnifiedResults, config: any): TriggerResult | null {
  const skillsData = results.detailed_analysis.skills;
  const criticalGaps = skillsData.weaknesses.filter(
    weakness => weakness.toLowerCase().includes('critical') || weakness.toLowerCase().includes('urgent')
  );
  
  if (criticalGaps.length > 0) {
    return {
      id: randomUUID(),
      triggerId: trigger.id,
      reason: `Critical skill gaps identified: ${criticalGaps.join(', ')}`,
      action: 'initiate_training_program',
      priority: 'high',
      data: {
        gaps: criticalGaps,
        skillsScore: skillsData.score,
        recommendations: results.recommendations.filter(r => r.category === 'skills')
      },
      executed: false
    };
  }
  
  return null;
}

function processHiringNeedsTrigger(trigger: any, results: UnifiedResults, config: any): TriggerResult | null {
  const urgentHiring = results.recommendations.filter(
    rec => rec.category === 'structure' && rec.title.toLowerCase().includes('hiring')
  );
  
  if (urgentHiring.length > 0) {
    return {
      id: randomUUID(),
      triggerId: trigger.id,
      reason: 'Urgent hiring needs identified for strategic positions',
      action: 'activate_hiring_module',
      priority: 'high',
      data: {
        hiringRecommendations: urgentHiring,
        structureScore: results.detailed_analysis.structure.score
      },
      executed: false
    };
  }
  
  return null;
}

function processPerformanceDeclineTrigger(trigger: any, results: UnifiedResults, config: any): TriggerResult | null {
  const performanceData = results.detailed_analysis.performance;
  
  if (performanceData && performanceData.score < 0.6) {
    return {
      id: randomUUID(),
      triggerId: trigger.id,
      reason: `Performance decline detected (score: ${performanceData.score})`,
      action: 'schedule_performance_review',
      priority: 'medium',
      data: {
        performanceScore: performanceData.score,
        risks: performanceData.risks,
        recommendations: results.recommendations.filter(r => r.category === 'performance')
      },
      executed: false
    };
  }
  
  return null;
}

async function logTriggeredAction(trigger: any, result: TriggerResult, unifiedResults: UnifiedResults): Promise<void> {
  try {
    await db.insert(triggeredActions).values({
      id: randomUUID(),
      tenantId: unifiedResults.tenantId || 'default-tenant',
      triggerId: trigger.id,
      actionType: result.action,
      status: 'pending',
      input: {
        trigger: trigger,
        result: result,
        unifiedResults: {
          healthScore: unifiedResults.overall_health_score,
          trend: unifiedResults.trend
        }
      },
      executedAt: new Date()
    });
    
    console.log(`Logged triggered action: ${result.action} for trigger ${trigger.name}`);
  } catch (error) {
    console.error('Failed to log triggered action:', error);
  }
}

// Helper function to create default triggers for a tenant
export async function createDefaultTriggers(tenantId: string): Promise<void> {
  const defaultTriggers = [
    {
      id: randomUUID(),
      tenantId,
      name: 'Health Score Alert',
      type: 'health_score_below',
      config: { threshold: 0.6 },
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'Critical Gaps Alert',
      type: 'critical_gaps',
      config: {},
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'Culture Entropy Alert',
      type: 'culture_entropy_high',
      config: { entropyThreshold: 0.3 },
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'Skill Gaps Alert',
      type: 'skill_gaps_critical',
      config: {},
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  
  try {
    for (const trigger of defaultTriggers) {
      await db.insert(triggers).values(trigger);
    }
    
    console.log(`Created ${defaultTriggers.length} default triggers for tenant ${tenantId}`);
  } catch (error) {
    console.error('Failed to create default triggers:', error);
  }
}