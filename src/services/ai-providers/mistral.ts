import { ProviderCall, ProviderResponse } from "./types.js";

export async function callMistral(call: ProviderCall): Promise<ProviderResponse> {
  const stance = call.engine === "reasoning" ? "decision calculus" : "signal harmonics";
  const context = (call.context || []).length ? ` grounded in ${(call.context || []).join(", ")}` : "";
  const anchor = call.focusCylinder ? ` aligned to Cylinder ${call.focusCylinder}` : " across cylinders";
  return {
    provider: "mistral",
    engine: call.engine,
    narrative: `Mistral composes ${stance} for ${call.agent}${anchor}${context}.`,
    confidence: Math.min(0.86, 0.58 + (call.signalStrength ?? 0.45) * 0.35),
  };
}
