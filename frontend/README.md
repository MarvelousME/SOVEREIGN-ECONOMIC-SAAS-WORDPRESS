# UBI Platform Frontend Applications

Complete Next.js 14 applications for the UBI Platform ecosystem.

## Overview

This directory contains two production-ready frontend applications:

- **portal-ui**: User-facing portal (Port 3000)
- **admin-ui**: Administrative dashboard (Port 3001)

## Quick Start

### Portal UI Setup

```bash
cd portal-ui
npm install
cp .env.example .env.local
# Edit .env.local with your configuration
npm run dev
```

Visit: http://localhost:3000

### Admin UI Setup

```bash
cd admin-ui
npm install
cp .env.example .env.local
# Edit .env.local with your configuration
npm run dev
```

Visit: http://localhost:3001

## Project Structure

```
frontend/
├── portal-ui/              # User Portal Application
│   ├── src/
│   │   ├── app/            # Next.js App Router
│   │   │   ├── (auth)/     # Authentication pages
│   │   │   ├── (dashboard)/ # Protected routes
│   │   │   ├── api/        # API routes
│   │   │   ├── layout.tsx  # Root layout
│   │   │   └── page.tsx    # Home page
│   │   ├── components/     # React components
│   │   │   ├── ui/         # shadcn/ui components
│   │   │   ├── layout/     # Layout components
│   │   │   ├── dashboard/  # Dashboard widgets
│   │   │   └── shared/     # Shared components
│   │   ├── lib/            # Utilities
│   │   │   ├── api-client.ts
│   │   │   ├── websocket.ts
│   │   │   └── utils.ts
│   │   ├── store/          # State management (Zustand)
│   │   ├── hooks/          # Custom React hooks
│   │   └── types/          # TypeScript types
│   ├── public/             # Static assets
│   ├── package.json
│   ├── tsconfig.json
│   └── tailwind.config.ts
│
├── admin-ui/               # Admin Dashboard (similar structure)
│   └── ...
│
├── SETUP.md                # Detailed setup guide
└── README.md               # This file
```

## Features Implemented

### Portal UI

#### Pages & Routes

- **Authentication** (`/auth/*`)
  - `/auth/login` - Keycloak SSO login
  - `/auth/register` - New user registration

- **Dashboard** (`/dashboard`)
  - Real-time net worth display
  - UBI balance with countdown timer
  - Treasury performance metrics (APY, balance)
  - Active tasks overview
  - Agent performance summary
  - Reputation score
  - Activity feed with real-time updates

- **UBI Module** (`/ubi`)
  - Current balance display
  - Distribution history with filters
  - Next distribution countdown
  - Transaction log with pagination

- **Task Marketplace** (`/tasks`)
  - Browse available tasks
  - Advanced filtering (category, reward, difficulty)
  - Task detail view (`/tasks/[id]`)
  - Submission interface
  - Earnings tracker

- **Agent System** (`/agents`)
  - My agents dashboard
  - Agent marketplace (`/agents/marketplace`)
  - Agent details (`/agents/[id]`)
  - Deployment wizard
  - Performance analytics

- **Treasury** (`/treasury`)
  - Portfolio overview
  - Investment performance charts
  - APY tracking
  - Deposit/withdrawal interface
  - Historical data

- **Rewards** (`/rewards`)
  - Rewards history
  - Claims interface
  - Statistics

- **Reputation** (`/reputation`)
  - Reputation score display
  - History and contributions
  - Badges and achievements

- **Referrals** (`/referrals`)
  - Referral dashboard
  - Referral link generator
  - Earnings from referrals

- **Governance** (`/governance`)
  - Active proposals list
  - Voting interface
  - Proposal creation form
  - Voting history

- **Vault** (`/vault`)
  - Personal data vault
  - Document management
  - Privacy controls

- **Settings** (`/settings`)
  - Profile management
  - Notification preferences
  - Security settings

- **Admin — Architecture** (`/dashboard/system/architecture`, roles: admin / developer)
  - Interactive **React Flow** service map (drag nodes, palette, proposed edges)
  - **Save to repo** and optional debounced **Live save** → `generated/architecture/outputs/` (see repo `generated/architecture/README.md`)
  - **Apply & rebuild** when `ARCHITECTURE_ALLOW_APPLY=true` on the Next.js server

