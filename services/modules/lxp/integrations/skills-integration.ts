// backend/services/modules/lxp/integrations/skills-integration.ts
// Task Reference: Module 1 (LXP) - Section 1.5.3 (Integrate with Skills Analysis)

// ============================================================================
// TASK 1.5.3: Skills Analysis Integration
// ============================================================================
// Dependencies: 1.3.5 (Course Completion Handler) ✅ Complete
// Description: Update employee skills profile after learning
// Key Components:
//   - Receive skill gap data from Skills Analysis
//   - Update skills after course completion
//   - Validate skill acquisition
//   - Notify Skills Analysis of updates

export interface SkillGapData {
  employeeId: string;
  tenantId: string;
  skillGaps: SkillGap[];
  currentSkills: SkillProfile[];
  targetSkills: SkillProfile[];
  priority: 'high' | 'medium' | 'low';
  urgency: 'critical' | 'urgent' | 'normal';
  analysisDate: Date;
  source: 'skills_analysis' | 'performance_review' | 'manager_assessment';
}

export interface SkillGap {
  skillId: string;
  skillName: string;
  currentLevel: number; // 1-5 scale
  targetLevel: number; // 1-5 scale
  gapSize: number; // targetLevel - currentLevel
  importance: 'critical' | 'important' | 'nice_to_have';
  category: string; // e.g., 'technical', 'soft_skills', 'leadership'
  learningPath?: string;
  estimatedTimeToClose: number; // in hours
}

export interface SkillProfile {
  skillId: string;
  skillName: string;
  level: number; // 1-5 scale
  confidence: number; // 0-1 scale
  lastAssessed: Date;
  source: 'assessment' | 'course_completion' | 'manager_rating' | 'peer_review';
  evidence: string[];
}

export interface SkillUpdate {
  employeeId: string;
  tenantId: string;
  skillId: string;
  skillName: string;
  previousLevel: number;
  newLevel: number;
  confidence: number;
  updateSource: 'course_completion' | 'assessment' | 'validation';
  courseId?: string;
  assessmentId?: string;
  completionDate: Date;
  evidence: string[];
  validated: boolean;
}

export interface SkillsAnalysisNotification {
  type: 'skill_update' | 'skill_validation' | 'gap_closed' | 'new_gap_identified';
  employeeId: string;
  tenantId: string;
  data: any;
  timestamp: Date;
  priority: 'high' | 'medium' | 'low';
}

export class SkillsAnalysisIntegration {
  private integrationConfig: {
    skillsAnalysisEndpoint: string;
    updateEndpoint: string;
    validationEndpoint: string;
    notificationEndpoint: string;
    timeout: number;
    retryAttempts: number;
  };

  constructor() {
    this.integrationConfig = {
      skillsAnalysisEndpoint: '/api/skills-analysis/gaps',
      updateEndpoint: '/api/skills-analysis/update',
      validationEndpoint: '/api/skills-analysis/validate',
      notificationEndpoint: '/api/skills-analysis/notify',
      timeout: 30000,
      retryAttempts: 3
    };
  }

  // ============================================================================
  // TASK 1.5.3: CORE INTEGRATION METHODS
  // ============================================================================

  /**
   * 1. Receive skill gap data from Skills Analysis
   */
  async receiveSkillGapData(employeeId: string, tenantId: string): Promise<SkillGapData | null> {
    try {
      console.log(`[Skills Integration] Receiving skill gap data for employee: ${employeeId}`);
      
      // In a real implementation, this would call the Skills Analysis API
      const skillGapData = await this.fetchSkillGapsFromSkillsAnalysis(employeeId, tenantId);
      
      if (skillGapData) {
        console.log(`[Skills Integration] Received ${skillGapData.skillGaps.length} skill gaps for employee: ${employeeId}`);
        
        // Process and validate the skill gap data
        const processedData = await this.processSkillGapData(skillGapData);
        
        return processedData;
      }
      
      return null;
    } catch (error) {
      console.error(`[Skills Integration] Error receiving skill gap data for employee ${employeeId}:`, error);
      throw error;
    }
  }

