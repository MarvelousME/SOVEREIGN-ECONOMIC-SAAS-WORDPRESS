#!/usr/bin/env bash
# Apply schema + seeds to Swarm Postgres (service name: postgres on overlay ubi_public).
# Default mode matches docker-compose.local.yml + dev-patch (API-compatible).
#
# Usage:
#   ./scripts/swarm-db-init.sh              # dev-schema + dev-seed + dev-patch
#   SWARM_DB_MODE=full ./scripts/swarm-db-init.sh   # migrations/000_run_all_migrations.sql only
#
# Env (defaults match docker/swarm/stack-core.yml):
#   UBI_SWARM_NETWORK, DB_USER, DB_PASSWORD, DB_NAME, POSTGRES_IMAGE
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NET="${UBI_SWARM_NETWORK:-ubi_public}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_NAME="${DB_NAME:-ubi_cms}"
MODE="${SWARM_DB_MODE:-dev}"
IMG="${POSTGRES_IMAGE:-postgres:16-alpine}"

psql_run() {
  local workdir=$1
  local file=$2
  echo ">>> psql -f $file (cwd $workdir)"
  docker run --rm --network "$NET" \
    -v "$ROOT:/work:ro" \
    -w "/work/$workdir" \
    -e "PGPASSWORD=$DB_PASSWORD" \
    "$IMG" \
    psql -h postgres -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$file"
}

echo "==> Waiting for Postgres ($DB_USER@postgres:5432/$DB_NAME) on network $NET ..."
ready=0
for i in $(seq 1 90); do
  if docker run --rm --network "$NET" -e "PGPASSWORD=$DB_PASSWORD" "$IMG" \
    pg_isready -h postgres -U "$DB_USER" -d "$DB_NAME" -q 2>/dev/null; then
    ready=1
    break
  fi
  sleep 2
done
if [ "$ready" != 1 ]; then
  echo "Postgres did not become ready. Deploy ubi_core first and ensure overlay $NET exists."
  exit 1
fi

if [ "$MODE" = "full" ]; then
  echo "==> SWARM_DB_MODE=full: running migrations/000_run_all_migrations.sql"
  echo "    Note: this schema may differ from the Node API dev-schema; use for platform DBs only."
  psql_run "migrations" "000_run_all_migrations.sql"
else
  echo "==> SWARM_DB_MODE=dev (default): dev-schema → dev-seed → dev-patch"
  psql_run "api" "dev-schema.sql"
  psql_run "api" "dev-seed.sql"
  psql_run "api" "dev-patch.sql"
fi

echo "==> Database init finished."
