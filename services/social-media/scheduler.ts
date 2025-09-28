import { ContentGenerator, GeneratedContent } from './content-generator.js';
import { db } from '../../db/index.js';
import { socialMediaPosts } from '../../db/schema.js';
import { eq, and, gte, lte } from 'drizzle-orm';

interface ScheduleRequest {
  tenantId: string;
  platforms: string[];
  contentTopics: string[];
  frequency: 'daily' | 'weekly' | 'bi-weekly';
  startDate: Date;
  endDate?: Date;
  autoPublish: boolean;
}

interface ScheduledPost {
  id: string;
  tenantId: string;
  platform: string;
  content: GeneratedContent;
  scheduledTime: Date;
  status: 'scheduled' | 'published' | 'failed' | 'cancelled';
  createdAt: Date;
}

export class SocialMediaScheduler {
  private contentGenerator: ContentGenerator;

  constructor() {
    this.contentGenerator = new ContentGenerator();
  }

  async scheduleContentSeries(request: ScheduleRequest): Promise<ScheduledPost[]> {
    const scheduledPosts: ScheduledPost[] = [];

    try {
      // Generate content for each topic and platform
      for (const topic of request.contentTopics) {
        for (const platform of request.platforms) {
          const contentSeries = await this.contentGenerator.generateContentSeries(
            topic, 
            platform, 
            this.calculatePostCount(request)
          );

          // Schedule posts based on frequency
          const postTimes = this.generatePostSchedule(request);
          
          for (let i = 0; i < Math.min(contentSeries.length, postTimes.length); i++) {
            const scheduledPost = await this.createScheduledPost({
              tenantId: request.tenantId,
              platform,
              content: contentSeries[i],
              scheduledTime: postTimes[i],
              autoPublish: request.autoPublish
            });

            scheduledPosts.push(scheduledPost);
          }
        }
      }

      return scheduledPosts;
    } catch (error) {
      console.error('Content scheduling error:', error);
      throw new Error('Failed to schedule content series');
    }
  }

  private calculatePostCount(request: ScheduleRequest): number {
    const daysDiff = request.endDate 
      ? Math.ceil((request.endDate.getTime() - request.startDate.getTime()) / (1000 * 60 * 60 * 24))
      : 30; // Default to 30 days

    switch (request.frequency) {
      case 'daily': return daysDiff;
      case 'weekly': return Math.ceil(daysDiff / 7);
      case 'bi-weekly': return Math.ceil(daysDiff / 14);
      default: return 10;
    }
  }

  private generatePostSchedule(request: ScheduleRequest): Date[] {
    const schedule: Date[] = [];
    const currentDate = new Date(request.startDate);
    const endDate = request.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const frequencyDays = {
      'daily': 1,
      'weekly': 7,
      'bi-weekly': 14
    };

    const interval = frequencyDays[request.frequency];

    while (currentDate <= endDate) {
      // Schedule at optimal times based on platform best practices
      const scheduledTime = this.getOptimalPostTime(currentDate);
      schedule.push(new Date(scheduledTime));
      
      currentDate.setDate(currentDate.getDate() + interval);
    }

    return schedule;
  }

  private getOptimalPostTime(date: Date): Date {
    const optimalTime = new Date(date);
    
    // Set optimal posting time based on day of week
    const dayOfWeek = date.getDay();
    
    if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
      optimalTime.setHours(10, 0, 0, 0); // 10 AM
    } else { // Weekend
      optimalTime.setHours(14, 0, 0, 0); // 2 PM
    }

    return optimalTime;
  }

  private async createScheduledPost(params: {
    tenantId: string;
    platform: string;
    content: GeneratedContent;
    scheduledTime: Date;
    autoPublish: boolean;
  }): Promise<ScheduledPost> {
    const postId = `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Store in database
    await db.insert(socialMediaPosts).values({
      id: postId,
      tenantId: params.tenantId,
      platform: params.platform,
      content: JSON.stringify(params.content),
      scheduledTime: params.scheduledTime,
      status: 'scheduled',
      autoPublish: params.autoPublish,
      createdAt: new Date()
    });

    return {
      id: postId,
      tenantId: params.tenantId,
      platform: params.platform,
      content: params.content,
      scheduledTime: params.scheduledTime,
      status: 'scheduled',
      createdAt: new Date()
    };
  }

  async getScheduledPosts(tenantId: string, startDate?: Date, endDate?: Date): Promise<ScheduledPost[]> {
    const conditions = [eq(socialMediaPosts.tenantId, tenantId)];
    
    if (startDate) {
      conditions.push(gte(socialMediaPosts.scheduledTime, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(socialMediaPosts.scheduledTime, endDate));
    }

    const posts = await db.select()
      .from(socialMediaPosts)
      .where(and(...conditions))
      .orderBy(socialMediaPosts.scheduledTime);

    return posts.map(post => ({
      id: post.id,
      tenantId: post.tenantId,
      platform: post.platform,
      content: JSON.parse(post.content),
      scheduledTime: post.scheduledTime,
      status: post.status as any,
      createdAt: post.createdAt
    }));
  }

  async updatePostStatus(postId: string, status: 'published' | 'failed' | 'cancelled'): Promise<void> {
    await db.update(socialMediaPosts)
      .set({ 
        status,
        publishedAt: status === 'published' ? new Date() : undefined
      })
      .where(eq(socialMediaPosts.id, postId));
  }

  async generateMizanContentCalendar(tenantId: string, month: number, year: number): Promise<any> {
    const topics = [
      'Seven Cylinders Framework Explained',
      'AI-Powered Culture Analysis',
      'Ethical Organizational Development',
      'Structure and Strategy Alignment',
      'Employee Engagement Best Practices',
      'Performance Management Innovation',
      'Recognition and Rewards Systems',
      'Benchmarking for Excellence',
      'Future of Work Culture',
      'Leadership in Digital Age'
    ];

    const platforms = ['linkedin', 'twitter', 'facebook'];
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const calendar = await this.scheduleContentSeries({
      tenantId,
      platforms,
      contentTopics: topics.slice(0, 5), // Use first 5 topics
      frequency: 'weekly',
      startDate,
      endDate,
      autoPublish: false
    });

    return {
      month,
      year,
      totalPosts: calendar.length,
      postsByPlatform: this.groupPostsByPlatform(calendar),
      calendar: this.formatCalendarView(calendar, startDate, endDate)
    };
  }

  private groupPostsByPlatform(posts: ScheduledPost[]): Record<string, number> {
    return posts.reduce((acc, post) => {
      acc[post.platform] = (acc[post.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private formatCalendarView(posts: ScheduledPost[], startDate: Date, endDate: Date): any[] {
    const calendar = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayPosts = posts.filter(post => 
        post.scheduledTime.toDateString() === currentDate.toDateString()
      );

      calendar.push({
        date: new Date(currentDate),
        posts: dayPosts.map(post => ({
          id: post.id,
          platform: post.platform,
          preview: post.content.text.substring(0, 100) + '...',
          time: post.scheduledTime.toLocaleTimeString()
        }))
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return calendar;
  }
}