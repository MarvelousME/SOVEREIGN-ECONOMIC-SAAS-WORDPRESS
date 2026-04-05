# Knowledge Service with RAG

A comprehensive knowledge management service with Retrieval-Augmented Generation (RAG) capabilities for agent memory, built with Node.js, TypeScript, Qdrant, and OpenAI.

## Features

### Core Functionality
- **Document Ingestion**: Support for PDF, TXT, MD, DOCX, HTML, and JSON formats
- **Smart Chunking**: Multiple strategies (fixed-size, semantic, recursive)
- **Vector Embeddings**: OpenAI embeddings with caching
- **Semantic Search**: Fast vector similarity search using Qdrant
- **RAG Pipeline**: Context-aware question answering with source citations
- **Multi-tenancy**: Isolated collections per tenant

### Document Processing
- Automatic text extraction from various formats
- Metadata extraction (author, title, tags, etc.)
- Deduplication support
- Configurable chunking strategies
- Batch processing for efficiency

### Search & Retrieval
- Vector-based semantic search
- Hybrid search (vector + metadata filters)
- Configurable relevance thresholds
- Top-K retrieval
- Citation tracking

### RAG (Retrieval-Augmented Generation)
- Query embedding generation
- Context assembly from search results
- LLM-powered answer generation
- Source attribution
- Configurable temperature and model selection
- Token usage tracking

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Knowledge Service                         │
├─────────────────────────────────────────────────────────────┤
│  Controllers → Services → Models/Storage                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Document   │  │   Chunking   │  │  Embedding   │     │
│  │    Parser    │→ │   Service    │→ │   Service    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │             │
│         ↓                  ↓                  ↓             │
│  ┌──────────────────────────────────────────────────┐      │
│  │            Knowledge Service (RAG)                │      │
│  └──────────────────────────────────────────────────┘      │
│         │                                    │              │
│         ↓                                    ↓              │
│  ┌─────────────┐                    ┌──────────────┐       │
│  │  PostgreSQL │                    │    Qdrant    │       │
│  │  (Metadata) │                    │   (Vectors)  │       │
│  └─────────────┘                    └──────────────┘       │
│                                                              │
│  ┌─────────────┐                    ┌──────────────┐       │
│  │    Redis    │                    │   OpenAI API │       │
│  │   (Cache)   │                    │ (Embeddings) │       │
│  └─────────────┘                    └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

## Installation

### Prerequisites
- Node.js >= 18.0.0
- PostgreSQL >= 14
- Qdrant vector database
- Redis
- OpenAI API key

### Setup

1. **Clone and install dependencies**:
```bash
cd services/knowledge-service
npm install
```

2. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start dependencies with Docker**:
```bash
docker-compose up -d postgres qdrant redis
```

4. **Run database migrations**:
```bash
npm run build
npm start
# Database tables are created automatically on first run
```

5. **Start development server**:
```bash
npm run dev
```

## API Endpoints

### Collections

#### Create Collection
```http
POST /api/v1/knowledge/collections
Headers:
  x-tenant-id: <tenant-uuid>
  Content-Type: application/json

Body:
{
  "name": "Agent Memory",
  "description": "Long-term memory for AI agents",
  "metadata": {
    "type": "agent_memory",
    "version": "1.0"
  }
}

Response: 201 Created
{
  "id": "collection-uuid",
  "tenantId": "tenant-uuid",
  "name": "Agent Memory",
  "description": "Long-term memory for AI agents",
  "vectorDimension": 1536,
  "distance": "cosine",
  "metadata": {...},
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

#### Get Collections
```http
GET /api/v1/knowledge/collections
Headers:
  x-tenant-id: <tenant-uuid>

Response: 200 OK
[
  {
    "id": "collection-uuid",
    "name": "Agent Memory",
    ...
  }
]
```

#### Delete Collection
```http
DELETE /api/v1/knowledge/collections/:id
Headers:
  x-tenant-id: <tenant-uuid>

Response: 204 No Content
```

### Documents

#### Ingest Document (with content)
```http
POST /api/v1/knowledge/ingest
Headers:
  x-tenant-id: <tenant-uuid>
  Content-Type: application/json

Body:
{
  "collectionId": "collection-uuid",
  "document": {
    "title": "Machine Learning Guide",
    "content": "Machine learning is a subset of AI...",
    "format": "txt",
    "metadata": {
      "author": "John Doe",
      "category": "AI"
    }
  },
  "chunkingStrategy": {
    "type": "recursive",
    "chunkSize": 1000,
    "chunkOverlap": 200,
    "separators": ["\n\n", "\n", ". ", " "]
  }
}

Response: 201 Created
{
  "documentId": "doc-uuid",
  "chunksCreated": 15,
  "status": "success"
}
```

#### Ingest Document (with file)
```http
POST /api/v1/knowledge/ingest
Headers:
  x-tenant-id: <tenant-uuid>
  Content-Type: multipart/form-data

Body:
  file: <binary-file>
  collectionId: "collection-uuid"
  document: {
    "title": "Research Paper",
    "format": "pdf"
  }

Response: 201 Created
```

#### Delete Document
```http
DELETE /api/v1/knowledge/documents/:id
Headers:
  x-tenant-id: <tenant-uuid>

