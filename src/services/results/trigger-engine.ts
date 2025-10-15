// server/services/results/trigger-engine.ts

import { UnifiedResults } from './unified-results.js';
import { db } from '../../../db/index.js';
import { triggers, triggerExecutions } from '../../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import lxpModule from '../modules/lxp/lxp-module.js';
import * as hiringModule from '../modules/hiring/hiring-module.js';
import { TriggerConfig, TriggerResultData } from '../../types/trigger-types.js';

export interface Trigger {
  id: string;
  name: string;
  type: string;
  config: TriggerConfig;
  status: 'active' | 'inactive' | 'paused';
  tenantId: string;
}

export interface TriggerResult {
  id: string;
  triggerId: string;
  reason: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  data: TriggerResultData;
  executed: boolean;
}

export async function runTriggers(unifiedResults: UnifiedResults & { tenantId: string }): Promise<TriggerResult[]> {
  console.log('Running trigger engine for unified results');

  try {
    // Initialize LXP module if needed
    await initializeModules(unifiedResults.tenantId);

    // Get active triggers for the tenant
    const activeTriggers = await db.query.triggers.findMany({
      where: and(
        eq(triggers.isActive, true),
        eq(triggers.tenantId, unifiedResults.tenantId || 'default-tenant')
      )
    });
    
    const triggerResults: TriggerResult[] = [];
    
    // Process each trigger
    for (const dbTrigger of activeTriggers) {
      // Map database result to Trigger interface
      const trigger: Trigger = {
        id: dbTrigger.id,
        name: dbTrigger.name,
        type: dbTrigger.type,
        config: (dbTrigger.metadata as TriggerConfig) || {},
        status: (dbTrigger.isActive ? 'active' : 'inactive') as 'active' | 'inactive' | 'paused',
        tenantId: dbTrigger.tenantId
      };
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

/**
 * Initialize all modules
 */
async function initializeModules(tenantId: string): Promise<void> {
  try {
    console.log('[Trigger Engine] Initializing modules...');

    // Initialize LXP module
    const lxpHealth = await lxpModule.checkHealth();
    if (!lxpHealth.healthy) {
      console.log('[Trigger Engine] Initializing LXP module...');
      await lxpModule.initialize();
    } else {
      console.log('[Trigger Engine] LXP module already initialized');
    }

    // Initialize Hiring module
    const hiringHealth = await hiringModule.checkHealth();
    if (!hiringHealth.healthy) {
      console.log('[Trigger Engine] Initializing Hiring module...');
      await hiringModule.initialize({
        tenantId: tenantId || 'default-tenant',
        moduleId: 'hiring-module',
        enabled: true
      });
    } else {
      console.log('[Trigger Engine] Hiring module already initialized');
    }

    // Add other module initializations here as they are implemented

    console.log('[Trigger Engine] All modules initialized successfully');
  } catch (error) {
    console.error('[Trigger Engine] Error initializing modules:', error);
    // Don't throw error - allow trigger engine to continue with fallback processing
  }
}

async function processTrigger(trigger: Trigger, unifiedResults: UnifiedResults): Promise<TriggerResult | null> {
  const { type, config } = trigger;
  
  // ============================================================================
  // LXP Module Integration - Task 1.5.1
  // ============================================================================
  // Check if this trigger should be handled by the LXP module
  const lxpTriggerTypes = [
    'skill_gaps_critical',
    'culture_learning_needed',
    'employee_skill_gap',
    'performance_perfect_lxp',
    'performance_improvement_lxp',
    'compliance_training_due',
    'safety_training_expired',
    'certification_expiring',
    'legal_requirement_change',
    'proactive_training',
    'lxp_training_completion',
    'training_completion',
    'onboarding_completion'
  ];

  // Performance module trigger types (culture, engagement, recognition, goals)
  const performanceTriggerTypes = [
    'culture_goals_needed',
    'engagement_intervention_needed',
    'recognition_program_needed',
    'performance_review_due',
    'goal_setting_required',
    'feedback_collection_needed'
  ];

  // ============================================================================
  // Hiring Module Integration - Task 3.5.1
  // ============================================================================
  // Check if this trigger should be handled by the Hiring module
  const hiringTriggerTypes = [
    'hiring_needs_urgent',
    'structure_analysis_expansion',
    'candidate_applied',
    'interview_completed',
    'offer_accepted',
    'candidate_screening_required',
    'interview_scheduling_required',
    'offer_generation_required'
  ];

  // ============================================================================
  // MODULE ACCESS CONTROL - Check subscription tier
  // ============================================================================
  if (hiringTriggerTypes.includes(type)) {
    // Check if tenant has access to Hiring module
    const { checkModuleAccess } = await import('../../utils/module-access.js');
    const hasAccess = await checkModuleAccess(trigger.tenantId, 'hiring');

    if (!hasAccess) {
      console.log(`[Trigger Engine] Tenant ${trigger.tenantId} does not have access to Hiring module`);
      return {
        id: randomUUID(),
        triggerId: trigger.id,
        reason: 'Hiring module not available in current subscription tier',
        action: 'upgrade_required',
        priority: 'medium',
        data: {
          module: 'hiring',
          message: 'Upgrade to Pro tier or higher to access the Hiring module',
          upgradeUrl: '/upgrade?tier=pro'
        },
        executed: false
      };
    }
  }

  if (lxpTriggerTypes.includes(type)) {
    try {
      console.log(`[Trigger Engine] Routing trigger ${type} to LXP module`);
      
      // Initialize LXP module if not already initialized
      const lxpStatus = await lxpModule.getStatus();
      if (!lxpStatus.status || lxpStatus.status === 'inactive') {
        await lxpModule.initialize();
      }
      
      // Process trigger through LXP module
      const lxpResult = await lxpModule.handleTrigger({
        tenantId: trigger.tenantId,
        employeeId: config.employeeId || 'unknown',
        skillGaps: config.skillGaps || []
      });
      
      // Convert LXP module result to trigger result
      const triggerResult: TriggerResult = {
        id: randomUUID(),
        triggerId: trigger.id,
        reason: `LXP module processed ${type} trigger`,
        action: `Created learning path: ${lxpResult.name}`,
        priority: 'high',
        data: {
          learningPathId: lxpResult.id,
          employeeId: lxpResult.employeeId,
          courses: lxpResult.courses
        },
        executed: true
      };
      
      return triggerResult;
    } catch (error) {
      console.error(`[Trigger Engine] Error processing trigger ${type} through LXP module:`, error);
      // Fall back to original processing
    }
  }

  if (hiringTriggerTypes.includes(type)) {
    try {
      console.log(`[Trigger Engine] Routing trigger ${type} to Hiring module`);
      
      // Initialize Hiring module if not already initialized
      const hiringStatus = await hiringModule.getStatus();
      if (!hiringStatus.status || hiringStatus.status === 'inactive') {
        await hiringModule.initialize({
          tenantId: config.tenantId || 'default-tenant',
          moduleId: 'hiring-module',
          enabled: true
        });
      }

      // Process trigger through Hiring module
      const resultsWithTenant = unifiedResults as UnifiedResults & { tenantId: string };
      const hiringResult = await hiringModule.handleTrigger({
        tenantId: resultsWithTenant.tenantId || trigger.tenantId || 'default-tenant',
        recommendation: config
      });
      
      // Convert Hiring module result to trigger result
      const triggerResult: TriggerResult = {
        id: randomUUID(),
        triggerId: trigger.id,
        reason: `Hiring module processed ${type} trigger`,
        action: `Created job requisition: ${hiringResult.title}`,
        priority: 'high',
        data: {
          requisitionId: hiringResult.id,
          title: hiringResult.title,
          department: hiringResult.department
        },
        executed: true
      };
      
      return triggerResult;
    } catch (error) {
      console.error(`[Trigger Engine] Error processing trigger ${type} through Hiring module:`, error);
      // Fall back to original processing
    }
  }

  // ============================================================================
  // Performance Module Integration - Culture, Engagement, Recognition, Goals
  // ============================================================================
  if (performanceTriggerTypes.includes(type)) {
    try {
      console.log(`[Trigger Engine] Routing trigger ${type} to Performance module`);

      // For now, log the performance trigger
      // TODO: Implement Performance module handler when module is ready
      console.log(`[Trigger Engine] Performance trigger ${type} created:`, config);

      // Return a success result
      const triggerResult: TriggerResult = {
        id: randomUUID(),
        triggerId: trigger.id,
        reason: `Performance module will process ${type} trigger`,
        action: type === 'culture_goals_needed' ? 'create_culture_aligned_goals' :
                type === 'engagement_intervention_needed' ? 'schedule_manager_1on1' :
                type === 'recognition_program_needed' ? 'enhance_recognition_for_employee' :
                'process_performance_trigger',
        priority: config.priority || 'medium',
        data: {
          triggerType: type,
          employeeId: config.targetId || config.employeeId,
          details: config.data || config,
          status: 'queued_for_performance_module'
        },
        executed: false // Will be executed by Performance module
      };

      return triggerResult;

    } catch (error) {
      console.error(`[Trigger Engine] Error processing trigger ${type} for Performance module:`, error);
      // Fall back to original processing
    }
  }

  // ============================================================================
  // Original Trigger Processing (Fallback)
  // ============================================================================
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
    
    case 'lxp_completed_performance':
      return processLXPCompletedTrigger(trigger, unifiedResults, config);
    
    case 'performance_excellent_reward':
      return processPerformanceRewardTrigger(trigger, unifiedResults, config);
    
    case 'performance_perfect_lxp':
      return processPerformanceLXPTrigger(trigger, unifiedResults, config);
    
    case 'performance_exceptional_talent_succession':
      return processPerformanceTalentSuccessionTrigger(trigger, unifiedResults, config);
    
    case 'performance_improvement_lxp':
      return processPerformanceImprovementLXPTrigger(trigger, unifiedResults, config);
    
    case 'annual_performance_review_due':
      return processAnnualPerformanceReviewTrigger(trigger, unifiedResults, config);
    
    case 'quarterly_checkin_due':
      return processQuarterlyCheckinTrigger(trigger, unifiedResults, config);
    
    case 'probation_period_ending':
      return processProbationPeriodEndingTrigger(trigger, unifiedResults, config);
    
    case 'compliance_training_due':
      return processComplianceTrainingDueTrigger(trigger, unifiedResults, config);
    
    case 'safety_training_expired':
      return processSafetyTrainingExpiredTrigger(trigger, unifiedResults, config);
    
    case 'certification_expiring':
      return processCertificationExpiringTrigger(trigger, unifiedResults, config);
    
    case 'legal_requirement_change':
      return processLegalRequirementChangeTrigger(trigger, unifiedResults, config);
    
    case 'team_size_changes':
      return processTeamSizeChangesTrigger(trigger, unifiedResults, config);
    
    case 'onboarding_completion':
      return processOnboardingCompletionTrigger(trigger, unifiedResults, config);
    
    case 'training_completion':
      return processTrainingCompletionTrigger(trigger, unifiedResults, config);
    
    case 'succession_plan_activation':
      return processSuccessionPlanActivationTrigger(trigger, unifiedResults, config);
    
    case 'flight_risk_prediction':
      return processFlightRiskPredictionTrigger(trigger, unifiedResults, config);
    
    case 'skill_obsolescence_risk':
      return processSkillObsolescenceRiskTrigger(trigger, unifiedResults, config);
    
    case 'leadership_gap_prediction':
      return processLeadershipGapPredictionTrigger(trigger, unifiedResults, config);
    
    default:
      console.warn(`Unknown trigger type: ${type}`);
      return null;
  }
}


function processSkillGapsTrigger(trigger: Trigger, results: UnifiedResults, config: TriggerConfig): TriggerResult | null {
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

function processHiringNeedsTrigger(trigger: Trigger, results: UnifiedResults, config: TriggerConfig): TriggerResult | null {
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

function processCultureLearningTrigger(trigger: Trigger, results: UnifiedResults, config: TriggerConfig): TriggerResult | null {
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

function processEmployeeSkillGapTrigger(trigger: Trigger, results: UnifiedResults, config: TriggerConfig): TriggerResult | null {
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

function processCultureAlignmentTrigger(trigger: Trigger, results: UnifiedResults, config: TriggerConfig): TriggerResult | null {
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

function processStructureOptimalTrigger(trigger: Trigger, results: UnifiedResults, config: TriggerConfig): TriggerResult | null {
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

function processStructureInflatedTrigger(trigger: Trigger, results: UnifiedResults, config: TriggerConfig): TriggerResult | null {
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

function processCandidateHiredTrigger(trigger: Trigger, results: UnifiedResults, config: TriggerConfig): TriggerResult | null {
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

function processLXPCompletedTrigger(trigger: Trigger, results: UnifiedResults, config: TriggerConfig): TriggerResult | null {
  // This trigger is typically activated by LXP module events when training plans are completed
  // It would be triggered when LXP training plans are finished and performance evaluation is needed
  
  // Check if there are completed training activities
  const hasCompletedTraining = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('completed') ||
      rec.title.toLowerCase().includes('finished') ||
      rec.title.toLowerCase().includes('training done') ||
      rec.title.toLowerCase().includes('course completed')
    )
  );
  
  // Check for performance evaluation needs
  const hasPerformanceEvaluationNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('evaluate') ||
      rec.title.toLowerCase().includes('assess') ||
      rec.title.toLowerCase().includes('measure') ||
      rec.title.toLowerCase().includes('performance') ||
      rec.title.toLowerCase().includes('review')
    )
  );
  
  // Check for skill improvement tracking
  const hasSkillImprovementTracking = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('track') ||
      rec.title.toLowerCase().includes('monitor') ||
      rec.title.toLowerCase().includes('progress') ||
      rec.title.toLowerCase().includes('improvement') ||
      rec.title.toLowerCase().includes('development')
    )
  );
  
  // Check for LXP completion indicators
  const hasLXPCompletion = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('lxp') ||
      rec.title.toLowerCase().includes('learning') ||
      rec.title.toLowerCase().includes('training plan') ||
      rec.title.toLowerCase().includes('development plan')
    )
  );
  
  // This trigger would typically be activated by external LXP module events
  // For now, we'll check if there are skills-related recommendations that indicate completed training
  if ((hasCompletedTraining || hasLXPCompletion) && (hasPerformanceEvaluationNeeds || hasSkillImprovementTracking)) {
    return {
      id: randomUUID(),
      triggerId: trigger.id,
      reason: 'LXP training plans completed - initiate performance management to evaluate training effectiveness',
      action: 'activate_performance_management_module',
      priority: 'medium',
      data: {
        triggerSource: 'lxp_module',
        completedTraining: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('completed') ||
            rec.title.toLowerCase().includes('finished') ||
            rec.title.toLowerCase().includes('lxp')
          )
        ),
        performanceEvaluationNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('evaluate') ||
            rec.title.toLowerCase().includes('assess') ||
            rec.title.toLowerCase().includes('performance')
          )
        ),
        skillTrackingRequirements: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('track') ||
            rec.title.toLowerCase().includes('monitor') ||
            rec.title.toLowerCase().includes('progress')
          )
        ),
        trainingEffectiveness: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('effectiveness') ||
            rec.title.toLowerCase().includes('impact') ||
            rec.title.toLowerCase().includes('outcome')
          )
        ),
        recommendations: results.recommendations.filter(r => r.category === 'skills')
      },
      executed: false
    };
  }
  
  return null;
}

function processPerformanceRewardTrigger(trigger: Trigger, results: UnifiedResults, config: TriggerConfig): TriggerResult | null {
  // This trigger is typically activated by performance management module events
  // It would be triggered when performance management results show 100%+ performance
  
  const performanceThreshold = config.performanceThreshold || 1.0; // 100% performance threshold
  
  // Check if there are excellent performance indicators
  const hasExcellentPerformance = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('excellent') ||
      rec.title.toLowerCase().includes('outstanding') ||
      rec.title.toLowerCase().includes('exceptional') ||
      rec.title.toLowerCase().includes('exceeds expectations') ||
      rec.title.toLowerCase().includes('100%') ||
      rec.title.toLowerCase().includes('perfect score')
    )
  );
  
  // Check for high performance scores
  const hasHighPerformanceScore = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('high performance') ||
      rec.title.toLowerCase().includes('top performer') ||
      rec.title.toLowerCase().includes('above target') ||
      rec.title.toLowerCase().includes('exceeds goals')
    )
  );
  
  // Check for reward recommendations
  const hasRewardRecommendations = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('reward') ||
      rec.title.toLowerCase().includes('bonus') ||
      rec.title.toLowerCase().includes('recognition') ||
      rec.title.toLowerCase().includes('incentive') ||
      rec.title.toLowerCase().includes('compensation')
    )
  );
  
  // Check for bonus eligibility indicators
  const hasBonusEligibility = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('bonus eligible') ||
      rec.title.toLowerCase().includes('performance bonus') ||
      rec.title.toLowerCase().includes('merit increase') ||
      rec.title.toLowerCase().includes('salary adjustment')
    )
  );
  
  // This trigger would typically be activated by external performance management module events
  // For now, we'll check if there are performance-related recommendations that indicate excellent performance
  if ((hasExcellentPerformance || hasHighPerformanceScore) && (hasRewardRecommendations || hasBonusEligibility)) {
    return {
      id: randomUUID(),
      triggerId: trigger.id,
      reason: 'Performance management results show 100%+ performance - activate reward module and bonus system',
      action: 'activate_reward_module_and_bonus',
      priority: 'high',
      data: {
        triggerSource: 'performance_management_module',
        performanceLevel: hasExcellentPerformance ? 'Excellent' : 'High',
        performanceIndicators: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('excellent') ||
            rec.title.toLowerCase().includes('outstanding') ||
            rec.title.toLowerCase().includes('100%')
          )
        ),
        rewardRecommendations: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('reward') ||
            rec.title.toLowerCase().includes('recognition') ||
            rec.title.toLowerCase().includes('incentive')
          )
        ),
        bonusEligibility: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('bonus') ||
            rec.title.toLowerCase().includes('merit') ||
            rec.title.toLowerCase().includes('compensation')
          )
        ),
        performanceMetrics: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('score') ||
            rec.title.toLowerCase().includes('target') ||
            rec.title.toLowerCase().includes('goal')
          )
        ),
        recommendations: results.recommendations.filter(r => r.category === 'performance')
      },
      executed: false
    };
  }
  
  return null;
}

