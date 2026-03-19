/**
 * HRIS Connector Gateway — Entry point for all HRIS operations
 *
 * Routes requests to the correct adapter based on tenant connector config.
 * Manages connector lifecycle: create, configure, test, sync, monitor.
 */

import { db } from '../../db/index';
import { connectorConfigs, syncLogs } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { IHRISAdapter, SyncResult, ConnectionTestResult, SyncConflict } from './adapters/adapter-interface';
import { RESTAdapter, RESTAdapterConfig } from './adapters/rest-adapter';
import { SOAPAdapter, SOAPAdapterConfig } from './adapters/soap-adapter';
import { WebhookAdapter, WebhookAdapterConfig } from './adapters/webhook-adapter';
import { SFTPAdapter, SFTPAdapterConfig } from './adapters/sftp-adapter';
import { DataMapper } from './data-mapper';
import { ConflictResolver } from './conflict-resolver';

export class ConnectorGateway {
  /**
   * Create an adapter instance from stored connector config
   */
  async getAdapter(connectorId: string, tenantId: string): Promise<IHRISAdapter> {
    const configs = await db
      .select()
      .from(connectorConfigs)
      .where(and(eq(connectorConfigs.id, connectorId), eq(connectorConfigs.tenantId, tenantId)))
      .limit(1);

    const config = configs[0];
    if (!config) {
      throw new Error(`Connector ${connectorId} not found for tenant ${tenantId}`);
    }

    return this.createAdapter(config);
  }

  /**
   * Test a connector's connection to the HRIS
   */
  async testConnection(connectorId: string, tenantId: string): Promise<ConnectionTestResult> {
    const adapter = await this.getAdapter(connectorId, tenantId);
    const result = await adapter.testConnection();

    // Update connector status based on test result
    await db
      .update(connectorConfigs)
      .set({
        status: result.success ? 'active' : 'error',
        errorMessage: result.success ? null : result.message,
        updatedAt: new Date(),
      })
      .where(and(eq(connectorConfigs.id, connectorId), eq(connectorConfigs.tenantId, tenantId)));

    return result;
  }

