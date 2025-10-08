import express, { Request, Response } from 'express';
import { SocialMediaAgent, SocialMediaContentRequest } from '../services/agents/social-media-agent.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();
const socialMediaAgent = new SocialMediaAgent();

/**
 * POST /api/social-media/generate
 * Generate a single social media post
 * Requires: superadmin or admin role
 */
router.post('/generate', requireAuth, requireRole(['superadmin', 'admin']), async (req: Request, res: Response) => {
  try {
    const { platform, contentPillar, topic, includeVisuals, targetAudience } = req.body;

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

    const request: SocialMediaContentRequest = {
      platform,
      contentPillar,
      topic,
      includeVisuals,
      targetAudience
    };

    console.log(`🎨 Generating ${platform} content for: ${topic}`);

    const content = await socialMediaAgent.generateContent(request);

    return res.status(200).json({
      success: true,
      data: content
    });

  } catch (error: any) {
    console.error('Social media generation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate content',
      message: error.message
    });
  }
});

/**
 * POST /api/social-media/generate-batch
 * Generate a weekly batch of content
 * Requires: superadmin or admin role
 */
router.post('/generate-batch', requireAuth, requireRole(['superadmin', 'admin']), async (req: Request, res: Response) => {
  try {
    const { week } = req.body;

    if (!week || typeof week !== 'number' || week < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid week number. Must be a positive integer.'
      });
    }

    console.log(`📅 Generating weekly content batch for Week ${week}`);

    const contentBatch = await socialMediaAgent.generateWeeklyBatch(week);

    return res.status(200).json({
      success: true,
      data: {
        week,
        count: contentBatch.length,
        content: contentBatch
      }
    });

  } catch (error: any) {
    console.error('Batch generation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate batch',
      message: error.message
    });
  }
});

/**
 * GET /api/social-media/templates
 * Get available content templates
 */
router.get('/templates', requireAuth, requireRole(['superadmin', 'admin']), async (req: Request, res: Response) => {
  try {
    const templates = {
      platforms: ['linkedin', 'twitter', 'instagram', 'medium'],
      contentPillars: [
        {
          id: 'framework-education',
          name: 'Framework Education',
          description: 'Explain the 7-Cylinder Framework in digestible pieces',
          frequency: '2x/week'
        },
        {
          id: 'problem-solution',
          name: 'Problem → Solution Stories',
          description: 'Show real organizational pain points Mizan solves',
          frequency: '3x/week'
        },
        {
          id: 'product-features',
          name: 'Platform Features & Updates',
          description: 'Showcase Mizan capabilities',
          frequency: '1x/week'
        },
        {
          id: 'thought-leadership',
          name: 'Thought Leadership',
          description: 'Industry insights, trends, predictions',
          frequency: '1x/week'
        },
        {
          id: 'community',
          name: 'Community Building',
          description: 'Engage with audience, share wins',
          frequency: 'Daily engagement'
        }
      ],
      examples: [
        {
          platform: 'linkedin',
          pillar: 'framework-education',
          topic: 'Cylinder 1: Safety & Survival',
          sample: '🎯 Safety & Survival: The Foundation of Trust\n\nWithout foundational security, nothing else matters...'
        },
        {
          platform: 'twitter',
          pillar: 'problem-solution',
          topic: 'The cost of misalignment',
          sample: '💡 Cultural misalignment costs companies 20-30% of annual revenue.\n\nThe problem: Annual surveys that sit on shelves...'
        },
        {
          platform: 'linkedin',
          pillar: 'product-features',
          topic: 'Free Structure Scan',
          sample: '🚀 New: Free Structure Scan\n\nUpload your org chart, get instant insights...'
        }
      ]
    };

    return res.status(200).json({
      success: true,
      data: templates
    });

  } catch (error: any) {
    console.error('Templates fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch templates'
    });
  }
});

/**
 * GET /api/social-media/strategy
 * Get the full social media strategy
 */
router.get('/strategy', requireAuth, requireRole(['superadmin', 'admin']), async (req: Request, res: Response) => {
  try {
    const strategy = {
      contentPillars: [
        {
          name: 'Framework Education',
          frequency: '2x/week',
          platforms: ['LinkedIn', 'Twitter', 'Instagram'],
          goal: 'Build thought leadership and educate market'
        },
        {
          name: 'Problem → Solution',
          frequency: '3x/week',
          platforms: ['LinkedIn', 'Twitter'],
          goal: 'Connect emotionally, demonstrate value'
        },
        {
          name: 'Platform Features',
          frequency: '1x/week',
          platforms: ['LinkedIn', 'Twitter', 'Product Hunt'],
          goal: 'Drive signups and conversions'
        },
        {
          name: 'Thought Leadership',
          frequency: '1x/week',
          platforms: ['LinkedIn', 'Medium'],
          goal: 'Position as authority'
        },
        {
          name: 'Community Building',
          frequency: 'Daily engagement',
          platforms: ['LinkedIn', 'Twitter', 'Instagram'],
          goal: 'Build loyal community'
        }
      ],
      platformStrategy: {
        linkedin: {
          audience: 'HR leaders, executives, consultants',
          goal: 'Lead generation, thought leadership',
          contentMix: '60% Educational, 25% Problem/Solution, 15% Product',
          postingSchedule: {
            monday: 'Framework Education',
            tuesday: 'Problem → Solution',
            wednesday: 'Thought Leadership',
            thursday: 'Product Feature',
            friday: 'Community/Engagement'
          }
        },
        twitter: {
          audience: 'Startup founders, tech leaders, early adopters',
          goal: 'Brand awareness, viral potential',
          contentMix: '50% Quick insights, 30% Engagement, 20% Product',
          postingSchedule: {
            daily_9am: 'Insight/Tip',
            daily_3pm: 'Engagement/Question'
          }
        },
        instagram: {
          audience: 'Employees, culture enthusiasts, visual learners',
          goal: 'Brand building, culture storytelling',
          contentMix: '70% Visual framework, 20% Employee stories, 10% Behind-the-scenes',
          postingSchedule: '3x/week Framework visuals, 2x/week Stories'
        },
        medium: {
          audience: 'Deep readers, researchers',
          goal: 'SEO, thought leadership',
          contentMix: 'Long-form articles expanding on framework concepts',
          postingSchedule: '1x/week'
        }
      },
      successMetrics: {
        month1: {
          linkedinFollowers: 500,
          structureScanSignups: 50,
          engagementRate: '5%',
          viralPosts: 3
        },
        month3: {
          linkedinFollowers: 2000,
          structureScanSignups: 200,
          engagementRate: '8%',
          earnedMedia: 1
        },
        month6: {
          linkedinFollowers: 5000,
          structureScanSignups: 500,
          engagementRate: '10%',
          payingCustomers: 50
        }
      }
    };

    return res.status(200).json({
      success: true,
      data: strategy
    });

  } catch (error: any) {
    console.error('Strategy fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch strategy'
    });
  }
});

export default router;
