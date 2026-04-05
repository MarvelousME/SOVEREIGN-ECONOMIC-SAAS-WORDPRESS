import { proxyActivities, sleep } from '@temporalio/workflow';
import type * as activities from '../activities';

const { compoundVault, getVaultsForCompounding } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    maximumAttempts: 3,
    initialInterval: '10 seconds',
    backoffCoefficient: 2,
  },
});

export async function AutoCompoundingWorkflow(frequency: string): Promise<void> {
  let interval: number;
  
  switch (frequency) {
    case 'hourly':
      interval = 60 * 60 * 1000; // 1 hour
      break;
    case 'daily':
      interval = 24 * 60 * 60 * 1000; // 24 hours
      break;
    case 'weekly':
      interval = 7 * 24 * 60 * 60 * 1000; // 7 days
      break;
    case 'monthly':
      interval = 30 * 24 * 60 * 60 * 1000; // 30 days
      break;
    default:
      interval = 24 * 60 * 60 * 1000;
  }

  // Run continuously
  while (true) {
    try {
      console.log(`Running ${frequency} compounding workflow...`);
      
      // Get all vaults that need compounding
      const vaultIds = await getVaultsForCompounding(frequency);
      
      // Compound each vault
      for (const vaultId of vaultIds) {
        try {
          await compoundVault(vaultId);
          console.log(`Successfully compounded vault ${vaultId}`);
        } catch (error) {
          console.error(`Failed to compound vault ${vaultId}:`, error);
          // Continue with other vaults even if one fails
        }
      }
      
      console.log(`Completed ${frequency} compounding run. Processed ${vaultIds.length} vaults.`);
    } catch (error) {
      console.error(`Error in ${frequency} compounding workflow:`, error);
    }
    
    // Sleep until next run
    await sleep(interval);
  }
}
