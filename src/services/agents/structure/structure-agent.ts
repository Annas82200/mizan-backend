// server/services/agents/structure/structure-agent-v2.ts

import { ThreeEngineAgent, ThreeEngineConfig } from '../base/three-engine-agent';
import { db } from '../../../db/index';
import { tenants, departments, users } from '../../../db/schema';
import { eq } from 'drizzle-orm';

// ============================================================================
// INTERFACES - THREE-ENGINE ARCHITECTURE
// ============================================================================

interface StructureAnalysisInput extends Record<string, unknown> {
  companyId: string;
  tenantId: string;
  orgChart: {
    departments: Array<{
      id: string;
      name: string;
      parentId?: string;
      headCount: number;
      manager?: string;
    }>;
    reportingLines: Array<{
      from: string;
      to: string;
      type: 'direct' | 'dotted' | 'functional';
    }>;
    roles: Array<{
      id: string;
      title: string;
      department: string;
      level: number;
      responsibilities?: string[];
    }>;
  };
  strategy?: string;
}

interface StructureAnalysisResult {
  isOptimalForStrategy: boolean;
  structureType: string;
  healthScore: number;
  strengths: string[];
  weaknesses: string[];
  gaps: Array<{
    type: 'role' | 'department' | 'reporting' | 'span';
    description: string;
    impact: 'high' | 'medium' | 'low';
    recommendation: string;
  }>;
  recommendations: string[];
  hiringNeeds: Array<{
    role: string;
    department: string;
    urgency: 'critical' | 'high' | 'medium';
    reason: string;
  }>;
}

interface HiringNeed {
  role: string;
  department: string;
  urgency: 'critical' | 'high' | 'medium';
  reason: string;
}

interface DepartmentData {
  id: string;
  name: string;
  level?: number;
  users?: Array<{ id: string; name?: string }>;
  parentId?: string;
}

interface OrganizationalStructure {
  type: string;
  departments: Array<{
    id: string;
    name: string;
    size: number;
    level: number;
  }>;
  levels: number;
  totalEmployees: number;
}

interface StructureType {
  functional: {
    characteristics: string[];
    bestFor: string[];
    limitations: string[];
  };
  divisional: {
    characteristics: string[];
    bestFor: string[];
    limitations: string[];
  };
  matrix: {
    characteristics: string[];
    bestFor: string[];
    limitations: string[];
  };
  network: {
    characteristics: string[];
    bestFor: string[];
    limitations: string[];
  };
  holacracy: {
    characteristics: string[];
    bestFor: string[];
    limitations: string[];
  };
}

interface DesignPrinciples {
  spanOfControl: {
    optimal: string;
    factors: string[];
    tooWide: string;
    tooNarrow: string;
  };
  chainOfCommand: {
    principles: string[];
    violations: string[];
  };
  centralization: {
    centralized: string[];
    decentralized: string[];
    factors: string[];
  };
  formalization: {
    high: string[];
    low: string[];
    balance: string;
  };
}

interface AnalysisFrameworks {
  galbraithStar: {
    elements: string[];
    alignment: string;
  };
  mintzbergParts: {
    parts: string[];
    configurations: string[];
  };
  nadlerTushman: {
    components: string[];
    fit: string;
  };
}

interface StrategyStructureAlignment {
  costLeadership: string[];
  differentiation: string[];
  focusStrategy: string[];
  digitalTransformation: string[];
}

interface KnowledgeBase extends Record<string, unknown> {
  structureTypes: StructureType;
  designPrinciples: DesignPrinciples;
  analysisFrameworks: AnalysisFrameworks;
  strategyStructureAlignment: StrategyStructureAlignment;
}

interface KnowledgeEngineOutput extends Record<string, unknown> {
  context?: string;
  frameworks?: string;
  source?: string;
  structureType?: string;
  designPrinciples?: string[];
  strategyAlignment?: string;
}

interface DataEngineOutput extends Record<string, unknown> {
  spanOfControl?: Record<string, number>;
  structureType?: string;
  organizationalLevels?: number;
  reportingAnomalies?: string[];
  departmentRelationships?: string[];
  missingRoles?: string[];
  roleClarity?: string;
}

