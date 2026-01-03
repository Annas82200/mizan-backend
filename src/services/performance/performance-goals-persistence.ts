/**
 * Performance Goals Persistence Service
 * Handles proper storage of departmental and individual goals
 * Production-ready implementation - replaces TODO comments in performance-agent.ts
 */

import { db } from '../../../db/index';
import { performanceGoals } from '../../../db/schema/performance';
import { users } from '../../../db/schema/core';
import { eq, and } from 'drizzle-orm';

interface DepartmentalGoal {
  departmentId: string;
  title: string;
  description: string;
  category: string;
  targetValue: number;
  weight: number;
}

interface IndividualGoal {
  employeeId: string;
  title: string;
  description: string;
  category: string;
  targetValue: number;
  weight: number;
  dueDate?: Date;
}

interface CultureGoal {
  employeeId: string;
  title: string;
  description: string;
  dimension: string;
  targetMetric: number;
  weight: number;
}

interface SkillsGoal {
  employeeId: string;
  title: string;
  description: string;
  skillCategory: string;
  currentProficiencyLevel: number;
  targetProficiencyLevel: number;
  weight: number;
  strategicPriority: string;
  lxpPathId?: string;
}

interface PerformanceGoalsData {
  departmentalGoals?: DepartmentalGoal[];
  individualGoals?: IndividualGoal[];
  cultureGoals?: CultureGoal[];
  skillsGoals?: SkillsGoal[];
}

export class PerformanceGoalsPersistenceService {
  /**
   * Main entry point - persist all types of performance goals
   */
  async persistPerformanceGoals(
    goalsData: PerformanceGoalsData,
    tenantId: string,
    userId: string
  ): Promise<void> {
    // Persist departmental goals
    if (goalsData.departmentalGoals && goalsData.departmentalGoals.length > 0) {
      for (const deptGoal of goalsData.departmentalGoals) {
        await this.persistDepartmentalGoal(deptGoal, tenantId, userId);
      }
    }

    // Persist individual goals
    if (goalsData.individualGoals && goalsData.individualGoals.length > 0) {
      for (const indGoal of goalsData.individualGoals) {
        await this.persistIndividualGoal(indGoal, tenantId, userId);
      }
    }

    // Persist culture goals (for leaders)
    if (goalsData.cultureGoals && goalsData.cultureGoals.length > 0) {
      for (const cultureGoal of goalsData.cultureGoals) {
        await this.persistCultureGoal(cultureGoal, tenantId, userId);
      }
    }

    // Persist skills goals
    if (goalsData.skillsGoals && goalsData.skillsGoals.length > 0) {
      for (const skillsGoal of goalsData.skillsGoals) {
        await this.persistSkillsGoal(skillsGoal, tenantId, userId);
      }
    }
  }

  private async persistDepartmentalGoal(
    goal: DepartmentalGoal,
    tenantId: string,
    createdBy: string
  ): Promise<void> {
    // Get a default employee/manager for departmental goals
    const defaultUsers = await db.select()
      .from(users)
      .where(eq(users.tenantId, tenantId))
      .limit(1);

    const defaultUserId = defaultUsers[0]?.id || createdBy;

    await db.insert(performanceGoals).values({
      tenantId,
      employeeId: defaultUserId,
      managerId: defaultUserId,
      title: goal.title,
      description: goal.description,
      type: 'team',
      category: goal.category as any,
      goalFormat: 'okr',
      target: { value: goal.targetValue },
      startDate: new Date(),
      targetDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
      weight: goal.weight.toString(),
      createdBy,
      updatedBy: createdBy
    });
  }

