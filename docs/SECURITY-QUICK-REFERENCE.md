# Security Quick Reference

Fast reference guide for UBI-CMS security features.

## OPA Policy Checks

### Treasury

```javascript
const opaClient = require('./Config/opa');

// Check withdrawal
const canWithdraw = await opaClient.checkTreasury('withdraw', {
    subject: { id: userId, kyc_status: 'verified' },
    resource: { balance: 10000, daily_spent: 0, daily_withdrawal_limit: 5000 },
    amount: 1000,
});

// Check spending
const canSpend = await opaClient.checkTreasury('spend', {
    subject: { roles: ['treasury_admin'] },
    amount: 50000,
    approvals: [/* signatures */],
    required_signatures: 2,
});
```

### Agents

```javascript
// Check deployment
const canDeploy = await opaClient.checkAgent('deploy_agent', {
    subject: { reputation_score: 75, subscription_tier: 'pro' },
});

// Check resource access
const canAccess = await opaClient.checkAgent('agent_access_resource', {
    agent: { scopes: ['read:tasks'], status: 'active' },
    resource: { required_scopes: ['read:tasks'] },
});
```

### Tasks

```javascript
// Check creation
const canCreate = await opaClient.checkTask('create_task', {
    subject: { reputation_score: 50, balance: 1000 },
    task: { title: '...', description: '...', reward: 100 },
});

// Check claiming
const canClaim = await opaClient.checkTask('claim_task', {
    subject: { reputation_score: 60, skills: ['javascript'] },
    resource: { status: 'open', required_skills: ['javascript'] },
});
```

### Governance

```javascript
// Check proposal creation
const canPropose = await opaClient.checkGovernance('create_proposal', {
    subject: { reputation_score: 150, staked_tokens: 5000 },
    proposal: { title: '...', description: '...', actions: [...] },
});

// Check voting
const canVote = await opaClient.checkGovernance('vote', {
    subject: { reputation_score: 50, staked_tokens: 1000 },
    resource: { status: 'active', voters: [] },
});
```

---

## Security Middleware

### Apply All Security Features

```javascript
const {
    securityHeaders,
    sanitize,
    preventSqlInjection,
    validateCsrfToken,
    rateLimiter,
    bruteForeProtection,
    preventSecretExposure,
} = require('./Middleware/security');

app.use(securityHeaders);
app.use(sanitize);
app.use(preventSqlInjection);
app.use(preventSecretExposure);
app.use(rateLimiter());
```

### CSRF Protection

```javascript
// Generate token (on login)
const token = generateCsrfToken(req);
res.json({ csrfToken: token });

// Validate token (on mutations)
app.use(['/api/*/create', '/api/*/update'], validateCsrfToken);
```

### Brute Force Protection

```javascript
app.use('/auth/login', bruteForeProtection(5, 900000)); // 5 attempts, 15 min
```

---

## Validation

### Use Built-in Schemas

```javascript
const { validateRequest, schemas } = require('./Middleware/validation');

app.post('/api/users',
    validateRequest({ body: schemas.user.create }),
    handler
);

app.post('/api/treasury/withdraw',
    validateRequest({ body: schemas.treasury.withdraw }),
    handler
);
```

### Custom Schema

```javascript
const Joi = require('joi');
const { validators } = require('./Middleware/validation');

app.post('/api/custom',
    validateRequest({
        body: Joi.object({
            wallet: validators.ethereumAddress.required(),
            amount: validators.cryptoAmount.required(),
        }),
    }),
    handler
);
```

---

## Audit Logging

### Enable Middleware

```javascript
const {
    logMutations,
    logAuthentication,
    logSecurityEvents,
} = require('./Middleware/audit');

app.use(logMutations);
app.use(logAuthentication);
app.use(logSecurityEvents);
```

### Manual Logging

```javascript
const { audit } = require('./Middleware/audit');

// Log treasury operation
audit.treasury(req, 'withdraw', 1000, { destination: '0x...' });

// Log admin action
audit.adminAction(req, 'delete_user', 'user-123', { reason: 'GDPR' });

// Log data access
audit.dataAccess(req, 'user', 'user-123', 'read');
```

### Enable File Storage

```javascript
const { enableFileStorage } = require('./Middleware/audit');
enableFileStorage('./logs/audit'); // Creates audit-YYYY-MM-DD.jsonl
```

---

## OPA Client

### Initialize

```javascript
const { initializeOPA } = require('@ubi-cms/opa-client');

const opaClient = initializeOPA({
    url: 'http://opa:8181',
    timeout: 5000,
    cache: true,
    cacheTTL: 60000,
    fallbackAllow: false,
});

module.exports = opaClient;
```

### Protect Routes

```javascript
const { createOPAMiddleware } = require('@ubi-cms/opa-client');

app.use('/api/treasury/*', createOPAMiddleware(opaClient, 'treasury'));
app.use('/api/agents/*', createOPAMiddleware(opaClient, 'agents'));
```

