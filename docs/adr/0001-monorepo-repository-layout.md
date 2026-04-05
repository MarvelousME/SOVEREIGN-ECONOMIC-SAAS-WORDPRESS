# ADR 0001: Monorepo repository layout and tooling

| Field | Value |
|-------|--------|
| **Status** | Accepted |
| **Date** | 2026-04-03 |
| **Deciders** | Platform maintainers |
| **Supersedes** | — |

## Context

The UBI CMS codebase lives in a **single Git repository** containing:

- A monolithic API (`api/`)
- A Next.js portal (`frontend/portal-ui/`)
- Many deployable Node.js microservices under `services/*` (each with its own `package.json` and lockfile)
- Shared infrastructure (Docker Compose, GitHub Actions, docs)

We need a clear **record of how we treat this repository** (layout vs. package-manager “workspaces”) and **what we may adopt later** so contributors and CI stay aligned.

## Decision

1. **Treat the repo as a multi-package monorepo by *folder structure***, not as an npm/pnpm **workspace root** today. Each application or service owns its own dependencies and lockfile unless we explicitly migrate.

2. **Preserve boundaries** that match deployment: `api`, `frontend/portal-ui`, and each `services/<name>` remain primary units for `npm ci`, tests, and container builds.

3. **CI scope** for Node quality gates may remain **narrower than the full tree** (e.g. API + portal) until we add path filters or a workspace task runner; image builds already follow the service matrix.

4. **Optional evolution** (not mandatory for day-to-day work): introduce **pnpm workspaces** and/or **Turborepo** plus **path-based GitHub Actions** when install time, duplication, or CI minutes justify the migration. See [Monorepo playbook](../monorepo.md).

## Alternatives considered

| Option | Why not chosen as the *current* mandatory model |
|--------|--------------------------------------------------|
| Full npm workspaces at root today | Large migration; many independent lockfiles; risk of breaking per-service Docker builds without a phased plan |
| Nx monorepo | Powerful but heavier operationally; defer until task graph and caching are a proven bottleneck |
| Split into many Git repos | Loses atomic cross-cutting changes; conflicts with hybrid monolith + services strategy in [Architecture decisions](../architecture-decisions.md) |

## Consequences

### Positive

- **Simple mental model**: enter a package directory, install, run scripts.
- **Docker and CI** already mirror service folders; no hidden workspace indirection.
- **Room to grow**: ADR does not block adopting workspaces or Turborepo later.

### Negative / risks

- **Duplicate dependencies** across `node_modules` trees and possible version drift.
- **No single root command** for “test everything” without custom scripting or a task runner.
- **Partial CI coverage** for `services/*` unless additional workflows or filters are added.

### Follow-up

- Track concrete tasks in [docs/monorepo.md](../monorepo.md).
- Revisit this ADR when introducing root workspaces or changing CI strategy.

## References

- [Monorepo operational checklist](../monorepo.md)
- [Architecture decisions — hybrid monolith/microservices](../architecture-decisions.md#1-hybrid-monolithmicroservices-strategy)
- Root `package.json` (convenience scripts only)
