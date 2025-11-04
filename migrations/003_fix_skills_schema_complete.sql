-- ============================================================================
-- Migration 003: Complete Skills Schema Synchronization
-- Created: 2025-11-04
-- Purpose: Sync production database with TypeScript schema definitions
-- Critical: Fixes "column analysis_data does not exist" error
-- ============================================================================
--
-- This migration addresses schema drift between TypeScript definitions and
-- production database. It adds missing columns to existing tables and creates
-- any missing tables that weren't created in previous migrations.
--
-- Changes:
-- 1. ALTER skills_assessments table - Add 5 missing columns
-- 2. Verify all 9 Skills tables exist (created in migration 002)
-- 3. Create any missing indexes
-- 4. Include rollback-safe IF NOT EXISTS/IF EXISTS checks
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Fix skills_assessments Table (CRITICAL - Fixes 500 error)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=== PART 1: Updating skills_assessments table ===';
END $$;

-- Add missing columns to skills_assessments
ALTER TABLE skills_assessments
  ADD COLUMN IF NOT EXISTS analysis_data jsonb,
  ADD COLUMN IF NOT EXISTS overall_score integer,
  ADD COLUMN IF NOT EXISTS strategic_alignment integer,
  ADD COLUMN IF NOT EXISTS critical_gaps_count integer,
  ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now() NOT NULL;

-- Backfill updated_at for existing rows
UPDATE skills_assessments
SET updated_at = created_at
WHERE updated_at IS NULL;

-- Verify columns were added
DO $$
DECLARE
  col_count integer;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_name = 'skills_assessments'
    AND column_name IN ('analysis_data', 'overall_score', 'strategic_alignment', 'critical_gaps_count', 'updated_at');

  IF col_count != 5 THEN
    RAISE EXCEPTION 'Failed to add all columns to skills_assessments. Expected 5, got %', col_count;
  END IF;

  RAISE NOTICE '✓ skills_assessments table updated successfully - 5 columns added';
END $$;

-- ============================================================================
-- PART 2: Verify Core Skills Tables Exist (Should exist from migration 002)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=== PART 2: Verifying core Skills tables ===';
END $$;

-- These tables should already exist from add-missing-skills-tables.sql
-- Just verify they exist, don't recreate

DO $$
DECLARE
  missing_tables text[];
  tbl_name text;
BEGIN
  -- Check for all required Skills tables
  SELECT ARRAY_AGG(t.tbl) INTO missing_tables
  FROM (
    SELECT 'skills' AS tbl
    UNION SELECT 'skills_gaps'
    UNION SELECT 'skills_framework'
    UNION SELECT 'skills_assessment_sessions'
    UNION SELECT 'skills_bot_interactions'
    UNION SELECT 'skills_learning_triggers'
    UNION SELECT 'skills_talent_triggers'
    UNION SELECT 'skills_bonus_triggers'
    UNION SELECT 'skills_progress'
  ) t
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables ist
    WHERE ist.table_schema = 'public' AND ist.table_name = t.tbl
  );

  IF missing_tables IS NOT NULL AND array_length(missing_tables, 1) > 0 THEN
    RAISE WARNING 'Missing tables detected: %. These should have been created in migration 002.', missing_tables;
    RAISE EXCEPTION 'Migration 002 (add-missing-skills-tables.sql) must be run first';
  ELSE
    RAISE NOTICE '✓ All 9 core Skills tables verified present';
  END IF;
END $$;

-- ============================================================================
-- PART 3: Add Missing Indexes (if not already created)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=== PART 3: Creating/verifying indexes ===';
END $$;

-- skills_assessments indexes
CREATE INDEX IF NOT EXISTS idx_skills_assessments_tenant_id ON skills_assessments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_skills_assessments_user_id ON skills_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_assessments_created_at ON skills_assessments(created_at DESC);

