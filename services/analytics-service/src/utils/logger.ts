import winston from 'winston';
import config from '../config';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let logMessage = `${timestamp} [${level.toUpperCase()}] ${message}`;
    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta)}`;
    }
    return logMessage;
  })
);

const logger = winston.createLogger({
  level: config.app.logLevel,
  format: logFormat,
  defaultMeta: { service: 'analytics-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      ),
    }),
  ],
});

export class AnalyticsEventEmitter {
  private static instance: AnalyticsEventEmitter;
  private listeners: Map<string, Array<(data: unknown) => void>> = new Map();

  static getInstance(): AnalyticsEventEmitter {
    if (!AnalyticsEventEmitter.instance) {
      AnalyticsEventEmitter.instance = new AnalyticsEventEmitter();
    }
    return AnalyticsEventEmitter.instance;
  }

  emit(eventType: string, data: unknown): void {
    logger.info(`Event emitted: ${eventType}`, { data });
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }

  on(eventType: string, listener: (data: unknown) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(listener);
  }

  off(eventType: string, listener: (data: unknown) => void): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
}

export const eventEmitter = AnalyticsEventEmitter.getInstance();

export const emitAnalyticsEvent = (eventType: string, data: unknown): void => {
  eventEmitter.emit(eventType, data);
};

export default logger;
