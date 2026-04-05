import { config } from '../config';
import { ReferralChain } from '../types';

export async function validateReferralChain(refereeId: string): Promise<ReferralChain[]> {
  const response = await fetch(`${config.services.ledgerService}/api/referrals/chain/${refereeId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to validate referral chain: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.chain;
}

export async function calculateMultiTierRewards(
  conversionValue: number,
  chain: ReferralChain[]
): Promise<Map<string, number>> {
  const response = await fetch(`${config.services.ledgerService}/api/referrals/calculate-rewards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversionValue,
      chain,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to calculate rewards: ${response.statusText}`);
  }
  
  const data = await response.json();
  return new Map(Object.entries(data.rewards));
}

export async function createRewardRecord(
  referrerId: string,
  refereeId: string,
  amount: number,
  tier: number
): Promise<void> {
  const response = await fetch(`${config.services.ledgerService}/api/referrals/rewards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      referrerId,
      refereeId,
      amount,
      tier,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create reward record: ${response.statusText}`);
  }
}

export async function sendReferralNotification(
  referrerId: string,
  amount: number,
  refereeName: string
): Promise<void> {
  const response = await fetch(`${config.services.notificationService}/api/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: referrerId,
      type: 'referral_reward',
      data: { amount, refereeName },
      channels: ['email', 'push'],
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to send referral notification: ${response.statusText}`);
  }
}
