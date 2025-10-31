-- =========================================================
-- CREATE SUPERADMIN USER FOR MIZAN PLATFORM
-- =========================================================
--
-- User Credentials:
-- Email: anna@mizan.com
-- Password: MizanAdmin2024!
--
-- INSTRUCTIONS:
-- 1. Go to Railway Dashboard → Your Project → PostgreSQL service
-- 2. Click on "Query" tab
-- 3. Copy and paste this ENTIRE SQL script
-- 4. Click "Execute" or press Cmd/Ctrl + Enter
-- =========================================================

-- Step 1: Create superadmin tenant if it doesn't exist
INSERT INTO tenants (
  id,
  name,
  plan,
  status,
  created_at,
  updated_at
)
VALUES (
  '3fb789ff-63de-4e94-aee9-3c8bae9806e8',
  'Mizan Superadmin',
  'enterprise',
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Create the superadmin user
INSERT INTO users (
  tenant_id,
  email,
  password_hash,
  name,
  role,
  is_active,
  created_at,
  updated_at
)
VALUES (
  '3fb789ff-63de-4e94-aee9-3c8bae9806e8',
  'anna@mizan.com',
  '$2a$10$kO2oUDRzDSd0idWHNgyg8OUz96HviixDqSORbFA/ZdfPN7nwFykXS',
  'Anna Dahrouj',
  'superadmin',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  role = 'superadmin',
  is_active = true,
  password_hash = EXCLUDED.password_hash,
  updated_at = NOW();

-- Step 3: Verify the user was created
SELECT
  id,
  tenant_id,
  email,
  name,
  role,
  is_active,
  created_at
FROM users
WHERE email = 'anna@mizan.com';
