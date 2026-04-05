# Keycloak Setup for UBI-CMS

This directory contains Keycloak configuration and setup scripts for the UBI-CMS platform.

## Quick Start

### Using Docker Compose

1. Start Keycloak:
```bash
cd infrastructure/keycloak
docker-compose up -d
```

2. Wait for Keycloak to start (check logs):
```bash
docker-compose logs -f keycloak
```

3. Run the setup script:
```bash
./setup.sh
```

### Manual Setup

If you have Keycloak running elsewhere, configure the environment variables and run:

```bash
export KEYCLOAK_URL=http://your-keycloak:8080
export KEYCLOAK_ADMIN=admin
export KEYCLOAK_ADMIN_PASSWORD=admin
./setup.sh
```

## Configuration Files

- `realm-config.json` - Keycloak realm configuration with clients, roles, and settings
- `setup.sh` - Automated setup script
- `docker-compose.yml` - Docker Compose for local Keycloak instance

## Realm Configuration

### Realm: `ubi-cms`

**Settings:**
- User registration enabled
- Email verification required
- Password reset enabled
- Brute force protection enabled
- Remember me enabled

**Password Policy:**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 digit
- At least 1 special character
- Not username
- Password history (3)

### Clients

#### Public Clients (PKCE Flow)

1. **portal-ui**
   - Type: Public client
   - Flow: Authorization Code with PKCE
   - Redirect URIs: `http://localhost:3000/*`, `https://portal.ubicsm.com/*`

2. **admin-ui**
   - Type: Public client
   - Flow: Authorization Code with PKCE
   - Redirect URIs: `http://localhost:3001/*`, `https://admin.ubicsm.com/*`

#### Confidential Clients

3. **api-gateway**
   - Type: Confidential
   - Flow: Direct access grants, Service accounts
   - Used by: API Gateway for token validation

#### Service Account Clients

Auto-generated for each microservice:
- `auth-service`
- `treasury-engine`
- `ubi-engine`
- `ledger-service`
- `reputation-service`
- `rewards-engine`
- `task-marketplace`
- `agent-control-plane`
- `governance-service`
- `notifications-service`

### Roles

**System Roles:**
- `admin` - Full system administrator
- `user` - Standard user (default)
- `agent_creator` - Can create and manage AI agents
- `treasury_admin` - Treasury operations administrator
- `ubi_admin` - UBI program administrator

### Custom Claims (JWT Tokens)

The following custom attributes are included in JWT tokens:

- `tenant_id` - User's tenant identifier
- `tenant_slug` - User's tenant slug
- `reputation_tier` - User's reputation tier
- `feature_flags` - User's feature flags (JSON)
- `agent_owner_id` - Agent owner identifier

## SMTP Configuration

Configure email settings in Keycloak Admin Console:

1. Go to Realm Settings > Email
2. Set SMTP server details:
   - Host: your-smtp-host
   - Port: 587 (or 465 for SSL)
   - From: noreply@ubicsm.com
   - Authentication: Enable
   - Username: your-smtp-username
   - Password: your-smtp-password

Or use environment variables in `realm-config.json`.

## Event Logging

The realm is configured to log the following events:

**Authentication Events:**
- Login/Logout
- Register
- Token refresh
- Password updates
- Email verification

**Admin Events:**
- User management
- Role assignments
- Client configuration changes

Access logs in Keycloak Admin Console under Events.

## Security Features

1. **Brute Force Protection**
   - Max failures: 5 attempts
   - Lock duration: 15 minutes
   - Incremental wait time

2. **Token Lifespans**
   - Access token: 15 minutes
   - Refresh token: 30 minutes idle, 10 hours max
   - SSO session: 30 minutes idle, 10 hours max

3. **MFA/OTP Support**
   - TOTP configured
   - 6-digit codes
   - 30-second period

## Client Secrets

After running the setup script, save the generated client secrets to your `.env` files:

```env
# API Gateway
KEYCLOAK_CLIENT_SECRET=<generated-secret>

# Service accounts
AUTH_SERVICE_KEYCLOAK_CLIENT_SECRET=<generated-secret>
TREASURY_ENGINE_KEYCLOAK_CLIENT_SECRET=<generated-secret>
UBI_ENGINE_KEYCLOAK_CLIENT_SECRET=<generated-secret>
# ... etc for other services
```

## Default Admin User

**Username:** `admin`  
**Email:** `admin@ubicsm.com`  
**Password:** `ChangeMe123!` (CHANGE IMMEDIATELY!)

**Roles:** admin

## Backup and Restore

### Export Realm

```bash
docker exec keycloak /opt/keycloak/bin/kc.sh export \
  --dir /tmp/export \
  --realm ubi-cms \
  --users realm_file
```

### Import Realm

```bash
docker exec keycloak /opt/keycloak/bin/kc.sh import \
  --dir /tmp/export \
  --override true
```

## Troubleshooting

### Cannot connect to Keycloak

1. Check if Keycloak is running:
   ```bash
   curl http://localhost:8080/health
   ```

2. Check logs:
   ```bash
   docker-compose logs keycloak
   ```

### Authentication fails

1. Verify client configuration in Keycloak Admin Console
2. Check redirect URIs match your application URLs
3. Verify client secret in your `.env` file

### Email not sending

1. Configure SMTP settings in Keycloak
2. Test with "Send Test Email" in Admin Console
3. Check SMTP credentials and firewall rules

## Production Deployment

For production:

1. Use PostgreSQL instead of H2 database
2. Enable HTTPS
3. Configure proper SMTP server
4. Set strong admin passwords
5. Regular backups of Keycloak database
6. Monitor event logs
7. Enable admin email notifications

## Resources

- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [Keycloak Admin CLI](https://www.keycloak.org/docs/latest/server_admin/#admin-cli)
- [OIDC Flows](https://www.keycloak.org/docs/latest/securing_apps/#_oidc)