interface ReasoningEngineOutput extends Record<string, unknown> {
  isOptimalForStrategy?: boolean;
  structureType?: string;
  healthScore?: number;
  strengths?: string[];
  weaknesses?: string[];
  gaps?: Array<{
    type: 'role' | 'department' | 'reporting' | 'span';
    description: string;
    impact: 'high' | 'medium' | 'low';
    recommendation: string;
  }>;
  recommendations?: string[];
  hiringNeeds?: HiringNeed[];
}

/**
 * Structure Agent using Three-Engine Architecture
 * Trained on organizational design theories and best practices
 */
export class StructureAgentV2 extends ThreeEngineAgent {
  
  protected getAgentDomain(): string {
    return 'Organizational Structure, Design Theory, and Organizational Architecture';
  }

  // Required abstract method implementations
  protected async loadFrameworks(): Promise<Record<string, unknown>> {
    // Frameworks are loaded in getKnowledgeBase() method
    // No additional async loading required for static organizational design frameworks
    return this.getKnowledgeBase();
  }

  protected async processData(inputData: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Data processing is handled by the three-engine pipeline
    // Input validation and transformation occurs in the Data Engine
    return inputData;
  }

  protected getKnowledgeSystemPrompt(): string {
    return 'Knowledge system prompt for structure analysis';
  }

  protected getDataSystemPrompt(): string {
    return 'Data system prompt for structure analysis';
  }

  protected getReasoningSystemPrompt(): string {
    return 'Reasoning system prompt for structure analysis';
  }

  protected parseKnowledgeOutput(output: string): KnowledgeEngineOutput {
    try {
      return JSON.parse(output) as KnowledgeEngineOutput;
    } catch {
      return {
        context: output,
        frameworks: 'Organizational design theory applied',
        source: 'knowledge_engine'
      };
    }
  }

  protected parseDataOutput(output: string): DataEngineOutput {
    try {
      return JSON.parse(output) as DataEngineOutput;
    } catch (error) {
      console.error('Failed to parse Data Engine output:', error);
      return {
        spanOfControl: {},
        structureType: 'unknown',
        organizationalLevels: 0,
        reportingAnomalies: [],
        departmentRelationships: [],
        missingRoles: [],
        roleClarity: 'Unable to determine',
        error: 'Failed to parse data output'
      };
    }
  }

  protected parseReasoningOutput(output: string): ReasoningEngineOutput {
    try {
      return JSON.parse(output) as ReasoningEngineOutput;
    } catch (error) {
      console.error('Failed to parse Reasoning Engine output:', error);
      return {
        isOptimalForStrategy: false,
        structureType: 'unknown',
        healthScore: 0,
        strengths: [],
        weaknesses: [],
        gaps: [],
        recommendations: [],
        hiringNeeds: [],
        error: 'Failed to parse reasoning output'
      };
    }
  }

  protected buildKnowledgePrompt(inputData: Record<string, unknown>, frameworks: Record<string, unknown>): string {
    const input = inputData as StructureAnalysisInput;
    return `Using organizational design theory:
1. What structure type best fits this organization based on the org chart?
2. What are the design principles being followed or violated?
3. How should structure align with strategy: "${input.strategy || 'Not provided'}"?
4. What are best practices for span of control and reporting relationships?
5. What organizational capabilities does this structure enable or constrain?

Frameworks available: ${JSON.stringify(frameworks)}`;
  }

  protected buildDataPrompt(processedData: Record<string, unknown>, knowledgeOutput: Record<string, unknown>): string {
    return `Extract and analyze from the organizational data:
1. Count reporting relationships and calculate span of control for each manager
2. Identify the structure type (functional, divisional, matrix, etc.)
3. Map department relationships and interdependencies
4. Calculate organizational levels and hierarchical depth
5. Identify missing roles or departments based on size and industry
6. Find reporting anomalies (orphaned roles, circular reporting, etc.)
7. Assess role clarity and potential overlaps

Context from Knowledge Engine: ${JSON.stringify(knowledgeOutput)}`;
  }

