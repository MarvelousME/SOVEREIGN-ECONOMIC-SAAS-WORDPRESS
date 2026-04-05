import axios from 'axios';
import { config } from '../config';
import { OPARequest, OPAResponse } from '../types';

export class OPAService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.opa.url;
  }

  async checkPermission(request: OPARequest): Promise<OPAResponse> {
    try {
      const response = await axios.post<OPAResponse>(
        `${this.baseUrl}/v1/data/treasury/allow`,
        request,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000,
        }
      );

      return response.data;
    } catch (error) {
      console.error('OPA permission check failed:', error);
      // Fail closed - deny by default
      return {
        result: {
          allow: false,
          reasons: ['OPA service unavailable'],
        },
      };
    }
  }

  async checkWithdrawalLimit(userId: string, vaultId: string, amount: string): Promise<OPAResponse> {
    return this.checkPermission({
      input: {
        action: 'withdraw',
        user_id: userId,
        vault_id: vaultId,
        amount,
      },
    });
  }

  async checkTreasuryAdmin(userId: string): Promise<OPAResponse> {
    return this.checkPermission({
      input: {
        action: 'admin',
        user_id: userId,
        resource: 'treasury',
      },
    });
  }

  async checkDepositLimit(userId: string, vaultId: string, amount: string): Promise<OPAResponse> {
    return this.checkPermission({
      input: {
        action: 'deposit',
        user_id: userId,
        vault_id: vaultId,
        amount,
      },
    });
  }

  async checkRebalancePermission(userId: string, vaultId: string): Promise<OPAResponse> {
    return this.checkPermission({
      input: {
        action: 'rebalance',
        user_id: userId,
        vault_id: vaultId,
      },
    });
  }
}
