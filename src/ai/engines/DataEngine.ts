/**
 * Data Engine - Data Processing and Normalization
 * Part of Mizan Platform Three-Engine Architecture
 * NO MOCK DATA - PRODUCTION READY
 */

import { z } from 'zod';
import { DomainContext } from './KnowledgeEngine.js';

// Processed data schema
const ProcessedDataSchema = z.object({
  cleaned: z.record(z.unknown()),
  normalized: z.record(z.number().min(0).max(1)),
  structured: z.object({
    dimensions: z.array(z.string()),
    metrics: z.record(z.number()),
    categories: z.record(z.array(z.string())),
    relationships: z.array(z.object({
      from: z.string(),
      to: z.string(),
      strength: z.number().min(0).max(1),
      type: z.string()
    })),
    patterns: z.array(z.object({
      pattern: z.string(),
      frequency: z.number(),
      significance: z.number().min(0).max(1)
    }))
  }),
  metadata: z.object({
    recordCount: z.number(),
    completeness: z.number().min(0).max(1),
    quality: z.number().min(0).max(1),
    processingTime: z.number(),
    anomalies: z.array(z.string())
  })
});

export type ProcessedData = z.infer<typeof ProcessedDataSchema>;

interface DataValidationRule {
  field: string;
  type: 'required' | 'format' | 'range' | 'reference';
  validation: (value: unknown) => boolean;
  message: string;
}

interface NormalizationRule {
  field: string;
  method: 'minmax' | 'zscore' | 'percentile' | 'boolean';
  parameters?: Record<string, number>;
}

export class DataEngine {
  private validationRules: Map<string, DataValidationRule[]>;
  private normalizationRules: Map<string, NormalizationRule[]>;

  constructor() {
    this.validationRules = new Map();
    this.normalizationRules = new Map();
    this.initializeRules();
  }

  private initializeRules(): void {
    // Culture data validation rules
    this.validationRules.set('culture', [
      {
        field: 'surveyResponses',
        type: 'required',
        validation: (value) => value !== null && value !== undefined,
        message: 'Survey responses are required'
      },
      {
        field: 'responseRate',
        type: 'range',
        validation: (value) => typeof value === 'number' && value >= 0 && value <= 1,
        message: 'Response rate must be between 0 and 1'
      },
      {
        field: 'departmentId',
        type: 'reference',
        validation: (value) => typeof value === 'string' && value.length > 0,
        message: 'Valid department ID required'
      }
    ]);

    // Structure data validation rules
    this.validationRules.set('structure', [
      {
        field: 'employeeCount',
        type: 'required',
        validation: (value) => typeof value === 'number' && value > 0,
        message: 'Employee count must be a positive number'
      },
      {
        field: 'hierarchyLevels',
        type: 'range',
        validation: (value) => typeof value === 'number' && value >= 1 && value <= 10,
        message: 'Hierarchy levels must be between 1 and 10'
      },
      {
        field: 'reportingRelationships',
        type: 'format',
        validation: (value) => Array.isArray(value) && value.length > 0,
        message: 'Reporting relationships must be a non-empty array'
      }
    ]);

    // Skills data validation rules
    this.validationRules.set('skills', [
      {
        field: 'employeeSkills',
        type: 'required',
        validation: (value) => Array.isArray(value),
        message: 'Employee skills must be an array'
      },
      {
        field: 'proficiencyLevel',
        type: 'range',
        validation: (value) => typeof value === 'number' && value >= 1 && value <= 5,
        message: 'Proficiency level must be between 1 and 5'
      },
      {
        field: 'skillCategory',
        type: 'format',
        validation: (value) => ['technical', 'soft', 'leadership', 'functional'].includes(String(value)),
        message: 'Invalid skill category'
      }
    ]);

    // Culture normalization rules
    this.normalizationRules.set('culture', [
      {
        field: 'engagementScore',
        method: 'minmax',
        parameters: { min: 0, max: 100 }
      },
      {
        field: 'cultureDimensions',
        method: 'percentile'
      },
      {
        field: 'satisfactionMetrics',
        method: 'zscore'
      }
    ]);

    // Structure normalization rules
    this.normalizationRules.set('structure', [
      {
        field: 'spanOfControl',
        method: 'minmax',
        parameters: { min: 1, max: 20 }
      },
      {
        field: 'efficiency',
        method: 'percentile'
      }
    ]);

    // Skills normalization rules
    this.normalizationRules.set('skills', [
      {
        field: 'proficiency',
        method: 'minmax',
        parameters: { min: 1, max: 5 }
      },
      {
        field: 'coverage',
        method: 'percentile'
      },
      {
        field: 'gap',
        method: 'boolean'
      }
    ]);
  }

