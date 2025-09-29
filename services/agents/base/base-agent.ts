// server/services/agents/base-agent.ts

import { OpenAI } from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import MistralClient from "@mistralai/mistralai";

interface AnalysisResult {
  provider: string;
  response: any;
  confidence: number;
}

interface ConsensusResult {
  finalResult: any;
  consensus: number;
  providerResults: AnalysisResult[];
  methodology: string;
}

export abstract class BaseAgent {
  protected openai: OpenAI;
  protected anthropic: Anthropic;
  protected gemini: GoogleGenerativeAI;
  protected mistral: MistralClient;
  
  // Configuration for fact-based analysis
  protected readonly ANALYSIS_RULES = {
    temperature: 0.1, // Low temperature for factual responses
    requireEvidence: true,
    prohibitAssumptions: true,
    requireDataSource: true,
    confidenceThreshold: 0.8
  };

  constructor() {
    // Initialize all AI providers
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    this.mistral = new MistralClient(process.env.MISTRAL_API_KEY!);
  }

  /**
   * Execute analysis using multiple AI providers and return consensus
   */
  protected async multiProviderAnalysis(
    prompt: string,
    requireJson: boolean = true
  ): Promise<ConsensusResult> {
    // Add fact-checking instructions to all prompts
    const factBasedPrompt = this.addFactCheckingInstructions(prompt);
    
    // Execute analysis with all providers in parallel
    const analyses = await Promise.allSettled([
      this.analyzeWithOpenAI(factBasedPrompt, requireJson),
      this.analyzeWithAnthropic(factBasedPrompt, requireJson),
      this.analyzeWithGemini(factBasedPrompt, requireJson),
      this.analyzeWithMistral(factBasedPrompt, requireJson)
    ]);

    // Filter successful results
    const successfulResults: AnalysisResult[] = analyses
      .filter((result): result is PromiseFulfilledResult<AnalysisResult> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);

    if (successfulResults.length === 0) {
      throw new Error('All AI providers failed to analyze');
    }

    // Build consensus from multiple providers
    return this.buildConsensus(successfulResults);
  }

  private addFactCheckingInstructions(prompt: string): string {
    return `
${prompt}

CRITICAL INSTRUCTIONS:
1. Base your analysis ONLY on the facts and data provided
2. Do NOT make any assumptions about missing information
3. If data is insufficient, explicitly state what is missing
4. Provide confidence levels (0-100%) for each conclusion
5. Cite specific data points that support your analysis
6. If multiple interpretations exist, present all with probabilities
7. Distinguish between facts, inferences, and recommendations
8. Flag any data quality issues or inconsistencies

Your response must be:
- Fact-based and evidence-driven
- Free from assumptions or speculation
- Transparent about limitations
- Clear about confidence levels`;
  }

