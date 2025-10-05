# Mizan Platform - Testing Specification

## Overview

This document defines comprehensive tests to validate that every function operates according to the [Platform Architecture Documentation](./PLATFORM_ARCHITECTURE.md).

---

## Test Categories

### 1. Trigger Engine Tests
**File**: `__tests__/trigger-engine.test.ts`

#### Test 1.1: Basic Trigger Routing
```typescript
describe('Trigger Engine - Basic Routing', () => {
  test('should route LXP triggers to LXP module', async () => {
    const snapshot: UnifiedResults = {
      triggers: [{
        triggerType: 'skill_gap_detected',
        targetModule: 'lxp_module',
        data: { skillGaps: [...] }
      }]
    }

    const result = await runTriggers({ ...snapshot, tenantId: 'test-tenant' })

    expect(result).toHaveLength(1)
    expect(result[0].module).toBe('lxp_module')
    expect(result[0].success).toBe(true)
  })
})
```

#### Test 1.2: Multi-Trigger Processing
```typescript
test('should process multiple triggers from same analysis', async () => {
  const snapshot: UnifiedResults = {
    triggers: [
      { triggerType: 'skill_gap_detected', targetModule: 'lxp_module', data: {...} },
      { triggerType: 'coaching_trigger', targetModule: 'performance_module', data: {...} }
    ]
  }

  const results = await runTriggers({ ...snapshot, tenantId: 'test-tenant' })

  expect(results).toHaveLength(2)
  expect(results.every(r => r.success)).toBe(true)
})
```

#### Test 1.3: Error Handling
```typescript
test('should handle trigger processing errors gracefully', async () => {
  const snapshot: UnifiedResults = {
    triggers: [{
      triggerType: 'invalid_trigger',
      targetModule: 'non_existent_module',
      data: {}
    }]
  }

  const results = await runTriggers({ ...snapshot, tenantId: 'test-tenant' })

  expect(results[0].success).toBe(false)
  expect(results[0].error).toBeDefined()
})
```

---

### 2. LXP Module Tests

#### 2.1 LXP Orchestrator Tests
**File**: `__tests__/lxp/orchestrator.test.ts`

```typescript
describe('LXP Orchestrator', () => {
  test('should route skill_gap_detected to learning path creation', async () => {
    const context: LXPTriggerContext = {
      tenantId: 'test-tenant',
      employeeId: 'emp-123',
      triggerType: 'skill_gap_detected',
      triggerData: {
        skillGaps: [
          { skillId: 'js', skillName: 'JavaScript', gap: 2 }
        ]
      },
      urgencyLevel: 'high',
      priority: 8
    }

    const result = await lxpOrchestrator.processLXPTrigger(context)

    expect(result.success).toBe(true)
    expect(result.results.learningPath).toBeDefined()
    expect(result.results.learningPath.courses).toBeArray()
  })

  test('should route course_completion to progress tracking', async () => {
    const context: LXPTriggerContext = {
      tenantId: 'test-tenant',
      employeeId: 'emp-123',
      triggerType: 'course_completion',
      triggerData: {
        courseId: 'course-123',
        completionDate: new Date()
      },
      urgencyLevel: 'medium',
      priority: 5
    }

    const result = await lxpOrchestrator.processLXPTrigger(context)

    expect(result.success).toBe(true)
    expect(result.results.skillValidation).toBeDefined()
  })
})
```

#### 2.2 Learning Path Creation Tests
**File**: `__tests__/lxp/learning-path-creation.test.ts`

```typescript
describe('Learning Path Creation Workflow', () => {
  test('should create learning path from skill gaps', async () => {
    const input: LearningPathDesignInput = {
      tenantId: 'test-tenant',
      employeeId: 'emp-123',
      triggerType: 'skill_gap_detected',
      triggerData: { skillGaps: [...] },
      employeeProfile: {
        currentSkills: ['HTML', 'CSS'],
        skillGaps: ['JavaScript', 'React'],
        learningHistory: [],
        role: 'Frontend Developer',
        department: 'Engineering',
        experience: 'junior'
      },
      availableCourses: [...],
      organizationalContext: {
        cultureValues: ['innovation', 'excellence'],
        strategicGoals: ['Digital Transformation'],
        departmentNeeds: {}
      }
    }

    const result = await learningPathCreation.execute(context)

    expect(result.learningPath).toBeDefined()
    expect(result.learningPath.courses).toBeArray()
    expect(result.learningPath.estimatedDuration).toBeNumber()
    expect(result.scenarioGames).toBeArray()
  })

  test('should generate scenario games for learning path', async () => {
    // Test scenario game generation
    const result = await learningPathCreation.execute(context)

    expect(result.scenarioGames).toBeArray()
    expect(result.scenarioGames[0]).toMatchObject({
      gameType: expect.stringMatching(/scenario_based|simulation|role_play/),
      scenario: expect.any(Object),
      learningObjectives: expect.arrayContaining([expect.any(String)])
    })
  })
})
```

