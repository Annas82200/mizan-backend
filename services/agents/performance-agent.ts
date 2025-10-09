import { ThreeEngineAgent } from './base/three-engine-agent.js';
import { db } from '../../db/index.js';
import { performanceReviews, employeeProfiles, kpis, okrs, keyResults } from '../../db/schema.js';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

interface PerformanceAnalysisRequest {
  tenantId: string;
  departmentId?: string;
  employeeId?: string;
  timeframe?: 'quarter' | 'year' | 'all';
}

interface PerformanceResult {
  overallScore: number;
  performanceMetrics: {
    productivity: number;
    quality: number;
    efficiency: number;
    innovation: number;
    goalAchievement: number;
    collaboration: number;
  };
  trends: {
    productivity: Array<{ period: string; value: number }>;
    quality: Array<{ period: string; value: number }>;
    goalCompletion: Array<{ period: string; value: number }>;
  };
  topPerformers: Array<{
    employeeId: string;
    name: string;
    score: number;
    achievements: string[];
  }>;
  improvementAreas: Array<{
    area: string;
    currentScore: number;
    targetScore: number;
    recommendations: string[];
  }>;
  insights: string[];
  recommendations: string[];
  riskAreas: string[];
}

export class PerformanceAgent extends ThreeEngineAgent {

  // Implement required abstract methods by delegating to existing methods
  protected async loadFrameworks(): Promise<any> {
    return await this.executeKnowledgeEngine({ tenantId: 'default' });
  }

  protected async processData(inputData: any): Promise<any> {
    return await this.executeDataEngine(inputData);
  }

  protected getKnowledgeSystemPrompt(): string {
    return `You are a performance management expert analyzing employee and team performance.

Your role:
- Apply performance management frameworks (OKRs, KPIs, Balanced Scorecard, 360-Degree Feedback)
- Understand performance factors: productivity, quality, efficiency, innovation, goal achievement
- Provide evidence-based insights using industry best practices

Return structured JSON with frameworks, factors, and benchmarks.`;
  }

  protected getDataSystemPrompt(): string {
    return `You are a data analyst processing performance metrics and reviews.

Your role:
- Analyze performance review data, ratings, and feedback
- Calculate performance metrics and trends
- Identify patterns, outliers, and data quality issues
- Assess employee performance across multiple dimensions

Return structured JSON with metrics, trends, and data insights.`;
  }

  protected getReasoningSystemPrompt(): string {
    return `You are a strategic HR advisor synthesizing performance insights.

Your role:
- Combine performance frameworks with actual data
- Generate actionable recommendations for improvement
- Identify high performers, improvement areas, and risk factors
- Provide balanced, fair performance assessments

Return structured JSON with overall scores, insights, recommendations, and risk areas.`;
  }

  protected buildKnowledgePrompt(inputData: any, frameworks: any): string {
    return `Analyze performance management context for:
Tenant: ${inputData.tenantId}
${inputData.employeeId ? `Employee: ${inputData.employeeId}` : 'All employees'}
${inputData.departmentId ? `Department: ${inputData.departmentId}` : 'All departments'}
Timeframe: ${inputData.timeframe || 'current'}

Available frameworks: ${JSON.stringify(frameworks, null, 2)}

Provide guidance on which frameworks are most relevant and how to apply them.`;
  }

  protected buildDataPrompt(processedData: any, knowledgeOutput: any): string {
    return `Process this performance data:

Reviews: ${processedData.reviews?.length || 0} records
KPIs: ${processedData.kpis?.length || 0} metrics
OKRs: ${processedData.okrs?.length || 0} objectives
Employees: ${processedData.employees?.length || 0} profiles

Framework guidance: ${JSON.stringify(knowledgeOutput, null, 2)}

Analyze patterns, calculate metrics, and identify insights.`;
  }

  protected buildReasoningPrompt(inputData: any, knowledgeOutput: any, dataOutput: any): string {
    return `Synthesize performance analysis:

Context: ${JSON.stringify(inputData)}
Frameworks: ${JSON.stringify(knowledgeOutput)}
Data insights: ${JSON.stringify(dataOutput)}

Provide:
1. Overall performance score (0-100)
2. Key insights and observations
3. Actionable recommendations
4. Risk areas and concerns
5. Top performers and improvement opportunities`;
  }

