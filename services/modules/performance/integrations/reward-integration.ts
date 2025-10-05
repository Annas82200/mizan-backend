import { Logger } from '../../../../utils/logger.js';

// ============================================================================
// REWARD INTEGRATION INTERFACE
// ============================================================================

export interface RewardIntegrationData {
  employeeId: string;
  tenantId: string;
  performanceScore: number;
  performanceLevel: string;
  achievementDetails: {
    goalsAchieved: number;
    totalGoals: number;
    achievementRate: number;
    exceptionalAchievements: string[];
  };
  rewardType: 'bonus' | 'recognition' | 'promotion' | 'award' | 'incentive';
  rewardTier: 'standard' | 'exceptional' | 'outstanding';
  source: 'annual_review' | 'quarterly_review' | 'goal_achievement' | 'special_recognition';
}

export interface RewardIntegrationResult {
  success: boolean;
  rewardId?: string;
  rewardType: string;
  rewardAmount?: number;
  rewardDescription: string;
  message: string;
}

// ============================================================================
// REWARD INTEGRATION SERVICE
// ============================================================================

export class RewardIntegration {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('PerformanceRewardIntegration');
  }

  /**
   * Trigger reward for high performance
   */
  public async triggerReward(data: RewardIntegrationData): Promise<RewardIntegrationResult> {
    try {
      this.logger.info('Triggering reward for high performance', {
        employeeId: data.employeeId,
        performanceScore: data.performanceScore,
        rewardType: data.rewardType,
        rewardTier: data.rewardTier
      });

      // Determine reward amount based on tier and type
      const rewardAmount = this.calculateRewardAmount(data);

      // Mock implementation - would call Reward module API
      // In production:
      // const response = await rewardModule.createReward({
      //   employeeId: data.employeeId,
      //   type: data.rewardType,
      //   amount: rewardAmount,
      //   ...
      // });

      return {
        success: true,
        rewardId: `reward_${Date.now()}`,
        rewardType: data.rewardType,
        rewardAmount,
        rewardDescription: this.getRewardDescription(data),
        message: 'Reward triggered successfully'
      };
    } catch (error) {
      this.logger.error('Failed to trigger reward:', error);
      throw error;
    }
  }

  /**
   * Send performance achievement data to Reward module
   */
  public async sendPerformanceAchievement(data: {
    employeeId: string;
    tenantId: string;
    achievementType: string;
    achievementDescription: string;
    performanceScore: number;
  }): Promise<{ success: boolean; acknowledged: boolean }> {
    try {
      this.logger.info('Sending performance achievement to Reward module', {
        employeeId: data.employeeId,
        achievementType: data.achievementType
      });

      // Mock implementation
      return {
        success: true,
        acknowledged: true
      };
    } catch (error) {
      this.logger.error('Failed to send performance achievement:', error);
      throw error;
    }
  }

  /**
   * Calculate reward amount based on performance
   */
  private calculateRewardAmount(data: RewardIntegrationData): number {
    let baseAmount = 0;

    // Base amount by reward type
    switch (data.rewardType) {
      case 'bonus':
        baseAmount = 5000;
        break;
      case 'recognition':
        baseAmount = 500;
        break;
      case 'award':
        baseAmount = 1000;
        break;
      case 'incentive':
        baseAmount = 2000;
        break;
      default:
        baseAmount = 1000;
    }

    // Multiply by tier
    const tierMultiplier = {
      standard: 1.0,
      exceptional: 1.5,
      outstanding: 2.0
    };

    const multiplier = tierMultiplier[data.rewardTier] || 1.0;

    // Adjust by performance score
    const scoreMultiplier = data.performanceScore / 4; // Normalize to ~1.0-1.25

    return Math.round(baseAmount * multiplier * scoreMultiplier);
  }

  /**
   * Get reward description
   */
  private getRewardDescription(data: RewardIntegrationData): string {
    const descriptions = {
      bonus: `Performance bonus for ${data.rewardTier} achievement`,
      recognition: `Recognition award for ${data.performanceLevel} performance`,
      promotion: `Promotion recommendation based on ${data.rewardTier} performance`,
      award: `${data.rewardTier} performance award`,
      incentive: `Performance incentive for goal achievement`
    };

    return descriptions[data.rewardType] || 'Performance reward';
  }

  /**
   * Check Reward integration health
   */
  public async checkHealth(): Promise<{ healthy: boolean; message: string }> {
    try {
      // Mock implementation - would ping Reward module
      return {
        healthy: true,
        message: 'Reward integration operational'
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Reward integration error: ${error instanceof Error ? (error as any).message : 'Unknown error'}`
      };
    }
  }
}

export const rewardIntegration = new RewardIntegration();

