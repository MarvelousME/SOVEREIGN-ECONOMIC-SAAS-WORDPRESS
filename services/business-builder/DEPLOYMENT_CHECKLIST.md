# Business Builder Service - Deployment Checklist

## Pre-Deployment

### 1. Environment Setup
- [ ] Copy `.env.example` to `.env`
- [ ] Set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- [ ] Set `JWT_SECRET` (use strong random string)
- [ ] Set `OPENAI_API_KEY` (get from OpenAI)
- [ ] Set `STRIPE_SECRET_KEY` (optional, for payments)
- [ ] Set `NODE_ENV=production`

### 2. Database Setup
- [ ] Ensure PostgreSQL is running
- [ ] Create database if not exists: `createdb ubi_cms`
- [ ] Run migration: `psql -U postgres -d ubi_cms -f ../../migrations/011_create_business_builder_tables.sql`
- [ ] Verify tables created: `\dt` in psql

### 3. Dependencies
- [ ] Install dependencies: `npm install`
- [ ] Run typecheck: `npm run typecheck` (should pass after npm install)
- [ ] Run linter: `npm run lint`
- [ ] Run tests: `npm test`

### 4. Build
- [ ] Build TypeScript: `npm run build`
- [ ] Verify dist/ folder created
- [ ] Check for build errors

## Deployment

### Option 1: Direct Node.js

```bash
# Production mode
NODE_ENV=production npm start
```

Service runs on port 3007 (configurable via PORT env var)

### Option 2: Docker

```bash
# Build image
docker build -t business-builder:latest .

# Run container
docker run -d \
  --name business-builder \
  -p 3007:3007 \
  --env-file .env \
  business-builder:latest
```

### Option 3: Docker Compose

Add to main `docker-compose.yml`:

```yaml
business-builder:
  build: ./services/business-builder
  ports:
    - "3007:3007"
  environment:
    - DB_HOST=postgres
    - DB_PORT=5432
    - DB_NAME=ubi_cms
    - DB_USER=postgres
    - DB_PASSWORD=${DB_PASSWORD}
    - JWT_SECRET=${JWT_SECRET}
    - OPENAI_API_KEY=${OPENAI_API_KEY}
  depends_on:
    - postgres
  restart: unless-stopped
```

## Post-Deployment

### 1. Health Check
- [ ] Test health endpoint: `curl http://localhost:3007/health`
- [ ] Should return: `{"status":"healthy","service":"business-builder"}`

### 2. API Testing
- [ ] Get templates: `GET /api/v1/business/templates`
- [ ] Create test business (with valid JWT)
- [ ] Generate AI branding
- [ ] Check database records created

### 3. Monitoring
- [ ] Check logs: `tail -f logs/combined.log`
- [ ] Monitor error logs: `tail -f logs/error.log`
- [ ] Set up external monitoring (e.g., Sentry, Datadog)

### 4. Performance
- [ ] Test rate limiting
- [ ] Monitor database connection pool
- [ ] Check response times
- [ ] Verify memory usage

## Security Checklist

- [ ] JWT_SECRET is strong (32+ characters)
- [ ] Database credentials secured
- [ ] OpenAI API key secured
- [ ] Stripe keys in environment (not code)
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Helmet.js active
- [ ] SSL/TLS enabled (reverse proxy)

## Scaling Considerations

### Horizontal Scaling
- Service is stateless (can run multiple instances)
- Use load balancer (nginx, HAProxy)
- Share database connection pool

### Vertical Scaling
- Increase `DB_POOL_MAX` in database config
- Allocate more CPU/memory to container
- Monitor OpenAI API rate limits

### Caching (Optional)
- Add Redis for branding results
- Cache template data
- Cache analytics queries

## Troubleshooting

### Service won't start
1. Check logs: `logs/error.log`
2. Verify database connection: `psql -U postgres -d ubi_cms`
3. Check environment variables: `printenv | grep DB_`

### Database errors
1. Verify migration ran: `SELECT * FROM businesses LIMIT 1;`
2. Check connection pool: Logs show "Database connected successfully"
3. Verify PostgreSQL version (should be 12+)

### OpenAI errors
1. Verify API key: `echo $OPENAI_API_KEY`
2. Check quota: Visit OpenAI dashboard
3. Review error messages in logs

### Performance issues
1. Check database indexes: `\d businesses`
2. Monitor connection pool usage
3. Review slow query logs
4. Check OpenAI response times

## Rollback Plan

If deployment fails:

1. Stop service: `docker stop business-builder` or `pm2 stop business-builder`
2. Restore previous database state (if migration broke)
3. Revert code to previous version
4. Check logs for root cause
5. Fix issue in development
6. Redeploy

## Maintenance

### Regular Tasks
- Weekly: Review error logs
- Monthly: Update dependencies (`npm update`)
- Quarterly: Security audit (`npm audit`)
- Yearly: OpenAI API key rotation

### Backup Strategy
- Daily: Database backups (pg_dump)
- Weekly: Full system backup
- Monthly: Verify restore process

## Support Contacts

- Database issues: DBA team
- OpenAI issues: OpenAI support
- Stripe issues: Stripe support
- Infrastructure: DevOps team

---

**Last Updated**: 2026-03-26  
**Service Version**: 1.0.0  
**Minimum Requirements**: Node.js 20, PostgreSQL 12, 2GB RAM
