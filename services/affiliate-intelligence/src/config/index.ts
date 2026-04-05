import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  server: z.object({
    port: z.number().default(3010),
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
  affiliate: z.object({
    freshnessDecayHours: z.number().default(24),
    minFreshnessScore: z.number().default(0.5),
    maxTrackingParams: z.number().default(50),
    urlCacheTtlSeconds: z.number().default(3600),
  }),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  }),
});

export type Config = z.infer<typeof configSchema>;

export const config: Config = configSchema.parse({
  server: {
    port: parseInt(process.env.PORT || '3010', 10),
    nodeEnv: (process.env.NODE_ENV as any) || 'development',
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'affiliate_intelligence',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
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
  affiliate: {
    freshnessDecayHours: parseInt(process.env.AFFILIATE_FRESHNESS_DECAY_HOURS || '24', 10),
    minFreshnessScore: parseFloat(process.env.AFFILIATE_MIN_FRESHNESS_SCORE || '0.5'),
    maxTrackingParams: parseInt(process.env.AFFILIATE_MAX_TRACKING_PARAMS || '50', 10),
    urlCacheTtlSeconds: parseInt(process.env.AFFILIATE_URL_CACHE_TTL_SECONDS || '3600', 10),
  },
  logging: {
    level: (process.env.LOG_LEVEL as any) || 'info',
  },
});

export default config;
