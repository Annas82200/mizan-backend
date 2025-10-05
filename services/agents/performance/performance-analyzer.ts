import { ThreeEngineAgent } from '../base/three-engine-agent.js';
import { Logger } from '../../../utils/logger.js';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface PerformanceAnalysisContext {
  employeeId: string;
  tenantId: string;
  period: {
    startDate: string;
    endDate: string;
    type: 'quarterly' | 'annual' | 'monthly' | 'custom';
  };
  performanceData: {
    goals: PerformanceGoal[];
    reviews: PerformanceReview[];
    feedback: PerformanceFeedback[];
    metrics: PerformanceMetric[];
    improvementPlans: PerformanceImprovementPlan[];
  };
  historicalData: {
    previousPeriods: PerformancePeriod[];
    trends: PerformanceTrend[];
    benchmarks: PerformanceBenchmark[];
  };
  organizationalContext: {
    department: string;
    team: string;
    role: string;
    level: string;
    managerId: string;
  };
  analysisType: 'comprehensive' | 'goal_focused' | 'competency_focused' | 'trend_analysis' | 'risk_assessment';
  analysisDepth: 'summary' | 'detailed' | 'comprehensive';
}

export interface PerformanceGoal {
  id: string;
  title: string;
  description: string;
  category: string;
  type: 'quantitative' | 'qualitative' | 'behavioral' | 'developmental';
  target: string | number;
  currentProgress: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate: string;
  achievementRate: number;
  qualityScore: number;
  impactScore: number;
  effortScore: number;
  alignmentScore: number;
  metadata: Record<string, any>;
}

export interface PerformanceReview {
  id: string;
  type: 'annual' | 'quarterly' | 'monthly' | 'probation' | '360_degree';
  status: 'draft' | 'in_progress' | 'completed' | 'approved';
  overallRating: number;
  competencyRatings: Record<string, number>;
  behaviorRatings: Record<string, number>;
  goalRatings: Record<string, number>;
  strengths: string[];
  developmentAreas: string[];
  achievements: string[];
  challenges: string[];
  recommendations: string[];
  reviewerId: string;
  reviewDate: string;
  nextReviewDate: string;
  metadata: Record<string, any>;
}

export interface PerformanceFeedback {
  id: string;
  type: 'manager' | 'peer' | 'subordinate' | 'self' | 'customer' | '360_degree';
  providerId: string;
  providerRole: string;
  rating: number;
  comments: string;
  strengths: string[];
  improvementAreas: string[];
  suggestions: string[];
  category: 'communication' | 'leadership' | 'technical' | 'collaboration' | 'innovation' | 'other';
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  confidence: number;
  date: string;
  metadata: Record<string, any>;
}

export interface PerformanceMetric {
  id: string;
  name: string;
  category: 'productivity' | 'quality' | 'efficiency' | 'engagement' | 'development' | 'leadership';
  type: 'quantitative' | 'qualitative' | 'behavioral' | 'outcome';
  value: number | string;
  target: number | string;
  unit: string;
  period: string;
  trend: 'improving' | 'stable' | 'declining' | 'volatile';
  significance: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  lastUpdated: string;
  metadata: Record<string, any>;
}

export interface PerformanceImprovementPlan {
  id: string;
  title: string;
  description: string;
  category: 'performance' | 'behavioral' | 'skill' | 'competency' | 'leadership';
  status: 'draft' | 'active' | 'completed' | 'cancelled' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate: string;
  targetDate: string;
  completionDate?: string;
  progress: number;
  milestones: ImprovementMilestone[];
  supportResources: string[];
  successCriteria: string[];
  outcome: 'successful' | 'partially_successful' | 'unsuccessful' | 'in_progress';
  impact: 'low' | 'medium' | 'high' | 'significant';
  lessonsLearned: string[];
  metadata: Record<string, any>;
}

export interface ImprovementMilestone {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  progress: number;
  evidence: string[];
  notes: string;
}

export interface PerformancePeriod {
  period: string;
  startDate: string;
  endDate: string;
  overallScore: number;
  goalAchievement: number;
  competencyScore: number;
  behaviorScore: number;
  reviewRating: number;
  feedbackRating: number;
  improvementProgress: number;
  keyAchievements: string[];
  challenges: string[];
  trends: Record<string, string>;
}

export interface PerformanceTrend {
  metric: string;
  category: string;
  direction: 'improving' | 'stable' | 'declining' | 'volatile';
  magnitude: number;
  confidence: number;
  timeframe: string;
  factors: string[];
  implications: string[];
  recommendations: string[];
}

export interface PerformanceBenchmark {
  metric: string;
  category: string;
  internalBenchmark: {
    average: number;
    median: number;
    topQuartile: number;
    bottomQuartile: number;
  };
  externalBenchmark: {
    industry: number;
    market: number;
    bestPractice: number;
  };
  employeeScore: number;
  percentile: number;
  gap: number;
  significance: 'low' | 'medium' | 'high' | 'critical';
}

export interface PerformanceAnalysisResult {
  analysisId: string;
  employeeId: string;
  period: {
    startDate: string;
    endDate: string;
    type: string;
  };
  analysisType: string;
  analysisDepth: string;
  overallAssessment: {
    overallScore: number;
    performanceLevel: 'exceeds_expectations' | 'meets_expectations' | 'below_expectations' | 'significantly_below';
    trend: 'improving' | 'stable' | 'declining' | 'volatile';
    confidence: number;
    summary: string;
  };
  goalAnalysis: {
    totalGoals: number;
    completedGoals: number;
    overdueGoals: number;
    averageProgress: number;
    achievementRate: number;
    qualityScore: number;
    alignmentScore: number;
    topPerformingGoals: PerformanceGoal[];
    underperformingGoals: PerformanceGoal[];
    goalTrends: PerformanceTrend[];
    recommendations: string[];
  };
  competencyAnalysis: {
    overallCompetencyScore: number;
    competencyBreakdown: Record<string, {
      score: number;
      trend: string;
      level: string;
      gap: number;
      developmentNeeds: string[];
    }>;
    strengths: string[];
    developmentAreas: string[];
    competencyTrends: PerformanceTrend[];
    recommendations: string[];
  };
  behaviorAnalysis: {
    overallBehaviorScore: number;
    behaviorBreakdown: Record<string, {
      score: number;
      trend: string;
      level: string;
      feedback: string[];
    }>;
    behavioralStrengths: string[];
    behavioralConcerns: string[];
    behaviorTrends: PerformanceTrend[];
    recommendations: string[];
  };
  feedbackAnalysis: {
    totalFeedback: number;
    averageRating: number;
    sentimentAnalysis: {
      positive: number;
      neutral: number;
      negative: number;
      mixed: number;
    };
    feedbackTrends: PerformanceTrend[];
    keyThemes: string[];
    actionItems: string[];
    recommendations: string[];
  };
  improvementAnalysis: {
    totalPlans: number;
    activePlans: number;
    completedPlans: number;
    successRate: number;
    averageProgress: number;
    improvementTrends: PerformanceTrend[];
    keyImprovements: string[];
    ongoingChallenges: string[];
    recommendations: string[];
  };
  riskAssessment: {
    performanceRisks: {
      high: string[];
      medium: string[];
      low: string[];
    };
    retentionRisks: {
      high: string[];
      medium: string[];
      low: string[];
    };
    developmentRisks: {
      high: string[];
      medium: string[];
      low: string[];
    };
    overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskFactors: string[];
    mitigationStrategies: string[];
  };
  benchmarking: {
    internalComparison: {
      departmentRank: number;
      teamRank: number;
      percentile: number;
      relativePerformance: string;
    };
    externalComparison: {
      industryBenchmark: number;
      marketBenchmark: number;
      gap: number;
      competitivePosition: string;
    };
    benchmarkInsights: string[];
    recommendations: string[];
  };
  insights: {
    keyInsights: string[];
    patterns: string[];
    correlations: string[];
    anomalies: string[];
    opportunities: string[];
    threats: string[];
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
    development: string[];
    support: string[];
    recognition: string[];
  };
  nextSteps: {
    actionItems: string[];
    timeline: string[];
    responsibilities: string[];
    successMetrics: string[];
    reviewSchedule: string[];
  };
  metadata: {
    analysisDate: string;
    analystId: string;
    dataQuality: number;
    confidence: number;
    version: string;
    tags: string[];
    notes: string;
  };
}

// ============================================================================
// PERFORMANCE ANALYZER AGENT
// ============================================================================

export class PerformanceAnalyzerAgent extends ThreeEngineAgent {

  // Implement required abstract methods
  protected getReasoningSystemPrompt(): string {
    return `
You are a performance analysis reasoning expert synthesizing framework knowledge and data insights.

Your role:
- Integrate performance frameworks with comprehensive data analysis
- Generate evidence-based performance assessments
- Provide actionable recommendations for improvement
- Identify patterns, trends, and anomalies
- Balance objective metrics with qualitative insights

Consider:
- Goal achievement and progress patterns
- Competency and skill development
- Behavioral strengths and concerns
- Feedback themes and sentiment
- Risk factors and mitigation strategies
- Benchmarking and comparative analysis

Provide comprehensive, balanced performance assessments with clear reasoning.
`;
  }