#### 2.3 Skills Integration Tests
**File**: `__tests__/lxp/skills-integration.test.ts`

```typescript
describe('Skills Analysis Integration', () => {
  test('should validate skill acquisition from course completion', async () => {
    const validationData = {
      employeeId: 'emp-123',
      tenantId: 'test-tenant',
      skillId: 'javascript',
      skillName: 'JavaScript',
      courseId: 'course-123',
      assessmentResults: { score: 85 }
    }

    const result = await skillsIntegration.validateSkillAcquisition(validationData)

    expect(result.validated).toBe(true)
    expect(result.confidence).toBeGreaterThan(0.7)
    expect(result.evidence).toBeArray()
  })

  test('should notify skills module of skill updates', async () => {
    const skillUpdate: SkillUpdate = {
      employeeId: 'emp-123',
      tenantId: 'test-tenant',
      skillId: 'javascript',
      skillName: 'JavaScript',
      previousLevel: 2,
      newLevel: 3,
      confidence: 0.85,
      validated: true,
      updateSource: 'course_completion',
      courseId: 'course-123',
      completionDate: new Date(),
      evidence: ['Completed advanced course', 'Passed assessment']
    }

    const result = await skillsIntegration.notifySkillsAnalysisOfUpdates(
      'emp-123',
      'test-tenant',
      [skillUpdate]
    )

    expect(result.success).toBe(true)
  })
})
```

---

### 3. Performance Module Tests

#### 3.1 Performance Review Workflow Tests
**File**: `__tests__/performance/review.test.ts`

```typescript
describe('Performance Review Workflow', () => {
  test('should conduct annual performance review', async () => {
    const input: PerformanceReviewWorkflowInput = {
      tenantId: 'test-tenant',
      employeeId: 'emp-123',
      reviewerId: 'manager-456',
      reviewType: 'annual',
      period: {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      },
      include360Feedback: true
    }

    const result = await performanceReviewWorkflow.execute(input)

    expect(result.review).toBeDefined()
    expect(result.review.overallRating).toBeNumber()
    expect(result.review.competencyRatings).toBeDefined()
    expect(result.review.recommendations).toBeArray()
    expect(result.outputTriggers).toBeArray()
  })

  test('should generate appropriate output triggers based on performance', async () => {
    // High performance should trigger reward
    const highPerformanceInput = { ...baseInput, expectedScore: 95 }
    const result = await performanceReviewWorkflow.execute(highPerformanceInput)

    const rewardTrigger = result.outputTriggers.find(t => t.triggerType === 'reward_trigger')
    expect(rewardTrigger).toBeDefined()

    // Low performance should trigger coaching
    const lowPerformanceInput = { ...baseInput, expectedScore: 55 }
    const result2 = await performanceReviewWorkflow.execute(lowPerformanceInput)

    const coachingTrigger = result2.outputTriggers.find(t => t.triggerType === 'coaching_trigger')
    expect(coachingTrigger).toBeDefined()
  })
})
```

#### 3.2 Goal Setting Tests
**File**: `__tests__/performance/goal-setting.test.ts`

