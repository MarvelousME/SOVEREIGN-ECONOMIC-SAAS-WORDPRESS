import { config } from '../config';

interface PageEvent {
  eventType: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

class EventPublisher {
  private natsConnection: unknown = null;
  private isConnected = false;

  async connect(): Promise<void> {
    if (this.isConnected) return;

    try {
      const { connect } = await import('nats');
      this.natsConnection = await connect({ servers: config.natsUrl });
      this.isConnected = true;
    } catch (error) {
      console.warn('NATS connection failed, events will be logged only:', error);
      this.isConnected = false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.natsConnection && typeof (this.natsConnection as { close?: () => Promise<void> }).close === 'function') {
      await (this.natsConnection as { close: () => Promise<void> }).close();
    }
    this.isConnected = false;
  }

  private async publish(subject: string, event: PageEvent): Promise<void> {
    const payload = JSON.stringify(event);

    if (this.isConnected && this.natsConnection) {
      try {
        const nc = this.natsConnection as { publish: (subject: string, payload: Uint8Array) => void };
        nc.publish(subject, new TextEncoder().encode(payload));
      } catch (error) {
        console.error(`Failed to publish event to ${subject}:`, error);
      }
    }

    console.log(`[Event] ${subject}:`, payload);
  }

  async publishPageGenerated(data: {
    pageId: string;
    tenantId: string;
    userId: string;
    affiliateUrl: string;
    templateId?: string;
    blockCount: number;
  }): Promise<void> {
    await this.publish('page.generated', {
      eventType: 'page.generated',
      timestamp: new Date(),
      data,
    });
  }

  async publishPageReviewed(data: {
    pageId: string;
    tenantId: string;
    reviewerId: string;
    status: 'approved' | 'rejected';
    notes?: string;
  }): Promise<void> {
    await this.publish('page.reviewed', {
      eventType: 'page.reviewed',
      timestamp: new Date(),
      data,
    });
  }

  async publishPagePublished(data: {
    pageId: string;
    tenantId: string;
    publishTargetId: string;
    targetType: string;
    url?: string;
  }): Promise<void> {
    await this.publish('page.published', {
      eventType: 'page.published',
      timestamp: new Date(),
      data,
    });
  }

  async publishPageRollback(data: {
    pageId: string;
    tenantId: string;
    userId: string;
    fromVersion: number;
    toVersion: number;
    rollbackToken: string;
  }): Promise<void> {
    await this.publish('page.rollback', {
      eventType: 'page.rollback',
      timestamp: new Date(),
      data,
    });
  }

  async publishDisclosureInjected(data: {
    pageId: string;
    tenantId: string;
    disclosureType: string;
    position: string;
    jurisdictions?: string[];
  }): Promise<void> {
    await this.publish('disclosure.injected', {
      eventType: 'disclosure.injected',
      timestamp: new Date(),
      data,
    });
  }
}

export const eventPublisher = new EventPublisher();
