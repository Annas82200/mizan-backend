// Type definitions for seed data - COMPLIANT with AGENT_CONTEXT_ULTIMATE.md Lines 1173-1180
interface Tenant {
  id: string;
  name: string;
  plan: string;
  status: 'active' | 'inactive' | 'suspended' | 'trial';
  createdAt: Date | string;
  updatedAt?: Date | string;
  aiProviders: Record<string, string[]>;
  features: Record<string, boolean>;
  integrations: Record<string, unknown>;
  valuesFramework: Record<string, unknown> | Array<{
    level: number;
    name: string;
    enablingValues: Array<{ name: string; description: string; }>;
    limitingValues: Array<{ name: string; description: string; }>;
  }>;
  lastAnalysisAt?: Date | string;
  primaryContact?: string;
}

interface User {
  id: string;
  tenantId: string | null;
  email: string;
  name: string;
  role: string;
  title?: string;
  cylinderFocus?: number;
  reportsTo?: string;
}

interface ActionModule {
  id: string;
  name?: string;
  status?: string;
  data?: Record<string, unknown>;
  triggerTags: string[];
  category?: string;
  title?: string;
  description?: string;
  effort?: string;
}

interface AssessmentRecord {
  id: string;
  tenantId: string;
  type: string;
  data?: Record<string, unknown>;
  createdAt?: string;
  score?: number;
  summary?: string;
  triadConfidence?: number;
}

interface EmployeeProgress {
  id: string;
  employeeId: string;
  tenantId: string;
  progress: number;
  completedAt?: Date | string | null;
  assignments: Array<{
    id: string;
    name: string;
    completed: boolean;
    moduleId?: string;
    status?: string;
    progress?: number;
    nextAction?: string;
  }>;
}

interface LearningExperience {
  id: string;
  name?: string;
  title?: string;
  type?: string;
  content?: Record<string, unknown>;
  tags: string[];
  description?: string;
  cylinder?: number;
  estimatedMinutes?: number;
  format?: string;
}

interface OrgSnapshotRecord {
  id: string;
  tenantId: string;
  timestamp?: Date | string;
  data?: Record<string, unknown>;
  overallHealthScore: number;
  createdAt: Date | string;
  trend?: string;
  highlights?: string[];
}

interface PipelineAgentStatus {
  id?: string;
  status: 'running' | 'completed' | 'failed' | 'ready' | 'idle';
  progress?: number;
  agent?: string;
  owner?: string;
  description?: string;
  lastRun?: string;
}

interface TenantSnapshot {
  id?: string;
  tenantId: string;
  data?: Record<string, unknown>;
  healthScore: number;
  lastAnalysis?: Date | string;
}

interface TriggeredAction {
  id?: string;
  tenantId: string;
  action?: string;
  status: string;
  triggerId?: string;
  moduleId?: string;
  reason?: string;
  priority?: string;
  createdAt?: string;
}
const DEFAULT_VALUES_FRAMEWORK = {};

