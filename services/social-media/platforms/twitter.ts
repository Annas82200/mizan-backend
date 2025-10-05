// server/services/social-media/platforms/twitter.ts

import { TwitterApi } from 'twitter-api-v2';
import { db } from '../../../db/index.js';
import { socialMediaAccounts } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export interface TwitterPost {
  text: string;
  media?: {
    media_ids: string[];
  };
}

export class TwitterService {
  private client: TwitterApi;

  constructor() {
    this.client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_SECRET!,
    });
  }

  async publishPost(content: string, mediaUrl?: string): Promise<{ id: string; url: string }> {
    try {
      console.log('Publishing to Twitter:', content.substring(0, 50) + '...');
      
      let mediaIds: string[] = [];
      
      // Upload media if provided
      if (mediaUrl) {
        const mediaId = await this.uploadMedia(mediaUrl);
        mediaIds = [mediaId];
      }
      
      // Create the tweet
      const tweet = await this.client.v2.tweet({
        text: content,
        media: mediaIds.length > 0 ? { media_ids: mediaIds as [string] } : undefined
      });
      
      return {
        id: tweet.data.id,
        url: `https://twitter.com/user/status/${tweet.data.id}`
      };
    } catch (error) {
      console.error('Twitter post failed:', error);
      throw error;
    }
  }

  async uploadMedia(mediaUrl: string): Promise<string> {
    try {
      console.log('Uploading media to Twitter:', mediaUrl);
      
      // Download the media file
      const response = await fetch(mediaUrl);
      const buffer = await response.arrayBuffer();
      
      // Upload to Twitter
      const mediaId = await this.client.v1.uploadMedia(Buffer.from(buffer), {
        mimeType: 'image/jpeg'
      });
      
      return mediaId;
    } catch (error) {
      console.error('Twitter media upload failed:', error);
      throw error;
    }
  }

  async getPostMetrics(postId: string, accountId: string): Promise<any> {
    try {
      const tweet = await this.client.v2.singleTweet(postId, {
        'tweet.fields': ['public_metrics']
      });
      
      const metrics = tweet.data.public_metrics;
      
      return {
        impressions: metrics?.impression_count || 0,
        retweets: metrics?.retweet_count || 0,
        likes: metrics?.like_count || 0,
        replies: metrics?.reply_count || 0,
        quotes: metrics?.quote_count || 0
      };
    } catch (error) {
      console.error('Failed to get Twitter metrics:', error);
      throw error;
    }
  }

  async getAccountInfo(accountId: string): Promise<any> {
    try {
      const account = await db.query.socialMediaAccounts.findFirst({
        where: eq(socialMediaAccounts.accountId, accountId)
      });

      if (!account) {
        throw new Error('Twitter account not found');
      }

      // Get user info from Twitter API
      const user = await this.client.v2.userByUsername(accountId);
      
      return {
        id: user.data.id,
        username: user.data.username,
        name: user.data.name,
        followers: user.data.public_metrics?.followers_count || 0,
        following: user.data.public_metrics?.following_count || 0,
        tweets: user.data.public_metrics?.tweet_count || 0
      };
    } catch (error) {
      console.error('Failed to get Twitter account info:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const twitterService = new TwitterService();

// Export convenience functions
export async function publishPost(content: string, mediaUrl?: string): Promise<{ id: string; url: string }> {
  return twitterService.publishPost(content, mediaUrl);
}

export async function uploadMedia(mediaUrl: string): Promise<string> {
  return twitterService.uploadMedia(mediaUrl);
}

export async function getPostMetrics(postId: string, accountId: string): Promise<any> {
  return twitterService.getPostMetrics(postId, accountId);
}

export async function getAccountInfo(accountId: string): Promise<any> {
  return twitterService.getAccountInfo(accountId);
}