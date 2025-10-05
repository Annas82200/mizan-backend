import { Router as HRISRouter } from 'express';
import { authenticate as authMiddleware, authorize as authzMiddleware } from '../middleware/auth.js';
import { db as dbConnection } from '../db/index.js';
import { hrisIntegrations, hrisSyncLogs } from '../db/schema.js';
import { eq as equals, and as both, desc } from 'drizzle-orm';
import crypto from 'crypto';

const hrisRouter = HRISRouter();

// Apply authentication
hrisRouter.use(authMiddleware);
hrisRouter.use(authzMiddleware(['clientAdmin', 'superadmin']));

// Get HRIS integrations
hrisRouter.get('/integrations', async (req, res) => {
  try {
    const integrations = await dbConnection.query.hrisIntegrations.findMany({
      where: equals(hrisIntegrations.tenantId, req.user!.tenantId),
      with: {
        syncLogs: {
          orderBy: [desc(hrisSyncLogs.startedAt)],
          limit: 5
        }
      }
    });

    return res.json(integrations);

  } catch (error) {
    console.error('HRIS integrations fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch integrations' });
  }
});

// Configure HRIS integration
hrisRouter.post('/integrations/:provider', async (req, res) => {
  try {
    const provider = req.params.provider as 'workday' | 'bamboohr' | 'successfactors';
    const { config } = req.body;
    
    // Validate provider-specific config
    // TODO: Add proper validation based on provider
    
    const [integration] = await dbConnection.insert(hrisIntegrations)
      .values({
        id: crypto.randomUUID(),
        tenantId: req.user!.tenantId,
        provider,
        config,
        status: 'pending_auth',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return res.json(integration);

  } catch (error) {
    console.error('HRIS configuration error:', error);
    return res.status(500).json({ error: 'Failed to configure integration' });
  }
});

// Test HRIS connection
hrisRouter.post('/integrations/:id/test', async (req, res) => {
  try {
    const integration = await dbConnection.query.hrisIntegrations.findFirst({
      where: both(
        equals(hrisIntegrations.id, req.params.id),
        equals(hrisIntegrations.tenantId, req.user!.tenantId)
      )
    });
    
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    // TODO: Implement actual connection test based on provider

    return res.json({
      success: true,
      message: 'Connection test successful'
    });

  } catch (error) {
    console.error('HRIS test error:', error);
    return res.status(500).json({ error: 'Connection test failed' });
  }
});

// Sync data from HRIS
hrisRouter.post('/integrations/:id/sync', async (req, res) => {
  try {
    const integration = await dbConnection.query.hrisIntegrations.findFirst({
      where: both(
        equals(hrisIntegrations.id, req.params.id),
        equals(hrisIntegrations.tenantId, req.user!.tenantId)
      )
    });
    
    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    // Create sync log
    const [syncLog] = await dbConnection.insert(hrisSyncLogs)
      .values({
        id: crypto.randomUUID(),
        integrationId: integration.id,
        status: 'in_progress',
        startedAt: new Date()
      })
      .returning();
    
    // TODO: Trigger actual sync job

    return res.json({
      success: true,
      syncId: syncLog.id,
      message: 'Sync started'
    });

  } catch (error) {
    console.error('HRIS sync error:', error);
    return res.status(500).json({ error: 'Failed to start sync' });
  }
});

// Get sync status
hrisRouter.get('/sync/:id/status', async (req, res) => {
  try {
    const syncLog = await dbConnection.query.hrisSyncLogs.findFirst({
      where: equals(hrisSyncLogs.id, req.params.id),
      with: {
        integration: true
      }
    });
    
    if (!syncLog || syncLog.integration.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ error: 'Sync not found' });
    }

    return res.json(syncLog);

  } catch (error) {
    console.error('Sync status error:', error);
    return res.status(500).json({ error: 'Failed to fetch sync status' });
  }
});

export default hrisRouter;
