# Traefik API Gateway Configuration

Complete Traefik setup for UBI-CMS platform with routing, authentication, middleware, and TLS.

## 📁 Directory Structure

```
traefik/
├── traefik.yml                    # Static configuration
├── dynamic/                       # Dynamic configuration
│   ├── middleware.yml            # Security, auth, CORS, rate limiting
│   ├── routes.yml                # Service routing rules
│   └── tls.yml                   # TLS/SSL configuration
├── certs/                        # TLS certificates
│   ├── generate-certs.sh         # Certificate generation script
│   ├── .gitignore               # Ignore certificate files
│   └── README.md                # Certificate documentation
├── docker-compose.traefik.yml   # Docker Compose for Traefik
└── README.md                    # This file
```

## 🚀 Quick Start

### 1. Generate Development Certificates

```bash
cd certs
chmod +x generate-certs.sh
./generate-certs.sh
```

### 2. Update Hosts File

Add these entries to your hosts file:

**Windows:** `C:\Windows\System32\drivers\etc\hosts`  
**Linux/Mac:** `/etc/hosts`

```
127.0.0.1 ubi-cms.local
127.0.0.1 admin.ubi-cms.local
127.0.0.1 api.ubi-cms.local
127.0.0.1 traefik.ubi-cms.local
```

### 3. Create ACME Storage File

```bash
touch certs/acme.json
chmod 600 certs/acme.json
```

### 4. Set Environment Variables

Create `.env` file in the docker directory:

```env
# JWT Secret for authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Keycloak
KEYCLOAK_ADMIN_PASSWORD=admin
KEYCLOAK_REALM_URL=http://keycloak:8080/realms/ubi-cms

# Database
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_PASSWORD=redis

# MinIO
MINIO_USER=minio
MINIO_PASSWORD=minio

# Cloudflare (optional - for DNS challenge)
# CLOUDFLARE_EMAIL=your-email@example.com
# CLOUDFLARE_API_KEY=your-cloudflare-api-key
```

### 5. Start Traefik

```bash
docker-compose -f docker-compose.traefik.yml up -d
```

## 📋 Configuration Overview

### Static Configuration (`traefik.yml`)

**Entry Points:**
- `web` (80) - HTTP, redirects to HTTPS
- `websecure` (443) - HTTPS with TLS
- `traefik` (8080) - Dashboard
- `metrics` (8082) - Prometheus metrics

**Providers:**
- Docker (automatic service discovery)
- File (dynamic configuration)

**Certificate Resolvers:**
- `letsencrypt` - Production Let's Encrypt
- `selfsigned` - Development self-signed

**Features:**
- Access logs (JSON format)
- Prometheus metrics
- OpenTelemetry tracing
- HTTP/2 support
- Automatic HTTPS redirect

### Dynamic Configuration

#### Middleware (`middleware.yml`)

**Authentication:**
- `keycloak-auth` - Forward auth to Keycloak
- `jwt-auth` - JWT validation

**Security Headers:**
- `security-headers` - HSTS, CSP, XSS protection
- `cors-api` - CORS for API endpoints
- `admin-whitelist` - IP whitelist for admin

**Rate Limiting:**
- `rate-limit-api` - 100 req/min (burst 200)
- `rate-limit-auth` - 10 req/min (burst 20)
- `rate-limit-admin` - 30 req/min (burst 50)
- `rate-limit-static` - 1000 req/min (burst 2000)

**Other:**
- `compression` - Response compression
- `circuit-breaker` - Fault tolerance
- `retry` - Automatic retries

**Middleware Chains:**
- `api-chain` - Security + CORS + Rate limit + Compression
- `auth-chain` - Strict rate limit + Security
- `admin-chain` - Auth + Whitelist + Security
- `public-chain` - Security + CORS + Rate limit
- `monitoring-chain` - Whitelist + Security

#### Routes (`routes.yml`)

**Frontend:**
- `ubi-cms.local/` → Portal UI (3000)
- `admin.ubi-cms.local/` → Admin UI (3001)

**API Services:**
- `/api/v1/auth/*` → Auth Service
- `/api/v1/ledger/*` → Ledger Service
- `/api/v1/ubi/*` → UBI Engine
- `/api/v1/treasury/*` → Treasury Engine
- `/api/v1/tasks/*` → Task Marketplace
- `/api/v1/rewards/*` → Rewards Engine
- `/api/v1/reputation/*` → Reputation Service
- `/api/v1/agents/*` → Agent Control Plane
- `/api/v1/notifications/*` → Notifications Service
- `/api/v1/reports/*` → Reporting Service
- `/api/v1/governance/*` → Governance Service
- `/api/v1/vault/*` → Data Vault Service

**Infrastructure:**
- `/keycloak/*` → Keycloak (8080)
- `/temporal/*` → Temporal UI (8088)
- `/grafana/*` → Grafana (3000)
- `/prometheus/*` → Prometheus (9090)
- `/minio/*` → MinIO Console (9001)

**Dashboard:**
- `traefik.ubi-cms.local` → Traefik Dashboard

**WebSockets:**
- `/ws/notifications` → Notifications WebSocket
- `/ws/agents` → Agent Control WebSocket

#### TLS (`tls.yml`)

**Options:**
- `default` - TLS 1.2/1.3 with strong ciphers
- `modern` - TLS 1.3 only
- `intermediate` - Balance security and compatibility

