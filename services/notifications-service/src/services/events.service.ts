import { connect, NatsConnection, StringCodec, Subscription } from 'nats';
import { config } from '../config';
import { logger } from '../utils/logger';
import { notificationService } from './notification.service';
import { NotificationType, NotificationPriority } from '../types';

class EventsService {
  private nc: NatsConnection | null = null;
  private sc = StringCodec();
  private subscriptions: Subscription[] = [];

  async connect(): Promise<void> {
    try {
      this.nc = await connect({ servers: config.nats.url });
      logger.info('Connected to NATS', { url: config.nats.url });

      this.nc.closed().then((err) => {
        if (err) {
          logger.error('NATS connection closed with error', { error: err });
        } else {
          logger.info('NATS connection closed');
        }
      });

      await this.subscribe();
    } catch (error) {
      logger.error('Failed to connect to NATS', { error });
      throw error;
    }
  }

  private async subscribe(): Promise<void> {
    if (!this.nc) {
      return;
    }

    // Subscribe to various events
    const subscriptions = [
      { subject: 'task.claimed', handler: this.handleTaskClaimed.bind(this) },
      { subject: 'task.approved', handler: this.handleTaskApproved.bind(this) },
      { subject: 'task.rejected', handler: this.handleTaskRejected.bind(this) },
      { subject: 'ubi.distributed', handler: this.handleUBIDistributed.bind(this) },
      { subject: 'reward.distributed', handler: this.handleRewardDistributed.bind(this) },
      { subject: 'treasury.compounded', handler: this.handleTreasuryCompounded.bind(this) },
      { subject: 'agent.completed', handler: this.handleAgentCompleted.bind(this) },
      { subject: 'proposal.created', handler: this.handleProposalCreated.bind(this) },
    ];

    for (const { subject, handler } of subscriptions) {
      const sub = this.nc.subscribe(subject);
      this.subscriptions.push(sub);

      (async () => {
        for await (const msg of sub) {
          try {
            const data = JSON.parse(this.sc.decode(msg.data));
            await handler(data);
          } catch (error) {
            logger.error('Failed to process event', { subject, error });
          }
        }
      })();

      logger.info('Subscribed to event', { subject });
    }
  }

  private async handleTaskClaimed(data: any): Promise<void> {
    const userId = data.assignee_id ?? data.user_id ?? data.userId;
    const tenantId = data.tenant_id ?? data.tenantId ?? 'default';
    if (!userId) {
      logger.warn('task.claimed missing assignee', { data });
      return;
    }
    await notificationService.sendNotification({
      tenant_id: tenantId,
      user_id: userId,
      type: NotificationType.TASK_ASSIGNED,
      priority: NotificationPriority.HIGH,
      title: 'Task Claimed',
      message: `You claimed task ${data.task_id ?? ''}.`,
      data: { task_id: data.task_id },
    });
  }

  private async handleTaskApproved(data: any): Promise<void> {
    const userId = data.assignee_id ?? data.user_id ?? data.userId;
    const tenantId = data.tenant_id ?? data.tenantId ?? 'default';
    const label = data.task_title ?? data.task_id ?? 'task';
    if (!userId) {
      logger.warn('task.approved missing assignee', { data });
      return;
    }
    await notificationService.sendNotification({
      tenant_id: tenantId,
      user_id: userId,
      type: NotificationType.TASK_APPROVED,
      priority: NotificationPriority.NORMAL,
      title: 'Task Approved',
      message: `Your task "${label}" has been approved!`,
      data: { task_id: data.task_id, reward_amount: data.reward_amount }
    });
  }

