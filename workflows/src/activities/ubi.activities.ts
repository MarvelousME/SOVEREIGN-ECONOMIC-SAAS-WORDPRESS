import { Context } from '@temporalio/activity';
import { config } from '../config';
import { User, LedgerTransaction } from '../types';

export async function calculateEligibleUsers(): Promise<User[]> {
  const response = await fetch(`${config.services.ubiEngine}/api/users/eligible`);
  if (!response.ok) {
    throw new Error(`Failed to fetch eligible users: ${response.statusText}`);
  }
  return response.json();
}

export async function calculateDistributionAmounts(users: User[]): Promise<Map<string, number>> {
  const response = await fetch(`${config.services.ubiEngine}/api/distribution/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userIds: users.map(u => u.id) }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to calculate distribution: ${response.statusText}`);
  }
  
  const data = await response.json();
  return new Map(Object.entries(data.amounts));
}

export async function lockUBIPool(amount: number): Promise<string> {
  const response = await fetch(`${config.services.ubiEngine}/api/pool/lock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to lock UBI pool: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.lockId;
}

export async function unlockUBIPool(lockId: string): Promise<void> {
  const response = await fetch(`${config.services.ubiEngine}/api/pool/unlock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lockId }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to unlock UBI pool: ${response.statusText}`);
  }
}

export async function createLedgerTransaction(
  userId: string,
  amount: number,
  type: string,
  metadata: Record<string, any>
): Promise<LedgerTransaction> {
  const response = await fetch(`${config.services.ledgerService}/api/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      amount,
      type,
      currency: 'UBI',
      metadata,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create ledger transaction: ${response.statusText}`);
  }
  
  return response.json();
}

export async function updateUserBalance(userId: string, amount: number): Promise<void> {
  const response = await fetch(`${config.services.ledgerService}/api/balances/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, operation: 'add' }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update user balance: ${response.statusText}`);
  }
}

export async function emitDistributionEvent(
  userId: string,
  amount: number,
  distributionId: string
): Promise<void> {
  const response = await fetch(`${config.services.ubiEngine}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'ubi.distributed',
      data: { userId, amount, distributionId },
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to emit distribution event: ${response.statusText}`);
  }
}

export async function sendDistributionNotification(
  userId: string,
  amount: number
): Promise<void> {
  const response = await fetch(`${config.services.notificationService}/api/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      type: 'ubi_distribution',
      data: { amount },
      channels: ['email', 'push'],
    }),
  });
  
  if (!response.ok) {
    Context.current().log.warn(`Failed to send notification to user ${userId}`);
  }
}
