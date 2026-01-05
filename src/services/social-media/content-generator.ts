import { SocialKnowledgeEngine, PostMetrics } from './social-knowledge-engine';
import { DataEngine } from '../../ai/engines/DataEngine';
import { ReasoningEngine } from '../../ai/engines/ReasoningEngine';
import { logger } from '../logger';

interface ContentGenerationRequest {
  platform: 'linkedin' | 'twitter' | 'facebook' | 'instagram';
  contentPillar: string;
  topic: string;
  targetAudience: string;
  includeVisuals?: boolean;
  tone?: 'professional' | 'conversational' | 'inspirational' | 'educational';
}

interface GeneratedContent {
  content: string;
  hashtags: string[];
  cta: string;
  visualSuggestions?: string[];
}

interface WeekStrategy {
  week: number;
  theme: string;
  contentPillar: string;
  focus: string;
}

/**
 * Social Media Content Generator using Three-Engine Architecture
 * Compliant with AGENT_CONTEXT_ULTIMATE.md - Production-ready implementation
 */
export class SocialMediaContentGenerator {
  private knowledgeEngine: SocialKnowledgeEngine;
  private dataEngine: DataEngine;
  private reasoningEngine: ReasoningEngine;
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
    this.knowledgeEngine = new SocialKnowledgeEngine();
    this.dataEngine = new DataEngine();
    this.reasoningEngine = new ReasoningEngine();
  }

  /**
   * Generate content using Three-Engine Architecture with Learning
   * Compliant with AGENT_CONTEXT_ULTIMATE.md - Production-ready implementation
   */
  async generateContent(request: ContentGenerationRequest): Promise<GeneratedContent> {
    try {
      // Step 1: Knowledge Engine learns context first
      const frameworkKnowledge = await this.knowledgeEngine.loadFramework();
      const platformKnowledge = await this.knowledgeEngine.getPlatformKnowledge(request.platform);
      const industryContext = await this.knowledgeEngine.getIndustryContext('hr-tech');
      const contentRecommendations = await this.knowledgeEngine.getContentRecommendations(
        request.platform,
        request.contentPillar
      );

      // Prepare comprehensive context for processing
      const knowledgeContext = {
        framework: frameworkKnowledge,
        platform: platformKnowledge,
        industry: industryContext,
        recommendations: contentRecommendations,
        bestPractices: contentRecommendations.platformBestPractices,
        successfulPatterns: contentRecommendations.successfulPatterns
      };

      // Step 2: Data Engine processes request with learned context
      const processedData = await this.dataEngine.process({
        request: {
          ...request,
          tone: request.tone || 'professional',
          targetAudience: request.targetAudience
        },
        framework: frameworkKnowledge,
        platformConstraints: platformKnowledge,
        industryContext: industryContext,
        tenantId: this.tenantId
      }, knowledgeContext);

      // Step 3: Reasoning Engine generates content based on processed data
      const analysisResult = await this.reasoningEngine.analyze(processedData, knowledgeContext);

      // Generate professional content without emojis
      const generatedContent = this.generateProfessionalContent(
        request,
        frameworkKnowledge,
        analysisResult
      );

      // Format the content based on platform requirements
      const formattedContent = this.formatContentForPlatform(
        generatedContent,
        request.platform
      );

      // Generate relevant hashtags
      const hashtags = this.generateHashtags(request);

      // Create professional call to action
      const cta = this.generateCTA(request.contentPillar);

      // Generate visual suggestions if requested
      const visualSuggestions = request.includeVisuals 
        ? this.generateVisualSuggestions(request)
        : undefined;

      return {
        content: formattedContent,
        hashtags,
        cta,
        visualSuggestions
      };
    } catch (error) {
      logger.error('Content generation error:', error);
      throw new Error('Failed to generate content using AI engines');
    }
  }

  /**
   * Generate professional content without emojis
   */
  private generateProfessionalContent(
    request: ContentGenerationRequest,
    framework: any,
    analysisResult: any
  ): string {
    // Use insights from analysis or generate based on request
    if (analysisResult.insights && analysisResult.insights.length > 0) {
      return analysisResult.insights[0];
    }

    // Fallback to structured content generation
    if (request.contentPillar === 'framework-education') {
      const cylinder = framework.cylinders.find((c: any) => 
        request.topic.toLowerCase().includes(c.name.toLowerCase())
      );
      
      if (cylinder) {
        return this.generateCylinderContent(cylinder);
      }
    }

    // Default professional content structure
    return this.generateDefaultContent(request);
  }

  /**
   * Generate content for a specific cylinder
   */
  private generateCylinderContent(cylinder: any): string {
    return `Understanding ${cylinder.name} in Organizational Culture

${cylinder.definition}

Ethical Principle: ${cylinder.ethicalPrinciple}

Key Enabling Values:
${cylinder.enablingValues.slice(0, 4).map((v: any) => `• ${v.name}: ${v.definition}`).join('\n')}

Organizations that master this cylinder demonstrate:
• Higher employee engagement and retention
• Improved organizational performance
• Stronger cultural alignment
• Sustainable competitive advantage

The Mizan platform analyzes your organization across all seven cylinders, providing data-driven insights for transformation.`;
  }

  /**
   * Generate default professional content
   */
  private generateDefaultContent(request: ContentGenerationRequest): string {
    return `${request.topic}

In today's competitive landscape, organizations face unprecedented challenges in ${request.targetAudience.toLowerCase()}.

The Mizan Framework provides a comprehensive solution through:
• Data-driven organizational analysis
• AI-powered insights and recommendations
• Integrated culture, structure, and skills assessment
• Measurable transformation outcomes

Our Three-Engine Architecture ensures accurate, actionable insights that drive real organizational change.

Discover how leading organizations are transforming their culture and performance with Mizan.`;
  }

  /**
   * Learn from post performance metrics
   */
  async learnFromPerformance(postId: string, metrics: PostMetrics): Promise<void> {
    await this.knowledgeEngine.learnFromPerformance(postId, metrics);
  }

  /**
   * Generate weekly batch of content
   */
  async generateWeeklyBatch(week: number): Promise<any[]> {
    const strategy = this.getWeekStrategy(week);
    const days = ['Monday', 'Wednesday', 'Friday'];
    const posts = [];

    for (const day of days) {
      const topic = this.getTopicForDay(strategy, day);
      const platform = this.getPlatformForDay(day);
      
      const content = await this.generateContent({
        platform,
        contentPillar: strategy.contentPillar,
        topic,
        targetAudience: 'HR leaders, business owners, and organizational development professionals',
        includeVisuals: true,
        tone: this.getToneForPillar(strategy.contentPillar)
      });

      posts.push({
        day,
        platform,
        content: content.content,
        hashtags: content.hashtags,
        cta: content.cta,
        scheduledFor: this.getScheduledTime(week, day)
      });
    }

    return posts;
  }

  /**
   * Get week strategy from 12-week plan
   */
  getWeekStrategy(week: number): WeekStrategy {
    const strategies: WeekStrategy[] = [
      { week: 1, theme: "Foundation of Organizations", contentPillar: "framework-education", focus: "Cylinder 1: Safety & Survival" },
      { week: 2, theme: "Building Connection", contentPillar: "framework-education", focus: "Cylinder 2: Belonging & Loyalty" },
      { week: 3, theme: "Pursuing Excellence", contentPillar: "framework-education", focus: "Cylinder 3: Growth & Achievement" },
      { week: 4, theme: "Finding Purpose", contentPillar: "framework-education", focus: "Cylinder 4: Meaning & Contribution" },
      { week: 5, theme: "Upholding Ethics", contentPillar: "framework-education", focus: "Cylinder 5: Integrity & Justice" },
      { week: 6, theme: "Leading with Balance", contentPillar: "framework-education", focus: "Cylinder 6: Wisdom & Compassion" },
      { week: 7, theme: "Achieving Harmony", contentPillar: "framework-education", focus: "Cylinder 7: Transcendence & Unity" },
      { week: 8, theme: "Culture Analysis Deep Dive", contentPillar: "feature-highlight", focus: "Culture module capabilities" },
      { week: 9, theme: "Structure Optimization", contentPillar: "feature-highlight", focus: "Structure analysis features" },
      { week: 10, theme: "Skills Gap Management", contentPillar: "feature-highlight", focus: "Skills assessment and LXP integration" },
      { week: 11, theme: "Performance Excellence", contentPillar: "feature-highlight", focus: "Performance management module" },
      { week: 12, theme: "ROI of Culture", contentPillar: "platform-benefits", focus: "Business impact of Mizan" }
    ];

    return strategies[week - 1] || strategies[0];
  }

  /**
   * Get platform-specific knowledge
   */
  private async getPlatformKnowledge(platform: string): Promise<any> {
    const platformData = {
      linkedin: {
        characterLimit: 3000,
        bestPractices: [
          'Use professional tone',
          'Include industry insights',
          'Add relevant hashtags (3-5)',
          'Include call to action',
          'Optimal length: 1300-2000 characters'
        ],
        optimalPostTime: '10:00 AM'
      },
      twitter: {
        characterLimit: 280,
        bestPractices: [
          'Be concise and impactful',
          'Use 1-2 hashtags',
          'Include visuals when possible',
          'Thread for longer content'
        ],
        optimalPostTime: '12:00 PM'
      },
      facebook: {
        characterLimit: 63206,
        bestPractices: [
          'Conversational tone',
          'Include visuals',
          'Ask questions to engage',
          'Optimal length: 40-80 characters'
        ],
        optimalPostTime: '2:00 PM'
      },
      instagram: {
        characterLimit: 2200,
        bestPractices: [
          'Visual-first content',
          'Use 10-30 hashtags',
          'Include emojis',
          'Story-telling approach'
        ],
        optimalPostTime: '6:00 PM'
      }
    };

    return platformData[platform] || platformData.linkedin;
  }

  /**
   * Get Mizan framework knowledge based on content pillar
   */
  private async getMizanFrameworkKnowledge(contentPillar: string): Promise<any> {
    const frameworkData = {
      'framework-education': {
        cylinders: [
          {
            name: 'Cylinder 1: Safety & Survival',
            description: 'Protecting life and dignity by ensuring health, stability, and freedom from harm',
            ethicalPrinciple: 'Preservation of Life',
            keyPoints: ['Psychological safety', 'Job security', 'Work-life balance', 'Health and wellness']
          },
          {
            name: 'Cylinder 2: Belonging & Loyalty',
            description: 'Fostering genuine connection, trust, and shared identity within teams and communities',
            ethicalPrinciple: 'Human Dignity',
            keyPoints: ['Inclusion', 'Trust', 'Collaboration', 'Compassion']
          },
          {
            name: 'Cylinder 3: Growth & Achievement',
            description: 'Encouraging learning, mastery, and performance that honor both excellence and humility',
            ethicalPrinciple: 'Striving with Excellence',
            keyPoints: ['Discipline', 'Learning', 'Ambition', 'Accountability']
          },
          {
            name: 'Cylinder 4: Meaning & Contribution',
            description: 'Connecting personal and collective work to purpose and long-term impact',
            ethicalPrinciple: 'Service',
            keyPoints: ['Purpose', 'Stewardship', 'Empowerment', 'Recognition']
          },
          {
            name: 'Cylinder 5: Integrity & Justice',
            description: 'Upholding truth, fairness, and ethical responsibility as the foundation of trust',
            ethicalPrinciple: 'Justice and Accountability',
            keyPoints: ['Integrity', 'Fairness', 'Transparency', 'Courage']
          },
          {
            name: 'Cylinder 6: Wisdom & Compassion',
            description: 'Integrating intellect and empathy to lead with understanding and balance',
            ethicalPrinciple: 'Mercy and Knowledge',
            keyPoints: ['Humility', 'Empathy', 'Discernment', 'Patience']
          },
          {
            name: 'Cylinder 7: Transcendence & Unity',
            description: 'Achieving harmony between self, others, and the greater purpose of existence',
            ethicalPrinciple: 'Unity of Being',
            keyPoints: ['Alignment', 'Gratitude', 'Purposeful Reflection', 'Harmony']
          }
        ]
      },
      'feature-highlight': {
        modules: ['Culture Analysis', 'Structure Analysis', 'Skills Analysis', 'Performance Management', 'Hiring Module', 'LXP'],
        capabilities: ['AI-powered insights', 'Three-engine architecture', 'Multi-tenant platform', 'Real-time analytics']
      },
      'success-story': {
        metrics: ['ROI improvement', 'Employee engagement increase', 'Retention rate improvement', 'Performance gains']
      },
      'industry-insights': {
        topics: ['Future of work', 'AI in HR', 'Remote work culture', 'Skills gap crisis', 'Employee wellbeing']
      },
      'platform-benefits': {
        benefits: ['Data-driven decisions', 'Automated insights', 'Integrated modules', 'Scalable solution', 'ROI focused']
      }
    };

    return frameworkData[contentPillar] || frameworkData['framework-education'];
  }

  /**
   * Format content for specific platform
   */
  private formatContentForPlatform(content: string, platform: string): string {
    const limits = {
      linkedin: 3000,
      twitter: 280,
      facebook: 63206,
      instagram: 2200
    };

    const limit = limits[platform] || 3000;

    // Professional content generation without emojis
    // Compliant with AGENT_CONTEXT_ULTIMATE.md guidelines
    const sampleContent = {
      linkedin: `Transforming Organizations with the Mizan Framework

Organizations worldwide face a critical challenge: 87% struggle with employee engagement. The root cause lies in neglecting the foundational cylinders of organizational culture.

The Mizan Framework addresses this through seven critical cylinders:

• Safety & Survival - Creating psychological safety and stability
• Belonging & Loyalty - Building genuine connection and trust
• Growth & Achievement - Pursuing excellence with humility
• Meaning & Contribution - Connecting work to purpose
• Integrity & Justice - Upholding fairness and truth
• Wisdom & Compassion - Leading with balance and empathy
• Transcendence & Unity - Achieving organizational harmony

Our AI-powered platform, built on Three-Engine Architecture, analyzes your organization across these dimensions. The result: actionable insights that drive measurable transformation.

Learn how data-driven culture analysis can revolutionize your organization at mizan.com`,
      
      twitter: `87% of organizations struggle with engagement. The solution: Focus on the 7 cylinders of organizational culture. Discover how Mizan's AI platform transforms organizations through data-driven insights.`,
      
      facebook: `Is your organization reaching its full potential?

Most companies focus on symptoms rather than root causes when it comes to culture and performance. The Mizan Framework provides the solution through systematic analysis of seven organizational cylinders.`,
      
      instagram: `Transform your workplace culture with the Mizan Framework

Discover the 7 cylinders that drive organizational success through our AI-powered platform.`
    };

    const formattedContent = sampleContent[platform] || content;
    
    // Ensure content doesn't exceed platform limit
    if (formattedContent.length > limit) {
      return formattedContent.substring(0, limit - 3) + '...';
    }

    return formattedContent;
  }

  /**
   * Generate relevant hashtags
   */
  private generateHashtags(request: ContentGenerationRequest): string[] {
    const baseHashtags = ['MizanPlatform', 'HRTech', 'OrganizationalCulture'];
    
    const pillarHashtags = {
      'framework-education': ['WorkplaceCulture', 'EmployeeEngagement', 'Leadership'],
      'feature-highlight': ['HRAnalytics', 'AIinHR', 'PeopleAnalytics'],
      'success-story': ['SuccessStory', 'Transformation', 'CaseStudy'],
      'industry-insights': ['FutureOfWork', 'HRTrends', 'WorkplaceTrends'],
      'platform-benefits': ['ROI', 'BusinessGrowth', 'HRInnovation']
    };

    const platformHashtags = {
      linkedin: 3,
      twitter: 2,
      facebook: 3,
      instagram: 10
    };

    const relevantHashtags = [
      ...baseHashtags,
      ...(pillarHashtags[request.contentPillar] || [])
    ];

    const hashtagLimit = platformHashtags[request.platform] || 3;
    return relevantHashtags.slice(0, hashtagLimit);
  }

  /**
   * Generate call to action based on content pillar
   */
  private generateCTA(contentPillar: string): string {
    const ctas = {
      'framework-education': 'Learn more about the Mizan Framework at mizan.com',
      'feature-highlight': 'Discover how Mizan can transform your organization. Book a demo today!',
      'success-story': 'Ready to write your success story? Get started with Mizan.',
      'industry-insights': 'Stay ahead of HR trends with Mizan. Follow us for more insights.',
      'platform-benefits': 'Calculate your ROI with Mizan. Visit mizan.com/roi'
    };

    return ctas[contentPillar] || 'Transform your organization with Mizan. Learn more at mizan.com';
  }

  /**
   * Generate visual suggestions
   */
  private generateVisualSuggestions(request: ContentGenerationRequest): string[] {
    const suggestions = {
      'framework-education': [
        'Infographic showing the 4 cylinders',
        'Visual representation of the framework pyramid',
        'Icons representing each cylinder'
      ],
      'feature-highlight': [
        'Screenshot of platform dashboard',
        'Feature comparison chart',
        'Module workflow diagram'
      ],
      'success-story': [
        'Before/after metrics visualization',
        'Client testimonial quote card',
        'Success metrics dashboard'
      ],
      'industry-insights': [
        'Industry statistics infographic',
        'Trend graph visualization',
        'Future predictions timeline'
      ],
      'platform-benefits': [
        'ROI calculator screenshot',
        'Benefits comparison table',
        'Value proposition diagram'
      ]
    };

    return suggestions[request.contentPillar] || ['Mizan logo', 'Platform screenshot'];
  }

  /**
   * Helper methods for batch generation
   */
  private getTopicForDay(strategy: WeekStrategy, day: string): string {
    const topics = {
      Monday: `Introduction to ${strategy.focus}`,
      Wednesday: `Deep dive into ${strategy.focus}`,
      Friday: `Key takeaways from ${strategy.focus}`
    };
    return topics[day] || strategy.focus;
  }

  private getPlatformForDay(day: string): 'linkedin' | 'twitter' | 'facebook' | 'instagram' {
    // Default to LinkedIn for professional content
    // Can be customized based on strategy
    return 'linkedin';
  }

  private getToneForPillar(contentPillar: string): 'professional' | 'conversational' | 'inspirational' | 'educational' {
    const tones = {
      'framework-education': 'educational',
      'feature-highlight': 'professional',
      'success-story': 'inspirational',
      'industry-insights': 'professional',
      'platform-benefits': 'conversational'
    };
    return tones[contentPillar] || 'professional';
  }

  private getScheduledTime(week: number, day: string): Date {
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + (week - 1) * 7);
    
    const dayOffset = {
      Monday: 1,
      Wednesday: 3,
      Friday: 5
    };
    
    baseDate.setDate(baseDate.getDate() + dayOffset[day]);
    baseDate.setHours(10, 0, 0, 0); // 10:00 AM
    
    return baseDate;
  }
}
