#!/bin/bash
set -e

# UBI-CMS Migration Script
# Usage: ./migrate.sh <environment> [up|down|status]

ENVIRONMENT=${1:-staging}
COMMAND=${2:-up}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validate command
if [[ ! "$COMMAND" =~ ^(up|down|status)$ ]]; then
    log_error "Invalid command: $COMMAND"
    log_error "Valid commands: up, down, status"
    exit 1
fi

log_info "Running migrations: $COMMAND"

cd "$PROJECT_ROOT"

# Set database URL based on environment
case $ENVIRONMENT in
    dev)
        DATABASE_URL=${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/ubi_cms}
        ;;
    staging)
        DATABASE_URL=${DATABASE_URL:-postgresql://postgres:postgres@postgres:5432/ubi_cms}
        ;;
    production)
        DATABASE_URL=${DATABASE_URL:?DATABASE_URL must be set for production}
        ;;
    *)
        log_error "Invalid environment: $ENVIRONMENT"
        exit 1
        ;;
esac

# Run migrations using Podman
log_info "Running migrations in Podman..."

podman run --rm \
    --network host \
    -e DATABASE_URL="$DATABASE_URL" \
    -v "$PROJECT_ROOT/migrations:/app/migrations" \
    ghcr.io/ubi-cms/migrations:latest \
    node-pg-migrate "$COMMAND"

log_info "Migration $COMMAND completed successfully"

exit 0
