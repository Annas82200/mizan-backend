"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreeEngineAgent = void 0;
const ensemble_1 = require("../../ai-providers/ensemble");
class ThreeEngineAgent {
    constructor(agentType, config) {
        this.agentType = agentType;
        this.config = config;
        this.knowledgeAI = new ensemble_1.EnsembleAI({
            strategy: 'weighted',
            providers: config.knowledge.providers,
            minConfidence: config.consensusThreshold
        });
        this.dataAI = new ensemble_1.EnsembleAI({
            strategy: 'weighted',
            providers: config.data.providers,
            minConfidence: config.consensusThreshold
        });
        this.reasoningAI = new ensemble_1.EnsembleAI({
            strategy: 'weighted',
            providers: config.reasoning.providers,
            minConfidence: config.consensusThreshold
        });
    }
    async analyze(inputData) {
        const startTime = Date.now();
        try {
            const knowledgeResult = await this.runKnowledgeEngine(inputData);
            const dataResult = await this.runDataEngine(inputData, knowledgeResult.output);
            const reasoningResult = await this.runReasoningEngine(inputData, knowledgeResult.output, dataResult.output);
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
        }
        catch (error) {
            console.error(`${this.agentType} analysis failed:`, error);
            throw error;
        }
    }
    async runKnowledgeEngine(inputData) {
        const startTime = Date.now();
        const frameworks = await this.loadFrameworks();
        const prompt = this.buildKnowledgePrompt(inputData, frameworks);
        const providerCall = {
            agent: this.agentType,
            engine: 'knowledge',
            prompt: `${this.getKnowledgeSystemPrompt()}\n\n${prompt}`,
            temperature: this.config.knowledge.temperature,
            maxTokens: this.config.knowledge.maxTokens,
            requireJson: true
        };
        const response = await this.knowledgeAI.call(providerCall);
        return {
            output: this.parseKnowledgeOutput(response.narrative),
            confidence: response.confidence,
            processingTime: Date.now() - startTime,
            providersUsed: [response.provider]
        };
    }
    async runDataEngine(inputData, knowledgeOutput) {
        const startTime = Date.now();
        const processedData = await this.processData(inputData);
        const prompt = this.buildDataPrompt(processedData, knowledgeOutput);
        const providerCall = {
            agent: this.agentType,
            engine: 'data',
            prompt: `${this.getDataSystemPrompt()}\n\n${prompt}`,
            temperature: this.config.data.temperature,
            maxTokens: this.config.data.maxTokens,
            requireJson: true
        };
        const response = await this.dataAI.call(providerCall);
        return {
            output: this.parseDataOutput(response.narrative),
            confidence: response.confidence,
            processingTime: Date.now() - startTime,
            providersUsed: [response.provider]
        };
    }
    async runReasoningEngine(inputData, knowledgeOutput, dataOutput) {
        const startTime = Date.now();
        const prompt = this.buildReasoningPrompt(inputData, knowledgeOutput, dataOutput);
        const providerCall = {
            agent: this.agentType,
            engine: 'reasoning',
            prompt: `${this.getReasoningSystemPrompt()}\n\n${prompt}`,
            temperature: this.config.reasoning.temperature,
            maxTokens: this.config.reasoning.maxTokens,
            requireJson: true
        };
        const response = await this.reasoningAI.call(providerCall);
        return {
            output: this.parseReasoningOutput(response.narrative),
            confidence: response.confidence,
            processingTime: Date.now() - startTime,
            providersUsed: [response.provider]
        };
    }
    calculateOverallConfidence(results) {
        const totalConfidence = results.reduce((sum, result) => sum + result.confidence, 0);
        return totalConfidence / results.length;
    }
}
exports.ThreeEngineAgent = ThreeEngineAgent;
//# sourceMappingURL=three-engine-agent.js.map