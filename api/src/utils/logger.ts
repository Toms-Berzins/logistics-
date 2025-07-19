import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  metadata?: any;
  organizationId?: string;
  userId?: string;
  requestId?: string;
  service: string;
}

class Logger {
  private logLevel: string;
  private logStream?: NodeJS.WritableStream;

  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.setupFileLogging();
  }

  private setupFileLogging(): void {
    if (process.env.NODE_ENV === 'production') {
      const logDir = process.env.LOG_DIR || 'logs';
      
      // Create logs directory if it doesn't exist
      if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true });
      }

      const logFile = join(logDir, `app-${new Date().toISOString().split('T')[0]}.log`);
      this.logStream = createWriteStream(logFile, { flags: 'a' });
    }
  }

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const requestedLevelIndex = levels.indexOf(level);
    return requestedLevelIndex >= currentLevelIndex;
  }

  private formatLogEntry(entry: LogEntry): string {
    const baseEntry: any = {
      timestamp: entry.timestamp,
      level: entry.level.toUpperCase(),
      service: entry.service,
      message: entry.message
    };

    // Add context if available
    if (entry.organizationId) baseEntry.organizationId = entry.organizationId;
    if (entry.userId) baseEntry.userId = entry.userId;
    if (entry.requestId) baseEntry.requestId = entry.requestId;
    if (entry.metadata) baseEntry.metadata = entry.metadata;

    return JSON.stringify(baseEntry) + '\n';
  }

  private log(level: string, message: string, metadata?: any): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata,
      service: 'subscription-api'
    };

    const formattedEntry = this.formatLogEntry(entry);

    // Console output
    console.log(formattedEntry.trim());

    // File output in production
    if (this.logStream) {
      this.logStream.write(formattedEntry);
    }
  }

  debug(message: string, metadata?: any): void {
    this.log('debug', message, metadata);
  }

  info(message: string, metadata?: any): void {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata?: any): void {
    this.log('warn', message, metadata);
  }

  error(message: string, error?: Error | any, metadata?: any): void {
    const errorMetadata = {
      ...metadata,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    };
    this.log('error', message, errorMetadata);
  }

  // Structured logging for subscription events
  subscriptionEvent(
    eventType: string,
    organizationId: string,
    data: any,
    userId?: string,
    requestId?: string
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Subscription event: ${eventType}`,
      metadata: {
        eventType,
        data,
        category: 'subscription'
      },
      organizationId,
      userId,
      requestId,
      service: 'subscription-api'
    };

    const formattedEntry = this.formatLogEntry(entry);
    console.log(formattedEntry.trim());

    if (this.logStream) {
      this.logStream.write(formattedEntry);
    }
  }

  // API request logging
  apiRequest(
    method: string,
    path: string,
    statusCode: number,
    responseTime: number,
    organizationId?: string,
    userId?: string,
    requestId?: string
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: statusCode >= 400 ? 'warn' : 'info',
      message: `${method} ${path} ${statusCode} ${responseTime}ms`,
      metadata: {
        method,
        path,
        statusCode,
        responseTime,
        category: 'api'
      },
      organizationId,
      userId,
      requestId,
      service: 'subscription-api'
    };

    const formattedEntry = this.formatLogEntry(entry);
    console.log(formattedEntry.trim());

    if (this.logStream) {
      this.logStream.write(formattedEntry);
    }
  }

  // Performance logging
  performance(
    operation: string,
    duration: number,
    metadata?: any,
    organizationId?: string,
    userId?: string
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: duration > 5000 ? 'warn' : 'debug',
      message: `Performance: ${operation} took ${duration}ms`,
      metadata: {
        operation,
        duration,
        category: 'performance',
        ...metadata
      },
      organizationId,
      userId,
      service: 'subscription-api'
    };

    const formattedEntry = this.formatLogEntry(entry);
    
    if (this.shouldLog(entry.level)) {
      console.log(formattedEntry.trim());

      if (this.logStream) {
        this.logStream.write(formattedEntry);
      }
    }
  }

  // Security event logging
  securityEvent(
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: any,
    organizationId?: string,
    userId?: string,
    requestId?: string
  ): void {
    const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: `Security event: ${eventType}`,
      metadata: {
        eventType,
        severity,
        details,
        category: 'security'
      },
      organizationId,
      userId,
      requestId,
      service: 'subscription-api'
    };

    const formattedEntry = this.formatLogEntry(entry);
    console.log(formattedEntry.trim());

    if (this.logStream) {
      this.logStream.write(formattedEntry);
    }

    // For critical security events, you might want to alert external monitoring
    if (severity === 'critical') {
      // TODO: Integrate with alerting system (PagerDuty, Slack, etc.)
      console.error('🚨 CRITICAL SECURITY EVENT:', formattedEntry);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export types for use in other modules
export { Logger };