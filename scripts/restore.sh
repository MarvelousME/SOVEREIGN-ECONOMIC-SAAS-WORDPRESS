#!/bin/bash
set -e

# UBI-CMS Restore Script
# Usage: ./restore.sh <backup-name> [--force]

BACKUP_NAME=$1
FORCE=${2:-}
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

# Validate input
if [ -z "$BACKUP_NAME" ]; then
    log_error "Usage: $0 <backup-name> [--force]"
    log_info "Available backups:"
    ls -1 "$BACKUP_DIR"/*.tar.gz 2>/dev/null | xargs -n1 basename | sed 's/.tar.gz//' || echo "No backups found"
    exit 1
fi

BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"

if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

log_warn "═══════════════════════════════════════════════════════"
log_warn "  ⚠️  WARNING: This will restore from backup"
log_warn "  ⚠️  All current data will be REPLACED"
log_warn "  ⚠️  Backup: $BACKUP_NAME"
log_warn "═══════════════════════════════════════════════════════"

if [ "$FORCE" != "--force" ]; then
    read -p "Are you sure you want to continue? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Restore cancelled"
        exit 0
    fi
fi

log_info "Starting restore from: $BACKUP_NAME"

# Extract backup
RESTORE_DIR="/tmp/ubi-cms-restore-$$"
mkdir -p "$RESTORE_DIR"

log_info "Extracting backup..."
tar xzf "$BACKUP_FILE" -C "$RESTORE_DIR"

# Find the backup directory
BACKUP_EXTRACTED=$(find "$RESTORE_DIR" -maxdepth 1 -type d -name "backup-*" -o -name "pre-deploy-*" | head -1)

if [ -z "$BACKUP_EXTRACTED" ]; then
    log_error "Failed to find extracted backup directory"
    rm -rf "$RESTORE_DIR"
    exit 1
fi

# Read manifest
if [ -f "$BACKUP_EXTRACTED/manifest.json" ]; then
    log_info "Backup manifest:"
    cat "$BACKUP_EXTRACTED/manifest.json"
fi

# Create pre-restore backup
log_info "Creating pre-restore backup..."
bash "$SCRIPT_DIR/backup.sh" "pre-restore-$(date +%Y%m%d-%H%M%S)"

# Stop services
log_info "Stopping services..."
cd "$PROJECT_ROOT"
podman compose down

# Restore PostgreSQL
if [ -f "$BACKUP_EXTRACTED/postgres-full.sql.gz" ]; then
    log_info "Restoring PostgreSQL database..."
    
    # Start PostgreSQL
    podman compose up -d postgres
    sleep 10
    
    # Drop and recreate databases
    podman exec ubi-cms-postgres psql -U postgres -c "DROP DATABASE IF EXISTS ubi_cms;"
    podman exec ubi-cms-postgres psql -U postgres -c "DROP DATABASE IF EXISTS keycloak;"
    
    # Restore from backup
    gunzip -c "$BACKUP_EXTRACTED/postgres-full.sql.gz" | podman exec -i ubi-cms-postgres psql -U postgres
    
    log_info "PostgreSQL restore completed"
    
    # Stop PostgreSQL
    podman compose stop postgres
else
    log_warn "No PostgreSQL backup found, skipping"
fi

# Restore Redis
if [ -f "$BACKUP_EXTRACTED/redis-dump.rdb" ]; then
    log_info "Restoring Redis data..."
    
    # Copy dump file to volume
    podman compose up -d redis
    sleep 5
    podman compose stop redis
    podman cp "$BACKUP_EXTRACTED/redis-dump.rdb" ubi-cms-redis:/data/dump.rdb
    
    log_info "Redis restore completed"
else
    log_warn "No Redis backup found, skipping"
fi

# Restore MinIO
if [ -d "$BACKUP_EXTRACTED/minio" ]; then
    log_info "Restoring MinIO data..."
    
    podman compose up -d minio
    sleep 10
    
    if command -v mc &> /dev/null; then
        mc alias set local http://localhost:9000 "${MINIO_USER:-minio}" "${MINIO_PASSWORD:-minio}"
        mc mirror "$BACKUP_EXTRACTED/minio" local --overwrite
    else
        log_warn "MinIO client not installed, using podman cp"
        podman cp "$BACKUP_EXTRACTED/minio/." ubi-cms-minio:/data
    fi
    
    log_info "MinIO restore completed"
    
    podman compose stop minio
else
    log_warn "No MinIO backup found, skipping"
fi

# Restore Podman volumes
if [ -d "$BACKUP_EXTRACTED/volumes" ]; then
    log_info "Restoring Podman volumes..."
    
    for volume_backup in "$BACKUP_EXTRACTED/volumes"/*.tar.gz; do
        if [ -f "$volume_backup" ]; then
            volume_name=$(basename "$volume_backup" .tar.gz)
            log_info "Restoring volume: $volume_name"
            
            # Remove existing volume
            podman volume rm "$volume_name" 2>/dev/null || true
            
            # Create new volume
            podman volume create "$volume_name"
            
            # Restore data
            podman run --rm \
                -v "$volume_name:/data" \
                -v "$BACKUP_EXTRACTED/volumes:/backup" \
                alpine sh -c "cd /data && tar xzf /backup/${volume_name}.tar.gz"
        fi
    done
    
    log_info "Podman volumes restore completed"
else
    log_warn "No volume backups found, skipping"
fi

# Restore configuration files
if [ -d "$BACKUP_EXTRACTED/configs" ]; then
    log_info "Restoring configuration files..."
    
    if [ -f "$BACKUP_EXTRACTED/configs/.env" ]; then
        cp "$BACKUP_EXTRACTED/configs/.env" "$PROJECT_ROOT/.env"
    fi
    
    if [ -d "$BACKUP_EXTRACTED/configs/docker" ]; then
        cp -r "$BACKUP_EXTRACTED/configs/docker" "$PROJECT_ROOT/"
    fi
    
    log_info "Configuration restore completed"
fi

# Cleanup
log_info "Cleaning up temporary files..."
rm -rf "$RESTORE_DIR"

# Start all services
log_info "Starting all services..."
podman compose up -d

# Wait for services
log_info "Waiting for services to be ready..."
sleep 30

# Verify restore
log_info "Verifying restore..."

# Check database
DB_CHECK=$(podman compose exec -T postgres psql -U postgres -c "SELECT COUNT(*) FROM pg_database;" 2>&1 || echo "failed")
if [[ "$DB_CHECK" != "failed" ]]; then
    log_info "Database check: PASSED"
else
    log_error "Database check: FAILED"
fi

# Check Redis
REDIS_CHECK=$(podman compose exec -T redis redis-cli ping 2>&1 || echo "failed")
if [[ "$REDIS_CHECK" == *"PONG"* ]]; then
    log_info "Redis check: PASSED"
else
    log_error "Redis check: FAILED"
fi

log_info "Restore completed successfully!"
log_info "Please verify that all services are functioning correctly"

# Send notification
if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"🔄 Restore completed: $BACKUP_NAME\",\"blocks\":[{\"type\":\"section\",\"text\":{\"type\":\"mrkdwn\",\"text\":\"*Restore Status*\n🔄 Restore completed successfully\n*Backup:* $BACKUP_NAME\n*Time:* $(date)\"}}]}" \
        2>/dev/null || true
fi

exit 0
