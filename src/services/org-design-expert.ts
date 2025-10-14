/**
 * Organizational Design Expert System
 *
 * Implements evidence-based organizational design frameworks:
 * 1. Galbraith Star Model (Strategy, Structure, Processes, Rewards, People)
 * 2. Mintzberg's Five Configurations
 * 3. Miles & Snow Strategic Typology
 * 4. Company Stage Theory (Greiner's Growth Model)
 * 5. Span of Control (Graicunas, Urwick)
 * 6. Industry-specific benchmarks
 */

interface Role {
  id: string;
  name: string;
  level: number;
  reports: string | null;
  children?: Role[];
}

interface StructureData {
  roles: Role[];
  hierarchy: Role;
  uploadedAt: string;
}

interface TenantStrategy {
  vision: string | null;
  mission: string | null;
  strategy: string | null;
  values: string[] | null;
}

// ============================================================================
// COMPANY STAGE DETECTION (Greiner's Growth Model)
// ============================================================================

type CompanyStage = 'startup' | 'scaleup' | 'growth' | 'maturity' | 'enterprise';

interface StageCharacteristics {
  stage: CompanyStage;
  sizeRange: string;
  description: string;
  optimalSpan: [number, number];
  optimalLayers: number;
  structureType: string;
  keyFocus: string;
}

const STAGE_BENCHMARKS: Record<CompanyStage, StageCharacteristics> = {
  startup: {
    stage: 'startup',
    sizeRange: '1-50',
    description: 'Early stage, founder-led',
    optimalSpan: [5, 12],
    optimalLayers: 2,
    structureType: 'Simple/Functional',
    keyFocus: 'Product-market fit, speed over structure'
  },
  scaleup: {
    stage: 'scaleup',
    sizeRange: '51-200',
    description: 'Rapid growth, professionalizing',
    optimalSpan: [5, 8],
    optimalLayers: 3,
    structureType: 'Functional with emerging specialization',
    keyFocus: 'Building systems, delegating, hiring leaders'
  },
  growth: {
    stage: 'growth',
    sizeRange: '201-500',
    description: 'Established, coordinating',
    optimalSpan: [4, 7],
    optimalLayers: 4,
    structureType: 'Hybrid Functional-Divisional',
    keyFocus: 'Coordination, collaboration, culture preservation'
  },
  maturity: {
    stage: 'maturity',
    sizeRange: '501-2000',
    description: 'Mature operations',
    optimalSpan: [4, 6],
    optimalLayers: 5,
    structureType: 'Divisional or Matrix',
    keyFocus: 'Efficiency, innovation, avoiding bureaucracy'
  },
  enterprise: {
    stage: 'enterprise',
    sizeRange: '2000+',
    description: 'Large, established enterprise',
    optimalSpan: [3, 6],
    optimalLayers: 6,
    structureType: 'Divisional, Matrix, or Hybrid',
    keyFocus: 'Agility, renewal, intrapreneurship'
  }
};

export function detectCompanyStage(employeeCount: number): StageCharacteristics {
  if (employeeCount <= 50) return STAGE_BENCHMARKS.startup;
  if (employeeCount <= 200) return STAGE_BENCHMARKS.scaleup;
  if (employeeCount <= 500) return STAGE_BENCHMARKS.growth;
  if (employeeCount <= 2000) return STAGE_BENCHMARKS.maturity;
  return STAGE_BENCHMARKS.enterprise;
}

// ============================================================================
// MINTZBERG'S FIVE CONFIGURATIONS
// ============================================================================

type MintzbergConfiguration =
  | 'simple'
  | 'machine-bureaucracy'
  | 'professional-bureaucracy'
  | 'divisional'
  | 'adhocracy';

interface MintzbergAnalysis {
  configuration: MintzbergConfiguration;
  confidence: number;
  characteristics: string[];
  recommendations: string[];
}