```typescript
describe('Goal Setting Workflow', () => {
  test('should generate SMART goals for employee', async () => {
    const input: GoalSettingWorkflowInput = {
      tenantId: 'test-tenant',
      employeeId: 'emp-123',
      managerId: 'manager-456',
      context: {
        role: 'Software Engineer',
        currentPerformance: 'meets_expectations',
        organizationalGoals: ['Increase deployment frequency']
      }
    }

    const result = await goalSettingWorkflow.execute(input)

    expect(result.goals).toBeArray()
    expect(result.goals.length).toBeGreaterThan(0)

    result.goals.forEach(goal => {
      expect(goal).toMatchObject({
        title: expect.any(String),
        description: expect.any(String),
        type: expect.stringMatching(/individual|team|departmental|organizational/),
        category: expect.any(String),
        target: expect.any(Object),
        deadline: expect.any(String)
      })
    })
  })

  test('should store goals in database with correct schema', async () => {
    const result = await goalSettingWorkflow.execute(input)

    const storedGoals = await db.query.performanceGoals.findMany({
      where: eq(performanceGoals.employeeId, 'emp-123')
    })

    expect(storedGoals).toHaveLength(result.goals.length)
    expect(storedGoals[0]).toMatchObject({
      tenantId: expect.any(String),
      employeeId: 'emp-123',
      managerId: 'manager-456',
      createdBy: expect.any(String),
      updatedBy: expect.any(String),
      status: 'active'
    })
  })
})
```

#### 3.3 Coaching Workflow Tests
**File**: `__tests__/performance/coaching.test.ts`

```typescript
describe('Coaching Workflow', () => {
  test('should create performance improvement plan', async () => {
    const input: CoachingWorkflowInput = {
      tenantId: 'test-tenant',
      employeeId: 'emp-123',
      coachId: 'coach-456',
      reason: 'performance_improvement',
      coachingType: 'performance',
      performanceData: {
        currentPerformance: 'needs_improvement',
        gapAreas: ['Technical Skills', 'Communication']
      }
    }

    const result = await coachingWorkflow.execute(input)

    expect(result.improvementPlan).toBeDefined()
    expect(result.improvementPlan).toMatchObject({
      performanceIssues: expect.arrayContaining([expect.any(Object)]),
      objectives: expect.arrayContaining([expect.any(Object)]),
      successCriteria: expect.arrayContaining([expect.any(Object)]),
      actionItems: expect.arrayContaining([expect.any(Object)]),
      targetTimeline: expect.any(Number)
    })
  })
})
```

---

### 4. Hiring Module Tests

#### 4.1 Candidate Screening Tests
**File**: `__tests__/hiring/screening.test.ts`

```typescript
describe('Candidate Screening Workflow', () => {
  test('should screen candidate resume', async () => {
    const input: CandidateScreeningInput = {
      tenantId: 'test-tenant',
      candidateId: 'cand-123',
      requisitionId: 'req-456',
      assessmentType: 'resume_review'
    }

    const result = await candidateScreening.execute(input)

    expect(result.assessment).toBeDefined()
    expect(result.assessment).toMatchObject({
      overallScore: expect.any(Number),
      skillsAssessment: expect.any(Object),
      experienceAssessment: expect.any(Object),
      cultureFitAssessment: expect.any(Object),
      recommendation: expect.stringMatching(/strong_hire|hire|maybe|no_hire|strong_no_hire/)
    })
  })

  test('should store assessment with correct type', async () => {
    const result = await candidateScreening.execute(input)

    const stored = await db.query.candidateAssessments.findFirst({
      where: and(
        eq(candidateAssessments.candidateId, 'cand-123'),
        eq(candidateAssessments.assessmentType, 'resume_review')
      )
    })

    expect(stored).toBeDefined()
    expect(stored?.assessmentType).toBe('resume_review')
  })
})
```

#### 4.2 Culture Integration Tests
**File**: `__tests__/hiring/culture-integration.test.ts`

```typescript
describe('Hiring-Culture Integration', () => {
  test('should assess candidate culture fit', async () => {
    const result = await cultureIntegration.assessCandidateCultureFit({
      candidateId: 'cand-123',
      tenantId: 'test-tenant',
      candidateProfile: {...},
      companyCulture: {...}
    })

    expect(result).toMatchObject({
      overallCultureFit: expect.any(Number),
      individualScores: {
        innovation: expect.any(Number),
        collaboration: expect.any(Number),
        integrity: expect.any(Number),
        excellence: expect.any(Number),
        customerFocus: expect.any(Number),
        diversity: expect.any(Number),
        sustainability: expect.any(Number)
      },
      alignmentAnalysis: expect.any(Object),
      recommendations: expect.any(Object)
    })
  })
})
```

#### 4.3 Structure Integration Tests
**File**: `__tests__/hiring/structure-integration.test.ts`

