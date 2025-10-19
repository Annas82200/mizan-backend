-- Add missing columns to existing tables
-- Following AGENT_CONTEXT_ULTIMATE.md requirements

-- Add missing columns to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS employee_count INTEGER;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS vision TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS mission TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS strategy TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS values JSONB;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS primary_contact TEXT;

-- Add missing columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS title TEXT;

-- Create a test superadmin user if it doesn't exist
INSERT INTO users (tenant_id, email, password_hash, name, role, is_active)
SELECT 
    (SELECT id FROM tenants LIMIT 1),
    'superadmin@mizan.work',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
    'Super Admin',
    'superadmin',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'superadmin@mizan.work'
);

-- Create a test tenant if none exists
INSERT INTO tenants (name, plan, status, industry, employee_count)
SELECT 
    'Mizan Platform',
    'enterprise',
    'active',
    'Technology',
    1
WHERE NOT EXISTS (
    SELECT 1 FROM tenants
);