export function classifyMintzbergConfiguration(
  structureData: StructureData,
  stage: StageCharacteristics
): MintzbergAnalysis {
  const { roles } = structureData;
  const totalLayers = Math.max(...roles.map(r => r.level)) + 1;
  const employeeCount = roles.length;

  // Calculate management ratio
  const managersCount = new Set(roles.map(r => r.reports).filter(Boolean)).size;
  const managementRatio = managersCount / employeeCount;

  // Detect configuration
  if (employeeCount < 50 && totalLayers <= 3) {
    return {
      configuration: 'simple',
      confidence: 0.9,
      characteristics: [
        'Small size, flat structure',
        'Direct supervision by founder/CEO',
        'Flexible, informal coordination',
        'Centralized decision-making'
      ],
      recommendations: [
        'Appropriate for startup stage - maintain agility',
        'Begin formalizing key processes as you approach 30-40 employees',
        'Plan for first layer of middle management at 50+ employees'
      ]
    };
  }

  if (managementRatio > 0.15 && totalLayers >= 5) {
    return {
      configuration: 'machine-bureaucracy',
      confidence: 0.8,
      characteristics: [
        'Standardized processes and procedures',
        'High formalization',
        'Clear hierarchy with many management layers',
        'Centralized control'
      ],
      recommendations: [
        'Risk of over-bureaucratization - ensure structure serves strategy',
        'Consider delayering if response time is slow',
        'Maintain balance between control and agility',
        'Invest in process automation to reduce management overhead'
      ]
    };
  }

  // Default to functional
  return {
    configuration: 'professional-bureaucracy',
    confidence: 0.7,
    characteristics: [
      'Functional specialization',
      'Professional autonomy',
      'Standardized skills and knowledge'
    ],
    recommendations: [
      `Structure is appropriate for ${stage.stage} stage`,
      'Ensure clear accountability and decision rights',
      'Build cross-functional collaboration mechanisms'
    ]
  };
}

// ============================================================================
// MILES & SNOW STRATEGIC TYPOLOGY
// ============================================================================

type StrategicArchetype = 'prospector' | 'defender' | 'analyzer' | 'reactor';

interface StrategicArchetypeAnalysis {
  archetype: StrategicArchetype;
  confidence: number;
  description: string;
  structuralImplications: {
    engineeringRatio: [number, number];
    salesRatio: [number, number];
    opsRatio: [number, number];
    structureType: string;
    decisionMaking: string;
  };
}

export function detectStrategicArchetype(strategy: TenantStrategy): StrategicArchetypeAnalysis {
  const strategyText = `${strategy.vision || ''} ${strategy.mission || ''} ${strategy.strategy || ''}`.toLowerCase();

  const prospectorKeywords = ['innovation', 'disrupt', 'new market', 'first mover', 'pioneer', 'explore', 'experiment', 'cutting-edge', 'breakthrough'];
  const defenderKeywords = ['efficiency', 'cost', 'optimize', 'quality', 'reliable', 'proven', 'stable', 'protect', 'maintain'];
  const analyzerKeywords = ['balance', 'selective', 'measured', 'strategic', 'competitive advantage', 'differentiation'];

  let prospectorScore = 0;
  let defenderScore = 0;
  let analyzerScore = 0;

  prospectorKeywords.forEach(kw => { if (strategyText.includes(kw)) prospectorScore++; });
  defenderKeywords.forEach(kw => { if (strategyText.includes(kw)) defenderScore++; });
  analyzerKeywords.forEach(kw => { if (strategyText.includes(kw)) analyzerScore++; });

  // Prospector: Innovation-focused, exploring new markets
  if (prospectorScore >= defenderScore && prospectorScore >= analyzerScore) {
    return {
      archetype: 'prospector',
      confidence: Math.min(0.9, 0.5 + (prospectorScore * 0.1)),
      description: 'Innovation-driven organization exploring new opportunities and markets',
      structuralImplications: {
        engineeringRatio: [0.35, 0.45], // Higher technical capacity
        salesRatio: [0.15, 0.25],
        opsRatio: [0.10, 0.20],
        structureType: 'Organic, flexible, product-focused or adhocracy',
        decisionMaking: 'Decentralized, empowered teams'
      }
    };
  }

  // Defender: Efficiency-focused, protecting market position
  if (defenderScore > prospectorScore && defenderScore >= analyzerScore) {
    return {
      archetype: 'defender',
      confidence: Math.min(0.9, 0.5 + (defenderScore * 0.1)),
      description: 'Efficiency-focused organization defending established market position',
      structuralImplications: {
        engineeringRatio: [0.20, 0.30],
        salesRatio: [0.15, 0.20],
        opsRatio: [0.25, 0.35], // Higher ops for efficiency
        structureType: 'Functional, mechanistic, efficiency-oriented',
        decisionMaking: 'Centralized, process-driven'
      }
    };
  }

  // Analyzer: Balanced approach
  return {
    archetype: 'analyzer',
    confidence: Math.min(0.9, 0.5 + (analyzerScore * 0.1)),
    description: 'Balanced organization maintaining core while selectively innovating',
    structuralImplications: {
      engineeringRatio: [0.25, 0.35],
      salesRatio: [0.18, 0.25],
      opsRatio: [0.20, 0.28],
      structureType: 'Hybrid, with stable core and flexible periphery',
      decisionMaking: 'Mixed centralized-decentralized'
    }
  };
}

