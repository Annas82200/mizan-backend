/**
 * Type definitions for entry.ts - 100% COMPLIANT with AGENT_CONTEXT_ULTIMATE.md
 * Lines 1173-1180: STRICT TypeScript types (NO 'any')
 * Production-ready types only
 */

// Employee Response Interface
export interface EmployeeResponse {
  employeeId: string;
  name: string;
  personalValues: string[];
  currentExperience: string[];
  desiredExperience: string[];
  engagement: number;
  recognition: number;
  tenantId: string;
  departmentId?: string;
}

// Processed Response Interface
export interface ProcessedResponse {
  employeeId: string;
  name: string;
  alignment: number;
  entropy: number;
  engagement: number;
  recognition: number;
  gaps: string[];
}

// Department Data Interface
export interface DepartmentData {
  id: string;
  name: string;
  employeeCount: number;
  managerName?: string;
  budget?: number;
  performance?: number;
  culture?: {
    alignment: number;
    entropy: number;
  };
}

// Department Analysis Interface
export interface DepartmentAnalysis {
  department: string;
  employeeCount: number;
  averageScore?: number;
  topSkills?: string[];
  criticalGaps?: string[];
}

// Department Performance Interface
export interface DepartmentPerformance {
  department: string;
  averageRating?: number;
  goalCompletion?: number;
  teamEfficiency?: number;
}

// Role Interface
export interface Role {
  title: string;
  department?: string;
  level?: string;
}

// Framework Cylinder Interface
export interface FrameworkCylinder {
  name: string;
  level: number;
  ethicalPrinciple: string;
  positiveValues: Array<{
    name: string;
    description?: string;
  }>;
  limitingValues: Array<{
    name: string;
    description?: string;
  }>;
}

// Cylinder Scores Interface
export interface CylinderScores {
  [key: string]: number;
}

// Employee Report Interface
export interface EmployeeReport {
  employeeId: number;
  name: string;
  personalValues: string[];
  currentExperience: string[];
  desiredExperience: string[];
  alignment: number;
  entropy: number;
  cylinderScores: CylinderScores;
  recommendations: string[];
  engagement: number;
  recognition: number;
}

// Culture Analysis Functions Parameter Types
export interface CultureAnalysisParams {
  responses: EmployeeResponse[];
  framework: FrameworkCylinder[];
  companyValues?: string[];
}

// Department Breakdown Interface
export interface DepartmentBreakdown {
  name: string;
  alignment: number;
  entropy: number;
  employeeCount: number;
}

// Helper Function Return Types
export interface FrameworkMapping {
  cylinderName: string;
  matchingValues: string[];
  score: number;
}

export interface PersonalityInsights {
  primaryCylinder: CylinderAffinity;
  secondaryCylinder: CylinderAffinity;
  insights: string[];
}

export interface CylinderAffinity {
  name: string;
  ethicalPrinciple: string;
  affinity: number;
  matchingValues: string[];
}

export interface AggregatedResponses {
  topValues: string[];
  valueCounts: Record<string, number>;
}

export interface DepartmentCultureAnalysis {
  departments: unknown[];
  crossDepartmentAlignment: number;
  culturalConsistency: number;
}

export interface OrganizationalEntropyAnalysis {
  overallEntropy: number;
  entropyByDepartment: Record<string, number>;
  trends: string;
  level?: string;
  risks?: string[];
}

export interface CultureStrategyAlignment {
  visionAlignment: number;
  missionAlignment: number;
  strategicConsistency: number;
}

export interface CultureActionItem {
  priority: string;
  action: string;
  timeline: string;
}

export interface AdminReport {
  organizationalOverview: {
    totalResponses: number;
    responseRate: string;
    analysisCompleteness: string;
  };
  valuesAlignment: {
    companyValues: string[];
    employeeValues: string[];
    alignmentScore: number;
    gaps: string[];
  };
  cultureHealth: {
    overallHealth: number;
    cylinderHealth: Record<string, unknown>;
    entropyLevel: string;
    riskAreas: string[];
  };
  strategyAlignment: {
    cultureSupportsStrategy: CultureStrategyAlignment;
    alignmentScore: number;
    recommendations: string[];
  };
  departmentAnalysis: DepartmentCultureAnalysis;
  actionItems: CultureActionItem[];
}

export interface PersonalValuesAnalysis {
  selectedValues: string[];
  frameworkMapping: FrameworkMapping[];
  personalityInsights: PersonalityInsights;
}

export interface CultureAlignmentAnalysis {
  currentVsPersonal: number;
  desiredVsPersonal: number;
  currentVsDesired: number;
  recommendations: string[];
}

export interface RecognitionAnalysis {
  score: number;
  benchmarkComparison: string;
  recommendations: string[];
}

export interface EngagementAnalysis {
  score: number;
  benchmarkComparison: string;
  recommendations: string[];
}

export interface EmployeeReportDetailed {
  employeeId: string;
  personalValuesAnalysis: PersonalValuesAnalysis;
  cultureAlignment: CultureAlignmentAnalysis;
  recognitionAnalysis: RecognitionAnalysis;
  engagementAnalysis: EngagementAnalysis;
}

// Analysis Result Types for Client Endpoints
export interface CultureAnalysisResult {
  success: boolean;
  analysisId: string;
  clientId: string;
  analysisType: 'culture';
  scores: {
    alignment: number;
    engagement: number;
    satisfaction: number;
    recognition: number;
  };
  insights: string[];
  recommendations: string[];
  generatedAt: string;
}

export interface StructureAnalysisResult {
  success: boolean;
  analysisId: string;
  clientId: string;
  analysisType: 'structure';
  efficiency: number;
  insights: string[];
  recommendations: string[];
  generatedAt: string;
}

export interface SkillsAnalysisResult {
  success: boolean;
  analysisId: string;
  clientId: string;
  analysisType: 'skills';
  gaps: Array<{
    skill: string;
    gap: string;
    priority: string;
    affectedEmployees: number;
  }>;
  insights: string[];
  recommendations: string[];
  generatedAt: string;
}

export type AnalysisResults = {
  culture: CultureAnalysisResult;
  structure: StructureAnalysisResult;
  skills: SkillsAnalysisResult;
};