DO $$ BEGIN
 CREATE TYPE "one_on_one_status" AS ENUM('scheduled', 'completed', 'cancelled', 'rescheduled', 'no_show');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "performance_cycle_status" AS ENUM('upcoming', 'active', 'completed', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "performance_feedback_type" AS ENUM('manager_feedback', 'peer_feedback', 'self_assessment', '360_feedback', 'customer_feedback', 'stakeholder_feedback');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "performance_goal_category" AS ENUM('revenue', 'productivity', 'quality', 'learning', 'leadership', 'innovation', 'customer_satisfaction', 'operational_excellence');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "performance_goal_format" AS ENUM('okr', 'smart', 'kpi', 'mbo');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "performance_goal_status" AS ENUM('draft', 'active', 'completed', 'abandoned', 'on_hold', 'overdue');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "performance_goal_type" AS ENUM('individual', 'team', 'organizational');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "performance_improvement_status" AS ENUM('draft', 'active', 'completed', 'cancelled', 'escalated');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "performance_metric_type" AS ENUM('quantitative', 'qualitative', 'behavioral', 'competency', 'skill_based', 'objective_based');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "performance_review_status" AS ENUM('draft', 'in_progress', 'completed', 'cancelled', 'requires_approval');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "performance_review_type" AS ENUM('annual', 'quarterly', 'monthly', 'project_based', 'probation', 'promotion', '360_degree');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "assessment_type" AS ENUM('skills', 'culture_fit', 'technical', 'behavioral', 'cognitive', 'personality', 'resume_review');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "candidate_source" AS ENUM('job_board', 'referral', 'agency', 'direct', 'linkedin', 'career_page', 'social_media', 'event', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "candidate_stage" AS ENUM('application', 'resume_review', 'phone_screen', 'technical_assessment', 'behavioral_interview', 'final_interview', 'reference_check', 'offer', 'hired');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "candidate_status" AS ENUM('applied', 'screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn', 'on_hold');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "interview_recommendation" AS ENUM('strong_yes', 'yes', 'maybe', 'no', 'strong_no');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "interview_status" AS ENUM('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled', 'no_show');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "interview_type" AS ENUM('phone', 'video', 'in_person', 'technical', 'behavioral', 'panel', 'culture_fit', 'final');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "job_level" AS ENUM('entry', 'mid', 'senior', 'executive', 'leadership');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "job_posting_status" AS ENUM('draft', 'pending_approval', 'approved', 'published', 'paused', 'closed', 'expired');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "job_type" AS ENUM('full_time', 'part_time', 'contract', 'temporary', 'intern');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "offer_status" AS ENUM('draft', 'pending_approval', 'approved', 'sent', 'negotiating', 'accepted', 'rejected', 'expired', 'withdrawn');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "requisition_status" AS ENUM('draft', 'pending_approval', 'approved', 'posted', 'filled', 'cancelled', 'on_hold');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "requisition_urgency" AS ENUM('low', 'medium', 'high', 'critical');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"results" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"plan" text DEFAULT 'free' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"industry" text,
	"employee_count" integer,
	"vision" text,
	"mission" text,
	"strategy" text,
	"values" jsonb,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"primary_contact" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"manager_id" text,
	"parent_department_id" text,
	"budget" numeric,
	"head_count" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"bio" text,
	"skills" jsonb,
	"interests" jsonb,
	"certifications" jsonb,
	"profile_picture" text,
	"linkedin_url" text,
	"twitter_url" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "framework_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"cylinders" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "org_inputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "org_structures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text,
	"submitted_by" text,
	"raw_text" text NOT NULL,
	"parsed_data" jsonb,
	"analysis_result" jsonb,
	"is_public" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "structure_analysis_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"analysis_id" text NOT NULL,
	"results" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'employee' NOT NULL,
	"title" text,
	"department_id" text,
	"manager_id" text,
	"is_active" boolean DEFAULT true,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "company_strategies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"vision" text,
	"mission" text,
	"values" jsonb,
	"objectives" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organization_structure" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"structure_data" jsonb NOT NULL,
	"uploaded_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "culture_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"company_id" text,
	"user_id" text NOT NULL,
	"personal_values" jsonb,
	"current_experience" jsonb,
	"desired_experience" jsonb,
	"recognition" integer,
	"engagement" integer,
	"completed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "culture_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"analysis_id" text,
	"report_type" text NOT NULL,
	"report_data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "culture_survey_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"campaign_id" text NOT NULL,
	"campaign_name" text,
	"employee_id" text NOT NULL,
	"employee_email" text NOT NULL,
	"survey_token" text NOT NULL,
	"survey_link" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp,
	"completed_at" timestamp,
	"reminders_sent" integer DEFAULT 0,
	"last_reminder_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "culture_survey_invitations_survey_token_unique" UNIQUE("survey_token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cylinder_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"assessment_id" text,
	"cylinder1_safety" integer,
	"cylinder2_belonging" integer,
	"cylinder3_growth" integer,
	"cylinder4_meaning" integer,
	"cylinder5_integrity" integer,
	"cylinder6_wisdom" integer,
	"cylinder7_transcendence" integer,
	"enabling_values" jsonb,
	"limiting_values" jsonb,
	"overall_score" integer,
	"cultural_maturity" integer,
	"entropy_score" integer,
	"assessment_date" timestamp DEFAULT now() NOT NULL,
	"assessed_by" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_skills_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"profile_type" text NOT NULL,
	"resume_url" text,
	"resume_file_name" text,
	"resume_text" text,
	"current_experience" jsonb,
	"past_experience" jsonb,
	"education" jsonb,
	"certifications" jsonb,
	"projects" jsonb,
	"technical_skills" jsonb,
	"soft_skills" jsonb,
	"domain_knowledge" jsonb,
	"tools" jsonb,
	"languages" jsonb,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"is_complete" boolean DEFAULT false,
	"completion_percentage" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skills_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"current_skills" jsonb,
	"required_skills" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skills_gap_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"profile_id" text NOT NULL,
	"analysis_type" text NOT NULL,
	"critical_gaps" jsonb,
	"moderate_gaps" jsonb,
	"strength_areas" jsonb,
	"training_recommendations" jsonb,
	"development_plan" jsonb,
	"estimated_time_to_close" integer,
	"overall_skill_score" integer,
	"strategic_alignment_score" integer,
	"readiness_score" integer,
	"analyzed_at" timestamp DEFAULT now() NOT NULL,
	"analyzed_by" text DEFAULT 'skills_agent',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skills_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"report_type" text NOT NULL,
	"target_id" text,
	"report_data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "strategy_skill_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"strategy_id" text,
	"organizational_skills" jsonb,
	"departmental_skills" jsonb,
	"role_skills" jsonb,
	"critical_skills" jsonb,
	"important_skills" jsonb,
	"nice_to_have_skills" jsonb,
	"current_needs" jsonb,
	"future_needs" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "one_on_one_meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"manager_id" uuid NOT NULL,
	"performance_cycle_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"meeting_type" text DEFAULT 'regular' NOT NULL,
	"scheduled_date" timestamp with time zone NOT NULL,
	"scheduled_end_date" timestamp with time zone,
	"duration" integer DEFAULT 30 NOT NULL,
	"location" text,
	"meeting_link" text,
	"status" "one_on_one_status" DEFAULT 'scheduled' NOT NULL,
	"actual_start_time" timestamp with time zone,
	"actual_end_time" timestamp with time zone,
	"bot_assisted" boolean DEFAULT true,
	"bot_session_id" text,
	"employee_preparation_notes" text,
	"manager_preparation_notes" text,
	"employee_prepared" boolean DEFAULT false,
	"manager_prepared" boolean DEFAULT false,
	"agenda" jsonb DEFAULT '[]'::jsonb,
	"suggested_topics" jsonb DEFAULT '[]'::jsonb,
	"employee_topics" jsonb DEFAULT '[]'::jsonb,
	"manager_topics" jsonb DEFAULT '[]'::jsonb,
	"meeting_notes" text,
	"employee_notes" text,
	"manager_notes" text,
	"key_discussion_points" jsonb DEFAULT '[]'::jsonb,
	"action_items" jsonb DEFAULT '[]'::jsonb,
	"employee_action_items" jsonb DEFAULT '[]'::jsonb,
	"manager_action_items" jsonb DEFAULT '[]'::jsonb,
	"decisions" jsonb DEFAULT '[]'::jsonb,
	"performance_discussed" boolean DEFAULT false,
	"goals_discussed" jsonb DEFAULT '[]'::jsonb,
	"feedback_given" jsonb DEFAULT '[]'::jsonb,
	"challenges_discussed" jsonb DEFAULT '[]'::jsonb,
	"support_needed" jsonb DEFAULT '[]'::jsonb,
	"meeting_outcome" text,
	"employee_satisfaction" integer,
	"manager_satisfaction" integer,
	"effectiveness_score" numeric(3, 2),
	"feedback_to_engagement" jsonb DEFAULT '{}'::jsonb,
	"feedback_to_recognition" jsonb DEFAULT '{}'::jsonb,
	"development_needs" jsonb DEFAULT '[]'::jsonb,
	"wellbeing_indicators" jsonb DEFAULT '{}'::jsonb,
	"requires_follow_up" boolean DEFAULT false,
	"follow_up_date" timestamp with time zone,
	"follow_up_completed" boolean DEFAULT false,
	"next_meeting_scheduled" boolean DEFAULT false,
	"next_meeting_id" uuid,
	"is_confidential" boolean DEFAULT false,
	"shared_with_hr" boolean DEFAULT false,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"period_type" text NOT NULL,
	"overall_score" numeric(3, 2),
	"goal_achievement_rate" numeric(5, 2),
	"competency_score" numeric(3, 2),
	"behavior_score" numeric(3, 2),
	"total_goals" integer DEFAULT 0,
	"completed_goals" integer DEFAULT 0,
	"overdue_goals" integer DEFAULT 0,
	"average_goal_progress" numeric(5, 2),
	"total_reviews" integer DEFAULT 0,
	"average_review_rating" numeric(3, 2),
	"review_completion_rate" numeric(5, 2),
	"total_feedback" integer DEFAULT 0,
	"average_feedback_rating" numeric(3, 2),
	"feedback_response_rate" numeric(5, 2),
	"improvement_plans" integer DEFAULT 0,
	"completed_improvement_plans" integer DEFAULT 0,
	"improvement_success_rate" numeric(5, 2),
	"performance_trend" text,
	"goal_trend" text,
	"competency_trend" text,
	"behavior_trend" text,
	"percentile_rank" numeric(5, 2),
	"department_rank" integer,
	"team_rank" integer,
	"performance_risk" text,
	"retention_risk" text,
	"development_needs" jsonb DEFAULT '[]'::jsonb,
	"predicted_performance" numeric(3, 2),
	"predicted_retention" numeric(3, 2),
	"predicted_promotion" numeric(3, 2),
	"tags" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"cycle_type" text DEFAULT 'quarterly' NOT NULL,
	"fiscal_year" integer NOT NULL,
	"quarter" integer,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"review_due_date" timestamp with time zone,
	"status" "performance_cycle_status" DEFAULT 'upcoming' NOT NULL,
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT false,
	"objectives" jsonb DEFAULT '[]'::jsonb,
	"priorities" jsonb DEFAULT '[]'::jsonb,
	"skills_needed" jsonb DEFAULT '[]'::jsonb,
	"culture_focus" jsonb DEFAULT '[]'::jsonb,
	"strategy_alignment" jsonb DEFAULT '{}'::jsonb,
	"department_goals" jsonb DEFAULT '[]'::jsonb,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"review_template" jsonb DEFAULT '{}'::jsonb,
	"goal_settings" jsonb DEFAULT '{}'::jsonb,
	"included_departments" jsonb DEFAULT '[]'::jsonb,
	"included_roles" jsonb DEFAULT '[]'::jsonb,
	"excluded_employees" jsonb DEFAULT '[]'::jsonb,
	"total_participants" integer DEFAULT 0,
	"completed_reviews" integer DEFAULT 0,
	"completion_rate" numeric(5, 2) DEFAULT '0.00',
	"configured_by" uuid,
	"configured_at" timestamp with time zone,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"review_id" uuid,
	"type" "performance_feedback_type" DEFAULT 'manager_feedback' NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"strengths" jsonb DEFAULT '[]'::jsonb,
	"improvement_areas" jsonb DEFAULT '[]'::jsonb,
	"specific_examples" jsonb DEFAULT '[]'::jsonb,
	"overall_rating" numeric(3, 2),
	"competency_ratings" jsonb DEFAULT '{}'::jsonb,
	"behavior_ratings" jsonb DEFAULT '{}'::jsonb,
	"categories" jsonb DEFAULT '[]'::jsonb,
	"is_anonymous" boolean DEFAULT false,
	"is_confidential" boolean DEFAULT false,
	"feedback_period_start" timestamp with time zone NOT NULL,
	"feedback_period_end" timestamp with time zone NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now(),
	"action_items" jsonb DEFAULT '[]'::jsonb,
	"follow_up_required" boolean DEFAULT false,
	"follow_up_date" timestamp with time zone,
	"is_approved" boolean DEFAULT false,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"is_visible_to_employee" boolean DEFAULT true,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"manager_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" "performance_goal_type" DEFAULT 'individual' NOT NULL,
	"category" "performance_goal_category" NOT NULL,
	"goal_format" "performance_goal_format" DEFAULT 'smart' NOT NULL,
	"target" jsonb NOT NULL,
	"current" jsonb DEFAULT '{}'::jsonb,
	"baseline" jsonb DEFAULT '{}'::jsonb,
	"weight" numeric(3, 2) DEFAULT '1.00' NOT NULL,
	"priority" integer DEFAULT 1 NOT NULL,
	"status" "performance_goal_status" DEFAULT 'draft' NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"target_date" timestamp with time zone NOT NULL,
	"actual_completion_date" timestamp with time zone,
	"progress_percentage" numeric(5, 2) DEFAULT '0.00',
	"last_updated" timestamp with time zone DEFAULT now(),
	"parent_goal_id" uuid,
	"aligned_goals" jsonb DEFAULT '[]'::jsonb,
	"dependencies" jsonb DEFAULT '[]'::jsonb,
	"requires_approval" boolean DEFAULT false,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"notes" text,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_improvement_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"manager_id" uuid NOT NULL,
	"review_id" uuid,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" "performance_improvement_status" DEFAULT 'draft' NOT NULL,
	"performance_issues" jsonb NOT NULL,
	"root_causes" jsonb DEFAULT '[]'::jsonb,
	"impact_assessment" jsonb DEFAULT '{}'::jsonb,
	"objectives" jsonb NOT NULL,
	"success_criteria" jsonb NOT NULL,
	"target_timeline" integer NOT NULL,
	"action_items" jsonb NOT NULL,
	"resources" jsonb DEFAULT '[]'::jsonb,
	"support" jsonb DEFAULT '[]'::jsonb,
	"progress_percentage" numeric(5, 2) DEFAULT '0.00',
	"milestones" jsonb DEFAULT '[]'::jsonb,
	"last_review_date" timestamp with time zone,
	"next_review_date" timestamp with time zone,
	"start_date" timestamp with time zone NOT NULL,
	"target_completion_date" timestamp with time zone NOT NULL,
	"actual_completion_date" timestamp with time zone,
	"outcomes" jsonb DEFAULT '[]'::jsonb,
	"lessons_learned" jsonb DEFAULT '[]'::jsonb,
	"recommendations" jsonb DEFAULT '[]'::jsonb,
	"is_escalated" boolean DEFAULT false,
	"escalated_to" uuid,
	"escalated_at" timestamp with time zone,
	"escalation_reason" text,
	"requires_approval" boolean DEFAULT false,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"notes" text,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"goal_id" uuid,
	"review_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"type" "performance_metric_type" DEFAULT 'quantitative' NOT NULL,
	"category" text NOT NULL,
	"target_value" numeric(10, 2),
	"actual_value" numeric(10, 2),
	"baseline_value" numeric(10, 2),
	"unit" text,
	"formula" text,
	"data_source" text,
	"frequency" text DEFAULT 'monthly',
	"is_kpi" boolean DEFAULT false,
	"is_critical" boolean DEFAULT false,
	"weight" numeric(3, 2) DEFAULT '1.00',
	"measurement_start_date" timestamp with time zone NOT NULL,
	"measurement_end_date" timestamp with time zone NOT NULL,
	"last_measured_at" timestamp with time zone,
	"trend" text,
	"variance" numeric(10, 2),
	"variance_percentage" numeric(5, 2),
	"tags" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"review_period_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"type" "performance_review_type" DEFAULT 'annual' NOT NULL,
	"status" "performance_review_status" DEFAULT 'draft' NOT NULL,
	"review_start_date" timestamp with time zone NOT NULL,
	"review_end_date" timestamp with time zone NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"goals" jsonb DEFAULT '[]'::jsonb,
	"achievements" jsonb DEFAULT '[]'::jsonb,
	"challenges" jsonb DEFAULT '[]'::jsonb,
	"development_areas" jsonb DEFAULT '[]'::jsonb,
	"overall_rating" numeric(3, 2),
	"goal_achievement_score" numeric(3, 2),
	"competency_score" numeric(3, 2),
	"behavior_score" numeric(3, 2),
	"manager_comments" text,
	"employee_comments" text,
	"strengths" jsonb DEFAULT '[]'::jsonb,
	"improvement_areas" jsonb DEFAULT '[]'::jsonb,
	"next_period_goals" jsonb DEFAULT '[]'::jsonb,
	"development_plan" jsonb DEFAULT '{}'::jsonb,
	"training_recommendations" jsonb DEFAULT '[]'::jsonb,
	"is_360_review" boolean DEFAULT false,
	"peer_reviewers" jsonb DEFAULT '[]'::jsonb,
	"stakeholder_reviewers" jsonb DEFAULT '[]'::jsonb,
	"requires_approval" boolean DEFAULT false,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"agent_type" text NOT NULL,
	"results" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trigger_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trigger_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"status" text NOT NULL,
	"input_data" jsonb,
	"output_data" jsonb,
	"error_message" text,
	"execution_time" integer,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "triggers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"source_module" text NOT NULL,
	"event_type" text NOT NULL,
	"conditions" jsonb,
	"target_module" text NOT NULL,
	"action" text NOT NULL,
	"action_config" jsonb,
	"is_active" boolean DEFAULT true,
	"priority" integer DEFAULT 5,
	"last_triggered_at" timestamp,
	"trigger_count" integer DEFAULT 0,
	"success_count" integer DEFAULT 0,
	"failure_count" integer DEFAULT 0,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lxp_assessment_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"answers" jsonb NOT NULL,
	"score" integer NOT NULL,
	"points_earned" integer,
	"points_possible" integer,
	"passed" boolean NOT NULL,
	"time_spent" integer,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp NOT NULL,
	"feedback" jsonb,
	"incorrect_questions" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lxp_course_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"questions" jsonb NOT NULL,
	"passing_score" integer DEFAULT 70 NOT NULL,
	"total_points" integer,
	"time_limit" integer,
	"allowed_attempts" integer DEFAULT 3,
	"randomize_questions" boolean DEFAULT false,
	"show_correct_answers" boolean DEFAULT true,
	"allow_review" boolean DEFAULT true,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lxp_course_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"learning_path_id" uuid,
	"status" text DEFAULT 'enrolled' NOT NULL,
	"progress" integer DEFAULT 0,
	"start_date" timestamp,
	"completion_date" timestamp,
	"time_spent" integer DEFAULT 0,
	"score" integer,
	"attempts" integer DEFAULT 0,
	"last_accessed_at" timestamp,
	"certificate_issued" boolean DEFAULT false,
	"certificate_url" text,
	"feedback" jsonb,
	"rating" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lxp_courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"level" text NOT NULL,
	"duration" integer NOT NULL,
	"provider" text,
	"format" text NOT NULL,
	"content" jsonb,
	"skills" text[],
	"prerequisites" text[],
	"metadata" jsonb,
	"thumbnail_url" text,
	"language" text DEFAULT 'en',
	"version" text DEFAULT '1.0',
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"published_at" timestamp,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lxp_learning_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"enrollment_id" uuid,
	"course_id" uuid,
	"learning_path_id" uuid,
	"event_type" text NOT NULL,
	"event_data" jsonb,
	"session_id" text,
	"device_type" text,
	"location" text,
	"engagement_score" numeric,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lxp_learning_paths" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"type" text NOT NULL,
	"goal_skills" text[],
	"current_level" text,
	"target_level" text,
	"courses" jsonb NOT NULL,
	"milestones" jsonb,
	"status" text DEFAULT 'not_started' NOT NULL,
	"progress" integer DEFAULT 0,
	"start_date" timestamp,
	"target_completion_date" timestamp,
	"actual_completion_date" timestamp,
	"created_by" text NOT NULL,
	"triggered_by" uuid,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "candidate_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"requisition_id" uuid NOT NULL,
	"assessment_type" "assessment_type" NOT NULL,
	"assessment_name" text NOT NULL,
	"assessed_by" text NOT NULL,
	"assessor_role" text,
	"overall_score" numeric(5, 2) NOT NULL,
	"scores" jsonb NOT NULL,
	"max_score" numeric(5, 2) DEFAULT '100.00',
	"passing_score" numeric(5, 2) DEFAULT '70.00',
	"passed" boolean DEFAULT false,
	"skills_assessed" jsonb DEFAULT '[]'::jsonb,
	"skill_gaps" jsonb DEFAULT '[]'::jsonb,
	"skill_strengths" jsonb DEFAULT '[]'::jsonb,
	"culture_fit_analysis" jsonb,
	"culture_alignment" jsonb,
	"culture_fit_score" numeric(5, 2),
	"strengths" jsonb DEFAULT '[]'::jsonb,
	"weaknesses" jsonb DEFAULT '[]'::jsonb,
	"opportunities" jsonb DEFAULT '[]'::jsonb,
	"concerns" jsonb DEFAULT '[]'::jsonb,
	"recommendation" text,
	"recommendations" text,
	"next_steps" jsonb DEFAULT '[]'::jsonb,
	"technical_challenges" jsonb,
	"code_quality" numeric(5, 2),
	"problem_solving" numeric(5, 2),
	"behavioral_traits" jsonb,
	"leadership_potential" numeric(5, 2),
	"teamwork_score" numeric(5, 2),
	"assessment_duration" integer,
	"completion_rate" numeric(3, 2),
	"assessment_date" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now(),
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"requisition_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"linkedin_url" text,
	"portfolio_url" text,
	"github_url" text,
	"personal_website" text,
	"resume_url" text NOT NULL,
	"cover_letter_url" text,
	"additional_documents" jsonb DEFAULT '[]'::jsonb,
	"source" "candidate_source" NOT NULL,
	"source_details" text,
	"referred_by" uuid,
	"current_company" text,
	"current_title" text,
	"years_of_experience" integer,
	"current_salary" numeric(12, 2),
	"expected_salary" numeric(12, 2),
	"notice_period" text,
	"education" jsonb DEFAULT '[]'::jsonb,
	"certifications" jsonb DEFAULT '[]'::jsonb,
	"skills" jsonb DEFAULT '[]'::jsonb,
	"languages" jsonb DEFAULT '[]'::jsonb,
	"industry_experience" jsonb DEFAULT '[]'::jsonb,
	"status" "candidate_status" DEFAULT 'applied' NOT NULL,
	"stage" "candidate_stage" DEFAULT 'application' NOT NULL,
	"overall_score" numeric(5, 2),
	"skills_score" numeric(5, 2),
	"culture_score" numeric(5, 2),
	"experience_score" numeric(5, 2),
	"education_score" numeric(5, 2),
	"assessment_summary" jsonb,
	"strengths" jsonb DEFAULT '[]'::jsonb,
	"weaknesses" jsonb DEFAULT '[]'::jsonb,
	"red_flags" jsonb DEFAULT '[]'::jsonb,
	"culture_analysis" jsonb,
	"culture_alignment" jsonb,
	"notes" text,
	"internal_notes" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"willing_to_relocate" boolean,
	"remote_preference" text,
	"available_start_date" timestamp with time zone,
	"last_contacted_date" timestamp with time zone,
	"response_rate" numeric(3, 2),
	"ai_recommendation" text,
	"ai_insights" jsonb,
	"applied_at" timestamp with time zone DEFAULT now(),
	"last_updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now(),
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hiring_requisitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"position_title" text NOT NULL,
	"department" text NOT NULL,
	"level" "job_level" NOT NULL,
	"type" "job_type" DEFAULT 'full_time' NOT NULL,
	"location" text NOT NULL,
	"remote" boolean DEFAULT false NOT NULL,
	"remote_details" text,
	"description" text NOT NULL,
	"responsibilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"qualifications" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"required_skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"preferred_skills" jsonb DEFAULT '[]'::jsonb,
	"experience_required" text,
	"education_required" text,
	"culture_values" jsonb DEFAULT '[]'::jsonb,
	"culture_fit_weight" numeric(3, 2) DEFAULT '0.30',
	"compensation_range" jsonb NOT NULL,
	"bonus" jsonb,
	"equity" text,
	"benefits" jsonb DEFAULT '[]'::jsonb,
	"relocation_package" boolean DEFAULT false,
	"relocation_details" text,
	"urgency" "requisition_urgency" DEFAULT 'medium' NOT NULL,
	"status" "requisition_status" DEFAULT 'draft' NOT NULL,
	"number_of_positions" integer DEFAULT 1 NOT NULL,
	"positions_filled" integer DEFAULT 0 NOT NULL,
	"target_start_date" timestamp with time zone,
	"expected_close_date" timestamp with time zone,
	"posted_date" timestamp with time zone,
	"closed_date" timestamp with time zone,
	"requested_by" uuid NOT NULL,
	"hiring_manager_id" uuid NOT NULL,
	"recruiter_id" uuid,
	"approved_by" uuid,
	"approval_date" timestamp with time zone,
	"job_posting_url" text,
	"job_boards" jsonb DEFAULT '[]'::jsonb,
	"ai_generated" boolean DEFAULT false,
	"ai_recommendations" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "interviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"requisition_id" uuid NOT NULL,
	"interview_type" "interview_type" NOT NULL,
	"round" integer DEFAULT 1 NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"scheduled_date" timestamp with time zone NOT NULL,
	"duration" integer DEFAULT 60 NOT NULL,
	"timezone" text DEFAULT 'UTC',
	"location" text,
	"meeting_link" text,
	"meeting_platform" text,
	"meeting_id" text,
	"interviewers" jsonb NOT NULL,
	"primary_interviewer" uuid,
	"panel_size" integer DEFAULT 1,
	"status" "interview_status" DEFAULT 'scheduled' NOT NULL,
	"confirmation_sent" boolean DEFAULT false,
	"reminder_sent" boolean DEFAULT false,
	"feedback" jsonb DEFAULT '[]'::jsonb,
	"scores" jsonb,
	"overall_score" numeric(5, 2),
	"recommendation" "interview_recommendation",
	"recommendations" text,
	"technical_skills" numeric(5, 2),
	"communication" numeric(5, 2),
	"problem_solving" numeric(5, 2),
	"culture_fit" numeric(5, 2),
	"leadership_potential" numeric(5, 2),
	"strengths" jsonb DEFAULT '[]'::jsonb,
	"weaknesses" jsonb DEFAULT '[]'::jsonb,
	"concerns" jsonb DEFAULT '[]'::jsonb,
	"red_flags" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"internal_notes" text,
	"recording_url" text,
	"transcript_url" text,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_postings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"requisition_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"responsibilities" text NOT NULL,
	"requirements" text NOT NULL,
	"qualifications" text,
	"company_name" text NOT NULL,
	"company_description" text,
	"company_values" jsonb DEFAULT '[]'::jsonb,
	"company_benefits" text,
	"salary_range" text,
	"display_salary" boolean DEFAULT true,
	"benefits_summary" text,
	"location" text NOT NULL,
	"remote" boolean DEFAULT false,
	"remote_details" text,
	"linkedin_version" text,
	"indeed_version" text,
	"career_page_version" text,
	"seo_title" text,
	"seo_description" text,
	"keywords" jsonb DEFAULT '[]'::jsonb,
	"status" "job_posting_status" DEFAULT 'draft' NOT NULL,
	"published_platforms" jsonb DEFAULT '[]'::jsonb,
	"career_page_url" text,
	"external_urls" jsonb DEFAULT '{}'::jsonb,
	"requires_approval" boolean DEFAULT true,
	"approved_by" uuid,
	"approval_date" timestamp with time zone,
	"approval_notes" text,
	"published_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"views" integer DEFAULT 0,
	"applications" integer DEFAULT 0,
	"click_through_rate" numeric(5, 2),
	"ai_generated" boolean DEFAULT false,
	"generated_by" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"requisition_id" uuid NOT NULL,
	"position_title" text NOT NULL,
	"department" text NOT NULL,
	"level" "job_level" NOT NULL,
	"type" "job_type" NOT NULL,
	"location" text NOT NULL,
	"remote" boolean DEFAULT false,
	"salary" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"pay_frequency" text DEFAULT 'annual',
	"bonus" jsonb,
	"equity" jsonb,
	"sign_on_bonus" numeric(12, 2),
	"benefits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"benefits_value" numeric(12, 2),
	"relocation_assistance" boolean DEFAULT false,
	"relocation_package" jsonb,
	"start_date" timestamp with time zone NOT NULL,
	"employment_type" text,
	"probation_period" text,
	"offer_letter_url" text,
	"contract_url" text,
	"additional_documents" jsonb DEFAULT '[]'::jsonb,
	"status" "offer_status" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"requires_approval" boolean DEFAULT true,
	"approved_by" uuid,
	"approval_date" timestamp with time zone,
	"sent_date" timestamp with time zone,
	"expiry_date" timestamp with time zone,
	"responded_date" timestamp with time zone,
	"accepted_date" timestamp with time zone,
	"rejected_date" timestamp with time zone,
	"negotiation_notes" text,
	"negotiation_history" jsonb DEFAULT '[]'::jsonb,
	"counter_offers" jsonb DEFAULT '[]'::jsonb,
	"rejection_reason" text,
	"withdrawal_reason" text,
	"onboarding_triggered" boolean DEFAULT false,
	"onboarding_date" timestamp with time zone,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"subscription_id" text,
	"stripe_invoice_id" text,
	"number" text,
	"status" text NOT NULL,
	"amount" integer NOT NULL,
	"amount_paid" integer DEFAULT 0,
	"amount_due" integer,
	"currency" text DEFAULT 'usd' NOT NULL,
	"due_date" timestamp,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"pdf_url" text,
	CONSTRAINT "invoices_stripe_invoice_id_unique" UNIQUE("stripe_invoice_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"company_id" text,
	"user_id" text,
	"stripe_customer_id" text,
	"stripe_payment_intent_id" text,
	"stripe_subscription_id" text,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"status" text NOT NULL,
	"payment_method" text,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"paid_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"company_id" text,
	"stripe_subscription_id" text,
	"stripe_price_id" text,
	"stripe_product_id" text,
	"status" text NOT NULL,
	"plan" text NOT NULL,
	"billing_period" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"max_users" integer,
	"max_analyses" integer,
	"features" jsonb,
	"trial_ends_at" timestamp,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"canceled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_media_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"company_id" text NOT NULL,
	"platform" text NOT NULL,
	"account_name" text NOT NULL,
	"account_id" text,
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"is_active" boolean DEFAULT true,
	"last_synced_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_media_campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"platforms" jsonb,
	"frequency" text,
	"status" text NOT NULL,
	"total_posts" integer DEFAULT 0,
	"total_engagement" integer DEFAULT 0,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_media_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"company_id" text NOT NULL,
	"platform" text NOT NULL,
	"content" text NOT NULL,
	"media_urls" jsonb,
	"hashtags" jsonb,
	"campaign_id" text,
	"campaign_type" text,
	"status" text NOT NULL,
	"scheduled_for" timestamp,
	"published_at" timestamp,
	"platform_post_id" text,
	"likes" integer DEFAULT 0,
	"shares" integer DEFAULT 0,
	"comments" integer DEFAULT 0,
	"impressions" integer DEFAULT 0,
	"clicks" integer DEFAULT 0,
	"metadata" jsonb,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "automated_flows" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"company_id" text,
	"name" text NOT NULL,
	"description" text,
	"flow_type" text NOT NULL,
	"trigger_type" text,
	"trigger_config" jsonb,
	"steps" jsonb,
	"conditions" jsonb,
	"is_active" boolean DEFAULT true,
	"status" text NOT NULL,
	"metadata" jsonb,
	"tags" jsonb,
	"total_executions" integer DEFAULT 0,
	"successful_executions" integer DEFAULT 0,
	"failed_executions" integer DEFAULT 0,
	"last_executed_at" timestamp,
	"last_execution_status" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "flow_executions" (
	"id" text PRIMARY KEY NOT NULL,
	"flow_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"status" text NOT NULL,
	"trigger_type" text,
	"triggered_by" text,
	"input_data" jsonb,
	"output_data" jsonb,
	"context" jsonb,
	"current_step" text,
	"completed_steps" jsonb,
	"failed_step" text,
	"execution_time" integer,
	"error" text,
	"error_message" text,
	"error_stack" text,
	"logs" jsonb,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "flow_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"flow_definition" jsonb,
	"is_public" boolean DEFAULT false,
	"created_by" text,
	"usage_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hris_integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"provider" text NOT NULL,
	"config" jsonb,
	"status" text DEFAULT 'pending_auth' NOT NULL,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hris_sync_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" text NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"records_processed" jsonb,
	"error_details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "action_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"module_type" text NOT NULL,
	"config" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"assessment_type" text NOT NULL,
	"results" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "consultants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"expertise" jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "consulting_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"request_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"description" text,
	"assigned_to" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "culture_frameworks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"framework_name" text NOT NULL,
	"config" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"skill_id" text NOT NULL,
	"proficiency_level" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "industry_benchmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"industry" text NOT NULL,
	"metric_type" text NOT NULL,
	"value" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"assignment_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_experiences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"experience_type" text NOT NULL,
	"data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"course_id" text,
	"progress" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "org_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"snapshot_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skills_taxonomies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"skill_name" text NOT NULL,
	"category" text,
	"taxonomy" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "talent_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"profile_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenant_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"metric_type" text NOT NULL,
	"value" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
