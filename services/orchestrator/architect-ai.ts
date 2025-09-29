// server/services/orchestrator/architect-ai.ts

import { StructureAgentV2 } from '../agents/structure/structure-agent.js';
import { CultureAgentV2 } from '../agents/base/three-engine-agent.js';
import { SkillsAgentV2 } from '../agents/base/three-engine-agent.js';
import { db } from '../../db/index.js';
import { companies, users } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export interface ArchitectAIInput {
  tenantId: string;
  companyId: string;
  userId: string;
  strategy?: string;
  orgChart?: any;
  companyValues?: string[];
  employeeData?: any[];
  performanceMetrics?: any;
}

export interface ArchitectAIResult {
  overall_health_score: number;
  structure: any;
  culture: any;
  skills: any;
  engagement?: any;
  recognition?: any;
  performance?: any;
  benchmarking?: any;
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
    const structureAgent = new StructureAgentV2(input.tenantId);
    const cultureAgent = new CultureAgentV2(input.tenantId);
    const skillsAgent = new SkillsAgentV2(input.tenantId);
    
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
      companyId: input.companyId,
      tenantId: input.tenantId,
      companyValues: input.companyValues || [],
      strategy: input.strategy,
      employeeAssessments: input.employeeData || []
    };
    
    const result = await agent.analyzeCulture(analysisInput);
    
    return {
      alignmentScore: result.analysis?.alignmentScore || 0,
      isHealthy: result.analysis?.isHealthyForStrategy || false,
      culturalEntropy: result.analysis?.culturalEntropy || 0,
      focusCylinder: result.analysis?.focusCylinder || '',
      interventions: result.analysis?.interventions || [],
      recommendations: result.analysis?.recommendations || []
    };
  } catch (error) {
    console.error('Culture analysis failed:', error);
    return null;
  }
}

async function runSkillsAnalysis(agent: SkillsAgentV2, input: ArchitectAIInput): Promise<any> {
  try {
    const analysisInput = {
      companyId: input.companyId,
      tenantId: input.tenantId,
      strategy: input.strategy,
      employees: input.employeeData || []
    };
    
    const result = await agent.analyzeSkills(analysisInput);
    
    return {
      coverageScore: result.analysis?.skillCoverage || 0,
      hasRightSkills: result.analysis?.hasRightSkillsForStrategy || false,
      criticalGaps: result.analysis?.criticalGaps || [],
      trainingNeeds: result.analysis?.trainingNeeds || [],
      recommendations: result.analysis?.recommendations || []
    };
  } catch (error) {
    console.error('Skills analysis failed:', error);
    return null;
  }
}

async function getDefaultOrgChart(companyId: string): Promise<any> {
  // Get departments and users for the company
  const departments = await db.query.departments.findMany({
    where: eq('companyId', companyId),
    with: {
      employees: true
    }
  });
  
  const users = await db.query.users.findMany({
    where: eq('companyId', companyId)
  });
  
  return {
    departments: departments.map(dept => ({
      id: dept.id,
      name: dept.name,
      headCount: dept.employees.length,
      manager: dept.managerId
    })),
    reportingLines: [], // Would be populated from actual data
    roles: users.map(user => ({
      id: user.id,
      title: user.role,
      department: user.departmentId,
      level: 1 // Would be calculated from hierarchy
    }))
  };
}

function generateRecommendations(structure: any, culture: any, skills: any): string[] {
  const recommendations: string[] = [];
  
  if (structure) {
    if (structure.healthScore < 0.7) {
      recommendations.push('Address structural gaps to improve organizational health');
    }
    if (structure.hiringNeeds?.length > 0) {
      recommendations.push('Prioritize hiring for critical positions');
    }
  }
  
  if (culture) {
    if (culture.alignmentScore < 0.6) {
      recommendations.push('Improve culture-strategy alignment through targeted interventions');
    }
    if (culture.culturalEntropy > 0.3) {
      recommendations.push('Reduce cultural entropy by clarifying values and expectations');
    }
  }
  
  if (skills) {
    if (skills.coverageScore < 0.8) {
      recommendations.push('Address critical skill gaps through training and hiring');
    }
    if (skills.criticalGaps?.length > 0) {
      recommendations.push('Develop training programs for critical skill gaps');
    }
  }
  
  return recommendations;
}

function generateNextSteps(structure: any, culture: any, skills: any): string[] {
  const nextSteps: string[] = [];
  
  // Always include basic next steps
  nextSteps.push('Review detailed analysis reports');
  nextSteps.push('Schedule leadership alignment meeting');
  
  if (structure?.hiringNeeds?.length > 0) {
    nextSteps.push('Initiate hiring process for critical positions');
  }
  
  if (culture?.interventions?.length > 0) {
    nextSteps.push('Plan culture intervention implementation');
  }
  
  if (skills?.trainingNeeds?.length > 0) {
    nextSteps.push('Design and launch training programs');
  }
  
  return nextSteps;
}