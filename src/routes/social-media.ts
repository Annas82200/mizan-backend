import { Router, Response } from 'express';

import { z } from 'zod';

import { db } from '../../db/index';

import { socialMediaPosts, socialMediaCampaigns, socialMediaAccounts } from '../../db/schema/social-media';

import { eq, and, desc } from 'drizzle-orm';

import { authenticate } from '../middleware/auth';

import { Request } from 'express';


// Define AuthenticatedRequest interface - matches AuthenticatedUser from middleware
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    tenantId: string;
    email: string;
    name: string;
    role: string;
    departmentId?: string;
    managerId?: string;
  };
}
import { randomUUID } from 'crypto';

import { LinkedInService } from '../services/linkedin-service';

import { SocialMediaContentGenerator } from '../services/social-media/content-generator';
import { logger } from '../services/logger';


const router = Router();

// Content generation request schema
const generateContentSchema = z.object({
  platform: z.enum(['linkedin', 'twitter', 'facebook', 'instagram']),
  contentPillar: z.enum(['framework-education', 'feature-highlight', 'success-story', 'industry-insights', 'platform-benefits']),
  topic: z.string().min(1),
  targetAudience: z.string().min(1),
  includeVisuals: z.boolean().optional().default(true),
  tone: z.enum(['professional', 'conversational', 'inspirational', 'educational']).optional().default('professional')
});

// Batch generation request schema
const generateBatchSchema = z.object({
  week: z.number().min(1).max(12)
});

// Post creation schema
const createPostSchema = z.object({
  platform: z.string(),
  content: z.string(),
  hashtags: z.array(z.string()).optional(),
  scheduledFor: z.string().optional(),
  campaignId: z.string().optional()
});

/**
 * Generate single social media post content
 * Uses Three-Engine Architecture for AI-powered content generation
 */
router.post('/generate', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = generateContentSchema.parse(req.body);
    
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Initialize content generator with Three-Engine Architecture
    const contentGenerator = new SocialMediaContentGenerator(req.user.tenantId);
    
    // Generate content using AI engines
    const generatedContent = await contentGenerator.generateContent({
      platform: validatedData.platform,
      contentPillar: validatedData.contentPillar,
      topic: validatedData.topic,
      targetAudience: validatedData.targetAudience,
      includeVisuals: validatedData.includeVisuals,
      tone: validatedData.tone
    });

    // Save draft to database
    const postId = randomUUID();
    await db.insert(socialMediaPosts).values({
      id: postId,
      tenantId: req.user.tenantId,
      companyId: req.user.tenantId,
      platform: validatedData.platform,
      content: generatedContent.content,
      hashtags: generatedContent.hashtags,
      campaignType: validatedData.contentPillar,
      status: 'draft',
      metadata: {
        topic: validatedData.topic,
        targetAudience: validatedData.targetAudience,
        tone: validatedData.tone,
        visualSuggestions: generatedContent.visualSuggestions
      },
      createdBy: req.user.id
    });

    res.json({
      success: true,
      data: {
        postId,
        content: generatedContent.content,
        hashtags: generatedContent.hashtags,
        cta: generatedContent.cta,
        visualSuggestions: generatedContent.visualSuggestions,
        characterCount: generatedContent.content.length,
        platform: validatedData.platform
      }
    });
  } catch (error) {
    logger.error('Content generation error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid request data', details: error.errors });
    }
    res.status(500).json({ success: false, error: 'Failed to generate content' });
  }
});

/**
 * Generate batch of content for a specific week
 * Based on 12-week content strategy
 */
router.post('/generate-batch', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validatedData = generateBatchSchema.parse(req.body);
    
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Initialize content generator
    const contentGenerator = new SocialMediaContentGenerator(req.user.tenantId);
    
    // Get week strategy
    const weekStrategy = contentGenerator.getWeekStrategy(validatedData.week);
    
    // Generate 3 posts for the week (Monday, Wednesday, Friday)
    const posts = await contentGenerator.generateWeeklyBatch(validatedData.week);
    
    // Save all posts as drafts
    const savedPosts = [];
    for (const post of posts) {
      const postId = randomUUID();
      await db.insert(socialMediaPosts).values({
        id: postId,
        tenantId: req.user.tenantId,
        companyId: req.user.tenantId,
        platform: post.platform,
        content: post.content,
        hashtags: post.hashtags,
        campaignType: weekStrategy.contentPillar,
        status: 'draft',
        scheduledFor: post.scheduledFor,
        metadata: {
          week: validatedData.week,
          theme: weekStrategy.theme,
          day: post.day
        },
        createdBy: req.user.id
      });
      savedPosts.push({ ...post, postId });
    }

    res.json({
      success: true,
      data: {
        week: validatedData.week,
        theme: weekStrategy.theme,
        content: savedPosts
      }
    });
  } catch (error) {
    logger.error('Batch generation error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid request data', details: error.errors });
    }
    res.status(500).json({ success: false, error: 'Failed to generate batch content' });
  }
});

/**
 * Get content templates and strategy information
 */
