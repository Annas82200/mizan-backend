// server/services/results/unified-results.ts

import { ArchitectAIResult } from '../orchestrator/architect-ai';
import { logger } from '../logger';

export interface UnifiedResults {
  overall_health_score: number;
  trend: 'improving' | 'steady' | 'declining';
  highlights: string[];
  detailed_analysis: {
    structure: AnalysisSection;
    culture: AnalysisSection;
    skills: AnalysisSection;
    engagement?: AnalysisSection;
    recognition?: AnalysisSection;
    performance?: AnalysisSection;
    benchmarking?: AnalysisSection;
  };
  recommendations: Recommendation[];
  action_items: ActionItem[];
  next_review_date: Date;
  confidence_score: number;
}

export interface AnalysisSection {
  score: number;
  status: 'healthy' | 'needs_attention' | 'critical';
  key_findings: string[];
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  risks: string[];
  recommendations?: string[];
  gaps?: string[];
}

export interface Recommendation {
  id: string;
  category: 'structure' | 'culture' | 'skills' | 'engagement' | 'recognition' | 'performance' | 'benchmarking' | 'hiring' | 'talent' | 'lxp' | 'retention';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expected_impact: string;
  timeline: string;
  resources_needed: string[];
  success_metrics: string[];
}

export interface ActionItem {
  id: string;
  recommendation_id: string;
  title: string;
  description: string;
  assignee?: string;
  due_date: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
}

export async function buildUnifiedResults(architectResult: ArchitectAIResult): Promise<UnifiedResults> {
  logger.info('Building unified results from Architect AI output');
  
  try {
    // Calculate overall health score
    const overall_health_score = architectResult.overall_health_score;
    
    // Determine trend (simplified - would use historical data in real implementation)
    const trend = determineTrend(overall_health_score);
    
    // Extract highlights
    const highlights = extractHighlights(architectResult);
    
    // Build detailed analysis sections
    const detailed_analysis = {
      structure: buildAnalysisSection(architectResult.structure as unknown as SectionData, 'structure'),
      culture: buildAnalysisSection(architectResult.culture as unknown as SectionData, 'culture'),
      skills: buildAnalysisSection(architectResult.skills as unknown as SectionData, 'skills'),
      engagement: architectResult.engagement ? buildAnalysisSection(architectResult.engagement as unknown as SectionData, 'engagement') : undefined,
      recognition: architectResult.recognition ? buildAnalysisSection(architectResult.recognition as unknown as SectionData, 'recognition') : undefined,
      performance: architectResult.performance ? buildAnalysisSection(architectResult.performance as unknown as SectionData, 'performance') : undefined,
      benchmarking: architectResult.benchmarking ? buildAnalysisSection(architectResult.benchmarking as unknown as SectionData, 'benchmarking') : undefined,
    };
    
    // Generate recommendations
    const recommendations = generateRecommendations(architectResult);
    
    // Create action items
    const action_items = generateActionItems(recommendations);
    
    // Set next review date (3 months from now)
    const next_review_date = new Date();
    next_review_date.setMonth(next_review_date.getMonth() + 3);
    
    const unifiedResults: UnifiedResults = {
      overall_health_score,
      trend,
      highlights,
      detailed_analysis,
      recommendations,
      action_items,
      next_review_date,
      confidence_score: architectResult.confidence
    };
    
    logger.info(`Unified results built with health score: ${overall_health_score}`);
    
    return unifiedResults;
    
  } catch (error) {
    logger.error('Failed to build unified results:', error);
    throw error;
  }
}

function determineTrend(healthScore: number): 'improving' | 'steady' | 'declining' {
  // Simplified trend calculation - would use historical data in real implementation
  if (healthScore >= 0.8) return 'improving';
  if (healthScore >= 0.6) return 'steady';
  return 'declining';
}

