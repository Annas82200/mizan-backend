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
superadminRouter.get('/framework', async (req, res) => {
  try {
    const cylindersData = await database.query.cylinders.findMany({
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

superadminRouter.put('/framework/cylinder/:level', async (req, res) => {
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
    const existingCylinder = await database.query.cylinders.findFirst({
      where: equal(cylinders.level, level)
    });
    
    let cylinderId;
    
    if (existingCylinder) {
      // Update existing
      const [updated] = await database.update(cylinders)
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
      await database.delete(cylinderValues)
        .where(equal(cylinderValues.cylinderId, cylinderId));
    } else {
      // Create new
      const [created] = await database.insert(cylinders)
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
    
    await database.insert(cylinderValues)
      .values(valuesToInsert);
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Cylinder update error:', error);
    res.status(500).json({ error: 'Failed to update cylinder' });
  }
});

// AI Training
superadminRouter.get('/ai-training', async (req, res) => {
  try {
    const trainingData = await database.query.agentTrainingData.findMany({
      orderBy: [desc(agentTrainingData.createdAt)]
    });
    
    res.json(trainingData);
    
  } catch (error) {
    console.error('Training data fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch training data' });
  }
});

superadminRouter.post('/ai-training', async (req, res) => {
  try {
    const schema = zod.object({
      agentType: zod.string(),
      trainingType: zod.enum(['knowledge', 'examples', 'feedback']),
      data: zod.any()
    });
    
    const validatedData = schema.parse(req.body);
    
    const [training] = await database.insert(agentTrainingData)
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
superadminRouter.get('/providers', async (req, res) => {
  try {
    const policies = await database.query.providerPolicies.findMany();
    
    res.json({
      policies,
      availableProviders: ['openai', 'anthropic', 'gemini', 'mistral']
    });
    
  } catch (error) {
    console.error('Providers fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch providers' });
  }
});

superadminRouter.put('/providers/:provider', async (req, res) => {
  try {
    const { isActive, priority, config } = req.body;
    const provider = req.params.provider;
    
    const existing = await database.query.providerPolicies.findFirst({
      where: equal(providerPolicies.provider, provider)
    });
    
    if (existing) {
      const [updated] = await database.update(providerPolicies)
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
      const [created] = await database.insert(providerPolicies)
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
superadminRouter.get('/tenants', async (req, res) => {
  try {
    const tenantList = await database.query.tenants.findMany({
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

superadminRouter.put('/tenants/:id', async (req, res) => {
  try {
    const { status, plan, settings } = req.body;
    
    const [updated] = await database.update(tenants)
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

export default superadminRouter;
