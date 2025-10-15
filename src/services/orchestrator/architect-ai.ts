// server/services/orchestrator/architect-ai.ts

import { StructureAgentV2 } from '../agents/structure/structure-agent';
import { CultureAgentV2 } from '../agents/culture/culture-agent';
import { SkillsAgent } from '../agents/skills/skills-agent';
import { db } from '../../db/index';
import { companies, users, departments } from '../../db/schema';
import { eq } from 'drizzle-orm';

interface OrgChartData {
  employees?: Array<{
    id: string;
    name: string;
    title: string;
    department: string;
    reportsTo?: string | null;
  }>;
  departments?: Array<{
    id: string;
    name: string;
    headId?: string;
  }>;
}

interface EmployeeData {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  performanceScore?: number;
  skills?: string[];
}

interface PerformanceMetrics {
  averageScore?: number;
  topPerformers?: Array<{ id: string; score: number }>;
  lowPerformers?: Array<{ id: string; score: number }>;
  departmentAverages?: Record<string, number>;
}

export interface ArchitectAIInput {
  tenantId: string;
  companyId: string;
  userId: string;
  strategy?: string;
  orgChart?: OrgChartData;
  companyValues?: string[];
  employeeData?: EmployeeData[];
  performanceMetrics?: PerformanceMetrics;
}

interface StructureAnalysisResult {
  overallScore?: number;
  spanAnalysis?: Record<string, unknown>;
  layerAnalysis?: Record<string, unknown>;
  recommendations?: Array<{ title: string; description: string }>;
  healthScore?: number;
  hiringNeeds?: Array<{ role: string; urgency: string }>;
}

interface CultureAnalysisResult {
  overallScore?: number;
  valuesAlignment?: Record<string, unknown>;
  culturalHealth?: Record<string, unknown>;
  recommendations?: Array<{ title: string; description: string }>;
  alignmentScore?: number;
  culturalEntropy?: number;
  interventions?: Array<{ type: string; priority: string }>;
}

interface SkillsAnalysisResult {
  overallScore?: number;
  skillsGaps?: Array<{ skill: string; gap: number }>;
  recommendations?: Array<{ title: string; description: string }>;
  coverageScore?: number;
  criticalGaps?: Array<{ skill: string; severity: string }>;
  trainingNeeds?: Array<{ area: string; priority: string }>;
}

interface EngagementAnalysisResult {
  overallScore?: number;
  engagementFactors?: Record<string, unknown>;
  recommendations?: Array<{ title: string; description: string }>;
}

interface RecognitionAnalysisResult {
  overallScore?: number;
  recognitionPatterns?: Record<string, unknown>;
  recommendations?: Array<{ title: string; description: string }>;
}

interface PerformanceAnalysisResult {
  overallScore?: number;
  performanceDistribution?: Record<string, unknown>;
  recommendations?: Array<{ title: string; description: string }>;
}

interface BenchmarkingResult {
  industryComparison?: Record<string, unknown>;
  peerComparison?: Record<string, unknown>;
}

export interface ArchitectAIResult {
  overall_health_score: number;
  structure: StructureAnalysisResult;
  culture: CultureAnalysisResult;
  skills: SkillsAnalysisResult;
  engagement?: EngagementAnalysisResult;
  recognition?: RecognitionAnalysisResult;
  performance?: PerformanceAnalysisResult;
  benchmarking?: BenchmarkingResult;
  recommendations: string[];
  next_steps: string[];
  confidence: number;
}

