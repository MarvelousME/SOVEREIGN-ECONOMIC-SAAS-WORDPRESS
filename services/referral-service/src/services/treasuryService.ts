import { connect, NatsConnection, StringCodec } from 'nats';
import { config } from '../config';
import logger from '../utils/logger';
import { PayoutMethod } from '../types';

export interface TreasuryPayoutRequest {
  payoutId: string;
  userId: string;
  amount: number;
  currency: string;
  method: PayoutMethod;
  destination: {
    type: string;
    address?: string;
    bankAccountId?: string;
    routingNumber?: string;
    accountNumber?: string;
  };
  metadata?: Record<string, any>;
}

export interface TreasuryPayoutResult {
  success: boolean;
  treasuryTransactionId?: string;
  error?: string;
  errorCode?: string;
}

export class TreasuryService {
  private nc: NatsConnection | null = null;
  private sc = StringCodec();
  private isConnected: boolean = false;

  async connect(): Promise<void> {
    if (this.isConnected && this.nc) return;

    try {
      this.nc = await connect({ servers: config.nats.url });
      this.isConnected = true;
      logger.info('TreasuryService connected to NATS');
    } catch (error) {
      logger.error('Failed to connect TreasuryService to NATS', { error });
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.nc) {
      await this.nc.drain();
      this.isConnected = false;
      logger.info('TreasuryService disconnected from NATS');
    }
  }

  async processPayout(request: TreasuryPayoutRequest): Promise<TreasuryPayoutResult> {
    if (!this.nc) {
      await this.connect();
    }

    if (!this.nc) {
      return {
        success: false,
        error: 'Failed to connect to treasury service',
        errorCode: 'CONNECTION_FAILED',
      };
    }

    const subject = this.getPayoutSubject(request.method);

    try {
      const reply = await this.nc.request(
        subject,
        this.sc.encode(JSON.stringify(request)),
        { timeout: 30000 }
      );

      const response = JSON.parse(this.sc.decode(reply.data));

      if (response.success) {
        logger.info('Treasury payout processed successfully', {
          payoutId: request.payoutId,
          treasuryTransactionId: response.treasuryTransactionId,
        });
      } else {
        logger.warn('Treasury payout failed', {
          payoutId: request.payoutId,
          error: response.error,
          errorCode: response.errorCode,
        });
      }

      return response;
    } catch (error: any) {
      logger.error('Error processing treasury payout', {
        payoutId: request.payoutId,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
        errorCode: 'PROCESSING_ERROR',
      };
    }
  }

  async getPayoutStatus(treasuryTransactionId: string): Promise<any> {
    if (!this.nc) {
      await this.connect();
    }

    if (!this.nc) {
      throw new Error('Failed to connect to treasury service');
    }

    const subject = 'treasury.payout.status';

    try {
      const reply = await this.nc.request(
        subject,
        this.sc.encode(JSON.stringify({ treasuryTransactionId })),
        { timeout: 10000 }
      );

      return JSON.parse(this.sc.decode(reply.data));
    } catch (error) {
      logger.error('Error getting treasury payout status', { treasuryTransactionId, error });
      throw error;
    }
  }

  async validateDestination(
    method: PayoutMethod,
    destination: TreasuryPayoutRequest['destination']
  ): Promise<{ valid: boolean; error?: string }> {
    if (!this.nc) {
      await this.connect();
    }

    if (!this.nc) {
      return { valid: false, error: 'Failed to connect to treasury service' };
    }

    const subject = 'treasury.destination.validate';

    try {
      const reply = await this.nc.request(
        subject,
        this.sc.encode(JSON.stringify({ method, destination })),
        { timeout: 10000 }
      );

      return JSON.parse(this.sc.decode(reply.data));
    } catch (error: any) {
      logger.error('Error validating treasury destination', { method, error: error.message });
      return { valid: false, error: error.message };
    }
  }

  private getPayoutSubject(method: PayoutMethod): string {
    switch (method) {
      case PayoutMethod.BANK_TRANSFER:
        return 'treasury.payout.bank_transfer';
      case PayoutMethod.CRYPTO:
        return 'treasury.payout.crypto';
      case PayoutMethod.PLATFORM_CREDIT:
        return 'treasury.payout.platform_credit';
      default:
        return 'treasury.payout';
    }
  }
}

export default TreasuryService;
