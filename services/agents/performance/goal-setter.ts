/**
 * Performance Goal Setter Agent
 * 
 * AI agent responsible for setting, managing, and optimizing performance goals
 * for employees based on organizational objectives, individual capabilities,
 * and performance data analysis.
 * 
 * Task Reference: Module 2 (Performance Management) - Section 2.2.1
 */

import { ThreeEngineAgent } from '../base/three-engine-agent.js';
import { UnifiedResults } from '../../results/unified-results.js';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface GoalSettingContext {
  employeeId: string;
  tenantId: string;
  managerId: string;
  period: 'quarterly' | 'annual' | 'monthly';
  role: string;
  department: string;
  currentPerformance: {
    overallScore: number;
    goalAchievementRate: number;
    competencyScores: Record<string, number>;
    behaviorScores: Record<string, number>;
  };
  organizationalObjectives: {
    strategicGoals: string[];
    departmentGoals: string[];
    teamGoals: string[];
  };
  historicalData: {
    previousGoals: Array<{
      id: string;
      title: string;
      category: string;
      achievementRate: number;
      completionTime: number;
    }>;
    performanceTrends: Record<string, 'improving' | 'declining' | 'stable'>;
  };
  constraints: {
    maxGoals: number;
    minGoals: number;
    budgetLimits?: Record<string, number>;
    timeConstraints?: Record<string, number>;
  };
}

export interface GoalRecommendation {
  id: string;
  title: string;
  description: string;
  category: 'revenue' | 'productivity' | 'quality' | 'learning' | 'leadership' | 'innovation' | 'customer_satisfaction' | 'operational_excellence';
  type: 'individual' | 'team' | 'organizational';
  format: 'okr' | 'smart' | 'kpi' | 'mbo';
  priority: number;
  weight: number;
  target: Record<string, any>;
  baseline: Record<string, any>;
  timeline: {
    startDate: string;
    targetDate: string;
    milestones: Array<{
      date: string;
      description: string;
      target: Record<string, any>;
    }>;
  };
  alignment: {
    organizationalGoals: string[];
    departmentGoals: string[];
    teamGoals: string[];
    managerGoals: string[];
  };
  rationale: {
    businessImpact: string;
    employeeDevelopment: string;
    feasibility: string;
    riskAssessment: string;
  };
  successCriteria: {
    quantitative: Record<string, { target: number; unit: string }>;
    qualitative: string[];
  };
  support: {
    resources: string[];
    training: string[];
    mentorship: string[];
  };
}

export interface GoalSettingResult {
  success: boolean;
  recommendations: GoalRecommendation[];
  insights: {
    strengths: string[];
    developmentAreas: string[];
    opportunities: string[];
    risks: string[];
  };
  alignment: {
    organizationalAlignment: number;
    departmentAlignment: number;
    teamAlignment: number;
  };
  confidence: number;
  reasoning: string;
  nextSteps: string[];
}

// ============================================================================
// PERFORMANCE GOAL SETTER AGENT
// ============================================================================

export class PerformanceGoalSetterAgent extends ThreeEngineAgent {

  // Abstract methods implemented below in their proper locations
  private goalFrameworks: Map<string, any> = new Map();
  private performanceModels: Map<string, any> = new Map();
  private alignmentStrategies: Map<string, any> = new Map();

  constructor() {
    super('performance-goal-setter', {
      knowledge: { providers: ['openai'], model: 'gpt-4', temperature: 0.3, maxTokens: 2000 },
      data: { providers: ['openai'], model: 'gpt-4', temperature: 0.1, maxTokens: 2000 },
      reasoning: { providers: ['openai'], model: 'gpt-4', temperature: 0.5, maxTokens: 3000 },
      consensusThreshold: 0.8
    });
    // Legacy config:
    const legacyConfig = {
      name: 'Performance Goal Setter Agent',
      description: 'AI agent for setting and optimizing performance goals',
      version: '1.0.0',
      capabilities: [
        'goal_recommendation',
        'goal_alignment',
        'performance_analysis',
        'goal_optimization',
        'risk_assessment',
        'success_prediction'
      ],
      providers: ['claude', 'gpt4', 'cohere']
    };
  }

  // ============================================================================
  // KNOWLEDGE ENGINE IMPLEMENTATION
  // ============================================================================

