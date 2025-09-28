// server/services/hris/index.ts

import { db } from '../../db/index.js';
import { hrisIntegrations, hrisSyncLogs, users, companies } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

export interface HRISProvider {
  name: string;
  syncEmployees: (config: any, tenantId: string) => Promise<SyncResult>;
  syncDepartments: (config: any, tenantId: string) => Promise<SyncResult>;
  syncCompensation: (config: any, tenantId: string) => Promise<SyncResult>;
}

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  errors: string[];
  data?: any[];
}

export interface EmployeeData {
  id: string;
  email: string;
  name: string;
  department: string;
  position: string;
  manager?: string;
  startDate: Date;
  status: 'active' | 'inactive';
  salary?: number;
  location?: string;
}

export interface DepartmentData {
  id: string;
  name: string;
  manager?: string;
  parentDepartment?: string;
  costCenter?: string;
}

// HRIS Provider implementations
class BambooHRProvider implements HRISProvider {
  name = 'bamboo_hr';

  async syncEmployees(config: any, tenantId: string): Promise<SyncResult> {
    try {
      console.log('Syncing employees from BambooHR...');
      
      // Mock implementation - in reality would call BambooHR API
      const mockEmployees: EmployeeData[] = [
        {
          id: 'emp-001',
          email: 'john.doe@company.com',
          name: 'John Doe',
          department: 'Engineering',
          position: 'Senior Developer',
          startDate: new Date('2022-01-15'),
          status: 'active',
          salary: 95000,
          location: 'San Francisco'
        },
        {
          id: 'emp-002',
          email: 'jane.smith@company.com',
          name: 'Jane Smith',
          department: 'Marketing',
          position: 'Marketing Manager',
          startDate: new Date('2021-06-01'),
          status: 'active',
          salary: 85000,
          location: 'New York'
        }
      ];

      const result = await this.processEmployeeData(mockEmployees, tenantId);
      
      return {
        success: true,
        recordsProcessed: mockEmployees.length,
        recordsCreated: result.created,
        recordsUpdated: result.updated,
        errors: result.errors
      };
    } catch (error) {
      console.error('BambooHR sync failed:', error);
      return {
        success: false,
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        errors: [error.message]
      };
    }
  }

  async syncDepartments(config: any, tenantId: string): Promise<SyncResult> {
    try {
      console.log('Syncing departments from BambooHR...');
      
      // Mock implementation
      const mockDepartments: DepartmentData[] = [
        {
          id: 'dept-001',
          name: 'Engineering',
          manager: 'emp-001',
          costCenter: 'CC-ENG'
        },
        {
          id: 'dept-002',
          name: 'Marketing',
          manager: 'emp-002',
          costCenter: 'CC-MKT'
        }
      ];

      const result = await this.processDepartmentData(mockDepartments, tenantId);
      
      return {
        success: true,
        recordsProcessed: mockDepartments.length,
        recordsCreated: result.created,
        recordsUpdated: result.updated,
        errors: result.errors
      };
    } catch (error) {
      console.error('BambooHR department sync failed:', error);
      return { 
        success: false, 
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        errors: [error.message]
      };
    }
  }

  async syncCompensation(config: any, tenantId: string): Promise<SyncResult> {
    try {
      console.log('Syncing compensation from BambooHR...');
      
      // Mock implementation
      return {
        success: true,
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        errors: []
      };
    } catch (error) {
      console.error('BambooHR compensation sync failed:', error);
      return {
        success: false,
        recordsProcessed: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        errors: [error.message]
      };
    }
  }

  private async processEmployeeData(employees: EmployeeData[], tenantId: string): Promise<{created: number, updated: number, errors: string[]}> {
    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const emp of employees) {
      try {
        // Check if user exists
        const existingUser = await db.query.users.findFirst({
          where: eq(users.email, emp.email)
        });

        if (existingUser) {
          // Update existing user
          await db.update(users)
            .set({
              name: emp.name,
              updatedAt: new Date()
            })
            .where(eq(users.id, existingUser.id));
          updated++;
        } else {
          // Create new user
          await db.insert(users).values({
            id: randomUUID(),
            tenantId,
            email: emp.email,
            passwordHash: 'temp-password', // Would be set during onboarding
            name: emp.name,
            role: 'employee',
            isActive: emp.status === 'active',
            createdAt: new Date(),
            updatedAt: new Date()
          });
          created++;
        }
      } catch (error) {
        errors.push(`Failed to process employee ${emp.email}: ${error.message}`);
      }
    }

    return { created, updated, errors };
  }

  private async processDepartmentData(departments: DepartmentData[], tenantId: string): Promise<{created: number, updated: number, errors: string[]}> {
    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const dept of departments) {
      try {
        // Get company for tenant
        const company = await db.query.companies.findFirst({
          where: eq(companies.tenantId, tenantId)
        });

        if (!company) {
          errors.push(`No company found for tenant ${tenantId}`);
          continue;
        }

        // Check if department exists
        const existingDept = await db.query.departments.findFirst({
          where: eq('name', dept.name)
        });

        if (existingDept) {
          // Update existing department
          await db.update('departments')
            .set({
              managerId: dept.manager,
              updatedAt: new Date()
            })
            .where(eq('id', existingDept.id));
          updated++;
        } else {
          // Create new department
          await db.insert('departments').values({
            id: randomUUID(),
            tenantId,
            companyId: company.id,
            name: dept.name,
            managerId: dept.manager,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          created++;
        }
    } catch (error) {
        errors.push(`Failed to process department ${dept.name}: ${error.message}`);
      }
    }

    return { created, updated, errors };
  }
}