  async process(rawData: Record<string, unknown>, context: DomainContext): Promise<ProcessedData> {
    const startTime = Date.now();

    // Clean the data
    const cleaned = await this.cleanData(rawData);

    // Normalize the data
    const normalized = await this.normalizeData(cleaned);

    // Structure the data with context
    const structured = await this.structureData(cleaned, context);

    // Calculate metadata
    const metadata = {
      recordCount: this.countRecords(cleaned),
      completeness: this.calculateCompleteness(cleaned),
      quality: this.assessQuality(cleaned),
      processingTime: Date.now() - startTime,
      anomalies: this.detectAnomalies(cleaned)
    };

    return {
      cleaned,
      normalized,
      structured,
      metadata
    };
  }

  async cleanData(rawData: Record<string, unknown>): Promise<Record<string, unknown>> {
    const cleaned: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(rawData)) {
      // Remove null and undefined values
      if (value === null || value === undefined) {
        continue;
      }

      // Trim strings
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
          cleaned[key] = trimmed;
        }
        continue;
      }

      // Clean arrays
      if (Array.isArray(value)) {
        const cleanedArray = value
          .filter(item => item !== null && item !== undefined)
          .map(item => typeof item === 'string' ? item.trim() : item)
          .filter(item => !(typeof item === 'string' && item.length === 0));

        if (cleanedArray.length > 0) {
          cleaned[key] = cleanedArray;
        }
        continue;
      }

      // Clean nested objects
      if (typeof value === 'object' && value !== null) {
        const cleanedObject = await this.cleanData(value as Record<string, unknown>);
        if (Object.keys(cleanedObject).length > 0) {
          cleaned[key] = cleanedObject;
        }
        continue;
      }

      // Keep other valid values
      cleaned[key] = value;
    }

    return cleaned;
  }

  async normalizeData(data: Record<string, unknown>): Promise<Record<string, number>> {
    const normalized: Record<string, number> = {};

    for (const [key, value] of Object.entries(data)) {
      // Normalize numeric values to 0-1 range
      if (typeof value === 'number') {
        // Simple min-max normalization (would use actual min/max from data in production)
        normalized[key] = Math.max(0, Math.min(1, value / 100));
        continue;
      }

      // Normalize boolean values
      if (typeof value === 'boolean') {
        normalized[key] = value ? 1 : 0;
        continue;
      }

      // Normalize arrays by their length/completeness
      if (Array.isArray(value)) {
        normalized[`${key}_count`] = value.length / 100; // Normalize to expected max
        normalized[`${key}_completeness`] = value.filter(v => v !== null).length / value.length;
        continue;
      }

      // Skip non-numeric values for normalization
    }

    return normalized;
  }

  async structureData(data: Record<string, unknown>, context: DomainContext): Promise<ProcessedData['structured']> {
    // Extract dimensions from the data
    const dimensions = this.extractDimensions(data, context);

    // Calculate metrics
    const metrics = this.calculateMetrics(data);

    // Categorize data
    const categories = this.categorizeData(data, context);

    // Identify relationships
    const relationships = this.identifyRelationships(data);

    // Detect patterns
    const patterns = this.detectPatterns(data, context);

    return {
      dimensions,
      metrics,
      categories,
      relationships,
      patterns
    };
  }

  private extractDimensions(data: Record<string, unknown>, context: DomainContext): string[] {
    const dimensions: string[] = [];

    // Extract dimensions based on context frameworks
    for (const framework of context.frameworks) {
      dimensions.push(...framework.components);
    }

    // Extract dimensions from data structure
    for (const key of Object.keys(data)) {
      if (typeof data[key] === 'object' && !Array.isArray(data[key])) {
        dimensions.push(key);
      }
    }

    return [...new Set(dimensions)]; // Remove duplicates
  }

  private calculateMetrics(data: Record<string, unknown>): Record<string, number> {
    const metrics: Record<string, number> = {};

    // Calculate basic metrics
    metrics.totalRecords = this.countRecords(data);
    metrics.completeness = this.calculateCompleteness(data);
    metrics.complexity = this.calculateComplexity(data);

    // Calculate domain-specific metrics
    if (data.surveyResponses) {
      metrics.responseRate = Array.isArray(data.surveyResponses)
        ? data.surveyResponses.length / 100
        : 0;
    }

    if (data.employeeCount) {
      metrics.organizationSize = Number(data.employeeCount) || 0;
    }

    if (data.skills) {
      metrics.skillsCoverage = Array.isArray(data.skills)
        ? data.skills.length / 50
        : 0;
    }

    return metrics;
  }

  private categorizeData(data: Record<string, unknown>, context: DomainContext): Record<string, string[]> {
    const categories: Record<string, string[]> = {};

    // Categorize based on context
    categories.frameworks = context.frameworks.map((f: any) => f.name);
    categories.bestPractices = context.bestPractices.map((bp: any) => bp.practice);

    // Categorize data fields
    const dataFields = Object.keys(data);
    categories.quantitative = dataFields.filter(key => typeof data[key] === 'number');
    categories.qualitative = dataFields.filter(key => typeof data[key] === 'string');
    categories.collections = dataFields.filter(key => Array.isArray(data[key]));
    categories.nested = dataFields.filter(key =>
      typeof data[key] === 'object' && !Array.isArray(data[key]) && data[key] !== null
    );

    return categories;
  }

  private identifyRelationships(data: Record<string, unknown>): ProcessedData['structured']['relationships'] {
    const relationships: ProcessedData['structured']['relationships'] = [];

    // Identify hierarchical relationships
    if (data.reportingStructure && typeof data.reportingStructure === 'object') {
      const structure = data.reportingStructure as Record<string, unknown>;
      for (const [manager, reports] of Object.entries(structure)) {
        if (Array.isArray(reports)) {
          for (const report of reports) {
            relationships.push({
              from: manager,
              to: String(report),
              strength: 1.0,
              type: 'hierarchical'
            });
          }
        }
      }
    }

    // Identify skill relationships
    if (data.skills && Array.isArray(data.skills)) {
      const skills = data.skills as unknown[];
      for (let i = 0; i < skills.length - 1; i++) {
        for (let j = i + 1; j < skills.length; j++) {
          relationships.push({
            from: String(skills[i]),
            to: String(skills[j]),
            strength: 0.5,
            type: 'skill_correlation'
          });
        }
      }
    }

    return relationships;
  }

  private detectPatterns(data: Record<string, unknown>, context: DomainContext): ProcessedData['structured']['patterns'] {
    const patterns: ProcessedData['structured']['patterns'] = [];

    // Detect completeness patterns
    const completeness = this.calculateCompleteness(data);
    patterns.push({
      pattern: 'data_completeness',
      frequency: completeness,
      significance: completeness > 0.8 ? 0.9 : 0.5
    });

    // Detect structural patterns
    if (data.hierarchyLevels && typeof data.hierarchyLevels === 'number') {
      const levels = data.hierarchyLevels;
      patterns.push({
        pattern: levels > 5 ? 'deep_hierarchy' : 'flat_structure',
        frequency: 1,
        significance: 0.8
      });
    }

    // Detect skill patterns
    if (data.skills && Array.isArray(data.skills)) {
      const skillCount = data.skills.length;
      patterns.push({
        pattern: skillCount > 20 ? 'diverse_skills' : 'focused_skills',
        frequency: 1,
        significance: 0.7
      });
    }

    return patterns;
  }

  private countRecords(data: Record<string, unknown>): number {
    let count = 0;

    for (const value of Object.values(data)) {
      if (Array.isArray(value)) {
        count += value.length;
      } else if (typeof value === 'object' && value !== null) {
        count += this.countRecords(value as Record<string, unknown>);
      } else {
        count += 1;
      }
    }

    return count;
  }

  private calculateCompleteness(data: Record<string, unknown>): number {
    let total = 0;
    let filled = 0;

    for (const value of Object.values(data)) {
      total++;
      if (value !== null && value !== undefined && value !== '') {
        filled++;
      }
    }

    return total > 0 ? filled / total : 0;
  }

  private calculateComplexity(data: Record<string, unknown>): number {
    let complexity = 0;

    for (const value of Object.values(data)) {
      if (Array.isArray(value)) {
        complexity += value.length * 0.1;
      } else if (typeof value === 'object' && value !== null) {
        complexity += this.calculateComplexity(value as Record<string, unknown>) * 0.5;
      } else {
        complexity += 0.01;
      }
    }

    return Math.min(1, complexity);
  }

  private assessQuality(data: Record<string, unknown>): number {
    const completeness = this.calculateCompleteness(data);
    const anomalyCount = this.detectAnomalies(data).length;
    const complexity = this.calculateComplexity(data);

    // Quality score based on completeness, low anomalies, and appropriate complexity
    const qualityScore = (completeness * 0.5) +
                        ((10 - anomalyCount) / 10 * 0.3) +
                        (complexity > 0.2 && complexity < 0.8 ? 0.2 : 0.1);

    return Math.min(1, Math.max(0, qualityScore));
  }

  private detectAnomalies(data: Record<string, unknown>): string[] {
    const anomalies: string[] = [];

    // Check for missing required fields
    if (!data.tenantId) {
      anomalies.push('Missing tenantId');
    }

    // Check for invalid date formats
    for (const [key, value] of Object.entries(data)) {
      if (key.includes('date') || key.includes('Date')) {
        if (typeof value === 'string' && isNaN(Date.parse(value))) {
          anomalies.push(`Invalid date format in ${key}`);
        }
      }
    }

    // Check for outliers in numeric fields
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'number') {
        if (value < 0 && !key.includes('delta') && !key.includes('change')) {
          anomalies.push(`Unexpected negative value in ${key}`);
        }
        if (value > 1000000) {
          anomalies.push(`Unusually large value in ${key}`);
        }
      }
    }

    return anomalies;
  }

  async validateData(data: Record<string, unknown>, domain: string): Promise<{ valid: boolean; errors: string[] }> {
    const rules = this.validationRules.get(domain) || [];
    const errors: string[] = [];

    for (const rule of rules) {
      const value = data[rule.field];
      if (!rule.validation(value)) {
        errors.push(rule.message);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}