// backend/services/modules/lxp/integrations/performance-integration.ts
// Task Reference: Module 1 (LXP) - Section 1.5.4 (Integrate with Performance Management)

// ============================================================================
// TASK 1.5.4: Performance Management Integration
// ============================================================================
// Dependencies: 1.5.2 (Output Triggers) ✅ Complete
// Description: Connect LXP completion to performance tracking
// Key Components:
//   - Send completion data to Performance Management
//   - Trigger performance assessment after training
//   - Link learning to performance improvement

export interface LearningCompletionData {
  employeeId: string;
  tenantId: string;
  courseId: string;
  courseTitle: string;
  learningPathId?: string;
  completionDate: Date;
  completionType: 'course' | 'learning_path' | 'certification' | 'assessment';
  skillsLearned: string[];
  assessmentScore?: number;
  timeSpent: number; // in minutes
  learningObjectives: string[];
  performanceImpact: 'high' | 'medium' | 'low';
  competencyLevel: number; // 1-5 scale
}

export interface PerformanceAssessmentTrigger {
  employeeId: string;
  tenantId: string;
  triggerType: 'post_training_assessment' | 'learning_impact_evaluation' | 'competency_validation';
  sourceModule: 'lxp';
  sourceAction: 'training_completion' | 'learning_path_completion' | 'skill_validation';
  learningData: LearningCompletionData;
  assessmentType: 'immediate' | 'delayed' | 'periodic';
  assessmentTimeline: {
    immediate: Date; // Within 1 week
    shortTerm: Date; // Within 1 month
    longTerm: Date; // Within 3 months
  };
  expectedOutcomes: string[];
  successCriteria: {
    performanceImprovement: number; // percentage
    skillApplication: number; // percentage
    competencyGrowth: number; // percentage
  };
}

export interface PerformanceImprovementData {
  employeeId: string;
  tenantId: string;
  learningCompletionId: string;
  baselinePerformance: {
    score: number;
    date: Date;
    metrics: Record<string, number>;
  };
  postLearningPerformance: {
    score: number;
    date: Date;
    metrics: Record<string, number>;
  };
  improvementMetrics: {
    overallImprovement: number; // percentage
    skillApplication: number; // percentage
    competencyGrowth: number; // percentage
    timeToImprovement: number; // days
  };
  learningImpact: {
    directImpact: number; // percentage attributed to learning
    indirectImpact: number; // percentage from other factors
    confidence: number; // 0-1 scale
  };
}

export interface PerformanceManagementNotification {
  type: 'learning_completion' | 'performance_assessment_trigger' | 'improvement_analysis' | 'baseline_update';
  employeeId: string;
  tenantId: string;
  data: any;
  timestamp: Date;
  priority: 'high' | 'medium' | 'low';
  actionRequired: boolean;
}

export class PerformanceManagementIntegration {
  private integrationConfig: {
    performanceManagementEndpoint: string;
    assessmentEndpoint: string;
    improvementEndpoint: string;
    notificationEndpoint: string;
    timeout: number;
    retryAttempts: number;
  };

  constructor() {
    this.integrationConfig = {
      performanceManagementEndpoint: '/api/performance-management/learning-completion',
      assessmentEndpoint: '/api/performance-management/assessment-trigger',
      improvementEndpoint: '/api/performance-management/improvement-analysis',
      notificationEndpoint: '/api/performance-management/notify',
      timeout: 30000,
      retryAttempts: 3
    };
  }

  // ============================================================================
  // TASK 1.5.4: CORE INTEGRATION METHODS
  // ============================================================================