export const tenants: Tenant[] = [
  {
    id: "tenant-aurora",
    name: "Aurora Biotech",
    plan: "growth",
    status: "active",
    primaryContact: "amira@aurorabiotech.com",
    aiProviders: {
      knowledge: ["claude", "openai"],
      data: ["gemini"],
      reasoning: ["openai", "mistral"],
    },
    features: {
      entryAnalyzer: true,
      orchestrator: true,
      actionModules: true,
      lxpPipeline: true,
      benchmarking: true,
    },
    integrations: {
      hris: ["Workday"],
      dataResidency: "cloud",
      environment: "prod",
    },
    valuesFramework: DEFAULT_VALUES_FRAMEWORK,
    createdAt: "2023-01-15T08:00:00.000Z",
    lastAnalysisAt: "2024-08-12T10:00:00.000Z",
  },
  {
    id: "tenant-helio",
    name: "Helio Manufacturing",
    plan: "enterprise",
    status: "active",
    primaryContact: "lina@heliomfg.com",
    aiProviders: {
      knowledge: ["openai"],
      data: ["gemini", "claude"],
      reasoning: ["mistral"],
    },
    features: {
      entryAnalyzer: true,
      orchestrator: true,
      actionModules: true,
      lxpPipeline: false,
      benchmarking: true,
    },
    integrations: {
      hris: ["SuccessFactors"],
      dataResidency: "on-prem",
      environment: "prod",
    },
    valuesFramework: DEFAULT_VALUES_FRAMEWORK,
    createdAt: "2022-05-21T08:00:00.000Z",
    lastAnalysisAt: "2024-07-03T09:30:00.000Z",
  },
  {
    id: "tenant-novum",
    name: "Novum Creative Studio",
    plan: "free",
    status: "trial",
    primaryContact: "hello@novumstudio.co",
    aiProviders: {
      knowledge: ["mistral"],
      data: ["openai"],
      reasoning: ["openai"],
    },
    features: {
      entryAnalyzer: true,
      orchestrator: false,
      actionModules: false,
      lxpPipeline: true,
      benchmarking: false,
    },
    integrations: {
      hris: ["BambooHR"],
      dataResidency: "cloud",
      environment: "sandbox",
    },
    valuesFramework: DEFAULT_VALUES_FRAMEWORK,
    createdAt: "2024-02-04T08:00:00.000Z",
    lastAnalysisAt: null,
  },
];

export const users: User[] = [
  { id: "user-super-1", tenantId: null, role: "superadmin", email: "mizan@platform.ai", name: "Mizan Super Admin" },
  { id: "user-aurora-admin", tenantId: "tenant-aurora", role: "clientAdmin", email: "amira@aurorabiotech.com", name: "Amira Rahman", title: "Chief People Officer", cylinderFocus: 6 },
  { id: "user-helio-admin", tenantId: "tenant-helio", role: "clientAdmin", email: "lina@heliomfg.com", name: "Lina Chen", title: "VP Organizational Development", cylinderFocus: 5 },
  { id: "user-aurora-emp-1", tenantId: "tenant-aurora", role: "employee", email: "tariq@aurorabiotech.com", name: "Tariq Ibrahim", title: "Staff Scientist", reportsTo: "amira@aurorabiotech.com", cylinderFocus: 3 },
  { id: "user-aurora-emp-2", tenantId: "tenant-aurora", role: "employee", email: "sara@aurorabiotech.com", name: "Sara Malik", title: "Learning Designer", reportsTo: "amira@aurorabiotech.com", cylinderFocus: 4 },
  { id: "user-helio-emp-1", tenantId: "tenant-helio", role: "employee", email: "josh@heliomfg.com", name: "Josh Patel", title: "Production Lead", reportsTo: "lina@heliomfg.com", cylinderFocus: 2 },
];

export const assessments: AssessmentRecord[] = [
  {
    id: "assess-aurora-structure",
    tenantId: "tenant-aurora",
    type: "structure",
    createdAt: "2024-08-12T10:00:00.000Z",
    score: 0.72,
    summary: "Org flattened two layers in R&D; collaboration loops improved.",
    triadConfidence: 0.82,
  },
  {
    id: "assess-aurora-culture",
    tenantId: "tenant-aurora",
    type: "culture",
    createdAt: "2024-08-05T10:00:00.000Z",
    score: 0.68,
    summary: "Values alignment increasing yet belonging cues lag for new hires.",
    triadConfidence: 0.78,
  },
  {
    id: "assess-aurora-skills",
    tenantId: "tenant-aurora",
    type: "skills",
    createdAt: "2024-08-01T10:00:00.000Z",
    score: 0.61,
    summary: "Data science skills strong but bioinformatics depth shallow.",
    triadConfidence: 0.74,
  },
  {
    id: "assess-helio-engagement",
    tenantId: "tenant-helio",
    type: "engagement",
    createdAt: "2024-07-03T09:30:00.000Z",
    score: 0.58,
    summary: "Supervisors need coaching on recognition and clarity loops.",
    triadConfidence: 0.7,
  },
];

