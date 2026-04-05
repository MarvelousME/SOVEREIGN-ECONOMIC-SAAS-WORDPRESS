import { connect, NatsConnection, JSONCodec, StringCodec } from 'nats';
import { logger } from '../utils/logger';

let natsConnection: NatsConnection | null = null;
export const jsonCodec = JSONCodec();
export const stringCodec = StringCodec();

export const connectNats = async (): Promise<NatsConnection> => {
  if (natsConnection) {
    return natsConnection;
  }

  try {
    natsConnection = await connect({
      servers: process.env.NATS_URL || 'nats://localhost:4222',
      name: process.env.SERVICE_NAME || 'task-marketplace',
    });

    logger.info('Connected to NATS', { server: process.env.NATS_URL });

    // Handle connection events
    (async () => {
      for await (const status of natsConnection!.status()) {
        logger.info('NATS connection status', { status: status.type });
      }
    })();

    return natsConnection;
  } catch (error) {
    logger.error('Failed to connect to NATS', { error });
    throw error;
  }
};

export const disconnectNats = async () => {
  if (natsConnection) {
    await natsConnection.drain();
    natsConnection = null;
    logger.info('Disconnected from NATS');
  }
};

export const getNatsConnection = (): NatsConnection => {
  if (!natsConnection) {
    throw new Error('NATS connection not initialized');
  }
  return natsConnection;
};
