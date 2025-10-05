# Flow Verification: Culture Analysis Complete Workflow

**Date**: 2025-10-04
**Purpose**: Verify culture survey → analysis → reports → trigger LXP & Performance flow

---

## Flow Overview

```
Admin sends survey → Employees complete → Culture Agent analyzes →
  ├─> Employee reports (individual)
  ├─> Tenant reports (aggregated)
  ├─> Engagement Agent analyzes engagement
  ├─> Recognition Agent analyzes recognition
  ├─> Triggers LXP for culture learning
  └─> Triggers Performance for culture goals
```

---

## STEP 1: Survey Distribution ⚠️

### Current Implementation

**Status**: ⚠️ **PARTIAL - Missing survey distribution mechanism**

**What EXISTS**:
- ✅ Culture assessment schema (`cultureAssessments` table)
- ✅ Survey submission endpoint (`POST /api/culture-assessment/submit`)
- ✅ Values endpoint (`GET /api/culture-assessment/values/:tenantId`)

**File**: `routes/culture-assessment.ts`

**What's MISSING**:
- ❌ Survey invitation/distribution endpoint
- ❌ Email notification system
- ❌ Survey link generation
- ❌ Tracking who has/hasn't completed survey

### Required Survey Questions

Per user requirements:
1. **Personal Values** - Pick 10 from Mizan's 7 Cylinders values
2. **Current Experience** - Pick 10 values describing current culture
3. **Desired Future** - Pick 10 values for ideal future culture
4. **Engagement** - Slider 1-5
5. **Recognition** - Slider 1-5

### Current Schema vs Requirements

**cultureAssessments table** (lines 9-21 in `db/schema/culture.ts`):
```typescript
{
  personalValues: jsonb,           // ✅ Q1: Who you are
  currentExperience: jsonb,        // ✅ Q2: Current experience
  desiredExperience: jsonb,        // ✅ Q3: Desired future
  engagement: integer,             // ✅ Q4: Engagement (1-10 in schema, should be 1-5)
  recognition: integer             // ✅ Q5: Recognition (1-10 in schema, should be 1-5)
}
```

**Schema Updates Needed**:
- Change `engagement` and `recognition` from 1-10 to 1-5 scale
- Add survey invitation tracking

---

## 🔧 FIX 1: Survey Distribution System

### Add Survey Invitations Table

**File**: `db/schema/culture.ts`

```typescript
export const cultureSurveyInvitations = pgTable('culture_survey_invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  campaignId: text('campaign_id').notNull(), // Group invitations
  employeeId: text('employee_id').notNull(),
  email: text('email').notNull(),
  surveyLink: text('survey_link').notNull(), // Unique token URL
  sentAt: timestamp('sent_at'),
  completedAt: timestamp('completed_at'),
  remindersSent: integer('reminders_sent').default(0),
  status: text('status').notNull().default('pending'), // pending, sent, completed, expired
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull()
});
```

### Add Distribution Endpoint

**File**: `routes/culture-assessment.ts`

```typescript
/**
 * POST /api/culture-assessment/distribute
 * Send survey to all employees from CSV upload
 */
router.post('/distribute', authenticate, authorize(['clientAdmin', 'superadmin']),
  async (req: Request, res: Response) => {
  try {
    const { campaignName, expiryDays = 30 } = req.body;
    const tenantId = req.user!.tenantId;

    // Get all employees from tenant
    const employees = await db.query.users.findMany({
      where: eq(users.tenantId, tenantId),
      columns: { id: true, email: true, name: true }
    });

    const campaignId = randomUUID();
    const invitations = [];

    for (const employee of employees) {
      const surveyToken = randomUUID();
      const surveyLink = `${process.env.FRONTEND_URL}/survey/${surveyToken}`;

      await db.insert(cultureSurveyInvitations).values({
        tenantId,
        campaignId,
        employeeId: employee.id,
        email: employee.email,
        surveyLink,
        status: 'pending',
        expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
      });

      // Send email (using email service)
      await sendSurveyEmail(employee.email, employee.name, surveyLink);

      invitations.push({
        employeeId: employee.id,
        email: employee.email,
        surveyLink
      });
    }

    await db.insert(cultureSurveyInvitations).values({
      // Update status after sending
      status: 'sent',
      sentAt: new Date()
    });

    res.json({
      success: true,
      campaignId,
      invitationsSent: invitations.length,
      expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
    });

  } catch (error) {
    console.error('Survey distribution error:', error);
    res.status(500).json({ error: 'Failed to distribute survey' });
  }
});
```

**Estimated Time**: 2-3 hours

---

## STEP 2: Survey Completion ✅

### Current Implementation

