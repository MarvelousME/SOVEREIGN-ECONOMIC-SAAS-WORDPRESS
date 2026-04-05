# Treasury Engine - Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 15+ running
- Redis running
- NATS server running
- Temporal server running (optional for workflows)
- OPA server running (optional for policy enforcement)

## Installation

```bash
cd services/treasury-engine
npm install
```

## Configuration

1. Copy environment file:
```bash
cp .env.example .env
```

2. Edit `.env` with your settings:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=treasury_db
DB_USER=postgres
DB_PASSWORD=postgres

# NATS
NATS_URL=nats://localhost:4222

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Temporal (optional)
TEMPORAL_ADDRESS=localhost:7233

# OPA (optional)
OPA_URL=http://localhost:8181

# Ledger Service
LEDGER_SERVICE_URL=http://localhost:3001
```

## Database Setup

```bash
# Build the project first
npm run build

# Initialize database tables
node dist/config/database.js

# Seed pre-defined strategies
node dist/scripts/seed-strategies.js
```

## Running the Service

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

### Using Docker
```bash
# Build and run with all dependencies
docker-compose up -d

# View logs
docker-compose logs -f treasury-engine

# Stop
docker-compose down
```

## Testing the API

### Health Check
```bash
curl http://localhost:3004/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "treasury-engine",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### List Strategies
```bash
curl http://localhost:3004/api/v1/treasury/strategies
```

Expected response:
```json
{
  "strategies": [
    {
      "id": "uuid",
      "name": "Conservative Yield",
      "type": "conservative",
      "risk_level": 2,
      "target_apy": 5.5,
      ...
    }
  ],
  "total": 5
}
```

### Create a Vault
```bash
curl -X POST http://localhost:3004/api/v1/treasury/vaults \
  -H "Content-Type: application/json" \
  -H "x-user-id: user123" \
  -d '{
    "name": "My First Vault",
    "description": "Conservative strategy vault",
    "currency": "USDC",
    "strategy_id": "<strategy-uuid-from-above>",
    "compounding_frequency": "daily"
  }'
```

### Make a Deposit
```bash
curl -X POST http://localhost:3004/api/v1/treasury/deposit \
  -H "Content-Type: application/json" \
  -H "x-user-id: user123" \
  -d '{
    "vault_id": "<vault-uuid-from-above>",
    "amount": "1000.50"
  }'
```

### Check Vault Balance
```bash
curl http://localhost:3004/api/v1/treasury/vaults/<vault-uuid>
```

### View Performance Metrics
```bash
curl "http://localhost:3004/api/v1/treasury/vaults/<vault-uuid>/performance?period=30d"
```

## Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Integration tests only
npm run test:integration

# With coverage
npm test -- --coverage
```

## Common Issues

### Database Connection Failed
- Ensure PostgreSQL is running
- Check DB credentials in `.env`
- Verify database exists: `createdb treasury_db`

### NATS Connection Failed
- Start NATS server: `docker run -p 4222:4222 nats:latest`
- Or install locally and run: `nats-server`

### Redis Connection Failed
- Start Redis: `docker run -p 6379:6379 redis:alpine`
- Or use local Redis: `redis-server`

### OPA Permission Denied
- For testing, you can skip OPA by modifying the service
- Or run OPA: `docker run -p 8181:8181 openpolicyagent/opa run --server`
- Load policies: Place `opa/policies/treasury.rego` in OPA

## Development Workflow

1. **Make changes** to TypeScript files in `src/`
2. **Run typechecking**: `npm run typecheck`
3. **Run tests**: `npm test`
4. **Build**: `npm run build`
5. **Test locally**: `npm run dev`

## Project Structure

```
treasury-engine/
├── src/
│   ├── activities/         # Temporal workflow activities
│   ├── workflows/          # Temporal workflows (4 workflows)
│   ├── controllers/        # HTTP request handlers
│   ├── routes/             # API route definitions
│   ├── services/           # Business logic layer
│   ├── repositories/       # Data access layer
│   ├── middleware/         # Express middleware
│   ├── config/             # Configuration
│   ├── types/              # TypeScript types
│   ├── utils/              # Utility functions
│   └── index.ts            # Application entry point
├── opa/                    # OPA policy files
├── tests/                  # Test files
└── package.json
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:integration` - Run integration tests
- `npm run lint` - Lint code
- `npm run typecheck` - Check TypeScript types

## Next Steps

1. **Integrate with Ledger Service**: Ensure ledger-service is running on port 3001
2. **Set up Temporal**: Configure Temporal for workflow execution
3. **Configure OPA**: Set up permission policies
4. **Add Protocol Integrations**: Implement actual DeFi protocol connectors
5. **Deploy**: Use Docker Compose for production deployment

## Support

For issues or questions:
- Check logs: `tail -f combined.log`
- Review error logs: `tail -f error.log`
- Check service health: `curl http://localhost:3004/health`

## Production Checklist

- [ ] Environment variables configured
- [ ] Database initialized and migrated
- [ ] Strategies seeded
- [ ] NATS connection verified
- [ ] Redis connection verified
- [ ] OPA policies loaded
- [ ] Ledger service integration tested
- [ ] Temporal workflows deployed
- [ ] Health check passing
- [ ] Tests passing
- [ ] Logging configured
- [ ] Monitoring set up
- [ ] Backup strategy in place

Happy building! 🚀
