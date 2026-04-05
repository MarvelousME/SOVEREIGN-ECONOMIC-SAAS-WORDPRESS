# Traefik API Gateway - Implementation Guide

Complete implementation guide for Traefik API Gateway in UBI-CMS platform.

## 📋 Overview

This implementation provides:
- ✅ Complete routing for all UBI-CMS services
- ✅ Keycloak forward authentication
- ✅ JWT validation middleware
- ✅ Comprehensive security headers (HSTS, CSP, etc.)
- ✅ CORS configuration for APIs
- ✅ Rate limiting (per-route customizable)
- ✅ IP whitelisting for admin routes
- ✅ TLS/SSL with automatic Let's Encrypt
- ✅ Health checks for all services
- ✅ Prometheus metrics
- ✅ OpenTelemetry tracing
- ✅ Circuit breaker and retry logic
- ✅ WebSocket support
- ✅ Compression and buffering

## 🗂️ File Structure

```
docker/configs/traefik/
├── traefik.yml                    # Static configuration
│   ├── Entry points (HTTP, HTTPS, Dashboard, Metrics)
│   ├── Providers (Docker, File)
│   ├── Certificate resolvers (Let's Encrypt, Self-signed)
│   ├── Logging and metrics
│   └── Tracing configuration
│
├── dynamic/                       # Dynamic configuration
│   ├── middleware.yml            # All middleware definitions
│   │   ├── Authentication (Keycloak, JWT)
│   │   ├── Security headers
│   │   ├── CORS policies
│   │   ├── Rate limiting
│   │   ├── IP whitelisting
│   │   ├── Compression
│   │   ├── Circuit breaker
│   │   └── Middleware chains
│   │
│   ├── routes.yml                # Service routing rules
│   │   ├── Frontend routes (Portal UI, Admin UI)
│   │   ├── API routes (12 microservices)
│   │   ├── Infrastructure routes (Keycloak, Temporal, Grafana, etc.)
│   │   ├── Dashboard route
│   │   ├── WebSocket routes
│   │   └── Service definitions with health checks
│   │
│   └── tls.yml                   # TLS/SSL configuration
│       ├── TLS options (default, modern, intermediate)
│       ├── Certificate configuration
│       ├── Certificate stores
│       └── HTTPS redirect
│
├── certs/                        # TLS certificates
│   ├── generate-certs.sh         # Certificate generation script
│   ├── .gitignore               # Ignore certificate files
│   └── README.md                # Certificate documentation
│
├── docker-compose.traefik.yml   # Docker Compose for Traefik
├── setup.sh                     # Quick setup script
├── validate.sh                  # Configuration validation script
├── .env.example                 # Environment template
├── README.md                    # General documentation
└── IMPLEMENTATION_GUIDE.md      # This file
```

## 🚀 Quick Start (Development)

### 1. Run Setup Script

```bash
cd docker/configs/traefik
chmod +x setup.sh
./setup.sh
```

This will:
- ✅ Check prerequisites (Docker, OpenSSL)
- ✅ Create necessary directories
- ✅ Generate TLS certificates
- ✅ Create ACME storage
- ✅ Create environment file
- ✅ Prompt for hosts file update
- ✅ Create Docker network
- ✅ Start Traefik

### 2. Validate Configuration

```bash
./validate.sh
```

### 3. Access Services

- **Portal UI:** https://ubi-cms.local
- **Admin UI:** https://admin.ubi-cms.local
- **Traefik Dashboard:** https://traefik.ubi-cms.local
- **Metrics:** http://localhost:8082/metrics

## 📦 Route Configuration

### Frontend Routes

| Domain | Service | Port | Middleware |
|--------|---------|------|------------|
| `ubi-cms.local` | Portal UI | 3000 | `public-chain` |
| `admin.ubi-cms.local` | Admin UI | 3001 | `admin-chain` |

### API Routes

| Path | Service | Middleware | Rate Limit |
|------|---------|------------|------------|
| `/api/v1/auth/*` | Auth Service | `auth-chain` | 10/min |
| `/api/v1/ledger/*` | Ledger Service | `api-chain` + `keycloak-auth` | 100/min |
| `/api/v1/ubi/*` | UBI Engine | `api-chain` + `keycloak-auth` | 100/min |
| `/api/v1/treasury/*` | Treasury Engine | `api-chain` + `keycloak-auth` | 100/min |
| `/api/v1/tasks/*` | Task Marketplace | `api-chain` + `keycloak-auth` | 100/min |
| `/api/v1/rewards/*` | Rewards Engine | `api-chain` + `keycloak-auth` | 100/min |
| `/api/v1/reputation/*` | Reputation Service | `api-chain` + `keycloak-auth` | 100/min |
| `/api/v1/agents/*` | Agent Control Plane | `api-chain` + `keycloak-auth` | 100/min |
| `/api/v1/notifications/*` | Notifications | `api-chain` + `keycloak-auth` | 100/min |
| `/api/v1/reports/*` | Reporting Service | `api-chain` + `keycloak-auth` | 100/min |
| `/api/v1/governance/*` | Governance Service | `api-chain` + `keycloak-auth` | 100/min |
| `/api/v1/vault/*` | Data Vault | `api-chain` + `keycloak-auth` | 100/min |

