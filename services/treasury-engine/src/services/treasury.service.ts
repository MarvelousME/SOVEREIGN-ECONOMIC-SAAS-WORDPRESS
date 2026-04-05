import { Pool } from 'pg';
import { VaultRepository } from '../repositories/vault.repository';
import { StrategyRepository } from '../repositories/strategy.repository';
import { TransactionRepository } from '../repositories/transaction.repository';
import { OPAService } from './opa.service';
import { EventService } from './event.service';
import { LedgerService } from './ledger.service';
import {
  Vault,
  Strategy,
  VaultTransaction,
  CreateVaultRequest,
  DepositRequest,
  WithdrawRequest,
  AllocateRequest,
  RebalanceRequest,
  VaultStatus,
  TransactionType,
  PerformanceMetrics,
  CompoundResult,
  RebalanceResult,
} from '../types';

export class TreasuryService {
  private vaultRepo: VaultRepository;
  private strategyRepo: StrategyRepository;
  private transactionRepo: TransactionRepository;
  private opaService: OPAService;
  private eventService: EventService;
  private ledgerService: LedgerService;

  constructor(
    pool: Pool,
    opaService: OPAService,
    eventService: EventService,
    ledgerService: LedgerService
  ) {
    this.vaultRepo = new VaultRepository(pool);
    this.strategyRepo = new StrategyRepository(pool);
    this.transactionRepo = new TransactionRepository(pool);
    this.opaService = opaService;
    this.eventService = eventService;
    this.ledgerService = ledgerService;
  }

  // Vault Management
  async createVault(request: CreateVaultRequest, userId: string): Promise<Vault> {
    // Check permissions
    const permission = await this.opaService.checkTreasuryAdmin(userId);
    if (!permission.result.allow) {
      throw new Error('Insufficient permissions to create vault');
    }

    // Validate strategy exists
    const strategy = await this.strategyRepo.getStrategyById(request.strategy_id);
    if (!strategy) {
      throw new Error('Strategy not found');
    }

    const vault = await this.vaultRepo.createVault(request);
    return vault;
  }

  async getVault(vaultId: string): Promise<Vault> {
    const vault = await this.vaultRepo.getVaultById(vaultId);
    if (!vault) {
      throw new Error('Vault not found');
    }
    return vault;
  }

  async getAllVaults(limit: number = 50, offset: number = 0): Promise<Vault[]> {
    return this.vaultRepo.getAllVaults(limit, offset);
  }

  // Deposit & Withdrawal
  async deposit(request: DepositRequest): Promise<VaultTransaction> {
    const vault = await this.getVault(request.vault_id);
    
    if (vault.status !== VaultStatus.ACTIVE) {
      throw new Error(`Vault is ${vault.status}, deposits not allowed`);
    }

    // Check permissions
    const permission = await this.opaService.checkDepositLimit(
      request.user_id,
      request.vault_id,
      request.amount
    );
    
    if (!permission.result.allow) {
      throw new Error(`Deposit not allowed: ${permission.result.reasons?.join(', ')}`);
    }

    // Record in ledger
    const ledgerTxId = await this.ledgerService.recordDeposit(
      request.vault_id,
      request.user_id,
      request.amount,
      vault.currency
    );

    // Calculate new balances
    const balanceBefore = vault.total_balance;
    const balanceAfter = (parseFloat(balanceBefore) + parseFloat(request.amount)).toString();
    const availableBalance = (parseFloat(vault.available_balance) + parseFloat(request.amount)).toString();

    // Update vault balance
    await this.vaultRepo.updateVaultBalance(
      request.vault_id,
      balanceAfter,
      availableBalance,
      vault.locked_balance
    );

    // Record transaction
    const transaction = await this.transactionRepo.createTransaction({
      vault_id: request.vault_id,
      user_id: request.user_id,
      type: TransactionType.DEPOSIT,
      amount: request.amount,
      currency: vault.currency,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      metadata: {},
      ledger_transaction_id: ledgerTxId,
    });

    // Publish event
    await this.eventService.publishTreasuryDeposit(
      request.vault_id,
      request.user_id,
      request.amount,
      vault.currency
    );

    return transaction;
  }

