# UBI-CMS Deployment Runbook

## Table of Contents

1. [Routine Operations](#routine-operations)
2. [Deployment Procedures](#deployment-procedures)
3. [Monitoring](#monitoring)
4. [Incident Response](#incident-response)
5. [Maintenance Tasks](#maintenance-tasks)

## Routine Operations

### Daily Health Checks

```bash
# Check all services are running
docker compose ps

# Check API health
curl https://api.yourdomain.com/health

# Check database status
docker compose exec postgres pg_isready -U postgres

# Check Redis status
docker compose exec redis redis-cli ping

# View recent errors
docker compose logs --tail=100 | grep -i error

# Check disk space
df -h

# Check Docker disk usage
docker system df
```

### Weekly Tasks

- Review monitoring dashboards
- Check backup success
- Review security scan results
- Update dependencies (if applicable)
- Clean up old Docker images

### Monthly Tasks

- Test backup restore procedure
- Review and rotate logs
- Security audit
- Performance review
- Capacity planning

## Deployment Procedures

### Standard Deployment

#### 1. Pre-Deployment Checklist

- [ ] Code reviewed and approved
- [ ] All tests passing in CI
- [ ] Security scans completed
- [ ] Database migrations tested
- [ ] Rollback plan prepared
- [ ] Stakeholders notified
- [ ] Change window scheduled

#### 2. Deploy to Staging

```bash
# Trigger staging deployment
gh workflow run deploy.yml \
  --field environment=staging

# Verify deployment
curl https://staging.yourdomain.com/health

# Run smoke tests
./scripts/smoke-tests.sh staging
```

#### 3. Deploy to Production

```bash
# Create release tag
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3

# Monitor deployment
gh run watch

# Or manual deployment
ssh deploy@production-server
cd /opt/ubi-cms
export IMAGE_TAG=v1.2.3
./scripts/deploy.sh production
```

#### 4. Post-Deployment Verification

```bash
# Check service health
curl https://api.yourdomain.com/health
curl https://api.yourdomain.com/api/v1/health/ready
curl https://api.yourdomain.com/api/v1/health/live

# Monitor logs
docker compose logs -f --tail=100

# Check metrics
# Open Grafana: https://monitoring.yourdomain.com

# Run full smoke tests
./scripts/smoke-tests.sh production
```

### Emergency Hotfix Deployment

```bash
# Create hotfix branch
git checkout -b hotfix/critical-fix main

# Make changes and commit
git commit -m "fix: critical security issue"

# Create hotfix tag
git tag -a v1.2.4-hotfix -m "Hotfix for critical issue"
git push origin v1.2.4-hotfix

# Deploy immediately
gh workflow run deploy.yml \
  --field environment=production
```

## Monitoring

### Prometheus Queries

```promql
# Service uptime
up{job="ubi-cms"}

# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# Response time (95th percentile)
histogram_quantile(0.95, 
  rate(http_request_duration_seconds_bucket[5m])
)

# Database connections
pg_stat_database_numbackends

# Redis memory usage
redis_memory_used_bytes
```

### Grafana Dashboards

Access: `https://monitoring.yourdomain.com`

**System Overview Dashboard:**
- CPU usage
- Memory usage
- Disk I/O
- Network traffic

**Application Dashboard:**
- Request rate
- Error rate
- Response time
- Active users

**Database Dashboard:**
- Connection pool
- Query performance
- Lock contention
- Replication lag

### Alert Channels

**Critical Alerts** (PagerDuty):
- Service down
- Database unreachable
- High error rate (>5%)

**Warning Alerts** (Slack):
- High CPU usage (>80%)
- High memory usage (>80%)
- Slow response time (>1s)
- Disk space low (<20%)

**Info Alerts** (Email):
- Deployment completed
- Backup completed
- Certificate renewal

## Incident Response

### Severity Levels

**P0 - Critical:**
- Service completely down
- Data loss
- Security breach
- Response time: Immediate

**P1 - High:**
- Degraded performance
- Partial service outage
- Response time: 15 minutes

**P2 - Medium:**
- Minor feature broken
- Slow performance
- Response time: 2 hours

**P3 - Low:**
- Cosmetic issues
- Enhancement requests
- Response time: Next business day

### Domain Runbook: Rewards ↔ Ledger Saga/Outbox

For reward-to-ledger eventual consistency incidents, use the dedicated runbook:

- `docs/integration/rewards-ledger-saga-outbox-reliability.md`

Fast triage checklist:

1. Check outbox backlog and age (pending > 10 minutes).
2. Check reward->ledger P95 latency against domain SLO.
3. Check DLQ growth and top error class.
4. Check reconciliation mismatch counters.
5. Decide recovery path:
   - replay pending outbox, or
   - bounded DLQ re-drive, or
   - rollback/fix consumer.

Escalate to finance-impacting incident immediately if critical mismatches persist beyond retry window.

### Common Incidents

#### Service Down

```bash
# Check container status
docker compose ps

# View logs
docker compose logs --tail=200 service-name

# Restart service
docker compose restart service-name

# If issue persists, check resources
docker stats
df -h

# Check for resource exhaustion
free -h
```

#### High CPU/Memory Usage

```bash
# Identify resource hog
docker stats

# Check processes
docker compose exec service-name top

# Scale service if needed
docker compose up -d --scale service-name=3

# Investigate logs for memory leaks
docker compose logs service-name | grep -i "memory\|oom"
```

#### Database Connection Issues

```bash
# Check database status
docker compose exec postgres pg_isready

# Check connections
docker compose exec postgres psql -U postgres -c \
  "SELECT count(*) FROM pg_stat_activity;"

# Check connection limit
docker compose exec postgres psql -U postgres -c \
  "SHOW max_connections;"

# Restart database (last resort)
docker compose restart postgres
```

#### Disk Space Full

```bash
# Check disk usage
df -h

# Find large files
du -sh /* | sort -h

# Clean Docker resources
docker system prune -a --volumes

# Clean old logs
find /var/log -name "*.log" -mtime +30 -delete

# Clean old backups
find /var/backups/ubi-cms -name "*.tar.gz" -mtime +30 -delete
```

### Escalation Procedure

1. **Initial Response** (0-5 min)
   - Acknowledge incident
   - Assess severity
   - Notify team

2. **Investigation** (5-15 min)
   - Gather logs and metrics
   - Identify root cause
   - Determine impact

3. **Mitigation** (15-30 min)
   - Implement fix or rollback
   - Verify resolution
   - Update status

4. **Recovery** (30-60 min)
   - Full service restoration
   - Verify all systems normal
   - Close incident

5. **Post-Mortem** (24-48 hours)
   - Document incident
   - Identify improvements
   - Update runbook

## Maintenance Tasks

### Database Maintenance

```bash
# Vacuum database
docker compose exec postgres psql -U postgres -d ubi_cms -c "VACUUM ANALYZE;"

# Reindex
docker compose exec postgres psql -U postgres -d ubi_cms -c "REINDEX DATABASE ubi_cms;"

# Check database size
docker compose exec postgres psql -U postgres -c \
  "SELECT pg_database.datname, 
   pg_size_pretty(pg_database_size(pg_database.datname)) AS size 
   FROM pg_database;"

# Update statistics
docker compose exec postgres psql -U postgres -d ubi_cms -c "ANALYZE;"
```

### Log Rotation

```bash
# Configure logrotate
sudo tee /etc/logrotate.d/ubi-cms <<EOF
/var/log/ubi-cms/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 root root
    sharedscripts
    postrotate
        docker compose -f /opt/ubi-cms/docker-compose.prod.yml kill -s USR1
    endscript
}
EOF

# Test logrotate
sudo logrotate -d /etc/logrotate.d/ubi-cms
```

### Certificate Renewal

```bash
# Check certificate expiry
openssl x509 -in docker/certs/cert.pem -noout -dates

# Force renewal (if needed)
docker compose restart gateway

# Verify new certificate
curl -vI https://yourdomain.com 2>&1 | grep -i expire
```

### Security Updates

```bash
# Update Docker images
docker compose pull

# Restart services
docker compose up -d

# Scan for vulnerabilities
docker scan ubi-cms-api:latest

# Update OS packages
sudo apt update && sudo apt upgrade -y
```

### Backup Verification

```bash
# List recent backups
ls -lht /var/backups/ubi-cms/*.tar.gz | head -5

# Test restore (on staging)
./scripts/restore.sh backup-20240326 --force

# Verify restore
docker compose exec postgres psql -U postgres -c "SELECT COUNT(*) FROM users;"
```

## Performance Optimization

### Database Query Optimization

```bash
# Find slow queries
docker compose exec postgres psql -U postgres -d ubi_cms -c \
  "SELECT query, calls, total_time, mean_time 
   FROM pg_stat_statements 
   ORDER BY total_time DESC LIMIT 10;"

# Enable query logging
docker compose exec postgres psql -U postgres -c \
  "ALTER SYSTEM SET log_min_duration_statement = 1000;"
```

### Cache Warming

```bash
# Warm up Redis cache
docker compose exec api npm run cache:warm

# Verify cache hit rate
docker compose exec redis redis-cli INFO stats | grep keyspace
```

### Resource Tuning

```bash
# Adjust PostgreSQL settings
docker compose exec postgres psql -U postgres -c \
  "ALTER SYSTEM SET shared_buffers = '4GB';"

# Restart to apply
docker compose restart postgres

# Verify settings
docker compose exec postgres psql -U postgres -c "SHOW shared_buffers;"
```

## Contact Information

**On-Call Rotation:**
- Primary: See PagerDuty schedule
- Secondary: See PagerDuty schedule

**Escalation Contacts:**
- Engineering Lead: engineering-lead@example.com
- DevOps Lead: devops-lead@example.com
- CTO: cto@example.com

**External Vendors:**
- Cloud Provider Support: 1-800-XXX-XXXX
- Database Support: support@vendor.com
- Monitoring Support: support@monitoring.com
