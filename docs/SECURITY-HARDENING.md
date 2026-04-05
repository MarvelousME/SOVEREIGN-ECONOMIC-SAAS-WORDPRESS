# Security Hardening Documentation

Complete security hardening implementation for UBI-CMS platform.

## Table of Contents

1. [OPA Policy System](#opa-policy-system)
2. [Security Middleware](#security-middleware)
3. [Audit Logging](#audit-logging)
4. [Integration Guide](#integration-guide)
5. [Testing](#testing)
6. [Monitoring](#monitoring)

---

## OPA Policy System

### Overview

Open Policy Agent (OPA) provides centralized policy enforcement across all services.

### Policy Files

Located in `/docker/configs/opa/policies/`:

- **tenant_isolation.rego** - Prevents cross-tenant data access
- **treasury.rego** - Treasury operation controls
- **agents.rego** - Agent deployment and resource access
- **tasks.rego** - Task creation, claiming, and approval
- **governance.rego** - Proposal creation and voting
- **data_access.rego** - Data access and consent management
- **rbac.rego** - Role-based access control

### Policy Architecture

```
┌─────────────┐
│   Request   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  OPA Client     │
│  (TypeScript)   │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  OPA Server     │
│  (Port 8181)    │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Policy Decision │
│ (Allow/Deny)    │
└─────────────────┘
```

### Tenant Isolation Policy

**Purpose**: Ensure strict data segregation between tenants

**Rules**:
- ❌ DENY cross-tenant data access
- ❌ DENY cross-tenant queries
- ❌ DENY missing tenant context
- ❌ DENY tenant spoofing
- ✅ ALLOW same-tenant access
- ✅ ALLOW platform admin (with audit)
- ✅ ALLOW public endpoints
- ✅ ALLOW system operations

**Example**:

```rego
deny_cross_tenant[msg] {
    input.subject.tenant_id != input.resource.tenant_id
    not is_platform_admin
    msg := "Cross-tenant access denied"
}
```

### Treasury Policy

**Purpose**: Control treasury operations and fund management

**Withdrawal Rules**:
- Check sufficient balance
- Enforce daily withdrawal limits
- Require KYC verification for large amounts
- Prevent frozen account withdrawals

**Spending Rules**:
- Small spends (<50k): Treasury member role
- Large spends (>50k): Multi-sig approval required
- Spending authority validation

**Allocation Rules**:
- Admin or governance approval required
- Allocations must sum to 100%
- Risk acknowledgment for high-risk strategies

### Agent Policy

**Purpose**: Control agent deployment and resource access

**Deployment Rules**:
- Minimum reputation score: 50
- Active subscription required
- Quota enforcement by tier:
  - Free: 1 agent, 1k API calls
  - Basic: 5 agents, 10k API calls
  - Pro: 25 agents, 100k API calls
  - Enterprise: 999 agents, unlimited calls

**Resource Access**:
- Scope validation
- API quota enforcement
- Agent status checks

**Treasury Spending**:
- Per-agent spend limits
- Owner authorization
- Burn rate monitoring

### Task Policy

**Purpose**: Control task lifecycle operations

**Creation Rules**:
- Minimum reputation: 25
- Sufficient balance for reward
- Valid task parameters
- Spam prevention (10 tasks/hour max)

**Claiming Rules**:
- Task availability check
- Reputation requirements
- Skill matching
- Concurrent task limit (5 max)
- Creator ban check

**Approval Rules**:
- Only task owner or delegated approver
- Task must be submitted
- Prevent duplicate approvals

### Governance Policy

**Purpose**: Control proposal creation and voting

**Proposal Creation**:
- Minimum reputation: 100
- Minimum stake: 1000 tokens
- Proposal spam prevention (3/day max)
- Valid proposal structure

**Voting**:
- Voting power = (reputation / 10) + stake
- One vote per user per proposal
- Vote manipulation detection

**Execution**:
- 66.67% approval threshold
- 20% quorum requirement
- 48-hour execution delay
- Execution blocking mechanism

### Data Access Policy

**Purpose**: GDPR-compliant data access control

**Access Rules**:
- User can access own data
- Explicit consent required
- Consent expiration checks
- Scope validation

**Audit Logs**:
- Only audit admins can access logs
- Tenant isolation for audit logs
- Platform admin requires documented purpose

**Exports**:
- GDPR right to portability
- Rate limiting (5 exports/30 days)

### RBAC Policy

**Purpose**: Role-based access control with hierarchy

**Role Hierarchy**:

```
platform_admin
├── tenant_admin
│   ├── treasury_admin
│   │   └── treasury_member
│   └── governance_member
└── audit_admin
    └── user

agent_creator → user
task_creator → task_worker → user
```

**Permission Format**: `resource:action`

Examples:
- `treasury:withdraw`
- `agent:create`
- `task:read`
- `user:update:own` (ownership constraint)

---

## Security Middleware

### Location

`/api/src/Middleware/security.js`

### Features

#### 1. Security Headers

```javascript
app.use(securityHeaders);
```

Applied headers:
- `X-Frame-Options: DENY` - Prevent clickjacking
- `X-Content-Type-Options: nosniff` - Prevent MIME sniffing
- `X-XSS-Protection: 1; mode=block` - XSS protection
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`
- `Strict-Transport-Security` (HTTPS only)

#### 2. Input Sanitization

```javascript
app.use(sanitize);
```

Removes:
- `<script>` tags
- `javascript:` URLs
- Event handlers (`onclick=`, etc.)

#### 3. SQL Injection Prevention

```javascript
app.use(preventSqlInjection);
```

Detects patterns:
- SQL keywords (SELECT, INSERT, UPDATE, etc.)
- Comment syntax (`--`, `/*`)
- Boolean logic injection

#### 4. XSS Protection

Automatic sanitization of:
- Request body
- Query parameters
- URL parameters

#### 5. CSRF Token Validation

```javascript
// Generate token
const token = generateCsrfToken(req);

// Validate token
app.use(validateCsrfToken);
```

Required for: POST, PUT, PATCH, DELETE requests

#### 6. Request Size Limiting

```javascript
app.use(requestSizeLimit('10mb', '50mb'));
```

Prevents denial-of-service attacks via large payloads.

#### 7. Content Type Validation

```javascript
app.use(validateContentType(['application/json']));
```

Only accepts specified content types.

#### 8. Rate Limiting

```javascript
app.use(rateLimiter());
```

Default limits:
- General: 100 req/15min
- Auth endpoints: 10 req/15min

#### 9. Brute Force Protection

```javascript
app.use('/auth/login', bruteForeProtection(5, 900000));
```

Limits login attempts per IP + username.

#### 10. Secret Scanning Prevention

```javascript
app.use(preventSecretExposure);
```

Detects patterns:
- API keys (Stripe, AWS, Google, GitHub, Slack)
- Private keys
- Tokens

---

## Validation Middleware

### Location

`/api/src/Middleware/validation.js`

### Usage

```javascript
const { validateRequest, schemas } = require('../Middleware/validation');

app.post('/api/users',
    validateRequest({
        body: schemas.user.create,
    }),
    createUserHandler
);
```

### Available Schemas

#### User Schemas

```javascript
schemas.user.create
schemas.user.update
```

#### Agent Schemas

```javascript
schemas.agent.create
schemas.agent.update
```

#### Task Schemas

```javascript
schemas.task.create
schemas.task.claim
schemas.task.submit
```

#### Treasury Schemas

```javascript
schemas.treasury.withdraw
schemas.treasury.allocate
```

#### Governance Schemas

```javascript
schemas.governance.createProposal
schemas.governance.vote
```

### Custom Validators

```javascript
const { validators } = require('../Middleware/validation');

const schema = Joi.object({
    wallet: validators.ethereumAddress.required(),
    ipfsHash: validators.ipfsHash,
    amount: validators.cryptoAmount,
});
```

---

## Audit Logging

### Location

`/api/src/Middleware/audit.js`

### Features

1. **Tamper-proof logs** with SHA-256 hashing
2. **Automatic mutation logging**
3. **Authentication event tracking**
4. **Security event monitoring**
5. **Policy decision logging**
6. **Multiple storage backends**

### Usage

#### Enable Middleware

```javascript
const {
    logMutations,
    logAuthentication,
    logSecurityEvents,
} = require('../Middleware/audit');

app.use(logMutations);
app.use(logAuthentication);
app.use(logSecurityEvents);
```

#### Manual Logging

```javascript
const { audit } = require('../Middleware/audit');

// Log data access
audit.dataAccess(req, 'user', 'user-123', 'read');

// Log admin action
audit.adminAction(req, 'delete_user', 'user-456', { reason: 'GDPR request' });

// Log treasury operation
audit.treasury(req, 'withdraw', 1000, { destination: '0x...' });

// Log governance action
audit.governance(req, 'vote', 'proposal-789', { vote: 'for' });
```

#### Storage Backends

**File Storage**:

```javascript
const { enableFileStorage } = require('../Middleware/audit');

enableFileStorage('./logs/audit');
```

Creates daily log files: `audit-2026-03-26.jsonl`

**Database Storage**:

```javascript
const { enableDatabaseStorage } = require('../Middleware/audit');

enableDatabaseStorage(db);
```

**Query API**:

```javascript
const { createAuditQueryMiddleware } = require('../Middleware/audit');

app.get('/api/audit/logs', createAuditQueryMiddleware());
```

### Log Structure

```json
{
  "id": "uuid",
  "timestamp": "2026-03-26T05:54:00.000Z",
  "type": "mutation|authentication|security|policy_decision|data_access|admin_action|treasury|governance|agent|task|consent|export",
  "tenant_id": "tenant-456",
  "user_id": "user-123",
  "user_email": "user@example.com",
  "session_id": "session-789",
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "request": {
    "method": "POST",
    "path": "/api/treasury/withdraw",
    "query": {},
    "body": { "amount": 1000 }
  },
  "data": {
    "operation": "withdraw",
    "amount": 1000,
    "details": {}
  },
  "hash": "sha256_hash"
}
```

### Sensitive Data Redaction

Automatically redacts:
- password
- token
- secret
- apiKey
- privateKey

---

## Integration Guide

### 1. Install Dependencies

```bash
cd shared/opa-client
npm install
npm run build
```

### 2. Link Library

```bash
cd ../../api
npm link ../shared/opa-client
```

### 3. Initialize OPA Client

```javascript
// api/src/Config/opa.js
const { initializeOPA } = require('@ubi-cms/opa-client');

const opaClient = initializeOPA({
    url: process.env.OPA_URL || 'http://opa:8181',
    timeout: 5000,
    cache: true,
    cacheTTL: 60000,
    fallbackAllow: false,
});

module.exports = opaClient;
```

### 4. Apply Middleware

```javascript
// api/src/app.js
const {
    securityHeaders,
    sanitize,
    preventSqlInjection,
    validateCsrfToken,
    rateLimiter,
    bruteForeProtection,
    preventSecretExposure,
} = require('./Middleware/security');

const {
    logMutations,
    logAuthentication,
    logSecurityEvents,
} = require('./Middleware/audit');

// Apply security middleware
app.use(securityHeaders);
app.use(sanitize);
app.use(preventSqlInjection);
app.use(preventSecretExposure);
app.use(rateLimiter());

// Apply audit middleware
app.use(logMutations);
app.use(logAuthentication);
app.use(logSecurityEvents);

// Apply CSRF to mutation endpoints
app.use(['/api/*/create', '/api/*/update', '/api/*/delete'], validateCsrfToken);

// Apply brute force protection to auth
app.use('/api/auth/login', bruteForeProtection());
```

### 5. Protect Routes with OPA

```javascript
const { createOPAMiddleware } = require('@ubi-cms/opa-client');
const opaClient = require('./Config/opa');

// Protect treasury routes
app.use('/api/treasury/*',
    createOPAMiddleware(opaClient, 'treasury')
);

// Protect agent routes
app.use('/api/agents/*',
    createOPAMiddleware(opaClient, 'agents')
);

// Protect task routes
app.use('/api/tasks/*',
    createOPAMiddleware(opaClient, 'tasks')
);
```

### 6. Manual Policy Checks

```javascript
const opaClient = require('./Config/opa');

router.post('/treasury/withdraw', async (req, res) => {
    const canWithdraw = await opaClient.checkTreasury('withdraw', {
        subject: {
            id: req.user.id,
            kyc_status: req.user.kyc_status,
        },
        resource: {
            balance: await getUserBalance(req.user.id),
            daily_spent: await getDailySpent(req.user.id),
            daily_withdrawal_limit: req.user.withdrawal_limit,
        },
        amount: req.body.amount,
    });

    if (!canWithdraw) {
        const violations = await opaClient.getViolations('treasury', {...});
        return res.status(403).json({
            error: 'Withdrawal denied',
            violations,
        });
    }

    // Proceed with withdrawal
    await processWithdrawal(req.user.id, req.body.amount);
    
    // Log operation
    audit.treasury(req, 'withdraw', req.body.amount, {
        destination: req.body.destination,
    });

    res.json({ success: true });
});
```

---

## Testing

### Unit Tests

```javascript
const { MockOPAClient } = require('@ubi-cms/opa-client/testing');

describe('Withdrawal endpoint', () => {
    let mockOPA;

    beforeEach(() => {
        mockOPA = new MockOPAClient();
    });

    it('allows withdrawal within limits', async () => {
        mockOPA.mockAllow('treasury', {
            action: 'withdraw',
            amount: 1000,
        });

        const response = await request(app)
            .post('/api/treasury/withdraw')
            .send({ amount: 1000 })
            .expect(200);

        expect(response.body.success).toBe(true);
    });

    it('denies withdrawal over limit', async () => {
        mockOPA.mockDeny('treasury', {
            action: 'withdraw',
            amount: 10000,
        }, ['Daily withdrawal limit exceeded']);

        await request(app)
            .post('/api/treasury/withdraw')
            .send({ amount: 10000 })
            .expect(403);
    });
});
```

### Policy Tests

```bash
cd docker/configs/opa/policies
opa test . -v
```

Create test files:

```rego
# treasury_test.rego
package treasury

test_allow_withdrawal_sufficient_balance {
    allow_withdrawal with input as {
        "action": "withdraw",
        "amount": 1000,
        "subject": {"kyc_status": "verified"},
        "resource": {
            "balance": 10000,
            "daily_spent": 0,
            "daily_withdrawal_limit": 5000
        }
    }
}

test_deny_withdrawal_exceeded_limit {
    deny_withdrawal with input as {
        "action": "withdraw",
        "amount": 6000,
        "resource": {
            "daily_spent": 0,
            "daily_withdrawal_limit": 5000
        }
    }
}
```

---

## Monitoring

### Metrics to Track

1. **Policy Decision Rate**
   - Allow rate
   - Deny rate
   - Policy violations by type

2. **Security Events**
   - Failed authentication attempts
   - Rate limit hits
   - SQL injection attempts
   - XSS attempts
   - Secret exposure attempts

3. **Audit Log Volume**
   - Logs per hour
   - Log storage size
   - Query latency

4. **OPA Performance**
   - Decision latency (p50, p95, p99)
   - Cache hit rate
   - OPA availability

### Alerting

Set up alerts for:
- ❗ OPA service unavailable
- ❗ High rate of policy denials
- ❗ SQL injection attempts
- ❗ Secret exposure attempts
- ❗ Brute force attacks
- ❗ Cross-tenant access attempts
- ❗ Audit log failures

### Dashboard

Create monitoring dashboard with:
- Security events timeline
- Top violated policies
- User authentication status
- Treasury operation trends
- Agent deployment metrics
- Task lifecycle metrics

---

## Deployment Checklist

- [ ] OPA policies deployed to `/docker/configs/opa/policies/`
- [ ] OPA service running on port 8181
- [ ] OPA client library built and linked
- [ ] Security middleware applied to all services
- [ ] Validation middleware integrated
- [ ] Audit logging enabled (file + database)
- [ ] CSRF tokens configured
- [ ] Rate limiting configured
- [ ] All routes protected with appropriate policies
- [ ] Test suite passing
- [ ] Monitoring and alerts configured
- [ ] Documentation reviewed
- [ ] Security audit completed

---

## Support

For issues or questions:
- Review policy files in `/docker/configs/opa/policies/`
- Check OPA client documentation in `/shared/opa-client/README.md`
- Review audit logs for security events
- Test policies with OPA test suite

---

**Last Updated**: 2026-03-26  
**Version**: 1.0.0  
**Status**: Production Ready
