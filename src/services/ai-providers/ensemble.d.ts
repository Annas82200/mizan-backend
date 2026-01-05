import { ProviderCall, ProviderResponse, EnsembleConfig } from "./types";
export declare class EnsembleAI {
    private config;
    constructor(config: EnsembleConfig);
    call(call: ProviderCall): Promise<ProviderResponse>;
    private callProviderSafely;
    private callFallback;
    private unanimousStrategy;
    private majorityStrategy;
    private weightedStrategy;
    private bestConfidenceStrategy;
    private findCommonKeywords;
    private extractKeyInsight;
    private clusterResponses;
    private isSimilar;
    private synthesizeNarratives;
}
export declare const ensembleAI: EnsembleAI;
//# sourceMappingURL=ensemble.d.ts.map