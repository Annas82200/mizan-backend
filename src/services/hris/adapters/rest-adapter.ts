/**
 * REST Adapter — Generic REST API connector for HRIS systems
 *
 * Configuration-driven adapter that can connect to any HRIS with a REST API.
 * Endpoint paths, pagination style, and data mapping are all configurable.
 */

import {
  BaseAdapter,
  AdapterConfig,
  HRISEmployee,
  HRISDepartment,
  HRISPosition,
  HRISCompensation,
  ConnectionTestResult,
} from './adapter-interface';

interface RESTEndpointConfig {
  employees: { path: string; method?: string; paginationType?: 'offset' | 'cursor' | 'page'; pageSize?: number };
  departments: { path: string; method?: string };
  positions: { path: string; method?: string };
  compensation: { path: string; method?: string };
  healthCheck?: { path: string };
}

export interface RESTAdapterConfig extends AdapterConfig {
  endpoints: RESTEndpointConfig;
  dataRoot?: string; // JSON path to data array in response (e.g., "data", "results", "employees")
  paginationConfig?: {
    type: 'offset' | 'cursor' | 'page';
    limitParam: string;
    offsetParam: string;
    cursorParam?: string;
    totalField?: string;
    nextCursorField?: string;
  };
}

export class RESTAdapter extends BaseAdapter {
  readonly adapterType = 'rest';
  private restConfig: RESTAdapterConfig;

  constructor(config: RESTAdapterConfig) {
    super(config);
    this.restConfig = config;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const start = Date.now();
    try {
      const healthPath = this.restConfig.endpoints.healthCheck?.path || this.restConfig.endpoints.employees.path;
      const url = `${this.config.baseUrl}${healthPath}`;

      const response = await this.httpRequest(url, { method: 'GET', retries: 1 });

      return {
        success: response.ok,
        message: response.ok ? 'Connection successful' : `HTTP ${response.status}`,
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${(error as Error).message}`,
        latencyMs: Date.now() - start,
      };
    }
  }

  async fetchEmployees(since?: Date): Promise<HRISEmployee[]> {
    const endpoint = this.restConfig.endpoints.employees;
    let url = `${this.config.baseUrl}${endpoint.path}`;

    if (since) {
      const separator = url.includes('?') ? '&' : '?';
      url += `${separator}modified_since=${since.toISOString()}`;
    }

    return this.fetchAllPaginated<HRISEmployee>(url, endpoint.pageSize || 100);
  }

  async fetchDepartments(): Promise<HRISDepartment[]> {
    const endpoint = this.restConfig.endpoints.departments;
    const url = `${this.config.baseUrl}${endpoint.path}`;

    const response = await this.httpRequest(url);
    const json = await response.json();
    return this.extractData(json);
  }

  async fetchPositions(): Promise<HRISPosition[]> {
    const endpoint = this.restConfig.endpoints.positions;
    const url = `${this.config.baseUrl}${endpoint.path}`;

    const response = await this.httpRequest(url);
    const json = await response.json();
    return this.extractData(json);
  }

  async fetchCompensation(employeeIds?: string[]): Promise<HRISCompensation[]> {
    const endpoint = this.restConfig.endpoints.compensation;
    let url = `${this.config.baseUrl}${endpoint.path}`;

    if (employeeIds && employeeIds.length > 0) {
      url += `?employee_ids=${employeeIds.join(',')}`;
    }

    const response = await this.httpRequest(url);
    const json = await response.json();
    return this.extractData(json);
  }

  /**
   * Fetch all pages of paginated data
   */
  private async fetchAllPaginated<T>(baseUrl: string, pageSize: number): Promise<T[]> {
    const allData: T[] = [];
    const pagination = this.restConfig.paginationConfig;
    let hasMore = true;
    let offset = 0;
    let cursor: string | undefined;

    while (hasMore) {
      const separator = baseUrl.includes('?') ? '&' : '?';
      let url: string;

      if (pagination?.type === 'cursor' && cursor) {
        url = `${baseUrl}${separator}${pagination.cursorParam || 'cursor'}=${cursor}&${pagination.limitParam || 'limit'}=${pageSize}`;
      } else {
        const limitParam = pagination?.limitParam || 'limit';
        const offsetParam = pagination?.offsetParam || 'offset';
        url = `${baseUrl}${separator}${limitParam}=${pageSize}&${offsetParam}=${offset}`;
      }

      const response = await this.httpRequest(url);
      const json = await response.json();
      const data = this.extractData<T>(json);

      allData.push(...data);

      if (data.length < pageSize) {
        hasMore = false;
      } else if (pagination?.type === 'cursor') {
        cursor = this.getNestedValue(json, pagination.nextCursorField || 'next_cursor');
        hasMore = !!cursor;
      } else {
        offset += pageSize;
        // Check total if available
        if (pagination?.totalField) {
          const total = this.getNestedValue(json, pagination.totalField);
          hasMore = offset < (Number(total) || 0);
        }
      }
    }

    return allData;
  }

  /**
   * Extract data array from response using configured dataRoot
   */
  private extractData<T>(json: Record<string, unknown>): T[] {
    if (this.restConfig.dataRoot) {
      const data = this.getNestedValue(json, this.restConfig.dataRoot);
      return Array.isArray(data) ? data : [];
    }
    return Array.isArray(json) ? json as T[] : [];
  }

  /**
   * Access nested object values using dot notation (e.g., "data.employees")
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key) => {
      return (current as Record<string, unknown>)?.[key];
    }, obj);
  }
}
