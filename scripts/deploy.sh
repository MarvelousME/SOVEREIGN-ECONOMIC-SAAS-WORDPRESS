#!/bin/bash
set -e

# UBI-CMS Deployment Script
# Usage: ./deploy.sh <environment> [--rollback]

ENVIRONMENT=${1:-staging}
ROLLBACK=${2:-}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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
    log_error "Valid environments: dev, staging, production"
    exit 1
fi

log_info "Starting deployment to: $ENVIRONMENT"

# Set compose file
COMPOSE_FILE="docker-compose.${ENVIRONMENT}.yml"

if [ ! -f "$PROJECT_ROOT/$COMPOSE_FILE" ]; then
    log_error "Compose file not found: $COMPOSE_FILE"
    exit 1
fi

cd "$PROJECT_ROOT"

# Export environment variables
export IMAGE_TAG=${IMAGE_TAG:-latest}
export ENVIRONMENT=$ENVIRONMENT

log_info "Using image tag: $IMAGE_TAG"

# Check if rollback
if [ "$ROLLBACK" = "--rollback" ]; then
    log_warn "Rolling back deployment..."
    bash "$SCRIPT_DIR/rollback.sh" "$ENVIRONMENT"
    exit $?
fi

# Pre-deployment checks
log_info "Running pre-deployment checks..."

# Check disk space
AVAILABLE_SPACE=$(df -BG / | tail -1 | awk '{print $4}' | sed 's/G//')
if [ "$AVAILABLE_SPACE" -lt 10 ]; then
    log_error "Insufficient disk space: ${AVAILABLE_SPACE}GB available"
    exit 1
fi

# Check Podman is running
if ! podman info >/dev/null 2>&1; then
    log_error "Podman is not running"
    exit 1
fi

# Backup current state
log_info "Creating backup before deployment..."
bash "$SCRIPT_DIR/backup.sh" "pre-deploy-$(date +%Y%m%d-%H%M%S)"

# Pull latest images
log_info "Pulling latest container images..."
podman compose -f "$COMPOSE_FILE" pull

# Run database migrations
log_info "Running database migrations..."
if [ -f "$SCRIPT_DIR/migrate.sh" ]; then
    bash "$SCRIPT_DIR/migrate.sh" "$ENVIRONMENT" up
else
    log_warn "Migration script not found, skipping migrations"
fi

# Deploy services with rolling update
log_info "Deploying services with rolling update..."

SERVICES=$(podman compose -f "$COMPOSE_FILE" config --services)

for SERVICE in $SERVICES; do
    log_info "Updating service: $SERVICE"
    
    # Scale up new version
    podman compose -f "$COMPOSE_FILE" up -d --no-deps --scale "$SERVICE=2" "$SERVICE" 2>/dev/null || true
    
    # Wait for new instance to be healthy
    sleep 10
    
    # Scale down old version
    podman compose -f "$COMPOSE_FILE" up -d --no-deps --scale "$SERVICE=1" "$SERVICE"
    
    # Wait for service to stabilize
    sleep 5
done

# Final deployment
log_info "Finalizing deployment..."
podman compose -f "$COMPOSE_FILE" up -d

# Wait for services to be ready
log_info "Waiting for services to be ready..."
sleep 30

# Health checks
log_info "Running health checks..."
HEALTH_CHECK_FAILED=0

# Check API health
if command -v curl &> /dev/null; then
    API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health || echo "000")
    if [ "$API_HEALTH" = "200" ]; then
        log_info "API health check: PASSED"
    else
        log_error "API health check: FAILED (HTTP $API_HEALTH)"
        HEALTH_CHECK_FAILED=1
    fi
fi

# Check database connectivity
DB_HEALTH=$(podman compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U postgres 2>&1 || echo "failed")
if [[ "$DB_HEALTH" == *"accepting connections"* ]]; then
    log_info "Database health check: PASSED"
else
    log_error "Database health check: FAILED"
    HEALTH_CHECK_FAILED=1
fi

# Check Redis connectivity
REDIS_HEALTH=$(podman compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping 2>&1 || echo "failed")
if [[ "$REDIS_HEALTH" == *"PONG"* ]]; then
    log_info "Redis health check: PASSED"
else
    log_error "Redis health check: FAILED"
    HEALTH_CHECK_FAILED=1
fi

if [ $HEALTH_CHECK_FAILED -eq 1 ]; then
    log_error "Health checks failed! Consider rolling back."
    exit 1
fi

# Cleanup old images
log_info "Cleaning up unused local images..."
podman image prune -f

# Post-deployment tasks
log_info "Running post-deployment tasks..."

# Restart any failed services
podman compose -f "$COMPOSE_FILE" up -d

# Show running services
log_info "Running services:"
podman compose -f "$COMPOSE_FILE" ps

log_info "Deployment to $ENVIRONMENT completed successfully!"

# Send notification (if configured)
if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"✅ Deployment to $ENVIRONMENT completed successfully\",\"blocks\":[{\"type\":\"section\",\"text\":{\"type\":\"mrkdwn\",\"text\":\"*Deployment Status*\n✅ Successfully deployed to *$ENVIRONMENT*\n*Image Tag:* $IMAGE_TAG\n*Time:* $(date)\"}}]}" \
        2>/dev/null || true
fi

exit 0
