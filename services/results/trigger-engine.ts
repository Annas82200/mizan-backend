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
    case 'skill_gaps_critical':
      return processSkillGapsTrigger(trigger, unifiedResults, config);
    
    case 'hiring_needs_urgent':
      return processHiringNeedsTrigger(trigger, unifiedResults, config);
    
    case 'culture_learning_needed':
      return processCultureLearningTrigger(trigger, unifiedResults, config);
    
    case 'employee_skill_gap':
      return processEmployeeSkillGapTrigger(trigger, unifiedResults, config);
    
    case 'culture_alignment_reward':
      return processCultureAlignmentTrigger(trigger, unifiedResults, config);
    
    case 'structure_optimal_talent':
      return processStructureOptimalTrigger(trigger, unifiedResults, config);
    
    case 'structure_inflated_recommendations':
      return processStructureInflatedTrigger(trigger, unifiedResults, config);
    
    case 'candidate_hired_onboarding':
      return processCandidateHiredTrigger(trigger, unifiedResults, config);
    
    default:
      console.warn(`Unknown trigger type: ${type}`);
      return null;
  }
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

function processCultureLearningTrigger(trigger: any, results: UnifiedResults, config: any): TriggerResult | null {
  const cultureData = results.detailed_analysis.culture;
  
  // Check if culture analysis indicates employees need to learn or adapt to values
  const needsLearning = cultureData.risks.some(risk => 
    risk.toLowerCase().includes('learning') || 
    risk.toLowerCase().includes('adaptation') ||
    risk.toLowerCase().includes('values alignment') ||
    risk.toLowerCase().includes('cultural development')
  );
  
  // Also check for value misalignment that requires learning
  const hasValueMisalignment = cultureData.weaknesses.some(weakness =>
    weakness.toLowerCase().includes('values') ||
    weakness.toLowerCase().includes('alignment') ||
    weakness.toLowerCase().includes('understanding')
  );
  
  if (needsLearning || hasValueMisalignment) {
    return {
      id: randomUUID(),
      triggerId: trigger.id,
      reason: 'Culture analysis indicates employees need to learn or adapt to company values',
      action: 'activate_lxp_module',
      priority: 'medium',
      data: {
        cultureScore: cultureData.score,
        learningNeeds: cultureData.risks.filter(risk => 
          risk.toLowerCase().includes('learning') || 
          risk.toLowerCase().includes('adaptation')
        ),
        valueMisalignment: cultureData.weaknesses.filter(weakness =>
          weakness.toLowerCase().includes('values') ||
          weakness.toLowerCase().includes('alignment')
        ),
        recommendations: results.recommendations.filter(r => r.category === 'culture')
      },
      executed: false
    };
  }
  
  return null;
}

function processEmployeeSkillGapTrigger(trigger: any, results: UnifiedResults, config: any): TriggerResult | null {
  const skillsData = results.detailed_analysis.skills;
  
  // Check if there are individual employee skill gaps that require LXP
  const hasEmployeeSkillGaps = skillsData.weaknesses.some(weakness =>
    weakness.toLowerCase().includes('employee') ||
    weakness.toLowerCase().includes('individual') ||
    weakness.toLowerCase().includes('personal') ||
    weakness.toLowerCase().includes('missing skill')
  );
  
  // Also check for skill development needs
  const hasSkillDevelopmentNeeds = skillsData.recommendations?.some(rec =>
    rec.toLowerCase().includes('training') ||
    rec.toLowerCase().includes('development') ||
    rec.toLowerCase().includes('learning') ||
    rec.toLowerCase().includes('upskilling')
  );
  
  // Check if skills analysis indicates employees are missing specific skills
  const hasMissingSkills = skillsData.gaps?.some(gap =>
    gap.toLowerCase().includes('missing') ||
    gap.toLowerCase().includes('lacking') ||
    gap.toLowerCase().includes('insufficient')
  );
  
  if (hasEmployeeSkillGaps || hasSkillDevelopmentNeeds || hasMissingSkills) {
    return {
      id: randomUUID(),
      triggerId: trigger.id,
      reason: 'Skills gap analysis indicates employees are missing required skills',
      action: 'activate_lxp_module',
      priority: 'high',
      data: {
        skillsScore: skillsData.score,
        employeeSkillGaps: skillsData.weaknesses.filter(weakness =>
          weakness.toLowerCase().includes('employee') ||
          weakness.toLowerCase().includes('individual')
        ),
        skillDevelopmentNeeds: skillsData.recommendations?.filter(rec =>
          rec.toLowerCase().includes('training') ||
          rec.toLowerCase().includes('development')
        ),
        missingSkills: skillsData.gaps?.filter(gap =>
          gap.toLowerCase().includes('missing') ||
          gap.toLowerCase().includes('lacking')
        ),
        recommendations: results.recommendations.filter(r => r.category === 'skills')
      },
      executed: false
    };
  }
  
  return null;
}