  protected async loadFrameworks(): Promise<any> {
    try {
      // Load SMART Goals Framework
      this.goalFrameworks.set('smart', {
        name: 'SMART Goals Framework',
        description: 'Specific, Measurable, Achievable, Relevant, Time-bound goals',
        criteria: {
          specific: 'Clear and well-defined objectives',
          measurable: 'Quantifiable success metrics',
          achievable: 'Realistic and attainable goals',
          relevant: 'Aligned with organizational objectives',
          timebound: 'Clear timeline and deadlines'
        },
        bestPractices: [
          'Use action verbs in goal statements',
          'Include specific numbers and metrics',
          'Ensure goals are challenging but realistic',
          'Align with company values and strategy',
          'Set regular check-in points'
        ]
      });

      // Load OKR Framework
      this.goalFrameworks.set('okr', {
        name: 'Objectives and Key Results',
        description: 'Goal-setting framework with objectives and measurable key results',
        structure: {
          objectives: 'Qualitative, inspirational goals',
          keyResults: 'Quantitative, measurable outcomes'
        },
        principles: [
          'Objectives should be inspirational and qualitative',
          'Key Results should be measurable and quantifiable',
          'Aim for 3-5 key results per objective',
          'Set ambitious but achievable goals',
          'Regular review and adjustment'
        ]
      });

      // Load KPI Framework
      this.goalFrameworks.set('kpi', {
        name: 'Key Performance Indicators',
        description: 'Quantitative metrics to measure performance',
        categories: {
          financial: 'Revenue, profit, cost metrics',
          operational: 'Efficiency, productivity metrics',
          customer: 'Satisfaction, retention metrics',
          employee: 'Engagement, development metrics'
        },
        bestPractices: [
          'Focus on leading and lagging indicators',
          'Ensure metrics are actionable',
          'Regular monitoring and reporting',
          'Benchmark against industry standards'
        ]
      });

      // Load MBO Framework
      this.goalFrameworks.set('mbo', {
        name: 'Management by Objectives',
        description: 'Goal-setting approach where managers and employees set objectives together',
        process: [
          'Define organizational objectives',
          'Cascade objectives to departments',
          'Set individual objectives',
          'Monitor progress regularly',
          'Evaluate and provide feedback'
        ],
        benefits: [
          'Clear direction and focus',
          'Improved communication',
          'Enhanced motivation',
          'Better performance measurement'
        ]
      });

      // Load Performance Models
      this.performanceModels.set('balanced_scorecard', {
        name: 'Balanced Scorecard',
        perspectives: ['financial', 'customer', 'internal_process', 'learning_growth'],
        metrics: {
          financial: ['revenue_growth', 'profit_margin', 'cost_reduction'],
          customer: ['satisfaction', 'retention', 'acquisition'],
          internal_process: ['efficiency', 'quality', 'innovation'],
          learning_growth: ['employee_development', 'capability_building', 'culture']
        }
      });

      // Load Alignment Strategies
      this.alignmentStrategies.set('cascading', {
        name: 'Cascading Goals',
        description: 'Goals flow from organizational to individual level',
        levels: ['organizational', 'departmental', 'team', 'individual'],
        principles: [
          'Clear connection between levels',
          'Consistent measurement approach',
          'Regular alignment reviews',
          'Flexible adjustment process'
        ]
      });

      // Load Additional Goal-Setting Frameworks
      this.goalFrameworks.set('moonshot', {
        name: 'Moonshot Goals',
        description: 'Ambitious, long-term goals that inspire breakthrough thinking',
        characteristics: [
          '10x improvement rather than 10%',
          'Inspire and motivate teams',
          'Require breakthrough innovation',
          'Long-term vision (5-10 years)',
          'Clear success criteria'
        ],
        bestPractices: [
          'Balance ambition with feasibility',
          'Break down into smaller milestones',
          'Regular progress reviews',
          'Celebrate small wins along the way'
        ]
      });

      this.goalFrameworks.set('stretch_goals', {
        name: 'Stretch Goals',
        description: 'Challenging goals that push beyond current capabilities',
        characteristics: [
          'Significantly beyond current performance',
          'Require new approaches or skills',
          'High risk, high reward',
          'Motivate innovation and growth',
          'Clear success metrics'
        ],
        implementation: [
          'Set 70% probability of achievement',
          'Provide additional resources and support',
          'Regular check-ins and adjustments',
          'Celebrate progress and learning'
        ]
      });

      // Load Performance Models
      this.performanceModels.set('competency_model', {
        name: 'Competency-Based Performance',
        description: 'Performance assessment based on competencies and behaviors',
        components: {
          core_competencies: ['communication', 'leadership', 'problem_solving', 'collaboration'],
          functional_competencies: ['technical_skills', 'domain_expertise', 'industry_knowledge'],
          behavioral_competencies: ['adaptability', 'initiative', 'integrity', 'customer_focus']
        },
        assessment_methods: [
          '360-degree feedback',
          'Behavioral interviews',
          'Performance observations',
          'Self-assessment'
        ]
      });

      this.performanceModels.set('performance_management_cycle', {
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

      // Load Goal Alignment Strategies
      this.alignmentStrategies.set('strategic_alignment', {
        name: 'Strategic Goal Alignment',
        description: 'Aligning individual goals with strategic objectives',
        levels: [
          'Vision and Mission alignment',
          'Strategic objectives alignment',
          'Departmental goals alignment',
          'Team objectives alignment',
          'Individual performance goals alignment'
        ],
        principles: [
          'Clear strategic communication',
          'Regular alignment reviews',
          'Flexible goal adjustment',
          'Performance measurement consistency'
        ]
      });

      this.alignmentStrategies.set('matrix_alignment', {
        name: 'Matrix Goal Alignment',
        description: 'Aligning goals across multiple reporting relationships',
        considerations: [
          'Primary and secondary reporting relationships',
          'Cross-functional team goals',
          'Project-based objectives',
          'Matrix organization challenges'
        ],
        bestPractices: [
          'Clear goal ownership',
          'Regular communication',
          'Conflict resolution processes',
          'Performance evaluation coordination'
        ]
      });

      // Load Goal Categories and Types
      this.goalFrameworks.set('goal_categories', {
        name: 'Performance Goal Categories',
        categories: {
          revenue: {
            description: 'Financial performance and revenue generation',
            examples: ['Sales targets', 'Revenue growth', 'Profit margins', 'Cost reduction'],
            metrics: ['Percentage increase', 'Dollar amounts', 'ROI', 'Cost savings']
          },
          productivity: {
            description: 'Efficiency and output improvement',
            examples: ['Process optimization', 'Time management', 'Resource utilization', 'Output quality'],
            metrics: ['Time reduction', 'Output increase', 'Quality scores', 'Efficiency ratios']
          },
          quality: {
            description: 'Quality improvement and excellence',
            examples: ['Error reduction', 'Customer satisfaction', 'Product quality', 'Service excellence'],
            metrics: ['Error rates', 'Satisfaction scores', 'Quality ratings', 'Defect reduction']
          },
          learning: {
            description: 'Skill development and knowledge acquisition',
            examples: ['Skill certification', 'Training completion', 'Knowledge application', 'Mentoring others'],
            metrics: ['Certifications earned', 'Training hours', 'Skill assessments', 'Knowledge tests']
          },
          leadership: {
            description: 'Leadership development and team management',
            examples: ['Team development', 'Leadership skills', 'Decision making', 'Change management'],
            metrics: ['Team performance', 'Leadership assessments', 'Decision quality', 'Change adoption']
          },
          innovation: {
            description: 'Innovation and creative problem solving',
            examples: ['New ideas', 'Process improvements', 'Product innovation', 'Creative solutions'],
            metrics: ['Ideas implemented', 'Innovation impact', 'Process improvements', 'Creative outcomes']
          },
          customer_satisfaction: {
            description: 'Customer experience and satisfaction',
            examples: ['Customer satisfaction', 'Service quality', 'Response time', 'Customer retention'],
            metrics: ['Satisfaction scores', 'Response times', 'Retention rates', 'Service quality']
          },
          operational_excellence: {
            description: 'Operational efficiency and excellence',
            examples: ['Process optimization', 'System improvements', 'Operational metrics', 'Efficiency gains'],
            metrics: ['Process efficiency', 'System performance', 'Operational KPIs', 'Efficiency improvements']
          }
        }
      });

      // Load Goal Setting Best Practices
      this.goalFrameworks.set('best_practices', {
        name: 'Goal Setting Best Practices',
        practices: {
          goal_quantity: {
            recommendation: '3-7 goals per employee per period',
            rationale: 'Balances focus with comprehensiveness',
            considerations: [
              'Employee capacity and role complexity',
              'Goal interdependencies',
              'Resource availability',
              'Timeline constraints'
            ]
          },
          goal_balance: {
            recommendation: 'Mix of individual and team goals',
            rationale: 'Promotes both personal growth and collaboration',
            distribution: [
              '60-70% individual goals',
              '30-40% team/collective goals',
              'Include cross-functional objectives'
            ]
          },
          goal_difficulty: {
            recommendation: 'Challenging but achievable goals',
            rationale: 'Motivates performance without causing stress',
            guidelines: [
              '70% probability of achievement',
              'Stretch beyond current capabilities',
              'Require effort and skill development',
              'Provide growth opportunities'
            ]
          },
          goal_measurement: {
            recommendation: 'Clear, measurable success criteria',
            rationale: 'Enables objective evaluation and progress tracking',
            requirements: [
              'Quantitative metrics where possible',
              'Qualitative criteria for complex goals',
              'Baseline measurements',
              'Regular progress checkpoints'
            ]
          },
          goal_timeline: {
            recommendation: 'Realistic timelines with milestones',
            rationale: 'Provides structure and enables progress tracking',
            elements: [
              'Clear start and end dates',
              'Intermediate milestones',
              'Regular review points',
              'Flexibility for adjustments'
            ]
          }
        }
      });

      console.info('Enhanced performance goal frameworks and models loaded successfully');

      // Return frameworks for use by ThreeEngineAgent
      return {
        goalFrameworks: Object.fromEntries(this.goalFrameworks),
        performanceModels: Object.fromEntries(this.performanceModels),
        alignmentStrategies: Object.fromEntries(this.alignmentStrategies)
      };
    } catch (error) {
      console.error('Failed to load goal frameworks:', error);
      throw error;
    }
  }

  protected getKnowledgeSystemPrompt(): string {
    return `
You are a Performance Goal Setting Expert with comprehensive knowledge of:

GOAL-SETTING FRAMEWORKS:
- SMART Goals: Specific, Measurable, Achievable, Relevant, Time-bound
- OKR: Objectives and Key Results with qualitative objectives and quantitative key results
- KPI: Key Performance Indicators for measuring performance
- MBO: Management by Objectives for collaborative goal setting
- Moonshot Goals: Ambitious, long-term goals that inspire breakthrough thinking (10x improvement)
- Stretch Goals: Challenging goals that push beyond current capabilities (70% achievement probability)

PERFORMANCE MODELS:
- Balanced Scorecard: Financial, Customer, Internal Process, Learning & Growth perspectives
- Competency-Based Performance: Core, functional, and behavioral competencies assessment
- Performance Management Cycle: Goal setting, planning, monitoring, review, and development phases

ALIGNMENT STRATEGIES:
- Cascading Goals: From organizational to individual level with clear connections
- Strategic Goal Alignment: Vision, mission, strategic objectives, departmental, team, and individual alignment
- Matrix Goal Alignment: Cross-functional and multi-reporting relationship goal coordination

GOAL CATEGORIES:
- Revenue: Financial performance, sales targets, revenue growth, profit margins, cost reduction
- Productivity: Efficiency improvement, process optimization, time management, resource utilization
- Quality: Error reduction, customer satisfaction, product quality, service excellence
- Learning: Skill development, training completion, knowledge application, mentoring
- Leadership: Team development, leadership skills, decision making, change management
- Innovation: New ideas, process improvements, product innovation, creative solutions
- Customer Satisfaction: Customer experience, service quality, response time, retention
- Operational Excellence: Process optimization, system improvements, operational metrics

BEST PRACTICES:
- Goal Quantity: 3-7 goals per employee per period (balance focus with comprehensiveness)
- Goal Balance: 60-70% individual goals, 30-40% team/collective goals
- Goal Difficulty: 70% probability of achievement, stretch beyond current capabilities
- Goal Measurement: Clear, measurable success criteria with quantitative and qualitative elements
- Goal Timeline: Realistic timelines with milestones and regular review points
- Regular Communication: Continuous feedback, goal adjustment, and progress tracking
- Development Focus: Emphasize growth opportunities and skill development
- Recognition: Celebrate progress and achievements

EXPERTISE AREAS:
- Goal recommendation based on performance data and organizational context
- Alignment analysis ensuring individual goals support organizational objectives
- Performance optimization balancing challenge and achievability
- Success prediction and risk assessment for goal achievement
- Multi-framework goal setting (SMART, OKR, KPI, MBO, Moonshot, Stretch)
- Competency-based goal development and assessment
- Cross-functional and matrix organization goal coordination
- Performance trend analysis and pattern recognition

Your comprehensive expertise enables you to create optimal, aligned, and achievable performance goals that drive both individual and organizational success.
`;
  }

  // ============================================================================
  // DATA ENGINE IMPLEMENTATION
  // ============================================================================

  protected async processData(input: GoalSettingContext): Promise<any> {
    try {
      const processedData = {
        employee: {
          id: input.employeeId,
          role: input.role,
          department: input.department,
          currentPerformance: input.currentPerformance,
          historicalData: input.historicalData
        },
        organizational: {
          objectives: input.organizationalObjectives,
          constraints: input.constraints
        },
        context: {
          period: input.period,
          managerId: input.managerId,
          tenantId: input.tenantId
        }
      };

      // Comprehensive data analysis
      const performanceAnalysis = this.analyzePerformancePatterns(input);
      const goalOpportunities = this.identifyGoalOpportunities(input);
      const alignmentAssessment = this.assessAlignmentPotential(input);
      const capabilityAnalysis = this.analyzeEmployeeCapabilities(input);
      const roleAnalysis = this.analyzeRoleRequirements(input);
      const historicalAnalysis = this.analyzeHistoricalPerformance(input);
      const constraintAnalysis = this.analyzeConstraints(input);
      const trendAnalysis = this.analyzePerformanceTrends(input);
      const riskAssessment = this.assessGoalSettingRisks(input);

      return {
        ...processedData,
        analysis: {
          performance: performanceAnalysis,
          opportunities: goalOpportunities,
          alignment: alignmentAssessment,
          capabilities: capabilityAnalysis,
          role: roleAnalysis,
          historical: historicalAnalysis,
          constraints: constraintAnalysis,
          trends: trendAnalysis,
          risks: riskAssessment
        }
      };
    } catch (error) {
      console.error('Failed to process goal setting data:', error);
      throw error;
    }
  }

  protected getDataSystemPrompt(): string {
    return `
You are analyzing comprehensive performance data to recommend optimal goals. Consider:

EMPLOYEE PERFORMANCE DATA:
- Current performance scores and trends across all dimensions
- Historical goal achievement rates and patterns
- Competency and behavior assessments with detailed scores
- Performance improvement areas and development needs
- Performance trajectory and growth potential

EMPLOYEE CAPABILITIES ANALYSIS:
- Core competencies and skill levels
- Functional expertise and domain knowledge
- Behavioral competencies and soft skills
- Learning agility and development potential
- Leadership capabilities and potential

ROLE REQUIREMENTS ANALYSIS:
- Role-specific competencies and skills
- Performance expectations and standards
- Career progression requirements
- Industry and domain expertise needs
- Leadership and management requirements

HISTORICAL PERFORMANCE ANALYSIS:
- Previous goal achievement patterns
- Performance trends over time
- Success factors and challenges
- Learning and development history
- Career progression trajectory

ORGANIZATIONAL CONTEXT:
- Strategic objectives and priorities
- Department and team goals alignment
- Resource constraints and limitations
- Timeline and deadline requirements
- Budget and resource availability

GOAL OPPORTUNITIES:
- Areas for performance improvement
- Skill development and growth needs
- Leadership and advancement opportunities
- Innovation and contribution potential
- Cross-functional collaboration opportunities

ALIGNMENT ANALYSIS:
- Connection to organizational objectives
- Department and team goal alignment
- Manager and peer goal coordination
- Strategic priority alignment
- Matrix organization considerations

CONSTRAINT ANALYSIS:
- Resource limitations and availability
- Time constraints and deadlines
- Budget limitations and cost considerations
- Skill gaps and development needs
- Organizational and structural constraints

TREND ANALYSIS:
- Performance trajectory and momentum
- Industry and market trends
- Organizational growth and change
- Technology and process evolution
- Competitive landscape considerations

RISK ASSESSMENT:
- Goal achievability and feasibility
- Potential obstacles and challenges
- Resource and support requirements
- Timeline and deadline risks
- Success probability and confidence levels

Focus on creating goals that are challenging, achievable, aligned, impactful, and supported by comprehensive data analysis.
`;
  }

  // ============================================================================
  // REASONING ENGINE IMPLEMENTATION
  // ============================================================================

  protected buildReasoningPrompt(data: any): string {
    return `
Based on the performance data and organizational context, recommend optimal performance goals.

EMPLOYEE CONTEXT:
- Role: ${data.employee.role}
- Department: ${data.employee.department}
- Current Performance: ${JSON.stringify(data.employee.currentPerformance)}
- Historical Performance: ${JSON.stringify(data.employee.historicalData)}

ORGANIZATIONAL CONTEXT:
- Strategic Goals: ${data.organizational.objectives.strategicGoals.join(', ')}
- Department Goals: ${data.organizational.objectives.departmentGoals.join(', ')}
- Team Goals: ${data.organizational.objectives.teamGoals.join(', ')}
- Constraints: ${JSON.stringify(data.organizational.constraints)}

PERFORMANCE ANALYSIS:
- Strengths: ${data.analysis.performance.strengths.join(', ')}
- Development Areas: ${data.analysis.performance.developmentAreas.join(', ')}
- Opportunities: ${data.analysis.opportunities.join(', ')}
- Alignment Score: ${data.analysis.alignment.overall}

GOAL RECOMMENDATION REQUIREMENTS:
1. Recommend 3-7 goals that balance challenge and achievability
2. Use appropriate goal frameworks (SMART, OKR, KPI, MBO)
3. Ensure alignment with organizational objectives
4. Include both quantitative and qualitative goals
5. Provide clear success criteria and timelines
6. Consider resource requirements and support needs

Provide detailed goal recommendations with rationale and implementation guidance.
`;
  }

  protected getReasoningSystemPrompt(): string {
    return `
You are a performance goal reasoning expert synthesizing knowledge and data to make optimal goal recommendations.

Your role:
- Integrate framework knowledge with performance data analysis
- Make evidence-based goal recommendations
- Ensure alignment with organizational objectives
- Balance challenge with achievability
- Provide clear rationale and implementation guidance

Consider:
- Employee capabilities and development potential
- Historical performance patterns and trends
- Organizational priorities and constraints
- Resource availability and support requirements
- Risk factors and success probability

Provide comprehensive goal recommendations with clear rationale.
`;
  }

  protected buildKnowledgePrompt(inputData: any, frameworks: any): string {
    return `
Analyze goal-setting frameworks for employee performance goal planning.

EMPLOYEE CONTEXT:
- Role: ${inputData.role || 'Unknown'}
- Department: ${inputData.department || 'Unknown'}
- Performance Period: ${inputData.period || 'Unknown'}

AVAILABLE FRAMEWORKS:
${JSON.stringify(frameworks, null, 2)}

Provide guidance on which frameworks are most appropriate for this context and how to apply them.
`;
  }

  protected buildDataPrompt(processedData: any, knowledgeOutput: any): string {
    return `
Analyze employee performance data to identify goal opportunities.

PROCESSED DATA:
${JSON.stringify(processedData, null, 2)}

FRAMEWORK GUIDANCE:
${JSON.stringify(knowledgeOutput, null, 2)}

Identify specific goal opportunities based on:
- Performance strengths and development areas
- Historical patterns and trends
- Organizational alignment potential
- Skill development needs

Provide data-driven insights for goal setting.
`;
  }

  protected parseKnowledgeOutput(response: string): any {
    try {
      // Try to parse as JSON first
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback to structured text parsing
      return {
        frameworks: ['SMART', 'OKR'],
        recommendations: response,
        applicableModels: []
      };
    } catch (error) {
      console.error('Failed to parse knowledge output:', error);
      return {
        frameworks: [],
        recommendations: response,
        applicableModels: []
      };
    }
  }

  protected parseDataOutput(response: string): any {
    try {
      // Try to parse as JSON first
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback to structured text parsing
      return {
        opportunities: [],
        strengths: [],
        developmentAreas: [],
        insights: response
      };
    } catch (error) {
      console.error('Failed to parse data output:', error);
      return {
        opportunities: [],
        strengths: [],
        developmentAreas: [],
        insights: response
      };
    }
  }

  protected parseReasoningOutput(output: string): any {
    try {
      // Parse the AI output to extract goal recommendations
      const lines = output.split('\n');
      const recommendations: GoalRecommendation[] = [];
      const insights = {
        strengths: [] as string[],
        developmentAreas: [] as string[],
        opportunities: [] as string[],
        risks: [] as string[]
      };
      const alignment = {
        organizationalAlignment: 0,
        departmentAlignment: 0,
        teamAlignment: 0
      };
      let confidence = 0;
      let reasoning = '';
      const nextSteps: string[] = [];

      // Parse goal recommendations
      let currentGoal: Partial<GoalRecommendation> = {};
      let inGoalSection = false;

      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine.startsWith('GOAL:')) {
          if (currentGoal.title) {
            recommendations.push(currentGoal as GoalRecommendation);
          }
          currentGoal = {
            id: `goal_${recommendations.length + 1}`,
            title: trimmedLine.replace('GOAL:', '').trim()
          };
          inGoalSection = true;
        } else if (trimmedLine.startsWith('DESCRIPTION:')) {
          currentGoal.description = trimmedLine.replace('DESCRIPTION:', '').trim();
        } else if (trimmedLine.startsWith('CATEGORY:')) {
          currentGoal.category = trimmedLine.replace('CATEGORY:', '').trim() as any;
        } else if (trimmedLine.startsWith('TYPE:')) {
          currentGoal.type = trimmedLine.replace('TYPE:', '').trim() as any;
        } else if (trimmedLine.startsWith('FORMAT:')) {
          currentGoal.format = trimmedLine.replace('FORMAT:', '').trim() as any;
        } else if (trimmedLine.startsWith('PRIORITY:')) {
          currentGoal.priority = parseInt(trimmedLine.replace('PRIORITY:', '').trim());
        } else if (trimmedLine.startsWith('WEIGHT:')) {
          currentGoal.weight = parseFloat(trimmedLine.replace('WEIGHT:', '').trim());
        } else if (trimmedLine.startsWith('CONFIDENCE:')) {
          confidence = parseFloat(trimmedLine.replace('CONFIDENCE:', '').trim());
        } else if (trimmedLine.startsWith('REASONING:')) {
          reasoning = trimmedLine.replace('REASONING:', '').trim();
        } else if (trimmedLine.startsWith('NEXT_STEP:')) {
          nextSteps.push(trimmedLine.replace('NEXT_STEP:', '').trim());
        }
      }

      // Add the last goal if exists
      if (currentGoal.title) {
        recommendations.push(currentGoal as GoalRecommendation);
      }

      return {
        success: recommendations.length > 0,
        recommendations,
        insights,
        alignment,
        confidence,
        reasoning,
        nextSteps
      };
    } catch (error) {
      console.error('Failed to parse reasoning output:', error);
      return {
        success: false,
        recommendations: [],
        insights: { strengths: [], developmentAreas: [], opportunities: [], risks: [] },
        alignment: { organizationalAlignment: 0, departmentAlignment: 0, teamAlignment: 0 },
        confidence: 0,
        reasoning: 'Failed to parse AI output',
        nextSteps: []
      };
    }
  }

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * Analyze performance patterns from historical data
   */
  private analyzePerformancePatterns(context: GoalSettingContext): any {
    const { currentPerformance, historicalData } = context;
    
    const strengths: string[] = [];
    const developmentAreas: string[] = [];
    
    // Analyze competency scores
    Object.entries(currentPerformance.competencyScores).forEach(([competency, score]) => {
      if (score >= 4.0) {
        strengths.push(competency);
      } else if (score <= 2.5) {
        developmentAreas.push(competency);
      }
    });
    
    // Analyze behavior scores
    Object.entries(currentPerformance.behaviorScores).forEach(([behavior, score]) => {
      if (score >= 4.0) {
        strengths.push(behavior);
      } else if (score <= 2.5) {
        developmentAreas.push(behavior);
      }
    });
    
    return {
      strengths,
      developmentAreas,
      overallTrend: currentPerformance.overallScore >= 3.5 ? 'improving' : 'needs_improvement',
      goalAchievementRate: currentPerformance.goalAchievementRate
    };
  }

