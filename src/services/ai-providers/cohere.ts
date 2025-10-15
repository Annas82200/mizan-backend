import { ProviderCall, ProviderResponse } from "./types";
import { getTenant } from "../data/store";

const COHERE_API_KEY = process.env.COHERE_API_KEY || "";

const ENGINE_MODELS = {
  knowledge: "command",
  data: "command-light",
  reasoning: "command"
};

export async function callCohere(call: ProviderCall): Promise<ProviderResponse> {
  try {
    if (!COHERE_API_KEY) {
      throw new Error("Cohere API key not configured");
    }

    // Get tenant context
    let tenantContext = "";
    if (call.tenantId) {
      const tenant = getTenant(call.tenantId);
      if (tenant) {
        tenantContext = `Organization: ${tenant.name} (${tenant.plan} plan)\n`;
      }
    }

    // Build the prompt
    const cylinderMap: Record<number, string> = {
      1: "Stability (safety, reliability, clarity)",
      2: "Belonging (inclusion, empathy, celebration)",
      3: "Mastery (craftsmanship, learning agility, mentorship)",
      4: "Autonomy (ownership, initiative, adaptability)",
      5: "Purpose (contribution, storytelling, service)",
      6: "Evolution (experimentation, feedback fluency, resilience)",
      7: "Legacy (stewardship, systems thinking, regeneration)"
    };
    
    const cylinderContext = call.focusCylinder 
      ? `\nFocus on Cylinder ${call.focusCylinder}: ${cylinderMap[call.focusCylinder]}`
      : "";

    const prompt = `As an organizational ${call.engine} analyst using the 7-cylinder values framework:
${tenantContext}${cylinderContext}

Agent: ${call.agent}
Signal Strength: ${(call.signalStrength ?? 0.5) * 100}%
Context: ${call.context?.join(', ') || 'No specific context'}

${call.prompt || `Analyze the ${call.engine} aspects of this organizational scenario.`}

Provide a concise 2-3 sentence insight.`;

    const response = await fetch("https://api.cohere.ai/v1/generate", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${COHERE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ENGINE_MODELS[call.engine],
        prompt: prompt,
        max_tokens: 150,
        temperature: 0.7,
        k: 0,
        stop_sequences: [],
        return_likelihoods: "NONE"
      })
    });

    if (!response.ok) {
      throw new Error(`Cohere API error: ${response.status}`);
    }

    const data = await response.json();
    const narrative = data.generations?.[0]?.text?.trim() || "Analysis unavailable";

    // Confidence based on signal strength and model
    const baseConfidence = 0.72;
    const signalBoost = (call.signalStrength ?? 0.5) * 0.18;
    const confidence = Math.min(0.92, baseConfidence + signalBoost);

    return {
      provider: "cohere",
      engine: call.engine,
      narrative,
      confidence: Number(confidence.toFixed(2))
    };
  } catch (error) {
    console.error("Cohere call failed:", error);
    
    // Fallback response
    return {
      provider: "cohere",
      engine: call.engine,
      narrative: `Cohere ${call.engine} analysis pending configuration`,
      confidence: 0.5
    };
  }
}
