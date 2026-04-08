import dotenv from 'dotenv';

dotenv.config();

export const config = {
  temporal: {
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'ubi-cms',
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/ubi_cms',
  },
  services: {
    ubiEngine: process.env.UBI_ENGINE_URL || 'http://localhost:4001',
    treasuryEngine: process.env.TREASURY_ENGINE_URL || 'http://localhost:4002',
    ledgerService: process.env.LEDGER_SERVICE_URL || 'http://localhost:4003',
    notificationService: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4004',
    taskMarketplace: process.env.TASK_MARKETPLACE_URL || 'http://localhost:4005',
    reputationService: process.env.REPUTATION_SERVICE_URL || 'http://localhost:4006',
    governanceService: process.env.GOVERNANCE_SERVICE_URL || 'http://localhost:4007',
    agentRunner: process.env.AGENT_RUNNER_URL || 'http://localhost:4008',
    dataVaultService: process.env.DATA_VAULT_SERVICE_URL || 'http://localhost:4009',
  },
  opa: {
    url: process.env.OPA_URL || 'http://localhost:8181',
  },
  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    bucket: process.env.MINIO_BUCKET || 'agent-results',
  },
  qdrant: {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
