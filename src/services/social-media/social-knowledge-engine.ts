/**
 * Social Media Knowledge Engine with Learning Capabilities
 * Extends base KnowledgeEngine for social media specific learning
 * Compliant with AGENT_CONTEXT_ULTIMATE.md - Three-Engine Architecture
 */

import { KnowledgeEngine, DomainContext } from '../../ai/engines/KnowledgeEngine';
import { db } from '../../../db';
import { frameworkConfig, socialMediaPosts } from '../../db/schema';
import { eq, desc, and, gte } from 'drizzle-orm';
import { logger } from '../logger';

interface SocialMediaContext extends DomainContext {
  platformBestPractices: PlatformPractices;
  contentPatterns: ContentPattern[];
  frameworkKnowledge: FrameworkKnowledge;
  performanceMetrics: PerformanceData[];
}

interface PlatformPractices {
  platform: string;
  characterLimit: number;
  optimalLength: number;
  bestPostingTimes: string[];
  hashtagStrategy: string;
  contentFormats: string[];
  engagementTactics: string[];
}

interface ContentPattern {
  pattern: string;
  successRate: number;
  engagementRate: number;
  platform: string;
  contentPillar: string;
}

interface FrameworkKnowledge {
  cylinders: CylinderDefinition[];
  version: number;
  lastUpdated: Date;
}

interface CylinderDefinition {
  cylinder: number;
  name: string;
  definition: string;
  ethicalPrinciple: string;
  enablingValues: Array<{ name: string; definition: string }>;
  limitingValues: Array<{ name: string; definition: string }>;
}

interface PerformanceData {
  postId: string;
  content: string;
  platform: string;
  engagement: number;
  impressions: number;
  clicks: number;
  conversionRate: number;
}

export interface PostMetrics {
  engagement: number;
  impressions: number;
  clicks: number;
  shares: number;
  comments: number;
}

export class SocialKnowledgeEngine extends KnowledgeEngine {
  private frameworkCache: FrameworkKnowledge | null = null;
  private contentPatterns: Map<string, ContentPattern[]> = new Map();
  private platformKnowledge: Map<string, PlatformPractices> = new Map();
  private performanceHistory: PerformanceData[] = [];

  constructor() {
    super();
    this.initializePlatformKnowledge();
  }

  /**
   * Initialize platform-specific knowledge base
   */
  private initializePlatformKnowledge(): void {
    // LinkedIn best practices
    this.platformKnowledge.set('linkedin', {
      platform: 'linkedin',
      characterLimit: 3000,
      optimalLength: 1500,
      bestPostingTimes: ['Tuesday 10 AM', 'Wednesday 11 AM', 'Thursday 10 AM'],
      hashtagStrategy: 'Use 3-5 relevant industry hashtags',
      contentFormats: ['Long-form posts', 'Document posts', 'Carousel posts', 'Video posts'],
      engagementTactics: ['Ask questions', 'Share insights', 'Include data', 'Tell stories']
    });

    // Twitter best practices
    this.platformKnowledge.set('twitter', {
      platform: 'twitter',
      characterLimit: 280,
      optimalLength: 100,
      bestPostingTimes: ['Wednesday 9 AM', 'Friday 9 AM'],
      hashtagStrategy: 'Use 1-2 trending hashtags',
      contentFormats: ['Threads', 'Single tweets', 'Quote tweets', 'Polls'],
      engagementTactics: ['Be concise', 'Use threads for depth', 'Engage with replies', 'Share timely content']
    });

    // Facebook best practices
    this.platformKnowledge.set('facebook', {
      platform: 'facebook',
      characterLimit: 63206,
      optimalLength: 80,
      bestPostingTimes: ['Thursday 8 AM', 'Friday 1 PM'],
      hashtagStrategy: 'Use 1-2 hashtags sparingly',
      contentFormats: ['Native video', 'Link posts', 'Photo posts', 'Live video'],
      engagementTactics: ['Ask for opinions', 'Share behind-scenes', 'Create events', 'Use Facebook groups']
    });

    // Instagram best practices
    this.platformKnowledge.set('instagram', {
      platform: 'instagram',
      characterLimit: 2200,
      optimalLength: 150,
      bestPostingTimes: ['Monday 11 AM', 'Tuesday 2 PM', 'Friday 11 AM'],
      hashtagStrategy: 'Use 10-15 niche hashtags',
      contentFormats: ['Carousel posts', 'Reels', 'Stories', 'IGTV'],
      engagementTactics: ['Visual storytelling', 'User-generated content', 'Behind-scenes', 'Interactive stories']
    });
  }

