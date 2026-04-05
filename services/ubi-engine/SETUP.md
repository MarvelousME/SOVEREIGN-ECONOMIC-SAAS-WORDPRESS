# UBI Engine - Quick Setup Guide

## Prerequisites

Ensure you have the following installed and running:

- **Node.js** 18+ (`node --version`)
- **PostgreSQL** 14+ (`psql --version`)
- **Redis** 7+ (`redis-cli --version`)
- **NATS Server** 2.9+ (`nats-server --version`)
- **Temporal Server** 1.20+ (optional for workflows)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
cd services/ubi-engine
npm install
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit with your configuration
nano .env  # or use your preferred editor
```

**Required Environment Variables:**
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ubi_engine
DB_USER=ubi_user
DB_PASSWORD=your_secure_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# NATS
NATS_URL=nats://localhost:4222

# JWT Secret (generate a secure key)
JWT_SECRET=your-very-secure-secret-key-min-32-chars
```

### 3. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE ubi_engine;
CREATE USER ubi_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE ubi_engine TO ubi_user;
\q
```

### 4. Run Database Migrations

```bash
# Apply schema migrations
psql -U ubi_user -d ubi_engine -f src/database/migrations/001_init.sql
```

**Verify tables created:**
```bash
psql -U ubi_user -d ubi_engine -c "\dt"
```

You should see:
- ubi_pools
- distribution_rules
- user_eligibility
- distribution_history
- user_distributions
- user_ubi_balances
- activity_events
- contribution_records
- abuse_tracking

### 5. Start Redis

```bash
# Start Redis server
redis-server

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

### 6. Start NATS Server

```bash
# Start NATS server
nats-server

# Verify NATS is running
curl http://localhost:8222/varz
```

### 7. Start Temporal (Optional)

```bash
# Using Docker
docker run --network=host --rm temporalio/auto-setup:latest

# Or using Temporal CLI
temporal server start-dev
```

### 8. Start UBI Engine Service

**Development Mode:**
```bash
npm run dev
```

**Production Mode:**
```bash
# Build TypeScript
npm run build

# Start service
npm start
```

### 9. Verify Service is Running

```bash
# Health check
curl http://localhost:3002/health

# Expected response:
{
  "status": "healthy",
  "services": {
    "database": "up",
    "cache": "up",
    "nats": "up"
  },
  "timestamp": "2024-03-26T..."
}
```

## Quick Test

### Create a UBI Pool

```bash
curl -X POST http://localhost:3002/api/v1/ubi/pool \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant1",
    "totalAmount": 1000000,
    "distributionInterval": "daily",
    "weights": {
      "equal": 0.4,
      "activity": 0.3,
      "contribution": 0.2,
      "reputation": 0.1
    }
  }'
```

### Simulate User Activity

```bash
# Insert test activity
psql -U ubi_user -d ubi_engine -c "
INSERT INTO activity_events (user_id, tenant_id, event_type, score_value)
VALUES 
  ('user1', 'tenant1', 'task_completed', 10),
  ('user2', 'tenant1', 'task_completed', 10),
  ('user3', 'tenant1', 'referral_converted', 25);
"
```

### Check Eligibility

```bash
curl "http://localhost:3002/api/v1/ubi/eligibility?userId=user1&tenantId=tenant1&poolId=<POOL_ID>"
```

### Trigger Distribution

```bash
curl -X POST http://localhost:3002/api/v1/ubi/distribute \
  -H "Content-Type: application/json" \
  -d '{
    "poolId": "<POOL_ID>",
    "tenantId": "tenant1"
  }'
```

### Check User Balance

```bash
curl "http://localhost:3002/api/v1/ubi/balance?userId=user1&tenantId=tenant1"
```

### Claim UBI

```bash
curl -X POST http://localhost:3002/api/v1/ubi/claim \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user1",
    "tenantId": "tenant1"
  }'
```

## Docker Deployment

### Build Image

```bash
docker build -t ubi-engine:latest .
```

### Run Container

```bash
docker run -d \
  --name ubi-engine \
  -p 3002:3002 \
  --env-file .env \
  ubi-engine:latest
```

### View Logs

```bash
docker logs -f ubi-engine
```

## Troubleshooting

### Database Connection Failed

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U ubi_user -d ubi_engine -c "SELECT 1;"
```

### Redis Connection Failed

```bash
# Check Redis is running
redis-cli ping

# Check Redis logs
sudo journalctl -u redis -f
```

### NATS Connection Failed

```bash
# Check NATS is running
curl http://localhost:8222/varz

# Check NATS logs
nats-server -V
```

### Port Already in Use

```bash
# Find process using port 3002
lsof -i :3002

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3003
```

### Migration Errors

```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE ubi_engine;"
psql -U postgres -c "CREATE DATABASE ubi_engine;"

# Re-run migrations
psql -U ubi_user -d ubi_engine -f src/database/migrations/001_init.sql
```

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test
npm test -- distribution-calculator.test.ts

# Watch mode
npm run test:watch
```

## Monitoring

### View Logs

```bash
# Combined logs
tail -f logs/combined.log

# Error logs only
tail -f logs/error.log
```

### Check Pool Stats

```bash
curl "http://localhost:3002/api/v1/ubi/stats?poolId=<POOL_ID>"
```

### Monitor Database

```bash
# Active connections
psql -U ubi_user -d ubi_engine -c "
SELECT count(*) FROM pg_stat_activity 
WHERE datname = 'ubi_engine';
"

# Table sizes
psql -U ubi_user -d ubi_engine -c "
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

## Next Steps

1. **Integrate with Ledger Service** - Connect for actual token transfers
2. **Setup Temporal Workflows** - Enable automated distributions
3. **Configure Anti-Abuse** - Fine-tune Sybil detection
4. **Add Authentication** - Protect admin endpoints
5. **Setup Monitoring** - Add Prometheus/Grafana
6. **Load Testing** - Test with realistic user counts

## Support

For issues or questions:
- Check logs: `logs/error.log`
- Review README: `README.md`
- Algorithm docs: `DISTRIBUTION_ALGORITHMS.md`
- GitHub Issues: [Create issue]

## Quick Reference

**Service Port:** 3002  
**Health Endpoint:** `GET /health`  
**API Base:** `/api/v1/ubi/`  
**Database:** PostgreSQL (port 5432)  
**Cache:** Redis (port 6379)  
**Message Bus:** NATS (port 4222)
