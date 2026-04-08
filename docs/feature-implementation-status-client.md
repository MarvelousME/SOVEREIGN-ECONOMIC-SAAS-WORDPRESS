# Feature Status (Client-Friendly)

Last updated: 2026-04-07

This is a non-technical view of what the platform can do today, what is partially available, and what is not yet built.

## Implemented

- **Tenant + workspace foundation**: multi-tenant database structures and workspace provisioning exist.
- **Landing page generation + publishing**: a landing page service can generate pages from an affiliate URL context and publish to multiple target types (CDN/subdomain/embed/custom domain).
- **Social sharing (manual/intent)**: the system can generate “share” links (open the social platform’s share UI with the landing page URL prefilled).
- **Optional publish webhook**: when a page is published, an optional webhook can notify external automation (e.g., n8n/Zapier).
- **Tracking foundation**: analytics ingest route exists; WordPress click-tracking building block exists.

## Partially Implemented

- **Social distribution**
  - **Available now**: share links + webhook triggers.
  - **Not built yet**: native in-app social account connection and automatic posting.

- **Campaign orchestration**
  - **Available now**: page publish pipeline and outputs.
  - **Not built yet**: a full campaign layer (scheduling, retries, state machine, reporting) inside the landing page service.

## Not Implemented Yet

- **Automatic posting to social networks via OAuth** (Meta/X/LinkedIn APIs)
- **Social post scheduler** (calendar, delayed publish, retries, dead-letter handling)
- **First-party social analytics ingestion** (impressions/engagement tied to a post)
- **Closed-loop attribution** from social post → click → conversion across the stack

