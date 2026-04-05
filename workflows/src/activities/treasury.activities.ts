import { Context } from '@temporalio/activity';
import { config } from '../config';
import { RebalancingConfig, AllocationTarget } from '../types';

export async function checkOPAPermission(
  action: string,
  resource: string,
  context: Record<string, any>
): Promise<boolean> {
  const response = await fetch(`${config.opa.url}/v1/data/treasury/allow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { action, resource, context },
    }),
  });
  
  if (!response.ok) {
    throw new Error(`OPA policy check failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.result === true;
}

export async function calculateTargetAllocations(): Promise<AllocationTarget[]> {
  const response = await fetch(`${config.services.treasuryEngine}/api/allocations/calculate`);
  
  if (!response.ok) {
    throw new Error(`Failed to calculate allocations: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.targets;
}

export async function executeRebalancingTrade(
  fromStrategy: string,
  toStrategy: string,
  amount: number,
  maxSlippage: number,
  dryRun: boolean = false
): Promise<{ executed: boolean; actualAmount: number; slippage: number }> {
  const response = await fetch(`${config.services.treasuryEngine}/api/rebalance/trade`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fromStrategy,
      toStrategy,
      amount,
      maxSlippage,
      dryRun,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to execute rebalancing trade: ${response.statusText}`);
  }
  
  return response.json();
}

export async function updateVaultBalance(
  vaultId: string,
  amount: number,
  operation: 'add' | 'subtract'
): Promise<void> {
  const response = await fetch(`${config.services.treasuryEngine}/api/vaults/${vaultId}/balance`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, operation }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update vault balance: ${response.statusText}`);
  }
}

export async function recordPerformance(
  strategyId: string,
  metrics: Record<string, number>
): Promise<void> {
  const response = await fetch(`${config.services.treasuryEngine}/api/performance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      strategyId,
      metrics,
      timestamp: new Date().toISOString(),
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to record performance: ${response.statusText}`);
  }
}

export async function harvestYield(strategyId: string): Promise<number> {
  const response = await fetch(`${config.services.treasuryEngine}/api/yield/harvest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ strategyId }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to harvest yield: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.amount;
}

export async function reallocateToStrategy(
  strategyId: string,
  amount: number
): Promise<void> {
  const response = await fetch(`${config.services.treasuryEngine}/api/strategies/${strategyId}/allocate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to reallocate to strategy: ${response.statusText}`);
  }
}

export async function distributeToUBIPool(amount: number): Promise<void> {
  const response = await fetch(`${config.services.treasuryEngine}/api/ubi-pool/deposit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to distribute to UBI pool: ${response.statusText}`);
  }
}

export async function emitTreasuryEvent(
  eventType: string,
  data: Record<string, any>
): Promise<void> {
  const response = await fetch(`${config.services.treasuryEngine}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
    }),
  });
  
  if (!response.ok) {
    Context.current().log.warn(`Failed to emit treasury event: ${eventType}`);
  }
}