  private async analyzeWithOpenAI(
    prompt: string, 
    requireJson: boolean
  ): Promise<AnalysisResult> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "You are a fact-based analyst. Never make assumptions. Only analyze provided data."
          },
          { role: "user", content: prompt }
        ],
        temperature: this.ANALYSIS_RULES.temperature,
        response_format: requireJson ? { type: "json_object" } : undefined
      });

      return {
        provider: 'openai',
        response: requireJson 
          ? JSON.parse(response.choices[0].message.content!)
          : response.choices[0].message.content,
        confidence: this.extractConfidence(response.choices[0].message.content!)
      };
    } catch (error) {
      console.error('OpenAI analysis failed:', error);
      throw error;
    }
  }

  private async analyzeWithAnthropic(
    prompt: string,
    requireJson: boolean
  ): Promise<AnalysisResult> {
    try {
      const response = await this.anthropic.messages.create({
        model: "claude-3-opus-20240229",
        messages: [
          {
            role: "user",
            content: prompt + (requireJson ? "\nReturn response as valid JSON." : "")
          }
        ],
        max_tokens: 4000,
        temperature: this.ANALYSIS_RULES.temperature
      });

      const content = response.content[0].type === 'text' 
        ? response.content[0].text 
        : '';

      return {
        provider: 'anthropic',
        response: requireJson ? JSON.parse(content) : content,
        confidence: this.extractConfidence(content)
      };
    } catch (error) {
      console.error('Anthropic analysis failed:', error);
      throw error;
    }
  }

  private async analyzeWithGemini(
    prompt: string,
    requireJson: boolean
  ): Promise<AnalysisResult> {
    try {
      const model = this.gemini.getGenerativeModel({ model: "gemini-pro" });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: this.ANALYSIS_RULES.temperature
        }
      });

      const content = result.response.text();

      return {
        provider: 'gemini',
        response: requireJson ? JSON.parse(content) : content,
        confidence: this.extractConfidence(content)
      };
    } catch (error) {
      console.error('Gemini analysis failed:', error);
      throw error;
    }
  }

  private async analyzeWithMistral(
    prompt: string,
    requireJson: boolean
  ): Promise<AnalysisResult> {
    try {
      const response = await this.mistral.chat({
        model: "mistral-large-latest",
        messages: [{ role: "user", content: prompt }],
        temperature: this.ANALYSIS_RULES.temperature
      });

      const content = response.choices[0].message.content;

      return {
        provider: 'mistral',
        response: requireJson ? JSON.parse(content) : content,
        confidence: this.extractConfidence(content)
      };
    } catch (error) {
      console.error('Mistral analysis failed:', error);
      throw error;
    }
  }

  /**
   * Build consensus from multiple AI provider results
   */
  protected buildConsensus(results: AnalysisResult[]): ConsensusResult {
    // For non-JSON responses, we'd implement NLP consensus
    // For JSON responses, we merge and validate

    if (results.length === 1) {
      return {
        finalResult: results[0].response,
        consensus: results[0].confidence,
        providerResults: results,
        methodology: 'single_provider'
      };
    }

    // Calculate consensus based on response similarity
    const consensusData = this.calculateConsensus(results);

    return {
      finalResult: consensusData.result,
      consensus: consensusData.score,
      providerResults: results,
      methodology: 'multi_provider_consensus'
    };
  }

  private calculateConsensus(results: AnalysisResult[]): any {
    // Implementation depends on response type
    // For JSON: merge common fields, flag discrepancies
    // For text: NLP similarity analysis
    
    // Simple implementation: average confidence and merge results
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    
    // For JSON responses, merge intelligently
    if (typeof results[0].response === 'object') {
      const merged = this.mergeJsonResponses(results.map(r => r.response));
      return {
        result: merged,
        score: avgConfidence
      };
    }
    
    // For text responses, return highest confidence
    const bestResult = results.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );
    
    return {
      result: bestResult.response,
      score: avgConfidence
    };
  }

  private mergeJsonResponses(responses: any[]): any {
    // Intelligent JSON merging
    const merged: any = {};
    
    // Get all unique keys
    const allKeys = new Set<string>();
    responses.forEach(resp => {
      Object.keys(resp).forEach(key => allKeys.add(key));
    });
    
    // For each key, determine best value
    allKeys.forEach(key => {
      const values = responses
        .filter(resp => resp[key] !== undefined)
        .map(resp => resp[key]);
      
      if (values.length === 0) return;
      
      // If all values are same, use it
      if (values.every(v => JSON.stringify(v) === JSON.stringify(values[0]))) {
        merged[key] = values[0];
      } else {
        // Use most common value or average for numbers
        merged[key] = this.selectBestValue(values);
      }
    });
    
    return merged;
  }

  private selectBestValue(values: any[]): any {
    // If numeric, return average
    if (values.every(v => typeof v === 'number')) {
      return values.reduce((sum, v) => sum + v, 0) / values.length;
    }
    
    // For other types, return most frequent
    const frequency = new Map();
    values.forEach(v => {
      const key = JSON.stringify(v);
      frequency.set(key, (frequency.get(key) || 0) + 1);
    });
    
    let maxFreq = 0;
    let mostFrequent = values[0];
    frequency.forEach((freq, key) => {
      if (freq > maxFreq) {
        maxFreq = freq;
        mostFrequent = JSON.parse(key);
      }
    });
    
    return mostFrequent;
  }

  private extractConfidence(response: string): number {
    // Extract confidence from response if mentioned
    const confidenceMatch = response.match(/confidence[:\s]+(\d+)%/i);
    if (confidenceMatch) {
      return parseInt(confidenceMatch[1]) / 100;
    }
    
    // Default confidence based on response characteristics
    // Higher confidence for responses with specific data citations
    const hasCitations = response.includes('based on') || response.includes('according to');
    const hasNumbers = /\d+/.test(response);
    const hasQualifiers = /uncertain|unclear|insufficient data|missing/i.test(response);
    
    let confidence = 0.7; // Base confidence
    if (hasCitations) confidence += 0.1;
    if (hasNumbers) confidence += 0.1;
    if (hasQualifiers) confidence -= 0.2;
    
    return Math.max(0.3, Math.min(0.95, confidence));
  }

  /**
   * Validate that analysis is based on provided data only
   */
  protected validateFactBased(analysis: any, providedData: any): boolean {
    // Check that all claims in analysis can be traced to provided data
    // This is a simplified version - real implementation would be more sophisticated
    
    const analysisText = JSON.stringify(analysis);
    const dataText = JSON.stringify(providedData);
    
    // Check for red flags indicating assumptions
    const assumptionIndicators = [
      'probably', 'likely', 'might be', 'could be', 
      'assume', 'guess', 'estimate', 'typical'
    ];
    
    const hasAssumptions = assumptionIndicators.some(indicator => 
      analysisText.toLowerCase().includes(indicator)
    );
    
    return !hasAssumptions;
  }

  /**
   * Abstract method to be implemented by each agent
   */
  abstract analyze(input: any): Promise<any>;
}