function processPerformanceLXPTrigger(trigger: Trigger, results: UnifiedResults, config: TriggerConfig): TriggerResult | null {
  // This trigger is typically activated by performance management module events
  // It would be triggered when performance management results show exactly 100% performance for continued learning
  
  const perfectPerformanceThreshold = config.perfectPerformanceThreshold || 1.0; // 100% performance threshold
  
  // Check if there are perfect performance indicators (exactly 100%)
  const hasPerfectPerformance = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('100%') ||
      rec.title.toLowerCase().includes('perfect score') ||
      rec.title.toLowerCase().includes('full target') ||
      rec.title.toLowerCase().includes('complete achievement')
    )
  );
  
  // Check for continued learning recommendations
  const hasContinuedLearningNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('continue learning') ||
      rec.title.toLowerCase().includes('advanced training') ||
      rec.title.toLowerCase().includes('next level') ||
      rec.title.toLowerCase().includes('skill development') ||
      rec.title.toLowerCase().includes('career advancement')
    )
  );
  
  // Check for LXP recommendations for high performers
  const hasLXPRecommendations = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('lxp') ||
      rec.title.toLowerCase().includes('learning experience') ||
      rec.title.toLowerCase().includes('development plan') ||
      rec.title.toLowerCase().includes('upskilling') ||
      rec.title.toLowerCase().includes('reskilling')
    )
  );
  
  // Check for leadership development needs
  const hasLeadershipDevelopment = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('leadership') ||
      rec.title.toLowerCase().includes('mentoring') ||
      rec.title.toLowerCase().includes('coaching') ||
      rec.title.toLowerCase().includes('management') ||
      rec.title.toLowerCase().includes('supervision')
    )
  );
  
  // This trigger would typically be activated by external performance management module events
  // For now, we'll check if there are performance-related recommendations that indicate perfect performance
  if (hasPerfectPerformance && (hasContinuedLearningNeeds || hasLXPRecommendations || hasLeadershipDevelopment)) {
    return {
      id: randomUUID(),
      triggerId: trigger.id,
      reason: 'Performance management results show 100% performance - activate LXP for continued learning and development',
      action: 'activate_lxp_module',
      priority: 'medium',
      data: {
        triggerSource: 'performance_management_module',
        performanceLevel: 'Perfect (100%)',
        performanceIndicators: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('100%') ||
            rec.title.toLowerCase().includes('perfect') ||
            rec.title.toLowerCase().includes('complete')
          )
        ),
        continuedLearningNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('continue') ||
            rec.title.toLowerCase().includes('advanced') ||
            rec.title.toLowerCase().includes('next level')
          )
        ),
        lxpRecommendations: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('lxp') ||
            rec.title.toLowerCase().includes('learning') ||
            rec.title.toLowerCase().includes('development')
          )
        ),
        leadershipDevelopment: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('leadership') ||
            rec.title.toLowerCase().includes('mentoring') ||
            rec.title.toLowerCase().includes('coaching')
          )
        ),
        recommendations: results.recommendations.filter(r => r.category === 'performance')
      },
      executed: false
    };
  }
  
  return null;
}

function processPerformanceTalentSuccessionTrigger(trigger: Trigger, results: UnifiedResults, config: TriggerConfig): TriggerResult | null {
  // This trigger is typically activated by performance management module events
  // It would be triggered when performance management results show 105%+ performance for talent management and succession planning
  
  const exceptionalPerformanceThreshold = config.exceptionalPerformanceThreshold || 1.05; // 105% performance threshold
  
  // Check if there are exceptional performance indicators (105%+)
  const hasExceptionalPerformance = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('105%') ||
      rec.title.toLowerCase().includes('110%') ||
      rec.title.toLowerCase().includes('exceptional') ||
      rec.title.toLowerCase().includes('outstanding') ||
      rec.title.toLowerCase().includes('exceeds all expectations') ||
      rec.title.toLowerCase().includes('above and beyond')
    )
  );
  
  // Check for talent management recommendations
  const hasTalentManagementNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('talent management') ||
      rec.title.toLowerCase().includes('high potential') ||
      rec.title.toLowerCase().includes('key talent') ||
      rec.title.toLowerCase().includes('talent pipeline') ||
      rec.title.toLowerCase().includes('talent development')
    )
  );
  
  // Check for succession planning recommendations
  const hasSuccessionPlanningNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('succession') ||
      rec.title.toLowerCase().includes('leadership pipeline') ||
      rec.title.toLowerCase().includes('future leader') ||
      rec.title.toLowerCase().includes('promotion ready') ||
      rec.title.toLowerCase().includes('management potential')
    )
  );
  
  // Check for leadership readiness indicators
  const hasLeadershipReadiness = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('leadership ready') ||
      rec.title.toLowerCase().includes('management material') ||
      rec.title.toLowerCase().includes('executive potential') ||
      rec.title.toLowerCase().includes('senior role') ||
      rec.title.toLowerCase().includes('director level')
    )
  );
  
  // Check for career advancement opportunities
  const hasCareerAdvancement = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('career advancement') ||
      rec.title.toLowerCase().includes('promotion') ||
      rec.title.toLowerCase().includes('next level') ||
      rec.title.toLowerCase().includes('senior position') ||
      rec.title.toLowerCase().includes('leadership role')
    )
  );
  
  // This trigger would typically be activated by external performance management module events
  // For now, we'll check if there are performance-related recommendations that indicate exceptional performance
  if (hasExceptionalPerformance && (hasTalentManagementNeeds || hasSuccessionPlanningNeeds || hasLeadershipReadiness || hasCareerAdvancement)) {
    return {
      id: randomUUID(),
      triggerId: trigger.id,
      reason: 'Performance management results show 105%+ performance - activate talent management and succession planning modules (leadership development handled by LXP)',
      action: 'activate_talent_management_and_succession_planning_modules',
      priority: 'high',
      data: {
        triggerSource: 'performance_management_module',
        performanceLevel: 'Exceptional (105%+)',
        performanceIndicators: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('105%') ||
            rec.title.toLowerCase().includes('exceptional') ||
            rec.title.toLowerCase().includes('outstanding')
          )
        ),
        talentManagementNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('talent') ||
            rec.title.toLowerCase().includes('high potential') ||
            rec.title.toLowerCase().includes('key talent')
          )
        ),
        successionPlanningNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('succession') ||
            rec.title.toLowerCase().includes('leadership pipeline') ||
            rec.title.toLowerCase().includes('future leader')
          )
        ),
        leadershipReadiness: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('leadership') ||
            rec.title.toLowerCase().includes('management') ||
            rec.title.toLowerCase().includes('executive')
          )
        ),
        careerAdvancement: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('career') ||
            rec.title.toLowerCase().includes('promotion') ||
            rec.title.toLowerCase().includes('advancement')
          )
        ),
        recommendations: results.recommendations.filter(r => r.category === 'performance')
      },
      executed: false
    };
  }
  
  return null;
}

function processPerformanceImprovementLXPTrigger(trigger: Trigger, results: UnifiedResults, config: TriggerConfig): TriggerResult | null {
  // This trigger is typically activated by performance management module events
  // It would be triggered when performance management results show below 100% performance for improvement
  
  const improvementThreshold = config.improvementThreshold || 1.0; // 100% performance threshold
  
  // Check if there are below target performance indicators (< 100%)
  const hasBelowTargetPerformance = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('below target') ||
      rec.title.toLowerCase().includes('underperforming') ||
      rec.title.toLowerCase().includes('needs improvement') ||
      rec.title.toLowerCase().includes('performance gap') ||
      rec.title.toLowerCase().includes('80%') ||
      rec.title.toLowerCase().includes('90%') ||
      rec.title.toLowerCase().includes('95%')
    )
  );
  
  // Check for skill development needs
  const hasSkillDevelopmentNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('skill development') ||
      rec.title.toLowerCase().includes('training needed') ||
      rec.title.toLowerCase().includes('upskilling') ||
      rec.title.toLowerCase().includes('competency gap') ||
      rec.title.toLowerCase().includes('knowledge gap')
    )
  );
  
  // Check for LXP recommendations for improvement
  const hasLXPImprovementNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('lxp') ||
      rec.title.toLowerCase().includes('learning plan') ||
      rec.title.toLowerCase().includes('development plan') ||
      rec.title.toLowerCase().includes('improvement plan') ||
      rec.title.toLowerCase().includes('performance plan')
    )
  );
  
  // Check for coaching and mentoring needs
  const hasCoachingNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('coaching') ||
      rec.title.toLowerCase().includes('mentoring') ||
      rec.title.toLowerCase().includes('support') ||
      rec.title.toLowerCase().includes('guidance') ||
      rec.title.toLowerCase().includes('feedback')
    )
  );
  
  // Check for performance improvement opportunities
  const hasImprovementOpportunities = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('improvement') ||
      rec.title.toLowerCase().includes('enhancement') ||
      rec.title.toLowerCase().includes('development') ||
      rec.title.toLowerCase().includes('growth') ||
      rec.title.toLowerCase().includes('progress')
    )
  );
  
  // This trigger would typically be activated by external performance management module events
  // For now, we'll check if there are performance-related recommendations that indicate below target performance
  if (hasBelowTargetPerformance && (hasSkillDevelopmentNeeds || hasLXPImprovementNeeds || hasCoachingNeeds || hasImprovementOpportunities)) {
    return {
      id: randomUUID(),
      triggerId: trigger.id,
      reason: 'Performance management results show below 100% performance - activate LXP for skill development and performance improvement',
      action: 'activate_lxp_module',
      priority: 'high',
      data: {
        triggerSource: 'performance_management_module',
        performanceLevel: 'Below Target (< 100%)',
        performanceIndicators: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('below') ||
            rec.title.toLowerCase().includes('underperforming') ||
            rec.title.toLowerCase().includes('needs improvement')
          )
        ),
        skillDevelopmentNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('skill') ||
            rec.title.toLowerCase().includes('training') ||
            rec.title.toLowerCase().includes('upskilling')
          )
        ),
        lxpImprovementNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('lxp') ||
            rec.title.toLowerCase().includes('learning') ||
            rec.title.toLowerCase().includes('development')
          )
        ),
        coachingNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('coaching') ||
            rec.title.toLowerCase().includes('mentoring') ||
            rec.title.toLowerCase().includes('support')
          )
        ),
        improvementOpportunities: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('improvement') ||
            rec.title.toLowerCase().includes('enhancement') ||
            rec.title.toLowerCase().includes('growth')
          )
        ),
        recommendations: results.recommendations.filter(r => r.category === 'performance')
      },
      executed: false
    };
  }
  
  return null;
}

function processAnnualPerformanceReviewTrigger(trigger: Trigger, results: UnifiedResults, config: TriggerConfig): TriggerResult | null {
  // This trigger is typically activated by time-based events (scheduled jobs, calendar events)
  // It would be triggered when annual performance reviews are due based on employee hire dates or review cycles
  
  const reviewPeriod = config.reviewPeriod || 'annual';
  const advanceNoticeDays = config.advanceNoticeDays || 30;
  const reminderDays = config.reminderDays || [30, 14, 7, 1];
  
  // Check if there are performance review due indicators
  const hasReviewDueIndicators = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('annual review') ||
      rec.title.toLowerCase().includes('performance review') ||
      rec.title.toLowerCase().includes('yearly evaluation') ||
      rec.title.toLowerCase().includes('review due') ||
      rec.title.toLowerCase().includes('evaluation period') ||
      rec.title.toLowerCase().includes('performance assessment')
    )
  );
  
  // Check for performance management needs
  const hasPerformanceManagementNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('performance management') ||
      rec.title.toLowerCase().includes('evaluation') ||
      rec.title.toLowerCase().includes('assessment') ||
      rec.title.toLowerCase().includes('review process') ||
      rec.title.toLowerCase().includes('performance tracking')
    )
  );
  
  // Check for goal setting and review requirements
  const hasGoalSettingNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('goal setting') ||
      rec.title.toLowerCase().includes('objective review') ||
      rec.title.toLowerCase().includes('target assessment') ||
      rec.title.toLowerCase().includes('kpi evaluation') ||
      rec.title.toLowerCase().includes('performance metrics')
    )
  );
  
  // Check for feedback and development planning needs
  const hasFeedbackNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('feedback') ||
      rec.title.toLowerCase().includes('development plan') ||
      rec.title.toLowerCase().includes('career planning') ||
      rec.title.toLowerCase().includes('performance improvement') ||
      rec.title.toLowerCase().includes('growth planning')
    )
  );
  
  // Check for compensation and promotion considerations
  const hasCompensationNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('compensation') ||
      rec.title.toLowerCase().includes('salary review') ||
      rec.title.toLowerCase().includes('promotion') ||
      rec.title.toLowerCase().includes('merit increase') ||
      rec.title.toLowerCase().includes('bonus evaluation')
    )
  );
  
  // This trigger would typically be activated by external time-based events
  // For now, we'll check if there are performance-related recommendations that indicate review needs
  if (hasReviewDueIndicators || hasPerformanceManagementNeeds || hasGoalSettingNeeds || hasFeedbackNeeds || hasCompensationNeeds) {
    return {
      id: randomUUID(),
      triggerId: trigger.id,
      reason: 'Annual performance review is due - activate performance management module for comprehensive evaluation',
      action: 'activate_performance_management_module',
      priority: 'high',
      data: {
        triggerSource: 'time_based_scheduler',
        reviewPeriod: reviewPeriod,
        advanceNoticeDays: advanceNoticeDays,
        reminderDays: reminderDays,
        reviewDueIndicators: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('annual review') ||
            rec.title.toLowerCase().includes('performance review') ||
            rec.title.toLowerCase().includes('review due')
          )
        ),
        performanceManagementNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('performance management') ||
            rec.title.toLowerCase().includes('evaluation') ||
            rec.title.toLowerCase().includes('assessment')
          )
        ),
        goalSettingNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('goal') ||
            rec.title.toLowerCase().includes('objective') ||
            rec.title.toLowerCase().includes('target')
          )
        ),
        feedbackNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('feedback') ||
            rec.title.toLowerCase().includes('development') ||
            rec.title.toLowerCase().includes('career')
          )
        ),
        compensationNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('compensation') ||
            rec.title.toLowerCase().includes('salary') ||
            rec.title.toLowerCase().includes('promotion')
          )
        ),
        reviewSchedule: {
          period: reviewPeriod,
          advanceNotice: advanceNoticeDays,
          reminders: reminderDays
        },
        recommendations: results.recommendations.filter(r => r.category === 'performance')
      },
      executed: false
    };
  }
  
  return null;
}

