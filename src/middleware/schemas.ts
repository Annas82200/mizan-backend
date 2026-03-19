/**
 * Zod Validation Schemas — Input validation for all critical API routes
 */

import { z } from 'zod';

// === Assistant ===
export const assistantMessageSchema = z.object({
  message: z.string().min(1, 'Message is required').max(10000),
  conversationId: z.string().uuid().optional(),
});

export const executeActionSchema = z.object({
  conversationId: z.string().uuid(),
  actionType: z.enum(['send_email', 'schedule_meeting', 'create_task', 'approve_request', 'generate_report', 'trigger_workflow', 'send_reminder', 'update_record']),
  parameters: z.record(z.unknown()).default({}),
});

// === HRIS Connector ===
export const createConnectorSchema = z.object({
  name: z.string().min(1).max(255),
  hrisType: z.string().min(1).max(100),
  connectionType: z.enum(['rest', 'soap', 'webhook', 'sftp']),
  baseUrl: z.string().url().optional(),
  authConfig: z.object({
    type: z.enum(['oauth2', 'api_key', 'basic', 'certificate']),
    credentials: z.record(z.string()),
  }),
  fieldMappings: z.record(z.unknown()).optional(),
  syncSchedule: z.record(z.unknown()).optional(),
  conflictResolution: z.enum(['hris_wins', 'mizan_wins', 'manual_review', 'newest_wins']).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// === Engagement ===
export const createSurveySchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  questions: z.array(z.object({
    id: z.string().optional(),
    text: z.string().min(1),
    type: z.enum(['scale', 'choice', 'text']),
    options: z.array(z.string()).optional(),
    required: z.boolean().optional(),
  })).min(1, 'At least one question is required'),
  targetAudience: z.record(z.unknown()).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});

export const sendRecognitionSchema = z.object({
  toUserId: z.string().uuid(),
  recognitionType: z.enum(['kudos', 'shoutout', 'value_champion', 'team_mvp', 'innovation']),
  companyValue: z.string().optional(),
  message: z.string().min(1).max(1000),
  pointsAwarded: z.number().int().min(0).max(100).optional(),
});

export const surveyResponseSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string(),
    value: z.unknown(),
  })).min(1),
  isAnonymous: z.boolean().optional(),
});

// === Onboarding ===
export const createWorkflowSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  targetRole: z.string().optional(),
  targetDepartment: z.string().uuid().optional(),
  steps: z.array(z.object({
    order: z.number().int(),
    title: z.string().min(1),
    description: z.string().optional(),
    type: z.string().optional(),
    assignee: z.string().optional(),
    dueOffsetDays: z.number().int().optional(),
    isRequired: z.boolean().optional(),
  })).default([]),
  estimatedDurationDays: z.number().int().min(1).max(365).optional(),
});

export const createAssignmentSchema = z.object({
  workflowId: z.string().uuid(),
  employeeId: z.string().uuid(),
  managerId: z.string().uuid().optional(),
  buddyId: z.string().uuid().optional(),
  startDate: z.string().datetime(),
});

// === Branding ===
export const updateBrandingSchema = z.object({
  companyName: z.string().max(255).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  surfaceColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  textPrimaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  textSecondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  fontFamilySans: z.string().max(255).optional(),
  fontFamilyDisplay: z.string().max(255).optional(),
  logoUrl: z.string().url().optional().nullable(),
  faviconUrl: z.string().url().optional().nullable(),
  customCss: z.string().max(50000).optional().nullable(),
  showPoweredBy: z.boolean().optional(),
}).partial();

// === Modules ===
export const updateModuleConfigSchema = z.object({
  settings: z.record(z.unknown()).optional(),
  featureFlags: z.record(z.unknown()).optional(),
  customLabel: z.string().max(255).optional(),
  customIcon: z.string().max(100).optional(),
  displayOrder: z.number().int().optional(),
});

// === GDPR ===
export const verifyDomainSchema = z.object({
  domain: z.string().min(3).max(255),
});

// === Performance 360 ===
export const generate360Schema = z.object({
  employeeId: z.string().uuid(),
  sources: z.array(z.object({
    sourceType: z.enum(['self', 'peer', 'direct_report', 'manager']),
    evaluatorId: z.string().uuid(),
    ratings: z.record(z.number()),
    comments: z.record(z.string()).optional().default({}),
    overallRating: z.number().min(1).max(5),
    strengths: z.array(z.string()).optional().default([]),
    developmentAreas: z.array(z.string()).optional().default([]),
  })).min(1),
});

// === LXP AI ===
export const generateCourseSchema = z.object({
  skillGaps: z.array(z.object({
    skill: z.string().min(1),
    currentLevel: z.number().min(0).max(5),
    targetLevel: z.number().min(0).max(5),
  })).min(1),
  learnerProfile: z.object({
    role: z.string(),
    experience: z.string(),
    preferredLearningStyle: z.string().optional(),
  }).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
});
