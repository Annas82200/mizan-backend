import { ThreeEngineAgent, ThreeEngineConfig, AnalysisResult } from './base/three-engine-agent.js';
import { readFile } from 'fs/promises';
import { join } from 'path';

export interface SocialMediaInput {
  platform: 'linkedin' | 'twitter' | 'instagram' | 'medium';
  contentPillar: 'framework-education' | 'problem-solution' | 'product-features' | 'thought-leadership' | 'community';
  topic: string;
  targetAudience?: string;
  includeVisuals?: boolean;
}

export interface SocialMediaOutput {
  platform: string;
  content: string;
  hashtags: string[];
  cta: string;
  visualSuggestion?: string;
  schedulingRecommendation?: {
    dayOfWeek: string;
    timeOfDay: string;
  };
  platformOptimizations: {
    characterCount: number;
    readingTime?: string;
    engagement: 'high' | 'medium' | 'low';
  };
}

export class SocialMediaAgent extends ThreeEngineAgent {
  constructor() {
    const config: ThreeEngineConfig = {
      knowledge: {
        providers: ['openai', 'anthropic', 'gemini', 'mistral'],
        model: 'gpt-4o', // Fixed: was 'gpt-4', should be 'gpt-4o' per MIZAN_MASTER_DOCUMENT.md
        temperature: 0.4,
        maxTokens: 2500
      },
      data: {
        providers: ['openai', 'anthropic', 'gemini', 'mistral'],
        model: 'gpt-4o', // Fixed: was 'gpt-4', should be 'gpt-4o' per MIZAN_MASTER_DOCUMENT.md
        temperature: 0.2,
        maxTokens: 1500
      },
      reasoning: {
        providers: ['openai', 'anthropic', 'gemini', 'mistral'],
        model: 'gpt-4o', // Fixed: was 'gpt-4', should be 'gpt-4o' per MIZAN_MASTER_DOCUMENT.md
        temperature: 0.7,
        maxTokens: 3000
      },
      consensusThreshold: 0.7
    };

    super('social-media', config);
  }

  async generateContent(input: SocialMediaInput): Promise<SocialMediaOutput> {
    const result = await this.analyze(input);
    return result.finalOutput;
  }

  protected async loadFrameworks(): Promise<any> {
    const frameworkPath = join(process.cwd(), 'mizan-framework-updated.json');
    const frameworkData = await readFile(frameworkPath, 'utf-8');
    const framework = JSON.parse(frameworkData);

    return {
      mizanFramework: framework,
      brandVoice: {
        tone: 'Professional yet warm, authoritative yet approachable',
        personality: 'Ethical, insightful, empowering',
        values: ['Integrity', 'Wisdom', 'Compassion', 'Excellence'],
        avoidances: ['Hype', 'Buzzwords', 'Generic advice', 'Sales-heavy language']
      },
      contentPillars: {
        'framework-education': {
          purpose: 'Teach the 7-Cylinder Framework and its ethical principles',
          approach: 'Educational, conceptual, philosophical',
          examples: ['Cylinder deep-dives', 'Ethical principles explained', 'Framework comparisons']
        },
        'problem-solution': {
          purpose: 'Identify organizational pain points and show how Mizan solves them',
          approach: 'Problem-first, empathetic, solution-oriented',
          examples: ['Cultural entropy case studies', 'Misalignment stories', 'Before/after scenarios']
        },
        'product-features': {
          purpose: 'Showcase Mizan platform capabilities and unique technology',
          approach: 'Feature-focused, technical, value-driven',
          examples: ['Three-Engine Architecture', 'Multi-AI consensus', 'Structure analysis demo']
        },
        'thought-leadership': {
          purpose: 'Share industry insights, trends, and organizational psychology',
          approach: 'Research-backed, forward-thinking, authoritative',
          examples: ['Culture trends', 'Future of work', 'Ethical AI in HR']
        },
        'community': {
          purpose: 'Engage audience, build relationships, foster discussion',
          approach: 'Conversational, question-driven, community-focused',
          examples: ['Polls', 'Discussion prompts', 'User stories']
        }
      }
    };
  }