Response: 204 No Content
```

### Search

#### Semantic Search
```http
POST /api/v1/knowledge/search
Headers:
  x-tenant-id: <tenant-uuid>
  Content-Type: application/json

Body:
{
  "query": "What is machine learning?",
  "collectionId": "collection-uuid",
  "limit": 5,
  "filter": {
    "category": "AI"
  },
  "scoreThreshold": 0.7
}

Response: 200 OK
{
  "results": [
    {
      "id": "vector-id",
      "documentId": "doc-uuid",
      "content": "Machine learning is...",
      "score": 0.95,
      "metadata": {
        "title": "ML Guide",
        "author": "John Doe",
        ...
      }
    }
  ],
  "count": 5
}
```

### RAG Query

#### Generate Answer with RAG
```http
POST /api/v1/knowledge/query
Headers:
  x-tenant-id: <tenant-uuid>
  Content-Type: application/json

Body:
{
  "query": "Explain how neural networks work",
  "collectionId": "collection-uuid",
  "topK": 5,
  "maxContextLength": 4000,
  "temperature": 0.7,
  "model": "gpt-4-turbo-preview"
}

Response: 200 OK
{
  "answer": "Neural networks are computational models...",
  "sources": [
    {
      "id": "vector-id",
      "documentId": "doc-uuid",
      "content": "Neural networks consist of...",
      "score": 0.92,
      "metadata": {...}
    }
  ],
  "context": "[Source: Neural Networks Guide]\nNeural networks...",
  "metadata": {
    "model": "gpt-4-turbo-preview",
    "tokensUsed": 1250,
    "processingTime": 2340
  }
}
```

## Chunking Strategies

### Fixed-Size Chunking
```json
{
  "type": "fixed",
  "chunkSize": 1000,
  "chunkOverlap": 200
}
```
Splits text into fixed-size chunks with overlap. Best for uniform content.

### Semantic Chunking
```json
{
  "type": "semantic",
  "chunkSize": 1000,
  "chunkOverlap": 0
}
```
Splits at paragraph boundaries. Best for structured documents.

### Recursive Chunking (Recommended)
```json
{
  "type": "recursive",
  "chunkSize": 1000,
  "chunkOverlap": 200,
  "separators": ["\n\n", "\n", ". ", " "]
}
```
Uses hierarchical separators. Best for most use cases.

## Use Cases

### Agent Long-Term Memory
```javascript
// Ingest agent experiences
await ingestDocument({
  collectionId: 'agent-memory',
  document: {
    title: 'Task Execution - 2024-01-01',
    content: 'Successfully completed task X by...',
    format: 'txt',
    metadata: {
      agentId: 'agent-123',
      taskType: 'data_analysis'
    }
  }
});

// Query agent memory
const memory = await ragQuery({
  query: 'How did I handle data analysis tasks before?',
  collectionId: 'agent-memory',
  topK: 5
});
```

### User Knowledge Base
```javascript
// Build personal knowledge base
await ingestDocument({
  collectionId: 'user-kb',
  document: {
    title: 'Project Documentation',
    file: pdfBuffer,
    format: 'pdf'
  }
});

// Search knowledge base
const results = await search({
  query: 'API authentication flow',
  collectionId: 'user-kb'
});
```

### Content Recommendations
```javascript
// Find similar content
const similar = await search({
  query: 'machine learning tutorials',
  collectionId: 'content-library',
  limit: 10,
  filter: {
    contentType: 'tutorial',
    difficulty: 'beginner'
  }
});
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | `development` |
| `PORT` | Service port | `3007` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `QDRANT_URL` | Qdrant server URL | `http://localhost:6333` |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `OPENAI_EMBEDDING_MODEL` | Embedding model | `text-embedding-3-small` |
| `CHUNK_SIZE` | Default chunk size | `1000` |
| `RAG_TOP_K` | Default top-K results | `5` |
| `CACHE_EMBEDDING_TTL` | Embedding cache TTL (seconds) | `86400` |

## Development

### Run Tests
```bash
npm test                    # Run all tests with coverage
npm run test:watch          # Watch mode
npm run test:integration    # Integration tests only
```

### Type Checking
```bash
npm run typecheck
```

### Linting
```bash
npm run lint
```

### Build
```bash
npm run build
```

## Docker Deployment

### Build Image
```bash
docker build -t knowledge-service .
```

### Run with Docker Compose
```bash
docker-compose up -d
```

This starts:
- Knowledge service on port 3007
- PostgreSQL on port 5432
- Qdrant on ports 6333/6334
- Redis on port 6379
- NATS on port 4222

## Performance Optimization

### Caching
- Embeddings are cached in Redis (24h TTL)
- Search results can be cached (1h TTL)

### Batch Processing
- Embeddings generated in batches of 100
- Qdrant upserts batched for efficiency

### Rate Limiting
- 100 requests per minute by default
- Configurable per endpoint

## Monitoring

### Health Check
```bash
curl http://localhost:3007/health
```

### Logs
Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only

### Metrics
- Request duration
- Token usage
- Cache hit rates
- Document processing time

## Security

- Helmet.js for HTTP headers
- CORS protection
- Rate limiting
- Input validation with Zod
- SQL injection prevention
- File upload size limits

## License

MIT

## Support

For issues or questions, please contact the development team.
