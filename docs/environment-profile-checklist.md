# Environment Profile Checklist

Use this checklist after copying/updating `.env.staging` and `.env.production`.

## Required before first boot

- Set `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, and `DATABASE_URL`
- Set `REDIS_HOST`, `REDIS_PASSWORD`, and `REDIS_URL`
- Set `JWT_SECRET` (64+ chars random)
- Set `NEXTAUTH_SECRET` (64+ chars random)
- Set `KEYCLOAK_ADMIN_PASSWORD`
- Set `MINIO_PASSWORD` and verify `MINIO_USE_SSL=true` for non-local
- Set `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`, and `NEXTAUTH_URL`
- Set `CORS_ORIGIN` to exact allowed domains

## Staging checks

- `ENVIRONMENT=staging`
- DNS entries resolve for staging URLs
- Staging DB/Redis are isolated from prod
- Feature flags reviewed for staging testing goals

## Production checks

- `ENVIRONMENT=production`
- `LOG_LEVEL=info` (or stricter)
- Secrets are sourced from secret manager (not hardcoded final values in repo)
- TLS endpoints used for API/WS and tracing URLs
- Backups, retention, and incident contacts validated

## Stack switching commands

```bat
SystemControl\stack-up.bat staging
SystemControl\stack-status.bat staging
SystemControl\stack-down.bat staging

SystemControl\stack-up.bat prod --no-build
SystemControl\stack-status.bat prod
SystemControl\stack-down.bat prod
```