export const orgSnapshots: OrgSnapshotRecord[] = [
  {
    id: "snapshot-aurora-jul",
    tenantId: "tenant-aurora",
    createdAt: "2024-07-15T09:00:00.000Z",
    overallHealthScore: 0.64,
    trend: "up",
    highlights: ["Engagement +5% QoQ", "Game-based onboarding launched"],
  },
  {
    id: "snapshot-helio-jun",
    tenantId: "tenant-helio",
    createdAt: "2024-06-10T09:00:00.000Z",
    overallHealthScore: 0.59,
    trend: "steady",
    highlights: ["Lean experiments reducing scrap", "Supervisors in leadership lab"],
  },
];

export const actionModules: ActionModule[] = [
  {
    id: "module-hiring-scorecard",
    category: "Hiring",
    title: "Role Clarity Scorecard",
    description: "Codify outcomes, craft signals and align interview loops to Cylinder 3 mastery values.",
    triggerTags: ["structure", "talent", "values-cylinder-3"],
    effort: "medium",
  },
  {
    id: "module-onboarding-ritual",
    category: "Onboarding",
    title: "Narrative Onboarding Sprint",
    description: "90-minute immersion linking Cylinder 2 belonging stories to Cylinder 5 purpose narrative.",
    triggerTags: ["culture", "belonging", "values-cylinder-2"],
    effort: "low",
  },
  {
    id: "module-performance-clarity",
    category: "Performance",
    title: "Adaptive Goal Canvas",
    description: "Enable Cylinder 4 autonomy by wiring goal cadences with peer calibration.",
    triggerTags: ["performance", "autonomy", "values-cylinder-4"],
    effort: "medium",
  },
  {
    id: "module-rewards-kudos",
    category: "Rewards",
    title: "Peer Recognition Rituals",
    description: "Design lightweight kudos loops anchored in Cylinder 2 belonging.",
    triggerTags: ["recognition", "belonging", "values-cylinder-2"],
    effort: "low",
  },
  {
    id: "module-leadership-lab",
    category: "Leadership",
    title: "Architect Leadership Lab",
    description: "Twelve-week cohort guiding leaders through the seven-cylinder values architecture.",
    triggerTags: ["leadership", "values-cylinder-7", "values-cylinder-6"],
    effort: "high",
  },
  {
    id: "module-aar-sprint",
    category: "AfterActionReview",
    title: "After-Action Sprint",
    description: "Closed-loop ritual capturing insights, decisions and commitments after major plays.",
    triggerTags: ["performance", "evolution", "values-cylinder-6"],
    effort: "low",
  },
];

export const learningLibrary: LearningExperience[] = [
  {
    id: "learn-foundation-ops",
    title: "Stability Playbook",
    description: "Design operating guardrails that stabilize rapid scaling teams.",
    cylinder: 1,
    estimatedMinutes: 35,
    format: "course",
    tags: ["ops", "safety"],
  },
  {
    id: "learn-belonging-story",
    title: "Belonging Story Sprint",
    description: "Craft micro-stories that anchor team rituals in belonging values.",
    cylinder: 2,
    estimatedMinutes: 50,
    format: "ritual",
    tags: ["culture", "facilitation"],
  },
  {
    id: "learn-mastery-lab",
    title: "Mastery Ladder Lab",
    description: "Map apprenticeship ladders and calibrate growth loops for craft excellence.",
    cylinder: 3,
    estimatedMinutes: 70,
    format: "coaching",
    tags: ["skills", "craft"],
  },
  {
    id: "learn-autonomy-sim",
    title: "Autonomy Decision Sim",
    description: "Simulation balancing guardrails and decision rights across levels.",
    cylinder: 4,
    estimatedMinutes: 60,
    format: "simulation",
    tags: ["leadership", "ops"],
  },
  {
    id: "learn-purpose-map",
    title: "Purpose Mapping Canvas",
    description: "Tie team missions to societal impact signals and customer outcomes.",
    cylinder: 5,
    estimatedMinutes: 45,
    format: "course",
    tags: ["strategy", "purpose"],
  },
  {
    id: "learn-evolution-loop",
    title: "Evolution Loop Builder",
    description: "Implement double-loop learning routines for rapid adaptation.",
    cylinder: 6,
    estimatedMinutes: 55,
    format: "ritual",
    tags: ["learning", "continuous improvement"],
  },
  {
    id: "learn-stewardship-charter",
    title: "Stewardship Charter",
    description: "Codify legacy commitments and decision boundaries for long-term impact.",
    cylinder: 7,
    estimatedMinutes: 40,
    format: "coaching",
    tags: ["governance", "legacy"],
  },
];

