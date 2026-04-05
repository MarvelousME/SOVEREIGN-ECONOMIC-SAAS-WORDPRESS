import { connect, NatsConnection, JSONCodec, StringCodec } from 'nats';

export class NatsHelper {
  private nc?: NatsConnection;
  private jsonCodec = JSONCodec();
  private stringCodec = StringCodec();
  private subscriptions: Map<string, any> = new Map();
  private messages: Map<string, any[]> = new Map();

  async connect(): Promise<void> {
    if (this.nc) return;
    
    this.nc = await connect({
      servers: process.env.NATS_URL || 'nats://localhost:4222',
      timeout: 5000,
    });
  }

  async disconnect(): Promise<void> {
    if (this.nc) {
      await this.nc.drain();
      this.nc = undefined;
    }
    this.subscriptions.clear();
    this.messages.clear();
  }

  async publish(subject: string, data: any): Promise<void> {
    if (!this.nc) {
      throw new Error('NATS not connected');
    }
    this.nc.publish(subject, this.jsonCodec.encode(data));
  }

  async publishString(subject: string, data: string): Promise<void> {
    if (!this.nc) {
      throw new Error('NATS not connected');
    }
    this.nc.publish(subject, this.stringCodec.encode(data));
  }

  async request(subject: string, data: any, timeout = 5000): Promise<any> {
    if (!this.nc) {
      throw new Error('NATS not connected');
    }
    const response = await this.nc.request(
      subject,
      this.jsonCodec.encode(data),
      { timeout }
    );
    return this.jsonCodec.decode(response.data);
  }

  async subscribe(subject: string, handler?: (data: any) => void): Promise<void> {
    if (!this.nc) {
      throw new Error('NATS not connected');
    }

    const sub = this.nc.subscribe(subject);
    this.subscriptions.set(subject, sub);
    
    if (!this.messages.has(subject)) {
      this.messages.set(subject, []);
    }

    (async () => {
      for await (const msg of sub) {
        const data = this.jsonCodec.decode(msg.data);
        this.messages.get(subject)!.push(data);
        if (handler) {
          handler(data);
        }
      }
    })();
  }

  async unsubscribe(subject: string): Promise<void> {
    const sub = this.subscriptions.get(subject);
    if (sub) {
      sub.unsubscribe();
      this.subscriptions.delete(subject);
    }
  }

  getMessages(subject: string): any[] {
    return this.messages.get(subject) || [];
  }

  clearMessages(subject: string): void {
    this.messages.set(subject, []);
  }

  async waitForMessage(
    subject: string,
    predicate?: (msg: any) => boolean,
    timeout = 5000
  ): Promise<any> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const messages = this.getMessages(subject);
      const message = predicate 
        ? messages.find(predicate)
        : messages[messages.length - 1];
      
      if (message) {
        return message;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`No message received on ${subject} within ${timeout}ms`);
  }
}

// Singleton instance
let natsHelper: NatsHelper;

export function getNatsHelper(): NatsHelper {
  if (!natsHelper) {
    natsHelper = new NatsHelper();
  }
  return natsHelper;
}

// Global setup and cleanup
beforeAll(async () => {
  const helper = getNatsHelper();
  await helper.connect();
});

afterAll(async () => {
  if (natsHelper) {
    await natsHelper.disconnect();
  }
});
