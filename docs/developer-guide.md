# UBI CMS — Developer Guide

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Project Structure](#project-structure)
- [API Development](#api-development)
- [Frontend Development](#frontend-development)
- [Running Tests](#running-tests)
- [Database Migrations](#database-migrations)
- [Demo Mode Development](#demo-mode-development)
- [Adding a New API Endpoint](#adding-a-new-api-endpoint)
- [Adding a New Frontend Screen](#adding-a-new-frontend-screen)
- [CI/CD Pipeline](#cicd-pipeline)
- [Code Standards](#code-standards)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Tool | Minimum Version | Installation |
|------|----------------|-------------|
| Node.js | 18.x | [nodejs.org](https://nodejs.org) |
| npm | 9.x | Included with Node.js |
| Docker Desktop | 4.x | [docker.com](https://docker.com) |
| Docker Compose | 2.x | Included with Docker Desktop |
| Git | 2.x | [git-scm.com](https://git-scm.com) |

Optional but recommended:
- **VS Code** with ESLint, Prettier, and TypeScript extensions
- **TablePlus** or **DBeaver** for PostgreSQL inspection
- **Insomnia** or **Bruno** for API testing

---

## Local Development Setup

### 1. Clone and configure environment

```bash
git clone <repo-url>
cd UBI-CMS

# Copy environment template
cp .env.production.example .env.local
```

Edit `.env.local` with your local values:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ubi_dev
DB_USER=postgres
DB_PASSWORD=dev_password_123
DATABASE_URL=postgresql://postgres:dev_password_123@localhost:5432/ubi_dev

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

JWT_SECRET=dev-jwt-secret-change-in-production-must-be-at-least-32-chars
JWT_EXPIRY=1h

CORS_ORIGIN=http://localhost:3001
NODE_ENV=development
LOG_LEVEL=debug
```

### 2. Start infrastructure services

```bash
# Start only PostgreSQL and Redis (no app containers)
docker compose -f docker-compose.local.yml up -d postgres redis

# Verify services are running
docker compose -f docker-compose.local.yml ps
```

### 2b. Optional: MailHog + OpenSearch (local only)

For email capture (SMTP) or OpenSearch experiments without touching the core stack:

```bash
docker compose -f docker-compose.local-extras.yml up -d
# Or: ./scripts/bootstrap-local-extras.sh
```

- **MailHog UI:** http://localhost:8025 — SMTP to `localhost:1025`
- **OpenSearch:** http://localhost:9200

See commented variables in `.env.example` under “Optional local extras”. Service-specific examples: **`services/auth-service/.env.example`** (MailHog SMTP), **`services/analytics-service/.env.example`** (OpenSearch URL / index prefix).

### 3. Set up the database

```bash
# Run migrations
cd migrations
docker run --rm \
  --network host \
  -e DATABASE_URL="postgresql://postgres:dev_password_123@localhost:5432/ubi_dev" \
  -v "$(pwd):/migrations" \
  postgres:15 psql "$DATABASE_URL" -f /migrations/000_run_all_migrations.sql

# Or connect directly if you have psql installed
psql postgresql://postgres:dev_password_123@localhost:5432/ubi_dev \
  -f 000_run_all_migrations.sql
```

### 4. Start the API

```bash
cd api
npm install
npm run dev
# API available at http://localhost:3000
```

Verify: `curl http://localhost:3000/health`

### 5. Start the Portal UI

```bash
cd frontend/portal-ui
npm install

# Copy frontend env template
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1

npm run dev
# Portal available at http://localhost:3001
```

---

## Project Structure

```
UBI-CMS/
├── api/                          # Node.js/Express backend
│   ├── src/
│   │   ├── Config/
│   │   │   └── app.js            # Express app configuration, DB config
│   │   ├── Controllers/
│   │   │   ├── authController.js      # Login, register, logout, me
│   │   │   ├── taskController.js      # CRUD + assign/submit/verify
│   │   │   ├── rewardController.js    # Balance, list, history
│   │   │   ├── treasuryController.js  # Balance, deposit, withdraw, yield
│   │   │   └── agentController.js     # List, get, register, execute
│   │   ├── Middleware/
│   │   │   ├── auth.js           # JWT verification, requireRole
│   │   │   ├── security.js       # Helmet, CORS, rate limiting, logging
│   │   │   ├── validation.js     # Shared validation helpers
│   │   │   ├── audit.js          # Audit log middleware
│   │   │   └── telemetry.js      # OpenTelemetry middleware
│   │   ├── Models/
│   │   │   ├── db.js             # PostgreSQL pool + transaction helper
│   │   │   ├── user.js           # User CRUD
│   │   │   ├── task.js           # Task CRUD + assignment
│   │   │   ├── reward.js         # Reward CRUD
│   │   │   ├── treasury.js       # Treasury accounts + transactions
│   │   │   └── agent.js          # Agent CRUD + executions
│   │   ├── Services/
│   │   │   └── ubiService.js     # UBI claim logic and distribution
│   │   ├── __tests__/            # Jest test suites
│   │   └── index.js              # Express app entry point + all routes
│   ├── jest.config.js
│   ├── package.json
│   └── Dockerfile
│
├── frontend/
│   └── portal-ui/                # Next.js 14 user portal
│       ├── src/
│       │   ├── app/
│       │   │   ├── auth/
│       │   │   │   └── login/page.tsx    # Login page with demo button
│       │   │   └── dashboard/
│       │   │       ├── layout.tsx        # Sidebar navigation
│       │   │       ├── overview/page.tsx # Main dashboard KPIs
│       │   │       ├── ubi/page.tsx      # UBI claims
│       │   │       ├── tasks/page.tsx    # Task marketplace
│       │   │       ├── treasury/page.tsx # Treasury management
│       │   │       ├── rewards/page.tsx  # Rewards & earnings
│       │   │       ├── agents/page.tsx   # AI agent marketplace
│       │   │       ├── analytics/page.tsx
│       │   │       ├── users/page.tsx    # Admin: user management
│       │   │       ├── monitoring/page.tsx # System monitoring
│       │   │       └── god/page.tsx      # Admin: god mode control panel
│       │   ├── components/
│       │   │   └── dashboard/
│       │   │       └── stat-card.tsx     # Reusable KPI card component
│       │   └── lib/
│       │       ├── api.ts               # API client + TypeScript types
│       │       ├── auth.ts              # Token storage helpers
│       │       └── demo.ts              # Demo mode + mock datasets
│       ├── next.config.js
│       ├── package.json
│       └── Dockerfile
│
├── migrations/                   # PostgreSQL migration SQL files
├── nginx/                        # Nginx reverse proxy config
├── docs/                         # This documentation
├── .github/workflows/            # CI/CD pipeline
├── docker-compose.local.yml      # Local dev services
├── docker-compose.production.yml # Production stack
└── .env.production.example       # Environment template
```

**WordPress + SEO:** This monorepo may include `wordpress/` with bundled plugins (for example Yoast SEO under `wordpress/wp-content/plugins/wordpress-seo/`). Yoast is **activated manually** in wp-admin, not via WP-CLI in this project. See [WordPress plugins — Yoast (manual activation)](./wordpress-plugins.md#yoast-seo-manual-activation) and how it interacts with Sovereign IAM UX.

---

## API Development

### Adding a New Route

1. **Create or update a controller** in `api/src/Controllers/`:

```javascript
// api/src/Controllers/myController.js
const myModel = require('../Models/myModel');
const { validationResult } = require('express-validator');

class MyController {
  async list(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const data = await myModel.list(parseInt(page), parseInt(limit));
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new MyController();
```

2. **Create a model** in `api/src/Models/`:

```javascript
// api/src/Models/myModel.js
const db = require('./db');

class MyModel {
  async list(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [result, countResult] = await Promise.all([
      db.query('SELECT * FROM my_table ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]),
      db.query('SELECT COUNT(*) FROM my_table'),
    ]);
    const total = parseInt(countResult.rows[0].count);
    return {
      data: result.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }
}

module.exports = new MyModel();
```

3. **Register the route** in `api/src/index.js`:

```javascript
const myController = require('./Controllers/myController');
apiRouter.get('/my-resource', authMiddleware.authenticate, myController.list);
apiRouter.post('/my-resource', 
  authMiddleware.authenticate,
  authMiddleware.requireRole('admin'),
  body('name').isLength({ min: 1, max: 100 }).trim(),
  myController.create
);
```

### Using Transactions

Always use `db.transaction()` for multi-step writes to ensure atomicity:

```javascript
const result = await db.transaction(async (client) => {
  const row = await client.query('INSERT INTO ... RETURNING *', [...]);
  await client.query('UPDATE ... SET ...', [...]);
  return row.rows[0];
});
```

---

## Frontend Development

### Adding a New Page

1. **Create the page directory and file:**

```
frontend/portal-ui/src/app/dashboard/my-page/page.tsx
```

2. **Follow the API/demo pattern:**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { isDemoUser } from '@/lib/demo';

// Define your types
interface MyData {
  id: number;
  name: string;
}

export default function MyPage() {
  const [data, setData] = useState<MyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isDemo = isDemoUser();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      if (isDemo) {
        // Use mock data from demo.ts
        setData(DEMO_MY_DATA);
      } else {
        // Call real API
        const result = await api.getMyData();
        setData(result.data);
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {isDemo && (
        <div className="demo-badge">
          <span>Demo</span>
        </div>
      )}
      {/* Your UI here */}
    </div>
  );
}
```

3. **Add mock data to `src/lib/demo.ts`:**

```typescript
export const DEMO_MY_DATA: MyData[] = [
  { id: 1, name: 'Example Item 1' },
  { id: 2, name: 'Example Item 2' },
];
```

4. **Add API method to `src/lib/api.ts`:**

```typescript
async getMyData(): Promise<PaginatedResponse<MyData>> {
  return this.request<PaginatedResponse<MyData>>('/my-resource');
}
```

5. **Add navigation link to `src/app/dashboard/layout.tsx`** inside the appropriate group.

### TypeScript Type Check

Always run before committing:

```bash
cd frontend/portal-ui
npx tsc --noEmit
```

---

## Running Tests

### API Tests

```bash
cd api

# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Watch mode (re-runs on file changes)
npm run test:watch

# Run a specific test file
npx jest src/__tests__/agents.test.js
```

**Test files:**

| File | What It Tests |
|------|--------------|
| `auth.test.js` | Login, register, JWT middleware |
| `tasks.test.js` | Task CRUD, assign, submit, verify |
| `rewards.test.js` | Balance, list, history |
| `treasury.test.js` | Balance, deposit, withdraw, yield |
| `agents.test.js` | List, get, register, execute |
| `ubi.test.js` | UBI service: claim, balance, history |
| `middleware.test.js` | Auth and security middleware |
| `health.test.js` | Health and readiness endpoints |

### Coverage Thresholds

Configured in `api/jest.config.js`:

| Metric | Threshold |
|--------|-----------|
| Branches | 60% |
| Functions | 70% |
| Lines | 65% |
| Statements | 65% |

### Frontend Type Check

```bash
cd frontend/portal-ui
npx tsc --noEmit       # Type check only
npm run build          # Full Next.js production build
npm run lint           # ESLint
```

---

## Database Migrations

Migrations are stored as numbered SQL files in `migrations/`. They are designed to be **idempotent** (safe to run multiple times).

### Run all migrations

```bash
psql "$DATABASE_URL" -f migrations/000_run_all_migrations.sql
```

### Run a specific migration

```bash
psql "$DATABASE_URL" -f migrations/004_create_ubi_engine_schema.sql
```

### Migration file naming convention

```
NNN_description.sql
  │   └─ snake_case description
  └─ Zero-padded 3-digit number (e.g., 001, 010, 011)
```

### Creating a new migration

1. Pick the next available number (check existing files)
2. Create `migrations/NNN_your_description.sql`
3. Use `IF NOT EXISTS` and `IF EXISTS` guards for idempotency:

```sql
-- migrations/012_create_notifications_table.sql
CREATE TABLE IF NOT EXISTS notifications (
    id    SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    read    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
```

---

## Demo Mode Development

### How It Works

The demo mode is managed by `frontend/portal-ui/src/lib/demo.ts`:

1. **`isDemoUser()`** — reads the stored user from `localStorage` and checks if `username === 'demo'`
2. All dashboard pages check `isDemoUser()` and conditionally render mock data or call the real API
3. The login page includes a "Try Demo" button that:
   - First tries a real API login with `DEMO_USERNAME`/`DEMO_PASSWORD`
   - Falls back to client-side-only demo if the backend is unavailable

### Adding Mock Data for a New Screen

In `src/lib/demo.ts`, export a constant with the mock dataset matching the real API type:

```typescript
import type { MyData } from './api';

export const DEMO_MY_DATA: MyData[] = [
  {
    id: 1,
    name: 'Sample Item',
    // ... all required fields
  },
];
```

### Demo User in the Database

If you want the "Try Demo" button to work against a real backend, create the demo user:

```sql
-- Password: Demo@Platform1 (bcrypt hashed)
INSERT INTO users (username, email, password_hash, roles, status)
VALUES (
  'demo',
  'demo@ubi-platform.com',
  '$2b$10$REPLACE_WITH_BCRYPT_HASH',
  ARRAY['user'],
  'active'
) ON CONFLICT (username) DO NOTHING;
```

Generate the correct hash:
```bash
node -e "const bcrypt=require('bcrypt'); bcrypt.hash('Demo@Platform1', 10).then(console.log)"
```

---

## Adding a New API Endpoint

Checklist for adding a complete endpoint:

- [ ] Create or update `Models/` file with parameterized queries
- [ ] Create or update `Controllers/` file with error handling
- [ ] Register route in `index.js` with appropriate auth middleware
- [ ] Add input validation with `express-validator`
- [ ] Write unit tests in `__tests__/`
- [ ] Add TypeScript interface to `frontend/portal-ui/src/lib/api.ts`
- [ ] Add API method to the `ApiClient` class in `api.ts`
- [ ] Add mock data to `frontend/portal-ui/src/lib/demo.ts`
- [ ] Document in `docs/api-reference.md`

---

## Adding a New Frontend Screen

Checklist for adding a complete screen:

- [ ] Create `src/app/dashboard/my-screen/page.tsx`
- [ ] Implement live API data fetching with loading/error states
- [ ] Add `isDemoUser()` check with mock data fallback
- [ ] Display "Demo" badge when in demo mode
- [ ] Add navigation entry to `src/app/dashboard/layout.tsx`
- [ ] Add mock data to `src/lib/demo.ts`
- [ ] Run `npx tsc --noEmit` — zero errors required

---

## CI/CD Pipeline

The GitHub Actions pipeline (`.github/workflows/ci.yml`) runs on every push and pull request:

### Pipeline Stages

```
Push / PR
    │
    ├─ 1. test-api         (Node.js 18 + PostgreSQL 15 + Redis 7)
    │      ├── npm install
    │      ├── npm test
    │      └── coverage report
    │
    ├─ 2. lint-frontend     (runs in parallel with test-api)
    │      ├── npm install
    │      ├── npx tsc --noEmit
    │      └── npm run lint
    │
    ├─ 3. build-api         (depends on: test-api)
    │      └── docker build api/
    │
    └─ 4. build-frontend    (depends on: lint-frontend)
           └── docker build frontend/portal-ui/
```

### Running CI Locally

```bash
# Run the full test suite exactly as CI does
cd api
npm ci
npm test -- --coverage

# TypeScript check
cd frontend/portal-ui
npm ci
npx tsc --noEmit
npm run lint
```

---

## Code Standards

### API (JavaScript)

- `'use strict'` at the top of every file
- All async controller methods wrapped in `try/catch` returning appropriate HTTP status codes
- Use `db.transaction()` for multi-step writes
- Parameterized queries only — never string interpolation in SQL
- Follow existing `AgentModel` / `TreasuryModel` patterns for new models

### Frontend (TypeScript)

- `'use client'` directive on all pages and components that use hooks or browser APIs
- All types defined in `src/lib/api.ts` — never use `any`
- `isDemoUser()` check in every new dashboard page
- Use existing CSS variables from the theme — no hardcoded color values
- Icon imports from `lucide-react` only

### Commits

Follow Conventional Commits:
```
feat: add task submission endpoint
fix: correct treasury parameterized query
docs: update API reference with treasury endpoints
test: add agent controller tests
chore: update node dependencies
```

---

## Troubleshooting

### API won't start

```
[FATAL] Missing required environment variables: JWT_SECRET, DB_HOST
```
→ Copy `.env.production.example` to `.env.local` and fill all values. Set `NODE_ENV=development`.

### Database connection refused

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
→ Start the database container: `docker compose -f docker-compose.local.yml up -d postgres`

### JWT validation fails in tests

```
JsonWebTokenError: invalid signature
```
→ Ensure `process.env.JWT_SECRET` is set consistently in both the test setup (`__tests__/setup.js`) and the middleware being tested.

### TypeScript errors after pulling latest code

```bash
cd frontend/portal-ui
npm install      # Install any new packages first
npx tsc --noEmit # Then check
```

### Next.js build fails

```bash
cd frontend/portal-ui
npm run build 2>&1 | head -50   # Show first 50 lines of error output
```

Common causes:
- Missing `NEXT_PUBLIC_API_URL` in `.env.local`
- TypeScript errors (run `tsc --noEmit` first)
- Importing server-only modules in client components

### Tests fail with rate limit errors

The test setup in `api/src/__tests__/setup.js` mocks `express-rate-limit`. If you see `429` errors in tests, ensure the test file includes:

```javascript
jest.mock('express-rate-limit', () => () => (req, res, next) => next());
```
