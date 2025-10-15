import OpenAI from "openai";
import { ProviderCall, ProviderResponse } from "./types";
import { getTenant } from "../data/store";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const ENGINE_MODELS = {
  knowledge: "gpt-4-turbo-preview",
  data: "gpt-4-1106-preview",
  reasoning: "gpt-4",
};

const ENGINE_PROMPTS = {
  knowledge: `You are an expert organizational psychologist specializing in the 7-cylinder values framework. 
Analyze the provided signals and generate insights about organizational knowledge patterns, cultural narratives, and collective wisdom.
Focus on how knowledge flows through the organization and aligns with the specified cylinder values.`,
  
  data: `You are a data scientist specializing in organizational metrics and the 7-cylinder values framework.
Analyze the provided signals and identify patterns, anomalies, and trends in organizational data.
Focus on quantitative insights and how they map to the specified cylinder values.`,
  
  reasoning: `You are a systems thinker specializing in organizational decision-making and the 7-cylinder values framework.
Analyze the provided signals and generate strategic recommendations and decision pathways.
Focus on cause-effect relationships and how they align with the specified cylinder values.`,
};

export async function callOpenAI(call: ProviderCall): Promise<ProviderResponse> {
  try {
    // Get tenant context if available
    let tenantContext = "";
    if (call.tenantId) {
      const tenant = getTenant(call.tenantId);
      if (tenant) {
        tenantContext = `\nOrganization: ${tenant.name} (${tenant.plan} plan)`;
      }
    }

    // Build the prompt
    const cylinderContext = call.focusCylinder 
      ? `\nFocus on Cylinder ${call.focusCylinder} values and principles.`
      : "";
    
    const contextString = call.context?.length 
      ? `\nKey context:\n${call.context.map(c => `- ${c}`).join('\n')}`
      : "";

    const systemPrompt = ENGINE_PROMPTS[call.engine];
    
    const userPrompt = `
Agent: ${call.agent}
Signal Strength: ${(call.signalStrength ?? 0.5) * 100}%${tenantContext}${cylinderContext}${contextString}

${call.prompt || 'Provide organizational insights based on the above signals.'}

Generate a concise analytical narrative (2-3 sentences) that addresses the specific ${call.engine} perspective.`;

    const completion = await openai.chat.completions.create({
      model: ENGINE_MODELS[call.engine],
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const narrative = completion.choices[0]?.message?.content || "Analysis unavailable";
    
    // Calculate confidence based on signal strength and model performance
    const baseConfidence = 0.75;
    const signalBoost = (call.signalStrength ?? 0.5) * 0.2;
    const confidence = Math.min(0.95, baseConfidence + signalBoost);

    return {
      provider: "openai",
      engine: call.engine,
      narrative: narrative.trim(),
      confidence: Number(confidence.toFixed(2)),
    };
  } catch (error) {
    console.error("OpenAI call failed:", error);
    
    // Fallback response
    return {
      provider: "openai",
      engine: call.engine,
      narrative: `OpenAI ${call.engine} analysis for ${call.agent} (offline mode)`,
      confidence: 0.5,
    };
  }
}