function processCultureAlignmentTrigger(trigger: any, results: UnifiedResults, config: any): TriggerResult | null {
  const cultureData = results.detailed_analysis.culture;
  const alignmentThreshold = config.alignmentThreshold || 0.8; // 80% alignment threshold
  
  // Check if culture analysis shows strong alignment with company values
  const hasStrongAlignment = cultureData.strengths.some(strength =>
    strength.toLowerCase().includes('alignment') ||
    strength.toLowerCase().includes('values match') ||
    strength.toLowerCase().includes('cultural fit') ||
    strength.toLowerCase().includes('strong values')
  );
  
  // Check for high culture score indicating good alignment
  const hasHighCultureScore = cultureData.score >= alignmentThreshold;
  
  // Check for positive culture indicators
  const hasPositiveIndicators = cultureData.strengths.some(strength =>
    strength.toLowerCase().includes('excellent') ||
    strength.toLowerCase().includes('strong') ||
    strength.toLowerCase().includes('positive') ||
    strength.toLowerCase().includes('aligned')
  );
  
  // Check if employee values match company values
  const hasValueMatch = cultureData.recommendations?.some(rec =>
    rec.toLowerCase().includes('maintain') ||
    rec.toLowerCase().includes('continue') ||
    rec.toLowerCase().includes('exemplary') ||
    rec.toLowerCase().includes('role model')
  );
  
  if ((hasStrongAlignment || hasHighCultureScore) && (hasPositiveIndicators || hasValueMatch)) {
    return {
      id: randomUUID(),
      triggerId: trigger.id,
      reason: 'Employee culture analysis shows strong alignment with company values',
      action: 'activate_reward_module',
      priority: 'medium',
      data: {
        cultureScore: cultureData.score,
        alignmentLevel: hasStrongAlignment ? 'Strong' : 'High',
        valueAlignment: cultureData.strengths.filter(strength =>
          strength.toLowerCase().includes('alignment') ||
          strength.toLowerCase().includes('values')
        ),
        positiveIndicators: cultureData.strengths.filter(strength =>
          strength.toLowerCase().includes('excellent') ||
          strength.toLowerCase().includes('strong') ||
          strength.toLowerCase().includes('positive')
        ),
        rewardRecommendations: cultureData.recommendations?.filter(rec =>
          rec.toLowerCase().includes('maintain') ||
          rec.toLowerCase().includes('continue') ||
          rec.toLowerCase().includes('exemplary')
        ),
        recommendations: results.recommendations.filter(r => r.category === 'culture')
      },
      executed: false
    };
  }
  
  return null;
}

function processStructureOptimalTrigger(trigger: any, results: UnifiedResults, config: any): TriggerResult | null {
  const structureData = results.detailed_analysis.structure;
  const optimalThreshold = config.optimalThreshold || 0.75; // 75% structure health threshold
  
  // Check if structure analysis indicates no additional layers or positions needed
  const noAdditionalLayersNeeded = !structureData.weaknesses.some(weakness =>
    weakness.toLowerCase().includes('add layer') ||
    weakness.toLowerCase().includes('new position') ||
    weakness.toLowerCase().includes('additional role') ||
    weakness.toLowerCase().includes('expand structure') ||
    weakness.toLowerCase().includes('hiring needed')
  );
  
  // Check for optimal structure score
  const hasOptimalStructureScore = structureData.score >= optimalThreshold;
  
  // Check for structure strengths indicating good organization
  const hasStructureStrengths = structureData.strengths.some(strength =>
    strength.toLowerCase().includes('optimal') ||
    strength.toLowerCase().includes('efficient') ||
    strength.toLowerCase().includes('well-structured') ||
    strength.toLowerCase().includes('balanced') ||
    strength.toLowerCase().includes('appropriate')
  );
  
  // Check if recommendations focus on talent development rather than structure changes
  const hasTalentDevelopmentFocus = results.recommendations.some(rec =>
    rec.category === 'structure' && (
      rec.title.toLowerCase().includes('talent') ||
      rec.title.toLowerCase().includes('development') ||
      rec.title.toLowerCase().includes('training') ||
      rec.title.toLowerCase().includes('upskilling') ||
      rec.title.toLowerCase().includes('career')
    )
  );
  
  // Check for no urgent hiring needs
  const noUrgentHiring = !results.recommendations.some(rec =>
    rec.category === 'structure' && (
      rec.title.toLowerCase().includes('urgent hiring') ||
      rec.title.toLowerCase().includes('immediate hiring') ||
      rec.title.toLowerCase().includes('critical position')
    )
  );
  
  if (noAdditionalLayersNeeded && hasOptimalStructureScore && hasStructureStrengths && (hasTalentDevelopmentFocus || noUrgentHiring)) {
    return {
      id: randomUUID(),
      triggerId: trigger.id,
      reason: 'Structure analysis shows optimal organization with no additional layers/positions needed - focus on talent management',
      action: 'activate_talent_management_module',
      priority: 'medium',
      data: {
        structureScore: structureData.score,
        structureHealth: hasOptimalStructureScore ? 'Optimal' : 'Good',
        structureStrengths: structureData.strengths.filter(strength =>
          strength.toLowerCase().includes('optimal') ||
          strength.toLowerCase().includes('efficient') ||
          strength.toLowerCase().includes('well-structured')
        ),
        talentDevelopmentOpportunities: results.recommendations.filter(rec =>
          rec.category === 'structure' && (
            rec.title.toLowerCase().includes('talent') ||
            rec.title.toLowerCase().includes('development') ||
            rec.title.toLowerCase().includes('training')
          )
        ),
        noHiringNeeds: noUrgentHiring,
        recommendations: results.recommendations.filter(r => r.category === 'structure')
      },
      executed: false
    };
  }
  
  return null;
}