function processQuarterlyCheckinTrigger(trigger: Trigger, results: UnifiedResults, config: TriggerConfig): TriggerResult | null {
  // This trigger is typically activated by time-based events (scheduled jobs, calendar events)
  // It would be triggered when quarterly check-ins are due based on employee review cycles
  
  const reviewPeriod = config.reviewPeriod || 'quarterly';
  const advanceNoticeDays = config.advanceNoticeDays || 14;
  const reminderDays = config.reminderDays || [14, 7, 3, 1];
  const checkinType = config.checkinType || 'performance_review';
  
  // Check if there are quarterly check-in due indicators
  const hasQuarterlyCheckinIndicators = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('quarterly check-in') ||
      rec.title.toLowerCase().includes('quarterly review') ||
      rec.title.toLowerCase().includes('q1 review') ||
      rec.title.toLowerCase().includes('q2 review') ||
      rec.title.toLowerCase().includes('q3 review') ||
      rec.title.toLowerCase().includes('q4 review') ||
      rec.title.toLowerCase().includes('quarterly evaluation') ||
      rec.title.toLowerCase().includes('quarterly assessment')
    )
  );
  
  // Check for performance review needs (part of performance management module)
  const hasPerformanceReviewNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('performance review') ||
      rec.title.toLowerCase().includes('review meeting') ||
      rec.title.toLowerCase().includes('check-in meeting') ||
      rec.title.toLowerCase().includes('one-on-one') ||
      rec.title.toLowerCase().includes('performance discussion')
    )
  );
  
  // Check for progress tracking and goal updates
  const hasProgressTrackingNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('progress tracking') ||
      rec.title.toLowerCase().includes('goal progress') ||
      rec.title.toLowerCase().includes('milestone review') ||
      rec.title.toLowerCase().includes('quarterly goals') ||
      rec.title.toLowerCase().includes('objective progress')
    )
  );
  
  // Check for feedback and coaching needs
  const hasFeedbackCoachingNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('feedback session') ||
      rec.title.toLowerCase().includes('coaching session') ||
      rec.title.toLowerCase().includes('development discussion') ||
      rec.title.toLowerCase().includes('performance feedback') ||
      rec.title.toLowerCase().includes('guidance session')
    )
  );
  
  // Check for performance management module activation
  const hasPerformanceManagementNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('performance management') ||
      rec.title.toLowerCase().includes('performance tracking') ||
      rec.title.toLowerCase().includes('performance monitoring') ||
      rec.title.toLowerCase().includes('performance evaluation')
    )
  );
  
  // Check for quarterly planning and adjustment needs
  const hasQuarterlyPlanningNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('quarterly planning') ||
      rec.title.toLowerCase().includes('goal adjustment') ||
      rec.title.toLowerCase().includes('strategy review') ||
      rec.title.toLowerCase().includes('quarterly adjustment') ||
      rec.title.toLowerCase().includes('plan revision')
    )
  );
  
  // This trigger would typically be activated by external time-based events
  // For now, we'll check if there are performance-related recommendations that indicate quarterly check-in needs
  if (hasQuarterlyCheckinIndicators || hasPerformanceReviewNeeds || hasProgressTrackingNeeds || hasFeedbackCoachingNeeds || hasPerformanceManagementNeeds || hasQuarterlyPlanningNeeds) {
    return {
      id: randomUUID(),
      triggerId: trigger.id,
      reason: 'Quarterly check-in is due - activate performance review part of performance management module',
      action: 'activate_performance_review_module',
      priority: 'medium',
      data: {
        triggerSource: 'time_based_scheduler',
        reviewPeriod: reviewPeriod,
        advanceNoticeDays: advanceNoticeDays,
        reminderDays: reminderDays,
        checkinType: checkinType,
        quarterlyCheckinIndicators: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('quarterly') ||
            rec.title.toLowerCase().includes('check-in') ||
            rec.title.toLowerCase().includes('q1') ||
            rec.title.toLowerCase().includes('q2') ||
            rec.title.toLowerCase().includes('q3') ||
            rec.title.toLowerCase().includes('q4')
          )
        ),
        performanceReviewNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('performance review') ||
            rec.title.toLowerCase().includes('review meeting') ||
            rec.title.toLowerCase().includes('check-in meeting')
          )
        ),
        progressTrackingNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('progress') ||
            rec.title.toLowerCase().includes('goal') ||
            rec.title.toLowerCase().includes('milestone')
          )
        ),
        feedbackCoachingNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('feedback') ||
            rec.title.toLowerCase().includes('coaching') ||
            rec.title.toLowerCase().includes('development')
          )
        ),
        performanceManagementNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('performance management') ||
            rec.title.toLowerCase().includes('performance tracking')
          )
        ),
        quarterlyPlanningNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('quarterly planning') ||
            rec.title.toLowerCase().includes('goal adjustment') ||
            rec.title.toLowerCase().includes('strategy review')
          )
        ),
        checkinSchedule: {
          period: reviewPeriod,
          advanceNotice: advanceNoticeDays,
          reminders: reminderDays,
          type: checkinType
        },
        recommendations: results.recommendations.filter(r => r.category === 'performance')
      },
      executed: false
    };
  }
  
  return null;
}

function processProbationPeriodEndingTrigger(trigger: Trigger, results: UnifiedResults, config: TriggerConfig): TriggerResult | null {
  // This trigger is typically activated by time-based events (scheduled jobs, calendar events)
  // It would be triggered when an employee's probation period is ending based on their hire date
  
  const probationPeriod = config.probationPeriod || 'standard';
  const advanceNoticeDays = config.advanceNoticeDays || 7;
  const reminderDays = config.reminderDays || [7, 3, 1];
  const evaluationType = config.evaluationType || 'performance_evaluation';
  
  // Check if there are probation period ending indicators
  const hasProbationEndingIndicators = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('probation ending') ||
      rec.title.toLowerCase().includes('probation period') ||
      rec.title.toLowerCase().includes('probation review') ||
      rec.title.toLowerCase().includes('probation evaluation') ||
      rec.title.toLowerCase().includes('probation assessment') ||
      rec.title.toLowerCase().includes('probation completion')
    )
  );
  
  // Check for performance evaluation needs (part of performance management module)
  const hasPerformanceEvaluationNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('performance evaluation') ||
      rec.title.toLowerCase().includes('evaluation meeting') ||
      rec.title.toLowerCase().includes('probation evaluation') ||
      rec.title.toLowerCase().includes('performance assessment') ||
      rec.title.toLowerCase().includes('evaluation review')
    )
  );
  
  // Check for probation decision requirements
  const hasProbationDecisionNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('probation decision') ||
      rec.title.toLowerCase().includes('employment decision') ||
      rec.title.toLowerCase().includes('hire confirmation') ||
      rec.title.toLowerCase().includes('probation outcome') ||
      rec.title.toLowerCase().includes('employment status')
    )
  );
  
  // Check for performance management module activation
  const hasPerformanceManagementNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('performance management') ||
      rec.title.toLowerCase().includes('performance tracking') ||
      rec.title.toLowerCase().includes('performance monitoring') ||
      rec.title.toLowerCase().includes('performance evaluation')
    )
  );
  
  // Check for feedback and development needs
  const hasFeedbackDevelopmentNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('feedback session') ||
      rec.title.toLowerCase().includes('development plan') ||
      rec.title.toLowerCase().includes('performance feedback') ||
      rec.title.toLowerCase().includes('improvement plan') ||
      rec.title.toLowerCase().includes('development discussion')
    )
  );
  
  // Check for onboarding completion and transition needs
  const hasOnboardingTransitionNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('onboarding completion') ||
      rec.title.toLowerCase().includes('transition to permanent') ||
      rec.title.toLowerCase().includes('full employee status') ||
      rec.title.toLowerCase().includes('probation success') ||
      rec.title.toLowerCase().includes('employment confirmation')
    )
  );
  
  // Check for training and development completion
  const hasTrainingCompletionNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('training completion') ||
      rec.title.toLowerCase().includes('orientation completion') ||
      rec.title.toLowerCase().includes('probation training') ||
      rec.title.toLowerCase().includes('initial training') ||
      rec.title.toLowerCase().includes('onboarding training')
    )
  );
  
  // This trigger would typically be activated by external time-based events
  // For now, we'll check if there are performance-related recommendations that indicate probation ending needs
  if (hasProbationEndingIndicators || hasPerformanceEvaluationNeeds || hasProbationDecisionNeeds || hasPerformanceManagementNeeds || hasFeedbackDevelopmentNeeds || hasOnboardingTransitionNeeds || hasTrainingCompletionNeeds) {
    return {
      id: randomUUID(),
      triggerId: trigger.id,
      reason: 'Probation period is ending - activate performance evaluation part of performance management module',
      action: 'activate_performance_evaluation_module',
      priority: 'high',
      data: {
        triggerSource: 'time_based_scheduler',
        probationPeriod: probationPeriod,
        advanceNoticeDays: advanceNoticeDays,
        reminderDays: reminderDays,
        evaluationType: evaluationType,
        probationEndingIndicators: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('probation') ||
            rec.title.toLowerCase().includes('probation ending') ||
            rec.title.toLowerCase().includes('probation period')
          )
        ),
        performanceEvaluationNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('performance evaluation') ||
            rec.title.toLowerCase().includes('evaluation') ||
            rec.title.toLowerCase().includes('assessment')
          )
        ),
        probationDecisionNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('probation decision') ||
            rec.title.toLowerCase().includes('employment decision') ||
            rec.title.toLowerCase().includes('hire confirmation')
          )
        ),
        performanceManagementNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('performance management') ||
            rec.title.toLowerCase().includes('performance tracking')
          )
        ),
        feedbackDevelopmentNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('feedback') ||
            rec.title.toLowerCase().includes('development') ||
            rec.title.toLowerCase().includes('improvement')
          )
        ),
        onboardingTransitionNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('onboarding') ||
            rec.title.toLowerCase().includes('transition') ||
            rec.title.toLowerCase().includes('permanent')
          )
        ),
        trainingCompletionNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('training') ||
            rec.title.toLowerCase().includes('orientation') ||
            rec.title.toLowerCase().includes('completion')
          )
        ),
        probationSchedule: {
          period: probationPeriod,
          advanceNotice: advanceNoticeDays,
          reminders: reminderDays,
          evaluationType: evaluationType
        },
        recommendations: results.recommendations.filter(r => r.category === 'performance')
      },
      executed: false
    };
  }
  
  return null;
}

function processComplianceTrainingDueTrigger(trigger: Trigger, results: UnifiedResults, config: TriggerConfig): TriggerResult | null {
  // This trigger is typically activated by time-based events (scheduled jobs, calendar events)
  // It would be triggered when compliance training is due based on regulatory requirements, expiration dates, or policy updates
  
  const trainingType = config.trainingType || 'compliance';
  const advanceNoticeDays = config.advanceNoticeDays || 30;
  const reminderDays = config.reminderDays || [30, 14, 7, 1];
  const moduleType = config.moduleType || 'lxp_compliance_training';
  
  // Check if there are compliance training due indicators
  const hasComplianceTrainingIndicators = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('compliance training') ||
      rec.title.toLowerCase().includes('compliance due') ||
      rec.title.toLowerCase().includes('regulatory training') ||
      rec.title.toLowerCase().includes('mandatory training') ||
      rec.title.toLowerCase().includes('compliance certification') ||
      rec.title.toLowerCase().includes('compliance renewal')
    )
  );
  
  // Check for LXP compliance training module needs (part of LXP)
  const hasLXPComplianceNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('lxp compliance') ||
      rec.title.toLowerCase().includes('learning compliance') ||
      rec.title.toLowerCase().includes('training module') ||
      rec.title.toLowerCase().includes('compliance course') ||
      rec.title.toLowerCase().includes('compliance learning')
    )
  );
  
  // Check for regulatory and policy compliance needs
  const hasRegulatoryComplianceNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('regulatory compliance') ||
      rec.title.toLowerCase().includes('policy compliance') ||
      rec.title.toLowerCase().includes('legal compliance') ||
      rec.title.toLowerCase().includes('industry compliance') ||
      rec.title.toLowerCase().includes('compliance standards')
    )
  );
  
  // Check for certification and renewal needs
  const hasCertificationNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('certification due') ||
      rec.title.toLowerCase().includes('certification renewal') ||
      rec.title.toLowerCase().includes('certification expiring') ||
      rec.title.toLowerCase().includes('license renewal') ||
      rec.title.toLowerCase().includes('credential renewal')
    )
  );
  
  // Check for safety and security training needs
  const hasSafetySecurityNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('safety training') ||
      rec.title.toLowerCase().includes('security training') ||
      rec.title.toLowerCase().includes('workplace safety') ||
      rec.title.toLowerCase().includes('data security') ||
      rec.title.toLowerCase().includes('cybersecurity')
    )
  );
  
  // Check for ethics and conduct training needs
  const hasEthicsConductNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('ethics training') ||
      rec.title.toLowerCase().includes('code of conduct') ||
      rec.title.toLowerCase().includes('anti-harassment') ||
      rec.title.toLowerCase().includes('diversity training') ||
      rec.title.toLowerCase().includes('workplace conduct')
    )
  );
  
  // Check for industry-specific compliance needs
  const hasIndustryComplianceNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('industry compliance') ||
      rec.title.toLowerCase().includes('sector compliance') ||
      rec.title.toLowerCase().includes('professional standards') ||
      rec.title.toLowerCase().includes('industry regulations') ||
      rec.title.toLowerCase().includes('sector requirements')
    )
  );
  
  // This trigger would typically be activated by external time-based events
  // For now, we'll check if there are skills-related recommendations that indicate compliance training needs
  if (hasComplianceTrainingIndicators || hasLXPComplianceNeeds || hasRegulatoryComplianceNeeds || hasCertificationNeeds || hasSafetySecurityNeeds || hasEthicsConductNeeds || hasIndustryComplianceNeeds) {
    return {
      id: randomUUID(),
      triggerId: trigger.id,
      reason: 'Compliance training is due - activate compliance training module part of LXP',
      action: 'activate_lxp_compliance_training_module',
      priority: 'high',
      data: {
        triggerSource: 'time_based_scheduler',
        trainingType: trainingType,
        advanceNoticeDays: advanceNoticeDays,
        reminderDays: reminderDays,
        moduleType: moduleType,
        complianceTrainingIndicators: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('compliance') ||
            rec.title.toLowerCase().includes('regulatory') ||
            rec.title.toLowerCase().includes('mandatory')
          )
        ),
        lxpComplianceNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('lxp') ||
            rec.title.toLowerCase().includes('learning') ||
            rec.title.toLowerCase().includes('training module')
          )
        ),
        regulatoryComplianceNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('regulatory') ||
            rec.title.toLowerCase().includes('policy') ||
            rec.title.toLowerCase().includes('legal')
          )
        ),
        certificationNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('certification') ||
            rec.title.toLowerCase().includes('license') ||
            rec.title.toLowerCase().includes('credential')
          )
        ),
        safetySecurityNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('safety') ||
            rec.title.toLowerCase().includes('security') ||
            rec.title.toLowerCase().includes('cybersecurity')
          )
        ),
        ethicsConductNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('ethics') ||
            rec.title.toLowerCase().includes('conduct') ||
            rec.title.toLowerCase().includes('harassment')
          )
        ),
        industryComplianceNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('industry') ||
            rec.title.toLowerCase().includes('sector') ||
            rec.title.toLowerCase().includes('professional')
          )
        ),
        trainingSchedule: {
          type: trainingType,
          advanceNotice: advanceNoticeDays,
          reminders: reminderDays,
          moduleType: moduleType
        },
        recommendations: results.recommendations.filter(r => r.category === 'skills')
      },
      executed: false
    };
  }
  
  return null;
}

