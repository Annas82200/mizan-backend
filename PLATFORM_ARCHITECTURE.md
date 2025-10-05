# Mizan Platform - Complete Architecture Documentation

## Executive Summary

Mizan is an AI-powered HR platform built on a **trigger-based orchestration system** where modules communicate through a unified trigger engine. The platform uses the **"7 Cylinders" framework** as its cultural foundation.

**Core Philosophy**: Modules don't call each other directly - they emit triggers that the orchestrator routes to appropriate handlers.

---

## Platform Architecture

### 1. Core Components

#### 1.1 Trigger Engine (`services/results/trigger-engine.ts`)
**Purpose**: Central orchestration hub that routes triggers between modules

**Flow**:
```
Input: UnifiedResults (from any analysis) + tenantId
Process:
  1. Extract triggers from analysis results
  2. Determine target modules based on trigger type
  3. Route to appropriate module handlers
Output: Array of executed trigger results
```

**Key Functions**:
- `runTriggers(snapshot: UnifiedResults & { tenantId: string })` → Routes triggers to modules
- Handles 26+ trigger types across all modules

#### 1.2 Database Schema (`db/schema/`)
**Organized by Module**:
- `performance.ts` - Performance reviews, goals, feedback, improvement plans, metrics
- `hiring.ts` - Requisitions, candidates, assessments, interviews
- `lxp.ts` (extended) - Courses, learning paths, enrollments, assessments, analytics
- `missing-tables.ts` - Social media, campaigns, HR core tables

**Key Pattern**: All tables have:
- `tenantId` - Multi-tenancy support
- `createdAt/updatedAt` - Audit trails
- `metadata` JSONB - Flexible structured data
- Proper foreign key relationships

---

## Module Architecture

### 2. LXP Module (Learning & Experience Platform)

**Location**: `services/modules/lxp/`

#### 2.1 LXP Orchestrator (`core/lxp-orchestrator.ts`)
**Purpose**: Routes LXP triggers to appropriate workflows

**Trigger Types Handled**:
- `learning_progress_update`
- `lxp_training_completion`
- `training_completion`
- `onboarding_completion`
- `course_completion`
- `skill_gap_detected`
- `culture_learning_needed`
- `assessment_required`

**Flow**:
```
Input: LXPTriggerContext {
  tenantId: string
  employeeId: string
  triggerType: (one of above)
  triggerData: any
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical'
  priority: number
}

Process:
  1. Validate trigger context
  2. Route to workflow based on triggerType
  3. Execute workflow
  4. Store results in database

Output: LXPTriggerResult {
  success: boolean
  triggerType: string
  results: any
  nextActions: any[]
}
```

#### 2.2 LXP Workflows

##### 2.2.1 Learning Path Creation (`workflows/learning-path-creation.ts`)
**Purpose**: Creates personalized learning paths based on triggers

**Input**: LXPTriggerContext
**Process**:
1. Identify learning needs from trigger
2. Design learning path using LearningPathDesignerAgent
3. Generate scenario games using ScenarioGameEngine
4. Store learning path in database

**Output**: Learning path with courses, games, and timeline

##### 2.2.2 Progress Tracking (`workflows/progress-tracking.ts`)
**Purpose**: Tracks employee learning progress and identifies interventions

**Input**: LXPTriggerContext
**Process**:
1. Gather progress data (enrollments, completions, assessments)
2. Analyze using LearningProgressTracker agent
3. Identify risks and opportunities
4. Generate recommendations

**Output**: Progress analysis with intervention recommendations

##### 2.2.3 Course Completion (`workflows/course-completion.ts`)
**Purpose**: Handles course completion workflow

**Input**: LXPTriggerContext with courseId, employeeId
**Process**:
1. Validate completion
2. Update learning progress
3. Trigger skill validation
4. Generate next course recommendations

**Output**: Completion record + skill updates

##### 2.2.4 Assessment Engine (`workflows/assessment-engine.ts`)
**Purpose**: Generates and scores assessments

**Input**: Assessment requirements from trigger
**Process**:
1. Generate assessment using LearningAssessmentAgent
2. Score responses
3. Validate skill acquisition
4. Store results