  async withdraw(request: WithdrawRequest): Promise<VaultTransaction> {
    const vault = await this.getVault(request.vault_id);
    
    if (vault.status !== VaultStatus.ACTIVE) {
      throw new Error(`Vault is ${vault.status}, withdrawals not allowed`);
    }

    // Check if sufficient funds
    if (parseFloat(vault.available_balance) < parseFloat(request.amount)) {
      throw new Error('Insufficient available balance');
    }

    // Check permissions
    const permission = await this.opaService.checkWithdrawalLimit(
      request.user_id,
      request.vault_id,
      request.amount
    );
    
    if (!permission.result.allow) {
      throw new Error(`Withdrawal not allowed: ${permission.result.reasons?.join(', ')}`);
    }

    // Record in ledger
    const ledgerTxId = await this.ledgerService.recordWithdrawal(
      request.vault_id,
      request.user_id,
      request.amount,
      vault.currency
    );

    // Calculate new balances
    const balanceBefore = vault.total_balance;
    const balanceAfter = (parseFloat(balanceBefore) - parseFloat(request.amount)).toString();
    const availableBalance = (parseFloat(vault.available_balance) - parseFloat(request.amount)).toString();

    // Update vault balance
    await this.vaultRepo.updateVaultBalance(
      request.vault_id,
      balanceAfter,
      availableBalance,
      vault.locked_balance
    );

    // Record transaction
    const transaction = await this.transactionRepo.createTransaction({
      vault_id: request.vault_id,
      user_id: request.user_id,
      type: TransactionType.WITHDRAW,
      amount: request.amount,
      currency: vault.currency,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      metadata: {},
      ledger_transaction_id: ledgerTxId,
    });

    // Publish event
    await this.eventService.publishTreasuryWithdraw(
      request.vault_id,
      request.user_id,
      request.amount,
      vault.currency
    );

    return transaction;
  }

  // Strategy Management
  async getAllStrategies(): Promise<Strategy[]> {
    return this.strategyRepo.getAllStrategies(true);
  }

  async getStrategy(strategyId: string): Promise<Strategy> {
    const strategy = await this.strategyRepo.getStrategyById(strategyId);
    if (!strategy) {
      throw new Error('Strategy not found');
    }
    return strategy;
  }

  async allocateToStrategy(request: AllocateRequest, userId: string): Promise<void> {
    // Check permissions
    const permission = await this.opaService.checkTreasuryAdmin(userId);
    if (!permission.result.allow) {
      throw new Error('Insufficient permissions');
    }

    const vault = await this.getVault(request.vault_id);
    const strategy = await this.getStrategy(request.strategy_id);

    // Update vault strategy
    await this.vaultRepo.updateVaultStrategy(request.vault_id, request.strategy_id);
    await this.vaultRepo.updateVaultApy(request.vault_id, strategy.target_apy);
  }

  // Compounding
  async compound(vaultId: string): Promise<CompoundResult> {
    const vault = await this.getVault(vaultId);
    const strategy = await this.getStrategy(vault.strategy_id);

    // Simulate yield calculation (in reality, this would query protocol APYs)
    const dailyRate = strategy.target_apy / 365 / 100;
    const yieldAmount = (parseFloat(vault.total_balance) * dailyRate).toFixed(18);

    // Record yield in ledger
    const ledgerTxId = await this.ledgerService.recordYield(
      vaultId,
      yieldAmount,
      vault.currency
    );

    // Update vault balance
    const balanceBefore = vault.total_balance;
    const balanceAfter = (parseFloat(balanceBefore) + parseFloat(yieldAmount)).toString();
    const availableBalance = (parseFloat(vault.available_balance) + parseFloat(yieldAmount)).toString();

    await this.vaultRepo.updateVaultBalance(
      vaultId,
      balanceAfter,
      availableBalance,
      vault.locked_balance
    );

    await this.vaultRepo.updateLastCompoundAt(vaultId, new Date());

    // Record transaction
    await this.transactionRepo.createTransaction({
      vault_id: vaultId,
      user_id: null,
      type: TransactionType.COMPOUND,
      amount: yieldAmount,
      currency: vault.currency,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      metadata: { strategy_id: strategy.id, apy: strategy.target_apy },
      ledger_transaction_id: ledgerTxId,
    });

    // Publish event
    await this.eventService.publishTreasuryCompounded(vaultId, yieldAmount, balanceAfter);

    // Calculate performance fees (2% of yield)
    const feeAmount = (parseFloat(yieldAmount) * 0.02).toFixed(18);
    if (parseFloat(feeAmount) > 0) {
      await this.ledgerService.recordFee(vaultId, feeAmount, vault.currency, 'performance');
    }

    return {
      vault_id: vaultId,
      compounded_at: new Date(),
      yield_harvested: yieldAmount,
      new_balance: balanceAfter,
      apy_snapshot: strategy.target_apy,
      gas_fees: '0', // Would be calculated from actual transactions
    };
  }

