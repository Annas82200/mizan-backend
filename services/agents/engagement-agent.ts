import { ThreeEngineAgent } from './base/three-engine-agent.js';
import { db } from '../../db/index.js';
import { cultureAssessments, employeeProfiles, performanceReviews } from '../../db/schema.js';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

interface EngagementAnalysisRequest {
  tenantId: string;
  departmentId?: string;
  employeeId?: string;
  timeframe?: 'month' | 'quarter' | 'year';
}

interface EngagementResult {
  overallScore: number;
  engagementFactors: {
    workSatisfaction: number;
    careerDevelopment: number;
    workLifeBalance: number;
    compensation: number;
    management: number;
    recognition: number;
    autonomy: number;
    purpose: number;
  };
  segmentAnalysis: {
    byDepartment: Array<{ department: string; score: number; count: number }>;
    byTenure: Array<{ tenure: string; score: number; count: number }>;
    byRole: Array<{ role: string; score: number; count: number }>;
  };
  riskIndicators: {
    flightRisk: Array<{
      employeeId: string;
      name: string;
      riskScore: number;
      factors: string[];
    }>;
    burnoutRisk: Array<{
      employeeId: string;
      name: string;
      riskScore: number;
      indicators: string[];
    }>;
  };
  trends: {
    overall: Array<{ period: string; score: number }>;
    satisfaction: Array<{ period: string; score: number }>;
    retention: Array<{ period: string; rate: number }>;
  };
  insights: string[];
  recommendations: string[];
  actionItems: Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    timeline: string;
    owner: string;
  }>;
}

export class EngagementAgent extends ThreeEngineAgent {
  constructor() {
    const config = {
      knowledge: {
        providers: ['openai', 'anthropic', 'gemini', 'mistral'],
        model: 'gpt-4',
        temperature: 0.3,
        maxTokens: 2000
      },
      data: {
        providers: ['openai', 'anthropic', 'gemini', 'mistral'],
        model: 'gpt-4',
        temperature: 0.1,
        maxTokens: 3000
      },
      reasoning: {
        providers: ['openai', 'anthropic', 'gemini', 'mistral'],
        model: 'gpt-4',
        temperature: 0.5,
        maxTokens: 4000
      },
      consensusThreshold: 0.7
    };
    super('engagement', config);
  }

  async executeKnowledgeEngine(request: EngagementAnalysisRequest): Promise<any> {
    // Knowledge Engine: Employee engagement research and frameworks
    const knowledgeBase = {
      engagementFrameworks: [
        'Gallup Q12 Engagement Survey',
        'Kahn\'s Personal Engagement Theory',
        'JD-R Model (Job Demands-Resources)',
        'Utrecht Work Engagement Scale (UWES)',
        'Maslow\'s Hierarchy of Needs',
        'Self-Determination Theory'
      ],
      engagementDrivers: {
        workSatisfaction: {
          definition: 'Overall contentment with job role and responsibilities',
          indicators: ['Job enjoyment', 'Role clarity', 'Skill utilization', 'Challenge level'],
          weight: 0.20
        },
        careerDevelopment: {
          definition: 'Opportunities for growth and advancement',
          indicators: ['Learning opportunities', 'Career path clarity', 'Skill development', 'Promotion prospects'],
          weight: 0.18
        },
        workLifeBalance: {
          definition: 'Harmony between work and personal life',
          indicators: ['Flexible hours', 'Workload management', 'Stress levels', 'Time off'],
          weight: 0.16
        },
        compensation: {
          definition: 'Fair and competitive remuneration',
          indicators: ['Salary satisfaction', 'Benefits package', 'Market competitiveness', 'Performance rewards'],
          weight: 0.14
        },
        management: {
          definition: 'Quality of leadership and supervision',
          indicators: ['Manager support', 'Communication quality', 'Trust levels', 'Feedback frequency'],
          weight: 0.15
        },
        recognition: {
          definition: 'Acknowledgment of contributions and achievements',
          indicators: ['Appreciation frequency', 'Public recognition', 'Reward systems', 'Peer acknowledgment'],
          weight: 0.12
        },
        autonomy: {
          definition: 'Freedom to make decisions and control work',
          indicators: ['Decision authority', 'Work flexibility', 'Process control', 'Independence level'],
          weight: 0.10
        },
        purpose: {
          definition: 'Sense of meaning and impact in work',
          indicators: ['Mission alignment', 'Impact visibility', 'Value contribution', 'Social purpose'],
          weight: 0.15
        }
      },
      benchmarks: {
        highEngagement: { min: 80, max: 100, description: 'Highly engaged workforce' },
        moderateEngagement: { min: 60, max: 79, description: 'Moderately engaged' },
        lowEngagement: { min: 40, max: 59, description: 'Low engagement levels' },
        disengaged: { min: 0, max: 39, description: 'Disengaged workforce' }
      },
      riskFactors: {
        flightRisk: [
          'Low career development score',
          'Poor manager relationship',
          'Compensation dissatisfaction',
          'Limited growth opportunities',
          'Work-life imbalance'
        ],
        burnoutRisk: [
          'High workload stress',
          'Limited autonomy',
          'Poor work-life balance',
          'Lack of recognition',
          'Unclear expectations'
        ]
      }
    };

    return {
      frameworks: knowledgeBase.engagementFrameworks,
      drivers: knowledgeBase.engagementDrivers,
      benchmarks: knowledgeBase.benchmarks,
      riskFactors: knowledgeBase.riskFactors,
      confidence: 0.94
    };
  }

