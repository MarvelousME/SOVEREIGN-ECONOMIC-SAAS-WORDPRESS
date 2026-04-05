# Governance Service (DAO)

A decentralized autonomous organization (DAO) service for the UBI-CMS platform that enables community governance through proposals, voting, and execution mechanisms.

## Features

### Core Functionality
- **Proposal Management**: Create, list, and track governance proposals
- **Multiple Voting Mechanisms**:
  - Simple Majority: One person, one vote
  - Reputation-Weighted: Votes weighted by reputation score
  - Stake-Weighted: Votes weighted by token stake
  - Quadratic Voting: Square root weighting to reduce whale influence
  - Conviction Voting: Time-locked votes with multipliers
- **Quorum Calculation**: Configurable minimum participation requirements
- **Time-Locked Execution**: Delayed execution for security
- **Vote Delegation**: Delegate voting power to trusted representatives

### Proposal Types
- Treasury allocation proposals
- UBI rule changes
- Feature proposals
- Parameter updates
- Emergency actions

### Voting Algorithms
All voting algorithms are implemented in `src/utils/voting-algorithms.ts`:

- **Simple Majority**: Equal weight for all voters
- **Reputation Weighted**: Linear scaling by reputation score
- **Stake Weighted**: Linear scaling by tokens staked
- **Quadratic**: Square root of total power (dampens large stakes)
- **Conviction**: Base power × conviction multiplier (1x, 2x, 4x, 8x)

## API Endpoints

### Proposals
- `POST /api/v1/governance/proposals` - Create a new proposal
- `GET /api/v1/governance/proposals` - List proposals (with filters)
- `GET /api/v1/governance/proposals/:id` - Get proposal details
- `GET /api/v1/governance/proposals/:id/results` - Get voting results

### Voting
- `POST /api/v1/governance/proposals/:id/vote` - Cast a vote
- `POST /api/v1/governance/proposals/:id/finalize` - Finalize voting
- `POST /api/v1/governance/proposals/:id/execute` - Execute passed proposal

### Delegation
- `POST /api/v1/governance/delegate` - Delegate voting power
- `GET /api/v1/governance/voting-power/:userId` - Get user's voting power

## Configuration

Environment variables (see `.env.example`):

```bash
PORT=3009
MIN_PROPOSAL_DEPOSIT=100
MIN_QUORUM_PERCENTAGE=20
VOTING_PERIOD_DAYS=7
EXECUTION_DELAY_HOURS=48
```

## Installation

```bash
cd services/governance-service
npm install
npm run build
```

## Running

```bash
# Development
npm run dev

# Production
npm start
```

## Database Schema

Run migration: `migrations/007_governance_schema.sql`

Tables:
- `proposals` - Governance proposals
- `votes` - Individual votes on proposals
- `voting_power` - User voting power (reputation + stake)
- `delegations` - Vote delegations
- `proposal_discussions` - Discussion threads

## Testing

```bash
npm test
npm run test:integration
```

## Example Usage

### Create a Proposal

```bash
curl -X POST http://localhost:3009/api/v1/governance/proposals \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Increase UBI Rate by 10%",
    "description": "Proposal to increase monthly UBI rate from $100 to $110",
    "proposalType": "ubi_rule_change",
    "votingMechanism": "quadratic",
    "deposit": 100
  }'
```

### Cast a Vote

```bash
curl -X POST http://localhost:3009/api/v1/governance/proposals/{id}/vote \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "choice": "yes",
    "convictionMultiplier": 2
  }'
```

### Delegate Voting Power

```bash
curl -X POST http://localhost:3009/api/v1/governance/delegate \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "delegateId": "user-uuid",
    "votingPower": 100,
    "duration": 30
  }'
```

## Architecture

- **Service Layer**: Core business logic for proposals, voting, and delegation
- **Voting Algorithms**: Pluggable voting mechanisms
- **Event-Driven**: Publishes events via NATS for integration
- **Temporal Integration**: Time-locked execution scheduling
- **PostgreSQL**: Persistent storage with ACID guarantees

## Security

- JWT authentication required for all mutations
- Proposal deposits prevent spam
- Execution delays prevent hasty changes
- Vote delegation requires explicit user action
- All votes are immutable once cast

## License

MIT
