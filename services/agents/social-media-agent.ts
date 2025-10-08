/**
 * Social Media Content Generation Agent
 *
 * Uses Three-Engine Architecture to generate platform-optimized social media content
 * based on Mizan's 7-Cylinder Framework and brand voice.
 */

import { MultiAIService } from '../multi-ai.js';

export interface SocialMediaContentRequest {
  platform: 'linkedin' | 'twitter' | 'instagram' | 'medium';
  contentPillar: 'framework-education' | 'problem-solution' | 'product-features' | 'thought-leadership' | 'community';
  topic: string;
  includeVisuals?: boolean;
  targetAudience?: string;
}

export interface SocialMediaContent {
  platform: string;
  content: string;
  hashtags: string[];
  cta: string;
  visualSuggestion?: string;
  schedulingRecommendation?: {
    dayOfWeek: string;
    timeOfDay: string;
  };
}

export class SocialMediaAgent {
  private multiAI: MultiAIService;

  constructor() {
    this.multiAI = new MultiAIService();
  }

  /**
   * Generate social media content using Three-Engine Architecture
   */
  async generateContent(request: SocialMediaContentRequest): Promise<SocialMediaContent> {
    console.log(`🎨 Generating ${request.platform} content for: ${request.topic}`);

    // Knowledge Engine: Framework understanding + Brand voice
    const knowledgePrompt = this.buildKnowledgePrompt(request);

    // Data Engine: Stats, examples, case studies
    const dataPrompt = this.buildDataPrompt(request);

    // Reasoning Engine: Platform optimization + CTA strategy
    const reasoningPrompt = this.buildReasoningPrompt(request);

    // Combine all engines
    const fullPrompt = `
${knowledgePrompt}

${dataPrompt}

${reasoningPrompt}

Now generate the content based on all three engines above.

Return a JSON object with this EXACT structure:
{
  "platform": "${request.platform}",
  "content": "the main post text",
  "hashtags": ["tag1", "tag2", "tag3"],
  "cta": "call to action text",
  "visualSuggestion": "description of visual asset to create",
  "schedulingRecommendation": {
    "dayOfWeek": "Monday",
    "timeOfDay": "9:00 AM"
  }
}

IMPORTANT: Return ONLY valid JSON, no other text.
`;

    try {
      // Get consensus from multiple AI providers
      const response = await this.multiAI.getConsensus(fullPrompt);

      // Parse JSON response
      let parsedContent: SocialMediaContent;

      try {
        // Try to extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }
        parsedContent = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', response);

        // Fallback: Create structured content from text response
        parsedContent = this.createFallbackContent(request, response);
      }

      console.log(`✅ Generated content for ${request.platform}`);
      return parsedContent;

    } catch (error: any) {
      console.error('Social media content generation error:', error);
      throw new Error(`Failed to generate content: ${error.message}`);
    }
  }

  /**
   * Knowledge Engine: Build framework understanding + brand voice prompt
   */
  private buildKnowledgePrompt(request: SocialMediaContentRequest): string {
    return `
=== KNOWLEDGE ENGINE: Framework & Brand Voice ===

You are the Mizan social media content creator. Your role is to translate the 7-Cylinder Framework into engaging, shareable content.

7-CYLINDER FRAMEWORK (bottom to top):
1. Safety & Survival: Job security, physical/psychological safety, stability
2. Belonging & Connection: Relationships, team bonds, community
3. Identity & Recognition: Being seen, valued, acknowledged for unique contributions
4. Growth & Achievement: Progress, learning, advancement, visible paths forward
5. Purpose & Meaning: Work that matters, contribution to something bigger
6. Mastery & Excellence: Pursuit of greatness, high standards, craft
7. Transcendence & Unity: Part of humanity's progress, legacy

BRAND VOICE:
- Tone: Confident but humble, data-driven but human
- Style: Clear, direct, jargon-free
- Emotion: Empathetic to problems, optimistic about solutions
- Avoid: Corporate speak, buzzwords, hype

PLATFORM-SPECIFIC VOICE:
${this.getPlatformVoiceGuidelines(request.platform)}

CONTENT PILLAR: ${request.contentPillar}
${this.getContentPillarGuidelines(request.contentPillar)}
`;
  }