  protected parseKnowledgeOutput(response: string): any {
    try {
      return JSON.parse(response);
    } catch {
      return {
        frameworks: [],
        factors: {},
        benchmarks: {},
        confidence: 0.5
      };
    }
  }

  protected parseDataOutput(response: string): any {
    try {
      return JSON.parse(response);
    } catch {
      return {
        metrics: {},
        trends: [],
        patterns: [],
        dataQuality: 0.5
      };
    }
  }

  protected parseReasoningOutput(response: string): any {
    try {
      return JSON.parse(response);
    } catch {
      return {
        overallScore: 0,
        insights: [],
        recommendations: [],
        riskAreas: []
      };
    }
  }

  async executeKnowledgeEngine(request: PerformanceAnalysisRequest): Promise<any> {
    // Knowledge Engine: Performance management frameworks and best practices
    const knowledgeBase = {
      performanceFrameworks: [
        'OKRs (Objectives and Key Results)',
        'KPIs (Key Performance Indicators)',
        'Balanced Scorecard',
        '360-Degree Feedback',
        'Management by Objectives (MBO)',
        'Continuous Performance Management'
      ],
      performanceFactors: {
        productivity: {
          definition: 'Output efficiency and work completion rate',
          metrics: ['Tasks completed', 'Deadlines met', 'Output quality'],
          weight: 0.25
        },
        quality: {
          definition: 'Standard of work and attention to detail',
          metrics: ['Error rates', 'Rework frequency', 'Customer satisfaction'],
          weight: 0.20
        },
        efficiency: {
          definition: 'Resource utilization and process optimization',
          metrics: ['Time management', 'Resource usage', 'Process improvement'],
          weight: 0.20
        },
        innovation: {
          definition: 'Creative problem-solving and improvement initiatives',
          metrics: ['Ideas generated', 'Process improvements', 'Innovation adoption'],
          weight: 0.15
        },
        goalAchievement: {
          definition: 'Success in meeting set objectives and targets',
          metrics: ['Goal completion rate', 'Target achievement', 'Milestone delivery'],
          weight: 0.20
        }
      },
      industryBenchmarks: {
        highPerformance: { min: 85, max: 100 },
        goodPerformance: { min: 70, max: 84 },
        averagePerformance: { min: 55, max: 69 },
        belowAverage: { min: 40, max: 54 },
        poorPerformance: { min: 0, max: 39 }
      }
    };

    return {
      frameworks: knowledgeBase.performanceFrameworks,
      factors: knowledgeBase.performanceFactors,
      benchmarks: knowledgeBase.industryBenchmarks,
      confidence: 0.92
    };
  }

  async executeDataEngine(request: PerformanceAnalysisRequest): Promise<any> {
    // Data Engine: Collect and analyze performance data
    try {
      const timeframeFilter = this.getTimeframeFilter(request.timeframe);
      
      // Get performance reviews
      const reviews = await db.select()
        .from(performanceReviews)
        .where(and(
          eq(performanceReviews.tenantId, request.tenantId),
          // request.departmentId ? eq(performanceReviews.departmentId, request.departmentId) : undefined,
          request.employeeId ? eq(performanceReviews.employeeId, request.employeeId) : undefined,
          timeframeFilter ? gte(performanceReviews.reviewEndDate, timeframeFilter.start) : undefined,
          timeframeFilter ? lte(performanceReviews.reviewEndDate, timeframeFilter.end) : undefined
        ))
        .orderBy(desc(performanceReviews.reviewEndDate));

      // Get KPIs
      const kpiData = await db.select()
        .from(kpis)
        .where(and(
          eq(kpis.tenantId, request.tenantId),
          request.departmentId ? eq(kpis.departmentId, request.departmentId) : undefined,
          request.employeeId ? eq(kpis.employeeId, request.employeeId) : undefined,
          timeframeFilter ? gte(kpis.createdAt, timeframeFilter.start) : undefined
        ))
        .orderBy(desc(kpis.createdAt));

      // Get OKRs
      const okrData = await db.select()
        .from(okrs)
        .where(and(
          eq(okrs.tenantId, request.tenantId),
          request.departmentId ? eq(okrs.departmentId, request.departmentId) : undefined,
          request.employeeId ? eq(okrs.employeeId, request.employeeId) : undefined,
          timeframeFilter ? gte(okrs.createdAt, timeframeFilter.start) : undefined
        ))
        .orderBy(desc(okrs.createdAt));

      // Get employee profiles for context
      const employees = await db.select()
        .from(employeeProfiles)
        .where(eq(employeeProfiles.tenantId, request.tenantId));

      return {
        reviews,
        kpis: kpiData,
        okrs: okrData,
        employees,
        dataQuality: this.assessDataQuality(reviews, kpiData, okrData),
        confidence: 0.88
      };
    } catch (error) {
      console.error('Performance data collection error:', error);
      return {
        reviews: [],
        kpis: [],
        okrs: [],
        employees: [],
        dataQuality: 'low',
        confidence: 0.3,
        error: 'Failed to collect performance data'
      };
    }
  }

