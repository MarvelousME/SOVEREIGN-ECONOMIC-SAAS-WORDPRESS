# Frontend Applications Setup Guide

## Overview

This directory contains two Next.js applications:
- **portal-ui**: User-facing portal for UBI platform
- **admin-ui**: Administrative dashboard for platform management

## Quick Start

### Portal UI

```bash
cd frontend/portal-ui
npm install
cp .env.example .env.local
# Edit .env.local with your configuration
npm run dev
```

Application will be available at http://localhost:3000

### Admin UI

```bash
cd frontend/admin-ui
npm install
cp .env.example .env.local
# Edit .env.local with your configuration
npm run dev
```

Application will be available at http://localhost:3001

## Technology Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **State Management**: Zustand
- **Data Fetching**: React Query (@tanstack/react-query)
- **Forms**: React Hook Form + Zod validation
- **Charts**: Chart.js & Recharts
- **Authentication**: NextAuth.js with Keycloak provider

## Environment Variables

### Required Variables

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-a-secret-key

# Keycloak Configuration
KEYCLOAK_CLIENT_ID=ubi-portal
KEYCLOAK_CLIENT_SECRET=your-client-secret
KEYCLOAK_ISSUER=http://localhost:8080/realms/ubi-platform
```

### Generating NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

## Project Structure

```
frontend/
├── portal-ui/
│   ├── src/
│   │   ├── app/              # Next.js 14 App Router pages
│   │   │   ├── (auth)/       # Authentication routes
│   │   │   ├── (dashboard)/  # Protected dashboard routes
│   │   │   ├── layout.tsx    # Root layout
│   │   │   └── page.tsx      # Home page
│   │   ├── components/       # Reusable components
│   │   │   ├── ui/           # shadcn/ui components
│   │   │   ├── layout/       # Layout components
│   │   │   ├── dashboard/    # Dashboard widgets
│   │   │   └── shared/       # Shared components
│   │   ├── lib/              # Utility libraries
│   │   │   ├── api-client.ts # API client with interceptors
│   │   │   ├── websocket.ts  # WebSocket client
│   │   │   └── utils.ts      # Helper functions
│   │   ├── store/            # Zustand stores
│   │   ├── hooks/            # Custom React hooks
│   │   └── types/            # TypeScript types
│   ├── public/               # Static assets
│   └── package.json
│
└── admin-ui/                 # Similar structure to portal-ui
    └── ...
```

## Key Features

### Portal UI

1. **Dashboard** (`/dashboard`)
   - Real-time net worth display
   - UBI balance and distribution countdown
   - Treasury performance metrics
   - Active tasks overview
   - Agent performance summary
   - Activity feed

2. **UBI Module** (`/ubi`)
   - Balance display
   - Distribution history
   - Next distribution timer
   - Transaction log

3. **Task Marketplace** (`/tasks`)
   - Browse available tasks
   - Filter by category, reward, difficulty
   - Task submission interface
   - Task history and earnings

4. **Agent System** (`/agents`)
   - My agents dashboard
   - Agent marketplace
   - Agent deployment wizard
   - Performance analytics

5. **Treasury** (`/treasury`)
   - Portfolio overview
   - Investment performance
   - APY tracking
   - Deposit/withdrawal interface

6. **Governance** (`/governance`)
   - Active proposals
   - Voting interface
   - Proposal creation
   - Voting history

### Admin UI

1. **Admin Dashboard** (`/admin`)
   - Platform metrics
   - System health monitoring
   - Recent activity
   - Alert panel

2. **User Management** (`/admin/users`)
   - User list with search/filter
   - User details and actions
   - Bulk operations
   - Role management

3. **Treasury Management** (`/admin/treasury`)
   - Pool configuration
   - Investment strategies
   - Performance monitoring
   - Risk management

4. **Analytics** (`/admin/analytics`)
   - Platform usage statistics
   - Financial metrics
   - User engagement
   - Custom reports

5. **Audit Logs** (`/admin/audit`)
   - Activity tracking
   - Security events
   - Export functionality

## Authentication Flow

1. User visits protected route
2. Next.js middleware checks session
3. If no session, redirect to `/auth/login`
4. User authenticates via Keycloak
5. NextAuth creates session with JWT
6. API client includes token in all requests
7. Refresh token logic handles token expiration

## API Integration

All API calls go through the centralized API client (`src/lib/api-client.ts`):

```typescript
import apiClient from '@/lib/api-client';

// Example usage
const data = await apiClient.get('/api/ubi/balance');
const result = await apiClient.post('/api/tasks/submit', { taskId, data });
```

The client automatically:
- Adds authentication headers
- Handles token refresh
- Manages error responses
- Redirects on 401 (unauthorized)

## WebSocket Integration

Real-time updates via WebSocket (`src/lib/websocket.ts`):

```typescript
import wsClient from '@/lib/websocket';

// Subscribe to events
useEffect(() => {
  const unsubscribe = wsClient.subscribe('ubi.balance', (data) => {
    setBalance(data.balance);
  });
  
  return () => unsubscribe();
}, []);
```

## State Management

Global state is managed with Zustand stores:

- `useUserStore`: User profile and preferences
- `useNotificationStore`: In-app notifications
- Additional stores in `src/store/`

## Development

### Running Development Server

```bash
npm run dev
```

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

### Building for Production

```bash
npm run build
npm start
```

## Deployment

### Docker Deployment

Each application includes a Dockerfile:

```bash
# Build image
docker build -t ubi-portal-ui ./frontend/portal-ui

# Run container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=https://api.ubi-platform.com \
  -e NEXTAUTH_URL=https://portal.ubi-platform.com \
  ubi-portal-ui
```

### Environment-Specific Builds

Production builds require setting environment variables at build time:

```bash
NEXT_PUBLIC_API_URL=https://api.ubi-platform.com npm run build
```

## Customization

### Adding New Pages

1. Create page in `src/app/` directory
2. Add route protection if needed (middleware)
3. Create necessary components in `src/components/`
4. Add API hooks if needed

### Adding shadcn/ui Components

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
```

### Styling

- Global styles: `src/app/globals.css`
- Tailwind config: `tailwind.config.ts`
- Theme customization: Modify CSS variables in `globals.css`

## Troubleshooting

### Common Issues

1. **API connection fails**
   - Verify NEXT_PUBLIC_API_URL is correct
   - Check CORS configuration on API
   - Ensure API is running

2. **Authentication not working**
   - Verify Keycloak configuration
   - Check NEXTAUTH_SECRET is set
   - Ensure client credentials are correct

3. **WebSocket not connecting**
   - Verify NEXT_PUBLIC_WS_URL
   - Check WebSocket endpoint on API
   - Review browser console for errors

### Debug Mode

Enable verbose logging:

```env
NODE_ENV=development
NEXT_PUBLIC_DEBUG=true
```

## Performance Optimization

- Code splitting: Automatic with Next.js App Router
- Image optimization: Use Next.js `<Image>` component
- Font optimization: Use Next.js font optimization
- API response caching: Configured in React Query
- Static generation: Use `generateStaticParams` where applicable

## Security Considerations

- All environment variables with secrets must be server-side only
- Use `NEXT_PUBLIC_` prefix only for non-sensitive variables
- CSRF protection enabled via NextAuth
- XSS protection through React's built-in escaping
- Content Security Policy headers configured in `next.config.js`

## Support

For issues and questions:
- Check documentation in `/docs`
- Review API documentation
- Contact development team
