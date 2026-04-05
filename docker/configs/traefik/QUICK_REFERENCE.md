# Traefik Quick Reference Card

## 🚀 Quick Commands

### Setup & Start
```bash
# Initial setup
cd docker/configs/traefik
./setup.sh

# Start Traefik
podman compose -f docker-compose.traefik.yml up -d

# Validate configuration
./validate.sh

# View logs
podman logs -f ubi-cms-traefik

# Restart Traefik
podman compose -f docker-compose.traefik.yml restart
```

### Certificate Management
```bash
# Generate dev certificates
cd certs && ./generate-certs.sh

# Check certificate expiry
openssl x509 -enddate -noout -in certs/ubi-cms.local.crt

# View certificate details
openssl x509 -text -noout -in certs/ubi-cms.local.crt
```

### Troubleshooting
```bash
# Check Traefik health
podman exec ubi-cms-traefik traefik healthcheck

# View access logs
podman exec ubi-cms-traefik cat /var/log/traefik/access.log

# Test HTTPS
curl -k https://localhost/

# Test specific route
curl -k https://ubi-cms.local/api/v1/auth/health

# Check metrics
curl http://localhost:8082/metrics
```

## 🌐 Access Points

| Service | URL | Auth Required |
|---------|-----|---------------|
| Portal UI | https://ubi-cms.local | No |
| Admin UI | https://admin.ubi-cms.local | Yes (IP + Keycloak) |
| Traefik Dashboard | https://traefik.ubi-cms.local | Yes (IP + Keycloak) |
| Metrics | http://localhost:8082/metrics | IP whitelist |
| Keycloak | https://ubi-cms.local/keycloak | No |
| Grafana | https://ubi-cms.local/grafana | IP whitelist |
| Prometheus | https://ubi-cms.local/prometheus | IP whitelist |

## 📋 API Endpoints

All API endpoints are at: `https://ubi-cms.local/api/v1/`

| Path | Service | Rate Limit |
|------|---------|------------|
| `/auth/*` | Auth Service | 10/min |
| `/ledger/*` | Ledger Service | 100/min |
| `/ubi/*` | UBI Engine | 100/min |
| `/treasury/*` | Treasury Engine | 100/min |
| `/tasks/*` | Task Marketplace | 100/min |
| `/rewards/*` | Rewards Engine | 100/min |
| `/reputation/*` | Reputation Service | 100/min |
| `/agents/*` | Agent Control Plane | 100/min |
| `/notifications/*` | Notifications Service | 100/min |
| `/reports/*` | Reporting Service | 100/min |
| `/governance/*` | Governance Service | 100/min |
| `/vault/*` | Data Vault Service | 100/min |

## 🔒 Middleware Chains

| Chain | Components | Use Case |
|-------|------------|----------|
| `public-chain` | Security + CORS + Rate(1000/min) + Compression | Public frontend |
| `api-chain` | Security + CORS + Rate(100/min) + Compression + RequestID + Tracing | Authenticated APIs |
| `auth-chain` | Security + CORS + Rate(10/min) + Compression | Auth endpoints |
| `admin-chain` | IP Whitelist + Keycloak Auth + Security + Rate(30/min) + Compression | Admin panels |
| `monitoring-chain` | IP Whitelist + Security | Monitoring tools |

## 🔧 Configuration Files

| File | Purpose | Hot Reload |
|------|---------|------------|
| `traefik.yml` | Static config (entry points, providers) | No (requires restart) |
| `dynamic/middleware.yml` | Middleware definitions | Yes |
| `dynamic/routes.yml` | Routing rules | Yes |
| `dynamic/tls.yml` | TLS configuration | Yes |
| `.env` | Environment variables | No (requires restart) |

## 📊 Monitoring

### Prometheus Metrics
```bash
# Endpoint
http://localhost:8082/metrics

# Request rate by service
rate(traefik_service_requests_total[5m])

# Response time P95
histogram_quantile(0.95, traefik_service_request_duration_seconds_bucket)

# Error rate
rate(traefik_service_requests_total{code=~"5.."}[5m])
```