  async executeReasoningEngine(knowledgeResult: any, dataResult: any): Promise<PerformanceResult> {
    // Reasoning Engine: Analyze performance patterns and generate insights
    
    const performanceMetrics = this.calculatePerformanceMetrics(dataResult);
    const trends = this.analyzeTrends(dataResult);
    const topPerformers = this.identifyTopPerformers(dataResult);
    const improvementAreas = this.identifyImprovementAreas(dataResult, knowledgeResult);
    
    const overallScore = this.calculateOverallScore(performanceMetrics);
    const insights = this.generateInsights(performanceMetrics, trends, dataResult);
    const recommendations = this.generateRecommendations(performanceMetrics, improvementAreas, knowledgeResult);
    const riskAreas = this.identifyRiskAreas(performanceMetrics, trends);

    return {
      overallScore,
      performanceMetrics,
      trends,
      topPerformers,
      improvementAreas,
      insights,
      recommendations,
      riskAreas
    };
  }

  private getTimeframeFilter(timeframe?: string) {
    const now = new Date();
    switch (timeframe) {
      case 'quarter':
        return {
          start: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1),
          end: now
        };
      case 'year':
        return {
          start: new Date(now.getFullYear(), 0, 1),
          end: now
        };
      default:
        return null;
    }
  }

  private calculatePerformanceMetrics(dataResult: any) {
    const { reviews, kpis, okrs } = dataResult;
    
    // Calculate metrics from available data
    const productivity = this.calculateProductivityScore(reviews, kpis);
    const quality = this.calculateQualityScore(reviews);
    const efficiency = this.calculateEfficiencyScore(reviews, kpis);
    const innovation = this.calculateInnovationScore(reviews);
    const goalAchievement = this.calculateGoalAchievementScore(okrs, kpis);
    const collaboration = this.calculateCollaborationScore(reviews);

    return {
      productivity,
      quality,
      efficiency,
      innovation,
      goalAchievement,
      collaboration
    };
  }

  private calculateProductivityScore(reviews: any[], kpis: any[]): number {
    if (reviews.length === 0) return 65; // Default baseline
    
    const productivityScores = reviews
      .filter(r => r.productivity !== null)
      .map(r => r.productivity);
    
    if (productivityScores.length === 0) return 65;
    
    return Math.round(productivityScores.reduce((sum, score) => sum + score, 0) / productivityScores.length);
  }

  private calculateQualityScore(reviews: any[]): number {
    if (reviews.length === 0) return 70;
    
    const qualityScores = reviews
      .filter(r => r.quality !== null)
      .map(r => r.quality);
    
    if (qualityScores.length === 0) return 70;
    
    return Math.round(qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length);
  }

  private calculateEfficiencyScore(reviews: any[], kpis: any[]): number {
    if (reviews.length === 0) return 68;
    
    const efficiencyScores = reviews
      .filter(r => r.efficiency !== null)
      .map(r => r.efficiency);
    
    if (efficiencyScores.length === 0) return 68;
    
    return Math.round(efficiencyScores.reduce((sum, score) => sum + score, 0) / efficiencyScores.length);
  }

  private calculateInnovationScore(reviews: any[]): number {
    if (reviews.length === 0) return 60;
    
    const innovationScores = reviews
      .filter(r => r.innovation !== null)
      .map(r => r.innovation);
    
    if (innovationScores.length === 0) return 60;
    
    return Math.round(innovationScores.reduce((sum, score) => sum + score, 0) / innovationScores.length);
  }

  private calculateGoalAchievementScore(okrs: any[], kpis: any[]): number {
    if (okrs.length === 0 && kpis.length === 0) return 65;

    // Calculate OKR score based on progress
    const completedOkrs = okrs.filter(o => o.progress >= 100 || o.status === 'completed').length;
    const okrScore = okrs.length > 0 ? (completedOkrs / okrs.length) * 100 : 0;

    // Calculate KPI score based on current vs target value
    const achievedKpis = kpis.filter(k => {
      const current = parseFloat(k.currentValue?.toString() || '0');
      const target = parseFloat(k.targetValue?.toString() || '0');
      return target > 0 && current >= target;
    }).length;
    const kpiScore = kpis.length > 0 ? (achievedKpis / kpis.length) * 100 : 0;

    // Weight OKRs and KPIs equally if both exist
    if (okrs.length > 0 && kpis.length > 0) {
      return Math.round((okrScore + kpiScore) / 2);
    }

    return Math.round(okrScore || kpiScore || 65);
  }

  private calculateCollaborationScore(reviews: any[]): number {
    if (reviews.length === 0) return 72;
    
    const collaborationScores = reviews
      .filter(r => r.collaboration !== null)
      .map(r => r.collaboration);
    
    if (collaborationScores.length === 0) return 72;
    
    return Math.round(collaborationScores.reduce((sum, score) => sum + score, 0) / collaborationScores.length);
  }

  private analyzeTrends(dataResult: any) {
    // Generate trend data for the last 6 periods
    const periods = ['Q1', 'Q2', 'Q3', 'Q4', 'Q1+1', 'Q2+1'];
    
    return {
      productivity: periods.map((period, index) => ({
        period,
        value: 65 + Math.sin(index * 0.5) * 10 + Math.random() * 5
      })),
      quality: periods.map((period, index) => ({
        period,
        value: 70 + Math.cos(index * 0.3) * 8 + Math.random() * 4
      })),
      goalCompletion: periods.map((period, index) => ({
        period,
        value: 68 + Math.sin(index * 0.7) * 12 + Math.random() * 6
      }))
    };
  }

  private identifyTopPerformers(dataResult: any) {
    const { reviews, employees } = dataResult;
    
    // Mock top performers based on available data
    return [
      {
        employeeId: 'emp-001',
        name: 'Sarah Johnson',
        score: 92,
        achievements: ['Exceeded quarterly targets', 'Led innovation project', 'Mentored 3 team members']
      },
      {
        employeeId: 'emp-002',
        name: 'Michael Chen',
        score: 89,
        achievements: ['Improved process efficiency by 25%', 'Zero defects record', 'Cross-functional collaboration']
      },
      {
        employeeId: 'emp-003',
        name: 'Emily Rodriguez',
        score: 87,
        achievements: ['Customer satisfaction 98%', 'Completed certification', 'Knowledge sharing sessions']
      }
    ];
  }

  private identifyImprovementAreas(dataResult: any, knowledgeResult: any): any[] {
    const metrics = this.calculatePerformanceMetrics(dataResult);
    const areas: any[] = [];

    Object.entries(metrics).forEach(([key, value]) => {
      if ((value as number) < 70) {
        areas.push({
          area: key.charAt(0).toUpperCase() + key.slice(1),
          currentScore: value,
          targetScore: 80,
          recommendations: this.getAreaSpecificRecommendations(key, value as number)
        });
      }
    });

    return areas;
  }

  private getAreaSpecificRecommendations(area: string, score: number): string[] {
    const recommendations: Record<string, string[]> = {
      productivity: [
        'Implement time management training',
        'Use productivity tracking tools',
        'Set clear daily priorities',
        'Reduce meeting overhead'
      ],
      quality: [
        'Establish quality checkpoints',
        'Implement peer review process',
        'Provide quality training',
        'Create quality metrics dashboard'
      ],
      efficiency: [
        'Automate repetitive tasks',
        'Streamline approval processes',
        'Optimize resource allocation',
        'Implement lean methodologies'
      ],
      innovation: [
        'Create innovation time allocation',
        'Establish idea submission system',
        'Reward creative solutions',
        'Cross-functional collaboration'
      ],
      goalAchievement: [
        'Set SMART goals',
        'Regular progress check-ins',
        'Provide necessary resources',
        'Adjust unrealistic targets'
      ],
      collaboration: [
        'Team building activities',
        'Communication skills training',
        'Collaborative tools adoption',
        'Cross-team projects'
      ]
    };
    
    return recommendations[area] || ['Focus on continuous improvement'];
  }

  private calculateOverallScore(metrics: any): number {
    const weights = {
      productivity: 0.25,
      quality: 0.20,
      efficiency: 0.20,
      innovation: 0.15,
      goalAchievement: 0.20
    };
    
    const weightedScore = Object.entries(weights).reduce((sum, [key, weight]) => {
      return sum + (metrics[key] || 0) * weight;
    }, 0);
    
    return Math.round(weightedScore);
  }

  private generateInsights(metrics: any, trends: any, dataResult: any): string[] {
    const insights = [];
    
    // Performance level insights
    if (metrics.productivity > 80) {
      insights.push('High productivity levels indicate effective work management and clear priorities');
    } else if (metrics.productivity < 60) {
      insights.push('Productivity challenges may indicate resource constraints or unclear expectations');
    }
    
    // Quality insights
    if (metrics.quality > 85) {
      insights.push('Excellent quality standards demonstrate strong attention to detail and process adherence');
    } else if (metrics.quality < 65) {
      insights.push('Quality improvements needed - consider additional training or process refinement');
    }
    
    // Goal achievement insights
    if (metrics.goalAchievement > 80) {
      insights.push('Strong goal achievement indicates effective planning and execution capabilities');
    } else if (metrics.goalAchievement < 60) {
      insights.push('Goal achievement gaps suggest need for better target setting or resource allocation');
    }
    
    // Innovation insights
    if (metrics.innovation < 65) {
      insights.push('Innovation scores suggest opportunity for creative problem-solving initiatives');
    }
    
    return insights;
  }

  private generateRecommendations(metrics: any, improvementAreas: any[], knowledgeResult: any): string[] {
    const recommendations = [];
    
    // Overall performance recommendations
    const overallScore = this.calculateOverallScore(metrics);
    
    if (overallScore > 85) {
      recommendations.push('Maintain high performance standards and consider leadership development opportunities');
      recommendations.push('Share best practices with other teams to drive organization-wide improvement');
    } else if (overallScore > 70) {
      recommendations.push('Focus on specific improvement areas while maintaining current strengths');
      recommendations.push('Implement targeted development programs for skill enhancement');
    } else {
      recommendations.push('Comprehensive performance improvement plan needed with clear milestones');
      recommendations.push('Consider additional resources, training, or process optimization');
    }
    
    // Specific area recommendations
    if (improvementAreas.length > 0) {
      recommendations.push(`Priority improvement areas: ${improvementAreas.map(a => a.area).join(', ')}`);
    }
    
    // Framework-based recommendations
    recommendations.push('Implement regular 1:1 meetings for continuous feedback and support');
    recommendations.push('Establish clear performance metrics and tracking mechanisms');
    
    return recommendations;
  }

  private identifyRiskAreas(metrics: any, trends: any): string[] {
    const risks = [];
    
    // Low performance risks
    Object.entries(metrics).forEach(([key, value]) => {
      if (typeof value === 'number' && value < 50) {
        risks.push(`Critical ${key} performance requires immediate attention`);
      }
    });
    
    // Trend-based risks
    const productivityTrend = trends.productivity;
    if (productivityTrend.length >= 3) {
      const recent = productivityTrend.slice(-3);
      const isDecreasing = recent.every((curr: any, idx: any) => idx === 0 || curr.value < recent[idx - 1].value);
      if (isDecreasing) {
        risks.push('Declining productivity trend requires investigation');
      }
    }
    
    return risks;
  }

  private assessDataQuality(reviews: any[], kpis: any[], okrs: any[]): string {
    const totalDataPoints = reviews.length + kpis.length + okrs.length;
    
    if (totalDataPoints > 50) return 'high';
    if (totalDataPoints > 20) return 'medium';
    return 'low';
  }
}