  /**
   * 2. Update skills after course completion
   */
  async updateSkillsAfterCompletion(completionData: {
    employeeId: string;
    tenantId: string;
    courseId: string;
    courseTitle: string;
    skillsLearned: string[];
    completionDate: Date;
    assessmentScore?: number;
    validationResults?: any;
  }): Promise<SkillUpdate[]> {
    try {
      console.log(`[Skills Integration] Updating skills after course completion for employee: ${completionData.employeeId}`);
      
      const skillUpdates: SkillUpdate[] = [];
      
      // Process each skill learned in the course
      for (const skillName of completionData.skillsLearned) {
        const skillUpdate = await this.createSkillUpdate(completionData, skillName);
        
        if (skillUpdate) {
          skillUpdates.push(skillUpdate);
          
          // Send update to Skills Analysis
          await this.sendSkillUpdateToSkillsAnalysis(skillUpdate);
        }
      }
      
      console.log(`[Skills Integration] Updated ${skillUpdates.length} skills for employee: ${completionData.employeeId}`);
      
      // Notify Skills Analysis of all updates
      await this.notifySkillsAnalysisOfUpdates(completionData.employeeId, completionData.tenantId, skillUpdates);
      
      return skillUpdates;
    } catch (error) {
      console.error(`[Skills Integration] Error updating skills after completion:`, error);
      throw error;
    }
  }

  /**
   * 3. Validate skill acquisition
   */
  async validateSkillAcquisition(validationData: {
    employeeId: string;
    tenantId: string;
    skillId: string;
    skillName: string;
    courseId: string;
    assessmentResults: any;
    practicalApplication?: any;
    peerFeedback?: any;
  }): Promise<{
    validated: boolean;
    confidence: number;
    evidence: string[];
    recommendations: string[];
  }> {
    try {
      console.log(`[Skills Integration] Validating skill acquisition for employee: ${validationData.employeeId}, skill: ${validationData.skillName}`);
      
      // Validate based on assessment results
      const assessmentValidation = await this.validateBasedOnAssessment(validationData.assessmentResults);
      
      // Validate based on practical application (if available)
      const practicalValidation = validationData.practicalApplication ? 
        await this.validateBasedOnPracticalApplication(validationData.practicalApplication) : null;
      
      // Validate based on peer feedback (if available)
      const peerValidation = validationData.peerFeedback ? 
        await this.validateBasedOnPeerFeedback(validationData.peerFeedback) : null;
      
      // Combine validation results
      const combinedValidation = this.combineValidationResults(
        assessmentValidation,
        practicalValidation,
        peerValidation
      );
      
      console.log(`[Skills Integration] Skill validation completed for ${validationData.skillName}: ${combinedValidation.validated ? 'VALIDATED' : 'NOT VALIDATED'}`);
      
      // Send validation results to Skills Analysis
      await this.sendValidationResultsToSkillsAnalysis(validationData, combinedValidation);
      
      return combinedValidation;
    } catch (error) {
      console.error(`[Skills Integration] Error validating skill acquisition:`, error);
      throw error;
    }
  }

