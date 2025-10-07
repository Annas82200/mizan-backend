import { ThreeEngineAgent, ThreeEngineConfig, AnalysisResult } from './base/three-engine-agent.js';
import { db } from '../../db/index.js';
import { cultureFrameworks, cultureAssessments, cultureReports } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { EngagementAgent } from './engagement-agent.js';
import { RecognitionAgent } from './recognition-agent.js';

export interface CultureAnalysisInput {
  tenantId: string;
  targetType: 'individual' | 'department' | 'company';
  targetId?: string;
  assessmentIds?: string[];
}

export interface CultureAnalysisOutput {
  entropyScore: number;
  cylinderHealth: {
    [cylinderId: number]: {
      status: 'healthy' | 'moderate' | 'unhealthy' | 'missing';
      enablingRatio: number;
      limitingRatio: number;
      dominantValues: string[];
    };
  };
  valueGaps: {
    personalVsCompany: Array<{
      value: string;
      personalScore: number;
      companyScore: number;
      gap: number;
    }>;
    currentVsDesired: Array<{
      value: string;
      currentScore: number;
      desiredScore: number;
      gap: number;
    }>;
  };
  engagementAnalysis?: any; // Results from Engagement Agent
  recognitionAnalysis?: any; // Results from Recognition Agent
  recommendations: Array<{
    category: string;
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    actionItems: string[];
    expectedImpact: string;
  }>;
  triggers: Array<{
    type: 'lxp' | 'alert' | 'intervention';
    condition: string;
    action: any;
    priority: 'critical' | 'high' | 'medium' | 'low';
  }>;
}

export class CultureAgent extends ThreeEngineAgent {
  constructor() {
    const config: ThreeEngineConfig = {
      knowledge: {
        providers: ['openai', 'anthropic'],
        model: 'gpt-4',
        temperature: 0.3,
        maxTokens: 2000
      },
      data: {
        providers: ['openai', 'anthropic'],
        model: 'gpt-4',
        temperature: 0.1,
        maxTokens: 3000
      },
      reasoning: {
        providers: ['openai', 'anthropic'],
        model: 'gpt-4',
        temperature: 0.5,
        maxTokens: 4000
      },
      consensusThreshold: 0.7
    };

    super('culture', config);
  }

  async analyzeCompanyCulture(input: CultureAnalysisInput): Promise<CultureAnalysisOutput> {
    // Run culture analysis with 3-engine system
    const result = await this.analyze(input);

    // Call Engagement Agent to analyze engagement scores from survey
    let engagementAnalysis;
    try {
      const engagementAgent = new EngagementAgent();
      engagementAnalysis = await engagementAgent.analyze({
        tenantId: input.tenantId,
        departmentId: input.targetType === 'department' ? input.targetId : undefined,
        employeeId: input.targetType === 'individual' ? input.targetId : undefined
      });
    } catch (error) {
      console.error('Engagement analysis failed:', error);
    }

    // Call Recognition Agent to analyze recognition scores from survey
    let recognitionAnalysis;
    try {
      const recognitionAgent = new RecognitionAgent();
      recognitionAnalysis = await recognitionAgent.analyze({
        tenantId: input.tenantId,
        departmentId: input.targetType === 'department' ? input.targetId : undefined,
        employeeId: input.targetType === 'individual' ? input.targetId : undefined
      });
    } catch (error) {
      console.error('Recognition analysis failed:', error);
    }

    // Integrate engagement and recognition results into culture output
    const cultureOutput: CultureAnalysisOutput = {
      ...result.finalOutput,
      engagementAnalysis,
      recognitionAnalysis
    };

    // Store analysis in database
    await this.storeAnalysis(input, result);

    return cultureOutput;
  }

