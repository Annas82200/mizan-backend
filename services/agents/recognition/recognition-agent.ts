import { EnsembleAI } from "../../ai-providers/ensemble.js";
import { readFile } from 'fs/promises';
import { join } from 'path';

// Load Mizan 7-Cylinder Framework from JSON file
let DEFAULT_VALUES_FRAMEWORK: any = [];
try {
  const frameworkPath = join(process.cwd(), 'mizan-framework-updated.json');
  const frameworkData = await readFile(frameworkPath, 'utf-8');
  DEFAULT_VALUES_FRAMEWORK = JSON.parse(frameworkData);
} catch (error) {
  console.error('Failed to load Mizan framework:', error);
  DEFAULT_VALUES_FRAMEWORK = [];
}

export type RecognitionChannels = {
  peerToPeer: number;
  managerToEmployee: number;
  publicRecognition: number;
  privateRecognition: number;
  monetaryRewards: number;
  nonMonetaryRewards: number;
  formalPrograms: number;
  informalAppreciation: number;
};

export type RecognitionResult = {
  recognitionHealth: number; // 0..1
  channels: RecognitionChannels;
  frequency: RecognitionFrequency;
  quality: RecognitionQuality;
  gaps: string[];
  suggestions: string[];
  focusCylinder: number;
  culturalFit: CulturalFitAnalysis;
  impactAnalysis: RecognitionImpact;
  recommendations: string[];
  programs: RecognitionProgram[];
  triad: { consensus: string; confidence: number };
  score: number;
  confidence: number;
};

export type RecognitionFrequency = {
  daily: number;
  weekly: number;
  monthly: number;
  quarterly: number;
  annually: number;
  overall: "high" | "medium" | "low";
};

export type RecognitionQuality = {
  specificity: number;
  timeliness: number;
  authenticity: number;
  alignment: number;
  overall: number;
};

export type CulturalFitAnalysis = {
  alignment: number;
  preferredStyles: string[];
  mismatches: string[];
  recommendations: string[];
};

export type RecognitionImpact = {
  onEngagement: "high" | "medium" | "low";
  onRetention: "high" | "medium" | "low";
  onPerformance: "high" | "medium" | "low";
  estimatedROI: number; // percentage
};

export type RecognitionProgram = {
  name: string;
  type: "peer" | "manager" | "public" | "milestone" | "values-based";
  description: string;
  targetCylinder: number;
  implementationTime: string;
  cost: "low" | "medium" | "high";
  expectedImpact: "high" | "medium" | "low";
};

export async function analyzeRecognition(input: {
  surveyData?: any;
  recognitionData?: any;
  tenantId?: string;
  culturalValues?: string[];
}): Promise<RecognitionResult> {
  // Process recognition data
  const channels = analyzeRecognitionChannels(input.surveyData, input.recognitionData);
  const frequency = analyzeFrequency(input.recognitionData);
  const quality = await analyzeQuality(channels, frequency, input.tenantId);
  
  // Calculate overall health
  const recognitionHealth = calculateRecognitionHealth(channels, frequency, quality);
  
  // Identify gaps and opportunities
  const gapsAnalysis = identifyGaps(channels, frequency, quality);
  
  // Cultural fit analysis
  const culturalFit = await analyzeCulturalFit(
    channels, 
    input.culturalValues || [],
    input.tenantId
  );
  
  // Impact analysis
  const impactAnalysis = await analyzeImpact(
    recognitionHealth,
    channels,
    quality,
    input.tenantId
  );
  
  // Determine focus cylinder
  const focusCylinder = determineFocusCylinder(channels, quality, culturalFit);
  
  // Generate program recommendations
  const programs = await generatePrograms(
    gapsAnalysis,
    culturalFit,
    focusCylinder,
    input.tenantId
  );
  
  // AI-powered suggestions
  const aiSuggestions = await getRecognitionInsights(
    channels,
    quality,
    gapsAnalysis,
    input.tenantId
  );
  
  // Run ensemble AI analysis
  const ensemble = new EnsembleAI({
    strategy: "weighted",
    providers: ["openai", "anthropic", "gemini"]
  });

  const triadResponse = await ensemble.call({
    agent: "Recognition",
    engine: "reasoning",
    tenantId: input.tenantId,
    prompt: `Analyze recognition systems and recommend improvements aligned with ${DEFAULT_VALUES_FRAMEWORK[focusCylinder - 1]?.name} values.

Context:
- Health: ${Math.round(recognitionHealth * 100)}%
- Top channel: ${getTopChannel(channels)}
- Quality score: ${Math.round(quality.overall * 100)}%
- Impact on engagement: ${impactAnalysis.onEngagement}`,
    temperature: 0.7,
    maxTokens: 2000
  });

  const triad = {
    consensus: triadResponse.narrative,
    confidence: triadResponse.confidence
  };

  // Compile recommendations
  const recommendations = compileRecommendations(
    gapsAnalysis,
    culturalFit,
    impactAnalysis,
    programs,
    aiSuggestions
  );

  return {
    recognitionHealth,
    channels,
    frequency,
    quality,
    gaps: gapsAnalysis.gaps,
    suggestions: [...gapsAnalysis.suggestions, ...aiSuggestions.suggestions],
    focusCylinder,
    culturalFit,
    impactAnalysis,
    recommendations,
    programs,
    triad,
    score: recognitionHealth,
    confidence: triad.confidence
  };
}

