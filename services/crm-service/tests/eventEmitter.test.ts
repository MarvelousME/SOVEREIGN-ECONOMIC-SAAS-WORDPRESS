import { EventEmitter } from 'events';

class MockEventEmitter extends EventEmitter {
  emitLeadCaptured(tenantId: string, lead: unknown): void {
    const event = { event: 'lead.captured', tenantId, data: lead, timestamp: new Date() };
    this.emit('lead.captured', event);
  }

  emitLeadScored(tenantId: string, lead: unknown, score: unknown): void {
    const event = { event: 'lead.scored', tenantId, data: { lead, score }, timestamp: new Date() };
    this.emit('lead.scored', event);
  }

  emitLeadRouted(tenantId: string, lead: unknown, rule: unknown): void {
    const event = { event: 'lead.routed', tenantId, data: { lead, rule }, timestamp: new Date() };
    this.emit('lead.routed', event);
  }

  emitLeadConverted(tenantId: string, lead: unknown, deal: unknown): void {
    const event = { event: 'lead.converted', tenantId, data: { lead, deal }, timestamp: new Date() };
    this.emit('lead.converted', event);
  }

  emitDealCreated(tenantId: string, deal: unknown): void {
    const event = { event: 'crm.deal.created', tenantId, data: deal, timestamp: new Date() };
    this.emit('crm.deal.created', event);
  }

  emitDealStageChanged(tenantId: string, deal: unknown, fromStage: unknown, toStage: unknown): void {
    const event = { event: 'crm.deal.stage_changed', tenantId, data: { deal, fromStage, toStage }, timestamp: new Date() };
    this.emit('crm.deal.stage_changed', event);
  }

  emitActivityLogged(tenantId: string, activity: unknown): void {
    const event = { event: 'crm.activity.logged', tenantId, data: activity, timestamp: new Date() };
    this.emit('crm.activity.logged', event);
  }
}

describe('EventEmitter', () => {
  let emitter: MockEventEmitter;

  beforeEach(() => {
    emitter = new MockEventEmitter();
  });

  it('should emit lead.captured event', (done) => {
    emitter.on('lead.captured', (event) => {
      expect(event.event).toBe('lead.captured');
      expect(event.tenantId).toBe('tenant-123');
      expect(event.data).toEqual({ id: 'lead-1' });
      done();
    });

    emitter.emitLeadCaptured('tenant-123', { id: 'lead-1' });
  });

  it('should emit lead.scored event', (done) => {
    emitter.on('lead.scored', (event) => {
      expect(event.event).toBe('lead.scored');
      expect(event.data.lead).toEqual({ id: 'lead-1' });
      expect(event.data.score).toEqual({ totalScore: 85 });
      done();
    });

    emitter.emitLeadScored('tenant-123', { id: 'lead-1' }, { totalScore: 85 });
  });

  it('should emit lead.routed event', (done) => {
    emitter.on('lead.routed', (event) => {
      expect(event.event).toBe('lead.routed');
      done();
    });

    emitter.emitLeadRouted('tenant-123', { id: 'lead-1' }, { name: 'High Value Rule' });
  });

  it('should emit lead.converted event', (done) => {
    emitter.on('lead.converted', (event) => {
      expect(event.event).toBe('lead.converted');
      expect(event.data.deal).toEqual({ id: 'deal-1' });
      done();
    });

    emitter.emitLeadConverted('tenant-123', { id: 'lead-1' }, { id: 'deal-1' });
  });

  it('should emit crm.deal.created event', (done) => {
    emitter.on('crm.deal.created', (event) => {
      expect(event.event).toBe('crm.deal.created');
      expect(event.data).toEqual({ id: 'deal-1', name: 'New Deal' });
      done();
    });

    emitter.emitDealCreated('tenant-123', { id: 'deal-1', name: 'New Deal' });
  });

  it('should emit crm.deal.stage_changed event', (done) => {
    emitter.on('crm.deal.stage_changed', (event) => {
      expect(event.event).toBe('crm.deal.stage_changed');
      expect(event.data.fromStage).toBe('stage-1');
      expect(event.data.toStage).toBe('stage-2');
      done();
    });

    emitter.emitDealStageChanged('tenant-123', { id: 'deal-1' }, 'stage-1', 'stage-2');
  });

  it('should emit crm.activity.logged event', (done) => {
    emitter.on('crm.activity.logged', (event) => {
      expect(event.event).toBe('crm.activity.logged');
      expect(event.data).toEqual({ id: 'activity-1', type: 'call' });
      done();
    });

    emitter.emitActivityLogged('tenant-123', { id: 'activity-1', type: 'call' });
  });
});