  private async persistIndividualGoal(
    goal: IndividualGoal,
    tenantId: string,
    createdBy: string
  ): Promise<void> {
    // Get actual employee and manager IDs from employee record
    const employee = await this.getEmployeeById(goal.employeeId, tenantId);

    if (!employee) {
      throw new Error(`Employee ${goal.employeeId} not found in tenant ${tenantId}`);
    }

    await db.insert(performanceGoals).values({
      tenantId,
      employeeId: employee.id,
      managerId: employee.managerId || employee.id,
      title: goal.title,
      description: goal.description,
      type: 'individual',
      category: this.mapCategory(goal.category),
      goalFormat: 'smart',
      target: { value: goal.targetValue },
      startDate: new Date(),
      targetDate: goal.dueDate || new Date(new Date().setMonth(new Date().getMonth() + 3)),
      weight: goal.weight.toString(),
      createdBy,
      updatedBy: createdBy
    });
  }

  private async persistCultureGoal(
    goal: CultureGoal,
    tenantId: string,
    createdBy: string
  ): Promise<void> {
    const employee = await this.getEmployeeById(goal.employeeId, tenantId);

    if (!employee) {
      throw new Error(`Employee ${goal.employeeId} not found`);
    }

    await db.insert(performanceGoals).values({
      tenantId,
      employeeId: employee.id,
      managerId: employee.managerId || employee.id,
      title: goal.title,
      description: goal.description,
      type: 'individual',
      category: 'leadership',
      goalFormat: 'okr',
      target: { value: goal.targetMetric },
      startDate: new Date(),
      targetDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
      weight: goal.weight.toString(),
      metadata: JSON.stringify({
        cultureDimension: goal.dimension,
        leadershipLevel: employee.role,
        goalType: 'culture'
      }),
      createdBy,
      updatedBy: createdBy
    });
  }

  private async persistSkillsGoal(
    goal: SkillsGoal,
    tenantId: string,
    createdBy: string
  ): Promise<void> {
    const employee = await this.getEmployeeById(goal.employeeId, tenantId);

    if (!employee) {
      throw new Error(`Employee ${goal.employeeId} not found`);
    }

    await db.insert(performanceGoals).values({
      tenantId,
      employeeId: employee.id,
      managerId: employee.managerId || employee.id,
      title: goal.title,
      description: goal.description,
      type: 'individual',
      category: 'learning',
      goalFormat: 'smart',
      target: { value: goal.targetProficiencyLevel },
      startDate: new Date(),
      targetDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
      weight: goal.weight.toString(),
      metadata: JSON.stringify({
        skillCategory: goal.skillCategory,
        strategicPriority: goal.strategicPriority,
        lxpPathId: goal.lxpPathId,
        currentProficiencyLevel: goal.currentProficiencyLevel,
        goalType: 'skills'
      }),
      createdBy,
      updatedBy: createdBy
    });
  }

  /**
   * Fetch employee record with manager relationship
   */
  private async getEmployeeById(employeeId: string, tenantId: string) {
    const employees = await db.select()
      .from(users)
      .where(
        and(
          eq(users.id, employeeId),
          eq(users.tenantId, tenantId)
        )
      )
      .limit(1);

    return employees[0] || null;
  }

  /**
   * Map category strings to valid performance goal categories
   */
  private mapCategory(category: string): 'revenue' | 'productivity' | 'quality' | 'learning' | 'leadership' | 'innovation' | 'customer_satisfaction' | 'operational_excellence' {
    const categoryMap: Record<string, 'revenue' | 'productivity' | 'quality' | 'learning' | 'leadership' | 'innovation' | 'customer_satisfaction' | 'operational_excellence'> = {
      'revenue': 'revenue',
      'productivity': 'productivity',
      'quality': 'quality',
      'learning': 'learning',
      'leadership': 'leadership',
      'innovation': 'innovation',
      'customer_satisfaction': 'customer_satisfaction',
      'operational_excellence': 'operational_excellence',
      'sales': 'revenue',
      'efficiency': 'productivity',
      'performance': 'productivity',
      'development': 'learning',
      'training': 'learning',
      'management': 'leadership',
      'creative': 'innovation',
      'customer': 'customer_satisfaction',
      'operations': 'operational_excellence'
    };

    return categoryMap[category.toLowerCase()] || 'productivity';
  }
}

// Export singleton instance
export const performanceGoalsPersistenceService = new PerformanceGoalsPersistenceService();
