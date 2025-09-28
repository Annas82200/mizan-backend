import { randomUUID } from "node:crypto";
import {
  ActionModule,
  AssessmentRecord,
  EmployeeProgress,
  LearningExperience,
  OrgSnapshotRecord,
  PipelineAgentStatus,
  Tenant,
  TenantFeatureToggles,
  TenantSnapshot,
  TriggeredAction,
  User,
} from "@mizan/shared/schema";
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
    aiProviders: {
      knowledge: [...input.aiProviders.knowledge],
      data: [...input.aiProviders.data],
      reasoning: [...input.aiProviders.reasoning],
    },
    features: { ...input.features },
    integrations: { ...input.integrations, hris: [...input.integrations.hris] },
    valuesFramework: input.valuesFramework.map((cylinder) => ({
      ...cylinder,
      enablingValues: cylinder.enablingValues.map((value) => ({ ...value })),
      limitingValues: cylinder.limitingValues.map((value) => ({ ...value })),
    })),
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
  assignments: item.assignments.map((assignment) => ({ ...assignment })),
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
  tenant.features = { ...tenant.features, ...patch } as TenantFeatureToggles;
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
    snapshotSummary.push({ tenantId: snapshot.tenantId, healthScore: snapshot.overallHealthScore, lastAnalysis: snapshot.createdAt });
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
      assignments: progress.assignments.map((assignment) => ({ ...assignment })),
    }));
}

export function upsertEmployeeProgress(record: EmployeeProgress): void {
  const index = employeeProgressStore.findIndex((progress) => progress.employeeId === record.employeeId && progress.tenantId === record.tenantId);
  if (index >= 0) {
    employeeProgressStore[index] = {
      ...record,
      assignments: record.assignments.map((assignment) => ({ ...assignment })),
    };
  } else {
    employeeProgressStore.push({
      ...record,
      assignments: record.assignments.map((assignment) => ({ ...assignment })),
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