  /**
   * Identify goal opportunities based on performance data
   */
  private identifyGoalOpportunities(context: GoalSettingContext): string[] {
    const opportunities: string[] = [];
    const { currentPerformance, historicalData, organizationalObjectives } = context;
    
    // Performance improvement opportunities
    if (currentPerformance.overallScore < 4.0) {
      opportunities.push('Performance improvement');
    }
    
    // Goal achievement opportunities
    if (currentPerformance.goalAchievementRate < 80) {
      opportunities.push('Goal achievement optimization');
    }
    
    // Skill development opportunities
    Object.entries(currentPerformance.competencyScores).forEach(([skill, score]) => {
      if (score < 3.0) {
        opportunities.push(`${skill} skill development`);
      }
    });
    
    // Leadership opportunities
    if (currentPerformance.competencyScores.leadership && currentPerformance.competencyScores.leadership >= 3.5) {
      opportunities.push('Leadership development');
    }
    
    return opportunities;
  }

  /**
   * Assess alignment potential with organizational objectives
   */
  private assessAlignmentPotential(context: GoalSettingContext): any {
    const { organizationalObjectives } = context;
    
    return {
      overall: 0.8, // Placeholder - would be calculated based on actual alignment
      organizational: 0.85,
      department: 0.75,
      team: 0.80
    };
  }