function processStructureInflatedTrigger(trigger: any, results: UnifiedResults, config: any): TriggerResult | null {
  const structureData = results.detailed_analysis.structure;
  const inflationThreshold = config.inflationThreshold || 0.3; // 30% structure efficiency threshold
  
  // Check if structure analysis indicates inflated organization
  const hasInflatedStructure = structureData.weaknesses.some(weakness =>
    weakness.toLowerCase().includes('inflated') ||
    weakness.toLowerCase().includes('overstaffed') ||
    weakness.toLowerCase().includes('too many layers') ||
    weakness.toLowerCase().includes('redundant') ||
    weakness.toLowerCase().includes('bloated') ||
    weakness.toLowerCase().includes('excessive hierarchy') ||
    weakness.toLowerCase().includes('unnecessary positions')
  );
  
  // Check for low structure efficiency score indicating inflation
  const hasLowEfficiencyScore = structureData.score <= inflationThreshold;
  
  // Check for structure inefficiency indicators
  const hasInefficiencyIndicators = structureData.weaknesses.some(weakness =>
    weakness.toLowerCase().includes('inefficient') ||
    weakness.toLowerCase().includes('slow decision making') ||
    weakness.toLowerCase().includes('bureaucratic') ||
    weakness.toLowerCase().includes('overcomplicated') ||
    weakness.toLowerCase().includes('streamline') ||
    weakness.toLowerCase().includes('consolidate')
  );
  
  // Check for recommendations to reduce structure
  const hasReductionRecommendations = results.recommendations.some(rec =>
    rec.category === 'structure' && (
      rec.title.toLowerCase().includes('reduce') ||
      rec.title.toLowerCase().includes('eliminate') ||
      rec.title.toLowerCase().includes('consolidate') ||
      rec.title.toLowerCase().includes('streamline') ||
      rec.title.toLowerCase().includes('flatten') ||
      rec.title.toLowerCase().includes('restructure') ||
      rec.title.toLowerCase().includes('optimize')
    )
  );
  
  // Check for cost optimization needs
  const hasCostOptimizationNeeds = results.recommendations.some(rec =>
    rec.category === 'structure' && (
      rec.title.toLowerCase().includes('cost') ||
      rec.title.toLowerCase().includes('budget') ||
      rec.title.toLowerCase().includes('efficiency') ||
      rec.title.toLowerCase().includes('productivity')
    )
  );
  
  if ((hasInflatedStructure || hasLowEfficiencyScore) && (hasInefficiencyIndicators || hasReductionRecommendations || hasCostOptimizationNeeds)) {
    return {
      id: randomUUID(),
      triggerId: trigger.id,
      reason: 'Structure analysis indicates inflated organizational structure requiring optimization recommendations',
      action: 'provide_structure_recommendations',
      priority: 'high',
      data: {
        structureScore: structureData.score,
        inflationLevel: hasInflatedStructure ? 'High' : 'Moderate',
        inefficiencyIndicators: structureData.weaknesses.filter(weakness =>
          weakness.toLowerCase().includes('inflated') ||
          weakness.toLowerCase().includes('inefficient') ||
          weakness.toLowerCase().includes('redundant')
        ),
        optimizationRecommendations: results.recommendations.filter(rec =>
          rec.category === 'structure' && (
            rec.title.toLowerCase().includes('reduce') ||
            rec.title.toLowerCase().includes('streamline') ||
            rec.title.toLowerCase().includes('optimize')
          )
        ),
        costOptimizationNeeds: results.recommendations.filter(rec =>
          rec.category === 'structure' && (
            rec.title.toLowerCase().includes('cost') ||
            rec.title.toLowerCase().includes('efficiency')
          )
        ),
        structureGaps: structureData.gaps || [],
        recommendations: results.recommendations.filter(r => r.category === 'structure')
      },
      executed: false
    };
  }
  
  return null;
}

