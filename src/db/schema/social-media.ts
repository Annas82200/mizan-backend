// db/schema/social-media.ts
import { pgTable, text, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

export const socialMediaPosts = pgTable('social_media_posts', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  companyId: text('company_id').notNull(),

  // Post content
  platform: text('platform').notNull(), // linkedin, twitter, facebook, instagram
  content: text('content').notNull(),
  mediaUrls: jsonb('media_urls').$type<string[]>(),
  hashtags: jsonb('hashtags').$type<string[]>(),

  // Campaign
  campaignId: text('campaign_id'),
  campaignType: text('campaign_type'), // platform_education, framework_showcase, feature_highlight, success_story

  // Scheduling
  status: text('status').notNull(), // draft, scheduled, published, failed
  scheduledFor: timestamp('scheduled_for'),
  publishedAt: timestamp('published_at'),

  // Platform specific IDs
  platformPostId: text('platform_post_id'),

  // Engagement metrics
  likes: integer('likes').default(0),
  shares: integer('shares').default(0),
  comments: integer('comments').default(0),
  impressions: integer('impressions').default(0),
  clicks: integer('clicks').default(0),

  // Metadata
  metadata: jsonb('metadata'),
  errorMessage: text('error_message'),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),

  // Created by
  createdBy: text('created_by')
});

export const socialMediaCampaigns = pgTable('social_media_campaigns', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  companyId: text('company_id').notNull(),

  // Campaign details
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull(), // platform_education, framework_showcase, etc.

  // Targeting
  platforms: jsonb('platforms').$type<string[]>(),
  frequency: text('frequency'), // daily, weekly, monthly

  // Status
  status: text('status').notNull(), // active, paused, completed

  // Metrics
  totalPosts: integer('total_posts').default(0),
  totalEngagement: integer('total_engagement').default(0),

  // Dates
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),

  createdBy: text('created_by')
});

export const socialMediaAccounts = pgTable('social_media_accounts', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  companyId: text('company_id').notNull(),

  // Account details
  platform: text('platform').notNull(),
  accountName: text('account_name').notNull(),
  accountId: text('account_id'),

  // Authentication
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  tokenExpiresAt: timestamp('token_expires_at'),

  // Status
  isActive: boolean('is_active').default(true),
  lastSyncedAt: timestamp('last_synced_at'),

  // Metadata
  metadata: jsonb('metadata'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});