  /**
   * Analyze employee capabilities and potential
   */
  private analyzeEmployeeCapabilities(context: GoalSettingContext): any {
    const { currentPerformance, role } = context;
    
    const capabilities = {
      coreCompetencies: {
        strengths: [] as string[],
        developmentAreas: [] as string[],
        potential: [] as string[]
      },
      functionalSkills: {
        technical: [] as string[],
        domain: [] as string[],
        industry: [] as string[]
      },
      behavioralCompetencies: {
        leadership: currentPerformance.behaviorScores.leadership || 0,
        communication: currentPerformance.behaviorScores.communication || 0,
        collaboration: currentPerformance.behaviorScores.collaboration || 0,
        adaptability: currentPerformance.behaviorScores.adaptability || 0
      },
      learningAgility: {
        score: 0, // Would be calculated based on historical learning data
        indicators: [] as string[]
      },
      developmentPotential: {
        high: [] as string[],
        medium: [] as string[],
        low: [] as string[]
      }
    };

    // Analyze competency scores
    Object.entries(currentPerformance.competencyScores).forEach(([competency, score]) => {
      if (score >= 4.0) {
        capabilities.coreCompetencies.strengths.push(competency);
      } else if (score <= 2.5) {
        capabilities.coreCompetencies.developmentAreas.push(competency);
      } else if (score >= 3.0 && score < 4.0) {
        capabilities.coreCompetencies.potential.push(competency);
      }
    });

    return capabilities;
  }

