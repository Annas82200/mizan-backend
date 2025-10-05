import { pgTable, text, integer, timestamp, jsonb, uuid, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants, users } from './core.js';

// Employee Skills Profiles - stores resume uploads and manual profiles
export const employeeSkillsProfiles = pgTable('employee_skills_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  employeeId: text('employee_id').notNull(),

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
  tenantId: text('tenant_id').notNull(),
  strategyId: text('strategy_id'), // Link to strategy if exists

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
  tenantId: text('tenant_id').notNull(),
  employeeId: text('employee_id').notNull(),
  profileId: text('profile_id').notNull(), // Links to employeeSkillsProfiles

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
  tenantId: text('tenant_id').notNull(),

  reportType: text('report_type').notNull(), // 'individual' | 'department' | 'organization'
  targetId: text('target_id'), // employeeId, departmentId, or tenantId

  reportData: jsonb('report_data').notNull(), // Full report content

  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Legacy table - keeping for backward compatibility
export const skillsAssessments = pgTable('skills_assessments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  userId: text('user_id').notNull(),
  currentSkills: jsonb('current_skills'),
  requiredSkills: jsonb('required_skills'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
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