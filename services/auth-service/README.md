# Auth Service

Authentication and authorization service with Keycloak integration for UBI-CMS platform.

## Features

- User registration with email verification
- Login/logout with JWT tokens
- Token refresh
- Password reset flow
- Email verification
- Social login support (via Keycloak)
- Multi-factor authentication (MFA)
- Session management
- Login audit logs
- Brute force protection
- Account lockout

## API Endpoints

### Public Endpoints

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login and get tokens
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password
- `POST /api/v1/auth/verify-email` - Verify email

### Protected Endpoints

- `GET /api/v1/auth/me` - Get current user profile
- `PUT /api/v1/auth/me` - Update user profile
- `POST /api/v1/auth/change-password` - Change password

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`

4. Setup Keycloak (see infrastructure/keycloak/README.md)

5. Run database migrations:
```bash
npm run migrate
```

6. Start the service:
```bash
npm run dev
```

## Development

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run integration tests
npm run test:integration

# Type check
npm run typecheck

# Lint
npm run lint

# Build
npm run build

# Start production
npm start
```

## Docker

```bash
# Build image
docker build -t auth-service .

# Run container
docker run -p 3001:3001 --env-file .env auth-service
```

## Environment Variables

See `.env.example` for all available configuration options.

## Database Schema

The service uses the following tables:

- `users` - User profiles synced from Keycloak
- `sessions` - Active user sessions
- `login_attempts` - Login attempt audit log

## Keycloak Integration

This service integrates with Keycloak for:

- User management
- Authentication
- Authorization
- Role-based access control (RBAC)
- Custom claims in JWT tokens

See `infrastructure/keycloak/` for setup scripts and configuration.

## Security Features

- JWT token validation
- Rate limiting on auth endpoints
- Brute force protection (account lockout after failed attempts)
- Session management with Redis
- Password complexity requirements
- Audit logging
- HTTPS enforcement in production

## License

Proprietary