router.get('/templates', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const templates = {
      platforms: [
        { name: 'linkedin', description: 'Professional networking platform', characterLimit: 3000 },
        { name: 'twitter', description: 'Microblogging platform', characterLimit: 280 },
        { name: 'facebook', description: 'Social networking platform', characterLimit: 63206 },
        { name: 'instagram', description: 'Visual content platform', characterLimit: 2200 }
      ],
      contentPillars: [
        { name: 'framework-education', description: 'Educate about Mizan framework cylinders and concepts' },
        { name: 'feature-highlight', description: 'Showcase platform features and capabilities' },
        { name: 'success-story', description: 'Share client success stories and case studies' },
        { name: 'industry-insights', description: 'Share HR and organizational insights' },
        { name: 'platform-benefits', description: 'Highlight benefits of using Mizan platform' }
      ],
      tones: [
        { name: 'professional', description: 'Formal and business-oriented' },
        { name: 'conversational', description: 'Friendly and approachable' },
        { name: 'inspirational', description: 'Motivating and uplifting' },
        { name: 'educational', description: 'Informative and teaching-focused' }
      ]
    };

    res.json({ success: true, data: templates });
  } catch (error) {
    logger.error('Templates retrieval error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve templates' });
  }
});

/**
 * Get 12-week content strategy
 */
router.get('/strategy', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const strategy = {
      weeks: [
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
      ],
      postingSchedule: {
        postsPerWeek: 3,
        days: ['Monday', 'Wednesday', 'Friday'],
        optimalTimes: {
          linkedin: '10:00 AM',
          twitter: '12:00 PM',
          facebook: '2:00 PM',
          instagram: '6:00 PM'
        }
      }
    };

    res.json({ success: true, data: strategy });
  } catch (error) {
    logger.error('Strategy retrieval error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve strategy' });
  }
});

/**
 * Get all posts (with tenant isolation)
 */
router.get('/posts', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const posts = await db.select()
      .from(socialMediaPosts)
      .where(eq(socialMediaPosts.tenantId, req.user.tenantId))
      .orderBy(desc(socialMediaPosts.createdAt));

    res.json({ success: true, data: posts });
  } catch (error) {
    logger.error('Posts retrieval error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve posts' });
  }
});

/**
 * Publish a post to LinkedIn
 */
router.post('/posts/:postId/publish', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { postId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Get post from database with tenant isolation
    const [post] = await db.select()
      .from(socialMediaPosts)
      .where(
        and(
          eq(socialMediaPosts.id, postId),
          eq(socialMediaPosts.tenantId, req.user.tenantId)
        )
      );

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    // Check if LinkedIn account is connected
    const [linkedInAccount] = await db.select()
      .from(socialMediaAccounts)
      .where(
        and(
          eq(socialMediaAccounts.tenantId, req.user.tenantId),
          eq(socialMediaAccounts.platform, 'linkedin'),
          eq(socialMediaAccounts.isActive, true)
        )
      );

    if (!linkedInAccount || !linkedInAccount.accessToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'LinkedIn account not connected. Please connect your LinkedIn account first.' 
      });
    }

    // Initialize LinkedIn service with access token
    const linkedInService = new LinkedInService(linkedInAccount.accessToken);

    // Format content with hashtags
    const fullContent = `${post.content}\n\n${post.hashtags ? (post.hashtags as string[]).map(tag => `#${tag}`).join(' ') : ''}`;

    // Publish to LinkedIn
    const publishedPost = await linkedInService.createPost({
      text: fullContent,
      visibility: 'PUBLIC'
    });

    // Update post status in database
    await db.update(socialMediaPosts)
      .set({
        status: 'published',
        publishedAt: new Date(),
        platformPostId: publishedPost.id,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(socialMediaPosts.id, postId),
          eq(socialMediaPosts.tenantId, req.user.tenantId)
        )
      );

    res.json({
      success: true,
      data: {
        postId,
        platformPostId: publishedPost.id,
        publishedAt: new Date(),
        status: 'published'
      }
    });
  } catch (error) {
    logger.error('Post publishing error:', error);
    res.status(500).json({ success: false, error: 'Failed to publish post' });
  }
});

/**
 * Delete a post (with tenant isolation)
 */
router.delete('/posts/:postId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { postId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Delete with tenant isolation
    await db.delete(socialMediaPosts)
      .where(
        and(
          eq(socialMediaPosts.id, postId),
          eq(socialMediaPosts.tenantId, req.user.tenantId)
        )
      );

    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    logger.error('Post deletion error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete post' });
  }
});

/**
 * Submit post performance metrics for learning
 */
router.post('/posts/:postId/metrics', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const { engagement, impressions, clicks, shares, comments } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Verify post belongs to tenant
    const [post] = await db.select()
      .from(socialMediaPosts)
      .where(
        and(
          eq(socialMediaPosts.id, postId),
          eq(socialMediaPosts.tenantId, req.user.tenantId)
        )
      );

    if (!post) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    // Update post metrics in database
    await db.update(socialMediaPosts)
      .set({
        likes: engagement || 0,
        impressions: impressions || 0,
        clicks: clicks || 0,
        shares: shares || 0,
        comments: comments || 0,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(socialMediaPosts.id, postId),
          eq(socialMediaPosts.tenantId, req.user.tenantId)
        )
      );

    // Initialize content generator and learn from metrics
    const contentGenerator = new SocialMediaContentGenerator(req.user.tenantId);
    await contentGenerator.learnFromPerformance(postId, {
      engagement: engagement || 0,
      impressions: impressions || 0,
      clicks: clicks || 0,
      shares: shares || 0,
      comments: comments || 0
    });

    res.json({ 
      success: true, 
      message: 'Metrics recorded and learning complete',
      data: {
        postId,
        metrics: { engagement, impressions, clicks, shares, comments }
      }
    });
  } catch (error) {
    logger.error('Metrics recording error:', error);
    res.status(500).json({ success: false, error: 'Failed to record metrics' });
  }
});

export default router;
