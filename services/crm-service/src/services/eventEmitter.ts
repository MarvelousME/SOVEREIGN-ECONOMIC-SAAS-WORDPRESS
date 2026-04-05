import { EventEmitter } from 'events';
import { CRMEvent } from '../types';

class CRMEvents extends EventEmitter {
  private static instance: CRMEvents;

  private constructor() {
    super();
    this.setMaxListeners(100);
  }

  static getInstance(): CRMEvents {
    if (!CRMEvents.instance) {
      CRMEvents.instance = new CRMEvents();
    }
    return CRMEvents.instance;
  }

  emitLeadCaptured(tenantId: string, lead: unknown): void {
    const event: CRMEvent = {
      event: 'lead.captured',
      tenantId,
      data: lead,
      timestamp: new Date(),
    };
    this.emit('lead.captured', event);
  }

  emitLeadScored(tenantId: string, lead: unknown, score: unknown): void {
    const event: CRMEvent = {
      event: 'lead.scored',
      tenantId,
      data: { lead, score },
      timestamp: new Date(),
    };
    this.emit('lead.scored', event);
  }

  emitLeadRouted(tenantId: string, lead: unknown, rule: unknown): void {
    const event: CRMEvent = {
      event: 'lead.routed',
      tenantId,
      data: { lead, rule },
      timestamp: new Date(),
    };
    this.emit('lead.routed', event);
  }

  emitLeadConverted(tenantId: string, lead: unknown, deal: unknown): void {
    const event: CRMEvent = {
      event: 'lead.converted',
      tenantId,
      data: { lead, deal },
      timestamp: new Date(),
    };
    this.emit('lead.converted', event);
  }

  emitDealCreated(tenantId: string, deal: unknown): void {
    const event: CRMEvent = {
      event: 'crm.deal.created',
      tenantId,
      data: deal,
      timestamp: new Date(),
    };
    this.emit('crm.deal.created', event);
  }

  emitDealStageChanged(tenantId: string, deal: unknown, fromStage: unknown, toStage: unknown): void {
    const event: CRMEvent = {
      event: 'crm.deal.stage_changed',
      tenantId,
      data: { deal, fromStage, toStage },
      timestamp: new Date(),
    };
    this.emit('crm.deal.stage_changed', event);
  }

  emitActivityLogged(tenantId: string, activity: unknown): void {
    const event: CRMEvent = {
      event: 'crm.activity.logged',
      tenantId,
      data: activity,
      timestamp: new Date(),
    };
    this.emit('crm.activity.logged', event);
  }
}

export const eventEmitter = CRMEvents.getInstance();
