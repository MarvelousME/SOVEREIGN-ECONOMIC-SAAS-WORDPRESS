# Compliance Domain — Definition of Done (DoD)

This DoD applies to work that touches `agent-chain` compliance, campaign milestone validation, and rewards/ledger bridging.

---

## 1) Policy and Identity

- All reward-impacting transitions enforce policy evaluation before execution.
- Every transition carries `tenantId`, actor identity, and workspace context.
- Blocked actions emit `policy.action_blocked` with decision metadata.

## 2) Event Integrity and Traceability

- All bridge events include `eventId`, `correlationId`, and `causationId`.
- Event payloads include campaign ID, milestone ID, and idempotency key.
- Correlation chain from milestone completion to ledger posting is queryable end-to-end.

## 3) Idempotency and Replay Safety

- Milestone validation and reward posting are idempotent by design.
- Duplicate/replayed events do not create duplicate rewards or ledger entries.
- Retry behavior preserves the same idempotency key through all hops.

## 4) Rewards/Ledger Consistency

- No ledger posting occurs for blocked or held milestones.
- Successful `reward.earned` events are reflected in ledger transactions (or explicitly in pending-with-retry state).
- Compensation paths are documented and emit audit events.

## 5) Audit and Compliance Evidence

- Audit events exist for start, checkpoint, block/hold, validation, reward issue, and ledger settlement.
- Policy version, decision ID, and evidence hash are stored in metadata.
- Audit records are immutable and available for compliance review.

## 6) Operational Readiness

- Dashboards cover compliance funnel, hold backlog, and reward-to-ledger latency.
- Alerts exist for high policy block rates, stale holds, and posting failures.
- Runbook steps exist for held milestones and replay/recovery operations.

## 7) Test and Verification Expectations

- Unit tests cover policy gate outcomes (allow, deny, hold).
- Integration tests validate milestone -> reward -> ledger happy path.
- Failure-path tests validate idempotent retries and no double posting.
- Replay tests confirm deterministic, non-duplicating outcomes.

---

## Acceptance Checklist

- [ ] Strict compliance flow documented and reviewed by backend + platform owners
- [ ] Campaign milestone bridge contract documented and versioned
- [ ] DoD checklist reviewed in PR and marked complete for impacted items
- [ ] Monitoring and alerting updates shipped for new/changed flows
- [ ] Evidence artifacts (tests, logs, dashboards) linked in implementation notes

