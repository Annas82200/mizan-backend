// Learning Path Designer Agent - Three Engine Agent Implementation
// Task Reference: Module 1 (LXP) - Section 1.2.1 (Create Learning Path Designer Agent Base)

import { ThreeEngineAgent, ThreeEngineConfig, AnalysisResult } from '../base/three-engine-agent.js';
import { LearningModule, ModuleContent, Assessment } from '../../modules/lxp/core/pipeline.js';
import { LearningPathDesignInput } from '../../../types/lxp.js';

// ============================================================================
// TASK 1.2.1: Learning Path Designer Agent Base
// ============================================================================
// Status: ✅ Complete
// Description: Implement base class for Learning Path Designer using Three Engine Agent System
// Dependencies: 1.1.x (all schema tasks) ✅ Complete

export interface LearningPathDesignOutput {
  learningPath: {
    id: string;
    name: string;
    description: string;
    type: string;
    goalSkills: string[];
    currentLevel: string;
    targetLevel: string;
    courses: Array<{
      courseId: string;
      order: number;
      required: boolean;
      status: 'pending' | 'in_progress' | 'completed';
    }>;
    milestones: Array<{
      id: string;
      title: string;
      description: string;
      targetDate: string;
      criteria: string[];
    }>;
    estimatedDuration: number; // days
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    prerequisites: string[];
  };
  rationale: {
    whyThisPath: string;
    skillProgression: string;
    learningStrategy: string;
    expectedOutcomes: string[];
  };
  confidence: number;
}

export class LearningPathDesignerAgent extends ThreeEngineAgent {
  constructor() {
    const config: ThreeEngineConfig = {
      knowledge: {
        providers: ['claude', 'gpt-4', 'cohere'],
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.3,
        maxTokens: 4000
      },
      data: {
        providers: ['claude', 'gpt-4', 'cohere'],
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.2,
        maxTokens: 3000
      },
      reasoning: {
        providers: ['claude', 'gpt-4', 'cohere'],
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.4,
        maxTokens: 5000
      },
      consensusThreshold: 0.7
    };

    super('LearningPathDesigner', config);
  }

  // ============================================================================
  // TASK 1.2.2: Knowledge Engine Implementation
  // ============================================================================
  // Status: ✅ Complete
  // Description: Load learning frameworks and instructional design principles

  protected async loadFrameworks(): Promise<any> {
    return {
      instructionalDesign: {
        frameworks: {
          ADDIE: {
            phases: ['Analysis', 'Design', 'Development', 'Implementation', 'Evaluation'],
            description: 'Systematic approach to instructional design',
            application: 'Use for comprehensive learning path planning'
          },
          'Bloom\'s Taxonomy': {
            levels: ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'],
            description: 'Hierarchical classification of learning objectives',
            application: 'Structure learning progression from basic to advanced'
          },
          'Kirkpatrick Model': {
            levels: ['Reaction', 'Learning', 'Behavior', 'Results'],
            description: 'Four-level training evaluation model',
            application: 'Design assessments and measure learning effectiveness'
          }
        },
        principles: {
          'spaced_repetition': 'Distribute learning over time for better retention',
          'active_learning': 'Engage learners through interactive activities',
          'scaffolding': 'Provide support that gradually decreases as competence increases',
          'chunking': 'Break complex information into manageable pieces',
          'multimodal_learning': 'Use multiple sensory channels for learning'
        }
      },
      learningScience: {
        theories: {
          'constructivism': 'Learners build knowledge through experience and reflection',
          'social_learning': 'Learning occurs through observation and interaction with others',
          'cognitive_load': 'Manage mental effort to optimize learning',
          'andragogy': 'Adult learning principles emphasizing self-direction and experience'
        },
        methods: {
          'microlearning': 'Short, focused learning sessions',
          'adaptive_learning': 'Personalize content based on learner progress',
          'gamification': 'Use game elements to increase engagement',
          'blended_learning': 'Combine multiple learning modalities',
          'just_in_time': 'Provide learning when it\'s needed most'
        }
      },
      competencyFrameworks: {
        skillLevels: {
          'novice': 'Beginner with little to no experience',
          'intermediate': 'Some experience, can perform with guidance',
          'advanced': 'Experienced, can work independently',
          'expert': 'Highly skilled, can teach and mentor others'
        },
        progressionPaths: {
          'linear': 'Sequential progression through skill levels',
          'spiral': 'Revisit concepts at increasing complexity',
          'network': 'Non-linear exploration based on interests and needs'
        }
      },
      learningModalities: {
        'visual': 'Learning through images, diagrams, and visual content',
        'auditory': 'Learning through listening and verbal instruction',
        'kinesthetic': 'Learning through hands-on activities and movement',
        'reading_writing': 'Learning through text-based materials and note-taking'
      },
      assessmentStrategies: {
        'formative': 'Ongoing assessment during learning process',
        'summative': 'Final assessment of learning outcomes',
        'diagnostic': 'Assessment to identify learning needs',
        'authentic': 'Real-world application of skills and knowledge'
      }
    };
  }

