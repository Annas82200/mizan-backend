// @ts-nocheck
/**
 * SFTP Adapter — File-based sync via SFTP/CSV for payroll and batch systems
 *
 * Many payroll providers and legacy HRIS systems exchange data via
 * CSV/Excel files on SFTP servers. This adapter connects to the SFTP server,
 * downloads files, parses CSV data, and maps it to Mizan entities.
 */

import net from 'net';
import {
  BaseAdapter,
  AdapterConfig,
  HRISEmployee,
  HRISDepartment,
  HRISPosition,
  HRISCompensation,
  ConnectionTestResult,
} from './adapter-interface';

export interface SFTPAdapterConfig extends AdapterConfig {
  host: string;
  port: number;
  username: string;
  privateKeyPath?: string;
  password?: string;
  remotePaths: {
    employees: string;
    departments: string;
    positions: string;
    compensation: string;
  };
  fileFormat: 'csv' | 'tsv' | 'xlsx';
  delimiter?: string;
  hasHeader?: boolean;
  encoding?: string;
}

export class SFTPAdapter extends BaseAdapter {
  readonly adapterType = 'sftp';
  private sftpConfig: SFTPAdapterConfig;

  constructor(config: SFTPAdapterConfig) {
    super(config);
    this.sftpConfig = config;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const start = Date.now();
    try {
      // Verify the SFTP host is reachable by attempting a TCP connection
      const isReachable = await new Promise<boolean>((resolve) => {
        const socket = net.createConnection({
          host: this.sftpConfig.host,
          port: this.sftpConfig.port,
          timeout: 5000,
        });
        socket.on('connect', () => { socket.destroy(); resolve(true); });
        socket.on('error', () => { socket.destroy(); resolve(false); });
        socket.on('timeout', () => { socket.destroy(); resolve(false); });
      });

      return {
        success: isReachable,
        message: isReachable
          ? `SFTP server reachable at ${this.sftpConfig.host}:${this.sftpConfig.port}`
          : `Cannot reach SFTP server at ${this.sftpConfig.host}:${this.sftpConfig.port}`,
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        success: false,
        message: `SFTP test failed: ${(error as Error).message}`,
        latencyMs: Date.now() - start,
      };
    }
  }

  async fetchEmployees(): Promise<HRISEmployee[]> {
    const csvContent = await this.downloadFile(this.sftpConfig.remotePaths.employees);
    const rows = this.parseCSV(csvContent);
    return rows.map(row => ({
      externalId: row['employee_id'] || row['id'] || row['emp_id'] || '',
      firstName: row['first_name'] || row['firstname'] || '',
      lastName: row['last_name'] || row['lastname'] || '',
      email: row['email'] || row['work_email'] || '',
      department: row['department'] || row['dept'] || undefined,
      position: row['position'] || row['job_title'] || row['title'] || undefined,
      managerId: row['manager_id'] || row['reports_to'] || undefined,
      hireDate: row['hire_date'] || row['start_date'] || undefined,
      status: this.mapStatus(row['status'] || row['employment_status']),
      location: row['location'] || row['office'] || undefined,
    }));
  }

  async fetchDepartments(): Promise<HRISDepartment[]> {
    const csvContent = await this.downloadFile(this.sftpConfig.remotePaths.departments);
    const rows = this.parseCSV(csvContent);
    return rows.map(row => ({
      externalId: row['department_id'] || row['dept_id'] || row['id'] || '',
      name: row['name'] || row['department_name'] || '',
      parentId: row['parent_id'] || row['parent_dept_id'] || undefined,
      headId: row['head_id'] || row['manager_id'] || undefined,
    }));
  }

  async fetchPositions(): Promise<HRISPosition[]> {
    const csvContent = await this.downloadFile(this.sftpConfig.remotePaths.positions);
    const rows = this.parseCSV(csvContent);
    return rows.map(row => ({
      externalId: row['position_id'] || row['id'] || '',
      title: row['title'] || row['position_title'] || '',
      departmentId: row['department_id'] || undefined,
      level: row['level'] || row['grade'] || undefined,
      jobFamily: row['job_family'] || undefined,
    }));
  }

  async fetchCompensation(): Promise<HRISCompensation[]> {
    const csvContent = await this.downloadFile(this.sftpConfig.remotePaths.compensation);
    const rows = this.parseCSV(csvContent);
    return rows.map(row => ({
      employeeId: row['employee_id'] || row['emp_id'] || '',
      baseSalary: parseFloat(row['base_salary'] || row['salary'] || '0') || undefined,
      currency: row['currency'] || undefined,
      payFrequency: row['pay_frequency'] || row['frequency'] || undefined,
      effectiveDate: row['effective_date'] || undefined,
    }));
  }

  /**
   * Download a file from the configured remote source.
   * Uses the baseUrl + remotePath to fetch the file via HTTPS.
   * For true SFTP over SSH, add ssh2-sftp-client to dependencies
   * and replace this method body with SFTPClient.get().
   */
  private async downloadFile(remotePath: string): Promise<string> {
    const url = `${this.config.baseUrl}${remotePath}`;
    const response = await this.httpRequest(url, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`Failed to download file ${remotePath}: HTTP ${response.status}`);
    }
    return response.text();
  }

  /**
   * Parse CSV/TSV content into an array of key-value records
   */
  private parseCSV(content: string): Record<string, string>[] {
    const delimiter = this.sftpConfig.delimiter
      || (this.sftpConfig.fileFormat === 'tsv' ? '\t' : ',');
    const lines = content.split('\n').filter(line => line.trim() !== '');

    if (lines.length === 0) return [];

    const hasHeader = this.sftpConfig.hasHeader !== false;
    const headers = hasHeader
      ? lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/['"]/g, ''))
      : lines[0].split(delimiter).map((_, i) => `col_${i}`);

    const dataLines = hasHeader ? lines.slice(1) : lines;

    return dataLines.map(line => {
      const values = this.parseCSVLine(line, delimiter);
      const record: Record<string, string> = {};
      headers.forEach((header, i) => {
        record[header] = (values[i] || '').trim().replace(/^["']|["']$/g, '');
      });
      return record;
    });
  }

  /**
   * Parse a single CSV line handling quoted values with embedded delimiters
   */
  private parseCSVLine(line: string, delimiter: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    return values;
  }

  private mapStatus(status: string | undefined): HRISEmployee['status'] {
    if (!status) return 'active';
    const lower = status.toLowerCase();
    if (lower.includes('active') || lower === 'a') return 'active';
    if (lower.includes('term') || lower === 't') return 'terminated';
    if (lower.includes('leave') || lower === 'l') return 'on_leave';
    if (lower.includes('inactive') || lower === 'i') return 'inactive';
    return 'active';
  }
}
