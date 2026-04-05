import { config } from '../config';

export async function getAllActiveUsers(): Promise<string[]> {
  const response = await fetch(`${config.services.reputationService}/api/users/active`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch active users: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.userIds;
}

export async function calculateReputationScore(userId: string): Promise<number> {
  const response = await fetch(`${config.services.reputationService}/api/calculate/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to calculate reputation: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.score;
}

export async function applyDecay(userId: string): Promise<void> {
  const response = await fetch(`${config.services.reputationService}/api/decay/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to apply decay: ${response.statusText}`);
  }
}

export async function updateReputationTable(userId: string, score: number): Promise<void> {
  const response = await fetch(`${config.services.reputationService}/api/reputation/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ score }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update reputation: ${response.statusText}`);
  }
}

export async function emitReputationUpdatedEvent(userId: string, oldScore: number, newScore: number): Promise<void> {
  const response = await fetch(`${config.services.reputationService}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'reputation.updated',
      data: { userId, oldScore, newScore },
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to emit reputation event: ${response.statusText}`);
  }
}
