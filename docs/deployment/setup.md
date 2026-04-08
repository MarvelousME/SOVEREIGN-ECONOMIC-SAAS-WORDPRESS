# UBI-CMS Deployment Setup Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Environment Configuration](#environment-configuration)
4. [Secrets Management](#secrets-management)
5. [GitHub Actions Setup](#github-actions-setup)
6. [First Deployment](#first-deployment)

## Prerequisites

### Required Software

- **Docker**: Version 24.0 or higher
- **Docker Compose**: Version 2.0 or higher
- **Git**: Version 2.30 or higher
- **Node.js**: Version 18 or higher (for local development)

### Required Accounts

- GitHub account with repository access
- Container registry access (GitHub Container Registry or Docker Hub)
- Cloud provider account (for production deployment)
- Slack workspace (for notifications, optional)

### Server Requirements

#### Development
- CPU: 2 cores
- RAM: 8 GB
- Disk: 50 GB

#### Staging
- CPU: 4 cores
- RAM: 16 GB
- Disk: 100 GB

#### Production
- CPU: 8+ cores
- RAM: 32+ GB
- Disk: 500+ GB (SSD recommended)

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/ubi-cms.git
cd ubi-cms
```

### 2. Install Dependencies

```bash
# Install API dependencies
cd api
npm install

# Install service dependencies
for service in services/*/; do
  cd "$service"
  npm install
  cd ../..
done
```

### 3. Set Up Docker

```bash
# Verify Docker installation
docker --version
docker compose version

# Create Docker network
docker network create ubi-cms-network
```

## Environment Configuration

### 1. Create Environment Files

```bash
# Copy example environment file
cp .env.example .env

# Edit environment variables
nano .env
```

### 2. Required Environment Variables

#### Development (`.env`)

Typical **full dev stack** (`docker-compose.dev.yml`) values below. The **minimal local API** stack uses **`docker-compose.local.yml`** with database **`ubi_dev`** and password from that file — see [Environment variables](../environment-variables.md).

```bash
# Database
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=ubi_cms

# Redis
REDIS_PASSWORD=redis

# MinIO
MINIO_USER=minio
MINIO_PASSWORD=minio123456

# Keycloak
KEYCLOAK_ADMIN_PASSWORD=admin

# Monitoring
GRAFANA_PASSWORD=admin
```

#### Staging/Production

```bash
# Database
DB_USER=postgres
DB_PASSWORD=<strong-password>
DB_NAME=ubi_cms

# Redis
REDIS_PASSWORD=<strong-password>

# MinIO
MINIO_USER=admin
MINIO_PASSWORD=<strong-password>

# Keycloak
KEYCLOAK_ADMIN_PASSWORD=<strong-password>
KEYCLOAK_HOSTNAME=auth.yourdomain.com

# SSL/TLS
LETSENCRYPT_EMAIL=admin@yourdomain.com
DOMAIN=yourdomain.com

# Monitoring
GRAFANA_PASSWORD=<strong-password>

# Backups
S3_BUCKET=ubi-cms-backups
BACKUP_DIR=/var/backups/ubi-cms

# Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

## Secrets Management

### Development

Use `.env` files (not committed to Git).

### Production

#### Using Docker Secrets

```bash
# Create secrets
echo "strong-password" | docker secret create db_password -
echo "postgres" | docker secret create db_user -
echo "strong-redis-password" | docker secret create redis_password -
echo "strong-minio-password" | docker secret create minio_root_password -
echo "admin" | docker secret create minio_root_user -
echo "strong-keycloak-password" | docker secret create keycloak_admin_password -
echo "strong-grafana-password" | docker secret create grafana_password -
echo "admin@example.com" | docker secret create letsencrypt_email -

# List secrets
docker secret ls
```

#### Using HashiCorp Vault (Recommended for Production)

1. Install Vault:
```bash
wget https://releases.hashicorp.com/vault/1.15.0/vault_1.15.0_linux_amd64.zip
unzip vault_1.15.0_linux_amd64.zip
sudo mv vault /usr/local/bin/
```

2. Initialize Vault:
```bash
vault server -dev
export VAULT_ADDR='http://127.0.0.1:8200'
vault kv put secret/ubi-cms/db password=strong-password
vault kv put secret/ubi-cms/redis password=strong-password
```

## GitHub Actions Setup

### 1. Repository Secrets

Navigate to: **Settings** → **Secrets and variables** → **Actions**

Add the following secrets:

```
DEPLOY_SSH_KEY          # SSH private key for deployment
DEPLOY_HOST             # Deployment server hostname
DEPLOY_USER             # SSH user for deployment
DATABASE_URL            # Production database URL
CODECOV_TOKEN           # Codecov token (optional)
SLACK_WEBHOOK_URL       # Slack webhook for notifications
GITHUB_TOKEN            # Automatically provided by GitHub
```

### 2. Environment-Specific Secrets

Create environments: **dev**, **staging**, **production**

For each environment, add:

```
DATABASE_URL
REDIS_PASSWORD
MINIO_PASSWORD
KEYCLOAK_ADMIN_PASSWORD
```

### 3. Generate SSH Key for Deployment

```bash
# On your local machine
ssh-keygen -t ed25519 -C "ubi-cms-deploy" -f ~/.ssh/ubi-cms-deploy

# Add public key to deployment server
ssh-copy-id -i ~/.ssh/ubi-cms-deploy.pub user@deployment-server

# Add private key to GitHub secrets
cat ~/.ssh/ubi-cms-deploy
# Copy output to DEPLOY_SSH_KEY secret
```

## First Deployment

### Development Environment

```bash
# Start all services
docker compose -f docker-compose.dev.yml up -d

# Check service status
docker compose -f docker-compose.dev.yml ps

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Access services
# API: http://localhost:3000
# Keycloak: http://localhost:8080
# MinIO Console: http://localhost:9001
# Traefik Dashboard: http://localhost:8081
```

### Staging/Production Environment

#### 1. Prepare Server

```bash
# SSH to server
ssh user@deployment-server

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create deployment directory
sudo mkdir -p /opt/ubi-cms
sudo chown $USER:$USER /opt/ubi-cms
```

#### 2. Deploy via GitHub Actions

```bash
# Tag a release
git tag -a v1.0.0 -m "Initial release"
git push origin v1.0.0

# Or trigger manual deployment
# Go to GitHub → Actions → Deploy → Run workflow
```

#### 3. Manual Deployment

```bash
# On deployment server
cd /opt/ubi-cms

# Clone repository
git clone https://github.com/your-org/ubi-cms.git .

# Create secrets
./scripts/create-secrets.sh

# Run deployment
export IMAGE_TAG=v1.0.0
./scripts/deploy.sh production
```

### Post-Deployment Verification

```bash
# Check service health
curl http://your-domain.com/health

# Check API endpoints
curl http://your-domain.com/api/v1/health
curl http://your-domain.com/api/v1/health/ready
curl http://your-domain.com/api/v1/health/live

# View service logs
docker compose logs -f api

# Check resource usage
docker stats
```

## Monitoring Setup

### 1. Access Grafana

Navigate to: `https://monitoring.yourdomain.com`

Default credentials:
- Username: `admin`
- Password: From `GRAFANA_PASSWORD` secret

### 2. Import Dashboards

1. Click **+** → **Import**
2. Upload dashboards from `docker/configs/grafana/dashboards/`
3. Select **Prometheus** as data source

### 3. Configure Alerts

1. Navigate to **Alerting** → **Notification channels**
2. Add Slack notification channel
3. Configure alert rules for:
   - Service down
   - High CPU/memory usage
   - High error rate
   - Database connection pool exhausted

## Backup Configuration

### 1. Configure Automated Backups

```bash
# Edit crontab
crontab -e

# Add daily backup job (2 AM)
0 2 * * * /opt/ubi-cms/scripts/backup.sh

# Add weekly full backup (Sunday 3 AM)
0 3 * * 0 /opt/ubi-cms/scripts/backup.sh weekly-$(date +\%Y\%m\%d)
```

### 2. Test Backup

```bash
# Run manual backup
./scripts/backup.sh test-backup

# List backups
ls -lh /var/backups/ubi-cms/
```

### 3. Test Restore

```bash
# Restore from backup (CAUTION: This will replace current data)
./scripts/restore.sh test-backup --force
```

## Troubleshooting

### Common Issues

#### Services Not Starting

```bash
# Check Docker daemon
sudo systemctl status docker

# Check logs
docker compose logs

# Restart services
docker compose restart
```

#### Database Connection Failed

```bash
# Check database is running
docker compose ps postgres

# Test connection
docker compose exec postgres psql -U postgres -c "SELECT 1;"

# Check environment variables
docker compose config
```

#### SSL Certificate Issues

```bash
# Check Let's Encrypt certificate
ls -l docker/certs/acme.json

# Regenerate certificate
docker compose restart gateway
```

## Next Steps

- [Deployment Runbook](./runbook.md) - Operational procedures
- [Troubleshooting Guide](./troubleshooting.md) - Detailed troubleshooting
- [Rollback Procedures](./rollback.md) - How to rollback deployments
