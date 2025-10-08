import { Router, Request, Response } from 'express';
import { SocialMediaAgent, SocialMediaInput } from '../services/agents/social-media-agent.js';
import { authenticateToken } from '../middleware/auth.js';
import { LinkedInService } from '../services/linkedin-service.js';

const router = Router();

/**
 * POST /api/social-media/generate
 * Generate a single social media post
 */
router.post('/generate', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { platform, contentPillar, topic, targetAudience, includeVisuals } = req.body;

    // Validate required fields
    if (!platform || !contentPillar || !topic) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: platform, contentPillar, topic'
      });
    }

    // Validate platform
    const validPlatforms = ['linkedin', 'twitter', 'instagram', 'medium'];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({
        success: false,
        error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}`
      });
    }

    // Validate content pillar
    const validPillars = ['framework-education', 'problem-solution', 'product-features', 'thought-leadership', 'community'];
    if (!validPillars.includes(contentPillar)) {
      return res.status(400).json({
        success: false,
        error: `Invalid content pillar. Must be one of: ${validPillars.join(', ')}`
      });
    }

    const input: SocialMediaInput = {
      platform,
      contentPillar,
      topic,
      targetAudience,
      includeVisuals
    };

    const agent = new SocialMediaAgent();
    const result = await agent.generateContent(input);

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error: any) {
    console.error('Social media generation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate social media content'
    });
  }
});

/**
 * POST /api/social-media/generate-batch
 * Generate a batch of social media posts for a week
 */
router.post('/generate-batch', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { week } = req.body;

    if (!week || typeof week !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Week number is required and must be a number'
      });
    }

    // Weekly content strategy
    const weeklyStrategy = getWeeklyStrategy(week);

    const agent = new SocialMediaAgent();
    const batchResults = [];

    // Generate content for each post in the week
    for (const postPlan of weeklyStrategy.posts) {
      const input: SocialMediaInput = {
        platform: postPlan.platform,
        contentPillar: postPlan.contentPillar,
        topic: postPlan.topic,
        includeVisuals: postPlan.includeVisuals
      };

      const result = await agent.generateContent(input);
      batchResults.push({
        ...result,
        day: postPlan.day,
        postPlan
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        week,
        theme: weeklyStrategy.theme,
        content: batchResults
      }
    });

  } catch (error: any) {
    console.error('Batch generation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate batch content'
    });
  }
});

/**
 * GET /api/social-media/templates
 * Get available content templates and examples
 */
router.get('/templates', authenticateToken, async (req: Request, res: Response) => {
  try {
    const templates = {
      platforms: [
        { id: 'linkedin', name: 'LinkedIn', description: 'Professional network' },
        { id: 'twitter', name: 'Twitter/X', description: 'Short-form, viral' },
        { id: 'instagram', name: 'Instagram', description: 'Visual storytelling' },
        { id: 'medium', name: 'Medium', description: 'Long-form articles' }
      ],
      contentPillars: [
        { id: 'framework-education', name: 'Framework Education', description: 'Teach 7-Cylinder concepts' },
        { id: 'problem-solution', name: 'Problem → Solution', description: 'Show pain points and fixes' },
        { id: 'product-features', name: 'Product Features', description: 'Showcase Mizan capabilities' },
        { id: 'thought-leadership', name: 'Thought Leadership', description: 'Industry insights and trends' },
        { id: 'community', name: 'Community Building', description: 'Engage and connect' }
      ],
      topicExamples: {
        'framework-education': [
          'Cylinder 1: Safety & Survival - The Foundation',
          'Cylinder 4: Meaning & Contribution Explained',
          'Why 7 Cylinders Instead of a Pyramid?',
          'Enabling vs Limiting Values'
        ],
        'problem-solution': [
          'Cultural Entropy: The Silent Killer',
          'When Values Don\'t Match Reality',
          'Structural Bottlenecks Slow Growth',
          'The Cost of Misalignment'
        ],
        'product-features': [
          'Three-Engine AI Architecture',
          'Multi-AI Consensus for Better Insights',
          'Structure Analysis in Action',
          'Culture Mapping Technology'
        ],
        'thought-leadership': [
          'The Future of Organizational Culture',
          'AI Ethics in HR Tech',
          'Beyond Engagement Surveys',
          'Measuring What Actually Matters'
        ],
        'community': [
          'What is your most important value at work?',
          'Share a time culture made a difference',
          'Poll: Which cylinder resonates most?',
          'Your culture assessment story'
        ]
      }
    };

    return res.status(200).json({
      success: true,
      data: templates
    });

  } catch (error: any) {
    console.error('Templates fetch error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch templates'
    });
  }
});

/**
 * GET /api/social-media/strategy
 * Get the 12-week content strategy overview
 */
router.get('/strategy', authenticateToken, async (req: Request, res: Response) => {
  try {
    const strategy = {
      overview: 'A 12-week social media strategy focused on educating about the Mizan Framework',
      weeks: [
        { week: 1, theme: 'Foundation: What is Mizan?', focus: 'Brand introduction, problem identification' },
        { week: 2, theme: 'Framework Education: 7 Cylinders Overview', focus: 'Introduce the framework structure' },
        { week: 3, theme: 'Deep Dive: Cylinders 1-2', focus: 'Safety & Survival, Belonging & Loyalty' },
        { week: 4, theme: 'Deep Dive: Cylinders 3-4', focus: 'Growth & Achievement, Meaning & Contribution' },
        { week: 5, theme: 'Deep Dive: Cylinders 5-6', focus: 'Integrity & Justice, Wisdom & Compassion' },
        { week: 6, theme: 'Deep Dive: Cylinder 7', focus: 'Transcendence & Unity' },
        { week: 7, theme: 'Product Features: Structure Analysis', focus: 'How we analyze org charts' },
        { week: 8, theme: 'Product Features: Culture Mapping', focus: 'Culture assessment technology' },
        { week: 9, theme: 'Thought Leadership: Cultural Entropy', focus: 'The cost of misalignment' },
        { week: 10, theme: 'Case Studies & Success Stories', focus: 'Real-world transformations' },
        { week: 11, theme: 'Community Engagement', focus: 'User stories, polls, discussions' },
        { week: 12, theme: 'Vision & Future', focus: 'Where organizational culture is heading' }
      ]
    };

    return res.status(200).json({
      success: true,
      data: strategy
    });

  } catch (error: any) {
    console.error('Strategy fetch error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch strategy'
    });
  }
});

/**
 * Helper function: Get weekly content strategy based on week number
 */
function getWeeklyStrategy(week: number): any {
  const strategies: Record<number, any> = {
    1: {
      theme: 'Foundation: What is Mizan?',
      posts: [
        {
          day: 'Monday',
          platform: 'linkedin',
          contentPillar: 'problem-solution',
          topic: 'Cultural misalignment costs companies millions annually',
          includeVisuals: true
        },
        {
          day: 'Wednesday',
          platform: 'twitter',
          contentPillar: 'framework-education',
          topic: 'What is the Mizan Framework?',
          includeVisuals: false
        },
        {
          day: 'Friday',
          platform: 'linkedin',
          contentPillar: 'product-features',
          topic: 'Meet Mizan: The AI-powered culture platform',
          includeVisuals: true
        }
      ]
    },
    2: {
      theme: 'Framework Education: 7 Cylinders Overview',
      posts: [
        {
          day: 'Monday',
          platform: 'linkedin',
          contentPillar: 'framework-education',
          topic: 'The 7-Cylinder Framework: An Introduction',
          includeVisuals: true
        },
        {
          day: 'Wednesday',
          platform: 'instagram',
          contentPillar: 'framework-education',
          topic: 'Visual guide to the 7 Cylinders',
          includeVisuals: true
        },
        {
          day: 'Friday',
          platform: 'medium',
          contentPillar: 'framework-education',
          topic: 'Why Cylinders, Not a Pyramid? The Mizan Framework Explained',
          includeVisuals: true
        }
      ]
    }
  };

  // Default strategy if week not defined
  if (!strategies[week]) {
    return {
      theme: `Week ${week} Content`,
      posts: [
        {
          day: 'Monday',
          platform: 'linkedin',
          contentPillar: 'framework-education',
          topic: `7-Cylinder Framework insights for week ${week}`,
          includeVisuals: true
        },
        {
          day: 'Wednesday',
          platform: 'twitter',
          contentPillar: 'thought-leadership',
          topic: 'Organizational culture trends',
          includeVisuals: false
        },
        {
          day: 'Friday',
          platform: 'linkedin',
          contentPillar: 'community',
          topic: 'Share your culture insights',
          includeVisuals: false
        }
      ]
    };
  }

  return strategies[week];
}

// ============================================
// LINKEDIN DIRECT POSTING
// ============================================

/**
 * GET /api/social-media/linkedin/auth-url
 * Get LinkedIn OAuth authorization URL
 */
router.get('/linkedin/auth-url', authenticateToken, async (req: Request, res: Response) => {
  try {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI || `${process.env.CLIENT_URL}/dashboard/superadmin/social-media/callback`;

    if (!clientId) {
      return res.status(500).json({
        success: false,
        error: 'LinkedIn Client ID not configured'
      });
    }

    const state = Math.random().toString(36).substring(7);
    const authUrl = LinkedInService.getAuthorizationUrl(
      clientId,
      redirectUri,
      state,
      ['w_member_social', 'r_liteprofile']
    );

    return res.status(200).json({
      success: true,
      data: {
        authUrl,
        state
      }
    });

  } catch (error: any) {
    console.error('LinkedIn auth URL error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate auth URL'
    });
  }
});

/**
 * POST /api/social-media/linkedin/callback
 * Handle LinkedIn OAuth callback and exchange code for token
 */
router.post('/linkedin/callback', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI || `${process.env.CLIENT_URL}/dashboard/superadmin/social-media/callback`;

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        success: false,
        error: 'LinkedIn credentials not configured'
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required'
      });
    }

    const tokenData = await LinkedInService.getAccessToken(
      code,
      clientId,
      clientSecret,
      redirectUri
    );

    // In production, save this token to database associated with user
    // For now, return it to frontend to store
    return res.status(200).json({
      success: true,
      data: {
        accessToken: tokenData.accessToken,
        expiresIn: tokenData.expiresIn
      }
    });

  } catch (error: any) {
    console.error('LinkedIn callback error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to exchange authorization code'
    });
  }
});

/**
 * POST /api/social-media/linkedin/post
 * Post directly to LinkedIn
 */
router.post('/linkedin/post', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { content, accessToken, visibility } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'LinkedIn access token is required'
      });
    }

    const linkedInService = new LinkedInService(accessToken);
    const post = await linkedInService.createPost({
      text: content,
      visibility: visibility || 'PUBLIC'
    });

    return res.status(200).json({
      success: true,
      data: {
        message: 'Posted to LinkedIn successfully',
        post
      }
    });

  } catch (error: any) {
    console.error('LinkedIn post error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to post to LinkedIn'
    });
  }
});

/**
 * GET /api/social-media/linkedin/profile
 * Get authenticated user's LinkedIn profile
 */
router.get('/linkedin/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const accessToken = req.headers['x-linkedin-token'] as string;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'LinkedIn access token required in x-linkedin-token header'
      });
    }

    const linkedInService = new LinkedInService(accessToken);
    const profile = await linkedInService.getProfile();

    return res.status(200).json({
      success: true,
      data: profile
    });

  } catch (error: any) {
    console.error('LinkedIn profile error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch LinkedIn profile'
    });
  }
});

export default router;