**Output**: Assessment results + skill validation

#### 2.3 LXP Agents

##### 2.3.1 Learning Path Designer Agent (`agents/lxp/learning-path-designer.ts`)
**Purpose**: AI-powered learning path design

**Input**: `LearningPathDesignInput`
```typescript
{
  tenantId: string
  employeeId: string
  triggerType: string
  employeeProfile: {
    currentSkills: string[]
    skillGaps: string[]
    learningHistory: any[]
    role: string
    department: string
  }
  availableCourses: any[]
  organizationalContext: {
    cultureValues: string[]
    strategicGoals: string[]
  }
}
```

**Output**: Structured learning path with courses, timeline, milestones

##### 2.3.2 Learning Progress Tracker (`agents/lxp/learning-progress-tracker.ts`)
**Purpose**: Analyzes learning progress patterns

**Input**: `LearningProgressInput`
**Output**: Progress insights, risk factors, predictions

##### 2.3.3 Scenario Game Engine (`agents/lxp/scenario-game-engine.ts`)
**Purpose**: Generates interactive learning scenarios

**Input**: `ScenarioGameInput`
**Output**: Interactive scenario with decisions, feedback, scoring

#### 2.4 LXP Integrations

##### 2.4.1 Skills Analysis Integration (`integrations/skills-integration.ts`)
**Purpose**: Bidirectional communication with Skills Analysis Module

**Functions**:
- `validateSkillAcquisition()` - Validates skill from course completion
- `notifySkillsAnalysisOfUpdates()` - Sends skill updates to Skills module
- `requestSkillGapAnalysis()` - Requests skill gap analysis

**Data Flow**:
```
LXP → Skills: Skill acquisition from course
Skills → LXP: Skill validation result
LXP → Skills: Confirmed skill update
Skills → LXP: Skill gap triggers
```

---

### 3. Performance Module

**Location**: `services/modules/performance/`

#### 3.1 Performance Module Main (`performance-module.ts`)
**Purpose**: Orchestrates all performance management workflows

**Trigger Types Handled**:
- `performance_review_trigger`
- `goal_setting_trigger`
- `coaching_trigger`
- `feedback_trigger`

**Flow**: Similar to LXP - routes triggers to workflows

#### 3.2 Performance Workflows

##### 3.2.1 Performance Review (`workflows/review.ts`)
**Purpose**: Conducts AI-assisted performance reviews

**Input**: `PerformanceReviewWorkflowInput`
```typescript
{
  tenantId: string
  employeeId: string
  reviewerId: string
  reviewType: 'annual' | 'quarterly' | 'monthly' | 'probation' | '360_degree'
  period: { startDate: string, endDate: string }
  include360Feedback?: boolean
}
```

**Process**:
1. Gather performance data (goals, feedback, metrics)
2. Analyze using PerformanceReviewAgent
3. Calculate scores and ratings
4. Generate recommendations
5. Store review in database
6. Emit output triggers (rewards, coaching, etc.)

**Output**: Performance review record + next action triggers

##### 3.2.2 Goal Setting (`workflows/goal-setting.ts`)
**Purpose**: AI-assisted goal creation and alignment

**Input**: `GoalSettingWorkflowInput`
**Process**:
1. Analyze context (role, performance, org goals)
2. Generate SMART goals using GoalSetterAgent
3. Validate alignment
4. Store goals in database

**Output**: Array of performance goals

##### 3.2.3 Coaching (`workflows/coaching.ts`)
**Purpose**: Creates personalized coaching/improvement plans

**Input**: `CoachingWorkflowInput`
**Process**:
1. Identify performance gaps
2. Generate coaching plan using PerformanceCoachAgent
3. Create improvement plan
4. Schedule check-ins
5. Store in database

**Output**: Performance improvement plan

##### 3.2.4 Progress Tracking (`workflows/tracking.ts`)
**Purpose**: Monitors goal progress and performance metrics

**Input**: Employee goals and metrics
**Process**:
1. Calculate progress percentages
2. Identify at-risk goals
3. Update performance metrics
4. Generate alerts

**Output**: Progress updates + performance metrics