function processCandidateHiredTrigger(trigger: any, results: UnifiedResults, config: any): TriggerResult | null {
  // This trigger is typically activated by hiring module events, not analysis results
  // It would be triggered when a candidate is successfully hired through the hiring module
  
  // Check if there are recent hiring activities or new employee data
  const hasNewHires = results.recommendations.some(rec =>
    rec.category === 'hiring' && (
      rec.title.toLowerCase().includes('hired') ||
      rec.title.toLowerCase().includes('successful hire') ||
      rec.title.toLowerCase().includes('candidate selected') ||
      rec.title.toLowerCase().includes('offer accepted')
    )
  );
  
  // Check for onboarding-related recommendations
  const hasOnboardingNeeds = results.recommendations.some(rec =>
    rec.category === 'hiring' && (
      rec.title.toLowerCase().includes('onboard') ||
      rec.title.toLowerCase().includes('orientation') ||
      rec.title.toLowerCase().includes('integration') ||
      rec.title.toLowerCase().includes('welcome') ||
      rec.title.toLowerCase().includes('setup')
    )
  );
  
  // Check for new employee setup requirements
  const hasSetupRequirements = results.recommendations.some(rec =>
    rec.category === 'hiring' && (
      rec.title.toLowerCase().includes('setup') ||
      rec.title.toLowerCase().includes('provision') ||
      rec.title.toLowerCase().includes('access') ||
      rec.title.toLowerCase().includes('training') ||
      rec.title.toLowerCase().includes('documentation')
    )
  );
  
  // This trigger would typically be activated by external hiring module events
  // For now, we'll check if there are hiring-related recommendations that indicate successful hires
  if (hasNewHires || hasOnboardingNeeds || hasSetupRequirements) {
    return {
      id: randomUUID(),
      triggerId: trigger.id,
      reason: 'Candidate successfully hired through hiring module - initiate onboarding process',
      action: 'activate_onboarding_module',
      priority: 'high',
      data: {
        triggerSource: 'hiring_module',
        onboardingRequirements: results.recommendations.filter(rec =>
          rec.category === 'hiring' && (
            rec.title.toLowerCase().includes('onboard') ||
            rec.title.toLowerCase().includes('setup') ||
            rec.title.toLowerCase().includes('orientation')
          )
        ),
        setupTasks: results.recommendations.filter(rec =>
          rec.category === 'hiring' && (
            rec.title.toLowerCase().includes('setup') ||
            rec.title.toLowerCase().includes('provision') ||
            rec.title.toLowerCase().includes('access')
          )
        ),
        trainingNeeds: results.recommendations.filter(rec =>
          rec.category === 'hiring' && (
            rec.title.toLowerCase().includes('training') ||
            rec.title.toLowerCase().includes('orientation')
          )
        ),
        recommendations: results.recommendations.filter(r => r.category === 'hiring')
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
      name: 'Skill Gaps Alert',
      type: 'skill_gaps_critical',
      config: {},
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'Hiring Needs Alert',
      type: 'hiring_needs_urgent',
      config: {},
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'Culture Learning Alert',
      type: 'culture_learning_needed',
      config: {},
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'Employee Skill Gap Alert',
      type: 'employee_skill_gap',
      config: {},
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'Culture Alignment Reward Alert',
      type: 'culture_alignment_reward',
      config: { alignmentThreshold: 0.8 },
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'Structure Optimal Talent Alert',
      type: 'structure_optimal_talent',
      config: { optimalThreshold: 0.75 },
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'Structure Inflated Recommendations Alert',
      type: 'structure_inflated_recommendations',
      config: { inflationThreshold: 0.3 },
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'Candidate Hired Onboarding Alert',
      type: 'candidate_hired_onboarding',
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