### Logs
```bash
# Access logs (JSON)
podman exec ubi-cms-traefik cat /var/log/traefik/access.log | jq

# System logs
podman logs ubi-cms-traefik --since 10m

# Real-time logs
podman logs -f ubi-cms-traefik
```

## 🐛 Common Issues

### Certificate Not Trusted
```bash
# Solution 1: Trust CA
# Windows: Double-click certs/ca.crt → Install Certificate
# macOS: sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain certs/ca.crt
# Linux: sudo cp certs/ca.crt /usr/local/share/ca-certificates/ubi-cms-ca.crt && sudo update-ca-certificates

# Solution 2: Use curl with -k
curl -k https://ubi-cms.local
```

### Service Returns 404
```bash
# Check service is running
podman ps | grep <service-name>

# Check Traefik routes
podman exec ubi-cms-traefik wget -O- http://localhost:8080/api/http/routers

# Check service logs
podman logs <service-name>
```

### Rate Limit Exceeded (429)
```bash
# Adjust in dynamic/middleware.yml
# Change 'average' and 'burst' values
# File auto-reloads, no restart needed
```

### Authentication Fails (401)
```bash
# Check Keycloak is running
podman ps | grep keycloak

# Test Keycloak endpoint
curl http://localhost:8080/realms/ubi-cms/.well-known/openid-configuration

# Check token
curl -H "Authorization: Bearer <token>" https://ubi-cms.local/api/v1/ledger/health
```

## 🔐 Security Checklist

### Development
- [ ] Certificates generated
- [ ] CA certificate trusted
- [ ] Hosts file updated
- [ ] ACME storage created (600 permissions)

### Production
- [ ] Update ACME email in `traefik.yml`
- [ ] Generate strong secrets (`openssl rand -base64 32`)
- [ ] Update IP whitelists
- [ ] Configure DNS records
- [ ] Enable production ACME server
- [ ] Set up certificate backup
- [ ] Configure monitoring alerts
- [ ] Test failover scenarios
- [ ] Review all rate limits
- [ ] Document emergency procedures

## 📝 Environment Variables

```bash
# Required
JWT_SECRET=<strong-secret>
KEYCLOAK_ADMIN_PASSWORD=<password>
DB_PASSWORD=<password>
REDIS_PASSWORD=<password>

# Optional
CLOUDFLARE_EMAIL=<email>
CLOUDFLARE_API_KEY=<key>
ACME_EMAIL=<email>
```

## 🔄 Add New Service

### Docker Labels Method
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.<name>.rule=Host(`ubi-cms.local`) && PathPrefix(`/api/v1/<path>`)"
  - "traefik.http.routers.<name>.entrypoints=websecure"
  - "traefik.http.routers.<name>.middlewares=api-chain@file,keycloak-auth@file"
  - "traefik.http.services.<name>.loadbalancer.server.port=3000"
```

### File Config Method
Add to `dynamic/routes.yml`:
```yaml
http:
  routers:
    my-service:
      rule: "Host(`ubi-cms.local`) && PathPrefix(`/api/v1/myservice`)"
      entryPoints: [websecure]
      service: my-service
      middlewares: [api-chain, keycloak-auth]
  services:
    my-service:
      loadBalancer:
        servers:
          - url: "http://my-service:3000"
```

## 📞 Support

| Issue Type | Action |
|------------|--------|
| Config errors | Run `./validate.sh` |
| Service down | Check `podman ps` |
| Certificate issues | Regenerate with `certs/generate-certs.sh` |
| Rate limiting | Adjust in `dynamic/middleware.yml` |
| Auth failures | Check Keycloak logs |
| Performance | Check metrics at `:8082/metrics` |

## 📚 Documentation

- Full Guide: `IMPLEMENTATION_GUIDE.md`
- General Docs: `README.md`
- Certificates: `certs/README.md`
- Traefik Docs: https://doc.traefik.io/traefik/

---

**Last Updated:** 2026-03-26  
**Version:** 1.0.0  
**Traefik Version:** v3.0
