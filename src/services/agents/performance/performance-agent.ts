import { z } from 'zod';
import { db } from '../../../db/index';
import { performanceCycles, performanceGoals, performanceReviews, performanceMetrics, performanceFeedback, performanceImprovementPlans, performanceAnalytics, oneOnOneMeetings, users, departments } from '../../../db/schema';
import { KnowledgeEngine } from '../../../ai/engines/KnowledgeEngine';
import { DataEngine } from '../../../ai/engines/DataEngine';
import { ReasoningEngine } from '../../../ai/engines/ReasoningEngine';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { cultureAgent, CultureAnalysisInput, CultureAnalysisOutput } from '../culture/culture-agent';
import { skillsAgent, SkillsAnalysisInput, SkillsAnalysisResult, SkillCategoryAnalysis } from '../skills/skills-agent';

// Zod schemas for validation, derived from db/schema/performance.ts and AGENT_CONTEXT_ULTIMATE.md
// This ensures type safety and compliance.

export const PerformanceAnalysisInputSchema = z.object({
  tenantId: z.string().uuid(),
  clientStrategy: z.object({
    vision: z.string().optional(),
    mission: z.string().optional(),
    strategy: z.string().optional(),
    values: z.array(z.string()).optional(),
  }),
  clientContext: z.object({
    industry: z.string(),
    size: z.string(),
    marketPosition: z.string().optional(),
  }),
  departmentStructure: z.array(z.object({
      id: z.string(),
      name: z.string(),
      parentId: z.string().optional(),
      headCount: z.number(),
      manager: z.string().optional()
  })).optional(),
  individualGoalsCSV: z.string().optional(), // Assuming CSV content as a string for now
});

export type PerformanceAnalysisInput = z.infer<typeof PerformanceAnalysisInputSchema>;

interface Recommendation {
    category: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    actionItems: string[];
}

interface Insights {
    strategicAlignment: number;
    organizationalReadiness: string;
    keyRisks: string[];
    opportunities: string[];
}

export interface PerformanceAnalysisOutput {
  cycleId: string;
  recommendations: Recommendation[];
  insights: Insights;
}

interface PerformanceAnalysisResult {
    confidence: number;
    summary: string;
    // ... other expected properties from reasoning engine
}


class PerformanceAgent {
    private knowledgeEngine: KnowledgeEngine;
    private dataEngine: DataEngine;
    private reasoningEngine: ReasoningEngine;
    private cultureAgent: CultureAgent;
    private skillsAgent: SkillsAgent;

    constructor() {
        this.knowledgeEngine = new KnowledgeEngine();
        this.dataEngine = new DataEngine();
        this.reasoningEngine = new ReasoningEngine();
        this.cultureAgent = cultureAgent;
        this.skillsAgent = skillsAgent;
    }

    public async processPerformanceCycle(input: PerformanceAnalysisInput): Promise<PerformanceAnalysisOutput> {
        const validatedInput = PerformanceAnalysisInputSchema.parse(input);
        const { tenantId, clientStrategy, clientContext, departmentStructure, individualGoalsCSV } = validatedInput;

        const cycleId = randomUUID();

        // Step 1: Strategic Analysis & Understanding
        const context = await this.knowledgeEngine.getContext('performance');
        const industryStandards = await this.knowledgeEngine.getIndustryContext(clientContext.industry);

        // Step 2: Goal Decomposition & Setting (using Data Engine)
        const processedData = await this.dataEngine.process({
            strategy: clientStrategy,
            departmentStructure: departmentStructure,
            individualGoalsCSV: individualGoalsCSV,
            marketPosition: clientContext.marketPosition
        }, context);

        // Step 3: Cross-Module Integration (REAL IMPLEMENTATION)
        const culturePriorities = await this.getCulturePriorities(tenantId, clientStrategy.values || []);
        const skillsGaps = await this.getSkillsGaps(tenantId, clientContext.industry, clientStrategy.strategy);

        // Step 4-9: Generate complete performance workflow using Reasoning Engine
        const analysisResult: PerformanceAnalysisResult = await this.reasoningEngine.analyze(processedData, {
            ...context,
            industryBenchmarks: industryStandards,
            cultureGoals: culturePriorities,
            skillsGaps: skillsGaps.criticalGaps
        });
        
        const cycle = await this.createPerformanceCycle(cycleId, tenantId, clientStrategy, culturePriorities, skillsGaps);

        // TODO: Persist departmental and individual goals based on analysisResult
        await this.generateAndPersistGoals(cycleId, tenantId, analysisResult, departmentStructure || [], culturePriorities, skillsGaps);


        const recommendations = this.generateRecommendations(analysisResult);
        const insights = this.generateInsights(analysisResult);

        return {
            cycleId: cycle.id,
            recommendations,
            insights,
        };
    }