- **Admin — Workflows** (`/dashboard/system/workflows`, roles: admin / developer)
  - Same canvas with baseline **Temporal triggers** and **workflow type** nodes (`workflows/src/workflows/`); documentation-only — does not execute Temporal
  - Theme selection

- **Notifications** (`/notifications`)
  - Notification center
  - Real-time alerts
  - Mark as read functionality

### Admin UI

#### Pages & Routes

- **Admin Dashboard** (`/admin`)
  - Platform metrics (users, revenue, transactions)
  - System health monitoring
  - Recent activity feed
  - Alert panel
  - Quick actions

- **User Management** (`/admin/users`)
  - User list with search/filter
  - User detail view
  - Role management
  - Bulk operations (suspend, activate)
  - User activity logs

- **Tenant Management** (`/admin/tenants`)
  - Tenant list
  - Tenant configuration
  - Resource allocation
  - Billing management

- **UBI Configuration** (`/admin/ubi`)
  - Pool configuration
  - Distribution settings
  - Eligibility rules
  - Payment schedules

- **Treasury Management** (`/admin/treasury`)
  - Investment oversight
  - Strategy configuration
  - Risk management
  - Performance reports

- **Task Moderation** (`/admin/tasks`)
  - Task approval queue
  - Task analytics
  - Fraud detection
  - Category management

- **Agent Monitoring** (`/admin/agents`)
  - Agent status overview
  - Performance metrics
  - Resource usage
  - Deployment management

- **Governance Settings** (`/admin/governance`)
  - Proposal moderation
  - Voting rules
  - Quorum settings

- **Analytics** (`/admin/analytics`)
  - Platform usage statistics
  - Financial metrics
  - User engagement
  - Custom report builder
  - Data export

- **Audit Logs** (`/admin/audit`)
  - Activity tracking
  - Security events
  - User actions
  - System changes
  - Export functionality

- **System Health** (`/admin/system`)
  - Service status
  - Performance metrics
  - Error logs
  - Configuration

## Technology Stack

- **Framework**: Next.js 14.1.3 (App Router)
- **Language**: TypeScript 5.3.3
- **Styling**: Tailwind CSS 3.4.1
- **UI Components**: shadcn/ui (Radix UI)
- **State Management**: Zustand 4.5.2
- **Data Fetching**: @tanstack/react-query 5.25.0
- **Forms**: React Hook Form 7.50.1
- **Validation**: Zod 3.22.4
- **Charts**: Chart.js 4.4.1 & Recharts 2.12.2
- **Authentication**: NextAuth.js 4.24.6
- **Icons**: Lucide React 0.344.0
- **Notifications**: Sonner 1.4.3

## Core Libraries

### API Client (`src/lib/api-client.ts`)

Centralized HTTP client with:
- Automatic authentication header injection
- Token refresh logic
- Error interceptors
- Request/response transformation

```typescript
import apiClient from '@/lib/api-client';

// GET request
const data = await apiClient.get('/api/ubi/balance');

// POST request
const result = await apiClient.post('/api/tasks/submit', { taskId, data });
```

### WebSocket Client (`src/lib/websocket.ts`)

Real-time communication with:
- Automatic reconnection
- Event subscription system
- Message queueing
- Connection state management

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

### State Management

#### User Store (`src/store/use-user-store.ts`)

```typescript
const { user, setUser, updateUser } = useUserStore();
```

#### Notification Store (`src/store/use-notification-store.ts`)

```typescript
const { notifications, addNotification, markAsRead } = useNotificationStore();
```

## Component Library

### UI Components (shadcn/ui)

All components in `src/components/ui/`:
- Button
- Card
- Badge
- Dialog
- Dropdown Menu
- Form
- Input
- Label
- Select
- Switch
- Table
- Tabs
- Toast
- Tooltip
- And more...

### Layout Components

- `DashboardNav`: Sidebar navigation
- `DashboardHeader`: Top header with notifications
- `MobileNav`: Responsive mobile navigation

### Dashboard Widgets

- `StatCard`: Metric display card
- `ChartCard`: Chart wrapper
- `ActivityFeed`: Real-time activity
- `TaskList`: Task overview
- `AgentStatus`: Agent monitoring

## Authentication Flow

1. User visits protected route
2. Next.js middleware checks session
3. If no session → redirect to `/auth/login`
4. User clicks "Sign in with Keycloak"
5. Redirected to Keycloak login
6. After authentication → callback to app
7. Session created with JWT
8. User redirected to dashboard