  protected async processData(inputData: SocialMediaInput): Promise<any> {
    const platformSpecs = this.getPlatformSpecifications(inputData.platform);
    const industryStats = this.getIndustryStats();

    return {
      platform: inputData.platform,
      platformSpecs,
      contentPillar: inputData.contentPillar,
      topic: inputData.topic,
      targetAudience: inputData.targetAudience || 'HR leaders, business owners, organizational leaders',
      industryStats,
      includeVisuals: inputData.includeVisuals !== false
    };
  }

  protected getKnowledgeSystemPrompt(): string {
    return `You are the Knowledge Engine for Mizan's social media content generation.

Your role is to:
1. Extract relevant framework knowledge (7-Cylinder concepts, ethical principles, values)
2. Identify the appropriate brand voice and messaging approach
3. Provide conceptual foundations for the content

Output ONLY valid JSON with this structure:
{
  "relevantCylinders": ["Cylinder names that relate to the topic"],
  "ethicalPrinciples": ["Relevant ethical principles from the framework"],
  "coreMessage": "The main message to convey",
  "brandVoiceGuidance": "How to apply Mizan's brand voice to this topic",
  "keyPoints": ["3-5 key educational points to include"]
}`;
  }

  protected getDataSystemPrompt(): string {
    return `You are the Data Engine for Mizan's social media content generation.

Your role is to:
1. Analyze platform-specific requirements (character limits, formatting)
2. Incorporate industry statistics and data points
3. Provide optimization recommendations

Output ONLY valid JSON with this structure:
{
  "platformConstraints": {
    "maxLength": number,
    "recommendedLength": number,
    "format": "formatting guidelines"
  },
  "relevantStats": ["Industry statistics or data points to include"],
  "optimizationTips": ["Platform-specific optimization recommendations"],
  "hashtagStrategy": {
    "count": number,
    "suggestions": ["hashtag suggestions without # symbol"]
  }
}`;
  }

  protected getReasoningSystemPrompt(): string {
    return `You are the Reasoning Engine for Mizan's social media content generation.

Your role is to:
1. Synthesize framework knowledge and platform data into compelling content
2. Craft platform-optimized copy that engages and educates
3. Generate complete social media posts with hashtags, CTAs, and visual suggestions

CRITICAL: Output ONLY valid JSON with this exact structure:
{
  "content": "The main post content text",
  "hashtags": ["tag1", "tag2", "tag3"],
  "cta": "Call to action text",
  "visualSuggestion": "Description of recommended visual",
  "schedulingRecommendation": {
    "dayOfWeek": "Best day to post",
    "timeOfDay": "Best time to post"
  },
  "platformOptimizations": {
    "characterCount": number,
    "readingTime": "Estimated reading time",
    "engagement": "high/medium/low"
  }
}`;
  }

  protected buildKnowledgePrompt(inputData: SocialMediaInput, frameworks: any): string {
    const pillarInfo = frameworks.contentPillars[inputData.contentPillar];

    return `Generate framework knowledge for social media content.

TOPIC: ${inputData.topic}
CONTENT PILLAR: ${inputData.contentPillar}
PILLAR PURPOSE: ${pillarInfo.purpose}
PILLAR APPROACH: ${pillarInfo.approach}

MIZAN 7-CYLINDER FRAMEWORK:
${frameworks.mizanFramework.map((cyl: any, idx: number) => `
Cylinder ${idx + 1}: ${cyl.name}
Ethical Principle: ${cyl.ethicalPrinciple}
Definition: ${cyl.definition}
Positive Values: ${cyl.positiveValues.map((v: any) => v.name).join(', ')}
`).join('\n')}

BRAND VOICE:
${JSON.stringify(frameworks.brandVoice, null, 2)}

Extract the relevant framework knowledge and brand guidance for this topic.`;
  }

