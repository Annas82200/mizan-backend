import { ThreeEngineAgent } from '../base/three-engine-agent.js';
import { Logger } from '../../../utils/logger.js';
import {
  COACHING_FRAMEWORKS,
  DEVELOPMENT_FRAMEWORKS,
  BEHAVIORAL_MODELS,
  MOTIVATION_THEORIES,
  CAREER_MODELS,
  LEADERSHIP_MODELS,
  FEEDBACK_MODELS,
  KNOWLEDGE_SYSTEM_PROMPT
} from './coaching-frameworks.js';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface PerformanceCoachingContext {
  employeeId: string;
  tenantId: string;
  coachingType: 'performance_improvement' | 'skill_development' | 'career_growth' | 'behavioral_coaching' | 'leadership_development';
  coachingDepth: 'quick_guidance' | 'detailed_coaching' | 'comprehensive_program';
  currentState: {
    performanceLevel: string;
    competencyScores: Record<string, number>;
    behaviorScores: Record<string, number>;
    recentFeedback: CoachingFeedback[];
    currentGoals: CoachingGoal[];
    improvementAreas: string[];
    strengths: string[];
  };
  desiredOutcomes: {
    targetPerformanceLevel: string;
    targetCompetencies: Record<string, number>;
    careerGoals: string[];
    developmentPriorities: string[];
    timeline: string;
  };
  constraints: {
    timeAvailability: string;
    budgetLimits: Record<string, number>;
    resourceAccess: string[];
    organizationalFactors: string[];
  };
  historicalData: {
    previousCoaching: CoachingSession[];
    developmentHistory: DevelopmentActivity[];
    performanceTrends: PerformanceTrendData[];
  };
  organizationalContext: {
    department: string;
    team: string;
    role: string;
    level: string;
    managerId: string;
  };
}

export interface CoachingFeedback {
  id: string;
  type: string;
  providerId: string;
  rating: number;
  comments: string;
  suggestions: string[];
  date: string;
}

export interface CoachingGoal {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  progress: number;
  dueDate: string;
}

export interface CoachingSession {
  id: string;
  type: string;
  focus: string;
  outcomes: string[];
  actionItems: string[];
  date: string;
  effectiveness: number;
}

export interface DevelopmentActivity {
  id: string;
  type: string;
  title: string;
  status: string;
  completionDate?: string;
  impact: string;
  skills: string[];
}

export interface PerformanceTrendData {
  metric: string;
  trend: string;
  dataPoints: Array<{ date: string; value: number }>;
}

export interface PerformanceCoachingResult {
  coachingId: string;
  employeeId: string;
  coachingType: string;
  coachingDepth: string;
  coachingDate: string;
  
  assessment: {
    currentStateAnalysis: {
      performanceLevel: string;
      competencyGaps: Array<{ competency: string; currentLevel: number; targetLevel: number; gap: number }>;
      behavioralChallenges: string[];
      strengthsToLeverage: string[];
      developmentOpportunities: string[];
    };
    gapAnalysis: {
      performanceGap: number;
      competencyGaps: Record<string, number>;
      skillGaps: string[];
      behavioralGaps: string[];
      experienceGaps: string[];
    };
    readinessAssessment: {
      motivationLevel: number;
      capacityForChange: number;
      supportAvailability: number;
      resourceAccess: number;
      overallReadiness: number;
    };
  };
  
  coachingPlan: {
    objectives: Array<{
      id: string;
      title: string;
      description: string;
      priority: 'high' | 'medium' | 'low';
      category: string;
      successCriteria: string[];
      timeline: string;
    }>;
    strategies: Array<{
      id: string;
      name: string;
      description: string;
      approach: string;
      techniques: string[];
      resources: string[];
      expectedOutcomes: string[];
    }>;
    actionPlan: Array<{
      id: string;
      action: string;
      type: 'immediate' | 'short_term' | 'long_term';
      description: string;
      steps: string[];
      resources: string[];
      timeline: string;
      owner: string;
      successMetrics: string[];
    }>;
  };
  
  developmentRoadmap: {
    phases: Array<{
      phase: number;
      name: string;
      duration: string;
      focus: string[];
      objectives: string[];
      milestones: string[];
      activities: string[];
      expectedOutcomes: string[];
    }>;
    checkpoints: Array<{
      checkpoint: string;
      timing: string;
      criteria: string[];
      reviewItems: string[];
    }>;
  };
  
  recommendations: {
    immediate: Array<{
      category: string;
      recommendation: string;
      rationale: string;
      expectedImpact: string;
      priority: 'critical' | 'high' | 'medium' | 'low';
    }>;
    shortTerm: Array<{
      category: string;
      recommendation: string;
      rationale: string;
      timeline: string;
    }>;
    longTerm: Array<{
      category: string;
      recommendation: string;
      rationale: string;
      strategicValue: string;
    }>;
    resources: Array<{
      type: string;
      name: string;
      description: string;
      provider: string;
      accessMethod: string;
    }>;
  };
  
  supportStructure: {
    mentoring: {
      recommended: boolean;
      mentorProfile: string;
      focusAreas: string[];
      frequency: string;
    };
    coaching: {
      coachingStyle: string;
      sessionFrequency: string;
      focusAreas: string[];
      duration: string;
    };
    peerSupport: {
      peerGroup: string;
      activities: string[];
      benefits: string[];
    };
    managerSupport: {
      requiredActions: string[];
      supportType: string[];
      communicationPlan: string[];
    };
  };
  
