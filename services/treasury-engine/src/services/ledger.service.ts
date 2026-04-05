import axios from 'axios';
import { config } from '../config';

export interface LedgerTransactionRequest {
  description: string;
  entries: Array<{
    account_id: string;
    debit?: string;
    credit?: string;
    currency: string;
  }>;
  metadata?: Record<string, unknown>;
}

export interface LedgerTransactionResponse {
  id: string;
  status: string;
  entries: any[];
  created_at: string;
}

export class LedgerService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.ledgerService.url;
  }

  async createTransaction(request: LedgerTransactionRequest): Promise<LedgerTransactionResponse> {
    try {
      const response = await axios.post<LedgerTransactionResponse>(
        `${this.baseUrl}/api/v1/transactions`,
        request,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      return response.data;
    } catch (error) {
      console.error('Failed to create ledger transaction:', error);
      throw new Error('Ledger transaction failed');
    }
  }

  async recordDeposit(vaultId: string, userId: string, amount: string, currency: string): Promise<string> {
    const transaction = await this.createTransaction({
      description: `Treasury deposit to vault ${vaultId}`,
      entries: [
        {
          account_id: `user:${userId}`,
          credit: amount,
          currency,
        },
        {
          account_id: `vault:${vaultId}`,
          debit: amount,
          currency,
        },
      ],
      metadata: {
        type: 'treasury_deposit',
        vault_id: vaultId,
        user_id: userId,
      },
    });

    return transaction.id;
  }

  async recordWithdrawal(vaultId: string, userId: string, amount: string, currency: string): Promise<string> {
    const transaction = await this.createTransaction({
      description: `Treasury withdrawal from vault ${vaultId}`,
      entries: [
        {
          account_id: `vault:${vaultId}`,
          credit: amount,
          currency,
        },
        {
          account_id: `user:${userId}`,
          debit: amount,
          currency,
        },
      ],
      metadata: {
        type: 'treasury_withdrawal',
        vault_id: vaultId,
        user_id: userId,
      },
    });

    return transaction.id;
  }

  async recordYield(vaultId: string, amount: string, currency: string): Promise<string> {
    const transaction = await this.createTransaction({
      description: `Yield earned by vault ${vaultId}`,
      entries: [
        {
          account_id: 'protocol:yield_source',
          credit: amount,
          currency,
        },
        {
          account_id: `vault:${vaultId}`,
          debit: amount,
          currency,
        },
      ],
      metadata: {
        type: 'treasury_yield',
        vault_id: vaultId,
      },
    });

    return transaction.id;
  }

  async recordFee(vaultId: string, amount: string, currency: string, feeType: string): Promise<string> {
    const transaction = await this.createTransaction({
      description: `Fee charged to vault ${vaultId}: ${feeType}`,
      entries: [
        {
          account_id: `vault:${vaultId}`,
          credit: amount,
          currency,
        },
        {
          account_id: 'treasury:fees',
          debit: amount,
          currency,
        },
      ],
      metadata: {
        type: 'treasury_fee',
        vault_id: vaultId,
        fee_type: feeType,
      },
    });

    return transaction.id;
  }

  async recordUBIDistribution(vaultId: string, amount: string, currency: string): Promise<string> {
    const transaction = await this.createTransaction({
      description: `UBI distribution from vault ${vaultId}`,
      entries: [
        {
          account_id: `vault:${vaultId}`,
          credit: amount,
          currency,
        },
        {
          account_id: 'ubi:pool',
          debit: amount,
          currency,
        },
      ],
      metadata: {
        type: 'ubi_distribution',
        vault_id: vaultId,
      },
    });

    return transaction.id;
  }
}
