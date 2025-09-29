import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { 
  cylinders,
  cylinderValues,
  tenants,
  providerPolicies,
  agentTrainingData
} from '../db/schema.js';
import { eq, and, desc, asc } from 'drizzle-orm';

const router = Router();

// Apply authentication and superadmin authorization
router.use(authenticate);
router.use(authorize(['superadmin']));

// Dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const [
      tenantsCount,
      totalUsers,
      totalAnalyses,
      cylinderConfig
    ] = await Promise.all([
      db.query.tenants.findMany(),
      db.query.users.findMany(),
      db.query.analyses.findMany(),
      db.query.cylinders.findMany({
        with: { values: true }
      })
    ]);
    
    res.json({
      stats: {
        tenants: tenantsCount.length,
        users: totalUsers.length,
        analyses: totalAnalyses.length,
        configuredCylinders: cylinderConfig.length
      },
      tenants: tenantsCount,
      cylinderConfig
    });
    
  } catch (error) {
    console.error('Superadmin dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// 7-Cylinder Framework Configuration
router.get('/framework', async (req, res) => {
  try {
    const cylindersData = await db.query.cylinders.findMany({
      with: {
        values: {
          orderBy: [asc(cylinderValues.value)]
        }
      },
      orderBy: [asc(cylinders.level)]
    });
    
    res.json(cylindersData);
    
  } catch (error) {
    console.error('Framework fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch framework' });
  }
});

router.put('/framework/cylinder/:level', async (req, res) => {
  try {
    const schema = zod.object({
      name: zod.string(),
      definition: zod.string(),
      ethicalPrinciple: zod.string(),
      enablingValues: zod.array(zod.string()),
      limitingValues: zod.array(zod.string())
    });
    
    const level = parseInt(req.params.level);
    const validatedData = schema.parse(req.body);
    
    // Update or create cylinder
    const existingCylinder = await db.query.cylinders.findFirst({
      where: equal(cylinders.level, level)
    });
    
    let cylinderId;
    
    if (existingCylinder) {
      // Update existing
      const [updated] = await db.update(cylinders)
        .set({
          name: validatedData.name,
          definition: validatedData.definition,
          ethicalPrinciple: validatedData.ethicalPrinciple,
          updatedAt: new Date()
        })
        .where(equal(cylinders.id, existingCylinder.id))
        .returning();
      
      cylinderId = updated.id;
      
      // Delete existing values
      await db.delete(cylinderValues)
        .where(equal(cylinderValues.cylinderId, cylinderId));
    } else {
      // Create new
      const [created] = await db.insert(cylinders)
        .values({
          id: crypto.randomUUID(),
          tenantId: 'global', // Global configuration
          level,
          name: validatedData.name,
          definition: validatedData.definition,
          ethicalPrinciple: validatedData.ethicalPrinciple,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      cylinderId = created.id;
    }
    
    // Insert values
    const valuesToInsert = [
      ...validatedData.enablingValues.map(v => ({
        id: crypto.randomUUID(),
        cylinderId,
        value: v,
        type: 'enabling' as const
      })),
      ...validatedData.limitingValues.map(v => ({
        id: crypto.randomUUID(),
        cylinderId,
        value: v,
        type: 'limiting' as const
      }))
    ];
    
    await db.insert(cylinderValues)
      .values(valuesToInsert);
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Cylinder update error:', error);
    res.status(500).json({ error: 'Failed to update cylinder' });
  }
});

// AI Training
router.get('/ai-training', async (req, res) => {
  try {
    const trainingData = await db.query.agentTrainingData.findMany({
      orderBy: [desc(agentTrainingData.createdAt)]
    });
    
    res.json(trainingData);
    
  } catch (error) {
    console.error('Training data fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch training data' });
  }
});

router.post('/ai-training', async (req, res) => {
  try {
    const schema = zod.object({
      agentType: zod.string(),
      trainingType: zod.enum(['knowledge', 'examples', 'feedback']),
      data: zod.any()
    });
    
    const validatedData = schema.parse(req.body);
    
    const [training] = await db.insert(agentTrainingData)
      .values({
        id: crypto.randomUUID(),
        ...validatedData,
        createdBy: req.user.id,
        createdAt: new Date()
      })
      .returning();
    
    // TODO: Trigger agent retraining
    
    res.json({
      success: true,
      trainingId: training.id
    });
    
  } catch (error) {
    console.error('Training submission error:', error);
    res.status(500).json({ error: 'Failed to submit training data' });
  }
});

// Provider management
router.get('/providers', async (req, res) => {
  try {
    const policies = await db.query.providerPolicies.findMany();
    
    res.json({
      policies,
      availableProviders: ['openai', 'anthropic', 'gemini', 'mistral']
    });
    
  } catch (error) {
    console.error('Providers fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

router.put('/providers/:provider', async (req, res) => {
  try {
    const { isActive, priority, config } = req.body;
    const provider = req.params.provider;
    
    const existing = await db.query.providerPolicies.findFirst({
      where: equal(providerPolicies.provider, provider)
    });
    
    if (existing) {
      const [updated] = await db.update(providerPolicies)
        .set({
          isActive,
          priority,
          config,
          updatedAt: new Date()
        })
        .where(equal(providerPolicies.id, existing.id))
        .returning();
      
      res.json(updated);
    } else {
      const [created] = await db.insert(providerPolicies)
        .values({
          id: crypto.randomUUID(),
          provider,
          tenantId: 'global',
          isActive,
          priority,
          config,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      res.json(created);
    }
    
  } catch (error) {
    console.error('Provider update error:', error);
    res.status(500).json({ error: 'Failed to update provider' });
  }
});

// Tenant management
router.get('/tenants', async (req, res) => {
  try {
    const tenantList = await db.query.tenants.findMany({
      with: {
        users: {
          limit: 5
        }
      }
    });
    
    res.json(tenantList);
    
  } catch (error) {
    console.error('Tenants fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

router.put('/tenants/:id', async (req, res) => {
  try {
    const { status, plan, settings } = req.body;
    
    const [updated] = await db.update(tenants)
      .set({
        status,
        plan,
        settings,
        updatedAt: new Date()
      })
      .where(equal(tenants.id, req.params.id))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    res.json(updated);
    
  } catch (error) {
    console.error('Tenant update error:', error);
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

// Client analysis endpoints
router.post('/clients/:clientId/analyze', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { analysisType } = req.body;
    
    console.log(`Running ${analysisType} analysis for client ${clientId}`);
    
    // Simulate analysis processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const analysisResults = {
      culture: {
        success: true,
        analysisId: `culture-${clientId}-${Date.now()}`,
        clientId,
        analysisType: 'culture',
        scores: {
          alignment: 85,
          engagement: 78,
          satisfaction: 82,
          recognition: 75
        },
        insights: [
          "Strong cultural alignment with stated values (85%)",
          "Employee engagement shows room for improvement (78%)",
          "Recognition systems could be enhanced (75%)",
          "Overall culture health is good with specific improvement areas"
        ],
        recommendations: [
          "Implement quarterly culture pulse surveys",
          "Develop peer recognition program",
          "Create culture ambassador roles",
          "Establish regular feedback sessions"
        ],
        generatedAt: new Date().toISOString()
      },
      structure: {
        success: true,
        analysisId: `structure-${clientId}-${Date.now()}`,
        clientId,
        analysisType: 'structure',
        efficiency: 88,
        insights: [
          "Organizational structure supports current scale effectively",
          "Clear reporting lines with appropriate span of control",
          "Some departments could benefit from cross-functional collaboration",
          "Decision-making processes are well-defined"
        ],
        recommendations: [
          "Review manager-to-employee ratios in growing departments",
          "Clarify role responsibilities in overlapping areas",
          "Implement cross-functional collaboration protocols",
          "Establish regular structure review cycles"
        ],
        generatedAt: new Date().toISOString()
      },
      skills: {
        success: true,
        analysisId: `skills-${clientId}-${Date.now()}`,
        clientId,
        analysisType: 'skills',
        gaps: [
          { skill: "Digital Marketing", gap: "Medium", priority: "High", affectedEmployees: 15 },
          { skill: "Data Analysis", gap: "Low", priority: "Medium", affectedEmployees: 8 },
          { skill: "Leadership", gap: "High", priority: "High", affectedEmployees: 12 }
        ],
        insights: [
          "Strong technical skills across engineering teams",
          "Digital marketing capabilities need development",
          "Leadership skills gap identified in middle management",
          "Data analysis skills are adequate but could be enhanced"
        ],
        recommendations: [
          "Develop comprehensive digital marketing training program",
          "Create mentorship programs for leadership development",
          "Invest in data analytics tools and training",
          "Establish skills assessment and development framework"
        ],
        generatedAt: new Date().toISOString()
      }
    };

    const result = analysisResults[analysisType];
    if (!result) {
      return res.status(400).json({
        success: false,
        error: `Unknown analysis type: ${analysisType}`
      });
    }

    res.json({
      success: true,
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Analysis failed'
    });
  }
});

// Client data status endpoint
router.get('/clients/:clientId/data', (req, res) => {
  try {
    const { clientId } = req.params;
    
    const dataStatus = {
      culture: {
        hasData: true,
        required: 'Employee surveys',
        status: 'complete',
        count: 45,
        lastUpdated: new Date().toISOString()
      },
      structure: {
        hasData: true,
        required: 'Org chart',
        status: 'complete',
        lastUpdated: new Date().toISOString()
      },
      skills: {
        hasData: false,
        required: 'Employee profiles',
        status: 'missing',
        count: 0,
        lastUpdated: null
      }
    };

    res.json({
      success: true,
      clientId,
      dataStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch data status'
    });
  }
});

export default router;
