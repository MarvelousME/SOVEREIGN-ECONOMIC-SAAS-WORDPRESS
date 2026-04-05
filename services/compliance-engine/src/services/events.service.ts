import { connect, NatsConnection, StringCodec } from 'nats';
import { config } from '../config';
import { logger } from '../utils/logger';

export class EventService {
  private nc: NatsConnection | null = null;
  private sc = StringCodec();

  async connect(): Promise<void> {
    try {
      this.nc = await connect({ servers: config.nats.url });
      logger.info('Connected to NATS');
    } catch (error) {
      logger.error('Failed to connect to NATS', { error });
      throw error;
    }
  }

  async publish(subject: string, data: any): Promise<void> {
    if (!this.nc) {
      try {
        await this.connect();
      } catch (error) {
        logger.warn('NATS not available, skipping event publish', { subject });
        return;
      }
    }

    try {
      this.nc!.publish(subject, this.sc.encode(JSON.stringify(data)));
      logger.debug('Published event', { subject, data });
    } catch (error) {
      logger.error('Failed to publish event', { subject, error });
    }
  }

  async subscribe(subject: string, handler: (data: any) => void): Promise<void> {
    if (!this.nc) {
      try {
        await this.connect();
      } catch (error) {
        logger.warn('NATS not available, skipping subscription', { subject });
        return;
      }
    }

    const sub = this.nc!.subscribe(subject);
    logger.info('Subscribed to subject', { subject });

    (async () => {
      for await (const msg of sub) {
        try {
          const data = JSON.parse(this.sc.decode(msg.data));
          handler(data);
        } catch (error) {
          logger.error('Error processing message', { subject, error });
        }
      }
    })();
  }

  async close(): Promise<void> {
    if (this.nc) {
      await this.nc.drain();
      logger.info('NATS connection closed');
    }
  }
}

export const eventService = new EventService();

export const ComplianceEvents = {
  CONSENT_RECORDED: 'consent.recorded',
  CONSENT_UPDATED: 'consent.updated',
  CONSENT_REVOKED: 'consent.revoked',
  SUPPRESSION_UPDATED: 'suppression.updated',
  DISCLOSURE_GENERATED: 'disclosure.generated',
  POLICY_ACTION_BLOCKED: 'policy.action_blocked',
  COMPLIANCE_REVIEW_REQUESTED: 'compliance.review.requested',
  COMPLIANCE_REVIEW_APPROVED: 'compliance.review.approved',
  COMPLIANCE_REVIEW_REJECTED: 'compliance.review.rejected',
  GEO_RESTRICTION_TRIGGERED: 'geo.restriction.triggered',
  ABUSE_SIGNAL_DETECTED: 'abuse.signal.detected'
};