#### 3.3 Performance Agents

##### 3.3.1 Performance Analyzer (`agents/performance/performance-analyzer.ts`)
**Purpose**: Analyzes performance data for reviews

**Input**: Performance data (goals, feedback, metrics)
**Output**: Comprehensive analysis with scores, strengths, development areas

##### 3.3.2 Performance Coach (`agents/performance/performance-coach.ts`)
**Purpose**: Generates personalized coaching plans

**Input**: Performance gaps + employee profile
**Output**: Coaching plan with action items, resources, timeline

##### 3.3.3 Goal Setter (`agents/performance/goal-setter.ts`)
**Purpose**: Generates SMART goals aligned with org objectives

**Input**: Employee context + organizational goals
**Output**: Set of aligned, measurable goals

#### 3.4 Performance API Endpoints

##### 3.4.1 Reviews API (`api/reviews.ts`)
- `POST /reviews` - Create review
- `GET /reviews/:employeeId` - Get employee reviews
- `PUT /reviews/:id` - Update review
- `GET /reviews/:id` - Get specific review

##### 3.4.2 Goals API (`api/goals.ts`)
- `POST /goals` - Create goal (manual or AI-generated)
- `GET /goals/:employeeId` - Get employee goals
- `PUT /goals/:id/progress` - Update progress
- `GET /goals/:id` - Get specific goal

##### 3.4.3 Feedback API (`api/feedback.ts`)
- `POST /feedback` - Submit feedback
- `GET /feedback/:employeeId` - Get employee feedback
- `POST /feedback/request` - Request feedback

##### 3.4.4 Coaching API (`api/coaching.ts`)
- `POST /coaching/plan` - Create coaching plan
- `GET /coaching/:employeeId` - Get coaching plans

---

### 4. Hiring Module

**Location**: `services/modules/hiring/`

#### 4.1 Hiring Module Main (`hiring-module.ts`)
**Purpose**: Manages recruitment lifecycle

**Trigger Types Handled**:
- `hiring_need_identified` (from Structure Module)
- `culture_assessment_required`
- `candidate_screening_required`

#### 4.2 Hiring Workflows

##### 4.2.1 Requisition Management (`workflows/requisition-management.ts`)
**Purpose**: Creates and manages job requisitions

**Input**: Hiring need or manual requisition
**Process**:
1. Create requisition record
2. Generate job description using JobPostingGenerator
3. Assess culture fit requirements using CultureFitAssessor
4. Publish to job boards

**Output**: Active requisition

##### 4.2.2 Candidate Screening (`workflows/screening.ts`)
**Purpose**: AI-powered candidate screening

**Input**: `CandidateScreeningInput`
```typescript
{
  tenantId: string
  candidateId: string
  requisitionId: string
  assessmentType: 'resume_review' | 'technical' | 'culture_fit'
}
```

**Process**:
1. Gather candidate data (resume, application)
2. Assess using CandidateAssessorAgent
3. Evaluate skills, experience, culture fit
4. Generate recommendation
5. Store assessment

**Output**: Assessment with hire recommendation

##### 4.2.3 Interview Scheduling (`workflows/interview-scheduling.ts`)
**Purpose**: Manages interview process

**Input**: Candidate + requisition + interviewers
**Process**:
1. Generate interview questions using InterviewBot
2. Schedule interview slots
3. Send notifications
4. Track interview completion

**Output**: Interview schedule + questions

#### 4.3 Hiring Agents

##### 4.3.1 Candidate Assessor (`core/candidate-assessor.ts`)
**Purpose**: Comprehensive candidate evaluation

**Input**: Candidate profile + job requirements
**Output**: Detailed assessment with scores, recommendation

##### 4.3.2 Culture Fit Assessor (`core/culture-fit-assessor.ts`)
**Purpose**: Evaluates candidate-culture alignment

**Input**: Candidate + company culture (7 Cylinders)
**Output**: Culture fit score + alignment analysis

##### 4.3.3 Interview Bot (`core/interview-bot.ts`)
**Purpose**: Generates customized interview questions

**Input**: Job requirements + assessment results
**Output**: Role-specific interview questions

