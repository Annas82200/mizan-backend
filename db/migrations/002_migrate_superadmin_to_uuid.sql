-- =========================================================
-- MIGRATION: Superadmin Tenant ID to UUID
-- Date: 2025-10-31
-- Purpose: Replace 'superadmin-tenant' with proper UUID
-- Generated UUID: 3fb789ff-63de-4e94-aee9-3c8bae9806e8
-- =========================================================
-- IMPORTANT: This migration must be executed manually in Railway PostgreSQL console
-- before deploying the new backend code with schema changes.
-- =========================================================

BEGIN;

-- Temporarily disable foreign key constraints for this transaction
SET CONSTRAINTS ALL DEFERRED;

-- Store the migration parameters
DO $$
DECLARE
    new_uuid TEXT := '3fb789ff-63de-4e94-aee9-3c8bae9806e8';
    old_id TEXT := 'superadmin-tenant';
    affected_rows INTEGER := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Starting Superadmin Tenant UUID Migration';
    RAISE NOTICE 'Old ID: %', old_id;
    RAISE NOTICE 'New UUID: %', new_uuid;
    RAISE NOTICE 'Temporarily deferring FK constraints...';
    RAISE NOTICE '========================================';

    -- Step 1: INSERT new tenant record with UUID (keeping old one temporarily)
    RAISE NOTICE 'Step 1: Creating new tenant record with UUID';
    INSERT INTO tenants (id, name, plan, status, created_at, updated_at)
    SELECT new_uuid::uuid, name, plan, status, created_at, updated_at
    FROM tenants WHERE id = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE '  ✓ Inserted new tenant record: % rows', affected_rows;

    -- Step 2: Update all foreign key references to point to new UUID
    RAISE NOTICE 'Step 2: Updating all tenant_id foreign key references';

    UPDATE action_modules SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ action_modules: % rows', affected_rows; END IF;

    UPDATE agent_analyses SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ agent_analyses: % rows', affected_rows; END IF;

    UPDATE analyses SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ analyses: % rows', affected_rows; END IF;

    UPDATE assessments SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ assessments: % rows', affected_rows; END IF;

    UPDATE automated_flows SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ automated_flows: % rows', affected_rows; END IF;

    UPDATE candidate_assessments SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ candidate_assessments: % rows', affected_rows; END IF;

    UPDATE candidates SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ candidates: % rows', affected_rows; END IF;

    UPDATE company_strategies SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ company_strategies: % rows', affected_rows; END IF;

    UPDATE consultants SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ consultants: % rows', affected_rows; END IF;

    UPDATE consulting_requests SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ consulting_requests: % rows', affected_rows; END IF;

    UPDATE culture_assessments SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ culture_assessments: % rows', affected_rows; END IF;

    UPDATE culture_frameworks SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ culture_frameworks: % rows', affected_rows; END IF;

    UPDATE culture_reports SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ culture_reports: % rows', affected_rows; END IF;

    UPDATE culture_survey_invitations SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ culture_survey_invitations: % rows', affected_rows; END IF;

    UPDATE cylinder_scores SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ cylinder_scores: % rows', affected_rows; END IF;

    UPDATE departments SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ departments: % rows', affected_rows; END IF;

    UPDATE employee_profiles SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ employee_profiles: % rows', affected_rows; END IF;

    UPDATE employee_skills SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ employee_skills: % rows', affected_rows; END IF;

    UPDATE employee_skills_profiles SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ employee_skills_profiles: % rows', affected_rows; END IF;

    UPDATE flow_executions SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ flow_executions: % rows', affected_rows; END IF;

    UPDATE hiring_requisitions SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ hiring_requisitions: % rows', affected_rows; END IF;

    UPDATE hris_integrations SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ hris_integrations: % rows', affected_rows; END IF;

    UPDATE interviews SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ interviews: % rows', affected_rows; END IF;

    UPDATE invoices SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ invoices: % rows', affected_rows; END IF;

    UPDATE job_postings SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ job_postings: % rows', affected_rows; END IF;

    UPDATE learning_assignments SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ learning_assignments: % rows', affected_rows; END IF;

    UPDATE learning_experiences SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ learning_experiences: % rows', affected_rows; END IF;

    UPDATE learning_progress SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ learning_progress: % rows', affected_rows; END IF;

    UPDATE lxp_assessment_results SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ lxp_assessment_results: % rows', affected_rows; END IF;

    UPDATE lxp_course_assessments SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ lxp_course_assessments: % rows', affected_rows; END IF;

    UPDATE lxp_course_enrollments SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ lxp_course_enrollments: % rows', affected_rows; END IF;

    UPDATE lxp_courses SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ lxp_courses: % rows', affected_rows; END IF;

    UPDATE lxp_learning_analytics SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ lxp_learning_analytics: % rows', affected_rows; END IF;

    UPDATE lxp_learning_paths SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ lxp_learning_paths: % rows', affected_rows; END IF;

    UPDATE offers SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ offers: % rows', affected_rows; END IF;

    UPDATE one_on_one_meetings SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ one_on_one_meetings: % rows', affected_rows; END IF;

    UPDATE org_inputs SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ org_inputs: % rows', affected_rows; END IF;

    UPDATE org_snapshots SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ org_snapshots: % rows', affected_rows; END IF;

    UPDATE org_structures SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ org_structures: % rows', affected_rows; END IF;

    UPDATE organization_structure SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ organization_structure: % rows', affected_rows; END IF;

    UPDATE payments SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ payments: % rows', affected_rows; END IF;

    UPDATE performance_analytics SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ performance_analytics: % rows', affected_rows; END IF;

    UPDATE performance_cycles SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ performance_cycles: % rows', affected_rows; END IF;

    UPDATE performance_feedback SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ performance_feedback: % rows', affected_rows; END IF;

    UPDATE performance_goals SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ performance_goals: % rows', affected_rows; END IF;

    UPDATE performance_improvement_plans SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ performance_improvement_plans: % rows', affected_rows; END IF;

    UPDATE performance_metrics SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ performance_metrics: % rows', affected_rows; END IF;

    UPDATE performance_reviews SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ performance_reviews: % rows', affected_rows; END IF;

    UPDATE sessions SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ sessions: % rows', affected_rows; END IF;

    UPDATE skills_assessments SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ skills_assessments: % rows', affected_rows; END IF;

    UPDATE skills_gap_analysis SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ skills_gap_analysis: % rows', affected_rows; END IF;

    UPDATE skills_reports SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ skills_reports: % rows', affected_rows; END IF;

    UPDATE skills_taxonomies SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ skills_taxonomies: % rows', affected_rows; END IF;

    UPDATE social_media_accounts SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ social_media_accounts: % rows', affected_rows; END IF;

    UPDATE social_media_campaigns SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ social_media_campaigns: % rows', affected_rows; END IF;

    UPDATE social_media_posts SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ social_media_posts: % rows', affected_rows; END IF;

    UPDATE strategy_skill_requirements SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ strategy_skill_requirements: % rows', affected_rows; END IF;

    UPDATE structure_analysis_results SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ structure_analysis_results: % rows', affected_rows; END IF;

    UPDATE subscriptions SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ subscriptions: % rows', affected_rows; END IF;

    UPDATE talent_profiles SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ talent_profiles: % rows', affected_rows; END IF;

    UPDATE tenant_metrics SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ tenant_metrics: % rows', affected_rows; END IF;

    UPDATE trigger_executions SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ trigger_executions: % rows', affected_rows; END IF;

    UPDATE triggers SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ triggers: % rows', affected_rows; END IF;

    UPDATE users SET tenant_id = new_uuid::uuid WHERE tenant_id::text = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    IF affected_rows > 0 THEN RAISE NOTICE '  ✓ users: % rows', affected_rows; END IF;

    -- Step 3: Delete the old tenant record (now that all children point to new UUID)
    RAISE NOTICE 'Step 3: Deleting old tenant record';
    DELETE FROM tenants WHERE id = old_id;
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE '  ✓ Deleted old tenant record: % rows', affected_rows;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Step 4: Migration verification';

    -- Verification: Old ID should not exist
    IF EXISTS (SELECT 1 FROM tenants WHERE id = old_id) THEN
        RAISE EXCEPTION 'Migration FAILED: Old ID "%" still exists in tenants table', old_id;
    END IF;
    RAISE NOTICE '  ✓ Old ID "%" no longer exists', old_id;

    -- Verification: New UUID should exist
    IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = new_uuid) THEN
        RAISE EXCEPTION 'Migration FAILED: New UUID "%" not found in tenants table', new_uuid;
    END IF;
    RAISE NOTICE '  ✓ New UUID "%" exists in tenants table', new_uuid;

    -- Verification: No orphaned references to old ID
    PERFORM * FROM users WHERE tenant_id::text = old_id LIMIT 1;
    IF FOUND THEN
        RAISE EXCEPTION 'Migration FAILED: Old ID still referenced in users table';
    END IF;
    RAISE NOTICE '  ✓ No orphaned references in users table';

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Superadmin Tenant ID: %', new_uuid;
    RAISE NOTICE '========================================';
END $$;

COMMIT;

-- =========================================================
-- POST-MIGRATION NOTES:
-- =========================================================
-- After running this migration successfully:
-- 1. Deploy the new backend code with schema changes
-- 2. Frontend needs NO changes (already validates UUIDs)
-- 3. Test superadmin login and dashboard functionality
-- 4. Verify activity feed loads without validation errors
-- =========================================================
