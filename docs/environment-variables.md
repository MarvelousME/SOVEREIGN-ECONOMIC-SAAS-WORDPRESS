# UBI CMS — Environment Variables Reference

This document lists every environment variable used across the platform. Use `.env.production.example` as a starting template.

> ⚠️ **Never commit secrets to version control.** The `.env.production` file must be in `.gitignore`.

---

## Table of Contents

- [Quick Reference](#quick-reference)
- [API (Backend)](#api-backend)
- [Frontend (Portal UI)](#frontend-portal-ui)
- [Docker Compose](#docker-compose)
- [Generating Secrets](#generating-secrets)
- [Environment-Specific Notes](#environment-specific-notes)

---

## Quick Reference

| Variable | Service | Required | Has Default |
|----------|---------|----------|------------|
| `JWT_SECRET` | API | ✅ | ❌ |
| `DB_HOST` | API | ✅ | ❌ |
| `DB_NAME` | API | ✅ | ❌ |
| `DB_USER` | API | ✅ | ❌ |
| `DB_PASSWORD` | API | ✅ (prod) | ❌ |
| `DATABASE_URL` | API | ❌ | constructed |
| `REDIS_HOST` | API | ❌ | `localhost` |
| `REDIS_PORT` | API | ❌ | `6379` |
| `REDIS_PASSWORD` | API | ❌ (prod recommended) | — |
| `JWT_EXPIRY` | API | ❌ | `24h` |
| `CORS_ORIGIN` | API | ❌ | permissive (dev) |
| `NODE_ENV` | API | ❌ | `development` |
| `LOG_LEVEL` | API | ❌ | `info` |
| `PORT` | API | ❌ | `3000` |
| `NEXT_PUBLIC_API_URL` | Portal UI | ❌ | `http://localhost:3000/api/v1` |
| `NEXT_PUBLIC_WS_URL` | Portal UI | ❌ | `ws://localhost:3000` |
| `POSTGRES_DB` | Docker | ✅ | — |
| `POSTGRES_USER` | Docker | ✅ | — |
| `POSTGRES_PASSWORD` | Docker | ✅ | — |
| `API_IMAGE` | Docker | ❌ | `ubi-api:latest` |
| `PORTAL_IMAGE` | Docker | ❌ | `ubi-portal-ui:latest` |

---

## API (Backend)

These variables are read by the Node.js/Express API in `api/src/`.

### Database

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `DB_HOST` | PostgreSQL hostname or IP | `postgres` (Docker) / `localhost` (dev) | ✅ |
| `DB_PORT` | PostgreSQL port | `5432` | ❌ (default: `5432`) |
| `DB_NAME` | Database name | `ubi_production` | ✅ |
| `DB_USER` | Database user | `ubi_app` | ✅ |
| `DB_PASSWORD` | Database password | `str0ngPassw0rd!` | ✅ in production |
| `DATABASE_URL` | Full connection string (overrides individual DB_* vars if set) | `postgresql://ubi_app:pwd@postgres:5432/ubi_production` | ❌ |

> The API uses `pg` (node-postgres) which accepts either individual variables or a `DATABASE_URL` connection string.

### Security

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | Secret key for signing JWT tokens. **Must be random, at least 32 characters.** | *(generated — see below)* | ✅ |
| `JWT_EXPIRY` | JWT token lifetime | `24h`, `1h`, `7d` | ❌ (default: `24h`) |

> **Production fail-fast:** The API refuses to start if `JWT_SECRET` is missing or equals the well-known dev placeholder string.

### Cache / Session

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `REDIS_HOST` | Redis hostname | `redis` (Docker) / `localhost` (dev) | ❌ (default: `localhost`) |
| `REDIS_PORT` | Redis port | `6379` | ❌ (default: `6379`) |
| `REDIS_PASSWORD` | Redis authentication password | `redisP@ss123` | ❌ (recommended in production) |

### Application

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Runtime environment | `production`, `development`, `test` | ❌ (default: `development`) |
| `PORT` | Port the API listens on | `3000` | ❌ (default: `3000`) |
| `LOG_LEVEL` | Winston log level | `debug`, `info`, `warn`, `error` | ❌ (default: `info`) |
| `CORS_ORIGIN` | Comma-separated list of allowed frontend origins | `https://portal.ubi-platform.com` | ❌ (default: permissive in dev) |

**CORS configuration example for production:**
```env
CORS_ORIGIN=https://portal.ubi-platform.com,https://admin.ubi-platform.com
```

---

## Frontend (Portal UI)

These variables are read at build time by Next.js. Variables prefixed with `NEXT_PUBLIC_` are embedded in the client-side JavaScript bundle — **do not put secrets here**.

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `NEXT_PUBLIC_API_URL` | Full base URL of the backend API | `https://api.ubi-platform.com/api/v1` | ❌ (default: `http://localhost:3000/api/v1`) |
| `NEXT_PUBLIC_WS_URL` | WebSocket base URL for real-time features | `wss://api.ubi-platform.com` | ❌ (default: `ws://localhost:3000`) |

> **Build-time vs Runtime:** In Next.js with `output: 'standalone'`, `NEXT_PUBLIC_*` vars are baked in at `npm run build` time. Set them as Docker build arguments (`--build-arg NEXT_PUBLIC_API_URL=...`) or in your CI/CD pipeline.

**Docker build example:**
```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.ubi-platform.com/api/v1 \
  --build-arg NEXT_PUBLIC_WS_URL=wss://api.ubi-platform.com \
  -t ubi-portal-ui:latest \
  frontend/portal-ui/
```

---

## Docker Compose

These variables are used in `docker-compose.production.yml` and `docker-compose.local.yml`.

### PostgreSQL Container

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_DB` | Database to create on first start | `ubi_production` |
| `POSTGRES_USER` | Superuser username | `ubi_app` |
| `POSTGRES_PASSWORD` | Superuser password | `str0ngPassw0rd!` |

### Image Tags (optional)

| Variable | Description | Default |
|----------|-------------|---------|
| `API_IMAGE` | Docker image tag for the API service | `ubi-api:latest` |
| `PORTAL_IMAGE` | Docker image tag for the Portal UI service | `ubi-portal-ui:latest` |

---

## Generating Secrets

### JWT_SECRET

```bash
# 64-byte base64 string (recommended)
openssl rand -base64 64

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

### DB_PASSWORD / REDIS_PASSWORD

```bash
# Random 32-character alphanumeric password
openssl rand -base64 24 | tr -d '+/=' | head -c 32
```

---

## Environment-Specific Notes

### Development

```env
NODE_ENV=development
LOG_LEVEL=debug
JWT_SECRET=dev-jwt-secret-change-in-production-must-be-at-least-32-chars
DB_HOST=localhost
DB_NAME=ubi_dev
DB_USER=postgres
DB_PASSWORD=dev_password
CORS_ORIGIN=http://localhost:3001
```

> In development, the API will **warn** about the placeholder `JWT_SECRET` but will still start.

### Test (CI)

```env
NODE_ENV=test
JWT_SECRET=test-secret-for-ci-at-least-32-characters-long
DB_HOST=localhost
DB_NAME=ubi_test
DB_USER=postgres
DB_PASSWORD=
REDIS_HOST=localhost
```

The test environment template is in `api/.env.test`.

### Production Checklist

Before deploying to production, verify:

- [ ] `JWT_SECRET` is randomly generated (≥64 chars)
- [ ] `DB_PASSWORD` is strong and unique
- [ ] `REDIS_PASSWORD` is set
- [ ] `NODE_ENV=production`
- [ ] `CORS_ORIGIN` lists only your actual frontend domains
- [ ] `LOG_LEVEL=info` (not `debug`)
- [ ] `.env.production` file is **not** committed to git
- [ ] Secrets are injected via CI/CD (GitHub Secrets, Vault, etc.)
- [ ] `DATABASE_URL` uses SSL: `postgresql://...?sslmode=require`

### Injecting Secrets in CI/CD (GitHub Actions)

Store secrets in GitHub → Settings → Secrets and Variables → Actions, then reference them in your workflow:

```yaml
- name: Deploy
  env:
    JWT_SECRET: ${{ secrets.JWT_SECRET }}
    DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
    REDIS_PASSWORD: ${{ secrets.REDIS_PASSWORD }}
  run: |
    echo "JWT_SECRET=$JWT_SECRET" >> .env.production
    echo "DB_PASSWORD=$DB_PASSWORD" >> .env.production
    docker compose -f docker-compose.production.yml up -d
```