function analyzeRecognitionChannels(surveyData?: any, recognitionData?: any): RecognitionChannels {
  // Default values if no data provided
  const defaults: RecognitionChannels = {
    peerToPeer: 0.45,
    managerToEmployee: 0.60,
    publicRecognition: 0.35,
    privateRecognition: 0.55,
    monetaryRewards: 0.40,
    nonMonetaryRewards: 0.50,
    formalPrograms: 0.45,
    informalAppreciation: 0.65
  };

  if (!surveyData && !recognitionData) return defaults;

  // Process survey data
  const channels: RecognitionChannels = { ...defaults };
  
  if (surveyData) {
    channels.peerToPeer = surveyData.peer_recognition || surveyData.colleague_appreciation || defaults.peerToPeer;
    channels.managerToEmployee = surveyData.manager_recognition || surveyData.supervisor_feedback || defaults.managerToEmployee;
    channels.publicRecognition = surveyData.public_praise || surveyData.team_recognition || defaults.publicRecognition;
    channels.privateRecognition = surveyData.private_feedback || surveyData.one_on_one || defaults.privateRecognition;
  }

  // Process actual recognition data
  if (recognitionData?.events) {
    const totalEvents = recognitionData.events.length || 1;
    const peerEvents = recognitionData.events.filter((e: any) => e.type === 'peer').length;
    const managerEvents = recognitionData.events.filter((e: any) => e.type === 'manager').length;
    
    channels.peerToPeer = Math.min(1, peerEvents / (totalEvents * 0.5)); // Expect 50% peer
    channels.managerToEmployee = Math.min(1, managerEvents / (totalEvents * 0.3)); // Expect 30% manager
  }

  return channels;
}