  protected buildKnowledgePrompt(inputData: any, frameworks: any): string {
    return `
Analyze performance assessment frameworks for comprehensive employee evaluation.

EMPLOYEE CONTEXT:
- Employee ID: ${inputData.employeeId || 'Unknown'}
- Period: ${inputData.period?.type || 'Unknown'} (${inputData.period?.startDate} to ${inputData.period?.endDate})
- Analysis Type: ${inputData.analysisType || 'comprehensive'}
- Analysis Depth: ${inputData.analysisDepth || 'detailed'}

AVAILABLE FRAMEWORKS:
${JSON.stringify(frameworks, null, 2)}

Provide guidance on:
- Which frameworks are most appropriate for this analysis type
- How to apply performance models effectively
- Key assessment dimensions and criteria
- Benchmarking and calibration approaches
`;
  }

  protected buildDataPrompt(processedData: any, knowledgeOutput: any): string {
    return `
Analyze comprehensive performance data to generate detailed insights.

PROCESSED PERFORMANCE DATA:
${JSON.stringify(processedData, null, 2)}

FRAMEWORK GUIDANCE:
${JSON.stringify(knowledgeOutput, null, 2)}

Analyze and provide insights on:
- Overall performance level and trends
- Goal achievement patterns and quality
- Competency and skill proficiency
- Behavioral strengths and development areas
- Feedback patterns and sentiment
- Risk factors and warning signs
- Improvement opportunities and priorities

Generate data-driven performance insights.
`;
  }