function extractHighlights(architectResult: ArchitectAIResult): string[] {
  const highlights: string[] = [];
  
  if (architectResult.structure) {
    const structureScore = (architectResult.structure as { healthScore?: number }).healthScore || 0;
    if (structureScore >= 0.8) {
      highlights.push('Organizational structure is well-aligned with strategy');
    } else {
      highlights.push('Structural improvements needed for strategy execution');
    }
  }
  
  if (architectResult.culture) {
    const cultureScore = (architectResult.culture as { healthScore?: number }).healthScore || 0;
    if (cultureScore >= 0.8) {
      highlights.push('Strong cultural alignment supports strategic goals');
    } else {
      highlights.push('Culture-strategy alignment requires attention');
    }
  }
  
  if (architectResult.skills) {
    const skillsScore = (architectResult.skills as { coverageScore?: number }).coverageScore || 0;
    if (skillsScore >= 0.8) {
      highlights.push('Organization has the right skills for strategic success');
    } else {
      highlights.push('Critical skill gaps identified that need addressing');
    }
  }
  
  return highlights;
}

interface SectionData {
  score?: number;
  status?: string;
  findings?: Array<{ title: string; description: string; severity?: string }>;
  strengths?: string[];
  weaknesses?: string[];
  gaps?: Array<{ area: string; impact: string; description: string }>;
  recommendations?: Array<{ title?: string; description?: string; priority?: string }>;
  metrics?: Record<string, number | string>;
  healthScore?: number;
  alignmentScore?: number;
  coverageScore?: number;
  criticalGaps?: string[];
  hiringNeeds?: unknown[];
  interventions?: unknown[];
  trainingNeeds?: unknown[];
  culturalEntropy?: number;
  [key: string]: unknown;
}

function buildAnalysisSection(sectionData: SectionData, category: string): AnalysisSection {
  if (!sectionData) {
    return {
      score: 0,
      status: 'critical',
      key_findings: ['Analysis not available'],
      strengths: [],
      weaknesses: ['Data not available'],
      opportunities: [],
      risks: ['Unable to assess due to missing data']
    };
  }
  
  const score = sectionData.healthScore || sectionData.alignmentScore || sectionData.coverageScore || 0;
  
  let status: 'healthy' | 'needs_attention' | 'critical';
  if (score >= 0.8) status = 'healthy';
  else if (score >= 0.6) status = 'needs_attention';
  else status = 'critical';
  
  // Map recommendations with priority field, or use empty array
  const key_findings: string[] = sectionData.recommendations
    ? sectionData.recommendations.map(r => r.title || r.description || '')
    : [];
    
  const strengths: string[] = sectionData.strengths || [];
  const weaknesses: string[] = [...(sectionData.weaknesses || []), ...(sectionData.criticalGaps || [])];
  
  return {
    score,
    status,
    key_findings,
    strengths,
    weaknesses,
    opportunities: generateOpportunities(sectionData, category),
    risks: generateRisks(sectionData, category)
  };
}

function generateOpportunities(sectionData: SectionData, category: string): string[] {
  const opportunities: string[] = [];
  
  switch (category) {
    case 'structure':
      if (Array.isArray(sectionData.hiringNeeds) && sectionData.hiringNeeds.length > 0) {
        opportunities.push('Strategic hiring can strengthen organizational capabilities');
      }
      break;
    case 'culture':
      if (Array.isArray(sectionData.interventions) && sectionData.interventions.length > 0) {
        opportunities.push('Targeted culture interventions can improve alignment');
      }
      break;
    case 'skills':
      if (Array.isArray(sectionData.trainingNeeds) && sectionData.trainingNeeds.length > 0) {
        opportunities.push('Training programs can address skill gaps');
      }
      break;
  }
  
  return opportunities;
}

function generateRisks(sectionData: SectionData, category: string): string[] {
  const risks: string[] = [];
  
  switch (category) {
    case 'structure':
      if (Array.isArray(sectionData.gaps) && sectionData.gaps.some((gap) => gap.impact === 'high')) {
        risks.push('Structural gaps may impede strategy execution');
      }
      break;
    case 'culture':
      if (typeof sectionData.culturalEntropy === 'number' && sectionData.culturalEntropy > 0.3) {
        risks.push('High cultural entropy may lead to misalignment');
      }
      break;
    case 'skills':
      if (Array.isArray(sectionData.criticalGaps) && sectionData.criticalGaps.length > 0) {
        risks.push('Critical skill gaps pose strategic risks');
      }
      break;
  }
  
  return risks;
}

