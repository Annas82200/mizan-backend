-- Fix database schema for Mizan Platform
-- Following AGENT_CONTEXT_ULTIMATE.md requirements

-- Create tenants table with all required columns
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    domain TEXT UNIQUE,
    plan TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',
    industry TEXT,
    employee_count INTEGER,
    vision TEXT,
    mission TEXT,
    strategy TEXT,
    values JSONB,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    primary_contact TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create users table with all required columns
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee',
    title TEXT,
    department_id TEXT,
    manager_id TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create unique index for email per tenant
CREATE UNIQUE INDEX IF NOT EXISTS unique_email_per_tenant_idx ON users(tenant_id, email);

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    manager_id TEXT,
    parent_department_id TEXT,
    budget DECIMAL,
    head_count INTEGER,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create employee_profiles table
CREATE TABLE IF NOT EXISTS employee_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    bio TEXT,
    skills JSONB,
    interests JSONB,
    certifications JSONB,
    profile_picture TEXT,
    linkedin_url TEXT,
    twitter_url TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create analyses table
CREATE TABLE IF NOT EXISTS analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    results JSONB,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create org_inputs table
CREATE TABLE IF NOT EXISTS org_inputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create structure_analysis_results table
CREATE TABLE IF NOT EXISTS structure_analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL,
    analysis_id TEXT NOT NULL,
    results JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create org_structures table
CREATE TABLE IF NOT EXISTS org_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT,
    submitted_by TEXT,
    raw_text TEXT NOT NULL,
    parsed_data JSONB,
    analysis_result JSONB,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create framework_config table
CREATE TABLE IF NOT EXISTS framework_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version INTEGER NOT NULL DEFAULT 1,
    cylinders JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    updated_by TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    metadata JSONB
);

-- Insert a test superadmin user if it doesn't exist
INSERT INTO users (tenant_id, email, password_hash, name, role, is_active)
SELECT 
    '00000000-0000-0000-0000-000000000000'::text,
    'superadmin@mizan.work',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
    'Super Admin',
    'superadmin',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'superadmin@mizan.work'
);

-- Insert a test tenant if it doesn't exist
INSERT INTO tenants (id, name, plan, status, industry, employee_count)
SELECT 
    '00000000-0000-0000-0000-000000000000'::uuid,
    'Mizan Platform',
    'enterprise',
    'active',
    'Technology',
    1
WHERE NOT EXISTS (
    SELECT 1 FROM tenants WHERE id = '00000000-0000-0000-0000-000000000000'::uuid
);

-- Update the superadmin user to use the test tenant
UPDATE users 
SET tenant_id = '00000000-0000-0000-0000-000000000000'
WHERE email = 'superadmin@mizan.work' 
AND tenant_id = '00000000-0000-0000-0000-000000000000'::text;