function processSafetyTrainingExpiredTrigger(trigger: Trigger, results: UnifiedResults, config: TriggerConfig): TriggerResult | null {
  // This trigger is typically activated by time-based events (scheduled jobs, calendar events)
  // It would be triggered when safety training has expired based on certification dates, regulatory requirements, or policy updates
  
  const trainingType = config.trainingType || 'safety';
  const advanceNoticeDays = config.advanceNoticeDays || 14;
  const reminderDays = config.reminderDays || [14, 7, 3, 1];
  const moduleType = config.moduleType || 'lxp_safety_training';
  
  // Check if there are safety training expired indicators
  const hasSafetyTrainingExpiredIndicators = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('safety training expired') ||
      rec.title.toLowerCase().includes('safety certification expired') ||
      rec.title.toLowerCase().includes('safety training due') ||
      rec.title.toLowerCase().includes('safety renewal required') ||
      rec.title.toLowerCase().includes('safety training outdated') ||
      rec.title.toLowerCase().includes('safety compliance expired')
    )
  );
  
  // Check for LXP safety training module needs (part of LXP)
  const hasLXPSafetyNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('lxp safety') ||
      rec.title.toLowerCase().includes('learning safety') ||
      rec.title.toLowerCase().includes('safety training module') ||
      rec.title.toLowerCase().includes('safety course') ||
      rec.title.toLowerCase().includes('safety learning')
    )
  );
  
  // Check for workplace safety training needs
  const hasWorkplaceSafetyNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('workplace safety') ||
      rec.title.toLowerCase().includes('occupational safety') ||
      rec.title.toLowerCase().includes('work safety') ||
      rec.title.toLowerCase().includes('job safety') ||
      rec.title.toLowerCase().includes('employee safety')
    )
  );
  
  // Check for emergency response and first aid training needs
  const hasEmergencyResponseNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('emergency response') ||
      rec.title.toLowerCase().includes('first aid') ||
      rec.title.toLowerCase().includes('cpr training') ||
      rec.title.toLowerCase().includes('emergency procedures') ||
      rec.title.toLowerCase().includes('crisis management')
    )
  );
  
  // Check for equipment and machinery safety training needs
  const hasEquipmentSafetyNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('equipment safety') ||
      rec.title.toLowerCase().includes('machinery safety') ||
      rec.title.toLowerCase().includes('tool safety') ||
      rec.title.toLowerCase().includes('safety equipment') ||
      rec.title.toLowerCase().includes('protective equipment')
    )
  );
  
  // Check for hazard identification and risk assessment training needs
  const hasHazardRiskNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('hazard identification') ||
      rec.title.toLowerCase().includes('risk assessment') ||
      rec.title.toLowerCase().includes('safety hazards') ||
      rec.title.toLowerCase().includes('workplace hazards') ||
      rec.title.toLowerCase().includes('safety risks')
    )
  );
  
  // Check for industry-specific safety training needs
  const hasIndustrySafetyNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('industry safety') ||
      rec.title.toLowerCase().includes('sector safety') ||
      rec.title.toLowerCase().includes('construction safety') ||
      rec.title.toLowerCase().includes('manufacturing safety') ||
      rec.title.toLowerCase().includes('healthcare safety')
    )
  );
  
  // Check for environmental safety and health training needs
  const hasEnvironmentalSafetyNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('environmental safety') ||
      rec.title.toLowerCase().includes('health and safety') ||
      rec.title.toLowerCase().includes('ehs training') ||
      rec.title.toLowerCase().includes('environmental health') ||
      rec.title.toLowerCase().includes('safety regulations')
    )
  );
  
  // This trigger would typically be activated by external time-based events
  // For now, we'll check if there are skills-related recommendations that indicate safety training needs
  if (hasSafetyTrainingExpiredIndicators || hasLXPSafetyNeeds || hasWorkplaceSafetyNeeds || hasEmergencyResponseNeeds || hasEquipmentSafetyNeeds || hasHazardRiskNeeds || hasIndustrySafetyNeeds || hasEnvironmentalSafetyNeeds) {
    return {
      id: randomUUID(),
      triggerId: trigger.id,
      reason: 'Safety training has expired - activate safety training module part of LXP',
      action: 'activate_lxp_safety_training_module',
      priority: 'high',
      data: {
        triggerSource: 'time_based_scheduler',
        trainingType: trainingType,
        advanceNoticeDays: advanceNoticeDays,
        reminderDays: reminderDays,
        moduleType: moduleType,
        safetyTrainingExpiredIndicators: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('safety') ||
            rec.title.toLowerCase().includes('expired') ||
            rec.title.toLowerCase().includes('due')
          )
        ),
        lxpSafetyNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('lxp') ||
            rec.title.toLowerCase().includes('learning') ||
            rec.title.toLowerCase().includes('training module')
          )
        ),
        workplaceSafetyNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('workplace') ||
            rec.title.toLowerCase().includes('occupational') ||
            rec.title.toLowerCase().includes('work safety')
          )
        ),
        emergencyResponseNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('emergency') ||
            rec.title.toLowerCase().includes('first aid') ||
            rec.title.toLowerCase().includes('cpr')
          )
        ),
        equipmentSafetyNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('equipment') ||
            rec.title.toLowerCase().includes('machinery') ||
            rec.title.toLowerCase().includes('tool safety')
          )
        ),
        hazardRiskNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('hazard') ||
            rec.title.toLowerCase().includes('risk') ||
            rec.title.toLowerCase().includes('safety hazards')
          )
        ),
        industrySafetyNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('industry') ||
            rec.title.toLowerCase().includes('sector') ||
            rec.title.toLowerCase().includes('construction')
          )
        ),
        environmentalSafetyNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('environmental') ||
            rec.title.toLowerCase().includes('health and safety') ||
            rec.title.toLowerCase().includes('ehs')
          )
        ),
        trainingSchedule: {
          type: trainingType,
          advanceNotice: advanceNoticeDays,
          reminders: reminderDays,
          moduleType: moduleType
        },
        recommendations: results.recommendations.filter(r => r.category === 'skills')
      },
      executed: false
    };
  }
  
  return null;
}

function processCertificationExpiringTrigger(trigger: Trigger, results: UnifiedResults, config: TriggerConfig): TriggerResult | null {
  // This trigger is typically activated by time-based events (scheduled jobs, calendar events)
  // It would be triggered when professional certifications are expiring based on certification dates, renewal requirements, or continuing education needs
  
  const certificationType = config.certificationType || 'professional';
  const advanceNoticeDays = config.advanceNoticeDays || 60;
  const reminderDays = config.reminderDays || [60, 30, 14, 7, 1];
  const moduleType = config.moduleType || 'lxp_certification_renewal';
  
  // Check if there are certification expiring indicators
  const hasCertificationExpiringIndicators = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('certification expiring') ||
      rec.title.toLowerCase().includes('certification due') ||
      rec.title.toLowerCase().includes('certification renewal') ||
      rec.title.toLowerCase().includes('license expiring') ||
      rec.title.toLowerCase().includes('credential expiring') ||
      rec.title.toLowerCase().includes('professional certification')
    )
  );
  
  // Check for LXP certification renewal module needs (part of LXP)
  const hasLXPCertificationNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('lxp certification') ||
      rec.title.toLowerCase().includes('learning certification') ||
      rec.title.toLowerCase().includes('certification module') ||
      rec.title.toLowerCase().includes('certification course') ||
      rec.title.toLowerCase().includes('certification learning')
    )
  );
  
  // Check for professional development and continuing education needs
  const hasProfessionalDevelopmentNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('professional development') ||
      rec.title.toLowerCase().includes('continuing education') ||
      rec.title.toLowerCase().includes('ce credits') ||
      rec.title.toLowerCase().includes('professional growth') ||
      rec.title.toLowerCase().includes('career advancement')
    )
  );
  
  // Check for industry-specific certification needs
  const hasIndustryCertificationNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('industry certification') ||
      rec.title.toLowerCase().includes('sector certification') ||
      rec.title.toLowerCase().includes('professional license') ||
      rec.title.toLowerCase().includes('trade certification') ||
      rec.title.toLowerCase().includes('technical certification')
    )
  );
  
  // Check for compliance and regulatory certification needs
  const hasComplianceCertificationNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('compliance certification') ||
      rec.title.toLowerCase().includes('regulatory certification') ||
      rec.title.toLowerCase().includes('audit certification') ||
      rec.title.toLowerCase().includes('quality certification') ||
      rec.title.toLowerCase().includes('standard certification')
    )
  );
  
  // Check for technology and digital certification needs
  const hasTechnologyCertificationNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('technology certification') ||
      rec.title.toLowerCase().includes('digital certification') ||
      rec.title.toLowerCase().includes('software certification') ||
      rec.title.toLowerCase().includes('it certification') ||
      rec.title.toLowerCase().includes('technical skills')
    )
  );
  
  // Check for leadership and management certification needs
  const hasLeadershipCertificationNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('leadership certification') ||
      rec.title.toLowerCase().includes('management certification') ||
      rec.title.toLowerCase().includes('project management') ||
      rec.title.toLowerCase().includes('executive certification') ||
      rec.title.toLowerCase().includes('leadership development')
    )
  );
  
  // Check for specialized skill certification needs
  const hasSpecializedCertificationNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('specialized certification') ||
      rec.title.toLowerCase().includes('expert certification') ||
      rec.title.toLowerCase().includes('advanced certification') ||
      rec.title.toLowerCase().includes('master certification') ||
      rec.title.toLowerCase().includes('expertise certification')
    )
  );
  
  // This trigger would typically be activated by external time-based events
  // For now, we'll check if there are skills-related recommendations that indicate certification renewal needs
  if (hasCertificationExpiringIndicators || hasLXPCertificationNeeds || hasProfessionalDevelopmentNeeds || hasIndustryCertificationNeeds || hasComplianceCertificationNeeds || hasTechnologyCertificationNeeds || hasLeadershipCertificationNeeds || hasSpecializedCertificationNeeds) {
    return {
      id: randomUUID(),
      triggerId: trigger.id,
      reason: 'Certification is expiring - activate certification renewal module part of LXP',
      action: 'activate_lxp_certification_renewal_module',
      priority: 'high',
      data: {
        triggerSource: 'time_based_scheduler',
        certificationType: certificationType,
        advanceNoticeDays: advanceNoticeDays,
        reminderDays: reminderDays,
        moduleType: moduleType,
        certificationExpiringIndicators: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('certification') ||
            rec.title.toLowerCase().includes('expiring') ||
            rec.title.toLowerCase().includes('renewal')
          )
        ),
        lxpCertificationNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('lxp') ||
            rec.title.toLowerCase().includes('learning') ||
            rec.title.toLowerCase().includes('certification module')
          )
        ),
        professionalDevelopmentNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('professional') ||
            rec.title.toLowerCase().includes('continuing') ||
            rec.title.toLowerCase().includes('ce credits')
          )
        ),
        industryCertificationNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('industry') ||
            rec.title.toLowerCase().includes('sector') ||
            rec.title.toLowerCase().includes('professional license')
          )
        ),
        complianceCertificationNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('compliance') ||
            rec.title.toLowerCase().includes('regulatory') ||
            rec.title.toLowerCase().includes('audit')
          )
        ),
        technologyCertificationNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('technology') ||
            rec.title.toLowerCase().includes('digital') ||
            rec.title.toLowerCase().includes('software')
          )
        ),
        leadershipCertificationNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('leadership') ||
            rec.title.toLowerCase().includes('management') ||
            rec.title.toLowerCase().includes('project management')
          )
        ),
        specializedCertificationNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('specialized') ||
            rec.title.toLowerCase().includes('expert') ||
            rec.title.toLowerCase().includes('advanced')
          )
        ),
        certificationSchedule: {
          type: certificationType,
          advanceNotice: advanceNoticeDays,
          reminders: reminderDays,
          moduleType: moduleType
        },
        recommendations: results.recommendations.filter(r => r.category === 'skills')
      },
      executed: false
    };
  }
  
  return null;
}

function processLegalRequirementChangeTrigger(trigger: Trigger, results: UnifiedResults, config: TriggerConfig): TriggerResult | null {
  // This trigger is typically activated by external events (legal updates, regulatory changes, policy notifications)
  // It would be triggered when legal requirements change, requiring policy updates and subsequent LXP training
  
  const requirementType = config.requirementType || 'legal';
  const advanceNoticeDays = config.advanceNoticeDays || 7;
  const reminderDays = config.reminderDays || [7, 3, 1];
  const moduleType = config.moduleType || 'policy_update_module';
  const lxpIntegration = config.lxpIntegration || true;
  
  // Check if there are legal requirement change indicators
  const hasLegalRequirementChangeIndicators = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('legal requirement change') ||
      rec.title.toLowerCase().includes('regulatory change') ||
      rec.title.toLowerCase().includes('policy update') ||
      rec.title.toLowerCase().includes('legal update') ||
      rec.title.toLowerCase().includes('compliance change') ||
      rec.title.toLowerCase().includes('regulation update')
    )
  );
  
  // Check for policy update module needs
  const hasPolicyUpdateNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('policy update') ||
      rec.title.toLowerCase().includes('policy revision') ||
      rec.title.toLowerCase().includes('policy change') ||
      rec.title.toLowerCase().includes('procedure update') ||
      rec.title.toLowerCase().includes('guideline update')
    )
  );
  
  // Check for LXP integration needs (part of LXP)
  const hasLXPIntegrationNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('lxp integration') ||
      rec.title.toLowerCase().includes('learning update') ||
      rec.title.toLowerCase().includes('training update') ||
      rec.title.toLowerCase().includes('education update') ||
      rec.title.toLowerCase().includes('learning module')
    )
  );
  
  // Check for compliance and regulatory training needs
  const hasComplianceTrainingNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('compliance training') ||
      rec.title.toLowerCase().includes('regulatory training') ||
      rec.title.toLowerCase().includes('legal training') ||
      rec.title.toLowerCase().includes('policy training') ||
      rec.title.toLowerCase().includes('procedure training')
    )
  );
  
  // Check for industry-specific regulatory changes
  const hasIndustryRegulatoryNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('industry regulation') ||
      rec.title.toLowerCase().includes('sector regulation') ||
      rec.title.toLowerCase().includes('industry compliance') ||
      rec.title.toLowerCase().includes('sector compliance') ||
      rec.title.toLowerCase().includes('industry standard')
    )
  );
  
  // Check for workplace policy and procedure updates
  const hasWorkplacePolicyNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('workplace policy') ||
      rec.title.toLowerCase().includes('employee policy') ||
      rec.title.toLowerCase().includes('hr policy') ||
      rec.title.toLowerCase().includes('workplace procedure') ||
      rec.title.toLowerCase().includes('employee handbook')
    )
  );
  
  // Check for data protection and privacy regulation changes
  const hasDataProtectionNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('data protection') ||
      rec.title.toLowerCase().includes('privacy regulation') ||
      rec.title.toLowerCase().includes('gdpr') ||
      rec.title.toLowerCase().includes('data privacy') ||
      rec.title.toLowerCase().includes('information security')
    )
  );
  
  // Check for safety and health regulation changes
  const hasSafetyHealthRegulationNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('safety regulation') ||
      rec.title.toLowerCase().includes('health regulation') ||
      rec.title.toLowerCase().includes('workplace safety') ||
      rec.title.toLowerCase().includes('occupational health') ||
      rec.title.toLowerCase().includes('safety standard')
    )
  );
  
  // Check for employment law and labor regulation changes
  const hasEmploymentLawNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('employment law') ||
      rec.title.toLowerCase().includes('labor law') ||
      rec.title.toLowerCase().includes('employment regulation') ||
      rec.title.toLowerCase().includes('labor regulation') ||
      rec.title.toLowerCase().includes('workplace law')
    )
  );
  
  // This trigger would typically be activated by external legal/regulatory events
  // For now, we'll check if there are skills-related recommendations that indicate legal requirement changes
  if (hasLegalRequirementChangeIndicators || hasPolicyUpdateNeeds || hasLXPIntegrationNeeds || hasComplianceTrainingNeeds || hasIndustryRegulatoryNeeds || hasWorkplacePolicyNeeds || hasDataProtectionNeeds || hasSafetyHealthRegulationNeeds || hasEmploymentLawNeeds) {
    return {
      id: randomUUID(),
      triggerId: trigger.id,
      reason: 'Legal requirement has changed - activate policy update module and integrate with LXP for training updates',
      action: 'activate_policy_update_module_with_lxp_integration',
      priority: 'high',
      data: {
        triggerSource: 'external_legal_regulatory_event',
        requirementType: requirementType,
        advanceNoticeDays: advanceNoticeDays,
        reminderDays: reminderDays,
        moduleType: moduleType,
        lxpIntegration: lxpIntegration,
        legalRequirementChangeIndicators: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('legal') ||
            rec.title.toLowerCase().includes('regulatory') ||
            rec.title.toLowerCase().includes('policy update')
          )
        ),
        policyUpdateNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('policy') ||
            rec.title.toLowerCase().includes('procedure') ||
            rec.title.toLowerCase().includes('guideline')
          )
        ),
        lxpIntegrationNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('lxp') ||
            rec.title.toLowerCase().includes('learning') ||
            rec.title.toLowerCase().includes('training')
          )
        ),
        complianceTrainingNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('compliance') ||
            rec.title.toLowerCase().includes('regulatory') ||
            rec.title.toLowerCase().includes('legal training')
          )
        ),
        industryRegulatoryNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('industry') ||
            rec.title.toLowerCase().includes('sector') ||
            rec.title.toLowerCase().includes('regulation')
          )
        ),
        workplacePolicyNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('workplace') ||
            rec.title.toLowerCase().includes('employee') ||
            rec.title.toLowerCase().includes('hr policy')
          )
        ),
        dataProtectionNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('data protection') ||
            rec.title.toLowerCase().includes('privacy') ||
            rec.title.toLowerCase().includes('gdpr')
          )
        ),
        safetyHealthRegulationNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('safety') ||
            rec.title.toLowerCase().includes('health') ||
            rec.title.toLowerCase().includes('occupational')
          )
        ),
        employmentLawNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('employment') ||
            rec.title.toLowerCase().includes('labor') ||
            rec.title.toLowerCase().includes('workplace law')
          )
        ),
        policyUpdateSchedule: {
          type: requirementType,
          advanceNotice: advanceNoticeDays,
          reminders: reminderDays,
          moduleType: moduleType,
          lxpIntegration: lxpIntegration
        },
        recommendations: results.recommendations.filter(r => r.category === 'skills')
      },
      executed: false
    };
  }
  
  return null;
}