  protected buildReasoningPrompt(inputData: Record<string, unknown>, knowledgeOutput: Record<string, unknown>, dataOutput: Record<string, unknown>): string {
    const input = inputData as StructureAnalysisInput;
    return `Determine if the organizational structure is optimal for achieving the strategy.
Analyze: structure-strategy fit, design principle adherence, organizational health, capability gaps.
Identify specific hiring needs and structural improvements required.
Base ALL conclusions on the actual org chart data and established organizational design principles.

Data Analysis: ${JSON.stringify(dataOutput)}
Theoretical Context: ${JSON.stringify(knowledgeOutput)}
Strategy: ${input.strategy || 'Not provided'}

Return structured JSON with: isOptimalForStrategy, structureType, healthScore, strengths, weaknesses, gaps, recommendations, hiringNeeds`;
  }

  protected getKnowledgeBase(): KnowledgeBase {
    return {
      // Organizational structure types
      structureTypes: {
        functional: {
          characteristics: ['Grouped by function', 'Clear hierarchy', 'Specialized departments'],
          bestFor: ['Small-medium tenants', 'Stable environments', 'Efficiency focus'],
          limitations: ['Silos', 'Slow decision-making', 'Limited flexibility']
        },
        divisional: {
          characteristics: ['Product/market divisions', 'Semi-autonomous units', 'Duplication of functions'],
          bestFor: ['Large tenants', 'Diverse products/markets', 'Growth strategy'],
          limitations: ['Resource duplication', 'Competition between divisions']
        },
        matrix: {
          characteristics: ['Dual reporting', 'Cross-functional teams', 'Resource sharing'],
          bestFor: ['Complex projects', 'Innovation focus', 'Resource optimization'],
          limitations: ['Role ambiguity', 'Power struggles', 'High coordination cost']
        },
        network: {
          characteristics: ['Flexible boundaries', 'Strategic alliances', 'Core + partners'],
          bestFor: ['Dynamic industries', 'Innovation ecosystems', 'Global reach'],
          limitations: ['Control challenges', 'Quality consistency', 'IP protection']
        },
        holacracy: {
          characteristics: ['Self-organizing teams', 'Distributed authority', 'Role-based'],
          bestFor: ['Agile environments', 'Creative industries', 'Rapid adaptation'],
          limitations: ['Steep learning curve', 'Accountability gaps', 'Scale challenges']
        }
      },
      
      // Design principles from organizational theory
      designPrinciples: {
        spanOfControl: {
          optimal: '5-9 direct reports',
          factors: ['Task complexity', 'Employee experience', 'Geographic dispersion'],
          tooWide: 'Insufficient supervision, overwhelmed managers',
          tooNarrow: 'Micromanagement, underutilized managers'
        },
        chainOfCommand: {
          principles: ['Unity of command', 'Scalar principle', 'Clear escalation paths'],
          violations: ['Multiple bosses', 'Skipped levels', 'Unclear authority']
        },
        centralization: {
          centralized: ['Consistent decisions', 'Strong control', 'Clear direction'],
          decentralized: ['Fast responses', 'Local adaptation', 'Employee empowerment'],
          factors: ['Company size', 'Industry dynamics', 'Strategy requirements']
        },
        formalization: {
          high: ['Clear procedures', 'Predictability', 'Quality control'],
          low: ['Flexibility', 'Innovation', 'Quick adaptation'],
          balance: 'Match to strategy and environment'
        }
      },
      
      // Frameworks for analysis
      analysisFrameworks: {
        galbraithStar: {
          elements: ['Strategy', 'Structure', 'Processes', 'Rewards', 'People'],
          alignment: 'All elements must support strategy execution'
        },
        mintzbergParts: {
          parts: ['Strategic apex', 'Middle line', 'Operating core', 'Technostructure', 'Support staff'],
          configurations: ['Simple', 'Machine bureaucracy', 'Professional', 'Divisional', 'Adhocracy']
        },
        nadlerTushman: {
          components: ['Task', 'Individual', 'Formal organization', 'Informal organization'],
          fit: 'Congruence between components drives performance'
        }
      },
      
      // Strategy-structure alignment
      strategyStructureAlignment: {
        costLeadership: ['Functional structure', 'High formalization', 'Centralized decisions'],
        differentiation: ['Divisional/Matrix', 'Low formalization', 'Decentralized innovation'],
        focusStrategy: ['Simple structure', 'Direct supervision', 'Flexible adaptation'],
        digitalTransformation: ['Network/Agile', 'Cross-functional teams', 'Platform thinking']
      }
    };
  }

