// server/services/socialmedia.ts

import { db } from '../db/index.js';
import { socialMediaPosts, orgSnapshots } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

export interface SocialMediaContent {
  platform: string;
  content: string;
  hashtags: string[];
  mediaUrl?: string;
  scheduledAt?: Date;
}

export interface CampaignData {
  tenantId: string;
  type: 'platform_education' | 'framework_showcase' | 'feature_highlight' | 'success_story' | 'comparison' | 'thought_leadership' | 'testimonial';
  targetAudience: string;
  goals: string[];
  timeline: {
    startDate: Date;
    endDate: Date;
    frequency: 'daily' | 'weekly' | 'bi-weekly';
  };
}

export class SocialMediaService {
  async createPost(tenantId: string, content: SocialMediaContent, createdBy: string): Promise<string> {
    try {
      const postId = randomUUID();
      
      await db.insert(socialMediaPosts).values({
        id: postId,
        tenantId,
        platform: content.platform,
        content: content.content,
        hashtags: content.hashtags,
        mediaUrl: content.mediaUrl,
        scheduledAt: content.scheduledAt,
        status: content.scheduledAt ? 'scheduled' : 'draft',
        createdAt: new Date(),
        createdBy
      });

      return postId;
    } catch (error) {
      console.error('Failed to create social media post:', error);
      throw error;
    }
  }

  async generateContentFromAnalysis(tenantId: string, analysisType: string): Promise<SocialMediaContent[]> {
    try {
      // Get latest analysis results
      const snapshots = await db.query.orgSnapshots.findMany({
        where: eq(orgSnapshots.tenantId, tenantId),
        orderBy: [desc(orgSnapshots.createdAt)],
        limit: 1
      });

      if (snapshots.length === 0) {
        throw new Error('No analysis data found for content generation');
      }

      const analysis = snapshots[0].fullReport;
      const content: SocialMediaContent[] = [];

      // Generate platform-specific content
      const platforms = ['linkedin', 'twitter', 'facebook', 'instagram'];

      for (const platform of platforms) {
        const platformContent = await this.generatePlatformContent(platform, analysis, analysisType);
        content.push(platformContent);
      }

      return content;
    } catch (error) {
      console.error('Failed to generate content from analysis:', error);
      throw error;
    }
  }

  private async generatePlatformContent(platform: string, analysis: any, analysisType: string): Promise<SocialMediaContent> {
    // This would integrate with AI content generation
    // For now, returning mock content based on platform and analysis type
    
    const contentTemplates = {
      linkedin: {
        platform_education: `🎯 Organizational Analysis Insights: Our latest ${analysisType} analysis reveals key opportunities for strategic growth. Discover how data-driven insights can transform your organization's performance. #OrganizationalDevelopment #DataDriven #Leadership`,
        framework_showcase: `📊 Introducing our comprehensive organizational framework that helps companies achieve strategic alignment. See how we measure and improve organizational health across multiple dimensions. #OrganizationalHealth #StrategicAlignment #BusinessTransformation`,
        feature_highlight: `✨ New Feature Alert: Advanced organizational analysis capabilities now available! Get deeper insights into your company's structure, culture, and performance. #Innovation #OrganizationalAnalysis #BusinessIntelligence`,
        success_story: `🏆 Success Story: How Company X improved their organizational health score by 40% using our platform. Read about their transformation journey and the results they achieved. #SuccessStory #OrganizationalTransformation #Results`
      },
      twitter: {
        platform_education: `💡 Did you know? Organizations with high health scores are 3x more likely to achieve their strategic goals. Learn how to measure and improve your org's health. #OrgHealth #Strategy #Leadership`,
        framework_showcase: `🔧 Our organizational framework covers 7 key dimensions of organizational health. From structure to culture, we help you build a thriving organization. #OrgFramework #BusinessGrowth`,
        feature_highlight: `🚀 Just launched: Real-time organizational analysis! Get instant insights into your company's performance and identify improvement opportunities. #NewFeature #OrgAnalysis`,
        success_story: `📈 Case Study: 40% improvement in organizational health in just 6 months. See how data-driven insights transformed this company's performance. #CaseStudy #Transformation`
      },
      facebook: {
        platform_education: `🎓 Educational Post: Understanding organizational health is crucial for business success. Our latest analysis shows the key factors that drive organizational performance. #Education #BusinessSuccess #OrganizationalHealth`,
        framework_showcase: `🏗️ Building a strong organization requires the right framework. Our 7-cylinder model helps companies assess and improve their organizational health. #Framework #OrganizationalDevelopment`,
        feature_highlight: `⭐ Exciting news! We've added new features to help you better understand your organization. Check out our enhanced analysis capabilities. #NewFeatures #Innovation`,
        success_story: `🌟 Inspiring transformation story: How one company used our platform to dramatically improve their organizational health and achieve their goals. #Inspiration #Success`
      },
      instagram: {
        platform_education: `📚 Knowledge is power! Learn about the key elements of organizational health and how they impact business success. Swipe to see our analysis insights. #Knowledge #BusinessEducation #OrgHealth`,
        framework_showcase: `🎨 Visual framework: Our 7-cylinder organizational model in action. See how each component contributes to overall organizational health. #VisualLearning #Framework #Design`,
        feature_highlight: `✨ Feature spotlight: New analysis tools that provide deeper insights into your organization. Swipe to explore the capabilities. #FeatureSpotlight #Innovation`,
        success_story: `🏆 Transformation Tuesday: Before and after results from our organizational health analysis. See the incredible improvement achieved. #Transformation #Results #Success`
      }
    };

    const template = contentTemplates[platform]?.[analysisType] || contentTemplates[platform]?.platform_education || 'Default content';
    
    return {
      platform,
      content: template,
      hashtags: this.extractHashtags(template),
      mediaUrl: this.getMediaUrl(platform, analysisType)
    };
  }

