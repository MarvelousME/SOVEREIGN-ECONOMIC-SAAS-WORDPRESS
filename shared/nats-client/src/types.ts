import { JsMsg } from 'nats';

export interface NatsClientOptions {
  servers: string | string[];
  name?: string;
  maxReconnectAttempts?: number;
  reconnectTimeWait?: number;
  pingInterval?: number;
  timeout?: number;
}

export interface PublishOptions {
  msgId?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface ConsumeOptions {
  stream: string;
  consumer: string;
  batchSize?: number;
  maxAckPending?: number;
  idleHeartbeat?: number;
  expires?: number;
}

export type MessageHandler = (message: JsMsg) => Promise<void>;

export interface DeadLetterQueueOptions {
  enabled: boolean;
  subject?: string;
  maxRetries?: number;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  maxBackoffMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  backoffMs: 1000,
  maxBackoffMs: 30000,
  backoffMultiplier: 2,
};
