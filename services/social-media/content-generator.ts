import { MultiProviderManager } from '../ai/multi-provider-manager.js';

interface ContentGenerationRequest {
  topic: string;
  platform: 'linkedin' | 'twitter' | 'facebook' | 'instagram';
  contentType: 'educational' | 'thought-leadership' | 'case-study' | 'framework-explanation' | 'tips';
  tone: 'professional' | 'conversational' | 'inspiring' | 'analytical';
  length: 'short' | 'medium' | 'long';
}

export interface GeneratedContent {
  text: string;
  hashtags: string[];
  callToAction?: string;
  imagePrompt?: string;
  schedulingRecommendation: {
    bestTime: string;
    frequency: string;
    engagement: string;
  };
}

export class ContentGenerator {
  private aiManager: MultiProviderManager;
  
  constructor() {
    this.aiManager = new MultiProviderManager();
  }

  async generateContent(request: ContentGenerationRequest): Promise<GeneratedContent> {
    const prompt = this.buildContentPrompt(request);
    
    try {
      const response = await this.aiManager.generateJSON(prompt, {
        text: 'string',
        hashtags: 'array',
        callToAction: 'string',
        imagePrompt: 'string',
        schedulingRecommendation: {
          bestTime: 'string',
          frequency: 'string',
          engagement: 'string'
        }
      });

      return response as GeneratedContent;
    } catch (error) {
      console.error('Content generation error:', error);
      return this.getFallbackContent(request);
    }
  }

  private buildContentPrompt(request: ContentGenerationRequest): string {
    return `
Generate social media content for Mizan Platform - an AI-powered organizational culture analysis platform.

MIZAN CONTEXT:
- Uses Seven Cylinders Framework for ethical culture analysis
- Three-Engine AI Architecture (Knowledge, Data, Reasoning)
- Helps organizations build high-performing, ethical cultures
- Provides evidence-based insights and recommendations

REQUEST:
- Platform: ${request.platform}
- Content Type: ${request.contentType}
- Topic: ${request.topic}
- Tone: ${request.tone}
- Length: ${request.length}

Create engaging content that educates about organizational culture, AI analysis, and ethical frameworks.

Return JSON with: text, hashtags (array), callToAction, imagePrompt, schedulingRecommendation (object with bestTime, frequency, engagement).
`;
  }

  private getFallbackContent(request: ContentGenerationRequest): GeneratedContent {
    const content = {
      text: `🚀 Transforming organizational culture with AI-powered insights. 

Our Seven Cylinders Framework analyzes culture through ethical principles, providing evidence-based recommendations for sustainable growth.

From survival needs to transcendent service - understanding what truly drives performance. #OrganizationalCulture #AI #Leadership`,
      hashtags: ['OrganizationalCulture', 'AI', 'Leadership', 'WorkplaceCulture', 'Ethics'],
      callToAction: 'Learn more about ethical culture analysis',
      imagePrompt: 'Professional infographic showing seven interconnected cylinders representing organizational culture elements',
      schedulingRecommendation: {
        bestTime: 'Tuesday-Thursday, 9-11 AM',
        frequency: '2-3 times per week',
        engagement: 'Respond to comments within 2-4 hours'
      }
    };

    return content;
  }

  async generateContentSeries(topic: string, platform: string, count: number = 5): Promise<GeneratedContent[]> {
    const contentTypes = ['educational', 'thought-leadership', 'framework-explanation', 'tips', 'case-study'];
    const series: GeneratedContent[] = [];

    for (let i = 0; i < count; i++) {
      const contentType = contentTypes[i % contentTypes.length];
      const request: ContentGenerationRequest = {
        topic: `${topic} - Part ${i + 1}`,
        platform: platform as any,
        contentType: contentType as any,
        tone: 'professional',
        length: 'medium'
      };

      const content = await this.generateContent(request);
      series.push(content);
    }

    return series;
  }
}