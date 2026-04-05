# UBI-CMS Troubleshooting Guide

## Table of Contents

1. [Deployment Issues](#deployment-issues)
2. [Service Issues](#service-issues)
3. [Database Issues](#database-issues)
4. [Network Issues](#network-issues)
5. [Performance Issues](#performance-issues)
6. [Security Issues](#security-issues)

## Deployment Issues

### Build Failures

**Problem:** Docker build fails during CI/CD

**Symptoms:**
```
ERROR: failed to solve: failed to compute cache key
```

**Solutions:**

1. Clear build cache:
```bash
docker buildx prune -a -f
```

2. Check Dockerfile syntax:
```bash
docker build --no-cache -t test ./api
```

3. Verify base image availability:
```bash
docker pull node:18-alpine
```

4. Check disk space:
```bash
df -h
docker system df
```

### Migration Failures

**Problem:** Database migrations fail during deployment

**Symptoms:**
```
ERROR: relation "users" already exists
ERROR: column "new_column" does not exist
```

**Solutions:**

1. Check migration status:
```bash
docker compose exec postgres psql -U postgres -d ubi_cms -c \
  "SELECT * FROM pgmigrations;"
```

2. Rollback failed migration:
```bash
./scripts/migrate.sh production down
```

3. Fix migration file and re-run:
```bash
./scripts/migrate.sh production up
```

4. Manual intervention (last resort):
```bash
docker compose exec postgres psql -U postgres -d ubi_cms
# Fix schema manually
```

### Container Won't Start

**Problem:** Service container fails to start

**Symptoms:**
```
Container ubi-cms-api exited with code 1
```

**Solutions:**

1. Check logs:
```bash
docker compose logs api
```

2. Check environment variables:
```bash
docker compose config | grep -A 10 api
```

3. Verify dependencies are running:
```bash
docker compose ps
```

4. Test container manually:
```bash
docker run -it --rm ubi-cms-api sh
```

## Service Issues

### API Not Responding

**Problem:** API returns 502/503 errors

**Diagnosis:**

```bash
# Check API container status
docker compose ps api

# Check API logs
docker compose logs --tail=100 api

# Check health endpoint
curl http://localhost:3000/health

# Check resource usage
docker stats api
```

**Solutions:**

1. Restart API service:
```bash
docker compose restart api
```

2. Check database connectivity:
```bash
docker compose exec api node -e "
  const { Client } = require('pg');
  const client = new Client(process.env.DATABASE_URL);
  client.connect().then(() => console.log('Connected')).catch(console.error);
"
```

3. Scale up if needed:
```bash
docker compose up -d --scale api=3
```

### Keycloak Authentication Failures

**Problem:** Users cannot authenticate

**Diagnosis:**

```bash
# Check Keycloak status
docker compose ps keycloak

# Check Keycloak logs
docker compose logs keycloak | grep ERROR

# Test Keycloak endpoint
curl http://localhost:8080/realms/ubi-cms/.well-known/openid-configuration
```

**Solutions:**

1. Verify realm configuration:
```bash
docker compose exec keycloak /opt/keycloak/bin/kcadm.sh config credentials \
  --server http://localhost:8080 \
  --realm master \
  --user admin

docker compose exec keycloak /opt/keycloak/bin/kcadm.sh get realms/ubi-cms
```

2. Check database connection:
```bash
docker compose exec keycloak /opt/keycloak/bin/kcadm.sh get serverinfo
```

3. Restart Keycloak:
```bash
docker compose restart keycloak
```

### NATS Connection Issues

**Problem:** Events not being published/consumed

**Diagnosis:**

```bash
# Check NATS status
docker compose ps nats

# Check NATS monitoring
curl http://localhost:8222/varz

# Check connections
curl http://localhost:8222/connz
```

**Solutions:**

1. Verify NATS is accessible:
```bash
docker compose exec api node -e "
  const NATS = require('nats');
  NATS.connect({ servers: process.env.NATS_URL })
    .then(() => console.log('Connected'))
    .catch(console.error);
"
```

2. Check JetStream status:
```bash
curl http://localhost:8222/jsz
```

3. Restart NATS:
```bash
docker compose restart nats
```

## Database Issues

### Connection Pool Exhausted

**Problem:** "Too many clients already" error

**Diagnosis:**

```bash
# Check current connections
docker compose exec postgres psql -U postgres -c \
  "SELECT count(*) FROM pg_stat_activity;"

# Check max connections
docker compose exec postgres psql -U postgres -c \
  "SHOW max_connections;"

# Check connection sources
docker compose exec postgres psql -U postgres -c \
  "SELECT client_addr, count(*) 
   FROM pg_stat_activity 
   GROUP BY client_addr 
   ORDER BY count DESC;"
```

**Solutions:**

1. Increase max_connections:
```bash
docker compose exec postgres psql -U postgres -c \
  "ALTER SYSTEM SET max_connections = 200;"

docker compose restart postgres
```

2. Kill idle connections:
```bash
docker compose exec postgres psql -U postgres -c \
  "SELECT pg_terminate_backend(pid) 
   FROM pg_stat_activity 
   WHERE state = 'idle' 
   AND state_change < now() - interval '10 minutes';"
```

3. Optimize connection pooling in application

### Slow Queries

**Problem:** Database queries taking too long

**Diagnosis:**

```bash
# Enable pg_stat_statements
docker compose exec postgres psql -U postgres -d ubi_cms -c \
  "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"

# Find slow queries
docker compose exec postgres psql -U postgres -d ubi_cms -c \
  "SELECT query, calls, total_time, mean_time, max_time
   FROM pg_stat_statements 
   ORDER BY mean_time DESC 
   LIMIT 10;"

# Check for missing indexes
docker compose exec postgres psql -U postgres -d ubi_cms -c \
  "SELECT schemaname, tablename, attname, n_distinct, correlation
   FROM pg_stats
   WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
   ORDER BY n_distinct DESC;"
```

**Solutions:**

1. Add missing indexes:
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
```

2. Analyze tables:
```bash
docker compose exec postgres psql -U postgres -d ubi_cms -c "VACUUM ANALYZE;"
```

3. Optimize query:
```bash
# Use EXPLAIN ANALYZE
docker compose exec postgres psql -U postgres -d ubi_cms -c \
  "EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';"
```

### Replication Lag

**Problem:** Read replicas are behind primary

**Diagnosis:**

```bash
# Check replication status
docker compose exec postgres psql -U postgres -c \
  "SELECT client_addr, state, sync_state, 
   pg_wal_lsn_diff(sent_lsn, replay_lsn) AS lag_bytes
   FROM pg_stat_replication;"

# Check replication slots
docker compose exec postgres psql -U postgres -c \
  "SELECT slot_name, active, restart_lsn 
   FROM pg_replication_slots;"
```

**Solutions:**

1. Check network latency between primary and replica

2. Increase wal_sender_timeout:
```bash
docker compose exec postgres psql -U postgres -c \
  "ALTER SYSTEM SET wal_sender_timeout = '120s';"
```

3. Monitor WAL files:
```bash
docker compose exec postgres psql -U postgres -c \
  "SELECT count(*) FROM pg_ls_waldir();"
```

## Network Issues

### DNS Resolution Failures

**Problem:** Services cannot resolve each other

**Diagnosis:**

```bash
# Test DNS resolution
docker compose exec api nslookup postgres

# Check Docker network
docker network inspect ubi-cms-network

# Check /etc/hosts
docker compose exec api cat /etc/hosts
```

**Solutions:**

1. Restart Docker daemon:
```bash
sudo systemctl restart docker
```

2. Recreate network:
```bash
docker compose down
docker network rm ubi-cms-network
docker compose up -d
```

### SSL/TLS Certificate Issues

**Problem:** HTTPS connections failing

**Diagnosis:**

```bash
# Check certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Check Let's Encrypt renewal
docker compose logs gateway | grep -i acme

# Verify certificate files
ls -l docker/certs/
```

**Solutions:**

1. Force certificate renewal:
```bash
rm docker/certs/acme.json
docker compose restart gateway
```

2. Check DNS records:
```bash
dig yourdomain.com
```

3. Verify firewall rules:
```bash
sudo ufw status
sudo iptables -L
```

### Port Conflicts

**Problem:** Cannot bind to port (already in use)

**Diagnosis:**

```bash
# Find process using port
sudo lsof -i :3000
sudo netstat -tulpn | grep :3000

# Check Docker port mappings
docker compose ps
docker port ubi-cms-api
```

**Solutions:**

1. Stop conflicting process:
```bash
sudo kill -9 <PID>
```

2. Change port mapping in docker-compose.yml

3. Use different host port:
```yaml
ports:
  - "3001:3000"
```

## Performance Issues

### High CPU Usage

**Diagnosis:**

```bash
# Check container CPU usage
docker stats

# Check processes
docker compose exec api top

# Check for CPU-intensive queries
docker compose exec postgres psql -U postgres -d ubi_cms -c \
  "SELECT pid, query, state, query_start
   FROM pg_stat_activity 
   WHERE state != 'idle' 
   ORDER BY query_start;"
```

**Solutions:**

1. Identify and optimize slow code paths

2. Scale horizontally:
```bash
docker compose up -d --scale api=3
```

3. Add CPU limits:
```yaml
deploy:
  resources:
    limits:
      cpus: '2'
```

### High Memory Usage

**Diagnosis:**

```bash
# Check memory usage
docker stats
free -h

# Check for memory leaks
docker compose logs api | grep -i "memory\|heap"

# Monitor Node.js heap
docker compose exec api node -e "console.log(process.memoryUsage())"
```

**Solutions:**

1. Restart service to clear memory:
```bash
docker compose restart api
```

2. Add memory limits:
```yaml
deploy:
  resources:
    limits:
      memory: 2G
```

3. Profile application for memory leaks

### Slow Response Times

**Diagnosis:**

```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/v1/users

# Create curl-format.txt
cat > curl-format.txt <<EOF
    time_namelookup:  %{time_namelookup}\n
       time_connect:  %{time_connect}\n
    time_appconnect:  %{time_appconnect}\n
   time_pretransfer:  %{time_pretransfer}\n
      time_redirect:  %{time_redirect}\n
 time_starttransfer:  %{time_starttransfer}\n
                    ----------\n
         time_total:  %{time_total}\n
EOF

# Check database query times
# Check Redis cache hit rate
docker compose exec redis redis-cli INFO stats
```

**Solutions:**

1. Enable caching:
```bash
# Warm cache
docker compose exec api npm run cache:warm
```

2. Add database indexes

3. Enable CDN for static assets

4. Optimize queries

## Security Issues

### Unauthorized Access

**Problem:** Suspicious access attempts

**Diagnosis:**

```bash
# Check access logs
docker compose logs gateway | grep -i "401\|403"

# Check failed login attempts
docker compose logs keycloak | grep -i "failed\|invalid"

# Review recent authentication events
docker compose exec postgres psql -U postgres -d ubi_cms -c \
  "SELECT * FROM auth_logs 
   WHERE created_at > now() - interval '1 hour' 
   ORDER BY created_at DESC;"
```

**Solutions:**

1. Block IP address:
```bash
sudo ufw deny from <IP_ADDRESS>
```

2. Rotate compromised credentials:
```bash
./scripts/rotate-secrets.sh
```

3. Review and update firewall rules

### Secret Exposure

**Problem:** Secrets detected in logs or repository

**Actions:**

1. Rotate exposed secrets immediately:
```bash
# Generate new secrets
openssl rand -base64 32

# Update Docker secrets
echo "new-password" | docker secret create db_password_v2 -
```

2. Scan repository for secrets:
```bash
# Use gitleaks
docker run --rm -v $(pwd):/repo zricethezav/gitleaks:latest detect --source /repo
```

3. Remove from Git history:
```bash
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env' \
  --prune-empty --tag-name-filter cat -- --all
```

### Vulnerability Detected

**Problem:** Security scanner found vulnerability

**Actions:**

1. Assess severity and impact

2. Check for patches:
```bash
# Update dependencies
npm audit fix

# Rebuild images
docker compose build --no-cache
```

3. Apply workaround if no patch available

4. Monitor for exploitation attempts

## Getting Help

If issues persist after troubleshooting:

1. **Check Documentation:**
   - [Setup Guide](./setup.md)
   - [Runbook](./runbook.md)
   - [Rollback Procedures](./rollback.md)

2. **Contact Support:**
   - On-call engineer: See PagerDuty
   - DevOps team: devops@example.com
   - Engineering lead: engineering-lead@example.com

3. **Escalate:**
   - Create incident ticket
   - Notify stakeholders
   - Engage vendor support if needed
