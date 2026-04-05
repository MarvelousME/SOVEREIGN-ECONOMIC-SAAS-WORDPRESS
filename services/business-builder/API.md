# Business Builder API Documentation

Base URL: `http://localhost:3007/api/v1/business`

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

## Templates

### GET /templates

List all available business templates.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "ecommerce",
      "name": "E-commerce Store",
      "description": "Complete online store with product catalog, shopping cart, and checkout",
      "category": "Retail",
      "features": ["Product catalog", "Shopping cart", "Payment processing", "..."],
      "pricing": { "isFree": true },
      "estimatedSetupTime": 30
    }
  ]
}
```

## Business Management

### POST /create

Create a new business from template.

**Request Body:**
```json
{
  "template": "ecommerce",
  "name": "My Store",
  "description": "Premium handmade products store",
  "domain": {
    "subdomain": "mystore",
    "customDomain": "mystore.com" // optional
  },
  "brandingConfig": {
    "businessType": "E-commerce store for handmade crafts",
    "targetAudience": "Art enthusiasts aged 25-45",
    "keywords": ["handmade", "artisan", "premium"],
    "tone": "professional" // or "casual", "playful", "luxurious", "minimalist"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "template": "ecommerce",
    "name": "My Store",
    "status": "draft",
    "branding": { ... },
    "domain": { "subdomain": "mystore", "sslEnabled": false },
    "createdAt": "2026-03-26T05:55:29.000Z"
  }
}
```

### GET /

List user's businesses.

**Query Parameters:**
- `limit` (default: 50)
- `offset` (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 3
  }
}
```

### GET /:id

Get specific business by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "My Store",
    "status": "active",
    "branding": { ... },
    "pages": [...],
    "funnels": [...],
    "revenue": { "total": 1500.00, "platformFee": 75.00 },
    "analytics": { ... }
  }
}
```

### PUT /:id

Update business configuration.

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "status": "active",
  "branding": {
    "colorScheme": {
      "primary": "#3B82F6",
      "secondary": "#10B981",
      "accent": "#F59E0B",
      "background": "#FFFFFF",
      "text": "#1F2937"
    }
  },
  "integrations": {
    "payment": {
      "provider": "stripe",
      "apiKey": "sk_live_...",
      "config": {}
    }
  },
  "features": {
    "abTesting": true,
    "advancedAnalytics": true
  }
}
```

### DELETE /:id

Delete a business (soft delete).

**Response:**
```json
{
  "success": true,
  "message": "Business deleted successfully"
}
```

## Deployment

### POST /:id/deploy

Deploy business to production.

**Request Body:**
```json
{
  "enableSsl": true,
  "customDomain": "mystore.com",
  "notifyEmail": "owner@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "active",
    "deployedAt": "2026-03-26T06:00:00.000Z",
    "domain": {
      "subdomain": "mystore",
      "customDomain": "mystore.com",
      "sslEnabled": true
    }
  },
  "message": "Business deployed successfully"
}
```

## Analytics

### GET /:id/analytics

Get business metrics and analytics.

**Query Parameters:**
- `period`: "day" | "week" | "month" | "year" (default: "week")
- `startDate`: ISO 8601 date (optional)
- `endDate`: ISO 8601 date (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "businessId": "uuid",
    "period": "week",
    "startDate": "2026-03-19T00:00:00.000Z",
    "endDate": "2026-03-26T23:59:59.000Z",
    "metrics": {
      "visitors": 1250,
      "uniqueVisitors": 980,
      "pageViews": 3450,
      "conversions": 42,
      "conversionRate": 4.29,
      "revenue": 2100.00,
      "platformFee": 105.00,
      "topPages": [
        { "path": "/home", "views": 1200, "conversions": 15 },
        { "path": "/products", "views": 800, "conversions": 20 }
      ],
      "trafficSources": [
        { "source": "google", "visitors": 500, "conversions": 20 },
        { "source": "direct", "visitors": 300, "conversions": 15 }
      ],
      "devices": {
        "desktop": 700,
        "mobile": 450,
        "tablet": 100
      }
    }
  }
}
```

## AI Branding

### POST /:id/branding

Generate complete AI branding package.

**Request Body:**
```json
{
  "businessType": "E-commerce store for sustainable fashion",
  "targetAudience": "Eco-conscious millennials",
  "keywords": ["sustainable", "ethical", "modern", "minimalist"],
  "industry": "Fashion",
  "tone": "minimalist"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "logo": {
      "url": "https://...",
      "prompt": "...",
      "variations": ["https://...", "https://..."]
    },
    "colorScheme": {
      "primary": "#2E7D32",
      "secondary": "#81C784",
      "accent": "#FFA726",
      "background": "#FAFAFA",
      "text": "#212121"
    },
    "fonts": {
      "heading": "Montserrat",
      "body": "Open Sans",
      "accent": "Playfair Display"
    },
    "tagline": "Sustainable Style, Effortlessly",
    "alternativeTaglines": [
      "Eco-Fashion for the Modern World",
      "Wear Your Values",
      "Sustainable Never Looked This Good"
    ],
    "brandGuidelines": {
      "voice": "Confident, approachable, and environmentally conscious",
      "messaging": [
        "Sustainability is our foundation",
        "Quality over quantity",
        "Transparent supply chain",
        "Timeless, not trendy",
        "Community-driven values"
      ],
      "doNots": [
        "Don't use fast fashion language",
        "Avoid greenwashing claims",
        "Don't compromise on ethics",
        "Avoid overly technical jargon",
        "Don't sacrifice style for sustainability"
      ]
    }
  },
  "message": "Branding generated successfully"
}
```

### POST /:id/branding/:element

Regenerate specific branding element.

**Parameters:**
- `element`: "tagline" | "colors" | "fonts" | "logo"

**Request Body:** Same as `/branding`

**Response:**
```json
{
  "success": true,
  "data": {
    "tagline": "New Generated Tagline",
    "alternativeTaglines": ["Alt 1", "Alt 2", "Alt 3"]
  },
  "message": "tagline regenerated successfully"
}
```

## Error Responses

### Validation Error (400)
```json
{
  "success": false,
  "error": "Validation error",
  "details": [
    {
      "path": "domain.subdomain",
      "message": "String must match pattern ^[a-z0-9-]+$"
    }
  ]
}
```

### Unauthorized (401)
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

### Forbidden (403)
```json
{
  "success": false,
  "error": "Forbidden"
}
```

### Not Found (404)
```json
{
  "success": false,
  "error": "Business not found"
}
```

### Conflict (409)
```json
{
  "success": false,
  "error": "Subdomain mystore is already taken"
}
```

### Rate Limit (429)
```json
{
  "success": false,
  "error": "Too many requests, please try again later"
}
```

### Internal Server Error (500)
```json
{
  "success": false,
  "error": "Internal server error"
}
```

## Rate Limits

- Business creation: 10 requests/hour
- Deployment: 5 requests/hour
- Branding generation: 20 requests/hour
- Branding element regeneration: 30 requests/hour
- All other endpoints: 100 requests/15 minutes

## Webhooks

Business Builder can send webhooks for the following events:

- `business.created`
- `business.deployed`
- `business.payment_received`
- `business.subscription_updated`

Configure webhooks in your business settings.