  /**
   * Analyze role requirements and expectations
   */
  private analyzeRoleRequirements(context: GoalSettingContext): any {
    const { role, department } = context;
    
    const roleAnalysis = {
      roleType: role,
      department: department,
      requiredCompetencies: {
        core: [] as string[],
        functional: [] as string[],
        behavioral: [] as string[]
      },
      performanceExpectations: {
        quantitative: [] as string[],
        qualitative: [] as string[]
      },
      careerProgression: {
        nextLevel: [] as string[],
        requirements: [] as string[]
      },
      industryStandards: {
        benchmarks: [] as string[],
        trends: [] as string[]
      }
    };

    // Role-specific analysis (would be enhanced with actual role data)
    switch (role.toLowerCase()) {
      case 'manager':
        roleAnalysis.requiredCompetencies.core.push('leadership', 'decision_making', 'team_management');
        roleAnalysis.requiredCompetencies.behavioral.push('communication', 'coaching', 'strategic_thinking');
        break;
      case 'developer':
        roleAnalysis.requiredCompetencies.functional.push('programming', 'system_design', 'problem_solving');
        roleAnalysis.requiredCompetencies.behavioral.push('collaboration', 'continuous_learning');
        break;
      case 'sales':
        roleAnalysis.requiredCompetencies.functional.push('relationship_building', 'negotiation', 'market_knowledge');
        roleAnalysis.requiredCompetencies.behavioral.push('persistence', 'communication', 'customer_focus');
        break;
      default:
        roleAnalysis.requiredCompetencies.core.push('communication', 'problem_solving', 'collaboration');
    }

    return roleAnalysis;
  }

