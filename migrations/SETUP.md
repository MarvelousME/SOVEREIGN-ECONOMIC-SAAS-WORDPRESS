# UBI-CMS Database Setup Guide

Complete guide for setting up the UBI-CMS PostgreSQL database.

## Prerequisites

- PostgreSQL 12+ installed
- `psql` command-line tool
- Superuser access to PostgreSQL

## Quick Start

```bash
# 1. Create database and user
createdb ubi_cms
createuser ubi_user -P

# 2. Run migrations
cd migrations
psql -d ubi_cms -f 000_run_all_migrations.sql

# 3. Load seed data (optional, for development)
cd ../seeds
psql -d ubi_cms -f 001_seed_development_data.sql
```

## Detailed Setup

### Step 1: Install PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

**macOS (Homebrew):**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Windows:**
Download from https://www.postgresql.org/download/windows/

### Step 2: Create Database

```bash
# Connect as postgres user
sudo -u postgres psql

# Or on Windows/macOS
psql -U postgres
```

```sql
-- Create database
CREATE DATABASE ubi_cms;

-- Create user
CREATE USER ubi_user WITH PASSWORD 'your_secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ubi_cms TO ubi_user;

-- Connect to database
\c ubi_cms

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO ubi_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ubi_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ubi_user;

-- Exit
\q
```

### Step 3: Configure Environment

Create `.env` file:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ubi_cms
DB_USER=ubi_user
DB_PASSWORD=your_secure_password_here
DB_SSL=false

# Connection Pool
DB_POOL_MIN=2
DB_POOL_MAX=10

# Application
NODE_ENV=development
PORT=3000
```

### Step 4: Run Migrations

```bash
# Navigate to migrations directory
cd migrations

# Run all migrations
psql -d ubi_cms -f 000_run_all_migrations.sql

# Or run individually
psql -d ubi_cms -f 001_create_extensions.sql
psql -d ubi_cms -f 002_create_iam_schema.sql
# ... etc
```

### Step 5: Verify Installation

```sql
-- Connect to database
psql -d ubi_cms

-- Check tables
\dt

-- Check extensions
\dx

-- Check table counts
SELECT 
    schemaname,
    COUNT(*) as table_count
FROM pg_tables 
WHERE schemaname = 'public'
GROUP BY schemaname;

-- Sample query
SELECT * FROM tenants LIMIT 5;
```

### Step 6: Load Seed Data (Development Only)

```bash
# Load development seed data
psql -d ubi_cms -f seeds/001_seed_development_data.sql

# Verify
psql -d ubi_cms -c "SELECT COUNT(*) FROM users;"
```

## Docker Setup

### Using Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    container_name: ubi-postgres
    environment:
      POSTGRES_DB: ubi_cms
      POSTGRES_USER: ubi_user
      POSTGRES_PASSWORD: your_secure_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d/migrations
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ubi_user -d ubi_cms"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

Run:

```bash
# Start PostgreSQL
docker-compose up -d

# Run migrations
docker exec -i ubi-postgres psql -U ubi_user -d ubi_cms < migrations/000_run_all_migrations.sql

# Load seeds
docker exec -i ubi-postgres psql -U ubi_user -d ubi_cms < seeds/001_seed_development_data.sql
```

## Connection Strings

### Node.js (pg)
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true',
  max: 10,
  idleTimeoutMillis: 30000,
});
```

### Prisma
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

`.env`:
```
DATABASE_URL="postgresql://ubi_user:your_password@localhost:5432/ubi_cms"
```

### TypeORM
```typescript
import { DataSource } from "typeorm";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: ["src/entities/**/*.ts"],
});
```

## Row-Level Security (RLS)

All tables have RLS enabled. To query data, set the tenant context:

```sql
-- Set current tenant
SET app.current_tenant_id = 1;

-- Now queries are automatically filtered
SELECT * FROM users;
SELECT * FROM ubi_pools;

-- Reset
RESET app.current_tenant_id;
```

In application code:

```javascript
// Set tenant context for connection
await client.query('SET app.current_tenant_id = $1', [tenantId]);

// All subsequent queries in this transaction are tenant-scoped
const users = await client.query('SELECT * FROM users');
```

## Performance Tuning

### PostgreSQL Configuration

Edit `postgresql.conf`:

```conf
# Memory
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
work_mem = 16MB

# Connections
max_connections = 100

# Query Planner
random_page_cost = 1.1
effective_io_concurrency = 200

# Write Ahead Log
wal_buffers = 16MB
checkpoint_completion_target = 0.9
```

### Monitoring

```sql
-- Check slow queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '5 seconds';

-- Table sizes
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

## Backup & Restore

### Backup

```bash
# Full database backup
pg_dump -U ubi_user -d ubi_cms -F c -f ubi_cms_backup.dump

# Schema only
pg_dump -U ubi_user -d ubi_cms -s -f schema.sql

# Data only
pg_dump -U ubi_user -d ubi_cms -a -f data.sql

# Specific tables
pg_dump -U ubi_user -d ubi_cms -t users -t tenants -F c -f ubi_cms_partial.dump
```

### Restore

```bash
# From custom dump
pg_restore -U ubi_user -d ubi_cms_new ubi_cms_backup.dump

# From SQL file
psql -U ubi_user -d ubi_cms_new -f schema.sql
psql -U ubi_user -d ubi_cms_new -f data.sql
```

### Automated Backups (Cron)

```bash
# Add to crontab
0 2 * * * /usr/bin/pg_dump -U ubi_user ubi_cms -F c -f /backups/ubi_cms_$(date +\%Y\%m\%d).dump
```

## Troubleshooting

### Connection Issues

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check if port is open
netstat -an | grep 5432

# Test connection
psql -h localhost -U ubi_user -d ubi_cms -c "SELECT 1;"
```

### Permission Issues

```sql
-- Grant all privileges to user
GRANT ALL PRIVILEGES ON DATABASE ubi_cms TO ubi_user;
GRANT ALL ON SCHEMA public TO ubi_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO ubi_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO ubi_user;
```

### RLS Issues

```sql
-- Disable RLS temporarily (for debugging)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Re-enable
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

### Migration Errors

```bash
# Rollback last migration
psql -d ubi_cms -c "BEGIN; DROP TABLE ...; COMMIT;"

# Check migration status
psql -d ubi_cms -c "\dt"

# Re-run specific migration
psql -d ubi_cms -f migrations/002_create_iam_schema.sql
```

## Production Deployment

1. **Use strong passwords**
2. **Enable SSL connections**
3. **Configure firewall** (allow only application servers)
4. **Set up replication** (for high availability)
5. **Configure automated backups**
6. **Monitor performance** (pg_stat_statements, pg_stat_user_tables)
7. **Set up alerting** (disk space, connections, slow queries)
8. **Use connection pooling** (PgBouncer, pgpool-II)

## Next Steps

- Review [migrations/README.md](README.md) for migration details
- Check [seeds/README.md](../seeds/README.md) for seed data info
- Read API documentation for integration
- Set up monitoring and alerting
- Configure automated backups

## Support

For issues or questions:
- Check PostgreSQL logs: `/var/log/postgresql/`
- Review migration output
- Verify extension availability
- Check RLS configuration
