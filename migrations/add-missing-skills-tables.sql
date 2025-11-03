-- Migration: Add Missing Skills Tables
-- Created: 2025-11-03
-- Purpose: Add 9 missing skills tables that were added to schema after initial migration

-- ============================================================================
-- 1. skills - Individual user skills tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS "skills" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "user_id" text NOT NULL,
  "name" text NOT NULL,
  "category" text NOT NULL, -- 'technical' | 'soft' | 'leadership' | 'analytical' | 'communication'
  "level" text NOT NULL, -- 'beginner' | 'intermediate' | 'advanced' | 'expert'
  "years_of_experience" integer,
  "verified" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- ============================================================================
-- 2. skills_gaps - Skills gap tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS "skills_gaps" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "employee_id" text,
  "skill" text NOT NULL,
  "category" text NOT NULL,
  "current_level" text NOT NULL,
  "required_level" text NOT NULL,
  "gap_severity" text NOT NULL, -- 'critical' | 'high' | 'medium' | 'low'
  "priority" integer NOT NULL,
  "business_impact" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- ============================================================================
-- 3. skills_framework - Strategic skills frameworks
-- ============================================================================
CREATE TABLE IF NOT EXISTS "skills_framework" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "framework_name" text NOT NULL,
  "industry" text NOT NULL,
  "strategic_skills" jsonb NOT NULL, -- Array of RequiredSkill
  "technical_skills" jsonb NOT NULL, -- Array of technical skills
  "soft_skills" jsonb NOT NULL, -- Array of soft skills
  "prioritization" jsonb NOT NULL, -- FrameworkInsight array
  "created_by" text NOT NULL, -- user who created framework
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- ============================================================================
-- 4. skills_assessment_sessions - Assessment workflow tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS "skills_assessment_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "session_name" text NOT NULL,
  "framework_id" text NOT NULL, -- Links to skills_framework
  "status" text NOT NULL, -- 'collecting' | 'analyzing' | 'completed' | 'failed'
  "employee_count" integer DEFAULT 0,
  "completed_count" integer DEFAULT 0,
  "analysis_results" jsonb, -- SkillsWorkflow results
  "strategic_assessment" jsonb, -- OrganizationAssessment
  "started_at" timestamp DEFAULT now() NOT NULL,
  "completed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- ============================================================================
-- 5. skills_bot_interactions - BOT interaction history
-- ============================================================================
CREATE TABLE IF NOT EXISTS "skills_bot_interactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "user_id" text NOT NULL,
  "session_id" text, -- Links to skills_assessment_sessions
  "interaction_type" text NOT NULL, -- 'resume_upload', 'gap_explanation', 'learning_guidance', etc.
  "user_query" text NOT NULL,
  "bot_response" text NOT NULL,
  "context" jsonb, -- Additional context data
  "resolved" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- ============================================================================
-- 6. skills_learning_triggers - LXP module integration triggers
-- ============================================================================
CREATE TABLE IF NOT EXISTS "skills_learning_triggers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "employee_id" text NOT NULL,
  "session_id" text NOT NULL, -- Links to skills_assessment_sessions
  "skill_gaps" jsonb NOT NULL, -- Array of SkillGap
  "learning_paths" jsonb NOT NULL, -- Array of LearningPath
  "priority" text NOT NULL,
  "status" text DEFAULT 'pending', -- 'pending' | 'processing' | 'completed' | 'failed'
  "lxp_path_id" text, -- Links to LXP module
  "created_at" timestamp DEFAULT now() NOT NULL,
  "processed_at" timestamp
);

-- ============================================================================
-- 7. skills_talent_triggers - Talent module integration triggers
-- ============================================================================
CREATE TABLE IF NOT EXISTS "skills_talent_triggers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "employee_id" text NOT NULL,
  "session_id" text NOT NULL,
  "skills_data" jsonb NOT NULL, -- Skills analysis data
  "potential_roles" jsonb, -- Identified potential roles
  "readiness_score" integer,
  "status" text DEFAULT 'pending', -- 'pending' | 'processing' | 'completed' | 'failed'
  "talent_module_id" text, -- Links to Talent module
  "created_at" timestamp DEFAULT now() NOT NULL,
  "processed_at" timestamp
);