  /**
   * Load 7-cylinder framework from database
   */
  async loadFramework(): Promise<FrameworkKnowledge> {
    try {
      // Check cache first
      if (this.frameworkCache && this.isCacheValid(this.frameworkCache.lastUpdated)) {
        return this.frameworkCache;
      }

      // Load from database
      const configs = await db.select()
        .from(frameworkConfig)
        .where(eq(frameworkConfig.isActive, true))
        .orderBy(desc(frameworkConfig.createdAt))
        .limit(1);

      if (configs.length === 0) {
        // Return default framework if none exists
        return this.getDefaultFramework();
      }

      const framework: FrameworkKnowledge = {
        cylinders: configs[0].cylinders as CylinderDefinition[],
        version: configs[0].version,
        lastUpdated: configs[0].updatedAt
      };

      // Cache the framework
      this.frameworkCache = framework;
      
      return framework;
    } catch (error) {
      logger.error('Error loading framework:', error);
      return this.getDefaultFramework();
    }
  }

  /**
   * Learn from successful post metrics
   */
  async learnFromPerformance(postId: string, metrics: PostMetrics): Promise<void> {
    try {
      // Fetch post details
      const [post] = await db.select()
        .from(socialMediaPosts)
        .where(eq(socialMediaPosts.id, postId))
        .limit(1);

      if (!post) {
        logger.error('Post not found for learning:', postId);
        return;
      }

      // Calculate engagement rate
      const engagementRate = metrics.impressions > 0 
        ? ((metrics.engagement + metrics.shares + metrics.comments) / metrics.impressions) * 100
        : 0;

      // Store performance data
      const performanceData: PerformanceData = {
        postId,
        content: post.content,
        platform: post.platform,
        engagement: metrics.engagement,
        impressions: metrics.impressions,
        clicks: metrics.clicks,
        conversionRate: metrics.clicks > 0 && metrics.impressions > 0 
          ? (metrics.clicks / metrics.impressions) * 100 
          : 0
      };

      this.performanceHistory.push(performanceData);

      // Identify successful patterns (engagement rate > 4% is considered good for LinkedIn)
      if (engagementRate > 4) {
        this.extractAndStorePattern(post, engagementRate);
      }

      // Keep only last 100 performance records for memory efficiency
      if (this.performanceHistory.length > 100) {
        this.performanceHistory = this.performanceHistory.slice(-100);
      }
    } catch (error) {
      logger.error('Error learning from performance:', error);
    }
  }

  /**
   * Extract and store successful content patterns
   */
  private extractAndStorePattern(post: any, engagementRate: number): void {
    const platform = post.platform;
    const contentPillar = post.campaignType || 'general';
    
    // Extract pattern characteristics
    const pattern: ContentPattern = {
      pattern: this.extractContentPattern(post.content),
      successRate: engagementRate,
      engagementRate,
      platform,
      contentPillar
    };

    // Store pattern by platform
    const existingPatterns = this.contentPatterns.get(platform) || [];
    existingPatterns.push(pattern);
    
    // Keep only top 20 patterns per platform
    existingPatterns.sort((a, b) => b.successRate - a.successRate);
    this.contentPatterns.set(platform, existingPatterns.slice(0, 20));
  }