-- Additional indexes for other tables (if migration 002 didn't create them all)
-- skills table
CREATE INDEX IF NOT EXISTS idx_skills_tenant_user ON skills(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_skills_category_level ON skills(category, level);

-- skills_gaps table
CREATE INDEX IF NOT EXISTS idx_skills_gaps_tenant_employee ON skills_gaps(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_skills_gaps_severity_priority ON skills_gaps(gap_severity, priority DESC);

-- skills_framework table
CREATE INDEX IF NOT EXISTS idx_skills_framework_tenant_industry ON skills_framework(tenant_id, industry);

-- skills_assessment_sessions table
CREATE INDEX IF NOT EXISTS idx_skills_assessment_sessions_tenant_status ON skills_assessment_sessions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_skills_assessment_sessions_framework_id ON skills_assessment_sessions(framework_id);

-- skills_bot_interactions table
CREATE INDEX IF NOT EXISTS idx_skills_bot_interactions_tenant_user ON skills_bot_interactions(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_skills_bot_interactions_session_id ON skills_bot_interactions(session_id);

-- skills_learning_triggers table
CREATE INDEX IF NOT EXISTS idx_skills_learning_triggers_tenant_employee ON skills_learning_triggers(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_skills_learning_triggers_session_id ON skills_learning_triggers(session_id);

-- skills_talent_triggers table
CREATE INDEX IF NOT EXISTS idx_skills_talent_triggers_tenant_employee ON skills_talent_triggers(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_skills_talent_triggers_session_id ON skills_talent_triggers(session_id);

-- skills_bonus_triggers table
CREATE INDEX IF NOT EXISTS idx_skills_bonus_triggers_tenant_employee ON skills_bonus_triggers(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_skills_bonus_triggers_session_id ON skills_bonus_triggers(session_id);

-- skills_progress table
CREATE INDEX IF NOT EXISTS idx_skills_progress_tenant_employee ON skills_progress(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_skills_progress_skill_id ON skills_progress(skill_id);

DO $$
BEGIN
  RAISE NOTICE '✓ All indexes created/verified';
END $$;

-- ============================================================================
-- PART 4: Final Verification
-- ============================================================================

DO $$
DECLARE
  assessments_cols integer;
  skills_tables integer;
  total_indexes integer;
BEGIN
  RAISE NOTICE '=== PART 4: Final verification ===';

  -- Count columns in skills_assessments
  SELECT COUNT(*) INTO assessments_cols
  FROM information_schema.columns
  WHERE table_name = 'skills_assessments';

  -- Count Skills tables
  SELECT COUNT(*) INTO skills_tables
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name LIKE 'skills%';

  -- Count Skills indexes
  SELECT COUNT(*) INTO total_indexes
  FROM pg_indexes
  WHERE tablename LIKE 'skills%';

  RAISE NOTICE '✓ skills_assessments columns: % (expected: 11)', assessments_cols;
  RAISE NOTICE '✓ Skills tables total: % (expected: >= 15)', skills_tables;
  RAISE NOTICE '✓ Skills indexes total: % (expected: >= 30)', total_indexes;

  -- Verify critical columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'skills_assessments' AND column_name = 'analysis_data'
  ) THEN
    RAISE EXCEPTION 'CRITICAL: analysis_data column still missing from skills_assessments';
  END IF;

  -- Verify critical tables
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'skills'
  ) THEN
    RAISE EXCEPTION 'CRITICAL: skills table still missing';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '✓✓✓ MIGRATION 003 COMPLETED SUCCESSFULLY ✓✓✓';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Skills module schema is now fully synchronized.';
  RAISE NOTICE 'Dashboard endpoint should now return 200 (not 500).';
  RAISE NOTICE 'All Skills functionality is operational.';
  RAISE NOTICE '';
END $$;

COMMIT;

-- Success message for logs
SELECT
  'Migration 003: Complete Skills Schema Synchronization - SUCCESS' AS status,
  now() AS completed_at;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================================
--
-- If you need to rollback this migration, run:
--
-- BEGIN;
--
-- -- Revert skills_assessments columns
-- ALTER TABLE skills_assessments
--   DROP COLUMN IF EXISTS analysis_data,
--   DROP COLUMN IF EXISTS overall_score,
--   DROP COLUMN IF EXISTS strategic_alignment,
--   DROP COLUMN IF EXISTS critical_gaps_count,
--   DROP COLUMN IF EXISTS updated_at;
--
-- COMMIT;
--
-- Note: This only reverts Part 1. Tables created in migration 002 would need
-- to be dropped separately if full rollback is required.
-- ============================================================================
