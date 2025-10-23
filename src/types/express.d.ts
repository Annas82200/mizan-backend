/**
 * Express Request Type Extensions
 *
 * Extends Express Request interface to include authenticated user information
 * and other custom properties added by middleware.
 *
 * This eliminates the need for 'as any' type assertions throughout the codebase.
 */

import 'express';

declare global {
  namespace Express {
    /**
     * Authenticated user information attached by auth middleware
     */
    interface User {
      id: string;
      email: string;
      role: 'superadmin' | 'admin' | 'user';
      tenantId: string;
    }

    /**
     * Extended Request interface with typed properties
     */
    interface Request {
      /**
       * Authenticated user (set by auth middleware)
       * Will be undefined for unauthenticated requests
       */
      user?: User;

      /**
       * Validated query parameters (set by validation middleware)
       * Type will be inferred from validation schema
       */
      validatedQuery?: Record<string, any>;

      /**
       * Validated request body (set by validation middleware)
       * Type will be inferred from validation schema
       */
      validatedBody?: Record<string, any>;

      /**
       * Validated route parameters (set by validation middleware)
       * Type will be inferred from validation schema
       */
      validatedParams?: Record<string, any>;
    }
  }
}

export {};
