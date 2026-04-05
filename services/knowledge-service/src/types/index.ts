export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  metadata: Record<string, any>;
  embedding?: number[];
  chunkIndex: number;
  startChar: number;
  endChar: number;
}

export interface Document {
  id: string;
  tenantId: string;
  collectionId: string;
  title: string;
  content: string;
  format: DocumentFormat;
  metadata: DocumentMetadata;
  source?: string;
  url?: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export enum DocumentFormat {
  PDF = 'pdf',
  TXT = 'txt',
  MD = 'md',
  DOCX = 'docx',
  HTML = 'html',
  JSON = 'json',
}

export interface DocumentMetadata {
  author?: string;
  createdAt?: string;
  tags?: string[];
  category?: string;
  language?: string;
  [key: string]: any;
}

export interface Collection {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  vectorDimension: number;
  distance: 'cosine' | 'euclidean' | 'dot';
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChunkingStrategy {
  type: 'fixed' | 'semantic' | 'recursive';
  chunkSize: number;
  chunkOverlap: number;
  separators?: string[];
}

export interface EmbeddingConfig {
  provider: 'openai' | 'huggingface' | 'cohere';
  model: string;
  dimension: number;
  batchSize: number;
}

export interface SearchQuery {
  query: string;
  collectionId: string;
  tenantId: string;
  limit?: number;
  filter?: Record<string, any>;
  scoreThreshold?: number;
}

export interface SearchResult {
  id: string;
  documentId: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
  chunk?: DocumentChunk;
}

export interface RAGQuery {
  query: string;
  collectionId: string;
  tenantId: string;
  topK?: number;
  filter?: Record<string, any>;
  includeContext?: boolean;
  maxContextLength?: number;
  temperature?: number;
  model?: string;
}

export interface RAGResponse {
  answer: string;
  sources: SearchResult[];
  context: string;
  metadata: {
    model: string;
    tokensUsed: number;
    processingTime: number;
  };
}

export interface IngestRequest {
  tenantId: string;
  collectionId: string;
  document: {
    title: string;
    content?: string;
    file?: Buffer;
    format: DocumentFormat;
    metadata?: DocumentMetadata;
    source?: string;
    url?: string;
  };
  chunkingStrategy?: ChunkingStrategy;
}

export interface IngestResponse {
  documentId: string;
  chunksCreated: number;
  status: 'success' | 'failed';
  message?: string;
}

export interface VectorPoint {
  id: string;
  vector: number[];
  payload: Record<string, any>;
}

export interface QdrantSearchResult {
  id: string | number;
  version: number;
  score: number;
  payload?: Record<string, any>;
  vector?: number[] | Record<string, number[]>;
}

export interface CacheEntry {
  key: string;
  value: any;
  ttl: number;
}

export interface AnalyticsEvent {
  tenantId: string;
  eventType: 'search' | 'ingest' | 'query' | 'feedback';
  metadata: Record<string, any>;
  timestamp: Date;
}

export interface RelevanceFeedback {
  searchId: string;
  documentId: string;
  score: number;
  feedback: 'positive' | 'negative';
  userId?: string;
  tenantId: string;
}
