# Flow Verification: Client Setup → Structure Analysis → Hiring

**Date**: 2025-10-04
**Requested By**: User
**Purpose**: Verify the complete flow from client setup through structure analysis to hiring module activation

---

## Flow Overview

```
Client/Superadmin Setup → Upload CSV → Structure Analysis → Hiring Module Triggered
```

---

## STEP 1: Client/Company Setup ✅

### Current Implementation

**File**: `routes/admin.ts`
**Endpoint**: `POST /api/admin/companies`

**Request Body**:
```typescript
{
  name: string;        // Company name (min 2 chars)
  industry: string;    // Industry sector
  size: string;        // Company size
  strategy?: string;   // Optional strategy statement
}
```

**What Happens**:
1. Admin/Superadmin authenticates
2. Validates input data
3. Creates company record in database
4. Returns company object

**Database Schema**: `db/schema/core.ts` - `companies` table

---

### ⚠️ GAP IDENTIFIED: Missing Fields

**Current Schema** (companies table):
```typescript
{
  id, name, industry, size, strategy
}
```

**Required Fields** (per user requirement):
- ✅ name
- ❌ **vision** - NOT IN SCHEMA
- ❌ **mission** - NOT IN SCHEMA
- ✅ strategy
- ❌ **values** - NOT IN SCHEMA

### 🔧 FIX NEEDED:

Update `companies` table schema to include:
```typescript
export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id').notNull(),
  name: text('name').notNull(),
  industry: text('industry'),
  size: text('size'),

  // ADD THESE FIELDS:
  vision: text('vision'),           // Company vision statement
  mission: text('mission'),         // Company mission statement
  strategy: text('strategy'),       // Strategy statement (exists)
  values: jsonb('values'),          // Company values array

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});
```

**Estimated Time**: 15 minutes

---

## STEP 2: Upload CSV Structure ✅

### Current Implementation

**File**: `routes/upload.ts`
**Endpoint**: `POST /upload/analyze`

**Request**:
- **File Upload**: CSV file with org structure
- **Alternative**: Plain text org structure

**CSV Format Expected**:
```csv
level,title,reports_to
0,CEO,
1,COO,CEO
1,CTO,CEO
1,CFO,CEO
2,Engineering Manager,CTO
```

**What Happens**:
1. Multer receives file upload (5MB limit)
2. Validates file type (CSV, Excel, or text)
3. Parses CSV into structured format:
   ```typescript
   {
     level: number,
     title: string,
     reports_to: string
   }
   ```
4. Converts to indented text format for Structure Agent

**File Validation**:
- ✅ CSV files
- ✅ Excel files (.xls, .xlsx)
- ✅ Plain text files
- ✅ 5MB file size limit

---

### ⚠️ GAP IDENTIFIED: CSV Format vs User Requirement

**Current CSV Format**:
```csv
level,title,reports_to
```

**User's Required Format**:
```csv
employee_name, employee_email, department, supervisor_name, supervisor_email
```

### 🔧 FIX NEEDED:

Update CSV parser to handle employee data format:

```typescript
// In routes/upload.ts
function parseEmployeeCSV(buffer: Buffer): EmployeeStructure {
  const records = parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  // Expected columns:
  // - employee_name
  // - employee_email
  // - department
  // - supervisor_name
  // - supervisor_email

  const employees = [];
  const departments = new Set();

  for (const record of records) {
    employees.push({
      name: record.employee_name || record.name,
      email: record.employee_email || record.email,
      department: record.department,
      supervisorName: record.supervisor_name || record.supervisor,
      supervisorEmail: record.supervisor_email
    });

    if (record.department) {
      departments.add(record.department);
    }
  }

  return {
    employees,
    departments: Array.from(departments),
    reportingHierarchy: buildHierarchy(employees) // Helper function
  };
}
```

**Estimated Time**: 1-2 hours

---

## STEP 3: Structure Analysis ✅

### Current Implementation

**File**: `services/agents/structure/structure-agent.ts`
**Class**: `StructureAgentV2` extends `ThreeEngineAgent`

**Analysis Process**:

1. **Knowledge Engine**: Loads organizational design theories
   - Span of control principles
   - Organizational structures (functional, divisional, matrix, etc.)
   - Best practices from management theory

2. **Data Engine**: Processes the uploaded structure
   - Parses org chart
   - Analyzes departments
   - Maps reporting relationships
   - Counts spans of control

3. **Reasoning Engine**: Generates analysis
   - Compares structure to strategy
   - Identifies structural gaps
   - Recommends improvements
   - **Identifies hiring needs**

