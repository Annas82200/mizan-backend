/**
 * Audit Logger Middleware — Logs every mutating API call
 *
 * Records: who, what, when, where, and what changed.
 * Required for SOC2 compliance and enterprise security requirements.
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../../db/index';
import { auditLogs } from '../../db/schema';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const EXCLUDED_PATHS = new Set(['/api/health', '/api/branding', '/api/assistant/message']);

/**
 * Audit logging middleware — logs all mutating API calls
 */
export function auditLogger() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only log mutating operations
    if (!MUTATING_METHODS.has(req.method)) {
      return next();
    }

    // Skip excluded paths
    if (EXCLUDED_PATHS.has(req.path)) {
      return next();
    }

    const startTime = Date.now();

    // Capture the original end to intercept response
    const originalEnd = res.end;

    res.end = function (this: Response, ...args: Parameters<Response['end']>) {
      const durationMs = Date.now() - startTime;

      // Log asynchronously — don't block the response
      const authedReq = req as Request & { tenantId?: string; userId?: string; userEmail?: string; userRole?: string };

      db.insert(auditLogs)
        .values({
          tenantId: authedReq.tenantId,
          userId: authedReq.userId,
          userEmail: authedReq.userEmail,
          userRole: authedReq.userRole,
          action: mapMethodToAction(req.method),
          resourceType: extractResourceType(req.path),
          resourceId: extractResourceId(req.path),
          method: req.method,
          path: req.path,
          statusCode: res.statusCode.toString(),
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.get('User-Agent'),
          durationMs: durationMs.toString(),
        })
        .catch((err: Error) => {
          console.error('[AuditLogger] Failed to write audit log:', err.message);
        });

      return originalEnd.apply(this, args);
    } as Response['end'];

    next();
  };
}

function mapMethodToAction(method: string): string {
  switch (method) {
    case 'POST': return 'CREATE';
    case 'PUT': return 'UPDATE';
    case 'PATCH': return 'UPDATE';
    case 'DELETE': return 'DELETE';
    default: return 'UNKNOWN';
  }
}

function extractResourceType(path: string): string {
  // Extract the main resource from path: /api/hiring/requisitions/123 -> hiring_requisitions
  const parts = path.replace('/api/', '').split('/').filter(Boolean);
  return parts.slice(0, 2).join('_') || 'unknown';
}

function extractResourceId(path: string): string | undefined {
  const parts = path.split('/');
  const last = parts[parts.length - 1];
  // Check if last segment looks like an ID (UUID or numeric)
  if (last && (/^[0-9a-f-]{36}$/i.test(last) || /^\d+$/.test(last))) {
    return last;
  }
  return undefined;
}
