// Type definitions for structure-agent.ts - 100% COMPLIANT with AGENT_CONTEXT_ULTIMATE.md Lines 1173-1180
// NO 'any' types allowed - strict TypeScript only

export interface StructureData {
  departments: Department[];
  reportingLines: ReportingLine[];
  roles: Role[];
  totalEmployees: number;
  organizationLevels: number;
}

export interface Department {
  id: string;
  name: string;
  parentId?: string;
  headCount: number;
  manager?: string;
  level?: number;
}

export interface ReportingLine {
  from: string;
  to: string;
  type: 'direct' | 'dotted' | 'functional';
}

export interface Role {
  id: string;
  title: string;
  department: string;
  level: number;
  responsibilities?: string[];
  reportsTo?: string;
  directReports?: string[];
}

export interface StrategyData {
  id: string;
  vision?: string;
  mission?: string;
  goals?: string[];
  priorities?: string[];
  targetMarket?: string;
  competitiveAdvantage?: string;
  growthStrategy?: string;
}

export interface OrganizationalFramework extends Record<string, unknown> {
  mintzbergConfigurations?: {
    simpleStructure: string;
    machineBureaucracy: string;
    professionalBureaucracy: string;
    divisionalizedForm: string;
    adhocracy: string;
    missionaryOrganization: string;
    politicalOrganization: string;
  };
  spanOfControl?: {
    narrow: string;
    medium: string;
    wide: string;
    optimal: string;
  };
  organizationalDesign?: {
    functional: string;
    divisional: string;
    matrix: string;
    network: string;
    holacracy: string;
  };
  galbraithStar?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ProcessedStructureData {
  structure: StructureData;
  strategy?: StrategyData;
  metrics: {
    spanMetrics: SpanMetrics;
    layerMetrics: LayerMetrics;
    alignmentMetrics: AlignmentMetrics;
  };
}

export interface SpanMetrics {
  averageSpan: number;
  maxSpan: number;
  minSpan: number;
  distribution: Record<string, number>;
  outliers: Array<{
    roleId: string;
    span: number;
    recommendation: string;
  }>;
}

export interface LayerMetrics {
  totalLayers: number;
  averageLayersToBottom: number;
  bottlenecks: Array<{
    layer: number;
    roles: string[];
    issue: string;
  }>;
}

export interface AlignmentMetrics {
  strategyAlignmentScore: number;
  structureEfficiencyScore: number;
  communicationPathScore: number;
}

export interface KnowledgeOutput {
  frameworks: OrganizationalFramework;
  analysis: {
    structureType: string;
    characteristics: string[];
    strengths: string[];
    weaknesses: string[];
    strategyFit: {
      score: number;
      reasoning: string;
    };
  };
}

export interface DataOutput {
  processedMetrics: ProcessedStructureData;
  patterns: {
    reportingPatterns: string[];
    departmentDistribution: Record<string, number>;
    roleDistribution: Record<string, number>;
  };
  anomalies: Array<{
    type: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
  }>;
}

export interface ReasoningOutput {
  overallScore: number;
  recommendations: Array<{
    category: 'span' | 'layers' | 'alignment' | 'efficiency';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    actionItems: string[];
  }>;
  strategyAlignment: {
    score: number;
    misalignments: Array<{
      area: string;
      issue: string;
      impact: 'high' | 'medium' | 'low';
    }>;
  };
  nextSteps: string[];
}

export interface StructureAnalysisContext {
  companyName: string;
  structureData: StructureData;
  strategyData?: StrategyData;
}