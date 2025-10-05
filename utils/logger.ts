// Standardized Logger utility for Mizan platform
// Provides consistent logging interface across all modules

export class Logger {
  private context: string;
  
  constructor(context: string) {
    this.context = context;
  }
  
  info(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${this.context}] INFO: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
  
  error(message: string, error?: any) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [${this.context}] ERROR: ${message}`, error || '');
  }
  
  warn(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [${this.context}] WARN: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
  
  debug(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    console.debug(`[${timestamp}] [${this.context}] DEBUG: ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
}

// Simple logger instance for quick use
export const logger = new Logger('Mizan');