// Updated base class for all agents to extend
export abstract class MizanAgent extends BaseAgent {
  protected tenantId: string;

  constructor(tenantId: string) {
    super();
    this.tenantId = tenantId;
  }

  /**
   * Ensure all analyses are fact-based and use multiple providers
   */
  protected async executeAnalysis(
    analysisName: string,
    data: any,
    analysisPrompt: string
  ): Promise<any> {
    // Log the analysis for audit
    console.log(`Executing ${analysisName} for tenant ${this.tenantId}`);
    
    // Validate input data
    if (!data || Object.keys(data).length === 0) {
      throw new Error(`Insufficient data provided for ${analysisName}`);
    }
    
    // Execute multi-provider analysis
    const consensus = await this.multiProviderAnalysis(analysisPrompt, true);
    
    // Validate the analysis is fact-based
    if (!this.validateFactBased(consensus.finalResult, data)) {
      console.warn(`Analysis may contain assumptions: ${analysisName}`);
    }
    
    // Return result with metadata
    return {
      analysis: consensus.finalResult,
      metadata: {
        analysisType: analysisName,
        timestamp: new Date().toISOString(),
        consensus: consensus.consensus,
        providers: consensus.providerResults.map(r => ({
          provider: r.provider,
          confidence: r.confidence
        })),
        dataQuality: this.assessDataQuality(data)
      }
    };
  }

  private assessDataQuality(data: any): any {
    // Assess completeness and quality of input data
    const totalFields = this.countFields(data);
    const filledFields = this.countFilledFields(data);
    
    return {
      completeness: (filledFields / totalFields) * 100,
      totalFields,
      filledFields,
      missingCriticalData: this.identifyMissingCriticalData(data)
    };
  }

  private countFields(obj: any): number {
    let count = 0;
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        count += this.countFields(obj[key]);
      } else {
        count++;
      }
    }
    return count;
  }

  private countFilledFields(obj: any): number {
    let count = 0;
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        count += this.countFilledFields(obj[key]);
      } else if (obj[key] !== null && obj[key] !== undefined && obj[key] !== '') {
        count++;
      }
    }
    return count;
  }

  private identifyMissingCriticalData(data: any): string[] {
    // Override in specific agents to identify critical missing fields
    return [];
  }
}
