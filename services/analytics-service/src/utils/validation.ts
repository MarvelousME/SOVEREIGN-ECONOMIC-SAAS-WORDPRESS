import Ajv, { JSONSchemaType } from 'ajv';
import addFormats from 'ajv-formats';
import { CloudEvent, CANONICAL_EVENT_TYPES, CanonicalEventType } from '../types';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const cloudEventSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', minLength: 1 },
    specversion: { type: 'string', default: '1.0' },
    type: { type: 'string', enum: [...CANONICAL_EVENT_TYPES] },
    source: { type: 'string', minLength: 1 },
    subject: { type: 'string' },
    time: { type: 'string', format: 'date-time' },
    datacontenttype: { type: 'string' },
    data: { type: 'object' },
    tenantid: { type: 'string', format: 'uuid' },
    workspaceid: { type: 'string', format: 'uuid' },
  },
  required: ['id', 'type', 'source', 'data'],
  additionalProperties: true,
};

const batchEventSchema = {
  type: 'object',
  properties: {
    events: {
      type: 'array',
      items: cloudEventSchema,
      minItems: 1,
      maxItems: 1000,
    },
  },
  required: ['events'],
};

const validateCloudEvent = ajv.compile(cloudEventSchema);
const validateBatchEvents = ajv.compile(batchEventSchema);

export interface ValidationResult {
  valid: boolean;
  errors?: Array<{ field: string; message: string }>;
  data?: CloudEvent;
}

export function validateEvent(event: unknown): ValidationResult {
  const valid = validateCloudEvent(event);
  if (!valid && validateCloudEvent.errors) {
    return {
      valid: false,
      errors: validateCloudEvent.errors.map(err => ({
        field: err.instancePath || err.params?.missingProperty || 'unknown',
        message: err.message || 'Validation error',
      })),
    };
  }
  return {
    valid: true,
    data: event as CloudEvent,
  };
}

export interface BatchValidationResult {
  valid: boolean;
  accepted: CloudEvent[];
  rejected: Array<{ event: unknown; errors: Array<{ field: string; message: string }> }>;
}

export function validateBatch(events: unknown): BatchValidationResult {
  if (!Array.isArray(events)) {
    return {
      valid: false,
      accepted: [],
      rejected: [{ event: events, errors: [{ field: 'events', message: 'Expected array of events' }] }],
    };
  }

  const accepted: CloudEvent[] = [];
  const rejected: Array<{ event: unknown; errors: Array<{ field: string; message: string }> }> = [];

  for (const event of events) {
    const result = validateEvent(event);
    if (result.valid && result.data) {
      accepted.push(result.data);
    } else {
      rejected.push({ event, errors: result.errors || [] });
    }
  }

  return {
    valid: rejected.length === 0,
    accepted,
    rejected,
  };
}

export function isCanonicalEventType(type: string): type is CanonicalEventType {
  return CANONICAL_EVENT_TYPES.includes(type as CanonicalEventType);
}

export function sanitizeString(input: string): string {
  return input.replace(/[<>'"]/g, '').trim();
}

export function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export default {
  validateEvent,
  validateBatch,
  isCanonicalEventType,
  sanitizeString,
  sanitizeObject,
};