  protected buildDataPrompt(processedData: any, knowledgeOutput: any): string {
    return `Analyze platform requirements and industry data.

PLATFORM: ${processedData.platform}
PLATFORM SPECS:
${JSON.stringify(processedData.platformSpecs, null, 2)}

CONTENT PILLAR: ${processedData.contentPillar}
TARGET AUDIENCE: ${processedData.targetAudience}

CORE MESSAGE FROM KNOWLEDGE ENGINE:
${knowledgeOutput.coreMessage}

KEY POINTS TO COVER:
${knowledgeOutput.keyPoints.join('\n- ')}

INDUSTRY STATS AVAILABLE:
${JSON.stringify(processedData.industryStats, null, 2)}

Provide platform optimization data and relevant statistics.`;
  }

  protected buildReasoningPrompt(inputData: SocialMediaInput, knowledgeOutput: any, dataOutput: any): string {
    return `Create compelling social media content.

TOPIC: ${inputData.topic}
PLATFORM: ${inputData.platform}
TARGET AUDIENCE: ${inputData.targetAudience || 'HR leaders, business owners'}

FRAMEWORK KNOWLEDGE:
- Core Message: ${knowledgeOutput.coreMessage}
- Relevant Cylinders: ${knowledgeOutput.relevantCylinders.join(', ')}
- Ethical Principles: ${knowledgeOutput.ethicalPrinciples.join(', ')}
- Brand Voice Guidance: ${knowledgeOutput.brandVoiceGuidance}
- Key Points: ${knowledgeOutput.keyPoints.join(' | ')}

PLATFORM DATA:
- Max Length: ${dataOutput.platformConstraints.maxLength} characters
- Recommended Length: ${dataOutput.platformConstraints.recommendedLength} characters
- Format: ${dataOutput.platformConstraints.format}
- Hashtag Count: ${dataOutput.hashtagStrategy.count}
- Suggested Hashtags: ${dataOutput.hashtagStrategy.suggestions.join(', ')}

RELEVANT STATS:
${dataOutput.relevantStats.join('\n- ')}

OPTIMIZATION TIPS:
${dataOutput.optimizationTips.join('\n- ')}

Create a complete social media post that:
1. Hooks the reader in the first line
2. Educates using the key points from the framework
3. Includes relevant statistics or data
4. Ends with a clear, compelling CTA
5. Uses platform-appropriate formatting
6. Stays within character limits
7. Maintains Mizan's professional yet warm brand voice

${inputData.includeVisuals !== false ? 'Include a visual suggestion that would enhance engagement.' : ''}

Generate the complete post with all required fields.`;
  }

