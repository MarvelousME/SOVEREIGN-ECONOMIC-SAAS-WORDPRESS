export { TemporalClient, getTemporalClient } from './client';
export * from './types';
export { config } from './config';

// Export workflow types
export type { UBIDistributionInput } from './workflows/ubi-distribution.workflow';
export type { TreasuryRebalanceInput } from './workflows/treasury-rebalance.workflow';
export type { TreasuryCompoundInput } from './workflows/treasury-compound.workflow';
export type { TaskExpirationInput } from './workflows/task-expiration.workflow';
export type { GovernanceExecutionInput } from './workflows/governance-execution.workflow';
export type { ReferralConversionInput } from './workflows/referral-conversion.workflow';
