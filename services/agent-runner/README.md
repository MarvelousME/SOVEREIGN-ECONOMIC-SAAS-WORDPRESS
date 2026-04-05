# Agent Runner

AI Agent execution engine with memory management and artifact storage for the UBI-CMS platform.

## Overview

The Agent Runner is responsible for:

- **Agent Execution**: Run agent code in isolated sandboxed environments
- **Memory Management**: Short-term (Redis), long-term (Qdrant), and episodic (PostgreSQL) memory
- **Artifact Storage**: Store and retrieve execution artifacts in MinIO
- **State Persistence**: Save execution state for pause/resume functionality
- **Error Recovery**: Handle failures and retry mechanisms
- **Rate Limiting**: Enforce resource usage limits
- **Event Communication**: Publish execution events via NATS
- **Cost Tracking**: Track token usage and execution costs

## Features

### Execution Models

- **Event-Driven**: Triggered by NATS events
- **Scheduled**: Temporal workflow-based scheduling
- **On-Demand**: Direct API invocations
- **Continuous**: Long-running agent processes

### Memory System

#### Short-Term Memory (Redis)
- Fast key-value storage
- TTL-based expiration (default: 1 hour)
- Session and context storage

#### Long-Term Memory (Qdrant)
- Vector-based semantic search
- RAG (Retrieval-Augmented Generation)
- Persistent knowledge base

#### Episodic Memory (PostgreSQL)
- Event and interaction history
- Structured data queries
- Long-term retention

#### Shared Memory
- Cross-agent communication
- Shared knowledge pools
- Collaborative tasks

### Sandbox Execution

- Isolated VM2 sandbox
- Limited module access
- Resource constraints
- Timeout protection
- Input/output validation

## Memory API

Agents have access to a memory API within their execution context:

```javascript
// Store memory
const memoryId = await memory.store(
  'long_term', 
  'Important information',
  { category: 'knowledge', tags: ['important'] }
);

// Retrieve memory
const memories = await memory.retrieve(
  'long_term',
  'search query',
  10 // limit
);

// Delete memory
await memory.delete(memoryId);
```

## Storage API

Agents can store and retrieve artifacts:

```javascript
// Upload artifact
const artifact = await storage.upload(
  'report.pdf',
  buffer,
  { contentType: 'application/pdf' }
);

// Download artifact
const content = await storage.download(artifactId);

// List artifacts
const artifacts = await storage.list();
```

## Configuration

See `.env.example` for all configuration options.

Key configuration areas:

- **Database**: PostgreSQL for state persistence
- **Redis**: Short-term memory storage
- **Qdrant**: Vector database for long-term memory
- **MinIO**: Object storage for artifacts
- **NATS**: Event queue and communication
- **OpenAI**: Embeddings and LLM integration
- **Sandbox**: Execution environment limits

## Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Build the service
npm run build

# Run migrations (from project root)
psql -U postgres -d ubinexus -f ../../migrations/011_create_agent_tables.sql

# Start the service
npm start

# Development mode with auto-reload
npm run dev
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run integration tests
npm run test:integration

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Docker

```bash
# Build Docker image
docker build -t agent-runner:latest .

# Run container
docker run --env-file .env agent-runner:latest
```

## Architecture

```
┌─────────────────────────────────────────────┐
│            Agent Runner                     │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │        Execution Queue (NATS)        │  │
│  └──────────────────────────────────────┘  │
│                      │                       │
│                      ▼                       │
│  ┌──────────────────────────────────────┐  │
│  │        Agent Runtime (VM2)           │  │
│  │  ┌────────────────────────────────┐  │  │
│  │  │   Sandboxed Execution          │  │  │
│  │  │   - Memory API                 │  │  │
│  │  │   - Storage API                │  │  │
│  │  │   - Limited Globals            │  │  │
│  │  └────────────────────────────────┘  │  │
│  └──────────────────────────────────────┘  │
│           │            │            │       │
│           ▼            ▼            ▼       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Memory  │  │ Storage  │  │   State  │  │
│  │ Manager  │  │ Manager  │  │Persistence│  │
│  └──────────┘  └──────────┘  └──────────┘  │
│       │              │              │       │
└───────┼──────────────┼──────────────┼───────┘
        │              │              │
        ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌──────────┐
│   Redis     │ │    MinIO    │ │PostgreSQL│
│   Qdrant    │ │             │ │          │
└─────────────┘ └─────────────┘ └──────────┘
```

## Agent Code Example

```javascript
// Agent execution entry point
async function main() {
  // Access input
  console.log('Input:', input);
  
  // Store short-term memory
  await memory.store('short_term', 'Processing started', {
    timestamp: new Date()
  });
  
  // Retrieve long-term memory
  const knowledge = await memory.retrieve('long_term', 'relevant context', 5);
  
  // Perform agent logic
  const result = await processTask(input, knowledge);
  
  // Store artifact
  await storage.upload(
    'result.json',
    Buffer.from(JSON.stringify(result)),
    { contentType: 'application/json' }
  );
  
  // Return output
  return result;
}
```

## Security

- Sandboxed execution with limited globals
- No filesystem access (except storage API)
- No network access (except whitelisted)
- Resource limits enforced
- Input validation and sanitization
- Rate limiting per agent

## Performance

- Concurrent execution support (configurable max)
- Checkpoint-based pause/resume
- Efficient memory management
- MinIO for scalable artifact storage
- Vector search optimization with Qdrant

## License

MIT