  /**
   * Data Engine: Build stats, examples, case studies prompt
   */
  private buildDataPrompt(request: SocialMediaContentRequest): string {
    return `
=== DATA ENGINE: Stats, Examples, Case Studies ===

Use these data points to strengthen your content:

INDUSTRY STATISTICS:
- 85% of employees feel disengaged at work (Gallup)
- Companies with strong culture see 4x revenue growth (Deloitte)
- 76% of employees seek meaningful work (LinkedIn)
- Cultural misalignment costs companies 20-30% of annual revenue
- 94% of executives say culture is critical to success

REAL-WORLD EXAMPLES:
- Misalignment Scenario: Employee values mastery (Cylinder 6) but company only rewards speed → burnout
- Alignment Success: Employee values purpose (Cylinder 5), company mission clear → engagement soars
- Structure Problem: Manager with 15 direct reports → bottleneck, decisions delayed
- Culture Fix: Anonymous assessments reveal safety concerns (Cylinder 1) → leadership addresses → trust rebuilt

MIZAN DIFFERENTIATORS:
- Three-Engine AI Architecture (Knowledge + Data + Reasoning)
- Multi-AI Consensus (OpenAI, Anthropic, Google, Mistral)
- Real-time cultural diagnosis vs. annual surveys
- 7-Cylinder Framework vs. generic engagement scores
- Free Structure Scan (no signup required)

TARGET AUDIENCE: ${request.targetAudience || 'HR leaders, executives, culture-focused professionals'}
`;
  }

  /**
   * Reasoning Engine: Build platform optimization + CTA strategy prompt
   */
  private buildReasoningPrompt(request: SocialMediaContentRequest): string {
    return `
=== REASONING ENGINE: Optimization & Strategy ===

PLATFORM: ${request.platform}

OPTIMIZATION RULES FOR ${request.platform.toUpperCase()}:
${this.getPlatformOptimizationRules(request.platform)}

CTA STRATEGY:
${this.getCTAStrategy(request.contentPillar, request.platform)}

TOPIC: ${request.topic}

CONTENT REQUIREMENTS:
1. Hook: Start with a question, stat, or bold claim
2. Value: Focus on benefits, not features
3. Story: Use examples or scenarios when possible
4. Scannability: Short paragraphs, bullets, emojis (if platform appropriate)
5. Action: Clear next step

HASHTAG STRATEGY:
- Use 3-5 hashtags (LinkedIn), 2-3 (Twitter), 10-15 (Instagram)
- Mix popular (#Leadership) with niche (#OrganizationalCulture)
- Avoid overly generic tags (#Business)
`;
  }

  /**
   * Get platform-specific voice guidelines
   */
  private getPlatformVoiceGuidelines(platform: string): string {
    const guidelines: Record<string, string> = {
      linkedin: `
Professional yet conversational. Thought leadership tone.
- Use data and insights
- Formal but not stuffy
- Position as authority
- Length: 150-300 words
      `,
      twitter: `
Concise, punchy, quotable. Hot takes welcome.
- Get to the point fast
- Use threads for complex topics
- Conversational and direct
- Length: 100-280 characters (or thread)
      `,
      instagram: `
Visual storytelling, inspirational, human.
- Complement the visual
- Use emojis liberally
- Break into short lines
- Length: 100-200 words
      `,
      medium: `
In-depth, analytical, educational.
- Long-form storytelling
- Section headers
- Data and examples
- Length: 800-1500 words
      `
    };

    return guidelines[platform] || guidelines.linkedin;
  }

  /**
   * Get content pillar guidelines
   */
  private getContentPillarGuidelines(pillar: string): string {
    const guidelines: Record<string, string> = {
      'framework-education': `
Goal: Teach the 7-Cylinder Framework in digestible pieces
Approach: Explain one concept deeply, use examples, show why it matters
Format: Educational but engaging, not academic
      `,
      'problem-solution': `
Goal: Show organizational pain points Mizan solves
Approach: Describe problem → explain root cause → present solution
Format: Empathetic to pain, optimistic about fix
      `,
      'product-features': `
Goal: Showcase Mizan capabilities
Approach: Lead with benefit, explain how it works, include visual
Format: Benefit-first, not feature-list
      `,
      'thought-leadership': `
Goal: Position as industry authority
Approach: Bold insights, trend analysis, provocative questions
Format: Confident, data-backed, conversation-starting
      `,
      'community': `
Goal: Build engagement and connection
Approach: Ask questions, share wins, celebrate users
Format: Warm, inclusive, interactive
      `
    };

    return guidelines[pillar] || guidelines['framework-education'];
  }