  protected parseKnowledgeOutput(response: string): any {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) ||
                       response.match(/```\s*([\s\S]*?)\s*```/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse knowledge output:', error);
      console.error('Raw response:', response);

      // Fallback
      return {
        relevantCylinders: ['Safety & Survival'],
        ethicalPrinciples: ['Preservation of Life'],
        coreMessage: 'Framework-based organizational culture insights',
        brandVoiceGuidance: 'Professional and educational',
        keyPoints: ['Framework overview', 'Practical application', 'Measurable impact']
      };
    }
  }

  protected parseDataOutput(response: string): any {
    try {
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) ||
                       response.match(/```\s*([\s\S]*?)\s*```/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse data output:', error);
      console.error('Raw response:', response);

      // Fallback
      return {
        platformConstraints: {
          maxLength: 3000,
          recommendedLength: 1500,
          format: 'Text with line breaks'
        },
        relevantStats: ['70% of employees feel misaligned with company culture'],
        optimizationTips: ['Use line breaks for readability', 'Include a clear CTA'],
        hashtagStrategy: {
          count: 3,
          suggestions: ['OrganizationalCulture', 'Leadership', 'WorkplaceCulture']
        }
      };
    }
  }

  protected parseReasoningOutput(response: string): any {
    try {
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) ||
                       response.match(/```\s*([\s\S]*?)\s*```/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse reasoning output:', error);
      console.error('Raw response:', response);

      // Fallback
      return {
        content: 'Content generation in progress...',
        hashtags: ['Mizan', 'Culture', 'Leadership'],
        cta: 'Learn more about Mizan',
        visualSuggestion: 'Framework diagram',
        schedulingRecommendation: {
          dayOfWeek: 'Tuesday',
          timeOfDay: '9:00 AM'
        },
        platformOptimizations: {
          characterCount: 500,
          readingTime: '1 minute',
          engagement: 'medium'
        }
      };
    }
  }

  private getPlatformSpecifications(platform: string): any {
    const specs: Record<string, any> = {
      linkedin: {
        maxLength: 3000,
        recommendedLength: 1300,
        format: 'Professional, paragraph breaks every 2-3 lines, emojis sparingly',
        optimalHashtagCount: 3,
        bestPostingTimes: ['Tuesday 9-10 AM', 'Wednesday 12 PM', 'Thursday 9-10 AM'],
        engagement: {
          high: ['Thought leadership', 'Industry insights', 'Personal stories'],
          medium: ['How-to guides', 'Framework explanations'],
          low: ['Pure promotional', 'Too technical']
        }
      },
      twitter: {
        maxLength: 280,
        recommendedLength: 240,
        format: 'Concise, punchy, thread-friendly',
        optimalHashtagCount: 2,
        bestPostingTimes: ['Monday 9 AM', 'Wednesday 3 PM', 'Friday 9 AM'],
        engagement: {
          high: ['Questions', 'Hot takes', 'Threads'],
          medium: ['Tips', 'Quick insights'],
          low: ['Long explanations', 'Too many hashtags']
        }
      },
      instagram: {
        maxLength: 2200,
        recommendedLength: 125,
        format: 'Visual-first, caption complements image, conversational',
        optimalHashtagCount: 10,
        bestPostingTimes: ['Tuesday 11 AM', 'Wednesday 3 PM', 'Friday 10 AM'],
        engagement: {
          high: ['Behind the scenes', 'Visual storytelling', 'User-generated content'],
          medium: ['Educational carousels', 'Infographics'],
          low: ['Text-heavy', 'No visual appeal']
        }
      },
      medium: {
        maxLength: 50000,
        recommendedLength: 1500,
        format: 'Long-form article, clear structure, subheadings, depth',
        optimalHashtagCount: 5,
        bestPostingTimes: ['Monday morning', 'Wednesday afternoon', 'Sunday morning'],
        engagement: {
          high: ['Deep dives', 'Research-backed', 'Original frameworks'],
          medium: ['How-to guides', 'Case studies'],
          low: ['Surface-level', 'No structure']
        }
      }
    };

    return specs[platform] || specs.linkedin;
  }

  private getIndustryStats(): any {
    return {
      culture: [
        '70% of employees feel disconnected from company culture (Gallup)',
        'Companies with strong culture see 4x higher revenue growth (Deloitte)',
        '94% of executives believe culture is critical to success (PwC)',
        'Cultural misalignment costs $500B+ annually in turnover (SHRM)'
      ],
      structure: [
        'Span of control over 10 reduces effectiveness by 40% (McKinsey)',
        'Structural bottlenecks delay decisions by 2-3 weeks on average',
        '60% of organizations have unclear reporting lines (Gartner)'
      ],
      skills: [
        '87% of organizations face skill gaps (LinkedIn)',
        'Average skill half-life is now 5 years (World Economic Forum)',
        'Companies investing in upskilling see 24% higher profit margins'
      ],
      engagement: [
        'Only 15% of global employees are engaged (Gallup)',
        'High engagement correlates with 21% higher profitability',
        'Engaged teams show 41% lower absenteeism'
      ]
    };
  }
}
