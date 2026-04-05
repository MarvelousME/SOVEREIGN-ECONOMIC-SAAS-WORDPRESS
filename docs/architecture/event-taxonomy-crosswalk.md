# Event taxonomy crosswalk (SAAOS ↔ Sovereign)

This document merges a **SAAOS-style domain event catalog** (dot-separated names) with this repository’s **NATS / CloudEvents** model. Use it when integrating external specs, agent pipelines, or partner systems that speak the SAAOS vocabulary.

## SAAOS core events (reference)

| Event (SAAOS) | Typical meaning |
|-----------------|-----------------|
| `tenant.created` | New tenant onboarded |
| `workspace.created` | Workspace provisioned |
| `workspace.user_added` | User membership |
| `affiliate_link.ingested` | Affiliate URL/link captured |
| `merchant.extracted` | Merchant entity from crawl/parse |
| `offer.detected` / `offer.updated` | Commercial offer lifecycle |
| `page.generated` / `page.reviewed` / `page.published` | Landing/content factory |
| `lead.captured` / `lead.scored` | Lead pipeline |
| `crm.deal.created` | CRM deal |
| `message.drafted` / `message.sent` / `message.blocked` | Messaging + compliance |
| `consent.recorded` / `suppression.updated` | Privacy / deliverability |
| `reward.earned` | Rewards ledger signal |
| `payout.requested` / `payout.approved` / `payout.held` | Treasury / payouts |
| `agent.run_started` / `agent.run_completed` / `agent.run_failed` | Agent orchestration |
| `policy.action_blocked` | OPA or policy engine denial |
| `audit.event_recorded` | Immutable audit trail |

## Map to this repo (NATS subjects)

This platform publishes **typed CloudEvents** on NATS JetStream. Subjects use a `domain.action` style (see [NATS events](../nats-events.md)). The table below is **semantic** mapping—not a 1:1 rename. Implement publishers with explicit adapters when bridging SAAOS.

| SAAOS event | Sovereign direction / notes |
|-------------|----------------------------|
| `reward.earned` | Align with `reward.*` and ledger-related events in [NATS events](../nats-events.md). |
| `payout.*` | Align with `treasury.*` / ledger transaction events. |
| `agent.run_*` | Align with `agent.*` stream patterns; payload should include correlation/causation IDs. |
| `policy.action_blocked` | Align with OPA decisions and security audit logging (see `shared/opa-client`). |
| `audit.event_recorded` | Use structured app logs + optional dedicated audit subject per compliance needs. |
| `lead.*` / `crm.deal.created` | CRM / referral services; map to service-owned subjects when those services emit NATS. |
| `page.*` | Landing page factory / WordPress publishing; often HTTP-driven—emit events when async pipelines exist. |
| `tenant.*` / `workspace.*` | Multi-tenancy; correlate with `tenantId` on CloudEvents and API auth context. |

## Agent runs

For **structured agent invocations**, require callers to supply a payload valid against:

`shared/contracts/agent-contract.schema.json`

Emit lifecycle signals (`agent.run_started`, etc.) with the same **correlation** IDs as the NATS envelope where applicable.