function processTeamSizeChangesTrigger(trigger: Trigger, results: UnifiedResults, config: TriggerConfig): TriggerResult | null {
  // This trigger is typically activated by operational events (hiring, layoffs, restructuring, organizational changes)
  // It would be triggered when team sizes change significantly, requiring team restructuring (Enterprise tier only)
  
  const changeType = config.changeType || 'team_restructuring';
  const advanceNoticeDays = config.advanceNoticeDays || 14;
  const reminderDays = config.reminderDays || [14, 7, 3, 1];
  const moduleType = config.moduleType || 'team_restructuring_module';
  const tier = config.tier || 'enterprise';
  
  // Check if there are team size change indicators
  const hasTeamSizeChangeIndicators = results.recommendations.some(rec =>
    rec.category === 'structure' && (
      rec.title.toLowerCase().includes('team size change') ||
      rec.title.toLowerCase().includes('team restructuring') ||
      rec.title.toLowerCase().includes('organizational change') ||
      rec.title.toLowerCase().includes('team expansion') ||
      rec.title.toLowerCase().includes('team reduction') ||
      rec.title.toLowerCase().includes('team reorganization')
    )
  );
  
  // Check for team restructuring module needs (Enterprise only)
  const hasTeamRestructuringNeeds = results.recommendations.some(rec =>
    rec.category === 'structure' && (
      rec.title.toLowerCase().includes('team restructuring') ||
      rec.title.toLowerCase().includes('organizational restructuring') ||
      rec.title.toLowerCase().includes('team reorganization') ||
      rec.title.toLowerCase().includes('structure optimization') ||
      rec.title.toLowerCase().includes('team realignment')
    )
  );
  
  // Check for hiring and expansion needs
  const hasHiringExpansionNeeds = results.recommendations.some(rec =>
    rec.category === 'structure' && (
      rec.title.toLowerCase().includes('hiring needs') ||
      rec.title.toLowerCase().includes('team expansion') ||
      rec.title.toLowerCase().includes('staff increase') ||
      rec.title.toLowerCase().includes('workforce growth') ||
      rec.title.toLowerCase().includes('team scaling')
    )
  );
  
  // Check for downsizing and reduction needs
  const hasDownsizingReductionNeeds = results.recommendations.some(rec =>
    rec.category === 'structure' && (
      rec.title.toLowerCase().includes('team reduction') ||
      rec.title.toLowerCase().includes('downsizing') ||
      rec.title.toLowerCase().includes('staff reduction') ||
      rec.title.toLowerCase().includes('workforce reduction') ||
      rec.title.toLowerCase().includes('team consolidation')
    )
  );
  
  // Check for role and responsibility changes
  const hasRoleResponsibilityChanges = results.recommendations.some(rec =>
    rec.category === 'structure' && (
      rec.title.toLowerCase().includes('role changes') ||
      rec.title.toLowerCase().includes('responsibility changes') ||
      rec.title.toLowerCase().includes('job restructuring') ||
      rec.title.toLowerCase().includes('position changes') ||
      rec.title.toLowerCase().includes('role realignment')
    )
  );
  
  // Check for department and division changes
  const hasDepartmentDivisionChanges = results.recommendations.some(rec =>
    rec.category === 'structure' && (
      rec.title.toLowerCase().includes('department changes') ||
      rec.title.toLowerCase().includes('division changes') ||
      rec.title.toLowerCase().includes('organizational changes') ||
      rec.title.toLowerCase().includes('business unit changes') ||
      rec.title.toLowerCase().includes('functional changes')
    )
  );
  
  // Check for leadership and management changes
  const hasLeadershipManagementChanges = results.recommendations.some(rec =>
    rec.category === 'structure' && (
      rec.title.toLowerCase().includes('leadership changes') ||
      rec.title.toLowerCase().includes('management changes') ||
      rec.title.toLowerCase().includes('supervisory changes') ||
      rec.title.toLowerCase().includes('reporting changes') ||
      rec.title.toLowerCase().includes('hierarchy changes')
    )
  );
  
  // Check for workflow and process changes
  const hasWorkflowProcessChanges = results.recommendations.some(rec =>
    rec.category === 'structure' && (
      rec.title.toLowerCase().includes('workflow changes') ||
      rec.title.toLowerCase().includes('process changes') ||
      rec.title.toLowerCase().includes('operational changes') ||
      rec.title.toLowerCase().includes('business process') ||
      rec.title.toLowerCase().includes('workflow optimization')
    )
  );
  
  // Check for communication and collaboration changes
  const hasCommunicationCollaborationChanges = results.recommendations.some(rec =>
    rec.category === 'structure' && (
      rec.title.toLowerCase().includes('communication changes') ||
      rec.title.toLowerCase().includes('collaboration changes') ||
      rec.title.toLowerCase().includes('team dynamics') ||
      rec.title.toLowerCase().includes('interaction changes') ||
      rec.title.toLowerCase().includes('coordination changes')
    )
  );
  
  // This trigger would typically be activated by external operational events
  // For now, we'll check if there are structure-related recommendations that indicate team size changes
  if (hasTeamSizeChangeIndicators || hasTeamRestructuringNeeds || hasHiringExpansionNeeds || hasDownsizingReductionNeeds || hasRoleResponsibilityChanges || hasDepartmentDivisionChanges || hasLeadershipManagementChanges || hasWorkflowProcessChanges || hasCommunicationCollaborationChanges) {
    return {
      id: randomUUID(),
      triggerId: trigger.id,
      reason: 'Team size has changed significantly - activate team restructuring module (Enterprise tier only)',
      action: 'activate_team_restructuring_module',
      priority: 'medium',
      data: {
        triggerSource: 'operational_event',
        changeType: changeType,
        advanceNoticeDays: advanceNoticeDays,
        reminderDays: reminderDays,
        moduleType: moduleType,
        tier: tier,
        teamSizeChangeIndicators: results.recommendations.filter(rec =>
          rec.category === 'structure' && (
            rec.title.toLowerCase().includes('team') ||
            rec.title.toLowerCase().includes('organizational') ||
            rec.title.toLowerCase().includes('restructuring')
          )
        ),
        teamRestructuringNeeds: results.recommendations.filter(rec =>
          rec.category === 'structure' && (
            rec.title.toLowerCase().includes('restructuring') ||
            rec.title.toLowerCase().includes('reorganization') ||
            rec.title.toLowerCase().includes('realignment')
          )
        ),
        hiringExpansionNeeds: results.recommendations.filter(rec =>
          rec.category === 'structure' && (
            rec.title.toLowerCase().includes('hiring') ||
            rec.title.toLowerCase().includes('expansion') ||
            rec.title.toLowerCase().includes('growth')
          )
        ),
        downsizingReductionNeeds: results.recommendations.filter(rec =>
          rec.category === 'structure' && (
            rec.title.toLowerCase().includes('reduction') ||
            rec.title.toLowerCase().includes('downsizing') ||
            rec.title.toLowerCase().includes('consolidation')
          )
        ),
        roleResponsibilityChanges: results.recommendations.filter(rec =>
          rec.category === 'structure' && (
            rec.title.toLowerCase().includes('role') ||
            rec.title.toLowerCase().includes('responsibility') ||
            rec.title.toLowerCase().includes('position')
          )
        ),
        departmentDivisionChanges: results.recommendations.filter(rec =>
          rec.category === 'structure' && (
            rec.title.toLowerCase().includes('department') ||
            rec.title.toLowerCase().includes('division') ||
            rec.title.toLowerCase().includes('organizational')
          )
        ),
        leadershipManagementChanges: results.recommendations.filter(rec =>
          rec.category === 'structure' && (
            rec.title.toLowerCase().includes('leadership') ||
            rec.title.toLowerCase().includes('management') ||
            rec.title.toLowerCase().includes('supervisory')
          )
        ),
        workflowProcessChanges: results.recommendations.filter(rec =>
          rec.category === 'structure' && (
            rec.title.toLowerCase().includes('workflow') ||
            rec.title.toLowerCase().includes('process') ||
            rec.title.toLowerCase().includes('operational')
          )
        ),
        communicationCollaborationChanges: results.recommendations.filter(rec =>
          rec.category === 'structure' && (
            rec.title.toLowerCase().includes('communication') ||
            rec.title.toLowerCase().includes('collaboration') ||
            rec.title.toLowerCase().includes('team dynamics')
          )
        ),
        restructuringSchedule: {
          type: changeType,
          advanceNotice: advanceNoticeDays,
          reminders: reminderDays,
          moduleType: moduleType,
          tier: tier
        },
        recommendations: results.recommendations.filter(r => r.category === 'structure')
      },
      executed: false
    };
  }
  
  return null;
}

function processOnboardingCompletionTrigger(trigger: Trigger, results: UnifiedResults, config: TriggerConfig): TriggerResult | null {
  // This trigger is typically activated by onboarding module completion events
  // It would be triggered when an employee completes their onboarding process, requiring performance baseline establishment
  
  const completionType = config.completionType || 'onboarding';
  const advanceNoticeDays = config.advanceNoticeDays || 1;
  const reminderDays = config.reminderDays || [1];
  const moduleType = config.moduleType || 'performance_baseline_module';
  const partOf = config.partOf || 'performance_management_module';
  
  // Check if there are onboarding completion indicators
  const hasOnboardingCompletionIndicators = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('onboarding completion') ||
      rec.title.toLowerCase().includes('onboarding finished') ||
      rec.title.toLowerCase().includes('onboarding done') ||
      rec.title.toLowerCase().includes('orientation complete') ||
      rec.title.toLowerCase().includes('new hire ready') ||
      rec.title.toLowerCase().includes('onboarding successful')
    )
  );
  
  // Check for performance baseline module needs (part of performance management module)
  const hasPerformanceBaselineNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('performance baseline') ||
      rec.title.toLowerCase().includes('baseline establishment') ||
      rec.title.toLowerCase().includes('initial performance') ||
      rec.title.toLowerCase().includes('starting performance') ||
      rec.title.toLowerCase().includes('performance foundation')
    )
  );
  
  // Check for new employee performance tracking needs
  const hasNewEmployeePerformanceNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('new employee performance') ||
      rec.title.toLowerCase().includes('new hire performance') ||
      rec.title.toLowerCase().includes('fresh employee') ||
      rec.title.toLowerCase().includes('recent hire') ||
      rec.title.toLowerCase().includes('new team member')
    )
  );
  
  // Check for performance management module activation
  const hasPerformanceManagementNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('performance management') ||
      rec.title.toLowerCase().includes('performance tracking') ||
      rec.title.toLowerCase().includes('performance monitoring') ||
      rec.title.toLowerCase().includes('performance evaluation') ||
      rec.title.toLowerCase().includes('performance assessment')
    )
  );
  
  // Check for goal setting and objective establishment needs
  const hasGoalSettingNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('goal setting') ||
      rec.title.toLowerCase().includes('objective setting') ||
      rec.title.toLowerCase().includes('target establishment') ||
      rec.title.toLowerCase().includes('performance goals') ||
      rec.title.toLowerCase().includes('initial objectives')
    )
  );
  
  // Check for skill assessment and competency evaluation needs
  const hasSkillAssessmentNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('skill assessment') ||
      rec.title.toLowerCase().includes('competency evaluation') ||
      rec.title.toLowerCase().includes('capability assessment') ||
      rec.title.toLowerCase().includes('initial skills') ||
      rec.title.toLowerCase().includes('starting competencies')
    )
  );
  
  // Check for training completion and development planning needs
  const hasTrainingDevelopmentNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('training completion') ||
      rec.title.toLowerCase().includes('development planning') ||
      rec.title.toLowerCase().includes('learning plan') ||
      rec.title.toLowerCase().includes('skill development') ||
      rec.title.toLowerCase().includes('career planning')
    )
  );
  
  // Check for integration and team dynamics needs
  const hasIntegrationTeamDynamicsNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('team integration') ||
      rec.title.toLowerCase().includes('team dynamics') ||
      rec.title.toLowerCase().includes('workplace integration') ||
      rec.title.toLowerCase().includes('cultural integration') ||
      rec.title.toLowerCase().includes('team collaboration')
    )
  );
  
  // Check for probation period and evaluation setup needs
  const hasProbationEvaluationNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('probation period') ||
      rec.title.toLowerCase().includes('evaluation setup') ||
      rec.title.toLowerCase().includes('review schedule') ||
      rec.title.toLowerCase().includes('assessment timeline') ||
      rec.title.toLowerCase().includes('performance review')
    )
  );
  
  // This trigger would typically be activated by external onboarding module events
  // For now, we'll check if there are performance-related recommendations that indicate onboarding completion needs
  if (hasOnboardingCompletionIndicators || hasPerformanceBaselineNeeds || hasNewEmployeePerformanceNeeds || hasPerformanceManagementNeeds || hasGoalSettingNeeds || hasSkillAssessmentNeeds || hasTrainingDevelopmentNeeds || hasIntegrationTeamDynamicsNeeds || hasProbationEvaluationNeeds) {
    return {
      id: randomUUID(),
      triggerId: trigger.id,
      reason: 'Onboarding has been completed - activate performance baseline part of performance management module',
      action: 'activate_performance_baseline_module',
      priority: 'medium',
      data: {
        triggerSource: 'onboarding_module_completion',
        completionType: completionType,
        advanceNoticeDays: advanceNoticeDays,
        reminderDays: reminderDays,
        moduleType: moduleType,
        partOf: partOf,
        onboardingCompletionIndicators: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('onboarding') ||
            rec.title.toLowerCase().includes('orientation') ||
            rec.title.toLowerCase().includes('new hire')
          )
        ),
        performanceBaselineNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('baseline') ||
            rec.title.toLowerCase().includes('initial') ||
            rec.title.toLowerCase().includes('starting')
          )
        ),
        newEmployeePerformanceNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('new employee') ||
            rec.title.toLowerCase().includes('new hire') ||
            rec.title.toLowerCase().includes('fresh')
          )
        ),
        performanceManagementNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('performance management') ||
            rec.title.toLowerCase().includes('performance tracking')
          )
        ),
        goalSettingNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('goal') ||
            rec.title.toLowerCase().includes('objective') ||
            rec.title.toLowerCase().includes('target')
          )
        ),
        skillAssessmentNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('skill') ||
            rec.title.toLowerCase().includes('competency') ||
            rec.title.toLowerCase().includes('capability')
          )
        ),
        trainingDevelopmentNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('training') ||
            rec.title.toLowerCase().includes('development') ||
            rec.title.toLowerCase().includes('learning')
          )
        ),
        integrationTeamDynamicsNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('integration') ||
            rec.title.toLowerCase().includes('team dynamics') ||
            rec.title.toLowerCase().includes('collaboration')
          )
        ),
        probationEvaluationNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('probation') ||
            rec.title.toLowerCase().includes('evaluation') ||
            rec.title.toLowerCase().includes('review')
          )
        ),
        baselineSchedule: {
          type: completionType,
          advanceNotice: advanceNoticeDays,
          reminders: reminderDays,
          moduleType: moduleType,
          partOf: partOf
        },
        recommendations: results.recommendations.filter(r => r.category === 'performance')
      },
      executed: false
    };
  }
  
  return null;
}

