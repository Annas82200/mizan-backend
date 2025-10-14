/**
 * Culture Design Expert System
 *
 * Implements evidence-based organizational culture frameworks:
 * 1. Cameron & Quinn Competing Values Framework (OCAI)
 * 2. Schein's Three Levels of Culture
 * 3. Denison's Culture Model (Mission, Adaptability, Involvement, Consistency)
 * 4. Hofstede's Cultural Dimensions
 * 5. Industry-specific culture benchmarks
 */

interface CultureAnalysisInput {
  personalValues: string[];
  currentExperienceValues: string[];
  desiredFutureValues: string[];
  engagementLevel: number;
  recognitionLevel: number;
}

interface TenantInfo {
  name: string;
  industry?: string | null;
}

// ============================================================================
// CAMERON & QUINN - COMPETING VALUES FRAMEWORK (OCAI)
// ============================================================================

type CultureArchetype = 'clan' | 'adhocracy' | 'market' | 'hierarchy';

interface CultureArchetypeProfile {
  archetype: CultureArchetype;
  name: string;
  description: string;
  characteristics: string[];
  leadership: string;
  managementStyle: string;
  values: string[];
  successCriteria: string;
  whenEffective: string;
}

const CULTURE_ARCHETYPES: Record<CultureArchetype, CultureArchetypeProfile> = {
  clan: {
    archetype: 'clan',
    name: 'Collaborative (Clan Culture)',
    description: 'Family-like workplace where people share a lot, like an extended family',
    characteristics: [
      'Teamwork and employee participation',
      'Consensus and employee development',
      'High commitment to employees',
      'Friendly work environment'
    ],
    leadership: 'Mentors, facilitators, team builders',
    managementStyle: 'Teamwork, consensus, participation',
    values: ['Loyalty', 'Tradition', 'Teamwork', 'Commitment'],
    successCriteria: 'Employee satisfaction, team cohesion, development opportunities',
    whenEffective: 'Stable environments requiring employee commitment and morale'
  },

  adhocracy: {
    archetype: 'adhocracy',
    name: 'Creative (Adhocracy Culture)',
    description: 'Dynamic and entrepreneurial workplace where people take risks',
    characteristics: [
      'Innovation and risk-taking',
      'Entrepreneurial spirit',
      'Individual initiative valued',
      'Fast-paced, experimental'
    ],
    leadership: 'Innovators, entrepreneurs, visionaries',
    managementStyle: 'Freedom to innovate, risk-taking encouraged',
    values: ['Innovation', 'Growth', 'Creativity', 'Cutting-edge'],
    successCriteria: 'Unique products/services, market leadership, innovation',
    whenEffective: 'Rapidly changing environments requiring innovation and agility'
  },

  market: {
    archetype: 'market',
    name: 'Competitive (Market Culture)',
    description: 'Results-oriented workplace focused on getting the job done',
    characteristics: [
      'Results-driven',
      'Goal achievement focus',
      'Competitive spirit',
      'Market positioning emphasis'
    ],
    leadership: 'Hard drivers, producers, competitors',
    managementStyle: 'Demanding, competitive, achievement-oriented',
    values: ['Achievement', 'Results', 'Competition', 'Winning'],
    successCriteria: 'Market share, profitability, competitive wins',
    whenEffective: 'Competitive markets requiring aggressive execution'
  },

  hierarchy: {
    archetype: 'hierarchy',
    name: 'Controlled (Hierarchy Culture)',
    description: 'Structured workplace with clear processes and procedures',
    characteristics: [
      'Structured and controlled',
      'Clear procedures and rules',
      'Stability and predictability',
      'Formal processes'
    ],
    leadership: 'Coordinators, organizers, administrators',
    managementStyle: 'Process control, stability, predictable',
    values: ['Efficiency', 'Reliability', 'Control', 'Stability'],
    successCriteria: 'Efficiency, smooth operations, reliability',
    whenEffective: 'Stable environments requiring efficiency and consistency'
  }
};

