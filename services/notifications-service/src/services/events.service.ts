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
      { subject: 'task.assigned', handler: this.handleTaskAssigned.bind(this) },
      { subject: 'task.approved', handler: this.handleTaskApproved.bind(this) },
      { subject: 'task.rejected', handler: this.handleTaskRejected.bind(this) },
      { subject: 'ubi.distributed', handler: this.handleUBIDistributed.bind(this) },
      { subject: 'reward.issued', handler: this.handleRewardIssued.bind(this) },
      { subject: 'treasury.performance', handler: this.handleTreasuryPerformance.bind(this) },
      { subject: 'agent.execution.complete', handler: this.handleAgentExecutionComplete.bind(this) },
      { subject: 'governance.proposal', handler: this.handleGovernanceProposal.bind(this) }
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

  private async handleTaskAssigned(data: any): Promise<void> {
    await notificationService.sendNotification({
      tenant_id: data.tenant_id,
      user_id: data.assigned_to,
      type: NotificationType.TASK_ASSIGNED,
      priority: NotificationPriority.HIGH,
      title: 'New Task Assigned',
      message: `You have been assigned a new task: ${data.task_title}`,
      data: { task_id: data.task_id }
    });
  }

  private async handleTaskApproved(data: any): Promise<void> {
    await notificationService.sendNotification({
      tenant_id: data.tenant_id,
      user_id: data.user_id,
      type: NotificationType.TASK_APPROVED,
      priority: NotificationPriority.NORMAL,
      title: 'Task Approved',
      message: `Your task "${data.task_title}" has been approved!`,
      data: { task_id: data.task_id, reward_amount: data.reward_amount }
    });
  }

  private async handleTaskRejected(data: any): Promise<void> {
    await notificationService.sendNotification({
      tenant_id: data.tenant_id,
      user_id: data.user_id,
      type: NotificationType.TASK_REJECTED,
      priority: NotificationPriority.NORMAL,
      title: 'Task Rejected',
      message: `Your task "${data.task_title}" was rejected. Reason: ${data.reason}`,
      data: { task_id: data.task_id }
    });
  }

  private async handleUBIDistributed(data: any): Promise<void> {
    await notificationService.sendNotification({
      tenant_id: data.tenant_id,
      user_id: data.user_id,
      type: NotificationType.UBI_DISTRIBUTION,
      priority: NotificationPriority.NORMAL,
      title: 'UBI Received',
      message: `You received ${data.amount} ${data.currency} in UBI for ${data.period}`,
      data: { amount: data.amount, period: data.period }
    });
  }

  private async handleRewardIssued(data: any): Promise<void> {
    await notificationService.sendNotification({
      tenant_id: data.tenant_id,
      user_id: data.user_id,
      type: NotificationType.REWARD_RECEIVED,
      priority: NotificationPriority.HIGH,
      title: 'Reward Received',
      message: `You earned ${data.amount} ${data.currency} for ${data.reason}!`,
      data: { amount: data.amount, reason: data.reason }
    });
  }

  private async handleTreasuryPerformance(data: any): Promise<void> {
    // Send to all users with treasury_updates preference
    // This would be implemented with a batch notification system
    logger.info('Treasury performance notification', { data });
  }

  private async handleAgentExecutionComplete(data: any): Promise<void> {
    await notificationService.sendNotification({
      tenant_id: data.tenant_id,
      user_id: data.user_id,
      type: NotificationType.AGENT_EXECUTION_COMPLETE,
      priority: NotificationPriority.NORMAL,
      title: 'Agent Execution Complete',
      message: `Your agent "${data.agent_name}" has completed execution. Status: ${data.status}`,
      data: { execution_id: data.execution_id, agent_id: data.agent_id }
    });
  }

  private async handleGovernanceProposal(data: any): Promise<void> {
    await notificationService.sendNotification({
      tenant_id: data.tenant_id,
      user_id: data.user_id,
      type: NotificationType.GOVERNANCE_PROPOSAL,
      priority: NotificationPriority.URGENT,
      title: 'New Governance Proposal',
      message: `New proposal: ${data.proposal_title}. Voting ends ${data.voting_deadline}`,
      data: { proposal_id: data.proposal_id }
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
