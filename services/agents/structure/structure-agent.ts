// server/services/agents/structure/structure-agent-v2.ts

import { ThreeEngineAgent } from '../base/three-engine-agent.js';
import { db } from '../../../db/index.js';
import { companies, departments, users } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

interface StructureAnalysisInput {
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

/**
 * Structure Agent using Three-Engine Architecture
 * Trained on organizational design theories and best practices
 */
export class StructureAgentV2 extends ThreeEngineAgent {
  
  protected getAgentDomain(): string {
    return 'Organizational Structure, Design Theory, and Organizational Architecture';
  }
  
  protected getKnowledgeBase(): any {
    return {
      // Organizational structure types
      structureTypes: {
        functional: {
          characteristics: ['Grouped by function', 'Clear hierarchy', 'Specialized departments'],
          bestFor: ['Small-medium companies', 'Stable environments', 'Efficiency focus'],
          limitations: ['Silos', 'Slow decision-making', 'Limited flexibility']
        },
        divisional: {
          characteristics: ['Product/market divisions', 'Semi-autonomous units', 'Duplication of functions'],
          bestFor: ['Large companies', 'Diverse products/markets', 'Growth strategy'],
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
  
  protected generateKnowledgeQuery(input: StructureAnalysisInput): string {
    return `Using organizational design theory:
1. What structure type best fits this organization based on the org chart?
2. What are the design principles being followed or violated?
3. How should structure align with strategy: "${input.strategy || 'Not provided'}"?
4. What are best practices for span of control and reporting relationships?
5. What organizational capabilities does this structure enable or constrain?`;
  }
  
  protected generateDataTask(input: StructureAnalysisInput): string {
    return `Extract and analyze from the organizational data:
1. Count reporting relationships and calculate span of control for each manager
2. Identify the structure type (functional, divisional, matrix, etc.)
3. Map department relationships and interdependencies  
4. Calculate organizational levels and hierarchical depth
5. Identify missing roles or departments based on size and industry
6. Find reporting anomalies (orphaned roles, circular reporting, etc.)
7. Assess role clarity and potential overlaps`;
  }
  
  protected generateAnalysisGoal(input: StructureAnalysisInput): string {
    return `Determine if the organizational structure is optimal for achieving the strategy.
Analyze: structure-strategy fit, design principle adherence, organizational health, capability gaps.
Identify specific hiring needs and structural improvements required.
Base ALL conclusions on the actual org chart data and established organizational design principles.`;
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
    const result = await this.executeThreeEngineAnalysis(
      input,
      'Organizational Structure Analysis'
    );
    
    // Structure the result
    const analysis: StructureAnalysisResult = result.analysis;
    
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
  async getOrganizationalStructure(companyId: string, tenantId: string): Promise<any> {
    // Fetch from database
    const departments = await db.query.departments.findMany({
      where: eq(departments.companyId, companyId),
      with: {
        employees: true
      }
    });
    
    const structure = {
      type: await this.identifyStructureType(departments),
      departments: departments.map(d => ({
        id: d.id,
        name: d.name,
        size: d.employees.length,
        level: d.level
      })),
      levels: this.calculateOrganizationalLevels(departments),
      totalEmployees: departments.reduce((sum, d) => sum + d.employees.length, 0)
    };
    
    return structure;
  }
  
  private async identifyStructureType(departments: any[]): Promise<string> {
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
  
  private calculateOrganizationalLevels(departments: any[]): number {
    return Math.max(...departments.map(d => d.level || 1));
  }
  
  private async getCompanyStrategy(companyId: string): Promise<string> {
    const strategy = await db.query.organizationStrategies.findFirst({
      where: eq(organizationStrategies.companyId, companyId),
      orderBy: (strategies, { desc }) => [desc(strategies.createdAt)]
    });
    
    return strategy?.strategy || '';
  }
  
  private async triggerHiringModule(hiringNeeds: any[], companyId: string): Promise<void> {
    // Trigger hiring workflow
    console.log(`Triggering hiring module for ${hiringNeeds.length} critical positions`);
    // Implementation would actually call the hiring module
  }
  
  private async saveStructureAnalysis(analysis: StructureAnalysisResult, input: StructureAnalysisInput): Promise<void> {
    // Save to database
    console.log('Saving structure analysis results');
    // Implementation would save to appropriate tables
  }
}

// Example usage
async function demonstrateStructureAnalysis() {
  const structureAgent = new StructureAgentV2('tenant-123');
  
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
