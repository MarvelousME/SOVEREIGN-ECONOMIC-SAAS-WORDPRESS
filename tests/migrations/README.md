# Migration Integration Test

This directory contains integration tests for the database migrations.

## Test Script

`migration-integration.test.mjs` - Tests all migrations against a fresh database.

### Features

- Connects to a fresh database and drops all existing tables
- Applies all migrations in numerical order
- Detects duplicate migration numbers
- Verifies no circular foreign key dependencies
- Reports success/failure for each migration
- Verifies schema integrity after migrations

## Running the Test

### Prerequisites

1. Ensure PostgreSQL is running and accessible
2. Create the target database if it doesn't exist:

```bash
createdb ubi_dev
```

3. Install dependencies:

```bash
cd migrations
npm install
```

### Run with Node.js

```bash
node tests/migrations/migration-integration.test.mjs
```

### Environment Variables

The test uses these environment variables (defaults shown):

| Variable | Default | Description |
|----------|---------|-------------|
| DB_HOST | localhost | PostgreSQL host |
| DB_PORT | 5432 | PostgreSQL port |
| DB_NAME | ubi_dev | Database name |
| DB_USER | postgres | Database user |
| DB_PASSWORD | devpassword123 | Database password |

### Using Docker

If using Docker Compose:

```bash
# Start the database
docker compose -f docker-compose.local.yml up -d postgres

# Wait for postgres to be healthy
docker compose -f docker-compose.local.yml ps

# Run the test
docker compose -f docker-compose.local.yml exec -T postgres psql -U postgres -d ubi_dev -c "SELECT 1"

# Or run the test script from host
node tests/migrations/migration-integration.test.mjs
```

## Issues Found

### Duplicate Migration Numbers

The following migration numbers have duplicate files:

- **006**: `006_auth_tables.sql`, `006_create_task_marketplace_schema.sql`
- **007**: `007_governance_schema.sql`, `007_create_rewards_reputation_schema.sql`, `007_create_task_marketplace_tables.sql`
- **008**: `008_data_vault_schema.sql`, `008_create_agent_economy_schema.sql`, `008_create_referral_tables.sql`, `008_rewards_reputation_schema.sql`

The `000_run_all_migrations.sql` master file only includes the first occurrence of each number.

### Missing Migrations in Master Runner

Migrations 012-029 are NOT included in `000_run_all_migrations.sql`. Only migrations 001-011 are run by the master.

## Expected Output

```
=== Migration Integration Test ===

Database: ubi_dev@localhost:5432
Migrations directory: .../migrations

Database connection: OK

Dropping all existing tables for fresh migration test...
All tables dropped successfully.

Found 36 migration files

Migration execution order:

[ 1/36] 001_create_extensions.sql... OK (45ms)
[ 2/36] 002_create_iam_schema.sql... OK (123ms)
[ 3/36] 003_create_ledger_schema.sql... OK (89ms)
...

=== Migration Test Summary ===

Total migrations: 36
Successful: 36
Failed: 0
Skipped (duplicates): 0
Duplicate numbers found: 4

✓ ALL MIGRATIONS PASSED
```

## Fixing Duplicate Numbers

To fix duplicate migration numbers, rename files to use unique sequential numbers:

1. Identify all duplicates
2. Rename files to fill gaps (e.g., 006a, 006b, etc.)
3. Update `000_run_all_migrations.sql` to include all files in order
4. Re-run the test
