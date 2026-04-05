# Rewards & Reputation Services - Deployment Guide

Complete guide for deploying the Rewards Engine and Reputation Service.

## Quick Start (Docker)

### 1. Prerequisites
- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum
- 10GB disk space

### 2. Clone and Configure
```bash
cd services/
cp rewards-engine/.env.example rewards-engine/.env
cp reputation-service/.env.example reputation-service/.env

# Edit .env files with your configuration
```

### 3. Deploy with Docker Compose
```bash
# Start all services
docker-compose -f docker-compose.rewards-reputation.yml up -d

# View logs
docker-compose -f docker-compose.rewards-reputation.yml logs -f

# Check health
curl http://localhost:3003/health  # Rewards Engine
curl http://localhost:3002/health  # Reputation Service
```

### 4. Run Migrations
```bash
# Connect to PostgreSQL container
docker exec -it ubi-postgres psql -U ubi_user -d ubi_cms

# Run migration
\i /docker-entrypoint-initdb.d/008_rewards_reputation_schema.sql
```

## Manual Deployment

### 1. System Requirements

**Operating System:**
- Ubuntu 20.04+ / Debian 11+
- CentOS 8+ / RHEL 8+
- macOS 12+

**Software:**
- Node.js 18.x or higher
- PostgreSQL 14+
- Redis 7+
- NATS 2.9+

**Hardware (Minimum):**
- CPU: 2 cores
- RAM: 4GB
- Disk: 20GB SSD

**Hardware (Recommended):**
- CPU: 4+ cores
- RAM: 8GB+
- Disk: 50GB+ SSD

### 2. Install Dependencies

#### Ubuntu/Debian
```bash
# Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL 15
sudo apt-get install -y postgresql-15 postgresql-contrib-15

# Redis
sudo apt-get install -y redis-server

# NATS
wget https://github.com/nats-io/nats-server/releases/download/v2.9.15/nats-server-v2.9.15-linux-amd64.tar.gz
tar -xvf nats-server-v2.9.15-linux-amd64.tar.gz
sudo mv nats-server-v2.9.15-linux-amd64/nats-server /usr/local/bin/
```

#### macOS
```bash
# Using Homebrew
brew install node@18 postgresql@15 redis nats-server
```

### 3. Database Setup

```bash
# Create database
sudo -u postgres psql

CREATE DATABASE ubi_cms;
CREATE USER ubi_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE ubi_cms TO ubi_user;
\q

# Run migrations
psql -U ubi_user -d ubi_cms -f migrations/008_rewards_reputation_schema.sql
```

### 4. Install Services

#### Rewards Engine
```bash
cd services/rewards-engine
npm install
cp .env.example .env
nano .env  # Configure environment variables
npm run build
npm start
```

#### Reputation Service
```bash
cd services/reputation-service
npm install
cp .env.example .env
nano .env  # Configure environment variables
npm run build
npm start
```

### 5. Process Management (PM2)

```bash
# Install PM2
npm install -g pm2

# Start services
cd services/rewards-engine
pm2 start dist/index.js --name rewards-engine

cd ../reputation-service
pm2 start dist/index.js --name reputation-service

# Save configuration
pm2 save

# Setup auto-start
pm2 startup
```

## Production Configuration

### Environment Variables

#### Rewards Engine (.env)
```bash
# Server
PORT=3003
NODE_ENV=production

# Database (use connection pooling)
DATABASE_URL=postgresql://ubi_user:password@localhost:5432/ubi_cms?pool_min=5&pool_max=20

# Redis (use password)
REDIS_URL=redis://:your_redis_password@localhost:6379

# NATS
NATS_URL=nats://localhost:4222

# Service URLs
REPUTATION_SERVICE_URL=http://localhost:3002
LEDGER_SERVICE_URL=http://localhost:3001

# Security
JWT_SECRET=your_very_long_random_secret_key_here

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/ubi/rewards-engine.log
```

#### Reputation Service (.env)
```bash
# Server
PORT=3002
NODE_ENV=production

# Database
DATABASE_URL=postgresql://ubi_user:password@localhost:5432/ubi_cms?pool_min=5&pool_max=20

# Redis
REDIS_URL=redis://:your_redis_password@localhost:6379

# NATS
NATS_URL=nats://localhost:4222

# Service URLs
REWARDS_SERVICE_URL=http://localhost:3003

# Security
JWT_SECRET=your_very_long_random_secret_key_here

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/ubi/reputation-service.log
```

### Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/ubi-services

upstream rewards_engine {
    least_conn;
    server localhost:3003 max_fails=3 fail_timeout=30s;
}

