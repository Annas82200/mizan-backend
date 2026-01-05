import { EnsembleAI } from '../../ai-providers/ensemble';
export type AIProviderKey = 'openai' | 'anthropic' | 'gemini' | 'mistral' | 'claude' | 'gpt-4' | 'cohere' | string;
export interface EngineConfig {
    providers: AIProviderKey[];
    model?: string;
    temperature: number;
    maxTokens: number;
}
export interface ThreeEngineConfig {
    knowledge: EngineConfig;
    data: EngineConfig;
    reasoning: EngineConfig;
    consensusThreshold: number;
}
export interface EngineResult {
    output: Record<string, unknown>;
    confidence: number;
    processingTime: number;
    providersUsed: string[];
}
export interface AnalysisResult {
    knowledge: EngineResult;
    data: EngineResult;
    reasoning: EngineResult;
    finalOutput: Record<string, unknown>;
    overallConfidence: number;
    totalProcessingTime: number;
}
export declare abstract class ThreeEngineAgent {
    protected agentType: string;
    protected config: ThreeEngineConfig;
    protected knowledgeAI: EnsembleAI;
    protected dataAI: EnsembleAI;
    protected reasoningAI: EnsembleAI;
    constructor(agentType: string, config: ThreeEngineConfig);
    analyze(inputData: Record<string, unknown>): Promise<AnalysisResult>;
    protected runKnowledgeEngine(inputData: Record<string, unknown>): Promise<EngineResult>;
    protected runDataEngine(inputData: Record<string, unknown>, knowledgeOutput: Record<string, unknown>): Promise<EngineResult>;
    protected runReasoningEngine(inputData: Record<string, unknown>, knowledgeOutput: Record<string, unknown>, dataOutput: Record<string, unknown>): Promise<EngineResult>;
    private calculateOverallConfidence;
    protected abstract loadFrameworks(): Promise<Record<string, unknown>>;
    protected abstract processData(inputData: Record<string, unknown>): Promise<Record<string, unknown>>;
    protected abstract getKnowledgeSystemPrompt(): string;
    protected abstract getDataSystemPrompt(): string;
    protected abstract getReasoningSystemPrompt(): string;
    protected abstract buildKnowledgePrompt(inputData: Record<string, unknown>, frameworks: Record<string, unknown>): string;
    protected abstract buildDataPrompt(processedData: Record<string, unknown>, knowledgeOutput: Record<string, unknown>): string;
    protected abstract buildReasoningPrompt(inputData: Record<string, unknown>, knowledgeOutput: Record<string, unknown>, dataOutput: Record<string, unknown>): string;
    protected abstract parseKnowledgeOutput(response: string): Record<string, unknown>;
    protected abstract parseDataOutput(response: string): Record<string, unknown>;
    protected abstract parseReasoningOutput(response: string): Record<string, unknown>;
}
//# sourceMappingURL=three-engine-agent.d.ts.map