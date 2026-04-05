# Knowledge Service API Documentation

Base URL: `http://localhost:3007`

## Authentication

All requests require a `x-tenant-id` header containing the tenant UUID.

```
x-tenant-id: 550e8400-e29b-41d4-a716-446655440000
```

## Endpoints

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "knowledge-service",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### Collections

#### Create Collection

```http
POST /api/v1/knowledge/collections
Content-Type: application/json

{
  "name": "Agent Memory",
  "description": "Long-term memory for AI agents",
  "metadata": {
    "agentId": "agent-123",
    "type": "agent_memory"
  }
}
```

**Response: 201 Created**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "tenantId": "tenant-uuid",
  "name": "Agent Memory",
  "description": "Long-term memory for AI agents",
  "vectorDimension": 1536,
  "distance": "cosine",
  "metadata": {
    "agentId": "agent-123",
    "type": "agent_memory"
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### List Collections

```http
GET /api/v1/knowledge/collections
```

**Response: 200 OK**
```json
[
  {
    "id": "collection-uuid",
    "name": "Agent Memory",
    "description": "Long-term memory",
    "vectorDimension": 1536,
    "distance": "cosine",
    "metadata": {},
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### Delete Collection

```http
DELETE /api/v1/knowledge/collections/{collectionId}
```

**Response: 204 No Content**

---

### Documents

#### Ingest Document (JSON)

```http
POST /api/v1/knowledge/ingest
Content-Type: application/json

{
  "collectionId": "collection-uuid",
  "document": {
    "title": "Machine Learning Basics",
    "content": "Machine learning is a subset of artificial intelligence...",
    "format": "txt",
    "metadata": {
      "author": "John Doe",
      "category": "AI",
      "tags": ["ml", "ai", "tutorial"]
    },
    "source": "internal",
    "url": "https://example.com/ml-basics"
  },
  "chunkingStrategy": {
    "type": "recursive",
    "chunkSize": 1000,
    "chunkOverlap": 200,
    "separators": ["\n\n", "\n", ". ", " "]
  }
}
```

**Response: 201 Created**
```json
{
  "documentId": "doc-uuid",
  "chunksCreated": 12,
  "status": "success"
}
```

#### Ingest Document (File Upload)

```http
POST /api/v1/knowledge/ingest
Content-Type: multipart/form-data

file: <binary-file>
collectionId: "collection-uuid"
document: {
  "title": "Research Paper",
  "format": "pdf",
  "metadata": {
    "author": "Jane Smith"
  }
}
```

**Supported Formats:**
- `pdf` - PDF documents
- `txt` - Plain text
- `md` - Markdown
- `docx` - Microsoft Word
- `html` - HTML documents
- `json` - JSON data

#### Delete Document

```http
DELETE /api/v1/knowledge/documents/{documentId}
```

**Response: 204 No Content**

---

### Search

#### Semantic Search

```http
POST /api/v1/knowledge/search
Content-Type: application/json

{
  "query": "What is machine learning?",
  "collectionId": "collection-uuid",
  "limit": 5,
  "filter": {
    "category": "AI",
    "author": "John Doe"
  },
  "scoreThreshold": 0.7
}
```

**Parameters:**
- `query` (string, required) - Search query
- `collectionId` (string, required) - Collection UUID
- `limit` (number, optional) - Maximum results (default: 10, max: 100)
- `filter` (object, optional) - Metadata filters
- `scoreThreshold` (number, optional) - Minimum similarity score (0-1)

**Response: 200 OK**
```json
{
  "results": [
    {
      "id": "vector-uuid",
      "documentId": "doc-uuid",
      "content": "Machine learning is a subset of artificial intelligence that enables computers to learn from data...",
      "score": 0.95,
      "metadata": {
        "title": "Machine Learning Basics",
        "author": "John Doe",
        "category": "AI",
        "tags": ["ml", "ai", "tutorial"]
      }
    }
  ],
  "count": 1
}
```

**Filter Examples:**

Exact match:
```json
{
  "filter": {
    "category": "AI"
  }
}
```

Multiple values (OR):
```json
{
  "filter": {
    "category": ["AI", "ML", "Data Science"]
  }
}
```

Range queries:
```json
{
  "filter": {
    "publishedYear": {
      "$gte": 2020,
      "$lte": 2024
    }
  }
}
```

---

### RAG Query

#### Generate Answer with Context

```http
POST /api/v1/knowledge/query
Content-Type: application/json

{
  "query": "How do neural networks learn?",
  "collectionId": "collection-uuid",
  "topK": 5,
  "filter": {
    "category": "AI"
  },
  "maxContextLength": 4000,
  "temperature": 0.7,
  "model": "gpt-4-turbo-preview"
}
```

**Parameters:**
- `query` (string, required) - Question to answer
- `collectionId` (string, required) - Collection UUID
- `topK` (number, optional) - Number of context sources (default: 5, max: 20)
- `filter` (object, optional) - Metadata filters
- `maxContextLength` (number, optional) - Max context characters (default: 4000)
- `temperature` (number, optional) - LLM temperature (0-2, default: 0.7)
- `model` (string, optional) - OpenAI model (default: gpt-4-turbo-preview)

**Response: 200 OK**
```json
{
  "answer": "Neural networks learn through a process called backpropagation...",
  "sources": [
    {
      "id": "vector-uuid-1",
      "documentId": "doc-uuid-1",
      "content": "Neural networks use backpropagation to adjust weights...",
      "score": 0.92,
      "metadata": {
        "title": "Deep Learning Guide",
        "author": "AI Expert"
      }
    },
    {
      "id": "vector-uuid-2",
      "documentId": "doc-uuid-2",
      "content": "The learning process involves forward pass and backward pass...",
      "score": 0.88,
      "metadata": {
        "title": "Neural Network Fundamentals"
      }
    }
  ],
  "context": "[Source: Deep Learning Guide]\nNeural networks use backpropagation...\n\n[Source: Neural Network Fundamentals]\nThe learning process involves...",
  "metadata": {
    "model": "gpt-4-turbo-preview",
    "tokensUsed": 1250,
    "processingTime": 2340
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error",
  "details": [
    {
      "field": "query",
      "message": "Required"
    }
  ]
}
```

### 404 Not Found
```json
{
  "error": "Resource not found",
  "path": "/api/v1/knowledge/collections/invalid-id"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "status": "error"
}
```

---

## Rate Limiting

- Default: 100 requests per minute per IP
- Returns `429 Too Many Requests` when exceeded

---

## Examples

### cURL Examples

Create collection:
```bash
curl -X POST http://localhost:3007/api/v1/knowledge/collections \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant-uuid" \
  -d '{
    "name": "My Collection",
    "description": "Test collection"
  }'
```

Search:
```bash
curl -X POST http://localhost:3007/api/v1/knowledge/search \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant-uuid" \
  -d '{
    "query": "machine learning",
    "collectionId": "collection-uuid",
    "limit": 5
  }'
