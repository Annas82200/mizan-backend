// @ts-nocheck
/**
 * HRIS Adapter Interface — Base contract for all HRIS connectors
 *
 * Every HRIS adapter (REST, SOAP, Webhook, SFTP) implements this interface.
 * The Connector Gateway routes requests to the appropriate adapter.
 */

export interface HRISEmployee {
  externalId: string;
  firstName: string;
  lastName: string;
  email: string;
  department?: string;
  position?: string;
  managerId?: string;
  hireDate?: string;
  status?: 'active' | 'inactive' | 'terminated' | 'on_leave';
  location?: string;
  phoneNumber?: string;
  customFields?: Record<string, unknown>;
}

export interface HRISDepartment {
  externalId: string;
  name: string;
  parentId?: string;
  headId?: string;
  costCenter?: string;
  customFields?: Record<string, unknown>;
}

export interface HRISPosition {
  externalId: string;
  title: string;
  departmentId?: string;
  level?: string;
  jobFamily?: string;
  isVacant?: boolean;
  customFields?: Record<string, unknown>;
}

export interface HRISCompensation {
  employeeId: string;
  baseSalary?: number;
  currency?: string;
  payFrequency?: string;
  effectiveDate?: string;
  customFields?: Record<string, unknown>;
}

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  conflicts: SyncConflict[];
  errors: SyncError[];
  durationMs: number;
}

export interface SyncConflict {
  entityType: string;
  entityId: string;
  fieldName: string;
  hrisValue: unknown;
  mizanValue: unknown;
}

export interface SyncError {
  entityType: string;
  entityId: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  apiVersion?: string;
  permissions?: string[];
  latencyMs: number;
}

export interface AdapterConfig {
  baseUrl: string;
  authConfig: {
    type: 'oauth2' | 'api_key' | 'basic' | 'certificate';
    credentials: Record<string, string>;
  };
  customHeaders?: Record<string, string>;
  timeout?: number;
  retryConfig?: { maxRetries: number; backoffMs: number };
}

/**
 * Base interface that all HRIS adapters must implement
 */
export interface IHRISAdapter {
  readonly adapterType: string;

  /**
   * Test the connection to the HRIS system
   */
  testConnection(): Promise<ConnectionTestResult>;

  /**
   * Fetch all employees (full sync)
   */
  fetchEmployees(since?: Date): Promise<HRISEmployee[]>;

  /**
   * Fetch all departments
   */
  fetchDepartments(): Promise<HRISDepartment[]>;

  /**
   * Fetch all positions
   */
  fetchPositions(): Promise<HRISPosition[]>;

  /**
   * Fetch compensation data
   */
  fetchCompensation(employeeIds?: string[]): Promise<HRISCompensation[]>;

  /**
   * Push data back to HRIS (if supported)
   */
  pushData?(entityType: string, data: Record<string, unknown>[]): Promise<{ success: boolean; errors: string[] }>;

  /**
   * Get the last modification timestamp for incremental sync
   */
  getLastModified?(entityType: string): Promise<Date | null>;
}

/**
 * Abstract base adapter with common HTTP/retry logic
 */
export abstract class BaseAdapter implements IHRISAdapter {
  abstract readonly adapterType: string;
  protected config: AdapterConfig;

  constructor(config: AdapterConfig) {
    this.config = config;
  }

  abstract testConnection(): Promise<ConnectionTestResult>;
  abstract fetchEmployees(since?: Date): Promise<HRISEmployee[]>;
  abstract fetchDepartments(): Promise<HRISDepartment[]>;
  abstract fetchPositions(): Promise<HRISPosition[]>;
  abstract fetchCompensation(employeeIds?: string[]): Promise<HRISCompensation[]>;

  /**
   * Generic HTTP request with retry logic
   */
  protected async httpRequest(
    url: string,
    options: RequestInit & { retries?: number } = {}
  ): Promise<Response> {
    const maxRetries = options.retries ?? this.config.retryConfig?.maxRetries ?? 3;
    const backoffMs = this.config.retryConfig?.backoffMs ?? 1000;
    const timeout = this.config.timeout ?? 30000;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            ...this.getAuthHeaders(),
            ...this.config.customHeaders,
            ...options.headers,
          },
        });

        clearTimeout(timer);

        if (response.status === 429) {
          // Rate limited — wait and retry
          const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
          await this.sleep(retryAfter * 1000);
          continue;
        }

        if (!response.ok && response.status >= 500) {
          throw new Error(`HRIS API error: ${response.status} ${response.statusText}`);
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          await this.sleep(backoffMs * Math.pow(2, attempt));
        }
      }
    }

    throw lastError || new Error('HRIS request failed after all retries');
  }

  protected getAuthHeaders(): Record<string, string> {
    const { type, credentials } = this.config.authConfig;

    switch (type) {
      case 'api_key':
        return { [credentials.headerName || 'X-API-Key']: credentials.apiKey };
      case 'basic':
        return {
          Authorization: `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')}`,
        };
      case 'oauth2':
        return { Authorization: `Bearer ${credentials.accessToken}` };
      default:
        return {};
    }
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