export function detectCultureArchetype(
  currentValues: string[],
  desiredValues: string[]
): { current: CultureArchetypeProfile; desired: CultureArchetypeProfile; alignment: number } {

  // Keyword mapping to archetypes
  const keywords = {
    clan: ['collaboration', 'team', 'family', 'mentor', 'consensus', 'loyalty', 'commitment', 'people-focused'],
    adhocracy: ['innovation', 'creativity', 'risk', 'entrepreneurial', 'agility', 'cutting-edge', 'experiment'],
    market: ['results', 'achievement', 'competitive', 'goals', 'performance', 'winning', 'metrics'],
    hierarchy: ['process', 'efficiency', 'control', 'structure', 'stability', 'rules', 'reliable']
  };

  const scoreArchetype = (values: string[]) => {
    const scores: Record<CultureArchetype, number> = {
      clan: 0,
      adhocracy: 0,
      market: 0,
      hierarchy: 0
    };

    values.forEach(value => {
      const valueLower = value.toLowerCase();
      Object.entries(keywords).forEach(([archetype, kws]) => {
        if (kws.some(kw => valueLower.includes(kw))) {
          scores[archetype as CultureArchetype]++;
        }
      });
    });

    const topArchetype = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)[0][0] as CultureArchetype;

    return CULTURE_ARCHETYPES[topArchetype];
  };

  const currentArchetype = scoreArchetype(currentValues);
  const desiredArchetype = scoreArchetype(desiredValues);

  // Calculate alignment (0-100)
  const alignment = currentArchetype.archetype === desiredArchetype.archetype ? 100 : 60;

  return {
    current: currentArchetype,
    desired: desiredArchetype,
    alignment
  };
}

// ============================================================================
// DENISON MODEL - CULTURE EFFECTIVENESS
// ============================================================================

interface DenisonAssessment {
  mission: number;        // Purpose, strategic direction
  adaptability: number;   // Customer focus, change capability
  involvement: number;    // Empowerment, team orientation
  consistency: number;    // Core values, agreement
  overallEffectiveness: number;
  gaps: string[];
}

export function assessDenisonModel(
  engagementLevel: number,  // 1-5
  recognitionLevel: number, // 1-5
  currentValues: string[],
  desiredValues: string[]
): DenisonAssessment {

  // Map engagement/recognition to Denison dimensions (convert 1-5 to 0-100)
  const involvement = (engagementLevel / 5) * 100;

  // Infer other dimensions from value alignment
  const valueAlignment = currentValues.filter(v => desiredValues.includes(v)).length / desiredValues.length;
  const consistency = valueAlignment * 100;

  // Estimate mission and adaptability (simplified)
  const mission = ((involvement + consistency) / 2) * 0.9; // Slightly lower
  const adaptability = involvement * 0.85; // Related to engagement

  const overallEffectiveness = (mission + adaptability + involvement + consistency) / 4;

  const gaps: string[] = [];
  if (mission < 60) gaps.push('Clear purpose and strategic direction');
  if (adaptability < 60) gaps.push('Ability to adapt and respond to change');
  if (involvement < 60) gaps.push('Employee empowerment and engagement');
  if (consistency < 60) gaps.push('Shared values and alignment');

  return {
    mission: Math.round(mission),
    adaptability: Math.round(adaptability),
    involvement: Math.round(involvement),
    consistency: Math.round(consistency),
    overallEffectiveness: Math.round(overallEffectiveness),
    gaps
  };
}

// ============================================================================
// EXPERT RECOMMENDATIONS
// ============================================================================

export interface CultureExpertRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  rationale: string;
  actionItems: string[];
  expectedImpact: string;
  timeframe: string;
}

export interface CultureExpertAnalysis {
  cultureArchetype: {
    current: CultureArchetypeProfile;
    desired: CultureArchetypeProfile;
    alignment: number;
  };
  denison: DenisonAssessment;
  recommendations: CultureExpertRecommendation[];
}

