import { proxyActivities, sleep } from '@temporalio/workflow';
import type * as activities from '../activities';

const { assessVaultRisk, updateVaultRiskScore, getActiveVaults, pauseHighRiskVault } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    maximumAttempts: 3,
    initialInterval: '10 seconds',
    backoffCoefficient: 2,
  },
});

export async function RiskAssessmentWorkflow(): Promise<void> {
  const assessmentInterval = 12 * 60 * 60 * 1000; // Assess every 12 hours

  while (true) {
    try {
      console.log('Running risk assessment workflow...');
      
      const vaultIds = await getActiveVaults();
      
      for (const vaultId of vaultIds) {
        try {
          const riskScore = await assessVaultRisk(vaultId);
          await updateVaultRiskScore(vaultId, riskScore);
          
          // Pause vault if risk is too high
          if (riskScore > 8) { // Risk score threshold
            console.warn(`Vault ${vaultId} has high risk score: ${riskScore}. Pausing.`);
            await pauseHighRiskVault(vaultId, riskScore);
          }
        } catch (error) {
          console.error(`Failed to assess risk for vault ${vaultId}:`, error);
        }
      }
      
      console.log(`Completed risk assessment. Assessed ${vaultIds.length} vaults.`);
    } catch (error) {
      console.error('Error in risk assessment workflow:', error);
    }
    
    await sleep(assessmentInterval);
  }
}
