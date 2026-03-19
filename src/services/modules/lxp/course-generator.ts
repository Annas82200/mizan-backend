/**
 * AI Course Generator — Creates adaptive, personalized learning content
 *
 * Uses the Reasoning Engine (Claude) to generate course outlines, lessons,
 * and interactive exercises tailored to the learner's skill gaps and level.
 */

import { getAIRouter } from '../../ai-engines/ai-router';

export interface CourseGenerationRequest {
  tenantId: string;
  userId: string;
  skillGaps: Array<{ skill: string; currentLevel: number; targetLevel: number }>;
  learnerProfile: {
    role: string;
    experience: string;
    preferredLearningStyle?: string;
  };
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface GeneratedCourse {
  title: string;
  description: string;
  estimatedDurationMinutes: number;
  difficulty: string;
  modules: Array<{
    title: string;
    description: string;
    lessons: Array<{
      title: string;
      content: string;
      exerciseType: 'quiz' | 'reflection' | 'scenario' | 'practice';
      exercise: {
        prompt: string;
        options?: string[];
        correctAnswer?: string;
        explanation: string;
      };
    }>;
  }>;
  assessmentCriteria: Array<{ skill: string; passingScore: number }>;
}

export class CourseGenerator {
  /**
   * Generate a complete adaptive course based on skill gaps
   */
  async generateCourse(request: CourseGenerationRequest): Promise<GeneratedCourse> {
    const router = getAIRouter();

    const response = await router.route({
      query: `Generate a complete learning course for the following skill gaps and learner profile.

Skill Gaps:
${request.skillGaps.map(g => `- ${g.skill}: current level ${g.currentLevel}/5, target ${g.targetLevel}/5`).join('\n')}

Learner Profile:
- Role: ${request.learnerProfile.role}
- Experience: ${request.learnerProfile.experience}
- Difficulty: ${request.difficulty}
${request.learnerProfile.preferredLearningStyle ? `- Preferred style: ${request.learnerProfile.preferredLearningStyle}` : ''}

Generate a structured JSON course with:
1. Course title and description
2. Estimated duration in minutes
3. 3-5 modules, each with 2-4 lessons
4. Each lesson must have: title, educational content (2-3 paragraphs), and one interactive exercise
5. Exercise types: quiz (multiple choice), reflection (open-ended), scenario (situational), practice (hands-on)
6. Assessment criteria for each skill being taught

Make the content practical, engaging, and directly applicable to their role.
Return valid JSON only.`,
      tenantId: request.tenantId,
      userId: request.userId,
      forceEngine: 'reasoning',
    });

    try {
      const parsed = JSON.parse(response.content);
      return parsed as GeneratedCourse;
    } catch (err) {
      // If AI doesn't return valid JSON, create a structured fallback
      return {
        title: `${request.skillGaps[0]?.skill || 'Professional Development'} Course`,
        description: response.content.substring(0, 500),
        estimatedDurationMinutes: 60,
        difficulty: request.difficulty,
        modules: [{
          title: 'Getting Started',
          description: 'Foundation module',
          lessons: [{
            title: 'Introduction',
            content: response.content,
            exerciseType: 'reflection',
            exercise: {
              prompt: 'Reflect on how you would apply these concepts in your current role.',
              explanation: 'This exercise helps you connect theory to practice.',
            },
          }],
        }],
        assessmentCriteria: request.skillGaps.map(g => ({ skill: g.skill, passingScore: 70 })),
      };
    }
  }

  /**
   * Generate adaptive exercises based on learner performance
   */
  async generateAdaptiveExercise(params: {
    tenantId: string;
    skill: string;
    currentScore: number;
    previousErrors: string[];
    difficulty: string;
  }): Promise<{
    exerciseType: string;
    prompt: string;
    options?: string[];
    correctAnswer?: string;
    explanation: string;
  }> {
    const router = getAIRouter();

    const response = await router.route({
      query: `Generate a single adaptive learning exercise.

Skill: ${params.skill}
Current score: ${params.currentScore}%
Difficulty: ${params.difficulty}
${params.previousErrors.length > 0 ? `Previous mistakes to address:\n${params.previousErrors.join('\n')}` : ''}

The exercise should target areas where the learner is struggling.
Return JSON: { exerciseType, prompt, options (if quiz), correctAnswer (if quiz), explanation }`,
      tenantId: params.tenantId,
      forceEngine: 'reasoning',
    });

    try {
      return JSON.parse(response.content);
    } catch (err) {
      return {
        exerciseType: 'reflection',
        prompt: `Reflect on how you can improve your understanding of ${params.skill}.`,
        explanation: 'Self-reflection helps consolidate learning.',
      };
    }
  }
}
