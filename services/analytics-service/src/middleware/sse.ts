import { Request, Response } from 'express';
import { AnalyticsEventEmitter } from '../utils/logger';
import logger from '../utils/logger';

interface SSEClient {
  id: string;
  tenantId: string;
  workspaceId?: string;
  res: Response;
  lastEventId?: string;
}

export class SSEManager {
  private static instance: SSEManager;
  private clients: Map<string, SSEClient> = new Map();
  private eventEmitter: AnalyticsEventEmitter;

  private constructor() {
    this.eventEmitter = AnalyticsEventEmitter.getInstance();
    this.setupEventListeners();
  }

  static getInstance(): SSEManager {
    if (!SSEManager.instance) {
      SSEManager.instance = new SSEManager();
    }
    return SSEManager.instance;
  }

  private setupEventListeners(): void {
    this.eventEmitter.on('analytics.event_received', (data) => {
      this.broadcast('analytics.event_received', data);
    });

    this.eventEmitter.on('analytics.attribution_calculated', (data) => {
      this.broadcast('analytics.attribution_calculated', data);
    });

    this.eventEmitter.on('analytics.anomaly_detected', (data) => {
      this.broadcast('analytics.anomaly_detected', data);
    });

    this.eventEmitter.on('analytics.experiment.started', (data) => {
      this.broadcast('analytics.experiment.started', data);
    });

    this.eventEmitter.on('analytics.experiment.completed', (data) => {
      this.broadcast('analytics.experiment.completed', data);
    });
  }

  addClient(client: SSEClient): void {
    this.clients.set(client.id, client);
    logger.info('SSE client connected', { 
      clientId: client.id, 
      tenantId: client.tenantId,
      workspaceId: client.workspaceId 
    });
  }

  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.delete(clientId);
      logger.info('SSE client disconnected', { clientId });
    }
  }

  private broadcast(eventType: string, data: unknown): void {
    const message = this.formatSSEMessage(eventType, data);
    
    for (const [clientId, client] of this.clients.entries()) {
      try {
        client.res.write(message);
      } catch (error) {
        logger.error('Failed to send SSE message', { error, clientId });
        this.removeClient(clientId);
      }
    }
  }

  private formatSSEMessage(eventType: string, data: unknown): string {
    const id = Date.now();
    return `id: ${id}\nevent: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  }

  sendToClient(clientId: string, eventType: string, data: unknown): void {
    const client = this.clients.get(clientId);
    if (client) {
      const message = this.formatSSEMessage(eventType, data);
      try {
        client.res.write(message);
      } catch (error) {
        logger.error('Failed to send SSE message to client', { error, clientId });
        this.removeClient(clientId);
      }
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }

  getClientsByTenant(tenantId: string): SSEClient[] {
    return Array.from(this.clients.values()).filter(c => c.tenantId === tenantId);
  }
}

export const sseManager = SSEManager.getInstance();

export function createSSEHandler(tenantId: string, workspaceId?: string) {
  return (req: Request, res: Response): void => {
    const clientId = `${tenantId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    res.write(`: connected\n\n`);

    const client: SSEClient = {
      id: clientId,
      tenantId,
      workspaceId,
      res,
    };

    sseManager.addClient(client);

    const keepAliveInterval = setInterval(() => {
      try {
        res.write(`: keepalive\n\n`);
      } catch (error) {
        clearInterval(keepAliveInterval);
        sseManager.removeClient(clientId);
      }
    }, 30000);

    req.on('close', () => {
      clearInterval(keepAliveInterval);
      sseManager.removeClient(clientId);
    });
  };
}

export function subscribeToEvents(req: Request, res: Response): void {
  if (!req.tenantContext) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const tenantId = req.tenantContext.tenantId;
  const workspaceId = req.query.workspaceId as string | undefined;

  const handler = createSSEHandler(tenantId, workspaceId);
  handler(req, res);
}