-- ============================================================================
-- 8. skills_bonus_triggers - Bonus module integration triggers
-- ============================================================================
CREATE TABLE IF NOT EXISTS "skills_bonus_triggers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "employee_id" text NOT NULL,
  "session_id" text NOT NULL,
  "skills_achievements" jsonb NOT NULL, -- Array of achieved skills
  "recommended_bonus" integer, -- Bonus amount
  "bonus_criteria" jsonb, -- Criteria for bonus
  "status" text DEFAULT 'pending', -- 'pending' | 'processing' | 'completed' | 'failed'
  "bonus_module_id" text, -- Links to Bonus module
  "created_at" timestamp DEFAULT now() NOT NULL,
  "processed_at" timestamp
);

-- ============================================================================
-- 9. skills_progress - Individual skill development progress tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS "skills_progress" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL,
  "employee_id" text NOT NULL,
  "skill_id" text NOT NULL,
  "skill_name" text NOT NULL,
  "current_level" text NOT NULL,
  "target_level" text NOT NULL,
  "progress_percentage" integer DEFAULT 0,
  "learning_path_id" text, -- Links to LXP learning path
  "milestones" jsonb, -- Array of progress milestones
  "last_updated" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- ============================================================================
-- Create indexes for performance
-- ============================================================================

-- skills table indexes
CREATE INDEX IF NOT EXISTS "idx_skills_tenant_id" ON "skills" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_skills_user_id" ON "skills" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_skills_category" ON "skills" ("category");

-- skills_gaps table indexes
CREATE INDEX IF NOT EXISTS "idx_skills_gaps_tenant_id" ON "skills_gaps" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_skills_gaps_employee_id" ON "skills_gaps" ("employee_id");
CREATE INDEX IF NOT EXISTS "idx_skills_gaps_severity" ON "skills_gaps" ("gap_severity");

-- skills_framework table indexes
CREATE INDEX IF NOT EXISTS "idx_skills_framework_tenant_id" ON "skills_framework" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_skills_framework_created_by" ON "skills_framework" ("created_by");

-- skills_assessment_sessions table indexes
CREATE INDEX IF NOT EXISTS "idx_skills_assessment_sessions_tenant_id" ON "skills_assessment_sessions" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_skills_assessment_sessions_framework_id" ON "skills_assessment_sessions" ("framework_id");
CREATE INDEX IF NOT EXISTS "idx_skills_assessment_sessions_status" ON "skills_assessment_sessions" ("status");

-- skills_bot_interactions table indexes
CREATE INDEX IF NOT EXISTS "idx_skills_bot_interactions_tenant_id" ON "skills_bot_interactions" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_skills_bot_interactions_user_id" ON "skills_bot_interactions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_skills_bot_interactions_session_id" ON "skills_bot_interactions" ("session_id");

-- skills_learning_triggers table indexes
CREATE INDEX IF NOT EXISTS "idx_skills_learning_triggers_tenant_id" ON "skills_learning_triggers" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_skills_learning_triggers_employee_id" ON "skills_learning_triggers" ("employee_id");
CREATE INDEX IF NOT EXISTS "idx_skills_learning_triggers_session_id" ON "skills_learning_triggers" ("session_id");
CREATE INDEX IF NOT EXISTS "idx_skills_learning_triggers_status" ON "skills_learning_triggers" ("status");

-- skills_talent_triggers table indexes
CREATE INDEX IF NOT EXISTS "idx_skills_talent_triggers_tenant_id" ON "skills_talent_triggers" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_skills_talent_triggers_employee_id" ON "skills_talent_triggers" ("employee_id");
CREATE INDEX IF NOT EXISTS "idx_skills_talent_triggers_session_id" ON "skills_talent_triggers" ("session_id");
CREATE INDEX IF NOT EXISTS "idx_skills_talent_triggers_status" ON "skills_talent_triggers" ("status");

-- skills_bonus_triggers table indexes
CREATE INDEX IF NOT EXISTS "idx_skills_bonus_triggers_tenant_id" ON "skills_bonus_triggers" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_skills_bonus_triggers_employee_id" ON "skills_bonus_triggers" ("employee_id");
CREATE INDEX IF NOT EXISTS "idx_skills_bonus_triggers_session_id" ON "skills_bonus_triggers" ("session_id");
CREATE INDEX IF NOT EXISTS "idx_skills_bonus_triggers_status" ON "skills_bonus_triggers" ("status");

-- skills_progress table indexes
CREATE INDEX IF NOT EXISTS "idx_skills_progress_tenant_id" ON "skills_progress" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_skills_progress_employee_id" ON "skills_progress" ("employee_id");
CREATE INDEX IF NOT EXISTS "idx_skills_progress_skill_id" ON "skills_progress" ("skill_id");

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Total tables created: 9
-- Total indexes created: 32
-- ============================================================================