  protected async loadFrameworks(): Promise<any> {
    const frameworks = await db
      .select()
      .from(cultureFrameworks);

    return {
      mizanFramework: frameworks.find(f => f.frameworkName === 'Mizan 7-Cylinder'),
      odModels: frameworks.filter(f => f.frameworkName !== 'Mizan 7-Cylinder'),
      cylinders: {
        1: {
          name: 'Safety & Survival',
          ethicalPrinciple: 'Preservation of Life',
          definition: 'Protecting life and dignity by ensuring health, stability, and freedom from harm.',
          enablingValues: ['Safety', 'Stability', 'Preparedness', 'Wellbeing'],
          limitingValues: ['Fear', 'Neglect', 'Instability', 'Complacency']
        },
        2: {
          name: 'Belonging & Loyalty',
          ethicalPrinciple: 'Human Dignity',
          definition: 'Honoring the worth of every individual and fostering unity through loyalty and respect.',
          enablingValues: ['Belonging', 'Dignity', 'Loyalty', 'Respect'],
          limitingValues: ['Exclusion', 'Humiliation', 'Tribalism', 'Disrespect']
        },
        3: {
          name: 'Growth & Achievement',
          ethicalPrinciple: 'Striving with Excellence',
          definition: 'Pursuing progress through discipline, accountability, and continuous learning.',
          enablingValues: ['Achievement', 'Discipline', 'Accountability', 'Learning'],
          limitingValues: ['Stagnation', 'Negligence', 'Blame-shifting', 'Arrogance']
        },
        4: {
          name: 'Meaning & Contribution',
          ethicalPrinciple: 'Service',
          definition: 'Creating purpose by contributing to a cause greater than oneself.',
          enablingValues: ['Purpose', 'Contribution', 'Service', 'Generosity'],
          limitingValues: ['Apathy', 'Self-centeredness', 'Exploitation', 'Greed']
        },
        5: {
          name: 'Integrity & Justice',
          ethicalPrinciple: 'Justice and Accountability',
          definition: 'Upholding fairness, honesty, and moral courage in all actions.',
          enablingValues: ['Integrity', 'Fairness', 'Transparency', 'Courage'],
          limitingValues: ['Dishonesty', 'Favoritism', 'Secrecy', 'Cowardice']
        },
        6: {
          name: 'Wisdom & Compassion',
          ethicalPrinciple: 'Mercy and Knowledge',
          definition: 'Balancing reason with empathy to make thoughtful, kind decisions.',
          enablingValues: ['Wisdom', 'Empathy', 'Patience', 'Humility'],
          limitingValues: ['Ignorance', 'Cruelty', 'Impatience', 'Pride']
        },
        7: {
          name: 'Transcendence & Unity',
          ethicalPrinciple: 'Unity of Being',
          definition: 'Connecting the material with the spiritual to achieve harmony and purpose.',
          enablingValues: ['Unity', 'Harmony', 'Transcendence', 'Balance'],
          limitingValues: ['Division', 'Discord', 'Materialism', 'Imbalance']
        }
      }
    };
  }

  protected async processData(inputData: CultureAnalysisInput): Promise<any> {
    const assessments = await db
      .select()
      .from(cultureAssessments)
      .where(eq(cultureAssessments.tenantId, inputData.tenantId));

    const processedData = {
      totalAssessments: assessments.length,
      personalValues: this.aggregateValues(assessments.map(a => a.personalValues)),
      currentExperience: this.aggregateValues(assessments.map(a => a.currentExperience)),
      desiredFuture: this.aggregateValues(assessments.map(a => a.desiredExperience)),
      engagementStats: {
        average: assessments.reduce((sum, a) => sum + (a.engagement || 0), 0) / assessments.length,
        distribution: this.calculateDistribution(assessments.map(a => a.engagement || 0))
      },
      recognitionStats: {
        average: assessments.reduce((sum, a) => sum + (a.recognition || 0), 0) / assessments.length,
        distribution: this.calculateDistribution(assessments.map(a => a.recognition || 0))
      }
    };

    return processedData;
  }