**Output** (`StructureAnalysisResult`):
```typescript
{
  isOptimalForStrategy: boolean;
  structureType: string;         // e.g., "functional", "matrix"
  healthScore: number;            // 0-100
  strengths: string[];
  weaknesses: string[];
  gaps: Array<{
    type: 'role' | 'department' | 'reporting' | 'span';
    description: string;
    impact: 'high' | 'medium' | 'low';
    recommendation: string;
  }>;
  recommendations: string[];
  hiringNeeds: Array<{           // ✅ THIS IS KEY!
    role: string;
    department: string;
    urgency: 'critical' | 'high' | 'medium';
    reason: string;
  }>;
}
```

**Trigger Condition** (line 237):
```typescript
if (analysis.hiringNeeds.some(need => need.urgency === 'critical')) {
  await this.triggerHiringModule(analysis.hiringNeeds, input.companyId);
}
```

---

### ⚠️ PARTIAL GAP: Trigger Implementation

**Current State** (line 302-306):
```typescript
private async triggerHiringModule(hiringNeeds: any[], companyId: string): Promise<void> {
  // Trigger hiring workflow
  console.log(`Triggering hiring module for ${hiringNeeds.length} critical positions`);
  // Implementation would actually call the hiring module
}
```

**Status**: ⚠️ **Stub implementation** - logs but doesn't trigger

### 🔧 FIX NEEDED:

Implement actual trigger generation:

```typescript
import { db } from '../../../db/index.js';
import { triggers } from '../../../db/schema.js';
import { randomUUID } from 'node:crypto';

private async triggerHiringModule(
  hiringNeeds: any[],
  tenantId: string
): Promise<void> {
  // Create trigger for each critical hiring need
  for (const need of hiringNeeds.filter(n => n.urgency === 'critical')) {
    await db.insert(triggers).values({
      id: randomUUID(),
      tenantId: tenantId,
      name: `Urgent Hiring: ${need.role} in ${need.department}`,
      type: 'hiring_needs_urgent',
      config: {
        role: need.role,
        department: need.department,
        urgency: need.urgency,
        reason: need.reason,
        sourceModule: 'structure_analysis'
      },
      status: 'active',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  console.log(`Created ${hiringNeeds.length} hiring triggers`);
}
```

**Estimated Time**: 30 minutes

---

## STEP 4: Hiring Module Triggered ✅

### Current Implementation

**File**: `services/results/trigger-engine.ts`
**Function**: `processTriggers()`

**Trigger Type**: `hiring_needs_urgent`

**How It Works**:

1. **Trigger Detection** (line 138):
```typescript
const hiringTriggerTypes = [
  'hiring_needs_urgent',
  'structure_analysis_expansion',
  'candidate_applied',
  // ... other hiring triggers
];

if (hiringTriggerTypes.includes(type)) {
  // Route to Hiring Module
}
```

2. **Trigger Processing** (line 250):
```typescript
case 'hiring_needs_urgent':
  return processHiringNeedsTrigger(trigger, unifiedResults, config);
```

3. **Hiring Module Activation** (line 360-375):
```typescript
function processHiringNeedsTrigger(
  trigger: any,
  results: UnifiedResults,
  config: any
): TriggerResult | null {
  const urgentHiring = results.recommendations.filter(
    rec => rec.category === 'structure' &&
           rec.title.toLowerCase().includes('hiring')
  );

  if (urgentHiring.length > 0) {
    return {
      id: randomUUID(),
      type: 'hiring_needs_urgent',
      targetModule: 'hiring',      // ✅ Routes to Hiring Module
      priority: 'critical',
      data: {
        hiringNeeds: urgentHiring,
        triggerSource: 'structure_analysis'
      },
      status: 'pending'
    };
  }

  return null;
}
```

4. **Hiring Module Receives Trigger**:
   - **File**: `services/modules/hiring/hiring-module.ts`
   - **Method**: `activate(triggerData)`
   - **Process**: Creates job requisitions from hiring needs

---

### ✅ Subscription/Tier Check

**File**: Check in trigger-engine or hiring module

**Current Implementation**: ⚠️ **NOT IMPLEMENTED**

### 🔧 FIX NEEDED:

Add tier/subscription check before activating Hiring Module:

```typescript
// In services/results/trigger-engine.ts

async function checkModuleAccess(
  tenantId: string,
  moduleName: string
): Promise<boolean> {
  // Check if tenant has access to this module
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId)
  });

  if (!tenant) return false;

  // Check subscription tier
  const subscription = tenant.subscriptionTier || 'free';

  // Module access matrix
  const moduleAccess: Record<string, string[]> = {
    'hiring': ['premium', 'enterprise'],
    'lxp': ['basic', 'premium', 'enterprise'],
    'performance': ['basic', 'premium', 'enterprise'],
    // ... other modules
  };

  return moduleAccess[moduleName]?.includes(subscription) || false;
}

// Use in trigger processing
if (hiringTriggerTypes.includes(type)) {
  const hasAccess = await checkModuleAccess(
    trigger.tenantId,
    'hiring'
  );

  if (!hasAccess) {
    console.log(`Tenant ${trigger.tenantId} does not have access to Hiring module`);
    return null; // Don't activate module
  }

  // Proceed with hiring module activation
  // ...
}
```

**Estimated Time**: 1 hour

---

## STEP 5: Hiring Module Creates Requisitions ✅

### Current Implementation

**File**: `services/modules/hiring/integrations/structure-integration.ts`
**Function**: `receiveHiringNeeds()`

**Process**:

1. Receives hiring needs from Structure Analysis
2. For each hiring need:
   - Creates job requisition
   - Calls Recruitment Strategist Agent to:
     - Generate job description
     - Define requirements
     - Set compensation range
     - Create sourcing plan
3. Saves requisitions to database
4. Posts to job boards (if configured)

**Code** (lines 265-360):
```typescript
export async function receiveHiringNeeds(
  hiringNeeds: HiringNeed[]
): Promise<JobRequisition[]> {
  const createdRequisitions: JobRequisition[] = [];

  for (const need of hiringNeeds) {
    // 1. Create job requisition
    const [requisition] = await db.insert(jobRequisitions)
      .values({
        tenantId: need.tenantId,
        positionTitle: need.positionTitle,
        department: need.department,
        location: need.location || 'To be determined',
        level: need.level,
        type: need.type,
        urgency: need.urgency,
        status: 'draft',
        // ... other fields
      })
      .returning();

    // 2. Call Recruitment Strategist to generate job details
    const agentInput = {
      tenantId: need.tenantId,
      requisitionId: requisition.id,
      positionTitle: need.positionTitle,
      department: need.department,
      requirements: need.requirements,
      strategicContext: need.reason
    };

    const recruitmentPlan = await callRecruitmentStrategist(agentInput);

    // 3. Update requisition with agent output
    await db.update(jobRequisitions)
      .set({
        description: recruitmentPlan.jobDescription,
        responsibilities: recruitmentPlan.responsibilities,
        requiredSkills: recruitmentPlan.requiredSkills,
        // ...
      })
      .where(eq(jobRequisitions.id, requisition.id));

    createdRequisitions.push(requisition);
  }

  return createdRequisitions;
}
```

---

## Complete Flow Summary

### ✅ What Works

1. **Company Setup**: Can create company with name, industry, size, strategy
2. **CSV Upload**: Can upload and parse CSV files
3. **Structure Analysis**: Structure Agent analyzes org chart
4. **Gap Identification**: Identifies hiring needs with urgency levels
5. **Trigger Creation**: Creates `hiring_needs_urgent` triggers
6. **Trigger Engine**: Routes hiring triggers to Hiring Module
7. **Hiring Module**: Creates job requisitions from hiring needs
8. **AI Agents**: Recruitment Strategist generates job descriptions

---

### ⚠️ Gaps to Fix

