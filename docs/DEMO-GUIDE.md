# QUICK DEMO GUIDE

**Duration:** 10 minutes  
**Prerequisites:** Docker or Podman with Compose, ports **3000**, **3001**, **5432**, and **6379** free

---

## SETUP (30 seconds)

```bash
# Start API + Postgres + Redis (minimal demo stack)
docker compose -f docker-compose.local.yml up --build -d
# Podman:
#   podman compose -f docker-compose.local.yml up --build -d
#   npm run local:up:podman

# Verify all containers are running
docker compose -f docker-compose.local.yml ps

# Portal UI (separate process — serves http://localhost:3001)
npm run local:portal:install   # first time only
npm run local:portal
```

**Note:** If you were running the full dev stack (`docker-compose.dev.yml`), stop it first so ports do not conflict:

```bash
docker compose -f docker-compose.dev.yml down
# Podman: podman compose -f docker-compose.dev.yml down
```

**Expected output:**
```
NAME                STATUS
ubi-postgres-local  Healthy
ubi-redis-local    Healthy  
ubi-api-local      Started
```

---

## DEMO FLOW (10 minutes)

### Step 1: Portal UI Overview (1 min)
**URL:** http://localhost:3001

1. Click **"Try Demo (no account needed)"** (no login required)
2. Show the dashboard layout
3. Point out the sidebar navigation
4. Mention "Demo Mode" badge in top right

### Step 2: Affiliate Intelligence (2 min)
**URL:** http://localhost:3001/dashboard/affiliate

1. Click **"Add Affiliate URL"**
2. Enter a sample URL: `https://amazon.com/dp/B08N5WRWNW?tag=mytracking-20`
3. Show how the system:
   - Normalizes the URL
   - Extracts merchant (Amazon)
   - Detects product
   - Shows freshness score

**Demo talking point:**
> "This URL intelligence pipeline extracts merchant, product, and offer data automatically."

### Step 3: Landing Page Generator (2 min)
**URL:** http://localhost:3001/dashboard/pages/generator

1. Enter the same Amazon URL
2. Click **"Generate Page"**
3. Show the AI-generated page preview:
   - Hero section with product
   - Feature blocks
   - CTA buttons
   - Affiliate disclosure (FTC compliant)
   - Legal disclaimers

**Demo talking point:**
> "Our AI generates compliant landing pages with automatic FTC disclosures. Each page is versioned and can be rolled back."

### Step 4: Page Editor (1 min)
**URL:** http://localhost:3001/dashboard/pages

1. Click on any generated page
2. Show the block editor:
   - Drag-and-drop blocks
   - Hero, Features, CTA, Testimonials
   - Disclosure injection
3. Click **"Preview"** tab

### Step 5: CRM Dashboard (1.5 min)
**URL:** http://localhost:3001/dashboard/crm

1. Show lead stats cards:
   - Total Leads
   - Qualified
   - Converted
2. Show the pipeline funnel visualization
3. Click on a lead to show:
   - Contact info
   - Activity timeline
   - Lead score
   - Routing status

**Demo talking point:**
> "Complete CRM with lead scoring, routing, and conversion tracking. Leads are automatically scored based on engagement."

### Step 6: Compliance Engine (1.5 min)
**URL:** http://localhost:3001/dashboard/compliance

1. Show compliance overview:
   - Consent status by channel
   - Suppression list count
   - Policy compliance %
2. Show the compliance check panel
3. Click **"Check Content"** button
4. Enter sample text to check

**Demo talking point:**
> "Built-in compliance engine handles GDPR, CCPA, FTC, CAN-SPAM. Every action is checked against policy rules."

### Step 7: Agent Control Plane (1.5 min)
**URL:** http://localhost:3001/dashboard/agents

1. Show the mission control panel:
   - Active missions
   - Pending approvals
2. Click **"Create Mission"**
3. Enter objective: "Create 5 landing pages for top products"
4. Show the execution flow:
   - Planner creates task graph
   - Policy pre-check
   - Executor runs in sandbox
   - Reviewer validates
   - Publisher deploys

**Demo talking point:**
> "Our Agent Control Plane implements the Planner→Executor→Reviewer→Publisher loop. Every action is audited and can be rolled back."

### Step 8: Analytics Dashboard (1 min)
**URL:** http://localhost:3001/dashboard/analytics

1. Show revenue overview:
   - Total Revenue
   - This Month
   - Growth %
2. Show attribution model selector:
   - First Touch
   - Last Touch
   - Linear
   - Time Decay
   - Position Based (U-Shaped)
3. Show conversion funnel

---

## WORDPRESS SSO DEMO (Optional - 1 min)

Requires a WordPress + Keycloak environment (not part of `docker-compose.local.yml`). If you use `docker-compose.dev.yml`, Keycloak is typically at **http://localhost:8080**; WordPress must be started from its own compose or host setup.

**Example URL (when WP is running):** your WordPress base URL (often `http://localhost:8080` only if WP is bound to that port).

1. Go to WordPress login page
2. Click **"Sign in with Keycloak"**
3. Show redirect to Keycloak
4. Return to WordPress logged in

---

## KEY DEMO SCENARIOS

### Scenario 1: Affiliate to Published Page (3 min)
1. Add affiliate URL → See normalization
2. Generate page → See AI generation
3. Publish page → See versioning
4. Check analytics → See attribution

### Scenario 2: Lead to Conversion (3 min)
1. View CRM → See lead pipeline
2. Check lead score → See engagement
3. Convert lead → See deal creation
4. Check rewards → See earnings

### Scenario 3: Autonomous Agent (3 min)
1. Create mission → Define objective
2. Watch execution → See planner→executor loop
3. Approval needed → Human checkpoint
4. Published → Artifact created

---

## TALKING POINTS

### For Technical Audience
- "This is a modular monolith with event contracts"
- "20+ Node service packages under `services/`, each with its own Dockerfile; CI builds a subset via `build.yml`"
- "PostgreSQL with Row-Level Security for tenant isolation"
- "NATS for event-driven architecture"
- "Temporal for long-running workflows"

### For Business Audience
- "Turn affiliate links into published pages automatically"
- "Built-in compliance (GDPR, FTC, CAN-SPAM)"
- "Full CRM with lead scoring and routing"
- "Autonomous agents with human oversight"
- "Complete audit trail for every action"

### For Investors
- "Complete platform from traffic to revenue"
- "Multi-tenant SaaS architecture"
- "Smart contract-ready treasury"
- "Event-driven for scalability"
- "Self-service onboarding via WordPress"

---

## TROUBLESHOOTING

### Containers not starting
```bash
docker compose -f docker-compose.local.yml down
docker compose -f docker-compose.local.yml up --build -d
```

### API not responding
```bash
docker logs ubi-api-local
# Podman: podman logs ubi-api-local
```

### Database connection issues
```bash
docker exec -it ubi-postgres-local psql -U postgres -d ubi_dev
# Podman: podman exec -it ubi-postgres-local psql -U postgres -d ubi_dev
```

---

## CONTACT FOR TECHNICAL QUESTIONS

[sammuti.com](https://sammuti.com)
