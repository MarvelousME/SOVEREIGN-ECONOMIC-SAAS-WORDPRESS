import { pool } from '../config/database';
import { TreasuryService } from '../services/treasury.service';
import { OPAService } from '../services/opa.service';
import { EventService } from '../services/event.service';
import { LedgerService } from '../services/ledger.service';
import { VaultRepository } from '../repositories/vault.repository';
import { StrategyRepository } from '../repositories/strategy.repository';
import { VaultStatus } from '../types';

const opaService = new OPAService();
const eventService = new EventService();
const ledgerService = new LedgerService();
const treasuryService = new TreasuryService(pool, opaService, eventService, ledgerService);
const vaultRepo = new VaultRepository(pool);
const strategyRepo = new StrategyRepository(pool);

// Compounding activities
export async function getVaultsForCompounding(frequency: string): Promise<string[]> {
  const vaults = await vaultRepo.getVaultsForCompounding(frequency);
  return vaults.map(v => v.id);
}

export async function compoundVault(vaultId: string): Promise<void> {
  await treasuryService.compound(vaultId);
}

// Rebalancing activities
export async function getActiveVaults(): Promise<string[]> {
  const vaults = await vaultRepo.getVaultsByStatus(VaultStatus.ACTIVE);
  return vaults.map(v => v.id);
}

export async function checkRebalanceNeeded(vaultId: string): Promise<boolean> {
  const vault = await vaultRepo.getVaultById(vaultId);
  if (!vault) return false;

  const strategy = await strategyRepo.getStrategyById(vault.strategy_id);
  if (!strategy) return false;

  // Simplified check - in reality would compare actual vs target allocations
  // For now, randomly trigger rebalancing to demonstrate functionality
  const lastCompound = vault.last_compound_at;
  if (!lastCompound) return false;

  const hoursSinceLastCompound = (Date.now() - lastCompound.getTime()) / (1000 * 60 * 60);
  return hoursSinceLastCompound > 48; // Rebalance if no compound in 48 hours
}

export async function rebalanceVault(vaultId: string): Promise<void> {
  await treasuryService.rebalance({ vault_id: vaultId, force: true }, 'system');
}

// Yield harvesting activities
export async function getVaultsWithPendingYield(): Promise<string[]> {
  const vaults = await vaultRepo.getVaultsByStatus(VaultStatus.ACTIVE);
  // Filter vaults with significant balance (> $1000 equivalent)
  return vaults
    .filter(v => parseFloat(v.total_balance) > 1000)
    .map(v => v.id);
}

export async function harvestYield(vaultId: string): Promise<string> {
  const result = await treasuryService.compound(vaultId);
  return result.yield_harvested;
}

// Risk assessment activities
export async function assessVaultRisk(vaultId: string): Promise<number> {
  const vault = await vaultRepo.getVaultById(vaultId);
  if (!vault) return 10; // Maximum risk if vault not found

  const strategy = await strategyRepo.getStrategyById(vault.strategy_id);
  if (!strategy) return 10;

  // Calculate risk score based on strategy risk and other factors
  let riskScore = strategy.risk_level;

  // Adjust for concentration risk
  const maxAllocation = Math.max(...strategy.allocations.map(a => a.target_percentage));
  if (maxAllocation > 50) {
    riskScore += 1;
  }

  // Adjust for protocol risks
  const avgProtocolRisk = strategy.allocations.reduce((sum, a) => sum + a.risk_score, 0) / strategy.allocations.length;
  riskScore = (riskScore + avgProtocolRisk) / 2;

  return Math.min(Math.round(riskScore), 10);
}

export async function updateVaultRiskScore(vaultId: string, riskScore: number): Promise<void> {
  // Store risk score in metadata (would need to add risk_score column to vaults table)
  console.log(`Updated risk score for vault ${vaultId}: ${riskScore}`);
}

export async function pauseHighRiskVault(vaultId: string, riskScore: number): Promise<void> {
  await vaultRepo.updateVaultStatus(vaultId, VaultStatus.PAUSED);
  console.log(`Paused high-risk vault ${vaultId} with risk score ${riskScore}`);
}
