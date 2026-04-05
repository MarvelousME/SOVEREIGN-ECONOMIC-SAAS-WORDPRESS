import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../activities/reputation.activities';
import { DEFAULT_RETRY_POLICY } from '../types';

const {
  getAllActiveUsers,
  calculateReputationScore,
  applyDecay,
  updateReputationTable,
  emitReputationUpdatedEvent,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '10m',
  retry: DEFAULT_RETRY_POLICY,
});

export async function reputationRecalcWorkflow(): Promise<{ usersProcessed: number }> {
  // Step 1: Get all active users
  const userIds = await getAllActiveUsers();

  // Step 2-4: Calculate, apply decay, and update reputation for each user
  for (const userId of userIds) {
    const oldScore = 0; // Would fetch from current reputation
    
    // Calculate new reputation score
    const newScore = await calculateReputationScore(userId);
    
    // Apply decay for inactive users
    await applyDecay(userId);
    
    // Update reputation table
    await updateReputationTable(userId, newScore);
    
    // Emit reputation.updated event
    await emitReputationUpdatedEvent(userId, oldScore, newScore);
  }

  return { usersProcessed: userIds.length };
}