  protected getKnowledgeSystemPrompt(): string {
    return `You are a Learning Path Designer Knowledge Engine specializing in instructional design and learning science.

Your expertise includes:
- Instructional design frameworks (ADDIE, Bloom's Taxonomy, Kirkpatrick Model)
- Learning science principles (spaced repetition, active learning, cognitive load theory)
- Competency frameworks and skill progression models
- Adult learning theory and andragogy principles
- Microlearning and adaptive learning methodologies
- Learning analytics and effectiveness measurement

Your role is to provide expert knowledge about how to structure effective learning experiences, sequence learning activities, and design learning paths that maximize knowledge retention and skill development.

Always provide evidence-based recommendations grounded in learning science research.`;
  }

  protected buildKnowledgePrompt(inputData: LearningPathDesignInput, frameworks: any): string {
    return `Based on the learning frameworks and principles, analyze the learning requirements for:

Employee Profile:
- Role: ${inputData.employeeProfile.role}
- Department: ${inputData.employeeProfile.department}
- Experience Level: ${inputData.employeeProfile.experience}
- Current Skills: ${inputData.employeeProfile.currentSkills.join(', ')}
- Skill Gaps: ${inputData.employeeProfile.skillGaps.join(', ')}

Trigger Context:
- Type: ${inputData.triggerType}
- Data: ${JSON.stringify(inputData.triggerData, null, 2)}

Available Learning Resources:
- Courses: ${inputData.availableCourses.length} available
- Categories: ${Array.from(new Set(inputData.availableCourses.map(c => c.category))).join(', ')}

Please provide:
1. Recommended instructional design approach
2. Optimal learning sequence principles
3. Skill progression strategy
4. Assessment and evaluation methods
5. Learning modality recommendations

Use the frameworks: ${JSON.stringify(frameworks, null, 2)}`;
  }