##### 4.3.4 Job Posting Generator (`core/job-posting-generator.ts`)
**Purpose**: Creates compelling job descriptions

**Input**: Requisition details + company culture
**Output**: Formatted job posting

#### 4.4 Hiring Integrations

##### 4.4.1 Culture Integration (`integrations/culture-integration.ts`)
**Purpose**: Connects with Culture Analysis for candidate assessment

**Functions**:
- `assessCandidateCultureFit()` - Evaluates candidate against culture
- `getCandidateCultureAssessments()` - Retrieves assessments
- `updateCultureFitAssessment()` - Updates assessment

##### 4.4.2 Structure Integration (`integrations/structure-integration.ts`)
**Purpose**: Receives hiring needs from Organizational Structure

**Functions**:
- `processStructureTrigger()` - Handles hiring need triggers
- `createRequisitionFromHiringNeed()` - Converts need to requisition
- `getHiringNeedsByStructureAnalysis()` - Retrieves needs

#### 4.5 Hiring API Endpoints

##### 4.5.1 Requisitions API (`api/requisitions.ts`)
- `POST /requisitions` - Create requisition
- `GET /requisitions` - List requisitions
- `PUT /requisitions/:id` - Update requisition

##### 4.5.2 Candidates API (`api/candidates.ts`)
- `POST /candidates` - Add candidate
- `GET /candidates` - List candidates
- `PUT /candidates/:id/stage` - Update candidate stage

##### 4.5.3 Assessments API (`api/assessments.ts`)
- `POST /assessments` - Create assessment
- `GET /assessments/:candidateId` - Get candidate assessments

---

### 5. Agent Infrastructure

**Location**: `services/agents/`

#### 5.1 Base Agent Architecture

##### 5.1.1 Three Engine Agent (`base/three-engine-agent.ts`)
**Purpose**: Base class for all AI agents using 3-engine pattern

**Engines**:
1. **Knowledge Engine** - Domain expertise and rules
2. **Action Engine** - Execution and decision making
3. **Structure Engine** - Output formatting and validation

**Flow**:
```
Input → Knowledge Engine (analyze) → Action Engine (decide) → Structure Engine (format) → Output
```

**Key Methods**:
- `buildKnowledgePrompt()` - Creates domain-specific prompt
- `processData()` - Executes 3-engine flow
- `validateOutput()` - Ensures output quality

##### 5.1.2 EnsembleAI (`base/ensemble-ai.ts`)
**Purpose**: Multi-provider AI with fallback and consensus

**Strategies**:
- `weighted` - Weighted combination of providers
- `fallback` - Sequential fallback on failure
- `best_of_n` - Generate multiple, pick best
- `consensus` - Require agreement across providers

**Providers Supported**: Anthropic (Claude), OpenAI (GPT), Google (Gemini)

#### 5.2 Specialized Agents

##### 5.2.1 Culture Agent (`agents/culture-agent.ts`)
**Purpose**: Analyzes organizational culture using 7 Cylinders

**Input**: Company/department/team data
**Output**: Culture analysis with cylinder scores, gaps, recommendations

##### 5.2.2 Skills Agent (`agents/skills-agent.ts`)
**Purpose**: Analyzes skill gaps and creates development plans

**Input**: Employee skills + target role/goals
**Output**: Skill gap analysis with learning recommendations

##### 5.2.3 Structure Agent (`agents/structure/structure-agent.ts`)
**Purpose**: Analyzes organizational structure

**Input**: Org chart, roles, headcount
**Output**: Structure analysis with hiring needs, optimization recommendations

---

### 6. Supporting Services

#### 6.1 Social Media Module (`services/social-media/`)
**Purpose**: Automated content generation and publishing for **Mizan Platform** marketing and brand awareness

**Content Focus**:
- Mizan platform features and capabilities
- 7 Cylinders framework education and insights
- HR technology thought leadership
- AI-powered HR innovation content
- Customer success stories
- Industry trends and best practices

**Components**:
- `content-generator.ts` - AI content generation for Mizan marketing
- `scheduler.ts` - Post scheduling across social platforms
- `campaign-manager.ts` - Campaign orchestration for Mizan brand
- `platforms/` - Platform-specific integrations (Twitter, LinkedIn, Facebook)

