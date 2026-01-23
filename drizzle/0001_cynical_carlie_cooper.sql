CREATE TABLE IF NOT EXISTS "skills_framework" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"framework_name" text NOT NULL,
	"industry" text NOT NULL,
	"strategic_skills" jsonb NOT NULL,
	"technical_skills" jsonb NOT NULL,
	"soft_skills" jsonb NOT NULL,
	"prioritization" jsonb NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skills_assessment_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"session_name" text NOT NULL,
	"framework_id" text NOT NULL,
	"status" text NOT NULL,
	"employee_count" integer DEFAULT 0,
	"completed_count" integer DEFAULT 0,
	"analysis_results" jsonb,
	"strategic_assessment" jsonb,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skills_bot_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"session_id" text,
	"interaction_type" text NOT NULL,
	"user_query" text NOT NULL,
	"bot_response" text NOT NULL,
	"context" jsonb,
	"resolved" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skills_learning_triggers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"session_id" text NOT NULL,
	"skill_gaps" jsonb NOT NULL,
	"learning_paths" jsonb NOT NULL,
	"priority" text NOT NULL,
	"status" text DEFAULT 'pending',
	"lxp_path_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skills_talent_triggers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"session_id" text NOT NULL,
	"skills_data" jsonb NOT NULL,
	"potential_roles" jsonb,
	"readiness_score" integer,
	"status" text DEFAULT 'pending',
	"talent_module_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skills_bonus_triggers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"session_id" text NOT NULL,
	"skills_achievements" jsonb NOT NULL,
	"recommended_bonus" integer,
	"bonus_criteria" jsonb,
	"status" text DEFAULT 'pending',
	"bonus_module_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skills_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"skill_id" text NOT NULL,
	"skill_name" text NOT NULL,
	"current_level" text NOT NULL,
	"target_level" text NOT NULL,
	"progress_percentage" integer DEFAULT 0,
	"learning_path_id" text,
	"milestones" jsonb,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skills_reanalysis_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'pending',
	"triggered_by" text,
	"metadata" jsonb,
	"processed_at" timestamp,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_role_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"previous_role" text,
	"new_role" text NOT NULL,
	"previous_department" text,
	"new_department" text,
	"change_reason" text,
	"effective_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_progress_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"path_id" uuid NOT NULL,
	"course_id" uuid,
	"event_type" text NOT NULL,
	"progress_percentage" integer,
	"metadata" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"level" text NOT NULL,
	"years_of_experience" integer,
	"verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skills_gaps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"employee_id" text,
	"skill" text NOT NULL,
	"category" text NOT NULL,
	"current_level" text NOT NULL,
	"required_level" text NOT NULL,
	"gap_severity" text NOT NULL,
	"priority" integer NOT NULL,
	"business_impact" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kpis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"department_id" text,
	"employee_id" text,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"target_value" numeric,
	"current_value" numeric,
	"unit" text,
	"frequency" text,
	"status" text DEFAULT 'active',
	"owner_id" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "okrs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"department_id" text,
	"employee_id" text,
	"parent_okr_id" text,
	"type" text NOT NULL,
	"objective" text NOT NULL,
	"description" text,
	"quarter" text,
	"year" integer,
	"status" text DEFAULT 'in_progress',
	"progress" integer DEFAULT 0,
	"owner_id" text NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "key_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"okr_id" text NOT NULL,
	"description" text NOT NULL,
	"target_value" numeric NOT NULL,
	"current_value" numeric DEFAULT '0',
	"unit" text,
	"status" text DEFAULT 'not_started',
	"progress" integer DEFAULT 0,
	"due_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"employee_id" text,
	"department_id" text,
	"source_type" text NOT NULL,
	"source_id" text,
	"recommendation_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"priority" text DEFAULT 'medium',
	"status" text DEFAULT 'pending',
	"action_items" jsonb,
	"expected_impact" text,
	"estimated_effort" text,
	"due_date" timestamp,
	"completed_at" timestamp,
	"assigned_to" text,
	"ai_generated" boolean DEFAULT true,
	"ai_model" text,
	"confidence" numeric,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lxp_workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"workflow_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"triggered_by" text,
	"learning_experience_id" uuid,
	"learning_design" jsonb,
	"current_level" integer DEFAULT 1,
	"total_score" integer DEFAULT 0,
	"completion_percentage" integer DEFAULT 0,
	"time_spent" integer DEFAULT 0,
	"last_activity" timestamp,
	"completed_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lxp_triggers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"source_module" text NOT NULL,
	"target_module" text DEFAULT 'lxp' NOT NULL,
	"trigger_type" text NOT NULL,
	"employee_id" uuid,
	"data" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lxp_skills_acquired" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"workflow_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"skill_id" uuid,
	"skill_name" text NOT NULL,
	"skill_category" text,
	"proficiency_level" integer DEFAULT 1,
	"previous_level" integer,
	"validated_by" text,
	"metadata" jsonb,
	"acquired_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lxp_behavior_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"workflow_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"behavior_type" text NOT NULL,
	"change_description" text,
	"target_behavior" text,
	"current_behavior" text,
	"measurement_method" text,
	"measurement_value" numeric(10, 2),
	"measurement_unit" text,
	"improvement_percentage" integer,
	"validated" boolean DEFAULT false,
	"metadata" jsonb,
	"measured_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lxp_performance_impact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"workflow_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"metric_type" text NOT NULL,
	"metric_name" text NOT NULL,
	"baseline_value" numeric(10, 2),
	"current_value" numeric(10, 2),
	"target_value" numeric(10, 2),
	"improvement_value" numeric(10, 2),
	"improvement_percentage" integer,
	"impact_description" text,
	"business_impact" text,
	"validation_status" text DEFAULT 'pending',
	"metadata" jsonb,
	"assessed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_paths" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"path_type" text NOT NULL,
	"courses" jsonb NOT NULL,
	"total_duration" integer,
	"progress" integer DEFAULT 0,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "demo_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"company" text NOT NULL,
	"phone" text,
	"employee_count" integer,
	"industry" text,
	"interested_in" jsonb,
	"message" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"assigned_to" text,
	"payment_link_sent" boolean DEFAULT false,
	"payment_link_url" text,
	"payment_link_sent_at" timestamp,
	"converted_to_tenant_id" text,
	"converted_at" timestamp,
	"source" text DEFAULT 'website',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"demo_request_id" integer,
	"stripe_session_id" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"metadata" jsonb,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_sessions_stripe_session_id_unique" UNIQUE("stripe_session_id")
);
--> statement-breakpoint
DROP TABLE "hris_integrations";--> statement-breakpoint
DROP TABLE "hris_sync_logs";--> statement-breakpoint
DROP TABLE "culture_frameworks";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_email_unique";--> statement-breakpoint
ALTER TABLE "analyses" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "departments" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "departments" ALTER COLUMN "manager_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "departments" ALTER COLUMN "parent_department_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "employee_profiles" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "employee_profiles" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "org_inputs" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "org_structures" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "org_structures" ALTER COLUMN "submitted_by" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "structure_analysis_results" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "structure_analysis_results" ALTER COLUMN "analysis_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "department_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "manager_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "company_strategies" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "organization_structure" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "organization_structure" ALTER COLUMN "uploaded_by" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "culture_assessments" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "culture_assessments" ALTER COLUMN "company_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "culture_assessments" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "culture_reports" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "culture_reports" ALTER COLUMN "analysis_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "culture_survey_invitations" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "culture_survey_invitations" ALTER COLUMN "campaign_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "culture_survey_invitations" ALTER COLUMN "employee_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "cylinder_scores" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "cylinder_scores" ALTER COLUMN "target_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "cylinder_scores" ALTER COLUMN "assessment_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "employee_skills_profiles" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "employee_skills_profiles" ALTER COLUMN "employee_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "skills_assessments" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "skills_assessments" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "skills_gap_analysis" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "skills_gap_analysis" ALTER COLUMN "employee_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "skills_gap_analysis" ALTER COLUMN "profile_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "skills_reports" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "skills_reports" ALTER COLUMN "target_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "strategy_skill_requirements" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "strategy_skill_requirements" ALTER COLUMN "strategy_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "agent_analyses" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "trigger_executions" ALTER COLUMN "trigger_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "trigger_executions" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "triggers" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "invoices" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "company_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "company_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "social_media_accounts" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "social_media_accounts" ALTER COLUMN "company_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "social_media_campaigns" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "social_media_campaigns" ALTER COLUMN "company_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "social_media_posts" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "social_media_posts" ALTER COLUMN "company_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "automated_flows" ALTER COLUMN "status" SET DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "consultants" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "consulting_requests" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "consulting_requests" ALTER COLUMN "assigned_to" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "user_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "tenant_metrics" ALTER COLUMN "tenant_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "market_position" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "skills_assessments" ADD COLUMN "analysis_data" jsonb;--> statement-breakpoint
ALTER TABLE "skills_assessments" ADD COLUMN "overall_score" integer;--> statement-breakpoint
ALTER TABLE "skills_assessments" ADD COLUMN "strategic_alignment" integer;--> statement-breakpoint
ALTER TABLE "skills_assessments" ADD COLUMN "critical_gaps_count" integer;--> statement-breakpoint
ALTER TABLE "skills_assessments" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "employee_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "price_per_employee" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "cancel_at_period_end" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "consultants" ADD COLUMN "email" text NOT NULL;--> statement-breakpoint
ALTER TABLE "consultants" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "consultants" ADD COLUMN "availability_schedule" jsonb;--> statement-breakpoint
ALTER TABLE "consultants" ADD COLUMN "hourly_rate" text;--> statement-breakpoint
ALTER TABLE "consultants" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "industry_benchmarks" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "industry_benchmarks" ADD COLUMN "data_points" jsonb;--> statement-breakpoint
ALTER TABLE "industry_benchmarks" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "talent_profiles" ADD COLUMN "strengths" jsonb;--> statement-breakpoint
ALTER TABLE "talent_profiles" ADD COLUMN "development_areas" jsonb;--> statement-breakpoint
ALTER TABLE "talent_profiles" ADD COLUMN "career_aspirations" text;--> statement-breakpoint
ALTER TABLE "talent_profiles" ADD COLUMN "potential_rating" text;--> statement-breakpoint
ALTER TABLE "talent_profiles" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_metrics" ADD COLUMN "period" text;--> statement-breakpoint
ALTER TABLE "tenant_metrics" ADD COLUMN "period_start" timestamp;--> statement-breakpoint
ALTER TABLE "tenant_metrics" ADD COLUMN "period_end" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_skills_user_id_name_unique" ON "skills" ("user_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_email_per_tenant_idx" ON "users" ("tenant_id","email");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analyses" ADD CONSTRAINT "analyses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "departments" ADD CONSTRAINT "departments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "org_inputs" ADD CONSTRAINT "org_inputs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "org_structures" ADD CONSTRAINT "org_structures_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "structure_analysis_results" ADD CONSTRAINT "structure_analysis_results_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "company_strategies" ADD CONSTRAINT "company_strategies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organization_structure" ADD CONSTRAINT "organization_structure_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "culture_assessments" ADD CONSTRAINT "culture_assessments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "culture_reports" ADD CONSTRAINT "culture_reports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "culture_survey_invitations" ADD CONSTRAINT "culture_survey_invitations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cylinder_scores" ADD CONSTRAINT "cylinder_scores_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "employee_skills_profiles" ADD CONSTRAINT "employee_skills_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "skills_assessments" ADD CONSTRAINT "skills_assessments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "skills_gap_analysis" ADD CONSTRAINT "skills_gap_analysis_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "skills_reports" ADD CONSTRAINT "skills_reports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "strategy_skill_requirements" ADD CONSTRAINT "strategy_skill_requirements_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_analyses" ADD CONSTRAINT "agent_analyses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "consultants" ADD CONSTRAINT "consultants_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "consulting_requests" ADD CONSTRAINT "consulting_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tenant_metrics" ADD CONSTRAINT "tenant_metrics_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lxp_skills_acquired" ADD CONSTRAINT "lxp_skills_acquired_workflow_id_lxp_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "lxp_workflows"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lxp_behavior_changes" ADD CONSTRAINT "lxp_behavior_changes_workflow_id_lxp_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "lxp_workflows"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lxp_performance_impact" ADD CONSTRAINT "lxp_performance_impact_workflow_id_lxp_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "lxp_workflows"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
