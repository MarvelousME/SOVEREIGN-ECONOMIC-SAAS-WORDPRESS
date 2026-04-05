#!/bin/bash
set -e

# UBI-CMS Rollback Script
# Usage: ./rollback.sh <environment>

ENVIRONMENT=${1:-staging}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/ubi-cms}"

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

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|production)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT"
    exit 1
fi

log_warn "═══════════════════════════════════════════════════════"
log_warn "  ⚠️  INITIATING ROLLBACK FOR: $ENVIRONMENT"
log_warn "═══════════════════════════════════════════════════════"

cd "$PROJECT_ROOT"

COMPOSE_FILE="docker-compose.${ENVIRONMENT}.yml"

# Find most recent pre-deploy backup
LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/pre-deploy-*.tar.gz 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    log_error "No pre-deployment backup found!"
    log_warn "Attempting to revert to previous image tag..."
    
    # Try to get previous image tag
    PREVIOUS_TAG=$(git describe --abbrev=0 --tags $(git rev-list --tags --skip=1 --max-count=1) 2>/dev/null || echo "")
    
    if [ -n "$PREVIOUS_TAG" ]; then
        log_info "Rolling back to tag: $PREVIOUS_TAG"
        export IMAGE_TAG=$PREVIOUS_TAG
        
        podman compose -f "$COMPOSE_FILE" pull
        podman compose -f "$COMPOSE_FILE" up -d
        
        log_info "Rolled back to previous tag"
    else
        log_error "Cannot determine previous version"
        exit 1
    fi
else
    BACKUP_NAME=$(basename "$LATEST_BACKUP" .tar.gz)
    log_info "Found pre-deployment backup: $BACKUP_NAME"
    
    # Restore from backup
    bash "$SCRIPT_DIR/restore.sh" "$BACKUP_NAME" --force
fi

# Verify rollback
log_info "Verifying rollback..."
sleep 10

# Check service health
HEALTH_OK=1

if command -v curl &> /dev/null; then
    API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health || echo "000")
    if [ "$API_HEALTH" = "200" ]; then
        log_info "API health check: PASSED"
    else
        log_error "API health check: FAILED"
        HEALTH_OK=0
    fi
fi

if [ $HEALTH_OK -eq 1 ]; then
    log_info "Rollback completed successfully!"
else
    log_error "Rollback completed but health checks failed"
    exit 1
fi

# Send notification
if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"⏪ Rollback completed for $ENVIRONMENT\",\"blocks\":[{\"type\":\"section\",\"text\":{\"type\":\"mrkdwn\",\"text\":\"*Rollback Status*\n⏪ Rollback completed for *$ENVIRONMENT*\n*Time:* $(date)\"}}]}" \
        2>/dev/null || true
fi

exit 0
