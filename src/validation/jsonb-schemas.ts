/**
 * JSONB Validation Schemas (Phase 4 - Database Validation)
 *
 * Centralized Zod schemas for validating JSONB column data.
 * Created to eliminate `as any` type assertions and provide runtime validation.
 *
 * Compliance: AGENT_CONTEXT_ULTIMATE.md - 100% Production Quality
 * - No `as any` type assertions
 * - Explicit validation with helpful error messages
 * - Type-safe JSONB field access
 */

import { z } from 'zod';

// ============================================================================
// 1. ORGANIZATION STRUCTURE SCHEMAS
// ============================================================================

/**
 * Department data from CSV uploads or organizational structure
 */
export const DepartmentDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  parentId: z.string().optional(), // For hierarchical departments
  manager: z.string().optional(),  // Manager ID
  headId: z.string().optional(),   // Alternative field name for manager
  employeeCount: z.number().optional(),
});

export type DepartmentData = z.infer<typeof DepartmentDataSchema>;

/**
 * Reporting line/relationship between employees
 */
export const ReportingLineSchema = z.object({
  fromId: z.string(),
  toId: z.string(),
  reportType: z.enum(['direct', 'dotted', 'functional']).optional(),
  relationship: z.string().optional(), // Description of relationship
});

export type ReportingLine = z.infer<typeof ReportingLineSchema>;

/**
 * Role/employee data from organizational structure
 */
export const RoleDataSchema = z.object({
  id: z.string(),
  title: z.string(),
  name: z.string().optional(),
  email: z.string().optional(),
  departmentId: z.string().optional(),
  department: z.string().optional(), // Alternative field name
  level: z.number().optional(),      // Organizational level (0 = CEO)
  manager: z.string().optional(),    // Manager ID
  managerId: z.string().optional(),  // Alternative field name
  directReports: z.array(z.string()).optional(), // Array of employee IDs
  reportsTo: z.string().optional(),  // Manager ID (alternative)
});

export type RoleData = z.infer<typeof RoleDataSchema>;

/**
 * Complete organization structure data (from organizationStructure.data JSONB column)
 */
export const OrganizationStructureDataSchema = z.object({
  departments: z.array(DepartmentDataSchema),
  reportingLines: z.array(ReportingLineSchema).optional().default([]),
  employees: z.array(RoleDataSchema).optional(),  // Common field name
  roles: z.array(RoleDataSchema).optional(),      // Alternative field name
  metadata: z.object({
    uploadDate: z.string().optional(),
    source: z.string().optional(),
    totalEmployees: z.number().optional(),
  }).optional(),
});

export type OrganizationStructureData = z.infer<typeof OrganizationStructureDataSchema>;

// ============================================================================
// 2. SKILLS GAP ANALYSIS SCHEMAS
// ============================================================================

/**
 * Skill gap - can be simple string or structured object
 */
export const SkillGapSchema = z.union([
  z.string(), // Simple string description
  z.object({
    skill: z.string(),
    description: z.string(),
    severity: z.enum(['critical', 'moderate', 'low']).optional(),
    currentLevel: z.number().optional(),
    requiredLevel: z.number().optional(),
  }),
]);

export type SkillGap = z.infer<typeof SkillGapSchema>;

/**
 * LXP trigger for recommended training
 */
export const LXPTriggerSchema = z.object({
  skill: z.string(),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  recommendedCourses: z.array(z.string()).optional(),
  estimatedDuration: z.string().optional(), // e.g., "2 weeks"
  learningPath: z.string().optional(),
});

export type LXPTrigger = z.infer<typeof LXPTriggerSchema>;

/**
 * Recommendation - can be simple string or structured object
 */
export const RecommendationSchema = z.union([
  z.string(), // Simple string recommendation
  z.object({
    title: z.string(),
    description: z.string(),
    priority: z.enum(['high', 'medium', 'low']).optional(),
    category: z.string().optional(),
    actionItems: z.array(z.string()).optional(),
  }),
]);

export type Recommendation = z.infer<typeof RecommendationSchema>;

/**
 * Training recommendation with skill and priority
 */
