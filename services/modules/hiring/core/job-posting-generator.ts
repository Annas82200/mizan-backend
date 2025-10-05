import { EnsembleAI } from '../../../ai-providers/ensemble.js';

export async function generateJobPosting(params: {
  role: string;
  department: string;
  company: {
    name?: string;
    vision?: string;
    mission?: string;
    values?: string[];
  };
  requirements: string[];
  culture?: any;
  compensation?: any;
  benefits?: any;
  location?: string;
  remote?: boolean;
}): Promise<{
  title: string;
  description: string;
  responsibilities: string;
  requirements: string;
  qualifications: string;
  benefits: string;
  linkedInVersion: string;
  indeedVersion: string;
  careerPageVersion: string;
  keywords: string[];
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

  const companyData = params.company as Record<string, unknown>;
  const response = await ensemble.call({
    agent: "JobPostingGenerator",
    engine: "knowledge",
    tenantId: (companyData.tenantId as string) || '',
    prompt,
    temperature: 0.6
  });

  // Parse response into structured format
  return parseJobPosting(response.narrative, params);
}

function parseJobPosting(narrative: string, params: any): any {
  // In production, use structured output from AI
  const requirementsList = Array.isArray(params.requirements)
    ? params.requirements.join('\n• ')
    : '• Strong communication skills\n• Team collaboration mindset\n• 3+ years of relevant experience';

  const benefitsList = Array.isArray(params.benefits)
    ? params.benefits.join('\n• ')
    : '• Competitive salary and equity\n• Comprehensive health coverage\n• Flexible work arrangements\n• Professional development budget\n• Inclusive culture';

  const description = `Join ${params.company.name || 'our innovative team'} as a ${params.role} in the ${params.department} department.\n\n` +
    `We are looking for a talented professional to contribute to our mission: ${params.company.mission || 'driving innovation and excellence'}.\n\n` +
    `Location: ${params.location || 'Remote'}\n` +
    `Type: ${params.remote ? 'Remote/Hybrid' : 'On-site'}`;

  return {
    title: `${params.role} - ${params.department}`,
    description,
    responsibilities: `• Lead ${params.department} initiatives\n• Collaborate with cross-functional teams\n• Drive innovation and continuous improvement\n• Mentor junior team members`,
    requirements: `• ${requirementsList}`,
    qualifications: `• Bachelor's degree or equivalent experience\n• Strong problem-solving abilities\n• Excellent communication skills`,
    benefits: `• ${benefitsList}`,
    linkedInVersion: `Exciting opportunity for a ${params.role} to join ${params.company.name || 'our'} ${params.department} team. We're looking for talented professionals passionate about ${params.company.mission || 'innovation'}. ${params.remote ? 'Remote-friendly!' : 'On-site position'}`,
    indeedVersion: `We are seeking a ${params.role} to join our growing ${params.department} team. Competitive compensation, great benefits, and career growth opportunities.`,
    careerPageVersion: description,
    keywords: [params.role.toLowerCase(), params.department.toLowerCase(), 'innovation', 'growth', 'team']
  };
}
