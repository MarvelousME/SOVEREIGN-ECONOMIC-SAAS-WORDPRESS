import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3009', 10),
    env: process.env.NODE_ENV || 'development',
    name: process.env.SERVICE_NAME || 'governance-service',
    version: process.env.SERVICE_VERSION || '1.0.0'
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'ubi_cms',
    user: process.env.DB_USER || 'ubi_user',
    password: process.env.DB_PASSWORD || 'ubi_password',
    min: parseInt(process.env.DB_POOL_MIN || '2', 10),
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  },
  nats: {
    url: process.env.NATS_URL || 'nats://localhost:4222',
    clusterId: process.env.NATS_CLUSTER_ID || 'ubi-cms-cluster'
  },
  temporal: {
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
    namespace: process.env.TEMPORAL_NAMESPACE || 'default'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },
  governance: {
    minProposalDeposit: parseInt(process.env.MIN_PROPOSAL_DEPOSIT || '100', 10),
    minQuorumPercentage: parseInt(process.env.MIN_QUORUM_PERCENTAGE || '20', 10),
    votingPeriodDays: parseInt(process.env.VOTING_PERIOD_DAYS || '7', 10),
    executionDelayHours: parseInt(process.env.EXECUTION_DELAY_HOURS || '48', 10)
  }
};
