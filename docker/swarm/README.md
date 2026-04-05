# Docker Swarm (parallel stacks)

Two stacks share the overlay network **`ubi_public`** and are deployed **at the same time**:

| Stack        | Services |
|-------------|----------|
| **ubi_core** | Postgres, Redis, NATS, OPA ×2, API ×3, Portal ×2 |
| **ubi_observe** | Prometheus, Loki, Grafana, OpenTelemetry Collector |

## Quick start

From repo root (Linux/macOS, or Git Bash on Windows):

```bash
chmod +x scripts/swarm-parallel-deploy.sh
./scripts/swarm-parallel-deploy.sh
```

PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
.\scripts\swarm-parallel-deploy.ps1
```

## Ports (ingress)

- **3000** — API (load-balanced across 3 tasks)
- **3001** — Portal (2 tasks)
- **8181** — OPA (2 tasks)
- **9090** — Prometheus
- **3100** — Loki
- **3010** — Grafana (avoids conflict with API on 3000)
- **4317 / 4318** — OTLP

Set `NEXT_PUBLIC_API_URL` before deploy so the portal image is built with the URL browsers use to reach the API (default `http://127.0.0.1:3000/api/v1`).

## Database migrations and seeds

Swarm Postgres does **not** auto-run SQL on first start.

### Option A — In-stack one-shot (`ubi_db_init`)

Deploy from **`docker/swarm`** (bind mounts `../../api` and `../../migrations` from the **manager** node; paths must exist there):

```bash
cd docker/swarm
docker stack deploy -c stack-db-init.yml ubi_db_init
```

Follow progress:

```bash
docker service logs -f ubi_db_init_dbinit
```

- **`SWARM_DB_MODE`** (default `dev`): runs `dev-schema.sql` → `dev-seed.sql` → `dev-patch.sql`.
- **`SWARM_DB_MODE=full`**: runs `migrations/000_run_all_migrations.sql` only.

```bash
SWARM_DB_MODE=full docker stack deploy -c stack-db-init.yml ubi_db_init
```

The task exits when finished; **`restart_policy: none`** avoids a restart loop. Re-running **`docker stack deploy`** is OK for idempotent dev SQL. Remove the stack if you like:

```bash
docker stack rm ubi_db_init
```

**Parallel full deploy** (dbinit waits on `pg_isready` until Postgres is up):

```bash
DEPLOY_DB_INIT_STACK=1 ./scripts/swarm-parallel-deploy.sh
```

### Option B — Host script (repo root)

After **`ubi_core`** is up, run the init script from the **repo root** (needs Docker CLI + attachable overlay **`ubi_public`**):

```bash
chmod +x scripts/swarm-db-init.sh
./scripts/swarm-db-init.sh
```

PowerShell:

```powershell
.\scripts\swarm-db-init.ps1
```

**Default (`SWARM_DB_MODE=dev`)** applies the same files as local compose: `api/dev-schema.sql`, then `api/dev-seed.sql`, then `api/dev-patch.sql`. This matches the Node API (`users` with `roles TEXT[]`, marketplace, notifications).

**Full SQL migration chain** (platform / IAM-style schemas; may not match the Node API dev schema):

```bash
SWARM_DB_MODE=full ./scripts/swarm-db-init.sh
```

Use **`DB_USER`**, **`DB_PASSWORD`**, **`DB_NAME`** if they differ from stack defaults.

**One-shot after parallel deploy:**

```bash
RUN_SWARM_DB_INIT=1 ./scripts/swarm-parallel-deploy.sh
```

```powershell
$env:RUN_SWARM_DB_INIT = '1'; .\scripts\swarm-parallel-deploy.ps1
```

## Environment

Optional (defaults work for local dev):

- `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET` (must satisfy API startup checks)
- `CORS_ORIGIN` (e.g. `http://127.0.0.1:3001`)
- `API_IMAGE`, `PORTAL_IMAGE` to override image names

## Notes

- **Single-node Swarm** is the common case; bind-mounted OPA policies (`../configs/opa/policies`) must exist on nodes that run OPA tasks.
- Postgres is pinned to a **manager** node (`placement.constraints`).
- `docker stack rm ubi_core ubi_observe` removes stacks; named volumes may remain until pruned.

## Manual deploy (no script)

```bash
docker swarm init
docker network create -d overlay --attachable ubi_public
docker build -t ubi-cms-api:swarm -f api/Dockerfile api
docker build -t ubi-cms-portal:swarm --build-arg NEXT_PUBLIC_API_URL=http://127.0.0.1:3000/api/v1 \
  -f frontend/portal-ui/Dockerfile frontend/portal-ui
cd docker/swarm
docker stack deploy -c stack-core.yml ubi_core &
docker stack deploy -c stack-observe.yml ubi_observe &
wait
```
