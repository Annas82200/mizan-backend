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
      const response = await this.aiManager.generate(prompt);

      // Parse JSON response
      const parsed = JSON.parse(response);
      return parsed as GeneratedContent;
    } catch (error) {
      console.error('Content generation error:', error);
      return this.getFallbackContent(request);
    }
  }

  private buildContentPrompt(request: ContentGenerationRequest): string {
    return `
Generate social media content for Mizan Platform - an AI-powered organizational culture analysis platform.

MIZAN CONTEXT:
- Uses the proprietary Seven Cylinders Framework - a values-based progressive cultural maturity system
- The 7 Cylinders are:
  1. Safety & Survival (Preservation of Life) - Enabling: Safety, Stability, Preparedness, Wellbeing
  2. Belonging & Loyalty (Human Dignity) - Enabling: Belonging, Dignity, Loyalty, Respect
  3. Growth & Achievement (Striving with Excellence) - Enabling: Achievement, Discipline, Accountability, Learning
  4. Meaning & Contribution (Service) - Enabling: Purpose, Contribution, Service, Generosity
  5. Integrity & Justice (Justice and Accountability) - Enabling: Integrity, Fairness, Transparency, Courage
  6. Wisdom & Compassion (Mercy and Knowledge) - Enabling: Wisdom, Empathy, Patience, Humility
  7. Transcendence & Unity (Unity of Being) - Enabling: Unity, Harmony, Transcendence, Balance

- Each cylinder has enabling values (that elevate culture) and limiting values (that constrain culture)
- Organizations develop through cylinders sequentially - cannot skip levels
- Three-Engine AI Architecture (Knowledge, Data, Reasoning)
- Helps organizations build high-performing, ethical cultures
- Provides evidence-based insights and actionable recommendations

REQUEST:
- Platform: ${request.platform}
- Content Type: ${request.contentType}
- Topic: ${request.topic}
- Tone: ${request.tone}
- Length: ${request.length}

Create engaging content that educates about the 7 Cylinders Framework, organizational culture transformation, AI-powered analysis, and ethical leadership.

Focus on making the framework accessible and actionable. Highlight the progressive nature and the importance of foundational cylinders.

Return JSON with: text, hashtags (array), callToAction, imagePrompt, schedulingRecommendation (object with bestTime, frequency, engagement).
`;
  }

  private getFallbackContent(request: ContentGenerationRequest): GeneratedContent {
    const cylinderContents = [
      {
        text: `🛡️ Cylinder 1: Safety & Survival

Before innovation, before growth, before unity - there must be safety.

Organizations that score high in Cylinder 1:
✓ Psychological safety to speak up
✓ Stable systems and processes
✓ Proactive risk management
✓ Holistic employee wellbeing

Where fear dominates, trust can't grow.

#7Cylinders #WorkplaceCulture #PsychologicalSafety`,
        hashtags: ['7Cylinders', 'WorkplaceCulture', 'PsychologicalSafety', 'OrganizationalHealth']
      },
      {
        text: `⚖️ Cylinder 5: Integrity & Justice

Trust isn't built on results alone - it's built on fairness.

Enabling Values:
• Integrity - Doing right when no one watches
• Fairness - Impartial decisions for all
• Transparency - Honest information sharing
• Courage - Standing up under pressure

Organizations strong in Cylinder 5 retain talent 3x longer.

Mizan measures not just IF you have integrity, but HOW it shows up daily.

#LeadershipMatters #Ethics #TrustInLeadership`,
        hashtags: ['LeadershipMatters', 'Ethics', 'TrustInLeadership', '7Cylinders']
      },
      {
        text: `🌟 The Progressive Journey

You can't skip to Cylinder 7 (Transcendence & Unity).

Without Safety (1), there's no foundation.
Without Belonging (2), there's no connection.
Without Integrity (5), there's no trust.

Unity is earned through the journey, not jumped to.

Mizan's 7 Cylinders Framework maps the path from survival to transcendence.

#CulturalTransformation #OrganizationalDevelopment #7Cylinders`,
        hashtags: ['CulturalTransformation', 'OrganizationalDevelopment', '7Cylinders', 'Leadership']
      }
    ];

    const randomIndex = Math.floor(Math.random() * cylinderContents.length);
    const selectedContent = cylinderContents[randomIndex];

    return {
      text: selectedContent.text,
      hashtags: selectedContent.hashtags,
      callToAction: 'Learn more about the 7 Cylinders Framework',
      imagePrompt: 'Professional infographic showing the Mizan 7 Cylinders Framework with progressive levels from Safety to Transcendence',
      schedulingRecommendation: {
        bestTime: 'Tuesday-Thursday, 9-11 AM',
        frequency: '2-3 times per week',
        engagement: 'Respond to comments within 2-4 hours'
      }
    };
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

  /**
   * Generate a 7-part series educating about each cylinder
   */
  async generate7CylindersSeries(platform: string): Promise<GeneratedContent[]> {
    const cylinders = [
      { number: 1, name: 'Safety & Survival', principle: 'Preservation of Life' },
      { number: 2, name: 'Belonging & Loyalty', principle: 'Human Dignity' },
      { number: 3, name: 'Growth & Achievement', principle: 'Striving with Excellence' },
      { number: 4, name: 'Meaning & Contribution', principle: 'Service' },
      { number: 5, name: 'Integrity & Justice', principle: 'Justice and Accountability' },
      { number: 6, name: 'Wisdom & Compassion', principle: 'Mercy and Knowledge' },
      { number: 7, name: 'Transcendence & Unity', principle: 'Unity of Being' }
    ];

    const series: GeneratedContent[] = [];

    for (const cylinder of cylinders) {
      const request: ContentGenerationRequest = {
        topic: `7 Cylinders Framework - Cylinder ${cylinder.number}: ${cylinder.name} (${cylinder.principle})`,
        platform: platform as any,
        contentType: 'framework-explanation',
        tone: 'professional',
        length: 'medium'
      };

      const content = await this.generateContent(request);
      series.push(content);
    }

    return series;
  }
}