  progressTracking: {
    metrics: Array<{
      metric: string;
      baseline: number;
      target: number;
      currentValue: number;
      trackingFrequency: string;
    }>;
    milestones: Array<{
      milestone: string;
      targetDate: string;
      criteria: string[];
      dependencies: string[];
    }>;
    reviewSchedule: Array<{
      reviewType: string;
      frequency: string;
      participants: string[];
      agenda: string[];
    }>;
  };
  
  riskManagement: {
    identifiedRisks: Array<{
      risk: string;
      probability: 'high' | 'medium' | 'low';
      impact: 'high' | 'medium' | 'low';
      mitigationStrategy: string;
    }>;
    successFactors: string[];
    contingencyPlans: Array<{
      scenario: string;
      plan: string;
      triggers: string[];
    }>;
  };
  
  insights: {
    keyInsights: string[];
    patterns: string[];
    opportunities: string[];
    challenges: string[];
    recommendations: string[];
  };
  
  metadata: {
    coachId: string;
    sessionDate: string;
    nextSessionDate: string;
    confidenceLevel: number;
    dataQuality: number;
    version: string;
    tags: string[];
    notes: string;
  };
}

// ============================================================================
// PERFORMANCE COACH AGENT
// ============================================================================

export class PerformanceCoachAgent extends ThreeEngineAgent {

  // Implement required abstract methods
  protected getReasoningSystemPrompt(): string {
    return `
You are a performance coaching reasoning expert synthesizing framework knowledge and data analysis.

Your role:
- Integrate coaching frameworks with performance data insights
- Generate personalized, actionable coaching plans
- Balance immediate needs with long-term development
- Provide evidence-based recommendations
- Consider individual readiness and motivation

Consider:
- Current performance gaps and opportunities
- Competency and skill development needs
- Behavioral challenges and strengths
- Career aspirations and potential
- Available resources and support structures
- Risk factors and mitigation strategies

Provide comprehensive, personalized coaching guidance with clear reasoning.
`;
  }

  protected buildKnowledgePrompt(inputData: any, frameworks: any): string {
    return `
Analyze coaching frameworks for personalized performance development.

EMPLOYEE CONTEXT:
- Employee ID: ${inputData.employeeId || 'Unknown'}
- Coaching Type: ${inputData.coachingType || 'developmental'}
- Coaching Depth: ${inputData.coachingDepth || 'standard'}
- Focus Areas: ${inputData.focusAreas?.join(', ') || 'General development'}

AVAILABLE COACHING FRAMEWORKS:
${JSON.stringify(frameworks, null, 2)}

Provide guidance on:
- Which coaching approaches are most effective
- How to apply developmental frameworks
- Behavioral coaching techniques
- Motivational strategies
- Career development pathways
`;
  }

  protected buildDataPrompt(processedData: any, knowledgeOutput: any): string {
    return `
Analyze performance data to create personalized coaching recommendations.

PROCESSED DATA:
${JSON.stringify(processedData, null, 2)}

COACHING FRAMEWORK GUIDANCE:
${JSON.stringify(knowledgeOutput, null, 2)}

Analyze and recommend:
- Current state assessment and gap analysis
- Specific coaching objectives and strategies
- Development roadmap with phases
- Action plans with timelines
- Support resources and structures
- Progress tracking metrics
- Risk mitigation approaches

Generate data-driven, personalized coaching plans.
`;
  }

