/**
 * Skills Analysis Engine — Gap analysis, competency mapping
 * Reads employee_skills vs skill_frameworks to compute org-wide gaps.
 */
import { db } from '../../../db/index';
import { employeeSkills, skills, skillFrameworks } from '../../../db/schema';
import { eq } from 'drizzle-orm';

export interface SkillsAnalysis {
  overallReadiness: number;
  criticalGaps: Array<{ skill: string; gap: number; priority: string }>;
  strengthAreas: Array<{ skill: string; avgLevel: number }>;
  assessmentCoverage: number;
}

const LEVEL_MAP: Record<string, number> = { novice: 1, beginner: 2, intermediate: 3, advanced: 4, expert: 5 };

export class SkillsEngine {
  async analyze(tenantId: string): Promise<SkillsAnalysis> {
    const [empSkills, allSkills] = await Promise.all([
      db.select().from(employeeSkills).where(eq(employeeSkills.tenantId, tenantId)),
      db.select().from(skills).where(eq(skills.tenantId, tenantId)),
    ]);

    // Compute average proficiency per skill
    const skillAverages = new Map<string, { total: number; count: number; name: string }>();
    for (const es of empSkills) {
      const existing = skillAverages.get(es.skillId) || { total: 0, count: 0, name: '' };
      existing.total += LEVEL_MAP[es.currentLevel] || 3;
      existing.count++;
      skillAverages.set(es.skillId, existing);
    }

    // Match with skill definitions for names
    for (const skill of allSkills) {
      const avg = skillAverages.get(skill.id);
      if (avg) avg.name = skill.name;
    }

    // Find gaps (skills with avg below 3/intermediate)
    const criticalGaps: SkillsAnalysis['criticalGaps'] = [];
    const strengthAreas: SkillsAnalysis['strengthAreas'] = [];

    for (const [skillId, data] of skillAverages) {
      const avg = data.count > 0 ? data.total / data.count : 0;
      if (avg < 3) {
        criticalGaps.push({ skill: data.name || skillId, gap: 3 - avg, priority: avg < 2 ? 'critical' : 'high' });
      } else if (avg >= 4) {
        strengthAreas.push({ skill: data.name || skillId, avgLevel: Math.round(avg * 10) / 10 });
      }
    }

    // Overall readiness = percentage of skills at intermediate or above
    const aboveIntermediate = Array.from(skillAverages.values()).filter(d => d.count > 0 && d.total / d.count >= 3).length;
    const readiness = skillAverages.size > 0 ? Math.round((aboveIntermediate / skillAverages.size) * 100) : 0;

    return {
      overallReadiness: readiness,
      criticalGaps: criticalGaps.sort((a, b) => b.gap - a.gap).slice(0, 10),
      strengthAreas: strengthAreas.sort((a, b) => b.avgLevel - a.avgLevel).slice(0, 10),
      assessmentCoverage: empSkills.length > 0 ? Math.round((skillAverages.size / Math.max(allSkills.length, 1)) * 100) : 0,
    };
  }
}