```typescript
describe('Hiring-Structure Integration', () => {
  test('should process hiring need from structure analysis', async () => {
    const trigger = {
      triggerType: 'hiring_need_identified',
      data: {
        hiringNeeds: [{
          department: 'Engineering',
          positionTitle: 'Senior Developer',
          level: 'senior',
          urgency: 'high',
          numberOfPositions: 2
        }]
      }
    }

    const result = await structureIntegration.processStructureTrigger(trigger)

    expect(result.requisitionsCreated).toBeArray()
    expect(result.requisitionsCreated).toHaveLength(1)
  })

  test('should create requisition with all required fields', async () => {
    const hiringNeed: HiringNeed = {
      tenantId: 'test-tenant',
      structureAnalysisId: 'analysis-123',
      department: 'Engineering',
      positionTitle: 'Senior Developer',
      location: 'Remote',
      level: 'senior',
      type: 'full_time',
      urgency: 'high',
      numberOfPositions: 2,
      targetStartDate: new Date(),
      requiredSkills: ['JavaScript', 'React'],
      preferredSkills: ['TypeScript'],
      experienceRequired: '5+ years',
      educationRequired: 'Bachelor\'s degree',
      salaryRange: { min: 100000, max: 150000 },
      rationale: 'Team expansion',
      approvedBy: 'manager-123',
      metadata: {}
    }

    const requisitionId = await structureIntegration.createRequisitionFromHiringNeed(hiringNeed)

    expect(requisitionId).toBeDefined()

    const requisition = await db.query.hiringRequisitions.findFirst({
      where: eq(hiringRequisitions.id, requisitionId)
    })

    expect(requisition).toMatchObject({
      department: 'Engineering',
      positionTitle: 'Senior Developer',
      location: expect.any(String)
    })
  })
})
```

---

### 5. Agent Tests

#### 5.1 Three Engine Agent Tests
**File**: `__tests__/agents/three-engine-agent.test.ts`

```typescript
describe('Three Engine Agent', () => {
  test('should execute 3-engine pattern', async () => {
    const agent = new TestAgent()
    const input = { data: 'test' }

    const result = await agent.processData(input)

    expect(result).toMatchObject({
      knowledgeOutput: expect.any(Object),
      actionOutput: expect.any(Object),
      finalOutput: expect.any(Object)
    })
  })

  test('should validate output structure', async () => {
    const agent = new TestAgent()
    const result = await agent.processData(input)

    expect(agent.validateOutput(result.finalOutput)).toBe(true)
  })
})
```

#### 5.2 EnsembleAI Tests
**File**: `__tests__/agents/ensemble-ai.test.ts`

```typescript
describe('EnsembleAI', () => {
  test('should use weighted strategy', async () => {
    const ensemble = new EnsembleAI({
      strategy: 'weighted',
      providers: ['anthropic', 'openai'],
      weights: { anthropic: 0.6, openai: 0.4 }
    })

    const result = await ensemble.generate(call)

    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
  })

  test('should fallback on provider failure', async () => {
    const ensemble = new EnsembleAI({
      strategy: 'fallback',
      providers: ['failing-provider', 'anthropic'],
      fallbackProvider: 'anthropic'
    })

    const result = await ensemble.generate(call)

    expect(result).toBeDefined()
    // Should succeed with fallback provider
  })
})
```

---

### 6. Database Schema Tests

#### 6.1 Schema Validation Tests
**File**: `__tests__/database/schema-validation.test.ts`

```typescript
describe('Database Schema Validation', () => {
  test('all performance tables have required audit fields', async () => {
    const tables = [
      'performanceGoals',
      'performanceReviews',
      'performanceFeedback',
      'performanceImprovementPlans'
    ]

    for (const table of tables) {
      const schema = db._.schema[table]
      expect(schema.columns).toHaveProperty('tenantId')
      expect(schema.columns).toHaveProperty('createdAt')
      expect(schema.columns).toHaveProperty('updatedAt')
    }
  })

  test('all tables support multi-tenancy', async () => {
    // Test that tenantId is required in all main tables
    const mainTables = Object.keys(db._.schema)

    for (const table of mainTables) {
      const schema = db._.schema[table]
      expect(schema.columns.tenantId).toBeDefined()
      expect(schema.columns.tenantId.notNull).toBe(true)
    }
  })
})
```

#### 6.2 Insert/Update Tests
**File**: `__tests__/database/operations.test.ts`

