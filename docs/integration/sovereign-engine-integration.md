# Sovereign-Engine (NovasPlace) — integration with this platform

This document records a **structured analysis** of the open-source **[Sovereign-Engine](https://github.com/NovasPlace/Sovereign-Engine)** repository and how it can **complement** the Sovereign Economic SaaS / UBI-CMS stack (WordPress, Keycloak, Node services, ledger, NATS). It is **not** a mandate to embed Python inside WordPress.

**Analyzed clone (local):** `C:\Users\marvi\Desktop\Projects\Production\Sovereign-Engine-main`  
**Upstream:** https://github.com/NovasPlace/Sovereign-Engine  

**License note:** The engine’s `core/sovereign/LICENSE` is **MIT** (Copyright 2026 Donovan!). Other subfolders may carry their own licenses—verify before copying substantial code.

---

## 1. What Sovereign-Engine is

| Layer | Role |
|--------|------|
| **Core** (`core/sovereign`, `core/substrate`, `core/agent-atlas`) | Agent daemon, **substrate** coordination (Postgres-backed blackboard, ledger, nerve bus, registry), memory / cortex |
| **Organs** | Pluggable cognitive modules (cortex, working memory, goals, etc.) |
| **Daemons** | Long-running processes (reaper, consistency, consolidation, etc.) |
| **Tools** | Drift, sentinel, repolens, **desktop-vision-agent** (FastAPI + MCP-style HTTP), system-debugger, etc. |

The repo README positions **Phase 1** as documentation-oriented layout; **Phase 2** is a planned physical reorganization—expect path churn if you track `main` closely.

---

## 2. Conceptual map to *our* services

| Sovereign-Engine concept | Our platform analogue | Integration style |
|--------------------------|------------------------|-------------------|
| `substrate_ledger` (append-only events, `agent_id`, `event_type`, `detail` JSONB) | **Ledger Service** + audit / domain events on **NATS** | Do **not** duplicate financial ledger in `substrate_ledger`. Use Engine ledger for **agent/ops telemetry** only, or publish NATS events that a small worker writes to a **separate** `agent_ops` schema if needed. |
| `substrate_blackboard` (KV + TTL, project/category) | **Redis** cache, workflow state, or short-lived workflow DB rows | Same *pattern*: shared scratch state with TTL—not a source of financial truth. |
| `substrate_nerve` (channel + payload JSONB) | **NATS** subjects (`agent.*`, `workflow.*`) | Prefer NATS for cross-language bus; nerve table is useful only if everything is co-located in one Postgres. |
| `substrate_registry` (agent heartbeat, capabilities) | **Workflows service** / future **agent worker** registry | Model: health checks + capability tags for workers you run beside Node. |
| `onboarding.py` (assembles spawn context from `hot.md`, `session.md`, JSONL events) | **Tenant/user context** at session start, or **workflow run bootstrap** | Reuse the **idea**: one function that merges “identity + active work + recent events” into a single prompt/context package for an LLM worker—implement in Node/Python **behind** our API, not in WP. |
| `tools/desktop-vision-agent` (`/mcp/tools`, `/mcp/call`) | **Internal tool gateway** pattern | Good reference for **HTTP-wrapped tool discovery**; align with any MCP servers we expose behind auth at the edge (nginx + JWT). |
| `tools/sentinel` | **Security hardening** / sandbox patterns | Compare with [Security Hardening](../SECURITY-HARDING.md)—borrow checklists, not necessarily the Python runtime. |

Schema definitions for substrate live in `core/substrate/db.py` (`SCHEMA_SQL`)—Postgres tables `substrate_registry`, `substrate_ledger`, `substrate_blackboard`, `substrate_nerve`, etc.

---

## 3. Recommended integration phases (practical)

### Phase A — Documentation and boundaries (done with this file)

- Treat Sovereign-Engine as an **optional sidecar** or **developer tool**, not part of the WordPress request path.
- Keep **Keycloak + server-side JWT** as the only trust boundary for production APIs.

### Phase B — One bounded worker

- Run **one** Python service from the clone (e.g. a thin wrapper around `substrate` CLI or a minimal FastAPI that calls `ledger.record` / `blackboard.post`) in Docker **next to** existing compose services.
- From **Workflows** or **Ledger** (Node), call it with **service-to-service** auth (mTLS or internal JWT)—never from the browser.

### Phase C — Event correlation (optional)

- Publish `agent.telemetry.recorded` (or similar) on **NATS** when the Engine records high-value events; consume in our stack for dashboards—**without** merging schemas into the financial ledger DB.

### Phase D — MCP / tools (optional)

- If we add MCP for internal agents, mirror the **discovery + call** shape from `tools/desktop-vision-agent` (`list_tools`, `call_tool`) behind our API gateway.

---

## 4. What to avoid

- **Porting organs/cortex into PHP** — high coupling, no win.
- **Using `substrate_ledger` for money movement** — use our **Ledger Service** and double-entry rules.
- **Sharing one Postgres** between Sovereign-Engine substrate and production UBI ledger **without** isolation—if shared host is used, prefer **separate databases** or at least separate schemas + strict role grants.

---

## 5. Quick file pointers (local clone)

| Path | Why open it |
|------|-------------|
| `README.md` | Full directory map (core / organs / daemons / products / tools) |
| `onboarding.py` | Spawn-time context assembly; JSONL ledger tail (`events.jsonl`) |
| `core/substrate/db.py` | Substrate DDL and connection pattern |
| `core/substrate/blackboard.py` | TTL KV pattern |
| `core/substrate/ledger.py` | Event record + recent query API |
| `tools/desktop-vision-agent/server.py` | MCP-style HTTP surface |
| `tools/sentinel/` | Guardrail / execution sandbox direction |

---

## 6. Changelog

| Date | Change |
|------|--------|
| 2026-04-03 | Initial analysis from local `Sovereign-Engine-main`; integration phases and service map linkage. |