function analyzeFrequency(recognitionData?: any): RecognitionFrequency {
  const frequency: RecognitionFrequency = {
    daily: 0,
    weekly: 0,
    monthly: 0,
    quarterly: 0,
    annually: 0,
    overall: "low"
  };

  if (!recognitionData?.events) {
    // Default distribution
    frequency.weekly = 0.20;
    frequency.monthly = 0.40;
    frequency.quarterly = 0.25;
    frequency.annually = 0.15;
  } else {
    // Analyze actual frequency
    const now = new Date();
    const events = recognitionData.events || [];
    
    events.forEach((event: any) => {
      const eventDate = new Date(event.date);
      const daysDiff = Math.floor((now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 1) frequency.daily++;
      else if (daysDiff <= 7) frequency.weekly++;
      else if (daysDiff <= 30) frequency.monthly++;
      else if (daysDiff <= 90) frequency.quarterly++;
      else frequency.annually++;
    });

    // Normalize
    const total = events.length || 1;
    frequency.daily /= total;
    frequency.weekly /= total;
    frequency.monthly /= total;
    frequency.quarterly /= total;
    frequency.annually /= total;
  }

  // Determine overall frequency
  const avgFrequency = frequency.daily * 5 + frequency.weekly * 3 + frequency.monthly * 1;
  if (avgFrequency > 2) frequency.overall = "high";
  else if (avgFrequency > 0.5) frequency.overall = "medium";
  else frequency.overall = "low";

  return frequency;
}

async function analyzeQuality(
  channels: RecognitionChannels,
  frequency: RecognitionFrequency,
  tenantId?: string
): Promise<RecognitionQuality> {
  const ensemble = new EnsembleAI({
    strategy: "weighted",
    providers: ["claude", "openai"]
  });

  const prompt = `Assess recognition quality based on:
- Peer recognition: ${Math.round(channels.peerToPeer * 100)}%
- Manager recognition: ${Math.round(channels.managerToEmployee * 100)}%
- Frequency: ${frequency.overall}

Evaluate specificity, timeliness, authenticity, and values alignment.`;

  const response = await ensemble.call({
    agent: "Recognition",
    engine: "reasoning",
    tenantId,
    prompt,
    temperature: 0.3
  });

  // Parse AI insights and calculate quality metrics
  const quality: RecognitionQuality = {
    specificity: channels.publicRecognition > 0.5 ? 0.7 : 0.5,
    timeliness: frequency.overall === "high" ? 0.8 : frequency.overall === "medium" ? 0.6 : 0.4,
    authenticity: channels.peerToPeer > 0.6 ? 0.75 : 0.55,
    alignment: (channels.nonMonetaryRewards > channels.monetaryRewards) ? 0.7 : 0.5,
    overall: 0
  };

  // Calculate overall quality
  quality.overall = (
    quality.specificity * 0.25 +
    quality.timeliness * 0.25 +
    quality.authenticity * 0.30 +
    quality.alignment * 0.20
  );

  return quality;
}

function calculateRecognitionHealth(
  channels: RecognitionChannels,
  frequency: RecognitionFrequency,
  quality: RecognitionQuality
): number {
  // Weighted calculation
  const channelScore = (
    channels.peerToPeer * 0.25 +
    channels.managerToEmployee * 0.25 +
    channels.publicRecognition * 0.15 +
    channels.privateRecognition * 0.15 +
    channels.nonMonetaryRewards * 0.10 +
    channels.informalAppreciation * 0.10
  );

  const frequencyScore = frequency.overall === "high" ? 0.9 : 
                        frequency.overall === "medium" ? 0.6 : 0.3;

  const health = channelScore * 0.40 + frequencyScore * 0.30 + quality.overall * 0.30;

  return Math.max(0, Math.min(1, health));
}

function identifyGaps(
  channels: RecognitionChannels,
  frequency: RecognitionFrequency,
  quality: RecognitionQuality
): { gaps: string[]; suggestions: string[] } {
  const gaps: string[] = [];
  const suggestions: string[] = [];

  // Channel gaps
  if (channels.peerToPeer < 0.4) {
    gaps.push("Low peer-to-peer recognition");
    suggestions.push("Implement peer nomination system");
  }

  if (channels.managerToEmployee < 0.5) {
    gaps.push("Insufficient manager recognition");
    suggestions.push("Train managers on recognition best practices");
  }

  if (channels.publicRecognition < 0.3) {
    gaps.push("Lack of public celebration");
    suggestions.push("Create public recognition forums");
  }

  // Frequency gaps
  if (frequency.overall === "low") {
    gaps.push("Recognition too infrequent");
    suggestions.push("Set weekly recognition targets");
  }

  if (frequency.daily < 0.1 && frequency.weekly < 0.2) {
    gaps.push("Missing regular touchpoints");
    suggestions.push("Encourage daily appreciation practices");
  }

  // Quality gaps
  if (quality.specificity < 0.5) {
    gaps.push("Recognition lacks specificity");
    suggestions.push("Use STAR format for recognition");
  }

  if (quality.timeliness < 0.5) {
    gaps.push("Recognition not timely");
    suggestions.push("Recognize achievements within 48 hours");
  }

  if (quality.authenticity < 0.5) {
    gaps.push("Recognition feels inauthentic");
    suggestions.push("Focus on genuine, personal appreciation");
  }

  return { gaps, suggestions };
}

async function analyzeCulturalFit(
  channels: RecognitionChannels,
  culturalValues: string[],
  tenantId?: string
): Promise<CulturalFitAnalysis> {
  const ensemble = new EnsembleAI({
    strategy: "weighted",
    providers: ["claude", "gemini", "openai"]
  });

  const prompt = `Analyze cultural fit of recognition practices:
Current practices emphasize:
- Peer recognition: ${channels.peerToPeer > 0.6 ? "High" : "Low"}
- Public recognition: ${channels.publicRecognition > 0.5 ? "High" : "Low"}
- Monetary rewards: ${channels.monetaryRewards > 0.5 ? "High" : "Low"}

Cultural values: ${culturalValues.join(', ') || 'Not specified'}

Assess alignment and recommend culturally appropriate recognition styles.`;

  const response = await ensemble.call({
    agent: "Recognition",
    engine: "knowledge",
    tenantId,
    prompt,
    temperature: 0.4
  });

  // Determine preferred styles based on culture
  const preferredStyles: string[] = [];
  const mismatches: string[] = [];
  
  // Map cultural values to recognition styles
  const valueLower = culturalValues.map(v => v.toLowerCase()).join(' ');
  
  if (valueLower.includes('collaboration') || valueLower.includes('team')) {
    preferredStyles.push("Team-based recognition");
    if (channels.peerToPeer < 0.5) mismatches.push("Low peer recognition despite collaborative culture");
  }
  
  if (valueLower.includes('excellence') || valueLower.includes('achievement')) {
    preferredStyles.push("Performance-based recognition");
    if (channels.publicRecognition < 0.4) mismatches.push("Limited public celebration of achievements");
  }
  
  if (valueLower.includes('innovation') || valueLower.includes('creativity')) {
    preferredStyles.push("Innovation awards");
    preferredStyles.push("Risk-taking appreciation");
  }
  
  if (valueLower.includes('humility') || valueLower.includes('modest')) {
    preferredStyles.push("Private recognition");
    if (channels.publicRecognition > 0.7) mismatches.push("Excessive public recognition may conflict with humility values");
  }

  // Calculate alignment
  const alignment = 1 - (mismatches.length * 0.2);

  // Generate recommendations
  const recommendations = mismatches.map(mismatch => {
    if (mismatch.includes("peer recognition")) {
      return "Strengthen peer recognition programs to match collaborative culture";
    }
    if (mismatch.includes("public celebration")) {
      return "Increase visibility of achievements through town halls or newsletters";
    }
    if (mismatch.includes("humility")) {
      return "Shift focus to private, meaningful recognition";
    }
    return "Align recognition practices with stated values";
  });

  return {
    alignment: Math.max(0, alignment),
    preferredStyles,
    mismatches,
    recommendations
  };
}

async function analyzeImpact(
  recognitionHealth: number,
  channels: RecognitionChannels,
  quality: RecognitionQuality,
  tenantId?: string
): Promise<RecognitionImpact> {
  // Calculate impact based on research correlations
  let engagementImpact: "high" | "medium" | "low" = "low";
  let retentionImpact: "high" | "medium" | "low" = "low";
  let performanceImpact: "high" | "medium" | "low" = "low";

  // Recognition strongly correlates with engagement
  if (recognitionHealth > 0.7 && quality.overall > 0.7) {
    engagementImpact = "high";
    retentionImpact = "high";
  } else if (recognitionHealth > 0.5) {
    engagementImpact = "medium";
    retentionImpact = "medium";
  }

  // Performance impact depends on quality and alignment
  if (quality.specificity > 0.7 && quality.alignment > 0.7) {
    performanceImpact = "high";
  } else if (quality.overall > 0.5) {
    performanceImpact = "medium";
  }

  // Calculate estimated ROI
  let estimatedROI = 0;
  
  // Based on research: effective recognition can improve productivity by 15-25%
  if (engagementImpact === "high") estimatedROI += 20;
  else if (engagementImpact === "medium") estimatedROI += 10;
  
  // Retention impact: reducing turnover saves 50-200% of annual salary
  if (retentionImpact === "high") estimatedROI += 30;
  else if (retentionImpact === "medium") estimatedROI += 15;
  
  // Performance improvements
  if (performanceImpact === "high") estimatedROI += 15;
  else if (performanceImpact === "medium") estimatedROI += 8;

  return {
    onEngagement: engagementImpact,
    onRetention: retentionImpact,
    onPerformance: performanceImpact,
    estimatedROI
  };
}

function determineFocusCylinder(
  channels: RecognitionChannels,
  quality: RecognitionQuality,
  culturalFit: CulturalFitAnalysis
): number {
  // Map recognition patterns to cylinders
  if (channels.peerToPeer > 0.7) return 2; // Belonging
  if (quality.specificity > 0.8 && quality.alignment > 0.8) return 3; // Mastery
  if (channels.publicRecognition > 0.7) return 5; // Purpose
  if (channels.informalAppreciation > 0.8) return 2; // Belonging
  if (culturalFit.preferredStyles.includes("Innovation awards")) return 6; // Evolution
  
  // Default to Belonging as recognition primarily drives belonging
  return 2;
}

async function generatePrograms(
  gapsAnalysis: any,
  culturalFit: CulturalFitAnalysis,
  focusCylinder: number,
  tenantId?: string
): Promise<RecognitionProgram[]> {
  const programs: RecognitionProgram[] = [];

  // Core programs based on gaps
  if (gapsAnalysis.gaps.includes("Low peer-to-peer recognition")) {
    programs.push({
      name: "Peer Excellence Awards",
      type: "peer",
      description: "Monthly peer-nominated awards celebrating collaboration and support",
      targetCylinder: 2,
      implementationTime: "1 month",
      cost: "low",
      expectedImpact: "high"
    });
  }

  // Values-based recognition
  const cylinderInfo = DEFAULT_VALUES_FRAMEWORK[focusCylinder - 1];
  if (cylinderInfo) {
    programs.push({
      name: `${cylinderInfo.name} Champions`,
      type: "values-based",
      description: `Quarterly awards recognizing employees who exemplify ${cylinderInfo.name} values`,
      targetCylinder: focusCylinder,
      implementationTime: "2 months",
      cost: "medium",
      expectedImpact: "high"
    });
  }

  // Cultural fit programs
  for (const style of culturalFit.preferredStyles.slice(0, 2)) {
    if (style === "Team-based recognition") {
      programs.push({
        name: "Team Achievement Celebrations",
        type: "public",
        description: "Monthly team success celebrations with cross-team visibility",
        targetCylinder: 2,
        implementationTime: "1 month",
        cost: "medium",
        expectedImpact: "medium"
      });
    } else if (style === "Innovation awards") {
      programs.push({
        name: "Innovation Spotlight",
        type: "public",
        description: "Bi-monthly showcase of innovative solutions and risk-taking",
        targetCylinder: 6,
        implementationTime: "2 months",
        cost: "low",
        expectedImpact: "medium"
      });
    }
  }

  // Milestone recognition
  programs.push({
    name: "Milestone Moments",
    type: "milestone",
    description: "Automated recognition for tenure, project completions, and achievements",
    targetCylinder: 7,
    implementationTime: "3 months",
    cost: "low",
    expectedImpact: "medium"
  });

  // Manager excellence
  if (gapsAnalysis.gaps.includes("Insufficient manager recognition")) {
    programs.push({
      name: "Recognition Coach",
      type: "manager",
      description: "Manager training and tools for effective, timely recognition",
      targetCylinder: 4,
      implementationTime: "2 months",
      cost: "medium",
      expectedImpact: "high"
    });
  }

  return programs.slice(0, 5); // Top 5 programs
}

async function getRecognitionInsights(
  channels: RecognitionChannels,
  quality: RecognitionQuality,
  gapsAnalysis: any,
  tenantId?: string
): Promise<{ suggestions: string[] }> {
  const ensemble = new EnsembleAI({
    strategy: "weighted",
    providers: ["claude", "openai", "gemini", "mistral"]
  });

  const prompt = `Based on recognition analysis:
- Top performing channel: ${getTopChannel(channels)}
- Quality score: ${Math.round(quality.overall * 100)}%
- Main gaps: ${gapsAnalysis.gaps.slice(0, 3).join(', ')}

Provide 3-4 innovative recognition strategies.`;

  const response = await ensemble.call({
    agent: "Recognition",
    engine: "reasoning",
    tenantId,
    prompt,
    temperature: 0.5
  });

  // Extract suggestions
  const suggestions = response.narrative
    .split(/\d+\.|•|-/)
    .map((s: any) => s.trim())
    .filter((s: any) => s.length > 20)
    .slice(0, 4);

  return { suggestions };
}

function getTopChannel(channels: RecognitionChannels): string {
  const channelScores = Object.entries(channels);
  const top = channelScores.sort((a, b) => b[1] - a[1])[0];
  return top[0].replace(/([A-Z])/g, ' $1').trim();
}

function compileRecommendations(
  gapsAnalysis: any,
  culturalFit: CulturalFitAnalysis,
  impactAnalysis: RecognitionImpact,
  programs: RecognitionProgram[],
  aiSuggestions: any
): string[] {
  const recommendations: string[] = [];

  // High-impact quick wins
  const quickWin = programs.find(p => p.implementationTime.includes("1 month") && p.expectedImpact === "high");
  if (quickWin) {
    recommendations.push(`Quick win: Launch "${quickWin.name}" within 30 days for immediate impact`);
  }

  // Address critical gaps
  if (gapsAnalysis.gaps.length > 0) {
    recommendations.push(`Priority: Address "${gapsAnalysis.gaps[0]}" through targeted interventions`);
  }

  // Cultural alignment
  if (culturalFit.mismatches.length > 0) {
    recommendations.push(`Realign recognition with culture: ${culturalFit.recommendations[0]}`);
  }

  // ROI focus
  if (impactAnalysis.estimatedROI > 30) {
    recommendations.push(`Recognition improvements could yield ${impactAnalysis.estimatedROI}% ROI through engagement and retention gains`);
  }

  // Innovation
  if (aiSuggestions.suggestions.length > 0) {
    recommendations.push(aiSuggestions.suggestions[0]);
  }

  return recommendations.slice(0, 5);
}
