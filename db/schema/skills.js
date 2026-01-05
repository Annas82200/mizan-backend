"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.learningProgressEvents = exports.employeeRoleHistory = exports.skillsReAnalysisQueue = exports.skillsProgressRelations = exports.skillsBonusTriggersRelations = exports.skillsTalentTriggersRelations = exports.skillsLearningTriggersRelations = exports.skillsBotInteractionsRelations = exports.skillsAssessmentSessionsRelations = exports.skillsFrameworkRelations = exports.skillsGapsRelations = exports.skillsRelations = exports.skillsGaps = exports.skills = exports.employeeSkills = exports.skillsTaxonomies = exports.skillsProgress = exports.skillsBonusTriggers = exports.skillsTalentTriggers = exports.skillsLearningTriggers = exports.skillsBotInteractions = exports.skillsAssessmentSessions = exports.skillsFramework = exports.skillsAssessmentsRelations = exports.skillsReportsRelations = exports.skillsGapAnalysisRelations = exports.strategySkillRequirementsRelations = exports.employeeSkillsProfilesRelations = exports.skillsAssessments = exports.skillsReports = exports.skillsGapAnalysis = exports.strategySkillRequirements = exports.employeeSkillsProfiles = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const core_1 = require("./core");
// Employee Skills Profiles - stores resume uploads and manual profiles
exports.employeeSkillsProfiles = (0, pg_core_1.pgTable)('employee_skills_profiles', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    employeeId: (0, pg_core_1.text)('employee_id').notNull(),
    // Profile source
    profileType: (0, pg_core_1.text)('profile_type').notNull(), // 'resume_upload' | 'manual_entry' | 'hybrid'
    // Resume data
    resumeUrl: (0, pg_core_1.text)('resume_url'), // S3/storage URL
    resumeFileName: (0, pg_core_1.text)('resume_file_name'),
    resumeText: (0, pg_core_1.text)('resume_text'), // Extracted text from resume
    // Structured profile data
    currentExperience: (0, pg_core_1.jsonb)('current_experience'), // Array of {company, role, duration, description}
    pastExperience: (0, pg_core_1.jsonb)('past_experience'), // Array of work history
    education: (0, pg_core_1.jsonb)('education'), // Array of {degree, institution, year, field}
    certifications: (0, pg_core_1.jsonb)('certifications'), // Array of professional certifications
    projects: (0, pg_core_1.jsonb)('projects'), // Array of projects worked on
    // Extracted skills (by Skills Agent)
    technicalSkills: (0, pg_core_1.jsonb)('technical_skills'), // Array of {skill, proficiency, yearsExperience}
    softSkills: (0, pg_core_1.jsonb)('soft_skills'), // Array of soft skills
    domainKnowledge: (0, pg_core_1.jsonb)('domain_knowledge'), // Industry/domain expertise
    tools: (0, pg_core_1.jsonb)('tools'), // Tools/software proficiency
    languages: (0, pg_core_1.jsonb)('languages'), // Programming/spoken languages
    // Metadata
    lastUpdated: (0, pg_core_1.timestamp)('last_updated').defaultNow().notNull(),
    isComplete: (0, pg_core_1.boolean)('is_complete').default(false),
    completionPercentage: (0, pg_core_1.integer)('completion_percentage').default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull()
});
// Strategy Skill Requirements - what skills are needed for strategy
exports.strategySkillRequirements = (0, pg_core_1.pgTable)('strategy_skill_requirements', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    strategyId: (0, pg_core_1.text)('strategy_id'), // Link to strategy if exists
    // Skill requirements by level
    organizationalSkills: (0, pg_core_1.jsonb)('organizational_skills'), // Skills needed org-wide
    departmentalSkills: (0, pg_core_1.jsonb)('departmental_skills'), // Skills by department
    roleSkills: (0, pg_core_1.jsonb)('role_skills'), // Skills by role/position
    // Priority levels
    criticalSkills: (0, pg_core_1.jsonb)('critical_skills'), // Must-have skills
    importantSkills: (0, pg_core_1.jsonb)('important_skills'), // Important but not critical
    niceToHaveSkills: (0, pg_core_1.jsonb)('nice_to_have_skills'), // Beneficial skills
    // Timeline
    currentNeeds: (0, pg_core_1.jsonb)('current_needs'), // Immediate skill needs
    futureNeeds: (0, pg_core_1.jsonb)('future_needs'), // Skills needed in 6-12 months
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull()
});
// Skills Gap Analysis Results
exports.skillsGapAnalysis = (0, pg_core_1.pgTable)('skills_gap_analysis', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    employeeId: (0, pg_core_1.text)('employee_id').notNull(),
    profileId: (0, pg_core_1.text)('profile_id').notNull(), // Links to employeeSkillsProfiles
    // Analysis results
    analysisType: (0, pg_core_1.text)('analysis_type').notNull(), // 'individual' | 'department' | 'organization'
    // Gap details
    criticalGaps: (0, pg_core_1.jsonb)('critical_gaps'), // Skills critically missing
    moderateGaps: (0, pg_core_1.jsonb)('moderate_gaps'), // Skills somewhat lacking
    strengthAreas: (0, pg_core_1.jsonb)('strength_areas'), // Skills employee excels at
    // Recommendations
    trainingRecommendations: (0, pg_core_1.jsonb)('training_recommendations'), // Specific training needed
    developmentPlan: (0, pg_core_1.jsonb)('development_plan'), // Structured development plan
    estimatedTimeToClose: (0, pg_core_1.integer)('estimated_time_to_close'), // Days to close gaps
    // Scores
    overallSkillScore: (0, pg_core_1.integer)('overall_skill_score'), // 0-100
    strategicAlignmentScore: (0, pg_core_1.integer)('strategic_alignment_score'), // 0-100
    readinessScore: (0, pg_core_1.integer)('readiness_score'), // 0-100 for current role
    // Metadata
    analyzedAt: (0, pg_core_1.timestamp)('analyzed_at').defaultNow().notNull(),
    analyzedBy: (0, pg_core_1.text)('analyzed_by').default('skills_agent'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
});
// Skills Reports
exports.skillsReports = (0, pg_core_1.pgTable)('skills_reports', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    reportType: (0, pg_core_1.text)('report_type').notNull(), // 'individual' | 'department' | 'organization'
    targetId: (0, pg_core_1.text)('target_id'), // employeeId, departmentId, or tenantId
    reportData: (0, pg_core_1.jsonb)('report_data').notNull(), // Full report content
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
});
// Legacy table - keeping for backward compatibility
exports.skillsAssessments = (0, pg_core_1.pgTable)('skills_assessments', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    userId: (0, pg_core_1.text)('user_id').notNull(),
    currentSkills: (0, pg_core_1.jsonb)('current_skills'),
    requiredSkills: (0, pg_core_1.jsonb)('required_skills'),
    analysisData: (0, pg_core_1.jsonb)('analysis_data'), // Full analysis results
    overallScore: (0, pg_core_1.integer)('overall_score'), // 0-100
    strategicAlignment: (0, pg_core_1.integer)('strategic_alignment'), // 0-100
    criticalGapsCount: (0, pg_core_1.integer)('critical_gaps_count'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull()
});
// Relations
exports.employeeSkillsProfilesRelations = (0, drizzle_orm_1.relations)(exports.employeeSkillsProfiles, ({ one }) => ({
    tenant: one(core_1.tenants, {
        fields: [exports.employeeSkillsProfiles.tenantId],
        references: [core_1.tenants.id],
    }),
    employee: one(core_1.users, {
        fields: [exports.employeeSkillsProfiles.employeeId],
        references: [core_1.users.id],
    }),
}));
exports.strategySkillRequirementsRelations = (0, drizzle_orm_1.relations)(exports.strategySkillRequirements, ({ one }) => ({
    tenant: one(core_1.tenants, {
        fields: [exports.strategySkillRequirements.tenantId],
        references: [core_1.tenants.id],
    }),
}));
exports.skillsGapAnalysisRelations = (0, drizzle_orm_1.relations)(exports.skillsGapAnalysis, ({ one }) => ({
    tenant: one(core_1.tenants, {
        fields: [exports.skillsGapAnalysis.tenantId],
        references: [core_1.tenants.id],
    }),
    employee: one(core_1.users, {
        fields: [exports.skillsGapAnalysis.employeeId],
        references: [core_1.users.id],
    }),
    profile: one(exports.employeeSkillsProfiles, {
        fields: [exports.skillsGapAnalysis.profileId],
        references: [exports.employeeSkillsProfiles.id],
    }),
}));
exports.skillsReportsRelations = (0, drizzle_orm_1.relations)(exports.skillsReports, ({ one }) => ({
    tenant: one(core_1.tenants, {
        fields: [exports.skillsReports.tenantId],
        references: [core_1.tenants.id],
    }),
}));
exports.skillsAssessmentsRelations = (0, drizzle_orm_1.relations)(exports.skillsAssessments, ({ one }) => ({
    tenant: one(core_1.tenants, {
        fields: [exports.skillsAssessments.tenantId],
        references: [core_1.tenants.id],
    }),
    user: one(core_1.users, {
        fields: [exports.skillsAssessments.userId],
        references: [core_1.users.id],
    }),
}));
// ============================================================================
// STRATEGIC SKILLS FRAMEWORK TABLES - AGENT_CONTEXT_ULTIMATE.md Lines 456-460
// ============================================================================
exports.skillsFramework = (0, pg_core_1.pgTable)('skills_framework', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    frameworkName: (0, pg_core_1.text)('framework_name').notNull(),
    industry: (0, pg_core_1.text)('industry').notNull(),
    strategicSkills: (0, pg_core_1.jsonb)('strategic_skills').notNull(), // Array of RequiredSkill
    technicalSkills: (0, pg_core_1.jsonb)('technical_skills').notNull(), // Array of technical skills
    softSkills: (0, pg_core_1.jsonb)('soft_skills').notNull(), // Array of soft skills
    prioritization: (0, pg_core_1.jsonb)('prioritization').notNull(), // FrameworkInsight array
    createdBy: (0, pg_core_1.text)('created_by').notNull(), // user who created framework
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull()
});
// Skills Assessment Sessions - tracks complete assessment workflows
exports.skillsAssessmentSessions = (0, pg_core_1.pgTable)('skills_assessment_sessions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    sessionName: (0, pg_core_1.text)('session_name').notNull(),
    frameworkId: (0, pg_core_1.text)('framework_id').notNull(), // Links to skillsFramework
    status: (0, pg_core_1.text)('status', { enum: ['collecting', 'analyzing', 'completed', 'failed'] }).notNull(),
    employeeCount: (0, pg_core_1.integer)('employee_count').default(0),
    completedCount: (0, pg_core_1.integer)('completed_count').default(0),
    analysisResults: (0, pg_core_1.jsonb)('analysis_results'), // SkillsWorkflow results
    strategicAssessment: (0, pg_core_1.jsonb)('strategic_assessment'), // OrganizationAssessment
    startedAt: (0, pg_core_1.timestamp)('started_at').defaultNow().notNull(),
    completedAt: (0, pg_core_1.timestamp)('completed_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
});
// Skills BOT Interactions - tracks all BOT interactions
exports.skillsBotInteractions = (0, pg_core_1.pgTable)('skills_bot_interactions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    userId: (0, pg_core_1.text)('user_id').notNull(),
    sessionId: (0, pg_core_1.text)('session_id'), // Links to skillsAssessmentSessions
    interactionType: (0, pg_core_1.text)('interaction_type').notNull(), // 'resume_upload', 'gap_explanation', 'learning_guidance', etc.
    userQuery: (0, pg_core_1.text)('user_query').notNull(),
    botResponse: (0, pg_core_1.text)('bot_response').notNull(),
    context: (0, pg_core_1.jsonb)('context'), // Additional context data
    resolved: (0, pg_core_1.boolean)('resolved').default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
});
// Learning Path Triggers - tracks LXP module triggers
exports.skillsLearningTriggers = (0, pg_core_1.pgTable)('skills_learning_triggers', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    employeeId: (0, pg_core_1.text)('employee_id').notNull(),
    sessionId: (0, pg_core_1.text)('session_id').notNull(), // Links to skillsAssessmentSessions
    skillGaps: (0, pg_core_1.jsonb)('skill_gaps').notNull(), // Array of SkillGap
    learningPaths: (0, pg_core_1.jsonb)('learning_paths').notNull(), // Array of LearningPath
    priority: (0, pg_core_1.text)('priority').notNull(),
    status: (0, pg_core_1.text)('status', { enum: ['pending', 'processing', 'completed', 'failed'] }).default('pending'),
    lxpPathId: (0, pg_core_1.text)('lxp_path_id'), // Links to LXP module
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    processedAt: (0, pg_core_1.timestamp)('processed_at')
});
// Talent Module Triggers - tracks talent identification triggers
exports.skillsTalentTriggers = (0, pg_core_1.pgTable)('skills_talent_triggers', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    employeeId: (0, pg_core_1.text)('employee_id').notNull(),
    sessionId: (0, pg_core_1.text)('session_id').notNull(),
    skillsData: (0, pg_core_1.jsonb)('skills_data').notNull(), // Skills analysis data
    potentialRoles: (0, pg_core_1.jsonb)('potential_roles'), // Identified potential roles
    readinessScore: (0, pg_core_1.integer)('readiness_score'),
    status: (0, pg_core_1.text)('status', { enum: ['pending', 'processing', 'completed', 'failed'] }).default('pending'),
    talentModuleId: (0, pg_core_1.text)('talent_module_id'), // Links to Talent module
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    processedAt: (0, pg_core_1.timestamp)('processed_at')
});
// Bonus Module Triggers - tracks skills-based bonus triggers
exports.skillsBonusTriggers = (0, pg_core_1.pgTable)('skills_bonus_triggers', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    employeeId: (0, pg_core_1.text)('employee_id').notNull(),
    sessionId: (0, pg_core_1.text)('session_id').notNull(),
    skillsAchievements: (0, pg_core_1.jsonb)('skills_achievements').notNull(), // Array of achieved skills
    recommendedBonus: (0, pg_core_1.integer)('recommended_bonus'), // Bonus amount
    bonusCriteria: (0, pg_core_1.jsonb)('bonus_criteria'), // Criteria for bonus
    status: (0, pg_core_1.text)('status', { enum: ['pending', 'processing', 'completed', 'failed'] }).default('pending'),
    bonusModuleId: (0, pg_core_1.text)('bonus_module_id'), // Links to Bonus module
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    processedAt: (0, pg_core_1.timestamp)('processed_at')
});
// Skills Progress Tracking - tracks individual skill development progress
exports.skillsProgress = (0, pg_core_1.pgTable)('skills_progress', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    employeeId: (0, pg_core_1.text)('employee_id').notNull(),
    skillId: (0, pg_core_1.text)('skill_id').notNull(),
    skillName: (0, pg_core_1.text)('skill_name').notNull(),
    currentLevel: (0, pg_core_1.text)('current_level').notNull(),
    targetLevel: (0, pg_core_1.text)('target_level').notNull(),
    progressPercentage: (0, pg_core_1.integer)('progress_percentage').default(0),
    learningPathId: (0, pg_core_1.text)('learning_path_id'), // Links to LXP learning path
    milestones: (0, pg_core_1.jsonb)('milestones'), // Array of progress milestones
    lastUpdated: (0, pg_core_1.timestamp)('last_updated').defaultNow().notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
});
// ============================================================================
// ADDITIONAL SKILLS TABLES
// ============================================================================
exports.skillsTaxonomies = (0, pg_core_1.pgTable)('skills_taxonomies', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    skillName: (0, pg_core_1.text)('skill_name').notNull(),
    category: (0, pg_core_1.text)('category'),
    taxonomy: (0, pg_core_1.jsonb)('taxonomy'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
exports.employeeSkills = (0, pg_core_1.pgTable)('employee_skills', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    employeeId: (0, pg_core_1.text)('employee_id').notNull(),
    skillId: (0, pg_core_1.text)('skill_id').notNull(),
    proficiencyLevel: (0, pg_core_1.integer)('proficiency_level'), // 1-5 scale
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
// User Skills Table - for individual skills tracking
exports.skills = (0, pg_core_1.pgTable)('skills', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    userId: (0, pg_core_1.text)('user_id').notNull(),
    name: (0, pg_core_1.text)('name').notNull(),
    category: (0, pg_core_1.text)('category').notNull(), // 'technical' | 'soft' | 'leadership' | 'analytical' | 'communication'
    level: (0, pg_core_1.text)('level').notNull(), // 'beginner' | 'intermediate' | 'advanced' | 'expert'
    yearsOfExperience: (0, pg_core_1.integer)('years_of_experience'),
    verified: (0, pg_core_1.boolean)('verified').default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull()
});
// Skills Gaps Table - for tracking skill gaps
exports.skillsGaps = (0, pg_core_1.pgTable)('skills_gaps', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    employeeId: (0, pg_core_1.text)('employee_id'),
    skill: (0, pg_core_1.text)('skill').notNull(),
    category: (0, pg_core_1.text)('category').notNull(),
    currentLevel: (0, pg_core_1.text)('current_level').notNull(),
    requiredLevel: (0, pg_core_1.text)('required_level').notNull(),
    gapSeverity: (0, pg_core_1.text)('gap_severity').notNull(), // 'critical' | 'high' | 'medium' | 'low'
    priority: (0, pg_core_1.integer)('priority').notNull(),
    businessImpact: (0, pg_core_1.text)('business_impact'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull()
});
// Relations for skills table
exports.skillsRelations = (0, drizzle_orm_1.relations)(exports.skills, ({ one }) => ({
    tenant: one(core_1.tenants, {
        fields: [exports.skills.tenantId],
        references: [core_1.tenants.id],
    }),
    user: one(core_1.users, {
        fields: [exports.skills.userId],
        references: [core_1.users.id],
    }),
}));
// Relations for skillsGaps table
exports.skillsGapsRelations = (0, drizzle_orm_1.relations)(exports.skillsGaps, ({ one }) => ({
    tenant: one(core_1.tenants, {
        fields: [exports.skillsGaps.tenantId],
        references: [core_1.tenants.id],
    }),
    employee: one(core_1.users, {
        fields: [exports.skillsGaps.employeeId],
        references: [core_1.users.id],
    }),
}));
// Relations for new Skills Framework tables
exports.skillsFrameworkRelations = (0, drizzle_orm_1.relations)(exports.skillsFramework, ({ one }) => ({
    tenant: one(core_1.tenants, {
        fields: [exports.skillsFramework.tenantId],
        references: [core_1.tenants.id],
    }),
    creator: one(core_1.users, {
        fields: [exports.skillsFramework.createdBy],
        references: [core_1.users.id],
    }),
}));
exports.skillsAssessmentSessionsRelations = (0, drizzle_orm_1.relations)(exports.skillsAssessmentSessions, ({ one }) => ({
    tenant: one(core_1.tenants, {
        fields: [exports.skillsAssessmentSessions.tenantId],
        references: [core_1.tenants.id],
    }),
    framework: one(exports.skillsFramework, {
        fields: [exports.skillsAssessmentSessions.frameworkId],
        references: [exports.skillsFramework.id],
    }),
}));
exports.skillsBotInteractionsRelations = (0, drizzle_orm_1.relations)(exports.skillsBotInteractions, ({ one }) => ({
    tenant: one(core_1.tenants, {
        fields: [exports.skillsBotInteractions.tenantId],
        references: [core_1.tenants.id],
    }),
    user: one(core_1.users, {
        fields: [exports.skillsBotInteractions.userId],
        references: [core_1.users.id],
    }),
    session: one(exports.skillsAssessmentSessions, {
        fields: [exports.skillsBotInteractions.sessionId],
        references: [exports.skillsAssessmentSessions.id],
    }),
}));
exports.skillsLearningTriggersRelations = (0, drizzle_orm_1.relations)(exports.skillsLearningTriggers, ({ one }) => ({
    tenant: one(core_1.tenants, {
        fields: [exports.skillsLearningTriggers.tenantId],
        references: [core_1.tenants.id],
    }),
    employee: one(core_1.users, {
        fields: [exports.skillsLearningTriggers.employeeId],
        references: [core_1.users.id],
    }),
    session: one(exports.skillsAssessmentSessions, {
        fields: [exports.skillsLearningTriggers.sessionId],
        references: [exports.skillsAssessmentSessions.id],
    }),
}));
exports.skillsTalentTriggersRelations = (0, drizzle_orm_1.relations)(exports.skillsTalentTriggers, ({ one }) => ({
    tenant: one(core_1.tenants, {
        fields: [exports.skillsTalentTriggers.tenantId],
        references: [core_1.tenants.id],
    }),
    employee: one(core_1.users, {
        fields: [exports.skillsTalentTriggers.employeeId],
        references: [core_1.users.id],
    }),
    session: one(exports.skillsAssessmentSessions, {
        fields: [exports.skillsTalentTriggers.sessionId],
        references: [exports.skillsAssessmentSessions.id],
    }),
}));
exports.skillsBonusTriggersRelations = (0, drizzle_orm_1.relations)(exports.skillsBonusTriggers, ({ one }) => ({
    tenant: one(core_1.tenants, {
        fields: [exports.skillsBonusTriggers.tenantId],
        references: [core_1.tenants.id],
    }),
    employee: one(core_1.users, {
        fields: [exports.skillsBonusTriggers.employeeId],
        references: [core_1.users.id],
    }),
    session: one(exports.skillsAssessmentSessions, {
        fields: [exports.skillsBonusTriggers.sessionId],
        references: [exports.skillsAssessmentSessions.id],
    }),
}));
exports.skillsProgressRelations = (0, drizzle_orm_1.relations)(exports.skillsProgress, ({ one }) => ({
    tenant: one(core_1.tenants, {
        fields: [exports.skillsProgress.tenantId],
        references: [core_1.tenants.id],
    }),
    employee: one(core_1.users, {
        fields: [exports.skillsProgress.employeeId],
        references: [core_1.users.id],
    }),
}));
// ============================================================================
// RE-ANALYSIS TRIGGER SYSTEM
// Production-ready tables for automated skills re-analysis
// ============================================================================
exports.skillsReAnalysisQueue = (0, pg_core_1.pgTable)('skills_reanalysis_queue', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    employeeId: (0, pg_core_1.text)('employee_id').notNull(),
    reason: (0, pg_core_1.text)('reason').notNull(), // 'time-based' | 'role-change' | 'strategy-update' | 'learning-completion' | 'manual-request'
    status: (0, pg_core_1.text)('status').notNull().default('pending'), // 'pending' | 'processing' | 'completed' | 'failed'
    triggeredBy: (0, pg_core_1.text)('triggered_by'), // userId who triggered (or 'system' for auto-triggers)
    metadata: (0, pg_core_1.jsonb)('metadata'),
    processedAt: (0, pg_core_1.timestamp)('processed_at'),
    error: (0, pg_core_1.text)('error'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
});
exports.employeeRoleHistory = (0, pg_core_1.pgTable)('employee_role_history', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    employeeId: (0, pg_core_1.text)('employee_id').notNull(),
    previousRole: (0, pg_core_1.text)('previous_role'),
    newRole: (0, pg_core_1.text)('new_role').notNull(),
    previousDepartment: (0, pg_core_1.text)('previous_department'),
    newDepartment: (0, pg_core_1.text)('new_department'),
    changeReason: (0, pg_core_1.text)('change_reason'),
    effectiveDate: (0, pg_core_1.timestamp)('effective_date').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull()
});
exports.learningProgressEvents = (0, pg_core_1.pgTable)('learning_progress_events', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    tenantId: (0, pg_core_1.text)('tenant_id').notNull(),
    employeeId: (0, pg_core_1.text)('employee_id').notNull(),
    eventType: (0, pg_core_1.text)('event_type').notNull(), // 'completion' | 'progress' | 'started' | 'certification'
    learningPathId: (0, pg_core_1.text)('learning_path_id'),
    courseId: (0, pg_core_1.text)('course_id'),
    skillsAcquired: (0, pg_core_1.jsonb)('skills_acquired'),
    completionPercentage: (0, pg_core_1.integer)('completion_percentage').default(0),
    timestamp: (0, pg_core_1.timestamp)('timestamp').defaultNow().notNull()
});
//# sourceMappingURL=skills.js.map