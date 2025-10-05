// LXP Trigger Response Handlers - Comprehensive Trigger Processing
// Task Reference: Module 1 (LXP) - Section 1.3.2 (Implement Trigger Response Handlers)

import { LXPOrchestrator, LXPTriggerContext, LXPOrchestrationResult } from './lxp-orchestrator.js';
import { UnifiedResults } from '../../../results/unified-results.js';

// ============================================================================
// TASK 1.3.2: Trigger Response Handlers
// ============================================================================
// Status: ✅ Complete
// Description: Implement comprehensive trigger response handlers for all LXP triggers
// Dependencies: 1.3.1 (LXP Orchestrator) ✅ Complete

export interface TriggerHandlerConfig {
  enabled: boolean;
  priority: number;
  timeout: number;
  retryCount: number;
  fallbackAction?: string;
  conditions?: {
    minUrgencyLevel?: string;
    maxUrgencyLevel?: string;
    requiredData?: string[];
    excludedTenants?: string[];
  };
}

export interface TriggerHandlerResult {
  success: boolean;
  handlerId: string;
  triggerType: string;
  processingTime: number;
  result?: LXPOrchestrationResult;
  error?: string;
  warnings?: string[];
  nextTriggers?: string[];
  metadata: {
    timestamp: Date;
    retryCount: number;
    fallbackUsed: boolean;
  };
}

export class LXPTriggerHandlers {
  private orchestrator: LXPOrchestrator;
  private handlerConfigs: Map<string, TriggerHandlerConfig>;
  private handlerStats: Map<string, any>;

  constructor(orchestrator: LXPOrchestrator) {
    this.orchestrator = orchestrator;
    this.handlerConfigs = new Map();
    this.handlerStats = new Map();
    this.initializeHandlerConfigs();
  }

  // ============================================================================
  // Handler Configuration
  // ============================================================================