    private async createPerformanceCycle(cycleId: string, tenantId: string, clientStrategy: PerformanceAnalysisInput['clientStrategy'], culturePriorities: CultureAnalysisOutput, skillsGaps: SkillsAnalysisResult) {
        const [cycle] = await db.insert(performanceCycles).values({
            id: cycleId,
            tenantId,
            name: `Performance Cycle - ${new Date().toISOString().split('T')[0]}`,
            description: 'Automated performance cycle created by Mizan AI',
            cycleType: 'quarterly',
            fiscalYear: new Date().getFullYear(),
            startDate: new Date(),
            endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
            status: 'active',
            objectives: clientStrategy,
            priorities: culturePriorities,
            skillsNeeded: skillsGaps.criticalGaps.map(g => g.skill),
            createdBy: 'system', // or a user id
            updatedBy: 'system',
        }).returning();
        return cycle;
    }

    private async getCulturePriorities(tenantId: string, companyValues: string[]): Promise<CultureAnalysisOutput> {
        try {
            const cultureInput: CultureAnalysisInput = {
                tenantId,
                companyId: tenantId, // Assuming tenantId can stand in for companyId for now
                companyValues,
            };
            const cultureAnalysis: CultureAnalysisOutput = await this.cultureAgent.analyzeCulture(cultureInput);
            // Extract and return high-priority recommendations or goals from the analysis
            return cultureAnalysis;
        } catch (error) {
            console.error('Error getting culture priorities:', error);
            return { recommendations: { immediate: [] } } as any; // Return a default structure
        }
    }

    private async getSkillsGaps(tenantId: string, industry: string, strategy?: string): Promise<SkillsAnalysisResult> {
         try {
            const skillsInput: SkillsAnalysisInput = {
                tenantId,
                companyId: tenantId,
                industry,
                organizationName: '', // This might be needed from tenant data
                strategy: strategy,
            };
            const skillsAnalysis = await this.skillsAgent.analyzeSkills(skillsInput);
            return skillsAnalysis;
        } catch (error) {
            console.error('Error getting skills gaps:', error);
            // Return a default/empty result that matches the type
            const defaultSkillCategory: SkillCategoryAnalysis = {
                score: 0,
                coverage: 0,
                criticalGaps: 0,
                skills: []
            };
            return {
                overallScore: 0,
                strategicAlignment: 0,
                skillsCoverage: 0,
                criticalGaps: [],
                skillCategories: { 
                    technical: defaultSkillCategory,
                    leadership: defaultSkillCategory,
                    communication: defaultSkillCategory,
                    analytical: defaultSkillCategory,
                    soft: defaultSkillCategory 
                },
                gapAnalysis: {
                    overallGapScore: 0,
                    criticalSkillsGapCount: 0,
                    topGaps: [],
                    trainingPriority: 'low'
                },
                emergingSkills: [],
                marketAlignment: {
                    demandMatch: 0,
                    futureReadiness: {
                        currentReadiness: 0,
                        readinessGap: 0,
                        timeToReadiness: "N/A"
                    }
                },
                recommendations: [],
            };
        }
    }

    private generateRecommendations(analysisResult: PerformanceAnalysisResult): Recommendation[] {
        // Migrated and refactored logic from PerformanceModule
        const recommendations: Recommendation[] = [];
    
        recommendations.push({
          category: 'Goal Setting',
          priority: 'critical' as const,
          title: 'Cascade Strategic Goals',
          description: 'Ensure all individual goals align with departmental and organizational strategy',
          actionItems: [
            'Review strategic objectives with all department heads',
            'Conduct goal-setting workshops with managers',
            'Implement SMART goal criteria for all objectives',
            'Establish clear success metrics and KPIs'
          ]
        });
        
        recommendations.push({
          category: 'Performance Management',
          priority: 'high' as const,
          title: 'Implement Quarterly Check-ins',
          description: 'Regular performance conversations improve outcomes and engagement',
          actionItems: [
            'Schedule quarterly 1:1 meetings between employees and managers',
            'Create performance discussion templates',
            'Train managers on effective feedback delivery',
            'Document progress and development needs'
          ]
        });
        
        return recommendations;
    }