function generateRecommendations(architectResult: ArchitectAIResult): Recommendation[] {
  const recommendations: Recommendation[] = [];
  
  // Structure recommendations
  if (architectResult.structure) {
    const structureData = architectResult.structure as unknown as SectionData;
    if (Array.isArray(structureData.gaps) && structureData.gaps.length > 0) {
      recommendations.push({
        id: 'struct-001',
        category: 'structure',
        priority: 'high',
        title: 'Address Structural Gaps',
        description: 'Resolve identified structural gaps to improve organizational effectiveness',
        expected_impact: 'Improved strategy execution and operational efficiency',
        timeline: '3-6 months',
        resources_needed: ['HR support', 'Management time', 'Budget for restructuring'],
        success_metrics: ['Reduced structural gaps', 'Improved reporting efficiency', 'Enhanced decision-making speed']
      });
    }
    
    if (Array.isArray(structureData.hiringNeeds) && structureData.hiringNeeds.length > 0) {
      recommendations.push({
        id: 'struct-002',
        category: 'structure',
        priority: 'medium',
        title: 'Strategic Hiring Initiative',
        description: 'Fill critical positions identified in the analysis',
        expected_impact: 'Strengthened organizational capabilities',
        timeline: '6-12 months',
        resources_needed: ['Recruitment budget', 'HR team', 'Interview panels'],
        success_metrics: ['Key positions filled', 'Reduced workload on existing staff', 'Improved team performance']
      });
    }
  }
  
  // Culture recommendations
  if (architectResult.culture) {
    const cultureScore = (architectResult.culture as { healthScore?: number }).healthScore || 0;
    if (cultureScore < 0.8) {
      recommendations.push({
        id: 'culture-001',
        category: 'culture',
        priority: 'high',
        title: 'Culture-Strategy Alignment Program',
        description: 'Implement interventions to improve culture-strategy alignment',
        expected_impact: 'Enhanced employee engagement and strategic execution',
        timeline: '6-12 months',
        resources_needed: ['Culture consultant', 'Training budget', 'Leadership commitment'],
        success_metrics: ['Improved culture scores', 'Increased employee engagement', 'Better strategy execution']
      });
    }
  }
  
  // Skills recommendations
  if (architectResult.skills) {
    const skillsData = architectResult.skills as unknown as SectionData;
    if (Array.isArray(skillsData.criticalGaps) && skillsData.criticalGaps.length > 0) {
      recommendations.push({
        id: 'skills-001',
        category: 'skills',
        priority: 'high',
        title: 'Critical Skills Development Program',
        description: 'Address identified critical skill gaps through targeted training',
        expected_impact: 'Improved organizational capability and performance',
        timeline: '3-9 months',
        resources_needed: ['Training budget', 'Learning resources', 'Employee time'],
        success_metrics: ['Reduced skill gaps', 'Improved performance metrics', 'Increased employee confidence']
      });
    }
  }
  
  return recommendations;
}

function generateActionItems(recommendations: Recommendation[]): ActionItem[] {
  const actionItems: ActionItem[] = [];
  
  recommendations.forEach(rec => {
    // Create initial action item for each recommendation
    actionItems.push({
      id: `action-${rec.id}`,
      recommendation_id: rec.id,
      title: `Initiate ${rec.title}`,
      description: `Begin implementation of ${rec.title}`,
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      status: 'pending',
      priority: rec.priority
    });
    
    // Add follow-up action items based on recommendation type
    if (rec.category === 'structure' && rec.id === 'struct-001') {
      actionItems.push({
        id: `action-${rec.id}-followup`,
        recommendation_id: rec.id,
        title: 'Complete Structural Assessment',
        description: 'Conduct detailed assessment of current structure and identify specific changes needed',
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        status: 'pending',
        priority: 'high'
      });
    }
  });
  
  return actionItems;
}