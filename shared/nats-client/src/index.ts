/**
 * UBI-CMS NATS Client Library
 * Provides a high-level API for publishing and consuming events
 */

export { NatsClient } from './nats-client';
export { NatsPublisher } from './publisher';
export { NatsConsumer } from './consumer';
export { createCloudEvent } from './utils';
export type { NatsClientOptions, PublishOptions, ConsumeOptions, MessageHandler } from './types';