## Environment Variables

### Required Variables

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# NextAuth Configuration  
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Keycloak Configuration
KEYCLOAK_CLIENT_ID=ubi-portal
KEYCLOAK_CLIENT_SECRET=your-client-secret
KEYCLOAK_ISSUER=http://localhost:8080/realms/ubi-platform
```

### Optional Variables

```env
# Feature Flags
NEXT_PUBLIC_ENABLE_WEBSOCKET=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
NEXT_PUBLIC_DEBUG=false
```

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

## Docker Deployment

### Building Docker Image

```bash
# Portal UI
docker build -t ubi-portal-ui ./portal-ui

# Admin UI  
docker build -t ubi-admin-ui ./admin-ui
```

### Running Container

```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=https://api.ubi-platform.com \
  -e NEXTAUTH_URL=https://portal.ubi-platform.com \
  -e NEXTAUTH_SECRET=your-secret \
  -e KEYCLOAK_CLIENT_ID=ubi-portal \
  -e KEYCLOAK_CLIENT_SECRET=your-secret \
  -e KEYCLOAK_ISSUER=https://auth.ubi-platform.com/realms/ubi-platform \
  ubi-portal-ui
```

### Docker Compose

```yaml
version: '3.8'

services:
  portal-ui:
    build: ./portal-ui
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://api:8000
      - NEXTAUTH_URL=http://localhost:3000
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - KEYCLOAK_CLIENT_ID=${KEYCLOAK_CLIENT_ID}
      - KEYCLOAK_CLIENT_SECRET=${KEYCLOAK_CLIENT_SECRET}
      - KEYCLOAK_ISSUER=${KEYCLOAK_ISSUER}

  admin-ui:
    build: ./admin-ui
    ports:
      - "3001:3001"
    environment:
      - NEXT_PUBLIC_API_URL=http://api:8000
      - NEXTAUTH_URL=http://localhost:3001
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - KEYCLOAK_CLIENT_ID=${KEYCLOAK_ADMIN_CLIENT_ID}
      - KEYCLOAK_CLIENT_SECRET=${KEYCLOAK_ADMIN_CLIENT_SECRET}
      - KEYCLOAK_ISSUER=${KEYCLOAK_ISSUER}
```

## Adding New Features

### Adding a New Page

1. Create page file in `src/app/` directory
2. Add route protection in `middleware.ts` if needed
3. Create components in `src/components/`
4. Add navigation link in `DashboardNav`

### Adding shadcn/ui Components

```bash
npx shadcn-ui@latest add <component-name>
```

### Creating API Hooks

```typescript
// src/hooks/use-ubi-balance.ts
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export function useUbiBalance() {
  return useQuery({
    queryKey: ['ubi', 'balance'],
    queryFn: () => apiClient.get('/api/ubi/balance'),
    refetchInterval: 30000, // Refetch every 30s
  });
}
```

## Performance Optimizations

- **Code Splitting**: Automatic with Next.js App Router
- **Image Optimization**: Use Next.js `<Image>` component
- **Font Optimization**: Use Next.js font optimization
- **API Caching**: Configured via React Query
- **Static Generation**: Use `generateStaticParams` where applicable
- **Bundle Analysis**: `npm run build` shows bundle sizes

## Security Features

- CSRF protection via NextAuth
- XSS protection (React's built-in escaping)
- Content Security Policy headers
- Secure session management
- HTTP-only cookies
- Environment variable validation

## Accessibility

- WCAG 2.1 AA compliant
- Keyboard navigation support
- Screen reader friendly
- Focus management
- Semantic HTML
- ARIA labels where needed

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome)

## Troubleshooting

### API Connection Issues

```bash
# Check API URL
echo $NEXT_PUBLIC_API_URL

# Test API connection
curl $NEXT_PUBLIC_API_URL/health
```

### Authentication Problems

- Verify Keycloak configuration
- Check NEXTAUTH_SECRET is set
- Confirm client credentials are correct
- Review Keycloak realm settings

### Build Errors

```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [React Query Documentation](https://tanstack.com/query)
- [NextAuth.js Documentation](https://next-auth.js.org)

## Support

For issues and questions:
- Check SETUP.md for detailed instructions
- Review API documentation
- Check console for error messages
- Review network requests in DevTools

## License

Proprietary - UBI Platform
