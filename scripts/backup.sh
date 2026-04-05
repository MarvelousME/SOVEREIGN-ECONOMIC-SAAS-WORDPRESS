#!/bin/bash
set -e

# UBI-CMS Backup Script
# Usage: ./backup.sh [backup-name]

BACKUP_NAME=${1:-backup-$(date +%Y%m%d-%H%M%S)}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/ubi-cms}"
RETENTION_DAYS=${RETENTION_DAYS:-30}

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

# Create backup directory
mkdir -p "$BACKUP_DIR/$BACKUP_NAME"

log_info "Starting backup: $BACKUP_NAME"
log_info "Backup location: $BACKUP_DIR/$BACKUP_NAME"

cd "$PROJECT_ROOT"

# Backup PostgreSQL database
log_info "Backing up PostgreSQL database..."
if podman ps | grep -q ubi-cms-postgres; then
    podman exec ubi-cms-postgres pg_dumpall -U postgres | gzip > "$BACKUP_DIR/$BACKUP_NAME/postgres-full.sql.gz"
    log_info "PostgreSQL backup completed: $(du -h "$BACKUP_DIR/$BACKUP_NAME/postgres-full.sql.gz" | cut -f1)"
else
    log_warn "PostgreSQL container not running, skipping database backup"
fi

# Backup Redis data
log_info "Backing up Redis data..."
if podman ps | grep -q ubi-cms-redis; then
    podman exec ubi-cms-redis redis-cli --rdb /tmp/dump.rdb SAVE
    podman cp ubi-cms-redis:/data/dump.rdb "$BACKUP_DIR/$BACKUP_NAME/redis-dump.rdb"
    log_info "Redis backup completed: $(du -h "$BACKUP_DIR/$BACKUP_NAME/redis-dump.rdb" | cut -f1)"
else
    log_warn "Redis container not running, skipping Redis backup"
fi

# Backup MinIO data
log_info "Backing up MinIO data..."
if podman ps | grep -q ubi-cms-minio; then
    # Create MinIO backup directory
    mkdir -p "$BACKUP_DIR/$BACKUP_NAME/minio"
    
    # Use MinIO client to mirror buckets
    if command -v mc &> /dev/null; then
        mc alias set local http://localhost:9000 "${MINIO_USER:-minio}" "${MINIO_PASSWORD:-minio}"
        mc mirror local "$BACKUP_DIR/$BACKUP_NAME/minio"
        log_info "MinIO backup completed: $(du -sh "$BACKUP_DIR/$BACKUP_NAME/minio" | cut -f1)"
    else
        log_warn "MinIO client not installed, using podman cp instead"
        podman cp ubi-cms-minio:/data "$BACKUP_DIR/$BACKUP_NAME/minio"
    fi
else
    log_warn "MinIO container not running, skipping MinIO backup"
fi

# Backup Podman volumes
log_info "Backing up Podman volumes..."
mkdir -p "$BACKUP_DIR/$BACKUP_NAME/volumes"

for volume in $(podman volume ls -q | grep ubi-cms); do
    log_info "Backing up volume: $volume"
    podman run --rm \
        -v "$volume:/data" \
        -v "$BACKUP_DIR/$BACKUP_NAME/volumes:/backup" \
        alpine tar czf "/backup/${volume}.tar.gz" -C /data .
done

# Backup configuration files
log_info "Backing up configuration files..."
mkdir -p "$BACKUP_DIR/$BACKUP_NAME/configs"

if [ -d "$PROJECT_ROOT/.env" ]; then
    cp "$PROJECT_ROOT/.env" "$BACKUP_DIR/$BACKUP_NAME/configs/"
fi

if [ -f "$PROJECT_ROOT/.env.example" ]; then
    cp "$PROJECT_ROOT/.env.example" "$BACKUP_DIR/$BACKUP_NAME/configs/"
fi

cp -r "$PROJECT_ROOT/docker" "$BACKUP_DIR/$BACKUP_NAME/configs/" 2>/dev/null || true

# Create backup manifest
log_info "Creating backup manifest..."
cat > "$BACKUP_DIR/$BACKUP_NAME/manifest.json" <<EOF
{
  "backup_name": "$BACKUP_NAME",
  "timestamp": "$(date -Iseconds)",
  "hostname": "$(hostname)",
  "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "git_branch": "$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')",
  "components": {
    "postgres": $([ -f "$BACKUP_DIR/$BACKUP_NAME/postgres-full.sql.gz" ] && echo "true" || echo "false"),
    "redis": $([ -f "$BACKUP_DIR/$BACKUP_NAME/redis-dump.rdb" ] && echo "true" || echo "false"),
    "minio": $([ -d "$BACKUP_DIR/$BACKUP_NAME/minio" ] && echo "true" || echo "false"),
    "volumes": true,
    "configs": true
  }
}
EOF

# Calculate total backup size
TOTAL_SIZE=$(du -sh "$BACKUP_DIR/$BACKUP_NAME" | cut -f1)
log_info "Total backup size: $TOTAL_SIZE"

# Compress backup
log_info "Compressing backup..."
cd "$BACKUP_DIR"
tar czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
rm -rf "$BACKUP_NAME"

COMPRESSED_SIZE=$(du -h "${BACKUP_NAME}.tar.gz" | cut -f1)
log_info "Compressed backup size: $COMPRESSED_SIZE"

# Upload to remote storage (if configured)
if [ -n "${S3_BUCKET:-}" ]; then
    log_info "Uploading backup to S3: $S3_BUCKET"
    if command -v aws &> /dev/null; then
        aws s3 cp "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" "s3://${S3_BUCKET}/backups/${BACKUP_NAME}.tar.gz"
        log_info "Backup uploaded to S3"
    else
        log_warn "AWS CLI not installed, skipping S3 upload"
    fi
fi

# Clean up old backups
log_info "Cleaning up old backups (retention: ${RETENTION_DAYS} days)..."
find "$BACKUP_DIR" -name "backup-*.tar.gz" -type f -mtime +${RETENTION_DAYS} -delete
find "$BACKUP_DIR" -name "pre-deploy-*.tar.gz" -type f -mtime +7 -delete

# List recent backups
log_info "Recent backups:"
ls -lht "$BACKUP_DIR"/*.tar.gz 2>/dev/null | head -5 || log_warn "No backups found"

log_info "Backup completed: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"

# Send notification (if configured)
if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"📦 Backup completed: $BACKUP_NAME\",\"blocks\":[{\"type\":\"section\",\"text\":{\"type\":\"mrkdwn\",\"text\":\"*Backup Status*\n📦 Backup completed successfully\n*Name:* $BACKUP_NAME\n*Size:* $COMPRESSED_SIZE\n*Time:* $(date)\"}}]}" \
        2>/dev/null || true
fi

exit 0
