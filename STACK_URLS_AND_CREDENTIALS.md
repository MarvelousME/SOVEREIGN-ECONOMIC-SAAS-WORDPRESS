# Stack URLs and Login Credentials

Last updated: 2026-04-07

This file consolidates URLs and credentials from repository config/scripts:
- `scripts/open-stack-urls.ps1`
- `docker-compose.dev.yml`
- `docker-compose.local.yml`
- `api/dev-seed.sql`
- `.env.example`

## URLs (Dev Stack)

- API health: `http://localhost:3000/health`
- Portal UI: `http://localhost:3001`
- Keycloak: `http://localhost:8080`
- Traefik dashboard: `http://localhost:8081/dashboard/`
- Traefik gateway (HTTP): `http://localhost:2025`
- MinIO console: `http://localhost:9001`
- NATS monitoring: `http://localhost:8222`
- Temporal UI: `http://localhost:8233`

## Credentials (Dev Stack)

### Application users (seeded)

From `api/dev-seed.sql`:

- Admin user:
  - username: `admin`
  - email: `admin@ubi-cms.dev`
  - password: `Admin@123456`
- Demo user:
  - username: `demo`
  - email: `demo@ubi-cms.dev`
  - password: `Demo@Platform1`
- Sample users:
  - username: `alice`
  - email: `alice@ubi-cms.dev`
  - password: `Admin@123456`
  - username: `bob`
  - email: `bob@ubi-cms.dev`
  - password: `Admin@123456`

### Keycloak

From `docker-compose.dev.yml`:

- URL: `http://localhost:8080`
- Admin username: `admin`
- Admin password: `${KEYCLOAK_ADMIN_PASSWORD:-admin}` (default `admin` if not overridden in environment)

### PostgreSQL (dev compose)

From `docker-compose.dev.yml`:

- Host: `localhost`
- Port: `5432`
- Database: `ubi_cms` (container init), app DB used by API: `ubi_app`
- Username: `${DB_USER:-postgres}` (default `postgres`)
- Password: `${DB_PASSWORD:-postgres}` (default `postgres`)

### Redis (dev compose)

From `docker-compose.dev.yml`:

- Host: `localhost`
- Port: `6379`
- Password: `${REDIS_PASSWORD:-redis}` (default `redis`)

### MinIO (dev compose)

From `docker-compose.dev.yml`:

- Console: `http://localhost:9001`
- S3 API: `http://localhost:9000`
- Username: `${MINIO_USER:-minio}` (default `minio`)
- Password: `${MINIO_PASSWORD:-minio123456}` (default `minio123456`)

## Credentials (Local Minimal Stack)

From `docker-compose.local.yml`:

- PostgreSQL:
  - host: `localhost`
  - port: `5432`
  - database: `ubi_dev`
  - username: `postgres`
  - password: `devpassword123`
- API JWT secret: `dev-jwt-secret-change-in-production-must-be-at-least-32-chars`

## Optional / Environment-based Credentials

From `.env.example` (replace before production):

- `KEYCLOAK_ADMIN_PASSWORD=changeme`
- `DB_PASSWORD=changeme`
- `REDIS_PASSWORD=changeme`
- `MINIO_USER=admin`
- `MINIO_PASSWORD=changeme123456`
- `GRAFANA_PASSWORD=changeme`
- `JWT_SECRET=changeme-generate-random-secret`

## Notes

- If your local shell defines env vars (for example `DB_PASSWORD`, `KEYCLOAK_ADMIN_PASSWORD`), those override defaults above.
- For security, rotate all default credentials before exposing any environment beyond local development.
