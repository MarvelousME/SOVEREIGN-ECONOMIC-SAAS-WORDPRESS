# Treasury Engine Service

Multi-vault treasury management and yield optimization engine for the UBI-CMS platform.

## Features

- **Multi-Vault Management**: Create and manage multiple treasury vaults with different strategies
- **Yield Optimization**: Automated yield strategies (Conservative, Balanced, Aggressive)
- **Auto-Compounding**: Scheduled compounding workflows (hourly, daily, weekly, monthly)
- **Risk-Adjusted Rebalancing**: Automatic rebalancing based on drift thresholds
- **Performance Tracking**: Comprehensive APY and performance metrics
- **Liquidity Management**: Withdrawal queuing for large amounts
- **OPA Policy Integration**: Permission-based access control
- **Event-Driven Architecture**: NATS integration for real-time events
- **Ledger Integration**: Double-entry bookkeeping for all movements

## Architecture

```
treasury-engine/
├── src/
│   ├── activities/         # Temporal activities
│   ├── workflows/          # Temporal workflows
│   ├── controllers/        # HTTP controllers
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── repositories/       # Data access layer
│   ├── middleware/         # Express middleware
│   ├── config/             # Configuration
│   ├── types/              # TypeScript types
│   └── utils/              # Utilities
├── opa/                    # OPA policies
└── tests/                  # Test files
```

## API Endpoints

### Vaults
- `GET /api/v1/treasury/vaults` - List all vaults
- `POST /api/v1/treasury/vaults` - Create vault
- `GET /api/v1/treasury/vaults/:id` - Get vault details
- `GET /api/v1/treasury/vaults/:id/performance` - Get performance metrics

### Transactions
- `POST /api/v1/treasury/deposit` - Deposit to vault
- `POST /api/v1/treasury/withdraw` - Withdraw from vault

### Strategies
- `GET /api/v1/treasury/strategies` - List strategies
- `GET /api/v1/treasury/strategies/:id` - Get strategy details
- `POST /api/v1/treasury/allocate` - Allocate vault to strategy

### Rebalancing
- `POST /api/v1/treasury/rebalance` - Trigger rebalancing

## Yield Strategies

### 1. Conservative (5.5% APY, Risk: 2/10)
- Aave V3: 40%
- Compound V3: 30%
- MakerDAO DSR: 20%
- Curve 3pool: 10%

### 2. Balanced (12% APY, Risk: 5/10)
- Aave V3: 25%
- GMX: 20%
- Uniswap V3: 20%
- Yearn: 20%
- Convex: 15%

### 3. Aggressive (25% APY, Risk: 8/10)
- GMX: 30%
- Pendle: 25%
- Beefy Finance: 20%
- Stargate: 15%
- Uniswap V3 ETH/USDC: 10%

### 4. Stablecoin Only (4.5% APY, Risk: 1/10)
- Aave V3 USDC: 35%
- Compound USDT: 30%
- MakerDAO DSR: 25%
- Curve 3pool: 10%

### 5. DeFi Diversified (15.5% APY, Risk: 6/10)
- Diversified across lending, DEX, perps, vaults, and staking

## Temporal Workflows

### Auto-Compounding Workflow
- Runs on configurable schedule (hourly/daily/weekly/monthly)
- Harvests yield and compounds back into vaults
- Calculates and records performance fees

### Rebalancing Workflow
- Checks every 4 hours for drift
- Rebalances when drift exceeds threshold
- Minimizes gas fees through batching

### Yield Harvesting Workflow
- Runs every 6 hours
- Claims rewards from protocols
- Converts to base currency

### Risk Assessment Workflow
- Runs every 12 hours
- Assesses vault risk scores
- Pauses high-risk vaults automatically

## Installation

```bash
cd services/treasury-engine
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `NATS_URL`
- `REDIS_HOST`, `REDIS_PORT`
- `TEMPORAL_ADDRESS`
- `OPA_URL`
- `LEDGER_SERVICE_URL`

## Database Setup

```bash
# Initialize database
npm run build
node dist/config/database.js

# Seed strategies
node dist/scripts/seed-strategies.js
```

## Running

```bash
# Development
npm run dev

# Production
npm run build
npm start

# Tests
npm test
npm run test:watch
npm run test:integration
```

## OPA Policies

Treasury permissions are enforced via OPA policies in `opa/policies/treasury.rego`:

- Treasury admin actions require `treasury_admin` role
- Deposits limited to $10M per transaction
- Withdrawals subject to daily limits (configured per user)
- Rebalancing restricted to admins only

## Event Integration

### Listens For:
- `ledger.transaction.created` - Ledger transaction confirmations

### Emits:
- `treasury.deposit` - Vault deposit occurred
- `treasury.withdraw` - Vault withdrawal occurred
- `treasury.compounded` - Yield compounded
- `treasury.rebalanced` - Vault rebalanced
- `treasury.yield.harvested` - Yield harvested from protocol

## Performance Metrics

Calculated per vault:
- Total deposited
- Total withdrawn
- Total yield generated
- Net APY
- Sharpe ratio
- Maximum drawdown

## Emergency Features

- Emergency pause mechanism
- Large withdrawal queuing
- Automatic high-risk vault pausing
- Admin override capabilities

## Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Coverage
npm run test -- --coverage
```

## Monitoring

- Health check: `GET /health`
- Structured logging with Winston
- Redis-based rate limiting (100 req/min)
- Comprehensive error handling

## License

MIT
