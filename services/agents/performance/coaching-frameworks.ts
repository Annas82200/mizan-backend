// Coaching Frameworks and Models for Performance Coach Agent

export const COACHING_FRAMEWORKS = {
  grow_model: {
    name: 'GROW Coaching Model',
    description: 'Goal, Reality, Options, Will - structured coaching conversation framework',
    phases: {
      goal: 'Define clear, specific goals and desired outcomes',
      reality: 'Explore current situation and assess reality',
      options: 'Identify and evaluate possible options and strategies',
      will: 'Commit to action and establish accountability'
    },
    techniques: [
      'Open-ended questioning',
      'Active listening',
      'Reflective feedback',
      'Goal clarification',
      'Action planning'
    ],
    applications: [
      'Performance improvement coaching',
      'Career development discussions',
      'Problem-solving sessions',
      'Goal setting conversations'
    ]
  },
  oskar_model: {
    name: 'OSKAR Coaching Model',
    description: 'Outcome, Scaling, Know-how, Affirm, Review - solution-focused coaching',
    phases: {
      outcome: 'Define preferred future and desired outcomes',
      scaling: 'Scale current situation and progress',
      know_how: 'Identify existing resources and capabilities',
      affirm: 'Affirm and acknowledge progress and efforts',
      review: 'Review actions and plan next steps'
    },
    principles: [
      'Solution-focused approach',
      'Build on strengths',
      'Focus on future possibilities',
      'Incremental progress',
      'Positive reinforcement'
    ]
  },
  clear_model: {
    name: 'CLEAR Coaching Model',
    description: 'Contracting, Listening, Exploring, Action, Review - comprehensive coaching process',
    phases: {
      contracting: 'Establish coaching agreement and expectations',
      listening: 'Active listening to understand situation',
      exploring: 'Explore options and possibilities',
      action: 'Commit to specific actions',
      review: 'Review progress and outcomes'
    },
    focusAreas: [
      'Building trust and rapport',
      'Understanding context',
      'Generating insights',
      'Taking action',
      'Learning and reflection'
    ]
  }
};

export const DEVELOPMENT_FRAMEWORKS = {
  '70_20_10': {
    name: '70-20-10 Learning Model',
    description: 'Experiential learning and development framework',
    components: {
      experiential: '70% learning through challenging assignments and on-the-job experiences',
      social: '20% learning through relationships, feedback, and coaching',
      formal: '10% learning through courses, reading, and training programs'
    },
    application: [
      'Design development programs',
      'Create learning plans',
      'Balance learning approaches',
      'Maximize learning effectiveness'
    ]
  },
  kolb_learning: {
    name: 'Kolb Learning Cycle',
    description: 'Experiential learning through reflection and application',
    stages: {
      concrete_experience: 'Engaging in a new experience or situation',
      reflective_observation: 'Reflecting on the experience from different perspectives',
      abstract_conceptualization: 'Drawing conclusions and forming theories',
      active_experimentation: 'Testing theories and applying learning'
    }
  },
  competency_development: {
    name: 'Competency Development Framework',
    description: 'Systematic approach to developing competencies',
    stages: {
      awareness: 'Recognize the importance and value of the competency',
      understanding: 'Comprehend the competency and its components',
      practice: 'Apply the competency in controlled situations',
      integration: 'Incorporate the competency into regular practice',
      mastery: 'Demonstrate consistent excellence in the competency'
    }
  }
};

export const BEHAVIORAL_MODELS = {
  prochaska_change: {
    name: 'Prochaska Stages of Change',
    description: 'Transtheoretical model of behavioral change',
    stages: {
      precontemplation: 'Not yet acknowledging need for change',
      contemplation: 'Acknowledging problem and considering change',
      preparation: 'Planning and committing to change',
      action: 'Actively modifying behavior',
      maintenance: 'Sustaining new behavior',
      termination: 'Change fully integrated'
    }
  },
  habit_formation: {
    name: 'Habit Formation Model',
    description: 'Building sustainable behavioral habits',
    components: {
      cue: 'Trigger that initiates the behavior',
      routine: 'Behavior or action performed',
      reward: 'Benefit or satisfaction gained',
      craving: 'Motivation to perform the behavior'
    }
  }
};

export const MOTIVATION_THEORIES = {
  self_determination: {
    name: 'Self-Determination Theory',
    description: 'Intrinsic motivation and psychological needs',
    coreNeeds: {
      autonomy: 'Need for self-direction and choice',
      competence: 'Need for mastery and effectiveness',
      relatedness: 'Need for connection and belonging'
    }
  },
  expectancy_theory: {
    name: 'Expectancy Theory of Motivation',
    description: 'Motivation based on expected outcomes',
    components: {
      expectancy: 'Belief that effort will lead to performance',
      instrumentality: 'Belief that performance will lead to outcomes',
      valence: 'Value placed on the outcomes'
    }
  }
};