  /**
   * Get platform-specific optimization rules
   */
  private getPlatformOptimizationRules(platform: string): string {
    const rules: Record<string, string> = {
      linkedin: `
- Start with a hook (first 2 lines visible in feed)
- Use line breaks for readability
- Include emojis sparingly (1-2 per post)
- Add 3-5 relevant hashtags at the end
- Tag relevant people/companies if applicable
- Ideal length: 150-300 words
- Best times: Tuesday-Thursday, 9am-12pm
      `,
      twitter: `
- First tweet must hook or get ignored
- Use threads for complex ideas (number them: 1/5, 2/5...)
- Keep individual tweets under 280 characters
- Use emojis to break up text
- 2-3 hashtags max
- Tag relevant accounts
- Best times: Monday-Friday, 9am-3pm
      `,
      instagram: `
- Caption complements the visual (visual is primary)
- First line is the hook (only line visible before "more")
- Use emojis liberally
- Break into short, punchy lines
- 10-15 hashtags in first comment (not in caption)
- Ask a question to drive engagement
- Best times: Wednesday-Friday, 11am-2pm
      `,
      medium: `
- Compelling title (60-70 characters)
- Subtitle that expands on title
- Section headers every 200-300 words
- Use images/graphics to break up text
- Include data, quotes, examples
- End with clear takeaway or CTA
- Best day: Tuesday or Wednesday
      `
    };

    return rules[platform] || rules.linkedin;
  }

  /**
   * Get CTA strategy based on content pillar and platform
   */
  private getCTAStrategy(pillar: string, platform: string): string {
    // Framework education → Learn more
    // Problem solution → Try free tool
    // Product features → Sign up / Try now
    // Thought leadership → Engage (comment, share)
    // Community → Share your story

    const strategies: Record<string, Record<string, string>> = {
      'framework-education': {
        linkedin: 'Learn how Mizan measures alignment across all 7 Cylinders → [Link]',
        twitter: 'Learn more about the 7-Cylinder Framework → [Link]',
        instagram: 'Link in bio to learn more about the framework',
        medium: 'Read more about implementing the 7-Cylinder Framework in your organization'
      },
      'problem-solution': {
        linkedin: 'Ready to solve this? Start with a free Structure Scan → [Link]',
        twitter: 'Fix this in your org → Try our free Structure Scan [Link]',
        instagram: 'Link in bio for free structure analysis',
        medium: 'Try Mizan\'s free Structure Scan to diagnose your organization'
      },
      'product-features': {
        linkedin: 'Try it now → [Link]',
        twitter: 'Get started → [Link]',
        instagram: 'Link in bio to try it free',
        medium: 'Sign up to experience this feature'
      },
      'thought-leadership': {
        linkedin: 'Agree or disagree? Share your thoughts 👇',
        twitter: 'What do you think? 💭',
        instagram: 'Drop a comment with your take 💬',
        medium: 'What\'s your experience? Leave a comment below'
      },
      'community': {
        linkedin: 'Share your story in the comments 👇',
        twitter: 'Tell us your experience 💬',
        instagram: 'Comment below! We want to hear from you 💬',
        medium: 'Join the conversation in the comments'
      }
    };

    return strategies[pillar]?.[platform] || strategies['framework-education'][platform];
  }