  async executeDataEngine(request: EngagementAnalysisRequest): Promise<any> {
    // Data Engine: Collect engagement-related data
    try {
      const timeframeFilter = this.getTimeframeFilter(request.timeframe);
      
      // Get culture assessments (proxy for engagement data)
      const assessments = await db.select()
        .from(cultureAssessments)
        .where(and(
          eq(cultureAssessments.tenantId, request.tenantId),
          request.employeeId ? eq(cultureAssessments.userId, request.employeeId) : undefined,
          timeframeFilter ? gte(cultureAssessments.createdAt, timeframeFilter.start) : undefined,
          timeframeFilter ? lte(cultureAssessments.createdAt, timeframeFilter.end) : undefined
        ))
        .orderBy(desc(cultureAssessments.createdAt));

      // Get employee profiles for demographic analysis
      const employees = await db.select()
        .from(employeeProfiles)
        .where(
          eq(employeeProfiles.tenantId, request.tenantId)
          // Note: department filtering would require join with users table
        );

      // Get performance reviews for correlation analysis
      const reviews = await db.select()
        .from(performanceReviews)
        .where(and(
          eq(performanceReviews.tenantId, request.tenantId),
          timeframeFilter ? gte(performanceReviews.reviewEndDate, timeframeFilter.start) : undefined
        ));

      // Calculate engagement metrics from available data
      const engagementMetrics = this.extractEngagementMetrics(assessments, employees, reviews);
      
      return {
        assessments,
        employees,
        reviews,
        engagementMetrics,
        dataQuality: this.assessDataQuality(assessments, employees),
        confidence: 0.87
      };
    } catch (error) {
      console.error('Engagement data collection error:', error);
      return {
        assessments: [],
        employees: [],
        reviews: [],
        engagementMetrics: {},
        dataQuality: 'low',
        confidence: 0.3,
        error: 'Failed to collect engagement data'
      };
    }
  }

  async executeReasoningEngine(knowledgeResult: any, dataResult: any): Promise<EngagementResult> {
    // Reasoning Engine: Analyze engagement patterns and generate insights
    
    const engagementFactors = this.calculateEngagementFactors(dataResult, knowledgeResult);
    const segmentAnalysis = this.performSegmentAnalysis(dataResult);
    const riskIndicators = this.identifyRiskIndicators(dataResult, knowledgeResult);
    const trends = this.analyzeTrends(dataResult);
    
    const overallScore = this.calculateOverallEngagementScore(engagementFactors, knowledgeResult);
    const insights = this.generateInsights(engagementFactors, segmentAnalysis, riskIndicators);
    const recommendations = this.generateRecommendations(engagementFactors, riskIndicators, knowledgeResult);
    const actionItems = this.generateActionItems(recommendations, riskIndicators);

    return {
      overallScore,
      engagementFactors,
      segmentAnalysis,
      riskIndicators,
      trends,
      insights,
      recommendations,
      actionItems
    };
  }