  private initializeHandlerConfigs(): void {
    // Skills Gap Analysis → LXP
    this.handlerConfigs.set('skills_gap', {
      enabled: true,
      priority: 8,
      timeout: 30000,
      retryCount: 3,
      fallbackAction: 'create_basic_learning_path',
      conditions: {
        minUrgencyLevel: 'low',
        requiredData: ['skillGaps', 'employeeProfile']
      }
    });

    // Employee Culture Analysis → LXP
    this.handlerConfigs.set('culture_alignment', {
      enabled: true,
      priority: 9,
      timeout: 25000,
      retryCount: 2,
      fallbackAction: 'create_culture_learning_path',
      conditions: {
        minUrgencyLevel: 'medium',
        requiredData: ['cultureValues', 'employeeProfile']
      }
    });

    // Performance Management Results → LXP
    this.handlerConfigs.set('performance_improvement', {
      enabled: true,
      priority: 7,
      timeout: 35000,
      retryCount: 3,
      fallbackAction: 'create_performance_learning_path',
      conditions: {
        minUrgencyLevel: 'medium',
        requiredData: ['performanceResults', 'improvementAreas']
      }
    });

    // Compliance Training Due → LXP
    this.handlerConfigs.set('compliance_training', {
      enabled: true,
      priority: 10,
      timeout: 20000,
      retryCount: 2,
      fallbackAction: 'create_compliance_learning_path',
      conditions: {
        minUrgencyLevel: 'high',
        requiredData: ['complianceRequirements', 'deadline']
      }
    });

    // Safety Training Expired → LXP
    this.handlerConfigs.set('safety_training', {
      enabled: true,
      priority: 10,
      timeout: 20000,
      retryCount: 2,
      fallbackAction: 'create_safety_learning_path',
      conditions: {
        minUrgencyLevel: 'high',
        requiredData: ['safetyRequirements', 'expirationDate']
      }
    });

    // Certification Expiring → LXP
    this.handlerConfigs.set('certification_renewal', {
      enabled: true,
      priority: 9,
      timeout: 25000,
      retryCount: 2,
      fallbackAction: 'create_certification_learning_path',
      conditions: {
        minUrgencyLevel: 'high',
        requiredData: ['certificationDetails', 'expirationDate']
      }
    });

    // Legal Requirement Change → Policy Update → LXP
    this.handlerConfigs.set('policy_update', {
      enabled: true,
      priority: 8,
      timeout: 30000,
      retryCount: 3,
      fallbackAction: 'create_policy_learning_path',
      conditions: {
        minUrgencyLevel: 'medium',
        requiredData: ['policyChanges', 'effectiveDate']
      }
    });

    // Skill Obsolescence Risk → Proactive Training → LXP
    this.handlerConfigs.set('proactive_training', {
      enabled: true,
      priority: 6,
      timeout: 40000,
      retryCount: 3,
      fallbackAction: 'create_proactive_learning_path',
      conditions: {
        minUrgencyLevel: 'low',
        requiredData: ['skillObsolescenceRisk', 'futureRequirements']
      }
    });

    // LXP Training Plans → Performance Management Module
    this.handlerConfigs.set('lxp_training_completion', {
      enabled: true,
      priority: 7,
      timeout: 20000,
      retryCount: 2,
      fallbackAction: 'trigger_performance_assessment',
      conditions: {
        minUrgencyLevel: 'medium',
        requiredData: ['trainingResults', 'learningObjectives']
      }
    });

    // Training Completion → Performance Assessment
    this.handlerConfigs.set('training_completion', {
      enabled: true,
      priority: 6,
      timeout: 25000,
      retryCount: 2,
      fallbackAction: 'trigger_performance_assessment',
      conditions: {
        minUrgencyLevel: 'medium',
        requiredData: ['trainingResults', 'skillDevelopment']
      }
    });

    // Onboarding Completion → Performance Baseline
    this.handlerConfigs.set('onboarding_completion', {
      enabled: true,
      priority: 5,
      timeout: 30000,
      retryCount: 2,
      fallbackAction: 'create_performance_baseline',
      conditions: {
        minUrgencyLevel: 'low',
        requiredData: ['onboardingResults', 'employeeProfile']
      }
    });

    // Learning Progress Update → Progress Tracking
    this.handlerConfigs.set('learning_progress_update', {
      enabled: true,
      priority: 4,
      timeout: 15000,
      retryCount: 3,
      fallbackAction: 'update_basic_progress',
      conditions: {
        minUrgencyLevel: 'low',
        requiredData: ['progressData', 'learningPathId']
      }
    });

    // Assessment Required → Assessment
    this.handlerConfigs.set('assessment_required', {
      enabled: true,
      priority: 6,
      timeout: 20000,
      retryCount: 2,
      fallbackAction: 'create_basic_assessment',
      conditions: {
        minUrgencyLevel: 'medium',
        requiredData: ['assessmentCriteria', 'learningObjectives']
      }
    });

    // Game Generation Request → Game Generation
    this.handlerConfigs.set('game_generation_request', {
      enabled: true,
      priority: 5,
      timeout: 45000,
      retryCount: 2,
      fallbackAction: 'create_simple_game',
      conditions: {
        minUrgencyLevel: 'low',
        requiredData: ['gameRequirements', 'employeeProfile']
      }
    });

    // Initialize stats for each handler
    for (const [triggerType, config] of this.handlerConfigs) {
      this.handlerStats.set(triggerType, {
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        averageProcessingTime: 0,
        lastProcessed: null,
        errorCount: 0
      });
    }
  }

  // ============================================================================
  // Main Trigger Processing
  // ============================================================================

