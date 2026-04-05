# Quick Start Guide

Get both frontend applications running in under 5 minutes.

## Prerequisites

- Node.js 20+ installed
- npm 10+ installed
- Keycloak instance running (or use Docker Compose)

## 1. Install Dependencies

```bash
# Portal UI
cd frontend/portal-ui
npm install

# Admin UI
cd ../admin-ui
npm install
```

## 2. Configure Environment

### Portal UI

```bash
cd ../portal-ui
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

KEYCLOAK_CLIENT_ID=ubi-portal
KEYCLOAK_CLIENT_SECRET=your-client-secret
KEYCLOAK_ISSUER=http://localhost:8080/realms/ubi-platform
```

### Admin UI

```bash
cd ../admin-ui
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-here

KEYCLOAK_CLIENT_ID=ubi-admin
KEYCLOAK_CLIENT_SECRET=your-admin-client-secret
KEYCLOAK_ISSUER=http://localhost:8080/realms/ubi-platform
```

### Generate Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32
```

## 3. Start Development Servers

### Portal UI

```bash
cd frontend/portal-ui
npm run dev
```

Open http://localhost:3000

### Admin UI (in new terminal)

```bash
cd frontend/admin-ui
npm run dev
```

Open http://localhost:3001

## 4. Docker Quick Start (Alternative)

If you prefer Docker:

```bash
cd frontend

# Copy environment file
cp .env.docker.example .env.docker

# Edit .env.docker with your configuration
nano .env.docker

# Start both applications
docker-compose --env-file .env.docker up -d

# View logs
docker-compose logs -f
```

- Portal UI: http://localhost:3000
- Admin UI: http://localhost:3001

## Verification

### Check Portal UI

1. Visit http://localhost:3000
2. Should redirect to login page
3. Click "Sign in with Keycloak"
4. After login, should see dashboard

### Check Admin UI

1. Visit http://localhost:3001
2. Should redirect to admin login
3. Login with admin credentials
4. Should see admin dashboard

## Common Issues

### Port Already in Use

```bash
# Change port in package.json:
# Portal UI - change "dev": "next dev -p 3000" to different port
# Admin UI - change "dev": "next dev -p 3001" to different port
```

### Can't Connect to API

```bash
# Verify API is running
curl http://localhost:8000/health

# Check NEXT_PUBLIC_API_URL in .env.local
```

### Authentication Not Working

1. Verify Keycloak is running
2. Check client credentials in Keycloak admin
3. Verify redirect URLs are configured in Keycloak
4. Check NEXTAUTH_SECRET is set

## Next Steps

- Review `README.md` for full documentation
- Check `SETUP.md` for detailed setup
- See `DEPLOYMENT.md` for production deployment
- Read `IMPLEMENTATION_SUMMARY.md` for architecture

## Support

For issues:
1. Check browser console for errors
2. Check terminal for server errors
3. Verify all environment variables are set
4. Ensure API and Keycloak are accessible
