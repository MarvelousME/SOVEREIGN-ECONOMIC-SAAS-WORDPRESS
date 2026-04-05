import { proxyActivities, sleep } from '@temporalio/workflow';
import type * as activities from '../activities';

const { checkRebalanceNeeded, rebalanceVault, getActiveVaults } = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes',
  retry: {
    maximumAttempts: 3,
    initialInterval: '10 seconds',
    backoffCoefficient: 2,
  },
});

export async function AutoRebalancingWorkflow(): Promise<void> {
  const checkInterval = 4 * 60 * 60 * 1000; // Check every 4 hours

  while (true) {
    try {
      console.log('Running rebalancing check workflow...');
      
      // Get all active vaults
      const vaultIds = await getActiveVaults();
      
      for (const vaultId of vaultIds) {
        try {
          // Check if rebalancing is needed
          const needsRebalance = await checkRebalanceNeeded(vaultId);
          
          if (needsRebalance) {
            console.log(`Vault ${vaultId} needs rebalancing`);
            await rebalanceVault(vaultId);
            console.log(`Successfully rebalanced vault ${vaultId}`);
          }
        } catch (error) {
          console.error(`Failed to rebalance vault ${vaultId}:`, error);
        }
      }
      
      console.log(`Completed rebalancing check. Checked ${vaultIds.length} vaults.`);
    } catch (error) {
      console.error('Error in rebalancing workflow:', error);
    }
    
    // Sleep until next check
    await sleep(checkInterval);
  }
}