**Content Types Generated**:
1. **7 Cylinders Content** - Educational posts about each cylinder
2. **Platform Features** - Showcase Mizan capabilities (LXP, Performance, Hiring)
3. **AI Innovation** - Highlight AI-powered HR solutions
4. **Thought Leadership** - HR trends, insights, best practices
5. **Success Stories** - Customer testimonials and case studies

**Flow**:
```
Content Strategy → AI Generate Mizan Content → Schedule Posts → Publish to Social Media → Track Engagement → Optimize
```

**Example Content**:
- "Innovation Cylinder: How Mizan's AI helps companies foster creative cultures 🚀"
- "Reduce hiring time by 50% with Mizan's AI-powered candidate screening ⚡"
- "The future of performance reviews: AI-assisted, bias-free, data-driven 📊"

#### 6.2 Monitoring & Health (`services/monitoring/`)
**Purpose**: Platform health and metrics

**Components**:
- `health-check.ts` - System health endpoints
- `metrics.ts` - Performance metrics collection
- Prometheus integration for monitoring

---

## Data Flow Patterns

### Pattern 1: Cross-Module Trigger Flow
```
Module A Analysis
  ↓
Extract Triggers
  ↓
Trigger Engine (runTriggers)
  ↓
Route to Module B
  ↓
Module B Workflow
  ↓
Store Results + Generate New Triggers
  ↓
Loop continues...
```

### Pattern 2: Agent Execution Flow
```
Input Data
  ↓
Agent.processData()
  ↓
Knowledge Engine (buildKnowledgePrompt)
  ↓
EnsembleAI.generate() [Multi-provider AI]
  ↓
Action Engine (process response)
  ↓
Structure Engine (format output)
  ↓
Validate & Return
```

### Pattern 3: Database Pattern
```
All tables include:
- tenantId (multi-tenancy)
- Primary ID (UUID)
- Timestamps (createdAt, updatedAt)
- Audit fields (createdBy, updatedBy where applicable)
- Metadata JSONB (flexible structured data)
- Proper foreign keys and relations
```

---

## Key Platform Concepts

### 1. Seven Cylinders Framework
**The foundational cultural assessment framework that powers all Mizan modules.**

A values-based system measuring organizational culture across seven progressive dimensions:

#### Cylinder 1: Safety & Survival
**Ethical Principle**: Preservation of Life
**Definition**: Protecting life and dignity by ensuring health, stability, and freedom from harm.
**Enabling Values**: Safety, Stability, Preparedness, Wellbeing
**Limiting Values**: Fear, Neglect, Instability, Complacency

#### Cylinder 2: Belonging & Loyalty
**Ethical Principle**: Human Dignity
**Definition**: Fostering genuine connection, trust, and shared identity within teams.
**Enabling Values**: Inclusion, Trust, Collaboration, Compassion
**Limiting Values**: Cliquishness, Bias, Distrust, Favoritism

#### Cylinder 3: Growth & Achievement
**Ethical Principle**: Striving with Excellence
**Definition**: Encouraging learning, mastery, and performance that honor both excellence and humility.
**Enabling Values**: Discipline, Learning, Ambition, Accountability
**Limiting Values**: Ego, Burnout, Competition, Arrogance

#### Cylinder 4: Meaning & Contribution
**Ethical Principle**: Service
**Definition**: Connecting personal and collective work to purpose and long-term impact.
**Enabling Values**: Purpose, Stewardship, Empowerment, Recognition
**Limiting Values**: Apathy, Self-interest, Cynicism, Disconnection

#### Cylinder 5: Integrity & Justice
**Ethical Principle**: Justice and Accountability
**Definition**: Upholding truth, fairness, and ethical responsibility as the foundation of trust.
**Enabling Values**: Integrity, Fairness, Transparency, Courage
**Limiting Values**: Deception, Injustice, Blame, Corruption

#### Cylinder 6: Wisdom & Compassion
**Ethical Principle**: Mercy and Knowledge
**Definition**: Integrating intellect and empathy to lead with understanding and balance.
**Enabling Values**: Humility, Empathy, Discernment, Patience
**Limiting Values**: Pride, Indifference, Impulsiveness, Judgmentalism