export const TrainingRecommendationSchema = z.object({
  area: z.string(), // Skill area
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  courses: z.array(z.string()).optional(),
  description: z.string().optional(),
});

export type TrainingRecommendation = z.infer<typeof TrainingRecommendationSchema>;

// ============================================================================
// 3. LXP (LEARNING EXPERIENCE PLATFORM) SCHEMAS
// ============================================================================

/**
 * Course within a learning path
 */
export const LXPCourseSchema = z.object({
  id: z.string(),
  title: z.string(),
  sequence: z.number(),           // Order in learning path
  required: z.boolean().default(false),
  duration: z.string().optional(), // e.g., "3 hours"
  status: z.enum(['assigned', 'in_progress', 'completed']).optional(),
});

export type LXPCourse = z.infer<typeof LXPCourseSchema>;

/**
 * Gamification settings for learning design
 */
export const GamificationSchema = z.object({
  enabled: z.boolean().default(false),
  levels: z.number().optional(),
  pointsEnabled: z.boolean().optional(),
  badgesEnabled: z.boolean().optional(),
  leaderboardEnabled: z.boolean().optional(),
});

export type Gamification = z.infer<typeof GamificationSchema>;

/**
 * Learning design configuration (from lxpCourses.learningDesign JSONB column)
 */
export const LearningDesignSchema = z.object({
  courses: z.array(LXPCourseSchema),
  gamification: GamificationSchema.optional(),
  assessments: z.array(z.object({
    id: z.string(),
    type: z.enum(['quiz', 'assignment', 'project']),
    weight: z.number().optional(),
  })).optional(),
  prerequisites: z.array(z.string()).optional(), // Course IDs
  estimatedCompletion: z.string().optional(),   // e.g., "4 weeks"
});

export type LearningDesign = z.infer<typeof LearningDesignSchema>;

/**
 * LXP enrollment status enum (for proper type validation)
 */
export const LXPStatusSchema = z.enum([
  'assigned',
  'design',
  'in_progress',
  'active',
  'completed',
  'archived',
  'failed',
  'withdrawn',
]);

export type LXPStatus = z.infer<typeof LXPStatusSchema>;

// ============================================================================
// 4. HIRING REQUISITION SCHEMAS
// ============================================================================

/**
 * Job responsibilities (from hiringRequisitions.responsibilities JSONB column)
 * Note: Schema already defines this as .default([]), but validation ensures it's an array
 */
export const ResponsibilitiesSchema = z.array(z.string()).default([]);

export type Responsibilities = z.infer<typeof ResponsibilitiesSchema>;

/**
 * Job qualifications (from hiringRequisitions.qualifications JSONB column)
 */
export const QualificationsSchema = z.array(z.string()).default([]);

export type Qualifications = z.infer<typeof QualificationsSchema>;

/**
 * Required skills for a position
 */
export const RequiredSkillsSchema = z.array(z.object({
  skill: z.string(),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  yearsRequired: z.number().optional(),
  mandatory: z.boolean().default(true),
})).default([]);

export type RequiredSkills = z.infer<typeof RequiredSkillsSchema>;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Safely parse JSONB data with helpful error messages
 */
export function parseJsonb<T>(
  schema: z.ZodType<T>,
  data: unknown,
  fieldName: string
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(e =>
        `${e.path.join('.')}: ${e.message}`
      ).join(', ');
      throw new Error(
        `Invalid JSONB data for ${fieldName}: ${errorMessages}`
      );
    }
    throw error;
  }
}

/**
 * Safely parse optional JSONB data, returning undefined if validation fails
 */
export function parseJsonbOptional<T>(
  schema: z.ZodType<T>,
  data: unknown,
  fieldName: string
): T | undefined {
  try {
    return schema.parse(data);
  } catch (error) {
    logger.warn(`Optional JSONB field ${fieldName} validation failed, returning undefined:`, error);
    return undefined;
  }
}

/**
 * Type guard to check if data is an array
 */
export function isArray(data: unknown): data is unknown[] {
  return Array.isArray(data);
}

/**
 * Type guard to check if data is a non-null object
 */
export function isObject(data: unknown): data is Record<string, unknown> {
  return typeof data === 'object' && data !== null && !Array.isArray(data);
}
