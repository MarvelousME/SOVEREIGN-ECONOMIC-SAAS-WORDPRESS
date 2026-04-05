#!/usr/bin/env bash
# Build API + Portal images in parallel, then deploy ubi_core and ubi_observe stacks in parallel.
# Requires Docker with Swarm enabled (single- or multi-node; bind mounts need OPA policies on nodes that run OPA).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NET="${UBI_SWARM_NETWORK:-ubi_public}"
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://127.0.0.1:3000/api/v1}"

echo "==> Swarm init (if needed)"
docker swarm init 2>/dev/null || true

echo "==> Overlay network: $NET"
docker network inspect "$NET" >/dev/null 2>&1 || docker network create -d overlay --attachable "$NET"

echo "==> Parallel image builds"
docker build -t "${API_IMAGE:-ubi-cms-api:swarm}" -f "$ROOT/api/Dockerfile" "$ROOT/api" &
pid_api=$!
docker build -t "${PORTAL_IMAGE:-ubi-cms-portal:swarm}" \
  --build-arg "NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL" \
  -f "$ROOT/frontend/portal-ui/Dockerfile" "$ROOT/frontend/portal-ui" &
pid_portal=$!
wait "$pid_api" "$pid_portal"

echo "==> Parallel stack deploy (core + observe${DEPLOY_DB_INIT_STACK:+ + db_init})"
cd "$ROOT/docker/swarm"
docker stack deploy -c stack-core.yml ubi_core &
pid_c=$!
docker stack deploy -c stack-observe.yml ubi_observe &
pid_o=$!
if [ "${DEPLOY_DB_INIT_STACK:-}" = 1 ]; then
  docker stack deploy -c stack-db-init.yml ubi_db_init &
  pid_d=$!
fi
wait "$pid_c" "$pid_o"
if [ -n "${pid_d:-}" ]; then wait "$pid_d"; fi

echo ""
echo "Stacks: ubi_core (postgres, redis, nats, opa x2, api x3, portal x2), ubi_observe (prometheus, loki, grafana, otel)"
echo "Ports: API 3000, Portal 3001, OPA 8181, Prometheus 9090, Loki 3100, Grafana 3010, OTLP 4317/4318"
echo "Watch: docker stack services ubi_core && docker stack services ubi_observe"
if [ "${DEPLOY_DB_INIT_STACK:-}" = 1 ]; then
  echo "DB init: docker service logs -f ubi_db_init_dbinit"
fi

if [ "${RUN_SWARM_DB_INIT:-}" = 1 ]; then
  echo ""
  echo "==> RUN_SWARM_DB_INIT=1: applying schema + seeds (scripts/swarm-db-init.sh)"
  bash "$ROOT/scripts/swarm-db-init.sh"
fi