  /**
   * 4. Notify Skills Analysis of updates
   */
  async notifySkillsAnalysisOfUpdates(employeeId: string, tenantId: string, updates: SkillUpdate[]): Promise<void> {
    try {
      console.log(`[Skills Integration] Notifying Skills Analysis of ${updates.length} skill updates for employee: ${employeeId}`);
      
      const notification: SkillsAnalysisNotification = {
        type: 'skill_update',
        employeeId,
        tenantId,
        data: {
          updates,
          summary: {
            totalUpdates: updates.length,
            skillsImproved: updates.filter(u => u.newLevel > u.previousLevel).length,
            skillsValidated: updates.filter(u => u.validated).length,
            averageImprovement: this.calculateAverageImprovement(updates)
          }
        },
        timestamp: new Date(),
        priority: this.determineNotificationPriority(updates)
      };
      
      // Send notification to Skills Analysis
      await this.sendNotificationToSkillsAnalysis(notification);
      
      console.log(`[Skills Integration] Successfully notified Skills Analysis of skill updates`);
    } catch (error) {
      console.error(`[Skills Integration] Error notifying Skills Analysis:`, error);
      throw error;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Fetch skill gaps from Skills Analysis API
   */
  private async fetchSkillGapsFromSkillsAnalysis(employeeId: string, tenantId: string): Promise<SkillGapData | null> {
    try {
      // In a real implementation, this would make an HTTP request to the Skills Analysis API
      // For now, we'll simulate the response
      
      const mockSkillGapData: SkillGapData = {
        employeeId,
        tenantId,
        skillGaps: [
          {
            skillId: 'leadership_001',
            skillName: 'Team Leadership',
            currentLevel: 2,
            targetLevel: 4,
            gapSize: 2,
            importance: 'critical',
            category: 'leadership',
            estimatedTimeToClose: 40
          },
          {
            skillId: 'tech_001',
            skillName: 'JavaScript Programming',
            currentLevel: 3,
            targetLevel: 4,
            gapSize: 1,
            importance: 'important',
            category: 'technical',
            estimatedTimeToClose: 20
          }
        ],
        currentSkills: [
          {
            skillId: 'comm_001',
            skillName: 'Communication',
            level: 4,
            confidence: 0.85,
            lastAssessed: new Date(),
            source: 'assessment',
            evidence: ['presentation_feedback', 'peer_review']
          }
        ],
        targetSkills: [
          {
            skillId: 'leadership_001',
            skillName: 'Team Leadership',
            level: 4,
            confidence: 0.0,
            lastAssessed: new Date(),
            source: 'assessment',
            evidence: []
          }
        ],
        priority: 'high',
        urgency: 'urgent',
        analysisDate: new Date(),
        source: 'skills_analysis'
      };
      
      return mockSkillGapData;
    } catch (error) {
      console.error('[Skills Integration] Error fetching skill gaps:', error);
      return null;
    }
  }

  /**
   * Process and validate skill gap data
   */
  private async processSkillGapData(skillGapData: SkillGapData): Promise<SkillGapData> {
    try {
      // Validate and clean the data
      const processedData = {
        ...skillGapData,
        skillGaps: skillGapData.skillGaps.map(gap => ({
          ...gap,
          gapSize: Math.max(0, gap.targetLevel - gap.currentLevel),
          estimatedTimeToClose: Math.max(5, gap.estimatedTimeToClose) // Minimum 5 hours
        }))
      };
      
      return processedData;
    } catch (error) {
      console.error('[Skills Integration] Error processing skill gap data:', error);
      throw error;
    }
  }

  /**
   * Create skill update from course completion data
   */
  private async createSkillUpdate(completionData: any, skillName: string): Promise<SkillUpdate | null> {
    try {
      // Get current skill level (in a real implementation, this would come from Skills Analysis)
      const currentLevel = await this.getCurrentSkillLevel(completionData.employeeId, skillName);
      
      // Calculate new skill level based on course completion and assessment
      const newLevel = this.calculateNewSkillLevel(currentLevel, completionData.assessmentScore);
      
      // Determine confidence based on assessment and validation
      const confidence = this.calculateSkillConfidence(completionData.assessmentScore, completionData.validationResults);
      
      const skillUpdate: SkillUpdate = {
        employeeId: completionData.employeeId,
        tenantId: completionData.tenantId,
        skillId: this.generateSkillId(skillName),
        skillName,
        previousLevel: currentLevel,
        newLevel,
        confidence,
        updateSource: 'course_completion',
        courseId: completionData.courseId,
        completionDate: completionData.completionDate,
        evidence: [
          `Course completion: ${completionData.courseTitle}`,
          `Assessment score: ${completionData.assessmentScore || 'N/A'}`,
          `Completion date: ${completionData.completionDate.toISOString()}`
        ],
        validated: completionData.validationResults ? completionData.validationResults.validated : false
      };
      
      return skillUpdate;
    } catch (error) {
      console.error(`[Skills Integration] Error creating skill update for ${skillName}:`, error);
      return null;
    }
  }

  /**
   * Send skill update to Skills Analysis
   */
  private async sendSkillUpdateToSkillsAnalysis(skillUpdate: SkillUpdate): Promise<void> {
    try {
      // In a real implementation, this would make an HTTP request to the Skills Analysis API
      console.log(`[Skills Integration] Sending skill update to Skills Analysis:`, skillUpdate);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log(`[Skills Integration] Skill update sent successfully for skill: ${skillUpdate.skillName}`);
    } catch (error) {
      console.error(`[Skills Integration] Error sending skill update:`, error);
      throw error;
    }
  }

  /**
   * Validate based on assessment results
   */
  private async validateBasedOnAssessment(assessmentResults: any): Promise<{
    validated: boolean;
    confidence: number;
    evidence: string[];
  }> {
    try {
      const score = assessmentResults.score || 0;
      const passingScore = assessmentResults.passingScore || 70;
      
      const validated = score >= passingScore;
      const confidence = Math.min(1.0, score / 100);
      
      const evidence = [
        `Assessment score: ${score}%`,
        `Passing score: ${passingScore}%`,
        `Validation: ${validated ? 'PASSED' : 'FAILED'}`
      ];
      
      return { validated, confidence, evidence };
    } catch (error) {
      console.error('[Skills Integration] Error validating based on assessment:', error);
      return { validated: false, confidence: 0, evidence: ['Assessment validation failed'] };
    }
  }

  /**
   * Validate based on practical application
   */
  private async validateBasedOnPracticalApplication(practicalApplication: any): Promise<{
    validated: boolean;
    confidence: number;
    evidence: string[];
  }> {
    try {
      const practicalScore = practicalApplication.score || 0;
      const validated = practicalScore >= 70;
      const confidence = Math.min(1.0, practicalScore / 100);
      
      const evidence = [
        `Practical application score: ${practicalScore}%`,
        `Validation: ${validated ? 'PASSED' : 'FAILED'}`
      ];
      
      return { validated, confidence, evidence };
    } catch (error) {
      console.error('[Skills Integration] Error validating based on practical application:', error);
      return { validated: false, confidence: 0, evidence: ['Practical validation failed'] };
    }
  }

  /**
   * Validate based on peer feedback
   */
  private async validateBasedOnPeerFeedback(peerFeedback: any): Promise<{
    validated: boolean;
    confidence: number;
    evidence: string[];
  }> {
    try {
      const averageRating = peerFeedback.averageRating || 0;
      const validated = averageRating >= 3.5; // 3.5/5.0 or higher
      const confidence = Math.min(1.0, averageRating / 5.0);
      
      const evidence = [
        `Peer feedback average rating: ${averageRating}/5.0`,
        `Number of reviewers: ${peerFeedback.reviewerCount || 0}`,
        `Validation: ${validated ? 'PASSED' : 'FAILED'}`
      ];
      
      return { validated, confidence, evidence };
    } catch (error) {
      console.error('[Skills Integration] Error validating based on peer feedback:', error);
      return { validated: false, confidence: 0, evidence: ['Peer feedback validation failed'] };
    }
  }

  /**
   * Combine validation results
   */
  private combineValidationResults(
    assessment: any,
    practical?: any,
    peer?: any
  ): {
    validated: boolean;
    confidence: number;
    evidence: string[];
    recommendations: string[];
  } {
    try {
      const validations = [assessment, practical, peer].filter(v => v !== null);
      
      if (validations.length === 0) {
        return {
          validated: false,
          confidence: 0,
          evidence: ['No validation data available'],
          recommendations: ['Complete assessment to validate skill acquisition']
        };
      }
      
      const validated = validations.every(v => v.validated);
      const averageConfidence = validations.reduce((sum, v) => sum + v.confidence, 0) / validations.length;
      
      const evidence = validations.flatMap(v => v.evidence);
      const recommendations = this.generateValidationRecommendations(validated, averageConfidence, validations);
      
      return {
        validated,
        confidence: averageConfidence,
        evidence,
        recommendations
      };
    } catch (error) {
      console.error('[Skills Integration] Error combining validation results:', error);
      return {
        validated: false,
        confidence: 0,
        evidence: ['Validation combination failed'],
        recommendations: ['Manual validation required']
      };
    }
  }

  /**
   * Generate validation recommendations
   */
  private generateValidationRecommendations(validated: boolean, confidence: number, validations: any[]): string[] {
    const recommendations: string[] = [];
    
    if (validated) {
      recommendations.push('Skill acquisition validated successfully');
      if (confidence < 0.8) {
        recommendations.push('Consider additional practice to increase confidence');
      }
    } else {
      recommendations.push('Skill acquisition not fully validated');
      recommendations.push('Review learning materials and retake assessment');
      
      if (validations.some(v => !v.validated)) {
        recommendations.push('Focus on areas where validation failed');
      }
    }
    
    return recommendations;
  }

  /**
   * Send validation results to Skills Analysis
   */
  private async sendValidationResultsToSkillsAnalysis(validationData: any, results: any): Promise<void> {
    try {
      console.log(`[Skills Integration] Sending validation results to Skills Analysis for skill: ${validationData.skillName}`);
      
      // In a real implementation, this would make an HTTP request to the Skills Analysis API
      const validationNotification: SkillsAnalysisNotification = {
        type: 'skill_validation',
        employeeId: validationData.employeeId,
        tenantId: validationData.tenantId,
        data: {
          skillId: validationData.skillId,
          skillName: validationData.skillName,
          courseId: validationData.courseId,
          validationResults: results,
          timestamp: new Date()
        },
        timestamp: new Date(),
        priority: results.validated ? 'medium' : 'high'
      };
      
      await this.sendNotificationToSkillsAnalysis(validationNotification);
      
      console.log(`[Skills Integration] Validation results sent successfully`);
    } catch (error) {
      console.error(`[Skills Integration] Error sending validation results:`, error);
      throw error;
    }
  }

  /**
   * Send notification to Skills Analysis
   */
  private async sendNotificationToSkillsAnalysis(notification: SkillsAnalysisNotification): Promise<void> {
    try {
      // In a real implementation, this would make an HTTP request to the Skills Analysis API
      console.log(`[Skills Integration] Sending notification to Skills Analysis:`, notification);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log(`[Skills Integration] Notification sent successfully`);
    } catch (error) {
      console.error(`[Skills Integration] Error sending notification:`, error);
      throw error;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private async getCurrentSkillLevel(employeeId: string, skillName: string): Promise<number> {
    // In a real implementation, this would query the Skills Analysis API
    return 2; // Default level
  }

  private calculateNewSkillLevel(currentLevel: number, assessmentScore?: number): number {
    if (!assessmentScore) return currentLevel + 1;
    
    if (assessmentScore >= 90) return Math.min(5, currentLevel + 2);
    if (assessmentScore >= 80) return Math.min(5, currentLevel + 1);
    if (assessmentScore >= 70) return currentLevel;
    
    return Math.max(1, currentLevel - 1);
  }

  private calculateSkillConfidence(assessmentScore?: number, validationResults?: any): number {
    let confidence = 0.5; // Base confidence
    
    if (assessmentScore) {
      confidence += (assessmentScore / 100) * 0.3;
    }
    
    if (validationResults && validationResults.validated) {
      confidence += 0.2;
    }
    
    return Math.min(1.0, confidence);
  }

  private generateSkillId(skillName: string): string {
    return skillName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + '_' + Date.now();
  }

  private calculateAverageImprovement(updates: SkillUpdate[]): number {
    if (updates.length === 0) return 0;
    
    const totalImprovement = updates.reduce((sum, update) => sum + (update.newLevel - update.previousLevel), 0);
    return totalImprovement / updates.length;
  }

  private determineNotificationPriority(updates: SkillUpdate[]): 'high' | 'medium' | 'low' {
    const criticalUpdates = updates.filter(u => u.newLevel >= 4 || (u.newLevel - u.previousLevel) >= 2);
    
    if (criticalUpdates.length > 0) return 'high';
    if (updates.length >= 3) return 'medium';
    return 'low';
  }
}

// ============================================================================
// Export Integration Instance
// ============================================================================

export const skillsAnalysisIntegration = new SkillsAnalysisIntegration();
export default SkillsAnalysisIntegration;
