# Auth Service - Deployment Guide

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Keycloak 23+
- Docker & Docker Compose (optional)

### Local Development

1. **Setup Keycloak**
```bash
cd infrastructure/keycloak
docker-compose up -d
./setup.sh
```

2. **Setup Database**
```bash
psql -U postgres -d ubi_cms -f migrations/006_auth_tables.sql
```

3. **Configure Service**
```bash
cd services/auth-service
cp .env.example .env
# Edit .env with your configuration
```

4. **Install and Run**
```bash
npm install
npm run dev
```

### Docker Deployment

```bash
# Build
docker build -t auth-service:1.0.0 .

# Run
docker run -d \
  --name auth-service \
  -p 3001:3001 \
  --env-file .env \
  auth-service:1.0.0
```

### Docker Compose (Full Stack)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ubi_cms
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ../../migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  keycloak:
    image: quay.io/keycloak/keycloak:23.0
    command: start-dev
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: ${KEYCLOAK_DB_PASSWORD}
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD}
    ports:
      - "8080:8080"
    depends_on:
      - postgres

  auth-service:
    build: .
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: production
      PORT: 3001
      POSTGRES_HOST: postgres
      POSTGRES_PORT: 5432
      POSTGRES_DB: ubi_cms
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      KEYCLOAK_URL: http://keycloak:8080
      KEYCLOAK_REALM: ubi-cms
      KEYCLOAK_CLIENT_ID: api-gateway
      KEYCLOAK_CLIENT_SECRET: ${KEYCLOAK_CLIENT_SECRET}
    depends_on:
      - postgres
      - redis
      - keycloak

volumes:
  postgres-data:
  redis-data:
```

### Kubernetes Deployment

Create `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  labels:
    app: auth-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth-service
        image: your-registry/auth-service:1.0.0
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: POSTGRES_HOST
          valueFrom:
            secretKeyRef:
              name: auth-secrets
              key: postgres-host
        - name: KEYCLOAK_CLIENT_SECRET
          valueFrom:
            secretKeyRef:
              name: auth-secrets
              key: keycloak-client-secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: auth-service
spec:
  selector:
    app: auth-service
  ports:
  - port: 80
    targetPort: 3001
  type: ClusterIP
```

## Production Configuration

### Environment Variables

**Required:**
```env
NODE_ENV=production
PORT=3001

# Database
POSTGRES_HOST=your-db-host
POSTGRES_PORT=5432
POSTGRES_DB=ubi_cms
POSTGRES_USER=auth_service
POSTGRES_PASSWORD=<strong-password>

# Redis
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=<strong-password>

# Keycloak
KEYCLOAK_URL=https://auth.yourdomain.com
KEYCLOAK_REALM=ubi-cms
KEYCLOAK_CLIENT_ID=api-gateway
KEYCLOAK_CLIENT_SECRET=<generated-secret>
KEYCLOAK_ADMIN_USERNAME=admin
KEYCLOAK_ADMIN_PASSWORD=<strong-password>

# JWT
JWT_SECRET=<random-256-bit-key>
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d

# SMTP
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=<sendgrid-api-key>
EMAIL_FROM=noreply@yourdomain.com

# URLs
PORTAL_UI_URL=https://portal.yourdomain.com
ADMIN_UI_URL=https://admin.yourdomain.com
```

### Security Hardening

1. **Database Security**
   - Use dedicated database user with minimal permissions
   - Enable SSL/TLS for database connections
   - Regular backups with encryption

2. **Redis Security**
   - Enable authentication
   - Disable dangerous commands
   - Use TLS for connections

3. **Keycloak Security**
   - Use PostgreSQL instead of H2
   - Enable HTTPS
   - Regular security updates
   - Strong admin credentials

4. **Application Security**
   - Run as non-root user
   - Use secrets management (Vault, AWS Secrets Manager)
   - Enable CORS with specific origins
   - Implement CSP headers

### Monitoring

**Recommended Metrics:**
- Request rate and latency
- Error rate (4xx, 5xx)
- Authentication success/failure rate
- Token refresh rate
- Database connection pool usage
- Redis memory usage
- Active sessions count

**Health Checks:**
```bash
# Health endpoint
curl http://localhost:3001/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-03-26T00:00:00.000Z",
  "service": "auth-service",
  "checks": {
    "database": "up",
    "redis": "up"
  }
}
```

### Logging

**Log Levels:**
- Production: `info`
- Staging: `debug`
- Development: `debug`

**Log Aggregation:**
- Use ELK Stack, Datadog, or CloudWatch
- Structured JSON logging enabled
- Include request IDs for tracing

### Scaling

**Horizontal Scaling:**
- Stateless design allows multiple instances
- Use load balancer (NGINX, HAProxy, ALB)
- Session state stored in Redis (shared)

**Vertical Scaling:**
- Increase memory for high traffic
- Tune PostgreSQL connection pool
- Redis memory allocation

### Backup Strategy

**Database:**
```bash
# Daily backup
pg_dump -U postgres ubi_cms > backup_$(date +%Y%m%d).sql

# Restore
psql -U postgres ubi_cms < backup_20240326.sql
```

**Keycloak:**
```bash
# Export realm
/opt/keycloak/bin/kc.sh export \
  --dir /tmp/keycloak-backup \
  --realm ubi-cms \
  --users realm_file

# Import realm
/opt/keycloak/bin/kc.sh import \
  --dir /tmp/keycloak-backup \
  --override true
```

### Disaster Recovery

1. **Regular Backups**
   - Database: Daily automated backups
   - Keycloak: Weekly realm exports
   - Configuration: Version controlled

2. **Recovery Procedures**
   - Document restore procedures
   - Test recovery quarterly
   - Maintain runbooks

3. **High Availability**
   - Multi-region deployment
   - Database replication
   - Redis clustering

## Maintenance

### Updates

```bash
# Update dependencies
npm update

# Security audit
npm audit
npm audit fix

# Rebuild
npm run build
```

### Database Migrations

```bash
# Create new migration
# Add SQL file to migrations/

# Apply migration
psql -U postgres -d ubi_cms -f migrations/XXX_migration.sql
```

### Cleanup Tasks

**Expired Sessions:**
```sql
-- Run daily via cron
SELECT cleanup_expired_sessions();
```

**Expired Tokens:**
```sql
-- Run daily via cron
SELECT cleanup_expired_tokens();
```

**Old Login Attempts:**
```sql
-- Keep 90 days of logs
DELETE FROM login_attempts 
WHERE timestamp < NOW() - INTERVAL '90 days';
```

## Troubleshooting

### Service Won't Start

1. Check environment variables
2. Verify database connection
3. Check Redis connection
4. Review logs: `docker logs auth-service`

### Authentication Failures

1. Verify Keycloak is running
2. Check client configuration
3. Verify JWKS endpoint accessible
4. Check token expiration

### High Memory Usage

1. Check Redis memory usage
2. Review session cleanup job
3. Monitor connection pool

### Slow Response Times

1. Check database query performance
2. Review connection pool settings
3. Check Redis latency
4. Enable query logging

## Support

For issues or questions:
- Review logs in `logs/` directory
- Check Keycloak admin console
- Review database query logs
- Contact platform team

## Version History

- **1.0.0** (2024-03-26) - Initial release
  - User registration and login
  - Keycloak integration
  - JWT validation
  - Session management
  - Brute force protection
