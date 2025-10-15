import Anthropic from "@anthropic-ai/sdk";
import { ProviderCall, ProviderResponse } from "./types";
import { getTenant } from "../data/store";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const ENGINE_FOCUS = {
  knowledge: "narrative patterns, cultural stories, and organizational wisdom",
  data: "quantitative signals, metrics patterns, and performance indicators",
  reasoning: "strategic decision trees, causal chains, and systems thinking",
};

export async function callClaude(call: ProviderCall): Promise<ProviderResponse> {
  try {
    // Get tenant context
    let tenantInfo = "";
    if (call.tenantId) {
      const tenant = getTenant(call.tenantId);
      if (tenant) {
        tenantInfo = `Organization: ${tenant.name} (${tenant.plan} tier)\n`;
      }
    }

    // Build cylinder context
    const cylinderMap: Record<number, string> = {
      1: "Stability (safety, reliability, clarity)",
      2: "Belonging (inclusion, empathy, celebration)",
      3: "Mastery (craftsmanship, learning agility, mentorship)",
      4: "Autonomy (ownership, initiative, adaptability)",
      5: "Purpose (contribution, storytelling, service)",
      6: "Evolution (experimentation, feedback fluency, resilience)",
      7: "Legacy (stewardship, systems thinking, regeneration)",
    };
    
    const cylinderContext = call.focusCylinder 
      ? `Primary lens: ${cylinderMap[call.focusCylinder] || `Cylinder ${call.focusCylinder}`}\n`
      : "";

    const contextPoints = call.context?.length 
      ? `Key signals:\n${call.context.map(c => `• ${c}`).join('\n')}\n`
      : "";

    const prompt = `You are analyzing organizational health through the ${call.engine} engine, focusing on ${ENGINE_FOCUS[call.engine]}.

${tenantInfo}${cylinderContext}${contextPoints}
Agent: ${call.agent}
Signal Strength: ${Math.round((call.signalStrength ?? 0.5) * 100)}%

Task: ${call.prompt || `Generate ${call.engine} insights for this organizational context`}

Provide a 2-3 sentence analytical narrative that weaves together the signals through your ${call.engine} lens. Be specific and actionable.`;

    const message = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      max_tokens: 200,
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
    });

    const narrative = message.content[0].type === 'text' 
      ? message.content[0].text 
      : "Analysis unavailable";

    // Claude confidence calculation
    const baseConfidence = 0.8;
    const signalAdjustment = (call.signalStrength ?? 0.5) * 0.15;
    const confidence = Math.min(0.94, baseConfidence + signalAdjustment);

    return {
      provider: "claude",
      engine: call.engine,
      narrative: narrative.trim(),
      confidence: Number(confidence.toFixed(2)),
    };
  } catch (error) {
    console.error("Claude call failed:", error);
    
    // Fallback
    return {
      provider: "claude",
      engine: call.engine,
      narrative: `Claude ${call.engine} analysis for ${call.agent} - awaiting configuration`,
      confidence: 0.5,
    };
  }
}
