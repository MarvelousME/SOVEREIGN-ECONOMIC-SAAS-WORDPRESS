import { v4 as uuidv4 } from 'uuid';

/**
 * Create a CloudEvent envelope
 */
export function createCloudEvent<T>(
  type: string,
  source: string,
  data: T,
  options?: {
    id?: string;
    tenantId?: string;
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
  }
) {
  return {
    specversion: '1.0' as const,
    type,
    source,
    id: options?.id || uuidv4(),
    time: new Date().toISOString(),
    datacontenttype: 'application/json',
    tenantid: options?.tenantId || 'default',
    correlationid: options?.correlationId,
    causationid: options?.causationId,
    data,
    metadata: options?.metadata,
  };
}

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoff(
  attempt: number,
  baseMs: number,
  maxMs: number,
  multiplier: number
): number {
  const delay = Math.min(baseMs * Math.pow(multiplier, attempt), maxMs);
  // Add jitter (±20%)
  const jitter = delay * 0.2 * (Math.random() * 2 - 1);
  return Math.floor(delay + jitter);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract subject from event type
 * Example: "ledger.transaction.created" -> "ledger.transaction.created"
 */
export function getSubjectFromEventType(eventType: string): string {
  return eventType;
}

/**
 * Extract stream name from subject
 * Example: "ledger.transaction.created" -> "LEDGER"
 */
export function getStreamFromSubject(subject: string): string {
  const parts = subject.split('.');
  return parts[0].toUpperCase();
}

/**
 * Validate CloudEvent structure
 */
export function isValidCloudEvent(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const event = obj as Record<string, unknown>;
  
  return (
    event.specversion === '1.0' &&
    typeof event.type === 'string' &&
    typeof event.source === 'string' &&
    typeof event.id === 'string' &&
    typeof event.time === 'string' &&
    event.data !== undefined
  );
}
