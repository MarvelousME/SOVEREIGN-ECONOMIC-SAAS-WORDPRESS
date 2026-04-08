# GDPR Compliance Documentation - Data Vault Anonymization Workflow

This document provides comprehensive GDPR compliance documentation for the Data Vault Anonymization Workflow, designed to support data controllers in meeting their obligations under the General Data Protection Regulation (EU) 2016/679.

---

## Section 1: GDPR Compliance Approach

### Lawful Basis for Processing

The Data Vault Anonymization Workflow supports multiple lawful bases for processing personal data:

| Lawful Basis | Implementation | Use Cases |
|-------------|----------------|-----------|
| **Consent** | `checkUserConsent()` validates explicit user consent before any data processing | Marketing analytics, personalized services |
| **Legitimate Interest** | Workflow can be configured to process data when necessary for legitimate business purposes | Fraud prevention, security monitoring, service improvement |
| **Legal Obligation** | Data retention schedules ensure compliance with legal retention requirements | Financial record keeping, regulatory compliance |

### Data Minimization Principles

The workflow enforces data minimization through:

1. **Field-Level Targeting**: Only specified PII fields are processed
   ```typescript
   const piiFields = ['email', 'phone', 'dateOfBirth', 'address'];
   ```

2. **Strategy-Based Transformation**: Each anonymization strategy applies the minimum necessary transformation:
   - `k-anonymity`: Generalizes to group-level data
   - `differential-privacy`: Adds calibrated noise
   - `pseudonymization`: Replaces with references
   - `full-anonymization`: Redacts completely

3. **Audit Logging**: All field access is logged without exposing data

### Purpose Limitation

The workflow validates purpose at each execution:

```typescript
const consentResult = await checkUserConsent(userId, purpose);
// Purpose must match consent granted
// Returns: 'granted' | 'expired' | 'revoked' | 'partial' | 'not_found'
```

---

## Section 2: Anonymization Strategies

### 2.1 K-Anonymity

**How It Works:**
K-anonymity ensures each record is indistinguishable from at least k-1 other records with respect to quasi-identifiers.

**Implementation Details:**
- Dates generalized to `YYYY-MM` format
- Ages bucketed into 5-year intervals (e.g., 25-29, 30-34)
- Email addresses masked: `jo***@example.com`
- Phone numbers masked: `123****45`

**When to Use:**
- Statistical analysis and reporting
- Sharing data with third parties
- Research purposes

**Limitations:**
- Does not provide formal privacy guarantees
- Vulnerable to background knowledge attacks
- Minimum k value must be chosen based on data sensitivity

### 2.2 Differential Privacy

**How It Works:**
Differential privacy adds calibrated random noise to query results, ensuring that the inclusion or exclusion of any single individual does not significantly affect the output.

**Noise Calibration:**
```typescript
function addDifferentialPrivacyNoise(value: number, epsilon: number = 1.0): number {
  const scale = 1.0 / epsilon;
  const noise = (Math.random() + Math.random() - 1) * scale * 2;
  return value + noise;
}
```

**Epsilon Values:**
| Epsilon | Privacy Level | Use Case |
|---------|---------------|-----------|
| 0.1 | Very High | Medical data, financial records |
| 0.5 | High | User behavior analytics |
| 1.0 | Medium | General analytics, A/B testing |
| 2.0 | Low | Internal metrics, debugging |

**Limitations:**
- Noise may reduce data utility
- Multiple queries can accumulate privacy loss (privacy budget)
- Requires careful epsilon selection

### 2.3 Pseudonymization

**How It Works:**
Pseudonymization replaces identifying fields with artificial identifiers (pseudonyms) that can be mapped back to the original data with a separate key.

**Key Management:**
- Pseudonym mappings stored in `pseudonymMappings` Map
- Format: `psn_<16-character-hex-string>`
- Same input value always produces same pseudonym within a session

**Reversibility:**
- Pseudonymization is reversible with access to the mapping table
- Access to mappings should be restricted and logged
- Key rotation should occur periodically

**Use Cases:**
- Internal analytics where user continuity is needed
- Development and testing environments
- Cross-system data sharing with controlled re-identification

### 2.4 Full Anonymization

**How It Works:**
Full anonymization irreversibly redacts all PII fields, replacing them with `[REDACTED]`.

**Irreversibility Guarantees:**
- No mapping table maintained
- No key storage
- Cannot be reversed even with full system access

**Use Cases:**
- Data subject right to be forgotten requests
- Data sharing with no possibility of re-identification
- Maximum privacy requirement scenarios

---

## Section 3: Consent Management

### Consent Check and Validation

The `checkUserConsent()` activity validates consent by:

1. **Fetching Consent Record**: Retrieves consent from Data Vault Service
2. **Status Validation**: Checks for `revoked`, `expired`, `partial`, or `not_found` statuses
3. **Purpose Verification**: Confirms requested purpose is in consent purposes list
4. **Expiration Check**: Validates `expiresAt` date is in the future

**Response Structure:**
```typescript
interface ConsentCheckResult {
  status: 'granted' | 'expired' | 'revoked' | 'partial' | 'not_found';
  userId: string;
  purpose: string;
  expiresAt?: Date;
  grantedDataTypes?: string[];
}
```

### Consent Expiration Handling

| Scenario | Workflow Behavior |
|----------|-------------------|
| Consent expired before processing | Returns `expired` status, workflow stops |
| Consent expires during processing | Completes current operation, marks data as stale |
| No expiration set | Treats as valid until revoked |

**Recommended Practice**: Set reasonable expiration periods (e.g., 12 months) and implement renewal prompts.

### Partial Consent Handling

When a user has granted consent for some purposes but not others:

1. Workflow returns `partial` status
2. Only data types matching granted purposes are processed
3. Audit log records the partial access
4. Requesting system notified of limited access

### Consent Revocation Process

1. User requests revocation through privacy dashboard
2. Data Vault Service marks consent as `revoked: true`
3. Subsequent `checkUserConsent()` calls return `revoked` status
4. Any in-flight workflows complete with `revoked` flag
5. Audit event emitted for compliance record

---

## Section 4: Data Retention Policies

### Anonymized Data Retention

| Data Type | Default Retention | Rationale |
|-----------|-------------------|----------|
| Fully anonymized data | 90 days | Retained for audit verification |
| Pseudonymized data | 12 months | Required for longitudinal analysis |
| Differential privacy aggregates | 36 months | Statistical validity |
| Audit logs | 7 years | Regulatory compliance |

### Audit Log Retention

Audit logs are retained for **7 years** minimum to support:

- Regulatory audits (GDPR Article 30)
- Data subject access requests
- Breach notification investigations
- Performance optimization

**Audit Log Contents:**
```typescript
{
  auditId: string;
  userId: string;
  strategy: AnonymizationStrategy;
  requestedFields: string[];
  processedFields: string[];
  timestamp: ISO8601 string;
}
```

### Automatic Deletion Schedules

The workflow supports scheduled deletion through:

1. **Retention Metadata**: Each record tagged with `anonymizedAt` timestamp
2. **Retention Policy Engine**: Evaluates records against retention schedules
3. **Deletion Workflows**: Automated purge of expired records

---

## Section 5: Workflow Behavior for Auditors

### Step-by-Step Workflow Execution

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA VAULT ANONYMIZATION                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ 1. Check Consent │
                    └────────┬────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
         ┌────────┐     ┌─────────┐     ┌──────────┐
         │ granted│     │ expired │     │ revoked  │
         └────┬───┘     └────┬────┘     └────┬─────┘
              │              │              │
              ▼              ▼              ▼
      ┌──────────────┐  ┌──────────┐  ┌────────────┐
      │ Proceed with │  │ Stop &   │  │ Stop &     │
      │ Anonymization│  │ Notify   │  │ Notify     │
      └──────┬───────┘  └──────────┘  └────────────┘
             │
             ▼
    ┌─────────────────┐
    │ 2. Fetch User   │
    │    PII Data     │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ 3. Apply        │
    │ Anonymization   │
    │ Strategy        │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ 4. Log Audit    │
    │    Event        │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ 5. Verify       │
    │ Compliance      │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ 6. Store        │
    │ Anonymized Data │
    └────────┬────────┘
             │
             ▼
        ┌────────┐
        │ Complete│
        └────────┘