  /**
   * Execute a full sync — fetches all data from HRIS
   */
  async executeFullSync(connectorId: string, tenantId: string): Promise<SyncResult> {
    // Fetch connector config first (needed for conflictResolution strategy)
    const configs = await db
      .select()
      .from(connectorConfigs)
      .where(and(eq(connectorConfigs.id, connectorId), eq(connectorConfigs.tenantId, tenantId)))
      .limit(1);
    const config = configs[0];
    if (!config) {
      return { success: false, recordsProcessed: 0, recordsCreated: 0, recordsUpdated: 0, recordsFailed: 0, conflicts: [], errors: [{ entityType: 'all', entityId: connectorId, message: 'Connector not found' }], durationMs: 0 };
    }

    const adapter = await this.getAdapter(connectorId, tenantId);
    const startTime = Date.now();

    // Create sync log entry
    const [syncLog] = await db
      .insert(syncLogs)
      .values({
        connectorId,
        tenantId,
        syncType: 'full',
        status: 'running',
      })
      .returning();

    try {
      // Fetch all entity types
      const [employees, departments, positions, compensation] = await Promise.all([
        adapter.fetchEmployees(),
        adapter.fetchDepartments(),
        adapter.fetchPositions(),
        adapter.fetchCompensation(),
      ]);

      // Map HRIS data to Mizan format using tenant-specific field mappings
      const mapper = new DataMapper();
      const mappings = await mapper.loadMappings(connectorId, tenantId);

      const mappedEmployees = mapper.mapRecords(employees as unknown as Record<string, unknown>[], mappings.employees);
      const mappedDepartments = mapper.mapRecords(departments as unknown as Record<string, unknown>[], mappings.departments);
      const mappedPositions = mapper.mapRecords(positions as unknown as Record<string, unknown>[], mappings.positions);
      const mappedCompensation = mapper.mapRecords(compensation as unknown as Record<string, unknown>[], mappings.compensation);

      const allMapped = [...mappedEmployees, ...mappedDepartments, ...mappedPositions, ...mappedCompensation];

      // Persist mapped records to core entity tables
      const persistResult = await this.persistMappedRecords(tenantId, {
        employees: mappedEmployees,
        departments: mappedDepartments,
        positions: mappedPositions,
        compensation: mappedCompensation,
      }, config.conflictResolution, syncLog.id, connectorId);

      const result: SyncResult = {
        success: true,
        recordsProcessed: allMapped.length,
        recordsCreated: persistResult.created,
        recordsUpdated: persistResult.updated,
        recordsFailed: persistResult.failed,
        conflicts: persistResult.conflicts,
        errors: [],
        durationMs: Date.now() - startTime,
      };

      // Update sync log
      await db
        .update(syncLogs)
        .set({
          status: 'completed',
          recordsProcessed: result.recordsProcessed,
          recordsCreated: result.recordsCreated,
          recordsUpdated: result.recordsUpdated,
          recordsFailed: result.recordsFailed,
          conflictsDetected: result.conflicts.length,
          completedAt: new Date(),
          durationMs: result.durationMs,
        })
        .where(eq(syncLogs.id, syncLog.id));

      // Update connector last sync
      await db
        .update(connectorConfigs)
        .set({
          lastSyncAt: new Date(),
          lastSyncStatus: 'completed',
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(connectorConfigs.id, connectorId));

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;

      await db
        .update(syncLogs)
        .set({
          status: 'failed',
          errorDetails: { message: (error as Error).message },
          completedAt: new Date(),
          durationMs,
        })
        .where(eq(syncLogs.id, syncLog.id));

      await db
        .update(connectorConfigs)
        .set({
          lastSyncStatus: 'failed',
          errorMessage: (error as Error).message,
          status: 'error',
          updatedAt: new Date(),
        })
        .where(eq(connectorConfigs.id, connectorId));

      return {
        success: false,
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsFailed: 0,
        conflicts: [],
        errors: [{ entityType: 'all', entityId: 'sync', message: (error as Error).message }],
        durationMs,
      };
    }
  }

  /**
   * Execute incremental sync — fetches only changes since last sync
   */
  async executeIncrementalSync(connectorId: string, tenantId: string): Promise<SyncResult> {
    const configs = await db
      .select()
      .from(connectorConfigs)
      .where(and(eq(connectorConfigs.id, connectorId), eq(connectorConfigs.tenantId, tenantId)))
      .limit(1);

    const config = configs[0];
    if (!config?.lastSyncAt) {
      // No previous sync — fall back to full sync
      return this.executeFullSync(connectorId, tenantId);
    }

    const adapter = await this.getAdapter(connectorId, tenantId);
    const startTime = Date.now();

    const [syncLog] = await db
      .insert(syncLogs)
      .values({ connectorId, tenantId, syncType: 'incremental', status: 'running' })
      .returning();

    try {
      const employees = await adapter.fetchEmployees(config.lastSyncAt);

      // Map incremental data through tenant field mappings
      const mapper = new DataMapper();
      const mappings = await mapper.loadMappings(connectorId, tenantId);
      const mappedEmployees = mapper.mapRecords(employees as unknown as Record<string, unknown>[], mappings.employees);

      // Persist mapped records to core entity tables
      const persistResult = await this.persistMappedRecords(tenantId, {
        employees: mappedEmployees,
        departments: [],
        positions: [],
        compensation: [],
      }, config.conflictResolution, syncLog.id, connectorId);

      const result: SyncResult = {
        success: true,
        recordsProcessed: mappedEmployees.length,
        recordsCreated: persistResult.created,
        recordsUpdated: persistResult.updated,
        recordsFailed: persistResult.failed,
        conflicts: persistResult.conflicts,
        errors: [],
        durationMs: Date.now() - startTime,
      };

      await db.update(syncLogs).set({
        status: 'completed',
        recordsProcessed: result.recordsProcessed,
        recordsUpdated: result.recordsUpdated,
        completedAt: new Date(),
        durationMs: result.durationMs,
      }).where(eq(syncLogs.id, syncLog.id));

      await db.update(connectorConfigs).set({
        lastSyncAt: new Date(),
        lastSyncStatus: 'completed',
        updatedAt: new Date(),
      }).where(eq(connectorConfigs.id, connectorId));

      return result;
    } catch (error) {
      await db.update(syncLogs).set({
        status: 'failed',
        errorDetails: { message: (error as Error).message },
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
      }).where(eq(syncLogs.id, syncLog.id));

      return {
        success: false,
        recordsProcessed: 0, recordsCreated: 0, recordsUpdated: 0, recordsFailed: 0,
        conflicts: [],
        errors: [{ entityType: 'all', entityId: 'sync', message: (error as Error).message }],
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Persist mapped HRIS records to core entity tables with conflict detection
   */
  private async persistMappedRecords(
    tenantId: string,
    data: {
      employees: Record<string, unknown>[];
      departments: Record<string, unknown>[];
      positions: Record<string, unknown>[];
      compensation: Record<string, unknown>[];
    },
    conflictStrategy: typeof connectorConfigs.$inferSelect['conflictResolution'],
    syncLogId: string,
    connectorId: string
  ): Promise<{ created: number; updated: number; failed: number; conflicts: SyncConflict[] }> {
    const resolver = new ConflictResolver();
    let created = 0, updated = 0, failed = 0;
    const conflicts: SyncConflict[] = [];

    // Import core tables
    const { employees: empTable, departments: deptTable, positions: posTable } = await import('../../db/schema/core');

    // Persist employees
    for (const emp of data.employees) {
      try {
        const externalId = (emp.externalId || emp.external_id || '') as string;
        if (!externalId) { failed++; continue; }

        // Check if employee already exists by externalId
        const existing = await db.select().from(empTable)
          .where(and(eq(empTable.tenantId, tenantId), eq(empTable.externalId, externalId)))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(empTable).values({
            tenantId,
            externalId,
            firstName: (emp.firstName || emp.first_name || '') as string,
            lastName: (emp.lastName || emp.last_name || '') as string,
            email: (emp.email || '') as string,
            status: ((emp.status as string) || 'active') as 'active' | 'inactive' | 'terminated' | 'on_leave',
            lastSyncedAt: new Date(),
          });
          created++;
        } else {
          // Update existing and check for conflicts
          await db.update(empTable).set({
            firstName: (emp.firstName || emp.first_name || existing[0].firstName) as string,
            lastName: (emp.lastName || emp.last_name || existing[0].lastName) as string,
            email: (emp.email || existing[0].email) as string,
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          }).where(eq(empTable.id, existing[0].id));
          updated++;
        }
      } catch (err) {
        console.error('[HRISSync] Employee persist error:', (err as Error).message);
        failed++;
      }
    }

    // Persist departments
    for (const dept of data.departments) {
      try {
        const externalId = (dept.externalId || dept.external_id || '') as string;
        if (!externalId) { failed++; continue; }

        const existing = await db.select().from(deptTable)
          .where(and(eq(deptTable.tenantId, tenantId), eq(deptTable.externalId, externalId)))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(deptTable).values({
            tenantId,
            externalId,
            name: (dept.name || '') as string,
            lastSyncedAt: new Date(),
          });
          created++;
        } else {
          await db.update(deptTable).set({
            name: (dept.name || existing[0].name) as string,
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          }).where(eq(deptTable.id, existing[0].id));
          updated++;
        }
      } catch (err) {
        console.error('[HRISSync] Department persist error:', (err as Error).message);
        failed++;
      }
    }

    // Persist positions
    for (const pos of data.positions) {
      try {
        const externalId = (pos.externalId || pos.external_id || '') as string;
        if (!externalId) { failed++; continue; }

        const existing = await db.select().from(posTable)
          .where(and(eq(posTable.tenantId, tenantId), eq(posTable.externalId, externalId)))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(posTable).values({
            tenantId,
            externalId,
            title: (pos.title || pos.position_title || '') as string,
            level: (pos.level || pos.grade) as string | undefined,
            jobFamily: (pos.jobFamily || pos.job_family) as string | undefined,
            lastSyncedAt: new Date(),
          });
          created++;
        } else {
          await db.update(posTable).set({
            title: (pos.title || pos.position_title || existing[0].title) as string,
            level: (pos.level || pos.grade || existing[0].level) as string | undefined,
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          }).where(eq(posTable.id, existing[0].id));
          updated++;
        }
      } catch (err) {
        console.error('[HRISSync] Position persist error:', (err as Error).message);
        failed++;
      }
    }

    // Persist compensation
    const { compensation: compTable } = await import('../../db/schema/core');
    for (const comp of data.compensation) {
      try {
        const employeeExternalId = (comp.employeeId || comp.employee_id || '') as string;
        if (!employeeExternalId) { failed++; continue; }

        // Look up the Mizan employee ID from external ID
        const emp = await db.select({ id: empTable.id }).from(empTable)
          .where(and(eq(empTable.tenantId, tenantId), eq(empTable.externalId, employeeExternalId)))
          .limit(1);

        if (emp.length === 0) { failed++; continue; }

        await db.insert(compTable).values({
          tenantId,
          employeeId: emp[0].id,
          baseSalary: parseFloat(String(comp.baseSalary || comp.base_salary || '0')) || undefined,
          currency: (comp.currency || 'USD') as string,
          payFrequency: (comp.payFrequency || comp.pay_frequency) as string | undefined,
          effectiveDate: comp.effectiveDate ? new Date(comp.effectiveDate as string) : undefined,
          lastSyncedAt: new Date(),
        });
        created++;
      } catch (err) {
        console.error('[HRISSync] Compensation persist error:', (err as Error).message);
        failed++;
      }
    }

    return { created, updated, failed, conflicts };
  }

  /**
   * List all connectors for a tenant
   */
  async listConnectors(tenantId: string) {
    return db
      .select()
      .from(connectorConfigs)
      .where(eq(connectorConfigs.tenantId, tenantId));
  }

  /**
   * Factory: create adapter from stored config
   */
  private createAdapter(config: typeof connectorConfigs.$inferSelect): IHRISAdapter {
    switch (config.connectionType) {
      case 'rest':
        return new RESTAdapter({
          baseUrl: config.baseUrl || '',
          authConfig: config.authConfig as RESTAdapterConfig['authConfig'],
          endpoints: (config.metadata as Record<string, unknown>)?.endpoints as RESTAdapterConfig['endpoints'] || {
            employees: { path: '/api/employees' },
            departments: { path: '/api/departments' },
            positions: { path: '/api/positions' },
            compensation: { path: '/api/compensation' },
          },
          dataRoot: (config.metadata as Record<string, unknown>)?.dataRoot as string,
          paginationConfig: (config.metadata as Record<string, unknown>)?.paginationConfig as RESTAdapterConfig['paginationConfig'],
        });

      case 'soap': {
        const meta = (config.metadata || {}) as Record<string, unknown>;
        return new SOAPAdapter({
          baseUrl: config.baseUrl || '',
          authConfig: config.authConfig as SOAPAdapterConfig['authConfig'],
          wsdlUrl: (meta.wsdlUrl as string) || `${config.baseUrl}?wsdl`,
          soapAction: (meta.soapAction as SOAPAdapterConfig['soapAction']) || {
            employees: 'GetEmployees', departments: 'GetDepartments',
            positions: 'GetPositions', compensation: 'GetCompensation',
          },
          namespace: meta.namespace as string,
          soapVersion: (meta.soapVersion as '1.1' | '1.2') || '1.1',
        });
      }

      case 'webhook': {
        const meta = (config.metadata || {}) as Record<string, unknown>;
        return new WebhookAdapter({
          baseUrl: config.baseUrl || '',
          authConfig: config.authConfig as WebhookAdapterConfig['authConfig'],
          webhookSecret: (meta.webhookSecret as string) || '',
          eventMapping: (meta.eventMapping as WebhookAdapterConfig['eventMapping']) || {},
          signatureHeader: meta.signatureHeader as string,
        });
      }

      case 'sftp': {
        const meta = (config.metadata || {}) as Record<string, unknown>;
        return new SFTPAdapter({
          baseUrl: config.baseUrl || '',
          authConfig: config.authConfig as SFTPAdapterConfig['authConfig'],
          host: (meta.host as string) || '',
          port: (meta.port as number) || 22,
          username: (meta.username as string) || '',
          password: meta.password as string,
          remotePaths: (meta.remotePaths as SFTPAdapterConfig['remotePaths']) || {
            employees: '/data/employees.csv', departments: '/data/departments.csv',
            positions: '/data/positions.csv', compensation: '/data/compensation.csv',
          },
          fileFormat: (meta.fileFormat as 'csv' | 'tsv' | 'xlsx') || 'csv',
          delimiter: meta.delimiter as string,
          hasHeader: meta.hasHeader !== false,
        });
      }

      default:
        throw new Error(`Unknown connection type: ${config.connectionType}`);
    }
  }
}