  /**
   * Extract content pattern from successful post
   */
  private extractContentPattern(content: string): string {
    // Identify structural patterns
    const hasHeader = content.split('\n')[0].length < 100;
    const hasBulletPoints = content.includes('•') || content.includes('-');
    const hasQuestions = content.includes('?');
    const hasData = /\d+%/.test(content);
    const hasCTA = content.toLowerCase().includes('learn') || 
                   content.toLowerCase().includes('discover') || 
                   content.toLowerCase().includes('visit');
    
    const patterns: string[] = [];
    if (hasHeader) patterns.push('strong_header');
    if (hasBulletPoints) patterns.push('bullet_points');
    if (hasQuestions) patterns.push('questions');
    if (hasData) patterns.push('data_driven');
    if (hasCTA) patterns.push('clear_cta');
    
    return patterns.join('_');
  }

  /**
   * Get platform-specific knowledge
   */
  async getPlatformKnowledge(platform: string): Promise<PlatformPractices | undefined> {
    return this.platformKnowledge.get(platform);
  }

  /**
   * Get successful content patterns for a platform
   */
  getSuccessfulPatterns(platform: string, limit: number = 5): ContentPattern[] {
    const patterns = this.contentPatterns.get(platform) || [];
    return patterns.slice(0, limit);
  }

  /**
   * Get industry context for HR tech
   */
  async getIndustryContext(industry: string): Promise<any> {
    // HR Tech specific context
    if (industry === 'hr-tech') {
      return {
        trends: [
          'AI-powered HR analytics',
          'Employee experience platforms',
          'Skills-based hiring',
          'Remote work culture',
          'Continuous performance management'
        ],
        challenges: [
          'Employee engagement crisis',
          'Skills gap widening',
          'Retention challenges',
          'Cultural transformation',
          'Digital transformation in HR'
        ],
        opportunities: [
          'Data-driven decision making',
          'Predictive analytics',
          'Personalized employee experiences',
          'Culture measurement',
          'Strategic workforce planning'
        ],
        regulations: [
          'Data privacy (GDPR, CCPA)',
          'Equal employment opportunity',
          'Fair labor standards',
          'Workplace safety',
          'Anti-discrimination laws'
        ]
      };
    }

    return super.getContext(industry);
  }

  /**
   * Generate content recommendations based on learning
   */
  async getContentRecommendations(platform: string, contentPillar: string): Promise<any> {
    const platformPractices = this.platformKnowledge.get(platform);
    const successfulPatterns = this.getSuccessfulPatterns(platform);
    const framework = await this.loadFramework();

    return {
      platformBestPractices: platformPractices,
      successfulPatterns,
      frameworkInsights: this.getFrameworkInsights(framework, contentPillar),
      performanceBasedSuggestions: this.analyzePerformanceHistory(platform)
    };
  }

  /**
   * Get framework insights for content pillar
   */
  private getFrameworkInsights(framework: FrameworkKnowledge, contentPillar: string): any {
    if (contentPillar === 'framework-education') {
      return {
        focus: 'Educate on 7-cylinder framework',
        keyMessages: framework.cylinders.map(c => ({
          cylinder: c.cylinder,
          name: c.name,
          principle: c.ethicalPrinciple,
          keyPoint: c.definition
        })),
        approach: 'Educational, analytical, data-driven'
      };
    }

    return {
      focus: 'Platform capabilities',
      approach: 'Solution-oriented, ROI-focused'
    };
  }

  /**
   * Analyze performance history for insights
   */
  private analyzePerformanceHistory(platform: string): any {
    const platformPosts = this.performanceHistory.filter(p => p.platform === platform);
    
    if (platformPosts.length === 0) {
      return { message: 'No performance history yet' };
    }

    const avgEngagement = platformPosts.reduce((sum, p) => sum + p.engagement, 0) / platformPosts.length;
    const avgConversion = platformPosts.reduce((sum, p) => sum + p.conversionRate, 0) / platformPosts.length;

    return {
      averageEngagement: avgEngagement.toFixed(2),
      averageConversionRate: avgConversion.toFixed(2),
      topPerforming: platformPosts
        .sort((a, b) => b.engagement - a.engagement)
        .slice(0, 3)
        .map(p => ({ postId: p.postId, engagement: p.engagement }))
    };
  }

