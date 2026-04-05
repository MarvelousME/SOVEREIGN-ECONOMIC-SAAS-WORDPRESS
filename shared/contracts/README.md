# Shared contracts

Machine-readable contracts and taxonomies shared across services, agents, and documentation.

## Contents

| Artifact | Purpose |
|----------|---------|
| `agent-contract.schema.json` | JSON Schema for a **bounded agent run**: tenant/workspace, objective, context, tool allow-list, policy/approval, success metric, time/cost budgets. Use for orchestrator APIs, audit logs, and human-in-the-loop gates. |

## Usage

- Validate payloads in Node with [Ajv](https://ajv.js.org/) or any Draft 2020-12–capable validator.
- **Local / CI:** from this directory run `npm ci` then `npm run validate` (compiles the schema and checks `fixtures/agent-contract.valid.json` passes and `fixtures/agent-contract.invalid.json` fails).
- Extend with optional properties in a **separate** schema or `$defs` if you need backward-compatible evolution.

## Related docs

- [Event taxonomy crosswalk](../../docs/architecture/event-taxonomy-crosswalk.md) — SAAOS-style dot events mapped to this platform’s NATS subjects.
- [NATS events](../../docs/nats-events.md) — CloudEvents and subject naming in-repo.
