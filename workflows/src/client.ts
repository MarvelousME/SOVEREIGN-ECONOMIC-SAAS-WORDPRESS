import { Connection, Client } from '@temporalio/client';
import { config } from './config';
import pino from 'pino';

const logger = pino({ level: config.logging.level });

export class TemporalClient {
  private client: Client | null = null;

  async connect(): Promise<void> {
    const connection = await Connection.connect({
      address: config.temporal.address,
    });

    this.client = new Client({
      connection,
      namespace: config.temporal.namespace,
    });

    logger.info('Connected to Temporal server');
  }

  async startUBIDistribution(input: {
    distributionId: string;
    dryRun?: boolean;
    tenantId?: string;
    poolId?: string;
  }) {
    if (!this.client) throw new Error('Client not connected');

    const handle = await this.client.workflow.start('ubiDistributionWorkflow', {
      taskQueue: config.temporal.taskQueue,
      workflowId: `ubi-distribution-${input.distributionId}`,
      args: [input],
    });

    logger.info({ workflowId: handle.workflowId }, 'UBI distribution workflow started');
    return handle;
  }

  async startTreasuryRebalance(input: {
    config?: any;
    dryRun?: boolean;
    triggeredBy: 'threshold' | 'scheduled' | 'manual';
  }) {
    if (!this.client) throw new Error('Client not connected');

    const handle = await this.client.workflow.start('treasuryRebalanceWorkflow', {
      taskQueue: config.temporal.taskQueue,
      workflowId: `treasury-rebalance-${Date.now()}`,
      args: [input],
    });

    logger.info({ workflowId: handle.workflowId }, 'Treasury rebalance workflow started');
    return handle;
  }

  async startTreasuryCompound(input: {
    strategies: string[];
    minThreshold: number;
    ubiPoolPercentage: number;
  }) {
    if (!this.client) throw new Error('Client not connected');

    const handle = await this.client.workflow.start('treasuryCompoundWorkflow', {
      taskQueue: config.temporal.taskQueue,
      workflowId: `treasury-compound-${Date.now()}`,
      args: [input],
    });

    logger.info({ workflowId: handle.workflowId }, 'Treasury compound workflow started');
    return handle;
  }

  async startPayout(request: any) {
    if (!this.client) throw new Error('Client not connected');

    const handle = await this.client.workflow.start('payoutWorkflow', {
      taskQueue: config.temporal.taskQueue,
      workflowId: `payout-${request.id}`,
      args: [request],
    });

    logger.info({ workflowId: handle.workflowId }, 'Payout workflow started');
    return handle;
  }

  async startTaskExpiration(input: { taskId: string; expiresAt: Date }) {
    if (!this.client) throw new Error('Client not connected');

    const handle = await this.client.workflow.start('taskExpirationWorkflow', {
      taskQueue: config.temporal.taskQueue,
      workflowId: `task-expiration-${input.taskId}`,
      args: [input],
    });

    logger.info({ workflowId: handle.workflowId }, 'Task expiration workflow started');
    return handle;
  }

  async startAgentExecution(request: any) {
    if (!this.client) throw new Error('Client not connected');

    const handle = await this.client.workflow.start('agentExecutionWorkflow', {
      taskQueue: config.temporal.taskQueue,
      workflowId: `agent-execution-${request.id}`,
      args: [request],
    });

    logger.info({ workflowId: handle.workflowId }, 'Agent execution workflow started');
    return handle;
  }

  async startReputationRecalc() {
    if (!this.client) throw new Error('Client not connected');

    const handle = await this.client.workflow.start('reputationRecalcWorkflow', {
      taskQueue: config.temporal.taskQueue,
      workflowId: `reputation-recalc-${Date.now()}`,
      args: [],
    });

    logger.info({ workflowId: handle.workflowId }, 'Reputation recalc workflow started');
    return handle;
  }

  async startGovernanceExecution(input: {
    proposalId: string;
    timeLockDuration: number;
    requiresHumanApproval: boolean;
  }) {
    if (!this.client) throw new Error('Client not connected');

    const handle = await this.client.workflow.start('governanceExecutionWorkflow', {
      taskQueue: config.temporal.taskQueue,
      workflowId: `governance-execution-${input.proposalId}`,
      args: [input],
    });

    logger.info({ workflowId: handle.workflowId }, 'Governance execution workflow started');
    return handle;
  }

  async startReferralConversion(input: {
    refereeId: string;
    conversionValue: number;
    conversionType: string;
  }) {
    if (!this.client) throw new Error('Client not connected');

    const handle = await this.client.workflow.start('referralConversionWorkflow', {
      taskQueue: config.temporal.taskQueue,
      workflowId: `referral-conversion-${input.refereeId}-${Date.now()}`,
      args: [input],
    });

    logger.info({ workflowId: handle.workflowId }, 'Referral conversion workflow started');
    return handle;
  }

  async getWorkflowHandle(workflowId: string) {
    if (!this.client) throw new Error('Client not connected');
    return this.client.workflow.getHandle(workflowId);
  }

  async queryWorkflowStatus(workflowId: string) {
    const handle = await this.getWorkflowHandle(workflowId);
    return handle.query('status');
  }

  async queryWorkflowProgress(workflowId: string) {
    const handle = await this.getWorkflowHandle(workflowId);
    return handle.query('progress');
  }

  async pauseWorkflow(workflowId: string) {
    const handle = await this.getWorkflowHandle(workflowId);
    await handle.signal('pause');
    logger.info({ workflowId }, 'Workflow paused');
  }

  async resumeWorkflow(workflowId: string) {
    const handle = await this.getWorkflowHandle(workflowId);
    await handle.signal('resume');
    logger.info({ workflowId }, 'Workflow resumed');
  }

  async cancelWorkflow(workflowId: string, reason: string) {
    const handle = await this.getWorkflowHandle(workflowId);
    await handle.signal('cancel', { reason });
    logger.info({ workflowId, reason }, 'Workflow cancelled');
  }
}

// Singleton instance
let clientInstance: TemporalClient | null = null;

export async function getTemporalClient(): Promise<TemporalClient> {
  if (!clientInstance) {
    clientInstance = new TemporalClient();
    await clientInstance.connect();
  }
  return clientInstance;
}
