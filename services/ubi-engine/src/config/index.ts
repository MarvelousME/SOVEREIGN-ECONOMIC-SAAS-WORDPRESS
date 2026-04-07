import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  server: z.object({
    port: z.number().default(3002),
    nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  }),
  database: z.object({
    host: z.string(),
    port: z.number(),
    name: z.string(),
    user: z.string(),
    password: z.string(),
    ssl: z.boolean().default(false),
  }),
  redis: z.object({
    host: z.string(),
    port: z.number(),
    password: z.string().optional(),
    db: z.number().default(0),
  }),
  nats: z.object({
    url: z.string(),
    user: z.string().optional(),
    password: z.string().optional(),
  }),
  temporal: z.object({
    address: z.string(),
    namespace: z.string().default('default'),
    taskQueue: z.string().default('ubi-cms'),
  }),
  ubi: z.object({
    poolInitial: z.number(),
    distributionInterval: z.enum(['hourly', 'daily', 'weekly']).default('daily'),
    minParticipationScore: z.number().default(10),
    maxCapPerUser: z.number().default(1000),
    activityDecayDays: z.number().default(30),
    vestingPeriodDays: z.number().default(7),
  }),
  weights: z.object({
    equal: z.number().min(0).max(1),
    activity: z.number().min(0).max(1),
    contribution: z.number().min(0).max(1),
    reputation: z.number().min(0).max(1),
  }).refine(
    (weights) => {
      const sum = weights.equal + weights.activity + weights.contribution + weights.reputation;
      return Math.abs(sum - 1.0) < 0.001; // Allow small floating point errors
    },
    { message: 'Distribution weights must sum to 1.0' }
  ),
  antiAbuse: z.object({
    maxAccountsPerIp: z.number().default(3),
    minAccountAgeDays: z.number().default(7),
    sybilDetectionEnabled: z.boolean().default(true),
  }),
  api: z.object({
    rateLimitWindowMs: z.number().default(900000),
    rateLimitMaxRequests: z.number().default(100),
    jwtSecret: z.string().min(32),
  }),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  }),
});

export type Config = z.infer<typeof configSchema>;

export const config: Config = configSchema.parse({
  server: {
    port: parseInt(process.env.PORT || '3002', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'ubi_engine',
    user: process.env.DB_USER || 'ubi_user',
    password: process.env.DB_PASSWORD || 'ubi_password',
    ssl: process.env.DB_SSL === 'true',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  nats: {
    url: process.env.NATS_URL || 'nats://localhost:4222',
    user: process.env.NATS_USER,
    password: process.env.NATS_PASSWORD,
  },
  temporal: {
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'ubi-cms',
  },
  ubi: {
    poolInitial: parseInt(process.env.UBI_POOL_INITIAL || '1000000', 10),
    distributionInterval: (process.env.UBI_DISTRIBUTION_INTERVAL as any) || 'daily',
    minParticipationScore: parseInt(process.env.UBI_MIN_PARTICIPATION_SCORE || '10', 10),
    maxCapPerUser: parseInt(process.env.UBI_MAX_CAP_PER_USER || '1000', 10),
    activityDecayDays: parseInt(process.env.UBI_ACTIVITY_DECAY_DAYS || '30', 10),
    vestingPeriodDays: parseInt(process.env.UBI_VESTING_PERIOD_DAYS || '7', 10),
  },
  weights: {
    equal: parseFloat(process.env.WEIGHT_EQUAL || '0.4'),
    activity: parseFloat(process.env.WEIGHT_ACTIVITY || '0.3'),
    contribution: parseFloat(process.env.WEIGHT_CONTRIBUTION || '0.2'),
    reputation: parseFloat(process.env.WEIGHT_REPUTATION || '0.1'),
  },
  antiAbuse: {
    maxAccountsPerIp: parseInt(process.env.MAX_ACCOUNTS_PER_IP || '3', 10),
    minAccountAgeDays: parseInt(process.env.MIN_ACCOUNT_AGE_DAYS || '7', 10),
    sybilDetectionEnabled: process.env.SYBIL_DETECTION_ENABLED !== 'false',
  },
  api: {
    rateLimitWindowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || '900000', 10),
    rateLimitMaxRequests: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS || '100', 10),
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  },
  logging: {
    level: (process.env.LOG_LEVEL as any) || 'info',
  },
});