  /**
   * Analyze historical performance patterns
   */
  private analyzeHistoricalPerformance(context: GoalSettingContext): any {
    const { historicalData } = context;
    
    const historicalAnalysis = {
      goalAchievementPattern: {
        averageRate: 0,
        trend: 'stable' as 'improving' | 'declining' | 'stable',
        consistency: 0
      },
      performanceTrajectory: {
        overall: 'stable' as 'improving' | 'declining' | 'stable',
        byCategory: {} as Record<string, 'improving' | 'declining' | 'stable'>
      },
      successFactors: [] as string[],
      challenges: [] as string[],
      learningHistory: {
        completed: [] as string[],
        inProgress: [] as string[],
        planned: [] as string[]
      },
      careerProgression: {
        milestones: [] as string[],
        timeline: [] as string[],
        nextSteps: [] as string[]
      }
    };

    // Analyze historical goal achievement
    if (historicalData.previousGoals.length > 0) {
      const totalGoals = historicalData.previousGoals.length;
      const completedGoals = historicalData.previousGoals.filter(goal => goal.achievementRate >= 80).length;
      historicalAnalysis.goalAchievementPattern.averageRate = (completedGoals / totalGoals) * 100;
      
      // Determine trend
      const recentGoals = historicalData.previousGoals.slice(-3);
      const olderGoals = historicalData.previousGoals.slice(0, -3);
      if (recentGoals.length > 0 && olderGoals.length > 0) {
        const recentAvg = recentGoals.reduce((sum, goal) => sum + goal.achievementRate, 0) / recentGoals.length;
        const olderAvg = olderGoals.reduce((sum, goal) => sum + goal.achievementRate, 0) / olderGoals.length;
        
        if (recentAvg > olderAvg + 10) {
          historicalAnalysis.goalAchievementPattern.trend = 'improving';
        } else if (recentAvg < olderAvg - 10) {
          historicalAnalysis.goalAchievementPattern.trend = 'declining';
        }
      }
    }

    // Analyze performance trends
    Object.entries(historicalData.performanceTrends).forEach(([category, trend]) => {
      historicalAnalysis.performanceTrajectory.byCategory[category] = trend;
    });

    return historicalAnalysis;
  }

