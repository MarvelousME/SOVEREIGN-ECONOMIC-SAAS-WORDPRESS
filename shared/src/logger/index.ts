import winston from 'winston';
import { config } from '../config';
import { trace, context } from '@opentelemetry/api';

export interface LogContext {
  correlationId?: string;
  userId?: string;
  tenantId?: string;
  requestId?: string;
  [key: string]: any;
}

class Logger {
  private logger: winston.Logger;
  private defaultContext: LogContext = {};

  constructor(serviceName?: string) {
    const loggingConfig = config.getLoggingConfig();
    const serviceConfig = config.getServiceConfig();

    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    );

    this.logger = winston.createLogger({
      level: loggingConfig.level,
      format: logFormat,
      defaultMeta: {
        service: serviceName || serviceConfig.name,
        version: serviceConfig.version,
        environment: serviceConfig.env,
      },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(this.formatConsoleLog)
          ),
        }),
      ],
    });

    // Add file transport in production
    if (serviceConfig.env === 'production') {
      this.logger.add(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        })
      );
      this.logger.add(
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        })
      );
    }
  }

  private formatConsoleLog(info: any): string {
    const { timestamp, level, message, service, ...meta } = info;
    let msg = `${timestamp} [${service}] [${level}]: ${message}`;

    // Add trace context if available
    const span = trace.getSpan(context.active());
    if (span) {
      const spanContext = span.spanContext();
      meta.traceId = spanContext.traceId;
      meta.spanId = spanContext.spanId;
    }

    // Remove empty metadata
    const filteredMeta = Object.entries(meta).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && key !== 'splat') {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);

    if (Object.keys(filteredMeta).length > 0) {
      msg += ` ${JSON.stringify(filteredMeta)}`;
    }

    return msg;
  }

  setDefaultContext(context: LogContext): void {
    this.defaultContext = { ...this.defaultContext, ...context };
  }

  clearDefaultContext(): void {
    this.defaultContext = {};
  }

  private mergeContext(context?: LogContext): LogContext {
    const span = trace.getSpan(context.active());
    const traceContext: LogContext = {};

    if (span) {
      const spanContext = span.spanContext();
      traceContext.traceId = spanContext.traceId;
      traceContext.spanId = spanContext.spanId;
    }

    return {
      ...this.defaultContext,
      ...traceContext,
      ...context,
    };
  }

  error(message: string, context?: LogContext): void {
    this.logger.error(message, this.mergeContext(context));
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, this.mergeContext(context));
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(message, this.mergeContext(context));
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, this.mergeContext(context));
  }

  log(level: string, message: string, context?: LogContext): void {
    this.logger.log(level, message, this.mergeContext(context));
  }

  // Specific logging methods for common scenarios
  logRequest(method: string, url: string, context?: LogContext): void {
    this.info(`${method} ${url}`, { ...context, type: 'request' });
  }

  logResponse(method: string, url: string, statusCode: number, duration: number, context?: LogContext): void {
    this.info(`${method} ${url} ${statusCode}`, {
      ...context,
      type: 'response',
      statusCode,
      duration,
    });
  }

  logError(error: Error, context?: LogContext): void {
    this.error(error.message, {
      ...context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    });
  }

  logEvent(eventType: string, eventData: any, context?: LogContext): void {
    this.info(`Event: ${eventType}`, {
      ...context,
      type: 'event',
      eventType,
      eventData,
    });
  }

  logQuery(query: string, duration: number, context?: LogContext): void {
    this.debug(`Query executed in ${duration}ms`, {
      ...context,
      type: 'database',
      query,
      duration,
    });
  }

  // Child logger with preset context
  child(context: LogContext): Logger {
    const childLogger = new Logger();
    childLogger.setDefaultContext({ ...this.defaultContext, ...context });
    return childLogger;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export class for creating custom loggers
export { Logger };