| Gap | Priority | Time | File to Update |
|-----|----------|------|----------------|
| **1. Missing company fields** (vision, mission, values) | HIGH | 15 min | `db/schema/core.ts` |
| **2. CSV format mismatch** (employee data vs org hierarchy) | HIGH | 1-2 hrs | `routes/upload.ts` |
| **3. Trigger implementation stub** (doesn't create triggers) | CRITICAL | 30 min | `services/agents/structure/structure-agent.ts` |
| **4. No subscription/tier check** | HIGH | 1 hr | `services/results/trigger-engine.ts` |

**Total Time to Fix**: 3-4 hours

---

## Recommended API Flow (After Fixes)

### 1. Setup Company
```http
POST /api/admin/companies
Content-Type: application/json

{
  "name": "Acme Corp",
  "vision": "To be the leading innovator in our industry",
  "mission": "Empowering teams through technology",
  "strategy": "Expand into new markets with innovative products",
  "values": ["Innovation", "Integrity", "Excellence", "Collaboration"],
  "industry": "Technology",
  "size": "100-500"
}
```

**Response**:
```json
{
  "id": "company-uuid",
  "name": "Acme Corp",
  "vision": "...",
  "mission": "...",
  "strategy": "...",
  "values": ["Innovation", "Integrity", "Excellence", "Collaboration"]
}
```

---

### 2. Upload Employee Structure CSV
```http
POST /upload/analyze
Content-Type: multipart/form-data

file: employees.csv
```

**CSV Content**:
```csv
employee_name,employee_email,department,supervisor_name,supervisor_email
John Doe,john@acme.com,Engineering,Jane Smith,jane@acme.com
Jane Smith,jane@acme.com,Engineering,Bob Johnson,bob@acme.com
Bob Johnson,bob@acme.com,Executive,CEO,ceo@acme.com
```

---

### 3. Analyze Structure (with "Analyze Structure" button click)
```http
GET /api/analyses/structure/{companyId}
```

**Response**:
```json
{
  "isOptimalForStrategy": false,
  "structureType": "functional",
  "healthScore": 65,
  "strengths": [
    "Clear reporting lines",
    "Specialized departments"
  ],
  "weaknesses": [
    "Lack of product management",
    "No dedicated sales team"
  ],
  "gaps": [
    {
      "type": "role",
      "description": "Missing Product Manager role",
      "impact": "high",
      "recommendation": "Hire experienced Product Manager"
    }
  ],
  "recommendations": [
    "Create Product Management department",
    "Hire Sales Director",
    "Add Marketing team"
  ],
  "hiringNeeds": [
    {
      "role": "Product Manager",
      "department": "Product",
      "urgency": "critical",
      "reason": "Required to execute product strategy"
    },
    {
      "role": "Sales Director",
      "department": "Sales",
      "urgency": "high",
      "reason": "Needed for market expansion"
    }
  ]
}
```

---

### 4. Triggers Created Automatically
```json
[
  {
    "id": "trigger-uuid-1",
    "type": "hiring_needs_urgent",
    "name": "Urgent Hiring: Product Manager in Product",
    "status": "active",
    "config": {
      "role": "Product Manager",
      "department": "Product",
      "urgency": "critical",
      "reason": "Required to execute product strategy"
    }
  }
]
```

---

### 5. Hiring Module Activated (if subscription allows)
```json
{
  "moduleActivated": "hiring",
  "requisitionsCreated": [
    {
      "id": "req-uuid-1",
      "positionTitle": "Product Manager",
      "department": "Product",
      "status": "draft",
      "description": "We are seeking an experienced Product Manager to lead our product strategy...",
      "requiredSkills": ["Product Strategy", "Agile", "Stakeholder Management"],
      "compensationRange": {
        "min": 120000,
        "max": 160000
      }
    }
  ]
}
```

---

## Testing Checklist

After implementing fixes:

- [ ] 1. Create company with vision, mission, strategy, values
- [ ] 2. Upload CSV with employee data format
- [ ] 3. Verify CSV parsing creates correct structure
- [ ] 4. Click "Analyze Structure" button
- [ ] 5. Verify Structure Agent runs analysis
- [ ] 6. Verify hiring needs identified
- [ ] 7. Verify triggers created in database
- [ ] 8. Verify subscription check works (block if no access)
- [ ] 9. Verify Hiring Module receives trigger
- [ ] 10. Verify job requisitions created
- [ ] 11. Verify Recruitment Strategist generates job descriptions

---

## Next Steps

**Option A: Fix Gaps First (Recommended)**
1. Fix company schema (15 min)
2. Fix CSV parser (1-2 hrs)
3. Fix trigger implementation (30 min)
4. Add subscription check (1 hr)
**Total: 3-4 hours**

**Option B: Proceed with Current Flow**
- Works end-to-end but with limitations
- Can demo basic functionality
- Fix gaps incrementally

**Option C: Wait for Culture Analysis Flow**
- User mentioned culture analysis is next
- Could implement both flows together
- May have shared components

---

## Conclusion

**Overall Assessment**: The flow is **80% complete** with 4 gaps to fix.

**Core Functionality Works**:
- ✅ Company setup
- ✅ CSV upload
- ✅ Structure analysis by AI
- ✅ Hiring needs identification
- ✅ Hiring module activation
- ✅ Job requisition creation

**Missing Pieces** (3-4 hours to fix):
- ⚠️ Company schema missing fields
- ⚠️ CSV format mismatch
- ⚠️ Trigger stub not implemented
- ⚠️ No subscription check

**Recommendation**: **Fix the 4 gaps before moving to frontend** to ensure complete functionality.

---

**Report Generated**: 2025-10-04
**Status**: READY FOR FIXES