export async function runArchitectAI(input: ArchitectAIInput): Promise<ArchitectAIResult> {
  console.log(`Running Architect AI for tenant ${input.tenantId}, company ${input.companyId}`);
  
  try {
    // Get company data if not provided
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, input.companyId)
    });
    
    if (!company) {
      throw new Error('Company not found');
    }
    
    // Initialize agents
    const agentConfig = {
      knowledge: { providers: ['anthropic' as const], model: 'claude-3-5-sonnet-20241022', temperature: 0.1, maxTokens: 4000 },
      data: { providers: ['openai' as const], model: 'gpt-4', temperature: 0.1, maxTokens: 4000 },
      reasoning: { providers: ['anthropic' as const], model: 'claude-3', temperature: 0.5, maxTokens: 4000 },
      consensusThreshold: 0.7
    };
    const structureAgent = new StructureAgentV2('structure', agentConfig);
    const cultureAgent = new CultureAgentV2('culture', agentConfig);
    const skillsAgent = new SkillsAgent();
    
    // Run analyses in parallel
    const [structureResult, cultureResult, skillsResult] = await Promise.allSettled([
      runStructureAnalysis(structureAgent, input),
      runCultureAnalysis(cultureAgent, input),
      runSkillsAnalysis(skillsAgent, input)
    ]);
    
    // Process results
    const structure = structureResult.status === 'fulfilled' ? structureResult.value : null;
    const culture = cultureResult.status === 'fulfilled' ? cultureResult.value : null;
    const skills = skillsResult.status === 'fulfilled' ? skillsResult.value : null;
    
    // Calculate overall health score
    const healthScores = [structure, culture, skills]
      .filter(result => result && result.healthScore !== undefined)
      .map(result => result.healthScore);
    
    const overall_health_score = healthScores.length > 0 
      ? healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length
      : 0;
    
    // Generate recommendations
    const recommendations = generateRecommendations(structure, culture, skills);
    const next_steps = generateNextSteps(structure, culture, skills);
    
    // Calculate confidence based on successful analyses
    const confidence = [structure, culture, skills].filter(r => r !== null).length / 3;
    
    const result: ArchitectAIResult = {
      overall_health_score,
      structure,
      culture,
      skills,
      recommendations,
      next_steps,
      confidence
    };
    
    console.log(`Architect AI completed with health score: ${overall_health_score}`);
    
    return result;
    
  } catch (error) {
    console.error('Architect AI failed:', error);
    throw error;
  }
}

async function runStructureAnalysis(agent: StructureAgentV2, input: ArchitectAIInput): Promise<any> {
  try {
    const analysisInput = {
      companyId: input.companyId,
      tenantId: input.tenantId,
      orgChart: input.orgChart || await getDefaultOrgChart(input.companyId),
      strategy: input.strategy
    };
    
    const result = await agent.analyzeStructure(analysisInput);
    
    return {
      healthScore: result.healthScore,
      structureType: result.structureType,
      isOptimal: result.isOptimalForStrategy,
      gaps: result.gaps,
      hiringNeeds: result.hiringNeeds,
      recommendations: result.recommendations
    };
  } catch (error) {
    console.error('Structure analysis failed:', error);
    return null;
  }
}

async function runCultureAnalysis(agent: CultureAgentV2, input: ArchitectAIInput): Promise<any> {
  try {
    const analysisInput = {
      tenantId: input.tenantId,
      companyId: input.companyId,
      companyValues: input.companyValues || [],
      strategy: input.strategy
    };

    const result = await agent.analyzeCulture(analysisInput);

    return {
      healthScore: result.strategyAlignmentScore / 100, // Normalize to 0-1
      alignmentScore: result.strategyAlignmentScore / 100,
      isHealthy: result.isHealthyForStrategy,
      culturalEntropy: result.entropyScore,
      focusCylinder: Object.keys(result.cylinderHealth)[0] || '',
      interventions: [...result.recommendations.immediate, ...result.recommendations.shortTerm],
      recommendations: [...result.recommendations.immediate, ...result.recommendations.shortTerm, ...result.recommendations.longTerm]
    };
  } catch (error) {
    console.error('Culture analysis failed:', error);
    return null;
  }
}

