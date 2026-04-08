# Business Builder Service

Business-in-a-Box service for instant SaaS creation with AI-powered branding and automated funnel building.

**Treasury:** Every provisioned workspace row includes `settings.treasury` pointing at the **platform main vault** (`MAIN_TREASURY_PLATFORM_TENANT_ID` / `MAIN_TREASURY_VAULT_ID`, default `1` / `1`). See `src/constants/treasury.ts` and `migrations/022_tenant_workspace_main_treasury.sql`.

## Features

### Core Functionality
- ✅ Template-based business creation (7 templates)
- ✅ AI-powered branding generator (GPT-4 + DALL-E 3)
- ✅ Automated funnel builder
- ✅ Payment integration (Stripe/PayPal/PayFast)
- ✅ CRM integration
- ✅ Analytics and tracking
- ✅ Custom domain support with SSL
- ✅ 5% platform revenue model

### Business Templates

1. **E-commerce Store** - Complete online store with cart and checkout
2. **Service Marketplace** - Connect service providers with customers
3. **Lead Generation Funnel** - High-converting landing pages
4. **Membership Site** - Subscription-based content platform
5. **Course Platform** - Online courses with progress tracking
6. **Booking & Scheduling** - Appointment booking system
7. **Affiliate Program** - Complete affiliate marketing platform

### AI Branding Generator

The AI branding generator uses GPT-4 and DALL-E 3 to create:

- **Logo Design** - AI-generated logos with multiple variations
- **Color Scheme** - WCAG-compliant 5-color palette
- **Font Pairings** - Professional Google Font combinations
- **Taglines** - Multiple compelling tagline options
- **Brand Guidelines** - Voice, messaging, and brand do's/don'ts

## API Endpoints

### Templates
```
GET /api/v1/business/templates
```
List all available business templates.

### Business Management
```
POST /api/v1/business/create
GET /api/v1/business
GET /api/v1/business/:id
PUT /api/v1/business/:id
DELETE /api/v1/business/:id
```

### Deployment
```
POST /api/v1/business/:id/deploy
```
Deploy business to production with optional custom domain.

### Analytics
```
GET /api/v1/business/:id/analytics?period=week&startDate=...&endDate=...
```
Get business metrics and analytics.

### AI Branding
```
POST /api/v1/business/:id/branding
POST /api/v1/business/:id/branding/:element
```
Generate or regenerate branding elements (logo, colors, fonts, tagline).

## Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# - Database credentials
# - OpenAI API key
# - JWT secret
# - Stripe keys (optional)

# Run database migrations
psql -U postgres -d ubi_cms -f ../../migrations/011_create_business_builder_tables.sql

# Build
npm run build

# Start development server
npm run dev

# Start production server
npm start
```

## Environment Variables

Required:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - PostgreSQL connection
- `JWT_SECRET` - JWT signing secret
- `OPENAI_API_KEY` - OpenAI API key for AI branding

Optional:
- `STRIPE_SECRET_KEY` - Stripe API key
- `SENDGRID_API_KEY` - SendGrid for emails
- `BASE_DOMAIN` - Base domain for subdomains

## Usage Example

### Create a Business

```bash
curl -X POST http://localhost:3007/api/v1/business/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "ecommerce",
    "name": "My Online Store",
    "description": "Selling premium handmade products",
    "domain": {
      "subdomain": "mystore"
    },
    "brandingConfig": {
      "businessType": "E-commerce store for handmade crafts",
      "targetAudience": "Art enthusiasts aged 25-45",
      "keywords": ["handmade", "artisan", "crafts", "unique"],
      "tone": "professional"
    }
  }'
```

### Generate Branding

```bash
curl -X POST http://localhost:3007/api/v1/business/:id/branding \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "businessType": "E-commerce store",
    "targetAudience": "Young professionals",
    "keywords": ["modern", "sustainable", "premium"],
    "tone": "minimalist"
  }'
```

### Deploy Business

```bash
curl -X POST http://localhost:3007/api/v1/business/:id/deploy \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enableSsl": true,
    "customDomain": "mystore.com"
  }'
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

## Architecture

```
business-builder/
├── src/
│   ├── config/          # Configuration (DB, logger)
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Auth, rate limiting, errors
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── services/        # Business logic & AI services
│   ├── templates/       # Business templates
│   ├── types/           # TypeScript types
│   ├── validators/      # Zod schemas
│   └── index.ts         # App entry point
├── tests/               # Test files
└── migrations/          # Database migrations
```

## Revenue Model

The platform automatically:
- Tracks all business revenue
- Calculates 5% platform fee
- Stores in `business_payments` table
- Updates business revenue totals

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **AI**: OpenAI GPT-4 + DALL-E 3
- **Payments**: Stripe
- **Validation**: Zod
- **Logging**: Winston
- **Testing**: Jest

## License

MIT License - UBI-CMS Team
