import { ProviderResponse, AIProviderKey, EngineType } from './types';
export interface RouterProviderCall {
    prompt: string;
    engine: EngineType;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    requireJson?: boolean;
}
declare class AIProviderRouter {
    private openai;
    private anthropic;
    private gemini;
    private mistral;
    constructor();
    invokeProvider(provider: AIProviderKey | "ensemble", call: RouterProviderCall): Promise<ProviderResponse>;
    private invokeEnsemble;
    private invokeOpenAI;
    private invokeAnthropic;
    private invokeGemini;
    private invokeMistral;
    /**
     * Extracts JSON from markdown-wrapped or raw responses
     * Handles responses like ```json{...}``` or raw JSON
     *
     * @param content The raw response content from AI provider
     * @returns Clean JSON string ready for parsing
     */
    private extractJsonFromResponse;
    private extractConfidence;
}
export declare const aiRouter: AIProviderRouter;
export declare function invokeProvider(provider: AIProviderKey | "ensemble", call: RouterProviderCall): Promise<ProviderResponse>;
export type TriadPayload = RouterProviderCall & {
    knowledgeQuery?: string;
    dataTask?: string;
    analysisGoal?: string;
};
export {};
//# sourceMappingURL=router.d.ts.map