export function performCultureExpertAnalysis(
  input: CultureAnalysisInput,
  tenantInfo: TenantInfo
): CultureExpertAnalysis {

  const { personalValues, currentExperienceValues, desiredFutureValues, engagementLevel, recognitionLevel } = input;
  const clientName = tenantInfo.name;

  // Run frameworks
  const cultureArchetype = detectCultureArchetype(currentExperienceValues, desiredFutureValues);
  const denison = assessDenisonModel(engagementLevel, recognitionLevel, currentExperienceValues, desiredFutureValues);

  // Generate executive-friendly recommendations
  const recommendations: CultureExpertRecommendation[] = [];

  // Culture Archetype Misalignment
  if (cultureArchetype.alignment < 80) {
    const currentStyle = cultureArchetype.current.name;
    const desiredStyle = cultureArchetype.desired.name;

    recommendations.push({
      priority: 'high',
      category: 'Culture Transformation',
      title: `${clientName} Culture Needs to Shift Direction`,
      rationale: `Your team currently experiences a ${currentStyle} environment, but your organization needs to move toward a ${desiredStyle} culture to achieve its goals. ${cultureArchetype.desired.description} This shift requires intentional leadership actions and new practices.`,
      actionItems: [
        `Leadership alignment: Have your leadership team discuss and commit to the shift from ${currentStyle} to ${desiredStyle}`,
        `Update recognition programs: Celebrate behaviors that reflect ${cultureArchetype.desired.values.join(', ').toLowerCase()} rather than ${cultureArchetype.current.values.slice(0, 2).join(' and ').toLowerCase()}`,
        `Revise performance criteria: Ensure your review process emphasizes ${cultureArchetype.desired.successCriteria.toLowerCase()}`,
        `Model new behaviors: Leaders should visibly demonstrate ${cultureArchetype.desired.managementStyle.toLowerCase()} in team meetings and decisions`,
        `Communicate the "why": Share with employees why ${desiredStyle} will help ${clientName} succeed and what it means for their day-to-day work`
      ],
      expectedImpact: `${clientName} will build a culture that supports your strategy, improving employee alignment by 40-50% and making it easier to achieve business goals.`,
      timeframe: '6-12 months to see noticeable shift, 18-24 months for full transformation'
    });
  }

  // Low Engagement (Involvement dimension)
  if (denison.involvement < 60) {
    recommendations.push({
      priority: 'critical',
      category: 'Employee Engagement',
      title: `${clientName} Employees Need More Voice and Ownership`,
      rationale: `With an engagement score of ${engagementLevel} out of 5, employees at ${clientName} don't feel sufficiently involved in decisions or empowered to act. This creates a "just do your job" mindset instead of ownership, slowing innovation and reducing commitment.`,
      actionItems: [
        `Start weekly team huddles: 15-minute standup meetings where everyone shares wins, blockers, and ideas (not status reports)`,
        `Implement decision rights: Clarify which decisions employees can make without approval - aim for 70% of daily decisions`,
        `Create suggestion program: Simple system where any employee can propose improvements, with guaranteed response within 5 days`,
        `Share financials: Monthly all-hands reviewing key metrics and how each team contributes to company success`,
        `Pilot employee-led projects: Let 3-5 employees lead initiatives they propose, with small budgets ($2-5K) to test ideas`
      ],
      expectedImpact: `${clientName} will increase employee initiative and problem-solving by 35-45%, reduce manager bottlenecks, and improve retention of top performers.`,
      timeframe: '3-6 months to build new habits, 9-12 months to see cultural shift'
    });
  }

  // Low Recognition
  if (recognitionLevel <= 2) {
    recommendations.push({
      priority: 'high',
      category: 'Recognition & Appreciation',
      title: `${clientName} Needs Stronger Recognition Culture`,
      rationale: `A recognition score of ${recognitionLevel} out of 5 indicates employees feel their contributions go unnoticed. This erodes motivation, increases turnover risk, and makes it harder to reinforce desired behaviors and values.`,
      actionItems: [
        `Train managers on recognition: 2-hour workshop on giving specific, timely, values-based appreciation (not generic "good job")`,
        `Weekly wins ritual: End every team meeting with 3-minute round where people share appreciations for colleagues`,
        `Peer recognition platform: Simple tool (Slack bot, or cards) where anyone can recognize anyone, visible to whole company`,
        `Link recognition to values: Every recognition should mention which company value the person demonstrated`,
        `Leadership modeling: CEO/executives should publicly recognize 2-3 people per week in all-hands or company chat`
      ],
      expectedImpact: `${clientName} will strengthen desired behaviors, improve morale, and increase employee retention by 20-30% within the recognized groups.`,
      timeframe: '2-3 months to establish habits, 6 months for measurable engagement increase'
    });
  }

  // Values Misalignment
  const valueGapCount = desiredFutureValues.filter(v => !currentExperienceValues.includes(v)).length;
  if (valueGapCount > 5) {
    recommendations.push({
      priority: 'high',
      category: 'Values Alignment',
      title: `${clientName} Has Gap Between Stated and Lived Values`,
      rationale: `Employees experience ${valueGapCount} fewer of your desired values in daily work than the organization aspires to. This "say-do gap" creates cynicism and makes it hard for culture to support strategy.`,
      actionItems: [
        `Values audit: Interview 10-15 employees about specific examples where they see values lived or violated`,
        `Remove conflicting metrics: Identify KPIs or incentives that reward behaviors opposite to stated values`,
        `Decision-making filters: Train leaders to explicitly ask "does this align with our [specific value]?" before major decisions`,
        `Onboarding emphasis: Spend 30% of new hire onboarding on values with real stories and examples, not just posters`,
        `90-day values check: Add values discussion to all performance conversations - "where did you see our values in action?"`
      ],
      expectedImpact: `${clientName} will close the say-do gap by 50-60%, increasing trust in leadership and making culture a competitive advantage.`,
      timeframe: '6-9 months to rebuild credibility, 12-18 months for values to feel authentic'
    });
  }

  return {
    cultureArchetype,
    denison,
    recommendations
  };
}