function processTrainingCompletionTrigger(trigger: Trigger, results: UnifiedResults, config: TriggerConfig): TriggerResult | null {
  // This trigger is activated when LXP training is completed
  // It triggers the Performance Assessment part of the Performance Management Module
  
  const completionType = config.completionType || 'training';
  const advanceNoticeDays = config.advanceNoticeDays || 1;
  const reminderDays = config.reminderDays || [1];
  const moduleType = config.moduleType || 'performance_assessment_module';
  const partOf = config.partOf || 'performance_management_module';
  const sourceModule = config.sourceModule || 'lxp';
  
  // Check if there are training completion indicators
  const hasTrainingCompletionIndicators = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('training completion') ||
      rec.title.toLowerCase().includes('training finished') ||
      rec.title.toLowerCase().includes('training done') ||
      rec.title.toLowerCase().includes('course completion') ||
      rec.title.toLowerCase().includes('learning completed') ||
      rec.title.toLowerCase().includes('training successful')
    )
  );
  
  // Check for performance assessment module needs (part of performance management module)
  const hasPerformanceAssessmentNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('performance assessment') ||
      rec.title.toLowerCase().includes('performance evaluation') ||
      rec.title.toLowerCase().includes('performance review') ||
      rec.title.toLowerCase().includes('performance measurement') ||
      rec.title.toLowerCase().includes('performance analysis')
    )
  );
  
  // Check for LXP training completion indicators
  const hasLxpTrainingCompletion = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('lxp completion') ||
      rec.title.toLowerCase().includes('learning platform') ||
      rec.title.toLowerCase().includes('training platform') ||
      rec.title.toLowerCase().includes('course platform') ||
      rec.title.toLowerCase().includes('learning experience')
    )
  );
  
  // Check for skill application and competency demonstration needs
  const hasSkillApplicationNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('skill application') ||
      rec.title.toLowerCase().includes('competency demonstration') ||
      rec.title.toLowerCase().includes('skill demonstration') ||
      rec.title.toLowerCase().includes('knowledge application') ||
      rec.title.toLowerCase().includes('learning application')
    )
  );
  
  // Check for performance improvement measurement needs
  const hasPerformanceImprovementNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('performance improvement') ||
      rec.title.toLowerCase().includes('performance enhancement') ||
      rec.title.toLowerCase().includes('performance progress') ||
      rec.title.toLowerCase().includes('performance growth') ||
      rec.title.toLowerCase().includes('performance development')
    )
  );
  
  // Check for training effectiveness evaluation needs
  const hasTrainingEffectivenessNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('training effectiveness') ||
      rec.title.toLowerCase().includes('learning effectiveness') ||
      rec.title.toLowerCase().includes('course effectiveness') ||
      rec.title.toLowerCase().includes('training impact') ||
      rec.title.toLowerCase().includes('learning impact')
    )
  );
  
  // Check for competency assessment and validation needs
  const hasCompetencyAssessmentNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('competency assessment') ||
      rec.title.toLowerCase().includes('competency validation') ||
      rec.title.toLowerCase().includes('skill validation') ||
      rec.title.toLowerCase().includes('knowledge validation') ||
      rec.title.toLowerCase().includes('capability assessment')
    )
  );
  
  // Check for performance benchmarking and comparison needs
  const hasPerformanceBenchmarkingNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('performance benchmarking') ||
      rec.title.toLowerCase().includes('performance comparison') ||
      rec.title.toLowerCase().includes('performance baseline') ||
      rec.title.toLowerCase().includes('performance standard') ||
      rec.title.toLowerCase().includes('performance metric')
    )
  );
  
  // Check for goal achievement and objective completion needs
  const hasGoalAchievementNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('goal achievement') ||
      rec.title.toLowerCase().includes('objective completion') ||
      rec.title.toLowerCase().includes('target achievement') ||
      rec.title.toLowerCase().includes('milestone completion') ||
      rec.title.toLowerCase().includes('achievement assessment')
    )
  );
  
  // Check for feedback collection and performance review needs
  const hasFeedbackCollectionNeeds = results.recommendations.some(rec =>
    rec.category === 'performance' && (
      rec.title.toLowerCase().includes('feedback collection') ||
      rec.title.toLowerCase().includes('performance feedback') ||
      rec.title.toLowerCase().includes('review feedback') ||
      rec.title.toLowerCase().includes('assessment feedback') ||
      rec.title.toLowerCase().includes('evaluation feedback')
    )
  );
  
  // This trigger would typically be activated by LXP module completion events
  // For now, we'll check if there are performance-related recommendations that indicate training completion needs
  if (hasTrainingCompletionIndicators || hasPerformanceAssessmentNeeds || hasLxpTrainingCompletion || hasSkillApplicationNeeds || hasPerformanceImprovementNeeds || hasTrainingEffectivenessNeeds || hasCompetencyAssessmentNeeds || hasPerformanceBenchmarkingNeeds || hasGoalAchievementNeeds || hasFeedbackCollectionNeeds) {
    return {
      id: randomUUID(),
      triggerId: trigger.id,
      reason: 'LXP training has been completed - activate performance assessment part of performance management module',
      action: 'activate_performance_assessment_module',
      priority: 'medium',
      data: {
        triggerSource: 'lxp_training_completion',
        completionType: completionType,
        advanceNoticeDays: advanceNoticeDays,
        reminderDays: reminderDays,
        moduleType: moduleType,
        partOf: partOf,
        sourceModule: sourceModule,
        trainingCompletionIndicators: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('training') ||
            rec.title.toLowerCase().includes('course') ||
            rec.title.toLowerCase().includes('learning')
          )
        ),
        performanceAssessmentNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('assessment') ||
            rec.title.toLowerCase().includes('evaluation') ||
            rec.title.toLowerCase().includes('review')
          )
        ),
        lxpTrainingCompletion: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('lxp') ||
            rec.title.toLowerCase().includes('platform') ||
            rec.title.toLowerCase().includes('experience')
          )
        ),
        skillApplicationNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('application') ||
            rec.title.toLowerCase().includes('demonstration') ||
            rec.title.toLowerCase().includes('knowledge')
          )
        ),
        performanceImprovementNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('improvement') ||
            rec.title.toLowerCase().includes('enhancement') ||
            rec.title.toLowerCase().includes('progress')
          )
        ),
        trainingEffectivenessNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('effectiveness') ||
            rec.title.toLowerCase().includes('impact') ||
            rec.title.toLowerCase().includes('outcome')
          )
        ),
        competencyAssessmentNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('competency') ||
            rec.title.toLowerCase().includes('validation') ||
            rec.title.toLowerCase().includes('capability')
          )
        ),
        performanceBenchmarkingNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('benchmarking') ||
            rec.title.toLowerCase().includes('comparison') ||
            rec.title.toLowerCase().includes('baseline')
          )
        ),
        goalAchievementNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('goal') ||
            rec.title.toLowerCase().includes('objective') ||
            rec.title.toLowerCase().includes('achievement')
          )
        ),
        feedbackCollectionNeeds: results.recommendations.filter(rec =>
          rec.category === 'performance' && (
            rec.title.toLowerCase().includes('feedback') ||
            rec.title.toLowerCase().includes('review') ||
            rec.title.toLowerCase().includes('evaluation')
          )
        ),
        assessmentSchedule: {
          type: completionType,
          advanceNotice: advanceNoticeDays,
          reminders: reminderDays,
          moduleType: moduleType,
          partOf: partOf,
          sourceModule: sourceModule
        },
        recommendations: results.recommendations.filter(r => r.category === 'performance')
      },
      executed: false
    };
  }
  
  return null;
}

function processSuccessionPlanActivationTrigger(trigger: Trigger, results: UnifiedResults, config: TriggerConfig): TriggerResult | null {
  // This trigger is activated when succession planning is triggered
  // It activates the Leadership Transition Module (part of Onboarding Module)
  
  const activationType = config.activationType || 'succession_planning';
  const advanceNoticeDays = config.advanceNoticeDays || 7;
  const reminderDays = config.reminderDays || [7, 3, 1];
  const moduleType = config.moduleType || 'leadership_transition_module';
  const partOf = config.partOf || 'onboarding_module';
  const sourceModule = config.sourceModule || 'succession_planning';
  
  // Check if there are succession plan activation indicators
  const hasSuccessionPlanActivation = results.recommendations.some(rec =>
    rec.category === 'talent' && (
      rec.title.toLowerCase().includes('succession plan activation') ||
      rec.title.toLowerCase().includes('succession planning') ||
      rec.title.toLowerCase().includes('leadership transition') ||
      rec.title.toLowerCase().includes('leadership succession') ||
      rec.title.toLowerCase().includes('succession planning activated')
    )
  );
  
  // Check for leadership transition module needs (part of onboarding module)
  const hasLeadershipTransitionNeeds = results.recommendations.some(rec =>
    rec.category === 'talent' && (
      rec.title.toLowerCase().includes('leadership transition') ||
      rec.title.toLowerCase().includes('leadership onboarding') ||
      rec.title.toLowerCase().includes('executive onboarding') ||
      rec.title.toLowerCase().includes('leadership integration') ||
      rec.title.toLowerCase().includes('leadership development')
    )
  );
  
  // Check for succession planning module indicators
  const hasSuccessionPlanningIndicators = results.recommendations.some(rec =>
    rec.category === 'talent' && (
      rec.title.toLowerCase().includes('succession planning') ||
      rec.title.toLowerCase().includes('succession management') ||
      rec.title.toLowerCase().includes('succession strategy') ||
      rec.title.toLowerCase().includes('succession program') ||
      rec.title.toLowerCase().includes('succession framework')
    )
  );
  
  // Check for leadership development and preparation needs
  const hasLeadershipDevelopmentNeeds = results.recommendations.some(rec =>
    rec.category === 'talent' && (
      rec.title.toLowerCase().includes('leadership development') ||
      rec.title.toLowerCase().includes('leadership preparation') ||
      rec.title.toLowerCase().includes('leadership training') ||
      rec.title.toLowerCase().includes('leadership coaching') ||
      rec.title.toLowerCase().includes('leadership mentoring')
    )
  );
  
  // Check for executive transition and onboarding needs
  const hasExecutiveTransitionNeeds = results.recommendations.some(rec =>
    rec.category === 'talent' && (
      rec.title.toLowerCase().includes('executive transition') ||
      rec.title.toLowerCase().includes('executive onboarding') ||
      rec.title.toLowerCase().includes('executive integration') ||
      rec.title.toLowerCase().includes('executive development') ||
      rec.title.toLowerCase().includes('executive preparation')
    )
  );
  
  // Check for leadership role transition and handover needs
  const hasLeadershipRoleTransitionNeeds = results.recommendations.some(rec =>
    rec.category === 'talent' && (
      rec.title.toLowerCase().includes('leadership role transition') ||
      rec.title.toLowerCase().includes('leadership handover') ||
      rec.title.toLowerCase().includes('leadership transfer') ||
      rec.title.toLowerCase().includes('leadership succession') ||
      rec.title.toLowerCase().includes('leadership change')
    )
  );
  
  // Check for talent pipeline and readiness assessment needs
  const hasTalentPipelineNeeds = results.recommendations.some(rec =>
    rec.category === 'talent' && (
      rec.title.toLowerCase().includes('talent pipeline') ||
      rec.title.toLowerCase().includes('talent readiness') ||
      rec.title.toLowerCase().includes('talent assessment') ||
      rec.title.toLowerCase().includes('talent evaluation') ||
      rec.title.toLowerCase().includes('talent preparation')
    )
  );
  
  // Check for leadership competency and skill development needs
  const hasLeadershipCompetencyNeeds = results.recommendations.some(rec =>
    rec.category === 'talent' && (
      rec.title.toLowerCase().includes('leadership competency') ||
      rec.title.toLowerCase().includes('leadership skills') ||
      rec.title.toLowerCase().includes('leadership capabilities') ||
      rec.title.toLowerCase().includes('leadership assessment') ||
      rec.title.toLowerCase().includes('leadership evaluation')
    )
  );
  
  // Check for organizational continuity and stability needs
  const hasOrganizationalContinuityNeeds = results.recommendations.some(rec =>
    rec.category === 'talent' && (
      rec.title.toLowerCase().includes('organizational continuity') ||
      rec.title.toLowerCase().includes('organizational stability') ||
      rec.title.toLowerCase().includes('organizational transition') ||
      rec.title.toLowerCase().includes('organizational change') ||
      rec.title.toLowerCase().includes('organizational continuity')
    )
  );
  
  // Check for leadership onboarding and integration needs
  const hasLeadershipOnboardingNeeds = results.recommendations.some(rec =>
    rec.category === 'talent' && (
      rec.title.toLowerCase().includes('leadership onboarding') ||
      rec.title.toLowerCase().includes('leadership integration') ||
      rec.title.toLowerCase().includes('leadership orientation') ||
      rec.title.toLowerCase().includes('leadership introduction') ||
      rec.title.toLowerCase().includes('leadership familiarization')
    )
  );
  
  // This trigger would typically be activated by succession planning module events
  // For now, we'll check if there are talent-related recommendations that indicate succession plan activation needs
  if (hasSuccessionPlanActivation || hasLeadershipTransitionNeeds || hasSuccessionPlanningIndicators || hasLeadershipDevelopmentNeeds || hasExecutiveTransitionNeeds || hasLeadershipRoleTransitionNeeds || hasTalentPipelineNeeds || hasLeadershipCompetencyNeeds || hasOrganizationalContinuityNeeds || hasLeadershipOnboardingNeeds) {
    return {
      id: randomUUID(),
      triggerId: trigger.id,
      reason: 'Succession plan has been activated - activate leadership transition module part of onboarding module',
      action: 'activate_leadership_transition_module',
      priority: 'high',
      data: {
        triggerSource: 'succession_planning_activation',
        activationType: activationType,
        advanceNoticeDays: advanceNoticeDays,
        reminderDays: reminderDays,
        moduleType: moduleType,
        partOf: partOf,
        sourceModule: sourceModule,
        successionPlanActivation: results.recommendations.filter(rec =>
          rec.category === 'talent' && (
            rec.title.toLowerCase().includes('succession') ||
            rec.title.toLowerCase().includes('planning') ||
            rec.title.toLowerCase().includes('activation')
          )
        ),
        leadershipTransitionNeeds: results.recommendations.filter(rec =>
          rec.category === 'talent' && (
            rec.title.toLowerCase().includes('leadership') ||
            rec.title.toLowerCase().includes('transition') ||
            rec.title.toLowerCase().includes('onboarding')
          )
        ),
        successionPlanningIndicators: results.recommendations.filter(rec =>
          rec.category === 'talent' && (
            rec.title.toLowerCase().includes('succession') ||
            rec.title.toLowerCase().includes('planning') ||
            rec.title.toLowerCase().includes('management')
          )
        ),
        leadershipDevelopmentNeeds: results.recommendations.filter(rec =>
          rec.category === 'talent' && (
            rec.title.toLowerCase().includes('leadership') ||
            rec.title.toLowerCase().includes('development') ||
            rec.title.toLowerCase().includes('preparation')
          )
        ),
        executiveTransitionNeeds: results.recommendations.filter(rec =>
          rec.category === 'talent' && (
            rec.title.toLowerCase().includes('executive') ||
            rec.title.toLowerCase().includes('transition') ||
            rec.title.toLowerCase().includes('onboarding')
          )
        ),
        leadershipRoleTransitionNeeds: results.recommendations.filter(rec =>
          rec.category === 'talent' && (
            rec.title.toLowerCase().includes('leadership role') ||
            rec.title.toLowerCase().includes('handover') ||
            rec.title.toLowerCase().includes('transfer')
          )
        ),
        talentPipelineNeeds: results.recommendations.filter(rec =>
          rec.category === 'talent' && (
            rec.title.toLowerCase().includes('talent') ||
            rec.title.toLowerCase().includes('pipeline') ||
            rec.title.toLowerCase().includes('readiness')
          )
        ),
        leadershipCompetencyNeeds: results.recommendations.filter(rec =>
          rec.category === 'talent' && (
            rec.title.toLowerCase().includes('leadership competency') ||
            rec.title.toLowerCase().includes('leadership skills') ||
            rec.title.toLowerCase().includes('leadership capabilities')
          )
        ),
        organizationalContinuityNeeds: results.recommendations.filter(rec =>
          rec.category === 'talent' && (
            rec.title.toLowerCase().includes('organizational') ||
            rec.title.toLowerCase().includes('continuity') ||
            rec.title.toLowerCase().includes('stability')
          )
        ),
        leadershipOnboardingNeeds: results.recommendations.filter(rec =>
          rec.category === 'talent' && (
            rec.title.toLowerCase().includes('leadership onboarding') ||
            rec.title.toLowerCase().includes('leadership integration') ||
            rec.title.toLowerCase().includes('leadership orientation')
          )
        ),
        transitionSchedule: {
          type: activationType,
          advanceNotice: advanceNoticeDays,
          reminders: reminderDays,
          moduleType: moduleType,
          partOf: partOf,
          sourceModule: sourceModule
        },
        recommendations: results.recommendations.filter(r => r.category === 'talent')
      },
      executed: false
    };
  }
  
  return null;
}