  /**
   * Analyze constraints and limitations
   */
  private analyzeConstraints(context: GoalSettingContext): any {
    const { constraints } = context;
    
    const constraintAnalysis = {
      resourceConstraints: {
        budget: constraints.budgetLimits || {},
        time: constraints.timeConstraints || {},
        personnel: [] as string[],
        technology: [] as string[]
      },
      organizationalConstraints: {
        policies: [] as string[],
        procedures: [] as string[],
        structure: [] as string[],
        culture: [] as string[]
      },
      goalConstraints: {
        maxGoals: constraints.maxGoals,
        minGoals: constraints.minGoals,
        categoryLimits: {} as Record<string, number>,
        timelineLimits: {} as Record<string, string>
      },
      riskFactors: {
        high: [] as string[],
        medium: [] as string[],
        low: [] as string[]
      }
    };

    return constraintAnalysis;
  }

  /**
   * Analyze performance trends and patterns
   */
  private analyzePerformanceTrends(context: GoalSettingContext): any {
    const { currentPerformance, historicalData } = context;
    
    const trendAnalysis = {
      overallTrend: 'stable' as 'improving' | 'declining' | 'stable',
      categoryTrends: {} as Record<string, 'improving' | 'declining' | 'stable'>,
      momentum: {
        positive: [] as string[],
        negative: [] as string[],
        neutral: [] as string[]
      },
      seasonality: {
        patterns: [] as string[],
        factors: [] as string[]
      },
      externalFactors: {
        market: [] as string[],
        industry: [] as string[],
        technology: [] as string[],
        regulatory: [] as string[]
      }
    };

    // Analyze current vs historical performance
    if (historicalData.previousGoals.length > 0) {
      const recentPerformance = historicalData.previousGoals.slice(-3);
      const avgRecentPerformance = recentPerformance.reduce((sum, goal) => sum + goal.achievementRate, 0) / recentPerformance.length;
      
      if (avgRecentPerformance > 85) {
        trendAnalysis.overallTrend = 'improving';
      } else if (avgRecentPerformance < 70) {
        trendAnalysis.overallTrend = 'declining';
      }
    }

    // Analyze category trends
    Object.entries(historicalData.performanceTrends).forEach(([category, trend]) => {
      trendAnalysis.categoryTrends[category] = trend;
    });

    return trendAnalysis;
  }

