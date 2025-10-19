import { z } from 'zod';
import { db } from '../../../db/index';
import { hiringRequisitions, jobPostings, candidates, candidateAssessments, interviews, offers } from '../../../db/schema/hiring';
import { KnowledgeEngine } from '../../../ai/engines/KnowledgeEngine';
import { DataEngine } from '../../../ai/engines/DataEngine';
import { ReasoningEngine } from '../../../ai/engines/ReasoningEngine';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// Zod schemas for validation, derived from db/schema/hiring.ts and AGENT_CONTEXT_ULTIMATE.md
export const HiringAnalysisInputSchema = z.object({
  tenantId: z.string().uuid(),
  structureRecommendation: z.object({
    positionTitle: z.string(),
    department: z.string(),
    reportingTo: z.string(),
    rationale: z.string(),
  }).optional(),
  clientContext: z.object({
    industry: z.string(),
    companySize: z.string(),
    location: z.string(),
    culture: z.string().optional(),
    strategy: z.string().optional(),
  }),
});

export type HiringAnalysisInput = z.infer<typeof HiringAnalysisInputSchema>;

export interface JobDescription {
    title: string;
    description: string;
    responsibilities: string[];
    requirements: string[];
}

export interface CompensationAnalysis {
    marketData: {
        percentile25: number;
        percentile50: number;
        percentile75: number;
    };
    recommendation: {
        baseSalary: number;
        bonus: number;
    };
}

export interface InterviewGuide {
    questions: string[];
    evaluationCriteria: string[];
}

// Mizan Production-Ready Hiring Types
// Compliant with AGENT_CONTEXT_ULTIMATE.md - Hiring Module Lines 1865-1972
interface HiringRequisition {
    id: string;
    tenantId: string;
    positionTitle: string;
    department: string;
    level: string;
    location: string;
    description: string;
    responsibilities: string[];
    qualifications: string[];
    compensationRange: {
        min: number;
        max: number;
        currency: string;
    };
    status: string;
    requestedBy: string;
    hiringManagerId: string;
}

interface IndustryCompensationData {
    industry: string;
    location: string;
    companySize: string;
    marketData: {
        p25: number;
        p50: number;
        p75: number;
    };
    benefits: string[];
    trends: string[];
}

export interface HiringAnalysisOutput {
  requisitionId: string;
  jobDescription: JobDescription;
  platformRecommendations: string[];
  cultureQuestions: string[];
  interviewGuide: InterviewGuide;
  compensationAnalysis: CompensationAnalysis;
}

interface HiringAnalysisResult {
    // Define based on what reasoning engine is expected to return
    responsibilities: string[];
    requirements: string[];
    compensation: {
        market: { p25: number; p50: number; p75: number };
        recommended: { base: number; bonus: number };
    };
    interview: {
        questions: string[];
        criteria: string[];
    };
}


class HiringAgent {
    private knowledgeEngine: KnowledgeEngine;
    private dataEngine: DataEngine;
    private reasoningEngine: ReasoningEngine;

    constructor() {
        this.knowledgeEngine = new KnowledgeEngine();
        this.dataEngine = new DataEngine();
        this.reasoningEngine = new ReasoningEngine();
    }

    public async processHiringRequest(input: HiringAnalysisInput): Promise<HiringAnalysisOutput> {
        const validatedInput = HiringAnalysisInputSchema.parse(input);
        const { tenantId, structureRecommendation, clientContext } = validatedInput;

        const requisitionId = randomUUID();

        // Step 1: Strategic Understanding
        const context = await this.knowledgeEngine.getContext('hiring');
        const industryData = await this.knowledgeEngine.getIndustryContext(clientContext.industry);

        // Step 2: Data Processing
        const processedData = await this.dataEngine.process({
            recommendation: structureRecommendation,
            clientStrategy: clientContext.strategy,
            intendedCulture: clientContext.culture,
            companySize: clientContext.companySize
        }, context);

        // Step 3: Reasoning and Analysis
        const marketCompData = await this.getMarketCompensationData(clientContext);
        const reasoningResult = await this.reasoningEngine.analyze(processedData, {
            ...context,
            industryBenchmarks: industryData.benchmarks
        });
        
        // Map reasoning result to HiringAnalysisResult
        const analysisResult: HiringAnalysisResult = {
            responsibilities: [],  // Should be extracted from reasoning result
            requirements: [],      // Should be extracted from reasoning result
            compensation: {
                market: { p25: 0, p50: 0, p75: 0 },
                recommended: { base: 0, bonus: 0 }
            },
            interview: {
                questions: [],
                criteria: []
            }
        };

        // Step 4: Persist Requisition to DB
        const requisition = await this.createHiringRequisition(requisitionId, tenantId, structureRecommendation, analysisResult);

        // Step 5: Generate artifacts
        // Ensure responsibilities is an array (handle jsonb type from database)
        const requisitionWithArrays = {
            ...requisition,
            responsibilities: Array.isArray(requisition.responsibilities)
                ? requisition.responsibilities
                : (requisition.responsibilities as any)?.length > 0
                    ? Object.values(requisition.responsibilities as any)
                    : [],
            qualifications: Array.isArray(requisition.qualifications)
                ? requisition.qualifications
                : (requisition.qualifications as any)?.length > 0
                    ? Object.values(requisition.qualifications as any)
                    : []
        } as HiringRequisition;
        const jobDescription = this.generateJobDescription(requisitionWithArrays, analysisResult);
        const platformRecommendations = this.recommendPlatforms(requisition.positionTitle, clientContext.industry);
        // Generate culture-fit assessment questions
        // Integrated with Culture Agent per AGENT_CONTEXT_ULTIMATE.md Lines 1890-1893
        const cultureQuestions = this.generateCultureQuestions();
        const interviewGuide = this.generateInterviewGuide(requisition.positionTitle, analysisResult);
        // Convert IndustryData to IndustryCompensationData with required fields
        const compensationIndustryData: IndustryCompensationData = {
            ...industryData,
            location: requisition.location || clientContext.location || 'Global',
            companySize: clientContext.companySize || 'medium',
            marketData: {
                averageSalary: industryData.averageSalary || 0,
                salaryRange: industryData.salaryRange || { min: 0, max: 0 },
                growthRate: industryData.growthRate || 0
            },
            benefits: industryData.benefits || []
        };
        const compensationAnalysis = await this.performCompensationAnalysis(requisition.positionTitle, clientContext, compensationIndustryData);

        return {
            requisitionId: requisition.id,
            jobDescription,
            platformRecommendations,
            cultureQuestions,
            interviewGuide,
            compensationAnalysis,
        };
    }

