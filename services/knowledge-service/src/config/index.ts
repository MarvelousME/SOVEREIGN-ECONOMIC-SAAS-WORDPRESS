import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

interface Config {
  env: string;
  port: number;
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
  };
  qdrant: {
    url: string;
    apiKey?: string;
    timeout: number;
  };
  openai: {
    apiKey: string;
    model: string;
    embeddingModel: string;
    embeddingDimension: number;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  nats: {
    servers: string[];
    user?: string;
    pass?: string;
  };
  chunking: {
    defaultSize: number;
    defaultOverlap: number;
    maxChunkSize: number;
  };
  rag: {
    defaultTopK: number;
    maxContextLength: number;
    defaultTemperature: number;
  };
  cache: {
    embeddingTTL: number;
    searchTTL: number;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}

const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3007', 10),
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'knowledge_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true',
  },
  
  qdrant: {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY,
    timeout: parseInt(process.env.QDRANT_TIMEOUT || '30000', 10),
  },
  
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    embeddingDimension: parseInt(process.env.OPENAI_EMBEDDING_DIMENSION || '1536', 10),
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  
  nats: {
    servers: process.env.NATS_SERVERS?.split(',') || ['nats://localhost:4222'],
    user: process.env.NATS_USER,
    pass: process.env.NATS_PASS,
  },
  
  chunking: {
    defaultSize: parseInt(process.env.CHUNK_SIZE || '1000', 10),
    defaultOverlap: parseInt(process.env.CHUNK_OVERLAP || '200', 10),
    maxChunkSize: parseInt(process.env.MAX_CHUNK_SIZE || '2000', 10),
  },
  
  rag: {
    defaultTopK: parseInt(process.env.RAG_TOP_K || '5', 10),
    maxContextLength: parseInt(process.env.RAG_MAX_CONTEXT || '4000', 10),
    defaultTemperature: parseFloat(process.env.RAG_TEMPERATURE || '0.7'),
  },
  
  cache: {
    embeddingTTL: parseInt(process.env.CACHE_EMBEDDING_TTL || '86400', 10), // 24 hours
    searchTTL: parseInt(process.env.CACHE_SEARCH_TTL || '3600', 10), // 1 hour
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
};

export default config;
