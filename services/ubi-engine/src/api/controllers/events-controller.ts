import { Request, Response } from 'express';
import { natsClient } from '../../events/nats-client';
import { logger } from '../../utils/logger';

/**
 * POST /api/events
 * Ingest events from internal callers (e.g. Temporal activities) and publish to NATS.
 */
export class EventsController {
  async publish(req: Request, res: Response): Promise<void> {
    try {
      const { type, data } = req.body ?? {};

      if (!type || typeof type !== 'string') {
        res.status(400).json({ error: 'type is required and must be a string' });
        return;
      }

      const payload = data !== undefined && data !== null && typeof data === 'object' ? data : {};

      await natsClient.publish(type, payload);

      res.json({ ok: true });
    } catch (error) {
      logger.error('Failed to publish event to NATS', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const eventsController = new EventsController();
