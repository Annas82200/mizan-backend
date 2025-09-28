import { MultiProviderManager, ConsensusResult } from '../../ai/multi-provider-manager.js';
import { AIRequest } from '../../ai/base/ai-provider.js';

export interface EngineConfig {
  providers: string[];
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
  protected aiManager: MultiProviderManager;

  constructor(agentType: string, config: ThreeEngineConfig) {
    this.agentType = agentType;
    this.config = config;
    this.aiManager = new MultiProviderManager();
  }

  async analyze(inputData: any): Promise<AnalysisResult> {
    const startTime = Date.now();

    try {
      // Step 1: Knowledge Engine - Load frameworks and expert models
      const knowledgeResult = await this.runKnowledgeEngine(inputData);
      
      // Step 2: Data Engine - Process tenant-specific data
      const dataResult = await this.runDataEngine(inputData, knowledgeResult.output);
      
      // Step 3: Reasoning Engine - Connect knowledge + data → insights
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
    
    const request: AIRequest = {
      model: this.config.knowledge.model,
      messages: [
        {
          role: 'system',
          content: this.getKnowledgeSystemPrompt()
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: this.config.knowledge.temperature,
      maxTokens: this.config.knowledge.maxTokens,
      responseFormat: 'json'
    };

    const consensus = await this.aiManager.generateWithConsensus(
      request,
      this.config.knowledge.providers,
      this.config.consensusThreshold
    );

    return {
      output: this.parseKnowledgeOutput(consensus.finalResponse),
      confidence: consensus.confidence,
      processingTime: Date.now() - startTime,
      providersUsed: consensus.responses.map(r => r.provider)
    };
  }

  protected async runDataEngine(inputData: any, knowledgeOutput: any): Promise<EngineResult> {
    const startTime = Date.now();
    
    const processedData = await this.processData(inputData);
    const prompt = this.buildDataPrompt(processedData, knowledgeOutput);
    
    const request: AIRequest = {
      model: this.config.data.model,
      messages: [
        {
          role: 'system',
          content: this.getDataSystemPrompt()
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: this.config.data.temperature,
      maxTokens: this.config.data.maxTokens,
      responseFormat: 'json'
    };

    const consensus = await this.aiManager.generateWithConsensus(
      request,
      this.config.data.providers,
      this.config.consensusThreshold
    );

    return {
      output: this.parseDataOutput(consensus.finalResponse),
      confidence: consensus.confidence,
      processingTime: Date.now() - startTime,
      providersUsed: consensus.responses.map(r => r.provider)
    };
  }

  protected async runReasoningEngine(
    inputData: any, 
    knowledgeOutput: any, 
    dataOutput: any
  ): Promise<EngineResult> {
    const startTime = Date.now();
    
    const prompt = this.buildReasoningPrompt(inputData, knowledgeOutput, dataOutput);
    
    const request: AIRequest = {
      model: this.config.reasoning.model,
      messages: [
        {
          role: 'system',
          content: this.getReasoningSystemPrompt()
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: this.config.reasoning.temperature,
      maxTokens: this.config.reasoning.maxTokens,
      responseFormat: 'json'
    };

    const consensus = await this.aiManager.generateWithConsensus(
      request,
      this.config.reasoning.providers,
      this.config.consensusThreshold
    );

    return {
      output: this.parseReasoningOutput(consensus.finalResponse),
      confidence: consensus.confidence,
      processingTime: Date.now() - startTime,
      providersUsed: consensus.responses.map(r => r.provider)
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