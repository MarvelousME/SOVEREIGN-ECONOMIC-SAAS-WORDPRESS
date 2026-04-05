import { config } from '../config';
import { Task } from '../types';

export async function getTask(taskId: string): Promise<Task> {
  const response = await fetch(`${config.services.taskMarketplace}/api/tasks/${taskId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch task: ${response.statusText}`);
  }
  
  return response.json();
}

export async function markTaskExpired(taskId: string): Promise<void> {
  const response = await fetch(`${config.services.taskMarketplace}/api/tasks/${taskId}/expire`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to mark task as expired: ${response.statusText}`);
  }
}

export async function returnRewardToCreator(taskId: string, creatorId: string, reward: number): Promise<void> {
  const response = await fetch(`${config.services.ledgerService}/api/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: creatorId,
      amount: reward,
      type: 'task_reward_return',
      currency: 'UBI',
      metadata: { taskId },
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to return reward to creator: ${response.statusText}`);
  }
}

export async function emitTaskExpirationEvent(taskId: string): Promise<void> {
  const response = await fetch(`${config.services.taskMarketplace}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'task.expired',
      data: { taskId },
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to emit expiration event: ${response.statusText}`);
  }
}
