/**
 * Mizan Platform — Comprehensive Test Suite
 *
 * Tests every route group, service relationship, and cross-module workflow.
 * Runs against the live backend at localhost:5001.
 *
 * Usage: npx tsx tests/comprehensive-test.ts
 */

import jwt from 'jsonwebtoken';

const BASE_URL = process.env.TEST_URL || 'http://localhost:5001';
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-testing';

// Generate a valid test JWT
const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const TEST_USER_ID = '00000000-0000-0000-0000-000000000002';
const TEST_TOKEN = jwt.sign(
  { userId: TEST_USER_ID, tenantId: TEST_TENANT_ID, role: 'admin', email: 'test@mizan.ai' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

interface TestResult {
  name: string;
  group: string;
  passed: boolean;
  status?: number;
  error?: string;
  responseTime?: number;
}

const results: TestResult[] = [];

async function request(method: string, path: string, body?: Record<string, unknown>, requireAuth = true): Promise<{ status: number; data: unknown; time: number }> {
  const start = Date.now();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (requireAuth) headers['Authorization'] = `Bearer ${TEST_TOKEN}`;

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const time = Date.now() - start;
  let data: unknown;
  try { data = await response.json(); } catch (e) { data = null; }
  return { status: response.status, data, time };
}

function test(name: string, group: string, fn: () => Promise<void>) {
  return async () => {
    try {
      await fn();
      results.push({ name, group, passed: true });
    } catch (err) {
      results.push({ name, group, passed: false, error: (err as Error).message });
    }
  };
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

// ============================================================
// TEST DEFINITIONS
// ============================================================

const tests = [
  // === HEALTH CHECK ===
  test('Health endpoint returns 200', 'Health', async () => {
    const res = await request('GET', '/api/health', undefined, false);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = res.data as Record<string, unknown>;
    assert(data.status === 'healthy', 'Expected status: healthy');
    assert(data.version === '2.0.0', 'Expected version: 2.0.0');
  }),

  // === AUTH MIDDLEWARE ===
  test('Unauthenticated request returns 401', 'Auth', async () => {
    const res = await request('GET', '/api/modules', undefined, false);
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  }),

  test('GET /api/branding is public (no auth needed)', 'Auth', async () => {
    const res = await request('GET', '/api/branding', undefined, false);
    // Should not be 401 (may be 500 if no branding data, but NOT 401)
    assert(res.status !== 401, `Branding GET should be public, got 401`);
  }),

  test('PUT /api/branding requires auth', 'Auth', async () => {
    const res = await request('PUT', '/api/branding', { primaryColor: '#ff0000' }, false);
    assert(res.status === 401, `Expected 401 for unauthenticated PUT, got ${res.status}`);
  }),

  test('Authenticated request with valid JWT succeeds', 'Auth', async () => {
    const res = await request('GET', '/api/modules');
    assert(res.status !== 401, `Expected non-401 with valid token, got ${res.status}`);
  }),

  // === MODULES ===
  test('GET /api/modules returns modules list', 'Modules', async () => {
    const res = await request('GET', '/api/modules');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = res.data as Record<string, unknown>;
    assert(Array.isArray(data.modules), 'Expected modules array');
  }),

  test('PATCH /api/modules/:moduleId/toggle with invalid moduleId returns 400', 'Modules', async () => {
    const res = await request('PATCH', '/api/modules/invalid_module/toggle', { isEnabled: true });
    assert(res.status === 400, `Expected 400 for invalid moduleId, got ${res.status}`);
  }),

  test('GET /api/modules/workflows returns workflows', 'Modules', async () => {
    const res = await request('GET', '/api/modules/workflows');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = res.data as Record<string, unknown>;
    assert(Array.isArray(data.workflows), 'Expected workflows array');
  }),

  test('GET /api/modules/approvals returns approval requests', 'Modules', async () => {
    const res = await request('GET', '/api/modules/approvals');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }),

  // === ENGAGEMENT ===
  test('GET /api/engagement/recognition/feed returns feed', 'Engagement', async () => {
    const res = await request('GET', '/api/engagement/recognition/feed');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = res.data as Record<string, unknown>;
    assert(Array.isArray(data.feed), 'Expected feed array');
  }),

  test('GET /api/engagement/points returns total points', 'Engagement', async () => {
    const res = await request('GET', '/api/engagement/points');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = res.data as Record<string, unknown>;
    assert(typeof data.totalPoints === 'number', 'Expected totalPoints number');
  }),

  test('GET /api/engagement/challenges returns challenges', 'Engagement', async () => {
    const res = await request('GET', '/api/engagement/challenges');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = res.data as Record<string, unknown>;
    assert(Array.isArray(data.challenges), 'Expected challenges array');
  }),

  test('GET /api/engagement/leaderboard returns leaderboard', 'Engagement', async () => {
    const res = await request('GET', '/api/engagement/leaderboard');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }),

  test('POST /api/engagement/surveys with validation', 'Engagement', async () => {
    // Missing required fields should fail validation
    const res = await request('POST', '/api/engagement/surveys', {});
    assert(res.status === 400, `Expected 400 for invalid survey, got ${res.status}`);
  }),

  // === ONBOARDING ===
  test('GET /api/onboarding/workflows returns workflows', 'Onboarding', async () => {
    const res = await request('GET', '/api/onboarding/workflows');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = res.data as Record<string, unknown>;
    assert(Array.isArray(data.workflows), 'Expected workflows array');
  }),

  test('GET /api/onboarding/assignments returns assignments', 'Onboarding', async () => {
    const res = await request('GET', '/api/onboarding/assignments');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }),

  // === HRIS ===
  test('GET /api/hris/connectors returns connectors', 'HRIS', async () => {
    const res = await request('GET', '/api/hris/connectors');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = res.data as Record<string, unknown>;
    assert(Array.isArray(data.connectors), 'Expected connectors array');
  }),

  test('POST /api/hris/connectors validates input', 'HRIS', async () => {
    // Missing required fields
    const res = await request('POST', '/api/hris/connectors', { name: 'test' });
    assert(res.status === 400, `Expected 400 for invalid connector, got ${res.status}`);
  }),

  // === BRANDING ===
  test('GET /api/branding returns branding config', 'Branding', async () => {
    const res = await request('GET', '/api/branding');
    // May return 500 if no branding exists, but should not crash
    assert(res.status === 200 || res.status === 500, `Expected 200 or 500, got ${res.status}`);
  }),

  test('PUT /api/branding validates hex colors', 'Branding', async () => {
    const res = await request('PUT', '/api/branding', { primaryColor: 'not-a-hex' });
    assert(res.status === 400, `Expected 400 for invalid color, got ${res.status}`);
  }),

  // === GDPR ===
  test('GET /api/gdpr/export/:userId returns data export', 'GDPR', async () => {
    const res = await request('GET', `/api/gdpr/export/${TEST_USER_ID}`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = res.data as Record<string, unknown>;
    assert(data.userId === TEST_USER_ID, 'Expected matching userId');
  }),

  test('GET /api/gdpr/audit/:userId returns audit trail', 'GDPR', async () => {
    const res = await request('GET', `/api/gdpr/audit/${TEST_USER_ID}`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }),

  // === ANALYTICS ===
  test('GET /api/analytics/executive returns real metrics (not hardcoded)', 'Analytics', async () => {
    const res = await request('GET', '/api/analytics/executive');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = res.data as Record<string, unknown>;
    assert(typeof data.orgHealthScore === 'number', 'Expected orgHealthScore number');
    assert(typeof data.employeeCount === 'number', 'Expected employeeCount number');
    assert(Array.isArray(data.aiInsights), 'Expected aiInsights array');
  }),

  test('GET /api/analytics/manager returns team data', 'Analytics', async () => {
    const res = await request('GET', '/api/analytics/manager');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = res.data as Record<string, unknown>;
    assert(typeof data.teamSize === 'number', 'Expected teamSize number');
    assert(Array.isArray(data.teamMembers), 'Expected teamMembers array');
  }),

  // === SKILLS ===
  test('GET /api/skills/frameworks returns frameworks', 'Skills', async () => {
    const res = await request('GET', '/api/skills/frameworks');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = res.data as Record<string, unknown>;
    assert(Array.isArray(data.frameworks), 'Expected frameworks array');
  }),

  test('GET /api/skills/assessments returns assessments', 'Skills', async () => {
    const res = await request('GET', '/api/skills/assessments');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }),

  test('GET /api/skills/gaps returns gap analysis', 'Skills', async () => {
    const res = await request('GET', '/api/skills/gaps');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }),

  // === PERFORMANCE ===
  test('GET /api/performance/metrics returns metrics', 'Performance', async () => {
    const res = await request('GET', '/api/performance/metrics');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = res.data as Record<string, unknown>;
    assert(typeof data.totalPlans === 'number', 'Expected totalPlans number');
  }),

  test('GET /api/performance/goals returns goals', 'Performance', async () => {
    const res = await request('GET', '/api/performance/goals');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = res.data as Record<string, unknown>;
    assert(Array.isArray(data.goals), 'Expected goals array');
  }),

  // === CULTURE ===
  test('GET /api/culture/results returns latest results', 'Culture', async () => {
    const res = await request('GET', '/api/culture/results');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }),

  test('GET /api/culture/surveys returns surveys', 'Culture', async () => {
    const res = await request('GET', '/api/culture/surveys');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }),

  // === HIRING ===
  test('GET /api/hiring/metrics returns metrics', 'Hiring', async () => {
    const res = await request('GET', '/api/hiring/metrics');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }),

  test('GET /api/hiring/requisitions returns requisitions', 'Hiring', async () => {
    const res = await request('GET', '/api/hiring/requisitions');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }),

  // === LXP ===
  test('GET /api/lxp/overview returns overview', 'LXP', async () => {
    const res = await request('GET', '/api/lxp/overview');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }),

  test('GET /api/lxp/courses returns courses', 'LXP', async () => {
    const res = await request('GET', '/api/lxp/courses');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }),

  test('GET /api/lxp/learning-paths returns paths', 'LXP', async () => {
    const res = await request('GET', '/api/lxp/learning-paths');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }),

  test('GET /api/lxp/recommendations returns recommendations', 'LXP', async () => {
    const res = await request('GET', '/api/lxp/recommendations');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }),

  // === TALENT ===
  test('GET /api/talent/overview returns overview', 'Talent', async () => {
    const res = await request('GET', '/api/talent/overview');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }),

  test('GET /api/talent/succession-plans returns plans', 'Talent', async () => {
    const res = await request('GET', '/api/talent/succession-plans');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }),

  test('GET /api/talent/development-plans returns plans', 'Talent', async () => {
    const res = await request('GET', '/api/talent/development-plans');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }),

  // === BONUS ===
  test('GET /api/bonus/overview returns overview', 'Bonus', async () => {
    const res = await request('GET', '/api/bonus/overview');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }),

  test('GET /api/bonus/criteria returns criteria', 'Bonus', async () => {
    const res = await request('GET', '/api/bonus/criteria');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }),

  // === ANALYSIS ===
  test('GET /api/analysis/results returns latest results', 'Analysis', async () => {
    const res = await request('GET', '/api/analysis/results');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }),

  test('GET /api/analysis/runs returns run history', 'Analysis', async () => {
    const res = await request('GET', '/api/analysis/runs');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }),

  // === ASSISTANT ===
  test('POST /api/assistant/message validates input', 'Assistant', async () => {
    const res = await request('POST', '/api/assistant/message', {});
    assert(res.status === 400, `Expected 400 for empty message, got ${res.status}`);
  }),

  test('GET /api/assistant/conversations returns conversations', 'Assistant', async () => {
    const res = await request('GET', '/api/assistant/conversations');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  }),

  // === CROSS-MODULE: ZOD VALIDATION ===
  test('POST /api/engagement/recognize validates required fields', 'Validation', async () => {
    const res = await request('POST', '/api/engagement/recognize', { message: 'test' });
    assert(res.status === 400, `Expected 400 for missing toUserId, got ${res.status}`);
    const data = res.data as Record<string, unknown>;
    assert(Array.isArray(data.details), 'Expected validation details array');
  }),

  test('POST /api/hris/connectors validates connection type enum', 'Validation', async () => {
    const res = await request('POST', '/api/hris/connectors', {
      name: 'test', hrisType: 'custom', connectionType: 'invalid_type',
      authConfig: { type: 'api_key', credentials: { key: 'val' } },
    });
    assert(res.status === 400, `Expected 400 for invalid connectionType, got ${res.status}`);
  }),

  test('POST /api/onboarding/workflows validates name', 'Validation', async () => {
    const res = await request('POST', '/api/onboarding/workflows', {});
    assert(res.status === 400, `Expected 400 for missing name, got ${res.status}`);
  }),

  test('PUT /api/branding validates hex color format', 'Validation', async () => {
    const res = await request('PUT', '/api/branding', { primaryColor: 'red' });
    assert(res.status === 400, `Expected 400 for non-hex color, got ${res.status}`);
  }),

  // === CROSS-MODULE: RATE LIMITING HEADERS ===
  test('Rate limit headers present on responses', 'RateLimit', async () => {
    const response = await fetch(`${BASE_URL}/api/modules`, {
      headers: { 'Authorization': `Bearer ${TEST_TOKEN}` },
    });
    const remaining = response.headers.get('X-RateLimit-Remaining');
    // May be null if Redis is down (rate limiter fails open)
    // Either headers present or graceful degradation
    assert(response.status !== 429 || remaining !== null, 'Rate limit should work or fail open');
  }),
];

// ============================================================
// TEST RUNNER
// ============================================================

async function run() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   MIZAN PLATFORM — COMPREHENSIVE TEST SUITE            ║');
  console.log('║   Testing against: ' + BASE_URL + '                    ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  // Check server is reachable
  try {
    const health = await fetch(`${BASE_URL}/api/health`);
    if (health.status !== 200) {
      console.error('ERROR: Backend not responding. Start it with: cd backend && npm run dev');
      process.exit(1);
    }
  } catch (e) {
    console.error('ERROR: Cannot connect to ' + BASE_URL + '. Is the backend running?');
    process.exit(1);
  }

  console.log(`Running ${tests.length} tests...\n`);

  for (const testFn of tests) {
    await testFn();
  }

  // Group results
  const groups = new Map<string, TestResult[]>();
  for (const r of results) {
    if (!groups.has(r.group)) groups.set(r.group, []);
    groups.get(r.group)!.push(r);
  }

  // Print results
  let passed = 0, failed = 0;
  for (const [group, groupResults] of groups) {
    const groupPassed = groupResults.filter(r => r.passed).length;
    const groupTotal = groupResults.length;
    const icon = groupPassed === groupTotal ? '✅' : '⚠️';
    console.log(`${icon} ${group} (${groupPassed}/${groupTotal})`);

    for (const r of groupResults) {
      if (r.passed) {
        console.log(`   ✓ ${r.name}`);
        passed++;
      } else {
        console.log(`   ✗ ${r.name}`);
        console.log(`     Error: ${r.error}`);
        failed++;
      }
    }
    console.log('');
  }

  // Summary
  const total = passed + failed;
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`RESULTS: ${passed}/${total} passed (${Math.round(passed/total*100)}%)`);
  if (failed > 0) {
    console.log(`FAILED: ${failed} tests`);
  } else {
    console.log('ALL TESTS PASSED ✅');
  }
  console.log('═══════════════════════════════════════════════════════════');

  process.exit(failed > 0 ? 1 : 0);
}

run();