async function runSkillsAnalysis(agent: SkillsAgent, input: ArchitectAIInput): Promise<any> {
  try {
    // Get company data for industry and name
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, input.companyId)
    });

    const analysisInput = {
      tenantId: input.tenantId,
      companyId: input.companyId,
      industry: company?.industry || 'General',
      organizationName: company?.name || 'Organization',
      strategy: input.strategy,
      employeeData: (input.employeeData || []).map(emp => ({
        employeeId: emp.id,
        name: emp.name,
        department: emp.department,
        role: emp.role,
        skills: (emp.skills || []).map(skill => ({ 
          name: skill, 
          level: 'intermediate' as const,
          category: 'technical' as const
        })),
        experience: 0
      }))
    };

    const result = await agent.analyzeSkills(analysisInput);

    return {
      healthScore: result.skillsCoverage,
      coverageScore: result.skillsCoverage,
      hasRightSkills: result.skillsCoverage > 0.7,
      criticalGaps: result.criticalGaps,
      trainingNeeds: result.lxpTriggers || [],
      recommendations: result.recommendations.map(r => r.description)
    };
  } catch (error) {
    console.error('Skills analysis failed:', error);
    return null;
  }
}

async function getDefaultOrgChart(companyId: string): Promise<any> {
  // Note: companyId is actually the tenantId in our data model
  const tenantId = companyId;

  // Get departments for the tenant
  const departmentsList = await db.query.departments.findMany({
    where: eq(departments.tenantId, tenantId)
  });

  // Get users for the tenant
  const usersList = await db.query.users.findMany({
    where: eq(users.tenantId, tenantId)
  });

  // Count employees per department
  const deptEmployeeCounts = usersList.reduce((acc, user) => {
    if (user.departmentId) {
      acc[user.departmentId] = (acc[user.departmentId] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return {
    departments: departmentsList.map(dept => ({
      id: dept.id,
      name: dept.name,
      headCount: deptEmployeeCounts[dept.id] || 0,
      manager: dept.managerId
    })),
    reportingLines: [], // Would be populated from actual data
    roles: usersList.map(user => ({
      id: user.id,
      title: user.role,
      department: user.departmentId,
      level: 1 // Would be calculated from hierarchy
    }))
  };
}

function generateRecommendations(structure: StructureAnalysisResult, culture: CultureAnalysisResult, skills: SkillsAnalysisResult): string[] {
  const recommendations: string[] = [];
  
  if (structure) {
    if (structure.healthScore !== undefined && structure.healthScore < 0.7) {
      recommendations.push('Address structural gaps to improve organizational health');
    }
    if (structure.hiringNeeds && structure.hiringNeeds.length > 0) {
      recommendations.push('Prioritize hiring for critical positions');
    }
  }
  
  if (culture) {
    if (culture.alignmentScore !== undefined && culture.alignmentScore < 0.6) {
      recommendations.push('Improve culture-strategy alignment through targeted interventions');
    }
    if (culture.culturalEntropy !== undefined && culture.culturalEntropy > 0.3) {
      recommendations.push('Reduce cultural entropy by clarifying values and expectations');
    }
  }
  
  if (skills) {
    if (skills.coverageScore !== undefined && skills.coverageScore < 0.8) {
      recommendations.push('Address critical skill gaps through training and hiring');
    }
    if (skills.criticalGaps && skills.criticalGaps.length > 0) {
      recommendations.push('Develop training programs for critical skill gaps');
    }
  }
  
  return recommendations;
}

function generateNextSteps(structure: StructureAnalysisResult, culture: CultureAnalysisResult, skills: SkillsAnalysisResult): string[] {
  const nextSteps: string[] = [];
  
  // Always include basic next steps
  nextSteps.push('Review detailed analysis reports');
  nextSteps.push('Schedule leadership alignment meeting');
  
  if (structure?.hiringNeeds && structure.hiringNeeds.length > 0) {
    nextSteps.push('Initiate hiring process for critical positions');
  }
  
  if (culture?.interventions && culture.interventions.length > 0) {
    nextSteps.push('Plan culture intervention implementation');
  }
  
  if (skills?.trainingNeeds && skills.trainingNeeds.length > 0) {
    nextSteps.push('Design and launch training programs');
  }
  
  return nextSteps;
}