export const CAREER_MODELS = {
  schein_career_anchors: {
    name: 'Schein Career Anchors',
    description: 'Core career values and motivations',
    anchors: {
      technical_functional: 'Expertise in a specific area',
      general_management: 'Leadership and management responsibilities',
      autonomy: 'Independence and freedom',
      security: 'Stability and predictability',
      entrepreneurial: 'Creating and building',
      service: 'Helping and serving others',
      challenge: 'Solving difficult problems',
      lifestyle: 'Work-life balance and integration'
    }
  },
  career_stages: {
    name: 'Career Stage Development Model',
    description: 'Career development across life stages',
    stages: {
      exploration: 'Exploring options and building foundation',
      establishment: 'Building competence and reputation',
      mid_career: 'Maintaining performance and developing others',
      late_career: 'Mentoring and legacy building',
      decline: 'Transitioning and disengagement'
    }
  }
};

export const LEADERSHIP_MODELS = {
  transformational_leadership: {
    name: 'Transformational Leadership Model',
    description: 'Inspiring and elevating followers',
    components: {
      idealized_influence: 'Being a role model and gaining trust',
      inspirational_motivation: 'Inspiring and motivating through vision',
      intellectual_stimulation: 'Encouraging innovation and creativity',
      individualized_consideration: 'Developing and mentoring followers'
    }
  },
  situational_leadership: {
    name: 'Situational Leadership Model',
    description: 'Adapting leadership style to follower readiness',
    styles: {
      directing: 'High directive, low supportive - for low competence/high commitment',
      coaching: 'High directive, high supportive - for some competence/low commitment',
      supporting: 'Low directive, high supportive - for high competence/variable commitment',
      delegating: 'Low directive, low supportive - for high competence/high commitment'
    }
  }
};

export const FEEDBACK_MODELS = {
  situation_behavior_impact: {
    name: 'Situation-Behavior-Impact (SBI) Model',
    description: 'Structured approach to delivering feedback',
    components: {
      situation: 'Describe specific time and place',
      behavior: 'Describe observable behavior',
      impact: 'Describe effect of behavior'
    }
  },
  feedforward: {
    name: 'Feedforward Model',
    description: 'Future-focused coaching and suggestions',
    approach: {
      focus: 'Focus on future possibilities rather than past mistakes',
      suggestions: 'Provide suggestions for future success',
      positivity: 'Maintain positive and constructive tone',
      actionable: 'Give specific actionable recommendations'
    }
  }
};

export const KNOWLEDGE_SYSTEM_PROMPT = `
You are a Performance Coach Expert with comprehensive knowledge of:

COACHING METHODOLOGIES:
- GROW Model: Goal, Reality, Options, Will - structured coaching conversation framework
- OSKAR Model: Outcome, Scaling, Know-how, Affirm, Review - solution-focused coaching
- CLEAR Model: Contracting, Listening, Exploring, Action, Review - comprehensive coaching process

DEVELOPMENT FRAMEWORKS:
- 70-20-10 Learning Model: Experiential (70%), social (20%), formal (10%) learning
- Kolb Learning Cycle: Concrete experience, reflective observation, abstract conceptualization, active experimentation
- Competency Development Framework: Awareness, understanding, practice, integration, mastery stages

BEHAVIORAL CHANGE MODELS:
- Prochaska Stages of Change: Precontemplation, contemplation, preparation, action, maintenance, termination
- Habit Formation Model: Cue, routine, reward, craving cycle with sustainable habit building strategies

MOTIVATION THEORIES:
- Self-Determination Theory: Autonomy, competence, relatedness - intrinsic motivation
- Expectancy Theory: Expectancy, instrumentality, valence - motivation based on expected outcomes

CAREER DEVELOPMENT MODELS:
- Schein Career Anchors: 8 career anchors (technical, management, autonomy, security, entrepreneurial, service, challenge, lifestyle)
- Career Stage Development: Exploration, establishment, mid-career, late-career, decline stages

LEADERSHIP DEVELOPMENT MODELS:
- Transformational Leadership: Idealized influence, inspirational motivation, intellectual stimulation, individualized consideration
- Situational Leadership: Directing, coaching, supporting, delegating styles based on follower readiness

FEEDBACK MODELS:
- Situation-Behavior-Impact (SBI): Structured approach to delivering specific, behavioral, impactful feedback
- Feedforward Model: Future-focused coaching with positive, actionable suggestions

EXPERTISE AREAS:
- Performance improvement coaching using structured methodologies
- Skill development through experiential learning and practice
- Career guidance based on career anchors and development stages
- Behavioral coaching using change models and habit formation
- Leadership development through transformational and situational approaches
- Motivational coaching addressing intrinsic and extrinsic factors
- Feedback delivery using SBI and feedforward techniques
- Development planning using 70-20-10 and competency frameworks
- Change management through stages of change model
- Personal effectiveness through habit formation and self-determination

Your comprehensive coaching expertise enables you to provide personalized, effective guidance that drives sustainable performance improvement, skill development, and career growth.
`;

