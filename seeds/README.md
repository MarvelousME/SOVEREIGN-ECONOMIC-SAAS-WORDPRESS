# UBI-CMS Seed Data

This directory contains seed data for development and testing.

## Seed Files

| File | Description |
|------|-------------|
| `001_seed_development_data.sql` | Development seed data with test accounts, tenants, and sample data |

## Running Seed Files

```bash
# Run all seeds
psql -U postgres -d ubi_cms -f seeds/001_seed_development_data.sql

# Or with Docker
docker exec -i ubi-postgres psql -U postgres -d ubi_cms < seeds/001_seed_development_data.sql
```

## What's Included

### Tenants (3)
1. **ACME Corporation** (`acme-corp`) - Enterprise plan
2. **Demo Community** (`demo-community`) - Professional plan  
3. **Startup Inc** (`startup-inc`) - Starter plan (trial)

### Users (5)
All users have password: `password123`

**ACME Corporation:**
- `admin@acme-corp.test` - Owner/Admin
- `alice@acme-corp.test` - Member
- `bob@acme-corp.test` - Member

**Demo Community:**
- `admin@demo-community.test` - Owner
- `charlie@demo-community.test` - Member

### UBI Pools (3)
- Universal Basic Income Pool ($25,000)
- Task Completion Bonus Pool ($10,000)
- Community UBI Pool ($5,000)

### Tasks (3)
- Build API Endpoint (Intermediate, $150)
- Design Dashboard UI (Advanced, $200)
- Write Blog Post (Beginner, $50)

### Treasury Vaults (3)
- Operational Vault ($15,000)
- Reserve Vault ($30,000)
- Investment Vault ($20,000)

### Ledger Accounts (5)
- Cash Account ($50,000)
- UBI Pool Liability
- Equity Account
- Revenue Account
- Expense Account

### And More...
- Task categories and skills
- Achievements
- Reputation scores
- Governance config and proposals
- AI agents
- Notifications

## Security Notes

⚠️ **WARNING**: This seed data is for **DEVELOPMENT ONLY**

- All passwords are weak and public
- API keys and secrets are fake
- Data is not representative of production volumes
- RLS is temporarily disabled during seeding

**NEVER** use this seed data in production!

## Customizing Seed Data

To add your own seed data:

1. Copy an existing seed file
2. Modify the data to match your needs
3. Run the seed file

```sql
-- Example: Add custom tenant
INSERT INTO tenants (slug, name, plan, status) VALUES
('my-org', 'My Organization', 'professional', 'active');
```

## Clearing Seed Data

To remove all seed data and start fresh:

```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE ubi_cms;"
psql -U postgres -c "CREATE DATABASE ubi_cms;"

# Re-run migrations
psql -U postgres -d ubi_cms -f migrations/000_run_all_migrations.sql

# Re-run seeds
psql -U postgres -d ubi_cms -f seeds/001_seed_development_data.sql
```

## Testing with Seed Data

### Test Authentication
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@acme-corp.test", "password": "password123"}'
```

### Test Multi-tenancy
```sql
-- Set tenant context
SET app.current_tenant_id = 1;

-- Query tenant-specific data
SELECT * FROM users;
SELECT * FROM ubi_pools;
```

### Test UBI Distribution
```sql
-- Check eligible users
SELECT * FROM ubi_eligibility WHERE eligible = true;

-- Simulate distribution
INSERT INTO ubi_distributions (pool_id, user_id, amount, distribution_type, status)
VALUES (1, 2, 500.00, 'periodic', 'completed');
```

### Test Task Assignment
```sql
-- Assign task to user
UPDATE tasks SET assigned_to = 2, status = 'assigned' WHERE id = 1;

-- Submit task
INSERT INTO task_submissions (task_id, user_id, proof_of_work, status)
VALUES (1, 2, '{"github_pr": "https://github.com/org/repo/pull/123"}', 'pending');
```

### Test Governance
```sql
-- Cast vote
INSERT INTO votes (proposal_id, voter_id, vote_type, voting_power)
VALUES (1, 2, 'for', 1);

-- Check proposal status
SELECT * FROM proposals WHERE id = 1;
```

## Data Volumes

The seed file creates approximately:
- 3 tenants
- 5 users
- 3 UBI pools
- 5 ledger accounts
- 3 treasury vaults
- 4 task categories
- 5 skills
- 3 tasks
- 3 achievements
- 2 AI agents
- 2 proposals
- And related data

Total: ~100 records across all tables

## Performance Testing

For performance testing, you may want to generate larger datasets:

```sql
-- Generate 1000 test users
INSERT INTO users (tenant_id, username, email, password_hash, status)
SELECT 
    1,
    'user' || i,
    'user' || i || '@test.com',
    '$2a$10$JQGlN8xqr.JmB9jVV4gVPuWxCJZqSQKxB/r0qQqH5vZmq6jZJqT8S',
    'active'
FROM generate_series(1, 1000) AS i;
```

## Support

For issues with seed data:
- Check migration status first
- Verify database permissions
- Review transaction logs
- Ensure RLS is properly configured