// ============================================================================
// INDUSTRY BENCHMARKS
// ============================================================================

interface IndustryBenchmark {
  industry: string;
  engineeringRatio: [number, number];
  salesRatio: [number, number];
  opsRatio: [number, number];
  supportRatio: [number, number];
  context: string;
}

const INDUSTRY_BENCHMARKS: Record<string, IndustryBenchmark> = {
  'saas-b2b': {
    industry: 'B2B SaaS',
    engineeringRatio: [0.30, 0.40],
    salesRatio: [0.20, 0.30],
    opsRatio: [0.10, 0.15],
    supportRatio: [0.15, 0.25],
    context: 'Typical for B2B SaaS with enterprise sales motion'
  },
  'saas-b2c': {
    industry: 'B2C SaaS/Consumer',
    engineeringRatio: [0.35, 0.50],
    salesRatio: [0.05, 0.15],
    opsRatio: [0.10, 0.15],
    supportRatio: [0.10, 0.20],
    context: 'Product-led growth, marketing-driven'
  },
  'marketplace': {
    industry: 'Marketplace',
    engineeringRatio: [0.25, 0.35],
    salesRatio: [0.15, 0.25],
    opsRatio: [0.25, 0.35], // High ops for supply/demand management
    supportRatio: [0.15, 0.20],
    context: 'Heavy operations for marketplace dynamics'
  },
  'fintech': {
    industry: 'FinTech',
    engineeringRatio: [0.35, 0.45],
    salesRatio: [0.15, 0.25],
    opsRatio: [0.15, 0.25], // Compliance, risk
    supportRatio: [0.10, 0.15],
    context: 'High engineering for security/compliance'
  },
  'ecommerce': {
    industry: 'E-commerce',
    engineeringRatio: [0.20, 0.30],
    salesRatio: [0.15, 0.25],
    opsRatio: [0.30, 0.40], // Logistics, fulfillment
    supportRatio: [0.15, 0.20],
    context: 'Operations-heavy for fulfillment'
  }
};

export function detectIndustry(strategy: TenantStrategy): IndustryBenchmark {
  const strategyText = `${strategy.vision || ''} ${strategy.mission || ''} ${strategy.strategy || ''}`.toLowerCase();

  if (strategyText.includes('saas') || strategyText.includes('software as a service')) {
    if (strategyText.includes('b2b') || strategyText.includes('enterprise')) {
      return INDUSTRY_BENCHMARKS['saas-b2b'];
    }
    return INDUSTRY_BENCHMARKS['saas-b2c'];
  }

  if (strategyText.includes('marketplace') || strategyText.includes('platform')) {
    return INDUSTRY_BENCHMARKS.marketplace;
  }

  if (strategyText.includes('fintech') || strategyText.includes('financial')) {
    return INDUSTRY_BENCHMARKS.fintech;
  }

  if (strategyText.includes('ecommerce') || strategyText.includes('retail')) {
    return INDUSTRY_BENCHMARKS.ecommerce;
  }

  // Default to B2B SaaS
  return INDUSTRY_BENCHMARKS['saas-b2b'];
}