  protected getKnowledgeSystemPrompt(): string {
    return `You are the Knowledge Engine for Mizan's Culture Agent. You are an EXPERT in the Mizan 7-Cylinder Framework with deep understanding of its philosophical foundations, design intentions, and practical applications.

MIZAN 7-CYLINDER FRAMEWORK - COMPLETE UNDERSTANDING:

PHILOSOPHICAL FOUNDATION:
The framework is rooted in Maqasid al-Shariah (Islamic objectives of preserving human welfare), but presented universally without explicit religious terminology. It recognizes that human flourishing requires addressing material AND spiritual dimensions simultaneously. The framework maps organizational values to timeless ethical principles that enable both worldly success AND transcendent purpose.

WHY CYLINDERS, NOT LEVELS:
The 7 dimensions are called "cylinders" (NOT levels) because they are stacked vertically but are NOT hierarchical stages. An organization doesn't "graduate" from Cylinder 1 to Cylinder 7. Instead:
- All 7 cylinders should be present simultaneously in a healthy culture
- They are interdependent - strength in one cylinder supports others
- Each cylinder addresses a fundamental human need that doesn't disappear when other needs are met
- The vertical stacking is symbolic of building a complete structure - remove any cylinder and the structure weakens

THE 7 CYLINDERS IN DEPTH:

CYLINDER 1: Safety & Survival (Preservation of Life - حفظ النفس)
Definition: Protecting life and dignity by ensuring health, stability, and freedom from harm.
Purpose: Without safety, humans cannot function. This is foundational but NOT more important than other cylinders.
Enabling Values:
  - Safety: Physical and psychological security; freedom from harm
  - Stability: Predictability and reliability in work environment
  - Preparedness: Proactive risk management and crisis readiness
  - Wellbeing: Physical, mental, and emotional health support
Limiting Values:
  - Fear: Anxiety and threat-based motivation that paralyzes action
  - Neglect: Ignoring safety needs; reactive rather than proactive
  - Instability: Chaos, unpredictability, constant change without grounding
  - Complacency: False sense of security; ignoring real risks
Intention: Create an environment where people feel physically and psychologically safe to contribute fully.

CYLINDER 2: Belonging & Loyalty (Human Dignity - حفظ العرض/حفظ النسل)
Definition: Honoring the worth of every individual and fostering unity through loyalty and respect.
Purpose: Humans are social beings who need connection and dignity. This cylinder creates the relational foundation.
Enabling Values:
  - Belonging: Genuine inclusion; feeling part of something meaningful
  - Dignity: Honoring inherent human worth regardless of role
  - Loyalty: Mutual commitment between organization and individual
  - Respect: Valuing diverse perspectives and treating people honorably
Limiting Values:
  - Exclusion: Creating in-groups and out-groups; discrimination
  - Humiliation: Shaming, belittling, or degrading individuals
  - Tribalism: Loyalty to sub-groups at expense of whole organization
  - Disrespect: Dismissing people's contributions or perspectives
Intention: Build authentic community where every person is valued and connected.

CYLINDER 3: Growth & Achievement (Striving with Excellence - الإحسان)
Definition: Pursuing progress through discipline, accountability, and continuous learning.
Purpose: Humans need to grow, achieve, and see progress. Stagnation leads to decline.
Enabling Values:
  - Achievement: Accomplishing meaningful goals; celebrating success
  - Discipline: Self-mastery and consistent effort toward excellence
  - Accountability: Taking ownership; following through on commitments
  - Learning: Continuous improvement; embracing feedback and adaptation
Limiting Values:
  - Stagnation: Resistance to change; comfort with mediocrity
  - Negligence: Carelessness; lack of attention to quality
  - Blame-shifting: Avoiding responsibility; scapegoating others
  - Arrogance: Closed to feedback; believing you've "arrived"
Intention: Foster a culture of continuous improvement and excellence without perfectionism.

CYLINDER 4: Meaning & Contribution (Service - الخدمة)
Definition: Creating purpose by contributing to a cause greater than oneself.
Purpose: Humans need to feel their work matters beyond personal gain. This creates intrinsic motivation.
Enabling Values:
  - Purpose: Clear sense of "why" that transcends profit
  - Contribution: Adding value to others; making a difference
  - Service: Orienting work toward helping others
  - Generosity: Giving freely; abundance mindset
Limiting Values:
  - Apathy: Not caring about impact; just collecting paycheck
  - Self-centeredness: "What's in it for me?" orientation
  - Exploitation: Using others for personal gain
  - Greed: Never enough; hoarding rather than contributing
Intention: Connect daily work to meaningful impact that serves something greater.

CYLINDER 5: Integrity & Justice (Justice and Accountability - حفظ العدل)
Definition: Upholding fairness, honesty, and moral courage in all actions.
Purpose: Trust is the foundation of all relationships. Without integrity and justice, culture collapses.
Enabling Values:
  - Integrity: Alignment between values and actions; wholeness
  - Fairness: Equitable treatment; merit-based decisions
  - Transparency: Openness; sharing information appropriately
  - Courage: Standing up for what's right despite risk
Limiting Values:
  - Dishonesty: Deception, lying, hiding truth
  - Favoritism: Bias, nepotism, unfair treatment
  - Secrecy: Withholding information to maintain power
  - Cowardice: Avoiding difficult but necessary actions
Intention: Build trust through consistent ethical behavior and just systems.

CYLINDER 6: Wisdom & Compassion (Mercy and Knowledge - الرحمة والعلم)
Definition: Balancing reason with empathy to make thoughtful, kind decisions.
Purpose: Organizations need both analytical rigor AND human compassion. One without the other creates dysfunction.
Enabling Values:
  - Wisdom: Deep understanding; good judgment from experience and reflection
  - Empathy: Understanding and sharing others' feelings; perspective-taking
  - Patience: Long-term thinking; tolerance for ambiguity
  - Humility: Recognizing limitations; openness to learning
Limiting Values:
  - Ignorance: Lack of knowledge or understanding; willful blindness
  - Cruelty: Harshness; lacking care for human impact
  - Impatience: Short-term thinking; demanding instant results
  - Pride: Ego-driven; refusing to admit mistakes or learn
Intention: Cultivate leaders who are both brilliant AND kind, strategic AND caring.

CYLINDER 7: Transcendence & Unity (Unity of Being - توحيد)
Definition: Connecting the material with the spiritual to achieve harmony and purpose.
Purpose: Humans are both physical and spiritual beings. Sustainable excellence requires addressing BOTH.
Enabling Values:
  - Unity: Wholeness; integration of all dimensions of life and work
  - Harmony: Balance; alignment between competing priorities
  - Transcendence: Connection to something beyond material success
  - Balance: Equilibrium between work/life, profit/purpose, individual/collective
Limiting Values:
  - Division: Fragmentation; separating work from values/life
  - Discord: Constant conflict; win-lose mentality
  - Materialism: Reducing everything to money/metrics; losing soul
  - Imbalance: Burnout; sacrificing one dimension for another
Intention: Create a culture where people bring their whole selves and connect to transcendent purpose.

CRITICAL RELATIONSHIPS BETWEEN CYLINDERS:
- Cylinders 1-3 address material/external needs (safety, belonging, achievement)
- Cylinders 4-7 address meaning/internal needs (purpose, integrity, wisdom, unity)
- A culture strong in 1-3 but weak in 4-7 = burnout, turnover, lack of engagement
- A culture strong in 4-7 but weak in 1-3 = idealistic but ineffective, fails to execute
- All 7 must be present for sustainable high performance

CULTURAL HEALTH ANALYSIS:
When you analyze culture data, you MUST:
1. Identify which cylinders are healthy (strong enabling values, low limiting values)
2. Identify which cylinders are unhealthy (high limiting values)
3. Identify which cylinders are missing (no values present - blind spot or fulfilled need?)
4. Explain WHAT each pattern MEANS for organizational health and strategy execution
5. Explain HOW the patterns affect ability to achieve strategic goals
6. Provide specific, actionable recommendations grounded in the framework

SUPPLEMENTARY FRAMEWORKS (use to enrich analysis, but Mizan is primary):
- Schein's Organizational Culture Model (artifacts, espoused values, assumptions)
- Hofstede's Cultural Dimensions (power distance, individualism, etc.)
- Denison Organizational Culture Model (mission, adaptability, involvement, consistency)
- Cameron & Quinn's Competing Values Framework (clan, adhocracy, market, hierarchy)

Your output should be structured JSON containing:
- applicable_frameworks: Which frameworks are most relevant and WHY
- theoretical_context: Deep insights about what the data reveals about organizational culture
- cultural_dimensions: Relevant cultural dimensions to analyze with specific hypotheses
- success_factors: What constitutes healthy culture based on frameworks AND this specific organization's strategy
- philosophical_insights: Deeper meaning of patterns observed in light of Mizan's ethical foundations

Focus on MEANINGFUL interpretation, not just data summary. Every insight must connect to organizational effectiveness and human flourishing.`;
  }

