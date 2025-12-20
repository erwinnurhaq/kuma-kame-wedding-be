import { APP_CONFIG } from "./config";

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private env: string;

  constructor() {
    this.env = APP_CONFIG.ENV;
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private sanitizeContext(context?: LogContext): LogContext | undefined {
    if (!context) return undefined;

    // Remove sensitive data from logs
    const sanitized = { ...context };
    const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'api_key'];

    for (const key of sensitiveKeys) {
      if (key in sanitized) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = this.formatTimestamp();
    const sanitized = this.sanitizeContext(context);
    const ctx = sanitized ? ` ${JSON.stringify(sanitized)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${ctx}`;
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.env === 'test') return false;
    if (this.env === 'production' && level === 'debug') return false;
    return true;
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const errorContext = error instanceof Error ? { ...context, error: error.message, stack: error.stack } : { ...context, error: String(error) };
      console.error(this.formatMessage('error', message, errorContext));
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  // HTTP request logger
  logRequest(method: string, path: string, ip: string, statusCode?: number, statusString?: string, duration?: number): void {
    const context: LogContext = { method, path, ip };
    if (statusCode) context.statusCode = statusCode;
    if (statusString) context.statusString = statusString;
    if (duration) context.duration = `${duration}ms`;

    if (statusCode && statusCode >= 400) {
      this.warn('HTTP request', context);
    } else {
      this.info('HTTP request', context);
    }
  }

  // Rate limit logger
  logRateLimit(ip: string, endpoint: string, limit: number): void {
    this.warn('Rate limit exceeded', { ip, endpoint, limit });
  }
}

export const logger = new Logger();
