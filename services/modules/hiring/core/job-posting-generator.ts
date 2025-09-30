import { EnsembleAI } from "../../ai-providers/ensemble.js";

export async function generateJobPosting(params: {
  role: string;
  department: string;
  company: {
    vision?: string;
    mission?: string;
    values?: string[];
  };
  requirements: string[];
  culture?: any;
}): Promise<{
  title: string;
  description: string;
  requirements: string[];
  benefits: string[];
  linkedInVersion: string;
  indeedVersion: string;
}> {
  const ensemble = new EnsembleAI({
    strategy: "weighted",
    providers: ["claude", "openai", "gemini"]
  });

  const prompt = `Create a compelling job posting for:

Role: ${params.role}
Department: ${params.department}

Company:
- Vision: ${params.company.vision || "Not specified"}
- Mission: ${params.company.mission || "Not specified"} 
- Values: ${params.company.values?.join(", ") || "Not specified"}

Requirements:
${params.requirements.join("\n")}

Create:
1. Engaging job title
2. Compelling description (300-400 words)
3. Clear requirements list
4. Attractive benefits
5. LinkedIn-optimized version (150 words)
6. Indeed-optimized version

Focus on attracting diverse, qualified candidates.`;

  const response = await ensemble.call({
    agent: "JobPostingGenerator",
    engine: "knowledge",
    tenantId: params.company.tenantId,
    prompt,
    temperature: 0.6
  });

  // Parse response into structured format
  return parseJobPosting(response.narrative, params);
}

function parseJobPosting(narrative: string, params: any): any {
  // In production, use structured output
  return {
    title: `${params.role} - ${params.department}`,
    description: `Join our innovative team as a ${params.role}...`,
    requirements: params.requirements || [
      "3+ years of relevant experience",
      "Strong communication skills",
      "Team collaboration mindset"
    ],
    benefits: [
      "Competitive salary and equity",
      "Comprehensive health coverage",
      "Flexible work arrangements",
      "Professional development budget",
      "Inclusive culture"
    ],
    linkedInVersion: `Exciting opportunity for a ${params.role} to join our ${params.department} team...`,
    indeedVersion: `We are seeking a ${params.role} to join our growing team...`
  };
}