function processFlightRiskPredictionTrigger(trigger: Trigger, results: UnifiedResults, config: TriggerConfig): TriggerResult | null {
  // This trigger is activated when flight risk prediction indicates high risk of employee departure
  // It activates the Retention Intervention Module to prevent employee turnover
  
  const predictionType = config.predictionType || 'flight_risk';
  const riskThreshold = config.riskThreshold || 0.7;
  const advanceNoticeDays = config.advanceNoticeDays || 3;
  const reminderDays = config.reminderDays || [3, 1];
  const moduleType = config.moduleType || 'retention_intervention_module';
  const urgencyLevel = config.urgencyLevel || 'high';
  
  // Check if there are flight risk prediction indicators
  const hasFlightRiskPrediction = results.recommendations.some(rec =>
    rec.category === 'retention' && (
      rec.title.toLowerCase().includes('flight risk prediction') ||
      rec.title.toLowerCase().includes('flight risk') ||
      rec.title.toLowerCase().includes('turnover risk') ||
      rec.title.toLowerCase().includes('departure risk') ||
      rec.title.toLowerCase().includes('exit risk')
    )
  );
  
  // Check for retention intervention module needs
  const hasRetentionInterventionNeeds = results.recommendations.some(rec =>
    rec.category === 'retention' && (
      rec.title.toLowerCase().includes('retention intervention') ||
      rec.title.toLowerCase().includes('retention strategy') ||
      rec.title.toLowerCase().includes('retention program') ||
      rec.title.toLowerCase().includes('retention plan') ||
      rec.title.toLowerCase().includes('retention action')
    )
  );
  
  // Check for high turnover risk indicators
  const hasHighTurnoverRisk = results.recommendations.some(rec =>
    rec.category === 'retention' && (
      rec.title.toLowerCase().includes('high turnover risk') ||
      rec.title.toLowerCase().includes('high departure risk') ||
      rec.title.toLowerCase().includes('high exit risk') ||
      rec.title.toLowerCase().includes('critical retention') ||
      rec.title.toLowerCase().includes('urgent retention')
    )
  );
  
  // Check for employee satisfaction and engagement issues
  const hasEmployeeSatisfactionIssues = results.recommendations.some(rec =>
    rec.category === 'retention' && (
      rec.title.toLowerCase().includes('employee satisfaction') ||
      rec.title.toLowerCase().includes('employee engagement') ||
      rec.title.toLowerCase().includes('employee morale') ||
      rec.title.toLowerCase().includes('employee motivation') ||
      rec.title.toLowerCase().includes('employee happiness')
    )
  );
  
  // Check for compensation and benefits concerns
  const hasCompensationConcerns = results.recommendations.some(rec =>
    rec.category === 'retention' && (
      rec.title.toLowerCase().includes('compensation concerns') ||
      rec.title.toLowerCase().includes('salary issues') ||
      rec.title.toLowerCase().includes('benefits concerns') ||
      rec.title.toLowerCase().includes('pay dissatisfaction') ||
      rec.title.toLowerCase().includes('compensation gap')
    )
  );
  
  // Check for career development and growth opportunities
  const hasCareerDevelopmentIssues = results.recommendations.some(rec =>
    rec.category === 'retention' && (
      rec.title.toLowerCase().includes('career development') ||
      rec.title.toLowerCase().includes('career growth') ||
      rec.title.toLowerCase().includes('career advancement') ||
      rec.title.toLowerCase().includes('career opportunities') ||
      rec.title.toLowerCase().includes('career progression')
    )
  );
  
  // Check for work-life balance and flexibility issues
  const hasWorkLifeBalanceIssues = results.recommendations.some(rec =>
    rec.category === 'retention' && (
      rec.title.toLowerCase().includes('work-life balance') ||
      rec.title.toLowerCase().includes('work flexibility') ||
      rec.title.toLowerCase().includes('workload concerns') ||
      rec.title.toLowerCase().includes('work stress') ||
      rec.title.toLowerCase().includes('work pressure')
    )
  );
  
  // Check for management and leadership issues
  const hasManagementIssues = results.recommendations.some(rec =>
    rec.category === 'retention' && (
      rec.title.toLowerCase().includes('management issues') ||
      rec.title.toLowerCase().includes('leadership concerns') ||
      rec.title.toLowerCase().includes('supervisor problems') ||
      rec.title.toLowerCase().includes('manager relationship') ||
      rec.title.toLowerCase().includes('leadership style')
    )
  );
  
  // Check for team dynamics and workplace culture issues
  const hasTeamDynamicsIssues = results.recommendations.some(rec =>
    rec.category === 'retention' && (
      rec.title.toLowerCase().includes('team dynamics') ||
      rec.title.toLowerCase().includes('workplace culture') ||
      rec.title.toLowerCase().includes('team conflicts') ||
      rec.title.toLowerCase().includes('workplace environment') ||
      rec.title.toLowerCase().includes('team collaboration')
    )
  );
  
  // Check for job security and stability concerns
  const hasJobSecurityConcerns = results.recommendations.some(rec =>
    rec.category === 'retention' && (
      rec.title.toLowerCase().includes('job security') ||
      rec.title.toLowerCase().includes('job stability') ||
      rec.title.toLowerCase().includes('employment concerns') ||
      rec.title.toLowerCase().includes('job uncertainty') ||
      rec.title.toLowerCase().includes('job stability')
    )
  );
  
  // Check for recognition and appreciation issues
  const hasRecognitionIssues = results.recommendations.some(rec =>
    rec.category === 'retention' && (
      rec.title.toLowerCase().includes('recognition issues') ||
      rec.title.toLowerCase().includes('appreciation concerns') ||
      rec.title.toLowerCase().includes('acknowledgment problems') ||
      rec.title.toLowerCase().includes('recognition gap') ||
      rec.title.toLowerCase().includes('appreciation gap')
    )
  );
  
  // This trigger would typically be activated by flight risk prediction algorithms
  // For now, we'll check if there are retention-related recommendations that indicate flight risk needs
  if (hasFlightRiskPrediction || hasRetentionInterventionNeeds || hasHighTurnoverRisk || hasEmployeeSatisfactionIssues || hasCompensationConcerns || hasCareerDevelopmentIssues || hasWorkLifeBalanceIssues || hasManagementIssues || hasTeamDynamicsIssues || hasJobSecurityConcerns || hasRecognitionIssues) {
    return {
      id: randomUUID(),
      triggerId: trigger.id,
      reason: 'Flight risk prediction indicates high risk of employee departure - activate retention intervention module',
      action: 'activate_retention_intervention_module',
      priority: 'high',
      data: {
        triggerSource: 'flight_risk_prediction',
        predictionType: predictionType,
        riskThreshold: riskThreshold,
        advanceNoticeDays: advanceNoticeDays,
        reminderDays: reminderDays,
        moduleType: moduleType,
        urgencyLevel: urgencyLevel,
        flightRiskPrediction: results.recommendations.filter(rec =>
          rec.category === 'retention' && (
            rec.title.toLowerCase().includes('flight risk') ||
            rec.title.toLowerCase().includes('turnover risk') ||
            rec.title.toLowerCase().includes('departure risk')
          )
        ),
        retentionInterventionNeeds: results.recommendations.filter(rec =>
          rec.category === 'retention' && (
            rec.title.toLowerCase().includes('retention') ||
            rec.title.toLowerCase().includes('intervention') ||
            rec.title.toLowerCase().includes('strategy')
          )
        ),
        highTurnoverRisk: results.recommendations.filter(rec =>
          rec.category === 'retention' && (
            rec.title.toLowerCase().includes('high turnover') ||
            rec.title.toLowerCase().includes('high departure') ||
            rec.title.toLowerCase().includes('critical retention')
          )
        ),
        employeeSatisfactionIssues: results.recommendations.filter(rec =>
          rec.category === 'retention' && (
            rec.title.toLowerCase().includes('satisfaction') ||
            rec.title.toLowerCase().includes('engagement') ||
            rec.title.toLowerCase().includes('morale')
          )
        ),
        compensationConcerns: results.recommendations.filter(rec =>
          rec.category === 'retention' && (
            rec.title.toLowerCase().includes('compensation') ||
            rec.title.toLowerCase().includes('salary') ||
            rec.title.toLowerCase().includes('benefits')
          )
        ),
        careerDevelopmentIssues: results.recommendations.filter(rec =>
          rec.category === 'retention' && (
            rec.title.toLowerCase().includes('career') ||
            rec.title.toLowerCase().includes('development') ||
            rec.title.toLowerCase().includes('growth')
          )
        ),
        workLifeBalanceIssues: results.recommendations.filter(rec =>
          rec.category === 'retention' && (
            rec.title.toLowerCase().includes('work-life') ||
            rec.title.toLowerCase().includes('flexibility') ||
            rec.title.toLowerCase().includes('workload')
          )
        ),
        managementIssues: results.recommendations.filter(rec =>
          rec.category === 'retention' && (
            rec.title.toLowerCase().includes('management') ||
            rec.title.toLowerCase().includes('leadership') ||
            rec.title.toLowerCase().includes('supervisor')
          )
        ),
        teamDynamicsIssues: results.recommendations.filter(rec =>
          rec.category === 'retention' && (
            rec.title.toLowerCase().includes('team') ||
            rec.title.toLowerCase().includes('culture') ||
            rec.title.toLowerCase().includes('workplace')
          )
        ),
        jobSecurityConcerns: results.recommendations.filter(rec =>
          rec.category === 'retention' && (
            rec.title.toLowerCase().includes('job security') ||
            rec.title.toLowerCase().includes('stability') ||
            rec.title.toLowerCase().includes('employment')
          )
        ),
        recognitionIssues: results.recommendations.filter(rec =>
          rec.category === 'retention' && (
            rec.title.toLowerCase().includes('recognition') ||
            rec.title.toLowerCase().includes('appreciation') ||
            rec.title.toLowerCase().includes('acknowledgment')
          )
        ),
        interventionSchedule: {
          type: predictionType,
          riskThreshold: riskThreshold,
          advanceNotice: advanceNoticeDays,
          reminders: reminderDays,
          moduleType: moduleType,
          urgencyLevel: urgencyLevel
        },
        recommendations: results.recommendations.filter(r => r.category === 'retention')
      },
      executed: false
    };
  }
  
  return null;
}

function processSkillObsolescenceRiskTrigger(trigger: Trigger, results: UnifiedResults, config: TriggerConfig): TriggerResult | null {
  // This trigger is activated when skills are at risk of becoming obsolete
  // It activates the Proactive Training Module (part of LXP) to prevent skill obsolescence
  
  const riskType = config.riskType || 'skill_obsolescence';
  const obsolescenceThreshold = config.obsolescenceThreshold || 0.6;
  const advanceNoticeDays = config.advanceNoticeDays || 14;
  const reminderDays = config.reminderDays || [14, 7, 3];
  const moduleType = config.moduleType || 'proactive_training_module';
  const partOf = config.partOf || 'lxp';
  const urgencyLevel = config.urgencyLevel || 'medium';
  
  // Check if there are skill obsolescence risk indicators
  const hasSkillObsolescenceRisk = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('skill obsolescence risk') ||
      rec.title.toLowerCase().includes('skill obsolescence') ||
      rec.title.toLowerCase().includes('outdated skills') ||
      rec.title.toLowerCase().includes('obsolete skills') ||
      rec.title.toLowerCase().includes('skill decay')
    )
  );
  
  // Check for proactive training module needs (part of LXP)
  const hasProactiveTrainingNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('proactive training') ||
      rec.title.toLowerCase().includes('preventive training') ||
      rec.title.toLowerCase().includes('anticipatory training') ||
      rec.title.toLowerCase().includes('future skills training') ||
      rec.title.toLowerCase().includes('skill maintenance')
    )
  );
  
  // Check for technology advancement and skill evolution needs
  const hasTechnologyAdvancementNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('technology advancement') ||
      rec.title.toLowerCase().includes('technology evolution') ||
      rec.title.toLowerCase().includes('digital transformation') ||
      rec.title.toLowerCase().includes('technology update') ||
      rec.title.toLowerCase().includes('tech advancement')
    )
  );
  
  // Check for industry trend and market change needs
  const hasIndustryTrendNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('industry trend') ||
      rec.title.toLowerCase().includes('market change') ||
      rec.title.toLowerCase().includes('industry evolution') ||
      rec.title.toLowerCase().includes('market shift') ||
      rec.title.toLowerCase().includes('industry disruption')
    )
  );
  
  // Check for skill gap and competency needs
  const hasSkillGapNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('skill gap') ||
      rec.title.toLowerCase().includes('competency gap') ||
      rec.title.toLowerCase().includes('skill deficiency') ||
      rec.title.toLowerCase().includes('competency deficiency') ||
      rec.title.toLowerCase().includes('skill shortage')
    )
  );
  
  // Check for emerging skills and future competencies needs
  const hasEmergingSkillsNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('emerging skills') ||
      rec.title.toLowerCase().includes('future competencies') ||
      rec.title.toLowerCase().includes('new skills') ||
      rec.title.toLowerCase().includes('evolving skills') ||
      rec.title.toLowerCase().includes('next-gen skills')
    )
  );
  
  // Check for continuous learning and upskilling needs
  const hasContinuousLearningNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('continuous learning') ||
      rec.title.toLowerCase().includes('upskilling') ||
      rec.title.toLowerCase().includes('reskilling') ||
      rec.title.toLowerCase().includes('skill development') ||
      rec.title.toLowerCase().includes('learning development')
    )
  );
  
  // Check for certification and credential renewal needs
  const hasCertificationRenewalNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('certification renewal') ||
      rec.title.toLowerCase().includes('credential renewal') ||
      rec.title.toLowerCase().includes('license renewal') ||
      rec.title.toLowerCase().includes('certification update') ||
      rec.title.toLowerCase().includes('credential update')
    )
  );
  
  // Check for skill assessment and evaluation needs
  const hasSkillAssessmentNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('skill assessment') ||
      rec.title.toLowerCase().includes('competency evaluation') ||
      rec.title.toLowerCase().includes('skill evaluation') ||
      rec.title.toLowerCase().includes('competency assessment') ||
      rec.title.toLowerCase().includes('skill audit')
    )
  );
  
  // Check for learning path and development planning needs
  const hasLearningPathNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('learning path') ||
      rec.title.toLowerCase().includes('development planning') ||
      rec.title.toLowerCase().includes('skill roadmap') ||
      rec.title.toLowerCase().includes('competency roadmap') ||
      rec.title.toLowerCase().includes('learning roadmap')
    )
  );
  
  // Check for performance impact and productivity needs
  const hasPerformanceImpactNeeds = results.recommendations.some(rec =>
    rec.category === 'skills' && (
      rec.title.toLowerCase().includes('performance impact') ||
      rec.title.toLowerCase().includes('productivity impact') ||
      rec.title.toLowerCase().includes('efficiency impact') ||
      rec.title.toLowerCase().includes('performance decline') ||
      rec.title.toLowerCase().includes('productivity decline')
    )
  );
  
  // This trigger would typically be activated by skill obsolescence prediction algorithms
  // For now, we'll check if there are skills-related recommendations that indicate obsolescence risk needs
  if (hasSkillObsolescenceRisk || hasProactiveTrainingNeeds || hasTechnologyAdvancementNeeds || hasIndustryTrendNeeds || hasSkillGapNeeds || hasEmergingSkillsNeeds || hasContinuousLearningNeeds || hasCertificationRenewalNeeds || hasSkillAssessmentNeeds || hasLearningPathNeeds || hasPerformanceImpactNeeds) {
    return {
      id: randomUUID(),
      triggerId: trigger.id,
      reason: 'Skill obsolescence risk detected - activate proactive training module part of LXP',
      action: 'activate_proactive_training_module',
      priority: 'medium',
      data: {
        triggerSource: 'skill_obsolescence_risk',
        riskType: riskType,
        obsolescenceThreshold: obsolescenceThreshold,
        advanceNoticeDays: advanceNoticeDays,
        reminderDays: reminderDays,
        moduleType: moduleType,
        partOf: partOf,
        urgencyLevel: urgencyLevel,
        skillObsolescenceRisk: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('obsolescence') ||
            rec.title.toLowerCase().includes('outdated') ||
            rec.title.toLowerCase().includes('obsolete')
          )
        ),
        proactiveTrainingNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('proactive') ||
            rec.title.toLowerCase().includes('preventive') ||
            rec.title.toLowerCase().includes('anticipatory')
          )
        ),
        technologyAdvancementNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('technology') ||
            rec.title.toLowerCase().includes('digital') ||
            rec.title.toLowerCase().includes('tech')
          )
        ),
        industryTrendNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('industry') ||
            rec.title.toLowerCase().includes('market') ||
            rec.title.toLowerCase().includes('trend')
          )
        ),
        skillGapNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('gap') ||
            rec.title.toLowerCase().includes('deficiency') ||
            rec.title.toLowerCase().includes('shortage')
          )
        ),
        emergingSkillsNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('emerging') ||
            rec.title.toLowerCase().includes('future') ||
            rec.title.toLowerCase().includes('new')
          )
        ),
        continuousLearningNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('continuous') ||
            rec.title.toLowerCase().includes('upskilling') ||
            rec.title.toLowerCase().includes('reskilling')
          )
        ),
        certificationRenewalNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('certification') ||
            rec.title.toLowerCase().includes('credential') ||
            rec.title.toLowerCase().includes('license')
          )
        ),
        skillAssessmentNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('assessment') ||
            rec.title.toLowerCase().includes('evaluation') ||
            rec.title.toLowerCase().includes('audit')
          )
        ),
        learningPathNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('learning path') ||
            rec.title.toLowerCase().includes('roadmap') ||
            rec.title.toLowerCase().includes('planning')
          )
        ),
        performanceImpactNeeds: results.recommendations.filter(rec =>
          rec.category === 'skills' && (
            rec.title.toLowerCase().includes('performance') ||
            rec.title.toLowerCase().includes('productivity') ||
            rec.title.toLowerCase().includes('efficiency')
          )
        ),
        trainingSchedule: {
          type: riskType,
          obsolescenceThreshold: obsolescenceThreshold,
          advanceNotice: advanceNoticeDays,
          reminders: reminderDays,
          moduleType: moduleType,
          partOf: partOf,
          urgencyLevel: urgencyLevel
        },
        recommendations: results.recommendations.filter(r => r.category === 'skills')
      },
      executed: false
    };
  }
  
  return null;
}