#### Cylinder 7: Transcendence & Unity
**Ethical Principle**: Unity of Being
**Definition**: Achieving harmony between self, others, and the greater purpose of existence.
**Enabling Values**: Alignment, Gratitude, Purposeful Reflection, Harmony
**Limiting Values**: Division, Materialism, Alienation, Despair

---

**Framework Application Across Mizan**:
- **Culture Analysis**: Measures organizational alignment across all 7 cylinders
- **Hiring**: Assesses candidate values alignment with company culture
- **Performance**: Evaluates behaviors and achievements through cylinder lens
- **Learning**: Designs development paths addressing cylinder gaps
- **Leadership**: Identifies leaders who embody enabling values

### 2. Trigger-Based Architecture
- Modules communicate through triggers, not direct calls
- Enables loose coupling and scalability
- Central orchestration through trigger engine
- Supports async processing and event sourcing

### 3. AI-First Design
- Every major workflow has AI agent support
- Multi-provider AI with fallback (EnsembleAI)
- 3-engine pattern ensures quality and consistency
- Human oversight through approval workflows

### 4. Multi-Tenancy
- All data scoped by tenantId
- Complete data isolation between tenants
- Shared infrastructure, isolated data

---

## Database Schema Summary

### Performance Tables
- `performanceGoals` - Employee goals with progress tracking
- `performanceReviews` - Review records with ratings
- `performanceFeedback` - 360-degree feedback
- `performanceImprovementPlans` - PIP records
- `performanceMetrics` - Quantitative metrics

### Hiring Tables
- `hiringRequisitions` - Job requisitions
- `candidates` - Candidate profiles
- `candidateAssessments` - Assessment results
- `interviews` - Interview scheduling and feedback

### LXP Tables
- `courses` - Course catalog
- `learningPaths` - Learning path definitions
- `courseEnrollments` - Enrollment tracking
- `courseAssessments` - Assessment definitions
- `assessmentResults` - Assessment scores
- `learningAnalytics` - Learning metrics
- `learningProgress` - Progress tracking

### HR Core Tables
- `employees` - Employee master data
- `departments` - Organizational departments
- `positions` - Job positions/roles
- `skillsInventory` - Skills catalog

### Supporting Tables
- `cultureReports` - Culture analysis results
- `skillsReports` - Skills analysis results
- `structureReports` - Org structure analysis
- `socialMediaPosts` - Social media content
- `socialMediaCampaigns` - Marketing campaigns

---

## API Architecture

### REST Endpoints Pattern
```
/api/{module}/{resource}
```

### Common Patterns
- `POST /{resource}` - Create
- `GET /{resource}` - List with filters
- `GET /{resource}/:id` - Get specific
- `PUT /{resource}/:id` - Update
- `DELETE /{resource}/:id` - Delete

### Authentication & Authorization
- JWT-based authentication
- Multi-tenant isolation through tenantId
- Role-based access control (RBAC)

---

## Testing Requirements

Based on this documentation, we need to test:

### 1. Module Integration Tests
- Each trigger type flows correctly through orchestrator
- Cross-module communication works as documented
- Data flows match documented patterns

### 2. Agent Execution Tests
- Each agent produces expected output format
- 3-engine pattern executes correctly
- Multi-provider fallback works

### 3. Database Tests
- All inserts match schema requirements
- Foreign keys maintain referential integrity
- JSONB fields store/retrieve correctly

### 4. API Tests
- All endpoints return expected responses
- Input validation works correctly
- Error handling is consistent

### 5. Workflow Tests
- Each workflow completes successfully
- Trigger emissions are correct
- State management is proper

---

## Next Steps

1. **Review this document** - Verify accuracy against your understanding
2. **Identify gaps** - Point out any missing or incorrect information
3. **Run comprehensive tests** - Validate every function against this specification
4. **Update documentation** - Refine based on test results

---

*Generated: 2025-10-04*
*Platform Version: 1.0*
*Last Type Check: 0 errors ✅*
