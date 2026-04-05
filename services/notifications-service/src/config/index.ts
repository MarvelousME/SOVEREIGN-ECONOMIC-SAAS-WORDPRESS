import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3007', 10),
    env: process.env.NODE_ENV || 'development',
    name: process.env.SERVICE_NAME || 'notifications-service',
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
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10)
  },
  nats: {
    url: process.env.NATS_URL || 'nats://localhost:4222',
    clusterId: process.env.NATS_CLUSTER_ID || 'ubi-cms-cluster'
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || '',
    fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@ubi-cms.com',
    fromName: process.env.SENDGRID_FROM_NAME || 'UBI-CMS'
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || ''
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || ''
  },
  features: {
    enableEmail: process.env.ENABLE_EMAIL === 'true',
    enableSms: process.env.ENABLE_SMS === 'true',
    enablePush: process.env.ENABLE_PUSH === 'true',
    enableInApp: process.env.ENABLE_IN_APP === 'true'
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};
