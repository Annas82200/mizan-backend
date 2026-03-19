/**
 * Creates all missing PostgreSQL enums using DO blocks (PG doesn't support CREATE TYPE IF NOT EXISTS).
 * Run: node tests/create-enums.cjs
 */
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ENUMS = {
  employee_status: ['active', 'inactive', 'terminated', 'on_leave'],
  connection_type: ['rest', 'soap', 'webhook', 'sftp'],
  conflict_strategy: ['hris_wins', 'mizan_wins', 'manual_review', 'newest_wins'],
  connector_status: ['active', 'paused', 'error', 'configuring'],
  sync_type: ['full', 'incremental', 'webhook_triggered'],
  sync_status: ['running', 'completed', 'failed', 'cancelled'],
  conflict_status: ['pending', 'resolved_hris', 'resolved_mizan', 'resolved_manual', 'dismissed'],
  conversation_status: ['active', 'archived', 'deleted'],
  message_role: ['user', 'assistant', 'system'],
  action_status: ['pending', 'executing', 'completed', 'failed', 'cancelled'],
  action_type: ['send_email', 'schedule_meeting', 'create_task', 'approve_request', 'generate_report', 'trigger_workflow', 'send_reminder', 'update_record'],
  survey_status: ['draft', 'active', 'closed', 'archived'],
  challenge_status: ['upcoming', 'active', 'completed', 'cancelled'],
  badge_tier: ['bronze', 'silver', 'gold', 'platinum'],
  recognition_type: ['kudos', 'shoutout', 'value_champion', 'team_mvp', 'innovation'],
  workflow_status: ['draft', 'active', 'archived'],
  assignment_status: ['not_started', 'in_progress', 'completed', 'overdue', 'cancelled'],
  checklist_item_status: ['pending', 'in_progress', 'completed', 'skipped', 'blocked'],
  mentor_match_status: ['proposed', 'accepted', 'active', 'completed', 'declined'],
  plan_phase: ['first_30', 'first_60', 'first_90'],
  domain_status: ['pending', 'verified', 'failed', 'active'],
  brand_asset_type: ['logo', 'favicon', 'login_bg', 'sidebar_logo', 'email_header', 'email_footer', 'custom'],
  ai_engine: ['knowledge', 'reasoning', 'data'],
  ai_provider: ['mistral', 'claude', 'gemini'],
  ai_request_status: ['success', 'failed', 'timeout', 'rate_limited', 'fallback'],
  module_id: ['structure', 'culture', 'skills', 'performance', 'hiring', 'onboarding', 'lxp', 'talent', 'bonus', 'engagement'],
  approval_status: ['pending', 'approved', 'rejected', 'escalated'],
  bonus_cycle_status: ['planning', 'active', 'calculation', 'review', 'approved', 'distributed', 'closed'],
  allocation_status: ['draft', 'pending_approval', 'approved', 'rejected', 'distributed'],
  succession_priority: ['critical', 'high', 'medium', 'low'],
  readiness_level: ['ready_now', 'ready_1_year', 'ready_2_years', 'developing', 'not_ready'],
  development_status: ['not_started', 'in_progress', 'on_track', 'at_risk', 'completed'],
  talent_category: ['high_potential', 'high_performer', 'solid_performer', 'inconsistent', 'underperformer'],
  course_difficulty: ['beginner', 'intermediate', 'advanced'],
  course_status: ['draft', 'published', 'archived'],
  enrollment_status: ['enrolled', 'in_progress', 'completed', 'dropped'],
  lesson_type: ['text', 'video', 'quiz', 'interactive', 'ai_generated'],
  proficiency_level: ['novice', 'beginner', 'intermediate', 'advanced', 'expert'],
  skill_assessment_status: ['pending', 'in_progress', 'completed'],
  analysis_type: ['structure', 'culture', 'skills', 'full'],
  analysis_run_status: ['running', 'completed', 'failed'],
};

async function main() {
  let created = 0, existed = 0;
  for (const [name, values] of Object.entries(ENUMS)) {
    const valList = values.map(v => `'${v}'`).join(', ');
    try {
      await pool.query(`DO $$ BEGIN CREATE TYPE ${name} AS ENUM (${valList}); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
      // Check if it was just created or already existed
      const check = await pool.query(`SELECT 1 FROM pg_type WHERE typname = '${name}'`);
      if (check.rows.length > 0) {
        created++;
      }
    } catch (e) {
      console.error(`Error creating ${name}:`, e.message.substring(0, 100));
    }
  }
  console.log(`Enums: ${created} processed (created or already existed)`);
  await pool.end();
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
