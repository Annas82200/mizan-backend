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
  level: number;
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
  [key: number]: {
    enablingRatio: number;
    limitingRatio: number;
    score: number;
  };
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