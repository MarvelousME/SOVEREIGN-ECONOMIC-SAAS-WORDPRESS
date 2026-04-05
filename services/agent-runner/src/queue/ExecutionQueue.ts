import { connect, NatsConnection, JsMsg, JetStreamClient } from 'nats';
import { v4 as uuidv4 } from 'uuid';
import config from '../config';
import logger from '../utils/logger';
import agentRuntime from '../executors/AgentRuntime';
import database from '../utils/database';
import { ExecutionContext, QueueMessage, MessageType } from '../types';

export class ExecutionQueue {
  private nc: NatsConnection | null = null;
  private js: JetStreamClient | null = null;

  async connect(): Promise<void> {
    try {
      this.nc = await connect({
        servers: config.nats.servers,
        user: config.nats.user,
        pass: config.nats.pass,
      });

      this.js = this.nc.jetstream();
      logger.info('Connected to NATS');

      await this.setupStreams();
      await this.subscribe();
    } catch (error) {
      logger.error('Failed to connect to NATS', { error });
      throw error;
    }
  }

  private async setupStreams(): Promise<void> {
    if (!this.js) return;

    const jsm = await this.nc!.jetstreamManager();

    // Create agent execution stream
    try {
      await jsm.streams.add({
        name: 'AGENT_EXECUTION',
        subjects: ['agent.execute.*', 'agent.control.*'],
        retention: 'workqueue',
        max_age: 24 * 60 * 60 * 1e9, // 24 hours in nanoseconds
      });
      logger.info('Agent execution stream created');
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        logger.debug('Stream already exists');
      } else {
        throw error;
      }
    }
  }

  private async subscribe(): Promise<void> {
    if (!this.js) return;

    const opts = {
      stream: 'AGENT_EXECUTION',
      durable: 'agent-runner',
      ack_policy: 'explicit' as const,
    };

    const sub = await this.js.subscribe('agent.execute.*', opts);

    logger.info('Subscribed to agent execution queue');

    // Process messages
    (async () => {
      for await (const msg of sub) {
        await this.handleMessage(msg);
      }
    })();
  }

  private async handleMessage(msg: JsMsg): Promise<void> {
    try {
      const data = JSON.parse(msg.data.toString()) as QueueMessage;
      
      logger.info('Processing execution request', {
        agentId: data.agentId,
        executionId: data.executionId,
        type: data.type,
      });

      switch (data.type) {
        case MessageType.EXECUTE_AGENT:
          await this.executeAgent(data);
          break;

        case MessageType.PAUSE_AGENT:
          await agentRuntime.pause(data.executionId);
          break;

        case MessageType.RESUME_AGENT:
          await agentRuntime.resume(data.executionId);
          break;

        case MessageType.CANCEL_AGENT:
          await agentRuntime.cancel(data.executionId);
          break;

        default:
          logger.warn('Unknown message type', { type: data.type });
      }

      msg.ack();
    } catch (error: any) {
      logger.error('Failed to process message', { error: error.message });
      msg.nak();
    }
  }

  private async executeAgent(message: QueueMessage): Promise<void> {
    const { agentId, executionId, payload } = message;

    try {
      // Get agent configuration
      const agentQuery = 'SELECT * FROM agents WHERE id = $1';
      const agentResult = await database.query(agentQuery, [agentId]);

      if (agentResult.rows.length === 0) {
        throw new Error(`Agent not found: ${agentId}`);
      }

      const agent = agentResult.rows[0];
      const config = typeof agent.config === 'string' ? JSON.parse(agent.config) : agent.config;

      // Create execution context
      const context: ExecutionContext = {
        agentId,
        executionId,
        userId: agent.user_id,
        input: payload.input,
        environment: config.environment || {},
        permissions: config.permissions || [],
        resourceLimits: config.resourceLimits,
        memoryConfig: config.memoryConfig || {
          enableShortTerm: true,
          enableLongTerm: true,
          enableEpisodic: true,
          vectorDimension: 1536,
        },
      };

      // Log execution start
      await this.logExecutionStart(executionId, agentId, payload.input);

      // Execute agent
      const result = await agentRuntime.execute(context, config.code);

      // Log execution result
      await this.logExecutionComplete(executionId, result);

      // Publish completion event
      await this.publishEvent('agent.completed', {
        type: MessageType.AGENT_COMPLETED,
        agentId,
        executionId,
        payload: result,
        timestamp: new Date(),
      });

      logger.info('Agent execution completed', {
        agentId,
        executionId,
        status: result.status,
      });
    } catch (error: any) {
      logger.error('Agent execution failed', {
        agentId,
        executionId,
        error: error.message,
      });

      // Log execution failure
      await this.logExecutionFailure(executionId, error);

      // Publish failure event
      await this.publishEvent('agent.failed', {
        type: MessageType.AGENT_FAILED,
        agentId,
        executionId,
        payload: { error: error.message },
        timestamp: new Date(),
      });
    }
  }

  private async logExecutionStart(executionId: string, agentId: string, input: any): Promise<void> {
    const query = `
      INSERT INTO agent_execution_logs (id, agent_id, started_at, status, input, tokens_used, cost, execution_time_ms)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    await database.query(query, [
      executionId,
      agentId,
      new Date(),
      'running',
      JSON.stringify(input),
      0,
      0,
      0,
    ]);
  }

  private async logExecutionComplete(executionId: string, result: any): Promise<void> {
    const query = `
      UPDATE agent_execution_logs
      SET completed_at = $1, status = $2, output = $3, tokens_used = $4, cost = $5, execution_time_ms = $6
      WHERE id = $7
    `;

    await database.query(query, [
      new Date(),
      result.status,
      JSON.stringify(result.output),
      result.metrics.tokensUsed,
      result.metrics.cost,
      result.metrics.durationMs,
      executionId,
    ]);
  }

  private async logExecutionFailure(executionId: string, error: Error): Promise<void> {
    const query = `
      UPDATE agent_execution_logs
      SET completed_at = $1, status = $2, error = $3
      WHERE id = $4
    `;

    await database.query(query, [
      new Date(),
      'failed',
      error.message,
      executionId,
    ]);
  }

  async publishEvent(subject: string, data: QueueMessage): Promise<void> {
    if (!this.js) {
      throw new Error('Not connected to NATS');
    }

    await this.js.publish(subject, JSON.stringify(data));
  }

  async enqueueExecution(agentId: string, input: any, priority: number = 5): Promise<string> {
    const executionId = uuidv4();

    const message: QueueMessage = {
      type: MessageType.EXECUTE_AGENT,
      agentId,
      executionId,
      payload: { input, priority },
      timestamp: new Date(),
    };

    await this.publishEvent(`agent.execute.${priority}`, message);

    logger.info('Execution enqueued', { agentId, executionId, priority });
    return executionId;
  }

  async close(): Promise<void> {
    if (this.nc) {
      await this.nc.close();
      logger.info('Disconnected from NATS');
    }
  }
}

export default new ExecutionQueue();
