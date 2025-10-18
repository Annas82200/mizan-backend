/**
 * Validation middleware for API routes
 * Production-ready implementation with Zod schema validation
 * Compliant with AGENT_CONTEXT_ULTIMATE.md
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';

/**
 * Generic validation middleware factory
 * Creates middleware that validates request body, query, or params against a Zod schema
 */
export function validate(schema: ZodSchema, target: 'body' | 'query' | 'params' = 'body') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dataToValidate = req[target];
      const validatedData = await schema.parseAsync(dataToValidate);

      // Replace the original data with validated/transformed data
      req[target] = validatedData;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }

      // Unexpected error
      console.error('Validation middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal validation error'
      });
    }
  };
}

/**
 * Validate request body
 */
export function validateBody(schema: ZodSchema) {
  return validate(schema, 'body');
}

/**
 * Validate query parameters
 */
export function validateQuery(schema: ZodSchema) {
  return validate(schema, 'query');
}

/**
 * Validate URL parameters
 */
export function validateParams(schema: ZodSchema) {
  return validate(schema, 'params');
}

/**
 * Combined validation for body, query, and params
 */
export function validateRequest(schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }

      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query) as any;
      }

      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params) as any;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }

      console.error('Request validation error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal validation error'
      });
    }
  };
}

/**
 * Sanitize input to prevent XSS and injection attacks
 * Production-ready implementation
 */
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    // Remove script tags and dangerous HTML
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }

  if (input && typeof input === 'object') {
    const sanitized: any = {};
    for (const key in input) {
      if (input.hasOwnProperty(key)) {
        sanitized[key] = sanitizeInput(input[key]);
      }
    }
    return sanitized;
  }

  return input;
}

/**
 * Middleware to sanitize all request inputs
 */
export function sanitizeMiddleware(req: Request, res: Response, next: NextFunction) {
  req.body = sanitizeInput(req.body);
  req.query = sanitizeInput(req.query) as any;
  req.params = sanitizeInput(req.params) as any;
  next();
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // UUID validation
  uuid: z.string().uuid('Invalid UUID format'),

  // Email validation
  email: z.string().email('Invalid email address'),

  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
  }),

  // Date range
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  }),

  // Tenant ID (for multi-tenant validation)
  tenantId: z.string().uuid('Invalid tenant ID')
};

/**
 * Export validation middleware as default
 */
export default {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  validateRequest,
  sanitizeInput,
  sanitizeMiddleware,
  schemas: commonSchemas
};