// ============================================================================
// GALBRAITH STAR MODEL - STRUCTURE DIMENSION
// ============================================================================

interface GalbraithStructureAssessment {
  structureType: 'functional' | 'divisional' | 'matrix' | 'network' | 'hybrid' | 'unclear';
  confidence: number;
  appropriateness: 'appropriate' | 'needs-evolution' | 'misaligned';
  reasoning: string;
  recommendations: string[];
}

export function assessGalbraithStructure(
  structureData: StructureData,
  stage: StageCharacteristics,
  archetype: StrategicArchetypeAnalysis
): GalbraithStructureAssessment {
  const { roles } = structureData;

  // Extract department/function info
  const departments = new Map<string, number>();
  roles.forEach(role => {
    const dept = role.name.split(' - ')[1] || 'Unknown';
    departments.set(dept, (departments.get(dept) || 0) + 1);
  });

  const deptCount = departments.size;
  const totalLayers = Math.max(...roles.map(r => r.level)) + 1;

  // Detect structure type
  let structureType: GalbraithStructureAssessment['structureType'] = 'functional';
  let confidence = 0.7;

  if (deptCount <= 5 && totalLayers <= 3) {
    structureType = 'functional';
    confidence = 0.9;
  } else if (deptCount > 8) {
    structureType = 'hybrid';
    confidence = 0.6;
  }

  // Assess appropriateness based on stage and strategy
  let appropriateness: GalbraithStructureAssessment['appropriateness'] = 'appropriate';
  let reasoning = '';
  const recommendations: string[] = [];

  // Startup/Scaleup should be functional
  if ((stage.stage === 'startup' || stage.stage === 'scaleup') && structureType === 'functional') {
    appropriateness = 'appropriate';
    reasoning = `Functional structure is appropriate for ${stage.stage} stage (${roles.length} employees). Maintains clarity and enables rapid decision-making.`;
  }

  // Growth stage with Prospector strategy might need hybrid
  if (stage.stage === 'growth' && archetype.archetype === 'prospector' && structureType === 'functional') {
    appropriateness = 'needs-evolution';
    reasoning = `As a growth-stage Prospector (innovation-focused), consider evolving from pure functional to hybrid structure with product or customer-segment ownership. This enables faster innovation cycles and clearer accountability.`;
    recommendations.push(
      'Introduce product manager roles with cross-functional authority',
      'Create product pods or squads with dedicated engineering, design, PM',
      'Maintain functional excellence while building product accountability'
    );
  }

  // Analyzer strategy with mature stage
  if (stage.stage === 'maturity' && archetype.archetype === 'analyzer') {
    appropriateness = 'appropriate';
    reasoning = `Hybrid or divisional structure supports Analyzer strategy at ${stage.stage} stage, balancing efficiency (functional core) with flexibility (divisional products/segments).`;
  }

  return {
    structureType,
    confidence,
    appropriateness,
    reasoning,
    recommendations
  };
}

// ============================================================================
// COMPREHENSIVE EXPERT ANALYSIS
// ============================================================================

export interface ExpertOrgDesignAnalysis {
  companyStage: StageCharacteristics;
  strategicArchetype: StrategicArchetypeAnalysis;
  mintzbergConfig: MintzbergAnalysis;
  industryBenchmark: IndustryBenchmark;
  galbraithStructure: GalbraithStructureAssessment;
  expertRecommendations: {
    priority: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    title: string;
    rationale: string;
    actionItems: string[];
    expectedImpact: string;
    timeframe: string;
  }[];
}