  /**
   * 1. Send completion data to Performance Management
   */
  async sendCompletionDataToPerformanceManagement(completionData: LearningCompletionData): Promise<{
    success: boolean;
    performanceManagementId?: string;
    assessmentTriggered?: boolean;
    error?: string;
  }> {
    try {
      console.log(`[Performance Integration] Sending completion data to Performance Management for employee: ${completionData.employeeId}`);
      
      // Send completion data to Performance Management
      const result = await this.sendToPerformanceManagementAPI(completionData);
      
      if (result.success) {
        console.log(`[Performance Integration] Successfully sent completion data to Performance Management`);
        
        // Trigger performance assessment if required
        const assessmentTriggered = await this.triggerPerformanceAssessment(completionData);
        
        return {
          success: true,
          performanceManagementId: result.performanceManagementId,
          assessmentTriggered
        };
      } else {
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      console.error(`[Performance Integration] Error sending completion data:`, error);
      return {
        success: false,
        error: error instanceof Error ? (error as any).message : 'Unknown error'
      };
    }
  }

  /**
   * 2. Trigger performance assessment after training
   */
  async triggerPerformanceAssessment(completionData: LearningCompletionData): Promise<boolean> {
    try {
      console.log(`[Performance Integration] Triggering performance assessment for employee: ${completionData.employeeId}`);
      
      // Create performance assessment trigger
      const assessmentTrigger = await this.createPerformanceAssessmentTrigger(completionData);
      
      if (assessmentTrigger) {
        // Send assessment trigger to Performance Management
        const result = await this.sendAssessmentTriggerToPerformanceManagement(assessmentTrigger);
        
        if (result.success) {
          console.log(`[Performance Integration] Performance assessment triggered successfully`);
          
          // Notify Performance Management of the trigger
          await this.notifyPerformanceManagementOfAssessment(assessmentTrigger);
          
          return true;
        } else {
          console.error(`[Performance Integration] Failed to trigger performance assessment:`, result.error);
          return false;
        }
      }
      
      return false;
    } catch (error) {
      console.error(`[Performance Integration] Error triggering performance assessment:`, error);
      return false;
    }
  }

  /**
   * 3. Link learning to performance improvement
   */
  async linkLearningToPerformanceImprovement(improvementData: PerformanceImprovementData): Promise<{
    success: boolean;
    improvementAnalysis?: any;
    recommendations?: string[];
    error?: string;
  }> {
    try {
      console.log(`[Performance Integration] Linking learning to performance improvement for employee: ${improvementData.employeeId}`);
      
      // Analyze learning impact on performance
      const improvementAnalysis = await this.analyzeLearningImpact(improvementData);
      
      if (improvementAnalysis) {
        // Send improvement analysis to Performance Management
        const result = await this.sendImprovementAnalysisToPerformanceManagement(improvementAnalysis);
        
        if (result.success) {
          console.log(`[Performance Integration] Learning-performance link established successfully`);
          
          // Generate recommendations based on analysis
          const recommendations = await this.generatePerformanceRecommendations(improvementAnalysis);
          
          return {
            success: true,
            improvementAnalysis,
            recommendations
          };
        } else {
          return {
            success: false,
            error: result.error
          };
        }
      }
      
      return {
        success: false,
        error: 'Failed to analyze learning impact'
      };
    } catch (error) {
      console.error(`[Performance Integration] Error linking learning to performance:`, error);
      return {
        success: false,
        error: error instanceof Error ? (error as any).message : 'Unknown error'
      };
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Send completion data to Performance Management API
   */
  private async sendToPerformanceManagementAPI(completionData: LearningCompletionData): Promise<{
    success: boolean;
    performanceManagementId?: string;
    error?: string;
  }> {
    try {
      // In a real implementation, this would make an HTTP request to the Performance Management API
      console.log(`[Performance Integration] Sending to Performance Management API:`, completionData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Mock response
      const performanceManagementId = `pm_${completionData.employeeId}_${Date.now()}`;
      
      console.log(`[Performance Integration] Completion data sent successfully, ID: ${performanceManagementId}`);
      
      return {
        success: true,
        performanceManagementId
      };
    } catch (error) {
      console.error('[Performance Integration] Error sending to Performance Management API:', error);
      return {
        success: false,
        error: error instanceof Error ? (error as any).message : 'Unknown error'
      };
    }
  }

  /**
   * Create performance assessment trigger
   */
  private async createPerformanceAssessmentTrigger(completionData: LearningCompletionData): Promise<PerformanceAssessmentTrigger | null> {
    try {
      const now = new Date();
      const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const oneMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const threeMonths = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      
      const assessmentTrigger: PerformanceAssessmentTrigger = {
        employeeId: completionData.employeeId,
        tenantId: completionData.tenantId,
        triggerType: this.determineAssessmentType(completionData),
        sourceModule: 'lxp',
        sourceAction: this.determineSourceAction(completionData.completionType),
        learningData: completionData,
        assessmentType: this.determineAssessmentTiming(completionData),
        assessmentTimeline: {
          immediate: oneWeek,
          shortTerm: oneMonth,
          longTerm: threeMonths
        },
        expectedOutcomes: this.generateExpectedOutcomes(completionData),
        successCriteria: this.generateSuccessCriteria(completionData)
      };
      
      console.log(`[Performance Integration] Created performance assessment trigger:`, assessmentTrigger);
      
      return assessmentTrigger;
    } catch (error) {
      console.error('[Performance Integration] Error creating assessment trigger:', error);
      return null;
    }
  }

  /**
   * Send assessment trigger to Performance Management
   */
  private async sendAssessmentTriggerToPerformanceManagement(assessmentTrigger: PerformanceAssessmentTrigger): Promise<{
    success: boolean;
    assessmentId?: string;
    error?: string;
  }> {
    try {
      // In a real implementation, this would make an HTTP request to the Performance Management API
      console.log(`[Performance Integration] Sending assessment trigger to Performance Management:`, assessmentTrigger);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Mock response
      const assessmentId = `assessment_${assessmentTrigger.employeeId}_${Date.now()}`;
      
      console.log(`[Performance Integration] Assessment trigger sent successfully, ID: ${assessmentId}`);
      
      return {
        success: true,
        assessmentId
      };
    } catch (error) {
      console.error('[Performance Integration] Error sending assessment trigger:', error);
      return {
        success: false,
        error: error instanceof Error ? (error as any).message : 'Unknown error'
      };
    }
  }

  /**
   * Notify Performance Management of assessment
   */
  private async notifyPerformanceManagementOfAssessment(assessmentTrigger: PerformanceAssessmentTrigger): Promise<void> {
    try {
      const notification: PerformanceManagementNotification = {
        type: 'performance_assessment_trigger',
        employeeId: assessmentTrigger.employeeId,
        tenantId: assessmentTrigger.tenantId,
        data: {
          assessmentTrigger,
          triggerReason: 'Learning completion requires performance assessment',
          priority: this.determineNotificationPriority(assessmentTrigger)
        },
        timestamp: new Date(),
        priority: this.determineNotificationPriority(assessmentTrigger),
        actionRequired: true
      };
      
      await this.sendNotificationToPerformanceManagement(notification);
      
      console.log(`[Performance Integration] Performance Management notified of assessment trigger`);
    } catch (error) {
      console.error('[Performance Integration] Error notifying Performance Management:', error);
      throw error;
    }
  }

  /**
   * Analyze learning impact on performance
   */
  private async analyzeLearningImpact(improvementData: PerformanceImprovementData): Promise<any> {
    try {
      const analysis = {
        employeeId: improvementData.employeeId,
        tenantId: improvementData.tenantId,
        learningCompletionId: improvementData.learningCompletionId,
        analysisDate: new Date(),
        performanceComparison: {
          baseline: improvementData.baselinePerformance,
          postLearning: improvementData.postLearningPerformance,
          improvement: improvementData.improvementMetrics
        },
        learningImpact: improvementData.learningImpact,
        correlationAnalysis: {
          learningToPerformance: this.calculateLearningPerformanceCorrelation(improvementData),
          skillApplication: this.calculateSkillApplicationRate(improvementData),
          competencyGrowth: this.calculateCompetencyGrowth(improvementData)
        },
        insights: this.generatePerformanceInsights(improvementData),
        confidence: this.calculateAnalysisConfidence(improvementData)
      };
      
      console.log(`[Performance Integration] Learning impact analysis completed:`, analysis);
      
      return analysis;
    } catch (error) {
      console.error('[Performance Integration] Error analyzing learning impact:', error);
      return null;
    }
  }

  /**
   * Send improvement analysis to Performance Management
   */
  private async sendImprovementAnalysisToPerformanceManagement(analysis: any): Promise<{
    success: boolean;
    analysisId?: string;
    error?: string;
  }> {
    try {
      // In a real implementation, this would make an HTTP request to the Performance Management API
      console.log(`[Performance Integration] Sending improvement analysis to Performance Management:`, analysis);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Mock response
      const analysisId = `analysis_${analysis.employeeId}_${Date.now()}`;
      
      console.log(`[Performance Integration] Improvement analysis sent successfully, ID: ${analysisId}`);
      
      return {
        success: true,
        analysisId
      };
    } catch (error) {
      console.error('[Performance Integration] Error sending improvement analysis:', error);
      return {
        success: false,
        error: error instanceof Error ? (error as any).message : 'Unknown error'
      };
    }
  }

  /**
   * Generate performance recommendations
   */
  private async generatePerformanceRecommendations(analysis: any): Promise<string[]> {
    try {
      const recommendations: string[] = [];
      
      // Based on improvement metrics
      if (analysis.performanceComparison.improvement.overallImprovement > 20) {
        recommendations.push('Excellent performance improvement - consider advanced learning opportunities');
      } else if (analysis.performanceComparison.improvement.overallImprovement > 10) {
        recommendations.push('Good performance improvement - continue current learning approach');
      } else if (analysis.performanceComparison.improvement.overallImprovement > 0) {
        recommendations.push('Modest performance improvement - consider additional practice and reinforcement');
      } else {
        recommendations.push('No performance improvement detected - review learning approach and provide additional support');
      }
      
      // Based on skill application
      if (analysis.correlationAnalysis.skillApplication < 0.5) {
        recommendations.push('Low skill application rate - provide more practical application opportunities');
      }
      
      // Based on competency growth
      if (analysis.correlationAnalysis.competencyGrowth < 0.3) {
        recommendations.push('Limited competency growth - consider competency-based learning approach');
      }
      
      // Based on learning impact confidence
      if (analysis.confidence < 0.7) {
        recommendations.push('Low confidence in learning impact - collect more performance data for analysis');
      }
      
      console.log(`[Performance Integration] Generated ${recommendations.length} performance recommendations`);
      
      return recommendations;
    } catch (error) {
      console.error('[Performance Integration] Error generating recommendations:', error);
      return ['Unable to generate recommendations at this time'];
    }
  }

  /**
   * Send notification to Performance Management
   */
  private async sendNotificationToPerformanceManagement(notification: PerformanceManagementNotification): Promise<void> {
    try {
      // In a real implementation, this would make an HTTP request to the Performance Management API
      console.log(`[Performance Integration] Sending notification to Performance Management:`, notification);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 50));
      
      console.log(`[Performance Integration] Notification sent successfully`);
    } catch (error) {
      console.error('[Performance Integration] Error sending notification:', error);
      throw error;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private determineAssessmentType(completionData: LearningCompletionData): 'post_training_assessment' | 'learning_impact_evaluation' | 'competency_validation' {
    if (completionData.completionType === 'certification') {
      return 'competency_validation';
    } else if (completionData.performanceImpact === 'high') {
      return 'learning_impact_evaluation';
    } else {
      return 'post_training_assessment';
    }
  }

  private determineSourceAction(completionType: string): 'training_completion' | 'learning_path_completion' | 'skill_validation' {
    switch (completionType) {
      case 'learning_path':
        return 'learning_path_completion';
      case 'certification':
      case 'assessment':
        return 'skill_validation';
      default:
        return 'training_completion';
    }
  }

  private determineAssessmentTiming(completionData: LearningCompletionData): 'immediate' | 'delayed' | 'periodic' {
    if (completionData.performanceImpact === 'high') {
      return 'immediate';
    } else if (completionData.competencyLevel >= 4) {
      return 'delayed';
    } else {
      return 'periodic';
    }
  }

  private generateExpectedOutcomes(completionData: LearningCompletionData): string[] {
    const outcomes = [
      `Apply ${completionData.skillsLearned.join(', ')} in daily work`,
      'Demonstrate improved performance in related tasks',
      'Show competency growth in targeted areas'
    ];
    
    if (completionData.performanceImpact === 'high') {
      outcomes.push('Achieve measurable performance improvement within 30 days');
    }
    
    return outcomes;
  }

  private generateSuccessCriteria(completionData: LearningCompletionData): {
    performanceImprovement: number;
    skillApplication: number;
    competencyGrowth: number;
  } {
    const baseImprovement = completionData.performanceImpact === 'high' ? 20 : 
                           completionData.performanceImpact === 'medium' ? 15 : 10;
    
    return {
      performanceImprovement: baseImprovement,
      skillApplication: 70,
      competencyGrowth: completionData.competencyLevel * 15
    };
  }

  private determineNotificationPriority(assessmentTrigger: PerformanceAssessmentTrigger): 'high' | 'medium' | 'low' {
    if (assessmentTrigger.learningData.performanceImpact === 'high') {
      return 'high';
    } else if (assessmentTrigger.assessmentType === 'immediate') {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private calculateLearningPerformanceCorrelation(improvementData: PerformanceImprovementData): number {
    // Simplified correlation calculation
    const timeDiff = improvementData.improvementMetrics.timeToImprovement;
    const improvement = improvementData.improvementMetrics.overallImprovement;
    
    // Higher improvement in shorter time = higher correlation
    return Math.min(1.0, improvement / (timeDiff / 30));
  }

  private calculateSkillApplicationRate(improvementData: PerformanceImprovementData): number {
    return improvementData.improvementMetrics.skillApplication / 100;
  }

  private calculateCompetencyGrowth(improvementData: PerformanceImprovementData): number {
    return improvementData.improvementMetrics.competencyGrowth / 100;
  }

  private generatePerformanceInsights(improvementData: PerformanceImprovementData): string[] {
    const insights: string[] = [];
    
    if (improvementData.improvementMetrics.overallImprovement > 15) {
      insights.push('Significant performance improvement observed');
    }
    
    if (improvementData.learningImpact.directImpact > 0.7) {
      insights.push('Learning directly contributed to performance improvement');
    }
    
    if (improvementData.improvementMetrics.timeToImprovement < 14) {
      insights.push('Rapid performance improvement following learning completion');
    }
    
    return insights;
  }

  private calculateAnalysisConfidence(improvementData: PerformanceImprovementData): number {
    let confidence = 0.5; // Base confidence
    
    // Higher confidence with more data points
    if (improvementData.learningImpact.confidence > 0.8) {
      confidence += 0.3;
    }
    
    // Higher confidence with significant improvement
    if (improvementData.improvementMetrics.overallImprovement > 10) {
      confidence += 0.2;
    }
    
    return Math.min(1.0, confidence);
  }
}

// ============================================================================
// Export Integration Instance
// ============================================================================

export const performanceManagementIntegration = new PerformanceManagementIntegration();
export default PerformanceManagementIntegration;
