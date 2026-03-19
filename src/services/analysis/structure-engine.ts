/**
 * Structure Analysis Engine — Org chart, span of control, reporting depth
 * Reads employees/departments and computes organizational health metrics.
 */
import { db } from '../../../db/index';
import { employees, departments, positions } from '../../../db/schema';
import { eq, sql } from 'drizzle-orm';

export interface StructureAnalysis {
  totalEmployees: number;
  totalDepartments: number;
  avgSpanOfControl: number;
  maxReportingDepth: number;
  vacantPositions: number;
  bottlenecks: Array<{ departmentName: string; issue: string }>;
  hiringNeeds: Array<{ title: string; department: string; priority: string }>;
}

export class StructureEngine {
  async analyze(tenantId: string): Promise<StructureAnalysis> {
    const [emps, depts, posData] = await Promise.all([
      db.select().from(employees).where(eq(employees.tenantId, tenantId)),
      db.select().from(departments).where(eq(departments.tenantId, tenantId)),
      db.select().from(positions).where(eq(positions.tenantId, tenantId)),
    ]);

    // Compute span of control (avg direct reports per manager)
    const managerCounts = new Map<string, number>();
    for (const emp of emps) {
      if (emp.managerId) {
        managerCounts.set(emp.managerId, (managerCounts.get(emp.managerId) || 0) + 1);
      }
    }
    const spans = Array.from(managerCounts.values());
    const avgSpan = spans.length > 0 ? spans.reduce((a, b) => a + b, 0) / spans.length : 0;

    // Compute max reporting depth
    const managerMap = new Map(emps.map(e => [e.id, e.managerId]));
    let maxDepth = 0;
    for (const emp of emps) {
      let depth = 0;
      let current = emp.managerId;
      const visited = new Set<string>();
      while (current && !visited.has(current)) {
        visited.add(current);
        depth++;
        current = managerMap.get(current) || null;
      }
      maxDepth = Math.max(maxDepth, depth);
    }

    // Find vacant positions
    const vacant = posData.filter(p => p.isVacant);

    // Find bottlenecks (managers with too many reports)
    const bottlenecks: StructureAnalysis['bottlenecks'] = [];
    for (const [managerId, count] of managerCounts) {
      if (count > 10) {
        const manager = emps.find(e => e.id === managerId);
        bottlenecks.push({
          departmentName: manager?.departmentId || 'Unknown',
          issue: `Manager has ${count} direct reports (recommended: 5-8)`,
        });
      }
    }

    return {
      totalEmployees: emps.length,
      totalDepartments: depts.length,
      avgSpanOfControl: Math.round(avgSpan * 10) / 10,
      maxReportingDepth: maxDepth,
      vacantPositions: vacant.length,
      bottlenecks,
      hiringNeeds: vacant.map(v => ({
        title: v.title,
        department: v.departmentId || 'Unassigned',
        priority: v.level === 'senior' || v.level === 'lead' ? 'high' : 'medium',
      })),
    };
  }
}
