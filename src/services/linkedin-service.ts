import axios from 'axios';

const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';
const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2';

import { logger } from './logger';
export interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
}

export interface LinkedInPostInput {
  text: string;
  visibility?: 'PUBLIC' | 'CONNECTIONS';
}

export interface LinkedInPostResponse {
  id: string;
  created: number;
  text: string;
  visibility: string;
}

export class LinkedInService {
  private accessToken: string;

  constructor(accessToken?: string) {
    this.accessToken = accessToken || process.env.LINKEDIN_ACCESS_TOKEN || '';

    if (!this.accessToken) {
      logger.warn('⚠️  LINKEDIN_ACCESS_TOKEN not configured');
    }
  }

  /**
   * Get OAuth authorization URL for LinkedIn
   * User clicks this to grant permission
   */
  static getAuthorizationUrl(
    clientId: string,
    redirectUri: string,
    state: string,
    scopes: string[] = ['w_member_social', 'r_liteprofile']
  ): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state: state,
      scope: scopes.join(' ')
    });

    return `${LINKEDIN_AUTH_URL}/authorization?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   * Called after user authorizes the app
   */
  static async getAccessToken(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      const response = await axios.post(
        `${LINKEDIN_AUTH_URL}/accessToken`,
        null,
        {
          params: {
            grant_type: 'authorization_code',
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in
      };
    } catch (error) {
      const e = error as { response?: { data?: { error_description?: string; message?: string } }; message?: string };
      logger.error('LinkedIn token exchange error:', e.response?.data || e.message);
      throw new Error(`Failed to get LinkedIn access token: ${e.response?.data?.error_description || e.message}`);
    }
  }

  /**
   * Get authenticated user's profile
   */
  async getProfile(): Promise<LinkedInProfile> {
    if (!this.accessToken) {
      throw new Error('LinkedIn access token not configured');
    }

    try {
      const response = await axios.get(`${LINKEDIN_API_BASE}/me`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0'
        }
      });

      return {
        id: response.data.id,
        firstName: response.data.localizedFirstName || response.data.firstName?.localized?.en_US,
        lastName: response.data.localizedLastName || response.data.lastName?.localized?.en_US,
        profilePicture: response.data.profilePicture
      };
    } catch (error) {
      const e = error as { response?: { data?: { message?: string } }; message?: string };
      logger.error('LinkedIn getProfile error:', e.response?.data || e.message);
      throw new Error(`Failed to fetch LinkedIn profile: ${e.response?.data?.message || e.message}`);
    }
  }

  /**
   * Create a text post on LinkedIn
   * Posts to the authenticated user's feed
   */
  async createPost(input: LinkedInPostInput): Promise<LinkedInPostResponse> {
    if (!this.accessToken) {
      throw new Error('LinkedIn access token not configured');
    }

    try {
      // First, get the user's person URN
      const profile = await this.getProfile();
      const personUrn = `urn:li:person:${profile.id}`;

      // Create the post using UGC (User Generated Content) API
      const postData = {
        author: personUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: input.text
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': input.visibility || 'PUBLIC'
        }
      };

      const response = await axios.post(
        `${LINKEDIN_API_BASE}/ugcPosts`,
        postData,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );

      return {
        id: response.data.id,
        created: Date.now(),
        text: input.text,
        visibility: input.visibility || 'PUBLIC'
      };
    } catch (error) {
      const e = error as { response?: { data?: { message?: string } }; message?: string };
      logger.error('LinkedIn createPost error:', e.response?.data || e.message);
      throw new Error(`Failed to create LinkedIn post: ${e.response?.data?.message || e.message}`);
    }
  }

  /**
   * Get post statistics (likes, comments, shares)
   * Note: Requires additional permissions
   * Compliant with AGENT_CONTEXT_ULTIMATE.md - Strict TypeScript types
   */
  async getPostStats(postUrn: string): Promise<{ likes: number; comments: number; shares: number; impressions: number }> {
    if (!this.accessToken) {
      throw new Error('LinkedIn access token not configured');
    }

    try {
      const response = await axios.get(
        `${LINKEDIN_API_BASE}/socialActions/${postUrn}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );

      return response.data;
    } catch (error) {
      const e = error as { response?: { data?: { message?: string } }; message?: string };
      logger.error('LinkedIn getPostStats error:', e.response?.data || e.message);
      throw new Error(`Failed to fetch post stats: ${e.response?.data?.message || e.message}`);
    }
  }

  /**
   * Validate access token
   * Returns true if token is valid
   */
  async validateToken(): Promise<boolean> {
    try {
      await this.getProfile();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const linkedInService = new LinkedInService();
