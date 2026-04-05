import { proxyActivities, sleep, ApplicationFailure } from '@temporalio/workflow';
import type * as activities from '../activities/governance.activities';
import { DEFAULT_RETRY_POLICY } from '../types';

const {
  getProposal,
  verifyQuorum,
  executeProposalAction,
  updateSystemConfig,
  emitExecutionEvent,
  requestHumanApproval,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '5m',
  retry: DEFAULT_RETRY_POLICY,
});

export interface GovernanceExecutionInput {
  proposalId: string;
  timeLockDuration: number; // milliseconds
  requiresHumanApproval: boolean;
}

export async function governanceExecutionWorkflow(input: GovernanceExecutionInput): Promise<{
  success: boolean;
  executed: boolean;
}> {
  // Step 1: Wait for time-lock period
  if (input.timeLockDuration > 0) {
    await sleep(input.timeLockDuration);
  }

  // Step 2: Verify quorum still valid
  const proposal = await getProposal(input.proposalId);
  const quorumValid = await verifyQuorum(input.proposalId);

  if (!quorumValid) {
    await emitExecutionEvent(input.proposalId, false);
    throw ApplicationFailure.create({
      message: 'Quorum no longer valid',
      nonRetryable: true,
    });
  }

  // Step 3: Human approval step for critical actions
  if (input.requiresHumanApproval) {
    const approved = await requestHumanApproval(
      input.proposalId,
      'Critical governance action requires manual approval'
    );

    if (!approved) {
      await emitExecutionEvent(input.proposalId, false);
      return { success: false, executed: false };
    }
  }

  // Step 4: Execute proposal action
  await executeProposalAction(proposal.action);

  // Step 5: Update system config
  if (proposal.action.type === 'config_update') {
    await updateSystemConfig(proposal.action.config);
  }

  // Step 6: Emit execution event
  await emitExecutionEvent(input.proposalId, true);

  return { success: true, executed: true };
}
