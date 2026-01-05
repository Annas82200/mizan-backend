import { ThreeEngineAgent, ThreeEngineConfig } from '../base/three-engine-agent';
interface MizanCylinder {
    level: number;
    name: string;
    definition: string;
    ethicalPrinciple: string;
    enablingValues: string[];
    limitingValues: string[];
}
export interface CultureAnalysisInput extends Record<string, unknown> {
    companyId: string;
    tenantId: string;
    companyValues: string[];
    strategy?: string;
    employeeAssessments?: Array<{
        employeeId: string;
        personalValues: string[];
        currentExperienceValues: string[];
        desiredFutureValues: string[];
        engagementLevel: number;
        recognitionLevel: number;
    }>;
}
export interface CultureAnalysisOutput {
    companyId: string;
    tenantId: string;
    analysisDate: Date;
    strategyAlignmentScore: number;
    isHealthyForStrategy: boolean;
    valueMapping: {
        mappings: Array<{
            value: string;
            cylinder: number;
            type: 'enabling' | 'limiting';
            rationale: string;
            strength: number;
        }>;
        cylinderDistribution: Record<number, {
            enabling: number;
            limiting: number;
        }>;
        dominantCylinders: number[];
        missingCylinders: number[];
    };
    strategyAlignment: {
        cultureFit: number;
        alignmentGaps: string[];
        accelerators: string[];
        blockers: string[];
        recommendations: string[];
    };
    cylinderHealth: Record<number, {
        status: string;
        score: number;
        enabling?: number;
        limiting?: number;
    }>;
    employeeCultureGap: {
        alignmentScore: number;
        gaps: string[];
        insights: string[];
    } | null;
    entropyScore: number;
    recommendations: {
        immediate: string[];
        shortTerm: string[];
        longTerm: string[];
    };
    triggers: Array<{
        type: string;
        priority: string;
        module: string;
        reason: string;
        cylinders?: number[];
    }>;
    confidence: number;
    processingTime: number;
}
export declare class CultureAgentV2 extends ThreeEngineAgent {
    private mizanFramework;
    constructor(agentType: string, config: ThreeEngineConfig);
    /**
     * Initialize the Mizan 7-Cylinder Framework
     */
    private initializeMizanFramework;
    /**
     * Main analysis method
     */
    analyzeCulture(input: CultureAnalysisInput): Promise<CultureAnalysisOutput>;
    protected loadFrameworks(): Promise<Record<string, unknown>>;
    protected processData(inputData: Record<string, unknown>): Promise<Record<string, unknown>>;
    protected getKnowledgeSystemPrompt(): string;
    protected getDataSystemPrompt(): string;
    protected getReasoningSystemPrompt(): string;
    protected buildKnowledgePrompt(inputData: Record<string, unknown>, frameworks: Record<string, unknown>): string;
    protected buildDataPrompt(processedData: Record<string, unknown>, knowledgeOutput: Record<string, unknown>): string;
    protected buildReasoningPrompt(inputData: Record<string, unknown>, knowledgeOutput: Record<string, unknown>, dataOutput: Record<string, unknown>): string;
    protected parseKnowledgeOutput(response: string): Record<string, unknown>;
    protected parseDataOutput(response: string): Record<string, unknown>;
    protected parseReasoningOutput(response: string): Record<string, unknown>;
    /**
     * Extract JSON from response, handling markdown code blocks and other wrappers
     */
    private extractJsonFromResponse;
    /**
     * Validate JSON structure before parsing to provide better error messages
     */
    private validateJsonStructure;
    private getCompanyStrategy;
    private saveAnalysisResults;
    private calculateCulturalMaturity;
    /**
     * Map tenant values to cylinders - Used for value mapping functionality
     * Implements Three-Engine Architecture for value analysis
     */
    mapTenantValuesToCylinders(tenantValues: string[]): Promise<Array<{
        value: string;
        cylinder: number;
        type: 'enabling' | 'limiting';
        rationale: string;
    }>>;
    /**
     * Analyze organization culture - Comprehensive organizational culture analysis
     * Implements full Three-Engine Architecture analysis
     */
    analyzeOrganizationCulture(tenantId: string, assessments: Array<{
        personalValues: string[];
        currentExperienceValues: string[];
        desiredFutureValues: string[];
        engagementLevel?: number;
        recognitionLevel?: number;
    }>): Promise<{
        overallHealth: number;
        cylinderDistribution: Record<number, number>;
        recommendations: string[];
        insights: string[];
    }>;
    /**
     * Analyze individual employee culture - Individual employee culture analysis
     * Implements Three-Engine Architecture for individual assessment
     */
    analyzeIndividualEmployee(employeeId: string, personalValues: string[], currentExperienceValues: string[], desiredFutureValues: string[], engagementLevel?: number, recognitionLevel?: number): Promise<{
        alignment: number;
        gaps: string[];
        strengths: string[];
        recommendations: string[];
        cylinderScores: Record<number, number>;
    }>;
    /**
     * Get agent domain for Three-Engine Architecture
     */
    protected getAgentDomain(): string;
    /**
     * Get knowledge base for Three-Engine Architecture
     */
    protected getKnowledgeBase(): Record<string, unknown>;
    /**
     * Public method to get the Mizan Framework cylinders
     * Used by routes and other services to access framework data
     */
    getMizanFramework(): MizanCylinder[];
    /**
     * Public method to get culture frameworks and theories
     * Provides access to all culture knowledge base
     */
    getCultureFrameworks(): Promise<{
        cylinders: MizanCylinder[];
        theories: Record<string, unknown>;
        valueCategories: Record<string, unknown>;
    }>;
}
declare const agent: CultureAgentV2;
export { agent as cultureAgent };
export declare function analyzeCulture(input: CultureAnalysisInput): Promise<CultureAnalysisOutput>;
//# sourceMappingURL=culture-agent.d.ts.map