#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "Starting optional local stack (MailHog + OpenSearch)..."
docker compose -f "${ROOT}/docker-compose.local-extras.yml" up -d
echo ""
echo "MailHog UI:  http://localhost:8025"
echo "SMTP:        localhost:1025"
echo "OpenSearch:  http://localhost:9200"
echo "Done."
