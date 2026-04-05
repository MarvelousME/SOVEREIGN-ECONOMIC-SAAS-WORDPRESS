# UBI-CMS Rollback Procedures

## Table of Contents

1. [When to Rollback](#when-to-rollback)
2. [Rollback Strategies](#rollback-strategies)
3. [Rollback Procedures](#rollback-procedures)
4. [Post-Rollback Actions](#post-rollback-actions)
5. [Preventing Future Rollbacks](#preventing-future-rollbacks)

## When to Rollback

### Rollback Triggers

Immediate rollback is required when:

- **Service Down**: Service is completely unavailable
- **Data Corruption**: Database or data integrity issues detected
- **Security Breach**: Active security vulnerability being exploited
- **Critical Bug**: Production-breaking bug introduced
- **Performance Degradation**: >50% performance drop
- **Failed Health Checks**: Health checks failing after deployment

### Rollback Decision Matrix

| Severity | Impact | Action | Timeline |
|----------|--------|--------|----------|
| Critical | Service down | Immediate rollback | < 5 min |
| High | 50%+ users affected | Rollback after quick fix attempt | < 15 min |
| Medium | < 50% users affected | Attempt fix, rollback if unfixable | < 30 min |
| Low | Minor issues | Fix forward | N/A |

## Rollback Strategies

### Strategy 1: Image Tag Rollback (Fastest)

**Use when:** Quick rollback needed, no database migrations

**Pros:**
- Fastest method (< 5 minutes)
- No data loss
- Easily repeatable

**Cons:**
- Doesn't rollback database changes
- May cause issues if schema changed

### Strategy 2: Backup Restore (Safest)

**Use when:** Database changes made, data corruption suspected

**Pros:**
- Complete system restore
- No inconsistencies
- Verifiable state

**Cons:**
- Slower (15-30 minutes)
- May lose recent data
- Requires valid backup

### Strategy 3: Blue-Green Deployment Rollback

**Use when:** Zero-downtime rollback required

**Pros:**
- No downtime
- Instant rollback
- Can verify before switching

**Cons:**
- Requires dual environments
- More complex setup
- Higher resource usage

## Rollback Procedures

### Quick Rollback (Image Tag)

#### Step 1: Identify Last Known Good Version

```bash
# List recent deployments
git tag -l --sort=-version:refname | head -5

# Or check container registry
docker images | grep ubi-cms

# Or check GitHub releases
gh release list --limit 5
```

#### Step 2: Execute Rollback

```bash
# Automated rollback script
./scripts/rollback.sh production

# Or manual rollback
cd /opt/ubi-cms

# Set previous image tag
export IMAGE_TAG=v1.2.2  # Previous stable version

# Pull previous images
docker compose -f docker-compose.prod.yml pull

# Deploy previous version
docker compose -f docker-compose.prod.yml up -d

# Monitor deployment
docker compose -f docker-compose.prod.yml logs -f
```

#### Step 3: Verify Rollback

```bash
# Check service health
curl https://api.yourdomain.com/health

# Check version
curl https://api.yourdomain.com/api/v1/version

# Check all endpoints
./scripts/smoke-tests.sh production

# Monitor metrics
# Open Grafana and verify metrics are normal
```

**Expected Time:** 5-10 minutes

### Full Rollback (With Backup Restore)

#### Step 1: Stop Services

```bash
# Stop all services
docker compose -f docker-compose.prod.yml down

# Verify all containers stopped
docker ps | grep ubi-cms
```

#### Step 2: Identify Backup

```bash
# List available backups
ls -lht /var/backups/ubi-cms/*.tar.gz | head -10

# Find pre-deployment backup
ls -lht /var/backups/ubi-cms/pre-deploy-*.tar.gz | head -1

# Or use specific backup
BACKUP_NAME="backup-20240325-143000"
```

#### Step 3: Restore from Backup

```bash
# Run restore script
./scripts/restore.sh $BACKUP_NAME --force

# Script will:
# 1. Create pre-restore backup
# 2. Restore database
# 3. Restore Redis data
# 4. Restore MinIO data
# 5. Restore configurations
# 6. Start services
```

#### Step 4: Verify Restore

```bash
# Check database
docker compose exec postgres psql -U postgres -c \
  "SELECT COUNT(*) FROM users;"

# Check Redis
docker compose exec redis redis-cli PING

# Check MinIO
curl http://localhost:9000/minio/health/live

# Check all services
docker compose ps
```

#### Step 5: Resume Traffic

```bash
# Start all services
docker compose -f docker-compose.prod.yml up -d

# Verify health
./scripts/smoke-tests.sh production
```

**Expected Time:** 15-30 minutes

### Database Migration Rollback

#### If Migrations Can Be Automatically Reversed

```bash
# Check migration status
./scripts/migrate.sh production status

# Rollback last migration
./scripts/migrate.sh production down

# Verify rollback
docker compose exec postgres psql -U postgres -d ubi_cms -c \
  "SELECT * FROM pgmigrations ORDER BY id DESC LIMIT 5;"
```

#### If Migrations Cannot Be Reversed

```bash
# Restore database from backup
BACKUP_FILE=$(ls -t /var/backups/ubi-cms/pre-deploy-*.tar.gz | head -1)

# Extract database backup
tar xzf $BACKUP_FILE -C /tmp

# Stop services
docker compose down

# Restore database
gunzip -c /tmp/*/postgres-full.sql.gz | \
  docker compose exec -T postgres psql -U postgres

# Start services
docker compose up -d
```

### Blue-Green Rollback

#### Prerequisites

- Two identical environments (blue and green)
- Load balancer configured
- Both environments running

#### Procedure

```bash
# 1. Identify current active environment
ACTIVE=$(curl -s https://api.yourdomain.com/api/v1/environment)
echo "Active environment: $ACTIVE"

# 2. Switch traffic to previous environment
if [ "$ACTIVE" = "green" ]; then
    ROLLBACK_TO="blue"
else
    ROLLBACK_TO="green"
fi

# 3. Update load balancer
# (Example with Traefik)
docker compose exec gateway traefik healthcheck

# 4. Switch traffic (update DNS or load balancer config)
# This depends on your infrastructure

# 5. Verify traffic switched
curl -s https://api.yourdomain.com/api/v1/environment

# 6. Monitor for issues
tail -f /var/log/traefik/access.log
```

**Expected Time:** < 1 minute (instant switch)

## Post-Rollback Actions

### Immediate Actions (Within 1 Hour)

1. **Verify System Stability**
```bash
# Monitor for 15 minutes
watch -n 5 'curl -s https://api.yourdomain.com/health'

# Check error rates
docker compose logs | grep -i error | wc -l

# Check metrics in Grafana
```

2. **Notify Stakeholders**
```bash
# Send notification
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "⏪ ROLLBACK COMPLETED",
    "blocks": [{
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Production Rollback*\n✅ Rollback to v1.2.2 completed\n🔍 Investigating root cause\n📊 System is stable"
      }
    }]
  }'
```

3. **Document Incident**
```bash
# Create incident report
cat > incident-$(date +%Y%m%d-%H%M%S).md <<EOF
# Incident Report

## Summary
- **Date**: $(date)
- **Severity**: High
- **Duration**: 15 minutes
- **Action**: Rollback to v1.2.2

## Timeline
- 14:30: Deployment started (v1.2.3)
- 14:35: Issue detected (high error rate)
- 14:37: Rollback initiated
- 14:45: Rollback completed
- 14:50: System verified stable

## Root Cause
[To be determined]

## Impact
- Approximately 5% of users affected
- No data loss
- Service degradation for 15 minutes

## Action Items
- [ ] Investigate root cause
- [ ] Add tests to prevent recurrence
- [ ] Update deployment checklist
- [ ] Review rollback procedures
EOF
```

### Follow-Up Actions (Within 24 Hours)

1. **Root Cause Analysis**
   - Review logs from failed deployment
   - Identify what went wrong
   - Determine why testing didn't catch it

2. **Fix and Test**
   - Create hotfix branch
   - Fix the issue
   - Add regression tests
   - Test thoroughly in staging

3. **Update Procedures**
   - Update deployment checklist
   - Add additional health checks
   - Improve monitoring/alerting

4. **Post-Mortem Meeting**
   - Review timeline
   - Discuss lessons learned
   - Assign action items

### Cleanup Actions

```bash
# Remove failed deployment artifacts
docker image prune -a -f

# Clean up temporary files
rm -rf /tmp/ubi-cms-*

# Archive incident logs
mkdir -p /var/log/ubi-cms/incidents/$(date +%Y%m%d)
docker compose logs > /var/log/ubi-cms/incidents/$(date +%Y%m%d)/rollback.log
```

## Preventing Future Rollbacks

### Pre-Deployment Checklist

- [ ] All tests passing (unit, integration, e2e)
- [ ] Security scans completed
- [ ] Performance tests passed
- [ ] Staging deployment successful
- [ ] Database migrations tested
- [ ] Rollback plan prepared
- [ ] Monitoring alerts configured
- [ ] Smoke tests prepared

### Deployment Best Practices

1. **Use Feature Flags**
```javascript
if (featureFlags.newFeature) {
  // New code
} else {
  // Old code
}
```

2. **Deploy During Low-Traffic Hours**
   - Schedule deployments for off-peak times
   - Minimize user impact

3. **Gradual Rollout**
   - Deploy to small percentage of users first
   - Monitor metrics
   - Gradually increase traffic

4. **Automated Health Checks**
   - Implement comprehensive health checks
   - Automate smoke tests
   - Set up alerting

5. **Database Migration Strategy**
   - Make migrations backwards compatible
   - Deploy migrations separately from code
   - Test rollback procedures

### Monitoring and Alerts

```yaml
# Example Prometheus alert rules
groups:
  - name: deployment
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 2m
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }}%"
        
      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        annotations:
          summary: "Slow response time detected"
          
      - alert: ServiceDown
        expr: up{job="ubi-cms"} == 0
        for: 1m
        annotations:
          summary: "Service is down"
```

## Emergency Contacts

### Rollback Authority

**Can initiate rollback without approval:**
- On-call engineer
- Engineering lead
- CTO

**Must be notified:**
- Product manager
- Engineering team
- Customer support

### Escalation

1. **On-call engineer** (responds immediately)
2. **Engineering lead** (if issue not resolved in 15 min)
3. **CTO** (if issue not resolved in 30 min)

### Contact Methods

- **PagerDuty**: Primary alert method
- **Slack**: #incidents channel
- **Phone**: Emergency contact list

## Appendix

### Rollback Decision Tree

```
Issue Detected
    ├─ Service Down? 
    │   └─ YES → Immediate Rollback
    │
    ├─ Data Corruption?
    │   └─ YES → Restore from Backup
    │
    ├─ Quick Fix Available?
    │   ├─ YES → Attempt Fix (5 min timeout)
    │   └─ NO → Rollback
    │
    └─ < 50% Users Affected?
        ├─ YES → Monitor & Fix Forward
        └─ NO → Rollback
```

### Rollback Checklist

**Pre-Rollback:**
- [ ] Issue confirmed and documented
- [ ] Rollback decision approved
- [ ] Last known good version identified
- [ ] Stakeholders notified
- [ ] Monitoring ready

**During Rollback:**
- [ ] Services stopped
- [ ] Previous version deployed
- [ ] Database restored (if needed)
- [ ] Services started
- [ ] Health checks passing

**Post-Rollback:**
- [ ] System verified stable
- [ ] Users notified
- [ ] Incident documented
- [ ] Post-mortem scheduled
- [ ] Fix planned