export function performExpertAnalysis(
  structureData: StructureData,
  strategy: TenantStrategy,
  tenantName?: string,
  tenantIndustry?: string | null
): ExpertOrgDesignAnalysis {
  const employeeCount = structureData.roles.length;

  // Run all framework analyses
  const companyStage = detectCompanyStage(employeeCount);
  const strategicArchetype = detectStrategicArchetype(strategy);
  const mintzbergConfig = classifyMintzbergConfiguration(structureData, companyStage);
  const industryBenchmark = detectIndustry(strategy);
  const galbraithStructure = assessGalbraithStructure(structureData, companyStage, strategicArchetype);

  // Generate expert recommendations with client-specific context
  const expertRecommendations = generateExpertRecommendations(
    structureData,
    companyStage,
    strategicArchetype,
    mintzbergConfig,
    industryBenchmark,
    galbraithStructure,
    tenantName || 'Your organization',
    tenantIndustry
  );

  return {
    companyStage,
    strategicArchetype,
    mintzbergConfig,
    industryBenchmark,
    galbraithStructure,
    expertRecommendations
  };
}

function generateExpertRecommendations(
  structureData: StructureData,
  stage: StageCharacteristics,
  archetype: StrategicArchetypeAnalysis,
  mintzberg: MintzbergAnalysis,
  industry: IndustryBenchmark,
  galbraith: GalbraithStructureAssessment,
  clientName: string,
  clientIndustry?: string | null
) {
  const recommendations: ExpertOrgDesignAnalysis['expertRecommendations'] = [];
  const { roles } = structureData;
  const totalEmployees = roles.length;

  // Calculate current ratios
  const departments = new Map<string, number>();
  roles.forEach(role => {
    const dept = role.name.split(' - ')[1] || 'Unknown';
    departments.set(dept, (departments.get(dept) || 0) + 1);
  });

  const engineeringCount = departments.get('Engineering') || 0;
  const salesCount = departments.get('Sales') || 0;
  const opsCount = departments.get('Operations') || 0;

  const engineeringRatio = engineeringCount / totalEmployees;
  const salesRatio = salesCount / totalEmployees;
  const opsRatio = opsCount / totalEmployees;

  // Check engineering capacity against strategy + industry + archetype
  const [targetEngMin, targetEngMax] = archetype.structuralImplications.engineeringRatio;
  const [industryEngMin, industryEngMax] = industry.engineeringRatio;

  // Use more restrictive bounds (intersection of strategy and industry)
  const recommendedEngMin = Math.max(targetEngMin, industryEngMin);
  const recommendedEngMax = Math.min(targetEngMax, industryEngMax);

  if (engineeringRatio < recommendedEngMin) {
    const targetRatio = (recommendedEngMin + recommendedEngMax) / 2;
    const neededHires = Math.ceil((totalEmployees * targetRatio) - engineeringCount);

    // Build client-specific context with executive-friendly language
    const industryContext = clientIndustry
      ? `${clientName} is a ${clientIndustry} company`
      : `${clientName} operates in ${industry.industry}`;

    const strategyStyle = archetype.archetype === 'prospector'
      ? 'innovation-focused strategy'
      : archetype.archetype === 'defender'
      ? 'efficiency-focused strategy'
      : 'balanced growth strategy';

    const positioning = archetype.archetype === 'prospector'
      ? 'competitive in innovation'
      : archetype.archetype === 'defender'
      ? 'efficient and stable'
      : 'strategically balanced';

    recommendations.push({
      priority: 'critical',
      category: 'Strategic Capability Gap',
      title: `${clientName} Needs Stronger Engineering Team`,
      rationale: `${industryContext} pursuing a ${strategyStyle}. To stay ${positioning}, ${clientName} needs more technical talent. With ${totalEmployees} total employees and only ${engineeringCount} engineers (${(engineeringRatio * 100).toFixed(0)}%), your engineering team is smaller than what's typical for companies with similar strategies. Most successful ${archetype.archetype === 'prospector' ? 'innovation-focused' : archetype.archetype === 'defender' ? 'efficiency-focused' : 'balanced'} companies in ${industry.industry} maintain ${(industryEngMin * 100).toFixed(0)}-${(industryEngMax * 100).toFixed(0)}% engineering capacity.`,
      actionItems: [
        `Grow your engineering team to ${engineeringCount + neededHires} people (adding ${neededHires} ${neededHires === 1 ? 'engineer' : 'engineers'}) to reach ${(targetRatio * 100).toFixed(0)}% technical capacity`,
        `Start with experienced talent: Hire ${Math.ceil(neededHires * 0.4)} senior engineers in the first quarter to set technical direction`,
        `Build the core team: Add ${Math.ceil(neededHires * 0.3)} mid-level engineers in quarters 2-3 to execute on roadmap`,
        `Scale sustainably: Bring in ${Math.floor(neededHires * 0.3)} junior engineers in quarter 4, mentored by your senior hires`,
        `Key roles to prioritize: ${neededHires >= 5 ? '1 Engineering Manager to lead the team, 1 Principal Engineer for technical strategy, and ' : '1 Senior Technical Lead, plus '}${Math.max(1, neededHires - 2)} Senior Engineers`,
        `Budget for ${clientName}: Approximately $${(neededHires * 145000).toLocaleString()} per year in total compensation (competitive ${industry.industry} rates)`,
        `Alternative approach: Partner with ${Math.ceil(neededHires * 0.6)} contractors or a development agency for 6-9 months while you build your permanent team`
      ],
      expectedImpact: `${clientName} will ship features 30-40% faster, reduce time spent fixing issues by half, and match the technical capacity of similar ${archetype.archetype === 'prospector' ? 'innovation-focused' : archetype.archetype === 'defender' ? 'efficiency-driven' : 'balanced'} companies in your industry.`,
      timeframe: '9-12 months to reach full strength, with noticeable improvements starting in quarter 2'
    });
  }

  // Check if structure type needs evolution
  if (galbraith.appropriateness === 'needs-evolution') {
    recommendations.push({
      priority: 'high',
      category: 'Organizational Structure Evolution',
      title: 'Structure Type Misaligned with Strategy & Stage',
      rationale: galbraith.reasoning,
      actionItems: galbraith.recommendations,
      expectedImpact: 'Faster innovation cycles, clearer accountability, reduced cross-functional friction',
      timeframe: '6-12 months'
    });
  }

  // Mintzberg configuration recommendations
  if (mintzberg.configuration === 'machine-bureaucracy') {
    recommendations.push({
      priority: 'medium',
      category: 'Organizational Agility',
      title: 'Risk of Over-Bureaucratization',
      rationale: `Mintzberg analysis indicates Machine Bureaucracy configuration. For a ${archetype.archetype} strategy requiring ${archetype.structuralImplications.decisionMaking}, this creates friction.`,
      actionItems: [
        'Conduct delayering analysis: identify layers that can be removed without losing control',
        'Push decision-making authority down 1-2 levels',
        'Implement OKRs or similar framework for autonomous team alignment',
        'Reduce approval chains for decisions under $X threshold'
      ],
      expectedImpact: 'Increase decision velocity by 25-35%, improve employee engagement',
      timeframe: '3-6 months'
    });
  }

  // Stage-specific recommendations
  if (stage.stage === 'scaleup' && (mintzberg.configuration === 'simple' || mintzberg.configuration === 'professional-bureaucracy')) {
    recommendations.push({
      priority: 'high',
      category: 'Leadership Layer',
      title: 'Add First Layer of Middle Management',
      rationale: `At ${totalEmployees} employees in ${stage.stage} stage, you're beyond the span of control for founder-led management. Greiner's Growth Model indicates need for delegation and professionalization.`,
      actionItems: [
        'Hire 2-3 functional leaders: VP Engineering, VP Sales, VP Operations (depending on gaps)',
        'Establish clear decision rights and accountability frameworks (RACI)',
        'Create functional strategic plans owned by each VP',
        'Implement monthly business reviews for functional performance',
        'Budget: $450K-550K/year for 3 VP-level hires in your market'
      ],
      expectedImpact: 'Enables founder to focus on strategy, unlocks next growth stage, improves execution quality',
      timeframe: '4-6 months to hire and onboard'
    });
  }

  return recommendations;
}