**Certificates:**
- Self-signed for development
- Let's Encrypt for production (automatic)

## 🔧 Adding Services

### Using Docker Labels

Add these labels to your service in `docker-compose.yml`:

```yaml
services:
  my-service:
    image: my-service:latest
    networks:
      - ubi-cms-network
    labels:
      # Enable Traefik
      - "traefik.enable=true"
      
      # Router
      - "traefik.http.routers.my-service.rule=Host(`ubi-cms.local`) && PathPrefix(`/api/v1/myservice`)"
      - "traefik.http.routers.my-service.entrypoints=websecure"
      - "traefik.http.routers.my-service.tls.certresolver=letsencrypt"
      
      # Middleware
      - "traefik.http.routers.my-service.middlewares=api-chain@file"
      
      # Service
      - "traefik.http.services.my-service.loadbalancer.server.port=3000"
      
      # Health check
      - "traefik.http.services.my-service.loadbalancer.healthcheck.path=/health"
      - "traefik.http.services.my-service.loadbalancer.healthcheck.interval=10s"
```

### Using File Provider

Add to `dynamic/routes.yml`:

```yaml
http:
  routers:
    my-service:
      rule: "Host(`ubi-cms.local`) && PathPrefix(`/api/v1/myservice`)"
      entryPoints:
        - websecure
      service: my-service
      middlewares:
        - api-chain
      tls:
        certResolver: letsencrypt

  services:
    my-service:
      loadBalancer:
        servers:
          - url: "http://my-service:3000"
        healthCheck:
          path: "/health"
          interval: "10s"
```

## 🔐 Security Features

### HTTPS Enforcement
- Automatic HTTP to HTTPS redirect
- HSTS with preload
- TLS 1.2+ only
- Strong cipher suites

### Security Headers
- Content Security Policy (CSP)
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection
- Referrer-Policy
- Permissions-Policy

### Authentication
- Forward authentication to Keycloak
- JWT validation
- Token refresh handling

### Rate Limiting
- Per-route rate limits
- IP-based limiting
- Burst protection

### IP Whitelisting
- Admin routes restricted to internal IPs
- Monitoring tools whitelist
- Configurable IP ranges

## 📊 Monitoring

### Access Traefik Dashboard

```
https://traefik.ubi-cms.local
```

**Default credentials:** Protected by admin-chain middleware

### Prometheus Metrics

Metrics available at:
```
http://localhost:8082/metrics
```

**Key metrics:**
- Request count
- Response time
- Error rates
- Active connections
- TLS handshakes

### Access Logs

Located at: `/var/log/traefik/access.log` (inside container)

View logs:
```bash
docker exec ubi-cms-traefik cat /var/log/traefik/access.log
```

## 🐛 Troubleshooting

### Certificate Errors

**Problem:** "Your connection is not private" / Certificate not trusted

**Solutions:**
1. Ensure you've run `generate-certs.sh`
2. Install `ca.crt` in system trust store
3. Restart browser
4. Check hosts file entries

### Service Not Accessible

**Problem:** 404 or 502 error

**Solutions:**
1. Check service is running: `docker ps`
2. Check Traefik logs: `docker logs ubi-cms-traefik`
3. Verify service labels in `docker-compose.yml`
4. Check network connectivity: Services must be on `ubi-cms-network`
5. Verify health check endpoint is working

### Rate Limit Exceeded

**Problem:** 429 Too Many Requests

**Solutions:**
1. Adjust rate limits in `middleware.yml`
2. Implement request throttling in client
3. Use different rate limit for different routes

### Keycloak Forward Auth Fails

**Problem:** 401/403 errors with authentication

**Solutions:**
1. Ensure Keycloak is running and accessible
2. Check realm configuration
3. Verify token is valid
4. Check middleware chain order

## 🚀 Production Deployment

### Pre-deployment Checklist

- [ ] Update email in `traefik.yml` for Let's Encrypt
- [ ] Change `JWT_SECRET` to secure random value
- [ ] Review and update IP whitelists
- [ ] Configure DNS records
- [ ] Test rate limits
- [ ] Enable production ACME server
- [ ] Configure backup for `acme.json`
- [ ] Set up monitoring alerts
- [ ] Review security headers
- [ ] Test failover scenarios

### Environment Variables

```env
# Production settings
JWT_SECRET=$(openssl rand -base64 32)
KEYCLOAK_ADMIN_PASSWORD=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
```

### Let's Encrypt Production

In `traefik.yml`, ensure:
```yaml
certificatesResolvers:
  letsencrypt:
    acme:
      email: your-real-email@domain.com  # Update this!
      storage: /etc/traefik/acme.json
      caServer: https://acme-v02.api.letsencrypt.org/directory  # Production
```

### DNS Configuration

Point your domain to your server:

```
A    @                  -> YOUR_SERVER_IP
A    admin              -> YOUR_SERVER_IP
A    api                -> YOUR_SERVER_IP
A    traefik            -> YOUR_SERVER_IP
AAAA @                  -> YOUR_SERVER_IPv6 (optional)
```

## 📚 Resources

- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [Let's Encrypt Rate Limits](https://letsencrypt.org/docs/rate-limits/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)

## 🤝 Support

For issues and questions:
1. Check Traefik logs: `docker logs ubi-cms-traefik`
2. Review service logs: `docker logs <service-name>`
3. Verify configuration syntax
4. Check GitHub issues
