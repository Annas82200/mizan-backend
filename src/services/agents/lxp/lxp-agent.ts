import { z } from 'zod';
import { db } from '../../../db/index.js';
import { courses, learningPaths, courseEnrollments } from '../../../db/schema/lxp-extended.js';
import { skillsGaps } from '../../../db/schema/skills.js';
import { KnowledgeEngine } from '../../../ai/engines/KnowledgeEngine.js';
import { DataEngine } from '../../../ai/engines/DataEngine.js';
import { ReasoningEngine } from '../../../ai/engines/ReasoningEngine.js';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// Zod schemas for LXP Agent
export const LXPInputSchema = z.object({
  tenantId: z.string().uuid(),
  employeeId: z.string().uuid(),
  skillsGaps: z.array(z.object({
      skill: z.string(),
      currentLevel: z.string(),
      requiredLevel: z.string(),
      gapSeverity: z.string(),
  })),
});

export type LXPInput = z.infer<typeof LXPInputSchema>;

class LXPAgent {
    private knowledgeEngine: KnowledgeEngine;
    private dataEngine: DataEngine;
    private reasoningEngine: ReasoningEngine;

    constructor() {
        this.knowledgeEngine = new KnowledgeEngine();
        this.dataEngine = new DataEngine();
        this.reasoningEngine = new ReasoningEngine();
    }

    public async createLearningPathForEmployee(input: LXPInput) {
        const validatedInput = LXPInputSchema.parse(input);
        const { tenantId, employeeId, skillsGaps } = validatedInput;

        const learningPathId = randomUUID();

        // 1. Find relevant courses for the skills gaps
        const relevantCourses = await this.findCoursesForSkills(tenantId, skillsGaps.map(g => g.skill));

        // 2. Use Reasoning Engine to construct a logical learning path
        const pathStructure = await this.reasoningEngine.analyze(
            {
                skillsGaps,
                availableCourses: relevantCourses,
            },
            {
                domain: 'learning_path_design',
                prompt: 'Design a personalized learning path to close the identified skill gaps using the available courses. Prioritize critical gaps and create a logical sequence of courses.'
            }
        );
        
        // 3. Create and persist the learning path
        const [learningPath] = await db.insert(learningPaths).values({
            id: learningPathId,
            tenantId,
            employeeId,
            name: `Personalized Development Plan for ${employeeId}`,
            description: `A learning path designed to address key skill gaps in areas like ${skillsGaps.map(g => g.skill).join(', ')}.`,
            type: 'skill_gap',
            goalSkills: skillsGaps.map(g => g.skill),
            courses: pathStructure.recommendedPath || [], // Assuming reasoning engine returns this structure
            status: 'not_started',
            createdBy: 'lxp-agent',
        }).returning();

        // 4. (Optional) Enroll the user in the first course
        if (pathStructure.recommendedPath && pathStructure.recommendedPath.length > 0) {
            const firstCourseId = pathStructure.recommendedPath[0].courseId;
            await this.enrollEmployeeInCourse(tenantId, employeeId, firstCourseId, learningPathId);
        }

        return learningPath;
    }

    private async findCoursesForSkills(tenantId: string, skills: string[]): Promise<any[]> {
        if (skills.length === 0) return [];
        
        // In a real scenario, this would be a more sophisticated search, maybe using tsvector or a search index.
        // For now, we'll do a simple query. This part of the query is not directly supported by Drizzle ORM's syntax in a simple way.
        // We might need a raw query or a different approach for arrays.
        // Let's assume for now we query all courses and filter in memory for demonstration.
        const allCourses = await db.query.courses.findMany({
            where: eq(courses.tenantId, tenantId),
        });

        const relevantCourses = allCourses.filter(course => 
            course.skills?.some(skill => skills.includes(skill))
        );

        return relevantCourses;
    }

    private async enrollEmployeeInCourse(tenantId: string, employeeId: string, courseId: string, learningPathId: string) {
        await db.insert(courseEnrollments).values({
            id: randomUUID(),
            tenantId,
            employeeId,
            courseId,
            learningPathId,
            status: 'enrolled',
        }).execute();
    }
}

export const lxpAgent = new LXPAgent();
