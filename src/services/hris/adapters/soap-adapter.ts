/**
 * SOAP Adapter — Connects to legacy HRIS systems using SOAP/XML APIs
 *
 * Many enterprise HRIS systems (SAP SuccessFactors, Oracle HCM) expose
 * SOAP-based web services. This adapter handles XML serialization,
 * WSDL parsing, and WS-Security authentication.
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

export interface SOAPAdapterConfig extends AdapterConfig {
  wsdlUrl: string;
  soapAction: {
    employees: string;
    departments: string;
    positions: string;
    compensation: string;
  };
  namespace?: string;
  soapVersion?: '1.1' | '1.2';
}

export class SOAPAdapter extends BaseAdapter {
  readonly adapterType = 'soap';
  private soapConfig: SOAPAdapterConfig;

  constructor(config: SOAPAdapterConfig) {
    super(config);
    this.soapConfig = config;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const start = Date.now();
    try {
      const response = await this.httpRequest(this.soapConfig.wsdlUrl, {
        method: 'GET',
        retries: 1,
      });
      const body = await response.text();
      const isWsdl = body.includes('definitions') || body.includes('wsdl:');
      return {
        success: isWsdl,
        message: isWsdl ? 'WSDL accessible and valid' : 'Response is not a valid WSDL',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        success: false,
        message: `SOAP connection failed: ${(error as Error).message}`,
        latencyMs: Date.now() - start,
      };
    }
  }

  async fetchEmployees(since?: Date): Promise<HRISEmployee[]> {
    const bodyContent = since ? `<modifiedSince>${since.toISOString()}</modifiedSince>` : '';
    const soapBody = this.buildEnvelope(this.soapConfig.soapAction.employees, bodyContent);
    const responseXml = await this.callSoapEndpoint(soapBody, this.soapConfig.soapAction.employees);
    return this.parseEmployees(responseXml);
  }

  async fetchDepartments(): Promise<HRISDepartment[]> {
    const soapBody = this.buildEnvelope(this.soapConfig.soapAction.departments, '');
    const responseXml = await this.callSoapEndpoint(soapBody, this.soapConfig.soapAction.departments);
    return this.parseDepartments(responseXml);
  }

  async fetchPositions(): Promise<HRISPosition[]> {
    const soapBody = this.buildEnvelope(this.soapConfig.soapAction.positions, '');
    const responseXml = await this.callSoapEndpoint(soapBody, this.soapConfig.soapAction.positions);
    return this.parsePositions(responseXml);
  }

  async fetchCompensation(employeeIds?: string[]): Promise<HRISCompensation[]> {
    const params = employeeIds
      ? `<employeeIds>${employeeIds.map(id => `<id>${id}</id>`).join('')}</employeeIds>`
      : '';
    const soapBody = this.buildEnvelope(this.soapConfig.soapAction.compensation, params);
    const responseXml = await this.callSoapEndpoint(soapBody, this.soapConfig.soapAction.compensation);
    return this.parseCompensation(responseXml);
  }

  private async callSoapEndpoint(envelope: string, soapAction: string): Promise<string> {
    const contentType = this.soapConfig.soapVersion === '1.2'
      ? 'application/soap+xml; charset=utf-8'
      : 'text/xml; charset=utf-8';

    const headers: Record<string, string> = { 'Content-Type': contentType };
    if (this.soapConfig.soapVersion !== '1.2') {
      headers['SOAPAction'] = `"${soapAction}"`;
    }

    const response = await this.httpRequest(this.config.baseUrl, {
      method: 'POST',
      headers,
      body: envelope,
    });
    return response.text();
  }

  private buildEnvelope(action: string, bodyContent: string): string {
    const ns = this.soapConfig.namespace || 'http://tempuri.org/';
    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns="${ns}">
  <soap:Header>${this.buildSecurityHeader()}</soap:Header>
  <soap:Body><ns:${action}>${bodyContent}</ns:${action}></soap:Body>
</soap:Envelope>`;
  }

  private buildSecurityHeader(): string {
    const { type, credentials } = this.config.authConfig;
    if (type === 'basic') {
      return `<wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
        <wsse:UsernameToken>
          <wsse:Username>${credentials.username}</wsse:Username>
          <wsse:Password>${credentials.password}</wsse:Password>
        </wsse:UsernameToken>
      </wsse:Security>`;
    }
    return '';
  }

  private parseEmployees(xml: string): HRISEmployee[] {
    return this.extractElements(xml, 'Employee').map(el => ({
      externalId: this.val(el, 'EmployeeId') || this.val(el, 'Id') || '',
      firstName: this.val(el, 'FirstName') || '',
      lastName: this.val(el, 'LastName') || '',
      email: this.val(el, 'Email') || '',
      department: this.val(el, 'Department'),
      position: this.val(el, 'Position') || this.val(el, 'JobTitle'),
      managerId: this.val(el, 'ManagerId'),
      hireDate: this.val(el, 'HireDate'),
      status: this.mapStatus(this.val(el, 'Status')),
    }));
  }

  private parseDepartments(xml: string): HRISDepartment[] {
    return this.extractElements(xml, 'Department').map(el => ({
      externalId: this.val(el, 'DepartmentId') || this.val(el, 'Id') || '',
      name: this.val(el, 'Name') || '',
      parentId: this.val(el, 'ParentId'),
      headId: this.val(el, 'HeadId'),
    }));
  }

  private parsePositions(xml: string): HRISPosition[] {
    return this.extractElements(xml, 'Position').map(el => ({
      externalId: this.val(el, 'PositionId') || this.val(el, 'Id') || '',
      title: this.val(el, 'Title') || '',
      departmentId: this.val(el, 'DepartmentId'),
      level: this.val(el, 'Level'),
    }));
  }

  private parseCompensation(xml: string): HRISCompensation[] {
    return this.extractElements(xml, 'Compensation').map(el => ({
      employeeId: this.val(el, 'EmployeeId') || '',
      baseSalary: parseFloat(this.val(el, 'BaseSalary') || '0') || undefined,
      currency: this.val(el, 'Currency'),
      effectiveDate: this.val(el, 'EffectiveDate'),
    }));
  }

  private extractElements(xml: string, tag: string): string[] {
    const regex = new RegExp(`<(?:[\\w]+:)?${tag}[^>]*>[\\s\\S]*?<\\/(?:[\\w]+:)?${tag}>`, 'gi');
    return xml.match(regex) || [];
  }

  private val(xml: string, tag: string): string | undefined {
    const regex = new RegExp(`<(?:[\\w]+:)?${tag}[^>]*>([^<]*)<\\/`, 'i');
    return regex.exec(xml)?.[1]?.trim() || undefined;
  }

  private mapStatus(status: string | undefined): HRISEmployee['status'] {
    if (!status) return 'active';
    const s = status.toLowerCase();
    if (s.includes('term')) return 'terminated';
    if (s.includes('leave')) return 'on_leave';
    if (s.includes('inactive')) return 'inactive';
    return 'active';
  }
}
