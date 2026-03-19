/**
 * Data Mapper — Config-driven field mapping between HRIS and Mizan schemas
 *
 * Transforms raw HRIS data into Mizan's canonical format using
 * per-tenant field mapping configuration.
 */

import { db } from '../../../db/index';
import { fieldMappings } from '../../../db/schema';
import { eq, and } from 'drizzle-orm';

export interface FieldMapping {
  sourceField: string;
  mizanField: string;
  transformFunction?: string;
  defaultValue?: string;
}

export interface MappingConfig {
  employees: FieldMapping[];
  departments: FieldMapping[];
  positions: FieldMapping[];
  compensation: FieldMapping[];
}

export class DataMapper {
  /**
   * Load field mappings from database for a given connector
   */
  async loadMappings(connectorId: string, tenantId: string): Promise<MappingConfig> {
    const rows = await db
      .select()
      .from(fieldMappings)
      .where(and(
        eq(fieldMappings.connectorId, connectorId),
        eq(fieldMappings.tenantId, tenantId)
      ));

    const config: MappingConfig = {
      employees: [],
      departments: [],
      positions: [],
      compensation: [],
    };

    for (const row of rows) {
      const mapping: FieldMapping = {
        sourceField: row.sourceField,
        mizanField: row.mizanField,
        transformFunction: row.transformFunction || undefined,
        defaultValue: row.defaultValue || undefined,
      };

      const entityType = row.entityType as keyof MappingConfig;
      if (config[entityType]) {
        config[entityType].push(mapping);
      }
    }

    return config;
  }

  /**
   * Transform a single HRIS record using field mappings
   */
  mapRecord(source: Record<string, unknown>, mappings: FieldMapping[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const mapping of mappings) {
      let value = this.getNestedValue(source, mapping.sourceField);

      // Apply default if source value is missing
      if (value === undefined || value === null) {
        if (mapping.defaultValue !== undefined) {
          value = mapping.defaultValue;
        } else {
          continue;
        }
      }

      // Apply transform function
      if (mapping.transformFunction && value !== undefined) {
        value = this.applyTransform(value, mapping.transformFunction);
      }

      result[mapping.mizanField] = value;
    }

    return result;
  }

  /**
   * Batch map an array of HRIS records
   */
  mapRecords(sources: Record<string, unknown>[], mappings: FieldMapping[]): Record<string, unknown>[] {
    return sources.map(source => this.mapRecord(source, mappings));
  }

  /**
   * Get a nested value from an object using dot notation (e.g., "address.city")
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key) => {
      if (current === null || current === undefined) return undefined;
      return (current as Record<string, unknown>)[key];
    }, obj);
  }

  /**
   * Apply a named transform function to a value
   */
  private applyTransform(value: unknown, transform: string): unknown {
    switch (transform) {
      case 'uppercase':
        return typeof value === 'string' ? value.toUpperCase() : value;
      case 'lowercase':
        return typeof value === 'string' ? value.toLowerCase() : value;
      case 'trim':
        return typeof value === 'string' ? value.trim() : value;
      case 'to_string':
        return String(value);
      case 'to_number':
        return Number(value);
      case 'to_boolean':
        return Boolean(value);
      case 'date_iso':
        return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
      case 'date_format_us':
        // MM/DD/YYYY -> ISO
        if (typeof value === 'string') {
          const [m, d, y] = value.split('/');
          return new Date(`${y}-${m}-${d}`).toISOString();
        }
        return value;
      default:
        return value;
    }
  }
}