  /**
   * Assess goal setting risks and challenges
   */
  private assessGoalSettingRisks(context: GoalSettingContext): any {
    const { currentPerformance, constraints } = context;
    
    const riskAssessment = {
      achievabilityRisks: {
        high: [] as string[],
        medium: [] as string[],
        low: [] as string[]
      },
      resourceRisks: {
        budget: [] as string[],
        time: [] as string[],
        personnel: [] as string[],
        technology: [] as string[]
      },
      alignmentRisks: {
        organizational: [] as string[],
        departmental: [] as string[],
        team: [] as string[],
        individual: [] as string[]
      },
      timelineRisks: {
        deadline: [] as string[],
        milestone: [] as string[],
        dependency: [] as string[]
      },
      mitigationStrategies: {
        proactive: [] as string[],
        reactive: [] as string[],
        contingency: [] as string[]
      }
    };

    // Assess achievability risks based on current performance
    if (currentPerformance.overallScore < 3.0) {
      riskAssessment.achievabilityRisks.high.push('Low current performance may impact goal achievement');
    } else if (currentPerformance.overallScore < 3.5) {
      riskAssessment.achievabilityRisks.medium.push('Moderate performance may require additional support');
    }

    // Assess resource risks
    if (constraints.budgetLimits && Object.keys(constraints.budgetLimits).length > 0) {
      riskAssessment.resourceRisks.budget.push('Budget constraints may limit goal scope');
    }

    if (constraints.timeConstraints && Object.keys(constraints.timeConstraints).length > 0) {
      riskAssessment.resourceRisks.time.push('Time constraints may impact goal timeline');
    }

    return riskAssessment;
  }

  /**
   * Main analysis method for goal setting
   */
  public async analyzeGoals(context: GoalSettingContext): Promise<GoalSettingResult> {
    try {
      console.info('Starting performance goal setting analysis', { employeeId: context.employeeId });

      // Run the three-engine analysis using parent class method
      const engineResult = await super.analyze(context);

      // Transform engine result to GoalSettingResult
      const result: GoalSettingResult = {
        success: engineResult.reasoning.output.success || true,
        recommendations: engineResult.reasoning.output.recommendations || [],
        insights: engineResult.reasoning.output.insights || {
          strengths: [],
          developmentAreas: [],
          opportunities: [],
          risks: []
        },
        alignment: engineResult.reasoning.output.alignment || {
          organizationalAlignment: 0,
          departmentAlignment: 0,
          teamAlignment: 0
        },
        confidence: engineResult.overallConfidence,
        reasoning: engineResult.reasoning.output.reasoning || 'Analysis completed',
        nextSteps: engineResult.reasoning.output.nextSteps || []
      };

      console.info('Performance goal setting analysis completed', {
        employeeId: context.employeeId,
        recommendationsCount: result.recommendations.length,
        confidence: result.confidence
      });

      return result;
    } catch (error) {
      console.error('Performance goal setting analysis failed:', error);
      throw error;
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default PerformanceGoalSetterAgent;
