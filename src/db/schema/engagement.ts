import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, integer, pgEnum, real } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const surveyStatusEnum = pgEnum('survey_status', ['draft', 'active', 'closed', 'archived']);
export const challengeStatusEnum = pgEnum('challenge_status', ['upcoming', 'active', 'completed', 'cancelled']);
export const badgeTierEnum = pgEnum('badge_tier', ['bronze', 'silver', 'gold', 'platinum']);
export const recognitionTypeEnum = pgEnum('recognition_type', ['kudos', 'shoutout', 'value_champion', 'team_mvp', 'innovation']);

// Pulse Surveys
export const pulseSurveys = pgTable('pulse_surveys', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  questions: jsonb('questions').notNull(), // [{id, text, type: 'scale'|'choice'|'text', options?, required}]
  targetAudience: jsonb('target_audience').default('{}'), // {departments?, roles?, all?}
  status: surveyStatusEnum('status').notNull().default('draft'),
  startsAt: timestamp('starts_at'),
  endsAt: timestamp('ends_at'),
  responseCount: integer('response_count').default(0),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const pulseResponses = pgTable('pulse_responses', {
  id: uuid('id').defaultRandom().primaryKey(),
  surveyId: uuid('survey_id').notNull().references(() => pulseSurveys.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  userId: uuid('user_id').notNull(),
  answers: jsonb('answers').notNull(), // [{questionId, value}]
  sentimentScore: real('sentiment_score'), // AI-calculated overall sentiment
  isAnonymous: boolean('is_anonymous').default(false),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
});

// Gamification
export const gamificationPoints = pgTable('gamification_points', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  userId: uuid('user_id').notNull(),
  points: integer('points').notNull(),
  source: varchar('source', { length: 100 }).notNull(), // course_complete, goal_achieved, recognition_given, challenge_won, etc.
  sourceId: uuid('source_id'), // reference to the source entity
  description: varchar('description', { length: 500 }),
  awardedAt: timestamp('awarded_at').defaultNow().notNull(),
});

export const badges = pgTable('badges', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  iconUrl: varchar('icon_url', { length: 1024 }),
  tier: badgeTierEnum('tier').notNull().default('bronze'),
  criteria: jsonb('criteria').notNull(), // {type: 'points_threshold'|'action_count'|'custom', value, action?}
  companyValue: varchar('company_value', { length: 255 }), // linked to specific company value
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const badgeAwards = pgTable('badge_awards', {
  id: uuid('id').defaultRandom().primaryKey(),
  badgeId: uuid('badge_id').notNull().references(() => badges.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  userId: uuid('user_id').notNull(),
  awardedBy: varchar('awarded_by', { length: 100 }).notNull(), // 'system' or userId
  reason: text('reason'),
  awardedAt: timestamp('awarded_at').defaultNow().notNull(),
});

// Challenges (company values-based)
export const challenges = pgTable('challenges', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  companyValue: varchar('company_value', { length: 255 }).notNull(), // which company value this reinforces
  challengeType: varchar('challenge_type', { length: 100 }).notNull(), // individual, team, department
  rules: jsonb('rules').notNull(), // {goal, metric, target, duration}
  pointsReward: integer('points_reward').notNull(),
  badgeReward: uuid('badge_reward').references(() => badges.id),
  status: challengeStatusEnum('status').notNull().default('upcoming'),
  maxParticipants: integer('max_participants'),
  startsAt: timestamp('starts_at').notNull(),
  endsAt: timestamp('ends_at').notNull(),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const challengeParticipations = pgTable('challenge_participations', {
  id: uuid('id').defaultRandom().primaryKey(),
  challengeId: uuid('challenge_id').notNull().references(() => challenges.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull(),
  userId: uuid('user_id').notNull(),
  progress: jsonb('progress').default('{}'), // {metric: currentValue, percentComplete}
  isCompleted: boolean('is_completed').default(false),
  completedAt: timestamp('completed_at'),
  rank: integer('rank'),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

// Peer Recognition
export const recognitions = pgTable('recognitions', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  fromUserId: uuid('from_user_id').notNull(),
  toUserId: uuid('to_user_id').notNull(),
  recognitionType: recognitionTypeEnum('recognition_type').notNull(),
  companyValue: varchar('company_value', { length: 255 }), // which value this recognition aligns with
  message: text('message').notNull(),
  pointsAwarded: integer('points_awarded').default(0),
  isPublic: boolean('is_public').default(true),
  likes: integer('likes').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Leaderboard snapshots (computed periodically)
export const leaderboardSnapshots = pgTable('leaderboard_snapshots', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  period: varchar('period', { length: 50 }).notNull(), // weekly, monthly, quarterly, yearly
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  rankings: jsonb('rankings').notNull(), // [{userId, rank, points, badges, recognitions}]
  departmentRankings: jsonb('department_rankings').default('[]'),
  computedAt: timestamp('computed_at').defaultNow().notNull(),
});

// Relations
export const pulseSurveysRelations = relations(pulseSurveys, ({ many }) => ({
  responses: many(pulseResponses),
}));

export const challengesRelations = relations(challenges, ({ many }) => ({
  participations: many(challengeParticipations),
}));

export const badgesRelations = relations(badges, ({ many }) => ({
  awards: many(badgeAwards),
}));
