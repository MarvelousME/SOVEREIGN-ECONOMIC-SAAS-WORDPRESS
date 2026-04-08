# Rewards ↔ Ledger Saga/Outbox Reliability Runbook

This document defines reliability expectations and operational procedures for the rewards-to-ledger integration path:

1. Rewards domain writes a durable outbox record in the same DB transaction as reward state changes.
2. Outbox publisher emits the integration event.
3. Ledger domain consumes event idempotently and commits ledger entries.
4. Acks, retries, and reconciliation guarantee eventual consistency.

Use this guide for on-call response, release readiness, and domain-level acceptance checks.

---

## 1) Reliability Objectives (SLO/SLI)

Track these as domain-specific reliability indicators:

| Metric | Target | Measurement Window | Alert Threshold |
|---|---|---|---|
| Outbox publish success rate | >= 99.9% | 24h rolling | < 99.5% for 15m |
| Reward->ledger end-to-end latency (P95) | <= 60s | 1h rolling | > 120s for 15m |
| Stuck outbox rows (`pending` older than 10m) | 0 steady-state | 5m polling | >= 10 rows |
| Saga terminal failure rate | <= 0.1% | 24h rolling | > 0.5% for 15m |
| Reconciliation mismatch rate | 0 critical mismatches | per job run | any critical mismatch |
| DLQ growth | 0 net growth | 1h rolling | +20 messages/hour |

Notes:
- If your environment uses stricter limits, keep stricter limits and update this table.
- "Critical mismatch" means reward state and ledger state disagree after retry window expires.

---

## 2) Data/Message Contract Requirements

Minimum contract guarantees for cross-service correctness:

- Stable event identity:
  - `event_id` globally unique and immutable.
  - `idempotency_key` deterministic for business operation.
- Ordering and causality:
  - Include `occurred_at` and `aggregate_version` (or equivalent monotonic version).
- Traceability:
  - Include `correlation_id`, `workspace_id`/`tenant_id`, and `reward_id`.
- Replay safety:
  - Consumers must tolerate duplicates and out-of-order delivery.
  - Ledger write path must be idempotent on `event_id` or `idempotency_key`.

---

## 3) Normal Operations

### 3.1 Daily checks

1. Verify outbox backlog is near zero.
2. Verify end-to-end reward->ledger latency dashboard.
3. Verify DLQ depth is stable (preferably zero).
4. Verify reconciliation jobs completed with no critical mismatches.

### 3.2 Release-day checks

1. Confirm publisher and consumer deployments are on compatible contract versions.
2. Confirm retry policies and backoff are unchanged or intentionally updated.
3. Confirm runbook SQL/commands are valid for target environment.
4. Confirm alert routing is active (PagerDuty/Slack/email).

---

## 4) Incident Runbook (Rewards ↔ Ledger)

### 4.1 Symptom: growing pending outbox

Likely causes:
- Publisher process down.
- Broker unavailable/unhealthy.
- Serialization/contract regression.

Immediate actions:
1. Check publisher health and logs.
2. Check broker connectivity and auth.
3. Pause risky deploys to rewards/ledger services.
4. If safe, trigger controlled replay for pending outbox rows.

Validation:
- Pending outbox rows trend downward.
- New rows move from `pending` -> `published` within target latency.

### 4.2 Symptom: high DLQ growth

Likely causes:
- Consumer code regression.
- Contract incompatibility.
- Poison messages.

Immediate actions:
1. Inspect top DLQ error classes.
2. Roll back consumer if regression is confirmed.
3. Patch/skip poison message if business-approved.
4. Re-drive DLQ in bounded batches.

Validation:
- DLQ growth stops.
- Redriven messages settle without re-DLQ loop.

### 4.3 Symptom: reconciliation mismatches

Likely causes:
- Partial saga completion.
- Idempotency bug.
- Late event or reordered event mishandled.

Immediate actions:
1. Run targeted reconciliation for affected tenant/workspace and time range.
2. Compare reward operation identifiers to ledger entries.
3. Replay missing operations from source of truth.
4. Open incident if mismatch is financial-impacting.