  /**
   * Process a single trigger
   */
  async processTrigger(triggerType: string, triggerData: any, unifiedResults?: UnifiedResults): Promise<TriggerHandlerResult> {
    const startTime = Date.now();
    const handlerId = this.generateHandlerId(triggerType);

    try {
      console.log(`[LXP Trigger Handler] Processing trigger: ${triggerType} with handler: ${handlerId}`);

      // Validate trigger configuration
      const config = this.handlerConfigs.get(triggerType);
      if (!config) {
        throw new Error(`No handler configuration found for trigger type: ${triggerType}`);
      }

      if (!config.enabled) {
        throw new Error(`Handler for trigger type ${triggerType} is disabled`);
      }

      // Validate trigger conditions
      const validationResult = this.validateTriggerConditions(triggerType, triggerData, config);
      if (!validationResult.valid) {
        throw new Error(`Trigger validation failed: ${validationResult.reason}`);
      }

      // Create trigger context
      const triggerContext = this.createTriggerContext(triggerType, triggerData, unifiedResults);

      // Process trigger with orchestrator
      const result = await this.orchestrator.processLXPTrigger(triggerContext);

      // Update statistics
      this.updateHandlerStats(triggerType, true, Date.now() - startTime);

      // Determine next triggers
      const nextTriggers = this.determineNextTriggers(triggerType, result);

      return {
        success: true,
        handlerId,
        triggerType,
        processingTime: Date.now() - startTime,
        result,
        nextTriggers,
        metadata: {
          timestamp: new Date(),
          retryCount: 0,
          fallbackUsed: false
        }
      };

    } catch (error) {
      console.error(`[LXP Trigger Handler] Error processing trigger ${triggerType}:`, error);

      // Update statistics
      this.updateHandlerStats(triggerType, false, Date.now() - startTime);

      // Try fallback action if configured
      let fallbackResult: LXPOrchestrationResult | undefined;
      let fallbackUsed = false;

      const config = this.handlerConfigs.get(triggerType);
      if (config?.fallbackAction) {
        try {
          fallbackResult = await this.executeFallbackAction(config.fallbackAction, triggerType, triggerData);
          fallbackUsed = true;
        } catch (fallbackError) {
          console.error(`[LXP Trigger Handler] Fallback action failed:`, fallbackError);
        }
      }

      return {
        success: false,
        handlerId,
        triggerType,
        processingTime: Date.now() - startTime,
        result: fallbackResult,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          timestamp: new Date(),
          retryCount: 0,
          fallbackUsed
        }
      };
    }
  }

  /**
   * Process multiple triggers in batch
   */
  async processTriggersBatch(triggers: Array<{type: string, data: any}>, unifiedResults?: UnifiedResults): Promise<TriggerHandlerResult[]> {
    console.log(`[LXP Trigger Handler] Processing batch of ${triggers.length} triggers`);

    const results: TriggerHandlerResult[] = [];

    // Sort triggers by priority
    const sortedTriggers = triggers.sort((a, b) => {
      const configA = this.handlerConfigs.get(a.type);
      const configB = this.handlerConfigs.get(b.type);
      return (configB?.priority || 0) - (configA?.priority || 0);
    });

    // Process triggers sequentially to maintain order and avoid conflicts
    for (const trigger of sortedTriggers) {
      const result = await this.processTrigger(trigger.type, trigger.data, unifiedResults);
      results.push(result);
    }

    return results;
  }

  /**
   * Process triggers from unified results
   */
  async processUnifiedResults(unifiedResults: UnifiedResults): Promise<TriggerHandlerResult[]> {
    console.log(`[LXP Trigger Handler] Processing unified results for employee: ${(unifiedResults as any).employeeId}`);

    const triggers = this.extractTriggersFromUnifiedResults(unifiedResults);
    return this.processTriggersBatch(triggers, unifiedResults);
  }

  // ============================================================================
  // Trigger Context Creation
  // ============================================================================

  private createTriggerContext(triggerType: string, triggerData: any, unifiedResults?: UnifiedResults): LXPTriggerContext {
    const config = this.handlerConfigs.get(triggerType);

    return {
      tenantId: (unifiedResults as any)?.tenantId || triggerData.tenantId || 'default',
      employeeId: (unifiedResults as any)?.employeeId || triggerData.employeeId,
      triggerType,
      triggerData,
      urgencyLevel: this.determineUrgencyLevel(triggerType, triggerData),
      priority: config?.priority || 5,
      sourceModule: this.determineSourceModule(triggerType),
      targetSkills: this.extractTargetSkills(triggerType, triggerData),
      learningObjectives: this.extractLearningObjectives(triggerType, triggerData),
      estimatedDuration: this.estimateDuration(triggerType, triggerData),
      constraints: this.extractConstraints(triggerType, triggerData)
    };
  }

  private determineUrgencyLevel(triggerType: string, triggerData: any): 'low' | 'medium' | 'high' | 'critical' {
    const urgencyMap = {
      'compliance_training': 'high',
      'safety_training': 'high',
      'certification_renewal': 'high',
      'culture_alignment': 'medium',
      'performance_improvement': 'medium',
      'skills_gap': 'medium',
      'policy_update': 'medium',
      'lxp_training_completion': 'medium',
      'training_completion': 'medium',
      'assessment_required': 'medium',
      'proactive_training': 'low',
      'onboarding_completion': 'low',
      'learning_progress_update': 'low',
      'game_generation_request': 'low'
    };

    return (urgencyMap as any)[triggerType] || 'medium';
  }

  private determineSourceModule(triggerType: string): string {
    const sourceMap = {
      'skills_gap': 'skills_analysis',
      'culture_alignment': 'culture_analysis',
      'performance_improvement': 'performance_management',
      'compliance_training': 'compliance_module',
      'safety_training': 'safety_module',
      'certification_renewal': 'certification_module',
      'policy_update': 'policy_module',
      'proactive_training': 'predictive_analytics',
      'lxp_training_completion': 'lxp_module',
      'training_completion': 'lxp_module',
      'onboarding_completion': 'onboarding_module',
      'learning_progress_update': 'lxp_module',
      'assessment_required': 'assessment_module',
      'game_generation_request': 'lxp_module'
    };

    return (sourceMap as any)[triggerType] || 'unknown';
  }

  private extractTargetSkills(triggerType: string, triggerData: any): string[] {
    switch (triggerType) {
      case 'skills_gap':
        return triggerData.skillGaps || [];
      case 'performance_improvement':
        return triggerData.improvementAreas || [];
      case 'compliance_training':
        return ['Compliance', 'Regulatory Knowledge'];
      case 'safety_training':
        return ['Safety Protocols', 'Risk Management'];
      case 'certification_renewal':
        return triggerData.certificationSkills || [];
      case 'policy_update':
        return ['Policy Knowledge', 'Compliance'];
      case 'proactive_training':
        return triggerData.futureSkills || [];
      default:
        return [];
    }
  }

  private extractLearningObjectives(triggerType: string, triggerData: any): string[] {
    switch (triggerType) {
      case 'skills_gap':
        return ['Develop missing skills', 'Improve competency levels'];
      case 'culture_alignment':
        return ['Align with company values', 'Improve cultural fit'];
      case 'performance_improvement':
        return ['Improve performance', 'Address improvement areas'];
      case 'compliance_training':
        return ['Ensure compliance', 'Understand regulations'];
      case 'safety_training':
        return ['Maintain safety standards', 'Prevent accidents'];
      case 'certification_renewal':
        return ['Renew certification', 'Maintain professional standards'];
      case 'policy_update':
        return ['Understand new policies', 'Ensure compliance'];
      case 'proactive_training':
        return ['Prepare for future', 'Develop emerging skills'];
      default:
        return ['Skill development', 'Performance improvement'];
    }
  }

  private estimateDuration(triggerType: string, triggerData: any): number {
    const durationMap = {
      'compliance_training': 60,
      'safety_training': 45,
      'certification_renewal': 120,
      'skills_gap': 90,
      'culture_alignment': 60,
      'performance_improvement': 75,
      'policy_update': 30,
      'proactive_training': 90,
      'lxp_training_completion': 0,
      'training_completion': 0,
      'onboarding_completion': 0,
      'learning_progress_update': 0,
      'assessment_required': 30,
      'game_generation_request': 45
    };

    return (durationMap as any)[triggerType] || 60;
  }

  private extractConstraints(triggerType: string, triggerData: any): any {
    const constraints: any = {};

    switch (triggerType) {
      case 'compliance_training':
        constraints.deadline = triggerData.deadline;
        constraints.certifications = ['Compliance Certificate'];
        break;
      case 'safety_training':
        constraints.deadline = triggerData.expirationDate;
        constraints.certifications = ['Safety Certificate'];
        break;
      case 'certification_renewal':
        constraints.deadline = triggerData.expirationDate;
        constraints.certifications = [triggerData.certificationType];
        break;
      case 'policy_update':
        constraints.deadline = triggerData.effectiveDate;
        break;
    }

    return constraints;
  }

  // ============================================================================
  // Validation and Helper Methods
  // ============================================================================

  private validateTriggerConditions(triggerType: string, triggerData: any, config: TriggerHandlerConfig): {valid: boolean, reason?: string} {
    if (!config.conditions) {
      return { valid: true };
    }

    const conditions = config.conditions;

    // Check urgency level
    if (conditions.minUrgencyLevel || conditions.maxUrgencyLevel) {
      const urgencyLevel = this.determineUrgencyLevel(triggerType, triggerData);
      const urgencyOrder = { low: 1, medium: 2, high: 3, critical: 4 };
      
      if (conditions.minUrgencyLevel && (urgencyOrder as any)[urgencyLevel] < (urgencyOrder as any)[conditions.minUrgencyLevel]) {
        return { valid: false, reason: `Urgency level ${urgencyLevel} below minimum ${conditions.minUrgencyLevel}` };
      }

      if (conditions.maxUrgencyLevel && (urgencyOrder as any)[urgencyLevel] > (urgencyOrder as any)[conditions.maxUrgencyLevel]) {
        return { valid: false, reason: `Urgency level ${urgencyLevel} above maximum ${conditions.maxUrgencyLevel}` };
      }
    }

    // Check required data
    if (conditions.requiredData) {
      for (const requiredField of conditions.requiredData) {
        if (!triggerData[requiredField]) {
          return { valid: false, reason: `Missing required data: ${requiredField}` };
        }
      }
    }

    // Check excluded tenants
    if (conditions.excludedTenants && conditions.excludedTenants.includes(triggerData.tenantId)) {
      return { valid: false, reason: `Tenant ${triggerData.tenantId} is excluded` };
    }

    return { valid: true };
  }

  private extractTriggersFromUnifiedResults(unifiedResults: UnifiedResults): Array<{type: string, data: any}> {
    const triggers: Array<{type: string, data: any}> = [];

    // Extract from skills analysis
    if ((unifiedResults as any).skillsAnalysis?.triggers) {
      for (const trigger of (unifiedResults as any).skillsAnalysis.triggers) {
        if (trigger.moduleType === 'lxp') {
          triggers.push({
            type: trigger.triggerType,
            data: {
              ...trigger.data,
              tenantId: (unifiedResults as any).tenantId,
              employeeId: (unifiedResults as any).employeeId
            }
          });
        }
      }
    }

    // Extract from culture analysis
    if ((unifiedResults as any).cultureAnalysis?.triggers) {
      for (const trigger of (unifiedResults as any).cultureAnalysis.triggers) {
        if (trigger.moduleType === 'lxp') {
          triggers.push({
            type: trigger.triggerType,
            data: {
              ...trigger.data,
              tenantId: (unifiedResults as any).tenantId,
              employeeId: (unifiedResults as any).employeeId
            }
          });
        }
      }
    }

    // Extract from performance analysis
    const unifiedResultsAny = unifiedResults as any;
    if (unifiedResultsAny.performanceAnalysis?.triggers) {
      for (const trigger of unifiedResultsAny.performanceAnalysis.triggers) {
        if (trigger.moduleType === 'lxp') {
          triggers.push({
            type: trigger.triggerType,
            data: {
              ...trigger.data,
              tenantId: unifiedResultsAny.tenantId,
              employeeId: unifiedResultsAny.employeeId
            }
          });
        }
      }
    }

    return triggers;
  }

  private determineNextTriggers(triggerType: string, result: LXPOrchestrationResult): string[] {
    if (!result.success || !result.triggers) {
      return [];
    }

    return result.triggers;
  }

  private generateHandlerId(triggerType: string): string {
    return `lxp_handler_${triggerType}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private updateHandlerStats(triggerType: string, success: boolean, processingTime: number): void {
    const stats = this.handlerStats.get(triggerType);
    if (stats) {
      stats.totalProcessed++;
      if (success) {
        stats.successful++;
      } else {
        stats.failed++;
        stats.errorCount++;
      }
      stats.averageProcessingTime = (stats.averageProcessingTime + processingTime) / 2;
      stats.lastProcessed = new Date();
    }
  }

  // ============================================================================
  // Fallback Actions
  // ============================================================================

  private async executeFallbackAction(fallbackAction: string, triggerType: string, triggerData: any): Promise<LXPOrchestrationResult> {
    console.log(`[LXP Trigger Handler] Executing fallback action: ${fallbackAction} for trigger: ${triggerType}`);

    // Create basic trigger context for fallback
    const fallbackContext: LXPTriggerContext = {
      tenantId: triggerData.tenantId || 'default',
      employeeId: triggerData.employeeId,
      triggerType: `${triggerType}_fallback`,
      triggerData: {
        ...triggerData,
        fallbackAction,
        isFallback: true
      },
      urgencyLevel: 'low',
      priority: 1,
      sourceModule: 'lxp_fallback',
      targetSkills: ['Basic Skills'],
      learningObjectives: ['Basic Learning'],
      estimatedDuration: 30
    };

    return this.orchestrator.processLXPTrigger(fallbackContext);
  }

  // ============================================================================
  // Public Interface Methods
  // ============================================================================

  /**
   * Get handler configuration
   */
  getHandlerConfig(triggerType: string): TriggerHandlerConfig | undefined {
    return this.handlerConfigs.get(triggerType);
  }

  /**
   * Update handler configuration
   */
  updateHandlerConfig(triggerType: string, config: Partial<TriggerHandlerConfig>): boolean {
    const existingConfig = this.handlerConfigs.get(triggerType);
    if (existingConfig) {
      this.handlerConfigs.set(triggerType, { ...existingConfig, ...config });
      return true;
    }
    return false;
  }

  /**
   * Get handler statistics
   */
  getHandlerStats(triggerType?: string): any {
    if (triggerType) {
      return this.handlerStats.get(triggerType);
    }
    return Object.fromEntries(this.handlerStats);
  }

  /**
   * Get all supported trigger types
   */
  getSupportedTriggerTypes(): string[] {
    return Array.from(this.handlerConfigs.keys());
  }

  /**
   * Enable/disable handler
   */
  setHandlerEnabled(triggerType: string, enabled: boolean): boolean {
    const config = this.handlerConfigs.get(triggerType);
    if (config) {
      config.enabled = enabled;
      return true;
    }
    return false;
  }

  /**
   * Get handler health status
   */
  getHandlerHealth(): any {
    const health = {
      totalHandlers: this.handlerConfigs.size,
      enabledHandlers: 0,
      disabledHandlers: 0,
      healthyHandlers: 0,
      unhealthyHandlers: 0,
      handlers: {}
    };

    for (const [triggerType, config] of this.handlerConfigs) {
      const stats = this.handlerStats.get(triggerType);
      const isHealthy = stats && stats.errorCount < 5 && stats.successful > stats.failed;

      (health.handlers as any)[triggerType as any] = {
        enabled: config.enabled,
        healthy: isHealthy,
        stats
      };

      if (config.enabled) {
        health.enabledHandlers++;
      } else {
        health.disabledHandlers++;
      }

      if (isHealthy) {
        health.healthyHandlers++;
      } else {
        health.unhealthyHandlers++;
      }
    }

    return health;
  }
}

// ============================================================================
// Export for use in LXP Module
// ============================================================================

export default LXPTriggerHandlers;