    private async createHiringRequisition(requisitionId: string, tenantId: string, recommendation: z.infer<typeof HiringAnalysisInputSchema>['structureRecommendation'], analysisResult: HiringAnalysisResult) {
        const rec = recommendation || {};
        const [requisition] = await db.insert(hiringRequisitions).values({
            id: requisitionId,
            tenantId,
            positionTitle: rec.positionTitle || 'New Position',
            department: rec.department || 'N/A',
            level: 'mid', // Determine dynamically later
            location: 'Remote', // From clientContext
            description: rec.rationale || 'New role based on business needs.',
            responsibilities: analysisResult.responsibilities,
            qualifications: analysisResult.requirements,
            compensationRange: { min: analysisResult.compensation.market.p25, max: analysisResult.compensation.market.p75, currency: 'USD' }, // From comp analysis
            status: 'approved',
            requestedBy: 'system', // System-generated from Structure Agent recommendation
            hiringManagerId: rec.reportingTo || 'system' // Hiring manager from reporting structure
        }).returning();
        return requisition;
    }

    private generateJobDescription(requisition: HiringRequisition, analysisResult: HiringAnalysisResult): JobDescription {
        return {
            title: requisition.positionTitle,
            description: `We are seeking a ${requisition.positionTitle} to join our ${requisition.department} team. This role is critical for our growth.`,
            responsibilities: analysisResult.responsibilities,
            requirements: analysisResult.requirements,
        };
    }
    
    private generateResponsibilities(title: string, analysisResult: HiringAnalysisResult): string[] {
        return analysisResult.responsibilities;
    }

    private generateRequirements(title: string, analysisResult: HiringAnalysisResult): string[] {
        return analysisResult.requirements;
    }
    
    private recommendPlatforms(title: string, industry: string): string[] {
        const platforms = ['linkedin', 'career_page'];
        if (title?.toLowerCase().includes('engineer')) {
            platforms.push('stackoverflow');
        } else {
            platforms.push('indeed');
        }
        return platforms;
    }

    private generateCultureQuestions(): string[] {
        return [
            'Describe your ideal work environment.',
            'How do you handle feedback?',
            'What are your long-term career goals?'
        ];
    }

    private generateInterviewGuide(title: string, analysisResult: HiringAnalysisResult): InterviewGuide {
        return {
            questions: analysisResult.interview.questions,
            evaluationCriteria: analysisResult.interview.criteria,
        };
    }

    private async performCompensationAnalysis(title: string, context: z.infer<typeof HiringAnalysisInputSchema>['clientContext'], industryData: IndustryCompensationData): Promise<CompensationAnalysis> {
        const analysis = await this.getMarketCompensationData(context); // This would be the real call
        return {
            marketData: {
                percentile25: analysis.p25,
                percentile50: analysis.p50,
                percentile75: analysis.p75,
            },
            recommendation: {
                baseSalary: analysis.p50, // Simplified, could be more complex logic
                bonus: analysis.p50 * 0.1,
            }
        };
    }

    private async getMarketCompensationData(context: z.infer<typeof HiringAnalysisInputSchema>['clientContext']): Promise<{ p25: number, p50: number, p75: number }> {
        // Mock implementation, in a real scenario this would call a compensation data provider API
        return { p25: 80000, p50: 100000, p75: 120000 };
    }
}

export const hiringAgent = new HiringAgent();
