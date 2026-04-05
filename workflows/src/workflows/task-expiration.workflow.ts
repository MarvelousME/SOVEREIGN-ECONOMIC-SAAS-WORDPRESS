import { proxyActivities, sleep, ApplicationFailure } from '@temporalio/workflow';
import type * as activities from '../activities/task.activities';
import { DEFAULT_RETRY_POLICY } from '../types';

const {
  getTask,
  markTaskExpired,
  returnRewardToCreator,
  emitTaskExpirationEvent,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '2m',
  retry: DEFAULT_RETRY_POLICY,
});

export interface TaskExpirationInput {
  taskId: string;
  expiresAt: Date;
}

export async function taskExpirationWorkflow(input: TaskExpirationInput): Promise<{ expired: boolean }> {
  // Step 1: Wait until expiration time
  const now = Date.now();
  const expirationTime = new Date(input.expiresAt).getTime();
  const waitDuration = expirationTime - now;

  if (waitDuration > 0) {
    await sleep(waitDuration);
  }

  // Step 2: Check task status
  const task = await getTask(input.taskId);

  // Step 3: If unclaimed/incomplete, mark as expired
  if (task.status === 'open' || task.status === 'claimed') {
    await markTaskExpired(input.taskId);

    // Step 4: Return reward to creator
    await returnRewardToCreator(input.taskId, task.creatorId, task.reward);

    // Step 5: Emit expiration event
    await emitTaskExpirationEvent(input.taskId);

    return { expired: true };
  }

  return { expired: false };
}
