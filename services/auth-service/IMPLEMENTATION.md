# Auth Service - Implementation Summary

## Overview

Complete authentication service with Keycloak integration for the UBI-CMS platform. Provides user registration, login/logout, token management, password reset, email verification, and session management.

## Architecture

```
┌─────────────────┐
│   Frontend UI   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────┐
│  Auth Service   │◄────►│  Keycloak    │
│   (Express)     │      │  (IdP)       │
└────────┬────────┘      └──────────────┘
         │
         ├───────►┌──────────────┐
         │        │  PostgreSQL  │
         │        │  (User DB)   │
         │        └──────────────┘
         │
         └───────►┌──────────────┐
                  │    Redis     │
                  │  (Sessions)  │
                  └──────────────┘
```

## Key Features Implemented

### 1. Core Authentication
- ✅ User registration with Keycloak
- ✅ Login with username/password
- ✅ Logout (token invalidation)
- ✅ Token refresh
- ✅ JWT validation middleware
- ✅ Session management

### 2. Security
- ✅ Brute force protection (account lockout)
- ✅ Login attempt tracking
- ✅ Rate limiting on auth endpoints
- ✅ Password complexity validation
- ✅ Secure token storage in Redis
- ✅ Audit logging

### 3. User Management
- ✅ Email verification workflow
- ✅ Password reset flow
- ✅ Profile updates
- ✅ Password change
- ✅ User sync from Keycloak to PostgreSQL

### 4. Advanced Features
- ✅ Multi-tenant support (tenant context in JWT)
- ✅ Custom claims (tenant_id, reputation_tier, feature_flags)
- ✅ Role-based access control
- ✅ Device tracking
- ✅ Session timeout handling

## API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login and get tokens |
| POST | `/api/v1/auth/logout` | Logout |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/forgot-password` | Request password reset |
| POST | `/api/v1/auth/reset-password` | Reset password |
| POST | `/api/v1/auth/verify-email` | Verify email |

### Protected Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/auth/me` | Get current user |
| PUT | `/api/v1/auth/me` | Update profile |
| POST | `/api/v1/auth/change-password` | Change password |

## File Structure

```
services/auth-service/
├── src/
│   ├── config/
│   │   ├── index.ts                 # Configuration management
│   │   └── keycloak.config.ts       # Keycloak-specific config
│   ├── controllers/
│   │   └── auth.controller.ts       # Auth endpoint handlers
│   ├── middleware/
│   │   ├── jwt.middleware.ts        # JWT validation
│   │   └── tenant.middleware.ts     # Tenant extraction
│   ├── services/
│   │   ├── keycloak.service.ts      # Keycloak integration
│   │   └── user.service.ts          # User DB operations
│   ├── types/
│   │   └── index.ts                 # TypeScript types
│   ├── utils/
│   │   ├── database.ts              # PostgreSQL client
│   │   ├── logger.ts                # Winston logger
│   │   ├── redis.ts                 # Redis client
│   │   └── validators.ts            # Zod schemas
│   └── index.ts                     # Express app entry
├── tests/
│   ├── unit/
│   │   └── keycloak.service.test.ts
│   └── integration/
│       └── auth.test.ts
├── .env.example
├── .dockerignore
├── Dockerfile
├── jest.config.js
├── package.json
├── tsconfig.json
└── README.md
```

## Keycloak Configuration

### Realm: ubi-cms

**Clients:**
- `portal-ui` - Public client for user portal (PKCE)
- `admin-ui` - Public client for admin panel (PKCE)
- `api-gateway` - Confidential client for API gateway
- Service accounts for each microservice

**Roles:**
- `admin` - System administrator
- `user` - Standard user (default)
- `agent_creator` - Can create AI agents
- `treasury_admin` - Treasury operations
- `ubi_admin` - UBI program management

