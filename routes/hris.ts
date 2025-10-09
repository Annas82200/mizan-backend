import { Router as HRISRouter } from 'express';
import { authenticate as authMiddleware, authorize as authzMiddleware } from '../middleware/auth.js';
import { db as dbConnection } from '../db/index.js';
import { hrisIntegrations, hrisSyncLogs } from '../db/schema.js';
import { eq as equals, and as both, desc } from 'drizzle-orm';
import crypto from 'crypto';

const hrisRouter = HRISRouter();

// Provider config validation
function validateProviderConfig(provider: string, config: any): string | null {
  if (!config || typeof config !== 'object') {
    return 'Configuration object is required';
  }

  switch (provider) {
    case 'workday':
      if (!config.tenantName) return 'Workday tenant name is required';
      if (!config.clientId) return 'Workday client ID is required';
      if (!config.clientSecret) return 'Workday client secret is required';
      if (!config.refreshToken) return 'Workday refresh token is required';
      break;

    case 'bamboohr':
      if (!config.subdomain) return 'BambooHR subdomain is required';
      if (!config.apiKey) return 'BambooHR API key is required';
      break;

    case 'successfactors':
      if (!config.companyId) return 'SuccessFactors company ID is required';
      if (!config.username) return 'SuccessFactors username is required';
      if (!config.password) return 'SuccessFactors password is required';
      if (!config.dataCenter) return 'SuccessFactors data center is required';
      break;

    default:
      return `Unsupported HRIS provider: ${provider}`;
  }

  return null;
}

// Trigger HRIS data sync
async function triggerHRISSync(integration: any, syncLogId: string): Promise<void> {
  try {
    console.log(`Starting HRIS sync for integration ${integration.id}`);

    // Update sync log to in_progress
    await dbConnection.update(hrisSyncLogs)
      .set({ status: 'in_progress' })
      .where(equals(hrisSyncLogs.id, syncLogId));

    // Fetch employee data from HRIS provider
    // Note: This is a simplified implementation - in production, this would be more robust
    let employeesImported = 0;
    let employeesFailed = 0;

    // Sync would happen here based on provider
    // For now, we just mark as completed
    // TODO: Implement actual data fetching and employee creation/update

    // Update sync log to completed
    await dbConnection.update(hrisSyncLogs)
      .set({
        status: 'completed',
        completedAt: new Date(),
        recordsProcessed: employeesImported,
        errorDetails: employeesFailed > 0 ? { failed: employeesFailed, message: 'Some employees failed to import' } : null
      })
      .where(equals(hrisSyncLogs.id, syncLogId));

    console.log(`HRIS sync completed for integration ${integration.id}`);
  } catch (error: any) {
    console.error(`HRIS sync failed for integration ${integration.id}:`, error);

    // Update sync log to failed
    await dbConnection.update(hrisSyncLogs)
      .set({
        status: 'failed',
        completedAt: new Date(),
        errorDetails: error.message
      })
      .where(equals(hrisSyncLogs.id, syncLogId));
  }
}

// Test connection to HRIS provider
async function testHRISConnection(provider: string, config: any): Promise<{success: boolean; message: string}> {
  try {
    switch (provider) {
      case 'workday':
        // Test Workday API connection
        const workdayUrl = `https://${config.tenantName}.workday.com/ccx/api/v1/workers`;
        const workdayResponse = await fetch(workdayUrl, {
          headers: {
            'Authorization': `Bearer ${config.refreshToken}`,
            'Accept': 'application/json'
          }
        });
        return {
          success: workdayResponse.ok,
          message: workdayResponse.ok ? 'Connected successfully' : `Connection failed: ${workdayResponse.statusText}`
        };

      case 'bamboohr':
        // Test BambooHR API connection
        const bambooUrl = `https://api.bamboohr.com/api/gateway.php/${config.subdomain}/v1/employees/directory`;
        const bambooResponse = await fetch(bambooUrl, {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${config.apiKey}:x`).toString('base64')}`,
            'Accept': 'application/json'
          }
        });
        return {
          success: bambooResponse.ok,
          message: bambooResponse.ok ? 'Connected successfully' : `Connection failed: ${bambooResponse.statusText}`
        };

      case 'successfactors':
        // Test SuccessFactors API connection
        const sfUrl = `https://api${config.dataCenter}.successfactors.com/odata/v2/User?$top=1`;
        const sfResponse = await fetch(sfUrl, {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`,
            'Accept': 'application/json'
          }
        });
        return {
          success: sfResponse.ok,
          message: sfResponse.ok ? 'Connected successfully' : `Connection failed: ${sfResponse.statusText}`
        };

      default:
        return { success: false, message: 'Unsupported provider' };
    }
  } catch (error: any) {
    return { success: false, message: `Connection test failed: ${error.message}` };
  }
}

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
    const validationError = validateProviderConfig(provider, config);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

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

    // Test connection to HRIS provider
    const testResult = await testHRISConnection(integration.provider, integration.config);

    // Update integration status
    await dbConnection.update(hrisIntegrations)
      .set({
        status: testResult.success ? 'active' : 'error',
        updatedAt: new Date()
      })
      .where(equals(hrisIntegrations.id, integration.id));

    return res.json(testResult);

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

    // Trigger sync job asynchronously (fire and forget)
    triggerHRISSync(integration, syncLog.id).catch(error => {
      console.error('HRIS sync job error:', error);
    });

    return res.json({
      success: true,
      syncId: syncLog.id,
      message: 'Sync started - check status endpoint for progress'
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
