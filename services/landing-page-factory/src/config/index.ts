import { Pool } from 'pg';
import { DeploymentReadinessConfig } from '../types';

export interface LandingPageFactoryConfig {
  db: Pool;
  openaiApiKey: string;
  natsUrl?: string;
  cdnBaseUrl?: string;
  embeddedBaseUrl?: string;
  deploymentReadiness?: DeploymentReadinessConfig;
}

export const createDatabasePool = (): Pool => {
  return new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'ubi_cms',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
};

export const config = {
  port: parseInt(process.env.PORT || '3011'),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
  cdnBaseUrl: process.env.CDN_BASE_URL || 'https://cdn.sovereign-os.com',
  embeddedBaseUrl: process.env.EMBEDDED_BASE_URL || 'https://embed.sovereign-os.com',
  deploymentReadiness: {
    regionTag: process.env.REGION_TAG || undefined,
    multiRegionReady: process.env.MULTI_REGION_READY === 'true',
    whiteLabelReady: process.env.WHITE_LABEL_READY === 'true',
    tenantBranding: {
      tenantBrandingDomain: process.env.TENANT_BRANDING_DOMAIN || undefined,
      tenantBrandingSubdomain: process.env.TENANT_BRANDING_SUBDOMAIN || undefined,
    },
  } satisfies DeploymentReadinessConfig,
  environment: process.env.NODE_ENV || 'development',
};
