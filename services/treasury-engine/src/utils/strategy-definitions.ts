import { Strategy, StrategyType, StrategyAllocation } from '../types';

// Pre-defined yield strategies

export const CONSERVATIVE_STRATEGY: Omit<Strategy, 'id' | 'created_at' | 'updated_at'> = {
  name: 'Conservative Yield',
  type: StrategyType.CONSERVATIVE,
  description: 'Low-risk strategy focusing on stable, blue-chip protocols with proven track records',
  risk_level: 2,
  target_apy: 5.5,
  min_allocation: 0,
  max_allocation: 100,
  rebalance_threshold: 0.03,
  active: true,
  allocations: [
    {
      protocol: 'Aave V3',
      target_percentage: 40,
      apy: 5.8,
      risk_score: 2,
    },
    {
      protocol: 'Compound V3',
      target_percentage: 30,
      apy: 5.5,
      risk_score: 2,
    },
    {
      protocol: 'MakerDAO DSR',
      target_percentage: 20,
      apy: 5.0,
      risk_score: 1,
    },
    {
      protocol: 'Curve 3pool',
      target_percentage: 10,
      apy: 4.8,
      risk_score: 2,
    },
  ],
};

export const BALANCED_STRATEGY: Omit<Strategy, 'id' | 'created_at' | 'updated_at'> = {
  name: 'Balanced Growth',
  type: StrategyType.BALANCED,
  description: 'Moderate risk strategy balancing stability with growth opportunities',
  risk_level: 5,
  target_apy: 12.0,
  min_allocation: 0,
  max_allocation: 100,
  rebalance_threshold: 0.05,
  active: true,
  allocations: [
    {
      protocol: 'Aave V3',
      target_percentage: 25,
      apy: 5.8,
      risk_score: 2,
    },
    {
      protocol: 'GMX',
      target_percentage: 20,
      apy: 18.5,
      risk_score: 5,
    },
    {
      protocol: 'Uniswap V3 USDC/USDT',
      target_percentage: 20,
      apy: 12.0,
      risk_score: 4,
    },
    {
      protocol: 'Yearn Finance',
      target_percentage: 20,
      apy: 10.5,
      risk_score: 4,
    },
    {
      protocol: 'Convex Finance',
      target_percentage: 15,
      apy: 14.2,
      risk_score: 5,
    },
  ],
};

export const AGGRESSIVE_STRATEGY: Omit<Strategy, 'id' | 'created_at' | 'updated_at'> = {
  name: 'Aggressive Yield',
  type: StrategyType.AGGRESSIVE,
  description: 'High-risk, high-reward strategy for maximum yield generation',
  risk_level: 8,
  target_apy: 25.0,
  min_allocation: 0,
  max_allocation: 100,
  rebalance_threshold: 0.08,
  active: true,
  allocations: [
    {
      protocol: 'GMX',
      target_percentage: 30,
      apy: 18.5,
      risk_score: 5,
    },
    {
      protocol: 'Pendle',
      target_percentage: 25,
      apy: 28.5,
      risk_score: 7,
    },
    {
      protocol: 'Beefy Finance',
      target_percentage: 20,
      apy: 32.0,
      risk_score: 8,
    },
    {
      protocol: 'Stargate Finance',
      target_percentage: 15,
      apy: 22.5,
      risk_score: 6,
    },
    {
      protocol: 'Uniswap V3 ETH/USDC',
      target_percentage: 10,
      apy: 24.0,
      risk_score: 7,
    },
  ],
};

export const STABLECOIN_ONLY_STRATEGY: Omit<Strategy, 'id' | 'created_at' | 'updated_at'> = {
  name: 'Stablecoin Maximizer',
  type: StrategyType.CUSTOM,
  description: 'Ultra-conservative strategy using only stablecoin lending protocols',
  risk_level: 1,
  target_apy: 4.5,
  min_allocation: 0,
  max_allocation: 100,
  rebalance_threshold: 0.02,
  active: true,
  allocations: [
    {
      protocol: 'Aave V3 USDC',
      target_percentage: 35,
      apy: 4.8,
      risk_score: 1,
    },
    {
      protocol: 'Compound USDT',
      target_percentage: 30,
      apy: 4.5,
      risk_score: 1,
    },
    {
      protocol: 'MakerDAO DSR',
      target_percentage: 25,
      apy: 5.0,
      risk_score: 1,
    },
    {
      protocol: 'Curve 3pool',
      target_percentage: 10,
      apy: 3.8,
      risk_score: 1,
    },
  ],
};

export const DEFI_DIVERSIFIED_STRATEGY: Omit<Strategy, 'id' | 'created_at' | 'updated_at'> = {
  name: 'DeFi Diversified',
  type: StrategyType.CUSTOM,
  description: 'Broad diversification across DeFi ecosystem sectors',
  risk_level: 6,
  target_apy: 15.5,
  min_allocation: 0,
  max_allocation: 100,
  rebalance_threshold: 0.06,
  active: true,
  allocations: [
    {
      protocol: 'Aave V3 (Lending)',
      target_percentage: 20,
      apy: 5.8,
      risk_score: 2,
    },
    {
      protocol: 'Uniswap V3 (DEX LP)',
      target_percentage: 18,
      apy: 16.0,
      risk_score: 5,
    },
    {
      protocol: 'GMX (Perps)',
      target_percentage: 17,
      apy: 18.5,
      risk_score: 5,
    },
    {
      protocol: 'Yearn (Vaults)',
      target_percentage: 15,
      apy: 10.5,
      risk_score: 4,
    },
    {
      protocol: 'Convex (Staking)',
      target_percentage: 15,
      apy: 14.2,
      risk_score: 5,
    },
    {
      protocol: 'Stargate (Bridge)',
      target_percentage: 10,
      apy: 22.5,
      risk_score: 6,
    },
    {
      protocol: 'Frax (Stablecoin)',
      target_percentage: 5,
      apy: 12.0,
      risk_score: 3,
    },
  ],
};

export const ALL_STRATEGIES = [
  CONSERVATIVE_STRATEGY,
  BALANCED_STRATEGY,
  AGGRESSIVE_STRATEGY,
  STABLECOIN_ONLY_STRATEGY,
  DEFI_DIVERSIFIED_STRATEGY,
];