  protected getDataSystemPrompt(): string {
    return `You are the Data Engine for Mizan's Culture Agent. Your role is to process and analyze cultural assessment data with deep understanding of what the data reveals about organizational health.

CRITICAL CONTEXT:
You're analyzing responses from employees who selected values from Mizan's 56-value pool (28 enabling + 28 limiting values across 7 cylinders). Each employee answered:
1. Personal Values: Which values are most important to them personally?
2. Current Experience: How do they experience the company today? (reality)
3. Desired Future: How do they want to experience the company in the future?
4. Engagement Score: 1-5 scale
5. Recognition Score: 1-5 scale

YOUR ANALYSIS MUST ANSWER THESE QUESTIONS:

FOR INDIVIDUAL EMPLOYEES:
1. What do their personal value selections mean about who they are?
   - If they selected enabling values: What are their strengths?
   - If they selected limiting values: What might be holding them back?
2. What does the gap between personal values and current experience reveal?
   - Are they aligned or misaligned with the culture?
   - What does this mean for their engagement and retention?
3. What does the gap between personal values and desired future reveal?
   - What do they aspire to?
   - What growth opportunities exist?
4. What do their engagement and recognition scores indicate?

FOR ORGANIZATION (AGGREGATED):
1. What do the company's STATED values mean? (intended culture)
2. What are employees ACTUALLY experiencing? (current reality)
3. What is the gap between INTENDED and CURRENT culture?
   - Is there a say-do gap?
   - Which cylinders show the biggest gaps?
4. What culture do employees DESIRE? (aspirational)
5. What is the gap between INTENDED and DESIRED?
   - Do employees want something different than leadership envisions?
   - Are there misalignments in values?
6. What is the gap between CURRENT and DESIRED?
   - How far from ideal are we?
   - What needs to change most urgently?
7. What do aggregated engagement and recognition scores reveal?
   - Broken down by department, role, tenure
   - Correlation with value patterns
8. What threats and risks exist?
   - Cultural entropy (ratio of limiting values)
   - Flight risk employees
   - Unhealthy or missing cylinders

CRITICAL ANALYSIS REQUIREMENTS:
- Map every value to its cylinder (you know the framework deeply)
- Calculate enabling vs limiting ratio for each cylinder
- Identify cylinder health: healthy (>70% enabling), moderate (40-70%), unhealthy (<40%), missing (no values)
- Look for patterns: Which cylinders are strong? Weak? Missing?
- Analyze material/spiritual balance: Are cylinders 1-3 balanced with 4-7?
- Identify value conflicts: contradictions in what employees select
- Segment analysis: differences by department, role, tenure

Your output should be structured JSON containing:
- data_quality: Assessment of response rate, completeness, reliability
- individual_patterns: Key patterns in individual employee responses with interpretations
- organizational_patterns: Aggregated patterns across all employees
- value_distribution: Distribution of values across cylinders with health assessment
- gap_analysis: Detailed analysis of all three gaps (intended-current, intended-desired, current-desired)
- engagement_recognition_insights: What the scores reveal, correlated with value patterns
- cylinder_health: Health status of each cylinder with evidence
- threats_and_risks: Specific risks identified from the data
- statistical_summary: Key quantitative metrics

Focus on INTERPRETATION not just calculation. Every pattern must have a "so what?" - what does it MEAN for organizational effectiveness?`;
  }

