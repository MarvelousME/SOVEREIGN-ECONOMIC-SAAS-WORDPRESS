/**
 * Example usage of Temporal workflows for UBI CMS
 */

import { getTemporalClient } from '../src/client';

async function main() {
  const client = await getTemporalClient();

  // Example 1: Start daily UBI distribution
  console.log('Starting UBI distribution...');
  const ubiHandle = await client.startUBIDistribution({
    distributionId: `dist-${new Date().toISOString().split('T')[0]}`,
    dryRun: false,
  });
  console.log(`UBI distribution started: ${ubiHandle.workflowId}`);

  // Query progress
  const progress = await client.queryWorkflowProgress(ubiHandle.workflowId);
  console.log('Distribution progress:', progress);

  // Wait for result
  const ubiResult = await ubiHandle.result();
  console.log('UBI distribution complete:', ubiResult);

  // Example 2: Start treasury rebalancing
  console.log('\nStarting treasury rebalance...');
  const rebalanceHandle = await client.startTreasuryRebalance({
    triggeredBy: 'manual',
    dryRun: true, // Test first
  });

  const rebalanceResult = await rebalanceHandle.result();
  console.log('Rebalance complete:', rebalanceResult);

  // Example 3: Process a payout
  console.log('\nProcessing payout...');
  const payoutHandle = await client.startPayout({
    id: 'payout-123',
    userId: 'user-456',
    amount: 100,
    currency: 'USD',
    paymentRail: 'bank',
    destination: 'account-789',
  });

  const payoutResult = await payoutHandle.result();
  console.log('Payout complete:', payoutResult);

  // Example 4: Schedule task expiration
  console.log('\nScheduling task expiration...');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  const taskHandle = await client.startTaskExpiration({
    taskId: 'task-999',
    expiresAt,
  });
  console.log(`Task expiration scheduled: ${taskHandle.workflowId}`);

  // Example 5: Execute an agent
  console.log('\nExecuting agent...');
  const agentHandle = await client.startAgentExecution({
    id: 'exec-111',
    agentId: 'agent-222',
    userId: 'user-456',
    input: { query: 'What is the weather today?' },
    timeout: 60000, // 1 minute
    maxCost: 10,
  });

  const agentResult = await agentHandle.result();
  console.log('Agent execution complete:', agentResult);

  // Example 6: Trigger reputation recalculation
  console.log('\nRecalculating reputation...');
  const repHandle = await client.startReputationRecalc();
  const repResult = await repHandle.result();
  console.log('Reputation recalc complete:', repResult);

  // Example 7: Execute governance proposal
  console.log('\nExecuting governance proposal...');
  const govHandle = await client.startGovernanceExecution({
    proposalId: 'prop-555',
    timeLockDuration: 60000, // 1 minute for testing
    requiresHumanApproval: false,
  });
  const govResult = await govHandle.result();
  console.log('Governance execution complete:', govResult);

  // Example 8: Process referral conversion
  console.log('\nProcessing referral conversion...');
  const refHandle = await client.startReferralConversion({
    refereeId: 'user-888',
    conversionValue: 50,
    conversionType: 'signup',
  });
  const refResult = await refHandle.result();
  console.log('Referral conversion complete:', refResult);

  // Example 9: Compound treasury yields
  console.log('\nCompounding treasury yields...');
  const compoundHandle = await client.startTreasuryCompound({
    strategies: ['strategy-aave', 'strategy-compound'],
    minThreshold: 100,
    ubiPoolPercentage: 10,
  });
  const compoundResult = await compoundHandle.result();
  console.log('Treasury compound complete:', compoundResult);

  // Example 10: Workflow control - pause/resume
  console.log('\nTesting workflow control...');
  const controlHandle = await client.startUBIDistribution({
    distributionId: 'dist-control-test',
    dryRun: true,
  });

  // Pause workflow
  await new Promise(resolve => setTimeout(resolve, 1000));
  await client.pauseWorkflow(controlHandle.workflowId);
  console.log('Workflow paused');

  // Check status
  const status = await client.queryWorkflowStatus(controlHandle.workflowId);
  console.log('Status:', status);

  // Resume workflow
  await client.resumeWorkflow(controlHandle.workflowId);
  console.log('Workflow resumed');

  // Wait for completion
  const controlResult = await controlHandle.result();
  console.log('Control test complete:', controlResult);

  console.log('\n✅ All examples completed successfully!');
}

main().catch(console.error);