### Infrastructure Routes

| Path | Service | Port | Middleware |
|------|---------|------|------------|
| `/keycloak/*` | Keycloak | 8080 | `public-chain` |
| `/temporal/*` | Temporal UI | 8088 | `admin-chain` |
| `/grafana/*` | Grafana | 3000 | `monitoring-chain` |
| `/prometheus/*` | Prometheus | 9090 | `monitoring-chain` |
| `/minio/*` | MinIO Console | 9001 | `admin-chain` |

### WebSocket Routes

| Path | Service | Purpose |
|------|---------|---------|
| `/ws/notifications` | Notifications | Real-time notifications |
| `/ws/agents` | Agent Control | Agent communication |

## 🔒 Middleware Chains

### `public-chain`
- Security headers
- CORS
- Rate limit (1000/min)
- Compression

**Use for:** Public frontend, unauthenticated endpoints

### `api-chain`
- Security headers
- CORS
- Rate limit (100/min)
- Compression
- Request ID
- Tracing headers

**Use for:** Authenticated API endpoints

### `auth-chain`
- Security headers
- CORS
- Rate limit (10/min, strict)
- Compression

**Use for:** Authentication endpoints (login, register, token)

### `admin-chain`
- IP whitelist (internal only)
- Keycloak authentication
- Security headers
- Rate limit (30/min)
- Compression

**Use for:** Admin UI, monitoring tools, sensitive operations

### `monitoring-chain`
- IP whitelist
- Security headers

**Use for:** Grafana, Prometheus, metrics

## 🔐 Security Features

### Authentication
- **Forward Auth:** All protected routes forward to Keycloak
- **JWT Validation:** Token validation middleware
- **Auto-refresh:** Token refresh handling

### Rate Limiting

| Category | Average | Burst | Period |
|----------|---------|-------|--------|
| Auth endpoints | 10 | 20 | 1 min |
| Admin endpoints | 30 | 50 | 1 min |
| API endpoints | 100 | 200 | 1 min |
| Static content | 1000 | 2000 | 1 min |

### IP Whitelisting

**Admin routes allowed IPs:**
- `127.0.0.1/32` (localhost)
- `172.16.0.0/12` (Docker internal)
- `192.168.0.0/16` (private network)
- `10.0.0.0/8` (private network)

### Security Headers

- **HSTS:** max-age=31536000; includeSubDomains; preload
- **CSP:** Strict content security policy
- **X-Frame-Options:** SAMEORIGIN
- **X-Content-Type-Options:** nosniff
- **X-XSS-Protection:** 1; mode=block
- **Referrer-Policy:** strict-origin-when-cross-origin
- **Permissions-Policy:** Disabled camera, microphone, geolocation, etc.

## 📊 Monitoring & Observability

### Prometheus Metrics

Available at `http://localhost:8082/metrics`

**Metrics collected:**
- Request count by service/route
- Response time percentiles
- Error rates
- Active connections
- TLS handshakes
- Rate limit hits

**Example queries:**
```promql
# Request rate
rate(traefik_service_requests_total[5m])

# Response time p95
histogram_quantile(0.95, traefik_service_request_duration_seconds_bucket)

# Error rate
rate(traefik_service_requests_total{code=~"5.."}[5m])
```

### Access Logs

Location: `/var/log/traefik/access.log` (JSON format)

**Fields:**
- Request ID
- Client IP
- Method & path
- Status code
- Response time
- User agent
- Referer

### OpenTelemetry Tracing

Integrated with OTel Collector for distributed tracing.

**Trace headers:**
- `X-Trace-Id`
- `X-Span-Id`
- `X-Request-Id`

## 🏗️ Adding New Services

### Option 1: Docker Labels (Recommended)

Add to your service in `docker-compose.yml`:

```yaml
services:
  my-new-service:
    image: my-service:latest
    container_name: my-new-service
    networks:
      - ubi-cms-network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.my-service.rule=Host(`ubi-cms.local`) && PathPrefix(`/api/v1/myservice`)"
      - "traefik.http.routers.my-service.entrypoints=websecure"
      - "traefik.http.routers.my-service.tls.certresolver=letsencrypt"
      - "traefik.http.routers.my-service.middlewares=api-chain@file,keycloak-auth@file,strip-api-prefix@file"
      - "traefik.http.routers.my-service.priority=90"
      - "traefik.http.services.my-service.loadbalancer.server.port=3000"
      - "traefik.http.services.my-service.loadbalancer.healthcheck.path=/health"
      - "traefik.http.services.my-service.loadbalancer.healthcheck.interval=10s"
```