class WorkdayProvider implements HRISProvider {
  name = 'workday';

  async syncEmployees(config: any, tenantId: string): Promise<SyncResult> {
    // Mock Workday implementation
    return {
      success: true,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      errors: []
    };
  }

  async syncDepartments(config: any, tenantId: string): Promise<SyncResult> {
    return {
      success: true,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      errors: []
    };
  }

  async syncCompensation(config: any, tenantId: string): Promise<SyncResult> {
      return { 
      success: true,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      errors: []
    };
  }
}

class ADPProvider implements HRISProvider {
  name = 'adp';

  async syncEmployees(config: any, tenantId: string): Promise<SyncResult> {
    return {
      success: true,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      errors: []
    };
  }

  async syncDepartments(config: any, tenantId: string): Promise<SyncResult> {
    return {
      success: true,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      errors: []
    };
  }

  async syncCompensation(config: any, tenantId: string): Promise<SyncResult> {
      return {
      success: true,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      errors: []
    };
  }
}

// Provider registry
const providers: Record<string, HRISProvider> = {
  'bamboo_hr': new BambooHRProvider(),
  'workday': new WorkdayProvider(),
  'adp': new ADPProvider()
};

// Main sync functions
export async function syncEmployees(integration: any, tenantId: string): Promise<SyncResult> {
  const provider = providers[integration.provider];
  
  if (!provider) {
    throw new Error(`Unknown HRIS provider: ${integration.provider}`);
  }

  return provider.syncEmployees(integration.config, tenantId);
}

export async function syncDepartments(integration: any, tenantId: string): Promise<SyncResult> {
  const provider = providers[integration.provider];
  
  if (!provider) {
    throw new Error(`Unknown HRIS provider: ${integration.provider}`);
  }

  return provider.syncDepartments(integration.config, tenantId);
}

export async function syncCompensation(integration: any, tenantId: string): Promise<SyncResult> {
  const provider = providers[integration.provider];
  
  if (!provider) {
    throw new Error(`Unknown HRIS provider: ${integration.provider}`);
  }

  return provider.syncCompensation(integration.config, tenantId);
}

export async function syncAllHRISData(integrationId: string, tenantId: string): Promise<SyncResult> {
  try {
    const integration = await db.query.hrisIntegrations.findFirst({
      where: eq(hrisIntegrations.id, integrationId)
    });

    if (!integration) {
      throw new Error('HRIS integration not found');
    }

    console.log(`Starting full HRIS sync for ${integration.provider}...`);

    // Sync all data types
    const [employeesResult, departmentsResult, compensationResult] = await Promise.allSettled([
      syncEmployees(integration, tenantId),
      syncDepartments(integration, tenantId),
      syncCompensation(integration, tenantId)
    ]);

    // Aggregate results
    const totalProcessed = [
      employeesResult.status === 'fulfilled' ? employeesResult.value.recordsProcessed : 0,
      departmentsResult.status === 'fulfilled' ? departmentsResult.value.recordsProcessed : 0,
      compensationResult.status === 'fulfilled' ? compensationResult.value.recordsProcessed : 0
    ].reduce((sum, count) => sum + count, 0);

    const totalCreated = [
      employeesResult.status === 'fulfilled' ? employeesResult.value.recordsCreated : 0,
      departmentsResult.status === 'fulfilled' ? departmentsResult.value.recordsCreated : 0,
      compensationResult.status === 'fulfilled' ? compensationResult.value.recordsCreated : 0
    ].reduce((sum, count) => sum + count, 0);

    const totalUpdated = [
      employeesResult.status === 'fulfilled' ? employeesResult.value.recordsUpdated : 0,
      departmentsResult.status === 'fulfilled' ? departmentsResult.value.recordsUpdated : 0,
      compensationResult.status === 'fulfilled' ? compensationResult.value.recordsUpdated : 0
    ].reduce((sum, count) => sum + count, 0);

    const allErrors = [
      ...(employeesResult.status === 'fulfilled' ? employeesResult.value.errors : ['Employee sync failed']),
      ...(departmentsResult.status === 'fulfilled' ? departmentsResult.value.errors : ['Department sync failed']),
      ...(compensationResult.status === 'fulfilled' ? compensationResult.value.errors : ['Compensation sync failed'])
    ];

    const success = allErrors.length === 0;

    // Update last sync time
    await db.update(hrisIntegrations)
      .set({
        lastSyncAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(hrisIntegrations.id, integrationId));

    console.log(`HRIS sync completed. Processed: ${totalProcessed}, Created: ${totalCreated}, Updated: ${totalUpdated}`);

    return {
      success,
      recordsProcessed: totalProcessed,
      recordsCreated: totalCreated,
      recordsUpdated: totalUpdated,
      errors: allErrors
    };

    } catch (error) {
    console.error('HRIS sync failed:', error);
      return { 
        success: false, 
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      errors: [error.message]
    };
  }
}

// Utility functions
export function getSupportedProviders(): string[] {
  return Object.keys(providers);
}

export function getProviderConfig(provider: string): any {
  const providerInstance = providers[provider];
  if (!providerInstance) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  // Return default configuration template
  switch (provider) {
    case 'bamboo_hr':
      return {
        apiKey: '',
        subdomain: '',
        fields: ['id', 'firstName', 'lastName', 'email', 'department', 'jobTitle', 'hireDate']
      };
    case 'workday':
      return {
        tenantId: '',
        clientId: '',
        clientSecret: '',
        refreshToken: ''
      };
    case 'adp':
      return {
        clientId: '',
        clientSecret: '',
        refreshToken: ''
      };
    default:
      return {};
  }
}