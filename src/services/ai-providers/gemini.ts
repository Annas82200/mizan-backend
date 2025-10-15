import { ProviderCall, ProviderResponse } from "./types";

export async function callGemini(call: ProviderCall): Promise<ProviderResponse> {
  const spectrum = ["insight", "pattern", "trend"];
  const anchor = spectrum[(call.focusCylinder ?? 3) % spectrum.length];
  const prompt = call.prompt ? ` ${call.prompt}` : "";
  return {
    provider: "gemini",
    engine: call.engine,
    narrative: `Gemini maps ${call.agent} ${anchor}s with cylinder-aware context memory engaged.${prompt}`,
    confidence: Math.min(0.88, 0.55 + (call.signalStrength ?? 0.5) * 0.4),
  };
}