  /**
   * Create fallback content if JSON parsing fails
   */
  private createFallbackContent(request: SocialMediaContentRequest, aiResponse: string): SocialMediaContent {
    console.log('⚠️  Creating fallback content structure');

    // Extract hashtags from response
    const hashtagMatches = aiResponse.match(/#\w+/g) || [];
    const hashtags = hashtagMatches.slice(0, 5).map(tag => tag.substring(1));

    // Extract CTA (look for common patterns)
    const ctaMatch = aiResponse.match(/(?:→|Learn more|Try|Sign up|Get started)[^\n]+/);
    const cta = ctaMatch ? ctaMatch[0] : 'Learn more → mizan.work';

    // Clean content (remove hashtags and CTA)
    let content = aiResponse
      .replace(/#\w+/g, '')
      .replace(/(?:→|Learn more|Try|Sign up|Get started)[^\n]+/, '')
      .trim();

    return {
      platform: request.platform,
      content,
      hashtags: hashtags.length > 0 ? hashtags : ['OrganizationalCulture', 'Leadership', 'HRTech'],
      cta,
      visualSuggestion: 'Create a branded graphic with the main insight as headline',
      schedulingRecommendation: {
        dayOfWeek: this.getOptimalDay(request.platform),
        timeOfDay: this.getOptimalTime(request.platform)
      }
    };
  }

  /**
   * Get optimal posting day for platform
   */
  private getOptimalDay(platform: string): string {
    const optimalDays: Record<string, string> = {
      linkedin: 'Tuesday',
      twitter: 'Wednesday',
      instagram: 'Thursday',
      medium: 'Tuesday'
    };
    return optimalDays[platform] || 'Wednesday';
  }

  /**
   * Get optimal posting time for platform
   */
  private getOptimalTime(platform: string): string {
    const optimalTimes: Record<string, string> = {
      linkedin: '10:00 AM',
      twitter: '12:00 PM',
      instagram: '1:00 PM',
      medium: '9:00 AM'
    };
    return optimalTimes[platform] || '10:00 AM';
  }

  /**
   * Generate a batch of content for the week
   */
  async generateWeeklyBatch(week: number): Promise<SocialMediaContent[]> {
    console.log(`📅 Generating weekly content batch for Week ${week}`);

    const weeklyPlan = this.getWeeklyPlan(week);
    const contentBatch: SocialMediaContent[] = [];

    for (const item of weeklyPlan) {
      try {
        const content = await this.generateContent(item);
        contentBatch.push(content);
      } catch (error) {
        console.error(`Failed to generate content for ${item.topic}:`, error);
      }
    }

    return contentBatch;
  }

  /**
   * Get weekly content plan based on strategy
   */
  private getWeeklyPlan(week: number): SocialMediaContentRequest[] {
    // Week 1: Foundation
    const week1: SocialMediaContentRequest[] = [
      {
        platform: 'linkedin',
        contentPillar: 'product-features',
        topic: 'Platform announcement: Introducing Mizan',
        targetAudience: 'HR leaders, executives'
      },
      {
        platform: 'linkedin',
        contentPillar: 'problem-solution',
        topic: 'The culture crisis: Why annual surveys fail',
        targetAudience: 'HR leaders'
      },
      {
        platform: 'linkedin',
        contentPillar: 'framework-education',
        topic: 'Cylinder 1: Safety & Survival - The foundation of trust',
        targetAudience: 'All professionals'
      },
      {
        platform: 'twitter',
        contentPillar: 'product-features',
        topic: 'Free Structure Scan announcement',
        targetAudience: 'Startup founders, HR tech enthusiasts'
      },
      {
        platform: 'linkedin',
        contentPillar: 'thought-leadership',
        topic: 'The future of organizational culture: From surveys to real-time diagnosis',
        targetAudience: 'Executives, consultants'
      }
    ];

    // Week 2: Framework Education
    const week2: SocialMediaContentRequest[] = [
      {
        platform: 'linkedin',
        contentPillar: 'framework-education',
        topic: 'Cylinder 2: Belonging & Connection - Building team bonds',
        targetAudience: 'All professionals'
      },
      {
        platform: 'linkedin',
        contentPillar: 'framework-education',
        topic: 'Mizan vs. Maslow: Why we need a new framework for work',
        targetAudience: 'HR leaders, organizational psychologists'
      },
      {
        platform: 'linkedin',
        contentPillar: 'framework-education',
        topic: 'Cylinder 3: Identity & Recognition - Being seen and valued',
        targetAudience: 'All professionals'
      },
      {
        platform: 'twitter',
        contentPillar: 'problem-solution',
        topic: 'Misalignment costs: What culture gaps are costing your company',
        targetAudience: 'Executives, CFOs'
      },
      {
        platform: 'linkedin',
        contentPillar: 'community',
        topic: 'Share: What does recognition mean to you?',
        targetAudience: 'All professionals'
      }
    ];

    const weeks = [week1, week2];
    return weeks[week - 1] || week1;
  }
}