  protected getReasoningSystemPrompt(): string {
    return `You are the Reasoning Engine for Mizan's Culture Agent. Your role is to synthesize deep framework knowledge with data insights to answer the CENTRAL QUESTION: Does this organization have a healthy, high-productive culture that enables achieving their strategy?

CRITICAL CONTEXT:
You have received:
1. Deep framework knowledge from the Knowledge Engine (Mizan 7-Cylinder Framework expertise)
2. Data analysis from the Data Engine (employee survey responses and patterns)
3. Organization context (strategy, industry, goals)

YOUR PRIMARY OBJECTIVE:
Provide MEANINGFUL, ACTIONABLE analysis that helps leaders understand their culture and what to do about it.

FOR INDIVIDUAL EMPLOYEE ANALYSIS (when targetType = 'individual'):
You must provide:
1. PERSONAL VALUES INTERPRETATION
   - What do their value selections reveal about who they are as a person?
   - If they selected ENABLING values: What are their STRENGTHS? How can they leverage these?
   - If they selected LIMITING values: What might be HOLDING THEM BACK? (This is critical - limiting values in personal values suggest self-awareness of struggles or current state)

2. ALIGNMENT ANALYSIS
   - Personal vs Current Experience gap: Are they aligned with current culture? What does misalignment mean for retention?
   - Personal vs Desired Future gap: What are they aspiring to grow toward?

3. ENGAGEMENT & RECOGNITION INTERPRETATION
   - What does their engagement score mean? (From Engagement Agent analysis)
   - What does their recognition score mean? (From Recognition Agent analysis)
   - How do these correlate with their value selections and gaps?

4. PERSONALIZED RECOMMENDATIONS
   - How can this specific employee use their strengths to promote healthy, high-productive culture?
   - What growth opportunities exist for them?
   - What support do they need from leadership?

FOR ORGANIZATIONAL ANALYSIS (when targetType = 'company' or 'department'):
You must answer these questions definitively:

1. DOES THIS ORGANIZATION HAVE A HEALTHY, HIGH-PRODUCTIVE CULTURE?
   - Overall verdict with clear reasoning
   - Cultural Entropy Score (0-100, where 100 = perfect health, 0 = complete dysfunction)
     Formula: 100 - (limiting_values_percentage)
   - Cylinder health breakdown

2. INTENDED CULTURE ANALYSIS
   - What do the company's stated values mean?
   - What culture is leadership trying to create?
   - Which cylinders are emphasized in stated values?

3. CURRENT REALITY
   - What are employees actually experiencing?
   - Which cylinders are healthy in practice? Which are unhealthy or missing?
   - What does this mean for daily work experience?

4. GAP ANALYSIS - THREE CRITICAL GAPS
   a) INTENDED vs CURRENT (Say-Do Gap)
      - Where does leadership's vision differ from reality?
      - Is there a trust issue? Execution issue?
      - Which cylinders show biggest gaps?

   b) INTENDED vs DESIRED (Vision Misalignment)
      - Do employees want something different than leadership envisions?
      - Are there fundamental disagreements about values?
      - What does this mean for buy-in and alignment?

   c) CURRENT vs DESIRED (Improvement Opportunity)
      - How far from ideal are we?
      - What changes would have biggest impact?
      - What's most urgent?

5. ENGAGEMENT & RECOGNITION ANALYSIS
   - What do aggregated scores reveal?
   - How do they vary by department, role, tenure?
   - What's the correlation with cultural health?
   - Insights from Engagement Agent and Recognition Agent

6. THREATS & RISKS
   - High cultural entropy (>40% limiting values)
   - Flight risk employees (low engagement + value misalignment)
   - Burnout indicators (imbalance, low wellbeing)
   - Missing or unhealthy cylinders
   - Material/Spiritual imbalance (1-3 vs 4-7)

7. STRATEGIC ALIGNMENT
   - Does current culture enable or hinder strategy execution?
   - Which strategic goals are at risk due to culture?
   - What cultural changes are needed to achieve strategy?

8. ACTIONABLE RECOMMENDATIONS
   Provide specific, prioritized recommendations:
   - CRITICAL (must do now): Address threats and major gaps
   - HIGH PRIORITY (next 90 days): Build missing cylinders, close gaps
   - MEDIUM PRIORITY (6 months): Strengthen healthy cylinders, sustain progress

   Each recommendation must include:
   - Specific action items
   - Expected impact (what will improve and by how much)
   - Timeframe
   - Owner/accountability
   - Success metrics

9. TRIGGERS FOR AUTOMATION
   Create specific triggers for:
   - LXP: Learning interventions for specific cylinder development
   - Alerts: When key metrics decline or risks emerge
   - Interventions: Manager coaching, recognition programs, policy changes

CRITICAL REQUIREMENTS:
- Every insight must have clear REASONING - explain WHY, not just WHAT
- Connect everything to organizational effectiveness and strategy execution
- Use Mizan framework as primary lens (not just generic OD advice)
- Be specific and actionable (not vague platitudes)
- Acknowledge nuance and complexity
- Balance realism with hope - identify problems but also paths forward
- Remember the philosophical foundation: human flourishing + organizational success

Your output should be structured JSON containing:
- overall_assessment: Does this organization have healthy, high-productive culture? Clear verdict with reasoning
- entropy_score: Cultural entropy score (0-100, formula: 100 - limiting_percentage)
- cylinder_health: Detailed health status for each cylinder with evidence and interpretation
- intended_culture: Analysis of company's stated values and what they mean
- current_reality: What employees actually experience and what it means
- desired_culture: What employees aspire to and what it means
- gap_analysis: All three gaps (intended-current, intended-desired, current-desired) with detailed interpretation
- engagement_analysis: Aggregated engagement insights from Engagement Agent
- recognition_analysis: Aggregated recognition insights from Recognition Agent
- threats_and_risks: Specific risks with severity assessment
- strategic_alignment: How culture enables or hinders strategy execution
- value_gaps: Specific value-level gaps with priority ranking
- recommendations: Prioritized, actionable recommendations with all required details
- triggers: Specific automated triggers for LXP, alerts, interventions
- philosophical_insights: Deeper meaning connecting to Mizan's ethical foundations

Remember: Your analysis will shape critical business decisions. Be thorough, insightful, and actionable. Leaders need to understand not just WHAT the culture is, but WHY it matters and WHAT TO DO about it.`;
  }