  protected parseKnowledgeOutput(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {
        frameworks: ['Balanced Scorecard', 'OKR', 'KPI'],
        assessmentDimensions: ['Goals', 'Competencies', 'Behaviors', 'Feedback'],
        recommendations: response,
        applicableModels: []
      };
    } catch (error) {
      console.error('Failed to parse knowledge output:', error);
      return {
        frameworks: [],
        assessmentDimensions: [],
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
        performanceLevel: 'meets_expectations',
        keyInsights: [],
        strengths: [],
        developmentAreas: [],
        trends: [],
        insights: response
      };
    } catch (error) {
      console.error('Failed to parse data output:', error);
      return {
        performanceLevel: 'meets_expectations',
        keyInsights: [],
        strengths: [],
        developmentAreas: [],
        trends: [],
        insights: response
      };
    }
  }
  private logger: Logger;
  private performanceFrameworks: Map<string, any> = new Map();
  private analysisMethodologies: Map<string, any> = new Map();
  private performanceModels: Map<string, any> = new Map();

  constructor() {
    super('performance-analyzer', {
      knowledge: { providers: ['openai'], model: 'gpt-4', temperature: 0.2, maxTokens: 2000 },
      data: { providers: ['openai'], model: 'gpt-4', temperature: 0.1, maxTokens: 3000 },
      reasoning: { providers: ['openai'], model: 'gpt-4', temperature: 0.4, maxTokens: 3000 },
      consensusThreshold: 0.8
    });
    const legacyConfig = {
      name: 'Performance Analyzer Agent',
      description: 'AI agent for comprehensive performance analysis and assessment',
      version: '1.0.0',
      capabilities: [
        'performance_analysis',
        'trend_analysis',
        'risk_assessment',
        'benchmarking',
        'insight_generation',
        'recommendation_engine'
      ],
      aiProviders: ['claude', 'gpt4', 'cohere']
    };

    this.logger = new Logger('PerformanceAnalyzerAgent');
  }

  // ============================================================================
  // KNOWLEDGE ENGINE IMPLEMENTATION
  // ============================================================================

  protected async loadFrameworks(): Promise<any> {
    try {
      // Load Performance Analysis Frameworks
      this.performanceFrameworks.set('balanced_scorecard', {
        name: 'Balanced Scorecard',
        description: 'Performance measurement framework with four perspectives',
        perspectives: {
          financial: 'Financial performance and results',
          customer: 'Customer satisfaction and value delivery',
          internal_process: 'Internal process efficiency and effectiveness',
          learning_growth: 'Learning, innovation, and capability development'
        },
        metrics: {
          financial: ['revenue', 'profit', 'cost_reduction', 'roi'],
          customer: ['satisfaction', 'retention', 'acquisition', 'lifetime_value'],
          internal_process: ['efficiency', 'quality', 'cycle_time', 'innovation'],
          learning_growth: ['skill_development', 'employee_engagement', 'innovation', 'knowledge_sharing']
        }
      });

      this.performanceFrameworks.set('okr_framework', {
        name: 'OKR Framework',
        description: 'Objectives and Key Results for performance measurement',
        components: {
          objectives: 'Qualitative, inspirational goals',
          key_results: 'Quantitative, measurable outcomes',
          alignment: 'Connection to organizational objectives',
          cadence: 'Regular review and adjustment cycles'
        },
        bestPractices: [
          'Set 3-5 objectives per period',
          'Include 2-4 key results per objective',
          'Aim for 70% achievement rate',
          'Regular check-ins and adjustments'
        ]
      });

      this.performanceFrameworks.set('competency_model', {
        name: 'Competency-Based Performance Model',
        description: 'Performance assessment based on competencies and behaviors',
        competencyTypes: {
          core: 'Essential competencies for all employees',
          functional: 'Role-specific technical competencies',
          behavioral: 'Soft skills and interpersonal competencies',
          leadership: 'Management and leadership competencies'
        },
        assessmentMethods: [
          '360-degree feedback',
          'Behavioral interviews',
          'Performance observations',
          'Self-assessment',
          'Peer review'
        ]
      });

      this.performanceFrameworks.set('performance_management_cycle', {
        name: 'Performance Management Cycle',
        description: 'Continuous performance management process',
        phases: [
          'Goal Setting: Define objectives and expectations',
          'Planning: Create action plans and milestones',
          'Monitoring: Regular check-ins and progress tracking',
          'Review: Formal evaluation and feedback',
          'Development: Identify growth opportunities'
        ],
        bestPractices: [
          'Regular communication and feedback',
          'Continuous goal adjustment',
          'Focus on development and growth',
          'Recognition and rewards'
        ]
      });

      // Load Analysis Methodologies
      this.analysisMethodologies.set('trend_analysis', {
        name: 'Performance Trend Analysis',
        description: 'Analysis of performance patterns over time',
        methods: [
          'Time series analysis',
          'Statistical trend identification',
          'Seasonal pattern recognition',
          'Anomaly detection',
          'Predictive modeling'
        ],
        indicators: [
          'Performance trajectory',
          'Goal achievement trends',
          'Competency development',
          'Behavioral changes',
          'Feedback patterns'
        ]
      });

      this.analysisMethodologies.set('risk_assessment', {
        name: 'Performance Risk Assessment',
        description: 'Identification and assessment of performance risks',
        riskTypes: {
          performance: 'Risk of performance decline',
          retention: 'Risk of employee turnover',
          development: 'Risk of skill obsolescence',
          compliance: 'Risk of policy violations'
        },
        assessmentFactors: [
          'Performance trends',
          'Goal achievement patterns',
          'Feedback sentiment',
          'Engagement levels',
          'Development progress'
        ]
      });

      this.analysisMethodologies.set('benchmarking', {
        name: 'Performance Benchmarking',
        description: 'Comparison of performance against standards',
        benchmarkTypes: {
          internal: 'Comparison within organization',
          external: 'Comparison with industry standards',
          historical: 'Comparison with past performance',
          peer: 'Comparison with similar roles'
        },
        metrics: [
          'Performance scores',
          'Goal achievement rates',
          'Competency levels',
          'Feedback ratings',
          'Development progress'
        ]
      });

      // Load Performance Models
      this.performanceModels.set('performance_pyramid', {
        name: 'Performance Pyramid Model',
        description: 'Hierarchical performance assessment model',
        levels: {
          foundation: 'Basic job requirements and expectations',
          competency: 'Role-specific skills and knowledge',
          performance: 'Goal achievement and results',
          excellence: 'Exceeding expectations and innovation',
          leadership: 'Influencing others and driving change'
        },
        assessmentCriteria: [
          'Meets basic requirements',
          'Demonstrates competency',
          'Achieves performance goals',
          'Exceeds expectations',
          'Shows leadership potential'
        ]
      });

      this.performanceModels.set('performance_spectrum', {
        name: 'Performance Spectrum Model',
        description: 'Continuous performance assessment spectrum',
        spectrum: {
          significantly_below: 'Performance significantly below expectations',
          below_expectations: 'Performance below expectations',
          meets_expectations: 'Performance meets expectations',
          exceeds_expectations: 'Performance exceeds expectations',
          significantly_exceeds: 'Performance significantly exceeds expectations'
        },
        characteristics: {
          significantly_below: ['Consistent underperformance', 'Multiple missed goals', 'Behavioral concerns'],
          below_expectations: ['Some missed goals', 'Areas for improvement', 'Development needed'],
          meets_expectations: ['Achieves most goals', 'Competent performance', 'Reliable contributor'],
          exceeds_expectations: ['Consistently exceeds goals', 'High quality work', 'Positive influence'],
          significantly_exceeds: ['Exceptional performance', 'Innovation and leadership', 'Role model']
        }
      });

      // Load Advanced Performance Analysis Frameworks
      this.performanceFrameworks.set('performance_dashboard', {
        name: 'Performance Dashboard Framework',
        description: 'Comprehensive performance monitoring and analysis dashboard',
        components: {
          kpi_tracking: 'Key Performance Indicators monitoring',
          trend_analysis: 'Performance trend identification and analysis',
          benchmark_comparison: 'Internal and external benchmark comparison',
          risk_indicators: 'Performance risk identification and monitoring',
          improvement_tracking: 'Performance improvement progress monitoring'
        },
        metrics: {
          performance_score: 'Overall performance score calculation',
          goal_achievement: 'Goal achievement rate and quality',
          competency_development: 'Competency progression and development',
          behavioral_assessment: 'Behavioral performance evaluation',
          feedback_analysis: 'Feedback sentiment and theme analysis'
        }
      });

      this.performanceFrameworks.set('performance_analytics', {
        name: 'Performance Analytics Framework',
        description: 'Advanced analytics for performance data interpretation',
        analytical_methods: {
          descriptive_analytics: 'Historical performance data analysis',
          diagnostic_analytics: 'Root cause analysis of performance issues',
          predictive_analytics: 'Future performance prediction and modeling',
          prescriptive_analytics: 'Performance improvement recommendations'
        },
        data_sources: [
          'Goal achievement data',
          'Review and feedback data',
          'Competency assessments',
          'Behavioral observations',
          'Development progress',
          'Engagement metrics'
        ]
      });

      // Load Performance Assessment Methodologies
      this.analysisMethodologies.set('360_degree_analysis', {
        name: '360-Degree Performance Analysis',
        description: 'Comprehensive performance assessment from multiple perspectives',
        perspectives: {
          self_assessment: 'Employee self-evaluation and reflection',
          manager_assessment: 'Direct manager evaluation and feedback',
          peer_assessment: 'Colleague and peer feedback',
          subordinate_assessment: 'Team member and subordinate feedback',
          customer_assessment: 'Customer and stakeholder feedback'
        },
        benefits: [
          'Comprehensive performance view',
          'Reduced bias in assessment',
          'Enhanced self-awareness',
          'Improved development planning',
          'Better performance alignment'
        ]
      });

      this.analysisMethodologies.set('performance_attribution', {
        name: 'Performance Attribution Analysis',
        description: 'Analysis of factors contributing to performance outcomes',
        attribution_factors: {
          individual_factors: 'Personal skills, motivation, and effort',
          environmental_factors: 'Work environment, resources, and support',
          organizational_factors: 'Company culture, policies, and systems',
          external_factors: 'Market conditions, industry trends, and competition'
        },
        analysis_methods: [
          'Factor analysis',
          'Correlation analysis',
          'Regression analysis',
          'Root cause analysis',
          'Impact assessment'
        ]
      });

      // Load Performance Measurement Frameworks
      this.performanceFrameworks.set('performance_measurement', {
        name: 'Performance Measurement Framework',
        description: 'Comprehensive framework for measuring and evaluating performance',
        measurement_dimensions: {
          quantitative: 'Measurable, numerical performance indicators',
          qualitative: 'Subjective, descriptive performance assessments',
          behavioral: 'Observable behaviors and competencies',
          outcome: 'Results and achievements delivered',
          process: 'How work is performed and processes followed'
        },
        measurement_methods: [
          'Objective metrics and KPIs',
          'Subjective ratings and assessments',
          'Behavioral observations',
          'Outcome evaluations',
          'Process assessments'
        ]
      });

      // Load Performance Development Frameworks
      this.performanceFrameworks.set('performance_development', {
        name: 'Performance Development Framework',
        description: 'Framework for continuous performance improvement and development',
        development_areas: {
          skill_development: 'Technical and functional skill enhancement',
          competency_development: 'Core competency strengthening',
          behavioral_development: 'Soft skill and behavior improvement',
          leadership_development: 'Leadership and management capability building',
          career_development: 'Career progression and advancement planning'
        },
        development_methods: [
          'Training and education',
          'Coaching and mentoring',
          'Job rotation and assignments',
          'Project leadership',
          'Peer learning and collaboration'
        ]
      });

      // Load Performance Recognition Frameworks
      this.performanceFrameworks.set('performance_recognition', {
        name: 'Performance Recognition Framework',
        description: 'Framework for recognizing and rewarding performance achievements',
        recognition_types: {
          formal_recognition: 'Official recognition programs and awards',
          informal_recognition: 'Day-to-day appreciation and acknowledgment',
          peer_recognition: 'Recognition from colleagues and peers',
          customer_recognition: 'Recognition from customers and stakeholders',
          self_recognition: 'Self-acknowledgment and personal achievement'
        },
        recognition_methods: [
          'Performance awards and bonuses',
          'Public recognition and celebration',
          'Career advancement opportunities',
          'Learning and development opportunities',
          'Flexible work arrangements'
        ]
      });

      console.info('Performance analysis frameworks loaded successfully');

      // Return frameworks for use by ThreeEngineAgent
      return {
        performanceFrameworks: Object.fromEntries(this.performanceFrameworks),
        analysisMethodologies: Object.fromEntries(this.analysisMethodologies),
        performanceModels: Object.fromEntries(this.performanceModels)
      };
    } catch (error) {
      console.error('Failed to load performance analysis frameworks:', error);
      throw error;
    }
  }

  protected getKnowledgeSystemPrompt(): string {
    return `
You are a Performance Analysis Expert with comprehensive knowledge of:

PERFORMANCE ANALYSIS FRAMEWORKS:
- Balanced Scorecard: Financial, Customer, Internal Process, Learning & Growth perspectives
- OKR Framework: Objectives and Key Results with qualitative objectives and quantitative key results
- Competency Model: Core, functional, behavioral, and leadership competencies assessment
- Performance Management Cycle: Goal setting, planning, monitoring, review, and development phases
- Performance Dashboard: KPI tracking, trend analysis, benchmark comparison, risk indicators, improvement tracking
- Performance Analytics: Descriptive, diagnostic, predictive, and prescriptive analytics methods
- Performance Measurement: Quantitative, qualitative, behavioral, outcome, and process measurement dimensions
- Performance Development: Skill, competency, behavioral, leadership, and career development areas
- Performance Recognition: Formal, informal, peer, customer, and self-recognition types

ANALYSIS METHODOLOGIES:
- Trend Analysis: Time series analysis, statistical trend identification, seasonal pattern recognition
- Risk Assessment: Performance, retention, development, and compliance risk identification
- Benchmarking: Internal, external, historical, and peer performance comparison
- Insight Generation: Pattern recognition, correlation analysis, anomaly detection
- 360-Degree Analysis: Self, manager, peer, subordinate, and customer assessment perspectives
- Performance Attribution: Individual, environmental, organizational, and external factor analysis

PERFORMANCE MODELS:
- Performance Pyramid: Foundation, competency, performance, excellence, leadership levels
- Performance Spectrum: Significantly below to significantly exceeds expectations spectrum
- Competency-Based Assessment: Multi-dimensional competency evaluation
- Behavioral Analysis: Soft skills and interpersonal competency assessment

PERFORMANCE MEASUREMENT DIMENSIONS:
- Quantitative: Measurable, numerical performance indicators and KPIs
- Qualitative: Subjective, descriptive performance assessments and ratings
- Behavioral: Observable behaviors, competencies, and soft skills
- Outcome: Results, achievements, and deliverables produced
- Process: How work is performed, processes followed, and methodologies used

PERFORMANCE DEVELOPMENT AREAS:
- Skill Development: Technical and functional skill enhancement and mastery
- Competency Development: Core competency strengthening and advancement
- Behavioral Development: Soft skill and behavior improvement and refinement
- Leadership Development: Leadership and management capability building
- Career Development: Career progression, advancement planning, and succession

PERFORMANCE RECOGNITION TYPES:
- Formal Recognition: Official recognition programs, awards, and bonuses
- Informal Recognition: Day-to-day appreciation and acknowledgment
- Peer Recognition: Recognition from colleagues, peers, and team members
- Customer Recognition: Recognition from customers and stakeholders
- Self Recognition: Self-acknowledgment and personal achievement celebration

EXPERTISE AREAS:
- Comprehensive performance analysis across multiple dimensions and frameworks
- Advanced trend identification and predictive performance modeling
- Sophisticated risk assessment and mitigation strategy development
- Multi-level benchmarking and comparative performance analysis
- Advanced insight generation, pattern recognition, and correlation analysis
- Strategic recommendation development for performance improvement
- Multi-framework performance assessment integration and synthesis
- Performance data interpretation, visualization, and storytelling
- 360-degree performance assessment and multi-perspective analysis
- Performance attribution analysis and root cause identification
- Performance measurement methodology design and implementation
- Performance development planning and career progression guidance
- Performance recognition strategy design and implementation

Your comprehensive expertise enables you to provide deep, actionable, and strategic performance insights that drive individual excellence and organizational success.
`;
  }

  // ============================================================================
  // DATA ENGINE IMPLEMENTATION
  // ============================================================================

  protected async processData(input: PerformanceAnalysisContext): Promise<any> {
    try {
      const processedData = {
        employee: {
          id: input.employeeId,
          tenantId: input.tenantId,
          period: input.period,
          organizationalContext: input.organizationalContext
        },
        performance: {
          goals: input.performanceData.goals,
          reviews: input.performanceData.reviews,
          feedback: input.performanceData.feedback,
          metrics: input.performanceData.metrics,
          improvementPlans: input.performanceData.improvementPlans
        },
        historical: {
          previousPeriods: input.historicalData.previousPeriods,
          trends: input.historicalData.trends,
          benchmarks: input.historicalData.benchmarks
        },
        analysis: {
          type: input.analysisType,
          depth: input.analysisDepth
        }
      };

      // Comprehensive data analysis
      const performanceAnalysis = this.analyzePerformanceData(input);
      const trendAnalysis = this.analyzePerformanceTrends(input);
      const riskAnalysis = this.assessPerformanceRisks(input);
      const benchmarkAnalysis = this.performBenchmarking(input);
      const insightGeneration = this.generateInsights(input);
      const competencyAnalysis = this.analyzeCompetencyData(input);
      const behavioralAnalysis = this.analyzeBehavioralData(input);
      const feedbackAnalysis = this.analyzeFeedbackData(input);
      const improvementAnalysis = this.analyzeImprovementData(input);
      const attributionAnalysis = this.performAttributionAnalysis(input);
      const correlationAnalysis = this.performCorrelationAnalysis(input);
      const predictiveAnalysis = this.performPredictiveAnalysis(input);

      return {
        ...processedData,
        analysis: {
          performance: performanceAnalysis,
          trends: trendAnalysis,
          risks: riskAnalysis,
          benchmarks: benchmarkAnalysis,
          insights: insightGeneration,
          competency: competencyAnalysis,
          behavioral: behavioralAnalysis,
          feedback: feedbackAnalysis,
          improvement: improvementAnalysis,
          attribution: attributionAnalysis,
          correlation: correlationAnalysis,
          predictive: predictiveAnalysis
        }
      };
    } catch (error) {
      console.error('Failed to process performance analysis data:', error);
      throw error;
    }
  }

  protected getDataSystemPrompt(): string {
    return `
You are analyzing comprehensive performance data to provide deep insights and recommendations. Consider:

PERFORMANCE DATA ANALYSIS:
- Goal achievement patterns and progress tracking
- Review ratings and competency assessments
- Feedback sentiment and behavioral observations
- Metric trends and performance indicators
- Improvement plan progress and outcomes

TREND ANALYSIS:
- Performance trajectory over time
- Goal achievement trends and patterns
- Competency development progression
- Behavioral change patterns
- Feedback sentiment evolution

RISK ASSESSMENT:
- Performance decline indicators
- Retention risk factors
- Development gap identification
- Compliance and behavioral concerns
- Succession planning implications

BENCHMARKING ANALYSIS:
- Internal performance comparison
- External industry benchmarking
- Historical performance comparison
- Peer group analysis
- Best practice identification

COMPETENCY ANALYSIS:
- Core competency assessment and development
- Functional competency evaluation
- Behavioral competency analysis
- Leadership competency assessment
- Competency gap identification and development needs

BEHAVIORAL ANALYSIS:
- Behavioral pattern recognition
- Soft skill assessment and development
- Interpersonal competency evaluation
- Leadership behavior analysis
- Behavioral change tracking and improvement

FEEDBACK ANALYSIS:
- Feedback sentiment analysis and trends
- Feedback theme identification and categorization
- Feedback source analysis and credibility
- Feedback action item tracking and implementation
- Feedback impact assessment and improvement

IMPROVEMENT ANALYSIS:
- Improvement plan effectiveness and progress
- Development initiative success and outcomes
- Learning and development impact assessment
- Performance improvement trajectory analysis
- Improvement sustainability and long-term impact

ATTRIBUTION ANALYSIS:
- Performance factor identification and analysis
- Individual vs environmental factor assessment
- Organizational vs personal contribution analysis
- External vs internal influence evaluation
- Root cause analysis of performance outcomes

CORRELATION ANALYSIS:
- Performance metric correlation identification
- Goal achievement and competency correlation
- Feedback and performance correlation analysis
- Development and improvement correlation assessment
- Multi-factor performance correlation analysis

PREDICTIVE ANALYSIS:
- Future performance prediction and modeling
- Performance risk prediction and early warning
- Development trajectory prediction
- Success probability assessment
- Performance trend forecasting

INSIGHT GENERATION:
- Pattern recognition and correlation analysis
- Anomaly detection and outlier identification
- Opportunity identification and threat assessment
- Performance driver analysis
- Success factor identification

Focus on providing actionable insights, identifying trends, assessing risks, and generating recommendations for performance improvement and development.
`;
  }

  // ============================================================================
  // REASONING ENGINE IMPLEMENTATION
  // ============================================================================

  protected buildReasoningPrompt(data: any): string {
    const avgReviewRating = data.performance.reviews.length > 0 
      ? (data.performance.reviews.reduce((sum: any, r: any) => sum + r.overallRating, 0) / data.performance.reviews.length).toFixed(2)
      : 'N/A';
    
    const completedGoals = data.performance.goals.filter((g: any) => g.status === 'completed').length;
    const goalAchievementRate = data.performance.goals.length > 0
      ? ((completedGoals / data.performance.goals.length) * 100).toFixed(1)
      : 'N/A';

    return `
Based on the comprehensive performance data and analysis, provide detailed performance insights and recommendations.

EMPLOYEE CONTEXT:
- Employee ID: ${data.employee.id}
- Period: ${data.employee.period.startDate} to ${data.employee.period.endDate} (${data.employee.period.type})
- Role: ${data.employee.organizationalContext.role}
- Department: ${data.employee.organizationalContext.department}
- Team: ${data.employee.organizationalContext.team}
- Level: ${data.employee.organizationalContext.level}
- Manager ID: ${data.employee.organizationalContext.managerId}

PERFORMANCE DATA SUMMARY:
- Goals: ${data.performance.goals.length} total, ${completedGoals} completed (${goalAchievementRate}% achievement rate)
- Reviews: ${data.performance.reviews.length} reviews with average rating ${avgReviewRating}/5.0
- Feedback: ${data.performance.feedback.length} feedback items received
- Metrics: ${data.performance.metrics.length} performance metrics tracked
- Improvement Plans: ${data.performance.improvementPlans.length} plans (${data.performance.improvementPlans.filter((p: any) => p.status === 'active').length} active)

COMPREHENSIVE ANALYSIS RESULTS:
1. Performance Analysis: ${JSON.stringify(data.analysis.performance, null, 2)}
2. Trend Analysis: ${JSON.stringify(data.analysis.trends, null, 2)}
3. Risk Analysis: ${JSON.stringify(data.analysis.risks, null, 2)}
4. Benchmark Analysis: ${JSON.stringify(data.analysis.benchmarks, null, 2)}
5. Competency Analysis: ${JSON.stringify(data.analysis.competency, null, 2)}
6. Behavioral Analysis: ${JSON.stringify(data.analysis.behavioral, null, 2)}
7. Feedback Analysis: ${JSON.stringify(data.analysis.feedback, null, 2)}
8. Improvement Analysis: ${JSON.stringify(data.analysis.improvement, null, 2)}
9. Attribution Analysis: ${JSON.stringify(data.analysis.attribution, null, 2)}
10. Correlation Analysis: ${JSON.stringify(data.analysis.correlation, null, 2)}
11. Predictive Analysis: ${JSON.stringify(data.analysis.predictive, null, 2)}

ANALYSIS REQUIREMENTS:
1. OVERALL ASSESSMENT:
   - Calculate overall performance score (0-5 scale)
   - Determine performance level (significantly_below, below_expectations, meets_expectations, exceeds_expectations, significantly_exceeds)
   - Identify performance trend (improving, stable, declining, volatile)
   - Provide confidence level for the assessment (0-1 scale)
   - Write comprehensive summary of overall performance

2. GOAL ANALYSIS:
   - Analyze goal achievement patterns and quality
   - Identify top performing and underperforming goals
   - Assess goal alignment with organizational objectives
   - Provide specific goal-related recommendations

3. COMPETENCY ANALYSIS:
   - Evaluate competency levels and development
   - Identify competency strengths and development areas
   - Assess competency trends and progression
   - Provide competency development recommendations

4. BEHAVIORAL ANALYSIS:
   - Assess behavioral performance and patterns
   - Identify behavioral strengths and concerns
   - Evaluate behavioral trends and changes
   - Provide behavioral improvement recommendations

5. FEEDBACK ANALYSIS:
   - Analyze feedback sentiment and themes
   - Identify key feedback patterns and insights
   - Extract actionable items from feedback
   - Provide feedback-based recommendations

6. IMPROVEMENT ANALYSIS:
   - Evaluate improvement plan effectiveness
   - Assess improvement progress and outcomes
   - Identify key improvements and ongoing challenges
   - Provide improvement enhancement recommendations

7. RISK ASSESSMENT:
   - Identify performance risks (high, medium, low)
   - Assess retention risks and flight risk factors
   - Evaluate development risks and skill gaps
   - Provide risk mitigation strategies

8. BENCHMARKING:
   - Compare performance against internal benchmarks
   - Assess performance against external standards
   - Identify performance gaps and opportunities
   - Provide benchmark-based recommendations

9. INSIGHTS GENERATION:
   - Identify key insights and patterns
   - Recognize correlations and relationships
   - Detect anomalies and outliers
   - Identify opportunities and threats

10. RECOMMENDATIONS:
    - Immediate actions (within 1 week)
    - Short-term actions (within 1-3 months)
    - Long-term actions (within 6-12 months)
    - Development and training recommendations
    - Support and resource recommendations
    - Recognition and reward recommendations

11. NEXT STEPS:
    - Specific action items with owners
    - Timeline and milestones
    - Success metrics and KPIs
    - Review and follow-up schedule

PERFORMANCE ANALYSIS FRAMEWORK:
- Use Balanced Scorecard approach for multi-dimensional assessment
- Apply OKR and KPI frameworks for goal evaluation
- Conduct 360-degree analysis for comprehensive perspective
- Perform trend analysis for pattern identification
- Execute risk assessment for early warning identification
- Conduct benchmarking for comparative analysis
- Generate insights for strategic decision making
- Develop actionable recommendations for improvement

OUTPUT FORMAT:
Please provide your analysis in a structured format with clear sections for:
- Overall Assessment
- Goal Analysis
- Competency Analysis
- Behavioral Analysis
- Feedback Analysis
- Improvement Analysis
- Risk Assessment
- Benchmarking
- Insights
- Recommendations
- Next Steps

Provide detailed, specific, and actionable analysis with concrete recommendations for performance improvement and development.
`;
  }

  protected parseReasoningOutput(output: string): PerformanceAnalysisResult {
    try {
      // Parse the AI output to extract performance analysis
      const lines = output.split('\n');
      const analysis: Partial<PerformanceAnalysisResult> = {
        analysisId: `analysis_${Date.now()}`,
        employeeId: '',
        period: { startDate: '', endDate: '', type: '' },
        analysisType: 'comprehensive',
        analysisDepth: 'detailed',
        overallAssessment: {
          overallScore: 0,
          performanceLevel: 'meets_expectations',
          trend: 'stable',
          confidence: 0,
          summary: ''
        },
        goalAnalysis: {
          totalGoals: 0,
          completedGoals: 0,
          overdueGoals: 0,
          averageProgress: 0,
          achievementRate: 0,
          qualityScore: 0,
          alignmentScore: 0,
          topPerformingGoals: [],
          underperformingGoals: [],
          goalTrends: [],
          recommendations: []
        },
        competencyAnalysis: {
          overallCompetencyScore: 0,
          competencyBreakdown: {},
          strengths: [],
          developmentAreas: [],
          competencyTrends: [],
          recommendations: []
        },
        behaviorAnalysis: {
          overallBehaviorScore: 0,
          behaviorBreakdown: {},
          behavioralStrengths: [],
          behavioralConcerns: [],
          behaviorTrends: [],
          recommendations: []
        },
        feedbackAnalysis: {
          totalFeedback: 0,
          averageRating: 0,
          sentimentAnalysis: { positive: 0, neutral: 0, negative: 0, mixed: 0 },
          feedbackTrends: [],
          keyThemes: [],
          actionItems: [],
          recommendations: []
        },
        improvementAnalysis: {
          totalPlans: 0,
          activePlans: 0,
          completedPlans: 0,
          successRate: 0,
          averageProgress: 0,
          improvementTrends: [],
          keyImprovements: [],
          ongoingChallenges: [],
          recommendations: []
        },
        riskAssessment: {
          performanceRisks: { high: [], medium: [], low: [] },
          retentionRisks: { high: [], medium: [], low: [] },
          developmentRisks: { high: [], medium: [], low: [] },
          overallRiskLevel: 'low',
          riskFactors: [],
          mitigationStrategies: []
        },
        benchmarking: {
          internalComparison: {
            departmentRank: 0,
            teamRank: 0,
            percentile: 0,
            relativePerformance: ''
          },
          externalComparison: {
            industryBenchmark: 0,
            marketBenchmark: 0,
            gap: 0,
            competitivePosition: ''
          },
          benchmarkInsights: [],
          recommendations: []
        },
        insights: {
          keyInsights: [],
          patterns: [],
          correlations: [],
          anomalies: [],
          opportunities: [],
          threats: []
        },
        recommendations: {
          immediate: [],
          shortTerm: [],
          longTerm: [],
          development: [],
          support: [],
          recognition: []
        },
        nextSteps: {
          actionItems: [],
          timeline: [],
          responsibilities: [],
          successMetrics: [],
          reviewSchedule: []
        },
        metadata: {
          analysisDate: new Date().toISOString(),
          analystId: 'performance_analyzer_agent',
          dataQuality: 0.9,
          confidence: 0.85,
          version: '1.0.0',
          tags: [],
          notes: ''
        }
      };

      // Parse structured sections from the AI output
      let currentSection = '';
      const sectionContent: Record<string, string[]> = {};

      lines.forEach(line => {
        const trimmedLine = line.trim();
        
        // Identify section headers
        if (trimmedLine.toLowerCase().includes('overall assessment')) {
          currentSection = 'overallAssessment';
          sectionContent[currentSection] = [];
        } else if (trimmedLine.toLowerCase().includes('goal analysis')) {
          currentSection = 'goalAnalysis';
          sectionContent[currentSection] = [];
        } else if (trimmedLine.toLowerCase().includes('competency analysis')) {
          currentSection = 'competencyAnalysis';
          sectionContent[currentSection] = [];
        } else if (trimmedLine.toLowerCase().includes('behavioral analysis')) {
          currentSection = 'behaviorAnalysis';
          sectionContent[currentSection] = [];
        } else if (trimmedLine.toLowerCase().includes('feedback analysis')) {
          currentSection = 'feedbackAnalysis';
          sectionContent[currentSection] = [];
        } else if (trimmedLine.toLowerCase().includes('improvement analysis')) {
          currentSection = 'improvementAnalysis';
          sectionContent[currentSection] = [];
        } else if (trimmedLine.toLowerCase().includes('risk assessment')) {
          currentSection = 'riskAssessment';
          sectionContent[currentSection] = [];
        } else if (trimmedLine.toLowerCase().includes('benchmarking')) {
          currentSection = 'benchmarking';
          sectionContent[currentSection] = [];
        } else if (trimmedLine.toLowerCase().includes('insights')) {
          currentSection = 'insights';
          sectionContent[currentSection] = [];
        } else if (trimmedLine.toLowerCase().includes('recommendations')) {
          currentSection = 'recommendations';
          sectionContent[currentSection] = [];
        } else if (trimmedLine.toLowerCase().includes('next steps')) {
          currentSection = 'nextSteps';
          sectionContent[currentSection] = [];
        } else if (currentSection && trimmedLine) {
          sectionContent[currentSection].push(trimmedLine);
        }
      });

      // Extract overall assessment
      if (sectionContent.overallAssessment) {
        const assessmentText = sectionContent.overallAssessment.join(' ');
        
        // Extract performance score
        const scoreMatch = assessmentText.match(/score[:\s]+([0-9.]+)/i);
        if (scoreMatch) {
          analysis.overallAssessment!.overallScore = parseFloat(scoreMatch[1]);
        }
        
        // Extract performance level
        if (assessmentText.toLowerCase().includes('significantly exceeds')) {
          analysis.overallAssessment!.performanceLevel = 'exceeds_expectations';
        } else if (assessmentText.toLowerCase().includes('exceeds')) {
          analysis.overallAssessment!.performanceLevel = 'exceeds_expectations';
        } else if (assessmentText.toLowerCase().includes('meets')) {
          analysis.overallAssessment!.performanceLevel = 'meets_expectations';
        } else if (assessmentText.toLowerCase().includes('below')) {
          analysis.overallAssessment!.performanceLevel = 'below_expectations';
        } else if (assessmentText.toLowerCase().includes('significantly below')) {
          analysis.overallAssessment!.performanceLevel = 'significantly_below';
        }
        
        // Extract trend
        if (assessmentText.toLowerCase().includes('improving')) {
          analysis.overallAssessment!.trend = 'improving';
        } else if (assessmentText.toLowerCase().includes('declining')) {
          analysis.overallAssessment!.trend = 'declining';
        } else if (assessmentText.toLowerCase().includes('volatile')) {
          analysis.overallAssessment!.trend = 'volatile';
        }
        
        // Extract confidence
        const confidenceMatch = assessmentText.match(/confidence[:\s]+([0-9.]+)/i);
        if (confidenceMatch) {
          analysis.overallAssessment!.confidence = parseFloat(confidenceMatch[1]);
        }
        
        // Extract summary
        analysis.overallAssessment!.summary = sectionContent.overallAssessment.slice(0, 3).join(' ');
      }

      // Extract insights
      if (sectionContent.insights) {
        sectionContent.insights.forEach(line => {
          if (line.toLowerCase().includes('insight') || line.toLowerCase().includes('pattern')) {
            analysis.insights!.keyInsights.push(line);
          }
          if (line.toLowerCase().includes('correlation')) {
            analysis.insights!.correlations.push(line);
          }
          if (line.toLowerCase().includes('anomaly') || line.toLowerCase().includes('outlier')) {
            analysis.insights!.anomalies.push(line);
          }
          if (line.toLowerCase().includes('opportunity')) {
            analysis.insights!.opportunities.push(line);
          }
          if (line.toLowerCase().includes('threat') || line.toLowerCase().includes('risk')) {
            analysis.insights!.threats.push(line);
          }
        });
      }

      // Extract recommendations
      if (sectionContent.recommendations) {
        sectionContent.recommendations.forEach(line => {
          if (line.toLowerCase().includes('immediate') || line.toLowerCase().includes('urgent')) {
            analysis.recommendations!.immediate.push(line);
          } else if (line.toLowerCase().includes('short') || line.toLowerCase().includes('near')) {
            analysis.recommendations!.shortTerm.push(line);
          } else if (line.toLowerCase().includes('long') || line.toLowerCase().includes('strategic')) {
            analysis.recommendations!.longTerm.push(line);
          } else if (line.toLowerCase().includes('develop') || line.toLowerCase().includes('training') || line.toLowerCase().includes('learning')) {
            analysis.recommendations!.development.push(line);
          } else if (line.toLowerCase().includes('support') || line.toLowerCase().includes('resource')) {
            analysis.recommendations!.support.push(line);
          } else if (line.toLowerCase().includes('recognition') || line.toLowerCase().includes('reward') || line.toLowerCase().includes('acknowledge')) {
            analysis.recommendations!.recognition.push(line);
          } else {
            analysis.recommendations!.immediate.push(line); // Default to immediate
          }
        });
      }

      // Extract next steps
      if (sectionContent.nextSteps) {
        sectionContent.nextSteps.forEach(line => {
          if (line.toLowerCase().includes('action') || line.toLowerCase().includes('task')) {
            analysis.nextSteps!.actionItems.push(line);
          } else if (line.toLowerCase().includes('timeline') || line.toLowerCase().includes('deadline') || line.toLowerCase().includes('due')) {
            analysis.nextSteps!.timeline.push(line);
          } else if (line.toLowerCase().includes('responsible') || line.toLowerCase().includes('owner')) {
            analysis.nextSteps!.responsibilities.push(line);
          } else if (line.toLowerCase().includes('metric') || line.toLowerCase().includes('measure') || line.toLowerCase().includes('kpi')) {
            analysis.nextSteps!.successMetrics.push(line);
          } else if (line.toLowerCase().includes('review') || line.toLowerCase().includes('follow-up') || line.toLowerCase().includes('check-in')) {
            analysis.nextSteps!.reviewSchedule.push(line);
          }
        });
      }

      // Extract competency analysis
      if (sectionContent.competencyAnalysis) {
        sectionContent.competencyAnalysis.forEach(line => {
          if (line.toLowerCase().includes('strength')) {
            analysis.competencyAnalysis!.strengths.push(line);
          } else if (line.toLowerCase().includes('development') || line.toLowerCase().includes('improvement') || line.toLowerCase().includes('gap')) {
            analysis.competencyAnalysis!.developmentAreas.push(line);
          }
        });
      }

      // Extract behavioral analysis
      if (sectionContent.behaviorAnalysis) {
        sectionContent.behaviorAnalysis.forEach(line => {
          if (line.toLowerCase().includes('strength') || line.toLowerCase().includes('positive')) {
            analysis.behaviorAnalysis!.behavioralStrengths.push(line);
          } else if (line.toLowerCase().includes('concern') || line.toLowerCase().includes('area for improvement')) {
            analysis.behaviorAnalysis!.behavioralConcerns.push(line);
          }
        });
      }

      // Extract risk assessment
      if (sectionContent.riskAssessment) {
        const riskText = sectionContent.riskAssessment.join(' ');
        
        // Determine overall risk level
        if (riskText.toLowerCase().includes('critical risk') || riskText.toLowerCase().includes('high risk')) {
          analysis.riskAssessment!.overallRiskLevel = 'high';
        } else if (riskText.toLowerCase().includes('medium risk') || riskText.toLowerCase().includes('moderate risk')) {
          analysis.riskAssessment!.overallRiskLevel = 'medium';
        } else {
          analysis.riskAssessment!.overallRiskLevel = 'low';
        }
        
        sectionContent.riskAssessment.forEach(line => {
          if (line.toLowerCase().includes('performance risk')) {
            if (line.toLowerCase().includes('high')) {
              analysis.riskAssessment!.performanceRisks.high.push(line);
            } else if (line.toLowerCase().includes('medium')) {
              analysis.riskAssessment!.performanceRisks.medium.push(line);
            } else {
              analysis.riskAssessment!.performanceRisks.low.push(line);
            }
          } else if (line.toLowerCase().includes('retention risk') || line.toLowerCase().includes('flight risk')) {
            if (line.toLowerCase().includes('high')) {
              analysis.riskAssessment!.retentionRisks.high.push(line);
            } else if (line.toLowerCase().includes('medium')) {
              analysis.riskAssessment!.retentionRisks.medium.push(line);
            } else {
              analysis.riskAssessment!.retentionRisks.low.push(line);
            }
          } else if (line.toLowerCase().includes('development risk') || line.toLowerCase().includes('skill gap')) {
            if (line.toLowerCase().includes('high')) {
              analysis.riskAssessment!.developmentRisks.high.push(line);
            } else if (line.toLowerCase().includes('medium')) {
              analysis.riskAssessment!.developmentRisks.medium.push(line);
            } else {
              analysis.riskAssessment!.developmentRisks.low.push(line);
            }
          } else if (line.toLowerCase().includes('mitigation') || line.toLowerCase().includes('strategy')) {
            analysis.riskAssessment!.mitigationStrategies.push(line);
          }
        });
      }

      // Ensure all arrays have at least some content
      if (analysis.insights!.keyInsights.length === 0) {
        analysis.insights!.keyInsights.push('Comprehensive performance analysis completed');
      }
      
      if (analysis.recommendations!.immediate.length === 0) {
        analysis.recommendations!.immediate.push('Continue current performance trajectory');
      }
      
      if (analysis.nextSteps!.actionItems.length === 0) {
        analysis.nextSteps!.actionItems.push('Schedule follow-up performance review');
      }

      return analysis as PerformanceAnalysisResult;
    } catch (error) {
      console.error('Failed to parse performance analysis output:', error);
      throw error;
    }
  }

  // ============================================================================
  // ANALYSIS METHODS
  // ============================================================================

  private analyzePerformanceData(context: PerformanceAnalysisContext): any {
    const { performanceData } = context;
    
    return {
      goalPerformance: {
        totalGoals: performanceData.goals.length,
        completedGoals: performanceData.goals.filter((g: any) => g.status === 'completed').length,
        averageProgress: performanceData.goals.reduce((sum: any, g) => sum + g.currentProgress, 0) / performanceData.goals.length,
        achievementRate: performanceData.goals.reduce((sum: any, g) => sum + g.achievementRate, 0) / performanceData.goals.length
      },
      reviewPerformance: {
        totalReviews: performanceData.reviews.length,
        averageRating: performanceData.reviews.reduce((sum: any, r: any) => sum + r.overallRating, 0) / performanceData.reviews.length,
        completedReviews: performanceData.reviews.filter(r => r.status === 'completed').length
      },
      feedbackPerformance: {
        totalFeedback: performanceData.feedback.length,
        averageRating: performanceData.feedback.reduce((sum: any, f) => sum + f.rating, 0) / performanceData.feedback.length,
        positiveSentiment: performanceData.feedback.filter(f => f.sentiment === 'positive').length
      }
    };
  }

  private analyzePerformanceTrends(context: PerformanceAnalysisContext): any {
    const { historicalData } = context;
    
    return {
      overallTrend: historicalData.trends.find(t => t.metric === 'overall_performance')?.direction || 'stable',
      goalTrend: historicalData.trends.find(t => t.metric === 'goal_achievement')?.direction || 'stable',
      competencyTrend: historicalData.trends.find(t => t.metric === 'competency_development')?.direction || 'stable',
      behaviorTrend: historicalData.trends.find(t => t.metric === 'behavioral_performance')?.direction || 'stable'
    };
  }

  private assessPerformanceRisks(context: PerformanceAnalysisContext): any {
    const { performanceData, historicalData } = context;
    
    const risks = {
      performance: [] as string[],
      retention: [] as string[],
      development: [] as string[]
    };

    // Assess performance risks
    const lowAchievementGoals = performanceData.goals.filter((g: any) => g.achievementRate < 70);
    if (lowAchievementGoals.length > 0) {
      risks.performance.push('Low goal achievement rate indicates performance concerns');
    }

    // Assess retention risks
    const negativeFeedback = performanceData.feedback.filter(f => f.sentiment === 'negative');
    if (negativeFeedback.length > performanceData.feedback.length * 0.3) {
      risks.retention.push('High negative feedback ratio indicates potential retention risk');
    }

    return risks;
  }

  private performBenchmarking(context: PerformanceAnalysisContext): any {
    const { historicalData } = context;
    
    return {
      internalBenchmark: {
        departmentAverage: 3.5, // Placeholder
        teamAverage: 3.7, // Placeholder
        percentile: 75 // Placeholder
      },
      externalBenchmark: {
        industryAverage: 3.4, // Placeholder
        marketAverage: 3.6, // Placeholder
        gap: 0.1 // Placeholder
      }
    };
  }

  private generateInsights(context: PerformanceAnalysisContext): any {
    const { performanceData } = context;
    
    const insights = {
      patterns: [] as string[],
      correlations: [] as string[],
      opportunities: [] as string[],
      threats: [] as string[]
    };

    // Generate pattern insights
    const highPerformingGoals = performanceData.goals.filter((g: any) => g.achievementRate >= 90);
    if (highPerformingGoals.length > 0) {
      insights.patterns.push('Consistent high performance in goal achievement');
    }

    // Generate opportunity insights
    const improvementPlans = performanceData.improvementPlans.filter(p => p.status === 'active');
    if (improvementPlans.length > 0) {
      insights.opportunities.push('Active improvement plans show commitment to development');
    }

    return insights;
  }

  /**
   * Analyze competency data and development patterns
   */
  private analyzeCompetencyData(context: PerformanceAnalysisContext): any {
    const { performanceData, historicalData } = context;
    
    const competencyAnalysis = {
      overallCompetencyScore: 0,
      competencyBreakdown: {} as Record<string, any>,
      competencyTrends: [] as string[],
      competencyGaps: [] as string[],
      developmentNeeds: [] as string[],
      competencyStrengths: [] as string[],
      competencyRecommendations: [] as string[]
    };

    // Analyze competency scores from reviews
    if (performanceData.reviews.length > 0) {
      const latestReview = performanceData.reviews[performanceData.reviews.length - 1];
      competencyAnalysis.overallCompetencyScore = Object.values(latestReview.competencyRatings).reduce((sum: any, rating) => sum + rating, 0) / Object.keys(latestReview.competencyRatings).length;
      
      // Analyze individual competencies
      Object.entries(latestReview.competencyRatings).forEach(([competency, rating]) => {
        competencyAnalysis.competencyBreakdown[competency] = {
          score: rating,
          level: rating >= 4 ? 'exceeds' : rating >= 3 ? 'meets' : 'below',
          trend: 'stable', // Would be calculated from historical data
          gap: rating < 3 ? 3 - rating : 0
        };
        
        if (rating >= 4) {
          competencyAnalysis.competencyStrengths.push(competency);
        } else if (rating < 3) {
          competencyAnalysis.competencyGaps.push(competency);
          competencyAnalysis.developmentNeeds.push(`${competency} development needed`);
        }
      });
    }

    return competencyAnalysis;
  }

  /**
   * Analyze behavioral data and patterns
   */
  private analyzeBehavioralData(context: PerformanceAnalysisContext): any {
    const { performanceData } = context;
    
    const behavioralAnalysis = {
      overallBehaviorScore: 0,
      behaviorBreakdown: {} as Record<string, any>,
      behaviorTrends: [] as string[],
      behavioralStrengths: [] as string[],
      behavioralConcerns: [] as string[],
      behaviorRecommendations: [] as string[]
    };

    // Analyze behavioral scores from reviews
    if (performanceData.reviews.length > 0) {
      const latestReview = performanceData.reviews[performanceData.reviews.length - 1];
      behavioralAnalysis.overallBehaviorScore = Object.values(latestReview.behaviorRatings).reduce((sum: any, rating) => sum + rating, 0) / Object.keys(latestReview.behaviorRatings).length;
      
      // Analyze individual behaviors
      Object.entries(latestReview.behaviorRatings).forEach(([behavior, rating]) => {
        behavioralAnalysis.behaviorBreakdown[behavior] = {
          score: rating,
          level: rating >= 4 ? 'exceeds' : rating >= 3 ? 'meets' : 'below',
          trend: 'stable', // Would be calculated from historical data
          feedback: latestReview.strengths.includes(behavior) ? 'positive' : latestReview.developmentAreas.includes(behavior) ? 'negative' : 'neutral'
        };
        
        if (rating >= 4) {
          behavioralAnalysis.behavioralStrengths.push(behavior);
        } else if (rating < 3) {
          behavioralAnalysis.behavioralConcerns.push(behavior);
        }
      });
    }

    return behavioralAnalysis;
  }

  /**
   * Analyze feedback data and sentiment
   */
  private analyzeFeedbackData(context: PerformanceAnalysisContext): any {
    const { performanceData } = context;
    
    const feedbackAnalysis = {
      totalFeedback: performanceData.feedback.length,
      averageRating: 0,
      sentimentAnalysis: {
        positive: 0,
        neutral: 0,
        negative: 0,
        mixed: 0
      },
      feedbackTrends: [] as string[],
      keyThemes: [] as string[],
      actionItems: [] as string[],
      feedbackRecommendations: [] as string[]
    };

    if (performanceData.feedback.length > 0) {
      // Calculate average rating
      feedbackAnalysis.averageRating = performanceData.feedback.reduce((sum: any, f) => sum + f.rating, 0) / performanceData.feedback.length;
      
      // Analyze sentiment
      performanceData.feedback.forEach(feedback => {
        switch (feedback.sentiment) {
          case 'positive':
            feedbackAnalysis.sentimentAnalysis.positive++;
            break;
          case 'neutral':
            feedbackAnalysis.sentimentAnalysis.neutral++;
            break;
          case 'negative':
            feedbackAnalysis.sentimentAnalysis.negative++;
            break;
          case 'mixed':
            feedbackAnalysis.sentimentAnalysis.mixed++;
            break;
        }
      });

      // Extract key themes
      const allComments = performanceData.feedback.map(f => f.comments).join(' ');
      // Simple theme extraction (would be enhanced with NLP)
      if (allComments.includes('communication')) feedbackAnalysis.keyThemes.push('Communication');
      if (allComments.includes('leadership')) feedbackAnalysis.keyThemes.push('Leadership');
      if (allComments.includes('collaboration')) feedbackAnalysis.keyThemes.push('Collaboration');
    }

    return feedbackAnalysis;
  }

  /**
   * Analyze improvement plan data and progress
   */
  private analyzeImprovementData(context: PerformanceAnalysisContext): any {
    const { performanceData } = context;
    
    const improvementAnalysis = {
      totalPlans: performanceData.improvementPlans.length,
      activePlans: performanceData.improvementPlans.filter(p => p.status === 'active').length,
      completedPlans: performanceData.improvementPlans.filter(p => p.status === 'completed').length,
      successRate: 0,
      averageProgress: 0,
      improvementTrends: [] as string[],
      keyImprovements: [] as string[],
      ongoingChallenges: [] as string[],
      improvementRecommendations: [] as string[]
    };

    if (performanceData.improvementPlans.length > 0) {
      // Calculate success rate
      const successfulPlans = performanceData.improvementPlans.filter(p => p.outcome === 'successful').length;
      improvementAnalysis.successRate = (successfulPlans / performanceData.improvementPlans.length) * 100;
      
      // Calculate average progress
      improvementAnalysis.averageProgress = performanceData.improvementPlans.reduce((sum: any, p) => sum + p.progress, 0) / performanceData.improvementPlans.length;
      
      // Extract key improvements
      performanceData.improvementPlans.forEach(plan => {
        if (plan.outcome === 'successful') {
          improvementAnalysis.keyImprovements.push(plan.title);
        } else if (plan.status === 'active' && plan.progress < 50) {
          improvementAnalysis.ongoingChallenges.push(plan.title);
        }
      });
    }

    return improvementAnalysis;
  }

  /**
   * Perform attribution analysis to identify performance factors
   */
  private performAttributionAnalysis(context: PerformanceAnalysisContext): any {
    const { performanceData, organizationalContext } = context;
    
    const attributionAnalysis = {
      individualFactors: [] as string[],
      environmentalFactors: [] as string[],
      organizationalFactors: [] as string[],
      externalFactors: [] as string[],
      factorWeights: {} as Record<string, number>,
      attributionInsights: [] as string[],
      attributionRecommendations: [] as string[]
    };

    // Analyze individual factors
    const highPerformingGoals = performanceData.goals.filter((g: any) => g.achievementRate >= 90);
    if (highPerformingGoals.length > 0) {
      attributionAnalysis.individualFactors.push('High personal motivation and effort');
      attributionAnalysis.factorWeights.individual = 0.4;
    }

    // Analyze environmental factors
    if (organizationalContext.department && organizationalContext.team) {
      attributionAnalysis.environmentalFactors.push('Supportive team and department environment');
      attributionAnalysis.factorWeights.environmental = 0.3;
    }

    // Analyze organizational factors
    if (performanceData.reviews.some(r => r.overallRating >= 4)) {
      attributionAnalysis.organizationalFactors.push('Strong organizational support and resources');
      attributionAnalysis.factorWeights.organizational = 0.2;
    }

    // Analyze external factors
    attributionAnalysis.externalFactors.push('Market conditions and industry trends');
    attributionAnalysis.factorWeights.external = 0.1;

    return attributionAnalysis;
  }

  /**
   * Perform correlation analysis between performance metrics
   */
  private performCorrelationAnalysis(context: PerformanceAnalysisContext): any {
    const { performanceData } = context;
    
    const correlationAnalysis = {
      goalCompetencyCorrelation: 0,
      feedbackPerformanceCorrelation: 0,
      improvementSuccessCorrelation: 0,
      correlationInsights: [] as string[],
      correlationRecommendations: [] as string[]
    };

    // Calculate goal-competency correlation
    if (performanceData.goals.length > 0 && performanceData.reviews.length > 0) {
      const avgGoalAchievement = performanceData.goals.reduce((sum: any, g) => sum + g.achievementRate, 0) / performanceData.goals.length;
      const avgCompetencyScore = performanceData.reviews[0].overallRating;
      correlationAnalysis.goalCompetencyCorrelation = Math.min(avgGoalAchievement / 100, avgCompetencyScore / 5);
    }

    // Calculate feedback-performance correlation
    if (performanceData.feedback.length > 0 && performanceData.reviews.length > 0) {
      const avgFeedbackRating = performanceData.feedback.reduce((sum: any, f) => sum + f.rating, 0) / performanceData.feedback.length;
      const avgPerformanceRating = performanceData.reviews[0].overallRating;
      correlationAnalysis.feedbackPerformanceCorrelation = Math.min(avgFeedbackRating / 5, avgPerformanceRating / 5);
    }

    return correlationAnalysis;
  }

  /**
   * Perform predictive analysis for future performance
   */
  private performPredictiveAnalysis(context: PerformanceAnalysisContext): any {
    const { performanceData, historicalData } = context;
    
    const predictiveAnalysis = {
      predictedPerformance: 0,
      predictedRetention: 0,
      predictedPromotion: 0,
      performanceRisk: 'low' as 'low' | 'medium' | 'high' | 'critical',
      retentionRisk: 'low' as 'low' | 'medium' | 'high' | 'critical',
      promotionProbability: 0,
      predictiveInsights: [] as string[],
      predictiveRecommendations: [] as string[]
    };

    // Predict future performance based on trends
    if (historicalData.previousPeriods.length > 0) {
      const recentPerformance = historicalData.previousPeriods.slice(-3);
      const avgRecentPerformance = recentPerformance.reduce((sum: any, p) => sum + p.overallScore, 0) / recentPerformance.length;
      predictiveAnalysis.predictedPerformance = avgRecentPerformance;
      
      // Assess performance risk
      if (avgRecentPerformance < 3.0) {
        predictiveAnalysis.performanceRisk = 'high';
      } else if (avgRecentPerformance < 3.5) {
        predictiveAnalysis.performanceRisk = 'medium';
      }
    }

    // Predict retention based on feedback sentiment
    if (performanceData.feedback.length > 0) {
      const negativeFeedback = performanceData.feedback.filter(f => f.sentiment === 'negative').length;
      const negativeRatio = negativeFeedback / performanceData.feedback.length;
      
      if (negativeRatio > 0.3) {
        predictiveAnalysis.retentionRisk = 'high';
        predictiveAnalysis.predictedRetention = 0.6;
      } else if (negativeRatio > 0.2) {
        predictiveAnalysis.retentionRisk = 'medium';
        predictiveAnalysis.predictedRetention = 0.8;
      } else {
        predictiveAnalysis.predictedRetention = 0.9;
      }
    }

    // Predict promotion probability
    if (performanceData.reviews.length > 0) {
      const avgRating = performanceData.reviews.reduce((sum: any, r: any) => sum + r.overallRating, 0) / performanceData.reviews.length;
      predictiveAnalysis.promotionProbability = Math.min(avgRating / 5, 1);
    }

    return predictiveAnalysis;
  }

  // ============================================================================
  // MAIN ANALYSIS METHOD
  // ============================================================================

  public async analyzePerformance(context: PerformanceAnalysisContext): Promise<PerformanceAnalysisResult> {
    try {
      console.info('Starting performance analysis', { employeeId: context.employeeId });

      // Run the three-engine analysis using parent class method
      const engineResult = await super.analyze(context);

      // Transform engine result to PerformanceAnalysisResult
      const result: PerformanceAnalysisResult = {
        analysisId: `analysis-${Date.now()}`,
        employeeId: context.employeeId,
        period: context.period,
        analysisType: context.analysisType || 'comprehensive',
        analysisDepth: context.analysisDepth || 'detailed',
        overallAssessment: engineResult.reasoning.output.overallAssessment || {
          overallScore: 75,
          performanceLevel: 'meets_expectations' as const,
          trend: 'stable' as const,
          confidence: engineResult.overallConfidence,
          summary: 'Performance analysis completed'
        },
        goalAnalysis: engineResult.reasoning.output.goalAnalysis || {
          totalGoals: 0,
          completedGoals: 0,
          overdueGoals: 0,
          averageProgress: 0,
          achievementRate: 0,
          qualityScore: 0,
          alignmentScore: 0,
          topPerformingGoals: [],
          underperformingGoals: [],
          goalTrends: [],
          recommendations: []
        },
        competencyAnalysis: engineResult.reasoning.output.competencyAnalysis || {
          overallCompetencyScore: 0,
          competencyBreakdown: {},
          strengths: [],
          developmentAreas: [],
          competencyTrends: [],
          recommendations: []
        },
        behaviorAnalysis: engineResult.reasoning.output.behaviorAnalysis || {
          overallBehaviorScore: 0,
          behaviorBreakdown: {},
          behavioralStrengths: [],
          behavioralConcerns: [],
          behaviorTrends: [],
          recommendations: []
        },
        feedbackAnalysis: engineResult.reasoning.output.feedbackAnalysis || {
          totalFeedback: 0,
          averageRating: 0,
          sentimentAnalysis: { positive: 0, neutral: 0, negative: 0, mixed: 0 },
          feedbackTrends: [],
          keyThemes: [],
          actionItems: [],
          recommendations: []
        },
        improvementAnalysis: engineResult.reasoning.output.improvementAnalysis || {
          totalPlans: 0,
          activePlans: 0,
          completedPlans: 0,
          successRate: 0,
          averageProgress: 0,
          improvementTrends: [],
          keyImprovements: [],
          ongoingChallenges: [],
          recommendations: []
        },
        riskAssessment: engineResult.reasoning.output.riskAssessment || {
          performanceRisks: { high: [], medium: [], low: [] },
          retentionRisks: { high: [], medium: [], low: [] },
          developmentRisks: { high: [], medium: [], low: [] },
          overallRiskLevel: 'low' as const,
          riskFactors: [],
          mitigationStrategies: []
        },
        benchmarking: engineResult.reasoning.output.benchmarking || {
          internalComparison: { departmentRank: 0, teamRank: 0, percentile: 0, relativePerformance: '' },
          externalComparison: { industryBenchmark: 0, marketBenchmark: 0, gap: 0, competitivePosition: '' },
          benchmarkInsights: [],
          recommendations: []
        },
        insights: engineResult.reasoning.output.insights || {
          keyInsights: [],
          patterns: [],
          correlations: [],
          anomalies: [],
          opportunities: [],
          threats: []
        },
        recommendations: engineResult.reasoning.output.recommendations || {
          immediate: [],
          shortTerm: [],
          longTerm: [],
          development: [],
          support: [],
          recognition: []
        },
        nextSteps: engineResult.reasoning.output.nextSteps || {
          actionItems: [],
          timeline: [],
          responsibilities: [],
          successMetrics: [],
          reviewSchedule: []
        },
        metadata: {
          analysisDate: new Date().toISOString(),
          analystId: 'PerformanceAnalyzerAgent',
          dataQuality: engineResult.data.confidence,
          confidence: engineResult.overallConfidence,
          version: '1.0.0',
          tags: [],
          notes: `Processing time: ${engineResult.totalProcessingTime}ms`
        }
      };

      console.info('Performance analysis completed successfully', {
        employeeId: context.employeeId,
        analysisType: context.analysisType,
        confidence: result.metadata.confidence
      });

      return result;
    } catch (error) {
      console.error('Performance analysis failed:', error);
      throw error;
    }
  }
}