### Get Violations

```javascript
const violations = await opaClient.getViolations('treasury', {
    action: 'withdraw',
    amount: 999999,
});

console.log(violations);
// ["Daily withdrawal limit exceeded: limit is 5000, attempted 999999"]
```

---

## Testing

### Mock OPA Client

```javascript
const { MockOPAClient } = require('@ubi-cms/opa-client/testing');

describe('Treasury', () => {
    let mockOPA;

    beforeEach(() => {
        mockOPA = new MockOPAClient();
    });

    it('allows withdrawal', async () => {
        mockOPA.mockAllow('treasury', { action: 'withdraw', amount: 1000 });
        // Test code
    });

    it('denies withdrawal', async () => {
        mockOPA.mockDeny('treasury', { action: 'withdraw' }, ['Limit exceeded']);
        // Test code
    });
});
```

### Test OPA Policies

```bash
cd docker/configs/opa/policies
opa test . -v
```

---

## Common Patterns

### Complete Request Handler

```javascript
const opaClient = require('./Config/opa');
const { audit } = require('./Middleware/audit');
const { validateRequest, schemas } = require('./Middleware/validation');

router.post('/treasury/withdraw',
    // 1. Validate input
    validateRequest({ body: schemas.treasury.withdraw }),
    
    async (req, res) => {
        try {
            // 2. Check policy
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

            // 3. Execute business logic
            const result = await processWithdrawal(req.user.id, req.body.amount);

            // 4. Audit log
            audit.treasury(req, 'withdraw', req.body.amount, {
                destination: req.body.destination,
                transaction_id: result.id,
            });

            // 5. Success response
            res.json({ success: true, transaction: result });
        } catch (error) {
            console.error('Withdrawal error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);
```

---

## Environment Variables

```bash
# OPA
OPA_URL=http://opa:8181
OPA_TIMEOUT=5000
OPA_CACHE_ENABLED=true
OPA_CACHE_TTL=60000
OPA_FALLBACK_ALLOW=false

# Security
CORS_ORIGIN=https://app.example.com,https://admin.example.com
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
CSRF_SECRET=your-secret-key

# Audit
AUDIT_LOG_DIR=./logs/audit
AUDIT_DB_ENABLED=true
```

---

## Troubleshooting

### OPA Not Responding

```javascript
const isHealthy = await opaClient.healthCheck();
if (!isHealthy) {
    console.error('OPA service unavailable');
    // Fallback logic based on fallbackAllow setting
}
```

### Clear OPA Cache

```javascript
opaClient.clearCache();
```

### Check Audit Logs

```bash
# View today's audit logs
cat logs/audit/audit-2026-03-26.jsonl | jq .

# Filter by type
cat logs/audit/audit-2026-03-26.jsonl | jq 'select(.type == "security")'

# Filter by user
cat logs/audit/audit-2026-03-26.jsonl | jq 'select(.user_id == "user-123")'
```

### Verify Log Integrity

```javascript
const { auditLogger } = require('./Middleware/audit');

const log = auditLogger.logs[0];
const isValid = auditLogger.verifyLog(log);
console.log(isValid ? 'Valid' : 'Tampered');
```

---

## Security Checklist

### Before Deployment

- [ ] OPA policies tested (`opa test . -v`)
- [ ] Security middleware enabled
- [ ] Validation schemas applied
- [ ] Audit logging configured
- [ ] CORS origins configured
- [ ] CSRF protection enabled
- [ ] Rate limiting configured
- [ ] Secret scanning enabled
- [ ] Environment variables set
- [ ] SSL/TLS certificates installed

### After Deployment

- [ ] OPA health check passing
- [ ] Audit logs being written
- [ ] Security alerts configured
- [ ] Monitoring dashboard setup
- [ ] Penetration test scheduled
- [ ] Security documentation reviewed
- [ ] Team trained on security features

---

## Common Errors

### "Policy decision denied access"
- Check user roles and permissions
- Verify tenant_id matches
- Review policy violations in response

### "OPA service unavailable"
- Check OPA container is running: `docker ps | grep opa`
- Verify OPA_URL is correct
- Check network connectivity

### "CSRF token validation failed"
- Ensure token is included in request header
- Verify token matches session
- Check token hasn't expired

### "Rate limit exceeded"
- Wait for rate limit window to reset
- Check rate limit configuration
- Review IP-based limits

---

## Quick Links

- **Full Documentation**: `/docs/SECURITY-HARDENING.md`
- **OPA Client README**: `/shared/opa-client/README.md`
- **Policy Directory**: `/docker/configs/opa/policies/`
- **Middleware**: `/api/src/Middleware/`

---

**Last Updated**: 2026-03-26  
**Version**: 1.0.0