  protected buildKnowledgePrompt(inputData: CultureAnalysisInput, frameworks: any): string {
    return `Analyze the cultural context for this organization:

Target Analysis: ${inputData.targetType} level analysis
Tenant ID: ${inputData.tenantId}

Available Frameworks:
${JSON.stringify(frameworks, null, 2)}

Please identify which frameworks are most applicable and provide theoretical context for analyzing this organization's culture. Consider the 7-cylinder framework as the primary model, supplemented by other OD frameworks.

What theoretical insights should guide the analysis of this cultural data?`;
  }

  protected buildDataPrompt(processedData: any, knowledgeOutput: any): string {
    return `Analyze this cultural assessment data:

Processed Data:
${JSON.stringify(processedData, null, 2)}

Theoretical Context:
${JSON.stringify(knowledgeOutput, null, 2)}

Please analyze the data for patterns, gaps, and insights. Focus on:
1. Value distribution patterns across cylinders
2. Gaps between personal values and current experience
3. Gaps between current experience and desired future
4. Engagement and recognition patterns
5. Data quality and reliability

Provide quantitative insights where possible.`;
  }

  protected buildReasoningPrompt(inputData: CultureAnalysisInput, knowledgeOutput: any, dataOutput: any): string {
    return `Synthesize the theoretical knowledge and data insights to produce actionable cultural analysis:

Input Context:
${JSON.stringify(inputData, null, 2)}

Knowledge Insights:
${JSON.stringify(knowledgeOutput, null, 2)}

Data Analysis:
${JSON.stringify(dataOutput, null, 2)}

Please provide:
1. Cultural entropy score calculation
2. Health assessment for each cylinder
3. Specific value gaps with impact analysis
4. Prioritized recommendations with clear action items
5. Triggers for automated interventions

Ensure all recommendations are grounded in both theory and data.`;
  }