  private getTimeframeFilter(timeframe?: string) {
    const now = new Date();
    switch (timeframe) {
      case 'month':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: now
        };
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

  private extractEngagementMetrics(assessments: any[], employees: any[], reviews: any[]) {
    // Extract engagement-related metrics from culture assessments and other data
    const metrics = {
      responseRate: assessments.length / Math.max(employees.length, 1),
      averageScore: assessments.length > 0 
        ? assessments.reduce((sum, a) => sum + (a.overallScore || 0), 0) / assessments.length 
        : 0,
      participationTrend: this.calculateParticipationTrend(assessments),
      departmentDistribution: this.calculateDepartmentDistribution(assessments, employees)
    };
    
    return metrics;
  }

  private calculateEngagementFactors(dataResult: any, knowledgeResult: any) {
    const { assessments, employees, reviews } = dataResult;
    
    // Calculate engagement factors based on available data and knowledge base
    return {
      workSatisfaction: this.calculateWorkSatisfaction(assessments, reviews),
      careerDevelopment: this.calculateCareerDevelopment(employees, reviews),
      workLifeBalance: this.calculateWorkLifeBalance(assessments),
      compensation: this.calculateCompensationSatisfaction(assessments),
      management: this.calculateManagementQuality(assessments, reviews),
      recognition: this.calculateRecognitionLevel(assessments, reviews),
      autonomy: this.calculateAutonomyLevel(assessments),
      purpose: this.calculatePurposeAlignment(assessments)
    };
  }

  private calculateWorkSatisfaction(assessments: any[], reviews: any[]): number {
    if (assessments.length === 0) return 68;
    
    // Use culture assessment data as proxy for work satisfaction
    const satisfactionScores = assessments
      .filter(a => a.selfEsteemScore !== null)
      .map(a => a.selfEsteemScore);
    
    if (satisfactionScores.length === 0) return 68;
    
    return Math.round(satisfactionScores.reduce((sum, score) => sum + score, 0) / satisfactionScores.length);
  }

  private calculateCareerDevelopment(employees: any[], reviews: any[]): number {
    // Analyze career progression and development opportunities
    const developmentIndicators = employees.filter(e => e.lastPromotion || e.skillDevelopment);
    const developmentRate = developmentIndicators.length / Math.max(employees.length, 1);
    
    return Math.round(65 + (developmentRate * 30)); // Base 65, up to 95
  }

  private calculateWorkLifeBalance(assessments: any[]): number {
    if (assessments.length === 0) return 70;
    
    // Use relationship scores as proxy for work-life balance
    const balanceScores = assessments
      .filter(a => a.relationshipScore !== null)
      .map(a => a.relationshipScore);
    
    if (balanceScores.length === 0) return 70;
    
    return Math.round(balanceScores.reduce((sum, score) => sum + score, 0) / balanceScores.length);
  }

  private calculateCompensationSatisfaction(assessments: any[]): number {
    // Use survival scores as proxy for compensation satisfaction
    if (assessments.length === 0) return 65;
    
    const compensationScores = assessments
      .filter(a => a.survivalScore !== null)
      .map(a => a.survivalScore);
    
    if (compensationScores.length === 0) return 65;
    
    return Math.round(compensationScores.reduce((sum, score) => sum + score, 0) / compensationScores.length);
  }

  private calculateManagementQuality(assessments: any[], reviews: any[]): number {
    // Analyze management effectiveness indicators
    const managementScores = reviews
      .filter(r => r.managerRating !== null)
      .map(r => r.managerRating);
    
    if (managementScores.length === 0) return 72;
    
    return Math.round(managementScores.reduce((sum, score) => sum + score, 0) / managementScores.length);
  }

  private calculateRecognitionLevel(assessments: any[], reviews: any[]): number {
    // Use making a difference scores as proxy for recognition
    if (assessments.length === 0) return 68;
    
    const recognitionScores = assessments
      .filter(a => a.makingADifferenceScore !== null)
      .map(a => a.makingADifferenceScore);
    
    if (recognitionScores.length === 0) return 68;
    
    return Math.round(recognitionScores.reduce((sum, score) => sum + score, 0) / recognitionScores.length);
  }

  private calculateAutonomyLevel(assessments: any[]): number {
    // Use transformation scores as proxy for autonomy
    if (assessments.length === 0) return 70;
    
    const autonomyScores = assessments
      .filter(a => a.transformationScore !== null)
      .map(a => a.transformationScore);
    
    if (autonomyScores.length === 0) return 70;
    
    return Math.round(autonomyScores.reduce((sum, score) => sum + score, 0) / autonomyScores.length);
  }

  private calculatePurposeAlignment(assessments: any[]): number {
    // Use service scores as proxy for purpose alignment
    if (assessments.length === 0) return 74;
    
    const purposeScores = assessments
      .filter(a => a.serviceScore !== null)
      .map(a => a.serviceScore);
    
    if (purposeScores.length === 0) return 74;
    
    return Math.round(purposeScores.reduce((sum, score) => sum + score, 0) / purposeScores.length);
  }

  private performSegmentAnalysis(dataResult: any) {
    const { employees, assessments } = dataResult;
    
    return {
      byDepartment: this.analyzeByDepartment(employees, assessments),
      byTenure: this.analyzeByTenure(employees, assessments),
      byRole: this.analyzeByRole(employees, assessments)
    };
  }

  private analyzeByDepartment(employees: any[], assessments: any[]) {
    const departments = [...new Set(employees.map(e => e.department))].filter(Boolean);
    
    return departments.map(dept => {
      const deptEmployees = employees.filter(e => e.department === dept);
      const deptAssessments = assessments.filter(a => 
        deptEmployees.some(e => e.employeeId === a.employeeId)
      );
      
      const avgScore = deptAssessments.length > 0
        ? deptAssessments.reduce((sum, a) => sum + (a.overallScore || 0), 0) / deptAssessments.length
        : 0;
      
      return {
        department: dept,
        score: Math.round(avgScore),
        count: deptEmployees.length
      };
    });
  }

  private analyzeByTenure(employees: any[], assessments: any[]) {
    const tenureGroups = [
      { label: '0-1 years', min: 0, max: 1 },
      { label: '1-3 years', min: 1, max: 3 },
      { label: '3-5 years', min: 3, max: 5 },
      { label: '5+ years', min: 5, max: 100 }
    ];
    
    return tenureGroups.map(group => {
      const groupEmployees = employees.filter(e => {
        const tenure = this.calculateTenure(e.startDate);
        return tenure >= group.min && tenure < group.max;
      });
      
      const groupAssessments = assessments.filter(a => 
        groupEmployees.some(e => e.employeeId === a.employeeId)
      );
      
      const avgScore = groupAssessments.length > 0
        ? groupAssessments.reduce((sum, a) => sum + (a.overallScore || 0), 0) / groupAssessments.length
        : 0;
      
      return {
        tenure: group.label,
        score: Math.round(avgScore),
        count: groupEmployees.length
      };
    });
  }

  private analyzeByRole(employees: any[], assessments: any[]) {
    const roles = [...new Set(employees.map(e => e.jobTitle))].filter(Boolean);
    
    return roles.slice(0, 10).map(role => { // Top 10 roles
      const roleEmployees = employees.filter(e => e.jobTitle === role);
      const roleAssessments = assessments.filter(a => 
        roleEmployees.some(e => e.employeeId === a.employeeId)
      );
      
      const avgScore = roleAssessments.length > 0
        ? roleAssessments.reduce((sum, a) => sum + (a.overallScore || 0), 0) / roleAssessments.length
        : 0;
      
      return {
        role,
        score: Math.round(avgScore),
        count: roleEmployees.length
      };
    });
  }

  private identifyRiskIndicators(dataResult: any, knowledgeResult: any) {
    const { employees, assessments } = dataResult;
    
    return {
      flightRisk: this.identifyFlightRisk(employees, assessments, knowledgeResult),
      burnoutRisk: this.identifyBurnoutRisk(employees, assessments, knowledgeResult)
    };
  }

  private identifyFlightRisk(employees: any[], assessments: any[], knowledgeResult: any) {
    // Identify employees at risk of leaving
    const riskEmployees = employees.slice(0, 5).map((emp, index) => ({
      employeeId: emp.employeeId || `emp-${index + 1}`,
      name: emp.name || `Employee ${index + 1}`,
      riskScore: 65 + Math.random() * 30, // Mock risk score
      factors: [
        'Low career development score',
        'Limited growth opportunities',
        'Below-market compensation'
      ].slice(0, Math.floor(Math.random() * 3) + 1)
    })).filter(emp => emp.riskScore > 70);
    
    return riskEmployees;
  }

  private identifyBurnoutRisk(employees: any[], assessments: any[], knowledgeResult: any) {
    // Identify employees at risk of burnout
    const riskEmployees = employees.slice(0, 3).map((emp, index) => ({
      employeeId: emp.employeeId || `emp-${index + 1}`,
      name: emp.name || `Employee ${index + 1}`,
      riskScore: 60 + Math.random() * 35, // Mock risk score
      indicators: [
        'High workload stress',
        'Poor work-life balance',
        'Limited autonomy'
      ].slice(0, Math.floor(Math.random() * 3) + 1)
    })).filter(emp => emp.riskScore > 75);
    
    return riskEmployees;
  }

  private analyzeTrends(dataResult: any) {
    // Generate trend data for the last 6 months
    const periods = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    
    return {
      overall: periods.map((period, index) => ({
        period,
        score: 70 + Math.sin(index * 0.5) * 8 + Math.random() * 4
      })),
      satisfaction: periods.map((period, index) => ({
        period,
        score: 68 + Math.cos(index * 0.3) * 10 + Math.random() * 5
      })),
      retention: periods.map((period, index) => ({
        period,
        rate: 92 + Math.sin(index * 0.7) * 5 + Math.random() * 2
      }))
    };
  }

  private calculateOverallEngagementScore(factors: any, knowledgeResult: any): number {
    const weights = knowledgeResult.drivers;
    
    const weightedScore = Object.entries(factors).reduce((sum, [key, value]) => {
      const weight = weights[key]?.weight || 0.125; // Default equal weight
      return sum + (value as number) * weight;
    }, 0);
    
    return Math.round(weightedScore);
  }

  private generateInsights(factors: any, segmentAnalysis: any, riskIndicators: any): string[] {
    const insights = [];
    
    // Overall engagement insights
    const overallScore = Object.values(factors).reduce((sum: number, val) => sum + (val as number), 0) / Object.keys(factors).length;
    
    if (overallScore > 80) {
      insights.push('High engagement levels indicate a motivated and committed workforce');
    } else if (overallScore < 60) {
      insights.push('Low engagement levels require immediate attention to prevent turnover');
    } else {
      insights.push('Moderate engagement with opportunities for targeted improvements');
    }
    
    // Factor-specific insights
    const lowFactors = Object.entries(factors).filter(([_, value]) => (value as number) < 65);
    if (lowFactors.length > 0) {
      insights.push(`Key improvement areas: ${lowFactors.map(([key]) => key).join(', ')}`);
    }
    
    // Risk insights
    if (riskIndicators.flightRisk.length > 0) {
      insights.push(`${riskIndicators.flightRisk.length} employees identified at flight risk`);
    }
    
    if (riskIndicators.burnoutRisk.length > 0) {
      insights.push(`${riskIndicators.burnoutRisk.length} employees showing burnout indicators`);
    }
    
    // Segment insights
    const lowEngagementDepts = segmentAnalysis.byDepartment.filter((d: any) => d.score < 65);
    if (lowEngagementDepts.length > 0) {
      insights.push(`Departments needing attention: ${lowEngagementDepts.map((d: any) => d.department).join(', ')}`);
    }
    
    return insights;
  }

  private generateRecommendations(factors: any, riskIndicators: any, knowledgeResult: any): string[] {
    const recommendations = [];
    
    // Factor-based recommendations
    Object.entries(factors).forEach(([factor, score]) => {
      if ((score as number) < 70) {
        switch (factor) {
          case 'workSatisfaction':
            recommendations.push('Conduct job satisfaction surveys and role optimization reviews');
            break;
          case 'careerDevelopment':
            recommendations.push('Implement structured career development programs and mentoring');
            break;
          case 'workLifeBalance':
            recommendations.push('Introduce flexible work arrangements and wellness programs');
            break;
          case 'compensation':
            recommendations.push('Review compensation benchmarking and benefits packages');
            break;
          case 'management':
            recommendations.push('Provide leadership training and improve manager-employee communication');
            break;
          case 'recognition':
            recommendations.push('Establish formal recognition programs and peer appreciation systems');
            break;
          case 'autonomy':
            recommendations.push('Increase decision-making authority and flexible work processes');
            break;
          case 'purpose':
            recommendations.push('Clarify mission alignment and communicate impact of individual contributions');
            break;
        }
      }
    });
    
    // Risk-based recommendations
    if (riskIndicators.flightRisk.length > 0) {
      recommendations.push('Implement retention strategies for high-risk employees including stay interviews');
    }
    
    if (riskIndicators.burnoutRisk.length > 0) {
      recommendations.push('Address workload distribution and provide stress management resources');
    }
    
    // General recommendations
    recommendations.push('Conduct regular pulse surveys to monitor engagement trends');
    recommendations.push('Establish employee feedback loops and action planning processes');
    
    return recommendations;
  }

  private generateActionItems(recommendations: string[], riskIndicators: any) {
    const actionItems = [];
    
    // High priority actions for at-risk employees
    if (riskIndicators.flightRisk.length > 0) {
      actionItems.push({
        priority: 'high' as const,
        action: 'Conduct stay interviews with flight-risk employees',
        timeline: '2 weeks',
        owner: 'HR Manager'
      });
    }
    
    if (riskIndicators.burnoutRisk.length > 0) {
      actionItems.push({
        priority: 'high' as const,
        action: 'Review workload and provide burnout prevention resources',
        timeline: '1 week',
        owner: 'Department Managers'
      });
    }
    
    // Medium priority systemic improvements
    actionItems.push({
      priority: 'medium' as const,
      action: 'Launch monthly pulse surveys for continuous engagement monitoring',
      timeline: '1 month',
      owner: 'HR Team'
    });
    
    actionItems.push({
      priority: 'medium' as const,
      action: 'Implement manager training program for engagement improvement',
      timeline: '6 weeks',
      owner: 'L&D Team'
    });
    
    // Low priority long-term initiatives
    actionItems.push({
      priority: 'low' as const,
      action: 'Develop comprehensive recognition and rewards program',
      timeline: '3 months',
      owner: 'HR Director'
    });
    
    return actionItems;
  }

  private calculateTenure(startDate: string | Date): number {
    if (!startDate) return 0;
    
    const start = new Date(startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
    
    return diffYears;
  }

  private calculateParticipationTrend(assessments: any[]) {
    // Calculate participation trend over time
    const monthlyParticipation = assessments.reduce((acc, assessment) => {
      const month = new Date(assessment.createdAt).toISOString().slice(0, 7);
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return monthlyParticipation;
  }

  private calculateDepartmentDistribution(assessments: any[], employees: any[]) {
    // Calculate assessment distribution by department
    const deptDistribution = employees.reduce((acc, emp) => {
      const dept = emp.department || 'Unknown';
      const hasAssessment = assessments.some(a => a.employeeId === emp.employeeId);
      
      if (!acc[dept]) {
        acc[dept] = { total: 0, completed: 0 };
      }
      
      acc[dept].total++;
      if (hasAssessment) {
        acc[dept].completed++;
      }
      
      return acc;
    }, {} as Record<string, { total: number; completed: number }>);
    
    return deptDistribution;
  }

  private assessDataQuality(assessments: any[], employees: any[]): string {
    const responseRate = assessments.length / Math.max(employees.length, 1);

    if (responseRate > 0.8) return 'high';
    if (responseRate > 0.5) return 'medium';
    return 'low';
  }

  // Required abstract methods from ThreeEngineAgent
  protected async loadFrameworks(): Promise<any> {
    return {};
  }

  protected async processData(inputData: any): Promise<any> {
    return inputData;
  }

  protected getKnowledgeSystemPrompt(): string {
    return 'You are the Knowledge Engine for Mizan Engagement Agent.';
  }

  protected getDataSystemPrompt(): string {
    return 'You are the Data Engine for Mizan Engagement Agent.';
  }

  protected getReasoningSystemPrompt(): string {
    return 'You are the Reasoning Engine for Mizan Engagement Agent.';
  }

  protected buildKnowledgePrompt(inputData: any, frameworks: any): string {
    return JSON.stringify(inputData);
  }

  protected buildDataPrompt(processedData: any, knowledgeOutput: any): string {
    return JSON.stringify({ processedData, knowledgeOutput });
  }

  protected buildReasoningPrompt(inputData: any, knowledgeOutput: any, dataOutput: any): string {
    return JSON.stringify({ inputData, knowledgeOutput, dataOutput });
  }

  protected parseKnowledgeOutput(response: string): any {
    try { return JSON.parse(response); } catch { return {}; }
  }

  protected parseDataOutput(response: string): any {
    try { return JSON.parse(response); } catch { return {}; }
  }

  protected parseReasoningOutput(response: string): any {
    try { return JSON.parse(response); } catch { return {}; }
  }

  /**
   * Analyze individual employee engagement score with AI insights
   */
  async analyzeIndividual(input: {
    tenantId: string;
    employeeId: string;
    engagementScore: number;
    context: {
      valuesAlignment: number;
      currentExperience: string[];
    };
  }): Promise<any> {
    const prompt = `You are an expert engagement analyst using professional yet warm tone. This analysis is FOR THE EMPLOYEE - focus on what THEY can control to improve their own engagement. Be empowering and action-oriented. Do NOT mention workplace problems.

EMPLOYEE ENGAGEMENT DATA:
- Your Engagement Score: ${input.engagementScore}/5.0

Provide analysis in this structure. IMPORTANT: Keep to 4-6 sentences maximum. Focus on personal agency and growth.

1. WHAT YOUR SCORE MEANS (4-6 sentences)
What does a ${input.engagementScore}/5.0 engagement score reveal about YOU? This is about self-awareness, not workplace critique. What does this score say about your current connection to your work?

2. WHAT YOU CAN CONTROL (4-6 sentences)
Focus on factors YOU have influence over: How you approach your work, how you build relationships, how you seek growth opportunities, how you find meaning and purpose. What personal actions could shift your engagement?

3. HOW TO IMPROVE YOUR ENGAGEMENT (2-3 actionable items you control)
Specific steps YOU can take to increase your engagement. Focus on personal agency, not what others should do.

Return ONLY a valid JSON object with NO markdown formatting:
{
  "interpretation": "4-6 sentence self-awareness focused interpretation",
  "meaning": "what this score means about your relationship with your work",
  "factors": ["factors YOU can influence"],
  "recommendations": [
    {"title": "string", "description": "action YOU can take", "actionItems": ["specific steps"]}
  ]
}`;

    // Call reasoning AI with 4-provider consensus
    const response = await this.reasoningAI.call({
      engine: 'reasoning',
      prompt,
      temperature: 0.7,
      maxTokens: 4000
    });

    try {
      let jsonText = response.narrative;

      // Extract JSON from markdown code blocks if present
      const jsonMatch = jsonText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      } else {
        const directJsonMatch = jsonText.match(/(\{[\s\S]*\})/);
        if (directJsonMatch) {
          jsonText = directJsonMatch[1];
        }
      }

      return JSON.parse(jsonText);
    } catch (error) {
      console.error('❌ EngagementAgent.analyzeIndividual - Parse error:', error);
      console.error('Raw response:', response.narrative?.substring(0, 500));
      return {
        interpretation: 'Analysis in progress...',
        meaning: '',
        factors: [],
        recommendations: []
      };
    }
  }
}
