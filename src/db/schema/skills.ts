import { pgTable, text, integer, timestamp, jsonb, uuid, boolean, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants, users } from './core';

// Employee Skills Profiles - stores resume uploads and manual profiles
export const employeeSkillsProfiles = pgTable('employee_skills_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull(),

  // Profile source
  profileType: text('profile_type').notNull(), // 'resume_upload' | 'manual_entry' | 'hybrid'

  // Resume data
  resumeUrl: text('resume_url'), // S3/storage URL
  resumeFileName: text('resume_file_name'),
  resumeText: text('resume_text'), // Extracted text from resume

  // Structured profile data
  currentExperience: jsonb('current_experience'), // Array of {company, role, duration, description}
  pastExperience: jsonb('past_experience'), // Array of work history
  education: jsonb('education'), // Array of {degree, institution, year, field}
  certifications: jsonb('certifications'), // Array of professional certifications
  projects: jsonb('projects'), // Array of projects worked on

  // Extracted skills (by Skills Agent)
  technicalSkills: jsonb('technical_skills'), // Array of {skill, proficiency, yearsExperience}
  softSkills: jsonb('soft_skills'), // Array of soft skills
  domainKnowledge: jsonb('domain_knowledge'), // Industry/domain expertise
  tools: jsonb('tools'), // Tools/software proficiency
  languages: jsonb('languages'), // Programming/spoken languages

  // Metadata
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
  isComplete: boolean('is_complete').default(false),
  completionPercentage: integer('completion_percentage').default(0),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Strategy Skill Requirements - what skills are needed for strategy
export const strategySkillRequirements = pgTable('strategy_skill_requirements', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  strategyId: uuid('strategy_id'), // Link to strategy if exists

  // Skill requirements by level
  organizationalSkills: jsonb('organizational_skills'), // Skills needed org-wide
  departmentalSkills: jsonb('departmental_skills'), // Skills by department
  roleSkills: jsonb('role_skills'), // Skills by role/position

  // Priority levels
  criticalSkills: jsonb('critical_skills'), // Must-have skills
  importantSkills: jsonb('important_skills'), // Important but not critical
  niceToHaveSkills: jsonb('nice_to_have_skills'), // Beneficial skills

  // Timeline
  currentNeeds: jsonb('current_needs'), // Immediate skill needs
  futureNeeds: jsonb('future_needs'), // Skills needed in 6-12 months

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Skills Gap Analysis Results
export const skillsGapAnalysis = pgTable('skills_gap_analysis', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull(),
  profileId: uuid('profile_id').notNull(), // Links to employeeSkillsProfiles

  // Analysis results
  analysisType: text('analysis_type').notNull(), // 'individual' | 'department' | 'organization'

  // Gap details
  criticalGaps: jsonb('critical_gaps'), // Skills critically missing
  moderateGaps: jsonb('moderate_gaps'), // Skills somewhat lacking
  strengthAreas: jsonb('strength_areas'), // Skills employee excels at

  // Recommendations
  trainingRecommendations: jsonb('training_recommendations'), // Specific training needed
  developmentPlan: jsonb('development_plan'), // Structured development plan
  estimatedTimeToClose: integer('estimated_time_to_close'), // Days to close gaps

  // Scores
  overallSkillScore: integer('overall_skill_score'), // 0-100
  strategicAlignmentScore: integer('strategic_alignment_score'), // 0-100
  readinessScore: integer('readiness_score'), // 0-100 for current role

  // Metadata
  analyzedAt: timestamp('analyzed_at').defaultNow().notNull(),
  analyzedBy: text('analyzed_by').default('skills_agent'),

  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Skills Reports
export const skillsReports = pgTable('skills_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),

  reportType: text('report_type').notNull(), // 'individual' | 'department' | 'organization'
  targetId: uuid('target_id'), // employeeId, departmentId, or tenantId

  reportData: jsonb('report_data').notNull(), // Full report content

  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Legacy table - keeping for backward compatibility
export const skillsAssessments = pgTable('skills_assessments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  currentSkills: jsonb('current_skills'),
  requiredSkills: jsonb('required_skills'),
  analysisData: jsonb('analysis_data'), // Full analysis results
  overallScore: integer('overall_score'), // 0-100
  strategicAlignment: integer('strategic_alignment'), // 0-100
  criticalGapsCount: integer('critical_gaps_count'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Relations
export const employeeSkillsProfilesRelations = relations(employeeSkillsProfiles, ({ one }) => ({
  tenant: one(tenants, {
    fields: [employeeSkillsProfiles.tenantId],
    references: [tenants.id],
  }),
  employee: one(users, {
    fields: [employeeSkillsProfiles.employeeId],
    references: [users.id],
  }),
}));

export const strategySkillRequirementsRelations = relations(strategySkillRequirements, ({ one }) => ({
  tenant: one(tenants, {
    fields: [strategySkillRequirements.tenantId],
    references: [tenants.id],
  }),
}));

export const skillsGapAnalysisRelations = relations(skillsGapAnalysis, ({ one }) => ({
  tenant: one(tenants, {
    fields: [skillsGapAnalysis.tenantId],
    references: [tenants.id],
  }),
  employee: one(users, {
    fields: [skillsGapAnalysis.employeeId],
    references: [users.id],
  }),
  profile: one(employeeSkillsProfiles, {
    fields: [skillsGapAnalysis.profileId],
    references: [employeeSkillsProfiles.id],
  }),
}));

export const skillsReportsRelations = relations(skillsReports, ({ one }) => ({
  tenant: one(tenants, {
    fields: [skillsReports.tenantId],
    references: [tenants.id],
  }),
}));

export const skillsAssessmentsRelations = relations(skillsAssessments, ({ one }) => ({
  tenant: one(tenants, {
    fields: [skillsAssessments.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [skillsAssessments.userId],
    references: [users.id],
  }),
}));

// ============================================================================
// STRATEGIC SKILLS FRAMEWORK TABLES - AGENT_CONTEXT_ULTIMATE.md Lines 456-460
// ============================================================================

export const skillsFramework = pgTable('skills_framework', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  frameworkName: text('framework_name').notNull(),
  industry: text('industry').notNull(),
  strategicSkills: jsonb('strategic_skills').notNull(), // Array of RequiredSkill
  technicalSkills: jsonb('technical_skills').notNull(), // Array of technical skills
  softSkills: jsonb('soft_skills').notNull(), // Array of soft skills
  prioritization: jsonb('prioritization').notNull(), // FrameworkInsight array
  createdBy: text('created_by').notNull(), // user who created framework
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Skills Assessment Sessions - tracks complete assessment workflows
export const skillsAssessmentSessions = pgTable('skills_assessment_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  sessionName: text('session_name').notNull(),
  frameworkId: text('framework_id').notNull(), // Links to skillsFramework
  status: text('status', { enum: ['collecting', 'analyzing', 'completed', 'failed'] }).notNull(),
  employeeCount: integer('employee_count').default(0),
  completedCount: integer('completed_count').default(0),
  analysisResults: jsonb('analysis_results'), // SkillsWorkflow results
  strategicAssessment: jsonb('strategic_assessment'), // OrganizationAssessment
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Skills BOT Interactions - tracks all BOT interactions
export const skillsBotInteractions = pgTable('skills_bot_interactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  userId: text('user_id').notNull(),
  sessionId: text('session_id'), // Links to skillsAssessmentSessions
  interactionType: text('interaction_type').notNull(), // 'resume_upload', 'gap_explanation', 'learning_guidance', etc.
  userQuery: text('user_query').notNull(),
  botResponse: text('bot_response').notNull(),
  context: jsonb('context'), // Additional context data
  resolved: boolean('resolved').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Learning Path Triggers - tracks LXP module triggers
export const skillsLearningTriggers = pgTable('skills_learning_triggers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  employeeId: text('employee_id').notNull(),
  sessionId: text('session_id').notNull(), // Links to skillsAssessmentSessions
  skillGaps: jsonb('skill_gaps').notNull(), // Array of SkillGap
  learningPaths: jsonb('learning_paths').notNull(), // Array of LearningPath
  priority: text('priority').notNull(),
  status: text('status', { enum: ['pending', 'processing', 'completed', 'failed'] }).default('pending'),
  lxpPathId: text('lxp_path_id'), // Links to LXP module
  createdAt: timestamp('created_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at')
});

// Talent Module Triggers - tracks talent identification triggers
export const skillsTalentTriggers = pgTable('skills_talent_triggers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  employeeId: text('employee_id').notNull(),
  sessionId: text('session_id').notNull(),
  skillsData: jsonb('skills_data').notNull(), // Skills analysis data
  potentialRoles: jsonb('potential_roles'), // Identified potential roles
  readinessScore: integer('readiness_score'),
  status: text('status', { enum: ['pending', 'processing', 'completed', 'failed'] }).default('pending'),
  talentModuleId: text('talent_module_id'), // Links to Talent module
  createdAt: timestamp('created_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at')
});

// Bonus Module Triggers - tracks skills-based bonus triggers
export const skillsBonusTriggers = pgTable('skills_bonus_triggers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  employeeId: text('employee_id').notNull(),
  sessionId: text('session_id').notNull(),
  skillsAchievements: jsonb('skills_achievements').notNull(), // Array of achieved skills
  recommendedBonus: integer('recommended_bonus'), // Bonus amount
  bonusCriteria: jsonb('bonus_criteria'), // Criteria for bonus
  status: text('status', { enum: ['pending', 'processing', 'completed', 'failed'] }).default('pending'),
  bonusModuleId: text('bonus_module_id'), // Links to Bonus module
  createdAt: timestamp('created_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at')
});

// Skills Progress Tracking - tracks individual skill development progress
export const skillsProgress = pgTable('skills_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  employeeId: text('employee_id').notNull(),
  skillId: text('skill_id').notNull(),
  skillName: text('skill_name').notNull(),
  currentLevel: text('current_level').notNull(),
  targetLevel: text('target_level').notNull(),
  progressPercentage: integer('progress_percentage').default(0),
  learningPathId: text('learning_path_id'), // Links to LXP learning path
  milestones: jsonb('milestones'), // Array of progress milestones
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Skills Re-Analysis Queue - tracks automatic re-analysis triggers
export const skillsReAnalysisQueue = pgTable('skills_reanalysis_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  employeeId: text('employee_id').notNull(),
  reason: text('reason').notNull(), // 'time-based' | 'role-change' | 'strategy-update' | 'learning-completion'
  status: text('status', { enum: ['pending', 'processing', 'completed', 'failed'] }).default('pending'),
  triggeredBy: text('triggered_by'), // 'system' | userId
  metadata: jsonb('metadata'), // Additional context data
  processedAt: timestamp('processed_at'),
  error: text('error'), // Error message if failed
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Employee Role History - tracks role changes for re-analysis triggers
export const employeeRoleHistory = pgTable('employee_role_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  employeeId: text('employee_id').notNull(),
  previousRole: text('previous_role'),
  newRole: text('new_role').notNull(),
  previousDepartment: text('previous_department'),
  newDepartment: text('new_department'),
  changeReason: text('change_reason'), // 'promotion' | 'transfer' | 'restructure'
  effectiveDate: timestamp('effective_date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Learning Progress Events - tracks learning completions for re-analysis triggers
export const learningProgressEvents = pgTable('learning_progress_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  employeeId: text('employee_id').notNull(),
  eventType: text('event_type').notNull(), // 'enrollment' | 'progress' | 'completion'
  learningPathId: text('learning_path_id'),
  courseId: text('course_id'),
  skillsAcquired: jsonb('skills_acquired'), // Array of skills acquired
  completionPercentage: integer('completion_percentage').default(0),
  timestamp: timestamp('timestamp').defaultNow().notNull()
});

// ============================================================================
// ADDITIONAL SKILLS TABLES
// ============================================================================

export const skillsTaxonomies = pgTable('skills_taxonomies', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  skillName: text('skill_name').notNull(),
  category: text('category'),
  taxonomy: jsonb('taxonomy'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const employeeSkills = pgTable('employee_skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  employeeId: text('employee_id').notNull(),
  skillId: text('skill_id').notNull(),
  proficiencyLevel: integer('proficiency_level'), // 1-5 scale
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// User Skills Table - for individual skills tracking
export const skills = pgTable('skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(), // 'technical' | 'soft' | 'leadership' | 'analytical' | 'communication'
  level: text('level').notNull(), // 'beginner' | 'intermediate' | 'advanced' | 'expert'
  yearsOfExperience: integer('years_of_experience'),
  verified: boolean('verified').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // Unique constraint on (userId, name) - required for onConflictDoUpdate operations
  userSkillUnique: uniqueIndex('idx_skills_user_id_name_unique').on(table.userId, table.name),
}));

// Skills Gaps Table - for tracking skill gaps
export const skillsGaps = pgTable('skills_gaps', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  employeeId: text('employee_id'),
  skill: text('skill').notNull(),
  category: text('category').notNull(),
  currentLevel: text('current_level').notNull(),
  requiredLevel: text('required_level').notNull(),
  gapSeverity: text('gap_severity').notNull(), // 'critical' | 'high' | 'medium' | 'low'
  priority: integer('priority').notNull(),
  businessImpact: text('business_impact'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Relations for skills table
export const skillsRelations = relations(skills, ({ one }) => ({
  tenant: one(tenants, {
    fields: [skills.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [skills.userId],
    references: [users.id],
  }),
}));

// Relations for skillsGaps table
export const skillsGapsRelations = relations(skillsGaps, ({ one }) => ({
  tenant: one(tenants, {
    fields: [skillsGaps.tenantId],
    references: [tenants.id],
  }),
  employee: one(users, {
    fields: [skillsGaps.employeeId],
    references: [users.id],
  }),
}));

// Relations for new Skills Framework tables
export const skillsFrameworkRelations = relations(skillsFramework, ({ one }) => ({
  tenant: one(tenants, {
    fields: [skillsFramework.tenantId],
    references: [tenants.id],
  }),
  creator: one(users, {
    fields: [skillsFramework.createdBy],
    references: [users.id],
  }),
}));

export const skillsAssessmentSessionsRelations = relations(skillsAssessmentSessions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [skillsAssessmentSessions.tenantId],
    references: [tenants.id],
  }),
  framework: one(skillsFramework, {
    fields: [skillsAssessmentSessions.frameworkId],
    references: [skillsFramework.id],
  }),
}));

export const skillsBotInteractionsRelations = relations(skillsBotInteractions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [skillsBotInteractions.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [skillsBotInteractions.userId],
    references: [users.id],
  }),
  session: one(skillsAssessmentSessions, {
    fields: [skillsBotInteractions.sessionId],
    references: [skillsAssessmentSessions.id],
  }),
}));

export const skillsLearningTriggersRelations = relations(skillsLearningTriggers, ({ one }) => ({
  tenant: one(tenants, {
    fields: [skillsLearningTriggers.tenantId],
    references: [tenants.id],
  }),
  employee: one(users, {
    fields: [skillsLearningTriggers.employeeId],
    references: [users.id],
  }),
  session: one(skillsAssessmentSessions, {
    fields: [skillsLearningTriggers.sessionId],
    references: [skillsAssessmentSessions.id],
  }),
}));

export const skillsTalentTriggersRelations = relations(skillsTalentTriggers, ({ one }) => ({
  tenant: one(tenants, {
    fields: [skillsTalentTriggers.tenantId],
    references: [tenants.id],
  }),
  employee: one(users, {
    fields: [skillsTalentTriggers.employeeId],
    references: [users.id],
  }),
  session: one(skillsAssessmentSessions, {
    fields: [skillsTalentTriggers.sessionId],
    references: [skillsAssessmentSessions.id],
  }),
}));

export const skillsBonusTriggersRelations = relations(skillsBonusTriggers, ({ one }) => ({
  tenant: one(tenants, {
    fields: [skillsBonusTriggers.tenantId],
    references: [tenants.id],
  }),
  employee: one(users, {
    fields: [skillsBonusTriggers.employeeId],
    references: [users.id],
  }),
  session: one(skillsAssessmentSessions, {
    fields: [skillsBonusTriggers.sessionId],
    references: [skillsAssessmentSessions.id],
  }),
}));

export const skillsProgressRelations = relations(skillsProgress, ({ one }) => ({
  tenant: one(tenants, {
    fields: [skillsProgress.tenantId],
    references: [tenants.id],
  }),
  employee: one(users, {
    fields: [skillsProgress.employeeId],
    references: [users.id],
  }),
}));