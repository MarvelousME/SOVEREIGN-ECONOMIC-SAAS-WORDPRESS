# Frontend Deployment Guide

Complete deployment instructions for UBI Platform frontend applications.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Docker Deployment](#docker-deployment)
4. [Production Deployment](#production-deployment)
5. [Environment Configuration](#environment-configuration)
6. [Monitoring & Logging](#monitoring--logging)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 20.x or later
- npm 10.x or later
- Docker 24.x or later (for containerized deployment)
- Access to Keycloak instance
- API Gateway URL

## Local Development

### Initial Setup

```bash
# Clone repository (if not already done)
cd frontend

# Portal UI Setup
cd portal-ui
npm install
cp .env.example .env.local

# Configure environment variables
nano .env.local

# Start development server
npm run dev
```

Portal UI will be available at: http://localhost:3000

### Admin UI Setup

```bash
cd ../admin-ui
npm install
cp .env.example .env.local

# Configure environment variables
nano .env.local

# Start development server
npm run dev
```

Admin UI will be available at: http://localhost:3001

### Development Scripts

```bash
# Start development server
npm run dev

# Run type checking
npm run type-check

# Run linting
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

## Docker Deployment

### Build Docker Images

```bash
# From frontend directory

# Build Portal UI
docker build -t ubi-portal-ui:latest \
  --build-arg NEXT_PUBLIC_API_URL=http://api:8000 \
  --build-arg NEXT_PUBLIC_WS_URL=ws://api:8000 \
  ./portal-ui

# Build Admin UI
docker build -t ubi-admin-ui:latest \
  --build-arg NEXT_PUBLIC_API_URL=http://api:8000 \
  --build-arg NEXT_PUBLIC_WS_URL=ws://api:8000 \
  ./admin-ui
```

### Run with Docker Compose

```bash
# Copy environment file
cp .env.docker.example .env.docker

# Edit configuration
nano .env.docker

# Start services
docker-compose --env-file .env.docker up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Individual Container Deployment

```bash
# Run Portal UI
docker run -d \
  --name ubi-portal-ui \
  -p 3000:3000 \
  -e NEXTAUTH_URL=http://localhost:3000 \
  -e NEXTAUTH_SECRET=your-secret \
  -e KEYCLOAK_CLIENT_ID=ubi-portal \
  -e KEYCLOAK_CLIENT_SECRET=your-secret \
  -e KEYCLOAK_ISSUER=http://keycloak:8080/realms/ubi-platform \
  --network ubi-network \
  ubi-portal-ui:latest

# Run Admin UI
docker run -d \
  --name ubi-admin-ui \
  -p 3001:3001 \
  -e NEXTAUTH_URL=http://localhost:3001 \
  -e NEXTAUTH_SECRET=your-secret \
  -e KEYCLOAK_CLIENT_ID=ubi-admin \
  -e KEYCLOAK_CLIENT_SECRET=your-secret \
  -e KEYCLOAK_ISSUER=http://keycloak:8080/realms/ubi-platform \
  --network ubi-network \
  ubi-admin-ui:latest
```

## Production Deployment

### Build Optimization

```bash
# Enable standalone output for smaller images
# Add to next.config.js:
output: 'standalone'

# Build with production optimizations
NODE_ENV=production npm run build

# Analyze bundle size
npm run build --analyze
```

### Environment Variables

Production environment variables must be set at build time:

```bash
# Portal UI
NEXT_PUBLIC_API_URL=https://api.ubi-platform.com \
NEXT_PUBLIC_WS_URL=wss://api.ubi-platform.com \
npm run build

# Admin UI
NEXT_PUBLIC_API_URL=https://api.ubi-platform.com \
NEXT_PUBLIC_WS_URL=wss://api.ubi-platform.com \
npm run build
```

### Kubernetes Deployment

```yaml
# portal-ui-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ubi-portal-ui
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ubi-portal-ui
  template:
    metadata:
      labels:
        app: ubi-portal-ui
    spec:
      containers:
      - name: portal-ui
        image: ubi-portal-ui:latest
        ports:
        - containerPort: 3000
        env:
        - name: NEXTAUTH_URL
          value: "https://portal.ubi-platform.com"
        - name: NEXTAUTH_SECRET
          valueFrom:
            secretKeyRef:
              name: ubi-secrets
              key: portal-nextauth-secret
        - name: KEYCLOAK_CLIENT_ID
          value: "ubi-portal"
        - name: KEYCLOAK_CLIENT_SECRET
          valueFrom:
            secretKeyRef:
              name: ubi-secrets
              key: keycloak-portal-secret
        - name: KEYCLOAK_ISSUER
          value: "https://auth.ubi-platform.com/realms/ubi-platform"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: ubi-portal-ui
spec:
  selector:
    app: ubi-portal-ui
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

### Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/ubi-platform

# Portal UI
server {
    listen 80;
    server_name portal.ubi-platform.com;
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name portal.ubi-platform.com;
    
    ssl_certificate /etc/ssl/certs/ubi-platform.crt;
    ssl_certificate_key /etc/ssl/private/ubi-platform.key;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}

# Admin UI
server {
    listen 80;
    server_name admin.ubi-platform.com;
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name admin.ubi-platform.com;
    
    ssl_certificate /etc/ssl/certs/ubi-platform.crt;
    ssl_certificate_key /etc/ssl/private/ubi-platform.key;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Environment Configuration

### Portal UI Environment Variables

```env
# Public Variables (bundled at build time)
NEXT_PUBLIC_API_URL=https://api.ubi-platform.com
NEXT_PUBLIC_WS_URL=wss://api.ubi-platform.com
NEXT_PUBLIC_ENABLE_WEBSOCKET=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true

# Server-Side Variables (runtime)
NEXTAUTH_URL=https://portal.ubi-platform.com
NEXTAUTH_SECRET=your-generated-secret
KEYCLOAK_CLIENT_ID=ubi-portal
KEYCLOAK_CLIENT_SECRET=your-client-secret
KEYCLOAK_ISSUER=https://auth.ubi-platform.com/realms/ubi-platform
```

### Admin UI Environment Variables

```env
# Public Variables
NEXT_PUBLIC_API_URL=https://api.ubi-platform.com
NEXT_PUBLIC_WS_URL=wss://api.ubi-platform.com

# Server-Side Variables
NEXTAUTH_URL=https://admin.ubi-platform.com
NEXTAUTH_SECRET=your-generated-secret
KEYCLOAK_CLIENT_ID=ubi-admin
KEYCLOAK_CLIENT_SECRET=your-admin-client-secret
KEYCLOAK_ISSUER=https://auth.ubi-platform.com/realms/ubi-platform
```

### Generating Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate Keycloak client secret (done in Keycloak admin)
# Navigate to: Keycloak Admin > Clients > ubi-portal > Credentials
```

## Monitoring & Logging

### Health Checks

```bash
# Portal UI health check
curl http://localhost:3000/api/health

# Admin UI health check
curl http://localhost:3001/api/health
```

### Logging

Production logs are output to stdout/stderr and can be collected by:

```bash
# Docker logs
docker logs ubi-portal-ui -f

# PM2 logs (if using PM2)
pm2 logs ubi-portal-ui

# Systemd logs
journalctl -u ubi-portal-ui -f
```

### Performance Monitoring

Install monitoring tools:

```bash
# Install New Relic
npm install @newrelic/next

# Install Sentry
npm install @sentry/nextjs
```

Configuration in `next.config.js`:

```javascript
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig({
  // Your Next.js config
}, {
  // Sentry webpack plugin options
});
```

## Troubleshooting

### Build Issues

```bash
# Clear cache
rm -rf .next node_modules package-lock.json
npm install
npm run build

# Check Node version
node --version  # Should be 20.x or later

# Verify environment variables
env | grep NEXT_PUBLIC
```

### Runtime Issues

```bash
# Check container logs
docker logs ubi-portal-ui --tail 100

# Verify network connectivity
docker exec ubi-portal-ui ping api

# Check environment variables in container
docker exec ubi-portal-ui env
```

### Authentication Issues

1. Verify Keycloak is running and accessible
2. Check client credentials in Keycloak admin
3. Verify NEXTAUTH_URL matches your domain
4. Ensure cookies are not blocked
5. Check browser console for errors

### API Connection Issues

1. Verify API_URL is accessible from container
2. Check CORS configuration on API
3. Verify network connectivity
4. Check API health endpoint
5. Review proxy/load balancer configuration

## Security Checklist

- [ ] NEXTAUTH_SECRET is strong and unique
- [ ] All secrets stored in secrets manager
- [ ] HTTPS enabled in production
- [ ] CSP headers configured
- [ ] Environment variables validated
- [ ] Dependencies updated regularly
- [ ] Security headers configured in Nginx
- [ ] Rate limiting enabled
- [ ] Logs don't contain sensitive data
- [ ] CORS properly configured

## Performance Optimization

- [ ] Enable CDN for static assets
- [ ] Configure image optimization
- [ ] Enable HTTP/2
- [ ] Implement caching strategy
- [ ] Monitor bundle size
- [ ] Enable compression (gzip/brotli)
- [ ] Use lazy loading
- [ ] Optimize database queries
- [ ] Implement Redis caching
- [ ] Monitor Core Web Vitals

## Backup & Recovery

### Database Backups

User sessions are stored in NextAuth database (if using database strategy).

```bash
# Backup NextAuth database
pg_dump -U postgres -d nextauth > nextauth_backup.sql

# Restore
psql -U postgres -d nextauth < nextauth_backup.sql
```

### Configuration Backups

```bash
# Backup environment files
tar -czf env-backup-$(date +%Y%m%d).tar.gz .env.* 

# Backup configuration files
tar -czf config-backup-$(date +%Y%m%d).tar.gz next.config.js tailwind.config.ts tsconfig.json
```

## Scaling

### Horizontal Scaling

```bash
# Docker Compose
docker-compose up --scale portal-ui=3 --scale admin-ui=2

# Kubernetes
kubectl scale deployment ubi-portal-ui --replicas=5
```

### Load Balancing

Use Nginx, HAProxy, or cloud load balancers to distribute traffic across instances.

## Support

For deployment assistance:
- Review logs for specific errors
- Check firewall rules
- Verify DNS configuration
- Test API connectivity
- Review Keycloak setup
- Contact platform team with logs