    private generateInsights(analysisResult: PerformanceAnalysisResult): Insights {
        // Migrated and refactored logic from PerformanceModule
        return {
          strategicAlignment: analysisResult.confidence || 0.75,
          organizationalReadiness: analysisResult.summary || 'Strategy definition needed for effective goal cascading',
          keyRisks: [
            'Potential goal misalignment between departments',
            'Limited performance management maturity',
            'Need for manager training on performance conversations'
          ],
          opportunities: [
            'Implement data-driven performance insights',
            'Leverage performance data for talent decisions',
            'Create performance-based development paths'
          ]
        };
    }

    private async generateAndPersistGoals(cycleId: string, tenantId: string, analysisResult: PerformanceAnalysisResult, departmentStructure: any[], culturePriorities: CultureAnalysisOutput, skillsGaps: SkillsAnalysisResult) {
        // Departmental Goals
        if (departmentStructure) {
            for (const dept of departmentStructure) {
                const deptGoals = this.createDepartmentGoals(dept, analysisResult);
                for (const goal of deptGoals) {
                    await db.insert(performanceGoals).values({
                        id: randomUUID(),
                        tenantId,
                        // departmentId: dept.id, // Need to add departmentId to performanceGoals schema or link differently
                        title: goal.description,
                        description: goal.description,
                        type: 'team',
                        category: goal.type === 'culture' ? 'leadership' : 'operational_excellence', // Example mapping
                        goalFormat: 'okr',
                        target: { value: goal.targetValue },
                        weight: goal.weight.toString(),
                        status: 'active',
                        startDate: new Date(),
                        targetDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
                        createdBy: 'system',
                        updatedBy: 'system',
                        employeeId: 'system', // Placeholder, goals are for department
                        managerId: 'system', // Placeholder
                    });
                }
            }
        }

        // Individual Goals - This is a simplified example. A real implementation would iterate through employees.
        const individualGoals = this.createIndividualGoals(analysisResult, culturePriorities, skillsGaps);
        for (const goal of individualGoals) {
             await db.insert(performanceGoals).values({
                id: randomUUID(),
                tenantId,
                employeeId: 'employee-placeholder-id', // This should be the actual employee ID
                managerId: 'manager-placeholder-id', // This should be the actual manager ID
                title: goal.description,
                description: goal.description,
                type: 'individual',
                category: goal.type,
                goalFormat: 'smart',
                target: { description: 'Complete goal' },
                weight: goal.weight.toString(),
                status: goal.status,
                startDate: new Date(),
                targetDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
                createdBy: 'system',
                updatedBy: 'system',
            });
        }
    }
    
    private createDepartmentGoals(dept: any, analysisResult: PerformanceAnalysisResult): any[] {
        const goals = [];
        if (dept.name?.toLowerCase().includes('engineering')) {
            goals.push({ description: 'Improve system reliability to 99.9% uptime', weight: 30, targetValue: 99.9, type: 'performance' });
        } else if (dept.name?.toLowerCase().includes('sales')) {
            goals.push({ description: 'Achieve quarterly revenue target of $1M', weight: 40, targetValue: 1000000, type: 'performance' });
        }
        if (dept.manager) { // Assuming manager indicates leadership role
             goals.push({ description: 'Improve team engagement score by 10%', weight: 20, targetValue: '10% improvement', type: 'culture' });
        }
        return goals;
    }

    private createIndividualGoals(analysisResult: PerformanceAnalysisResult, cultureGoals: CultureAnalysisOutput, skillsGaps: SkillsAnalysisResult): any[] {
        const goals = [];
        goals.push({ description: 'Complete assigned project deliverables', type: 'performance', weight: 50, status: 'draft' });

        if (cultureGoals.recommendations.immediate.length > 0) {
            goals.push({ description: cultureGoals.recommendations.immediate[0] || 'Improve team collaboration', type: 'culture', weight: 20, status: 'draft' });
        }
        if (skillsGaps.criticalGaps.length > 0) {
            goals.push({ description: `Develop ${skillsGaps.criticalGaps[0].skill}`, type: 'learning', weight: 30, status: 'draft' });
        }
        return goals;
    }

    // ... TODO: Migrate BOT assist functions and other helpers, fully typed.
}

export const performanceAgent = new PerformanceAgent();
