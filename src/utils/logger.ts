// backend/src/utils/logger.ts
// Production-ready logger utility
// Compliant with AGENT_CONTEXT_ULTIMATE.md - Production-ready implementation

import { createLogger, format, transports } from 'winston';
import path from 'path';

const { combine, timestamp, printf, colorize, errors } = format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

// Create logger instance
export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat
  ),
  defaultMeta: { service: 'mizan-backend' },
  transports: [
    // Console transport
    new transports.Console({
      format: combine(
        colorize(),
        logFormat
      )
    }),
    // Error log file
    new transports.File({ 
      filename: path.join(process.cwd(), 'logs', 'error.log'), 
      level: 'error'
    }),
    // Combined log file
    new transports.File({ 
      filename: path.join(process.cwd(), 'logs', 'combined.log') 
    })
  ]
});

// Log request details
export function logRequest(method: string, url: string, userId?: string, tenantId?: string): void {
  logger.info(`${method} ${url}`, {
    userId: userId || 'anonymous',
    tenantId: tenantId || 'none'
  });
}

// Log errors with context
export function logError(error: Error, context?: Record<string, unknown>): void {
  logger.error('Error occurred', {
    message: error.message,
    stack: error.stack,
    ...context
  });
}

// Log database operations
export function logDbOperation(operation: string, table: string, duration: number): void {
  logger.debug(`DB ${operation} on ${table} completed in ${duration}ms`);
}

// Log AI operations
export function logAIOperation(agent: string, operation: string, duration: number, tokens?: number): void {
  logger.info(`AI ${agent} ${operation}`, {
    duration: `${duration}ms`,
    tokens: tokens || 'N/A'
  });
}

// Export default logger
export default logger;

