import { EnsembleAI } from '../../ai-providers/ensemble.js';
import { ProviderCall, ProviderResponse, EnsembleConfig, EngineType } from '../../ai-providers/types.js';

export type AIProviderKey = 'openai' | 'anthropic' | 'gemini' | 'mistral' | 'claude' | 'gpt-4' | 'cohere' | string;

export interface EngineConfig {
  providers: AIProviderKey[];
  model: string;
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
  output: any;
  confidence: number;
  processingTime: number;
  providersUsed: string[];
}

export interface AnalysisResult {
  knowledge: EngineResult;
  data: EngineResult;
  reasoning: EngineResult;
  finalOutput: any;
  overallConfidence: number;
  totalProcessingTime: number;
}

export abstract class ThreeEngineAgent {
  protected agentType: string;
  protected config: ThreeEngineConfig;
  protected knowledgeAI: EnsembleAI;
  protected dataAI: EnsembleAI;
  protected reasoningAI: EnsembleAI;

  constructor(agentType: string, config: ThreeEngineConfig) {
    this.agentType = agentType;
    this.config = config;

    this.knowledgeAI = new EnsembleAI({
      strategy: 'weighted',
      providers: config.knowledge.providers,
      minConfidence: config.consensusThreshold
    });

    this.dataAI = new EnsembleAI({
      strategy: 'weighted',
      providers: config.data.providers,
      minConfidence: config.consensusThreshold
    });

    this.reasoningAI = new EnsembleAI({
      strategy: 'weighted',
      providers: config.reasoning.providers,
      minConfidence: config.consensusThreshold
    });
  }

  async analyze(inputData: any): Promise<AnalysisResult> {
    const startTime = Date.now();

    try {
      const knowledgeResult = await this.runKnowledgeEngine(inputData);
      const dataResult = await this.runDataEngine(inputData, knowledgeResult.output);
      const reasoningResult = await this.runReasoningEngine(
        inputData,
        knowledgeResult.output,
        dataResult.output
      );

      const totalProcessingTime = Date.now() - startTime;
      const overallConfidence = this.calculateOverallConfidence([
        knowledgeResult,
        dataResult,
        reasoningResult
      ]);

      return {
        knowledge: knowledgeResult,
        data: dataResult,
        reasoning: reasoningResult,
        finalOutput: reasoningResult.output,
        overallConfidence,
        totalProcessingTime
      };
    } catch (error) {
      console.error(`${this.agentType} analysis failed:`, error);
      throw error;
    }
  }

  protected async runKnowledgeEngine(inputData: any): Promise<EngineResult> {
    const startTime = Date.now();

    const frameworks = await this.loadFrameworks();
    const prompt = this.buildKnowledgePrompt(inputData, frameworks);

    const providerCall: ProviderCall = {
      agent: this.agentType,
      engine: 'knowledge',
      prompt: `${this.getKnowledgeSystemPrompt()}\n\n${prompt}`,
      temperature: this.config.knowledge.temperature,
      maxTokens: this.config.knowledge.maxTokens
    };

    const response = await this.knowledgeAI.call(providerCall);

    return {
      output: this.parseKnowledgeOutput(response.narrative),
      confidence: response.confidence,
      processingTime: Date.now() - startTime,
      providersUsed: [response.provider]
    };
  }

  protected async runDataEngine(inputData: any, knowledgeOutput: any): Promise<EngineResult> {
    const startTime = Date.now();

    const processedData = await this.processData(inputData);
    const prompt = this.buildDataPrompt(processedData, knowledgeOutput);

    const providerCall: ProviderCall = {
      agent: this.agentType,
      engine: 'data',
      prompt: `${this.getDataSystemPrompt()}\n\n${prompt}`,
      temperature: this.config.data.temperature,
      maxTokens: this.config.data.maxTokens
    };

    const response = await this.dataAI.call(providerCall);

    return {
      output: this.parseDataOutput(response.narrative),
      confidence: response.confidence,
      processingTime: Date.now() - startTime,
      providersUsed: [response.provider]
    };
  }

  protected async runReasoningEngine(
    inputData: any,
    knowledgeOutput: any,
    dataOutput: any
  ): Promise<EngineResult> {
    const startTime = Date.now();

    const prompt = this.buildReasoningPrompt(inputData, knowledgeOutput, dataOutput);

    const providerCall: ProviderCall = {
      agent: this.agentType,
      engine: 'reasoning',
      prompt: `${this.getReasoningSystemPrompt()}\n\n${prompt}`,
      temperature: this.config.reasoning.temperature,
      maxTokens: this.config.reasoning.maxTokens
    };

    const response = await this.reasoningAI.call(providerCall);

    return {
      output: this.parseReasoningOutput(response.narrative),
      confidence: response.confidence,
      processingTime: Date.now() - startTime,
      providersUsed: [response.provider]
    };
  }

  private calculateOverallConfidence(results: EngineResult[]): number {
    const totalConfidence = results.reduce((sum, result) => sum + result.confidence, 0);
    return totalConfidence / results.length;
  }

  // Abstract methods that each agent must implement
  protected abstract loadFrameworks(): Promise<any>;
  protected abstract processData(inputData: any): Promise<any>;

  protected abstract getKnowledgeSystemPrompt(): string;
  protected abstract getDataSystemPrompt(): string;
  protected abstract getReasoningSystemPrompt(): string;

  protected abstract buildKnowledgePrompt(inputData: any, frameworks: any): string;
  protected abstract buildDataPrompt(processedData: any, knowledgeOutput: any): string;
  protected abstract buildReasoningPrompt(inputData: any, knowledgeOutput: any, dataOutput: any): string;

  protected abstract parseKnowledgeOutput(response: string): any;
  protected abstract parseDataOutput(response: string): any;
  protected abstract parseReasoningOutput(response: string): any;
}
