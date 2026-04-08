# Agent-Chain Strict Compliance and Campaign Milestone Bridge

This document defines the strict compliance flow for `agent-chain` execution and the bridge from campaign milestones into rewards and ledger workflows.

---

## Scope

- Agent-chain run lifecycle (`started`, `checkpointed`, `blocked`, `completed`)
- Campaign milestone validation and payout eligibility
- Bridge events and idempotent writes into rewards and ledger domains
- Auditability and policy-enforcement requirements for regulated execution

---

## Strict Compliance Flow (Agent-Chain)

Every agent-chain run must pass policy and audit gates before any reward-impacting action is emitted.

### Required gates

1. **Identity and tenancy gate**
   - `tenantId`, actor identity, and workspace context must be present
   - Missing identity context is a hard fail (`policy.action_blocked`)

2. **Policy decision gate**
   - Execute allow/deny decision before milestone acceptance
   - Persist policy input hash and decision result in audit metadata

3. **Evidence completeness gate**
   - Milestone evidence (artifact refs, timestamps, correlation chain) must be complete
   - Incomplete evidence can move only to `held` status, never to reward settlement

4. **Duplicate and replay gate**
   - Enforce idempotency key at agent-run + milestone granularity
   - Duplicate messages become no-op updates with trace logs

5. **Immutable audit gate**
   - Emit an audit event for every transition:
     - `agent.run_started`
     - `agent.run_checkpointed`
     - `policy.action_blocked` (if blocked)
     - `campaign.milestone.validated`
     - `reward.earned` (only after all gates pass)

---

## Campaign Milestone Bridge to Rewards/Ledger

### Bridge intent

Campaign milestones are operational facts. Rewards and ledger entries are financial facts.  
The bridge converts validated operational milestones into deterministic financial updates.

### Sequence

1. `campaign.milestone.completed` is emitted by campaign orchestration
2. Compliance flow validates identity, policy, and evidence
3. Bridge emits `campaign.milestone.validated` with:
   - `correlationId`, `causationId`
   - `tenantId`, campaign and milestone IDs
   - idempotency key and validation checksum
4. Rewards workflow computes award and emits `reward.earned`
5. Ledger workflow consumes reward event and posts transaction
6. Ledger emits `transaction.created` (or domain-equivalent settlement event)
7. Optional payout workflows consume ledger/reward state for downstream settlement

---

## Event Contract Requirements

The following fields are mandatory for all bridge events:

- `eventId`
- `eventType`
- `timestamp` (ISO 8601)
- `tenantId`
- `correlationId`
- `causationId`
- `data.idempotencyKey`
- `data.campaignId`
- `data.milestoneId`

Recommended metadata:

- `metadata.policyVersion`
- `metadata.policyDecisionId`
- `metadata.evidenceHash`
- `metadata.schemaVersion`

---

## Failure and Hold Semantics

- **Blocked by policy**: emit `policy.action_blocked`; no reward or ledger write
- **Evidence incomplete**: milestone moves to `held`; requires remediation and re-validation
- **Ledger unavailable**: reward may stay pending, but ledger posting must be retried with same idempotency key
- **Any compensation path** must append audit events and preserve correlation chain

---

## Observability and Controls

Track and alert on:

- compliance pass/fail rate by tenant and campaign
- `held` milestone backlog age
- reward-to-ledger posting latency
- idempotency collision rate
- count of blocked policy actions by policy version

Minimum operational dashboards:

- Agent-chain compliance funnel
- Campaign milestone validation funnel
- Rewards-to-ledger settlement lag

