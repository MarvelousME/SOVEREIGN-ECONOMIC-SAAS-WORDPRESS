import { connect, NatsConnection, StringCodec } from 'nats';
import { config } from '../config';
import ReferralService from './referralService';
import logger from '../utils/logger';

export class EventListener {
  private nc: NatsConnection | null = null;
  private referralService: ReferralService;
  private sc = StringCodec();

  constructor() {
    this.referralService = new ReferralService();
  }

  async start(): Promise<void> {
    try {
      this.nc = await connect({ servers: config.nats.url });
      logger.info('Connected to NATS');

      // Subscribe to events
      this.subscribeToUserRegistered();
      this.subscribeToTaskCompleted();
      this.subscribeToAgentDeployed();
      this.subscribeToRewardDistributed();
    } catch (error) {
      logger.error('Failed to connect to NATS', { error });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.nc) {
      await this.nc.drain();
      logger.info('Disconnected from NATS');
    }
  }

  private subscribeToUserRegistered(): void {
    if (!this.nc) return;

    const sub = this.nc.subscribe('user.registered');
    
    (async () => {
      for await (const msg of sub) {
        try {
          const data = JSON.parse(this.sc.decode(msg.data));
          logger.info('Received user.registered event', data);

          // Track referral cookie if present
          if (data.referralCode) {
            await this.referralService.registerReferral({
              userId: data.userId,
              referralCode: data.referralCode,
              ipAddress: data.ipAddress || '0.0.0.0',
              deviceFingerprint: data.deviceFingerprint || 'unknown',
              userAgent: data.userAgent || 'unknown',
            });

            // Emit referral.registered event
            this.emit('referral.registered', {
              userId: data.userId,
              referralCode: data.referralCode,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (error) {
          logger.error('Error processing user.registered event', { error });
        }
      }
    })();
  }

  private subscribeToTaskCompleted(): void {
    if (!this.nc) return;

    const sub = this.nc.subscribe('task.completed');
    
    (async () => {
      for await (const msg of sub) {
        try {
          const data = JSON.parse(this.sc.decode(msg.data));
          logger.info('Received task.completed event', data);

          // Calculate referral reward
          if (data.userId && data.reward) {
            await this.referralService.calculateReward({
              refereeId: data.userId,
              amount: data.reward,
              currency: 'USD',
              source: 'task_completion',
              sourceId: data.taskId,
            });

            this.emit('referral.reward.calculated', {
              refereeId: data.userId,
              source: 'task_completion',
              amount: data.reward,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (error) {
          logger.error('Error processing task.completed event', { error });
        }
      }
    })();
  }

  private subscribeToAgentDeployed(): void {
    if (!this.nc) return;

    const sub = this.nc.subscribe('agent.deployed');
    
    (async () => {
      for await (const msg of sub) {
        try {
          const data = JSON.parse(this.sc.decode(msg.data));
          logger.info('Received agent.deployed event', data);

          // Track conversion milestone
          this.emit('referral.converted', {
            userId: data.userId,
            milestone: 'first_agent',
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          logger.error('Error processing agent.deployed event', { error });
        }
      }
    })();
  }

  private subscribeToRewardDistributed(): void {
    if (!this.nc) return;

    const sub = this.nc.subscribe('reward.distributed');
    
    (async () => {
      for await (const msg of sub) {
        try {
          const data = JSON.parse(this.sc.decode(msg.data));
          logger.info('Received reward.distributed event', data);

          // Calculate referral rewards from distributed rewards
          if (data.userId && data.amount) {
            await this.referralService.calculateReward({
              refereeId: data.userId,
              amount: data.amount,
              currency: data.currency || 'USD',
              source: 'reward_distribution',
              sourceId: data.rewardId,
            });
          }
        } catch (error) {
          logger.error('Error processing reward.distributed event', { error });
        }
      }
    })();
  }

  private emit(subject: string, data: any): void {
    if (!this.nc) return;

    try {
      this.nc.publish(subject, this.sc.encode(JSON.stringify(data)));
      logger.debug('Emitted event', { subject, data });
    } catch (error) {
      logger.error('Error emitting event', { subject, error });
    }
  }
}

export default EventListener;
