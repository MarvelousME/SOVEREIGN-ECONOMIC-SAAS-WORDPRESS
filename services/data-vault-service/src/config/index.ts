import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3010', 10),
    env: process.env.NODE_ENV || 'development',
    name: process.env.SERVICE_NAME || 'data-vault-service',
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
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY || 'your-32-byte-encryption-key-here',
    algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm'
  },
  minio: {
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    bucket: process.env.MINIO_BUCKET || 'data-vault'
  },
  dataVault: {
    defaultAnonymizationLevel: parseInt(process.env.DEFAULT_ANONYMIZATION_LEVEL || '2', 10),
    minDataPrice: parseFloat(process.env.MIN_DATA_PRICE || '0.01'),
    revenueSharePercentage: parseInt(process.env.REVENUE_SHARE_PERCENTAGE || '80', 10)
  }
};
