/**
 * Zod Validation Middleware — Validates request body against a Zod schema
 *
 * Usage in routes:
 *   router.post('/surveys', validate(createSurveySchema), handler);
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      return res.status(400).json({ error: 'Invalid request body' });
    }
  };
}