  /**
   * Main analysis method
   */
  async analyzeStructure(input: StructureAnalysisInput): Promise<StructureAnalysisResult> {
    // Get strategy if not provided
    if (!input.strategy) {
      const strategy = await this.getCompanyStrategy(input.companyId);
      input.strategy = strategy;
    }

    // Execute three-engine analysis
    const result = await this.analyze(input);

    // Structure the result - safely parse the finalOutput
    const finalOutput = result.finalOutput as ReasoningEngineOutput;
    const analysis: StructureAnalysisResult = {
      isOptimalForStrategy: finalOutput.isOptimalForStrategy || false,
      structureType: finalOutput.structureType || 'unknown',
      healthScore: finalOutput.healthScore || 0,
      strengths: finalOutput.strengths || [],
      weaknesses: finalOutput.weaknesses || [],
      gaps: finalOutput.gaps || [],
      recommendations: finalOutput.recommendations || [],
      hiringNeeds: finalOutput.hiringNeeds || []
    };

    // Trigger hiring module if critical needs identified
    if (analysis.hiringNeeds.some(need => need.urgency === 'critical')) {
      await this.triggerHiringModule(analysis.hiringNeeds, input.companyId);
    }

    // Save analysis results
    await this.saveStructureAnalysis(analysis, input);

    return analysis;
  }
  
  /**
   * Get organizational structure for other agents
   */
  async getOrganizationalStructure(companyId: string, tenantId: string): Promise<OrganizationalStructure> {
    // Fetch from database
    const departmentsData = await db.query.departments.findMany({
      where: eq(departments.tenantId, tenantId),
      with: {
        users: true
      }
    });

    // Calculate hierarchy levels for each department
    const calculateLevel = (deptId: string, deptMap: Map<string, typeof departmentsData[0]>, visited = new Set<string>()): number => {
      const dept = deptMap.get(deptId);
      if (!dept || !dept.parentDepartmentId || visited.has(deptId)) {
        return 1; // Root level or circular reference protection
      }
      visited.add(deptId);
      return 1 + calculateLevel(dept.parentDepartmentId, deptMap, visited);
    };

    const deptMap = new Map(departmentsData.map(d => [d.id, d]));

    // Type the departments data properly with calculated hierarchy levels
    const typedDepartments: DepartmentData[] = departmentsData.map((d) => ({
      id: d.id,
      name: d.name,
      level: calculateLevel(d.id, deptMap),
      users: (d.users || []).map(u => ({ id: u.id, name: u.name || '' })),
      parentId: d.parentDepartmentId || undefined
    }));

    const structure: OrganizationalStructure = {
      type: await this.identifyStructureType(typedDepartments),
      departments: typedDepartments.map((d) => ({
        id: d.id,
        name: d.name,
        size: d.users?.length || 0,
        level: d.level || 1
      })),
      levels: this.calculateOrganizationalLevels(typedDepartments),
      totalEmployees: typedDepartments.reduce((sum: number, d) => sum + (d.users?.length || 0), 0)
    };

    return structure;
  }

  private async identifyStructureType(departments: DepartmentData[]): Promise<string> {
    // Simple logic - in reality would use the three-engine analysis
    const hasFunctionalDepts = departments.some(d =>
      ['HR', 'Finance', 'IT', 'Marketing'].includes(d.name)
    );
    const hasProductDivisions = departments.some(d =>
      d.name.includes('Division') || d.name.includes('Product')
    );

    if (hasProductDivisions) return 'divisional';
    if (hasFunctionalDepts) return 'functional';
    return 'hybrid';
  }