Validation:
- Critical mismatch count returns to zero.
- Post-replay audit confirms one-to-one business outcome mapping.

---

## 5) Recovery Procedures

Use controlled, auditable replay only.

### 5.1 Replay pending outbox safely

- Scope by:
  - tenant/workspace
  - time range
  - event type
- Enforce max batch size to avoid traffic spikes.
- Keep replay idempotent; do not mutate original business payload.
- Record operator, timestamp, replay scope, and counts.

### 5.2 Re-drive DLQ

- Triage first:
  - transient vs permanent failures
  - schema mismatch vs business rule rejection
- Re-drive only transient/resolved categories.
- Keep a quarantine path for poison messages pending product/finance decision.

---

## 6) Observability Requirements

Dashboards must expose:
- Outbox queue depth by status.
- Publish attempts/success/failure rates.
- Consumer success/retry/failure by event type.
- Reward->ledger end-to-end latency distribution.
- Reconciliation mismatch counts by severity.
- DLQ depth and age.

Required log fields for all reward->ledger steps:
- `event_id`
- `idempotency_key`
- `correlation_id`
- `tenant_id`/`workspace_id`
- `reward_id`
- `saga_state` (or equivalent)
- `attempt`

---

## 7) Measurable Definition of Done (DoD)

A rewards↔ledger saga/outbox change is not complete unless all items below are true.

### 7.1 Correctness and safety

- [ ] Idempotency proof: duplicate event replay does not create duplicate ledger effects (verified with automated test).
- [ ] Atomicity proof: reward state + outbox insert happen in one transaction (tested and documented).
- [ ] Replay safety proof: replaying already-processed events is no-op at ledger side.

### 7.2 Reliability and performance

- [ ] P95 end-to-end latency <= 60s in staging load test (>= 1,000 events).
- [ ] Publish success rate >= 99.9% over 24h staging soak.
- [ ] No pending outbox row older than 10 minutes after soak.
- [ ] DLQ net growth is zero during soak (or every growth event has documented root cause and fix).

### 7.3 Reconciliation and recoverability

- [ ] Scheduled reconciliation job completes successfully at least 3 consecutive runs.
- [ ] Any injected mismatch test case is detected and auto-remediated or produces actionable alert.
- [ ] Manual replay procedure validated in staging with operator steps and rollback notes.

### 7.4 Operability and evidence

- [ ] Alerts configured for outbox backlog, latency breach, saga failure, and DLQ growth.
- [ ] Dashboard links added to on-call docs.
- [ ] Runbook updated (this file and `docs/deployment/runbook.md`).
- [ ] Evidence bundle attached to PR/release ticket:
  - test report
  - soak metrics screenshots
  - reconciliation logs
  - replay drill output

---

## 8) Suggested SQL/Queries (adapt to schema)

Use these as templates; adapt table and column names to deployed schema.

```sql
-- 1) Pending outbox older than 10 minutes
SELECT count(*) AS stuck_pending
FROM outbox_events
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '10 minutes';

-- 2) Recent publish failures by reason
SELECT error_code, count(*) AS failures
FROM outbox_events
WHERE status = 'failed'
  AND created_at >= NOW() - INTERVAL '1 hour'
GROUP BY error_code
ORDER BY failures DESC;

-- 3) Duplicate processing check (consumer idempotency)
SELECT event_id, count(*) AS seen
FROM ledger_event_receipts
WHERE processed_at >= NOW() - INTERVAL '24 hours'
GROUP BY event_id
HAVING count(*) > 1
ORDER BY seen DESC;
```

---

## 9) Ownership and Escalation

- Primary owner: Rewards + Ledger backend owners.
- Secondary owner: Platform/SRE on-call.
- Escalate immediately when:
  - financial-impacting mismatch is detected,
  - DLQ backlog exceeds alert threshold for > 30 minutes,
  - replay cannot restore consistency within agreed incident window.

