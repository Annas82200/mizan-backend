// Export all schema tables and relations
export * from './schema/core'; // Core: tenants, users, departments, sessions
export * from './schema/strategy';
export * from './schema/culture'; // Culture: assessments, frameworks
export * from './schema/skills'; // Skills: reports, taxonomies, employee skills
export * from './schema/performance'; // Performance: goals, reviews, 1-on-1s, talent profiles
export * from './schema/agents';
export * from './schema/benchmarking'; // Benchmarking: industry benchmarks, tenant metrics
export * from './schema/triggers';
export * from './schema/learning';
export * from './schema/lxp-extended'; // LXP: courses, enrollments, legacy tables
export * from './schema/hiring'; // Hiring: requisitions, candidates, interviews
export * from './schema/audit';
export * from './schema/payments'; // Payments: subscriptions, demo requests
export * from './schema/social-media'; // Social Media: accounts, posts, campaigns
export * from './schema/workflows'; // Workflows: automation, actions
export * from './schema/consulting'; // Consulting: requests, consultants

// === Mizan Platform v2.0 New Schemas ===
export * from './schema/mizan-assistant';
export * from './schema/mizan-engagement';
export * from './schema/mizan-onboarding';
export * from './schema/mizan-branding';
export * from './schema/mizan-ai-usage';
export * from './schema/mizan-module-config';
export * from './schema/mizan-hris';
export * from './schema/mizan-analysis';
export * from './schema/mizan-talent';
