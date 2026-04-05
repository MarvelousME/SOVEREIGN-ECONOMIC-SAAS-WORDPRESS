# Ledger Service

A complete double-entry ledger service for the UBI-CMS platform. This service provides the foundational financial infrastructure for all monetary operations.

## Features

- ✅ **Double-Entry Accounting** - Every transaction has balanced debits and credits
- ✅ **Multi-Currency Support** - Handle transactions in any currency
- ✅ **ACID Compliance** - Database transactions ensure atomicity
- ✅ **Optimistic Locking** - Prevents concurrent balance update conflicts
- ✅ **Idempotency** - Safe transaction retries with idempotency keys
- ✅ **Transaction Reversal** - Reverse any completed transaction
- ✅ **Event Publishing** - Publishes events via NATS for event-driven architecture
- ✅ **Tenant Isolation** - Multi-tenant with complete data isolation
- ✅ **Audit Trail** - Full history of all financial operations
- ✅ **Account Statements** - Generate statements for any period

## Account Types

The service supports five account types following standard accounting principles:

- **ASSET** - Increases with debits (e.g., Cash, Bank Accounts, Accounts Receivable)
- **LIABILITY** - Increases with credits (e.g., Loans, Accounts Payable)
- **EQUITY** - Increases with credits (e.g., Owner's Capital, Retained Earnings)
- **REVENUE** - Increases with credits (e.g., Sales, Interest Income)
- **EXPENSE** - Increases with debits (e.g., Salaries, Rent, Utilities)

## API Endpoints

### Accounts

#### Create Account
```http
POST /api/v1/ledger/accounts
Headers:
  x-tenant-id: {tenant-id}
  Authorization: Bearer {token}
Body:
{
  "code": "1000",
  "name": "Cash",
  "type": "ASSET",
  "currency": "USD",
  "parent_id": "optional-parent-uuid",
  "metadata": {}
}
```

#### Get Account
```http
GET /api/v1/ledger/accounts/{id}
Headers:
  x-tenant-id: {tenant-id}
  Authorization: Bearer {token}
```

#### Get Account Balance
```http
GET /api/v1/ledger/accounts/{id}/balance
Headers:
  x-tenant-id: {tenant-id}
  Authorization: Bearer {token}
```

#### Get Account Statement
```http
GET /api/v1/ledger/accounts/{id}/statement?start_date=2024-01-01T00:00:00Z&end_date=2024-12-31T23:59:59Z
Headers:
  x-tenant-id: {tenant-id}
  Authorization: Bearer {token}
```

#### Get Account History
```http
GET /api/v1/ledger/accounts/{id}/history?limit=100&offset=0
Headers:
  x-tenant-id: {tenant-id}
  Authorization: Bearer {token}
```

### Transactions

#### Create Transaction
```http
POST /api/v1/ledger/transactions
Headers:
  x-tenant-id: {tenant-id}
  Authorization: Bearer {token}
Body:
{
  "reference": "INV-001",
  "description": "Sale of goods",
  "transaction_date": "2024-01-15T10:30:00Z",
  "idempotency_key": "optional-uuid",
  "entries": [
    {
      "account_id": "cash-account-uuid",
      "type": "DEBIT",
      "amount": "100.00",
      "currency": "USD"
    },
    {
      "account_id": "revenue-account-uuid",
      "type": "CREDIT",
      "amount": "100.00",
      "currency": "USD"
    }
  ],
  "metadata": {}
}
```

#### Get Transaction
```http
GET /api/v1/ledger/transactions/{id}
Headers:
  x-tenant-id: {tenant-id}
  Authorization: Bearer {token}
```

#### Reverse Transaction
```http
POST /api/v1/ledger/transactions/{id}/reverse
Headers:
  x-tenant-id: {tenant-id}
  Authorization: Bearer {token}
```

## Events Published

The service publishes the following events via NATS:

- `ledger.account.created` - When a new account is created
- `ledger.transaction.created` - When a transaction is completed
- `ledger.transaction.reversed` - When a transaction is reversed
- `ledger.balance.updated` - When an account balance changes

Event format:
```json
{
  "type": "ledger.transaction.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "tenant_id": "tenant-uuid",
  "data": { ... }
}
```

## Example Transactions

### Simple Sale
Debit Cash, Credit Revenue:
```json
{
  "reference": "SALE-001",
  "description": "Product sale",
  "entries": [
    { "account_id": "cash", "type": "DEBIT", "amount": "100.00", "currency": "USD" },
    { "account_id": "revenue", "type": "CREDIT", "amount": "100.00", "currency": "USD" }
  ]
}
```

### UBI Payment Distribution
```json
{
  "reference": "UBI-PAYMENT-202401",
  "description": "Monthly UBI payment",
  "entries": [
    { "account_id": "ubi-reserve", "type": "DEBIT", "amount": "1000.00", "currency": "USD" },
    { "account_id": "user-wallet-1", "type": "CREDIT", "amount": "500.00", "currency": "USD" },
    { "account_id": "user-wallet-2", "type": "CREDIT", "amount": "500.00", "currency": "USD" }
  ]
}
```

### Purchase with Multiple Accounts
```json
{
  "reference": "PO-001",
  "description": "Office supplies purchase",
  "entries": [
    { "account_id": "office-expense", "type": "DEBIT", "amount": "150.00", "currency": "USD" },
    { "account_id": "cash", "type": "CREDIT", "amount": "100.00", "currency": "USD" },
    { "account_id": "accounts-payable", "type": "CREDIT", "amount": "50.00", "currency": "USD" }
  ]
}
```

## Installation

### Local Development

1. **Install dependencies:**
```bash
cd services/ledger-service
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Setup database:**
```bash
# Run migrations (assumes PostgreSQL is running)
psql -h localhost -U ubi_user -d ubi_cms -f migrations/001_init_ledger.sql
```

4. **Run in development mode:**
```bash
npm run dev
```

5. **Run tests:**
```bash
npm test
```

### Docker Deployment

1. **Build image:**
```bash
docker build -t ledger-service:latest .
```

2. **Run container:**
```bash
docker run -d \
  --name ledger-service \
  -p 3001:3001 \
  -e DB_HOST=postgres \
  -e DB_NAME=ubi_cms \
  -e DB_USER=ubi_user \
  -e DB_PASSWORD=ubi_password \
  -e NATS_URL=nats://nats:4222 \
  ledger-service:latest
```

### Docker Compose

Add to your `docker-compose.yml`:
```yaml
services:
  ledger-service:
    build: ./services/ledger-service
    ports:
      - "3001:3001"
    environment:
      DB_HOST: postgres
      DB_NAME: ubi_cms
      DB_USER: ubi_user
      DB_PASSWORD: ${DB_PASSWORD}
      NATS_URL: nats://nats:4222
    depends_on:
      - postgres
      - nats
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/health')"]
      interval: 30s
      timeout: 3s
      retries: 3
```

## Configuration

Environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `ubi_cms` |
| `DB_USER` | Database user | `ubi_user` |
| `DB_PASSWORD` | Database password | - |
| `DB_POOL_MIN` | Min pool connections | `2` |
| `DB_POOL_MAX` | Max pool connections | `10` |
| `NATS_URL` | NATS server URL | `nats://localhost:4222` |
| `LOG_LEVEL` | Log level | `info` |

## Database Schema

### Tables

- **ledger_accounts** - Chart of accounts
- **ledger_transactions** - Transaction headers
- **ledger_entries** - Individual debit/credit entries

See `migrations/001_init_ledger.sql` for complete schema.

## Architecture

### Double-Entry Bookkeeping

Every transaction must have:
1. At least 2 entries
2. Balanced debits and credits (sum of debits = sum of credits)
3. All entries in the same currency per transaction

### Optimistic Locking

Account balances use version numbers to prevent lost updates:
```sql
UPDATE ledger_accounts 
SET balance = $1, version = version + 1 
WHERE id = $2 AND version = $3
```

### Transaction Atomicity

All operations use database transactions:
```typescript
await db.transaction(async (client) => {
  // Create transaction
  // Create entries
  // Update balances
  // All or nothing
});
```

## Security

- **Tenant Isolation** - All queries filtered by `tenant_id`
- **Authentication** - Bearer token required for all endpoints
- **Input Validation** - Zod schemas validate all inputs
- **SQL Injection Protection** - Parameterized queries only
- **Rate Limiting** - Recommended to add at API gateway level

## Monitoring

### Health Check
```bash
curl http://localhost:3001/health
```

Response:
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

### Logs

Structured JSON logs via Winston:
- Request/response logging
- Error tracking with stack traces
- Database query performance
- Event publishing confirmation

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run only unit tests
npm test -- --testPathPattern=unit

# Run only integration tests
npm run test:integration

# Watch mode
npm run test:watch
```

## Performance Considerations

1. **Indexes** - All foreign keys and tenant queries are indexed
2. **Connection Pooling** - PostgreSQL connection pool (2-10 connections)
3. **Row Locking** - `FOR UPDATE` prevents concurrent balance conflicts
4. **Batch Operations** - Consider batch APIs for high-volume scenarios
5. **Statement Queries** - Use date range limits to prevent large result sets

## Troubleshooting

### Database Connection Failed
- Verify PostgreSQL is running
- Check `DB_HOST` and `DB_PORT`
- Verify credentials in `.env`

### Unbalanced Transaction Error
- Ensure debits equal credits
- Check for floating point precision (use strings for amounts)
- Verify all entries use same currency

### Version Conflict on Balance Update
- Indicates concurrent update detected
- Client should retry the entire transaction
- Consider implementing exponential backoff

## Future Enhancements

- [ ] Multi-currency transactions (automatic conversion)
- [ ] Batch transaction API
- [ ] Account closing/archiving
- [ ] Fiscal period closing
- [ ] Trial balance generation
- [ ] Financial reports (P&L, Balance Sheet)
- [ ] Budget tracking
- [ ] Approval workflows
- [ ] GraphQL API

## License

MIT

## Support

For issues and questions, please open an issue in the UBI-CMS repository.
