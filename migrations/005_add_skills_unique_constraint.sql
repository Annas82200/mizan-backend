-- Migration: Add unique constraint on (user_id, name) to skills table
-- Issue: Missing unique constraint causes onConflictDoUpdate to fail
-- Error: PostgreSQL 42P10 "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- Affects: Resume upload, CSV import, and employee skills update endpoints
-- Safety: Zero downtime using CONCURRENT index creation

BEGIN;

-- ============================================================================
-- STEP 1: Safety Check - Detect Duplicates
-- ============================================================================

DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- Count duplicate (user_id, name) combinations
  SELECT COUNT(*)
  INTO duplicate_count
  FROM (
    SELECT user_id, name, COUNT(*) as cnt
    FROM skills
    GROUP BY user_id, name
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_count > 0 THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'WARNING: Found % duplicate (user_id, name) combinations', duplicate_count;
    RAISE NOTICE 'Duplicate Resolution Strategy: Keep most recent (by updated_at)';
    RAISE NOTICE '========================================';

    -- Report duplicates for transparency
    RAISE NOTICE 'Duplicate Details:';
    FOR rec IN (
      SELECT user_id, name, COUNT(*) as dup_count
      FROM skills
      GROUP BY user_id, name
      HAVING COUNT(*) > 1
    ) LOOP
      RAISE NOTICE '  User: %, Skill: %, Count: %', rec.user_id, rec.name, rec.dup_count;
    END LOOP;
  ELSE
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ No duplicates found - safe to proceed';
    RAISE NOTICE '========================================';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Resolve Duplicates (if any exist)
-- ============================================================================

DO $$
DECLARE
  deleted_count INTEGER := 0;
  rec RECORD;
BEGIN
  -- For each duplicate set, keep the most recent (by updated_at) and delete older ones
  FOR rec IN (
    SELECT user_id, name
    FROM skills
    GROUP BY user_id, name
    HAVING COUNT(*) > 1
  ) LOOP
    -- Delete all but the most recent skill for this (user_id, name) combination
    WITH ranked_skills AS (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY user_id, name
               ORDER BY updated_at DESC, created_at DESC
             ) as rn
      FROM skills
      WHERE user_id = rec.user_id AND name = rec.name
    )
    DELETE FROM skills
    WHERE id IN (
      SELECT id FROM ranked_skills WHERE rn > 1
    );

    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
  END LOOP;

  IF deleted_count > 0 THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ Deleted % duplicate skill records', deleted_count;
    RAISE NOTICE '  (Kept most recent version of each skill)';
    RAISE NOTICE '========================================';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- STEP 3: Create Unique Index CONCURRENTLY (Zero Downtime)
-- ============================================================================

-- Note: CREATE INDEX CONCURRENTLY cannot run inside a transaction block
-- This allows the table to remain available for reads/writes during index creation

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_skills_user_id_name_unique
ON skills(user_id, name);

-- ============================================================================
-- STEP 4: Verification
-- ============================================================================

DO $$
DECLARE
  index_exists BOOLEAN;
  total_skills INTEGER;
  unique_combinations INTEGER;
BEGIN
  -- Check if index was created successfully
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE indexname = 'idx_skills_user_id_name_unique'
  ) INTO index_exists;

  -- Count total skills and unique combinations
  SELECT COUNT(*) INTO total_skills FROM skills;
  SELECT COUNT(DISTINCT (user_id, name)) INTO unique_combinations FROM skills;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 005: Add Unique Constraint Verification';
  RAISE NOTICE '========================================';

  IF index_exists THEN
    RAISE NOTICE '✓ Unique index created: idx_skills_user_id_name_unique';
  ELSE
    RAISE EXCEPTION 'FAILED: Unique index was not created';
  END IF;

  RAISE NOTICE '✓ Total skills in database: %', total_skills;
  RAISE NOTICE '✓ Unique (user_id, name) combinations: %', unique_combinations;

  IF total_skills = unique_combinations THEN
    RAISE NOTICE '✓ All skills are unique - constraint satisfied';
  ELSE
    RAISE EXCEPTION 'FAILED: Still have % duplicate records', (total_skills - unique_combinations);
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ Migration completed successfully';
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Rollback Instructions (if needed):
-- DROP INDEX CONCURRENTLY IF EXISTS idx_skills_user_id_name_unique;

-- Verification Query (check constraint is working):
-- INSERT INTO skills (tenant_id, user_id, name, category, level)
-- VALUES ('test-tenant', 'test-user', 'Test Skill', 'Technical', 'intermediate');
-- -- Should succeed first time, fail second time with unique constraint violation