  /**
   * Check if cache is still valid (24 hours)
   */
  private isCacheValid(lastUpdated: Date): boolean {
    const hoursSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);
    return hoursSinceUpdate < 24;
  }

  /**
   * Get default framework if database is empty
   */
  private getDefaultFramework(): FrameworkKnowledge {
    return {
      cylinders: [
        {
          cylinder: 1,
          name: "Safety & Survival",
          definition: "Protecting life and dignity by ensuring health, stability, and freedom from harm",
          ethicalPrinciple: "Preservation of Life",
          enablingValues: [
            { name: "Safety", definition: "Creates environments free from harm" },
            { name: "Stability", definition: "Establishes dependable systems" }
          ],
          limitingValues: [
            { name: "Fear", definition: "Uses control or intimidation" },
            { name: "Neglect", definition: "Ignores warning signs" }
          ]
        },
        {
          cylinder: 2,
          name: "Belonging & Loyalty",
          definition: "Fostering genuine connection, trust, and shared identity within teams",
          ethicalPrinciple: "Human Dignity",
          enablingValues: [
            { name: "Inclusion", definition: "Values all voices" },
            { name: "Trust", definition: "Builds reliability through transparency" }
          ],
          limitingValues: [
            { name: "Cliquishness", definition: "Forms exclusive circles" },
            { name: "Bias", definition: "Lets prejudice influence decisions" }
          ]
        },
        {
          cylinder: 3,
          name: "Growth & Achievement",
          definition: "Encouraging learning, mastery, and performance",
          ethicalPrinciple: "Striving with Excellence",
          enablingValues: [
            { name: "Discipline", definition: "Maintains consistency and focus" },
            { name: "Learning", definition: "Seeks continuous improvement" }
          ],
          limitingValues: [
            { name: "Ego", definition: "Pursues recognition at expense of others" },
            { name: "Burnout", definition: "Overextends without balance" }
          ]
        },
        {
          cylinder: 4,
          name: "Meaning & Contribution",
          definition: "Connecting work to purpose and long-term impact",
          ethicalPrinciple: "Service",
          enablingValues: [
            { name: "Purpose", definition: "Aligns actions with meaning" },
            { name: "Stewardship", definition: "Acts responsibly toward resources" }
          ],
          limitingValues: [
            { name: "Apathy", definition: "Shows disinterest in mission" },
            { name: "Self-interest", definition: "Prioritizes personal gain" }
          ]
        },
        {
          cylinder: 5,
          name: "Integrity & Justice",
          definition: "Upholding truth, fairness, and ethical responsibility",
          ethicalPrinciple: "Justice and Accountability",
          enablingValues: [
            { name: "Integrity", definition: "Acts consistently with principles" },
            { name: "Fairness", definition: "Makes impartial decisions" }
          ],
          limitingValues: [
            { name: "Deception", definition: "Distorts truth for convenience" },
            { name: "Injustice", definition: "Permits unfair systems" }
          ]
        },
        {
          cylinder: 6,
          name: "Wisdom & Compassion",
          definition: "Integrating intellect and empathy to lead with balance",
          ethicalPrinciple: "Mercy and Knowledge",
          enablingValues: [
            { name: "Humility", definition: "Learns from others" },
            { name: "Empathy", definition: "Understands others' experiences" }
          ],
          limitingValues: [
            { name: "Pride", definition: "Overestimates own wisdom" },
            { name: "Indifference", definition: "Fails to act with compassion" }
          ]
        },
        {
          cylinder: 7,
          name: "Transcendence & Unity",
          definition: "Achieving harmony between self, others, and greater purpose",
          ethicalPrinciple: "Unity of Being",
          enablingValues: [
            { name: "Alignment", definition: "Brings coherence across life" },
            { name: "Gratitude", definition: "Appreciates interconnectedness" }
          ],
          limitingValues: [
            { name: "Division", definition: "Amplifies conflict" },
            { name: "Alienation", definition: "Feels disconnected from meaning" }
          ]
        }
      ],
      version: 1,
      lastUpdated: new Date()
    };
  }
}