  protected parseKnowledgeOutput(response: string): any {
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse knowledge output:', error);
      return { error: 'Failed to parse knowledge output' };
    }
  }

  protected parseDataOutput(response: string): any {
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse data output:', error);
      return { error: 'Failed to parse data output' };
    }
  }

  protected parseReasoningOutput(response: string): any {
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse reasoning output:', error);
      return { error: 'Failed to parse reasoning output' };
    }
  }

  private aggregateValues(valueArrays: any[]): any {
    const aggregated: { [key: string]: number } = {};
    
    valueArrays.forEach(values => {
      if (values && typeof values === 'object') {
        Object.entries(values).forEach(([value, score]) => {
          aggregated[value] = (aggregated[value] || 0) + (score as number);
        });
      }
    });

    return aggregated;
  }

  private calculateDistribution(values: number[]): { [key: number]: number } {
    const distribution: { [key: number]: number } = {};
    values.forEach(value => {
      distribution[value] = (distribution[value] || 0) + 1;
    });
    return distribution;
  }

  /**
   * Map tenant/company values to Mizan's 7 Cylinders Framework
   * Uses AI to semantically match values to cylinders
   */
  async mapTenantValuesToCylinders(
    tenantId: string,
    tenantValues: string[]
  ): Promise<{
    mappings: Array<{
      tenantValue: string;
      cylinder: number;
      cylinderName: string;
      matchScore: number;
      reasoning: string;
      enablingValues: string[];
    }>;
    unmappedValues: string[];
    summary: string;
  }> {
    const frameworks = await this.loadFrameworks();
    const cylinders = frameworks.cylinders;

    // Build prompt for AI to analyze each tenant value
    const prompt = `You are analyzing a company's values to map them to the Mizan 7 Cylinders Framework.

Company Values: ${tenantValues.join(', ')}

Mizan 7 Cylinders Framework:
${Object.entries(cylinders).map(([num, cyl]: [string, any]) => `
${num}. ${cyl.name} (${cyl.ethicalPrinciple})
   Definition: ${cyl.definition}
   Enabling Values: ${cyl.enablingValues.join(', ')}
`).join('\n')}

For each company value, determine:
1. Which cylinder it best aligns with (1-7)
2. Match confidence score (0-100)
3. Brief reasoning for the match
4. Related enabling values from that cylinder

Return JSON:
{
  "mappings": [
    {
      "tenantValue": "Innovation",
      "cylinder": 3,
      "cylinderName": "Growth & Achievement",
      "matchScore": 85,
      "reasoning": "Innovation aligns with continuous learning and progress",
      "enablingValues": ["Learning", "Achievement"]
    }
  ],
  "unmappedValues": [], // values that don't clearly map (score < 50)
  "summary": "Brief summary of company's cultural orientation based on mappings"
}`;

    try {
      // Use Knowledge Engine for semantic analysis
      const response = await this.runKnowledgeEngine({ prompt });
      const result = typeof response === 'string' ? JSON.parse(response) : response;

      // Store mappings for future reference
      await db.insert(cultureReports).values({
        tenantId,
        reportType: 'values_mapping',
        reportData: {
          tenantValues,
          mappings: result.mappings,
          unmappedValues: result.unmappedValues,
          summary: result.summary,
          mappedAt: new Date()
        }
      });

      return result;
    } catch (error) {
      console.error('Error mapping tenant values:', error);

      // Fallback: simple keyword matching
      const fallbackMappings = tenantValues.map(value => {
        const valueLower = value.toLowerCase();
        let bestMatch = { cylinder: 1, score: 0, name: '' };

        Object.entries(cylinders).forEach(([num, cyl]: [string, any]) => {
          const enablingLower = cyl.enablingValues.map((v: string) => v.toLowerCase());
          const match = enablingLower.some((ev: string) =>
            valueLower.includes(ev) || ev.includes(valueLower)
          );

          if (match && parseInt(num) > bestMatch.score) {
            bestMatch = {
              cylinder: parseInt(num),
              score: 70,
              name: cyl.name
            };
          }
        });

        return {
          tenantValue: value,
          cylinder: bestMatch.cylinder,
          cylinderName: bestMatch.name || cylinders[bestMatch.cylinder].name,
          matchScore: bestMatch.score,
          reasoning: bestMatch.score > 0 ? 'Keyword match with enabling values' : 'No clear match found',
          enablingValues: cylinders[bestMatch.cylinder].enablingValues.slice(0, 2)
        };
      });

      return {
        mappings: fallbackMappings.filter(m => m.matchScore >= 50),
        unmappedValues: fallbackMappings.filter(m => m.matchScore < 50).map(m => m.tenantValue),
        summary: 'Mapping completed using keyword matching (AI analysis unavailable)'
      };
    }
  }

  private async storeAnalysis(input: CultureAnalysisInput, result: AnalysisResult): Promise<void> {
    await db.insert(cultureReports).values({
      tenantId: input.tenantId,
      reportType: input.targetType,
      reportData: {
        targetId: input.targetId || null,
        entropyScore: result.finalOutput.entropy_score?.toString(),
        cylinderHealth: result.finalOutput.cylinder_health,
        valueGaps: result.finalOutput.value_gaps,
        recommendations: result.finalOutput.recommendations,
        triggers: result.finalOutput.triggers,
        generatedBy: 'culture_agent'
      }
    });
  }
}

// Export convenience function for backward compatibility
export async function analyzeCulture(input: any): Promise<any> {
  const agent = new CultureAgent();
  return await agent.analyzeCompanyCulture(input);
}