```

RAG Query:
```bash
curl -X POST http://localhost:3007/api/v1/knowledge/query \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant-uuid" \
  -d '{
    "query": "What is deep learning?",
    "collectionId": "collection-uuid",
    "topK": 3
  }'
```

### JavaScript/TypeScript Examples

```typescript
const tenantId = 'tenant-uuid';
const baseURL = 'http://localhost:3007/api/v1/knowledge';

// Create collection
const collection = await fetch(`${baseURL}/collections`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-tenant-id': tenantId,
  },
  body: JSON.stringify({
    name: 'Agent Memory',
    description: 'AI agent long-term memory',
  }),
});

// Ingest document
const ingestResult = await fetch(`${baseURL}/ingest`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-tenant-id': tenantId,
  },
  body: JSON.stringify({
    collectionId: collection.id,
    document: {
      title: 'ML Tutorial',
      content: 'Machine learning is...',
      format: 'txt',
    },
  }),
});

// Search
const searchResults = await fetch(`${baseURL}/search`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-tenant-id': tenantId,
  },
  body: JSON.stringify({
    query: 'machine learning basics',
    collectionId: collection.id,
    limit: 5,
  }),
});

// RAG Query
const answer = await fetch(`${baseURL}/query`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-tenant-id': tenantId,
  },
  body: JSON.stringify({
    query: 'Explain how neural networks work',
    collectionId: collection.id,
    topK: 5,
  }),
});
```

### Python Example

```python
import requests

tenant_id = 'tenant-uuid'
base_url = 'http://localhost:3007/api/v1/knowledge'
headers = {
    'Content-Type': 'application/json',
    'x-tenant-id': tenant_id
}

# Create collection
response = requests.post(
    f'{base_url}/collections',
    headers=headers,
    json={
        'name': 'Agent Memory',
        'description': 'AI agent knowledge base'
    }
)
collection = response.json()

# Ingest document
requests.post(
    f'{base_url}/ingest',
    headers=headers,
    json={
        'collectionId': collection['id'],
        'document': {
            'title': 'ML Guide',
            'content': 'Machine learning is...',
            'format': 'txt'
        }
    }
)

# RAG Query
response = requests.post(
    f'{base_url}/query',
    headers=headers,
    json={
        'query': 'What is machine learning?',
        'collectionId': collection['id'],
        'topK': 5
    }
)
result = response.json()
print(result['answer'])
```