  private extractHashtags(content: string): string[] {
    const hashtagRegex = /#\w+/g;
    return content.match(hashtagRegex) || [];
  }

  private getMediaUrl(platform: string, analysisType: string): string | undefined {
    // In a real implementation, this would return actual media URLs
    // For now, returning mock URLs
    const mediaUrls = {
      linkedin: {
        platform_education: 'https://example.com/media/linkedin-education.png',
        framework_showcase: 'https://example.com/media/linkedin-framework.png',
        feature_highlight: 'https://example.com/media/linkedin-feature.png',
        success_story: 'https://example.com/media/linkedin-success.png'
      },
      twitter: {
        platform_education: 'https://example.com/media/twitter-education.png',
        framework_showcase: 'https://example.com/media/twitter-framework.png',
        feature_highlight: 'https://example.com/media/twitter-feature.png',
        success_story: 'https://example.com/media/twitter-success.png'
      },
      facebook: {
        platform_education: 'https://example.com/media/facebook-education.png',
        framework_showcase: 'https://example.com/media/facebook-framework.png',
        feature_highlight: 'https://example.com/media/facebook-feature.png',
        success_story: 'https://example.com/media/facebook-success.png'
      },
      instagram: {
        platform_education: 'https://example.com/media/instagram-education.png',
        framework_showcase: 'https://example.com/media/instagram-framework.png',
        feature_highlight: 'https://example.com/media/instagram-feature.png',
        success_story: 'https://example.com/media/instagram-success.png'
      }
    };

    return mediaUrls[platform]?.[analysisType];
  }

  async scheduleCampaign(campaignData: CampaignData, createdBy: string): Promise<string> {
    try {
      const campaignId = randomUUID();
      
      // Generate content for the campaign
      const content = await this.generateContentFromAnalysis(campaignData.tenantId, campaignData.type);
      
      // Schedule posts based on timeline
      const posts = await this.schedulePosts(campaignData, content, createdBy, campaignId);
      
      console.log(`Campaign ${campaignId} scheduled with ${posts.length} posts`);
      
      return campaignId;
    } catch (error) {
      console.error('Failed to schedule campaign:', error);
      throw error;
    }
  }

  private async schedulePosts(campaignData: CampaignData, content: SocialMediaContent[], createdBy: string, campaignId: string): Promise<string[]> {
    const postIds: string[] = [];
    const { startDate, endDate, frequency } = campaignData.timeline;
    
    // Calculate post schedule
    const schedule = this.calculatePostSchedule(startDate, endDate, frequency);
    
    for (let i = 0; i < schedule.length && i < content.length; i++) {
      const scheduledAt = schedule[i];
      const contentItem = content[i % content.length]; // Cycle through content
      
      const postId = await this.createPost(campaignData.tenantId, {
        ...contentItem,
        scheduledAt
      }, createdBy);
      
      postIds.push(postId);
    }
    
    return postIds;
  }

  private calculatePostSchedule(startDate: Date, endDate: Date, frequency: 'daily' | 'weekly' | 'bi-weekly'): Date[] {
    const schedule: Date[] = [];
    const current = new Date(startDate);
    
    const intervals = {
      daily: 1,
      weekly: 7,
      'bi-weekly': 14
    };
    
    const intervalDays = intervals[frequency];
    
    while (current <= endDate) {
      schedule.push(new Date(current));
      current.setDate(current.getDate() + intervalDays);
    }
    
    return schedule;
  }

  async getPostMetrics(postId: string): Promise<any> {
    try {
      const post = await db.query.socialMediaPosts.findFirst({
        where: eq(socialMediaPosts.id, postId)
      });

      if (!post) {
        throw new Error('Post not found');
      }

      // In a real implementation, this would fetch actual metrics from social media APIs
      return {
        postId,
        platform: post.platform,
        status: post.status,
        publishedAt: post.publishedAt,
        metrics: {
          impressions: Math.floor(Math.random() * 10000),
          engagements: Math.floor(Math.random() * 1000),
          clicks: Math.floor(Math.random() * 100),
          shares: Math.floor(Math.random() * 50)
        }
      };
    } catch (error) {
      console.error('Failed to get post metrics:', error);
      throw error;
    }
  }

  async updatePostStatus(postId: string, status: 'draft' | 'scheduled' | 'published' | 'failed', error?: string): Promise<void> {
    try {
      await db.update(socialMediaPosts)
        .set({
          status,
          error,
          publishedAt: status === 'published' ? new Date() : undefined,
          updatedAt: new Date()
        })
        .where(eq(socialMediaPosts.id, postId));
    } catch (error) {
      console.error('Failed to update post status:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const socialMediaService = new SocialMediaService();

// Export convenience functions
export async function createPost(tenantId: string, content: SocialMediaContent, createdBy: string): Promise<string> {
  return socialMediaService.createPost(tenantId, content, createdBy);
}

export async function generateContentFromAnalysis(tenantId: string, analysisType: string): Promise<SocialMediaContent[]> {
  return socialMediaService.generateContentFromAnalysis(tenantId, analysisType);
}

export async function scheduleCampaign(campaignData: CampaignData, createdBy: string): Promise<string> {
  return socialMediaService.scheduleCampaign(campaignData, createdBy);
}

export async function getPostMetrics(postId: string): Promise<any> {
  return socialMediaService.getPostMetrics(postId);
}

export async function updatePostStatus(postId: string, status: 'draft' | 'scheduled' | 'published' | 'failed', error?: string): Promise<void> {
  return socialMediaService.updatePostStatus(postId, status, error);
}