```typescript
describe('Database Operations', () => {
  test('should insert performance goal with all required fields', async () => {
    const goal = {
      tenantId: 'test-tenant',
      employeeId: 'emp-123',
      managerId: 'mgr-456',
      title: 'Test Goal',
      description: 'Test Description',
      type: 'individual' as const,
      category: 'performance',
      goalFormat: 'smart',
      target: { value: 100 },
      startDate: new Date(),
      targetDate: new Date(),
      createdBy: 'mgr-456',
      updatedBy: 'mgr-456'
    }

    const [inserted] = await db.insert(performanceGoals)
      .values(goal)
      .returning()

    expect(inserted.id).toBeDefined()
    expect(inserted.status).toBe('draft') // default value
  })

  test('should enforce foreign key constraints', async () => {
    const invalidGoal = {
      tenantId: 'test-tenant',
      employeeId: 'non-existent-employee',
      // ... other fields
    }

    await expect(
      db.insert(performanceGoals).values(invalidGoal)
    ).rejects.toThrow()
  })
})
```

---

### 7. API Endpoint Tests

#### 7.1 Performance API Tests
**File**: `__tests__/api/performance.test.ts`

```typescript
describe('Performance API Endpoints', () => {
  test('POST /api/performance/reviews - create review', async () => {
    const response = await request(app)
      .post('/api/performance/reviews')
      .send({
        tenantId: 'test-tenant',
        employeeId: 'emp-123',
        reviewerId: 'mgr-456',
        reviewType: 'annual',
        period: { startDate: '2024-01-01', endDate: '2024-12-31' }
      })

    expect(response.status).toBe(201)
    expect(response.body.review).toBeDefined()
  })

  test('GET /api/performance/goals/:employeeId - list goals', async () => {
    const response = await request(app)
      .get('/api/performance/goals/emp-123')
      .set('Authorization', 'Bearer token')

    expect(response.status).toBe(200)
    expect(response.body.goals).toBeArray()
  })
})
```

#### 7.2 Hiring API Tests
**File**: `__tests__/api/hiring.test.ts`

```typescript
describe('Hiring API Endpoints', () => {
  test('POST /api/hiring/candidates - create candidate', async () => {
    const response = await request(app)
      .post('/api/hiring/candidates')
      .send({
        tenantId: 'test-tenant',
        requisitionId: 'req-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
        resumeUrl: 'https://example.com/resume.pdf'
      })

    expect(response.status).toBe(201)
    expect(response.body.candidate.id).toBeDefined()
  })
})
```

---

## Test Execution Plan

### Phase 1: Unit Tests
1. Agent tests (3-engine pattern, EnsembleAI)
2. Individual workflow tests
3. Integration layer tests

### Phase 2: Integration Tests
1. Cross-module trigger flows
2. Database operations
3. API endpoint tests

### Phase 3: End-to-End Tests
1. Complete workflow execution
2. Multi-module flows
3. Real-world scenarios

### Phase 4: Performance Tests
1. Load testing
2. Concurrent user scenarios
3. Database performance

---

## Test Coverage Requirements

- **Unit Test Coverage**: > 80%
- **Integration Test Coverage**: > 70%
- **Critical Path Coverage**: 100%
- **API Endpoint Coverage**: 100%

---

## Test Data Setup

### Required Test Fixtures
1. **Tenants**: `test-tenant-1`, `test-tenant-2`
2. **Employees**: Test employees with various roles
3. **Courses**: Sample course catalog
4. **Culture Data**: 7 Cylinders baseline data
5. **Skills**: Skills inventory

### Database Seeding
```typescript
async function seedTestData() {
  await db.insert(tenants).values([
    { id: 'test-tenant-1', name: 'Test Company 1' }
  ])

  await db.insert(employees).values([
    {
      id: 'emp-123',
      tenantId: 'test-tenant-1',
      firstName: 'Test',
      lastName: 'Employee'
    }
  ])

  // ... more test data
}
```

---

## Success Criteria

### All tests must pass with:
1. ✅ 0 TypeScript errors
2. ✅ All functions return expected output format
3. ✅ Database inserts match schema exactly
4. ✅ Triggers route to correct modules
5. ✅ API responses match specification
6. ✅ No data leakage between tenants
7. ✅ Proper error handling throughout

---

*Testing Specification Version: 1.0*
*Generated: 2025-10-04*
*Based on: PLATFORM_ARCHITECTURE.md*