  private calculateOrganizationalLevels(departments: DepartmentData[]): number {
    return Math.max(...departments.map((d) => d.level || 1));
  }
  
  private async getCompanyStrategy(companyId: string): Promise<string> {
    // Fetch strategy from tenants table
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, companyId)
    });

    return tenant?.strategy || '';
  }
  
  private async triggerHiringModule(hiringNeeds: HiringNeed[], tenantId: string): Promise<void> {
    const { triggers } = await import('../../../../db/schema.js');

    // Create trigger for each critical/high priority hiring need
    const urgentNeeds = hiringNeeds.filter(n =>
      n.urgency === 'critical' || n.urgency === 'high'
    );

    console.log(`Creating ${urgentNeeds.length} hiring triggers for ${hiringNeeds.length} total positions`);

    for (const need of urgentNeeds) {
      await db.insert(triggers).values({
        tenantId: tenantId,
        name: `Urgent Hiring: ${need.role} in ${need.department}`,
        description: `Hiring need identified by structure analysis: ${need.reason}`,
        type: 'event_based',
        sourceModule: 'structure_analysis',
        eventType: 'hiring_needs_urgent',
        conditions: {
          urgency: need.urgency,
          analysisResult: 'structure_gap'
        },
        targetModule: 'hiring',
        action: 'create_requisition',
        actionConfig: {
          role: need.role,
          department: need.department,
          urgency: need.urgency,
          reason: need.reason,
          hiringNeed: need
        },
        isActive: true
      });
    }

    console.log(`Created ${urgentNeeds.length} hiring triggers`);
  }
  
  private async saveStructureAnalysis(analysis: StructureAnalysisResult, input: StructureAnalysisInput): Promise<void> {
    // Save to database
    console.log('Saving structure analysis results');
    // Implementation would save to appropriate tables
  }
}

// Example usage
async function demonstrateStructureAnalysis() {
  const agentConfig: ThreeEngineConfig = {
    knowledge: {
      providers: ['anthropic' as const],
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.1,
      maxTokens: 4000
    },
    data: {
      providers: ['openai' as const],
      model: 'gpt-4',
      temperature: 0.1,
      maxTokens: 4000
    },
    reasoning: {
      providers: ['anthropic' as const],
      model: 'claude-3',
      temperature: 0.5,
      maxTokens: 4000
    },
    consensusThreshold: 0.7
  };
  const structureAgent = new StructureAgentV2('structure', agentConfig);
  
  const analysis = await structureAgent.analyzeStructure({
    companyId: 'company-456',
    tenantId: 'tenant-123',
    orgChart: {
      departments: [
        { id: 'd1', name: 'Engineering', headCount: 50, manager: 'emp-101' },
        { id: 'd2', name: 'Sales', headCount: 30, manager: 'emp-102' },
        { id: 'd3', name: 'Marketing', headCount: 20, manager: 'emp-103' },
        { id: 'd4', name: 'HR', headCount: 10, manager: 'emp-104' }
      ],
      reportingLines: [
        { from: 'emp-101', to: 'ceo', type: 'direct' },
        { from: 'emp-102', to: 'ceo', type: 'direct' },
        { from: 'emp-103', to: 'ceo', type: 'direct' },
        { from: 'emp-104', to: 'ceo', type: 'direct' }
      ],
      roles: [
        { id: 'r1', title: 'CEO', department: 'Executive', level: 1 },
        { id: 'r2', title: 'VP Engineering', department: 'd1', level: 2 },
        { id: 'r3', title: 'VP Sales', department: 'd2', level: 2 }
      ]
    },
    strategy: 'Achieve market leadership through product innovation and customer experience'
  });
  
  console.log('Structure Analysis Results:');
  console.log('- Optimal for strategy?', analysis.isOptimalForStrategy);
  console.log('- Structure type:', analysis.structureType);
  console.log('- Health score:', analysis.healthScore);
  console.log('- Critical gaps:', analysis.gaps.filter(g => g.impact === 'high'));
  console.log('- Hiring needs:', analysis.hiringNeeds);
}