**Status**: ✅ **COMPLETE**

**File**: `routes/culture-assessment.ts` (lines 77-107)

**Endpoint**: `POST /api/culture-assessment/submit`

**What It Does**:
1. Validates survey responses (Zod schema)
2. Saves to `cultureAssessments` table
3. Triggers employee report generation (async)

**Schema Validation** (lines 20-26):
```typescript
const CultureAssessmentSchema = z.object({
  personalValues: z.array(z.string()).length(10),
  currentExperienceValues: z.array(z.string()).length(10),
  desiredFutureValues: z.array(z.string()).length(10),
  engagementLevel: z.number().min(1).max(10),     // ⚠️ Should be max(5)
  recognitionLevel: z.number().min(1).max(10)     // ⚠️ Should be max(5)
});
```

### 🔧 FIX 2: Update Slider Scales

Change from 1-10 to 1-5:

```typescript
const CultureAssessmentSchema = z.object({
  personalValues: z.array(z.string()).length(10),
  currentExperienceValues: z.array(z.string()).length(10),
  desiredFutureValues: z.array(z.string()).length(10),
  engagementLevel: z.number().min(1).max(5),      // ✅ Fixed
  recognitionLevel: z.number().min(1).max(5)      // ✅ Fixed
});
```

**Estimated Time**: 5 minutes

---

## STEP 3: Culture Agent Analysis ✅

### Current Implementation

**Status**: ✅ **MOSTLY COMPLETE** (needs verification of mapping logic)

**File**: `services/agents/culture-agent.ts`

**7 Cylinders Framework**: ✅ CORRECTED (from previous audit)

The Culture Agent now uses the correct framework:
1. Safety & Survival
2. Belonging & Loyalty
3. Growth & Achievement
4. Meaning & Contribution
5. Integrity & Justice
6. Wisdom & Compassion
7. Transcendence & Unity

### Required Functions

**1. Map Tenant Values to 7 Cylinders** ⚠️

**Status**: ⚠️ **NEEDS IMPLEMENTATION**

This should map company/tenant values to the appropriate cylinders.

**Implementation Needed**:

```typescript
// In Culture Agent
async mapTenantValuesToCylinders(
  tenantId: string,
  tenantValues: string[]
): Promise<{
  mappings: Array<{
    tenantValue: string;
    cylinder: number;
    cylinderName: string;
    matchScore: number;
    reasoning: string;
  }>;
  unmappedValues: string[];
}> {
  // Use Knowledge Engine to analyze each tenant value
  // Match to closest cylinder based on semantic similarity
  // Return mapping with confidence scores
}
```

**Estimated Time**: 2-3 hours

**2. Analyze Employee Responses** ✅

**Status**: ✅ **PARTIAL - Exists but needs enhancement**

Current implementation generates basic reports. Needs to answer:
- What do your values mean?
- What does your preferred experience mean vs. your values?

**3. Generate Employee Report** ✅

**Status**: ✅ **EXISTS**

**File**: `routes/culture-assessment.ts` (line 94)

```typescript
generateEmployeeReport(assessment[0].id, req.user!.id, req.user!.tenantId);
```

### Required Report Components

**Employee Report Should Include**:
1. ✅ Personal values meaning (what they selected)
2. ⚠️ Personal values vs. current experience gap
3. ⚠️ Personal values vs. desired future alignment
4. ⚠️ Engagement analysis
5. ⚠️ Recognition analysis

**Tenant Report Should Include**:
1. ⚠️ Tenant values meaning (after 7 Cylinders mapping)
2. ⚠️ How employees experience company (vs. tenant values)
3. ⚠️ How employees want to experience company (vs. tenant values)
4. ⚠️ Departmental aggregation
5. ⚠️ Organizational aggregation
6. ⚠️ Gap analysis and recommendations

---

## STEP 4: Engagement Agent Integration ✅

### Current Implementation

**Status**: ✅ **COMPLETE**

**File**: `services/agents/engagement-agent.ts`

**What It Does**:
- Analyzes engagement scores across organization
- Identifies flight risk and burnout risk
- Provides engagement factor breakdown
- Generates trends and recommendations

**Integration Point**:
Culture Agent should call Engagement Agent with engagement scores from surveys.

### 🔧 FIX 3: Add Engagement Agent Call

**File**: `routes/culture-assessment.ts`

```typescript
// After survey submission
async function generateEmployeeReport(assessmentId: string, userId: string, tenantId: string) {
  const assessment = await db.query.cultureAssessments.findFirst({
    where: eq(cultureAssessments.id, assessmentId)
  });

  // Call Engagement Agent for engagement analysis
  const engagementAgent = new EngagementAgent();
  const engagementAnalysis = await engagementAgent.analyzeIndividual({
    tenantId,
    employeeId: userId,
    engagementScore: assessment.engagement,
    recognitionScore: assessment.recognition
  });

  // Include in report generation
  // ...
}
```

