/**
 * Creates all missing tables defined in our Drizzle schemas.
 * Uses raw SQL CREATE TABLE IF NOT EXISTS to avoid conflicts with existing tables.
 *
 * Run: node tests/create-tables.cjs
 */
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ENUMS = [
  "CREATE TYPE IF NOT EXISTS employee_status AS ENUM ('active', 'inactive', 'terminated', 'on_leave')",
  "CREATE TYPE IF NOT EXISTS connection_type AS ENUM ('rest', 'soap', 'webhook', 'sftp')",
  "CREATE TYPE IF NOT EXISTS conflict_strategy AS ENUM ('hris_wins', 'mizan_wins', 'manual_review', 'newest_wins')",
  "CREATE TYPE IF NOT EXISTS connector_status AS ENUM ('active', 'paused', 'error', 'configuring')",
  "CREATE TYPE IF NOT EXISTS sync_type AS ENUM ('full', 'incremental', 'webhook_triggered')",
  "CREATE TYPE IF NOT EXISTS sync_status AS ENUM ('running', 'completed', 'failed', 'cancelled')",
  "CREATE TYPE IF NOT EXISTS conflict_status AS ENUM ('pending', 'resolved_hris', 'resolved_mizan', 'resolved_manual', 'dismissed')",
  "CREATE TYPE IF NOT EXISTS conversation_status AS ENUM ('active', 'archived', 'deleted')",
  "CREATE TYPE IF NOT EXISTS message_role AS ENUM ('user', 'assistant', 'system')",
  "CREATE TYPE IF NOT EXISTS action_status AS ENUM ('pending', 'executing', 'completed', 'failed', 'cancelled')",
  "CREATE TYPE IF NOT EXISTS action_type AS ENUM ('send_email', 'schedule_meeting', 'create_task', 'approve_request', 'generate_report', 'trigger_workflow', 'send_reminder', 'update_record')",
  "CREATE TYPE IF NOT EXISTS survey_status AS ENUM ('draft', 'active', 'closed', 'archived')",
  "CREATE TYPE IF NOT EXISTS challenge_status AS ENUM ('upcoming', 'active', 'completed', 'cancelled')",
  "CREATE TYPE IF NOT EXISTS badge_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum')",
  "CREATE TYPE IF NOT EXISTS recognition_type AS ENUM ('kudos', 'shoutout', 'value_champion', 'team_mvp', 'innovation')",
  "CREATE TYPE IF NOT EXISTS workflow_status AS ENUM ('draft', 'active', 'archived')",
  "CREATE TYPE IF NOT EXISTS assignment_status AS ENUM ('not_started', 'in_progress', 'completed', 'overdue', 'cancelled')",
  "CREATE TYPE IF NOT EXISTS checklist_item_status AS ENUM ('pending', 'in_progress', 'completed', 'skipped', 'blocked')",
  "CREATE TYPE IF NOT EXISTS mentor_match_status AS ENUM ('proposed', 'accepted', 'active', 'completed', 'declined')",
  "CREATE TYPE IF NOT EXISTS plan_phase AS ENUM ('first_30', 'first_60', 'first_90')",
  "CREATE TYPE IF NOT EXISTS domain_status AS ENUM ('pending', 'verified', 'failed', 'active')",
  "CREATE TYPE IF NOT EXISTS brand_asset_type AS ENUM ('logo', 'favicon', 'login_bg', 'sidebar_logo', 'email_header', 'email_footer', 'custom')",
  "CREATE TYPE IF NOT EXISTS ai_engine AS ENUM ('knowledge', 'reasoning', 'data')",
  "CREATE TYPE IF NOT EXISTS ai_provider AS ENUM ('mistral', 'claude', 'gemini')",
  "CREATE TYPE IF NOT EXISTS ai_request_status AS ENUM ('success', 'failed', 'timeout', 'rate_limited', 'fallback')",
  "CREATE TYPE IF NOT EXISTS module_id AS ENUM ('structure', 'culture', 'skills', 'performance', 'hiring', 'onboarding', 'lxp', 'talent', 'bonus', 'engagement')",
  "CREATE TYPE IF NOT EXISTS approval_status AS ENUM ('pending', 'approved', 'rejected', 'escalated')",
  "CREATE TYPE IF NOT EXISTS bonus_cycle_status AS ENUM ('planning', 'active', 'calculation', 'review', 'approved', 'distributed', 'closed')",
  "CREATE TYPE IF NOT EXISTS allocation_status AS ENUM ('draft', 'pending_approval', 'approved', 'rejected', 'distributed')",
  "CREATE TYPE IF NOT EXISTS succession_priority AS ENUM ('critical', 'high', 'medium', 'low')",
  "CREATE TYPE IF NOT EXISTS readiness_level AS ENUM ('ready_now', 'ready_1_year', 'ready_2_years', 'developing', 'not_ready')",
  "CREATE TYPE IF NOT EXISTS development_status AS ENUM ('not_started', 'in_progress', 'on_track', 'at_risk', 'completed')",
  "CREATE TYPE IF NOT EXISTS talent_category AS ENUM ('high_potential', 'high_performer', 'solid_performer', 'inconsistent', 'underperformer')",
  "CREATE TYPE IF NOT EXISTS course_difficulty AS ENUM ('beginner', 'intermediate', 'advanced')",
  "CREATE TYPE IF NOT EXISTS course_status AS ENUM ('draft', 'published', 'archived')",
  "CREATE TYPE IF NOT EXISTS enrollment_status AS ENUM ('enrolled', 'in_progress', 'completed', 'dropped')",
  "CREATE TYPE IF NOT EXISTS lesson_type AS ENUM ('text', 'video', 'quiz', 'interactive', 'ai_generated')",
  "CREATE TYPE IF NOT EXISTS proficiency_level AS ENUM ('novice', 'beginner', 'intermediate', 'advanced', 'expert')",
  "CREATE TYPE IF NOT EXISTS skill_assessment_status AS ENUM ('pending', 'in_progress', 'completed')",
  "CREATE TYPE IF NOT EXISTS analysis_type AS ENUM ('structure', 'culture', 'skills', 'full')",
  "CREATE TYPE IF NOT EXISTS analysis_run_status AS ENUM ('running', 'completed', 'failed')",
];