function processLeadershipGapPredictionTrigger(trigger: Trigger, results: UnifiedResults, config: TriggerConfig): TriggerResult | null {
  // This trigger is activated when leadership gaps are predicted
  // It activates the Succession Acceleration Module (part of Succession Planning Module) to accelerate leadership development
  
  const predictionType = config.predictionType || 'leadership_gap';
  const gapThreshold = config.gapThreshold || 0.7;
  const advanceNoticeDays = config.advanceNoticeDays || 30;
  const reminderDays = config.reminderDays || [30, 14, 7];
  const moduleType = config.moduleType || 'succession_acceleration_module';
  const partOf = config.partOf || 'succession_planning_module';
  const urgencyLevel = config.urgencyLevel || 'high';
  
  // Check if there are leadership gap prediction indicators
  const hasLeadershipGapPrediction = results.recommendations.some(rec =>
    rec.category === 'talent' && (
      rec.title.toLowerCase().includes('leadership gap prediction') ||
      rec.title.toLowerCase().includes('leadership gap') ||
      rec.title.toLowerCase().includes('leadership shortage') ||
      rec.title.toLowerCase().includes('leadership deficit') ||
      rec.title.toLowerCase().includes('leadership void')
    )
  );
  
  // Check for succession acceleration module needs (part of succession planning module)
  const hasSuccessionAccelerationNeeds = results.recommendations.some(rec =>
    rec.category === 'talent' && (
      rec.title.toLowerCase().includes('succession acceleration') ||
      rec.title.toLowerCase().includes('leadership acceleration') ||
      rec.title.toLowerCase().includes('succession acceleration') ||
      rec.title.toLowerCase().includes('leadership development acceleration') ||
      rec.title.toLowerCase().includes('succession planning acceleration')
    )
  );
  
  // Check for leadership pipeline and readiness needs
  const hasLeadershipPipelineNeeds = results.recommendations.some(rec =>
    rec.category === 'talent' && (
      rec.title.toLowerCase().includes('leadership pipeline') ||
      rec.title.toLowerCase().includes('leadership readiness') ||
      rec.title.toLowerCase().includes('leadership bench') ||
      rec.title.toLowerCase().includes('leadership talent pool') ||
      rec.title.toLowerCase().includes('leadership succession pool')
    )
  );
  
  // Check for executive succession and leadership transition needs
  const hasExecutiveSuccessionNeeds = results.recommendations.some(rec =>
    rec.category === 'talent' && (
      rec.title.toLowerCase().includes('executive succession') ||
      rec.title.toLowerCase().includes('executive leadership') ||
      rec.title.toLowerCase().includes('executive transition') ||
      rec.title.toLowerCase().includes('executive development') ||
      rec.title.toLowerCase().includes('executive pipeline')
    )
  );
  
  // Check for leadership competency and capability needs
  const hasLeadershipCompetencyNeeds = results.recommendations.some(rec =>
    rec.category === 'talent' && (
      rec.title.toLowerCase().includes('leadership competency') ||
      rec.title.toLowerCase().includes('leadership capability') ||
      rec.title.toLowerCase().includes('leadership skills') ||
      rec.title.toLowerCase().includes('leadership abilities') ||
      rec.title.toLowerCase().includes('leadership expertise')
    )
  );
  
  // Check for high-potential talent and leadership development needs
  const hasHighPotentialTalentNeeds = results.recommendations.some(rec =>
    rec.category === 'talent' && (
      rec.title.toLowerCase().includes('high potential talent') ||
      rec.title.toLowerCase().includes('high potential') ||
      rec.title.toLowerCase().includes('leadership potential') ||
      rec.title.toLowerCase().includes('future leaders') ||
      rec.title.toLowerCase().includes('emerging leaders')
    )
  );
  
  // Check for leadership assessment and evaluation needs
  const hasLeadershipAssessmentNeeds = results.recommendations.some(rec =>
    rec.category === 'talent' && (
      rec.title.toLowerCase().includes('leadership assessment') ||
      rec.title.toLowerCase().includes('leadership evaluation') ||
      rec.title.toLowerCase().includes('leadership review') ||
      rec.title.toLowerCase().includes('leadership audit') ||
      rec.title.toLowerCase().includes('leadership analysis')
    )
  );
  
  // Check for leadership development and training needs
  const hasLeadershipDevelopmentNeeds = results.recommendations.some(rec =>
    rec.category === 'talent' && (
      rec.title.toLowerCase().includes('leadership development') ||
      rec.title.toLowerCase().includes('leadership training') ||
      rec.title.toLowerCase().includes('leadership coaching') ||
      rec.title.toLowerCase().includes('leadership mentoring') ||
      rec.title.toLowerCase().includes('leadership education')
    )
  );
  
  // Check for succession planning and strategy needs
  const hasSuccessionPlanningNeeds = results.recommendations.some(rec =>
    rec.category === 'talent' && (
      rec.title.toLowerCase().includes('succession planning') ||
      rec.title.toLowerCase().includes('succession strategy') ||
      rec.title.toLowerCase().includes('succession management') ||
      rec.title.toLowerCase().includes('succession program') ||
      rec.title.toLowerCase().includes('succession framework')
    )
  );
  
  // Check for organizational continuity and leadership stability needs
  const hasOrganizationalContinuityNeeds = results.recommendations.some(rec =>
    rec.category === 'talent' && (
      rec.title.toLowerCase().includes('organizational continuity') ||
      rec.title.toLowerCase().includes('leadership stability') ||
      rec.title.toLowerCase().includes('organizational stability') ||
      rec.title.toLowerCase().includes('leadership continuity') ||
      rec.title.toLowerCase().includes('organizational leadership')
    )
  );
  
  // Check for critical leadership positions and roles needs
  const hasCriticalLeadershipPositionsNeeds = results.recommendations.some(rec =>
    rec.category === 'talent' && (
      rec.title.toLowerCase().includes('critical leadership positions') ||
      rec.title.toLowerCase().includes('key leadership roles') ||
      rec.title.toLowerCase().includes('critical leadership roles') ||
      rec.title.toLowerCase().includes('essential leadership') ||
      rec.title.toLowerCase().includes('vital leadership')
    )
  );
  
  // This trigger would typically be activated by leadership gap prediction algorithms
  // For now, we'll check if there are talent-related recommendations that indicate leadership gap needs
  if (hasLeadershipGapPrediction || hasSuccessionAccelerationNeeds || hasLeadershipPipelineNeeds || hasExecutiveSuccessionNeeds || hasLeadershipCompetencyNeeds || hasHighPotentialTalentNeeds || hasLeadershipAssessmentNeeds || hasLeadershipDevelopmentNeeds || hasSuccessionPlanningNeeds || hasOrganizationalContinuityNeeds || hasCriticalLeadershipPositionsNeeds) {
    return {
      id: randomUUID(),
      triggerId: trigger.id,
      reason: 'Leadership gap prediction indicates critical leadership shortage - activate succession acceleration module part of succession planning module',
      action: 'activate_succession_acceleration_module',
      priority: 'high',
      data: {
        triggerSource: 'leadership_gap_prediction',
        predictionType: predictionType,
        gapThreshold: gapThreshold,
        advanceNoticeDays: advanceNoticeDays,
        reminderDays: reminderDays,
        moduleType: moduleType,
        partOf: partOf,
        urgencyLevel: urgencyLevel,
        leadershipGapPrediction: results.recommendations.filter(rec =>
          rec.category === 'talent' && (
            rec.title.toLowerCase().includes('leadership gap') ||
            rec.title.toLowerCase().includes('leadership shortage') ||
            rec.title.toLowerCase().includes('leadership deficit')
          )
        ),
        successionAccelerationNeeds: results.recommendations.filter(rec =>
          rec.category === 'talent' && (
            rec.title.toLowerCase().includes('succession acceleration') ||
            rec.title.toLowerCase().includes('leadership acceleration') ||
            rec.title.toLowerCase().includes('acceleration')
          )
        ),
        leadershipPipelineNeeds: results.recommendations.filter(rec =>
          rec.category === 'talent' && (
            rec.title.toLowerCase().includes('leadership pipeline') ||
            rec.title.toLowerCase().includes('leadership readiness') ||
            rec.title.toLowerCase().includes('leadership bench')
          )
        ),
        executiveSuccessionNeeds: results.recommendations.filter(rec =>
          rec.category === 'talent' && (
            rec.title.toLowerCase().includes('executive') ||
            rec.title.toLowerCase().includes('succession') ||
            rec.title.toLowerCase().includes('leadership')
          )
        ),
        leadershipCompetencyNeeds: results.recommendations.filter(rec =>
          rec.category === 'talent' && (
            rec.title.toLowerCase().includes('leadership competency') ||
            rec.title.toLowerCase().includes('leadership capability') ||
            rec.title.toLowerCase().includes('leadership skills')
          )
        ),
        highPotentialTalentNeeds: results.recommendations.filter(rec =>
          rec.category === 'talent' && (
            rec.title.toLowerCase().includes('high potential') ||
            rec.title.toLowerCase().includes('leadership potential') ||
            rec.title.toLowerCase().includes('future leaders')
          )
        ),
        leadershipAssessmentNeeds: results.recommendations.filter(rec =>
          rec.category === 'talent' && (
            rec.title.toLowerCase().includes('leadership assessment') ||
            rec.title.toLowerCase().includes('leadership evaluation') ||
            rec.title.toLowerCase().includes('leadership review')
          )
        ),
        leadershipDevelopmentNeeds: results.recommendations.filter(rec =>
          rec.category === 'talent' && (
            rec.title.toLowerCase().includes('leadership development') ||
            rec.title.toLowerCase().includes('leadership training') ||
            rec.title.toLowerCase().includes('leadership coaching')
          )
        ),
        successionPlanningNeeds: results.recommendations.filter(rec =>
          rec.category === 'talent' && (
            rec.title.toLowerCase().includes('succession planning') ||
            rec.title.toLowerCase().includes('succession strategy') ||
            rec.title.toLowerCase().includes('succession management')
          )
        ),
        organizationalContinuityNeeds: results.recommendations.filter(rec =>
          rec.category === 'talent' && (
            rec.title.toLowerCase().includes('organizational continuity') ||
            rec.title.toLowerCase().includes('leadership stability') ||
            rec.title.toLowerCase().includes('organizational stability')
          )
        ),
        criticalLeadershipPositionsNeeds: results.recommendations.filter(rec =>
          rec.category === 'talent' && (
            rec.title.toLowerCase().includes('critical leadership') ||
            rec.title.toLowerCase().includes('key leadership') ||
            rec.title.toLowerCase().includes('essential leadership')
          )
        ),
        accelerationSchedule: {
          type: predictionType,
          gapThreshold: gapThreshold,
          advanceNotice: advanceNoticeDays,
          reminders: reminderDays,
          moduleType: moduleType,
          partOf: partOf,
          urgencyLevel: urgencyLevel
        },
        recommendations: results.recommendations.filter(r => r.category === 'talent')
      },
      executed: false
    };
  }
  
  return null;
}


async function logTriggeredAction(trigger: Trigger, result: TriggerResult, unifiedResults: UnifiedResults & { tenantId: string }): Promise<void> {
  try {
    await db.insert(triggerExecutions).values({
      id: randomUUID(),
      tenantId: unifiedResults.tenantId || 'default-tenant',
      triggerId: trigger.id,
      status: 'completed',
      inputData: {
        trigger: trigger.type,
        config: trigger.config
      },
      outputData: {
        action: result.action,
        priority: result.priority,
        data: result.data
      }
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
      name: 'Structure Analysis Expansion Alert',
      type: 'structure_analysis_expansion',
      config: { 
        expansionThreshold: 0.7,
        moduleType: 'hiring_module',
        urgencyLevel: 'high'
      },
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'Candidate Applied Alert',
      type: 'candidate_applied',
      config: { 
        moduleType: 'hiring_module',
        workflow: 'candidate_screening',
        urgencyLevel: 'medium'
      },
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'Interview Completed Alert',
      type: 'interview_completed',
      config: { 
        moduleType: 'hiring_module',
        workflow: 'offer_generation',
        scoreThreshold: 3.5,
        urgencyLevel: 'medium'
      },
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'Offer Accepted Alert',
      type: 'offer_accepted',
      config: { 
        moduleType: 'onboarding_module',
        workflow: 'employee_onboarding',
        urgencyLevel: 'high'
      },
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
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'LXP Completed Performance Alert',
      type: 'lxp_completed_performance',
      config: {},
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'Performance Excellent Reward Alert',
      type: 'performance_excellent_reward',
      config: { performanceThreshold: 1.0 },
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'Performance Perfect LXP Alert',
      type: 'performance_perfect_lxp',
      config: { perfectPerformanceThreshold: 1.0 },
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'Performance Exceptional Talent Succession Alert',
      type: 'performance_exceptional_talent_succession',
      config: { exceptionalPerformanceThreshold: 1.05 },
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'Performance Improvement LXP Alert',
      type: 'performance_improvement_lxp',
      config: { improvementThreshold: 1.0 },
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'Annual Performance Review Due Alert',
      type: 'annual_performance_review_due',
      config: { 
        reviewPeriod: 'annual',
        advanceNoticeDays: 30,
        reminderDays: [30, 14, 7, 1]
      },
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'Quarterly Check-in Due Alert',
      type: 'quarterly_checkin_due',
      config: { 
        reviewPeriod: 'quarterly',
        advanceNoticeDays: 14,
        reminderDays: [14, 7, 3, 1],
        checkinType: 'performance_review'
      },
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'Probation Period Ending Alert',
      type: 'probation_period_ending',
      config: { 
        probationPeriod: 'standard',
        advanceNoticeDays: 7,
        reminderDays: [7, 3, 1],
        evaluationType: 'performance_evaluation'
      },
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'Compliance Training Due Alert',
      type: 'compliance_training_due',
      config: { 
        trainingType: 'compliance',
        advanceNoticeDays: 30,
        reminderDays: [30, 14, 7, 1],
        moduleType: 'lxp_compliance_training'
      },
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'Safety Training Expired Alert',
      type: 'safety_training_expired',
      config: { 
        trainingType: 'safety',
        advanceNoticeDays: 14,
        reminderDays: [14, 7, 3, 1],
        moduleType: 'lxp_safety_training'
      },
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'Certification Expiring Alert',
      type: 'certification_expiring',
      config: { 
        certificationType: 'professional',
        advanceNoticeDays: 60,
        reminderDays: [60, 30, 14, 7, 1],
        moduleType: 'lxp_certification_renewal'
      },
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'Legal Requirement Change Alert',
      type: 'legal_requirement_change',
      config: { 
        requirementType: 'legal',
        advanceNoticeDays: 7,
        reminderDays: [7, 3, 1],
        moduleType: 'policy_update_module',
        lxpIntegration: true
      },
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'Team Size Changes Alert',
      type: 'team_size_changes',
      config: { 
        changeType: 'team_restructuring',
        advanceNoticeDays: 14,
        reminderDays: [14, 7, 3, 1],
        moduleType: 'team_restructuring_module',
        tier: 'enterprise'
      },
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'Onboarding Completion Alert',
      type: 'onboarding_completion',
      config: { 
        completionType: 'onboarding',
        advanceNoticeDays: 1,
        reminderDays: [1],
        moduleType: 'performance_baseline_module',
        partOf: 'performance_management_module'
      },
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'Training Completion Alert',
      type: 'training_completion',
      config: { 
        completionType: 'training',
        advanceNoticeDays: 1,
        reminderDays: [1],
        moduleType: 'performance_assessment_module',
        partOf: 'performance_management_module',
        sourceModule: 'lxp'
      },
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'Succession Plan Activation Alert',
      type: 'succession_plan_activation',
      config: { 
        activationType: 'succession_planning',
        advanceNoticeDays: 7,
        reminderDays: [7, 3, 1],
        moduleType: 'leadership_transition_module',
        partOf: 'onboarding_module',
        sourceModule: 'succession_planning'
      },
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'Flight Risk Prediction Alert',
      type: 'flight_risk_prediction',
      config: { 
        predictionType: 'flight_risk',
        riskThreshold: 0.7,
        advanceNoticeDays: 3,
        reminderDays: [3, 1],
        moduleType: 'retention_intervention_module',
        urgencyLevel: 'high'
      },
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'Skill Obsolescence Risk Alert',
      type: 'skill_obsolescence_risk',
      config: { 
        riskType: 'skill_obsolescence',
        obsolescenceThreshold: 0.6,
        advanceNoticeDays: 14,
        reminderDays: [14, 7, 3],
        moduleType: 'proactive_training_module',
        partOf: 'lxp',
        urgencyLevel: 'medium'
      },
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: randomUUID(),
      tenantId,
      name: 'Leadership Gap Prediction Alert',
      type: 'leadership_gap_prediction',
      config: { 
        predictionType: 'leadership_gap',
        gapThreshold: 0.7,
        advanceNoticeDays: 30,
        reminderDays: [30, 14, 7],
        moduleType: 'succession_acceleration_module',
        partOf: 'succession_planning_module',
        urgencyLevel: 'high'
      },
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  
  try {
    for (const trigger of defaultTriggers) {
      await db.insert(triggers).values({
        ...trigger,
        sourceModule: 'performance',
        eventType: trigger.type,
        targetModule: 'performance',
        action: 'notify'
      } as typeof triggers.$inferInsert);
    }

    console.log(`Created ${defaultTriggers.length} default triggers for tenant ${tenantId}`);
  } catch (error) {
    console.error('Failed to create default triggers:', error);
  }
}