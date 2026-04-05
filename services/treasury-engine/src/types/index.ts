export enum VaultStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CLOSED = 'closed',
  EMERGENCY_PAUSE = 'emergency_pause',
}

export enum StrategyType {
  CONSERVATIVE = 'conservative',
  BALANCED = 'balanced',
  AGGRESSIVE = 'aggressive',
  CUSTOM = 'custom',
}

export enum CompoundingFrequency {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
  COMPOUND = 'compound',
  REBALANCE = 'rebalance',
  YIELD_HARVEST = 'yield_harvest',
  FEE = 'fee',
}

export interface Vault {
  id: string;
  name: string;
  description: string;
  currency: string;
  status: VaultStatus;
  total_balance: string;
  available_balance: string;
  locked_balance: string;
  apy: number;
  strategy_id: string;
  compounding_frequency: CompoundingFrequency;
  last_compound_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Strategy {
  id: string;
  name: string;
  type: StrategyType;
  description: string;
  risk_level: number; // 1-10
  target_apy: number;
  min_allocation: number; // percentage
  max_allocation: number; // percentage
  allocations: StrategyAllocation[];
  rebalance_threshold: number; // drift percentage
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface StrategyAllocation {
  protocol: string;
  target_percentage: number;
  current_percentage?: number;
  apy: number;
  risk_score: number;
}

export interface VaultTransaction {
  id: string;
  vault_id: string;
  user_id: string | null;
  type: TransactionType;
  amount: string;
  currency: string;
  balance_before: string;
  balance_after: string;
  metadata: Record<string, unknown>;
  ledger_transaction_id: string | null;
  created_at: Date;
}

export interface PerformanceMetrics {
  vault_id: string;
  period: string; // e.g., '24h', '7d', '30d', 'all'
  total_deposited: string;
  total_withdrawn: string;
  total_yield: string;
  total_fees: string;
  net_apy: number;
  sharpe_ratio: number;
  max_drawdown: number;
  start_date: Date;
  end_date: Date;
}

export interface WithdrawalQueue {
  id: string;
  vault_id: string;
  user_id: string;
  amount: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  priority: number;
  requested_at: Date;
  processed_at: Date | null;
}

export interface RebalanceResult {
  vault_id: string;
  strategy_id: string;
  rebalanced_at: Date;
  allocations_before: StrategyAllocation[];
  allocations_after: StrategyAllocation[];
  transactions: Array<{
    protocol: string;
    action: 'deposit' | 'withdraw';
    amount: string;
  }>;
  gas_fees: string;
}

export interface CompoundResult {
  vault_id: string;
  compounded_at: Date;
  yield_harvested: string;
  new_balance: string;
  apy_snapshot: number;
  gas_fees: string;
}

export interface YieldSource {
  protocol: string;
  apy: number;
  tvl: string;
  risk_score: number;
  liquidity_score: number;
  updated_at: Date;
}

export interface OPARequest {
  input: {
    action: string;
    user_id: string;
    vault_id?: string;
    amount?: string;
    resource?: string;
  };
}

export interface OPAResponse {
  result: {
    allow: boolean;
    reasons?: string[];
    limits?: {
      daily_withdrawal_remaining?: string;
      max_allocation?: number;
    };
  };
}

export interface CreateVaultRequest {
  name: string;
  description: string;
  currency: string;
  strategy_id: string;
  compounding_frequency: CompoundingFrequency;
}

export interface DepositRequest {
  vault_id: string;
  user_id: string;
  amount: string;
}

export interface WithdrawRequest {
  vault_id: string;
  user_id: string;
  amount: string;
}

export interface AllocateRequest {
  vault_id: string;
  strategy_id: string;
}

export interface RebalanceRequest {
  vault_id: string;
  force?: boolean;
}
