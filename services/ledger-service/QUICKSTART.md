# Ledger Service - Quick Start Guide

Get the ledger service running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ running
- NATS server running (optional - service works without it)

## Quick Setup

### 1. Install Dependencies

```bash
cd services/ledger-service
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ubi_cms
DB_USER=ubi_user
DB_PASSWORD=your_password
```

### 3. Initialize Database

```bash
# Make script executable (Unix/Mac)
chmod +x scripts/init-db.sh

# Run migration
./scripts/init-db.sh

# Or manually with psql
psql -h localhost -U ubi_user -d ubi_cms -f migrations/001_init_ledger.sql
```

### 4. Load Sample Data (Optional)

```bash
psql -h localhost -U ubi_user -d ubi_cms -f scripts/seed-sample-data.sql
```

### 5. Start the Service

```bash
# Development mode (auto-reload)
npm run dev

# Production mode
npm run build
npm start
```

Service will start on `http://localhost:3001`

### 6. Verify It's Running

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "ledger-service",
  "version": "1.0.0",
  "checks": {
    "database": "up",
    "nats": "up"
  }
}
```

## First API Calls

### Create an Account

```bash
curl -X POST http://localhost:3001/api/v1/ledger/accounts \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: test-tenant" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "code": "1000",
    "name": "Cash",
    "type": "ASSET",
    "currency": "USD"
  }'
```

### Create a Transaction

```bash
curl -X POST http://localhost:3001/api/v1/ledger/transactions \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: test-tenant" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "reference": "TEST-001",
    "description": "Test transaction",
    "entries": [
      {
        "account_id": "YOUR_ACCOUNT_ID_1",
        "type": "DEBIT",
        "amount": "100.00",
        "currency": "USD"
      },
      {
        "account_id": "YOUR_ACCOUNT_ID_2",
        "type": "CREDIT",
        "amount": "100.00",
        "currency": "USD"
      }
    ]
  }'
```

### Get Account Balance

```bash
curl http://localhost:3001/api/v1/ledger/accounts/YOUR_ACCOUNT_ID/balance \
  -H "x-tenant-id: test-tenant" \
  -H "Authorization: Bearer test-token"
```

## Docker Quick Start

```bash
# Build
docker build -t ledger-service .

# Run
docker run -d \
  -p 3001:3001 \
  -e DB_HOST=host.docker.internal \
  -e DB_NAME=ubi_cms \
  -e DB_USER=ubi_user \
  -e DB_PASSWORD=your_password \
  --name ledger-service \
  ledger-service
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage
```

## Common Issues

### "Database health check failed"
- Ensure PostgreSQL is running
- Verify credentials in `.env`
- Check if database `ubi_cms` exists

### "NATS connection failed"
- Service will continue to work
- Events won't be published
- Start NATS server: `docker run -d -p 4222:4222 nats`

### "Debits and credits must be equal"
- Check your transaction entries
- Ensure amounts match exactly
- Use strings for amounts to avoid floating point errors

## Next Steps

1. Read the full [README.md](README.md) for detailed documentation
2. Review the [database schema](migrations/001_init_ledger.sql)
3. Check out the [example transactions](README.md#example-transactions)
4. Implement proper authentication in production
5. Add API gateway with rate limiting
6. Set up monitoring and alerting

## Production Checklist

- [ ] Use proper JWT authentication
- [ ] Enable SSL/TLS
- [ ] Set up database backups
- [ ] Configure log aggregation
- [ ] Add rate limiting
- [ ] Set up health check monitoring
- [ ] Configure proper NATS clustering
- [ ] Review and adjust connection pool sizes
- [ ] Set up metrics and tracing
- [ ] Implement disaster recovery plan

## Support

For issues, check the [README.md](README.md) troubleshooting section or open an issue in the repository.