### Option 2: File Provider

Add to `dynamic/routes.yml`:

```yaml
http:
  routers:
    my-new-service:
      rule: "Host(`ubi-cms.local`) && PathPrefix(`/api/v1/myservice`)"
      entryPoints:
        - websecure
      service: my-new-service
      middlewares:
        - api-chain
        - keycloak-auth
        - strip-api-prefix
      priority: 90
      tls:
        certResolver: letsencrypt

  services:
    my-new-service:
      loadBalancer:
        servers:
          - url: "http://my-new-service:3000"
        healthCheck:
          path: "/health"
          interval: "10s"
          timeout: "3s"
```

## 🚀 Production Deployment

### Pre-deployment Checklist

- [ ] Update `ACME_EMAIL` in `.env`
- [ ] Generate strong secrets:
  ```bash
  JWT_SECRET=$(openssl rand -base64 32)
  KEYCLOAK_ADMIN_PASSWORD=$(openssl rand -base64 32)
  DB_PASSWORD=$(openssl rand -base64 32)
  ```
- [ ] Update IP whitelists in `middleware.yml`
- [ ] Configure DNS records
- [ ] Enable production ACME server in `traefik.yml`
- [ ] Review rate limits
- [ ] Set up backup for `acme.json`
- [ ] Configure monitoring alerts
- [ ] Test failover scenarios
- [ ] Document emergency procedures

### DNS Configuration

```
A    ubi-cms.local              -> YOUR_SERVER_IP
A    admin.ubi-cms.local        -> YOUR_SERVER_IP
A    traefik.ubi-cms.local      -> YOUR_SERVER_IP
AAAA ubi-cms.local              -> YOUR_SERVER_IPv6
```

### Let's Encrypt Setup

1. Update email in `traefik.yml`:
```yaml
certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@yourdomain.com  # Real email!
```

2. Ensure ports 80 and 443 are accessible from internet

3. Start Traefik - certificates will be automatically requested

### High Availability

For HA deployments:

1. **Multiple Traefik instances:**
   - Use shared storage for `acme.json`
   - Configure session affinity
   - Use external load balancer

2. **Service redundancy:**
   - Deploy multiple instances of each service
   - Traefik will load balance automatically

3. **Health checks:**
   - All services have health checks configured
   - Automatic failover on failure

## 🐛 Troubleshooting

### Certificate Issues

**Problem:** "Your connection is not private"

**Solution:**
1. Trust CA certificate: `certs/ca.crt`
2. Restart browser
3. Check hosts file

### Service Not Accessible (404)

**Solution:**
1. Check service is running: `docker ps`
2. View Traefik logs: `docker logs ubi-cms-traefik`
3. Check route priority
4. Verify network connectivity

### Rate Limit Exceeded (429)

**Solution:**
1. Adjust rate limits in `middleware.yml`
2. Implement client-side throttling
3. Use different limits for different routes

### Authentication Fails (401/403)

**Solution:**
1. Check Keycloak is running
2. Verify token validity
3. Check middleware chain order
4. Review CORS configuration

### Let's Encrypt Rate Limits

**Solution:**
1. Use staging during testing:
   ```yaml
   caServer: https://acme-staging-v02.api.letsencrypt.org/directory
   ```
2. Monitor certificate requests
3. Implement certificate caching

## 📚 Resources

- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [Middleware Reference](https://doc.traefik.io/traefik/middlewares/overview/)
- [Let's Encrypt](https://letsencrypt.org/)
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [Mozilla SSL Config](https://ssl-config.mozilla.org/)

## 🔧 Maintenance

### Certificate Renewal

**Development:**
- Certificates valid for 365 days
- Regenerate: `./certs/generate-certs.sh`

**Production:**
- Let's Encrypt auto-renews at 30 days before expiration
- Monitor renewal in logs: `docker logs ubi-cms-traefik | grep acme`

### Configuration Updates

1. Update configuration files
2. Validate: `./validate.sh`
3. Traefik auto-reloads dynamic config
4. For static config changes, restart: `docker-compose restart traefik`

### Log Rotation

Configure log rotation for access logs:

```bash
# /etc/logrotate.d/traefik
/var/log/traefik/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 root root
    postrotate
        docker kill -s USR1 ubi-cms-traefik
    endscript
}
```

## ✅ Summary

This Traefik implementation provides:

1. **Complete routing** for all 12+ UBI-CMS services
2. **Enterprise-grade security** with multiple middleware layers
3. **Automatic TLS** with Let's Encrypt
4. **Rate limiting** and DDoS protection
5. **Keycloak integration** for authentication
6. **Comprehensive monitoring** with Prometheus and tracing
7. **High availability** support with health checks
8. **Production-ready** configuration
9. **Easy service addition** via Docker labels or file config
10. **Complete documentation** and tooling

The configuration is modular, scalable, and follows best practices for API gateway deployment.
