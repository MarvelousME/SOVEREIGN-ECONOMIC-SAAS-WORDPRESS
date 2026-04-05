export const config = {
  port: parseInt(process.env.PORT || '3004'),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    name: process.env.DB_NAME || 'sovereign_crm',
  },
  eventEmitter: {
    host: process.env.EVENT_EMITTER_HOST || 'localhost',
    port: parseInt(process.env.EVENT_EMITTER_PORT || '6379'),
  },
  scoring: {
    behavioralWeight: 0.4,
    demographicWeight: 0.35,
    engagementWeight: 0.25,
  },
  routing: {
    defaultTerritory: 'unassigned',
    maxLeadsPerUser: 50,
  },
};