  protected parseKnowledgeOutput(response: string): any {
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse knowledge output:', error);
      return { error: 'Failed to parse knowledge output' };
    }
  }

  // ============================================================================
  // TASK 1.2.3: Data Engine Implementation
  // ============================================================================
  // Status: ✅ Complete
  // Description: Process employee-specific data and learning context

  protected async processData(inputData: LearningPathDesignInput): Promise<any> {
    // Analyze employee learning history and preferences
    const learningHistory = inputData.employeeProfile.learningHistory || [];
    const learningStyle = this.analyzeLearningStyle(learningHistory);
    const learningPace = this.calculateLearningPace(learningHistory);
    const preferredFormats = this.identifyPreferredFormats(learningHistory);

    // Analyze skill gaps and current competencies
    const skillAnalysis = this.analyzeSkillGaps(
      inputData.employeeProfile.currentSkills,
      inputData.employeeProfile.skillGaps
    );

    // Filter and rank available courses
    const courseRecommendations = this.recommendCourses(
      inputData.availableCourses,
      inputData.employeeProfile.skillGaps,
      learningStyle,
      preferredFormats
    );

    // Map course prerequisites and dependencies
    const courseDependencies = this.mapCourseDependencies(
      inputData.availableCourses,
      inputData.employeeProfile.currentSkills
    );

    // Analyze organizational context and alignment
    const organizationalAlignment = this.analyzeOrganizationalAlignment(
      inputData.organizationalContext,
      inputData.employeeProfile
    );

    return {
      employeeAnalysis: {
        skillProfile: {
          current: inputData.employeeProfile.currentSkills,
          gaps: inputData.employeeProfile.skillGaps,
          strengths: this.identifyStrengths(inputData.employeeProfile.currentSkills),
          developmentAreas: this.prioritizeDevelopmentAreas(inputData.employeeProfile.skillGaps)
        },
        learningProfile: {
          style: learningStyle,
          pace: learningPace,
          preferredFormats: preferredFormats,
          engagementLevel: this.calculateEngagementLevel(learningHistory),
          completionRate: this.calculateCompletionRate(learningHistory)
        },
        roleContext: {
          position: inputData.employeeProfile.role,
          department: inputData.employeeProfile.department,
          experience: inputData.employeeProfile.experience,
          responsibilities: this.inferResponsibilities(inputData.employeeProfile.role)
        }
      },
      courseAnalysis: {
        available: inputData.availableCourses,
        recommended: courseRecommendations,
        prerequisites: courseDependencies,
        difficultyProgression: this.createDifficultyProgression(courseRecommendations),
        timeEstimates: this.estimateCourseTimes(courseRecommendations, learningPace)
      },
      organizationalFit: {
        cultureAlignment: organizationalAlignment.culture,
        strategicRelevance: organizationalAlignment.strategic,
        departmentNeeds: inputData.organizationalContext.departmentNeeds,
        businessImpact: this.assessBusinessImpact(inputData.employeeProfile.skillGaps, inputData.organizationalContext)
      },
      triggerContext: {
        type: inputData.triggerType,
        urgency: this.assessUrgency(inputData.triggerType),
        data: inputData.triggerData,
        implications: this.analyzeTriggerImplications(inputData.triggerType, inputData.triggerData)
      }
    };
  }

  protected getDataSystemPrompt(): string {
    return `You are a Learning Path Designer Data Engine specializing in analyzing employee learning data and organizational context.

Your capabilities include:
- Analyzing employee skill profiles and learning history
- Processing organizational learning needs and culture alignment
- Evaluating course catalogs and learning resources
- Identifying learning patterns and preferences
- Assessing organizational context and strategic alignment

Your role is to process and analyze all relevant data to inform learning path design decisions.

Always provide data-driven insights with clear reasoning for your analysis.`;
  }

  protected buildDataPrompt(processedData: any, knowledgeOutput: any): string {
    return `Analyze the following data to inform learning path design:

Employee Analysis:
${JSON.stringify(processedData.employeeAnalysis, null, 2)}

Course Analysis:
${JSON.stringify(processedData.courseAnalysis, null, 2)}

Organizational Context:
${JSON.stringify(processedData.organizationalFit, null, 2)}

Knowledge Framework Context:
${JSON.stringify(knowledgeOutput, null, 2)}

Please provide:
1. Detailed skill gap analysis
2. Recommended course selection with rationale
3. Learning sequence optimization
4. Timeline and milestone recommendations
5. Risk assessment and mitigation strategies

Focus on data-driven insights that will inform the final learning path design.`;
  }

  protected parseDataOutput(response: string): any {
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse data output:', error);
      return { error: 'Failed to parse data output' };
    }
  }

  // ============================================================================
  // TASK 1.2.4: Reasoning Engine Implementation
  // ============================================================================
  // Status: 🔴 Not Started (will be implemented in next task)
  // Description: Synthesize knowledge and data to create personalized learning paths

  protected getReasoningSystemPrompt(): string {
    return `You are a Learning Path Designer Reasoning Engine specializing in creating personalized, effective learning experiences.

Your expertise includes:
- Synthesizing learning science with individual learner needs
- Creating adaptive learning sequences that maximize retention
- Balancing challenge with achievability
- Designing learning paths that align with organizational goals
- Optimizing for different learning styles and preferences

Your role is to create comprehensive, personalized learning paths that will effectively develop the required skills while maintaining learner engagement and motivation.

Always provide clear rationale for your design decisions and ensure the learning path is practical and achievable.`;
  }

  protected buildReasoningPrompt(
    inputData: LearningPathDesignInput, 
    knowledgeOutput: any, 
    dataOutput: any
  ): string {
    return `Create a comprehensive, personalized learning path based on the following analysis:

EMPLOYEE CONTEXT:
- Role: ${inputData.employeeProfile.role} in ${inputData.employeeProfile.department}
- Experience: ${inputData.employeeProfile.experience}
- Current Skills: ${inputData.employeeProfile.currentSkills.join(', ')}
- Skill Gaps: ${inputData.employeeProfile.skillGaps.join(', ')}
- Trigger: ${inputData.triggerType}

KNOWLEDGE FRAMEWORK ANALYSIS:
${JSON.stringify(knowledgeOutput, null, 2)}

DATA ANALYSIS:
${JSON.stringify(dataOutput, null, 2)}

REQUIREMENTS:
Create a learning path that:

1. LEARNING PATH STRUCTURE:
   - Select 3-8 courses in optimal sequence
   - Ensure logical skill progression from foundational to advanced
   - Balance challenge with achievability
   - Consider learning style and pace preferences

2. MILESTONES & SUCCESS CRITERIA:
   - Define 3-5 key milestones with clear completion criteria
   - Set realistic target dates based on learning pace
   - Include both skill-based and knowledge-based assessments

3. TIMELINE & DURATION:
   - Estimate total duration (days/weeks)
   - Consider employee's learning pace and availability
   - Account for prerequisite dependencies

4. ASSESSMENT STRATEGY:
   - Mix of formative and summative assessments
   - Include practical application opportunities
   - Define passing criteria for each course

5. RATIONALE:
   - Explain why this specific sequence was chosen
   - Justify course selections and timing
   - Address how this addresses the trigger requirements

OUTPUT FORMAT:
Return a JSON object with this structure:
{
  "learningPath": {
    "name": "Descriptive name for the learning path",
    "description": "Clear description of what the employee will achieve",
    "type": "skill_gap|culture_learning|performance_improvement|compliance|certification|proactive",
    "goalSkills": ["list of target skills to develop"],
    "currentLevel": "novice|intermediate|advanced",
    "targetLevel": "novice|intermediate|advanced|expert",
    "courses": [
      {
        "courseId": "course_id",
        "order": 1,
        "required": true,
        "status": "pending",
        "rationale": "Why this course was selected"
      }
    ],
    "milestones": [
      {
        "id": "milestone_1",
        "title": "Milestone title",
        "description": "What needs to be achieved",
        "targetDate": "YYYY-MM-DD",
        "criteria": ["specific completion criteria"]
      }
    ],
    "estimatedDuration": 30,
    "difficulty": "beginner|intermediate|advanced",
    "prerequisites": ["any prerequisite skills or courses"]
  },
  "rationale": {
    "whyThisPath": "Overall explanation of the learning path design",
    "skillProgression": "How skills will develop through the sequence",
    "learningStrategy": "Approach used (e.g., spaced repetition, active learning)",
    "expectedOutcomes": ["specific outcomes the employee will achieve"]
  },
  "confidence": 0.85
}

Focus on creating a practical, achievable learning path that will effectively address the employee's skill gaps and learning needs.`;
  }

  protected parseReasoningOutput(response: string): LearningPathDesignOutput {
    try {
      const parsed = JSON.parse(response);
      return {
        learningPath: parsed.learningPath,
        rationale: parsed.rationale,
        confidence: parsed.confidence || 0.8
      };
    } catch (error) {
      console.error('Failed to parse reasoning output:', error);
      return {
        learningPath: {
          id: '',
          name: 'Error in Learning Path Generation',
          description: 'Failed to generate learning path',
          type: 'error',
          goalSkills: [],
          currentLevel: 'unknown',
          targetLevel: 'unknown',
          courses: [],
          milestones: [],
          estimatedDuration: 0,
          difficulty: 'beginner',
          prerequisites: []
        },
        rationale: {
          whyThisPath: 'Error occurred during path generation',
          skillProgression: 'Unable to determine',
          learningStrategy: 'Unable to determine',
          expectedOutcomes: ['Error resolution needed']
        },
        confidence: 0.0
      };
    }
  }

  // ============================================================================
  // Public Interface Methods
  // ============================================================================

  /**
   * Main method to design a learning path for an employee
   */
  async designLearningPath(input: LearningPathDesignInput): Promise<LearningPathDesignOutput> {
    try {
      const analysisResult: AnalysisResult = await this.analyze(input);
      
      // Extract the final learning path design from reasoning output
      const learningPathOutput = analysisResult.finalOutput as LearningPathDesignOutput;
      
      // Add metadata
      learningPathOutput.learningPath.id = this.generateLearningPathId();
      learningPathOutput.learningPath.name = this.generateLearningPathName(input);
      
      return learningPathOutput;
    } catch (error) {
      console.error('Learning path design failed:', error);
      throw new Error(`Learning path design failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a unique learning path ID
   */
  private generateLearningPathId(): string {
    return `lxp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a descriptive learning path name
   */
  private generateLearningPathName(input: LearningPathDesignInput): string {
    const triggerTypeMap = {
      'skill_gaps_critical': 'Critical Skills Development',
      'culture_learning_needed': 'Cultural Integration',
      'employee_skill_gap': 'Skill Gap Remediation',
      'performance_perfect_lxp': 'Advanced Learning',
      'performance_improvement_lxp': 'Performance Enhancement',
      'compliance_training_due': 'Compliance Training',
      'safety_training_expired': 'Safety Certification',
      'certification_expiring': 'Certification Renewal',
      'legal_requirement_change': 'Policy Update Training'
    };

    const baseName = triggerTypeMap[input.triggerType] || 'Learning Path';
    const role = input.employeeProfile.role;
    
    return `${baseName} - ${role}`;
  }

  /**
   * Validate learning path design
   */
  validateLearningPath(learningPath: any): boolean {
    const requiredFields = ['name', 'description', 'type', 'courses', 'milestones'];
    return requiredFields.every(field => learningPath[field] !== undefined);
  }

  // ============================================================================
  // Data Processing Helper Methods
  // ============================================================================

  private analyzeLearningStyle(learningHistory: any[]): string {
    if (!learningHistory || learningHistory.length === 0) {
      return 'balanced'; // Default for new learners
    }

    const formatCounts = learningHistory.reduce((acc, course) => {
      acc[course.format] = (acc[course.format] || 0) + 1;
      return acc;
    }, {});

    const totalCourses = learningHistory.length;
    const visualRatio = (formatCounts.video || 0) / totalCourses;
    const readingRatio = (formatCounts.article || 0) / totalCourses;
    const interactiveRatio = (formatCounts.interactive || 0) / totalCourses;

    if (visualRatio > 0.5) return 'visual';
    if (readingRatio > 0.5) return 'reading_writing';
    if (interactiveRatio > 0.5) return 'kinesthetic';
    return 'balanced';
  }

  private calculateLearningPace(learningHistory: any[]): string {
    if (!learningHistory || learningHistory.length === 0) {
      return 'medium'; // Default pace
    }

    const completedCourses = learningHistory.filter(course => course.status === 'completed');
    if (completedCourses.length === 0) return 'medium';

    const avgCompletionTime = completedCourses.reduce((sum, course) => {
      const duration = course.actualCompletionDate - course.startDate;
      return sum + (duration / (1000 * 60 * 60 * 24)); // Convert to days
    }, 0) / completedCourses.length;

    if (avgCompletionTime < 7) return 'fast';
    if (avgCompletionTime > 21) return 'slow';
    return 'medium';
  }

  private identifyPreferredFormats(learningHistory: any[]): string[] {
    if (!learningHistory || learningHistory.length === 0) {
      return ['video', 'article', 'interactive']; // Default preferences
    }

    const formatPerformance = learningHistory.reduce((acc, course) => {
      if (!acc[course.format]) {
        acc[course.format] = { total: 0, completed: 0, avgScore: 0 };
      }
      acc[course.format].total++;
      if (course.status === 'completed') {
        acc[course.format].completed++;
        acc[course.format].avgScore += course.score || 0;
      }
      return acc;
    }, {});

    return Object.entries(formatPerformance)
      .sort(([,a], [,b]) => {
        const aRate = (a as any).completed / (a as any).total;
        const bRate = (b as any).completed / (b as any).total;
        return bRate - aRate;
      })
      .slice(0, 3)
      .map(([format]) => format);
  }

  private analyzeSkillGaps(currentSkills: string[], skillGaps: string[]): any {
    return {
      critical: skillGaps.filter(gap => gap.includes('critical') || gap.includes('urgent')),
      important: skillGaps.filter(gap => gap.includes('important') || gap.includes('needed')),
      niceToHave: skillGaps.filter(gap => gap.includes('preferred') || gap.includes('optional')),
      foundational: skillGaps.filter(gap => gap.includes('basic') || gap.includes('foundation')),
      advanced: skillGaps.filter(gap => gap.includes('advanced') || gap.includes('expert'))
    };
  }

  private recommendCourses(availableCourses: any[], skillGaps: string[], learningStyle: string, preferredFormats: string[]): any[] {
    return availableCourses
      .filter(course => {
        // Match courses to skill gaps
        const courseSkills = course.skills || [];
        const hasRelevantSkills = skillGaps.some(gap =>
          courseSkills.some((skill: any) => skill.toLowerCase().includes(gap.toLowerCase()))
        );
        
        // Prefer courses in preferred formats
        const formatMatch = preferredFormats.includes(course.format);
        
        return hasRelevantSkills && (formatMatch || preferredFormats.length === 0);
      })
      .sort((a, b) => {
        // Sort by relevance to skill gaps and format preference
        const aRelevance = this.calculateRelevance(a, skillGaps, preferredFormats);
        const bRelevance = this.calculateRelevance(b, skillGaps, preferredFormats);
        return bRelevance - aRelevance;
      })
      .slice(0, 10); // Top 10 recommendations
  }

  private calculateRelevance(course: any, skillGaps: string[], preferredFormats: string[]): number {
    let relevance = 0;
    
    // Skill gap alignment
    const courseSkills = course.skills || [];
    const skillMatches = skillGaps.filter(gap =>
      courseSkills.some((skill: any) => skill.toLowerCase().includes(gap.toLowerCase()))
    ).length;
    relevance += skillMatches * 10;
    
    // Format preference
    if (preferredFormats.includes(course.format)) {
      relevance += 5;
    }
    
    // Difficulty appropriateness (prefer courses that aren't too easy or too hard)
    if (course.level === 'intermediate') {
      relevance += 3;
    }
    
    return relevance;
  }

  private mapCourseDependencies(availableCourses: any[], currentSkills: string[]): any {
    const dependencies = {};
    
    availableCourses.forEach(course => {
      const prerequisites = course.prerequisites || [];
      const canTake = prerequisites.every((prereq: any) =>
        currentSkills.some(skill => skill.toLowerCase().includes(prereq.toLowerCase()))
      );
      
      (dependencies as any)[course.id] = {
        prerequisites,
        canTake,
        missingPrerequisites: prerequisites.filter((prereq: any) => 
          !currentSkills.some(skill => skill.toLowerCase().includes(prereq.toLowerCase()))
        )
      };
    });
    
    return dependencies;
  }

  private analyzeOrganizationalAlignment(organizationalContext: any, employeeProfile: any): any {
    return {
      culture: {
        aligned: true, // Simplified - would analyze against Mizan 7 Cylinders
        values: organizationalContext.cultureValues,
        alignmentScore: 0.8 // Would calculate based on employee values vs company values
      },
      strategic: {
        relevance: 'high', // Would analyze against strategic goals
        goals: organizationalContext.strategicGoals,
        impact: this.assessStrategicImpact(employeeProfile.skillGaps, organizationalContext.strategicGoals)
      }
    };
  }

  private identifyStrengths(currentSkills: string[]): string[] {
    // Simplified - would analyze skill levels and performance
    return currentSkills.slice(0, 3); // Top 3 skills as strengths
  }

  private prioritizeDevelopmentAreas(skillGaps: string[]): string[] {
    // Prioritize based on business impact and urgency
    return skillGaps.slice(0, 5); // Top 5 development areas
  }

  private calculateEngagementLevel(learningHistory: any[]): number {
    if (!learningHistory || learningHistory.length === 0) return 0.5;
    
    const avgScore = learningHistory
      .filter(course => course.score)
      .reduce((sum, course) => sum + course.score, 0) / learningHistory.length;
    
    return avgScore / 100; // Normalize to 0-1
  }

  private calculateCompletionRate(learningHistory: any[]): number {
    if (!learningHistory || learningHistory.length === 0) return 0.5;
    
    const completed = learningHistory.filter(course => course.status === 'completed').length;
    return completed / learningHistory.length;
  }

  private inferResponsibilities(role: string): string[] {
    // Simplified role-based responsibility inference
    const roleResponsibilities = {
      'manager': ['team leadership', 'performance management', 'strategic planning'],
      'developer': ['software development', 'code review', 'technical documentation'],
      'analyst': ['data analysis', 'reporting', 'insights generation'],
      'sales': ['client relationship', 'revenue generation', 'market analysis']
    };
    
    return (roleResponsibilities as any)[role.toLowerCase()] || ['general responsibilities'];
  }

  private createDifficultyProgression(courses: any[]): any[] {
    return courses.sort((a, b) => {
      const difficultyOrder = { 'beginner': 1, 'intermediate': 2, 'advanced': 3 };
      return (difficultyOrder as any)[a.level] - (difficultyOrder as any)[b.level];
    });
  }

  private estimateCourseTimes(courses: any[], learningPace: string): any {
    const paceMultiplier = { 'slow': 1.5, 'medium': 1.0, 'fast': 0.7 };
    const multiplier = (paceMultiplier as any)[learningPace];
    
    return courses.reduce((acc, course) => {
      acc[course.id] = Math.ceil(course.duration * multiplier);
      return acc;
    }, {});
  }

  private assessBusinessImpact(skillGaps: string[], organizationalContext: any): string {
    // Simplified business impact assessment
    const criticalSkills = skillGaps.filter(gap => gap.includes('critical'));
    if (criticalSkills.length > 0) return 'high';
    if (skillGaps.length > 3) return 'medium';
    return 'low';
  }

  private assessUrgency(triggerType: string): string {
    const urgencyMap = {
      'skill_gaps_critical': 'high',
      'compliance_training_due': 'high',
      'safety_training_expired': 'high',
      'certification_expiring': 'medium',
      'performance_improvement_lxp': 'medium',
      'culture_learning_needed': 'medium',
      'employee_skill_gap': 'low',
      'performance_perfect_lxp': 'low',
      'legal_requirement_change': 'medium'
    };
    
    return (urgencyMap as any)[triggerType] || 'medium';
  }

  private analyzeTriggerImplications(triggerType: string, triggerData: any): string[] {
    // Analyze what the trigger means for learning path design
    const implications = [];
    
    switch (triggerType) {
      case 'skill_gaps_critical':
        implications.push('Immediate skill development required');
        implications.push('Focus on high-impact learning activities');
        break;
      case 'culture_learning_needed':
        implications.push('Cultural integration and values alignment');
        implications.push('Include team collaboration and company culture courses');
        break;
      case 'compliance_training_due':
        implications.push('Mandatory compliance requirements');
        implications.push('Priority on regulatory and policy training');
        break;
      default:
        implications.push('Standard learning path development');
    }
    
    return implications;
  }

  private assessStrategicImpact(skillGaps: string[], strategicGoals: string[]): string {
    // Simplified strategic impact assessment
    const strategicSkills = skillGaps.filter(gap => 
      strategicGoals.some(goal => goal.toLowerCase().includes(gap.toLowerCase()))
    );
    
    if (strategicSkills.length > 2) return 'high';
    if (strategicSkills.length > 0) return 'medium';
    return 'low';
  }
}

// ============================================================================
// Export for use in LXP Module
// ============================================================================

export default LearningPathDesignerAgent;