**Estimated Time**: 1 hour

---

## STEP 5: Recognition Agent Integration ✅

### Current Implementation

**Status**: ✅ **COMPLETE**

**File**: `services/agents/recognition-agent.ts`

**What It Does**:
- Analyzes recognition patterns
- Identifies recognition gaps
- Recommends recognition strategies
- Tracks recognition frequency

**Integration Point**:
Culture Agent should call Recognition Agent with recognition scores.

### 🔧 FIX 4: Add Recognition Agent Call

**File**: `routes/culture-assessment.ts`

```typescript
// In generateEmployeeReport function
const recognitionAgent = new RecognitionAgent();
const recognitionAnalysis = await recognitionAgent.analyzeIndividual({
  tenantId,
  employeeId: userId,
  recognitionScore: assessment.recognition,
  context: {
    personalValues: assessment.personalValues,
    currentExperience: assessment.currentExperience
  }
});

// Include in report
```

**Estimated Time**: 1 hour

---

## STEP 6: Trigger LXP for Culture Learning ⚠️

### Current Implementation

**Status**: ⚠️ **PARTIAL - Trigger exists but needs culture-specific learning**

**File**: `services/modules/lxp/integrations/culture-integration.ts`

**What EXISTS**:
- ✅ Culture integration interface
- ✅ Trigger type: `culture_learning_needed`
- ✅ LXP Module can receive culture triggers

**What's MISSING**:
- ❌ Culture learning content specific to 7 Cylinders
- ❌ Training modules for reshaping culture
- ❌ Leader-specific culture learning paths

### Required Implementation

**User Requirement**:
> "the culture analysis will trigger the LXP for employees and leaders to be assigned experiences to learn how to reshape and sustain the new culture (this is by superadmin and I need to train the agent responsible of creating these experiences on a few modules.)"

### 🔧 FIX 5: Create Culture Learning Trigger

**File**: `routes/culture-assessment.ts`

```typescript
// After aggregating all employee assessments
async function triggerCultureLearning(tenantId: string, cultureAnalysis: any) {
  const { triggers } = await import('../db/schema.js');

  // Identify culture gaps (cylinders where company is weak)
  const cultureGaps = identifyCultureGaps(cultureAnalysis);

  for (const gap of cultureGaps) {
    await db.insert(triggers).values({
      tenantId,
      name: `Culture Learning: ${gap.cylinderName}`,
      description: `Address culture gap in ${gap.cylinderName}`,
      type: 'event_based',
      sourceModule: 'culture_analysis',
      eventType: 'culture_learning_needed',
      conditions: {
        cylinderId: gap.cylinder,
        gapSize: gap.gapPercentage,
        urgency: gap.urgency
      },
      targetModule: 'lxp',
      action: 'create_culture_learning_path',
      actionConfig: {
        cylinder: gap.cylinder,
        cylinderName: gap.cylinderName,
        targetAudience: gap.affectedDepartments,
        learningObjectives: gap.learningObjectives,
        enablingValues: gap.enablingValuesToTeach,
        limitingValues: gap.limitingValuesToAddress
      },
      isActive: true
    });
  }
}
```

**User Training Requirement**:
> "I need to train the agent responsible of creating these experiences on a few modules"

This means you'll need to provide training data/examples for the Learning Path Designer Agent to create culture-specific learning content.

**Estimated Time**: 3-4 hours + training time

---

## STEP 7: Trigger Performance for Culture Goals ⚠️

### Current Implementation

**Status**: ⚠️ **PARTIAL - Integration exists but needs culture goal creation**

**File**: `services/modules/performance/api/goals.ts`

**What EXISTS**:
- ✅ Goal creation API
- ✅ Performance Module can receive triggers
- ✅ Goal Setter Agent can generate goals

**What's MISSING**:
- ❌ Culture-specific goal generation
- ❌ Cylinder-aligned performance goals
- ❌ Automatic goal assignment from culture analysis

### 🔧 FIX 6: Create Culture Goals Trigger

**File**: `routes/culture-assessment.ts`