**Custom Claims in JWT:**
- `tenant_id` - User's tenant
- `tenant_slug` - Tenant identifier
- `reputation_tier` - User's reputation
- `feature_flags` - Feature toggles
- `agent_owner_id` - Agent ownership

## Database Schema

### Tables Created

1. **users** - User profiles synced from Keycloak
2. **user_roles** - Role assignments
3. **sessions** - Active sessions with tokens
4. **login_attempts** - Audit log
5. **password_reset_tokens** - Password reset workflow
6. **email_verification_tokens** - Email verification
7. **user_devices** - Device tracking
8. **user_mfa_secrets** - MFA/OTP secrets

## Security Measures

1. **Brute Force Protection**
   - Max 5 failed login attempts
   - 15-minute account lockout
   - Redis-based tracking

2. **Token Security**
   - JWT signed by Keycloak
   - 15-minute access token lifetime
   - Refresh tokens stored in Redis
   - Token validation via JWKS

3. **Password Policy**
   - Minimum 8 characters
   - Uppercase, lowercase, digit, special char required
   - Password history (3 previous passwords)

4. **Rate Limiting**
   - 100 requests per 15min (general)
   - 10 requests per 15min (auth endpoints)

## Setup Instructions

### 1. Install Dependencies
```bash
cd services/auth-service
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start Keycloak
```bash
cd infrastructure/keycloak
docker-compose up -d
./setup.sh
```

### 4. Run Database Migrations
```bash
psql -U postgres -d ubi_cms -f migrations/006_auth_tables.sql
```

### 5. Start Service
```bash
npm run dev
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run integration tests
npm run test:integration

# Type check
npm run typecheck

# Lint
npm run lint
```

## Deployment

### Docker

```bash
docker build -t auth-service:latest .
docker run -p 3001:3001 --env-file .env auth-service:latest
```

### Production Checklist

- [ ] Change default Keycloak admin password
- [ ] Configure production SMTP server
- [ ] Set strong JWT secrets
- [ ] Enable HTTPS
- [ ] Configure PostgreSQL connection pooling
- [ ] Setup Redis cluster for HA
- [ ] Enable audit logging
- [ ] Configure backup strategy
- [ ] Setup monitoring and alerts
- [ ] Review and adjust rate limits

## Integration with Other Services

### Using the Auth Service

Other services can validate JWTs using the Keycloak JWKS endpoint:

```typescript
import { jwtVerify, createRemoteJWKSet } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL('http://keycloak:8080/realms/ubi-cms/protocol/openid-connect/certs')
);

const { payload } = await jwtVerify(token, JWKS);
```

### Service Account Authentication

Microservices can authenticate using their service account:

```typescript
const tokenResponse = await axios.post(
  'http://keycloak:8080/realms/ubi-cms/protocol/openid-connect/token',
  new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: 'your-service-name',
    client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
  })
);
```

## Next Steps

1. **Implement Social Login**
   - Configure OAuth providers in Keycloak
   - Add social login buttons to frontend

2. **Add MFA Support**
   - TOTP implementation
   - SMS verification
   - Backup codes

3. **Enhanced Audit Logging**
   - Event streaming to NATS
   - Integration with monitoring system

4. **User Impersonation**
   - Admin ability to impersonate users
   - Audit trail for impersonation

5. **API Key Management**
   - Generate API keys for service-to-service auth
   - Key rotation

## Troubleshooting

### Cannot connect to Keycloak
- Check Keycloak is running: `docker-compose logs keycloak`
- Verify KEYCLOAK_URL in .env
- Check network connectivity

### Token validation fails
- Verify JWKS endpoint is accessible
- Check token hasn't expired
- Verify issuer and audience claims

### Login attempts not tracking
- Check Redis connection
- Verify Redis keys aren't expiring too quickly

## Documentation

- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [OpenID Connect Spec](https://openid.net/specs/openid-connect-core-1_0.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

## License

Proprietary - UBI-CMS Platform