  // Rebalancing
  async rebalance(request: RebalanceRequest, userId: string): Promise<RebalanceResult> {
    // Check permissions
    const permission = await this.opaService.checkRebalancePermission(userId, request.vault_id);
    if (!permission.result.allow) {
      throw new Error('Insufficient permissions to rebalance');
    }

    const vault = await this.getVault(request.vault_id);
    const strategy = await this.getStrategy(vault.strategy_id);

    // Calculate drift (simplified - in reality would check actual protocol allocations)
    const allocationsBefore = strategy.allocations;
    const allocationsAfter = strategy.allocations; // Would recalculate optimal allocations

    // Check if rebalancing is needed
    const maxDrift = this.calculateMaxDrift(allocationsBefore, allocationsAfter);
    if (!request.force && maxDrift < strategy.rebalance_threshold) {
      throw new Error('Rebalance not needed, drift below threshold');
    }

    // Execute rebalance transactions (simplified)
    const transactions: Array<{ protocol: string; action: 'deposit' | 'withdraw'; amount: string }> = [];

    // Record rebalance transaction
    await this.transactionRepo.createTransaction({
      vault_id: request.vault_id,
      user_id: null,
      type: TransactionType.REBALANCE,
      amount: '0',
      currency: vault.currency,
      balance_before: vault.total_balance,
      balance_after: vault.total_balance,
      metadata: {
        strategy_id: strategy.id,
        allocations_before: allocationsBefore,
        allocations_after: allocationsAfter,
      },
      ledger_transaction_id: null,
    });

    const result: RebalanceResult = {
      vault_id: request.vault_id,
      strategy_id: strategy.id,
      rebalanced_at: new Date(),
      allocations_before: allocationsBefore,
      allocations_after: allocationsAfter,
      transactions,
      gas_fees: '0',
    };

    // Publish event
    await this.eventService.publishTreasuryRebalanced(request.vault_id, strategy.id, result);

    return result;
  }

  // Performance Metrics
  async getPerformanceMetrics(vaultId: string, period: string = '30d'): Promise<PerformanceMetrics> {
    const vault = await this.getVault(vaultId);
    
    const totalDeposited = await this.transactionRepo.getTotalDepositedByVault(vaultId);
    const totalWithdrawn = await this.transactionRepo.getTotalWithdrawnByVault(vaultId);
    const totalYield = await this.transactionRepo.getTotalYieldByVault(vaultId);

    // Calculate metrics
    const netYield = parseFloat(totalYield);
    const totalInvested = parseFloat(totalDeposited) - parseFloat(totalWithdrawn);
    const netAPY = totalInvested > 0 ? (netYield / totalInvested) * 100 : 0;

    // Calculate time periods
    const now = new Date();
    const startDate = new Date(now.getTime() - this.parsePeriod(period));

    return {
      vault_id: vaultId,
      period,
      total_deposited: totalDeposited,
      total_withdrawn: totalWithdrawn,
      total_yield: totalYield,
      total_fees: '0', // Would calculate from fee transactions
      net_apy: netAPY,
      sharpe_ratio: 0, // Would calculate from historical returns
      max_drawdown: 0, // Would calculate from balance history
      start_date: startDate,
      end_date: now,
    };
  }

  // Helper methods
  private calculateMaxDrift(before: any[], after: any[]): number {
    let maxDrift = 0;
    for (let i = 0; i < before.length; i++) {
      const drift = Math.abs(before[i].target_percentage - after[i].target_percentage);
      if (drift > maxDrift) {
        maxDrift = drift;
      }
    }
    return maxDrift;
  }

  private parsePeriod(period: string): number {
    const match = period.match(/^(\d+)([hdwmy])$/);
    if (!match) return 30 * 24 * 60 * 60 * 1000; // default 30 days

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'w': return value * 7 * 24 * 60 * 60 * 1000;
      case 'm': return value * 30 * 24 * 60 * 60 * 1000;
      case 'y': return value * 365 * 24 * 60 * 60 * 1000;
      default: return 30 * 24 * 60 * 60 * 1000;
    }
  }
}
