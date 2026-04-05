import { proxyActivities, sleep } from '@temporalio/workflow';
import type * as activities from '../activities';

const { harvestYield, getVaultsWithPendingYield } = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes',
  retry: {
    maximumAttempts: 3,
    initialInterval: '10 seconds',
    backoffCoefficient: 2,
  },
});

export async function YieldHarvestingWorkflow(): Promise<void> {
  const harvestInterval = 6 * 60 * 60 * 1000; // Harvest every 6 hours

  while (true) {
    try {
      console.log('Running yield harvesting workflow...');
      
      // Get vaults with pending yield
      const vaultIds = await getVaultsWithPendingYield();
      
      for (const vaultId of vaultIds) {
        try {
          const harvestedAmount = await harvestYield(vaultId);
          console.log(`Harvested ${harvestedAmount} from vault ${vaultId}`);
        } catch (error) {
          console.error(`Failed to harvest yield from vault ${vaultId}:`, error);
        }
      }
      
      console.log(`Completed yield harvesting. Processed ${vaultIds.length} vaults.`);
    } catch (error) {
      console.error('Error in yield harvesting workflow:', error);
    }
    
    await sleep(harvestInterval);
  }
}
