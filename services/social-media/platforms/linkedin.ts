// server/services/social-media/platforms/linkedin.ts

import { db } from '../../../db/index.js';
import { socialMediaAccounts } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export interface LinkedInPost {
  text: string;
  media?: {
    media_ids: string[];
  };
}

export interface LinkedInMediaUpload {
  media_id: string;
  media_url: string;
}

export class LinkedInService {
  private apiBaseUrl = 'https://api.linkedin.com/v2';

  async publishPost(content: string, mediaUrl?: string, accountId?: string): Promise<{ id: string; url: string }> {
    try {
      console.log('Publishing to LinkedIn:', content.substring(0, 100) + '...');

      // Get access token
      const accessToken = accountId ? await this.getAccessToken(accountId) : process.env.LINKEDIN_ACCESS_TOKEN;

      if (!accessToken) {
        throw new Error('LinkedIn access token not found. Please authenticate first.');
      }

      // Step 1: Get LinkedIn member ID (user profile)
      const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Connection': 'Keep-Alive'
        }
      });

      if (!profileResponse.ok) {
        const error = await profileResponse.json();
        throw new Error(`Failed to get LinkedIn profile: ${JSON.stringify(error)}`);
      }

      const profile = await profileResponse.json();
      const author = `urn:li:person:${profile.id}`;

      // Step 2: Create the post
      const postData = {
        author,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content
            },
            shareMediaCategory: mediaUrl ? 'IMAGE' : 'NONE',
            ...(mediaUrl && {
              media: [
                {
                  status: 'READY',
                  description: {
                    text: 'Image shared from Mizan Platform'
                  },
                  media: mediaUrl,
                  title: {
                    text: 'Organizational Culture Insights'
                  }
                }
              ]
            })
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };

      const postResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        },
        body: JSON.stringify(postData)
      });

      if (!postResponse.ok) {
        const error = await postResponse.json();
        throw new Error(`LinkedIn post failed: ${JSON.stringify(error)}`);
      }

      const result = await postResponse.json();
      const postId = result.id;

      // LinkedIn post URL format
      const postUrl = `https://www.linkedin.com/feed/update/${postId}/`;

      console.log('✅ Successfully posted to LinkedIn:', postUrl);

      return {
        id: postId,
        url: postUrl
      };
    } catch (error: any) {
      console.error('LinkedIn post failed:', error);
      throw new Error(`Failed to publish to LinkedIn: ${error.message}`);
    }
  }

  async uploadMedia(mediaUrl: string, accountId: string): Promise<LinkedInMediaUpload> {
    try {
      console.log('Uploading media to LinkedIn:', mediaUrl);

      const accessToken = await this.getAccessToken(accountId);

      if (!accessToken) {
        throw new Error('LinkedIn access token not found');
      }

      // Step 1: Register the image upload
      const registerResponse = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: `urn:li:person:${accountId}`,
            serviceRelationships: [
              {
                relationshipType: 'OWNER',
                identifier: 'urn:li:userGeneratedContent'
              }
            ]
          }
        })
      });

      if (!registerResponse.ok) {
        const error = await registerResponse.json();
        throw new Error(`Failed to register media upload: ${JSON.stringify(error)}`);
      }

      const registerData = await registerResponse.json();
      const uploadUrl = registerData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
      const asset = registerData.value.asset;

      // Step 2: Upload the image binary
      // In a real implementation, you would fetch the image from mediaUrl and upload it
      // For now, we'll return the asset URN
      const response = await fetch(mediaUrl);
      const imageBuffer = await response.arrayBuffer();

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/octet-stream'
        },
        body: imageBuffer
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload media to LinkedIn');
      }

      return {
        media_id: asset,
        media_url: mediaUrl
      };
    } catch (error) {
      console.error('LinkedIn media upload failed:', error);
      throw error;
    }
  }

  async getPostMetrics(postId: string, accountId: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken(accountId);

      if (!accessToken) {
        throw new Error('LinkedIn access token not found');
      }

      // Fetch social actions (likes, comments, shares) for the post
      const metricsResponse = await fetch(
        `https://api.linkedin.com/v2/socialActions/${postId}?projection=(likesSummary,commentsSummary)`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );

      if (!metricsResponse.ok) {
        console.warn('Failed to fetch LinkedIn metrics, using fallback');
        // Return fallback data if API fails
        return {
          likes: 0,
          comments: 0,
          shares: 0,
          impressions: 0
        };
      }

      const metricsData = await metricsResponse.json();

      return {
        likes: metricsData.likesSummary?.totalLikes || 0,
        comments: metricsData.commentsSummary?.totalComments || 0,
        shares: metricsData.sharesSummary?.totalShares || 0,
        impressions: 0 // LinkedIn doesn't provide impressions via API for individual posts
      };
    } catch (error) {
      console.error('Failed to get LinkedIn metrics:', error);
      // Return zeros instead of throwing
      return {
        likes: 0,
        comments: 0,
        shares: 0,
        impressions: 0
      };
    }
  }

  async getAccountInfo(accountId: string): Promise<any> {
    try {
      const account = await db.query.socialMediaAccounts.findFirst({
        where: eq(socialMediaAccounts.accountId, accountId)
      });

      if (!account) {
        throw new Error('LinkedIn account not found');
      }

      // In a real implementation, this would fetch account info from LinkedIn API
      return {
        id: account.accountId,
        name: 'Company LinkedIn Page',
        followers: Math.floor(Math.random() * 10000),
        profileUrl: 'https://linkedin.com/company/example'
      };
    } catch (error) {
      console.error('Failed to get LinkedIn account info:', error);
      throw error;
    }
  }

  private async getAccessToken(accountId: string): Promise<string> {
    try {
      const account = await db.query.socialMediaAccounts.findFirst({
        where: eq(socialMediaAccounts.accountId, accountId)
      });

      if (!account) {
        throw new Error('LinkedIn account not found');
      }

      return account.accessToken || '';
    } catch (error) {
      console.error('Failed to get LinkedIn access token:', error);
      throw error;
    }
  }

  private async refreshAccessToken(accountId: string): Promise<string> {
    try {
      // In a real implementation, this would refresh the access token
      // using the refresh token stored in the database
      console.log('Refreshing LinkedIn access token for account:', accountId);
      
      // Mock implementation
      const newAccessToken = `linkedin_token_${Date.now()}`;
      
      // Update the token in database
      await db.update(socialMediaAccounts)
        .set({
          accessToken: newAccessToken,
          updatedAt: new Date()
        })
        .where(eq(socialMediaAccounts.accountId, accountId));
      
      return newAccessToken;
    } catch (error) {
      console.error('Failed to refresh LinkedIn access token:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const linkedinService = new LinkedInService();

// Export convenience functions
export async function publishPost(content: string, mediaUrl?: string): Promise<{ id: string; url: string }> {
  return linkedinService.publishPost(content, mediaUrl);
}

export async function uploadMedia(mediaUrl: string, accountId: string): Promise<LinkedInMediaUpload> {
  return linkedinService.uploadMedia(mediaUrl, accountId);
}

export async function getPostMetrics(postId: string, accountId: string): Promise<any> {
  return linkedinService.getPostMetrics(postId, accountId);
}

export async function getAccountInfo(accountId: string): Promise<any> {
  return linkedinService.getAccountInfo(accountId);
}