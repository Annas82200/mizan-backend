import { randomUUID } from "node:crypto";
// Type definitions for data store - COMPLIANT with AGENT_CONTEXT_ULTIMATE.md Lines 1173-1180
interface Tenant {
  id: string;
  name: string;
  plan: string;
  status: 'active' | 'inactive' | 'suspended' | 'trial';
  createdAt: Date | string;
  updatedAt?: Date | string;
  aiProviders?: Record<string, { enabled: boolean; apiKey?: string; }> | Record<string, string[]>;
  features?: Record<string, boolean>;
  integrations?: Record<string, unknown>;
  valuesFramework?: Record<string, unknown> | Array<{
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
  assignments: unknown[];
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
interface TenantFeatureToggles {
  [key: string]: boolean;
  cultureAnalysis: boolean;
  structureAnalysis: boolean;
  skillsAnalysis: boolean;
  performanceModule: boolean;
  hiringModule: boolean;
  lxpModule: boolean;
  talentModule: boolean;
  bonusModule: boolean;
}
import {
  actionModules as actionModuleSeed,
  assessments as assessmentSeed,
  employeeProgress as employeeProgressSeed,
  learningLibrary,
  orgSnapshots as snapshotSeed,
  pipelineAgents as pipelineSeed,
  tenants as tenantSeed,
  tenantSnapshots as snapshotSummarySeed,
  triggeredActions as triggeredSeed,
  users as userSeed,
} from "./seed.js";

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

function cloneTenant(input: Tenant): Tenant {
  return {
    ...input,
    aiProviders: input.aiProviders ? { ...input.aiProviders } : undefined,
    features: input.features ? { ...input.features } : undefined,
    integrations: input.integrations ? { ...input.integrations } : undefined,
    valuesFramework: input.valuesFramework ? { ...input.valuesFramework } : undefined,
  };
}

const tenantStore: Tenant[] = tenantSeed.map(cloneTenant);
const assessmentStore: AssessmentRecord[] = assessmentSeed.map((item) => ({ ...item }));
const snapshotStore: OrgSnapshotRecord[] = snapshotSeed.map((item) => ({ ...item }));
const snapshotSummary: TenantSnapshot[] = snapshotSummarySeed.map((item) => ({ ...item }));
const actionModuleStore: ActionModule[] = actionModuleSeed.map((item) => ({ ...item, triggerTags: [...item.triggerTags] }));
const triggeredStore: TriggeredAction[] = triggeredSeed.map((item) => ({ ...item }));
const employeeProgressStore: EmployeeProgress[] = employeeProgressSeed.map((item) => ({
  ...item,
  assignments: item.assignments.map((assignment: any) => ({ ...assignment })),
}));
const pipelineStore: PipelineAgentStatus[] = pipelineSeed.map((item) => ({ ...item }));
const userStore: User[] = userSeed.map((item) => ({ ...item }));
const learningStore: LearningExperience[] = learningLibrary.map((item) => ({ ...item, tags: [...item.tags] }));

export function listTenants(): Tenant[] {
  return tenantStore.map(cloneTenant);
}

export function getTenant(tenantId: string): Tenant | undefined {
  const found = tenantStore.find((t) => t.id === tenantId);
  return found ? cloneTenant(found) : undefined;
}

export function updateTenantFeatures(tenantId: string, patch: DeepPartial<TenantFeatureToggles>): Tenant | undefined {
  const tenant = tenantStore.find((t) => t.id === tenantId);
  if (!tenant) return undefined;
  tenant.features = { ...tenant.features, ...patch } as Record<string, boolean>;
  return cloneTenant(tenant);
}

export function listUsersByTenant(tenantId: string, roles?: User["role"][]): User[] {
  return userStore
    .filter((user) => user.tenantId === tenantId && (!roles || roles.includes(user.role)))
    .map((user) => ({ ...user }));
}

export function listAdmins(): User[] {
  return userStore.filter((user) => user.role === "clientAdmin").map((user) => ({ ...user }));
}

export function listSuperAdmins(): User[] {
  return userStore.filter((user) => user.role === "superadmin").map((user) => ({ ...user }));
}

export function listAssessments(tenantId: string): AssessmentRecord[] {
  return assessmentStore.filter((assessment) => assessment.tenantId === tenantId).map((assessment) => ({ ...assessment }));
}

export function addAssessment(record: AssessmentRecord): void {
  assessmentStore.push({ ...record });
}

export function listSnapshots(tenantId: string): OrgSnapshotRecord[] {
  return snapshotStore.filter((snapshot) => snapshot.tenantId === tenantId).map((snapshot) => ({ ...snapshot }));
}

export function addSnapshot(snapshot: OrgSnapshotRecord): void {
  snapshotStore.push({ ...snapshot });
  const summary = snapshotSummary.find((item) => item.tenantId === snapshot.tenantId);
  if (summary) {
    summary.healthScore = snapshot.overallHealthScore;
    summary.lastAnalysis = snapshot.createdAt;
  } else {
    snapshotSummary.push({
      id: randomUUID(),
      tenantId: snapshot.tenantId,
      data: snapshot.data || {},
      healthScore: snapshot.overallHealthScore,
      lastAnalysis: snapshot.createdAt
    });
  }
}

export function listActionModules(): ActionModule[] {
  return actionModuleStore.map((module) => ({ ...module, triggerTags: [...module.triggerTags] }));
}

export function listTriggeredActions(tenantId?: string): TriggeredAction[] {
  return triggeredStore
    .filter((item) => !tenantId || item.tenantId === tenantId)
    .map((item) => ({ ...item }));
}

export function addTriggeredAction(trigger: TriggeredAction): void {
  triggeredStore.push({ ...trigger });
}

export function listEmployeeProgress(tenantId: string): EmployeeProgress[] {
  return employeeProgressStore
    .filter((progress) => progress.tenantId === tenantId)
    .map((progress) => ({
      ...progress,
      assignments: progress.assignments ? progress.assignments.map((assignment: any) => ({ ...assignment })) : [],
    }));
}

export function upsertEmployeeProgress(record: EmployeeProgress): void {
  const index = employeeProgressStore.findIndex((progress) => progress.employeeId === record.employeeId && progress.tenantId === record.tenantId);
  if (index >= 0) {
    employeeProgressStore[index] = {
      ...record,
      assignments: record.assignments ? record.assignments.map((assignment: any) => ({ ...assignment })) : [],
    };
  } else {
    employeeProgressStore.push({
      ...record,
      assignments: record.assignments ? record.assignments.map((assignment: any) => ({ ...assignment })) : [],
    });
  }
}

export function listPipelineAgents(): PipelineAgentStatus[] {
  return pipelineStore.map((agent) => ({ ...agent }));
}

export function listTenantSnapshots(): TenantSnapshot[] {
  return snapshotSummary.map((snapshot) => ({ ...snapshot }));
}

export function listLearningExperiences(): LearningExperience[] {
  return learningStore.map((experience) => ({ ...experience, tags: [...experience.tags] }));
}

export function generateId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

export function listUsers(): User[] {
  return userStore.map((user) => ({ ...user }));
}

export function getUser(userId: string): User | undefined {
  const found = userStore.find((user) => user.id === userId);
  return found ? { ...found } : undefined;
}