const TABLES = [
  // Core
  `CREATE TABLE IF NOT EXISTS employees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL, external_id VARCHAR(255),
    first_name VARCHAR(255) NOT NULL, last_name VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL,
    department_id UUID, position_id UUID, manager_id UUID, status employee_status DEFAULT 'active' NOT NULL,
    hire_date TIMESTAMP, location VARCHAR(255), phone_number VARCHAR(50), avatar_url VARCHAR(1024),
    metadata JSONB DEFAULT '{}', last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS departments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL, external_id VARCHAR(255),
    name VARCHAR(255) NOT NULL, parent_id UUID, head_id UUID, cost_center VARCHAR(100),
    metadata JSONB DEFAULT '{}', last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS positions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL, external_id VARCHAR(255),
    title VARCHAR(255) NOT NULL, department_id UUID, level VARCHAR(100), job_family VARCHAR(255),
    is_vacant BOOLEAN DEFAULT false, metadata JSONB DEFAULT '{}', last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS compensation (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL, employee_id UUID NOT NULL,
    base_salary REAL, currency VARCHAR(3) DEFAULT 'USD', pay_frequency VARCHAR(50),
    effective_date TIMESTAMP, metadata JSONB DEFAULT '{}', last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  // HRIS
  `CREATE TABLE IF NOT EXISTS connector_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL, name VARCHAR(255) NOT NULL,
    hris_type VARCHAR(100) NOT NULL, connection_type connection_type NOT NULL, base_url VARCHAR(1024),
    auth_config JSONB NOT NULL, field_mappings JSONB DEFAULT '{}' NOT NULL, sync_schedule JSONB DEFAULT '{}' NOT NULL,
    transform_rules JSONB DEFAULT '[]', conflict_resolution conflict_strategy DEFAULT 'hris_wins' NOT NULL,
    status connector_status DEFAULT 'configuring' NOT NULL, last_sync_at TIMESTAMP, last_sync_status sync_status,
    error_message TEXT, metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, connector_id UUID NOT NULL, tenant_id UUID NOT NULL,
    sync_type sync_type NOT NULL, status sync_status DEFAULT 'running' NOT NULL,
    records_processed INT DEFAULT 0, records_created INT DEFAULT 0, records_updated INT DEFAULT 0,
    records_failed INT DEFAULT 0, conflicts_detected INT DEFAULT 0, error_details JSONB,
    started_at TIMESTAMP DEFAULT NOW() NOT NULL, completed_at TIMESTAMP, duration_ms INT)`,
  `CREATE TABLE IF NOT EXISTS field_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, connector_id UUID NOT NULL, tenant_id UUID NOT NULL,
    entity_type VARCHAR(100) NOT NULL, source_field VARCHAR(255) NOT NULL, mizan_field VARCHAR(255) NOT NULL,
    transform_function VARCHAR(255), is_required BOOLEAN DEFAULT false, default_value TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sync_conflicts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, sync_log_id UUID NOT NULL, connector_id UUID NOT NULL,
    tenant_id UUID NOT NULL, entity_type VARCHAR(100) NOT NULL, entity_id VARCHAR(255) NOT NULL,
    field_name VARCHAR(255) NOT NULL, hris_value TEXT, mizan_value TEXT,
    status conflict_status DEFAULT 'pending' NOT NULL, resolved_by UUID, resolved_at TIMESTAMP, resolution TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, connector_id UUID NOT NULL, tenant_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL, payload JSONB NOT NULL, processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP, error_message TEXT, retry_count INT DEFAULT 0,
    received_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  // Assistant
  `CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL, user_id UUID NOT NULL,
    title VARCHAR(255), status conversation_status DEFAULT 'active' NOT NULL,
    last_message_at TIMESTAMP, message_count INT DEFAULT 0, metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, conversation_id UUID NOT NULL, tenant_id UUID NOT NULL,
    role message_role NOT NULL, content TEXT NOT NULL, intent VARCHAR(100), agent_used VARCHAR(100),
    engine_used VARCHAR(50), tokens_used INT, latency_ms INT, suggested_actions JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}', created_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS conversation_contexts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, conversation_id UUID NOT NULL, tenant_id UUID NOT NULL,
    context_type VARCHAR(100) NOT NULL, context_data JSONB NOT NULL, expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS assistant_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, message_id UUID, conversation_id UUID NOT NULL,
    tenant_id UUID NOT NULL, user_id UUID NOT NULL, action_type action_type NOT NULL,
    status action_status DEFAULT 'pending' NOT NULL, parameters JSONB NOT NULL, result JSONB,
    error_message TEXT, executed_at TIMESTAMP, created_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  // Engagement
  `CREATE TABLE IF NOT EXISTS pulse_surveys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL, title VARCHAR(255) NOT NULL,
    description TEXT, questions JSONB NOT NULL, target_audience JSONB DEFAULT '{}',
    status survey_status DEFAULT 'draft' NOT NULL, starts_at TIMESTAMP, ends_at TIMESTAMP,
    response_count INT DEFAULT 0, created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS pulse_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, survey_id UUID NOT NULL, tenant_id UUID NOT NULL,
    user_id UUID NOT NULL, answers JSONB NOT NULL, sentiment_score REAL, is_anonymous BOOLEAN DEFAULT false,
    submitted_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS gamification_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL, user_id UUID NOT NULL,
    points INT NOT NULL, source VARCHAR(100) NOT NULL, source_id UUID, description VARCHAR(500),
    awarded_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS badges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL, name VARCHAR(255) NOT NULL,
    description TEXT, icon_url VARCHAR(1024), tier badge_tier DEFAULT 'bronze' NOT NULL,
    criteria JSONB NOT NULL, company_value VARCHAR(255), is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS badge_awards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, badge_id UUID NOT NULL, tenant_id UUID NOT NULL,
    user_id UUID NOT NULL, awarded_by VARCHAR(100) NOT NULL, reason TEXT,
    awarded_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS challenges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL, title VARCHAR(255) NOT NULL,
    description TEXT, company_value VARCHAR(255) NOT NULL, challenge_type VARCHAR(100) NOT NULL,
    rules JSONB NOT NULL, points_reward INT NOT NULL, badge_reward UUID,
    status challenge_status DEFAULT 'upcoming' NOT NULL, max_participants INT,
    starts_at TIMESTAMP NOT NULL, ends_at TIMESTAMP NOT NULL, created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS challenge_participations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, challenge_id UUID NOT NULL, tenant_id UUID NOT NULL,
    user_id UUID NOT NULL, progress JSONB DEFAULT '{}', is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP, rank INT, joined_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS recognitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL, from_user_id UUID NOT NULL,
    to_user_id UUID NOT NULL, recognition_type recognition_type NOT NULL, company_value VARCHAR(255),
    message TEXT NOT NULL, points_awarded INT DEFAULT 0, is_public BOOLEAN DEFAULT true,
    likes INT DEFAULT 0, created_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL, period VARCHAR(50) NOT NULL,
    period_start TIMESTAMP NOT NULL, period_end TIMESTAMP NOT NULL,
    rankings JSONB NOT NULL, department_rankings JSONB DEFAULT '[]',
    computed_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  // Onboarding
  `CREATE TABLE IF NOT EXISTS onboarding_workflows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL, name VARCHAR(255) NOT NULL,
    description TEXT, target_role VARCHAR(100), target_department UUID,
    steps JSONB NOT NULL, estimated_duration_days INT DEFAULT 90,
    status workflow_status DEFAULT 'draft' NOT NULL, created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS onboarding_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, workflow_id UUID NOT NULL, tenant_id UUID NOT NULL,
    employee_id UUID NOT NULL, manager_id UUID, buddy_id UUID,
    status assignment_status DEFAULT 'not_started' NOT NULL, start_date TIMESTAMP NOT NULL,
    expected_end_date TIMESTAMP, actual_end_date TIMESTAMP, completion_percentage INT DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS onboarding_checklists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, assignment_id UUID NOT NULL, tenant_id UUID NOT NULL,
    step_order INT NOT NULL, title VARCHAR(255) NOT NULL, description TEXT, category VARCHAR(100),
    assignee_type VARCHAR(50) NOT NULL, assignee_id UUID,
    status checklist_item_status DEFAULT 'pending' NOT NULL, due_date TIMESTAMP,
    completed_at TIMESTAMP, completed_by UUID, notes TEXT, attachments JSONB DEFAULT '[]',
    is_required BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS mentor_matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL, mentee_id UUID NOT NULL,
    mentor_id UUID NOT NULL, assignment_id UUID,
    status mentor_match_status DEFAULT 'proposed' NOT NULL, match_score INT,
    match_reasons JSONB DEFAULT '[]', meeting_frequency VARCHAR(50) DEFAULT 'weekly',
    goals JSONB DEFAULT '[]', feedback_scores JSONB DEFAULT '{}',
    start_date TIMESTAMP, end_date TIMESTAMP, created_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS onboarding_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, assignment_id UUID NOT NULL, tenant_id UUID NOT NULL,
    phase plan_phase NOT NULL, objectives JSONB NOT NULL, key_results JSONB NOT NULL,
    learning_goals JSONB DEFAULT '[]', social_goals JSONB DEFAULT '[]',
    manager_notes TEXT, employee_reflection TEXT, ai_recommendations JSONB DEFAULT '[]',
    is_complete BOOLEAN DEFAULT false, completed_at TIMESTAMP, reviewed_by UUID, reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  // Branding
  `CREATE TABLE IF NOT EXISTS tenant_branding (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL UNIQUE,
    company_name VARCHAR(255), primary_color VARCHAR(7) DEFAULT '#3d3d4e',
    secondary_color VARCHAR(7) DEFAULT '#555555', accent_color VARCHAR(7) DEFAULT '#cc9a00',
    background_color VARCHAR(7) DEFAULT '#fafafa', surface_color VARCHAR(7) DEFAULT '#ffffff',
    text_primary_color VARCHAR(7) DEFAULT '#1a1a2e', text_secondary_color VARCHAR(7) DEFAULT '#6b7280',
    font_family_sans VARCHAR(255) DEFAULT 'Inter', font_family_display VARCHAR(255) DEFAULT 'Playfair Display',
    logo_url VARCHAR(1024), logo_dark_url VARCHAR(1024), favicon_url VARCHAR(1024),
    sidebar_logo_url VARCHAR(1024), login_background_url VARCHAR(1024),
    email_from_name VARCHAR(255), email_from_address VARCHAR(255),
    email_header_html TEXT, email_footer_html TEXT, custom_css TEXT,
    sidebar_style VARCHAR(50) DEFAULT 'default', dashboard_layout VARCHAR(50) DEFAULT 'default',
    show_powered_by BOOLEAN DEFAULT false, metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS brand_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL, branding_id UUID NOT NULL,
    asset_type brand_asset_type NOT NULL, file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(1024) NOT NULL, file_size VARCHAR(50), mime_type VARCHAR(100),
    metadata JSONB DEFAULT '{}', uploaded_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS custom_domains (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL,
    domain VARCHAR(255) NOT NULL UNIQUE, status domain_status DEFAULT 'pending' NOT NULL,
    ssl_certificate_id VARCHAR(255), verification_token VARCHAR(255),
    verified_at TIMESTAMP, dns_records JSONB DEFAULT '[]', is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  // AI Usage
  `CREATE TABLE IF NOT EXISTS ai_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL, user_id UUID,
    engine ai_engine NOT NULL, provider ai_provider NOT NULL, model VARCHAR(100) NOT NULL,
    request_type VARCHAR(100) NOT NULL, input_tokens INT NOT NULL, output_tokens INT NOT NULL,
    total_tokens INT NOT NULL, cost_usd REAL, latency_ms INT,
    status ai_request_status DEFAULT 'success' NOT NULL, was_cached VARCHAR(10) DEFAULT 'false',
    fallback_used VARCHAR(50), error_message VARCHAR(1024), metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS token_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL,
    period VARCHAR(20) NOT NULL, period_start TIMESTAMP NOT NULL, period_end TIMESTAMP NOT NULL,
    knowledge_tokens INT DEFAULT 0, reasoning_tokens INT DEFAULT 0, data_tokens INT DEFAULT 0, total_tokens INT DEFAULT 0,
    knowledge_cost_usd REAL DEFAULT 0, reasoning_cost_usd REAL DEFAULT 0, data_cost_usd REAL DEFAULT 0, total_cost_usd REAL DEFAULT 0,
    total_requests INT DEFAULT 0, cached_requests INT DEFAULT 0, failed_requests INT DEFAULT 0,
    computed_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS engine_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID, engine ai_engine NOT NULL,
    provider ai_provider NOT NULL, period VARCHAR(20) NOT NULL, period_start TIMESTAMP NOT NULL,
    avg_latency_ms REAL, p95_latency_ms REAL, p99_latency_ms REAL, success_rate REAL,
    total_requests INT DEFAULT 0, error_rate REAL, cache_hit_rate REAL, avg_tokens_per_request REAL,
    computed_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  // Module Config
  `CREATE TABLE IF NOT EXISTS module_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL,
    module_id module_id NOT NULL, is_enabled BOOLEAN DEFAULT false, is_configured BOOLEAN DEFAULT false,
    configured_by UUID, configured_at TIMESTAMP, settings JSONB DEFAULT '{}' NOT NULL,
    feature_flags JSONB DEFAULT '{}', display_order INT DEFAULT 0,
    custom_label VARCHAR(255), custom_icon VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS module_parameters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, module_config_id UUID NOT NULL, tenant_id UUID NOT NULL,
    parameter_key VARCHAR(255) NOT NULL, parameter_value JSONB NOT NULL,
    parameter_type VARCHAR(50) NOT NULL, label VARCHAR(255), description TEXT,
    validation_rules JSONB DEFAULT '{}', is_user_configurable BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS approval_workflows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL, description TEXT, module_id module_id,
    trigger_event VARCHAR(255) NOT NULL, steps JSONB NOT NULL, is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, workflow_id UUID NOT NULL, tenant_id UUID NOT NULL,
    requester_id UUID NOT NULL, entity_type VARCHAR(100) NOT NULL, entity_id UUID NOT NULL,
    current_step INT DEFAULT 1, status approval_status DEFAULT 'pending' NOT NULL,
    approval_history JSONB DEFAULT '[]', metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  // Bonus
  `CREATE TABLE IF NOT EXISTS bonus_cycles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL, name VARCHAR(255) NOT NULL,
    description TEXT, fiscal_year INT NOT NULL, quarter INT,
    status bonus_cycle_status DEFAULT 'planning' NOT NULL,
    start_date TIMESTAMP NOT NULL, end_date TIMESTAMP NOT NULL,
    total_budget REAL, currency VARCHAR(3) DEFAULT 'USD', distribution_date TIMESTAMP,
    created_by UUID NOT NULL, approved_by UUID, approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS bonus_pools (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, cycle_id UUID NOT NULL, tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL, department_id UUID, budget_amount REAL NOT NULL,
    allocated_amount REAL DEFAULT 0, remaining_amount REAL, employee_count INT DEFAULT 0,
    metadata JSONB DEFAULT '{}', created_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS bonus_criteria (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, cycle_id UUID NOT NULL, tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL, description TEXT, weight REAL NOT NULL,
    source_module VARCHAR(100) NOT NULL, calculation_method VARCHAR(100) NOT NULL,
    calculation_config JSONB NOT NULL, is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS bonus_allocations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, cycle_id UUID NOT NULL, pool_id UUID,
    tenant_id UUID NOT NULL, employee_id UUID NOT NULL, base_salary REAL,
    bonus_percentage REAL, calculated_amount REAL NOT NULL, adjusted_amount REAL, final_amount REAL,
    criteria_scores JSONB DEFAULT '[]', overall_score REAL,
    status allocation_status DEFAULT 'draft' NOT NULL,
    manager_adjustment REAL, manager_notes TEXT, approved_by UUID, approved_at TIMESTAMP, distributed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  // Talent
  `CREATE TABLE IF NOT EXISTS talent_pools (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL, name VARCHAR(255) NOT NULL,
    description TEXT, criteria JSONB NOT NULL, member_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true, created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS nine_box_placements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL, employee_id UUID NOT NULL,
    performance_score REAL NOT NULL, potential_score REAL NOT NULL,
    category talent_category NOT NULL, assessed_by UUID NOT NULL, period VARCHAR(50) NOT NULL,
    notes TEXT, action_plan TEXT, previous_category talent_category,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS succession_candidates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, succession_plan_id UUID NOT NULL,
    tenant_id UUID NOT NULL, employee_id UUID NOT NULL, readiness_level readiness_level NOT NULL,
    overall_fit_score REAL, competency_gaps JSONB DEFAULT '[]', development_actions JSONB DEFAULT '[]',
    ranking INT, nominated_by UUID NOT NULL, notes TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS development_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL, employee_id UUID NOT NULL,
    manager_id UUID, title VARCHAR(255) NOT NULL, target_role VARCHAR(255),
    status development_status DEFAULT 'not_started' NOT NULL,
    objectives JSONB NOT NULL, skill_targets JSONB DEFAULT '[]', learning_activities JSONB DEFAULT '[]',
    mentor_id UUID, start_date TIMESTAMP, target_completion_date TIMESTAMP, actual_completion_date TIMESTAMP,
    progress_percentage INT DEFAULT 0, ai_recommendations JSONB DEFAULT '[]', last_review_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  // Audit
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID, user_id UUID,
    user_email VARCHAR(255), user_role VARCHAR(50), action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(100) NOT NULL, resource_id VARCHAR(255),
    method VARCHAR(10) NOT NULL, path VARCHAR(1024) NOT NULL, status_code VARCHAR(3),
    request_body_hash VARCHAR(64), changes JSONB, ip_address VARCHAR(45), user_agent TEXT,
    duration_ms VARCHAR(10), timestamp TIMESTAMP DEFAULT NOW() NOT NULL)`,
  // LXP
  `CREATE TABLE IF NOT EXISTS courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL, title VARCHAR(255) NOT NULL,
    description TEXT, difficulty course_difficulty DEFAULT 'intermediate' NOT NULL,
    status course_status DEFAULT 'draft' NOT NULL, estimated_duration_minutes INT,
    thumbnail_url VARCHAR(1024), tags JSONB DEFAULT '[]', prerequisites JSONB DEFAULT '[]',
    skills_targeted JSONB DEFAULT '[]', is_ai_generated BOOLEAN DEFAULT false, created_by UUID,
    enrollment_count INT DEFAULT 0, average_rating REAL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS course_modules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, course_id UUID NOT NULL, tenant_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL, description TEXT, order_index INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS lessons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, module_id UUID NOT NULL, tenant_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL, content TEXT, lesson_type lesson_type DEFAULT 'text' NOT NULL,
    order_index INT NOT NULL, duration_minutes INT, exercise JSONB, media_url VARCHAR(1024),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS enrollments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, course_id UUID NOT NULL, tenant_id UUID NOT NULL,
    user_id UUID NOT NULL, status enrollment_status DEFAULT 'enrolled' NOT NULL,
    progress_percentage INT DEFAULT 0, started_at TIMESTAMP, completed_at TIMESTAMP,
    last_accessed_at TIMESTAMP, rating REAL, feedback TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS lesson_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, enrollment_id UUID NOT NULL, lesson_id UUID NOT NULL,
    tenant_id UUID NOT NULL, user_id UUID NOT NULL, is_completed BOOLEAN DEFAULT false,
    score REAL, time_spent_minutes INT DEFAULT 0, exercise_response JSONB,
    completed_at TIMESTAMP, created_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS learning_paths (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL, title VARCHAR(255) NOT NULL,
    description TEXT, course_ids JSONB DEFAULT '[]' NOT NULL, target_role VARCHAR(255),
    target_skills JSONB DEFAULT '[]', estimated_duration_hours INT, is_active BOOLEAN DEFAULT true,
    created_by UUID, created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS certificates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL, user_id UUID NOT NULL,
    course_id UUID, learning_path_id UUID, title VARCHAR(255) NOT NULL,
    issued_at TIMESTAMP DEFAULT NOW() NOT NULL, expires_at TIMESTAMP, certificate_url VARCHAR(1024))`,
  // Skills
  `CREATE TABLE IF NOT EXISTS skill_frameworks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL, name VARCHAR(255) NOT NULL,
    description TEXT, categories JSONB DEFAULT '[]' NOT NULL,
    levels JSONB DEFAULT '["novice","beginner","intermediate","advanced","expert"]' NOT NULL,
    is_default BOOLEAN DEFAULT false, created_by UUID,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS skills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, framework_id UUID NOT NULL, tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL, category VARCHAR(100), description TEXT, is_core BOOLEAN DEFAULT false,
    market_demand VARCHAR(50), created_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS employee_skills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL, employee_id UUID NOT NULL,
    skill_id UUID NOT NULL, current_level proficiency_level NOT NULL, target_level proficiency_level,
    verified_by UUID, verified_at TIMESTAMP, last_assessed_at TIMESTAMP, notes TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS skill_assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL, employee_id UUID NOT NULL,
    framework_id UUID, status skill_assessment_status DEFAULT 'pending' NOT NULL,
    assessor_id UUID, assessment_type VARCHAR(50) NOT NULL, results JSONB DEFAULT '[]',
    overall_score REAL, completed_at TIMESTAMP, created_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS skill_gap_analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL,
    scope VARCHAR(50) NOT NULL, scope_id UUID, gaps JSONB NOT NULL,
    recommendations JSONB DEFAULT '[]', analysis_date TIMESTAMP DEFAULT NOW() NOT NULL,
    generated_by VARCHAR(50) DEFAULT 'system', created_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
  // Analysis
  `CREATE TABLE IF NOT EXISTS analysis_runs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, tenant_id UUID NOT NULL,
    analysis_type analysis_type NOT NULL, status analysis_run_status DEFAULT 'running' NOT NULL,
    triggered_by UUID, engine_used VARCHAR(50), duration_ms REAL, error_message TEXT,
    started_at TIMESTAMP DEFAULT NOW() NOT NULL, completed_at TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS analysis_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY, run_id UUID NOT NULL, tenant_id UUID NOT NULL,
    analysis_type analysis_type NOT NULL, org_health_score REAL, structure_score REAL,
    culture_score REAL, culture_entropy REAL, skills_readiness_score REAL,
    structure_details JSONB, culture_details JSONB, skills_details JSONB,
    hiring_recommendations JSONB DEFAULT '[]', learning_recommendations JSONB DEFAULT '[]',
    performance_recommendations JSONB DEFAULT '[]', bonus_factors JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}', created_at TIMESTAMP DEFAULT NOW() NOT NULL)`,
];

async function main() {
  console.log('Creating enums and tables...\n');

  let enumsCreated = 0, enumsSkipped = 0;
  for (const sql of ENUMS) {
    try {
      await pool.query(sql);
      enumsCreated++;
    } catch (e) {
      if (e.code === '42710') { enumsSkipped++; } // already exists
      else { console.error('ENUM error:', e.message.substring(0, 100)); }
    }
  }
  console.log(`Enums: ${enumsCreated} created, ${enumsSkipped} already existed`);

  let tablesCreated = 0, tablesExisted = 0, errors = 0;
  for (const sql of TABLES) {
    try {
      await pool.query(sql);
      // Check if it was actually created vs already existed
      tablesCreated++;
    } catch (e) {
      console.error('TABLE error:', e.message.substring(0, 120));
      errors++;
    }
  }
  console.log(`Tables: ${tablesCreated} processed (CREATE IF NOT EXISTS), ${errors} errors`);

  // Verify final count
  const result = await pool.query("SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public'");
  console.log(`\nTotal tables in database: ${result.rows[0].count}`);

  await pool.end();
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
