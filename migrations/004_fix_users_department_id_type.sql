-- Migration: Fix users.department_id type mismatch (TEXT → UUID)
-- Issue: users.departmentId (TEXT) cannot join with departments.id (UUID)
-- Error: "operator does not exist: text = uuid" in admin.ts line 274
-- Solution: Convert column to UUID type with data preservation

BEGIN;

-- Safety check: Verify departments table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'departments') THEN
    RAISE EXCEPTION 'departments table does not exist - cannot proceed with migration';
  END IF;
END $$;

-- Step 1: Add temporary UUID column
ALTER TABLE users ADD COLUMN department_id_uuid UUID;

-- Step 2: Convert existing TEXT data to UUID format
-- Only convert values that are valid UUIDs, others become NULL
UPDATE users
SET department_id_uuid = department_id::uuid
WHERE department_id IS NOT NULL
  AND department_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Step 3: Report on data conversion results
DO $$
DECLARE
  total_users INTEGER;
  users_with_dept INTEGER;
  successfully_converted INTEGER;
  failed_conversions INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM users;
  SELECT COUNT(*) INTO users_with_dept FROM users WHERE department_id IS NOT NULL;
  SELECT COUNT(*) INTO successfully_converted FROM users WHERE department_id_uuid IS NOT NULL;

  failed_conversions := users_with_dept - successfully_converted;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 004: users.department_id type conversion';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total users: %', total_users;
  RAISE NOTICE 'Users with department_id: %', users_with_dept;
  RAISE NOTICE 'Successfully converted to UUID: %', successfully_converted;
  RAISE NOTICE 'Failed conversions (set to NULL): %', failed_conversions;
  RAISE NOTICE '========================================';

  IF failed_conversions > 0 THEN
    RAISE WARNING '% department_id values were not valid UUIDs and have been set to NULL', failed_conversions;
  END IF;
END $$;

-- Step 4: Drop old TEXT column
ALTER TABLE users DROP COLUMN department_id;

-- Step 5: Rename new UUID column to original name
ALTER TABLE users RENAME COLUMN department_id_uuid TO department_id;

-- Step 6: Add foreign key constraint for referential integrity
-- This ensures department_id always references a valid department
ALTER TABLE users
ADD CONSTRAINT fk_users_department
FOREIGN KEY (department_id)
REFERENCES departments(id)
ON DELETE SET NULL;

-- Step 7: Add index for performance on department lookups
CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id);

-- Step 8: Verify the change
DO $$
DECLARE
  column_type TEXT;
  fk_exists BOOLEAN;
BEGIN
  -- Check column type
  SELECT data_type INTO column_type
  FROM information_schema.columns
  WHERE table_name = 'users' AND column_name = 'department_id';

  -- Check foreign key constraint
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_users_department'
  ) INTO fk_exists;

  IF column_type = 'uuid' AND fk_exists THEN
    RAISE NOTICE '✓ Migration completed successfully';
    RAISE NOTICE '  - Column type: %', column_type;
    RAISE NOTICE '  - Foreign key constraint: ACTIVE';
    RAISE NOTICE '  - Index created: idx_users_department_id';
  ELSE
    RAISE EXCEPTION 'Migration verification failed - column_type: %, fk_exists: %', column_type, fk_exists;
  END IF;
END $$;

COMMIT;

-- Rollback instructions (if needed):
-- BEGIN;
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_department;
-- ALTER TABLE users ALTER COLUMN department_id TYPE text;
-- DROP INDEX IF EXISTS idx_users_department_id;
-- COMMIT;
