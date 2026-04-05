import { Context } from '@temporalio/activity';
import { config } from '../config';
import { PayoutRequest } from '../types';

export async function validatePayoutRequest(request: PayoutRequest): Promise<boolean> {
  const response = await fetch(`${config.services.ledgerService}/api/payouts/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to validate payout: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.valid;
}

export async function checkDailyLimit(userId: string, amount: number): Promise<boolean> {
  const response = await fetch(`${config.opa.url}/v1/data/payouts/daily_limit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { userId, amount },
    }),
  });
  
  if (!response.ok) {
    throw new Error(`OPA daily limit check failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.result === true;
}

export async function lockFunds(userId: string, amount: number): Promise<string> {
  const response = await fetch(`${config.services.ledgerService}/api/balances/${userId}/lock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to lock funds: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.lockId;
}

export async function unlockFunds(lockId: string): Promise<void> {
  const response = await fetch(`${config.services.ledgerService}/api/balances/unlock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lockId }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to unlock funds: ${response.statusText}`);
  }
}

export async function processPayment(request: PayoutRequest): Promise<{ success: boolean; txId: string }> {
  const response = await fetch(`${config.services.ledgerService}/api/payouts/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Payment processing failed: ${error.message}`);
  }
  
  return response.json();
}

export async function sendPayoutConfirmation(userId: string, payoutId: string, amount: number): Promise<void> {
  const response = await fetch(`${config.services.notificationService}/api/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      type: 'payout_confirmation',
      data: { payoutId, amount },
      channels: ['email'],
    }),
  });
  
  if (!response.ok) {
    Context.current().log.warn(`Failed to send payout confirmation to user ${userId}`);
  }
}

export async function holdForManualReview(request: PayoutRequest, reason: string): Promise<void> {
  const response = await fetch(`${config.services.ledgerService}/api/payouts/hold`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...request, reason }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to hold payout for review: ${response.statusText}`);
  }
}