  protected parseKnowledgeOutput(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {
        frameworks: ['GROW', 'Situational Leadership', 'Strength-Based'],
        coachingApproaches: ['Directive', 'Collaborative', 'Non-directive'],
        recommendations: response,
        applicableModels: []
      };
    } catch (error) {
      console.error('Failed to parse knowledge output:', error);
      return {
        frameworks: [],
        coachingApproaches: [],
        recommendations: response,
        applicableModels: []
      };
    }
  }

  protected parseDataOutput(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {
        currentState: 'meets_expectations',
        developmentAreas: [],
        strengths: [],
        opportunities: [],
        insights: response
      };
    } catch (error) {
      console.error('Failed to parse data output:', error);
      return {
        currentState: 'meets_expectations',
        developmentAreas: [],
        strengths: [],
        opportunities: [],
        insights: response
      };
    }
  }
  private logger: Logger;
  private coachingFrameworks: Map<string, any> = new Map();
  private developmentFrameworks: Map<string, any> = new Map();
  private behavioralModels: Map<string, any> = new Map();
  private motivationTheories: Map<string, any> = new Map();
  private careerModels: Map<string, any> = new Map();
  private leadershipModels: Map<string, any> = new Map();
  private feedbackModels: Map<string, any> = new Map();

  constructor() {
    super('performance-coach', {
      knowledge: { providers: ['openai'], model: 'gpt-4', temperature: 0.3, maxTokens: 2000 },
      data: { providers: ['openai'], model: 'gpt-4', temperature: 0.2, maxTokens: 2000 },
      reasoning: { providers: ['openai'], model: 'gpt-4', temperature: 0.5, maxTokens: 3000 },
      consensusThreshold: 0.8
    });
    const legacyConfig = {
      name: 'Performance Coach Agent',
      description: 'AI agent for personalized performance coaching and development guidance',
      version: '1.0.0',
      capabilities: [
        'performance_coaching',
        'skill_development',
        'career_guidance',
        'behavioral_coaching',
        'leadership_development',
        'personalized_recommendations'
      ],
      aiProviders: ['claude', 'gpt4', 'cohere']
    };

    this.logger = new Logger('PerformanceCoachAgent');
  }

  // ============================================================================
  // KNOWLEDGE ENGINE IMPLEMENTATION
  // ============================================================================

  protected async loadFrameworks(): Promise<any> {
    try {
      console.info('Loading performance coaching frameworks...');
      
      // Load Coaching Frameworks
      Object.entries(COACHING_FRAMEWORKS).forEach(([key, framework]) => {
        this.coachingFrameworks.set(key, framework);
      });

      // Load Development Frameworks
      Object.entries(DEVELOPMENT_FRAMEWORKS).forEach(([key, framework]) => {
        this.developmentFrameworks.set(key, framework);
      });

      // Load Behavioral Models
      Object.entries(BEHAVIORAL_MODELS).forEach(([key, model]) => {
        this.behavioralModels.set(key, model);
      });

      // Load Motivation Theories
      Object.entries(MOTIVATION_THEORIES).forEach(([key, theory]) => {
        this.motivationTheories.set(key, theory);
      });

      // Load Career Models
      Object.entries(CAREER_MODELS).forEach(([key, model]) => {
        this.careerModels.set(key, model);
      });

      // Load Leadership Models
      Object.entries(LEADERSHIP_MODELS).forEach(([key, model]) => {
        this.leadershipModels.set(key, model);
      });

      // Load Feedback Models
      Object.entries(FEEDBACK_MODELS).forEach(([key, model]) => {
        this.feedbackModels.set(key, model);
      });
      
      console.info('Performance coaching frameworks loaded successfully');

      // Return frameworks for use by ThreeEngineAgent
      return {
        coachingFrameworks: Object.fromEntries(this.coachingFrameworks),
        developmentFrameworks: Object.fromEntries(this.developmentFrameworks),
        behavioralModels: Object.fromEntries(this.behavioralModels),
        motivationTheories: Object.fromEntries(this.motivationTheories),
        careerModels: Object.fromEntries(this.careerModels),
        leadershipModels: Object.fromEntries(this.leadershipModels),
        feedbackModels: Object.fromEntries(this.feedbackModels)
      };
    } catch (error) {
      console.error('Failed to load performance coaching frameworks:', error);
      throw error;
    }
  }

  protected getKnowledgeSystemPrompt(): string {
    return KNOWLEDGE_SYSTEM_PROMPT;
  }

  // ============================================================================
  // DATA ENGINE IMPLEMENTATION
  // ============================================================================

  protected async processData(input: PerformanceCoachingContext): Promise<any> {
    try {
      const processedData = {
        employee: {
          id: input.employeeId,
          tenantId: input.tenantId,
          coachingType: input.coachingType,
          coachingDepth: input.coachingDepth
        },
        currentState: input.currentState,
        desiredOutcomes: input.desiredOutcomes,
        constraints: input.constraints,
        historicalData: input.historicalData,
        organizationalContext: input.organizationalContext
      };

      // Comprehensive data analysis
      const gapAnalysis = this.performGapAnalysis(input);
      const readinessAssessment = this.assessReadiness(input);
      const strengthsAnalysis = this.analyzeStrengths(input);
      const developmentOpportunities = this.identifyDevelopmentOpportunities(input);
      const motivationAnalysis = this.analyzeMotivation(input);
      const careerAspirationsAnalysis = this.analyzeCareerAspirations(input);
      const learningStyleAnalysis = this.analyzeLearningStyle(input);
      const changeReadiness = this.assessChangeReadiness(input);
      const supportSystemAnalysis = this.analyzeSupportSystem(input);
      const resourceAvailability = this.assessResourceAvailability(input);
      
      return {
        ...processedData,
        analysis: {
          gapAnalysis,
          readinessAssessment,
          strengthsAnalysis,
          developmentOpportunities,
          motivationAnalysis,
          careerAspirationsAnalysis,
          learningStyleAnalysis,
          changeReadiness,
          supportSystemAnalysis,
          resourceAvailability
        }
      };
    } catch (error) {
      console.error('Failed to process coaching data:', error);
      throw error;
    }
  }

  protected getDataSystemPrompt(): string {
    return `
You are analyzing comprehensive coaching data to provide personalized guidance and development plans. Consider:

CURRENT STATE ANALYSIS:
- Performance level and competency scores
- Behavioral patterns and strengths
- Recent feedback and performance trends
- Current goals and progress
- Improvement areas and challenges

GAP ANALYSIS:
- Performance gaps between current and desired state
- Competency gaps and skill deficiencies
- Behavioral gaps and development needs
- Experience gaps and knowledge deficiencies
- Career advancement gaps

READINESS ASSESSMENT:
- Motivation level and commitment to change
- Capacity for change and learning agility
- Support availability from managers and peers
- Resource access and organizational support
- Overall readiness for development

STRENGTHS ANALYSIS:
- Core competencies and proven capabilities
- Behavioral strengths and positive patterns
- Achievements and success factors
- Natural talents and preferences
- Leverageable strengths for development

DEVELOPMENT OPPORTUNITIES:
- High-impact development areas
- Quick wins and immediate improvements
- Long-term growth opportunities
- Career advancement possibilities
- Skill development priorities

MOTIVATION ANALYSIS:
- Intrinsic motivation factors (autonomy, competence, relatedness)
- Extrinsic motivation factors (rewards, recognition, advancement)
- Career aspirations and personal goals
- Values alignment and purpose
- Engagement drivers and motivators

CAREER ASPIRATIONS:
- Short-term career goals and objectives
- Long-term career vision and aspirations
- Career anchors and core values
- Career stage and development focus
- Career path preferences and options

LEARNING STYLE:
- Preferred learning approaches (experiential, social, formal)
- Learning pace and depth preferences
- Feedback receptivity and openness
- Reflection and application patterns
- Development activity preferences

CHANGE READINESS:
- Stage of change (precontemplation to maintenance)
- Barriers and obstacles to change
- Enablers and facilitators of change
- Past change experiences and outcomes
- Change confidence and self-efficacy

SUPPORT SYSTEM:
- Manager support and involvement
- Peer support and collaboration
- Mentoring and coaching availability
- Organizational resources and programs
- External support networks

RESOURCE AVAILABILITY:
- Time availability for development
- Budget and funding for learning
- Access to training and development programs
- Organizational support and prioritization
- Technology and learning platforms

Focus on providing personalized, actionable coaching guidance based on comprehensive data analysis and individual context.
`;
  }

  // ============================================================================
  // DATA ANALYSIS METHODS
  // ============================================================================

  /**
   * Perform comprehensive gap analysis
   */
  private performGapAnalysis(context: PerformanceCoachingContext): any {
    const { currentState, desiredOutcomes } = context;
    
    const gapAnalysis = {
      performanceGap: 0,
      competencyGaps: {} as Record<string, number>,
      skillGaps: [] as string[],
      behavioralGaps: [] as string[],
      experienceGaps: [] as string[],
      priorityGaps: [] as string[]
    };

    // Calculate performance gap
    const currentLevelMap = { 'below_expectations': 2, 'meets_expectations': 3, 'exceeds_expectations': 4, 'significantly_exceeds': 5 };
    const currentLevel = (currentLevelMap as any)[currentState.performanceLevel] || 3;
    const targetLevel = (currentLevelMap as any)[desiredOutcomes.targetPerformanceLevel] || 4;
    gapAnalysis.performanceGap = targetLevel - currentLevel;

    // Calculate competency gaps
    Object.entries(desiredOutcomes.targetCompetencies).forEach(([competency, targetScore]) => {
      const currentScore = currentState.competencyScores[competency] || 0;
      const gap = targetScore - currentScore;
      if (gap > 0) {
        gapAnalysis.competencyGaps[competency] = gap;
        if (gap >= 2) {
          gapAnalysis.priorityGaps.push(`${competency} (gap: ${gap})`);
        }
      }
    });

    // Identify improvement areas as skill gaps
    gapAnalysis.skillGaps = currentState.improvementAreas;

    return gapAnalysis;
  }

  /**
   * Assess readiness for coaching and development
   */
  private assessReadiness(context: PerformanceCoachingContext): any {
    const { currentState, constraints, historicalData } = context;
    
    const readiness = {
      motivationLevel: 0,
      capacityForChange: 0,
      supportAvailability: 0,
      resourceAccess: 0,
      overallReadiness: 0,
      readinessFactors: {
        positive: [] as string[],
        negative: [] as string[]
      }
    };

    // Assess motivation (based on current progress and engagement)
    const avgGoalProgress = currentState.currentGoals.reduce((sum, goal) => sum + goal.progress, 0) / currentState.currentGoals.length;
    readiness.motivationLevel = Math.min(avgGoalProgress / 100, 1);

    // Assess capacity (based on time availability)
    readiness.capacityForChange = constraints.timeAvailability === 'high' ? 0.8 : constraints.timeAvailability === 'medium' ? 0.6 : 0.4;

    // Assess support (based on feedback sentiment)
    const positiveFeedback = currentState.recentFeedback.filter(f => f.rating >= 4).length;
    readiness.supportAvailability = positiveFeedback / Math.max(currentState.recentFeedback.length, 1);

    // Assess resources (based on resource access)
    readiness.resourceAccess = constraints.resourceAccess.length > 0 ? 0.7 : 0.3;

    // Calculate overall readiness
    readiness.overallReadiness = (
      readiness.motivationLevel * 0.3 +
      readiness.capacityForChange * 0.3 +
      readiness.supportAvailability * 0.2 +
      readiness.resourceAccess * 0.2
    );

    // Identify readiness factors
    if (readiness.motivationLevel >= 0.7) {
      readiness.readinessFactors.positive.push('High motivation and engagement');
    } else if (readiness.motivationLevel < 0.5) {
      readiness.readinessFactors.negative.push('Low motivation may hinder progress');
    }

    if (readiness.capacityForChange >= 0.6) {
      readiness.readinessFactors.positive.push('Sufficient time available for development');
    } else {
      readiness.readinessFactors.negative.push('Limited time availability');
    }

    return readiness;
  }

  /**
   * Analyze strengths and capabilities
   */
  private analyzeStrengths(context: PerformanceCoachingContext): any {
    const { currentState } = context;
    
    return {
      coreStrengths: currentState.strengths,
      competencyStrengths: Object.entries(currentState.competencyScores)
        .filter(([_, score]) => score >= 4)
        .map(([competency]) => competency),
      behavioralStrengths: Object.entries(currentState.behaviorScores)
        .filter(([_, score]) => score >= 4)
        .map(([behavior]) => behavior),
      leverageableStrengths: currentState.strengths.slice(0, 3), // Top 3 strengths
      strengthsToMaintain: currentState.strengths,
      strengthsForDevelopment: [] as string[] // Strengths that can be further developed
    };
  }

  /**
   * Identify development opportunities
   */
  private identifyDevelopmentOpportunities(context: PerformanceCoachingContext): any {
    const { currentState, desiredOutcomes } = context;
    
    return {
      highImpactAreas: currentState.improvementAreas.slice(0, 3),
      quickWins: [] as string[],
      longTermOpportunities: desiredOutcomes.careerGoals,
      skillDevelopmentPriorities: desiredOutcomes.developmentPriorities,
      careerAdvancementOpportunities: desiredOutcomes.careerGoals,
      leadershipOpportunities: [] as string[]
    };
  }

  /**
   * Analyze motivation factors
   */
  private analyzeMotivation(context: PerformanceCoachingContext): any {
    const { currentState, desiredOutcomes } = context;
    
    return {
      intrinsicMotivation: {
        autonomy: 0.7, // Placeholder - would be assessed from data
        competence: 0.8,
        relatedness: 0.6
      },
      extrinsicMotivation: {
        rewards: 0.5,
        recognition: 0.7,
        advancement: 0.8
      },
      careerAspirations: desiredOutcomes.careerGoals,
      personalGoals: desiredOutcomes.developmentPriorities,
      motivationDrivers: [] as string[],
      motivationBarriers: [] as string[]
    };
  }

  /**
   * Analyze career aspirations and goals
   */
  private analyzeCareerAspirations(context: PerformanceCoachingContext): any {
    const { desiredOutcomes, organizationalContext } = context;
    
    return {
      shortTermGoals: desiredOutcomes.careerGoals.slice(0, 2),
      longTermVision: desiredOutcomes.careerGoals,
      careerStage: 'establishment', // Would be determined from data
      careerAnchors: [] as string[],
      careerPathOptions: [] as string[],
      roleAspiration: organizationalContext.role
    };
  }

  /**
   * Analyze learning style and preferences
   */
  private analyzeLearningStyle(context: PerformanceCoachingContext): any {
    const { historicalData } = context;
    
    return {
      preferredLearningApproaches: ['experiential', 'social'], // Would be determined from data
      learningPace: 'moderate',
      feedbackReceptivity: 'high',
      reflectionStyle: 'active',
      developmentActivityPreferences: [] as string[]
    };
  }

  /**
   * Assess change readiness
   */
  private assessChangeReadiness(context: PerformanceCoachingContext): any {
    const { currentState, historicalData } = context;
    
    return {
      changeStage: 'preparation', // Would be determined from behavioral data
      barriers: [] as string[],
      enablers: currentState.strengths,
      pastChangeExperiences: historicalData.developmentHistory.map(d => d.impact),
      changeConfidence: 0.7,
      selfEfficacy: 0.75
    };
  }

  /**
   * Analyze support system
   */
  private analyzeSupportSystem(context: PerformanceCoachingContext): any {
    const { currentState, organizationalContext } = context;
    
    return {
      managerSupport: organizationalContext.managerId ? 'available' : 'limited',
      peerSupport: 'available',
      mentoring: 'needed',
      coaching: 'in_progress',
      organizationalSupport: 'available',
      externalNetworks: [] as string[]
    };
  }

  /**
   * Assess resource availability
   */
  private assessResourceAvailability(context: PerformanceCoachingContext): any {
    const { constraints } = context;
    
    return {
      timeAvailability: constraints.timeAvailability,
      budgetAvailability: Object.keys(constraints.budgetLimits).length > 0 ? 'available' : 'limited',
      trainingAccess: constraints.resourceAccess.includes('training') ? 'available' : 'limited',
      organizationalSupport: constraints.resourceAccess.length > 0 ? 'available' : 'limited',
      technologyAccess: constraints.resourceAccess.includes('technology') ? 'available' : 'limited',
      resourceConstraints: constraints.organizationalFactors
    };
  }

  // ============================================================================
  // REASONING ENGINE IMPLEMENTATION
  // ============================================================================

  protected buildReasoningPrompt(data: any): string {
    return `
Based on the comprehensive coaching data and analysis, provide personalized coaching guidance and development recommendations.

EMPLOYEE CONTEXT:
- Employee ID: ${data.employee.id}
- Coaching Type: ${data.employee.coachingType}
- Coaching Depth: ${data.employee.coachingDepth}
- Organization: ${data.organizationalContext.department} - ${data.organizationalContext.team}
- Role: ${data.organizationalContext.role} (${data.organizationalContext.level})

CURRENT STATE:
- Performance Level: ${data.currentState.performanceLevel}
- Strengths: ${data.currentState.strengths.join(', ')}
- Improvement Areas: ${data.currentState.improvementAreas.join(', ')}
- Current Goals: ${data.currentState.currentGoals.length} goals in progress
- Recent Feedback: ${data.currentState.recentFeedback.length} feedback items

DESIRED OUTCOMES:
- Target Performance: ${data.desiredOutcomes.targetPerformanceLevel}
- Career Goals: ${data.desiredOutcomes.careerGoals.join(', ')}
- Development Priorities: ${data.desiredOutcomes.developmentPriorities.join(', ')}
- Timeline: ${data.desiredOutcomes.timeline}

ANALYSIS RESULTS:
- Gap Analysis: ${JSON.stringify(data.analysis.gapAnalysis, null, 2)}
- Readiness: Overall ${(data.analysis.readinessAssessment.overallReadiness * 100).toFixed(0)}% ready
- Motivation: Intrinsic ${(data.analysis.motivationAnalysis.intrinsicMotivation.autonomy * 100).toFixed(0)}% autonomy
- Career Stage: ${data.analysis.careerAspirationsAnalysis.careerStage}
- Learning Style: ${data.analysis.learningStyleAnalysis.preferredLearningApproaches.join(', ')}
- Change Stage: ${data.analysis.changeReadiness.changeStage}

COACHING REQUIREMENTS:

1. ASSESSMENT:
   - Analyze current state comprehensively
   - Identify specific competency gaps with current and target levels
   - Highlight behavioral challenges and opportunities
   - Identify strengths to leverage for development
   - Assess overall readiness and capacity for change

2. COACHING PLAN:
   - Define 3-5 clear coaching objectives with priorities
   - Develop specific strategies for each objective
   - Create detailed action plan with immediate, short-term, and long-term actions
   - Include specific steps, resources, timelines, and success metrics

3. DEVELOPMENT ROADMAP:
   - Design 3-4 development phases with clear focus areas
   - Define milestones and checkpoints for progress tracking
   - Include expected outcomes for each phase
   - Balance quick wins with long-term development

4. RECOMMENDATIONS:
   - Provide immediate actions (within 1 week) with rationale and impact
   - Suggest short-term actions (1-3 months) with timeline
   - Recommend long-term strategic actions (6-12 months)
   - Identify specific development resources (courses, books, mentors, programs)

5. SUPPORT STRUCTURE:
   - Recommend mentoring approach with mentor profile and focus areas
   - Define coaching style and session frequency
   - Suggest peer support opportunities
   - Outline required manager support and actions

6. PROGRESS TRACKING:
   - Define specific metrics with baselines, targets, and tracking frequency
   - Establish milestones with criteria and dates
   - Schedule regular review sessions with participants and agenda

7. RISK MANAGEMENT:
   - Identify potential risks to success with probability and impact
   - Define success factors and enablers
   - Create contingency plans for likely obstacles

COACHING APPROACH:
- Use GROW model for structured coaching conversations
- Apply 70-20-10 framework for balanced development
- Leverage self-determination theory for motivation
- Use SBI model for specific feedback
- Consider Prochaska stages of change
- Apply appropriate coaching style based on readiness

OUTPUT FORMAT:
Provide detailed coaching guidance with clear sections for:
- Assessment (current state, gaps, readiness)
- Coaching Plan (objectives, strategies, actions)
- Development Roadmap (phases, checkpoints)
- Recommendations (immediate, short-term, long-term, resources)
- Support Structure (mentoring, coaching, peer, manager)
- Progress Tracking (metrics, milestones, reviews)
- Risk Management (risks, success factors, contingencies)
- Key Insights and Recommendations

Provide specific, actionable, and personalized coaching guidance that leverages strengths, addresses gaps, and aligns with career aspirations.
`;
  }

  protected parseReasoningOutput(output: string): PerformanceCoachingResult {
    try {
      // Basic parsing structure
      const result: PerformanceCoachingResult = {
        coachingId: `coaching_${Date.now()}`,
        employeeId: '',
        coachingType: 'performance_improvement',
        coachingDepth: 'detailed_coaching',
        coachingDate: new Date().toISOString(),
        
        assessment: {
          currentStateAnalysis: {
            performanceLevel: '',
            competencyGaps: [],
            behavioralChallenges: [],
            strengthsToLeverage: [],
            developmentOpportunities: []
          },
          gapAnalysis: {
            performanceGap: 0,
            competencyGaps: {},
            skillGaps: [],
            behavioralGaps: [],
            experienceGaps: []
          },
          readinessAssessment: {
            motivationLevel: 0,
            capacityForChange: 0,
            supportAvailability: 0,
            resourceAccess: 0,
            overallReadiness: 0
          }
        },
        
        coachingPlan: {
          objectives: [],
          strategies: [],
          actionPlan: []
        },
        
        developmentRoadmap: {
          phases: [],
          checkpoints: []
        },
        
        recommendations: {
          immediate: [],
          shortTerm: [],
          longTerm: [],
          resources: []
        },
        
        supportStructure: {
          mentoring: {
            recommended: false,
            mentorProfile: '',
            focusAreas: [],
            frequency: ''
          },
          coaching: {
            coachingStyle: '',
            sessionFrequency: '',
            focusAreas: [],
            duration: ''
          },
          peerSupport: {
            peerGroup: '',
            activities: [],
            benefits: []
          },
          managerSupport: {
            requiredActions: [],
            supportType: [],
            communicationPlan: []
          }
        },
        
        progressTracking: {
          metrics: [],
          milestones: [],
          reviewSchedule: []
        },
        
        riskManagement: {
          identifiedRisks: [],
          successFactors: [],
          contingencyPlans: []
        },
        
        insights: {
          keyInsights: [],
          patterns: [],
          opportunities: [],
          challenges: [],
          recommendations: []
        },
        
        metadata: {
          coachId: 'performance_coach_agent',
          sessionDate: new Date().toISOString(),
          nextSessionDate: '',
          confidenceLevel: 0.85,
          dataQuality: 0.9,
          version: '1.0.0',
          tags: [],
          notes: ''
        }
      };

      // Parse structured sections from AI output
      const lines = output.split('\n');
      let currentSection = '';
      const sectionContent: Record<string, string[]> = {};

      // Identify sections and collect content
      lines.forEach(line => {
        const trimmedLine = line.trim();
        
        if (trimmedLine.toLowerCase().includes('assessment') && !trimmedLine.toLowerCase().includes('readiness')) {
          currentSection = 'assessment';
          sectionContent[currentSection] = [];
        } else if (trimmedLine.toLowerCase().includes('coaching plan')) {
          currentSection = 'coachingPlan';
          sectionContent[currentSection] = [];
        } else if (trimmedLine.toLowerCase().includes('development roadmap')) {
          currentSection = 'developmentRoadmap';
          sectionContent[currentSection] = [];
        } else if (trimmedLine.toLowerCase().includes('recommendation')) {
          currentSection = 'recommendations';
          sectionContent[currentSection] = [];
        } else if (trimmedLine.toLowerCase().includes('support structure')) {
          currentSection = 'supportStructure';
          sectionContent[currentSection] = [];
        } else if (trimmedLine.toLowerCase().includes('progress tracking')) {
          currentSection = 'progressTracking';
          sectionContent[currentSection] = [];
        } else if (trimmedLine.toLowerCase().includes('risk management')) {
          currentSection = 'riskManagement';
          sectionContent[currentSection] = [];
        } else if (trimmedLine.toLowerCase().includes('insight')) {
          currentSection = 'insights';
          sectionContent[currentSection] = [];
        } else if (currentSection && trimmedLine) {
          sectionContent[currentSection].push(trimmedLine);
        }
      });

      // Extract coaching plan objectives
      if (sectionContent.coachingPlan) {
        sectionContent.coachingPlan.forEach(line => {
          if (line.toLowerCase().includes('objective') && line.includes(':')) {
            result.coachingPlan.objectives.push({
              id: `obj_${result.coachingPlan.objectives.length + 1}`,
              title: line.substring(line.indexOf(':') + 1).trim(),
              description: line,
              priority: line.toLowerCase().includes('high') ? 'high' : line.toLowerCase().includes('low') ? 'low' : 'medium',
              category: 'performance_improvement',
              successCriteria: [],
              timeline: '3 months'
            });
          }
        });
      }

      // Extract recommendations
      if (sectionContent.recommendations) {
        sectionContent.recommendations.forEach(line => {
          if (line.toLowerCase().includes('immediate') || line.toLowerCase().includes('urgent')) {
            result.recommendations.immediate.push({
              category: 'immediate_action',
              recommendation: line,
              rationale: 'Immediate attention required',
              expectedImpact: 'Quick wins',
              priority: 'high'
            });
          } else if (line.toLowerCase().includes('short') || line.toLowerCase().includes('1-3')) {
            result.recommendations.shortTerm.push({
              category: 'short_term_action',
              recommendation: line,
              rationale: 'Short-term development',
              timeline: '1-3 months'
            });
          } else if (line.toLowerCase().includes('long') || line.toLowerCase().includes('strategic')) {
            result.recommendations.longTerm.push({
              category: 'long_term_action',
              recommendation: line,
              rationale: 'Strategic development',
              strategicValue: 'Career growth'
            });
          }
        });
      }

      // Extract insights
      if (sectionContent.insights) {
        result.insights.keyInsights = sectionContent.insights.filter(line => 
          line.toLowerCase().includes('insight') || line.toLowerCase().includes('key')
        );
        result.insights.patterns = sectionContent.insights.filter(line => 
          line.toLowerCase().includes('pattern')
        );
        result.insights.opportunities = sectionContent.insights.filter(line => 
          line.toLowerCase().includes('opportunity')
        );
        result.insights.challenges = sectionContent.insights.filter(line => 
          line.toLowerCase().includes('challenge') || line.toLowerCase().includes('barrier')
        );
      }

      // Extract support structure details
      if (sectionContent.supportStructure) {
        const supportText = sectionContent.supportStructure.join(' ');
        
        if (supportText.toLowerCase().includes('mentor')) {
          result.supportStructure.mentoring.recommended = true;
          result.supportStructure.mentoring.mentorProfile = 'Senior professional with relevant experience';
          result.supportStructure.mentoring.frequency = 'Monthly';
        }
        
        if (supportText.toLowerCase().includes('coaching')) {
          result.supportStructure.coaching.coachingStyle = 'Developmental coaching';
          result.supportStructure.coaching.sessionFrequency = 'Bi-weekly';
          result.supportStructure.coaching.duration = '6 months';
        }
      }

      // Extract risk management details
      if (sectionContent.riskManagement) {
        sectionContent.riskManagement.forEach(line => {
          if (line.toLowerCase().includes('risk')) {
            const risk = {
              risk: line,
              probability: (line.toLowerCase().includes('high') ? 'high' : line.toLowerCase().includes('low') ? 'low' : 'medium') as 'high' | 'medium' | 'low',
              impact: (line.toLowerCase().includes('significant') ? 'high' : 'medium') as 'high' | 'medium' | 'low',
              mitigationStrategy: 'Proactive monitoring and support'
            };
            result.riskManagement.identifiedRisks.push(risk);
          }
          if (line.toLowerCase().includes('success') || line.toLowerCase().includes('factor')) {
            result.riskManagement.successFactors.push(line);
          }
        });
      }

      // Ensure minimum content
      if (result.coachingPlan.objectives.length === 0) {
        result.coachingPlan.objectives.push({
          id: 'obj_1',
          title: 'Improve performance in key areas',
          description: 'Focus on addressing identified gaps',
          priority: 'high',
          category: 'performance_improvement',
          successCriteria: ['Measurable improvement', 'Sustained progress'],
          timeline: '3 months'
        });
      }

      if (result.recommendations.immediate.length === 0) {
        result.recommendations.immediate.push({
          category: 'immediate_action',
          recommendation: 'Begin with strengths assessment and goal clarification',
          rationale: 'Establish baseline and direction',
          expectedImpact: 'Clear development path',
          priority: 'high'
        });
      }

      if (result.insights.keyInsights.length === 0) {
        result.insights.keyInsights.push('Comprehensive coaching plan developed based on current state and aspirations');
      }
      
      return result;
    } catch (error) {
      console.error('Failed to parse coaching output:', error);
      throw error;
    }
  }

  // ============================================================================
  // MAIN COACHING METHOD
  // ============================================================================

  public async coachEmployee(context: PerformanceCoachingContext): Promise<PerformanceCoachingResult> {
    try {
      console.info('Starting performance coaching session', { employeeId: context.employeeId });

      // Run the three-engine analysis using parent class method
      const engineResult = await super.analyze(context);

      // Transform engine result to PerformanceCoachingResult
      const result: PerformanceCoachingResult = {
        coachingId: `coaching-${Date.now()}`,
        employeeId: context.employeeId,
        coachingType: context.coachingType || 'developmental',
        coachingDepth: context.coachingDepth || 'standard',
        coachingDate: new Date().toISOString(),
        assessment: engineResult.reasoning.output.assessment || {
          currentStateAnalysis: {
            performanceLevel: 'meets_expectations',
            competencyGaps: [],
            behavioralChallenges: [],
            strengthsToLeverage: [],
            developmentOpportunities: []
          },
          gapAnalysis: {
            performanceGap: 0,
            competencyGaps: {},
            skillGaps: [],
            behavioralGaps: [],
            experienceGaps: []
          },
          readinessAssessment: {
            motivationLevel: 0,
            capacityForChange: 0,
            supportAvailability: 0,
            resourceAccess: 0,
            overallReadiness: 0
          }
        },
        coachingPlan: engineResult.reasoning.output.coachingPlan || {
          objectives: [],
          strategies: [],
          actionPlan: []
        },
        developmentRoadmap: engineResult.reasoning.output.developmentRoadmap || {
          phases: [],
          checkpoints: []
        },
        recommendations: engineResult.reasoning.output.recommendations || {
          immediate: [],
          shortTerm: [],
          longTerm: [],
          resources: []
        },
        supportStructure: engineResult.reasoning.output.supportStructure || {
          mentoring: { recommended: false, mentorProfile: '', focusAreas: [], frequency: '' },
          coaching: { coachingStyle: '', sessionFrequency: '', focusAreas: [], duration: '' },
          peerSupport: { peerGroup: '', activities: [], benefits: [] },
          managerSupport: { requiredActions: [], supportType: [], communicationPlan: [] }
        },
        progressTracking: engineResult.reasoning.output.progressTracking || {
          metrics: [],
          milestones: [],
          reviewSchedule: []
        },
        riskManagement: engineResult.reasoning.output.riskManagement || {
          identifiedRisks: [],
          successFactors: [],
          contingencyPlans: []
        },
        insights: engineResult.reasoning.output.insights || {
          keyInsights: [],
          patterns: [],
          opportunities: [],
          challenges: [],
          recommendations: []
        },
        metadata: {
          coachId: 'PerformanceCoachAgent',
          sessionDate: new Date().toISOString(),
          nextSessionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          confidenceLevel: engineResult.overallConfidence,
          dataQuality: engineResult.data.confidence,
          version: '1.0.0',
          tags: [],
          notes: `Processing time: ${engineResult.totalProcessingTime}ms`
        }
      };

      console.info('Performance coaching completed successfully', {
        employeeId: context.employeeId,
        coachingType: context.coachingType,
        confidence: result.metadata.confidenceLevel
      });

      return result;
    } catch (error) {
      console.error('Performance coaching failed:', error);
      throw error;
    }
  }
}