```

### Error Scenarios and Handling

| Error | Handling | Retry Policy |
|-------|----------|--------------|
| Data Vault Service unavailable | Retry 5 times with exponential backoff | 1s, 2s, 4s, 8s, 16s |
| Invalid user ID | Fail immediately, log error | No retry |
| Unknown anonymization strategy | Fail immediately, return error | No retry |
| Partial anonymization failure | Rollback completed fields | Manual intervention |

### Retry Policies

```typescript
const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maximumAttempts: 5,
  initialInterval: '1s',
  maximumInterval: '1m',
  backoffCoefficient: 2.0,
};
```

### Rollback Procedures

1. **Identification**: Error point determines which fields were processed
2. **Compensation**: Original values restored from pre-anonymization snapshot
3. **Notification**: Audit event emitted with rollback details
4. **Alerting**: Operations team notified of rollback

---

## Section 6: Audit Trail

### Events Emitted

The workflow emits the following events for audit purposes:

| Event | Description | Data Included |
|-------|-------------|----------------|
| `AnonymizationStarted` | Workflow execution began | userId, strategy, piiFields |
| `ConsentChecked` | Consent validation completed | userId, purpose, status |
| `AnonymizationCompleted` | Successfully anonymized | auditId, anonymizedFields, strategy |
| `AnonymizationFailed` | Workflow failed | auditId, error, failedAt |
| `AnonymizationRolledBack` | Compensation executed | auditId, rollbackReason |

### Logs Created

Activity logs include:

```typescript
{
  timestamp: ISO8601,
  level: 'info' | 'warn' | 'error',
  activity: string,
  userId: string,
  auditId: string,
  details: Record<string, any>
}
```

### Reconstructing Workflow History

To reconstruct a workflow's history:

1. **Temporal Workflow History**: Query Temporal namespace for workflow events
2. **Activity Logs**: Aggregate logs by `auditId` or `workflowId`
3. **Audit Database**: Query Data Vault Service audit endpoint

```bash
# Example: Retrieve audit record
curl http://localhost:4009/api/audit/anonymization?auditId=<auditId>
```

---

## Section 7: User Rights under GDPR

### Right to Access (Article 15)

**Workflow Support:**
```typescript
// Export anonymized data for data subject
const exportResult = await exportAnonymizedData(userId, 'json');
```

**Process:**
1. Data subject submits access request
2. System verifies identity
3. Workflow exports anonymized data (protecting other users' data)
4. Data subject receives report

### Right to Rectification (Article 16)

**Workflow Support:**
- Anonymization does not modify source data
- Rectification should occur at source systems
- Re-anonymization after rectification updates anonymized copies

### Right to Erasure ("Right to be Forgotten") (Article 17)

**Workflow Support:**
```typescript
// Full anonymization - irreversible
const result = await anonymizeUserData(userId, 'full-anonymization', piiFields);

// Data revocation
const revokeResult = await revokeUserData(userId);
```

**Process:**
1. Data subject requests erasure
2. Identity verified
3. Workflow applies full anonymization to all PII
4. Audit log confirms erasure
5. Source data deleted per retention policy

**Irreversibility:**
- Full anonymization cannot be reversed
- Pseudonymization requires key destruction for equivalent erasure

### Right to Data Portability (Article 20)

**Workflow Support:**
```typescript
// Export in portable format
const exportResult = await exportAnonymizedData(userId, 'json');
// or
const exportResult = await exportAnonymizedData(userId, 'csv');
```

**Format Support:**
- JSON: Structured, machine-readable
- CSV: Spreadsheet-compatible

### How the Workflow Supports Each Right

| Right | Support Mechanism |
|-------|-------------------|
| Access | `exportAnonymizedData()` for data portability |
| Rectification | Source data modification, then re-anonymization |
| Erasure | `anonymizeUserData(strategy='full-anonymization')` |
| Restriction | Consent-based access control via `checkUserConsent()` |
| Objection | Revocation immediately blocks processing |
| Portability | JSON/CSV export formats |

---

## Appendix A: API Reference

### Activities

```typescript
// Check user consent
checkUserConsent(userId: string, purpose: string): Promise<ConsentCheckResult>

// Anonymize user data
anonymizeUserData(
  userId: string,
  strategy: AnonymizationStrategy,
  piiFields: string[]
): Promise<AnonymizeResult>

// Revoke all user data
revokeUserData(userId: string): Promise<{ success: boolean; auditId: string }>

// Export anonymized data
exportAnonymizedData(
  userId: string,
  format: 'json' | 'csv'
): Promise<{ success: boolean; data: string; auditId: string }>

// Verify anonymization compliance
verifyAnonymization(
  userId: string,
  piiFields: string[]
): Promise<{ isCompliant: boolean; violations: string[] }>
```

### Types

```typescript
type AnonymizationStrategy = 'k-anonymity' | 'differential-privacy' | 'pseudonymization' | 'full-anonymization';

type ConsentStatus = 'granted' | 'expired' | 'revoked' | 'partial' | 'not_found';

interface ConsentCheckResult {
  status: ConsentStatus;
  userId: string;
  purpose: string;
  expiresAt?: Date;
  grantedDataTypes?: string[];
}

interface AnonymizeResult {
  success: boolean;
  originalUserId: string;
  anonymizedData: Record<string, any>;
  strategy: AnonymizationStrategy;
  anonymizedFields: string[];
  auditId: string;
}
```

---

## Appendix B: Configuration

```typescript
// Required environment variables
DATA_VAULT_SERVICE_URL=http://localhost:4009

// Optional: Configure default retention periods
ANONYMIZED_DATA_RETENTION_DAYS=90
AUDIT_LOG_RETENTION_DAYS=2555  // 7 years
```

---

*Document Version: 1.0*  
*Last Updated: 2026-04-08*  
*Review Cycle: Annual*