export const employeeProgress: EmployeeProgress[] = [
  {
    employeeId: "user-aurora-emp-1",
    tenantId: "tenant-aurora",
    xp: 1280,
    streak: 6,
    assignments: [
      { moduleId: "learn-mastery-lab", status: "completed", progress: 1, nextAction: "Coach peers on lab outline" },
      { moduleId: "learn-evolution-loop", status: "in_progress", progress: 0.45, nextAction: "Run retro with new canvas" },
      { moduleId: "module-aar-sprint", status: "not_started", progress: 0, nextAction: "Schedule first AAR" },
    ],
  },
  {
    employeeId: "user-aurora-emp-2",
    tenantId: "tenant-aurora",
    xp: 860,
    streak: 3,
    assignments: [
      { moduleId: "learn-belonging-story", status: "in_progress", progress: 0.6, nextAction: "Test story in next standup" },
      { moduleId: "module-performance-clarity", status: "not_started", progress: 0, nextAction: "Review goal canvas" },
    ],
  },
];

export const pipelineAgents: PipelineAgentStatus[] = [
  { agent: "Agent D", owner: "Survey Analyst", description: "Synthesizes pulses and long-form feedback.", lastRun: "2024-08-12T09:00:00.000Z", status: "ready" },
  { agent: "Agent A", owner: "Coordinator", description: "Sequences cadences and orchestrates nudges.", lastRun: "2024-08-12T09:15:00.000Z", status: "running" },
  { agent: "Agent B", owner: "Psychology Expert", description: "Maps motivational levers to values cylinders.", lastRun: "2024-08-11T17:30:00.000Z", status: "ready" },
  { agent: "Agent C", owner: "Ethical Values Mapper", description: "Checks interventions against seven-cylinder ethics.", lastRun: "2024-08-11T18:00:00.000Z", status: "ready" },
  { agent: "Agent E", owner: "Training Designer", description: "Builds blended experiences from the library.", lastRun: "2024-08-11T18:30:00.000Z", status: "idle" },
  { agent: "Agent F", owner: "Game Developer", description: "Ships XP quests and mini-games.", lastRun: "2024-08-10T16:00:00.000Z", status: "idle" },
];

export const tenantSnapshots: TenantSnapshot[] = tenants.map((tenant) => ({
  tenantId: tenant.id,
  healthScore: orgSnapshots.find((s) => s.tenantId === tenant.id)?.overallHealthScore ?? 0.5,
  lastAnalysis: tenant.lastAnalysisAt,
}));

export const triggeredActions: TriggeredAction[] = [
  {
    triggerId: "trigger-aurora-skills-gap",
    moduleId: "learn-evolution-loop",
    tenantId: "tenant-aurora",
    reason: "Skills gaps detected",
    priority: "high",
    createdAt: "2024-08-01T11:00:00.000Z",
    status: "in-flight",
  },
  {
    triggerId: "trigger-helio-recognition",
    moduleId: "module-rewards-kudos",
    tenantId: "tenant-helio",
    reason: "Low recognition health",
    priority: "medium",
    createdAt: "2024-07-05T11:00:00.000Z",
    status: "planned",
  },
];
