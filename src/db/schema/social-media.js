"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.socialMediaAccounts = exports.socialMediaCampaigns = exports.socialMediaPosts = void 0;
// db/schema/social-media.ts
const pg_core_1 = require("drizzle-orm/pg-core");
exports.socialMediaPosts = (0, pg_core_1.pgTable)('social_media_posts', {
    id: (0, pg_core_1.text)('id').primaryKey(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    companyId: (0, pg_core_1.uuid)('company_id').notNull(),
    // Post content
    platform: (0, pg_core_1.text)('platform').notNull(), // linkedin, twitter, facebook, instagram
    content: (0, pg_core_1.text)('content').notNull(),
    mediaUrls: (0, pg_core_1.jsonb)('media_urls').$type(),
    hashtags: (0, pg_core_1.jsonb)('hashtags').$type(),
    // Campaign
    campaignId: (0, pg_core_1.text)('campaign_id'),
    campaignType: (0, pg_core_1.text)('campaign_type'), // platform_education, framework_showcase, feature_highlight, success_story
    // Scheduling
    status: (0, pg_core_1.text)('status').notNull(), // draft, scheduled, published, failed
    scheduledFor: (0, pg_core_1.timestamp)('scheduled_for'),
    publishedAt: (0, pg_core_1.timestamp)('published_at'),
    // Platform specific IDs
    platformPostId: (0, pg_core_1.text)('platform_post_id'),
    // Engagement metrics
    likes: (0, pg_core_1.integer)('likes').default(0),
    shares: (0, pg_core_1.integer)('shares').default(0),
    comments: (0, pg_core_1.integer)('comments').default(0),
    impressions: (0, pg_core_1.integer)('impressions').default(0),
    clicks: (0, pg_core_1.integer)('clicks').default(0),
    // Metadata
    metadata: (0, pg_core_1.jsonb)('metadata'),
    errorMessage: (0, pg_core_1.text)('error_message'),
    // Timestamps
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
    // Created by
    createdBy: (0, pg_core_1.text)('created_by')
});
exports.socialMediaCampaigns = (0, pg_core_1.pgTable)('social_media_campaigns', {
    id: (0, pg_core_1.text)('id').primaryKey(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    companyId: (0, pg_core_1.uuid)('company_id').notNull(),
    // Campaign details
    name: (0, pg_core_1.text)('name').notNull(),
    description: (0, pg_core_1.text)('description'),
    type: (0, pg_core_1.text)('type').notNull(), // platform_education, framework_showcase, etc.
    // Targeting
    platforms: (0, pg_core_1.jsonb)('platforms').$type(),
    frequency: (0, pg_core_1.text)('frequency'), // daily, weekly, monthly
    // Status
    status: (0, pg_core_1.text)('status').notNull(), // active, paused, completed
    // Metrics
    totalPosts: (0, pg_core_1.integer)('total_posts').default(0),
    totalEngagement: (0, pg_core_1.integer)('total_engagement').default(0),
    // Dates
    startDate: (0, pg_core_1.timestamp)('start_date'),
    endDate: (0, pg_core_1.timestamp)('end_date'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow(),
    createdBy: (0, pg_core_1.text)('created_by')
});
exports.socialMediaAccounts = (0, pg_core_1.pgTable)('social_media_accounts', {
    id: (0, pg_core_1.text)('id').primaryKey(),
    tenantId: (0, pg_core_1.uuid)('tenant_id').notNull(),
    companyId: (0, pg_core_1.uuid)('company_id').notNull(),
    // Account details
    platform: (0, pg_core_1.text)('platform').notNull(),
    accountName: (0, pg_core_1.text)('account_name').notNull(),
    accountId: (0, pg_core_1.text)('account_id'),
    // Authentication
    accessToken: (0, pg_core_1.text)('access_token'),
    refreshToken: (0, pg_core_1.text)('refresh_token'),
    tokenExpiresAt: (0, pg_core_1.timestamp)('token_expires_at'),
    // Status
    isActive: (0, pg_core_1.boolean)('is_active').default(true),
    lastSyncedAt: (0, pg_core_1.timestamp)('last_synced_at'),
    // Metadata
    metadata: (0, pg_core_1.jsonb)('metadata'),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').notNull().defaultNow()
});
//# sourceMappingURL=social-media.js.map