import axios from 'axios';

const BUFFER_API_BASE = 'https://api.bufferapp.com/1';

export interface BufferProfile {
  id: string;
  service: 'linkedin' | 'twitter' | 'facebook' | 'instagram';
  formatted_service: string;
  formatted_username: string;
}

export interface BufferScheduleInput {
  profileIds: string[]; // Buffer profile IDs to post to
  text: string; // Post content
  scheduledAt?: string; // ISO timestamp, or omit for queue
  media?: {
    photo?: string; // URL to image
  };
  shorten?: boolean; // Shorten links (default true)
}

export interface BufferPost {
  id: string;
  text: string;
  profile_service: string;
  status: 'buffer' | 'sent' | 'failed';
  scheduled_at: number;
  sent_at?: number;
  due_at?: number;
}

export class BufferService {
  private accessToken: string;

  constructor(accessToken?: string) {
    this.accessToken = accessToken || process.env.BUFFER_ACCESS_TOKEN || '';

    if (!this.accessToken) {
      console.warn('⚠️  BUFFER_ACCESS_TOKEN not configured');
    }
  }

  /**
   * Get all connected Buffer profiles (social media accounts)
   */
  async getProfiles(): Promise<BufferProfile[]> {
    if (!this.accessToken) {
      throw new Error('Buffer access token not configured');
    }

    try {
      const response = await axios.get(`${BUFFER_API_BASE}/profiles.json`, {
        params: { access_token: this.accessToken }
      });

      return response.data;
    } catch (error: any) {
      console.error('Buffer getProfiles error:', error.response?.data || error.message);
      throw new Error(`Failed to fetch Buffer profiles: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Create a new post in Buffer's queue or schedule for specific time
   */
  async createPost(input: BufferScheduleInput): Promise<BufferPost[]> {
    if (!this.accessToken) {
      throw new Error('Buffer access token not configured');
    }

    if (!input.profileIds || input.profileIds.length === 0) {
      throw new Error('At least one Buffer profile ID is required');
    }

    try {
      const posts: BufferPost[] = [];

      // Buffer requires separate API call for each profile
      for (const profileId of input.profileIds) {
        const payload: any = {
          text: input.text,
          profile_ids: [profileId],
          access_token: this.accessToken,
          shorten: input.shorten !== false,
        };

        // Add scheduled time if provided
        if (input.scheduledAt) {
          payload.scheduled_at = new Date(input.scheduledAt).getTime() / 1000; // Unix timestamp
        } else {
          payload.now = false; // Add to queue
        }

        // Add media if provided
        if (input.media?.photo) {
          payload.media = {
            photo: input.media.photo
          };
        }

        const response = await axios.post(
          `${BUFFER_API_BASE}/updates/create.json`,
          null,
          { params: payload }
        );

        if (response.data.success) {
          posts.push(response.data.updates[0]);
        } else {
          console.error(`Failed to create post for profile ${profileId}:`, response.data);
        }
      }

      return posts;
    } catch (error: any) {
      console.error('Buffer createPost error:', error.response?.data || error.message);
      throw new Error(`Failed to schedule post to Buffer: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get pending posts in Buffer queue
   */
  async getPendingPosts(profileId: string): Promise<BufferPost[]> {
    if (!this.accessToken) {
      throw new Error('Buffer access token not configured');
    }

    try {
      const response = await axios.get(
        `${BUFFER_API_BASE}/profiles/${profileId}/updates/pending.json`,
        {
          params: { access_token: this.accessToken }
        }
      );

      return response.data.updates || [];
    } catch (error: any) {
      console.error('Buffer getPendingPosts error:', error.response?.data || error.message);
      throw new Error(`Failed to fetch pending posts: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Delete a scheduled post from Buffer
   */
  async deletePost(postId: string): Promise<boolean> {
    if (!this.accessToken) {
      throw new Error('Buffer access token not configured');
    }

    try {
      const response = await axios.post(
        `${BUFFER_API_BASE}/updates/${postId}/destroy.json`,
        null,
        {
          params: { access_token: this.accessToken }
        }
      );

      return response.data.success === true;
    } catch (error: any) {
      console.error('Buffer deletePost error:', error.response?.data || error.message);
      throw new Error(`Failed to delete post: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get analytics for a sent post
   */
  async getPostAnalytics(postId: string): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Buffer access token not configured');
    }

    try {
      const response = await axios.get(
        `${BUFFER_API_BASE}/updates/${postId}.json`,
        {
          params: { access_token: this.accessToken }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Buffer getPostAnalytics error:', error.response?.data || error.message);
      throw new Error(`Failed to fetch post analytics: ${error.response?.data?.message || error.message}`);
    }
  }
}

// Export singleton instance
export const bufferService = new BufferService();