upstream reputation_service {
    least_conn;
    server localhost:3002 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Rewards Engine
    location /api/v1/rewards {
        proxy_pass http://rewards_engine;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Reputation Service
    location /api/v1/reputation {
        proxy_pass http://reputation_service;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Enable configuration:
```bash
sudo ln -s /etc/nginx/sites-available/ubi-services /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Monitoring & Logging

### 1. Application Logs

```bash
# View logs in real-time
pm2 logs rewards-engine
pm2 logs reputation-service

# View specific lines
pm2 logs rewards-engine --lines 100

# Log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 2. Database Monitoring

```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 3. Redis Monitoring

```bash
# Connect to Redis
redis-cli

# Get info
INFO stats
INFO memory

# Monitor commands
MONITOR
```

### 4. Health Checks

```bash
# Create health check script
cat > /usr/local/bin/check-ubi-services.sh << 'EOF'
#!/bin/bash

# Check Rewards Engine
if curl -f http://localhost:3003/health > /dev/null 2>&1; then
    echo "✅ Rewards Engine: OK"
else
    echo "❌ Rewards Engine: FAILED"
    pm2 restart rewards-engine
fi

# Check Reputation Service
if curl -f http://localhost:3002/health > /dev/null 2>&1; then
    echo "✅ Reputation Service: OK"
else
    echo "❌ Reputation Service: FAILED"
    pm2 restart reputation-service
fi
EOF

chmod +x /usr/local/bin/check-ubi-services.sh

# Add to crontab (every 5 minutes)
crontab -e
*/5 * * * * /usr/local/bin/check-ubi-services.sh >> /var/log/ubi/health-check.log 2>&1
```

## Backup & Recovery

### Database Backups

```bash
# Daily backup script
cat > /usr/local/bin/backup-ubi-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/ubi"
mkdir -p $BACKUP_DIR

# Dump database
pg_dump -U ubi_user ubi_cms | gzip > $BACKUP_DIR/ubi_cms_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "ubi_cms_*.sql.gz" -mtime +7 -delete

echo "Backup completed: ubi_cms_$DATE.sql.gz"
EOF

chmod +x /usr/local/bin/backup-ubi-db.sh

# Add to crontab (daily at 2 AM)
0 2 * * * /usr/local/bin/backup-ubi-db.sh
```

### Restore from Backup

```bash
# Stop services
pm2 stop all

# Restore database
gunzip < /var/backups/ubi/ubi_cms_YYYYMMDD_HHMMSS.sql.gz | psql -U ubi_user ubi_cms

# Start services
pm2 start all
```

## Scaling

### Horizontal Scaling

```bash
# Run multiple instances with PM2
pm2 start dist/index.js -i 4 --name rewards-engine  # 4 instances
pm2 start dist/index.js -i 4 --name reputation-service

# Nginx will automatically load balance
```

### Database Read Replicas

```nginx
# PostgreSQL read replica configuration
upstream postgres_read {
    server replica1.db.local:5432;
    server replica2.db.local:5432;
}

# Use read replicas for GET requests
# Use primary for POST/PUT/DELETE
```

## Security Checklist

- [ ] Use strong JWT secrets (64+ characters)
- [ ] Enable PostgreSQL SSL connections
- [ ] Use Redis password authentication
- [ ] Configure firewall rules (UFW/iptables)
- [ ] Enable HTTPS with valid SSL certificates
- [ ] Set up rate limiting in Nginx
- [ ] Use environment variables for secrets
- [ ] Enable audit logging
- [ ] Regular security updates
- [ ] Implement IP whitelisting for admin endpoints
- [ ] Use fail2ban for brute force protection
- [ ] Enable database encryption at rest

## Troubleshooting

### Service Won't Start

```bash
# Check logs
pm2 logs rewards-engine --lines 50
pm2 logs reputation-service --lines 50

# Check port availability
netstat -tuln | grep 3003
netstat -tuln | grep 3002

# Test database connection
psql -U ubi_user -d ubi_cms -c "SELECT 1;"

# Test Redis connection
redis-cli ping
```

### High Memory Usage

```bash
# Check memory usage
pm2 monit

# Restart services
pm2 restart all

# Clear Redis cache
redis-cli FLUSHDB
```

### Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection limits
psql -U ubi_user -d ubi_cms -c "SHOW max_connections;"

# Increase connection limit (if needed)
sudo nano /etc/postgresql/15/main/postgresql.conf
# max_connections = 200

sudo systemctl restart postgresql
```

## Performance Tuning

### PostgreSQL

```sql
-- /etc/postgresql/15/main/postgresql.conf
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB
min_wal_size = 1GB
max_wal_size = 4GB
```

### Redis

```conf
# /etc/redis/redis.conf
maxmemory 512mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

## Support

For issues and questions:
- GitHub Issues: https://github.com/yourusername/ubi-cms/issues
- Documentation: See README.md files in each service
- Email: support@yourdomain.com

## License

MIT