  private async handleTaskRejected(data: any): Promise<void> {
    const userId = data.assignee_id ?? data.user_id ?? data.userId;
    const tenantId = data.tenant_id ?? data.tenantId ?? 'default';
    const label = data.task_title ?? data.task_id ?? 'task';
    if (!userId) {
      logger.warn('task.rejected missing assignee', { data });
      return;
    }
    await notificationService.sendNotification({
      tenant_id: tenantId,
      user_id: userId,
      type: NotificationType.TASK_REJECTED,
      priority: NotificationPriority.NORMAL,
      title: 'Task Rejected',
      message: `Your task "${label}" was rejected. Reason: ${data.feedback ?? data.reason ?? 'n/a'}`,
      data: { task_id: data.task_id }
    });
  }

  private async handleUBIDistributed(data: any): Promise<void> {
    const userId = data.user_id ?? data.userId;
    const tenantId = data.tenant_id ?? data.tenantId ?? 'default';
    const amount = data.amount;
    const currency = data.currency ?? 'UBI';
    const period = data.period ?? data.distribution_id ?? 'distribution';
    if (!userId) {
      logger.warn('ubi.distributed missing user', { data });
      return;
    }
    await notificationService.sendNotification({
      tenant_id: tenantId,
      user_id: userId,
      type: NotificationType.UBI_DISTRIBUTION,
      priority: NotificationPriority.NORMAL,
      title: 'UBI Received',
      message: `You received ${amount} ${currency} in UBI (${period}).`,
      data: { amount, period, currency },
    });
  }

  private async handleRewardDistributed(data: any): Promise<void> {
    const userId = data.userId ?? data.user_id;
    const tenantId = data.tenant_id ?? data.tenantId ?? 'default';
    if (!userId) {
      logger.warn('reward.distributed missing user', { data });
      return;
    }
    const amount = data.totalAmount ?? data.amount;
    await notificationService.sendNotification({
      tenant_id: tenantId,
      user_id: userId,
      type: NotificationType.REWARD_RECEIVED,
      priority: NotificationPriority.HIGH,
      title: 'Rewards Distributed',
      message: `You received ${amount} UBI from claimed rewards.`,
      data: {
        amount,
        transaction_id: data.transactionId ?? data.transaction_id,
        reward_ids: data.rewardIds ?? data.reward_ids,
      },
    });
  }

  private async handleTreasuryCompounded(data: any): Promise<void> {
    logger.info('Treasury compounded event', { data });
  }

  private async handleAgentCompleted(data: any): Promise<void> {
    const userId = data.userId ?? data.user_id;
    const tenantId = data.tenant_id ?? data.tenantId ?? 'default';
    if (!userId) {
      logger.warn('agent.completed missing userId', { data });
      return;
    }
    const status = data.payload?.status ?? 'completed';
    await notificationService.sendNotification({
      tenant_id: tenantId,
      user_id: userId,
      type: NotificationType.AGENT_EXECUTION_COMPLETE,
      priority: NotificationPriority.NORMAL,
      title: 'Agent Execution Complete',
      message: `Your agent "${data.agentId}" finished. Status: ${status}`,
      data: { execution_id: data.executionId, agent_id: data.agentId },
    });
  }

  private async handleProposalCreated(data: any): Promise<void> {
    const userId = data.proposerId ?? data.user_id ?? data.userId;
    const tenantId = data.tenant_id ?? data.tenantId ?? 'default';
    if (!userId) {
      logger.warn('proposal.created missing proposer', { data });
      return;
    }
    await notificationService.sendNotification({
      tenant_id: tenantId,
      user_id: userId,
      type: NotificationType.GOVERNANCE_PROPOSAL,
      priority: NotificationPriority.URGENT,
      title: 'Governance Proposal Created',
      message: `Your proposal "${data.title}" is live.`,
      data: { proposal_id: data.proposalId ?? data.proposal_id },
    });
  }

  async close(): Promise<void> {
    for (const sub of this.subscriptions) {
      await sub.drain();
    }

    if (this.nc) {
      await this.nc.drain();
      logger.info('NATS connection drained');
    }
  }

  isConnected(): boolean {
    return this.nc !== null && !this.nc.isClosed();
  }
}

export const eventsService = new EventsService();