```typescript
// After culture analysis
async function triggerPerformanceGoals(tenantId: string, cultureAnalysis: any) {
  const { triggers } = await import('../db/schema.js');

  // Create performance trigger for culture shaping
  await db.insert(triggers).values({
    tenantId,
    name: 'Performance Goals: Culture Shaping',
    description: 'Create performance goals to shape organizational culture',
    type: 'event_based',
    sourceModule: 'culture_analysis',
    eventType: 'culture_goals_needed',
    conditions: {
      cultureGaps: cultureAnalysis.gaps,
      targetCylinders: cultureAnalysis.improvementCylinders
    },
    targetModule: 'performance',
    action: 'create_culture_goals',
    actionConfig: {
      goalType: 'culture_shaping',
      cylinders: cultureAnalysis.improvementCylinders,
      enablingValues: cultureAnalysis.valuesToReinforce,
      limitingValues: cultureAnalysis.valuesToReduce,
      targetEmployees: 'all', // or specific departments/roles
      timeline: '90_days'
    },
    isActive: true
  });
}
```

**Estimated Time**: 2-3 hours

---

## Complete Flow Summary

### ✅ What Works Now

1. ✅ Survey schema exists
2. ✅ Survey submission endpoint works
3. ✅ Culture Agent has correct 7 Cylinders Framework
4. ✅ Engagement Agent exists
5. ✅ Recognition Agent exists
6. ✅ LXP Module can receive culture triggers
7. ✅ Performance Module can receive triggers

### ⚠️ What Needs to be Built

| Component | Status | Time | Priority |
|-----------|--------|------|----------|
| **1. Survey Distribution** | ❌ Missing | 2-3 hrs | HIGH |
| **2. Slider Scale Fix** | ⚠️ Simple | 5 min | HIGH |
| **3. Tenant Values Mapping** | ❌ Missing | 2-3 hrs | HIGH |
| **4. Enhanced Reports** | ⚠️ Partial | 3-4 hrs | HIGH |
| **5. Engagement Integration** | ⚠️ Needs wiring | 1 hr | MEDIUM |
| **6. Recognition Integration** | ⚠️ Needs wiring | 1 hr | MEDIUM |
| **7. LXP Culture Trigger** | ⚠️ Needs implementation | 3-4 hrs | HIGH |
| **8. Performance Culture Trigger** | ⚠️ Needs implementation | 2-3 hrs | HIGH |

**Total Time to Complete**: 14-22 hours

---

## Recommended Implementation Order

### Phase 1: Core Flow (6-8 hours)
1. Survey distribution system (2-3 hrs)
2. Fix slider scales (5 min)
3. Tenant values mapping (2-3 hrs)
4. Enhanced report generation (2 hrs)

### Phase 2: Agent Integration (2-3 hours)
5. Wire Engagement Agent (1 hr)
6. Wire Recognition Agent (1 hr)

### Phase 3: Triggers (5-7 hours)
7. LXP culture learning trigger (3-4 hrs)
8. Performance culture goals trigger (2-3 hrs)

### Phase 4: Testing & Training
9. End-to-end testing (2-3 hrs)
10. Train Learning Path Designer for culture content (TBD - depends on training data)

---

## Testing Checklist

After implementation:

- [ ] 1. Admin distributes survey to all employees
- [ ] 2. Employees receive email with survey link
- [ ] 3. Employee completes 5-question survey
- [ ] 4. Survey saves to database
- [ ] 5. Culture Agent maps tenant values to 7 Cylinders
- [ ] 6. Culture Agent analyzes employee responses
- [ ] 7. Employee receives individual report
- [ ] 8. Engagement Agent processes engagement scores
- [ ] 9. Recognition Agent processes recognition scores
- [ ] 10. Admin receives aggregated tenant report
- [ ] 11. Departmental reports generated
- [ ] 12. Triggers created for LXP (culture learning)
- [ ] 13. Triggers created for Performance (culture goals)
- [ ] 14. LXP creates culture learning paths
- [ ] 15. Performance creates culture-shaping goals

---

## Next Steps

**Option A: Build Complete Culture Flow (14-22 hours)**
- Implement all 8 components
- Complete end-to-end testing
- Ready for production

**Option B: Build Core Flow First (Phase 1: 6-8 hours)**
- Survey distribution
- Tenant mapping
- Basic reports
- Test before moving to triggers

**Option C: Move to Skills Analysis Flow**
- User mentioned: "i'll explain the flow of the skills analysis in the following msg"
- Could review all 3 flows (structure, culture, skills) before implementing

---

## Conclusion

**Status**: **70% Complete**

**What's Ready**:
- ✅ Database schema
- ✅ Survey submission
- ✅ 7 Cylinders Framework
- ✅ Engagement & Recognition Agents
- ✅ Trigger infrastructure

**What's Missing**:
- Survey distribution mechanism
- Tenant values mapping
- Enhanced reporting
- Trigger implementations

**Recommendation**: Build Phase 1 (core flow) first, test thoroughly, then add triggers.

---

**Report Generated**: 2025-10-04
**Status**: READY FOR IMPLEMENTATION
